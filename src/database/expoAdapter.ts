import type { SQLiteDatabase } from 'expo-sqlite';
import type { Db } from './db';
import { serialize } from './serialize';

export const fromExpo = (d: SQLiteDatabase): Db => serialize({
  execAsync: (sql) => d.execAsync(sql),
  runAsync: (sql, params = []) => d.runAsync(sql, params),
  getAllAsync: <T,>(sql: string, params: any[] = []) => d.getAllAsync<T>(sql, params),
  getFirstAsync: <T,>(sql: string, params: any[] = []) => d.getFirstAsync<T>(sql, params),
  withTransactionAsync: (task) => d.withTransactionAsync(() => task(undefined as unknown as Db)),
});
