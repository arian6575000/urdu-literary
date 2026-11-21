import assert from 'node:assert/strict';
import { TranscriptBuffer } from '../src/services/speech/transcriptBuffer';
import { VoiceSessionController, transition } from '../src/services/speech/sessionController';
import type { ProviderAvailability, SpeechError, StartOptions, Unsub, UrduSpeechProvider } from '../src/services/speech/types';

// ---- buffer ----
{
  const b = new TranscriptBuffer();
  b.applyPartial('میں'); b.applyPartial('میں نے'); b.applyPartial('میں نے کہا');
  assert.equal(b.confirmed, ''); assert.equal(b.tentative, 'میں نے کہا'); // partials REPLACE, never append
  b.applyFinal('میں نے کہا');
  assert.equal(b.confirmed, 'میں نے کہا'); assert.equal(b.tentative, '');
  assert.equal(b.applyFinal('میں نے کہا'), false); // exact repeat ignored
  b.applyFinal('میں نے کہا کہ آؤ'); // cumulative result replaces last segment
  assert.equal(b.confirmed, 'میں نے کہا کہ آؤ');
  b.applyFinal('کہ آؤ ہم چلیں'); // overlap trimmed
  assert.equal(b.confirmed, 'میں نے کہا کہ آؤ ہم چلیں');
  b.applyPartial('اور'); assert.equal(b.full, 'میں نے کہا کہ آؤ ہم چلیں اور');
  b.flushTentative(); assert.equal(b.tentative, ''); assert.ok(b.confirmed.endsWith('اور'));
}
// ---- state table ----
assert.equal(transition('idle', 'START'), 'starting');
assert.equal(transition('starting', 'STARTED'), 'listening');
assert.equal(transition('listening', 'PAUSE'), 'paused');
assert.equal(transition('paused', 'RESUME'), 'starting');
assert.equal(transition('listening', 'STOP'), 'stopping');
assert.equal(transition('stopping', 'ENDED'), 'stopped');
assert.equal(transition('idle', 'PAUSE'), 'idle');
assert.equal(transition('stopped', 'START'), 'starting');

// ---- controller with a fake engine ----
class Fake implements UrduSpeechProvider {
  readonly id = 'device' as const; readonly requiresInternet = false;
  readonly supports = { streamingPartials: true, vocabularyHints: true, volume: true };
  p = new Set<(t: string) => void>(); f = new Set<(t: string) => void>(); e = new Set<(x: SpeechError) => void>(); n = new Set<() => void>(); v = new Set<(x: number) => void>();
  starts = 0; perm = true; avail: ProviderAvailability = { ok: true };
  async isAvailable() { return this.avail; }
  async requestPermission() { return this.perm; }
  async startRecording(_o: StartOptions) { this.starts++; }
  async stopRecording() { setTimeout(() => this.n.forEach((c) => c()), 5); }
  async pauseRecording() { this.f.forEach((c) => c('')); }
  async resumeRecording() { this.starts++; }
  onPartialResult(cb: (t: string) => void): Unsub { this.p.add(cb); return () => this.p.delete(cb); }
  onFinalResult(cb: (t: string) => void): Unsub { this.f.add(cb); return () => this.f.delete(cb); }
  onError(cb: (x: SpeechError) => void): Unsub { this.e.add(cb); return () => this.e.delete(cb); }
  onEnd(cb: () => void): Unsub { this.n.add(cb); return () => this.n.delete(cb); }
  onVolume(cb: (x: number) => void): Unsub { this.v.add(cb); return () => this.v.delete(cb); }
  partial(t: string) { this.p.forEach((c) => c(t)); } final(t: string) { this.f.forEach((c) => c(t)); } end() { this.n.forEach((c) => c()); } err(x: SpeechError) { this.e.forEach((c) => c(x)); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // happy path + pause/resume + auto-restart + stop
  { const f = new Fake(); const c = new VoiceSessionController(f);
    await c.start(['غالب']); assert.equal(c.snapshot().state, 'listening'); assert.equal(f.starts, 1);
    f.partial('دل'); f.partial('دلِ ناداں'); assert.equal(c.snapshot().tentative, 'دلِ ناداں'); assert.equal(c.snapshot().confirmed, '');
    f.final('دلِ ناداں تجھے ہوا کیا ہے'); assert.equal(c.snapshot().confirmed, 'دلِ ناداں تجھے ہوا کیا ہے');
    f.end(); await sleep(5); assert.equal(f.starts, 2); assert.equal(c.snapshot().state, 'listening'); assert.equal(c.snapshot().restarts, 1); // silence timeout -> keeps listening
    assert.equal(c.snapshot().confirmed, 'دلِ ناداں تجھے ہوا کیا ہے'); // text kept across restart
    f.partial('آخر اس درد'); await c.pause(); assert.equal(c.snapshot().state, 'paused'); assert.equal(c.snapshot().tentative, ''); assert.ok(c.snapshot().confirmed.endsWith('آخر اس درد')); // tentative promoted on pause
    await c.resume(); assert.equal(c.snapshot().state, 'listening');
    f.final('کی دوا کیا ہے'); await c.stop(); await sleep(60); assert.equal(c.snapshot().state, 'stopped');
    assert.equal(c.snapshot().full, 'دلِ ناداں تجھے ہوا کیا ہے آخر اس درد کی دوا کیا ہے'); c.dispose(); }
  // permission denied
  { const f = new Fake(); f.perm = false; const c = new VoiceSessionController(f); await c.start();
    assert.equal(c.snapshot().state, 'error'); assert.equal(c.snapshot().error?.code, 'permission'); }
  // offline / unsupported
  { const f = new Fake(); f.avail = { ok: false, reason: 'offline' }; const c = new VoiceSessionController(f); await c.start(); assert.equal(c.snapshot().error?.code, 'network'); }
  { const f = new Fake(); f.avail = { ok: false, reason: 'unsupported' }; const c = new VoiceSessionController(f); await c.start(); assert.equal(c.snapshot().error?.code, 'unsupported'); }
  // error mid-session keeps text
  { const f = new Fake(); const c = new VoiceSessionController(f); await c.start();
    f.final('پہلا جملہ'); f.partial('دوسرا'); f.err({ code: 'network', message: 'x', fatal: true });
    const s = c.snapshot(); assert.equal(s.state, 'error'); assert.equal(s.full, 'پہلا جملہ دوسرا'); assert.equal(s.tentative, ''); }
  // no-speech while listening is not an error
  { const f = new Fake(); const c = new VoiceSessionController(f); await c.start(); f.err({ code: 'no-speech', message: '', fatal: false }); await sleep(5);
    assert.equal(c.snapshot().state, 'listening'); assert.equal(f.starts, 2); }
  // retry after error
  { const f = new Fake(); f.perm = false; const c = new VoiceSessionController(f); await c.start(); f.perm = true; await c.start(); assert.equal(c.snapshot().state, 'listening'); }
  console.log('transcript + state machine ✓');
})();
