/** Pure slider maths (no React Native): thumb position <-> value, snapped to `step`. */
export const sliderValueAt = (x: number, width: number, min: number, max: number, step: number) => {
  const t = Math.max(0, Math.min(1, width > 0 ? x / width : 0));
  const snapped = Math.round((min + t * (max - min)) / step) * step;
  return +Math.max(min, Math.min(max, snapped)).toFixed(4);
};
export const sliderPosOf = (v: number, width: number, min: number, max: number) => (max === min ? 0 : ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * width);
