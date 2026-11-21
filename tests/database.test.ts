import assert from 'node:assert/strict';
import { createNodeDb } from './nodeDb';
import { initDatabase, integrityCheck } from '../src/database/init';
import { getDb } from '../src/database/db';
import * as W from '../src/database/repositories/writings';
import * as D from '../src/database/repositories/dictionary';
import * as V from '../src/database/repositories/voice';
import * as St from '../src/database/repositories/settings';

(async () => {
  const db = createNodeDb();
  await initDatabase(db);
  assert.equal((await db.getFirstAsync<any>('PRAGMA user_version'))!.user_version, 1);
  await initDatabase(db); // idempotent
  const tables = (await db.getAllAsync<any>("SELECT name FROM sqlite_master WHERE type='table'")).map((t) => t.name);
  for (const t of ['writings', 'writing_categories', 'writing_versions', 'voice_sessions', 'voice_transcripts', 'custom_dictionary', 'favorites', 'export_history', 'app_settings']) assert.ok(tables.includes(t), t);
  assert.equal((await db.getAllAsync('SELECT * FROM writing_categories')).length, 9);

  const a = await W.createWriting({ title: 'غزل ایک', content: 'دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے', category_id: 'ghazal' });
  const b = await W.createWriting({ title: 'مضمون', content: 'زندگي بہت خوبصورت ہے', category_id: 'mazmoon' });
  assert.equal(a.word_count, 13);
  // search ignores diacritics and Arabic/Urdu letter forms
  assert.equal((await W.listWritings({ text: 'دل ناداں' })).length, 1);
  assert.equal((await W.listWritings({ text: 'زندگی' })).length, 1); // stored with Arabic yeh
  assert.equal((await W.listWritings({ text: 'خوبصورت زندگی' })).length, 1); // all words must match
  assert.equal((await W.listWritings({ text: 'نہیں ملے گا' })).length, 0);
  assert.equal((await W.listWritings({ category: 'ghazal' })).length, 1);
  // favorites
  await W.setFavorite(a.id, true);
  assert.equal((await W.listWritings({ favoritesOnly: true })).length, 1);
  assert.equal((await db.getAllAsync('SELECT * FROM favorites')).length, 1);
  await W.setFavorite(a.id, false); assert.equal((await db.getAllAsync('SELECT * FROM favorites')).length, 0);
  // versions: only snapshot when requested and text changed
  await W.updateWriting(a.id, { content: 'نیا متن' }, true);
  await W.updateWriting(a.id, { content: 'نیا متن' }, true); // unchanged -> no extra version
  let vs = await W.listVersions(a.id); assert.equal(vs.length, 1); assert.ok(vs[0].content.startsWith('دلِ ناداں'));
  await W.restoreVersion(vs[0].id); assert.ok((await W.getWriting(a.id))!.content.startsWith('دلِ ناداں'));
  assert.equal((await W.listVersions(a.id)).length, 2);
  for (let i = 0; i < 40; i++) await W.updateWriting(a.id, { content: `متن ${i}` }, true);
  assert.ok((await W.listVersions(a.id)).length <= 30); // capped
  const c = await W.countWritings(); assert.equal(c.total, 2); assert.equal(c.byCategory.mazmoon, 1);
  // sort
  const newest = await W.listWritings({ sort: 'newest' }); assert.equal(newest.length, 2);
  // dictionary
  await D.saveDictEntry({ word: 'غالبؔ', wrong_forms: 'غالب، غالیب' });
  await D.saveDictEntry({ word: 'غالبؔ', note: 'شاعر' }); // upsert, no duplicate
  const dl = await D.listDictionary(); assert.equal(dl.length, 1); assert.equal(dl[0].note, 'شاعر');
  await assert.rejects(() => D.saveDictEntry({ word: '  ' }));
  // voice: original kept apart from edited
  const sid = await V.startVoiceSession('device');
  await V.saveTranscript(sid, 'اصل متن', 'اصل متن'); await V.saveTranscript(sid, 'اصل متن', 'ترمیم شدہ');
  const t = await db.getFirstAsync<any>('SELECT * FROM voice_transcripts'); assert.equal(t.original_text, 'اصل متن'); assert.equal(t.edited_text, 'ترمیم شدہ');
  assert.equal((await V.lastUnlinkedTranscript())?.session_id, sid);
  await V.linkSessionToWriting(sid, b.id); assert.equal(await V.lastUnlinkedTranscript(), null);
  await V.deleteAllVoiceData(); assert.equal((await db.getAllAsync('SELECT * FROM voice_transcripts')).length, 0);
  // settings
  await St.setSetting('k', '1'); await St.setSetting('k', '2'); assert.equal(await St.getSetting('k'), '2');
  // cascade delete
  await W.deleteWriting(a.id); assert.equal((await W.listVersions(a.id)).length, 0);
  const ic = await integrityCheck(getDb()); assert.ok(ic.ok, ic.detail);
  await W.wipeAllWritings(); assert.equal((await W.countWritings()).total, 0);
  console.log('database ✓');
})();
