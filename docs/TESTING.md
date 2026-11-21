# Testing
## Automated (`npm test`, 6 suites — all passing when delivered)
text utils (Urdu normalisation, couplets, digits) · transcript buffer + voice state machine with a fake engine (partial replace, no duplicates, pause/resume,
silence auto-restart, permission denied, offline, mid-session error keeps text) · correction (suggest-only, apply, stale refusal) ·
database (migrations, CRUD, diacritic-insensitive search, favourites, version cap 30, dictionary upsert, voice original vs edited, cascade, integrity) ·
backup (JSON/ZIP round trip, duplicate detection, id clash, validation) · PDF HTML.
`npm run typecheck` is clean.

## Verified in a real browser
The PDF HTML was rendered with Chromium 157 using the bundled font: Nastaleeq ligatures, RTL, mixed Urdu/English, Urdu digits, couplets, cover page without number,
page numbers and the company-credit footer on every page. (Android's print WebView is Chromium-based; re-check on a device.)

## NOT yet verified — needs a real Android phone
1. Dev build installs; RTL on first launch and after restart. 2. Alvi Nastaleeq line heights (no clipped dots) in editor, reader, card.
3. **ur-PK live recognition quality** on your phone; offline pack; permission denial flow; airplane mode. 4. Cloud engine against your deployed server.
5. Card PNG/JPG export & share; PDF share; WhatsApp. 6. Backup/restore files via the system picker. 7. PIN/biometric lock, re-lock after 1 min.
8. Android back button on every screen; large documents; memory.
Voice accuracy needs a benchmark: record 20–30 Urdu clips, compare device vs Whisper vs Google on your server, choose the default.
