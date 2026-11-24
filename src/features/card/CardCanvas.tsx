import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Art } from './CardArt';
import { buildLayers, dividerPrims, motifPrims, motifReserve, motifSpots } from './art';
import { fontFamily } from './fonts';
import { canvasSize, type CardDesign, type ElementId } from './types';

const HILITE = '#7C5CFF';
interface Props { design: CardDesign; scale: number; selected?: ElementId | null; onSelect?: (e: ElementId) => void; onReady?: () => void }

/**
 * Renders one card. Used for the live preview (scale ≈ 1), the template thumbnails (scale ≈ 0.2) and the PNG export.
 * Every size is multiplied by `scale`, so text stays crisp at any size and the layout is identical everywhere.
 */
export const CardCanvas = React.memo(function CardCanvas({ design: d, scale, selected, onSelect, onReady }: Props) {
  const { w, h } = canvasSize(d.ratio);
  const u = (n: number) => n * scale;
  const layers = useMemo(() => buildLayers(d, w, h), [d.bg, d.pattern, d.patternOpacity, d.texture, d.decor, d.accent, d.textColor, d.frame, d.ratio]); // eslint-disable-line react-hooks/exhaustive-deps
  const spots = useMemo(() => motifSpots(d, w, h), [d.motif, d.motifPos, d.ratio]); // eslint-disable-line react-hooks/exhaustive-deps
  const motifs = useMemo(() => spots.map(([x, y, s, r]) => ({ x, y, s, r, prims: motifPrims(d.motif, s, d.accent) })), [spots, d.motif, d.accent]);
  const divider = useMemo(() => dividerPrims(d.divider, 160, d.accent), [d.divider, d.accent]);
  const family = fontFamily(d.font);
  const reserve = motifReserve(d);
  const img = d.image;
  const inset = !!img.uri && img.mode === 'inset';
  const insetH = Math.round(h * (d.ratio === '16:9' ? 0.5 : 0.34));

  // tell the exporter when layout (and the image, if any) is ready
  const laid = useRef(false), loaded = useRef(!img.uri);
  const fire = () => { if (laid.current && loaded.current) onReady?.(); };
  useEffect(() => { loaded.current = !img.uri; fire(); }, [img.uri]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = { fontFamily: family, textAlign: d.align === 'center' ? 'center' : d.align, writingDirection: 'rtl', includeFontPadding: false, ...(d.textShadow ? { textShadowColor: 'rgba(0,0,0,0.38)', textShadowOffset: { width: 0, height: u(1.2) }, textShadowRadius: u(4) } : null) } as const;
  const Sel = ({ id, children }: { id: ElementId; children: React.ReactNode }) => {
    const on = selected === id;
    const style = { borderWidth: u(1.5) < 1 ? 0 : 1.5, borderStyle: 'dashed', borderColor: on ? HILITE : 'transparent', borderRadius: 6, paddingHorizontal: u(2) } as const;
    return onSelect ? <Pressable accessibilityRole="button" onPress={() => onSelect(id)} style={style}>{children}</Pressable> : <View style={style}>{children}</View>;
  };

  const titleEl = d.showTitle && d.title.trim() ? <Sel id="title"><Text style={[body, { fontSize: u(d.fontSize * 1.2), lineHeight: u(d.fontSize * 1.2 * Math.max(d.lineHeight, 1.5)), color: d.accent }]}>{d.title}</Text></Sel> : null;
  const poetEl = d.showPoet && d.poet.trim() ? <Sel id="poet"><Text style={[body, { fontSize: u(Math.max(14, d.fontSize * 0.62)), lineHeight: u(Math.max(14, d.fontSize * 0.62) * 1.9), color: d.accent }]}>{`— ${d.poet}`}</Text></Sel> : null;
  const textEl = <Sel id="text"><Text style={[body, { fontSize: u(d.fontSize), lineHeight: u(d.fontSize * d.lineHeight), letterSpacing: u(d.letterSpacing), color: d.textColor }]}>{d.text || ' '}</Text></Sel>;
  const divEl = divider.length ? <View style={{ alignItems: d.align === 'center' ? 'center' : d.align === 'right' ? 'flex-end' : 'flex-start', paddingVertical: u(4) }}><Art prims={divider} w={160} h={18} scale={scale} /></View> : null;

  const justify = d.layout === 'top' ? 'flex-start' : d.layout === 'bottom' ? 'flex-end' : d.layout === 'spread' ? 'space-between' : 'center';
  const padTop = u(d.padding + (d.motifPos === 'top' ? reserve : 0) + (inset ? insetH + 10 : 0)), padBot = u(d.padding + (d.motifPos === 'bottom' ? reserve : 0));
  const pad = u(d.padding);
  const imgStyle = { width: '100%', height: '100%', opacity: img.opacity, transform: [{ translateX: u((img.x / 100) * w) }, { translateY: u((img.y / 100) * h) }, { scale: img.zoom }] } as const;

  return (
    <View collapsable={false} onLayout={() => { laid.current = true; fire(); }} style={{ width: u(w), height: u(h), borderRadius: u(d.radius), overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <View style={{ position: 'absolute' }}><Art prims={layers.back} w={w} h={h} scale={scale} /></View>
      {onSelect ? <Pressable accessibilityLabel="پس منظر" style={{ position: 'absolute', width: '100%', height: '100%' }} onPress={() => onSelect('bg')} /> : null}
      {img.uri && !inset ? (
        <Pressable disabled={!onSelect} onPress={() => onSelect?.('image')} style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
          <Image source={{ uri: img.uri }} resizeMode="cover" style={imgStyle} onLoadEnd={() => { loaded.current = true; fire(); }} />
          {img.dim > 0 ? <View pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: `rgba(0,0,0,${img.dim})` }} /> : null}
        </Pressable>
      ) : null}
      {inset ? (
        <Pressable disabled={!onSelect} onPress={() => onSelect?.('image')} style={{ position: 'absolute', top: u(d.padding + (d.motifPos === 'top' ? reserve : 0)), left: pad, width: u(w) - 2 * pad, height: u(insetH), borderRadius: u(16), overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.08)' }}>
          <Image source={{ uri: img.uri! }} resizeMode="cover" style={imgStyle} onLoadEnd={() => { loaded.current = true; fire(); }} />
        </Pressable>
      ) : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', width: '100%', height: '100%', paddingTop: padTop, paddingBottom: padBot, paddingHorizontal: pad, justifyContent: justify }}>
        <View pointerEvents="box-none" style={{ transform: [{ translateX: u(d.offsetX) }, { translateY: u(d.offsetY) }], ...(d.layout === 'spread' ? { flex: 1, justifyContent: 'space-between' } : null) }}>
          {d.layout === 'spread' ? (
            <>
              <View>{titleEl}{divEl}</View>
              <View>{textEl}</View>
              <View>{divEl ? <View style={{ opacity: 0 }} /> : null}{poetEl}</View>
            </>
          ) : (
            <>{titleEl}{divEl}{textEl}{poetEl}</>
          )}
        </View>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute' }}><Art prims={layers.front} w={w} h={h} scale={scale} /></View>
      {onSelect && d.frame !== 'none' ? <Pressable accessibilityLabel="سجاوٹ" onPress={() => onSelect('frame')} style={{ position: 'absolute', left: 0, top: 0, width: u(w), height: u(22), }} /> : null}
      {motifs.map((m, i) => <View key={i} pointerEvents="none" style={{ position: 'absolute', left: u(m.x), top: u(m.y), width: u(m.s), height: u(m.s), transform: [{ rotate: `${m.r}deg` }] }}><Art prims={m.prims} w={m.s} h={m.s} scale={scale} /></View>)}
      {selected === 'frame' && d.frame !== 'none' ? <View pointerEvents="none" style={{ position: 'absolute', left: u(6), top: u(6), right: u(6), bottom: u(6), borderWidth: 1.5, borderStyle: 'dashed', borderColor: HILITE, borderRadius: 6 }} /> : null}
    </View>
  );
});
