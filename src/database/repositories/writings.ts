import { getDb } from '../db';
import type { Writing, WritingQuery, WritingVersion } from '../../types';
import { countWords, normalizeUrdu, uid } from '../../utils/text';

const now = () => Date.now();

export interface WritingInput { title?: string; content?: string; category_id?: string; author?: string; original_transcript?: string }

export async function createWriting(input: WritingInput & { id?: string; created_at?: number; updated_at?: number; is_favorite?: number }): Promise<Writing> {
  const db = getDb();
  const t = now();
  const w: Writing = {
    id: input.id ?? uid(), title: input.title ?? '', content: input.content ?? '', category_id: input.category_id ?? 'free',
    author: input.author ?? '', original_transcript: input.original_transcript ?? '', is_favorite: input.is_favorite ?? 0,
    word_count: countWords(input.content ?? ''), created_at: input.created_at ?? t, updated_at: input.updated_at ?? t,
  };
  await db.runAsync(
    'INSERT INTO writings (id,title,content,category_id,author,original_transcript,is_favorite,word_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [w.id, w.title, w.content, w.category_id, w.author, w.original_transcript, w.is_favorite, w.word_count, w.created_at, w.updated_at],
  );
  if (w.is_favorite) await db.runAsync('INSERT OR IGNORE INTO favorites (writing_id, created_at) VALUES (?,?)', [w.id, t]);
  return w;
}

export const getWriting = (id: string) => getDb().getFirstAsync<Writing>('SELECT * FROM writings WHERE id = ?', [id]);

/** Update a writing. A version snapshot of the previous state is kept when `snapshot` is true and the text actually changed. */
export async function updateWriting(id: string, patch: WritingInput, snapshot = false): Promise<Writing | null> {
  const db = getDb();
  const cur = await getWriting(id);
  if (!cur) return null;
  const next: Writing = {
    ...cur,
    title: patch.title ?? cur.title, content: patch.content ?? cur.content, category_id: patch.category_id ?? cur.category_id,
    author: patch.author ?? cur.author, original_transcript: patch.original_transcript ?? cur.original_transcript,
    word_count: countWords(patch.content ?? cur.content), updated_at: now(),
  };
  await db.withTransactionAsync(async () => {
    if (snapshot && (cur.title !== next.title || cur.content !== next.content) && (cur.content.trim() || cur.title.trim())) {
      await db.runAsync('INSERT INTO writing_versions (writing_id,title,content,created_at) VALUES (?,?,?,?)', [id, cur.title, cur.content, now()]);
      // keep the 30 most recent versions
      await db.runAsync('DELETE FROM writing_versions WHERE writing_id = ? AND id NOT IN (SELECT id FROM writing_versions WHERE writing_id = ? ORDER BY created_at DESC, id DESC LIMIT 30)', [id, id]);
    }
    await db.runAsync(
      'UPDATE writings SET title=?, content=?, category_id=?, author=?, original_transcript=?, word_count=?, updated_at=? WHERE id=?',
      [next.title, next.content, next.category_id, next.author, next.original_transcript, next.word_count, next.updated_at, id],
    );
  });
  return next;
}

export async function deleteWriting(id: string) { await getDb().runAsync('DELETE FROM writings WHERE id = ?', [id]); }

export async function setFavorite(id: string, on: boolean) {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE writings SET is_favorite = ? WHERE id = ?', [on ? 1 : 0, id]);
    if (on) await db.runAsync('INSERT OR IGNORE INTO favorites (writing_id, created_at) VALUES (?,?)', [id, now()]);
    else await db.runAsync('DELETE FROM favorites WHERE writing_id = ?', [id]);
  });
}

/**
 * List/search. Search is done in JS after a cheap SQL pre-filter, because SQLite's LIKE cannot ignore Urdu
 * diacritics or unify ي/ی, ك/ک, ه/ہ. Libraries here are personal-sized (thousands), so this is fast.
 */
export async function listWritings(q: WritingQuery = {}): Promise<Writing[]> {
  const where: string[] = [], params: any[] = [];
  if (q.category) { where.push('category_id = ?'); params.push(q.category); }
  if (q.favoritesOnly) where.push('is_favorite = 1');
  const order = q.sort === 'oldest' ? 'created_at ASC' : 'updated_at DESC';
  let rows = await getDb().getAllAsync<Writing>(`SELECT * FROM writings ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`, params);
  const text = (q.text ?? '').trim();
  if (text) {
    const needles = normalizeUrdu(text).split(/\s+/).filter(Boolean);
    rows = rows.filter((w) => {
      const hay = normalizeUrdu(`${w.title}\n${w.content}\n${w.author}`);
      return needles.every((n) => hay.includes(n));
    });
  }
  return q.limit ? rows.slice(0, q.limit) : rows;
}

export async function countWritings(): Promise<{ total: number; favorites: number; byCategory: Record<string, number> }> {
  const db = getDb();
  const t = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM writings');
  const f = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM writings WHERE is_favorite = 1');
  const rows = await db.getAllAsync<{ category_id: string; n: number }>('SELECT category_id, COUNT(*) n FROM writings GROUP BY category_id');
  const byCategory: Record<string, number> = {};
  rows.forEach((r) => { byCategory[r.category_id] = r.n; });
  return { total: t?.n ?? 0, favorites: f?.n ?? 0, byCategory };
}

export const listVersions = (writingId: string) =>
  getDb().getAllAsync<WritingVersion>('SELECT * FROM writing_versions WHERE writing_id = ? ORDER BY created_at DESC, id DESC', [writingId]);

export async function restoreVersion(versionId: number): Promise<Writing | null> {
  const v = await getDb().getFirstAsync<WritingVersion>('SELECT * FROM writing_versions WHERE id = ?', [versionId]);
  if (!v) return null;
  return updateWriting(v.writing_id, { title: v.title, content: v.content }, true);
}

export async function wipeAllWritings() {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const t of ['writing_versions', 'voice_transcripts', 'voice_sessions', 'favorites', 'export_history', 'writings', 'custom_dictionary']) await db.runAsync(`DELETE FROM ${t}`);
  });
}
