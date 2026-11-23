import { router } from 'expo-router';
import { S } from '../../constants/strings';
import { deleteWriting, setFavorite } from '../../database/repositories/writings';
import { confirmDialog, toast, useUi } from '../../stores/ui';
import type { Writing } from '../../types';

export const openWriting = (id: string) => router.push({ pathname: '/writing/[id]', params: { id } });
export const editWriting = (id: string) => router.push({ pathname: '/writing/edit', params: { id } });
export const shareWritings = (ids: string[]) => router.push({ pathname: '/export', params: { ids: ids.join(',') } });
export const openCard = (id: string) => router.push({ pathname: '/card/[id]', params: { id } });

export async function toggleFavorite(w: Writing) { await setFavorite(w.id, !w.is_favorite); useUi.getState().bump(); }
export async function setFavorites(ids: string[], on: boolean) { for (const id of ids) await setFavorite(id, on); useUi.getState().bump(); }

/** Asks first; returns true when deleted. */
export async function removeWritings(ids: string[]): Promise<boolean> {
  if (!(await confirmDialog(ids.length > 1 ? S.confirmDeleteN : S.confirmDelete, { danger: true, okLabel: S.delete }))) return false;
  for (const id of ids) await deleteWriting(id);
  useUi.getState().bump(); toast(S.deletedN, 'ok');
  return true;
}
