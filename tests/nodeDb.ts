// node:sqlite adapter that mimics the subset of the expo-sqlite async API used by the repo, wrapped in the same serial queue as the app.
import { DatabaseSync } from 'node:sqlite';
import type { Db } from '../src/database/db';
import { serialize } from '../src/database/serialize';

export function createNodeDb(): Db {
  const raw = new DatabaseSync(':memory:');
  let depth = 0;
  return serialize({
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, params = []) {
      const r: any = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync(sql, params = []) { return raw.prepare(sql).all(...params) as any[]; },
    async getFirstAsync(sql, params = []) { return ((raw.prepare(sql).get(...params)) as any) ?? null; },
    async withTransactionAsync(task) {
      if (depth) throw new Error('nested transaction');
      depth++;
      raw.exec('BEGIN');
      try { await task(this as unknown as Db); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } finally { depth--; }
    },
  });
}
