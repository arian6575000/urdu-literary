import { TranscriptBuffer } from './transcriptBuffer';
import type { SpeechError, Unsub, UrduSpeechProvider } from './types';

export type VoiceState = 'idle' | 'starting' | 'listening' | 'paused' | 'stopping' | 'stopped' | 'error';
export type VoiceEvent = 'START' | 'STARTED' | 'PAUSE' | 'RESUME' | 'STOP' | 'ENDED' | 'FAIL';

/** Pure transition table. Anything not listed is ignored (returns the same state). */
export function transition(s: VoiceState, e: VoiceEvent): VoiceState {
  switch (s) {
    case 'idle': case 'stopped': case 'error': return e === 'START' ? 'starting' : s;
    case 'starting': return e === 'STARTED' ? 'listening' : e === 'FAIL' ? 'error' : e === 'STOP' ? 'stopped' : s;
    case 'listening': return e === 'PAUSE' ? 'paused' : e === 'STOP' ? 'stopping' : e === 'FAIL' ? 'error' : s;
    case 'paused': return e === 'RESUME' ? 'starting' : e === 'STOP' ? 'stopped' : e === 'FAIL' ? 'error' : s;
    case 'stopping': return e === 'ENDED' || e === 'FAIL' ? 'stopped' : s;
  }
}

export interface Snapshot {
  state: VoiceState; confirmed: string; tentative: string; full: string; level: number; error: SpeechError | null; restarts: number;
}

export interface ControllerOptions {
  log?: (message: string) => void;
  /** wait before re-starting the engine after it ended/failed by itself (Android needs a moment to release the recognizer) */
  restartDelayMs?: number;
  /** wait before resuming after a pause */
  resumeDelayMs?: number;
  /** consecutive recoverable errors (busy/client/no-speech) tolerated without any result in between */
  maxTransient?: number;
  /** consecutive network errors tolerated before reporting a real error */
  networkRetries?: number;
}

const MAX_AUTO_RESTARTS = 300;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Drives a provider through the state machine and owns the transcript buffer.
 * - The engine ending by itself while "listening" (silence timeout) restarts it, keeping confirmed text.
 * - Recoverable errors (busy / client / no-speech / brief network loss) are retried with a delay instead of stopping the session.
 * - Events that arrive while no session is active are ignored (they can come from another screen using the same native recognizer).
 * - On a real error the text gathered so far is preserved in the buffer.
 */
export class VoiceSessionController {
  readonly buffer = new TranscriptBuffer();
  private state: VoiceState = 'idle';
  private level = 0;
  private error: SpeechError | null = null;
  private restarts = 0;
  private listeners = new Set<(s: Snapshot) => void>();
  private unsubs: Unsub[] = [];
  private vocabulary: string[] = [];
  private wantListening = false;
  private transientRun = 0;
  private networkRun = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private o: Required<Omit<ControllerOptions, 'log'>> & { log: (m: string) => void };

  constructor(private provider: UrduSpeechProvider, opts: ControllerOptions = {}) {
    this.o = { log: opts.log ?? (() => {}), restartDelayMs: opts.restartDelayMs ?? 350, resumeDelayMs: opts.resumeDelayMs ?? 400, maxTransient: opts.maxTransient ?? 6, networkRetries: opts.networkRetries ?? 2 };
    this.unsubs.push(
      provider.onPartialResult((t) => { if (this.active() && this.state !== 'paused') { this.transientRun = 0; this.networkRun = 0; if (this.buffer.applyPartial(t)) this.emit(); } }),
      provider.onFinalResult((t) => {
        if (!this.active()) return;
        if (t.trim()) { this.transientRun = 0; this.networkRun = 0; }
        if (this.buffer.applyFinal(t)) this.emit();
        else if (t.trim() && this.buffer.tentative) { this.buffer.applyPartial(''); this.emit(); }
      }),
      provider.onVolume((v) => { if (this.state === 'listening') { this.level = v; this.emit(); } }),
      provider.onError((e) => this.handleError(e)),
      provider.onEnd(() => this.handleEnd()),
    );
  }

  /** a session is running (or finishing); anything else must ignore engine events */
  private active() { return this.state === 'starting' || this.state === 'listening' || this.state === 'paused' || this.state === 'stopping'; }

  subscribe(cb: (s: Snapshot) => void): Unsub { this.listeners.add(cb); cb(this.snapshot()); return () => { this.listeners.delete(cb); }; }
  snapshot(): Snapshot { return { state: this.state, confirmed: this.buffer.confirmed, tentative: this.buffer.tentative, full: this.buffer.full, level: this.level, error: this.error, restarts: this.restarts }; }
  private emit() { const s = this.snapshot(); this.listeners.forEach((l) => l(s)); }
  private go(e: VoiceEvent) { const n = transition(this.state, e); if (n !== this.state) { this.o.log(`state ${this.state} -> ${n} (${e})`); this.state = n; this.emit(); } }

