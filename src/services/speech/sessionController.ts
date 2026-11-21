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

const MAX_AUTO_RESTARTS = 200;

/**
 * Drives a provider through the state machine and owns the transcript buffer.
 * - Engine ending by itself while "listening" (silence timeout) restarts it, keeping confirmed text.
 * - On error the text gathered so far is preserved in the buffer.
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

  constructor(private provider: UrduSpeechProvider) {
    this.unsubs.push(
      provider.onPartialResult((t) => { if (this.state === 'listening' || this.state === 'stopping') { if (this.buffer.applyPartial(t)) this.emit(); } }),
      provider.onFinalResult((t) => { if (this.state !== 'idle') { if (this.buffer.applyFinal(t)) this.emit(); else if (t.trim() && this.buffer.tentative) { this.buffer.applyPartial(''); this.emit(); } } }),
      provider.onVolume((v) => { this.level = v; this.emit(); }),
      provider.onError((e) => this.handleError(e)),
      provider.onEnd(() => this.handleEnd()),
    );
  }

  subscribe(cb: (s: Snapshot) => void): Unsub { this.listeners.add(cb); cb(this.snapshot()); return () => { this.listeners.delete(cb); }; }
  snapshot(): Snapshot { return { state: this.state, confirmed: this.buffer.confirmed, tentative: this.buffer.tentative, full: this.buffer.full, level: this.level, error: this.error, restarts: this.restarts }; }
  private emit() { const s = this.snapshot(); this.listeners.forEach((l) => l(s)); }
  private go(e: VoiceEvent) { const n = transition(this.state, e); if (n !== this.state) { this.state = n; this.emit(); } }

  /** Load text recovered from an earlier interrupted session. */
  seed(text: string) { this.buffer.reset(text); this.emit(); }

  async start(vocabulary: string[] = []): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'stopped' && this.state !== 'error') return;
    this.vocabulary = vocabulary; this.error = null; this.restarts = 0; this.wantListening = true;
    this.go('START');
    try {
      const av = await this.provider.isAvailable();
      if (!av.ok) throw this.mkErr(av.reason === 'offline' ? 'network' : av.reason === 'permission' ? 'permission' : 'unsupported', 'unavailable', true);
      if (!(await this.provider.requestPermission())) throw this.mkErr('permission', 'permission denied', true);
      await this.provider.startRecording({ vocabulary });
      this.go('STARTED');
    } catch (e: any) { this.handleError(e?.code ? e : this.mkErr('unknown', String(e?.message || e), true)); }
  }

  async pause(): Promise<void> {
    if (this.state !== 'listening') return;
    this.wantListening = false; this.go('PAUSE');
    try { await this.provider.pauseRecording(); } catch { /* the final result still flushes through events */ }
    this.buffer.flushTentative(); this.emit();
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    this.wantListening = true; this.go('RESUME');
    try { await this.provider.resumeRecording(); this.go('STARTED'); }
    catch (e: any) { this.handleError(e?.code ? e : this.mkErr('unknown', String(e?.message || e), true)); }
  }

  async stop(): Promise<void> {
    if (this.state === 'idle' || this.state === 'stopped') return;
    this.wantListening = false;
    if (this.state === 'paused' || this.state === 'starting' || this.state === 'error') { this.buffer.flushTentative(); this.go('STOP'); if ((this.state as VoiceState) !== 'stopped') this.state = 'stopped'; this.emit(); return; }
    this.go('STOP');
    try { await this.provider.stopRecording(); } catch { /* ignore */ }
    // Give the engine a moment to deliver its last final result, then settle.
    setTimeout(() => this.settle(), 700);
  }

  private settle() {
    if (this.state === 'stopping') { this.buffer.flushTentative(); this.go('ENDED'); }
  }

  private handleEnd() {
    if (this.state === 'stopping') { this.buffer.flushTentative(); this.go('ENDED'); return; }
    if (this.state === 'listening' && this.wantListening) {
      // engine stopped on its own (silence): keep what we have and listen again
      this.buffer.flushTentative(); this.emit();
      if (this.restarts >= MAX_AUTO_RESTARTS) { this.handleError(this.mkErr('unknown', 'too many restarts', false)); return; }
      this.restarts++;
      this.provider.startRecording({ vocabulary: this.vocabulary }).catch((e: any) => this.handleError(e?.code ? e : this.mkErr('unknown', String(e?.message || e), true)));
    }
  }

  private handleError(e: SpeechError) {
    if (e.code === 'no-speech' && this.state === 'listening' && this.wantListening) { this.handleEnd(); return; } // not a real error
    this.buffer.flushTentative();
    this.error = e; this.wantListening = false;
    if (this.state === 'stopping') { this.go('FAIL'); return; }
    this.go('FAIL');
    if (this.state !== 'error') { this.state = 'error'; this.emit(); }
  }

  private mkErr(code: SpeechError['code'], message: string, fatal: boolean): SpeechError { return { code, message, fatal }; }

  dispose() { this.unsubs.forEach((u) => u()); this.unsubs = []; this.listeners.clear(); this.provider.stopRecording().catch(() => {}); }
}
