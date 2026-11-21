import assert from 'node:assert/strict';
import { createNodeDb } from './nodeDb';
import { initDatabase } from '../src/database/init';
import * as W from '../src/database/repositories/writings';
import * as D from '../src/database/repositories/dictionary';
import { backupToJson, backupToZip, buildBackup, parseBackupBytes, restoreBackup, validateBackup } from '../src/services/backup/core';

(async () => {
  await initDatabase(createNodeDb());
  await W.createWriting({ title: 'ایک', content: 'متن اول', category_id: 'nazm', is_favorite: 1, created_at: 1000 });
  await W.createWriting({ title: 'دو', content: 'متن دوم\nدوسری سطر', category_id: 'ghazal', created_at: 2000 });
  await D.saveDictEntry({ word: 'اقبالؔ', wrong_forms: 'اقبال' });
  const b = await buildBackup();
  assert.equal(validateBackup(b).ok, true);
  // json + zip round-trip
  const fromJson = parseBackupBytes(new TextEncoder().encode(backupToJson(b)));
  const fromZip = parseBackupBytes(backupToZip(b));
  assert.equal(fromJson.writings.length, 2); assert.equal(fromZip.writings.length, 2);
  assert.equal(fromZip.writings[1].content, 'متن دوم\nدوسری سطر');
  // restoring into the same DB: everything is a duplicate -> nothing added
  const same = await restoreBackup(fromZip);
  assert.deepEqual(same, { added: 0, skipped: 2, dictAdded: 0 });
  assert.equal((await W.listWritings()).length, 2);
  // restoring into a fresh DB adds everything (favourite flag kept)
  await initDatabase(createNodeDb());
  const fresh = await restoreBackup(fromJson);
  assert.equal(fresh.added, 2); assert.equal(fresh.dictAdded, 1);
  assert.equal((await W.listWritings({ favoritesOnly: true })).length, 1);
  // same id + different text is stored as a new writing, not dropped or overwritten
  const clash = { ...fromJson, writings: [{ ...fromJson.writings[0], content: 'بدلا ہوا متن' }] };
  assert.equal((await restoreBackup(clash)).added, 1);
  assert.equal((await W.listWritings()).length, 3);
  // validation rejects bad files
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup({ format: 'other', version: 1, writings: [] }).ok, false);
  assert.equal(validateBackup({ ...b, version: 99 }).ok, false);
  assert.equal(validateBackup({ ...b, writings: [{ id: 1 }] }).ok, false);
  await assert.rejects(() => restoreBackup({ format: 'x' } as any));
  assert.throws(() => parseBackupBytes(new TextEncoder().encode('not json')));
  console.log('backup ✓');
})();
