// Small persistent event log (last 80 lines) so voice/crash problems can be inspected on the phone and pasted to the developer.
// Safe to call before the database exists: it just keeps the lines in memory until the first flush succeeds.
import { getSetting, setSetting } from '../database/repositories/settings';

const MAX = 80;
let lines: string[] = [];
let loaded = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const KEY = 'diag_log';

const stamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

export function logEvent(tag: string, message: string): void {
  lines.push(`${stamp()} [${tag}] ${String(message).slice(0, 400)}`);
  if (lines.length > MAX) lines = lines.slice(-MAX);
  if (timer) return;
  timer = setTimeout(async () => { timer = null; try { await setSetting(KEY, JSON.stringify(lines)); } catch { /* db not ready */ } }, 1200);
}

/** Merge the persisted log (previous runs) in front of this run's lines. Call once at startup after the DB is open. */
export async function loadDiagnostics(): Promise<void> {
  if (loaded) return; loaded = true;
  try { const raw = await getSetting(KEY); const old: string[] = raw ? JSON.parse(raw) : []; lines = [...old, '— app started —', ...lines].slice(-MAX); } catch { /* ignore */ }
}
export const getDiagnostics = (): string[] => [...lines];
export async function clearDiagnostics(): Promise<void> { lines = []; try { await setSetting(KEY, '[]'); } catch { /* ignore */ } }
