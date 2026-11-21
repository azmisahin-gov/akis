/**
 * Rapor tutarlılık kontrolü.
 *
 * Üç rapor oluşturucu (HTML önizleme, DOCX, UDF) aynı dosya verisiyle
 * çalıştırılır ve metinleri karşılaştırılır. Amaç, aynı içeriğin önizlemede
 * başka, belgede başka çıkmasını (sapmayı) yapısal olarak yakalamaktır.
 *
 * Çalıştırma:  node tools/rapor-tutarlilik-testi.mjs
 * Gereksinim:  Node.js (harici paket gerekmez)
 *
 * Çıkış kodu 0 = tüm kontroller geçti, 1 = en az bir sapma var.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- app.js'i sahte bir DOM ile yükle -------------------------------------
const noop = () => {};
const els = new Map();
function makeEl(sel) {
  return {
    sel, value: '', textContent: '', innerHTML: '', hidden: false, disabled: false,
    dataset: {}, style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    appendChild: noop, remove: noop, showModal: noop, close: noop,
    getContext: () => ({ clearRect: noop, fillRect: noop, fillStyle: '' }),
  };
}
const documentStub = {
  querySelector: (s) => { if (!els.has(s)) els.set(s, makeEl(s)); return els.get(s); },
  querySelectorAll: () => [], createElement: () => makeEl('new'), addEventListener: noop,
};
const localStorageStub = {
  _d: {}, getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; },
};

const JSZip = (await import(path.join(ROOT, 'assets/vendor/jszip.min.js'))).default;

// app.js artık ES modülü: `import ... from './schema.js'`. Bu betik onu vm
// içinde çalıştırdığı için import bloğu, aynı adları sandbox global'inden alan
// bir atama bloğuna çevrilir. Böylece testler GERÇEK şemayı kullanır (kopya
// değil); şema ayrıca tools/sema-testi.mjs ile ayrıntılı sınanır.
const __inlineImports = (src) =>
  src.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+'[^']+';\s*$/m, function (_m, names) {
    const list = names.split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    return 'const { ' + list.join(', ') + ' } = globalThis.__schema;';
  });
let code = __inlineImports(fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8'))
  .replace(/^init\(\)\.catch\([\s\S]*?\);\s*$/m, '')
  .replace(/^init\(\);\s*$/m, '');
code += `\n;globalThis.__api={ setCase(c){appState.cases=[c];appState.activeCaseId=c.id;},`
  + ` makeUdf, makeDocx, renderReport, REPORT_TEXT, REPORT_TYPES, LEVELS_SCHEMA };\n`;

const downloads = [];
// Gerçek şema modülünü sandbox'a ver: app.js içindeki import bloğu buradan
// okur. Kopya tanım yok — test edilen şema ile üretimdeki şema aynı dosya.
import * as __schemaMod from '../assets/schema.js';
const sandbox = {
  __schema: __schemaMod,
  console, document: documentStub, localStorage: localStorageStub,
  window: {}, navigator: {},
  crypto: { subtle: { digest: async () => new ArrayBuffer(32) } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: noop },
  Blob, TextEncoder, TextDecoder, setTimeout, clearTimeout,
  indexedDB: { open: () => ({}) }, JSZip,
  DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
  fetch: async (url) => {
    if (url.includes('BOS.udf')) {
      return { ok: true, blob: async () => fs.readFileSync(path.join(ROOT, 'templates/BOS.udf')) };
    }
    return { ok: false };
  },
};
sandbox.window = sandbox;
sandbox.__schema = __schemaMod;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });
sandbox.downloadBlob = (blob, name) => downloads.push({ blob, name });
sandbox.showToast = noop;

const { setCase, makeUdf, makeDocx, renderReport, REPORT_TEXT, REPORT_TYPES, LEVELS_SCHEMA } = sandbox.__api;

// --- Çıktı metinlerini çıkar ----------------------------------------------
function htmlText(c) {
  setCase(c); renderReport();
  const html = els.get('#reportPreview').innerHTML;
  return html.replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
async function udfText(c) {
  downloads.length = 0; setCase(c); await makeUdf();
  const buf = Buffer.from(await downloads[0].blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('content.xml').async('string');
  return xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)[1].replace(/\u200b/g, '');
}
async function docxText(c) {
  downloads.length = 0; setCase(c); await makeDocx();
  const buf = Buffer.from(await downloads[0].blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join('\n');
}

// --- Test verisi -----------------------------------------------------------
function baseCase(overrides = {}) {
  return {
    id: 'c1', name: 'test', reportType: 'hukuk',
    court: 'Antalya 4. Asliye Hukuk Mahkemesi', fileNo: '2026/214 E.',
    assignmentDate: '2026-01-01', dueDate: '2026-02-01', assignmentDurationDays: '30',
    plaintiff: 'Deniz Aras', plaintiffCounsel: 'Av. Ece', defendant: 'Mert Yalçın',
    defendantCounsel: '', subject: 'Depozito uyuşmazlığı', caseDate: '2025-12-01',
    inspectionDate: '2026-01-05', expertName: 'Örnek Bilirkişi', registryNo: 'R-1',
    expertField: '56.12', reportDate: '2026-02-10', assignmentScope: 'Kapsam',
    questions: [], methodText: '', limitationsText: '', conclusionText: '',
    materials: [], synthetic: false, ...overrides,
  };
}
const withMaterial = (extra = {}) => baseCase({
  materials: [{
    id: 'm1', name: 'a.wav', type: 'audio/wav', size: 1000, duration: 12.5,
    sha256: 'abc123', tech: { codec: 'PCM (WAV)', channels: 1, sampleRate: 16000, bitDepth: 16 },
    segments: [{ start: '00:00:00', end: '00:00:05', speaker: 'K', text: 'merhaba', review: 'onaylandi' }],
    log: [], ...extra,
  }],
});

// --- Kontroller ------------------------------------------------------------
// Her kontrol: aynı metin üç çıktıda da bulunmalı.
let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${label}${detail ? '  → ' + detail : ''}`);
}
function checkShared(label, text, H, U, D) {
  const h = H.includes(text), u = U.includes(text), d = D.includes(text);
  check(`${label} (H:${h} U:${u} D:${d})`, h && u && d,
    h && u && d ? '' : 'üç çıktıda da bulunmalı');
}

console.log('== Rapor tutarlılık kontrolü ==\n');

// Senaryo 1: kayıt var (segmentli), iki uyarı da var
{
  const c = withMaterial({ hallucinationWarning: 'Dolgu ifadesi üretildi.', languageWarning: 'Dil tutarsızlığı.' });
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  console.log('[Senaryo 1] kayıt var, uyarılar var');
  checkShared('alt başlık', REPORT_TEXT.subtitle, H, U, D);
  checkShared('5.1 bölüm etiketi', REPORT_TEXT.segmentCountLabel, H, U, D);
  checkShared('envanter notu', REPORT_TEXT.inventoryNote, H, U, D);
  checkShared('envanter başlığı', REPORT_TEXT.inventoryHeaders[0], H, U, D);
  checkShared('segment başlığı', REPORT_TEXT.segmentHeaders[0], H, U, D);
  checkShared('çözümleme uyarısı etiketi', REPORT_TEXT.evidenceWarningPrefix, H, U, D);
  checkShared('kontrol uyarısı etiketi', REPORT_TEXT.languageWarningPrefix, H, U, D);
  checkShared('inceleme özeti başlığı', REPORT_TEXT.reviewSummaryHeading, H, U, D);
  checkShared('köken özeti satırı', REPORT_TEXT.rsOriginFilled, H, U, D);
  checkShared('gözlem sütunu başlığı', REPORT_TEXT.segmentHeadersObs[4], H, U, D);
}

// Senaryo 2: malzeme yok, soru yok, mahkeme adı boş
{
  const c = baseCase({ court: '' });
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  console.log('\n[Senaryo 2] malzeme yok, soru yok, mahkeme boş');
  checkShared('mahkeme yer tutucusu', REPORT_TEXT.emptyCourt.replace(/\s+$/, ''), H, U, D);
  checkShared('malzeme yok metni', REPORT_TEXT.noMaterials, H, U, D);
  checkShared('5.2 değerlendirme fallback', REPORT_TEXT.defaultEvaluation, H, U, D);
  // Soru fallback metni artık mercie göre üretilir (mahkeme/savcılık/icra).
  // hukuk türünde "Mahkemece bilirkişiye yöneltilen sorular…" beklenir.
  checkShared('bölüm 2 soru fallback', 'Mahkemece bilirkişiye yöneltilen sorular', H, U, D);
}

// Senaryo 3: dört merci türünde kapak etiketi
console.log('\n[Senaryo 3] merci türüne göre kapak etiketi');
for (const rt of ['hukuk', 'ceza', 'savcilik', 'icra']) {
  const c = baseCase({ reportType: rt });
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  const label = REPORT_TYPES[rt].fileNo;
  checkShared(`${rt} "${label}"`, label, H, U, D);
}

// Senaryo 4: üretilen belgelerin yapısal geçerliliği
console.log('\n[Senaryo 4] belge yapısı');
{
  const c = withMaterial();
  downloads.length = 0; setCase(c); await makeUdf();
  const ub = Buffer.from(await downloads[0].blob.arrayBuffer());
  const uz = await JSZip.loadAsync(ub);
  const ux = await uz.file('content.xml').async('string');
  check('UDF content.xml üretildi', !!ux);
  const refs = [...ux.matchAll(/<content startOffset="(\d+)" length="(\d+)"/g)];
  const cdata = ux.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)[1];
  const overflow = refs.filter(([, so, ln]) => Number(so) + Number(ln) > cdata.length + 1);
  check(`UDF referans taşması yok (${refs.length} referans)`, overflow.length === 0,
    overflow.length ? `${overflow.length} taşma` : '');
  // Kaba XML denetimi: etiketler dengeli mi
  const opens = (ux.match(/<paragraph/g) || []).length;
  const closes = (ux.match(/<\/paragraph>/g) || []).length;
  check('UDF paragraph etiketleri dengeli', opens === closes, `${opens}/${closes}`);

  downloads.length = 0; setCase(c); await makeDocx();
  const db = Buffer.from(await downloads[0].blob.arrayBuffer());
  const dz = await JSZip.loadAsync(db);
  check('DOCX document.xml üretildi', !!dz.file('word/document.xml'));
  check('DOCX styles.xml üretildi', !!dz.file('word/styles.xml'));
}

// Senaryo 5: kaynak düzeyinde sapma denetimi.
// Oluşturucu fonksiyonlarının gövdelerinde, REPORT_TEXT'te tanımlı bir metnin
// sabit kopyası bulunmamalıdır. Bu, ileride birinin metni tekrar sabit
// yazmasını yakalar.
console.log('\n[Senaryo 5] kaynakta sabit kopya denetimi');
{
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  // Biçimlendirmeye dayanıklı marker arama: sabit marker'lar boşluk farkına
  // duyarsızdır. Böylece kaynak yeniden biçimlendirilse bile (ör. "(){ " →
  // "() {") bu denetim sessizce boşa düşmez.
  function findMarker(marker, from = 0) {
    // Boşluklara ve süslü parantez öncesi boşluğa toleranslı desen: kaynak
    // yeniden biçimlendirilse bile ("(){ " → "() {") marker bulunur.
    const pattern = marker
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{/g, '\\s*\\{')
      .replace(/ /g, '\\s+');
    const m = new RegExp(pattern).exec(src.slice(from));
    return m ? from + m.index : -1;
  }
  function body(startMarker, endMarker) {
    const i = findMarker(startMarker);
    const j = i >= 0 ? findMarker(endMarker, i + startMarker.length) : -1;
    return i >= 0 && j > i ? src.slice(i, j) : '';
  }
  const renderers = {
    'HTML önizleme': body('function renderReport(){', 'function xesc'),
    DOCX: body('function docxXml', 'async function makeDocx'),
    UDF: body('async function makeUdf', 'async function exportProject'),
  };
  // Uzun ve ayırt edici metinler: sabit geçmesi kesin bir sapma işaretidir.
  const distinctive = [
    'subtitle', 'inventoryNote', 'defaultEvaluation', 'defaultQuestions',
    'defaultScope', 'attachmentsText', 'defaultLimitations', 'defaultConclusion',
    'warnMissingFields', 'warnHallucination', 'segmentCountLabel', 'noMaterials',
    'readingHeading', 'readingIntro',
  ];
  let leaks = 0;
  for (const [name, text] of Object.entries(renderers)) {
    for (const key of distinctive) {
      const value = REPORT_TEXT[key];
      if (typeof value !== 'string' || value.length < 12) continue;
      if (text.includes(value)) {
        leaks++;
        check(`${name} içinde '${key}' sabit yazılmış`, false, value.slice(0, 45));
      }
    }
  }
  check(`oluşturucularda sabit kopya yok (${leaks} sızıntı)`, leaks === 0);
}

// Senaryo 6: gözlem işaretleri ve kanal bilgisi rapora yansıyor mu
console.log('\n[Senaryo 6] gözlem ve kanal bilgisi');
{
  const c = withMaterial({ channelMode: 'left' });
  c.materials[0].tech.channels = 2;
  // v2.203: yeni telefon/sessizlik işaretleri + bilinmeyen (ileri sürüm) anahtar.
  c.materials[0].segments[0].obs = {
    noise: true,
    overlap: true,
    phone: true,
    noSpeech: true,
    futureFlag: true
  };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('gürültü etiketi', REPORT_TEXT.obsLabels.noise, H, U, D);
  checkShared('üst üste konuşma etiketi', REPORT_TEXT.obsLabels.overlap, H, U, D);
  checkShared('telefon etiketi', REPORT_TEXT.obsLabels.phone, H, U, D);
  checkShared('sessizlik etiketi', REPORT_TEXT.obsLabels.noSpeech, H, U, D);
  // Bilinmeyen ileri anahtar kayıtta korunur ama rapora BASILMAZ (v2.203).
  check('bilinmeyen gözlem anahtarı rapora basılmaz', ![H, U, D].some((t) => String(t).includes('futureFlag')));
}

// Senaryo 7: WER tablosu referans metni olan kayıtta rapora yansıyor mu
console.log('\n[Senaryo 7] WER ölçümü');
{
  const c = withMaterial();
  c.materials[0].expectedText = 'merhaba dünya bu bir test';
  c.materials[0].segments[0].text = 'merhaba dünya bu bir test';
  // v2.90: WER MODELİN çıktısını ölçer (asrText). Test verisi de gerçek
  // kayıt gibi olmalı: model çıktısı saklanmış olmalı, yoksa satır yazılmaz.
  c.materials[0].segments[0].asrText = 'merhaba dünya bu bir test';
  c.materials[0].transcribedWithModel = 'onnx-community/whisper-small';
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('WER başlığı', REPORT_TEXT.werHeading, H, U, D);
}

// Senaryo 7b: model çıktısı yoksa WER satırı YAZILMAZ (uydurma yok)
console.log('\n[Senaryo 7b] WER: model çıktısı yoksa satır yok');
{
  const c = withMaterial();
  c.materials[0].expectedText = 'merhaba dünya bu bir test';
  c.materials[0].segments[0].text = 'merhaba dünya bu bir test';
  delete c.materials[0].segments[0].asrText; // eski kayıt: model çıktısı yok
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  const missing = [H, U, D].some((t) => String(t).includes(REPORT_TEXT.werHeading));
  check('model çıktısı yokken WER tablosu basılmaz', !missing);
}

// Senaryo 8: kayıt kökeni tablosu rapora yansıyor mu
console.log('\n[Senaryo 8] kayıt kökeni');
{
  const c = withMaterial();
  c.materials[0].origin = { mediumType: 'USB flaş bellek', mediumLabel: 'FLASH-1', deliveredBy: 'Ahmet Yılmaz', deliveredAt: '2026-03-12', deviceInfo: 'cep telefonu' };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('köken başlığı', REPORT_TEXT.originHeading, H, U, D);
  checkShared('ortam etiketi değeri', 'FLASH-1', H, U, D);
}

// Senaryo 9: seviye ölçümü — yalnızca ölçülmüş kayıt rapora girer.
console.log('\n[Senaryo 9] seviye ölçümü');
{
  // Ölçüm yapılmamışsa bölüm hiç görünmemeli (yapılmayan ölçüm yazılmaz).
  const c0 = withMaterial();
  const H0 = htmlText(c0), U0 = await udfText(c0), D0 = await docxText(c0);
  check(
    'ölçüm yokken seviye bölümü yok',
    !H0.includes(REPORT_TEXT.levelHeading) && !U0.includes(REPORT_TEXT.levelHeading) && !D0.includes(REPORT_TEXT.levelHeading)
  );

  const c = withMaterial();
  c.materials[0].levels = {
    ok: true, schema: LEVELS_SCHEMA, peakDb: -3.2, rmsDb: -18.4, clippedRatio: 0.0004,
    clippedSamples: 4, noiseFloorDb: -61.5, noiseFloor: 0.00084, snrDb: 43.1,
    at: '2026-02-01T10:00:00.000Z'
  };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('seviye başlığı', REPORT_TEXT.levelHeading, H, U, D);
  checkShared('tepe düzeyi değeri', '-3,2', H, U, D);
  checkShared('RMS düzeyi değeri', '-18,4', H, U, D);
  checkShared('SNR değeri', '43,1 dB', H, U, D);
  checkShared('inceleme özeti seviye satırı', REPORT_TEXT.rsLevel, H, U, D);
}

// Senaryo 10: rapor bilirkişi adına yazılır; uygulamanın adı geçmez.
console.log('\n[Senaryo 10] çıktıda uygulama kimliği yok');
{
  const c = withMaterial({ levels: undefined });
  c.materials[0].levels = { ok: true, schema: LEVELS_SCHEMA, peakDb: -3, rmsDb: -18, clippedRatio: 0, clippedSamples: 0, noiseFloorDb: -60, noiseFloor: 0.001, snrDb: 40 };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  for (const [name, text] of [['HTML', H], ['UDF', U], ['DOCX', D]]) {
    check(`${name} çıktısında "AKİS" geçmez`, !/AKİS/i.test(text));
    check(`${name} çıktısında "uygulama" geçmez`, !/uygulama/i.test(text));
    check(`${name} çıktısında "tarayıcı" geçmez`, !/tarayıcı/i.test(text));
  }
  // UDF iç XML'inde de araç markası kalmamalı (tablo adları dahil).
  downloads.length = 0; setCase(c); await makeUdf();
  const uz = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const ux = await uz.file('content.xml').async('string');
  check('UDF XML içinde "Akis" geçmez', !/Akis/i.test(ux));
}

// Senaryo 11: dosya YAPISI geçerli mi (v2.85).
// v2.85 öncesinde testler yalnız METNE bakıyordu; bozuk ZIP, eksik parça,
// dengelenmemiş XML etiketi ve kaçırılmamış karakter görülmüyordu.
// Kullanıcı bu belgeyi mahkemeye gönderiyor: dosya AÇILMALI.
console.log('\n[Senaryo 11] dosya yapısı ve kaçış denetimi');
{
  const c = withMaterial({});
  // Özel karakterli metin: kaçış hatalarını yakalar.
  const OZEL = 'Açılı <parantez> & "tırnak" %12,5 — şğüıöçİĞÜŞÖÇ';
  c.materials[0].segments[0].text = OZEL;
  c.subject = 'Konu <>&" testi';
  c.methodText = 'Yöntem <>&" metni';

  // --- UDF yapısı
  downloads.length = 0; setCase(c); await makeUdf();
  const uBuf = Buffer.from(await downloads[0].blob.arrayBuffer());
  const uZip = await JSZip.loadAsync(uBuf);
  const uNames = Object.keys(uZip.files);
  check('UDF ZIP açılıyor', uNames.length > 0, `${uNames.length} dosya`);
  check('UDF content.xml içeriyor', uNames.includes('content.xml'));
  const ux = await uZip.file('content.xml').async('string');
  check('UDF <template> korunmuş', /<template\s/.test(ux));
  check('UDF <styles> korunmuş', /<styles>/.test(ux));
  check('UDF <properties> korunmuş', /<properties>/.test(ux));
  check('UDF format_id korunmuş', /format_id="/.test(ux));
  // UDF mimarisi: metin <content> CDATA içinde, <elements> yalnız offset taşır.
  const uContent = (ux.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/) || [])[1] || '';
  check('UDF metin CDATA içinde', uContent.length > 100, `${uContent.length} karakter`);
  // UDF tablosu uzun kelimeleri \u200B (görünmez kırma) ile böler; bu
  // taşmayı önleyen KASITLI bir davranış. Karşılaştırma öncesi temizlenir.
  const uClean = uContent.replace(/\u200B/g, '');
  check('UDF bölüm metnini içeriyor', uClean.includes('parantez'), uContent.slice(0, 80).replace(/\n/g, ' '));
  check('UDF Türkçe karakterler korunmuş', uClean.includes('şğüıöçİĞÜŞÖÇ'));
  check('UDF özel karakterler kaçırılmamış (CDATA)', uClean.includes('<parantez>') && uClean.includes('&'));
  // CDATA dışındaki XML kaçışlı olmalı.
  const uOutside = ux.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const uBad = uOutside.replace(/&amp;|&lt;|&gt;|&quot;|&apos;|&#\d+;/g, '');
  check('UDF CDATA dışı kaçış doğru', !/&/.test(uBad), '');

  // --- DOCX yapısı
  downloads.length = 0; setCase(c); await makeDocx();
  const dBuf = Buffer.from(await downloads[0].blob.arrayBuffer());
  const dZip = await JSZip.loadAsync(dBuf);
  const dNames = Object.keys(dZip.files);
  check('DOCX ZIP açılıyor', dNames.length > 0, `${dNames.length} dosya`);
  check('DOCX [Content_Types].xml var', dNames.includes('[Content_Types].xml'));
  check('DOCX word/document.xml var', dNames.includes('word/document.xml'));
  const dx = await dZip.file('word/document.xml').async('string');
  check('DOCX Türkçe karakterler korunmuş', dx.includes('şğüıöçİĞÜŞÖÇ'));
  const dOpen = (dx.match(/<w:p[ >]/g) || []).length;
  const dClose = (dx.match(/<\/w:p>/g) || []).length;
  check('DOCX paragraf etiketleri dengeli', dOpen === dClose, `aç ${dOpen} / kapa ${dClose}`);
  const dUnescaped = dx.replace(/&amp;|&lt;|&gt;|&quot;|&apos;|&#\d+;/g, '');
  check('DOCX kaçırılmamış & yok', !/&/.test(dUnescaped));

  // --- Konuşmacı kodu üç çıktıda da görünmeli (v2.85 name/label hatası).
  const c2 = withMaterial({});
  c2.materials[0].speakers = [{ id: 'sp1', code: 'S1', label: 'Kiracı', name: 'Kiracı', role: 'complainant' }];
  c2.materials[0].segments[0].speaker = 'Kiracı';
  const H2 = htmlText(c2), U2 = await udfText(c2), D2 = await docxText(c2);
  check('HTML çıktısında konuşmacı kodu S1 var', H2.includes('S1'), '');
  check('UDF çıktısında konuşmacı kodu S1 var', U2.includes('S1'), '');
  check('DOCX çıktısında konuşmacı kodu S1 var', D2.includes('S1'), '');
}

// Senaryo 12: okuma metni (v2.202) — üç çıktı AYNI metni üretmeli, kanıt
// tablosu DEĞİŞMEMELİ.
console.log('\n[Senaryo 12] okuma metni (v2.202)');
{
  const c = withMaterial();
  c.materials[0].segments = [
    { start: '00:00:00', end: '00:00:05', speaker: 'K', text: 'merhaba', review: 'onaylandi' },
    { start: '00:00:05', end: '00:00:10', speaker: 'K', text: 'dünya', review: 'onaylandi' },
    { start: '00:00:10', end: '00:00:15', speaker: 'E', text: 'evet', review: 'onaylandi' }
  ];
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('okuma metni başlığı', REPORT_TEXT.readingHeading, H, U, D);
  checkShared('okuma metni açıklaması', REPORT_TEXT.readingIntro, H, U, D);
  checkShared('okuma metni grup metni', 'merhaba dünya', H, U, D);
  checkShared('okuma metni bölüm sayısı', '2 bölüm', H, U, D);
  // Kanıt tablosu DEĞİŞMEDİ: ayrıntılı tablo başlığı duruyor.
  checkShared('kanıt tablosu başlığı korunur', REPORT_TEXT.segmentHeadersObs[0], H, U, D);
}

console.log(`\n== Sonuç: ${failures === 0 ? 'TÜM KONTROLLER GEÇTİ' : failures + ' KONTROL KALDI'} ==`);
process.exit(failures === 0 ? 0 : 1);