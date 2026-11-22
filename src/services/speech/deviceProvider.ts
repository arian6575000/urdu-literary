import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { logEvent } from '../diagnostics';
import type { ProviderAvailability, SpeechError, SpeechErrorCode, StartOptions, Unsub, UrduSpeechProvider } from './types';

const mapError = (code: string, message: string): SpeechError => {
  const m: Record<string, SpeechErrorCode> = {
    'not-allowed': 'permission', 'service-not-allowed': 'unsupported', 'language-not-supported': 'unsupported',
    network: 'network', 'no-speech': 'no-speech', 'speech-timeout': 'no-speech', 'audio-capture': 'audio', busy: 'transient', client: 'transient', aborted: 'transient', server: 'server',
  };
  const c = m[code] ?? 'unknown';
  return { code: c, message: `${code}${message ? ': ' + message : ''}`, fatal: c !== 'no-speech' && c !== 'transient' };
};

/**
 * Android's own SpeechRecognizer (Google speech service) for ur-PK. Supports streaming partials and
 * volume events; vocabulary hints are passed as contextualStrings (best-effort — the OS may ignore them).
 */
export class DeviceSpeechProvider implements UrduSpeechProvider {
  constructor(private getLang: () => string = () => 'ur-PK') {}
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
      M.addListener('error', (ev: any) => { logEvent('voice', `native error ${ev.error} ${ev.message ?? ''}`); this.errorCbs.forEach((c) => c(mapError(ev.error, ev.message))); }).remove,
      M.addListener('end', () => { logEvent('voice', 'native end'); this.endCbs.forEach((c) => c()); }).remove,
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
    const lang = this.getLang();
    logEvent('voice', `start lang=${lang} vocab=${opts.vocabulary.length}`);
    ExpoSpeechRecognitionModule.start({
      lang, interimResults: true, continuous: true, maxAlternatives: 1, addsPunctuation: false,
      requiresOnDeviceRecognition: false, // network recognition is far more accurate for Urdu than the small offline model
      contextualStrings: opts.vocabulary.slice(0, 100),
      volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
      // hints for the Google recognizer: do not cut the sentence on short pauses (poetry has long pauses)
      androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 4000, EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3500, EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2000, EXTRA_PREFER_OFFLINE: false },
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
