import assert from 'node:assert/strict';
import { createNodeDb } from './nodeDb';
import { initDatabase, integrityCheck } from '../src/database/init';
import { getDb } from '../src/database/db';
import * as W from '../src/database/repositories/writings';
import * as C from '../src/database/repositories/collections';
import * as K from '../src/database/repositories/cards';
import { buildBackup, restoreBackup, backupToJson, parseBackupBytes } from '../src/services/backup/core';
import { applyTemplate, newDesign } from '../src/features/card/templates';

(async () => {
  const db = createNodeDb();
  await initDatabase(db);
  const a = await W.createWriting({ title: 'غزل', content: 'دل\nدرد', category_id: 'ghazal' });
  const b = await W.createWriting({ title: 'مضمون', content: 'زندگی بہت خوبصورت ہے', category_id: 'mazmoon' });
  const c3 = await W.createWriting({ title: 'نظم', content: 'چاند رات', category_id: 'nazm' });
  await W.setFavorite(a.id, true);

  // ---- writings: poetry/prose tabs + sorts
  assert.equal((await W.listWritings({ kind: 'poetry' })).length, 2); assert.equal((await W.listWritings({ kind: 'prose' })).length, 1);
  assert.equal((await W.listWritings({ kind: 'poetry', category: 'nazm' })).length, 1);
  assert.equal((await W.listWritings({ sort: 'words' }))[0].id, b.id);
  assert.equal((await W.listWritings({ sort: 'title' })).length, 3);
  const stats = await W.countWritings(); assert.equal(stats.total, 3); assert.equal(stats.words, 2 + 4 + 2);

  // ---- collections
  const poems = await C.createCollection({ title: ' میری غزلیں ', description: 'پسندیدہ', color: 3 });
  assert.equal(poems.title, 'میری غزلیں');
  assert.equal(await C.addToCollection(poems.id, [a.id, c3.id]), 2);
  assert.equal(await C.addToCollection(poems.id, [a.id]), 0, 'adding twice is a no-op');
  let list = await C.listCollections(); assert.equal(list[0].count, 2); assert.equal(list[0].favorites, 1); assert.equal(list[0].color, 3);
  assert.equal((await W.listWritings({ collectionId: poems.id })).length, 2);
  assert.equal((await W.listWritings({ collectionId: poems.id, kind: 'prose' })).length, 0);
  assert.deepEqual(await C.collectionIdsFor(a.id), [poems.id]);
  await C.updateCollection(poems.id, { title: 'غزلیں', color: 5 }); assert.equal((await C.getCollection(poems.id))!.title, 'غزلیں'); assert.equal((await C.getCollection(poems.id))!.color, 5);
  await C.removeFromCollection(poems.id, [c3.id]); assert.equal((await C.listCollections())[0].count, 1);
  const essays = await C.createCollection({ title: 'مضامین' }); await C.addToCollection(essays.id, [b.id]);

  // ---- saved card designs
  assert.equal(await K.getCardDesign(a.id), null);
  const d1 = applyTemplate(newDesign({ text: 'دل', title: '', poet: 'م' }), 'royal');
  await K.saveCardDesign(a.id, d1); assert.deepEqual(await K.getCardDesign(a.id), d1, 'design restores exactly');
  const d2 = { ...d1, fontSize: 40 }; await K.saveCardDesign(a.id, d2); assert.equal((await K.getCardDesign(a.id))!.fontSize, 40, 'save overwrites');
  await getDb().runAsync('UPDATE card_designs SET design = ? WHERE writing_id = ?', ['{broken', a.id]); assert.equal(await K.getCardDesign(a.id), null, 'damaged save does not crash');
  await K.saveCardDesign(a.id, d1);

  // ---- backup round trip incl. collections; merge into a fresh database
  const bk = await buildBackup();
  assert.equal(bk.collections!.length, 2); assert.equal(bk.collection_items!.length, 2);
  const parsed = parseBackupBytes(new TextEncoder().encode(backupToJson(bk)));
  const r = await restoreBackup(parsed);
  assert.equal(r.skipped, 3, 'same text -> skipped in the original db');
  assert.equal((await C.listCollections()).length, 2, 'existing collections matched by title, not duplicated');
  assert.equal((await C.listCollections()).find((x) => x.id === poems.id)!.count, 1, 're-linking does not duplicate items');
  const db2 = createNodeDb(); await initDatabase(db2); // switch the app-wide db to an empty one
  const r2 = await restoreBackup(parsed);
  assert.equal(r2.added, 3); assert.equal(r2.collectionsAdded, 2);
  const cl = await C.listCollections(); assert.equal(cl.length, 2);
  const restored = cl.find((x) => x.title === 'غزلیں')!; assert.equal(restored.count, 1); assert.equal(restored.color, 5);
  assert.equal((await W.listWritings({ collectionId: restored.id }))[0].title, 'غزل');
  // an OLD backup (before collections existed) still restores
  const legacy = { ...parsed } as any; delete legacy.collections; delete legacy.collection_items;
  const r3 = await restoreBackup(legacy); assert.equal(r3.added, 0);

  // ---- deleting: collection keeps writings; writing removes itself from collections and its card design
  await C.deleteCollection(restored.id); assert.equal((await W.listWritings()).length, 3);
  const w0 = (await W.listWritings({ kind: 'prose' }))[0]; await W.deleteWriting(w0.id);
  assert.equal((await getDb().getAllAsync('SELECT * FROM collection_items WHERE writing_id = ?', [w0.id])).length, 0);
  await W.wipeAllWritings(); assert.equal((await C.listCollections()).length, 0);
  assert.ok((await integrityCheck(getDb())).ok);
  console.log('collections + card designs ✓');
})().catch((e) => { console.error(e); process.exit(1); });
