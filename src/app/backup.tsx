import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

import { S } from '../constants/strings';
import { getDb } from '../database/db';
import { integrityCheck } from '../database/init';
import { applyRestore, exportBackup, pickAndParseBackup } from '../services/backup/files';
import { confirmDialog, toast, useUi } from '../stores/ui';
import { urduDigits } from '../utils/text';
import { Button, Card, Muted, Screen, SectionTitle, UText } from '../components/design-system';

// Screen 19 — backup & restore
export default function Backup() {
  const { c } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<string>('');
  const run = async (k: string, fn: () => Promise<void>) => { setBusy(k); try { await fn(); } catch { toast(S.exportFailed, 'error'); } finally { setBusy(null); } };
  const restore = () => run('restore', async () => {
    const r = await pickAndParseBackup();
    if (!r.ok) { if (!r.cancelled) toast(S.backupInvalid, 'error'); return; }
    if (!(await confirmDialog(`${S.restoreConfirm}\n(${urduDigits(r.counts.writings)} ${S.library})`))) return;
    const res = await applyRestore(r.backup);
    useUi.getState().bump();
    setReport(`${S.restoredCount}: ${urduDigits(res.added)}\n${S.skippedDup}: ${urduDigits(res.skipped)}`);
    toast(S.restoreDone, 'ok');
  });
  const check = () => run('check', async () => { const r = await integrityCheck(getDb()); setReport(r.ok ? S.integrityOk : `${S.integrityBad}\n${r.detail}`); toast(r.ok ? S.integrityOk : S.integrityBad, r.ok ? 'ok' : 'error'); });
  return (
    <Screen title={S.backupTitle} back>
      <SectionTitle>{S.backup}</SectionTitle>
      <Button icon="archive-outline" label={S.makeBackupZip} loading={busy === 'zip'} onPress={() => run('zip', async () => { await exportBackup('zip'); })} />
      <Button icon="code-slash-outline" variant="ghost" label={S.makeBackupJson} loading={busy === 'json'} onPress={() => run('json', async () => { await exportBackup('json'); })} />
      <SectionTitle>{S.restore}</SectionTitle>
      <Button icon="download-outline" variant="gold" label={S.restoreFromFile} loading={busy === 'restore'} onPress={restore} />
      <Muted>{S.restoreConfirm}</Muted>
      <SectionTitle>{S.integrity}</SectionTitle>
      <Button icon="shield-checkmark-outline" variant="ghost" label={S.integrity} loading={busy === 'check'} onPress={check} />
      {report ? <Card><UText size={16} color={c.primary}>{report}</UText></Card> : null}
    </Screen>
  );
}
