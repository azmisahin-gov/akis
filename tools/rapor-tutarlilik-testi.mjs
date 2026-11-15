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

let code = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8')
  .replace(/^init\(\);\s*$/m, '');
code += `\n;globalThis.__api={ setCase(c){appState.cases=[c];appState.activeCaseId=c.id;},`
  + ` makeUdf, makeDocx, renderReport, REPORT_TEXT, REPORT_TYPES };\n`;

const downloads = [];
const sandbox = {
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
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });
sandbox.downloadBlob = (blob, name) => downloads.push({ blob, name });
sandbox.showToast = noop;

const { setCase, makeUdf, makeDocx, renderReport, REPORT_TEXT, REPORT_TYPES } = sandbox.__api;

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
}

// Senaryo 2: malzeme yok, soru yok, mahkeme adı boş
{
  const c = baseCase({ court: '' });
  const H = htmlText(c), U = await udfText(c), D = await docxText(c);
  console.log('\n[Senaryo 2] malzeme yok, soru yok, mahkeme boş');
  checkShared('mahkeme yer tutucusu', REPORT_TEXT.emptyCourt.replace(/\s+$/, ''), H, U, D);
  checkShared('malzeme yok metni', REPORT_TEXT.noMaterials, H, U, D);
  checkShared('5.2 değerlendirme fallback', REPORT_TEXT.defaultEvaluation, H, U, D);
  checkShared('bölüm 2 soru fallback', REPORT_TEXT.defaultQuestions, H, U, D);
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
  function body(startMarker, endMarker) {
    const i = src.indexOf(startMarker);
    const j = src.indexOf(endMarker, i);
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

console.log(`\n== Sonuç: ${failures === 0 ? 'TÜM KONTROLLER GEÇTİ' : failures + ' KONTROL KALDI'} ==`);
process.exit(failures === 0 ? 0 : 1);