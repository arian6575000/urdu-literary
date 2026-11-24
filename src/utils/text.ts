// Pure text helpers (no React Native imports so they run in node tests).

/** Urdu/Arabic combining marks (zabar, zer, pesh, shadda...) — stripped for search only, never from stored text. */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ‌‍‎‏]/g;

/** Normalise Urdu text for searching: remove diacritics and unify look-alike letters (Arabic ي/ك/ه vs Urdu ی/ک/ہ). */
export function normalizeUrdu(s: string): string {
  return s
    .replace(MARKS, '')
    .replace(/[يىیے]/g, 'ی') // ي ى ی ے -> ی
    .replace(/[كک]/g, 'ک') // ك ک -> ک
    .replace(/[هھہۃ]/g, 'ہ') // ه ھ ہ ۃ -> ہ
    .replace(/[آأإ]/g, 'ا') // آ أ إ -> ا
    .toLowerCase();
}

export function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}
export const countChars = (s: string) => s.replace(/\s/g, '').length;

export function uid(): string {
  const r = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${Date.now().toString(36)}-${r()}${r()}-${r()}`;
}

/** Cheap stable hash (FNV-1a) for duplicate detection in backups. */
export function hashText(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

/** Numbers are shown as plain English digits (123), as requested. Kept as a function so every call site stays unchanged. */
export const urduDigits = (s: string | number) => String(s);

const MONTHS = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return urduDigits(`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
}
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours(), m = d.getMinutes();
  return urduDigits(`${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'صبح' : 'شام'}`);
}

/** Split poetry into couplets: blocks separated by a blank line. Single lines stay as given. */
export function splitCouplets(content: string): string[][] {
  return content.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.split('\n').filter((l) => l.trim().length)).filter((b) => b.length);
}

export const firstLine = (s: string) => (s.split('\n').find((l) => l.trim()) ?? '').trim();
export const excerpt = (s: string, n = 90) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
