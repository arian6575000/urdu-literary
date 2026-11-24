import React from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { S } from '../../constants/strings';
import { APP_NAME, COMPANY_CREDIT } from '../../constants/app';
import { countWritings } from '../../database/repositories/writings';
import { listDictionary } from '../../database/repositories/dictionary';
import { useQuery } from '../../hooks/useAsync';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../stores/settings';
import { urduDigits } from '../../utils/text';
import { Card, Divider, Field, ListRow, Muted, Screen, SectionTitle, Segmented, SwitchRow, UText } from '../../components/design-system';
import { DevCredit } from '../../components/design-system/Text';

// "مزید" — settings, organised in clear sections
export default function More() {
  const { c } = useTheme();
  const st = useSettings();
  const { data } = useQuery(async () => ({ c: await countWritings(), d: (await listDictionary()).length }), []);
  return (
    <Screen title={S.navMore}>
      <SectionTitle>{S.secShortcuts}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="albums-outline" tone={c.accent} title={S.collections} onPress={() => router.push('/collections')} />
        <Divider />
        <ListRow icon="book-outline" tone={c.secondary} title={S.dictionary} sub={`${urduDigits(data?.d ?? 0)} ${S.dictWords}`} onPress={() => router.push('/dictionary')} />
        <Divider />
        <ListRow icon="search-outline" tone={c.sky} title={S.search} onPress={() => router.push('/search')} />
      </Card>

      <SectionTitle>{S.secLook}</SectionTitle>
      <Card style={{ gap: 8 }}>
        <UText size={16}>{S.themeMode}</UText>
        <Segmented<'light' | 'dark' | 'system'> value={st.themeMode} onChange={(m) => st.set('themeMode', m)} options={[{ id: 'light', label: S.themeLight }, { id: 'dark', label: S.themeDark }, { id: 'system', label: S.themeSystem }]} />
        <Muted>{S.themeHint}</Muted>
      </Card>

      <SectionTitle>{S.secFont}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="text-outline" title={S.fontSizeSet} onPress={() => router.push('/typography')} />
        <Divider />
        <SwitchRow icon="save-outline" label={S.autoSave} value={st.autoSave} onChange={(v) => st.set('autoSave', v)} />
        <Divider />
        <Field label={S.authorDefault} value={st.defaultAuthor} onChangeText={(t) => st.set('defaultAuthor', t)} placeholder={S.authorHint} />
        <Muted>{S.fontNote}</Muted>
      </Card>

      <SectionTitle>{S.secVoice}</SectionTitle>
      <Card><ListRow icon="mic-outline" tone={c.accent} title={S.engine} sub={st.engine === 'cloud' ? S.engineCloud : S.engineDevice} onPress={() => router.push('/voice-settings')} /></Card>

      <SectionTitle>{S.secBackup}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="documents-outline" title={S.writingsStored} trail={<UText size={18} color={c.primary}>{urduDigits(data?.c.total ?? 0)}</UText>} />
        <Divider />
        <ListRow icon="cloud-upload-outline" tone={c.secondary} title={`${S.backup} / ${S.restore}`} onPress={() => router.push('/backup')} />
      </Card>

      <SectionTitle>{S.secPrivacy}</SectionTitle>
      <Card><ListRow icon="shield-checkmark-outline" tone={c.success} title={S.privacy} sub={`${S.pinLock} · ${S.permissions}`} onPress={() => router.push('/privacy')} /></Card>

      <SectionTitle>{S.secAbout}</SectionTitle>
      <Card style={{ gap: 2 }}>
        <ListRow icon="information-circle-outline" title={APP_NAME} sub={`${S.version} ${Constants.expoConfig?.version ?? '1.0.0'}`} />
        <Divider />
        <ListRow icon="business-outline" title={S.madeBy} sub={COMPANY_CREDIT} />
        <Divider />
        <ListRow icon="bug-outline" tone={c.muted} title={S.diagnostics} sub={S.diagnosticsHint} onPress={() => router.push('/diagnostics')} />
      </Card>
      <DevCredit style={{ marginTop: 4 }} />
    </Screen>
  );
}
