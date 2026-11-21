# اردو ادبی ڈائری — Urdu Literary App (temporary name)

Android app (Expo SDK 58, React Native, TypeScript) for Urdu poetry/prose writing with live Urdu voice typing.
UI 100% Urdu, RTL, font **Alvi Nastaleeq**. No license system. Offline-first (SQLite).

## Run
```bash
npm install --legacy-peer-deps
npm run typecheck && npm test
npx expo prebuild --platform android      # voice + audio are native modules: Expo Go will NOT work
npx expo run:android                       # dev build on a connected phone
```
APK in the cloud: GitHub → Actions → **Build Android APK** → Run workflow (manual only). Signing: the workflow builds a release APK signed with the debug keystore that Expo generates — fine for testing; use your own keystore before publishing.

## Voice engines (Settings → آواز کی ترتیبات)
* **فون کی اپنی پہچان (default):** Android SpeechRecognizer, `ur-PK`, live partial text, free. Quality depends on the phone's Google speech service.
* **آن لائن (پراکسی):** run `server/` (see `server/index.js` header) with `APP_TOKEN` + `OPENAI_API_KEY` (Whisper) or `GOOGLE_API_KEY` (+ffmpeg). In the app enter the server URL and token. Keys never enter the APK.

## Docs
`docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/ENVIRONMENT.md`.
