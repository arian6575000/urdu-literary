import React, { useEffect, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, RADII } from '../constants/theme';
import { S } from '../constants/strings';
import { catById } from '../constants/categories';
import { listWritings } from '../database/repositories/writings';
import { useQuery } from '../hooks/useAsync';
import { useSettings } from '../stores/settings';
import { toast } from '../stores/ui';
import { copyText, exportPdf, exportTxt, shareTextToWhatsApp, toPlainText } from '../services/exporter';
import { Button, Field, Icon, Loading, Muted, Row, Screen, SectionTitle, SwitchRow, UText } from '../components/design-system';

// Screens 15 + 16 — PDF export and sharing, for one writing or a whole collection
export default function ExportScreen() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { data, loading } = useQuery(() => listWritings({ sort: 'oldest' }), []);
  const [sel, setSel] = useState<Set<string>>(new Set((ids ?? '').split(',').filter(Boolean)));
  const [titlePage, setTitlePage] = useState(true);
  const [author, setAuthor] = useState(useSettings.getState().defaultAuthor);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (data && !(ids ?? '') && sel.size === 0) setSel(new Set()); }, [data]); // eslint-disable-line

  const chosen = (data ?? []).filter((w) => sel.has(w.id));
  const run = async (name: string, fn: () => Promise<unknown>) => {
    if (!chosen.length) { toast(S.selectWritings, 'error'); return; }
    setBusy(name);
    try { await fn(); } catch (e: any) { toast(e?.message === 'sharing-unavailable' ? S.sharingUnavailable : S.exportFailed, 'error'); } finally { setBusy(null); }
  };
  const toggle = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };

  return (
    <Screen title={S.exportTitle} back>
      <SectionTitle right={<Button small variant="ghost" label={sel.size === (data?.length ?? 0) ? S.cancel : S.all} onPress={() => setSel(sel.size === (data?.length ?? 0) ? new Set() : new Set((data ?? []).map((w) => w.id)))} />}>{S.selectWritings}</SectionTitle>
      {loading && !data ? <Loading /> : (data ?? []).map((w) => (
        <Pressable key={w.id} onPress={() => toggle(w.id)} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: sel.has(w.id) ? COLORS.primarySoft : COLORS.surface, borderRadius: RADII.md, padding: 12, borderWidth: 1, borderColor: sel.has(w.id) ? COLORS.primary : COLORS.line }}>
          <Icon name={sel.has(w.id) ? 'checkbox' : 'square-outline'} size={24} color={COLORS.primary} />
          <View style={{ flex: 1 }}><UText size={17} lines={1}>{w.title || S.untitled}</UText><Muted>{catById(w.category_id).name}</Muted></View>
        </Pressable>
      ))}
      <SectionTitle>{S.pdf}</SectionTitle>
      <SwitchRow label={S.pdfIncludeTitlePage} value={titlePage} onChange={setTitlePage} icon="document-outline" />
      <Field label={S.pdfAuthor} value={author} onChangeText={setAuthor} />
      <Button icon="document-text-outline" label={S.makePdf} loading={busy === 'pdf'} onPress={() => run('pdf', () => exportPdf(chosen, { titlePage, author: author.trim() || undefined }))} />
      <SectionTitle>{S.shareSheet}</SectionTitle>
      <Row wrap gap={8}>
        <Button small variant="ghost" icon="logo-whatsapp" label={S.whatsapp} loading={busy === 'wa'} onPress={() => run('wa', async () => { if (!(await shareTextToWhatsApp(chosen))) { toast(S.whatsappMissing); await Share.share({ message: toPlainText(chosen) }); } })} />
        <Button small variant="ghost" icon="share-social-outline" label={S.shareSheet} onPress={() => run('share', () => Share.share({ message: toPlainText(chosen) }))} />
        <Button small variant="ghost" icon="document-outline" label={S.txt} loading={busy === 'txt'} onPress={() => run('txt', () => exportTxt(chosen))} />
        <Button small variant="ghost" icon="copy-outline" label={S.copyText} onPress={() => run('copy', async () => { await copyText(chosen); toast(S.copied, 'ok'); })} />
        {chosen.length === 1 ? <Button small variant="gold" icon="image-outline" label={S.cardDesigner} onPress={() => router.push({ pathname: '/card/[id]', params: { id: chosen[0].id } })} /> : null}
      </Row>
    </Screen>
  );
}
