import React from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { COLORS } from '../../constants/theme';
import { S } from '../../constants/strings';
import { APP_NAME, COMPANY_CREDIT } from '../../constants/app';
import { countWritings } from '../../database/repositories/writings';
import { listDictionary } from '../../database/repositories/dictionary';
import { useQuery } from '../../hooks/useAsync';
import { useSettings } from '../../stores/settings';
import { urduDigits } from '../../utils/text';
import { Card, Divider, Field, ListRow, Muted, Screen, SectionTitle, SwitchRow, UText } from '../../components/design-system';

// Screen 18 — application settings
export default function Settings() {
  const st = useSettings();
  const { data } = useQuery(async () => ({ c: await countWritings(), d: (await listDictionary()).length }), []);
  return (
    <Screen title={S.settings}>
      <SectionTitle>{S.appPrefs}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <SwitchRow icon="save-outline" label={S.autoSave} value={st.autoSave} onChange={(v) => st.set('autoSave', v)} />
        <Divider />
        <Field label={S.authorDefault} value={st.defaultAuthor} onChangeText={(t) => st.set('defaultAuthor', t)} placeholder={S.authorHint} />
        <Divider />
        <ListRow icon="text-outline" title={S.typography} onPress={() => router.push('/typography')} />
        <Divider />
        <ListRow icon="albums-outline" title={S.dictionary} sub={`${urduDigits(data?.d ?? 0)} ${S.dictWords}`} onPress={() => router.push('/dictionary')} />
        <Divider />
        <ListRow icon="heart-outline" title={S.favorites} onPress={() => router.push('/favorites')} />
      </Card>
      <SectionTitle>{S.voiceSettings}</SectionTitle>
      <Card><ListRow icon="mic-outline" title={S.engine} sub={st.engine === 'cloud' ? S.engineCloud : S.engineDevice} onPress={() => router.push('/voice-settings')} /></Card>
      <SectionTitle>{S.storage}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="documents-outline" title={S.writingsStored} trail={<UText size={18} color={COLORS.primary}>{urduDigits(data?.c.total ?? 0)}</UText>} />
        <Divider />
        <ListRow icon="cloud-upload-outline" title={`${S.backup} / ${S.restore}`} onPress={() => router.push('/backup')} />
      </Card>
      <SectionTitle>{S.privacy}</SectionTitle>
      <Card><ListRow icon="shield-checkmark-outline" title={S.privacy} sub={`${S.pinLock} · ${S.permissions}`} onPress={() => router.push('/privacy')} /></Card>
      <SectionTitle>{S.about}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="information-circle-outline" title={APP_NAME} sub={`${S.version} ${Constants.expoConfig?.version ?? '1.0.0'}`} />
        <Divider />
        <ListRow icon="business-outline" title={S.madeBy} sub={COMPANY_CREDIT} />
      </Card>
      <Muted center>{COMPANY_CREDIT}</Muted>
    </Screen>
  );
}
