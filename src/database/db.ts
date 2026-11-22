// Tiny DB interface so the same repository code runs on expo-sqlite (app) and node:sqlite (tests).
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  /** `tx` talks to the same connection but bypasses the serial queue — use ONLY `tx` inside the task. */
  withTransactionAsync(task: (tx: Db) => Promise<void>): Promise<void>;
}
let _db: Db | null = null;
export const setDb = (d: Db) => { _db = d; };
export const getDb = (): Db => { if (!_db) throw new Error('Database not initialised'); return _db; };
