// Pure backup logic (no React Native imports): build, validate, merge with duplicate detection. Runs in node tests.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { BACKUP_FORMAT, BACKUP_VERSION } from '../../constants/app';
import { getDb } from '../../database/db';
import { createWriting } from '../../database/repositories/writings';
import { normalizeUrdu, hashText } from '../../utils/text';
import type { DictEntry, VoiceSession, VoiceTranscript, Writing } from '../../types';

export interface BackupFile {
  format: string; version: number; exported_at: number;
  writings: Writing[]; dictionary: Pick<DictEntry, 'word' | 'note' | 'wrong_forms'>[];
  voice_sessions: VoiceSession[]; voice_transcripts: VoiceTranscript[];
}

export async function buildBackup(): Promise<BackupFile> {
  const db = getDb();
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exported_at: Date.now(),
    writings: await db.getAllAsync<Writing>('SELECT * FROM writings ORDER BY created_at'),
    dictionary: await db.getAllAsync('SELECT word, note, wrong_forms FROM custom_dictionary ORDER BY word'),
    voice_sessions: await db.getAllAsync<VoiceSession>('SELECT * FROM voice_sessions'),
    voice_transcripts: await db.getAllAsync<VoiceTranscript>('SELECT * FROM voice_transcripts'),
  };
}

export type Validation = { ok: true; counts: { writings: number; words: number } } | { ok: false; error: string };

export function validateBackup(b: any): Validation {
  if (!b || typeof b !== 'object') return { ok: false, error: 'not an object' };
  if (b.format !== BACKUP_FORMAT) return { ok: false, error: 'wrong format' };
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) return { ok: false, error: 'newer or invalid version' };
  if (!Array.isArray(b.writings)) return { ok: false, error: 'writings missing' };
  for (const w of b.writings) {
    if (!w || typeof w.id !== 'string' || typeof w.title !== 'string' || typeof w.content !== 'string' || typeof w.created_at !== 'number') return { ok: false, error: 'bad writing entry' };
  }
  if (b.dictionary !== undefined && !Array.isArray(b.dictionary)) return { ok: false, error: 'bad dictionary' };
  return { ok: true, counts: { writings: b.writings.length, words: Array.isArray(b.dictionary) ? b.dictionary.length : 0 } };
}

const dupKey = (title: string, content: string) => hashText(normalizeUrdu(title).trim() + '\u0001' + normalizeUrdu(content).replace(/\s+/g, ' ').trim());

export interface RestoreResult { added: number; skipped: number; dictAdded: number }

/** Merge a backup into the current database. Existing identical writings (same text) are skipped, never duplicated. */
export async function restoreBackup(b: BackupFile): Promise<RestoreResult> {
  const v = validateBackup(b);
  if (!v.ok) throw new Error(v.error);
  const db = getDb();
  const existing = await db.getAllAsync<Writing>('SELECT id, title, content FROM writings') as Writing[];
  const keys = new Set(existing.map((w) => dupKey(w.title, w.content)));
  const ids = new Set(existing.map((w) => w.id));
  let added = 0, skipped = 0, dictAdded = 0;
  await db.withTransactionAsync(async () => {
    for (const w of b.writings) {
      const k = dupKey(w.title, w.content);
      if (keys.has(k)) { skipped++; continue; }
      keys.add(k);
      const id = ids.has(w.id) ? undefined : w.id; // same id but different text -> store as a new writing
      await createWriting({
        id, title: w.title, content: w.content, category_id: w.category_id || 'free', author: w.author || '', original_transcript: w.original_transcript || '',
        is_favorite: w.is_favorite ? 1 : 0, created_at: w.created_at, updated_at: w.updated_at || w.created_at,
      });
      added++;
    }
    for (const d of b.dictionary ?? []) {
      if (!d || typeof d.word !== 'string' || !d.word.trim()) continue;
      const r = await db.runAsync('INSERT OR IGNORE INTO custom_dictionary (word,note,wrong_forms,created_at) VALUES (?,?,?,?)', [d.word.trim(), d.note ?? '', d.wrong_forms ?? '', Date.now()]);
      dictAdded += r.changes;
    }
  });
  return { added, skipped, dictAdded };
}

export const backupToJson = (b: BackupFile) => JSON.stringify(b, null, 1);
export function backupToZip(b: BackupFile): Uint8Array {
  const manifest = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exported_at: b.exported_at, writings: b.writings.length, dictionary: b.dictionary.length };
  return zipSync({ 'backup.json': strToU8(backupToJson(b)), 'manifest.json': strToU8(JSON.stringify(manifest)) }, { level: 6 });
}
/** Accepts the bytes of either a .json or a .zip backup. */
export function parseBackupBytes(bytes: Uint8Array): BackupFile {
  const isZip = bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const text = isZip ? (() => { const f = unzipSync(bytes); if (!f['backup.json']) throw new Error('backup.json missing'); return strFromU8(f['backup.json']); })() : strFromU8(bytes);
  return JSON.parse(text);
}
