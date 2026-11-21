import React from 'react';
import { View } from 'react-native';
import { COLORS, FONT, RADII, lineHeightFor } from '../constants/theme';
import { S } from '../constants/strings';
import { useSettings } from '../stores/settings';
import { Card, Chip, IconButton, Muted, Row, Screen, SectionTitle, UText } from '../components/design-system';

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return <Row style={{ justifyContent: 'space-between' }}><UText size={16}>{label}</UText><Row gap={4}><IconButton icon="remove-circle-outline" onPress={onMinus} /><UText size={18} center style={{ minWidth: 44 }}>{value}</UText><IconButton icon="add-circle-outline" onPress={onPlus} /></Row></Row>;
}

// Screen 17 — Typography settings with live preview. One font family is bundled (Alvi Nastaleeq).
export default function Typography() {
  const st = useSettings();
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  return (
    <Screen title={S.typography} back>
      <SectionTitle>{S.preview}</SectionTitle>
      <Card><UText size={st.readerSize} center spacing={st.readerSpacing}>{S.previewSample}</UText></Card>
      <SectionTitle>{S.readingLayout}</SectionTitle>
      <Card style={{ gap: 6 }}>
        <Stepper label={S.fontSize} value={String(st.readerSize)} onMinus={() => st.set('readerSize', clamp(st.readerSize - 2, 16, 44))} onPlus={() => st.set('readerSize', clamp(st.readerSize + 2, 16, 44))} />
        <Stepper label={S.lineSpacing} value={String(st.readerSpacing)} onMinus={() => st.set('readerSpacing', clamp(+(st.readerSpacing - 0.1).toFixed(1), 1.4, 3.2))} onPlus={() => st.set('readerSpacing', clamp(+(st.readerSpacing + 0.1).toFixed(1), 1.4, 3.2))} />
        <Row gap={8}><Chip label={S.alignRight} active={st.readerAlign === 'right'} onPress={() => st.set('readerAlign', 'right')} /><Chip label={S.alignCenter} active={st.readerAlign === 'center'} onPress={() => st.set('readerAlign', 'center')} /></Row>
      </Card>
      <SectionTitle>{S.editorTypography}</SectionTitle>
      <Card style={{ gap: 6 }}>
        <Stepper label={S.fontSize} value={String(st.editorSize)} onMinus={() => st.set('editorSize', clamp(st.editorSize - 2, 16, 44))} onPlus={() => st.set('editorSize', clamp(st.editorSize + 2, 16, 44))} />
        <Stepper label={S.lineSpacing} value={String(st.editorSpacing)} onMinus={() => st.set('editorSpacing', clamp(+(st.editorSpacing - 0.1).toFixed(1), 1.4, 3.2))} onPlus={() => st.set('editorSpacing', clamp(+(st.editorSpacing + 0.1).toFixed(1), 1.4, 3.2))} />
        <View style={{ backgroundColor: COLORS.bg, borderRadius: RADII.md, padding: 10 }}><UText size={st.editorSize} spacing={st.editorSpacing}>{S.previewSample}</UText></View>
      </Card>
      <Muted>الوی نستعلیق</Muted>
    </Screen>
  );
}
void FONT; void lineHeightFor;
