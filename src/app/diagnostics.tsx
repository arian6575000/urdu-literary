import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {RADII} from '../constants/theme';
import { S } from '../constants/strings';
import { clearDiagnostics, getDiagnostics } from '../services/diagnostics';
import { toast } from '../stores/ui';
import { Button, Muted, Row, Screen, UText } from '../components/design-system';

// Shows the last events (voice engine, JS errors). Copy it and send it to the developer when something misbehaves.
export default function Diagnostics() {
  const { c } = useTheme();
  const [lines, setLines] = useState<string[]>(getDiagnostics());
  useEffect(() => { const id = setInterval(() => setLines(getDiagnostics()), 1500); return () => clearInterval(id); }, []);
  return (
    <Screen title={S.diagnostics} back>
      <Muted>{S.diagnosticsHint}</Muted>
      <Row gap={8}>
        <Button small icon="copy-outline" label={S.copyLog} onPress={async () => { await Clipboard.setStringAsync(lines.join('\n')); toast(S.copied, 'ok'); }} />
        <Button small variant="ghost" icon="trash-outline" label={S.clearLog} onPress={async () => { await clearDiagnostics(); setLines([]); }} />
      </Row>
      <View style={{ backgroundColor: c.surface, borderRadius: RADII.md, padding: 10, borderWidth: 1, borderColor: c.line }}>
        {lines.length === 0 ? <UText size={14} color={c.muted} center>{S.emptyLog}</UText> : lines.slice().reverse().map((l, i) => (
          <UText key={i} size={11} spacing={1.4} selectable style={{ textAlign: 'left', writingDirection: 'ltr', fontFamily: undefined }}>{l}</UText>
        ))}
      </View>
    </Screen>
  );
}
