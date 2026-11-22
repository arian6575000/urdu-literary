import { getDb, type Db } from '../db';
import type { Collection, CollectionSummary } from '../../types';
import { uid } from '../../utils/text';

export interface CollectionInput { title: string; description?: string; color?: number }

export async function listCollections(db: Db = getDb()): Promise<CollectionSummary[]> {
  return db.getAllAsync<CollectionSummary>(
    `SELECT c.*, COUNT(ci.writing_id) AS count, COALESCE(SUM(w.is_favorite), 0) AS favorites
     FROM collections c LEFT JOIN collection_items ci ON ci.collection_id = c.id LEFT JOIN writings w ON w.id = ci.writing_id
     GROUP BY c.id ORDER BY c.updated_at DESC`);
}
export const getCollection = (id: string, db: Db = getDb()) => db.getFirstAsync<Collection>('SELECT * FROM collections WHERE id = ?', [id]);

export async function createCollection(i: CollectionInput, db: Db = getDb()): Promise<Collection> {
  const t = Date.now();
  const c: Collection = { id: uid(), title: i.title.trim(), description: (i.description ?? '').trim(), color: i.color ?? 0, created_at: t, updated_at: t };
  await db.runAsync('INSERT INTO collections (id,title,description,color,created_at,updated_at) VALUES (?,?,?,?,?,?)', [c.id, c.title, c.description, c.color, t, t]);
  return c;
}
export async function updateCollection(id: string, i: Partial<CollectionInput>, db: Db = getDb()) {
  const cur = await getCollection(id, db);
  if (!cur) return;
  await db.runAsync('UPDATE collections SET title=?, description=?, color=?, updated_at=? WHERE id=?', [(i.title ?? cur.title).trim(), (i.description ?? cur.description).trim(), i.color ?? cur.color, Date.now(), id]);
}
export const deleteCollection = (id: string, db: Db = getDb()) => db.runAsync('DELETE FROM collections WHERE id = ?', [id]);

/** Adding the same writing twice is a no-op. Writings themselves are never touched. */
export async function addToCollection(collectionId: string, writingIds: string[], db: Db = getDb()): Promise<number> {
  let n = 0;
  await db.withTransactionAsync(async (tx) => {
    for (const w of writingIds) n += (await tx.runAsync('INSERT OR IGNORE INTO collection_items (collection_id, writing_id, added_at) VALUES (?,?,?)', [collectionId, w, Date.now()])).changes;
    await tx.runAsync('UPDATE collections SET updated_at=? WHERE id=?', [Date.now(), collectionId]);
  });
  return n;
}
export const removeFromCollection = (collectionId: string, writingIds: string[], db: Db = getDb()) =>
  db.withTransactionAsync(async (tx) => { for (const w of writingIds) await tx.runAsync('DELETE FROM collection_items WHERE collection_id=? AND writing_id=?', [collectionId, w]); });

export async function collectionIdsFor(writingId: string, db: Db = getDb()): Promise<string[]> {
  return (await db.getAllAsync<{ collection_id: string }>('SELECT collection_id FROM collection_items WHERE writing_id = ?', [writingId])).map((r) => r.collection_id);
}
