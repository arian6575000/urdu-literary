import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { fontFamily } from './fonts';
import { renderable, starPoints, type DesignElement } from './elements';

const HILITE = '#7C5CFF';
interface Props { elements: DesignElement[]; scale: number; selectedId?: string | null; onSelect?: (id: string) => void }

/** Draws the scene-graph elements in array (= z) order. Shared by preview, thumbnails and export, so all three always match. */
export const ElementLayer = React.memo(function ElementLayer({ elements, scale, selectedId, onSelect }: Props) {
  const list = renderable(elements);
  if (!list.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {list.map((e) => <ElementView key={e.id} e={e} scale={scale} selected={selectedId === e.id} onSelect={onSelect} />)}
    </View>
  );
});

const ElementView = React.memo(function ElementView({ e, scale, selected, onSelect }: { e: DesignElement; scale: number; selected: boolean; onSelect?: (id: string) => void }) {
  const u = (n: number) => n * scale;
  const frame = { position: 'absolute', left: u(e.x), top: u(e.y), width: u(e.w), height: u(e.h), opacity: e.opacity, transform: [{ rotate: `${e.rotation}deg` }] } as const;
  const outline = selected && onSelect ? <View pointerEvents="none" style={{ position: 'absolute', left: -2, top: -2, right: -2, bottom: -2, borderWidth: 1.5, borderStyle: 'dashed', borderColor: HILITE, borderRadius: 4 }} /> : null;
  const wrap = (child: React.ReactNode) => onSelect
    ? <Pressable accessibilityRole="button" accessibilityLabel={e.name || e.kind} onPress={() => onSelect(e.id)} style={frame}>{child}{outline}</Pressable>
    : <View pointerEvents="none" style={frame}>{child}</View>;
  switch (e.kind) {
    case 'text': {
      const place = e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start';
      return wrap(
        <View style={{ flex: 1, justifyContent: 'center', alignItems: place, backgroundColor: e.bgColor ?? undefined, borderRadius: u(e.radius), padding: u(e.padding) }}>
          <Text style={{ fontFamily: fontFamily(e.font), fontSize: u(e.fontSize), lineHeight: u(e.fontSize * e.lineHeight), letterSpacing: u(e.letterSpacing), color: e.color, textAlign: e.align, writingDirection: e.dir, includeFontPadding: false, ...(e.shadow ? { textShadowColor: 'rgba(0,0,0,0.38)', textShadowOffset: { width: 0, height: u(1.2) }, textShadowRadius: u(4) } : null) }}>{e.text || ' '}</Text>
        </View>,
      );
    }
    case 'shape': {
      const sw = e.strokeWidth, half = sw / 2, fill = e.fill ?? 'none', stroke = e.stroke ?? undefined;
      return wrap(
        <Svg width={u(e.w)} height={u(e.h)} viewBox={`0 0 ${e.w} ${e.h}`}>
          {e.shape === 'rect' ? <Rect x={half} y={half} width={Math.max(0, e.w - sw)} height={Math.max(0, e.h - sw)} rx={e.radius} fill={fill} stroke={stroke} strokeWidth={sw} /> : null}
          {e.shape === 'ellipse' ? <Ellipse cx={e.w / 2} cy={e.h / 2} rx={Math.max(0, e.w / 2 - half)} ry={Math.max(0, e.h / 2 - half)} fill={fill} stroke={stroke} strokeWidth={sw} /> : null}
          {e.shape === 'triangle' ? <Polygon points={`${e.w / 2},${half} ${e.w - half},${e.h - half} ${half},${e.h - half}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /> : null}
          {e.shape === 'diamond' ? <Polygon points={`${e.w / 2},${half} ${e.w - half},${e.h / 2} ${e.w / 2},${e.h - half} ${half},${e.h / 2}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /> : null}
          {e.shape === 'star' ? <Polygon points={starPoints(e.w, e.h)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /> : null}
        </Svg>,
      );
    }
    case 'line': {
      const y = e.h / 2, head = Math.max(6, e.strokeWidth * 3.5);
      return wrap(
        <Svg width={u(e.w)} height={u(e.h)} viewBox={`0 0 ${e.w} ${e.h}`}>
          <Line x1={0} y1={y} x2={e.arrow ? e.w - head * 0.8 : e.w} y2={y} stroke={e.stroke} strokeWidth={e.strokeWidth} strokeLinecap="round" strokeDasharray={e.dashed ? `${e.strokeWidth * 3},${e.strokeWidth * 2.5}` : undefined} />
          {e.arrow ? <Polygon points={`${e.w},${y} ${e.w - head},${y - head / 2} ${e.w - head},${y + head / 2}`} fill={e.stroke} /> : null}
        </Svg>,
      );
    }
    case 'svg':
      return wrap(
        <Svg width={u(e.w)} height={u(e.h)} viewBox={`0 0 ${e.viewBox[0]} ${e.viewBox[1]}`}>
          {e.paths.map((d, i) => <Path key={i} d={d} fill={e.fill ?? 'none'} stroke={e.stroke ?? undefined} strokeWidth={e.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />)}
        </Svg>,
      );
    case 'image':
      return wrap(<Image source={{ uri: e.uri }} resizeMode={e.fit} style={{ width: '100%', height: '100%', borderRadius: u(e.radius) }} />);
    default:
      return null;
  }
});
