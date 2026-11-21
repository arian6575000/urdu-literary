import { getDb } from '../db';
import type { DictEntry } from '../../types';

export const listDictionary = () => getDb().getAllAsync<DictEntry>('SELECT * FROM custom_dictionary ORDER BY word COLLATE NOCASE');

export async function saveDictEntry(e: { id?: number; word: string; note?: string; wrong_forms?: string }): Promise<void> {
  const db = getDb();
  const word = e.word.trim();
  if (!word) throw new Error('empty');
  const wrong = (e.wrong_forms ?? '').split(/[,،\n]/).map((s) => s.trim()).filter(Boolean).join(',');
  if (e.id) await db.runAsync('UPDATE custom_dictionary SET word=?, note=?, wrong_forms=? WHERE id=?', [word, e.note ?? '', wrong, e.id]);
  else await db.runAsync('INSERT INTO custom_dictionary (word,note,wrong_forms,created_at) VALUES (?,?,?,?) ON CONFLICT(word) DO UPDATE SET note=excluded.note, wrong_forms=excluded.wrong_forms', [word, e.note ?? '', wrong, Date.now()]);
}
export const deleteDictEntry = (id: number) => getDb().runAsync('DELETE FROM custom_dictionary WHERE id = ?', [id]);
