import assert from 'node:assert/strict';
import { buildPdfHtml } from '../src/services/pdf/html';
import { COMPANY_CREDIT } from '../src/constants/app';
import type { Writing } from '../src/types';

const w = (o: Partial<Writing>): Writing => ({ id: 'a', title: 'عنوان', content: 'سطر ایک\nسطر دو\n\nسطر تین', category_id: 'ghazal', author: 'شاعر', original_transcript: '', is_favorite: 0, word_count: 5, created_at: 1, updated_at: 1, ...o });
const html = buildPdfHtml([w({}), w({ id: 'b', category_id: 'mazmoon', content: 'پیرا ایک\nپیرا دو with English words <b>' })], { titlePage: true, author: 'مصنف' });
assert.ok(html.includes('dir="rtl"') && html.includes('size:A4'));
assert.ok(html.includes(COMPANY_CREDIT), 'credit in footer of every page');
assert.ok(html.includes('counter(page'), 'page numbers');
assert.ok(html.includes('class="cover"'), 'title page');
assert.equal((html.match(/class="couplet"/g) ?? []).length, 2, 'poetry kept as couplets');
assert.ok(html.includes('&lt;b&gt;'), 'html escaped');
assert.ok(!buildPdfHtml([w({})], { titlePage: false }).includes('class="cover"'));
console.log('pdf html ✓');
