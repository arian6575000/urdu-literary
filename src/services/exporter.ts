import { Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { buildPdfHtml, type PdfOptions } from './pdf/html';
import { logExport } from '../database/repositories/settings';
import { COMPANY_CREDIT } from '../constants/app';
import type { Writing } from '../types';

export function toPlainText(list: Writing[], withCredit = false): string {
  const t = list.map((w) => `${w.title ? w.title + '\n' : ''}${w.author ? '— ' + w.author + '\n' : ''}\n${w.content}`.trim()).join('\n\n———\n\n');
  return withCredit ? `${t}\n\n${COMPANY_CREDIT}` : t;
}

const safeName = (s: string) => (s || 'writing').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'writing';

async function shareFile(uri: string, mime: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: title, UTI: mime });
}

export async function exportTxt(list: Writing[]): Promise<void> {
  const f = new File(Paths.cache, `${safeName(list.length === 1 ? list[0].title : 'collection')}.txt`);
  if (f.exists) f.delete();
  f.create(); await f.write(toPlainText(list, true));
  await logExport(list.map((w) => w.id), 'txt');
  await shareFile(f.uri, 'text/plain', 'TXT');
}

let fontB64: string | null = null;
async function loadFontBase64(): Promise<string> {
  if (fontB64) return fontB64;
  const a = Asset.fromModule(require('../../assets/fonts/AlviNastaleeq.woff2'));
  await a.downloadAsync();
  const bytes = await new File(a.localUri || a.uri).bytes();
  let bin = ''; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  fontB64 = btoa(bin);
  return fontB64;
}

/** Real A4 PDF: HTML with the font embedded as base64, so Urdu is shaped by the WebView text engine (RTL + ligatures). */
export async function exportPdf(list: Writing[], o: Omit<PdfOptions, 'fontBase64' | 'fontFormat'>): Promise<string> {
  const html = buildPdfHtml(list, { ...o, fontBase64: await loadFontBase64(), fontFormat: 'woff2' });
  const r = await Print.printToFileAsync({ html, width: 595, height: 842 });
  await logExport(list.map((w) => w.id), 'pdf');
  await shareFile(r.uri, 'application/pdf', 'PDF');
  return r.uri;
}

export async function copyText(list: Writing[]) { await Clipboard.setStringAsync(toPlainText(list)); await logExport(list.map((w) => w.id), 'copy'); }

/** Opens WhatsApp with the text; returns false if WhatsApp is not installed (caller falls back to the share sheet). */
export async function shareTextToWhatsApp(list: Writing[]): Promise<boolean> {
  try { await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(toPlainText(list))}`); await logExport(list.map((w) => w.id), 'whatsapp'); return true; } catch { return false; }
}
export async function shareImageFile(uri: string, mime: string) { await shareFile(uri, mime, 'تصویر'); await logExport([], mime.includes('png') ? 'png' : 'jpg'); }
export async function sharePdfToWhatsAppOrSheet(uri: string) { await shareFile(uri, 'application/pdf', 'PDF'); }
