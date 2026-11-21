import assert from 'node:assert/strict';
import { countChars, countWords, firstLine, hashText, normalizeUrdu, splitCouplets, urduDigits } from '../src/utils/text';

assert.equal(normalizeUrdu('كتاب'), normalizeUrdu('کتاب')); // Arabic kaf == Urdu kaf
assert.equal(normalizeUrdu('زندگي'), normalizeUrdu('زندگی')); // Arabic yeh == Urdu yeh
assert.equal(normalizeUrdu('دِل'), normalizeUrdu('دل')); // zer ignored
assert.equal(normalizeUrdu('ہے'), normalizeUrdu('هے')); // heh forms
assert.equal(countWords('  دلِ ناداں  تجھے ہوا کیا ہے '), 6);
assert.equal(countWords(''), 0);
assert.equal(countChars('ا ب\nج'), 3);
assert.equal(urduDigits('2026'), '۲۰۲۶');
assert.deepEqual(splitCouplets('الف\nب\n\nج\nد\n\n\nه'), [['الف', 'ب'], ['ج', 'د'], ['ه']]);
assert.equal(firstLine('\n\n  پہلی سطر \nدوسری'), 'پہلی سطر');
assert.notEqual(hashText('a'), hashText('b'));
console.log('text ✓');
