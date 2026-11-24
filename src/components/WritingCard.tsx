import React from 'react';
import { Pressable, View } from 'react-native';
import { RADII, ROW, SHADOW } from '../constants/theme';
import { S } from '../constants/strings';
import { catById, isPoetry } from '../constants/categories';
import { excerpt, formatDate, splitCouplets } from '../utils/text';
import type { Writing } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Icon, UText } from './design-system';
import { DevCredit } from './design-system/Text';
import { authorOf } from '../stores/settings';

export function preview(w: Writing, n = 110): string {
  if (isPoetry(w.category_id)) { const first = splitCouplets(w.content)[0]; if (first) return first.slice(0, 2).join('\n'); }
  return excerpt(w.content, n);
}

interface Props { w: Writing; grid?: boolean; selecting?: boolean; selected?: boolean; onPress: () => void; onLongPress?: () => void; onFav?: () => void; onMore?: () => void }

export const WritingCard = React.memo(function WritingCard({ w, grid, selecting, selected, onPress, onLongPress, onFav, onMore }: Props) {
  const { c } = useTheme();
  const cat = catById(w.category_id);
  const tone = isPoetry(w.category_id) ? c.primary : c.secondary;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={`${w.title || S.untitled}، ${cat.name}`} accessibilityState={{ selected: !!selected }} onPress={onPress} onLongPress={onLongPress}
      style={({ pressed }) => [{ backgroundColor: selected ? c.primarySoft : c.surface, borderRadius: RADII.lg, padding: 14, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.line, gap: 2, opacity: pressed ? 0.88 : 1, overflow: 'hidden', ...SHADOW }, grid ? { flex: 1, minHeight: 190 } : null]}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, [ROW === 'row' ? 'left' : 'right']: 0, width: 5, backgroundColor: tone }} />
      <View style={{ flexDirection: ROW, alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: ROW, alignItems: 'center', gap: 6, backgroundColor: c.tint, borderRadius: RADII.pill, paddingHorizontal: 10 }}><Icon name={cat.icon} size={14} color={tone} /><UText size={12} color={tone} spacing={1.5}>{cat.name}</UText></View>
        {selecting ? <Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? c.primary : c.muted} /> : (
          <View style={{ flexDirection: ROW, alignItems: 'center' }}>
            <Pressable accessibilityLabel={S.favorite} hitSlop={6} onPress={onFav} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name={w.is_favorite ? 'heart' : 'heart-outline'} size={21} color={w.is_favorite ? c.danger : c.muted} /></Pressable>
            <Pressable accessibilityLabel={S.actions} hitSlop={6} onPress={onMore} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name="ellipsis-horizontal" size={21} color={c.muted} /></Pressable>
          </View>
        )}
      </View>
      <UText size={20} color={c.primary} lines={1} spacing={1.8}>{w.title || S.untitled}</UText>
      <UText size={15} lines={grid ? 4 : 2} spacing={1.9} style={{ flexShrink: 1 }}>{preview(w) || ' '}</UText>
      <View style={{ flex: grid ? 1 : 0 }} />
      {authorOf(w) ? <UText size={13} color={c.secondary} lines={1} spacing={1.6}>{authorOf(w)}</UText> : null}
      <UText size={12} color={c.muted} spacing={1.4}>{`${S.lastEdited}: ${formatDate(w.updated_at)}`}</UText>
      <DevCredit align="left" style={{ marginTop: 2 }} />
    </Pressable>
  );
});
