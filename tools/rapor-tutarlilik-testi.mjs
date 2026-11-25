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
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
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
const __importTargets = { 'schema.js': '__schema', 'report-model.js': '__reportModel' };
const __inlineImports = (src) =>
  src.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+'([^']+)';\s*$/gm, function (_m, names, spec) {
    const file = (spec.match(/([^/]+\.js)/) || [])[1];
    const target = __importTargets[file];
    if (!target) return _m;
    const list = names.split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    return 'const { ' + list.join(', ') + ' } = globalThis.' + target + ';';
  });
let code = __inlineImports(fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8'))
  .replace(/^init\(\)\.catch\([\s\S]*?\);\s*$/m, '')
  .replace(/^init\(\);\s*$/m, '');
if (/^\s*import\s/m.test(code)) {
  console.error('KALDI  app.js içinde sıyırılamayan import satırı var; test koşumu güncel değil.');
  process.exit(1);
}
code += `\n;globalThis.__api={ setCase(c){appState.cases=[c];appState.activeCaseId=c.id;},`
  + ` makeUdf, makeDocx, renderReport, REPORT_TEXT, REPORT_TYPES, LEVELS_SCHEMA };\n`;

const downloads = [];
// Gerçek şema modülünü sandbox'a ver: app.js içindeki import bloğu buradan
// okur. Kopya tanım yok — test edilen şema ile üretimdeki şema aynı dosya.
import * as __schemaMod from '../assets/schema.js';
import * as __reportModelMod from '../assets/report-model.js';
const sandbox = {
  __schema: __schemaMod,
  __reportModel: __reportModelMod,
  console, document: documentStub, localStorage: localStorageStub,
  window: {}, navigator: {},
  getComputedStyle: () => ({ display: 'block', height: '0px', marginLeft: '0px', overflowX: 'visible' }),
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
// Bölüm başlıkları TEK KAYNAK: şema. Testte sabit başlık kopyası tutulmaz.
const SEC_TITLE = Object.fromEntries(__schemaMod.REPORT_SECTION_DEFS.map((d) => [d.key, d.title]));

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
  // XML varlıkları çözülür: metin karşılaştırması ham kaçışla değil, okunan
  // metinle yapılır (HTML çıktısıyla aynı ölçüt).
  // `<w:t` önekı `<w:tblPr>`/`<w:tblW>`/`<w:tc>` gibi etiketleri de yakalıyordu
  // ve XML gövdesi metne sızıyordu (v2.281'de ölçüldü). Yalnız gerçek `w:t`.
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((m) => m[1])
    .join('\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
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
  // v2.261: soru yoksa "Cevaplar" bölümü HİÇ çizilmez (boş başlık/fallback yok).
  check(
    'soru yokken cevaplar bölümü çizilmez',
    !H.includes(SEC_TITLE.answers) && !U.includes(SEC_TITLE.answers) && !D.includes(SEC_TITLE.answers)
  );
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

  // v2.234: `reading` BAĞIMSIZ. s5 KAPALI olsa da okuma metni görünmeli.
  const onlyReading = withMaterial();
  onlyReading.materials[0].segments = [
    { start: '00:00:00', end: '00:00:05', speaker: 'K', text: 'merhaba', review: 'onaylandi' },
    { start: '00:00:05', end: '00:00:10', speaker: 'K', text: 'dünya', review: 'onaylandi' },
    { start: '00:00:10', end: '00:00:15', speaker: 'E', text: 'evet', review: 'onaylandi' }
  ];
  onlyReading.report = { sections: { s5: false, reading: true } };
  const HR = htmlText(onlyReading), UR = await udfText(onlyReading), DR = await docxText(onlyReading);
  checkShared('s5 kapalı + okuma açık: başlık görünür', REPORT_TEXT.readingHeading, HR, UR, DR);
  checkShared('s5 kapalı + okuma açık: grup metni', 'merhaba dünya', HR, UR, DR);
  check('s5 kapalı: bölüm başlığı yok (H)', !HR.includes(SEC_TITLE.s5));
  check('s5 kapalı: bölüm başlığı yok (U)', !UR.includes(SEC_TITLE.s5));
  check('s5 kapalı: bölüm başlığı yok (D)', !DR.includes(SEC_TITLE.s5));
}

// Senaryo 13: dosyalar arası kişi (v2.205) — üç çıktı aynı satırı üretmeli.
console.log('\n[Senaryo 13] dosyalar arası kişi (v2.205)');
{
  const c = withMaterial();
  c.speakers = [
    { id: 'ps1', code: 'K1', label: 'Kiracı', role: 'complainant', gender: 'female', ageRange: '30-40', notes: '' }
  ];
  c.materials[0].speakers = [
    { id: 'spA', code: 'S1', name: 'Kiracı', label: 'Kiracı', personId: 'ps1', role: 'complainant', gender: 'female' }
  ];
  c.materials[0].segments[0].speaker = 'Kiracı';
  const m2 = JSON.parse(JSON.stringify(c.materials[0]));
  m2.id = 'm2';
  m2.name = 'b.wav';
  m2.fileName = 'b.wav';
  m2.segments = [{ ...c.materials[0].segments[0], id: 'sg2', text: 'dünya' }];
  m2.speakers = [{ ...c.materials[0].speakers[0], id: 'spB' }];
  c.materials.push(m2);

  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  // v2.281: ana/süre tablolarında kod ve etiket AYRI hücre; kayıt tablosunda
  // "DOSYALAR ARASI KİŞİ" tek sütun ("K1 · Kiracı").
  checkShared('kayıt tablosunda kişi kodu', 'K1 · Kiracı', H, U, D);
  checkShared('iki kayıt tek satırda (A)', 'a.wav: S1 · 1 bölüm', H, U, D);
  checkShared('iki kayıt tek satırda (B)', 'b.wav: S1 · 1 bölüm', H, U, D);
  checkShared('uzman eşleştirmesi notu', 'uzman eşleştirmesi', H, U, D);
  checkShared('konuşmacı açıklaması', REPORT_TEXT.speakerIntro, H, U, D);
  // Kişi etiketi TABLO BAŞINA bir kez görünür: künye (1) + süre (1) +
  // kayıt bazında konuşmacı tablosu (v2.273; her kayıt için 1 → 2 kayıt = 2).
  // Toplam 4. Kural: aynı kişi tek bir tabloda KAYIT SAYISI kadar çoğalmaz.
  // KOD sütunu (ana + süre tablosu): K1 kendi HÜCRESİNDE, 2 kez.
  const countCode = (t) => (String(t).match(/^K1$/gm) || []).length;
  check('kişi kodu KOD sütununda 2 kez (HTML)', countCode(H) === 2, String(countCode(H)));
  check('kişi kodu KOD sütununda 2 kez (UDF)', countCode(U) === 2, String(countCode(U)));
  check('kişi kodu KOD sütununda 2 kez (DOCX)', countCode(D) === 2, String(countCode(D)));
  // Birleşik "K1 · Kiracı" yalnız KAYIT tablolarında (2 kayıt) görünür.
  const countCombined = (t) => (String(t).match(/K1 · Kiracı/g) || []).length;
  check('birleşik kişi etiketi yalnız kayıt tablosunda', countCombined(H) === 2, String(countCombined(H)));
}

// Senaryo 14: delil paketi edinme bilgisi (v2.208) — üç çıktı aynı satırı
// üretmeli; paket yoksa bölüm hiç çizilmemeli.
console.log('\n[Senaryo 14] delil edinme bilgisi (v2.208, v2.212)');
{
  const c = withMaterial();
  c.materials[0].origin = {
    ...(c.materials[0].origin || {}),
    deliveredBy: 'Mehmet Kaya',
    deliveredByRegistry: 'K-77',
    deliveredAt: '2026-11-21',
    deliveryPlace: 'Ankara 3. Sulh Ceza Mahkemesi',
    acquisition: {
      schema: 'akis.delil.v1',
      acquiredAt: '2026-11-22T10:15:00+03:00',
      operator: { name: 'Ahmet Yılmaz', registry: '1234', organization: 'Kurum' },
      device: { busType: 'USB', model: 'SanDisk', serial: 'SN123', label: 'DELIL-7', sizeBytes: 16000000000, volumes: ['E:'] },
      method: {
        readOnly: 'diskpart',
        hardwareWriteBlocker: false,
        copyType: 'logical-file-copy',
        image: null,
        tool: { name: 'Edinim', version: '1.1', engine: 'PowerShell' }
      },
      hashState: 'verified'
    }
  };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('delil başlığı', REPORT_TEXT.acqHeading, H, U, D);
  checkShared('cihaz modeli', 'SanDisk', H, U, D);
  checkShared('seri no', 'SN123', H, U, D);
  checkShared('yöntem', 'Mantıksal kopya', H, U, D);
  checkShared('doğrulama durumu', 'Doğrulandı', H, U, D);
  // v2.212/v2.213 — alet adı (ürün markası değil) üç çıktıda aynı.
  checkShared('alet adı', 'Edinim v1.1', H, U, D);
  // v2.212 — operatör sicili üç çıktıda aynı.
  checkShared('operatör sicili', 'Ahmet Yılmaz · 1234', H, U, D);
  // v2.212 — teslim zinciri: eden + sicil, yer, tarih.
  checkShared('teslim eden + sicil', 'Mehmet Kaya · K-77', H, U, D);
  checkShared('teslim yeri', 'Ankara 3. Sulh Ceza Mahkemesi', H, U, D);
  // v2.213 — CİHAZ ve ETİKET ayrı sütun.
  checkShared('cihaz etiketi ayrı sütun', 'DELIL-7', H, U, D);
  // v2.213 — kayıt cihazı/tarihi bilinmiyorsa "bilinmiyor" yazılır.
  checkShared('kayıt cihazı bilinmiyor', 'bilinmiyor', H, U, D);
  // v2.213 — envanter tablosu 7 ayrı sütun.
  checkShared('envanter biçim sütunu', 'DOSYA BİÇİMİ', H, U, D);
  checkShared('envanter örnekleme sütunu', 'ÖRNEKLEME HIZI', H, U, D);
  checkShared('envanterde biçim WAV', 'WAV', H, U, D);
  checkShared('envanterde örnekleme', '16.000 Hz', H, U, D);
  // v2.216 — gözlenen dosya zamanı notu üç çıktıda aynı.
  checkShared('dosya zamanı notu', REPORT_TEXT.originFileTimeNote, H, U, D);
  // v2.212 — sürücü harfi kanıt kimliği değildir; üç çıktıda da YOK.
  check('sürücü harfi raporda yok (HTML)', !/\bE:/.test(H), 'E: bulundu');
  check('sürücü harfi raporda yok (UDF)', !/\bE:/.test(U), 'E: bulundu');
  check('sürücü harfi raporda yok (DOCX)', !/\bE:/.test(D), 'E: bulundu');

  const c0 = withMaterial();
  const H0 = htmlText(c0), U0 = await udfText(c0), D0 = await docxText(c0);
  check(
    'paket yokken delil bölümü yok',
    !H0.includes(REPORT_TEXT.acqHeading) && !U0.includes(REPORT_TEXT.acqHeading) && !D0.includes(REPORT_TEXT.acqHeading)
  );
}

// Senaryo 15 (v2.212): delil bölümü de "rapor bilirkişi adına yazılır"
// kuralına uyar. v2.208'de acqIntro "Uygulama cihazı görmez" diyordu; Senaryo
// 10 delil verisi olmadan çalıştığı için bunu yakalayamıyordu.
console.log('\n[Senaryo 15] delil verisiyle de ürün kimliği yok (v2.212)');
{
  const c = withMaterial();
  c.materials[0].origin = {
    ...(c.materials[0].origin || {}),
    acquisition: {
      schema: 'akis.delil.v1',
      acquiredAt: '2026-11-22T10:15:00+03:00',
      operator: { name: 'Ahmet Yılmaz', registry: '1234' },
      device: { busType: 'USB', model: 'SanDisk', serial: 'SN123', volumes: ['E:'] },
      method: { copyType: 'logical-file-copy', tool: { name: 'Edinim', version: '1.1', engine: 'PowerShell' } },
      hashState: 'verified'
    }
  };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  for (const [name, text] of [['HTML', H], ['UDF', U], ['DOCX', D]]) {
    check(`${name} çıktısında "AKİS" geçmez (delil verili)`, !/ak[iİ]s/i.test(text));
    check(`${name} çıktısında "uygulama" geçmez (delil verili)`, !/uygulama/i.test(text));
    check(`${name} çıktısında "tarayıcı" geçmez (delil verili)`, !/tarayıcı/i.test(text));
  }
  downloads.length = 0; setCase(c); await makeUdf();
  const uz = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const ux = await uz.file('content.xml').async('string');
  check('UDF XML içinde "Akis" geçmez (delil verili)', !/Akis/i.test(ux));
}


// Senaryo 16 (v2.217): gömülü metadata bölümü YALNIZ kullanıcı açarsa girer.
console.log('\n[Senaryo 16] gömülü metadata (cihaz beyanı) aç/kapa');
{
  const c = withMaterial();
  c.report = { ...(c.report || {}), includeEmbedded: true };
  c.materials[0].origin = {
    ...(c.materials[0].origin || {}),
    embedded: {
      source: 'MP4/M4A',
      recordingAt: '2026-03-12T14:20:00.000Z',
      software: 'PhoneRecorder 2.0',
      encodingAt: '',
      releaseAt: '',
      readAt: '2026-11-22T10:00:00+03:00'
    }
  };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('gömülü başlık', REPORT_TEXT.embeddedHeading, H, U, D);
  checkShared('gömülü açıklama', REPORT_TEXT.embeddedIntro, H, U, D);
  checkShared('gömülü kayıt zamanı', '2026-03-12T14:20:00.000Z', H, U, D);
  checkShared('gömülü yazılım', 'PhoneRecorder 2.0', H, U, D);
  checkShared('gömülü kaynak', 'MP4/M4A', H, U, D);

  const off = withMaterial();
  off.report = { ...(off.report || {}), includeEmbedded: false };
  off.materials[0].origin = { ...(off.materials[0].origin || {}), embedded: c.materials[0].origin.embedded };
  const H2 = htmlText(off), U2 = await udfText(off), D2 = await docxText(off);
  check(
    'kapalıyken bölüm yok',
    !H2.includes(REPORT_TEXT.embeddedHeading) && !U2.includes(REPORT_TEXT.embeddedHeading) && !D2.includes(REPORT_TEXT.embeddedHeading)
  );
}

// Senaryo 17: rapor bölüm görünürlüğü (v2.219) — üç çıktı AYNI anahtarı
// onurlandırmalı. Kapalı bölüm hiçbir çıktıda olmamalı; açık bölüm kalmalı.
console.log('\n[Senaryo 17] rapor bölüm görünürlüğü (v2.219)');
{
  const mk = (report) =>
    baseCase({
      questions: [{ id: 'q1', question: 'Soru 1', answer: 'Cevap 1', basis: 'Dayanak' }],
      materials: [
        {
          id: 'm1',
          name: 'a.wav',
          type: 'audio/wav',
          size: 1000,
          duration: 12.5,
          sha256: 'abc',
          tech: { codec: 'PCM (WAV)', channels: 1, sampleRate: 16000, bitDepth: 16 },
          segments: [{ id: 'sg1', start: '00:00:00', end: '00:00:05', speaker: 'S1', text: 'merhaba', review: 'onaylandi' }],
          origin: { mediumType: 'usb', mediumLabel: 'FLASH-1' },
          log: []
        }
      ],
      ...(report ? { report } : {})
    });
  const on = mk();
  const H = htmlText(on), U = await udfText(on), D = await docxText(on);
  checkShared('varsayılan: köken başlığı', REPORT_TEXT.originHeading, H, U, D);
  checkShared('varsayılan: sonuç gövdesi', REPORT_TEXT.defaultConclusion, H, U, D);
  checkShared('varsayılan: inceleme özeti', REPORT_TEXT.reviewSummaryHeading, H, U, D);
  checkShared('varsayılan: okuma metni', REPORT_TEXT.readingHeading, H, U, D);

  const off = mk({ sections: { origin: false, reviewSummary: false, s6: false, s7: false, reading: false } });
  const H2 = htmlText(off), U2 = await udfText(off), D2 = await docxText(off);
  check(
    'kapalı köken üç çıktıda da yok',
    !H2.includes(REPORT_TEXT.originHeading) && !U2.includes(REPORT_TEXT.originHeading) && !D2.includes(REPORT_TEXT.originHeading)
  );
  check(
    'kapalı sonuç üç çıktıda da yok',
    !H2.includes(REPORT_TEXT.defaultConclusion) &&
      !U2.includes(REPORT_TEXT.defaultConclusion) &&
      !D2.includes(REPORT_TEXT.defaultConclusion)
  );
  check(
    'kapalı inceleme özeti üç çıktıda da yok',
    !H2.includes(REPORT_TEXT.reviewSummaryHeading) &&
      !U2.includes(REPORT_TEXT.reviewSummaryHeading) &&
      !D2.includes(REPORT_TEXT.reviewSummaryHeading)
  );
  check(
    'kapalı ekler başlığı üç çıktıda da yok',
    !H2.includes(REPORT_TEXT.attachmentsText) && !U2.includes(REPORT_TEXT.attachmentsText) && !D2.includes(REPORT_TEXT.attachmentsText)
  );
  check(
    'kapalı okuma metni üç çıktıda da yok',
    !H2.includes(REPORT_TEXT.readingHeading) && !U2.includes(REPORT_TEXT.readingHeading) && !D2.includes(REPORT_TEXT.readingHeading)
  );
  checkShared('açık kalan sorular bölümü', SEC_TITLE.s2, H2, U2, D2);
}

// Senaryo 18: 56.12 şablon bölümleri (v2.220). Yeni bölümler VARSAYILAN
// KAPALI (mevcut rapor değişmez); açılınca üç çıktıda AYNI görünmeli.
console.log('\n[Senaryo 18] 56.12 şablon bölümleri (v2.220)');
{
  const mk = (sections) =>
    baseCase({
      materials: [
        {
          id: 'm1',
          name: 'a.wav',
          type: 'audio/wav',
          size: 1000,
          duration: 12.5,
          sha256: 'abc',
          tech: { codec: 'PCM (WAV)', channels: 1, sampleRate: 16000, bitDepth: 16 },
          segments: [{ id: 'sg1', start: '00:00:00', end: '00:00:05', speaker: 'S1', text: 'merhaba', review: 'onaylandi' }],
          transcribedWithModel: 'Xenova/whisper-small',
          asrAt: '2026-02-01',
          origin: { mediumType: 'usb', mediumLabel: 'FLASH-1', deliveredBy: 'Ahmet Yılmaz', deliveredAt: '2026-03-12', deliveryPlace: 'Mahkeme' },
          log: [{ at: '2026-02-01T10:00:00Z', event: 'teslim', detail: 'kayıt alındı' }]
        }
      ],
      ...(sections ? { report: { sections } } : {})
    });
  const NEW = [
    REPORT_TEXT.kunyeHeading,
    REPORT_TEXT.summaryHeading,
    REPORT_TEXT.enhanceHeading,
    REPORT_TEXT.asrHeading,
    REPORT_TEXT.scopeNoteHeading,
    REPORT_TEXT.privacyHeading,
    REPORT_TEXT.annexHeading
  ];
  const d = mk();
  const Hd = htmlText(d), Ud = await udfText(d), Dd = await docxText(d);
  check(
    'varsayılan: yeni bölümler KAPALI (üç çıktıda yok)',
    NEW.every((t) => !Hd.includes(t) && !Ud.includes(t) && !Dd.includes(t))
  );

  const on = mk({ kunye: true, summary: true, enhance: true, asr: true, scopeNote: true, privacy: true, annex: true });
  const H = htmlText(on), U = await udfText(on), D = await docxText(on);
  for (const t of NEW) checkShared(`açık: ${t.slice(0, 24)}`, t, H, U, D);
  checkShared('künye değeri (dosya no)', '2026/214 E.', H, U, D);
  checkShared('kısa özet başlığı içeriği', 'İncelenen ses dosyası sayısı', H, U, D);
  checkShared('ASR modeli', 'Xenova/whisper-small', H, U, D);
  checkShared('EK-1 teslim tutanağı', 'EK-1. MATERYAL TESLİM VE İADE TUTANAĞI', H, U, D);
  checkShared('EK-3 işlem günlüğü', 'EK-3. ZİNCİRLEME MUHAFAZA / İŞLEM GÜNLÜĞÜ', H, U, D);
  checkShared('EK-4 gösterim anahtarı', 'EK-4. TRANSKRİPT GÖSTERİM ANAHTARI', H, U, D);
}

// Senaryo 19: teknik ortam alanları (v2.222). Bölüm varsayılan kapalı;
// açılınca elle girilen değerler üç çıktıda AYNI görünmeli.
console.log('\n[Senaryo 19] teknik ortam alanları (v2.222)');
{
  const mk = (sections, tech) => baseCase({ report: { sections: sections || {}, tech: tech || {} } });
  const off = mk({}, { os: 'Windows 11' });
  const Ho = htmlText(off), Uo = await udfText(off), Do = await docxText(off);
  check(
    'varsayılan: teknik bölüm KAPALI (üç çıktıda yok)',
    !Ho.includes(REPORT_TEXT.techHeading) && !Uo.includes(REPORT_TEXT.techHeading) && !Do.includes(REPORT_TEXT.techHeading)
  );

  const on = mk({ tech: true }, { workstation: 'PC-1', os: 'Windows 11', software: 'Araç 1.0' });
  const H = htmlText(on), U = await udfText(on), D = await docxText(on);
  checkShared('teknik bölüm başlığı', REPORT_TEXT.techHeading, H, U, D);
  checkShared('iş istasyonu değeri', 'PC-1', H, U, D);
  checkShared('işletim sistemi değeri', 'Windows 11', H, U, D);
  checkShared('yazılım değeri', 'Araç 1.0', H, U, D);
  checkShared('boş alan "—" ile yazılır', 'Meta veri okuma aracı ve sürümü', H, U, D);
}

// Senaryo 20: künye ek alanları (v2.225). Künye kapalıyken görünmez; açıkken
// elle girilen ekler/tarafsızlık beyanı üç çıktıda AYNI olmalı.
console.log('\n[Senaryo 20] künye ek alanları (v2.225)');
{
  const mk = (sections, extra) => baseCase({ report: { sections: sections || {}, ...(extra || {}) } });
  const off = mk({}, { impartiality: 'Engel yok', annexList: 'EK-1' });
  const Ho = htmlText(off), Uo = await udfText(off), Do = await docxText(off);
  check(
    'varsayılan: künye KAPALI (üç çıktıda yok)',
    !Ho.includes(REPORT_TEXT.kunyeHeading) && !Uo.includes(REPORT_TEXT.kunyeHeading) && !Do.includes(REPORT_TEXT.kunyeHeading)
  );

  const on = mk({ kunye: true }, { impartiality: 'Tarafsızlığı etkileyen hâl yoktur.', annexList: 'EK-1 teslim tutanağı' });
  const H = htmlText(on), U = await udfText(on), D = await docxText(on);
  checkShared('künye başlığı', REPORT_TEXT.kunyeHeading, H, U, D);
  checkShared('raporun ekleri değeri', 'EK-1 teslim tutanağı', H, U, D);
  checkShared('tarafsızlık beyanı değeri', 'Tarafsızlığı etkileyen hâl yoktur.', H, U, D);
}

// Senaryo 21: kalite kontrolü / denetlenebilirlik (v2.226).
console.log('\n[Senaryo 21] kalite kontrolü bölümü (v2.226)');
{
  const mk = (sections, extra) => baseCase({ report: { sections: sections || {}, ...(extra || {}) } });
  const off = mk({}, { qcBy: 'Uzman Y' });
  const Ho = htmlText(off), Uo = await udfText(off), Do = await docxText(off);
  check(
    'varsayılan: kalite bölümü KAPALI (üç çıktıda yok)',
    !Ho.includes(REPORT_TEXT.qcHeading) && !Uo.includes(REPORT_TEXT.qcHeading) && !Do.includes(REPORT_TEXT.qcHeading)
  );
  const on = mk({ qc: true }, { qcBy: 'Uzman Y', qcScope: 'Tüm bölümler', qcDate: '2026-02-10' });
  const H = htmlText(on), U = await udfText(on), D = await docxText(on);
  checkShared('kalite bölümü başlığı', REPORT_TEXT.qcHeading, H, U, D);
  checkShared('delil günlüğü satırı', 'Delil günlüğü zinciri', H, U, D);
  checkShared('ikinci kontrolü yapan değeri', 'Uzman Y', H, U, D);
  checkShared('ikinci kontrol kapsamı değeri', 'Tüm bölümler', H, U, D);
}

// Senaryo 22: rapor sırası, türetilmiş numara ve ekler (v2.227).
// KURAL: bölüm kapatılınca numara boşluğu OLMAZ; sıra değişince üç çıktı da
// aynı sırayı ve aynı numarayı verir; EK numarası bitişiktir.
console.log('\n[Senaryo 22] rapor sırası, türetilmiş numara, ekler (v2.227)');
{
  const noS3 = baseCase({ report: { sections: { s3: false } } });
  const H = htmlText(noS3),
    U = await udfText(noS3),
    D = await docxText(noS3);
  checkShared('s3 kapalı: 4. bölüm 3 oldu', '3. İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR', H, U, D);
  const stale = '4. İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR';
  check('s3 kapalı: eski 4 numarası kalmadı (H)', !H.includes(stale));
  check('s3 kapalı: eski 4 numarası kalmadı (U)', !U.includes(stale));
  check('s3 kapalı: eski 4 numarası kalmadı (D)', !D.includes(stale));

  // Kullanıcı TAM sıra üzerinde s1/s2 yerini değiştirir (UI de bunu üretir).
  const swapOrder = __schemaMod.REPORT_BODY_ORDER.slice();
  const iS1 = swapOrder.indexOf('s1');
  const iS2 = swapOrder.indexOf('s2');
  swapOrder[iS1] = 's2';
  swapOrder[iS2] = 's1';
  const reordered = baseCase({ report: { layout: { order: swapOrder } } });
  const H2 = htmlText(reordered),
    U2 = await udfText(reordered),
    D2 = await docxText(reordered);
  const first = '1. BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR';
  const second = '2. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI';
  for (const [n, txt] of [['H', H2], ['U', U2], ['D', D2]]) {
    check(`sıra değişti: s2 önce (${n})`, txt.indexOf(first) >= 0 && txt.indexOf(first) < txt.indexOf(second));
  }

  // v2.261 — "EKLER" bölümü ekleri LİSTELER; ek yoksa bunu söyler.
  const noAnnex = baseCase({ report: { sections: { annex: false } } });
  const HN = htmlText(noAnnex),
    UN = await udfText(noAnnex),
    DN = await docxText(noAnnex);
  checkShared('ek yokken "ek sunulmamıştır"', REPORT_TEXT.noAttachments, HN, UN, DN);

  const annex = baseCase({ report: { sections: { annex: true } } });
  const HA = htmlText(annex),
    UA = await udfText(annex),
    DA = await docxText(annex);
  checkShared('EK-4 bitişik numaralı', 'EK-4. TRANSKRİPT GÖSTERİM ANAHTARI', HA, UA, DA);
  checkShared('EK-6 bitişik numaralı', 'EK-6. HUKUKİ VE YÖNTEMSEL DAYANAKLAR', HA, UA, DA);
  check('EK-7 numarası kalmadı (H)', !HA.includes('EK-7.'));
  check(
    'EKLER bölümü ekleri listeler (H)',
    HA.includes('EK-1. MATERYAL TESLİM VE İADE TUTANAĞI') && HA.includes('EK-6. HUKUKİ VE YÖNTEMSEL DAYANAKLAR')
  );
  check(
    "EKLER listesi UDF ve DOCX'te de var",
    UA.includes('• EK-1. MATERYAL TESLİM VE İADE TUTANAĞI') && DA.includes('• EK-1. MATERYAL TESLİM VE İADE TUTANAĞI')
  );
}

// Senaryo 23: özel ek (başlık/içerik/not) üç çıktıda aynı (v2.227).
console.log('\n[Senaryo 23] özel ek başlık/içerik/not üç çıktıda (v2.227)');
{
  const custom = baseCase({
    report: {
      sections: { annex: true },
      layout: {
        annexMeta: { x1: { title: 'UZMAN TEKNİK NOTU', content: 'Gözlenen teknik bulgu.', note: 'Yalnız belgelenmiş bulgu.' } }
      }
    }
  });
  // x1 yalnız annexMeta'da; normalize onu sıranın sonuna (EK-7) ekler.
  const H = htmlText(custom),
    U = await udfText(custom),
    D = await docxText(custom);
  checkShared('özel ek başlığı (EK-7)', 'EK-7. UZMAN TEKNİK NOTU', H, U, D);
  checkShared('özel ek içeriği', 'Gözlenen teknik bulgu.', H, U, D);
  checkShared('özel ek notu', 'Yalnız belgelenmiş bulgu.', H, U, D);
}

// Senaryo 24: rapor alanları — tablo sütunu aç/kapa (v2.235).
console.log('\n[Senaryo 24] rapor alanları: tablo sütunu aç/kapa (v2.235)');
{
  const c = withMaterial();
  c.report = { sections: { s3: true }, columns: { inventory: { sha256: false } } };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  check('SHA-256 sütunu kapalı (H): değer yok', !H.includes('abc123'));
  check('SHA-256 sütunu kapalı (U): değer yok', !U.includes('abc123'));
  check('SHA-256 sütunu kapalı (D): değer yok', !D.includes('abc123'));
  checkShared('diğer envanter sütunu korunur', 'DOSYA BİÇİMİ', H, U, D);

  const off = withMaterial();
  off.report = {
    sections: { s3: true },
    columns: { inventory: { name: false, format: false, size: false, duration: false, channels: false, sampleRate: false, sha256: false } }
  };
  const H2 = htmlText(off), U2 = await udfText(off), D2 = await docxText(off);
  checkShared('tüm sütunlar kapalı → uyarı', REPORT_TEXT.noColumns, H2, U2, D2);
}

// Senaryo 25: kanıt tablosu sütunları — zaman+metin zorunlu (v2.236).
console.log('\n[Senaryo 25] kanıt tablosu sütunları (v2.236)');
{
  const c = withMaterial();
  c.materials[0].segments = [
    { id: 's1', start: '00:00:00', end: '00:00:05', speaker: 'K', text: 'merhaba', review: 'onaylandi' },
    { id: 's2', start: '00:00:05', end: '00:00:10', speaker: 'K', text: 'dünya', review: 'onaylandi' }
  ];
  c.report = { sections: { s5: true, speakers: false }, columns: { segments: { speaker: false, review: false, obs: false } } };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('kanıt: zaman korunur', 'ZAMAN ARALIĞI', H, U, D);
  checkShared('kanıt: metin korunur', 'ÇÖZÜMLENEN KONUŞMA', H, U, D);
  check('kanıt: konuşmacı kodu kapalı (H)', !H.includes('KONUŞMACI KODU'));
  check('kanıt: konuşmacı etiketi kapalı (H)', !H.includes('KONUŞMACI ETİKETİ'));
  check('kanıt: kontrol sütunu kapalı (H)', !H.includes('KONTROL DURUMU'));
  // 'GÖZLEM' başka bir başlıkta (…GÖZLEMLENMESİ…) geçebilir; tam satır aranır.
  check('kanıt: gözlem sütunu kapalı (H)', !/^\s*GÖZLEM\s*$/m.test(H));

  const c2 = withMaterial();
  c2.materials[0].segments = c.materials[0].segments;
  c2.report = { sections: { s5: true, speakers: false }, columns: { segments: { time: false, text: false } } };
  const H2 = htmlText(c2);
  check('kilit: zaman yine basılır', H2.includes('ZAMAN ARALIĞI'));
  check('kilit: metin yine basılır', H2.includes('ÇÖZÜMLENEN KONUŞMA'));
}

// Senaryo 26: rapor biçimi (v2.238) — font · punto · marj · yön üç çıktıya.
{
  console.log('[Senaryo 26] rapor biçimi: font · punto · marj · yön');
  const c = withMaterial();
  c.report = {
    format: {
      fontFamily: 'times',
      fontSizePt: 13,
      orientation: 'landscape',
      marginsMm: { top: 30, right: 25, bottom: 30, left: 25 }
    }
  };
  downloads.length = 0; setCase(c); await makeDocx();
  const dZ = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const dx = await dZ.file('word/document.xml').async('string');
  check('DOCX yatay yön', /w:orient="landscape"/.test(dx) && /w:pgSz w:w="16838" w:h="11906"/.test(dx));
  check('DOCX Times New Roman', /w:rFonts w:ascii="Times New Roman"/.test(dx));
  check('DOCX marj (30/25 mm → 1701/1417)', /w:pgMar w:top="1701" w:right="1417" w:bottom="1701" w:left="1417"/.test(dx));

  downloads.length = 0; setCase(c); await makeUdf();
  const uZ = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const ux = await uZ.file('content.xml').async('string');
  // UDF marjları PUNTO: 25 mm → 70.87 pt, 30 mm → 85.04 pt (mm değil!).
  check('UDF sol marj 25 mm → 70.87 pt', /leftMargin="70\.87"/.test(ux));
  check('UDF üst marj 30 mm → 85.04 pt', /topMargin="85\.04"/.test(ux));
  check('UDF punto ölçekli (13 pt gövde)', /family="Times New Roman" size="13"/.test(ux));
  check('UDF yatay yön (paperOrientation=0)', /paperOrientation="0"/.test(ux));

  // Dikey: paperOrientation="1" (v2.245 — yatay.udf ile doğrulandı).
  const cp = withMaterial();
  cp.report = { format: { orientation: 'portrait' } };
  downloads.length = 0; setCase(cp); await makeUdf();
  const uZ2 = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const ux2 = await uZ2.file('content.xml').async('string');
  check('UDF dikey yön (paperOrientation=1)', /paperOrientation="1"/.test(ux2));
  // Varsayılan 15 mm = 42.52 pt ≈ UYAP boş şablonu (42.525 pt) → boş dokümanla aynı.
  check('UDF varsayılan marj 15 mm → 42.52 pt (boş şablon)', /leftMargin="42\.5/.test(ux2));

  // Font ayarı UDF'e de uygulanır (v2.254): Arial seçilirse UDF Arial üretir.
  const ca = withMaterial();
  ca.report = { format: { fontFamily: 'arial' } };
  downloads.length = 0; setCase(ca); await makeUdf();
  const uZa = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const uxa = await uZa.file('content.xml').async('string');
  check('UDF Arial (font ayarı izlenir)', /family="Arial"/.test(uxa));
}

// Senaryo 27: video materyal → envanter notuna "yalnız ses" eklenir (üç çıktı).
{
  console.log('[Senaryo 27] video "yalnız ses" notu (üç çıktı)');
  const c = withMaterial();
  c.materials[0].name = 'kamera.mp4';
  c.materials[0].type = 'video/mp4';
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('video yalnız ses notu', REPORT_TEXT.videoAudioNote, H, U, D);

  // Video yoksa not GİRMEZ.
  const c2 = withMaterial();
  const H2 = htmlText(c2);
  check('video yoksa not yok (H)', !H2.includes(REPORT_TEXT.videoAudioNote));
}

// Senaryo 28: UDF'te deşifre metnine görünmez karakter (ZWSP) enjekte edilmez;
// yalnız çok uzun kesintisiz token (SHA-256) satır kırılsın diye sarılır (v2.251).
{
  console.log('[Senaryo 28] UDF görünmez karakter enjeksiyonu (v2.251)');
  const c = withMaterial();
  c.materials[0].sha256 = 'a'.repeat(64);
  c.materials[0].segments = [
    { start: '00:00:00.000', end: '00:00:05.000', speaker: 'Belirtilmemiş', text: 'Oturmak.', review: 'pending' }
  ];
  downloads.length = 0; setCase(c); await makeUdf();
  const uz = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const ux = await uz.file('content.xml').async('string');
  check('deşifre metninde ZWSP yok (Belirtil…)', !/Belirtil\u200B/.test(ux));
  check('zaman kodunda ZWSP yok (00:00:00…)', !/00:00:00\u200B/.test(ux));
  check('uzun SHA-256 ZWSP ile sarılır', /a{16}\u200B/.test(ux));
}

// Senaryo 29: sayfa ayırımı — DOCX tablo satırı bölünmez, ekler yeni sayfadan (v2.258).
{
  console.log('[Senaryo 29] sayfa ayırımı (v2.258)');
  const c = withMaterial();
  c.report = { sections: { annex: true } };

  downloads.length = 0; setCase(c); await makeDocx();
  const dZ = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const dx = await dZ.file('word/document.xml').async('string');
  check('DOCX tablo satırı bölünmez (cantSplit)', /<w:cantSplit\/>/.test(dx));
  // Tablo metin genişliğine oturur: 15 mm marjda A4 içerik = 10206 twip.
  check('DOCX tablo metin genişliğine oturur (10206)', /w:tblW w:w="10206"/.test(dx));
  check('DOCX tablo sol girinti 0', /w:tblInd w:w="0"/.test(dx));
  // LibreOffice/Word "tablo sola çıkıntı" olmasın: hücre yatay dolgusu 0,
  // dolgu paragraf girintisiyle (v2.260).
  check('DOCX hücre sol dolgusu 0', /<w:tblCellMar><w:top w:w="95" w:type="dxa"\/><w:left w:w="0"/.test(dx));
  check('DOCX hücre paragraf girintisi (kenarlık hizalı)', /<w:ind w:left="90"/.test(dx));
  // Her ana bölüm (1–7) yeni sayfa + kapak + ekler → en az 7 sayfa sonu.
  check('DOCX ana bölümler yeni sayfa (>=7)', (dx.match(/w:type="page"/g) || []).length >= 7);

  downloads.length = 0; setCase(c); await makeUdf();
  const uZ = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
  const ux = await uZ.file('content.xml').async('string');
  check('UDF ana bölümler yeni sayfa (>=7)', (ux.match(/<page-break>/g) || []).length >= 7);
}

// Senaryo 30: parçalar ayrı — cevaplar · sınırlılıklar · bütünlük (v2.261).
// KURAL: her parça TEK BAŞINA açılıp kapanabilir; üç çıktı aynı metni verir;
// sıra numarası açık bölümlere göre türetilir.
{
  console.log('\n[Senaryo 30] parçalar ayrı: cevaplar · sınırlılıklar · bütünlük (v2.261)');
  const sha = 'b'.repeat(64);
  const mk = (report, extra = {}) =>
    baseCase({
      questions: [{ id: 'q1', question: 'Kayıtta ne konuşuldu?', answer: 'Depozito tartışıldı.', basis: '00:00:00-00:00:05' }],
      limitationsText: 'Arka plan gürültüsü yer yer anlaşılabilirliği düşürmüştür.',
      materials: [
        {
          id: 'm1',
          name: 'a.wav',
          type: 'audio/wav',
          size: 1000,
          duration: 12.5,
          sha256: sha,
          tech: { codec: 'PCM (WAV)', channels: 1, sampleRate: 16000, bitDepth: 16 },
          segments: [
            { id: 'sg1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'S1', text: 'merhaba', review: 'approved' },
            { id: 'sg2', start: '00:00:05.000', end: '00:00:09.000', speaker: 'S1', text: '[anlaşılmıyor]', review: 'inaudible' }
          ],
          log: [],
          ...extra
        }
      ],
      ...(report ? { report } : {})
    });

  // (a) Üç parça da açık: cevap, sınırlılık, bütünlük üç çıktıda aynı.
  const on = mk({ sections: { integrity: true } });
  const H = htmlText(on),
    U = await udfText(on),
    D = await docxText(on);
  checkShared('cevaplar başlığı', SEC_TITLE.answers, H, U, D);
  checkShared('soru metni (aynen)', 'Kayıtta ne konuşuldu?', H, U, D);
  checkShared('cevap metni', 'Depozito tartışıldı.', H, U, D);
  checkShared('sınırlılıklar başlığı', SEC_TITLE.limits, H, U, D);
  checkShared('sınırlılık metni', 'Arka plan gürültüsü', H, U, D);
  checkShared('ölçülen sınırlılık özeti', REPORT_TEXT.limitsMeasuredPrefix, H, U, D);
  checkShared('bütünlük başlığı', SEC_TITLE.integrity, H, U, D);
  checkShared('bütünlük SHA-256 değeri', sha, H, U, D);
  checkShared('bütünlük notu', REPORT_TEXT.integrityNote, H, U, D);
  // Sıra: bulgular → cevaplar → sınırlılıklar (üç çıktıda aynı).
  for (const [n, txt] of [['H', H], ['U', U], ['D', D]]) {
    const iF = txt.indexOf(SEC_TITLE.s5),
      iA = txt.indexOf(SEC_TITLE.answers),
      iL = txt.indexOf(SEC_TITLE.limits);
    check(`sıra: bulgular → cevaplar → sınırlılıklar (${n})`, iF >= 0 && iF < iA && iA < iL);
  }

  // (b) Cevaplar kapatılır: sınırlılıklar KALIR (parçalar bağımsız).
  const noAns = mk({ sections: { answers: false, integrity: true } });
  const H2 = htmlText(noAns),
    U2 = await udfText(noAns),
    D2 = await docxText(noAns);
  check(
    'cevaplar kapalı: cevap metni yok',
    !H2.includes('Depozito tartışıldı.') && !U2.includes('Depozito tartışıldı.') && !D2.includes('Depozito tartışıldı.')
  );
  checkShared('cevaplar kapalı: sınırlılıklar duruyor', 'Arka plan gürültüsü', H2, U2, D2);

  // (c) Sınırlılıklar kapatılır: cevaplar KALIR.
  const noLim = mk({ sections: { limits: false, integrity: true } });
  const H3 = htmlText(noLim),
    U3 = await udfText(noLim),
    D3 = await docxText(noLim);
  check(
    'sınırlılıklar kapalı: metin yok',
    !H3.includes('Arka plan gürültüsü') && !U3.includes('Arka plan gürültüsü') && !D3.includes('Arka plan gürültüsü')
  );
  checkShared('sınırlılıklar kapalı: cevaplar duruyor', 'Depozito tartışıldı.', H3, U3, D3);

  // (d) Bütünlük kapatılır: SHA-256 satırı yok.
  const noInt = mk({ sections: { integrity: false } });
  const H4 = htmlText(noInt),
    U4 = await udfText(noInt),
    D4 = await docxText(noInt);
  check('bütünlük kapalı: başlık yok', !H4.includes(SEC_TITLE.integrity) && !U4.includes(SEC_TITLE.integrity) && !D4.includes(SEC_TITLE.integrity));
  check(
    'bütünlük kapalı: not yok',
    !H4.includes(REPORT_TEXT.integrityNote) && !U4.includes(REPORT_TEXT.integrityNote) && !D4.includes(REPORT_TEXT.integrityNote)
  );
  checkShared('bütünlük kapalı: sınırlılıklar duruyor', 'Arka plan gürültüsü', H4, U4, D4);
}


// Senaryo 31: konuşmacı kodu çakışması (v2.262). Çakışma varsa üç çıktı da
// UYARIR; yoksa uyarı çıkmaz. Kod sessizce yeniden numaralanmaz.
{
  console.log('\n[Senaryo 31] konuşmacı kodu çakışması (v2.262)');
  const mk = (codes) => {
    const c = withMaterial();
    c.materials[0].speakers = codes.map((code, i) => ({
      id: 'sp' + i,
      code,
      name: i === 0 ? 'A' : 'B',
      label: i === 0 ? 'A' : 'B',
      role: 'unspecified',
      gender: 'unspecified'
    }));
    c.materials[0].segments = [
      { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'A', text: 'merhaba', review: 'approved' }
    ];
    return c;
  };
  const dup = mk(['S1', 'S1']);
  const H = htmlText(dup), U = await udfText(dup), D = await docxText(dup);
  checkShared('çakışma uyarısı', REPORT_TEXT.speakerCodeConflict, H, U, D);

  const ok = mk(['S1', 'S2']);
  const H2 = htmlText(ok), U2 = await udfText(ok), D2 = await docxText(ok);
  check(
    'çakışma yoksa uyarı yok',
    !H2.includes(REPORT_TEXT.speakerCodeConflict) &&
      !U2.includes(REPORT_TEXT.speakerCodeConflict) &&
      !D2.includes(REPORT_TEXT.speakerCodeConflict)
  );
}


// Senaryo 32: konuşmacı "doğrulandı" kilidi (v2.264). Doğrulanmış kişinin
// künyesi raporda işaretlenir; doğrulanmamışta not ÇIKMAZ.
{
  console.log('\n[Senaryo 32] konuşmacı doğrulandı kilidi (v2.264)');
  const mk = (verifiedAt) => {
    const c = withMaterial();
    c.materials[0].speakers = [
      {
        id: 'sp1',
        code: 'S1',
        name: 'Kiracı',
        label: 'Kiracı',
        role: 'complainant',
        gender: 'unspecified',
        verifiedAt: verifiedAt || '',
        verifiedBy: verifiedAt ? 'Uzman' : ''
      }
    ];
    c.materials[0].segments = [
      { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'merhaba', review: 'approved' }
    ];
    return c;
  };
  const on = mk('2026-01-01T10:00:00Z');
  const H = htmlText(on), U = await udfText(on), D = await docxText(on);
  checkShared('doğrulanmış künye notu', REPORT_TEXT.speakerVerifiedSuffix, H, U, D);
  const off = mk('');
  const H2 = htmlText(off), U2 = await udfText(off), D2 = await docxText(off);
  check(
    'doğrulanmamışta not yok',
    !H2.includes(REPORT_TEXT.speakerVerifiedSuffix) && !U2.includes(REPORT_TEXT.speakerVerifiedSuffix) && !D2.includes(REPORT_TEXT.speakerVerifiedSuffix)
  );
}


// Senaryo 33: konuşmacı tablosunda süre + ilk/son duyulma (v2.266).
{
  console.log('\n[Senaryo 33] konuşmacı tablosu: süre + ilk/son (v2.266)');
  const c = withMaterial();
  c.materials[0].speakers = [{ id: 'sp1', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified' }];
  c.materials[0].segments = [
    { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'bir', review: 'approved' },
    { id: 'g2', start: '00:00:05.000', end: '00:00:10.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'iki', review: 'approved' }
  ];
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  // v2.268: süre/aralık AYRI tabloda; ana tablonun NOT hücresi sıkışmaz.
  checkShared('süre tablosu başlığı', REPORT_TEXT.speakerDurationHeading, H, U, D);
  checkShared('süre tablosu sütunları', REPORT_TEXT.speakerDurationHeaders[2], H, U, D);
  checkShared('süre değeri', '00:10', H, U, D);
  checkShared('ilk/son duyulma', '00:00:10.000', H, U, D);
  checkShared('ana tabloda bölüm sayısı', 'a.wav: 2 bölüm', H, U, D);
  checkShared('süre tablosu dipnotu', REPORT_TEXT.speakerFootnote, H, U, D);
}


// Senaryo 34: S/K ayrımı (v2.267). S kodları kayıt başınadır; rapor bunu
// AÇIKÇA yazar ve her kaydın başında o kaydın konuşmacılarını listeler.
{
  console.log('\n[Senaryo 34] S/K ayrımı ve kayıt konuşmacıları (v2.267)');
  const c = withMaterial();
  c.materials[0].speakers = [
    { id: 'sp1', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified' }
  ];
  c.materials[0].segments = [
    { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'bir', review: 'approved' }
  ];
  c.report = { sections: { annex: true } };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('S/K açıklaması', 'KAYIT İÇİ', H, U, D);
  checkShared('K dosyalar arası', 'dosyalar arası eşleştirme', H, U, D);
  checkShared('kayıt başına konuşmacı satırı', 'Bu kaydın konuşmacıları: S1 · Kiracı (1 bölüm)', H, U, D);
  checkShared('EK-5 S tanımı', 'Kayıt içi konuşmacı kodu', H, U, D);
  checkShared('EK-5 K tanımı', 'Dosyalar arası kişi kodu', H, U, D);
}


// Senaryo 35: rapor netliği (v2.268) — süre tablosu, EK-5 üç tablo,
// okuma metninde kayıt konuşmacıları. Üç çıktı AYNI metni vermeli.
{
  console.log('\n[Senaryo 35] süre tablosu + gösterim anahtarı + okuma metni (v2.268)');
  const c = withMaterial();
  c.materials[0].speakers = [{ id: 'sp1', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified' }];
  c.materials[0].segments = [
    { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'bir', review: 'approved' },
    { id: 'g2', start: '00:00:05.000', end: '00:00:10.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'iki', review: 'approved' }
  ];
  c.report = { sections: { annex: true, reading: true } };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('süre tablosu', REPORT_TEXT.speakerDurationHeading, H, U, D);
  checkShared('süre/tarih dipnotu', REPORT_TEXT.speakerFootnote, H, U, D);
  // EK-5 üç alt tablo
  checkShared('anahtar: konuşmacı kodları', 'Konuşmacı kodları', H, U, D);
  checkShared('anahtar: metin işaretleri', 'Metin işaretleri', H, U, D);
  checkShared('anahtar: gözlem işaretleri', 'Gözlem işaretleri', H, U, D);
  // Gözlem etiketlerinin HEPSİ anahtarda (OBS_DEFS tek kaynak)
  for (const d of __schemaMod.OBS_DEFS) checkShared(`gözlem: ${d.key}`, d.label, H, U, D);
  // Okuma metninde kayıt konuşmacı satırı
  checkShared('okuma metni kayıt satırı', 'Bu kaydın konuşmacıları: S1 · Kiracı (2 bölüm)', H, U, D);
}


// Senaryo 36: kayıt bazında KONUŞMACI TABLOSU (v2.273). Düz metin yerine tablo;
// "kim konuştu" tek bakışta görünür. Kişi sütunu yalnız bağ varsa eklenir.
{
  console.log('\n[Senaryo 36] kayıt bazında konuşmacı tablosu (v2.273)');
  const c = withMaterial();
  c.materials[0].speakers = [
    { id: 'sp1', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified' },
    { id: 'sp2', code: 'S2', name: 'Ev sahibi', label: 'Ev sahibi', role: 'defendant', gender: 'unspecified' }
  ];
  c.materials[0].segments = [
    { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'bir', review: 'approved' },
    { id: 'g2', start: '00:00:05.000', end: '00:00:10.000', speaker: 'Ev sahibi', speakerId: 'sp2', text: 'iki', review: 'approved' }
  ];
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  for (const h of ['KOD', 'ETİKET', 'BÖLÜM', 'SÜRE', 'İLK – SON']) checkShared(`kayıt tablosu sütunu ${h}`, h, H, U, D);
  checkShared('kayıt tablosu S1 satırı', 'S1', H, U, D);
  checkShared('kayıt tablosu etiket', 'Ev sahibi', H, U, D);
  // Kişi bağı YOKKEN "dosyalar arası kişi" sütunu çizilmez.
  check(
    'bağ yokken kişi sütunu yok',
    !H.includes('DOSYALAR ARASI KİŞİ') && !U.includes('DOSYALAR ARASI KİŞİ') && !D.includes('DOSYALAR ARASI KİŞİ')
  );

  // Bağ VARSA sütun eklenir ve kişi kodu yazılır.
  const c2 = withMaterial();
  c2.speakers = [{ id: 'p1', code: 'K1', label: 'Kiracı', role: 'complainant', gender: 'unspecified' }];
  c2.materials[0].speakers = [
    { id: 'sp1', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified', personId: 'p1' }
  ];
  c2.materials[0].segments = [
    { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'sp1', text: 'bir', review: 'approved' }
  ];
  const H2 = htmlText(c2), U2 = await udfText(c2), D2 = await docxText(c2);
  checkShared('bağ varsa kişi sütunu', 'DOSYALAR ARASI KİŞİ', H2, U2, D2);

  // S/K açıklaması TEK paragraf: eşleştirme cümlesi bir kez.
  const one = (t) => (String(t).match(/otomatik kimlik tespiti değildir/g) || []).length;
  check('S/K açıklaması tekrar etmez (H)', one(H) === 1, String(one(H)));
  check('S/K açıklaması tekrar etmez (U)', one(U) === 1, String(one(U)));
  check('S/K açıklaması tekrar etmez (D)', one(D) === 1, String(one(D)));
}

// Senaryo 37: başlık düzenleme + numara biçimi (v2.285). Üç çıktı aynı
// kullanıcı başlığını ve aynı numara biçimini üretmeli. Ayrıca numarasız
// kipte ALT BAŞLIK da numarasız olmalı (eski kod h4'te "5.1." bırakıyordu).
{
  console.log('\n[Senaryo 37] başlık düzenleme + harf numarası (v2.285)');
  const c = withMaterial();
  c.report = { numbering: 'letters', titles: { s1: 'ÖZEL KONU BAŞLIĞI' } };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('özel başlık üç çıktıda', 'ÖZEL KONU BAŞLIĞI', H, U, D);
  checkShared('harf numarası (A.)', 'A. ÖZEL KONU BAŞLIĞI', H, U, D);
  checkShared('harf alt başlık (E.1.)', 'E.1. Ses kayıtlarının çözümlenmesi', H, U, D);

  const c2 = withMaterial();
  c2.report = { numbering: 'none' };
  const H2 = htmlText(c2), U2 = await udfText(c2), D2 = await docxText(c2);
  checkShared('numarasız alt başlık', 'Ses kayıtlarının çözümlenmesi', H2, U2, D2);
  check('numarasız kipte "5.1." yok (H)', !/5\.1\./.test(H2), 'hâlâ numaralı');
  check('numarasız kipte "5.1." yok (U)', !/5\.1\./.test(U2), 'hâlâ numaralı');
  check('numarasız kipte "5.1." yok (D)', !/5\.1\./.test(D2), 'hâlâ numaralı');
}

// Senaryo 38: serbest rapor bloğu (v2.287). Üç çıktı aynı başlığı/metni
// basmalı; başlık veya metin boşsa blok HİÇ çizilmemeli (uydurma "—" yok).
{
  console.log('\n[Senaryo 38] serbest rapor bloğu (v2.287)');
  const c = withMaterial();
  const order = [...__schemaMod.REPORT_BODY_ORDER];
  order.splice(order.indexOf('s6'), 0, 'free:b1');
  c.report = {
    blocks: [{ id: 'b1', title: 'UZMAN NOTU', text: 'gözlem metni' }],
    layout: { order }
  };
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  checkShared('serbest blok başlığı', 'UZMAN NOTU', H, U, D);
  checkShared('serbest blok metni', 'gözlem metni', H, U, D);
  checkShared('serbest blok TOC satırı', '– UZMAN NOTU', H, U, D);

  const c2 = withMaterial();
  const order2 = [...__schemaMod.REPORT_BODY_ORDER];
  order2.splice(order2.indexOf('s6'), 0, 'free:b1');
  c2.report = {
    blocks: [{ id: 'b1', title: 'BOŞ BLOK', text: '' }],
    layout: { order: order2 }
  };
  const H2 = htmlText(c2), U2 = await udfText(c2), D2 = await docxText(c2);
  check('boş blok H çizilmez', !H2.includes('BOŞ BLOK'), 'başlık sızdı');
  check('boş blok U çizilmez', !U2.includes('BOŞ BLOK'), 'başlık sızdı');
  check('boş blok D çizilmez', !D2.includes('BOŞ BLOK'), 'başlık sızdı');
}

console.log(`\n== Sonuç: ${failures === 0 ? 'TÜM KONTROLLER GEÇTİ' : failures + ' KONTROL KALDI'} ==`);
process.exit(failures === 0 ? 0 : 1);