  /** Load text recovered from an earlier interrupted session. */
  seed(text: string) { this.buffer.reset(text); this.emit(); }

  async start(vocabulary: string[] = []): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped' && this.state !== 'error') return;
    this.vocabulary = vocabulary; this.error = null; this.restarts = 0; this.transientRun = 0; this.networkRun = 0; this.wantListening = true;
    this.go('START');
    try {
      const av = await this.provider.isAvailable();
      if (!av.ok) throw this.mkErr(av.reason === 'offline' ? 'network' : av.reason === 'permission' ? 'permission' : 'unsupported', `unavailable:${av.reason}`, true);
      if (!(await this.provider.requestPermission())) throw this.mkErr('permission', 'permission denied', true);
      await this.provider.startRecording({ vocabulary });
      this.go('STARTED');
    } catch (e: any) { this.fail(e?.code ? e : this.mkErr('unknown', String(e?.message || e), true)); }
  }

  async pause(): Promise<void> {
    if (this.state !== 'listening') return;
    this.wantListening = false; this.clearRestart(); this.go('PAUSE');
    try { await this.provider.pauseRecording(); } catch { /* the final result still flushes through events */ }
    this.buffer.flushTentative(); this.emit();
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    this.wantListening = true; this.transientRun = 0; this.go('RESUME');
    await sleep(this.o.resumeDelayMs); // let the native recognizer release the microphone first
    if ((this.state as VoiceState) !== 'starting') return;
    try { await this.provider.resumeRecording(); this.go('STARTED'); }
    catch (e: any) { this.handleError(e?.code ? e : this.mkErr('transient', String(e?.message || e), false)); }
  }

  async stop(): Promise<void> {
    if (this.state === 'idle' || this.state === 'stopped') return;
    this.wantListening = false; this.clearRestart();
    if (this.state === 'paused' || this.state === 'starting' || this.state === 'error') { this.buffer.flushTentative(); this.go('STOP'); if ((this.state as VoiceState) !== 'stopped') { this.state = 'stopped'; } this.emit(); return; }
    this.go('STOP');
    try { await this.provider.stopRecording(); } catch { /* ignore */ }
    // Give the engine a moment to deliver its last final result, then settle.
    setTimeout(() => this.settle(), 700);
  }

  private settle() { if (this.state === 'stopping') { this.buffer.flushTentative(); this.go('ENDED'); } }

  private clearRestart() { if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; } }

  /** Re-start the engine after a short delay while the user still wants to listen. */
  private scheduleRestart(reason: string) {
    if (this.restartTimer || !this.wantListening) return;
    this.buffer.flushTentative(); this.emit();
    if (this.restarts >= MAX_AUTO_RESTARTS) { this.fail(this.mkErr('unknown', 'too many restarts', false)); return; }
    this.restarts++;
    const delay = this.o.restartDelayMs * Math.min(1 + this.transientRun, 5);
    this.o.log(`restart #${this.restarts} in ${delay}ms (${reason})`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.wantListening || (this.state !== 'listening' && this.state !== 'starting')) return;
      this.provider.startRecording({ vocabulary: this.vocabulary }).then(() => { if (this.state === 'starting') this.go('STARTED'); })
        .catch((e: any) => this.handleError(e?.code ? e : this.mkErr('transient', String(e?.message || e), false)));
    }, delay);
  }

  private handleEnd() {
    if (!this.active()) return;
    if (this.state === 'stopping') { this.buffer.flushTentative(); this.go('ENDED'); return; }
    if (this.state === 'listening' && this.wantListening) this.scheduleRestart('engine ended');
  }

  private handleError(e: SpeechError) {
    if (!this.active()) { this.o.log(`ignored ${e.code} while ${this.state}`); return; }
    this.o.log(`error ${e.code} ${e.message}`);
    if (this.state === 'stopping') { this.buffer.flushTentative(); this.go('FAIL'); return; }
    if (this.wantListening && (this.state === 'listening' || this.state === 'starting')) {
      if (e.code === 'no-speech') { this.scheduleRestart('no speech'); return; }
      if (e.code === 'transient' && ++this.transientRun <= this.o.maxTransient) { this.scheduleRestart('transient'); return; }
      if (e.code === 'network' && ++this.networkRun <= this.o.networkRetries) { this.scheduleRestart('network'); return; }
    }
    this.fail(e);
  }

  private fail(e: SpeechError) {
    this.buffer.flushTentative();
    this.error = e; this.wantListening = false; this.clearRestart();
    this.go('FAIL');
    if ((this.state as VoiceState) !== 'error') { this.state = 'error'; }
    this.emit();
  }

  private mkErr(code: SpeechError['code'], message: string, fatal: boolean): SpeechError { return { code, message, fatal }; }

  dispose() { this.clearRestart(); this.wantListening = false; this.unsubs.forEach((u) => u()); this.unsubs = []; this.listeners.clear(); this.provider.stopRecording().catch(() => {}); }
}
