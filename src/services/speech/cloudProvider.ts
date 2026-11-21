import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as Network from 'expo-network';
import type { ProviderAvailability, SpeechError, StartOptions, Unsub, UrduSpeechProvider } from './types';

const CHUNK_MIN_MS = 3000, CHUNK_MAX_MS = 9000, SILENCE_MS = 650, SILENCE_DB = -42;

export interface CloudConfig { baseUrl: string; token: string }

/**
 * Records short audio segments (cut at natural pauses) and sends each to YOUR backend proxy (server/index.js),
 * which holds the Google Cloud STT / Whisper credentials. No API secret is ever inside the APK.
 * This engine is not streaming: text arrives per segment as a final result, so onPartialResult is never called.
 */
export class CloudSpeechProvider implements UrduSpeechProvider {
  readonly id = 'cloud' as const;
  readonly requiresInternet = true;
  readonly supports = { streamingPartials: false, vocabularyHints: true, volume: true };
  private partialCbs = new Set<(t: string) => void>();
  private finalCbs = new Set<(t: string) => void>();
  private errorCbs = new Set<(e: SpeechError) => void>();
  private endCbs = new Set<() => void>();
  private volCbs = new Set<(v: number) => void>();
  private rec: any = null;
  private running = false;
  private vocab: string[] = [];
  private pendingUploads = 0;
  private failed: string[] = []; // chunk files whose upload failed, retried on the next resume
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private chunkStart = 0;
  private lastLoud = 0;
  private cutting = false;

  constructor(private cfg: () => CloudConfig) {}

  async isAvailable(): Promise<ProviderAvailability> {
    if (!this.cfg().baseUrl) return { ok: false, reason: 'not-configured' };
    try { const n = await Network.getNetworkStateAsync(); if (!n.isConnected || n.isInternetReachable === false) return { ok: false, reason: 'offline' }; } catch { /* assume online */ }
    return { ok: true };
  }
  async requestPermission(): Promise<boolean> { return (await requestRecordingPermissionsAsync()).granted; }

  async startRecording(opts: StartOptions): Promise<void> {
    this.vocab = opts.vocabulary;
    this.running = true;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true } as any);
    await this.retryFailed();
    await this.beginChunk();
  }
  async resumeRecording(): Promise<void> { await this.startRecording({ vocabulary: this.vocab }); }
  async pauseRecording(): Promise<void> { this.running = false; await this.endChunk(); }
  async stopRecording(): Promise<void> {
    this.running = false;
    await this.endChunk();
    const wait = Date.now() + 30000;
    while (this.pendingUploads > 0 && Date.now() < wait) await new Promise((r) => setTimeout(r, 150));
    this.endCbs.forEach((c) => c());
  }

  private async beginChunk() {
    const rec = new (AudioModule as any).AudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true, sampleRate: 16000, numberOfChannels: 1 });
    await rec.prepareToRecordAsync();
    rec.record();
    this.rec = rec; this.chunkStart = Date.now(); this.lastLoud = Date.now(); this.cutting = false;
    this.meterTimer = setInterval(() => this.tick(), 80);
  }

  private tick() {
    try {
      const st = this.rec?.getStatus?.();
      const db: number = typeof st?.metering === 'number' ? st.metering : -160;
      this.volCbs.forEach((c) => c(Math.max(0, Math.min(1, (db + 60) / 60))));
      const now = Date.now();
      if (db > SILENCE_DB) this.lastLoud = now;
      const age = now - this.chunkStart;
      if (this.running && !this.cutting && ((age > CHUNK_MIN_MS && now - this.lastLoud > SILENCE_MS) || age > CHUNK_MAX_MS)) {
        this.cutting = true;
        this.endChunk().then(() => { if (this.running) return this.beginChunk(); }).catch((e) => this.fail('audio', String(e?.message || e)));
      }
    } catch { /* recorder may be mid-teardown */ }
  }

  private async endChunk() {
    if (this.meterTimer) { clearInterval(this.meterTimer); this.meterTimer = null; }
    const rec = this.rec; this.rec = null;
    if (!rec) return;
    let uri: string | null = null;
    try { await rec.stop(); uri = rec.uri; } catch { /* nothing recorded */ }
    try { rec.release?.(); } catch { /* ignore */ }
    if (uri && Date.now() - this.chunkStart > 400) { this.pendingUploads++; this.upload(uri).finally(() => { this.pendingUploads--; }); }
  }

  private async retryFailed() {
    const list = this.failed.splice(0);
    for (const u of list) { this.pendingUploads++; this.upload(u).finally(() => { this.pendingUploads--; }); }
  }

  private async upload(uri: string) {
    const { baseUrl, token } = this.cfg();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const form = new FormData();
        form.append('audio', { uri, name: 'chunk.m4a', type: 'audio/mp4' } as any);
        form.append('lang', 'ur-PK');
        form.append('vocab', JSON.stringify(this.vocab.slice(0, 100)));
        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/transcribe`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
        if (res.status === 401 || res.status === 403) return this.fail('server', 'auth');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (typeof j.text === 'string' && j.text.trim()) this.finalCbs.forEach((c) => c(j.text));
        return;
      } catch (e: any) {
        if (attempt === 2) { this.failed.push(uri); return this.fail('network', String(e?.message || e)); }
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      }
    }
  }

  private fail(code: SpeechError['code'], message: string) {
    this.errorCbs.forEach((c) => c({ code, message, fatal: code !== 'no-speech' }));
  }

  private add<T>(set: Set<T>, cb: T): Unsub { set.add(cb); return () => { set.delete(cb); }; }
  onPartialResult(cb: (t: string) => void) { return this.add(this.partialCbs, cb); }
  onFinalResult(cb: (t: string) => void) { return this.add(this.finalCbs, cb); }
  onError(cb: (e: SpeechError) => void) { return this.add(this.errorCbs, cb); }
  onEnd(cb: () => void) { return this.add(this.endCbs, cb); }
  onVolume(cb: (v: number) => void) { return this.add(this.volCbs, cb); }
}
