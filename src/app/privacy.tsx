import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Linking } from 'react-native';

import { S } from '../constants/strings';
import { biometricAvailable, biometricEnabled, checkPin, hasPin, removePin, setBiometric, setPin } from '../services/privacy/lock';
import { deleteAllVoiceData } from '../database/repositories/voice';
import { useSettings } from '../stores/settings';
import { confirmDialog, toast, useUi } from '../stores/ui';
import { Button, Card, Divider, Field, ListRow, Muted, Screen, SectionTitle, Sheet, SwitchRow, UText, Row } from '../components/design-system';

// Screen 20 — privacy & security
export default function Privacy() {
  const { c } = useTheme();
  const [pin, setHasPin] = useState(false);
  const [bio, setBio] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  const [ask, setAsk] = useState<null | 'set' | 'remove'>(null);
  const [v, setV] = useState(''), [v2, setV2] = useState('');
  const screenSecurity = useSettings((s) => s.screenSecurity);
  const load = useCallback(async () => { setHasPin(await hasPin()); setBio(await biometricEnabled()); setBioOk(await biometricAvailable()); }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (ask === 'set') {
      if (!/^\d{4}$/.test(v) || v !== v2) { toast(S.pin4, 'error'); return; }
      await setPin(v); toast(S.saved, 'ok');
    } else {
      if (!/^\d{4}$/.test(v)) { toast(S.pin4, 'error'); return; }
      const r = await checkPin(v);
      if (!r.ok) { toast(r.waitSec ? S.pinWait.replace('{n}', String(r.waitSec)) : S.wrongPin, 'error'); return; }
      await removePin(); toast(S.done, 'ok');
    }
    setAsk(null); setV(''); setV2(''); load();
  };
  const toggleBio = async (on: boolean) => { if (on && !bioOk) { toast(S.biometricUnavailable, 'error'); return; } await setBiometric(on); setBio(on); };
  const wipeVoice = async () => { if (await confirmDialog(S.deleteTranscriptsMsg, { danger: true, okLabel: S.delete })) { await deleteAllVoiceData(); useUi.getState().bump(); toast(S.deleted, 'ok'); } };

  return (
    <Screen title={S.privacy} back>
      <SectionTitle>{S.pinLock}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="lock-closed-outline" title={pin ? S.changePin : S.setPin} onPress={() => { setV(''); setV2(''); setAsk('set'); }} />
        {pin ? <><Divider /><ListRow icon="lock-open-outline" title={S.removePin} onPress={() => { setV(''); setAsk('remove'); }} danger /></> : null}
        {pin ? <><Divider /><SwitchRow icon="finger-print" label={S.biometricLock} value={bio} onChange={toggleBio} /></> : null}
      </Card>
      <SectionTitle>{S.privacy}</SectionTitle>
      <Card><SwitchRow icon="eye-off-outline" label={S.screenSecurity} desc="اسکرین شاٹ اور ریکارڈنگ بند، ریسنٹ ایپس میں پردہ" value={screenSecurity} onChange={(x) => useSettings.getState().set('screenSecurity', x)} /></Card>
      <Card style={{ gap: 6 }}><UText size={16} color={c.primary}>{S.engineCloud}</UText><UText size={14} color={c.muted} spacing={1.8}>{S.cloudPrivacy}</UText></Card>
      <Button variant="danger" icon="trash-outline" label={S.deleteTranscripts} onPress={wipeVoice} />
      <Button variant="ghost" icon="settings-outline" label={S.permissions} onPress={() => Linking.openSettings()} />
      <Muted>مائیکروفون کی اجازت صرف آواز سے لکھتے وقت مانگی جاتی ہے۔</Muted>

      <Sheet visible={!!ask} onClose={() => setAsk(null)} title={ask === 'set' ? S.setPin : S.removePin}>
        <Field label={S.enterPin} value={v} onChangeText={(t) => setV(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} ltr autoFocus />
        {ask === 'set' ? <Field label={S.confirm} value={v2} onChangeText={(t) => setV2(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} ltr /> : null}
        <Row gap={10}><Button label={S.confirm} onPress={submit} style={{ flex: 1 }} /><Button variant="ghost" label={S.cancel} onPress={() => setAsk(null)} style={{ flex: 1 }} /></Row>
      </Sheet>
    </Screen>
  );
}
