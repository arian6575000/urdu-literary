import assert from 'node:assert/strict';
import { applySuggestion, applySuggestions, findSuggestions, withinOne } from '../src/services/correction/engine';

const dict = [{ word: 'غالبؔ', wrong_forms: 'غالب شاعر' }, { word: 'نستعلیق', wrong_forms: 'نسطعلیق,نستعلیک' }, { word: 'محبّت', wrong_forms: '' }];

// suggest-only: text is never modified by findSuggestions
const text = 'یہ نسطعلیق  ہے ,كيا خوب';
const before = text;
const sg = findSuggestions(text, dict);
assert.equal(text, before);
const kinds = sg.map((s) => s.kind);
assert.ok(kinds.includes('dictionary'), 'dictionary wrong form');
assert.ok(kinds.includes('script'), 'arabic kaf/yeh');
assert.ok(kinds.includes('punctuation'), 'latin comma');
assert.ok(kinds.includes('spacing'), 'double space');
const dic = sg.find((s) => s.kind === 'dictionary')!;
assert.equal(dic.original, 'نسطعلیق'); assert.equal(dic.replacement, 'نستعلیق');
assert.equal(applySuggestion(text, dic).includes('نستعلیق'), true);
// stale suggestion is refused
assert.equal(applySuggestion('کچھ اور', dic), 'کچھ اور');
// apply all, right-to-left, offsets stay valid
const all = applySuggestions(text, sg);
assert.ok(all.includes('نستعلیق') && all.includes('کیا') && all.includes('،') && !all.includes('  '));
// a word equal to a dictionary word apart from diacritics is NOT flagged; a one-letter-off word is only suggested
assert.equal(findSuggestions('اس کی محبت بہت ہے', dict).filter((s) => s.kind === 'similar').length, 0);
const near = findSuggestions('اس کی محبب بہت ہے', dict).find((s) => s.kind === 'similar');
assert.ok(near && near.replacement === 'محبّت');
// clean text -> no suggestions; a word already in the dictionary is not flagged
assert.equal(findSuggestions('دلِ ناداں تجھے ہوا کیا ہے', dict).length, 0);
assert.equal(withinOne('abcd', 'abce'), true); assert.equal(withinOne('abcd', 'abxy'), false); assert.equal(withinOne('abc', 'abcd'), true);
console.log('correction ✓');
