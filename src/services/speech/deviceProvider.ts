import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { ProviderAvailability, SpeechError, SpeechErrorCode, StartOptions, Unsub, UrduSpeechProvider } from './types';

const LANG = 'ur-PK';

const mapError = (code: string, message: string): SpeechError => {
  const m: Record<string, SpeechErrorCode> = {
    'not-allowed': 'permission', 'service-not-allowed': 'unsupported', 'language-not-supported': 'unsupported',
    network: 'network', 'no-speech': 'no-speech', 'speech-timeout': 'no-speech', 'audio-capture': 'audio', 'busy': 'audio', 'client': 'unknown', 'server': 'server', 'aborted': 'unknown',
  };
  const c = m[code] ?? 'unknown';
  return { code: c, message: message || code, fatal: c !== 'no-speech' };
};

/**
 * Android's own SpeechRecognizer (Google speech service) for ur-PK. Supports streaming partials and
 * volume events; vocabulary hints are passed as contextualStrings (best-effort — the OS may ignore them).
 */
export class DeviceSpeechProvider implements UrduSpeechProvider {
  readonly id = 'device' as const;
  readonly requiresInternet = false; // may work offline if the Urdu language pack is installed; otherwise Google's service needs internet
  readonly supports = { streamingPartials: true, vocabularyHints: true, volume: true };
  private subs: Unsub[] = [];
  private partialCbs = new Set<(t: string) => void>();
  private finalCbs = new Set<(t: string) => void>();
  private errorCbs = new Set<(e: SpeechError) => void>();
  private endCbs = new Set<() => void>();
  private volCbs = new Set<(v: number) => void>();
  private lastOptions: StartOptions = { vocabulary: [] };
  private attached = false;

  private attach() {
    if (this.attached) return;
    this.attached = true;
    const M = ExpoSpeechRecognitionModule as any;
    this.subs.push(
      M.addListener('result', (ev: any) => {
        const text: string = ev?.results?.[0]?.transcript ?? '';
        if (ev.isFinal) this.finalCbs.forEach((c) => c(text)); else this.partialCbs.forEach((c) => c(text));
      }).remove,
      M.addListener('error', (ev: any) => this.errorCbs.forEach((c) => c(mapError(ev.error, ev.message)))).remove,
      M.addListener('end', () => this.endCbs.forEach((c) => c())).remove,
      M.addListener('volumechange', (ev: any) => { const v = Math.max(0, Math.min(1, ((ev?.value ?? 0) + 2) / 12)); this.volCbs.forEach((c) => c(v)); }).remove,
    );
  }

  async isAvailable(): Promise<ProviderAvailability> {
    try { return ExpoSpeechRecognitionModule.isRecognitionAvailable() ? { ok: true } : { ok: false, reason: 'unsupported' }; }
    catch { return { ok: false, reason: 'unsupported' }; }
  }
  async requestPermission(): Promise<boolean> {
    const r = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return !!r.granted;
  }
  async startRecording(opts: StartOptions): Promise<void> {
    this.attach();
    this.lastOptions = opts;
    ExpoSpeechRecognitionModule.start({
      lang: LANG, interimResults: true, continuous: true, maxAlternatives: 1, addsPunctuation: false,
      contextualStrings: opts.vocabulary.slice(0, 100),
      volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
    } as any);
  }
  async stopRecording(): Promise<void> { ExpoSpeechRecognitionModule.stop(); }
  async pauseRecording(): Promise<void> { ExpoSpeechRecognitionModule.stop(); } // stop() flushes the pending text as a final result
  async resumeRecording(): Promise<void> { await this.startRecording(this.lastOptions); }

  private add<T>(set: Set<T>, cb: T): Unsub { set.add(cb); return () => { set.delete(cb); }; }
  onPartialResult(cb: (t: string) => void) { return this.add(this.partialCbs, cb); }
  onFinalResult(cb: (t: string) => void) { return this.add(this.finalCbs, cb); }
  onError(cb: (e: SpeechError) => void) { return this.add(this.errorCbs, cb); }
  onEnd(cb: () => void) { return this.add(this.endCbs, cb); }
  onVolume(cb: (v: number) => void) { return this.add(this.volCbs, cb); }
}
