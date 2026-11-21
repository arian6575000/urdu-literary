import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { COLORS } from '../constants/theme';
import { S } from '../constants/strings';
import { useSettings } from '../stores/settings';
import { getProxyToken, setProxyToken } from '../services/privacy/lock';
import { toast } from '../stores/ui';
import { Button, Card, Chip, Field, Icon, Muted, Row, Screen, SectionTitle, UText } from '../components/design-system';

// Screen 08 — engine selection (the UrduSpeechProvider that the voice screen uses)
export default function VoiceSettings() {
  const st = useSettings();
  const [url, setUrl] = useState(st.proxyUrl);
  const [token, setToken] = useState('');
  useEffect(() => { getProxyToken().then(setToken); }, []);
  const saveCloud = async () => { await st.set('proxyUrl', url.trim()); await setProxyToken(token.trim()); toast(S.saved, 'ok'); };
  return (
    <Screen title={S.voiceSettings} back>
      <SectionTitle>{S.engine}</SectionTitle>
      <Row gap={8} wrap>
        <Chip label={S.engineDevice} icon="phone-portrait-outline" active={st.engine === 'device'} onPress={() => st.set('engine', 'device')} />
        <Chip label={S.engineCloud} icon="cloud-outline" active={st.engine === 'cloud'} onPress={() => st.set('engine', 'cloud')} />
      </Row>
      <Card style={{ gap: 6 }}>
        <Row gap={8}><Icon name="phone-portrait-outline" size={20} color={COLORS.primary} /><UText size={17} color={COLORS.primary}>{S.engineDevice}</UText></Row>
        <UText size={14} color={COLORS.muted} spacing={1.8}>اردو (ur-PK) کی لائیو پہچان، ساتھ ساتھ عارضی متن، مفت۔ درستی فون کی گوگل آواز سروس پر منحصر ہے؛ آف لائن کے لیے فون کی ترتیبات میں اردو آواز کا پیک ڈاؤن لوڈ کریں۔</UText>
        <Button small variant="ghost" label="فون کی آواز کی ترتیبات" onPress={() => Linking.openSettings()} />
      </Card>
      <Card style={{ gap: 8 }}>
        <Row gap={8}><Icon name="cloud-outline" size={20} color={COLORS.primary} /><UText size={17} color={COLORS.primary}>{S.engineCloud}</UText></Row>
        <UText size={14} color={COLORS.muted} spacing={1.8}>آپ کا اپنا سرور (فولڈر server) آواز کو گوگل کلاؤڈ اسپیچ یا وِسپر سے متن بناتا ہے۔ چابی صرف سرور پر رہتی ہے، ایپ میں نہیں۔ یہ طریقہ جملہ جملہ متن دیتا ہے اور انٹرنیٹ مانگتا ہے۔</UText>
        <Field label={S.proxyUrl} value={url} onChangeText={setUrl} placeholder="https://your-server.example.com" ltr autoCapitalize="none" keyboardType="url" hint={S.proxyHint} />
        <Field label="Access token" value={token} onChangeText={setToken} ltr autoCapitalize="none" secureTextEntry />
        <Button label={S.save} onPress={saveCloud} />
      </Card>
      <Muted>{S.cloudPrivacy}</Muted>
    </Screen>
  );
}
