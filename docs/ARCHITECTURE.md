# Architecture
```
src/app/            expo-router screens (UI only)
  _layout, index (splash), onboarding, create, writing/[id] (reader), writing/edit (editor), search, favorites,
  dictionary, card/[id], export, typography, voice-settings, backup, privacy, (tabs)/{index,library,voice,settings}
src/components/     design-system/ (UText, Button, Card, Sheet, Field…), WritingCard, CorrectionSheet, LockScreen
src/features/       library/LibraryView, voice/{VoiceWriter, Waveform}
src/database/       db.ts (Db interface), init.ts (migrations + integrity), migrations/, repositories/ (all SQL lives here)
src/services/       speech/ (provider interface, device + cloud providers, TranscriptBuffer, VoiceSessionController)
                    correction/engine.ts, pdf/html.ts, exporter.ts, backup/{core,files}.ts, privacy/lock.ts
src/stores/         settings (zustand, persisted in app_settings), ui (toast, confirm dialog, data-version bump)
src/constants/      theme (tokens), strings (all Urdu text), categories, app (brand, credit)
server/             zero-dependency STT proxy
```
**Layers:** screens → hooks/stores → repositories/services → SQLite/native modules. No SQL in components.

**Voice:** `UrduSpeechProvider` (start/stop/pause/resume + onPartial/onFinal/onError/onEnd/onVolume). `VoiceSessionController` owns a state machine
(idle→starting→listening⇄paused→stopping→stopped, error) and a `TranscriptBuffer`: partial results REPLACE the tentative text, finals are committed
with overlap/duplicate removal, silence timeouts auto-restart the engine without losing text. Original (raw engine) text is stored separately from edited text
(`voice_transcripts.original_text` / `edited_text`, `writings.original_transcript`). Swap engines by implementing the interface and registering it in `speech/factory.ts`.

**Correction:** suggest-only (`findSuggestions` never mutates). Covers Arabic/Urdu letter forms, Urdu punctuation, spacing, personal-dictionary wrong spellings and near matches. It is NOT a general Urdu spell-checker.

**Data:** tables writings, writing_categories, writing_versions, voice_sessions, voice_transcripts, custom_dictionary, favorites, export_history, app_settings; migrations via `PRAGMA user_version`.
Search normalises diacritics and ي/ی ك/ک ه/ہ before matching.

**Export:** PDF = HTML (font embedded as base64 woff2) → `expo-print`; cards = a dedicated View captured by `react-native-view-shot` at 3× (1080×1350), not an editor screenshot.
Footer of every PDF carries the company credit and Urdu page numbers.

**RTL:** `I18nManager.forceRTL` plus `ROW` helper (explicit `row-reverse` until the OS flag is active, i.e. before the first restart). No left/right margins are used.
