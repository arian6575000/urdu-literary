import { getDb } from '../db';
import type { VoiceSession, VoiceTranscript } from '../../types';
import { uid } from '../../utils/text';

export async function startVoiceSession(engine: string, writingId: string | null = null): Promise<string> {
  const id = uid();
  await getDb().runAsync('INSERT INTO voice_sessions (id,writing_id,engine,started_at,status) VALUES (?,?,?,?,?)', [id, writingId, engine, Date.now(), 'active']);
  return id;
}
export const endVoiceSession = (id: string, status = 'done') =>
  getDb().runAsync('UPDATE voice_sessions SET ended_at=?, status=? WHERE id=?', [Date.now(), status, id]);

/** One transcript row per session; original text is never overwritten by edits. */
export async function saveTranscript(sessionId: string, original: string, edited: string): Promise<void> {
  const db = getDb();
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM voice_transcripts WHERE session_id = ?', [sessionId]);
  if (row) await db.runAsync('UPDATE voice_transcripts SET original_text=?, edited_text=? WHERE id=?', [original, edited, row.id]);
  else await db.runAsync('INSERT INTO voice_transcripts (session_id,original_text,edited_text,created_at) VALUES (?,?,?,?)', [sessionId, original, edited, Date.now()]);
}
export const linkSessionToWriting = (sessionId: string, writingId: string) =>
  getDb().runAsync('UPDATE voice_sessions SET writing_id=? WHERE id=?', [writingId, sessionId]);

/** Most recent session that still holds unsaved transcript text (crash / interruption recovery). */
export async function lastUnlinkedTranscript(): Promise<(VoiceTranscript & { session_id: string }) | null> {
  return getDb().getFirstAsync<VoiceTranscript>(
    `SELECT t.* FROM voice_transcripts t JOIN voice_sessions s ON s.id = t.session_id
     WHERE s.writing_id IS NULL AND length(trim(t.edited_text)) > 0 ORDER BY t.created_at DESC LIMIT 1`,
  );
}
export const listSessions = () => getDb().getAllAsync<VoiceSession>('SELECT * FROM voice_sessions ORDER BY started_at DESC');
export async function deleteAllVoiceData() {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM voice_transcripts');
    await db.runAsync('DELETE FROM voice_sessions');
    await db.runAsync("UPDATE writings SET original_transcript = ''");
  });
}
