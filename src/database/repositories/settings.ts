import { getDb } from '../db';

export async function getSetting(key: string): Promise<string | null> {
  const r = await getDb().getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return r?.value ?? null;
}
export const setSetting = (key: string, value: string) =>
  getDb().runAsync('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await getDb().getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export const logExport = (ids: string[], format: string) =>
  getDb().runAsync('INSERT INTO export_history (writing_ids,format,created_at) VALUES (?,?,?)', [ids.join(','), format, Date.now()]);
