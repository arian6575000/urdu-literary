// The card design is ONE plain, serialisable object — the single source of truth for the preview, thumbnails, export and persistence.
export type FontId = 'alvi' | 'nastaliq' | 'naskh' | 'amiri';
export type Ratio = '1:1' | '4:5' | '9:16' | '16:9';
export type Align = 'right' | 'center' | 'left';
export type LayoutId = 'center' | 'top' | 'bottom' | 'spread';
export type FrameId = 'none' | 'single' | 'double' | 'corners' | 'ornate' | 'arch';
export type DividerId = 'none' | 'line' | 'dots' | 'diamond' | 'flourish';
export type MotifId = 'none' | 'crescent' | 'khatam' | 'flower' | 'leaf' | 'moonstars' | 'pen';
export type MotifPos = 'top' | 'bottom' | 'corners';
export type PatternId = 'none' | 'dots' | 'lines' | 'grid' | 'diamonds' | 'khatam' | 'waves';
export type TextureId = 'none' | 'paper' | 'linen' | 'grain';
export type DecorId = 'none' | 'night' | 'dunes' | 'arches' | 'petals' | 'rays';
export type BgSpec = { kind: 'solid'; color: string } | { kind: 'gradient'; from: string; to: string; dir: 'v' | 'd' | 'h' };
export type ImageMode = 'background' | 'inset';
export type ElementId = 'text' | 'title' | 'poet' | 'frame' | 'bg' | 'image';

export interface CardImage { uri: string | null; mode: ImageMode; opacity: number; zoom: number; x: number; y: number; dim: number }

export interface CardDesign {
  v: 1; templateId: string; ratio: Ratio;
  text: string; title: string; poet: string; showTitle: boolean; showPoet: boolean;
  font: FontId; fontSize: number; lineHeight: number; letterSpacing: number; align: Align; textColor: string; accent: string; textShadow: boolean;
  bg: BgSpec; pattern: PatternId; patternOpacity: number; texture: TextureId; decor: DecorId;
  image: CardImage;
  frame: FrameId; divider: DividerId; motif: MotifId; motifPos: MotifPos;
  layout: LayoutId; padding: number; radius: number; offsetX: number; offsetY: number;
}

export const BASE_W = 360;
export const EXPORT_SCALE = 3; // 360 design px -> 1080 px wide
export const RATIOS: { id: Ratio; label: string; w: number; h: number }[] = [
  { id: '1:1', label: 'مربع', w: 1, h: 1 }, { id: '4:5', label: 'پوسٹ', w: 4, h: 5 }, { id: '9:16', label: 'اسٹوری', w: 9, h: 16 }, { id: '16:9', label: 'چوڑا', w: 16, h: 9 },
];
export const canvasSize = (r: Ratio) => { const x = RATIOS.find((q) => q.id === r) ?? RATIOS[1]; return { w: BASE_W, h: Math.round((BASE_W * x.h) / x.w) }; };
export const exportPixels = (r: Ratio) => { const c = canvasSize(r); return { w: c.w * EXPORT_SCALE, h: c.h * EXPORT_SCALE }; };
