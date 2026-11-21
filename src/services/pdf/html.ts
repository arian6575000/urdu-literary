// Builds the HTML that expo-print turns into an A4 PDF. Pure string code — verified in a real browser (see docs/TESTING.md).
import { isPoetry } from '../../constants/categories';
import { COMPANY_CREDIT } from '../../constants/app';
import { splitCouplets, formatDate } from '../../utils/text';
import type { Writing } from '../../types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface PdfOptions { titlePage: boolean; author?: string; docTitle?: string; fontBase64?: string; fontFormat?: 'woff2' | 'truetype' }

function body(w: Writing): string {
  const head = `<h2>${esc(w.title || 'بے عنوان')}</h2>${w.author ? `<div class="by">${esc(w.author)}</div>` : ''}`;
  if (isPoetry(w.category_id)) {
    const blocks = splitCouplets(w.content).map((b) => `<div class="couplet">${b.map((l) => `<div class="line">${esc(l)}</div>`).join('')}</div>`).join('');
    return `<section class="piece poetry">${head}${blocks}</section>`;
  }
  const paras = w.content.replace(/\r\n/g, '\n').split(/\n+/).filter((p) => p.trim()).map((p) => `<p>${esc(p)}</p>`).join('');
  return `<section class="piece prose">${head}${paras}</section>`;
}

export function buildPdfHtml(writings: Writing[], o: PdfOptions): string {
  const font = o.fontBase64
    ? `@font-face{font-family:'AlviPdf';src:url(data:font/${o.fontFormat === 'truetype' ? 'ttf' : 'woff2'};base64,${o.fontBase64}) format('${o.fontFormat ?? 'woff2'}');}`
    : '';
  const title = o.docTitle || (writings.length === 1 ? writings[0].title : 'تحریروں کا مجموعہ');
  const titlePage = o.titlePage
    ? `<section class="cover"><div class="ornament">❖</div><h1>${esc(title || 'بے عنوان')}</h1>${o.author ? `<div class="author">${esc(o.author)}</div>` : ''}<div class="date">${formatDate(Date.now())}</div></section>`
    : '';
  return `<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
${font}
@counter-style urdu-digits{system:numeric;symbols:'۰' '۱' '۲' '۳' '۴' '۵' '۶' '۷' '۸' '۹';}
@page{size:A4;margin:22mm 18mm 24mm 18mm;
  @bottom-center{content:counter(page, urdu-digits);font-family:'AlviPdf',serif;font-size:12pt;color:#817D74;}
  @bottom-left{content:'${COMPANY_CREDIT}';font-family:sans-serif;font-size:7.5pt;color:#817D74;}
}
@page :first{ ${o.titlePage ? '@bottom-center{content:none;}' : ''} }
html,body{margin:0;padding:0;background:#fff;color:#292B29;}
body{font-family:'AlviPdf',serif;font-size:18pt;line-height:2.5;word-spacing:0.12em;direction:rtl;text-align:right;}
*{box-sizing:border-box;}
.cover{height:240mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;page-break-after:always;}
.cover h1{font-size:38pt;line-height:2.2;color:#174C3A;margin:8mm 0 4mm;font-weight:normal;}
.cover .ornament{font-size:30pt;color:#C19A5B;} .cover .author{font-size:20pt;color:#292B29;} .cover .date{font-size:13pt;color:#817D74;margin-top:10mm;}
.piece{page-break-before:always;} .piece:first-of-type{page-break-before:auto;}
${o.titlePage ? '' : '.piece:first-child{page-break-before:auto;}'}
h2{font-size:25pt;line-height:2.2;color:#174C3A;text-align:center;margin:0 0 2mm;font-weight:normal;}
.by{text-align:center;font-size:14pt;color:#C19A5B;margin-bottom:8mm;}
.poetry .couplet{text-align:center;margin:0 0 7mm;break-inside:avoid;page-break-inside:avoid;} .poetry .line{unicode-bidi:plaintext;font-size:21pt;}
.prose p{margin:0 0 4mm;text-align:justify;unicode-bidi:plaintext;orphans:2;widows:2;}
</style></head><body>${titlePage}${writings.map(body).join('')}</body></html>`;
}
