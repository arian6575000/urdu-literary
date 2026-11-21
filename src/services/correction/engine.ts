import { normalizeUrdu } from '../../utils/text';

export type SuggestionKind = 'script' | 'punctuation' | 'spacing' | 'dictionary' | 'similar';
export interface Suggestion {
  id: string; start: number; end: number; original: string; replacement: string; kind: SuggestionKind; reason: string;
}
export interface DictLike { word: string; wrong_forms: string }

/**
 * Context-aware, SUGGEST-ONLY correction. It never rewrites text by itself: every Suggestion must be
 * applied by the user (applySuggestion). Poetry is therefore never silently altered.
 * Scope (honest): script/punctuation clean-up and the user's own dictionary — not a full Urdu spell-checker.
 */
export function findSuggestions(text: string, dict: DictLike[] = []): Suggestion[] {
  const out: Suggestion[] = [];
  let n = 0;
  const push = (start: number, end: number, replacement: string, kind: SuggestionKind, reason: string) => {
    const original = text.slice(start, end);
    if (original === replacement) return;
    out.push({ id: `s${n++}`, start, end, original, replacement, kind, reason });
  };

  // 1) Arabic-script look-alikes that speech engines sometimes emit instead of the Urdu letters
  const script: [RegExp, string, string][] = [
    [/ي/g, 'ی', 'عربی «ي» کی جگہ اردو «ی»'], [/ك/g, 'ک', 'عربی «ك» کی جگہ اردو «ک»'], [/ى/g, 'ی', 'عربی «ى» کی جگہ اردو «ی»'],
  ];
  for (const [re, rep, why] of script) for (const m of text.matchAll(re)) push(m.index!, m.index! + 1, rep, 'script', why);

  // 2) Latin punctuation inside Urdu text
  for (const m of text.matchAll(/(?<=[؀-ۿ])\s*([?,;])/g)) {
    const idx = m.index! + m[0].length - 1;
    push(idx, idx + 1, m[1] === '?' ? '؟' : m[1] === ',' ? '،' : '؛', 'punctuation', 'اردو علامتِ وقف');
  }

  // 3) Spacing: runs of spaces, space before Urdu punctuation
  for (const m of text.matchAll(/[ \t]{2,}/g)) push(m.index!, m.index! + m[0].length, ' ', 'spacing', 'فاضل خالی جگہ');
  for (const m of text.matchAll(/ +(?=[،؟۔؛!])/g)) push(m.index!, m.index! + m[0].length, '', 'spacing', 'علامتِ وقف سے پہلے خالی جگہ');

  // 4) Personal dictionary — explicit wrong spellings, then near matches
  const words = [...text.matchAll(/[؀-ۿݐ-ݿ]+/g)];
  const wrongMap = new Map<string, string>();
  const known = new Set<string>();
  for (const d of dict) {
    known.add(normalizeUrdu(d.word));
    for (const w of d.wrong_forms.split(',').map((x) => x.trim()).filter(Boolean)) wrongMap.set(normalizeUrdu(w), d.word);
  }
  for (const m of words) {
    const key = normalizeUrdu(m[0]);
    const fix = wrongMap.get(key);
    if (fix) { push(m.index!, m.index! + m[0].length, fix, 'dictionary', 'آپ کی لغت کے مطابق درست املا'); continue; }
    if (known.has(key) || key.length < 4) continue;
    for (const d of dict) {
      const dk = normalizeUrdu(d.word);
      if (dk.length >= 4 && !dk.includes(' ') && withinOne(key, dk)) { push(m.index!, m.index! + m[0].length, d.word, 'similar', 'لغت کے لفظ سے ملتا جلتا — کیا یہی مطلب تھا؟'); break; }
    }
  }
  // drop overlaps, keep the earliest/most specific
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  const res: Suggestion[] = [];
  let lastEnd = -1;
  for (const s of out) { if (s.start >= lastEnd) { res.push(s); lastEnd = Math.max(lastEnd, s.end, s.start + 1); } }
  return res;
}

/** Edit distance ≤ 1 (one substitution, insertion or deletion). */
export function withinOne(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

/** Apply ONE user-approved suggestion. Returns the new text, or the same text if it no longer matches. */
export function applySuggestion(text: string, s: Suggestion): string {
  if (text.slice(s.start, s.end) !== s.original) return text;
  return text.slice(0, s.start) + s.replacement + text.slice(s.end);
}
/** Apply several user-approved suggestions at once (right-to-left so offsets stay valid). */
export function applySuggestions(text: string, list: Suggestion[]): string {
  return [...list].sort((a, b) => b.start - a.start).reduce((t, s) => applySuggestion(t, s), text);
}
