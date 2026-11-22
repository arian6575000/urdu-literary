import type { Db } from './db';

/**
 * Wraps a raw connection so every operation runs one at a time, in order.
 * expo-sqlite shares ONE connection: queries issued by other screens while a transaction is open would run inside it
 * (or hit "cannot start a transaction within a transaction" / "database is locked"). The queue prevents that.
 * Inside withTransactionAsync the task receives `tx`, the raw connection, which must be used instead of the queued db.
 */
export function serialize(raw: Db): Db {
  let chain: Promise<unknown> = Promise.resolve();
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn, fn);
    chain = p.then(() => undefined, () => undefined);
    return p;
  };
  return {
    execAsync: (sql) => enqueue(() => raw.execAsync(sql)),
    runAsync: (sql, params) => enqueue(() => raw.runAsync(sql, params)),
    getAllAsync: <T,>(sql: string, params?: any[]) => enqueue(() => raw.getAllAsync<T>(sql, params)),
    getFirstAsync: <T,>(sql: string, params?: any[]) => enqueue(() => raw.getFirstAsync<T>(sql, params)),
    withTransactionAsync: (task) => enqueue(() => raw.withTransactionAsync(async () => { await task(raw); })),
  };
}
