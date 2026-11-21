import { CATEGORIES } from '../constants/categories';
import { Db, setDb } from './db';
import { MIGRATIONS } from './migrations';

export async function initDatabase(db: Db): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;
  while (v < MIGRATIONS.length) {
    const sql = MIGRATIONS[v];
    await db.withTransactionAsync(async (tx) => {
      await tx.execAsync(sql);
    });
    v++;
    await db.execAsync(`PRAGMA user_version = ${v};`);
  }
  // Categories are constant data; keep the table in sync.
  for (let i = 0; i < CATEGORIES.length; i++) {
    await db.runAsync('INSERT OR REPLACE INTO writing_categories (id, name, sort_order) VALUES (?, ?, ?)', [CATEGORIES[i].id, CATEGORIES[i].name, i]);
  }
  setDb(db);
}

export async function integrityCheck(db: Db): Promise<{ ok: boolean; detail: string }> {
  const r = await db.getAllAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  const fk = await db.getAllAsync<any>('PRAGMA foreign_key_check');
  const ok = r.length === 1 && r[0].integrity_check === 'ok' && fk.length === 0;
  return { ok, detail: ok ? 'ok' : `${r.map((x) => x.integrity_check).join('; ')} fk:${fk.length}` };
}
