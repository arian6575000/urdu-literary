// Card-editor Urdu strings (kept next to the feature; the rest of the app uses constants/strings.ts).
export const CS = {
  title: 'کارڈ ڈیزائنر', tText: 'متن', tDesign: 'ڈیزائن', tColor: 'رنگ', tBg: 'پس منظر', tDecor: 'سجاوٹ', tImage: 'تصویر',
  undo: 'واپس', redo: 'دوبارہ', save: 'محفوظ', export: 'ایکسپورٹ', reset: 'ڈیزائن ری سیٹ', fit: 'پوری کارڈ دیکھیں', zoom: 'بڑا کر کے دیکھیں',
  body: 'کارڈ کا متن', titleF: 'عنوان', poetF: 'شاعر کا نام', showTitle: 'عنوان دکھائیں', showPoet: 'شاعر کا نام دکھائیں',
  font: 'فونٹ', size: 'حجم', lineH: 'سطروں کا فاصلہ', letterS: 'حروف کا فاصلہ', letterHint: 'نستعلیق میں زیادہ فاصلہ حروف کی جڑت بگاڑ سکتا ہے',
  align: 'ترتیب', right: 'دائیں', center: 'درمیان', left: 'بائیں', textColor: 'متن کا رنگ',
  templates: 'سانچے', layout: 'ترتیب بندی', lCenter: 'درمیان', lTop: 'اوپر', lBottom: 'نیچے', lSpread: 'پھیلا ہوا',
  dims: 'کارڈ کی پیمائش', padding: 'حاشیہ', radius: 'کونوں کی گولائی', offX: 'افقی پوزیشن', offY: 'عمودی پوزیشن', shadow: 'متن پر سایہ',
  target: 'کس کا رنگ', tgText: 'متن', tgBg: 'پس منظر', tgAccent: 'نمایاں رنگ', tgFrom: 'گریڈینٹ آغاز', tgTo: 'گریڈینٹ اختتام',
  presets: 'تیار رنگ', gradients: 'گریڈینٹ', custom: 'اپنا رنگ', hue: 'رنگت', sat: 'گہرائی', val: 'روشنی', hex: 'ہیکس کوڈ',
  patterns: 'نمونے', patOpacity: 'نمونے کی شدت', textures: 'ساخت', decors: 'آرائشی پس منظر', none: 'کوئی نہیں',
  pDots: 'نقطے', pLines: 'ترچھی لکیریں', pGrid: 'جالی', pDiamonds: 'ہیرے', pKhatam: 'ختم', pWaves: 'لہریں',
  xPaper: 'کاغذ', xLinen: 'کتان', xGrain: 'دانے', dNight: 'چاند رات', dDunes: 'ٹیلے', dArches: 'محراب', dPetals: 'پنکھڑیاں', dRays: 'کرنیں',
  frames: 'کنارے اور فریم', fSingle: 'سادہ', fDouble: 'دوہرا', fCorners: 'کونے', fOrnate: 'مزین', fArch: 'محراب',
  dividers: 'جداگانہ لکیر', dvLine: 'لکیر', dvDots: 'نقطے', dvDiamond: 'ہیرا', dvFlourish: 'بیل',
  motifs: 'ادبی نقش', mCrescent: 'ہلال', mKhatam: 'ختم', mFlower: 'پھول', mLeaf: 'پتا', mMoon: 'چاند ستارے', mPen: 'قلم', place: 'جگہ', pTop: 'اوپر', pBottom: 'نیچے', pCorners: 'کونوں میں',
  imgPick: 'تصویر منتخب کریں', imgReplace: 'تصویر بدلیں', imgRemove: 'تصویر ہٹائیں', imgMode: 'تصویر کا انداز', imBg: 'پورا پس منظر', imInset: 'اوپر چوکھٹے میں',
  opacity: 'شفافیت', zoomS: 'زوم / کراپ', posX: 'افقی', posY: 'عمودی', dim: 'اندھیرا (متن کے لیے)', imgNone: 'ابھی کوئی تصویر نہیں', imgHint: 'گیلری سے تصویر چنیں، پھر زوم اور پوزیشن سے فریم کے مطابق کریں۔',
  confirmRemoveImg: 'کیا تصویر ہٹانی ہے؟', confirmReset: 'تمام ڈیزائن ابتدائی حالت پر آ جائے گا (متن برقرار رہے گا)۔ جاری رکھیں؟', discard: 'محفوظ نہ کی گئی تبدیلیاں ضائع ہو جائیں گی۔ کیا واقعی باہر نکلنا ہے؟', leave: 'باہر نکلیں',
  saved: 'ڈیزائن محفوظ ہو گیا', share: 'تصویر شیئر کریں', gallery: 'گیلری میں محفوظ کریں', galleryOk: 'تصویر گیلری میں محفوظ ہو گئی', galleryDenied: 'گیلری کی اجازت نہیں ملی۔ ترتیبات میں اجازت دیں۔', exporting: 'تصویر بن رہی ہے…', format: 'فارمیٹ', resolution: 'ریزولوشن', expFail: 'تصویر بنانے میں مسئلہ آیا', imgFail: 'تصویر نہیں کھل سکی', editHint: 'ترمیم کے لیے کارڈ کے کسی حصے کو دبائیں',
  pickWriting: 'کارڈ کے لیے تحریر چنیں', pickWritingD: 'پہلے کوئی تحریر منتخب کریں، پھر اس کا کارڈ بنائیں۔',
};
export type CardTab = 'text' | 'design' | 'color' | 'bg' | 'decor' | 'image';
