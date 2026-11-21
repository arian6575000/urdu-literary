// Speech-to-text proxy for the Urdu Literary App ("آن لائن" engine).
// Zero dependencies, Node 20+. The STT credentials live ONLY here (environment variables) — never in the APK.
//
//   STT_PROVIDER = openai | google | mock          (default: openai)
//   APP_TOKEN    = shared secret the app sends as "Authorization: Bearer <token>"  (required)
//   OPENAI_API_KEY, OPENAI_STT_MODEL (default whisper-1)           — provider "openai"
//   GOOGLE_API_KEY, GOOGLE_STT_MODEL (default latest_long)         — provider "google" (needs `ffmpeg` on PATH)
//   PORT (default 8787), RATE_LIMIT_PER_MIN (default 60)
//
//   POST /transcribe   multipart: audio (file), lang ("ur-PK"), vocab (JSON array of words)   ->  { "text": "..." }
//   GET  /health
import http from 'node:http';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';

const PORT = +process.env.PORT || 8787;
const PROVIDER = process.env.STT_PROVIDER || 'openai';
const TOKEN = process.env.APP_TOKEN || '';
const MAX_BYTES = 6 * 1024 * 1024;
const LIMIT = +process.env.RATE_LIMIT_PER_MIN || 60;
if (!TOKEN) { console.error('APP_TOKEN is required'); process.exit(1); }

const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = (hits.get(ip) || []).filter((t) => now - t < 60000);
  w.push(now); hits.set(ip, w);
  return w.length > LIMIT;
}
const authed = (h) => {
  const m = /^Bearer (.+)$/.exec(h || '');
  if (!m) return false;
  const a = Buffer.from(m[1]), b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
};

async function openaiTranscribe(file, vocab) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  const fd = new FormData();
  fd.append('file', file, file.name || 'chunk.m4a');
  fd.append('model', process.env.OPENAI_STT_MODEL || 'whisper-1');
  fd.append('language', 'ur');
  fd.append('response_format', 'json');
  if (vocab.length) fd.append('prompt', vocab.join('، ')); // Whisper uses the prompt as a spelling/vocabulary hint
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: fd });
  if (!r.ok) throw new Error(`openai ${r.status}`);
  return (await r.json()).text || '';
}

function toWav(buf) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 'wav', 'pipe:1']);
    const out = []; let err = '';
    p.stdout.on('data', (d) => out.push(d)); p.stderr.on('data', (d) => (err += d));
    p.on('error', reject); p.on('close', (c) => (c === 0 ? resolve(Buffer.concat(out)) : reject(new Error('ffmpeg: ' + err))));
    p.stdin.end(buf);
  });
}
async function googleTranscribe(file, vocab, lang) {
  if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing');
  const wav = await toWav(Buffer.from(await file.arrayBuffer())); // Google STT v1 does not accept AAC/m4a
  const body = {
    config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: lang || 'ur-PK', model: process.env.GOOGLE_STT_MODEL || 'latest_long', enableAutomaticPunctuation: false, speechContexts: vocab.length ? [{ phrases: vocab, boost: 10 }] : [] },
    audio: { content: wav.toString('base64') },
  };
  const r = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`google ${r.status}`);
  const j = await r.json();
  return (j.results || []).map((x) => x.alternatives?.[0]?.transcript || '').join(' ').trim();
}

const providers = { openai: openaiTranscribe, google: googleTranscribe, mock: async () => 'یہ آزمائشی متن ہے' };

const server = http.createServer(async (req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, provider: PROVIDER });
    if (req.method !== 'POST' || req.url !== '/transcribe') return send(404, { error: 'not found' });
    if (!authed(req.headers.authorization)) return send(401, { error: 'unauthorized' });
    if (limited(req.socket.remoteAddress || 'x')) return send(429, { error: 'rate limited' });
    const len = +req.headers['content-length'] || 0;
    if (len > MAX_BYTES) return send(413, { error: 'too large' });

    // Let the platform parse multipart for us (no dependencies).
    const wrapped = new Request('http://local/x', { method: 'POST', headers: { 'content-type': req.headers['content-type'] || '' }, body: req, duplex: 'half' });
    const form = await wrapped.formData();
    const file = form.get('audio');
    if (!file || typeof file === 'string') return send(400, { error: 'audio missing' });
    if (file.size > MAX_BYTES) return send(413, { error: 'too large' });
    let vocab = []; try { vocab = JSON.parse(String(form.get('vocab') || '[]')).filter((x) => typeof x === 'string').slice(0, 100); } catch { /* ignore */ }
    const fn = providers[PROVIDER];
    if (!fn) return send(500, { error: 'bad provider' });
    const text = await fn(file, vocab, String(form.get('lang') || 'ur-PK'));
    return send(200, { text: String(text).trim() });
  } catch (e) {
    console.error(e.message);
    return send(502, { error: 'transcription failed' });
  }
});
server.listen(PORT, () => console.log(`STT proxy on :${PORT} (${PROVIDER})`));
