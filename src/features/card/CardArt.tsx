import React from 'react';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import type { Prim } from './art';

/** Draws a primitive list. Geometry is in design units; the viewBox scales it to `w*scale` × `h*scale` px. */
export const Art = React.memo(function Art({ prims, w, h, scale }: { prims: Prim[]; w: number; h: number; scale: number }) {
  return (
    <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} pointerEvents="none">
      {prims.map((p, i) => {
        switch (p.t) {
          case 'grad': return <Defs key={i}><LinearGradient id={p.id} x1="0" y1="0" x2={String(p.x2)} y2={String(p.y2)}>{p.stops.map(([o, c], k) => <Stop key={k} offset={String(o)} stopColor={c} />)}</LinearGradient></Defs>;
          case 'rect': return <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} opacity={p.op} rotation={p.rot?.[0]} origin={p.rot ? `${p.rot[1]}, ${p.rot[2]}` : undefined} />;
          case 'circle': return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} opacity={p.op} />;
          case 'line': return <Line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.stroke} strokeWidth={p.sw} strokeLinecap="round" opacity={p.op} />;
          case 'path': return <Path key={i} d={p.d} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} strokeLinecap="round" strokeLinejoin="round" opacity={p.op} rotation={p.rot?.[0]} origin={p.rot ? `${p.rot[1]}, ${p.rot[2]}` : undefined} />;
          case 'poly': return <Polygon key={i} points={p.pts.join(' ')} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} strokeLinejoin="round" opacity={p.op} />;
        }
      })}
    </Svg>
  );
});
