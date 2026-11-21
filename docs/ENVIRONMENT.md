# Environment
* Node 22, JDK 17, Android SDK (for local builds). Expo SDK 58 / RN 0.88 (versions pinned in package.json; use `npx expo install` to add packages).
* App config: `app.json` (`extra.speechProxyUrl` unused; the proxy URL/token are entered in the app and the token is kept in Android Keystore).
* Server (`server/`): `APP_TOKEN` (required), `STT_PROVIDER=openai|google|mock`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `PORT`. Copy `.env.example`. Deploy anywhere with Node ≥ 20 behind HTTPS.
* Paid services: OpenAI Whisper or Google Cloud STT — only for the online engine. The on-device engine is free.
* Permissions: `RECORD_AUDIO` only (requested at first voice use). Storage permissions are blocked.
