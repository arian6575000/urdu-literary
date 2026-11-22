import { getDb } from '../db';
import type { CardDesign } from '../../features/card/types';
import { sanitizeDesign } from '../../features/card/templates';

/** One saved card design per writing. Loading is defensive: a damaged or older save never crashes the editor. */
export async function getCardDesign(writingId: string): Promise<CardDesign | null> {
  const r = await getDb().getFirstAsync<{ design: string }>('SELECT design FROM card_designs WHERE writing_id = ?', [writingId]);
  if (!r) return null;
  try { return sanitizeDesign(JSON.parse(r.design)); } catch { return null; }
}
export const saveCardDesign = (writingId: string, d: CardDesign) =>
  getDb().runAsync('INSERT INTO card_designs (writing_id, design, updated_at) VALUES (?,?,?) ON CONFLICT(writing_id) DO UPDATE SET design=excluded.design, updated_at=excluded.updated_at', [writingId, JSON.stringify(d), Date.now()]);
export const deleteCardDesign = (writingId: string) => getDb().runAsync('DELETE FROM card_designs WHERE writing_id = ?', [writingId]);
