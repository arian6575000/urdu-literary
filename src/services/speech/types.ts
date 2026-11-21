export type Unsub = () => void;

export interface StartOptions {
  /** Personal-dictionary words, passed to engines that support vocabulary hints. */
  vocabulary: string[];
}
export interface ProviderAvailability { ok: boolean; reason?: 'unsupported' | 'offline' | 'not-configured' | 'permission' }

/**
 * Engine-independent contract. The editor / voice screen only ever talks to this interface,
 * so the engine (on-device, Google Cloud STT, Whisper...) can be replaced without touching the UI.
 * Not every engine streams: a non-streaming engine simply never calls onPartialResult.
 */
export interface UrduSpeechProvider {
  readonly id: 'device' | 'cloud';
  readonly requiresInternet: boolean;
  /** Which optional features this engine really supports (never assumed). */
  readonly supports: { streamingPartials: boolean; vocabularyHints: boolean; volume: boolean };
  isAvailable(): Promise<ProviderAvailability>;
  requestPermission(): Promise<boolean>;
  startRecording(opts: StartOptions): Promise<void>;
  /** Stop and flush: pending text must arrive through onFinalResult before onEnd. */
  stopRecording(): Promise<void>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  onPartialResult(cb: (text: string) => void): Unsub;
  onFinalResult(cb: (text: string) => void): Unsub;
  onError(cb: (e: SpeechError) => void): Unsub;
  /** Engine finished a recognition cycle by itself (e.g. Android ends after silence). */
  onEnd(cb: () => void): Unsub;
  onVolume(cb: (level01: number) => void): Unsub;
}

export type SpeechErrorCode = 'permission' | 'network' | 'no-speech' | 'unsupported' | 'audio' | 'server' | 'unknown';
export interface SpeechError { code: SpeechErrorCode; message: string; fatal: boolean }
