import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS, RADII, SHADOW } from '../constants/theme';
import { S } from '../constants/strings';
import { catById, isPoetry } from '../constants/categories';
import { excerpt, formatDate, splitCouplets } from '../utils/text';
import type { Writing } from '../types';
import { Icon, Row, UText } from './design-system';

export function preview(w: Writing, n = 110): string {
  if (isPoetry(w.category_id)) { const first = splitCouplets(w.content)[0]; if (first) return first.slice(0, 2).join('\n'); }
  return excerpt(w.content, n);
}

export function WritingCard({ w, grid }: { w: Writing; grid?: boolean }) {
  const c = catById(w.category_id);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/writing/[id]', params: { id: w.id } })}
      style={({ pressed }) => [{ backgroundColor: COLORS.surface, borderRadius: RADII.lg, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 4, opacity: pressed ? 0.85 : 1, ...SHADOW }, grid ? { flex: 1, minHeight: 170 } : null]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}><Icon name={c.icon} size={16} color={COLORS.secondary} /><UText size={13} color={COLORS.secondary} spacing={1.5}>{c.name}</UText></Row>
        {w.is_favorite ? <Icon name="heart" size={16} color={COLORS.danger} /> : null}
      </Row>
      <UText size={20} color={COLORS.primary} lines={1} spacing={1.8}>{w.title || S.untitled}</UText>
      <UText size={15} color={COLORS.text} lines={grid ? 4 : 2} spacing={1.9} style={{ flexShrink: 1 }}>{preview(w) || ' '}</UText>
      <View style={{ flex: 1 }} />
      <UText size={12} color={COLORS.muted} spacing={1.4}>{formatDate(w.updated_at)}</UText>
    </Pressable>
  );
}

/** Renders writings as a list or a 2-column grid. */
export function WritingGrid({ items, grid }: { items: Writing[]; grid: boolean }) {
  if (!grid) return <View style={{ gap: 12 }}>{items.map((w) => <WritingCard key={w.id} w={w} />)}</View>;
  const rows: Writing[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => (
        <Row key={i} gap={12} align="stretch">
          {r.map((w) => <WritingCard key={w.id} w={w} grid />)}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </Row>
      ))}
    </View>
  );
}
