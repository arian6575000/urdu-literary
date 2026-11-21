import { normalizeUrdu } from '../../utils/text';

/**
 * Separates CONFIRMED text (final results, never removed) from TENTATIVE text (the engine's current
 * unstable guess, replaced — never appended — on every partial update). Guards against duplicate appends.
 */
export class TranscriptBuffer {
  private segments: string[] = [];
  private tentativeText = '';

  get confirmed(): string { return this.segments.join(' '); }
  get tentative(): string { return this.tentativeText; }
  get full(): string { return [this.confirmed, this.tentativeText].filter(Boolean).join(' '); }
  get isEmpty(): boolean { return !this.confirmed && !this.tentativeText; }

  /** Replace the unstable text. Identical updates are ignored. */
  applyPartial(text: string): boolean {
    const t = text.trim();
    if (t === this.tentativeText) return false;
    this.tentativeText = t;
    return true;
  }

  /** Commit a final segment, removing any overlap with what is already confirmed. */
  applyFinal(text: string): boolean {
    const t = text.trim();
    if (!t) return false; // an empty final carries no information; keep the tentative text for flushTentative()
    this.tentativeText = '';
    const last = this.segments[this.segments.length - 1];
    if (last !== undefined) {
      const nl = normalizeUrdu(last), nt = normalizeUrdu(t);
      if (nl === nt) return false; // exact repeat of the last segment
      if (nt.startsWith(nl + ' ')) { // cumulative result: new text extends the last segment
        this.segments[this.segments.length - 1] = t;
        return true;
      }
      if (nl.startsWith(nt + ' ') || nl.endsWith(' ' + nt)) return false; // new text is already contained at the end
    }
    // word-level overlap between the end of confirmed text and the start of t
    const prev = this.confirmed.split(/\s+/).filter(Boolean);
    const words = t.split(/\s+/);
    const max = Math.min(prev.length, words.length, 8);
    for (let k = max; k >= 2; k--) {
      const tail = prev.slice(-k).map(normalizeUrdu).join(' ');
      const head = words.slice(0, k).map(normalizeUrdu).join(' ');
      if (tail === head) { const rest = words.slice(k).join(' '); if (!rest) return false; this.segments.push(rest); return true; }
    }
    this.segments.push(t);
    return true;
  }

  /** Promote leftover tentative text to confirmed (used when the engine stops without sending a final). */
  flushTentative(): boolean {
    const t = this.tentativeText;
    this.tentativeText = '';
    return t ? this.applyFinal(t) : false;
  }

  reset(initialConfirmed = '') {
    this.segments = initialConfirmed.trim() ? [initialConfirmed.trim()] : [];
    this.tentativeText = '';
  }
}
