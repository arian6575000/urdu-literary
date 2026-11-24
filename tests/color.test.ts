import assert from 'node:assert/strict';
import { contrast, hexToHsv, hsvToHex, luminance, mix, normalizeHex, readableOn, withAlpha } from '../src/utils/color';
import { sliderPosOf, sliderValueAt } from '../src/utils/slider';
import { addRecent } from '../src/utils/recent';
import { resolveDark } from '../src/utils/themeMode';
import { DARK, LIGHT } from '../src/constants/palette';

assert.equal(normalizeHex('#ABC'), '#aabbcc'); assert.equal(normalizeHex('6a3dd1'), '#6a3dd1'); assert.equal(normalizeHex('xyz'), null); assert.equal(normalizeHex('#12345'), null);
// hsv round trip
for (const h of ['#6a3dd1', '#ff0000', '#00ff00', '#0a8587', '#ffffff', '#000000', '#f2b01e']) assert.equal(hsvToHex(hexToHsv(h).h, hexToHsv(h).s, hexToHsv(h).v), h);
assert.equal(hsvToHex(0, 1, 1), '#ff0000'); assert.equal(hsvToHex(120, 1, 1), '#00ff00'); assert.equal(hsvToHex(240, 1, 1), '#0000ff');
// contrast
assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 0.01); assert.ok(luminance('#ffffff') > luminance('#777777'));
assert.equal(readableOn('#14111F'), '#FFFFFF'); assert.equal(readableOn('#FFFFFF'), '#1B1730');
assert.equal(mix('#000000', '#ffffff', 0.5), '#808080'); assert.equal(withAlpha('#ff0000', 0.5), 'rgba(255,0,0,0.5)');
// design-system palettes keep readable text (WCAG AA 4.5:1 for body text, 3:1 for large/UI)
for (const [n, p] of [['light', LIGHT], ['dark', DARK]] as const) {
  assert.ok(contrast(p.text, p.bg) >= 7, `${n} text/bg`); assert.ok(contrast(p.text, p.surface) >= 7, `${n} text/surface`);
  assert.ok(contrast(p.muted, p.bg) >= 4.5, `${n} muted/bg ${contrast(p.muted, p.bg)}`); assert.ok(contrast(p.muted, p.surface) >= 4.5, `${n} muted/surface`);
  assert.ok(contrast(p.onPrimary, p.primary) >= 4.5, `${n} onPrimary`); assert.ok(contrast(p.onSecondary, p.secondary) >= 4.5, `${n} onSecondary`); assert.ok(contrast(p.onAccent, p.accent) >= 4.5, `${n} onAccent ${contrast(p.onAccent, p.accent)}`);
  assert.ok(contrast(p.primary, p.surface) >= 4.5, `${n} primary on surface`);
}
// slider
assert.equal(sliderValueAt(0, 200, 10, 50, 1), 10); assert.equal(sliderValueAt(200, 200, 10, 50, 1), 50); assert.equal(sliderValueAt(100, 200, 10, 50, 1), 30);
assert.equal(sliderValueAt(-40, 200, 10, 50, 1), 10); assert.equal(sliderValueAt(999, 200, 10, 50, 1), 50); assert.equal(sliderValueAt(70, 200, 1, 3, 0.25), 1.75);
assert.equal(sliderPosOf(30, 200, 10, 50), 100); assert.equal(sliderPosOf(99, 200, 10, 50), 200); assert.equal(sliderValueAt(5, 0, 0, 10, 1), 0);
// recent searches
assert.deepEqual(addRecent([], ' دل '), ['دل']); assert.deepEqual(addRecent(['a', 'b'], 'B'), ['B', 'a']); assert.deepEqual(addRecent(['a'], '  '), ['a']);
assert.equal(addRecent(Array.from({ length: 8 }, (_, i) => String(i)), 'x').length, 8);
// theme mode
assert.equal(resolveDark('dark', 'light'), true); assert.equal(resolveDark('light', 'dark'), false); assert.equal(resolveDark('system', 'dark'), true); assert.equal(resolveDark('system', null), false);
console.log('color + ui utils ✓');
