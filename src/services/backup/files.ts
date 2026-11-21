import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { buildBackup, backupToJson, backupToZip, parseBackupBytes, restoreBackup, validateBackup, type RestoreResult } from './core';
import { logExport } from '../../database/repositories/settings';

const stamp = () => new Date().toISOString().slice(0, 10);

export async function exportBackup(kind: 'json' | 'zip'): Promise<string> {
  const b = await buildBackup();
  const file = new File(Paths.cache, `urdu-literary-backup-${stamp()}.${kind}`);
  if (file.exists) file.delete();
  file.create();
  if (kind === 'json') await file.write(backupToJson(b)); else await file.write(backupToZip(b));
  await logExport([], `backup-${kind}`);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: kind === 'json' ? 'application/json' : 'application/zip', dialogTitle: 'بیک اپ' });
  return file.uri;
}

export async function pickAndParseBackup(): Promise<{ ok: true; backup: any; counts: { writings: number; words: number } } | { ok: false; error: string; cancelled?: boolean }> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return { ok: false, error: 'cancelled', cancelled: true };
  try {
    const bytes = await new File(r.assets[0].uri).bytes();
    const backup = parseBackupBytes(bytes);
    const v = validateBackup(backup);
    return v.ok ? { ok: true, backup, counts: v.counts } : { ok: false, error: v.error };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}
export const applyRestore = (backup: any): Promise<RestoreResult> => restoreBackup(backup);
