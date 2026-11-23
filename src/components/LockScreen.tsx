import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {RADII, SHADOW} from '../constants/theme';
import { S } from '../constants/strings';
import { Icon, UText, Row } from './design-system';
import { biometricEnabled, biometricUnlock, checkPin, lockState, removePin } from '../services/privacy/lock';
import { wipeAllWritings } from '../database/repositories/writings';
import { confirmDialog, useUi } from '../stores/ui';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { c } = useTheme();
  const [pin, setPin] = useState('');
  const [fails, setFails] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  const [wait, setWait] = useState(0);

  const tryBio = useCallback(async () => { if (await biometricUnlock(S.enterPin)) onUnlock(); }, [onUnlock]);
  useEffect(() => {
    (async () => {
      const ls = await lockState(); setFails(ls.count); setWait(ls.waitSec);
      if (await biometricEnabled()) { setBio(true); if (!ls.waitSec) tryBio(); }
    })();
  }, [tryBio]);
  useEffect(() => { if (wait <= 0) return; const id = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000); return () => clearInterval(id); }, [wait > 0]);

  const press = async (k: string) => {
    if (busy || wait > 0) return;
    let next = pin;
    if (k === 'back') next = pin.slice(0, -1); else if (pin.length < 4) next = pin + k;
    setPin(next); setMsg('');
    if (next.length === 4) {
      setBusy(true);
      const r = await checkPin(next);
      if (r.ok) { onUnlock(); return; }
      setFails(r.count); setWait(r.waitSec); setPin(''); setMsg(r.waitSec ? S.pinWait.replace('{n}', String(r.waitSec)) : S.wrongPin); setBusy(false);
    }
  };
  const forgot = async () => {
    if (!(await confirmDialog(S.forgotPinMsg, { danger: true, okLabel: S.eraseEverything }))) return;
    await wipeAllWritings(); await removePin(); useUi.getState().bump(); onUnlock();
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'back'];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, zIndex: 100 }]}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 340, backgroundColor: c.surface, borderRadius: RADII.xl, padding: 24, alignItems: 'center', ...SHADOW }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock-closed" size={28} color={c.primary} /></View>
          <UText size={20} color={c.primary} center style={{ marginTop: 8 }}>{S.enterPin}</UText>
          <Row gap={14} style={{ marginVertical: 14 }}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.primary, backgroundColor: i < pin.length ? c.primary : 'transparent' }} />)}
          </Row>
          <UText size={14} color={c.danger} center style={{ minHeight: 34 }}>{wait > 0 ? S.pinWait.replace('{n}', String(wait)) : msg}</UText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 252, gap: 12, justifyContent: 'center' }}>
            {keys.map((k) => (
              <Pressable key={k} disabled={k === 'bio' && !bio} onPress={() => (k === 'bio' ? tryBio() : press(k))} style={({ pressed }) => [{ width: 72, height: 56, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', opacity: k === 'bio' && !bio ? 0 : 1 }, pressed && { backgroundColor: 'rgba(106,61,209,0.28)' }]}>
                {k === 'back' ? <Icon name="backspace-outline" size={24} color={c.muted} /> : k === 'bio' ? <Icon name="finger-print" size={26} color={c.primary} /> : <UText size={26} center spacing={1.3}>{k}</UText>}
              </Pressable>
            ))}
          </View>
          {fails >= 5 ? <Pressable onPress={forgot} style={{ marginTop: 14 }}><UText size={14} color={c.danger}>{S.forgotPin}</UText></Pressable> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
