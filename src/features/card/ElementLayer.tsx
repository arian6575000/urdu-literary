import React, { useRef } from 'react';
import { Image, PanResponder, Text, View } from 'react-native';
import Svg, { Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { fontFamily } from './fonts';
import { renderable, resizeFromCorner, rotationFromHandle, starPoints, type DesignElement } from './elements';
import { runSegments } from './runs';
import { resolveShadow } from './textStudio';

const HILITE = '#7C5CFF';
const GUIDE = '#FF3D8B';
/** On-screen distance (px) of the rotate handle above the element. */
export const ROTATE_GAP = 34;

export interface ElementTools {
  /** Called continuously while dragging a selected, unlocked element: absolute design coordinates of its top-left corner. */
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, box: { x: number; y: number; w: number; h: number }) => void;
  onRotate?: (id: string, deg: number) => void;
  /** A drag / resize / rotate finished (clear guides, etc.). */
  onGestureEnd?: () => void;
  /** Centre guides to draw while snapping. */
  guides?: { v: boolean; h: boolean };
}
interface Props { elements: DesignElement[]; scale: number; selectedId?: string | null; onSelect?: (id: string) => void; tools?: ElementTools }

/** Draws the scene-graph elements in array (= z) order. Shared by preview, thumbnails and export, so all three always match. */
export const ElementLayer = React.memo(function ElementLayer({ elements, scale, selectedId, onSelect, tools }: Props) {
  const list = renderable(elements);
  const g = tools?.guides;
  const sel = selectedId ? list.find((x) => x.id === selectedId) : undefined;
  if (!list.length && !g) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {list.map((e) => <ElementView key={e.id} e={e} scale={scale} selected={selectedId === e.id} onSelect={onSelect} tools={tools} />)}
      {sel && onSelect && !sel.locked && tools?.onResize ? <Handles e={sel} scale={scale} tools={tools} /> : null}
      {g?.v ? <View pointerEvents="none" style={{ position: 'absolute', left: '50%', marginLeft: -0.5, top: 0, bottom: 0, width: 1, backgroundColor: GUIDE }} /> : null}
      {g?.h ? <View pointerEvents="none" style={{ position: 'absolute', top: '50%', marginTop: -0.5, left: 0, right: 0, height: 1, backgroundColor: GUIDE }} /> : null}
    </View>
  );
});

type Live = { e: DesignElement; scale: number; selected: boolean; onSelect?: (id: string) => void; tools?: ElementTools };

const ElementView = React.memo(function ElementView({ e, scale, selected, onSelect, tools }: Live) {
  const u = (n: number) => n * scale;
  const live = useRef<Live>({ e, scale, selected, onSelect, tools }); live.current = { e, scale, selected, onSelect, tools };
  const start = useRef({ x: 0, y: 0, w: 0, h: 0, moved: false });

  // body: tap selects; once selected, dragging moves (so scrolling / first touches never move things by accident)
  const body = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !!live.current.onSelect,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { const { e: el } = live.current; start.current = { x: el.x, y: el.y, w: el.w, h: el.h, moved: false }; },
    onPanResponderMove: (_ev, g) => {
      const L = live.current; if (!L.selected || L.e.locked || !L.tools?.onMove) return;
      if (!start.current.moved && Math.abs(g.dx) + Math.abs(g.dy) < 3) return;
      start.current.moved = true;
      L.tools.onMove(L.e.id, start.current.x + g.dx / L.scale, start.current.y + g.dy / L.scale);
    },
    onPanResponderRelease: () => { const L = live.current; if (!start.current.moved) L.onSelect?.(L.e.id); L.tools?.onGestureEnd?.(); },
    onPanResponderTerminate: () => live.current.tools?.onGestureEnd?.(),
  })).current;

  const frame = { position: 'absolute', left: u(e.x), top: u(e.y), width: u(e.w), height: u(e.h), opacity: e.opacity, transform: [{ rotate: `${e.rotation}deg` }] } as const;
  const interactive = !!onSelect;
  const decorations = interactive && selected
    ? <View pointerEvents="none" style={{ position: 'absolute', left: -2, top: -2, right: -2, bottom: -2, borderWidth: 1.5, borderStyle: 'dashed', borderColor: e.locked ? '#9A94B3' : HILITE, borderRadius: 4 }} />
    : null;
  const wrap = (child: React.ReactNode) => interactive
    ? <View {...body.panHandlers} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={e.name || e.kind} style={frame}>{child}{decorations}</View>
    : <View pointerEvents="none" style={frame}>{child}</View>;

  switch (e.kind) {
    case 'text': {
      const place = e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start';
      const vj = e.vAlign === 'top' ? 'flex-start' : e.vAlign === 'bottom' ? 'flex-end' : 'center';
      const sh = resolveShadow(e);
      const segs = e.runs?.length ? runSegments(e.text, e.runs) : null;
      return wrap(
        <View pointerEvents="none" style={{ flex: 1, justifyContent: vj, alignItems: place, backgroundColor: e.bgColor ?? undefined, borderRadius: u(e.radius), padding: u(e.padding) }}>
          <Text style={{ fontFamily: fontFamily(e.font), fontSize: u(e.fontSize), lineHeight: u(e.fontSize * e.lineHeight), letterSpacing: u(e.letterSpacing), color: e.color, textAlign: e.align, writingDirection: e.dir, includeFontPadding: false, ...(sh ? { textShadowColor: sh.color, textShadowOffset: { width: u(sh.x), height: u(sh.y) }, textShadowRadius: u(sh.blur) } : null) }}>
            {segs && segs.length
              ? segs.map((sg, i) => <Text key={i} style={{ color: sg.color, fontSize: sg.scale ? u(e.fontSize * sg.scale) : undefined, textDecorationLine: sg.underline ? 'underline' : undefined }}>{sg.text}</Text>)
              : (e.text || ' ')}
          </Text>
        </View>,
      );
    }
    case 'shape': {
      const sw = e.strokeWidth, half = sw / 2, fill = e.fill ?? 'none', stroke = e.stroke ?? undefined;
      return wrap(
        <Svg pointerEvents="none" width={u(e.w)} height={u(e.h)} viewBox={`0 0 ${e.w} ${e.h}`}>
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
        <Svg pointerEvents="none" width={u(e.w)} height={u(e.h)} viewBox={`0 0 ${e.w} ${e.h}`}>
          <Line x1={0} y1={y} x2={e.arrow ? e.w - head * 0.8 : e.w} y2={y} stroke={e.stroke} strokeWidth={e.strokeWidth} strokeLinecap="round" strokeDasharray={e.dashed ? `${e.strokeWidth * 3},${e.strokeWidth * 2.5}` : undefined} />
          {e.arrow ? <Polygon points={`${e.w},${y} ${e.w - head},${y - head / 2} ${e.w - head},${y + head / 2}`} fill={e.stroke} /> : null}
        </Svg>,
      );
    }
    case 'svg':
      return wrap(
        <Svg pointerEvents="none" width={u(e.w)} height={u(e.h)} viewBox={`0 0 ${e.viewBox[0]} ${e.viewBox[1]}`}>
          {e.paths.map((d, i) => <Path key={i} d={d} fill={e.fill ?? 'none'} stroke={e.stroke ?? undefined} strokeWidth={e.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />)}
        </Svg>,
      );
    case 'image':
      return wrap(<Image pointerEvents="none" source={{ uri: e.uri }} resizeMode={e.fit} style={{ width: '100%', height: '100%', borderRadius: u(e.radius) }} />);
    default:
      return null;
  }
});

/**
 * Resize + rotate handles. They are siblings of the elements (not children) because Android does not deliver touches to a child that
 * lies outside its parent's bounds; positions are computed from the element's centre, size and rotation.
 */
function Handles({ e, scale, tools }: { e: DesignElement; scale: number; tools: ElementTools }) {
  const live = useRef({ e, scale, tools }); live.current = { e, scale, tools };
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const corner = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { const { e: el } = live.current; start.current = { x: el.x, y: el.y, w: el.w, h: el.h }; },
    onPanResponderMove: (_ev, g) => {
      const L = live.current; const s = start.current;
      L.tools.onResize?.(L.e.id, resizeFromCorner({ ...s, rotation: L.e.rotation }, g.dx / L.scale, g.dy / L.scale, L.e.kind === 'image' || L.e.kind === 'svg'));
    },
    onPanResponderRelease: () => live.current.tools.onGestureEnd?.(), onPanResponderTerminate: () => live.current.tools.onGestureEnd?.(),
  })).current;
  const rotor = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_ev, g) => { const L = live.current; L.tools.onRotate?.(L.e.id, rotationFromHandle(L.e, g.dx / L.scale, g.dy / L.scale, ROTATE_GAP / L.scale)); },
    onPanResponderRelease: () => live.current.tools.onGestureEnd?.(), onPanResponderTerminate: () => live.current.tools.onGestureEnd?.(),
  })).current;

  const t = (e.rotation * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
  const cx = (e.x + e.w / 2) * scale, cy = (e.y + e.h / 2) * scale;
  const bx = cx + (e.w / 2) * scale * cos - (e.h / 2) * scale * sin, by = cy + (e.w / 2) * scale * sin + (e.h / 2) * scale * cos; // bottom-right corner
  const ry = -((e.h / 2) * scale + ROTATE_GAP); const rx0 = cx - sin * ry, ry0 = cy + cos * ry; // rotate handle
  const tx = cx - sin * (-(e.h / 2) * scale), ty = cy + cos * (-(e.h / 2) * scale); // middle of the top edge (stem start)
  const stemLen = Math.hypot(rx0 - tx, ry0 - ty);
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: (tx + rx0) / 2 - 0.75, top: (ty + ry0) / 2 - stemLen / 2, width: 1.5, height: stemLen, backgroundColor: HILITE, transform: [{ rotate: `${e.rotation}deg` }] }} />
      <View {...rotor.panHandlers} accessibilityRole="adjustable" accessibilityLabel="گھمائیں" style={{ position: 'absolute', left: rx0 - 20, top: ry0 - 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: HILITE }} />
      </View>
      <View {...corner.panHandlers} accessibilityRole="adjustable" accessibilityLabel="سائز" style={{ position: 'absolute', left: bx - 20, top: by - 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: HILITE, borderWidth: 2, borderColor: '#FFFFFF' }} />
      </View>
    </>
  );
}
