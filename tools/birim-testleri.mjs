/**
 * Hesaplama birim testleri.
 *
 * Uygulamanın kritik hesaplama fonksiyonlarını bilinen girdilerle sınar:
 * WER, Levenshtein, FFT, perde (temel frekans), Türkçe yönelme eki, zaman kodu,
 * dolgu tespiti, geçmiş sıkıştırma. Bu fonksiyonlar yanlış hesaplarsa rapora
 * yanlış sonuç girer; bu yüzden her değişiklikte sınanmalıdır.
 *
 * Çalıştırma:  node tools/birim-testleri.mjs
 * Gereksinim:  Node.js (harici paket gerekmez)
 *
 * Çıkış kodu 0 = tüm testler geçti, 1 = en az bir test kaldı.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- app.js'i sahte DOM ile yükle -----------------------------------------
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
    getContext: () => ({ clearRect: noop, fillRect: noop, fillStyle: '', strokeStyle: '', lineWidth: 0, beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop, font: '' }),
  };
}
const documentStub = {
  querySelector: (s) => { if (!els.has(s)) els.set(s, makeEl(s)); return els.get(s); },
  querySelectorAll: () => [], createElement: () => makeEl('new'),
  // createElement + appendChild ile kurulan öğeler kimlikleriyle erişilebilir
  // olmalı; aksi hâlde banner gibi çalışma zamanında üretilen düğümler testte
  // görünmez (v2.87: kayıt hatası şeridi bu yüzden sınanamıyordu).
  body: {
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: (el) => { if (el && el.id) els.set('#' + el.id, el); },
  },
  addEventListener: noop,
};
const localStorageStub = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

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
  .replace(/^init\(\);\s*$/m, '');
const EXPOSE = [
  'computeWer', 'editDistance', 'normalizeForWer', 'werWords',
  'fftMagnitude', 'detectPitchHz', 'specColor',
  'trDative', 'timecode', 'secondsFromTimecode',
  'isHallucination', 'compactHistory', 'segReview', 'isReviewed',
  'reportTypeSpec', 'questionsFallbackText', 'evaluationFallbackText',
  'paragraphize', 'analyzeSilence', 'segmentSilenceFlag',
  'analyzeLevels', 'levelRowsForCase', 'expertFieldShort',
  'analyzeStereo', 'spectralRolloff', 'snrText', 'floorText', 'fmtDb',
  'contentWords', 'findTermInconsistencies', 'applyTermForm',
  'detectRepetition', 'segmentRepetitionFlag',
  'buildProjectPack', 'validateProjectPack', 'matchAudioEntries',
  'evaluateModelIntegrity', 'recommendModel', 'modelIdFromUrl',
  'parseAsrResult', 'asrWindows', 'looksNonTurkish', 'safeName',
  'dtypeCandidates', 'dtypeLabel', 'modelShortName', 'looksLikeGarbage',
  'nudgeBoundary', 'loopRange', 'setLoopPoint', 'loopLabel',
  'segQuickCheck', 'segCounts', 'segMatchesFilter', 'tcRange', 'fmtWer',
  'fmtBytesShort',
  'asrProfile', 'asrProfileOptions', 'ASR_PROFILES',
  'sanitizeForStorage', 'showSaveFailureBanner', 'hideSaveFailureBanner',
  'VERSION_NOTICES', 'maybeShowVersionNotice', 'APP_VERSION',
  'setSegmentText', 'applyTextEdit', 'reviewLabel', 'emptySegmentForTest',
  'snapshotSegmentText', 'approvalDroppedByEdit',
];
code += `\n;globalThis.__t={${EXPOSE.map((n) => `${n}:typeof ${n}!=='undefined'?${n}:undefined`).join(',')}};\n`;
// Testin ihtiyaç duyduğu yardımcılar: sahte DOM elemanına erişim ve şema
// varsayılan üreticisi. Üretim kodunda bunlar yok; yalnız testte kullanılır.
code += `\n;globalThis.__t.el = (s) => document.querySelector(s);
globalThis.__t.emptyMaterialForTest = (o) => globalThis.__schema.emptyMaterial(o);
globalThis.__t.emptyCaseForTest = (o) => globalThis.__schema.emptyCase(o);
globalThis.__t.emptySegmentForTest = (o) => globalThis.__schema.emptySegment(o);
globalThis.__t.setAppState = (s) => { appState = s; };
globalThis.__t.store = localStorage;
`;

// Gerçek şema modülünü sandbox'a ver: app.js içindeki import bloğu buradan
// okur. Kopya tanım yok — test edilen şema ile üretimdeki şema aynı dosya.
import * as __schemaMod from '../assets/schema.js';
const sandbox = {
  __schema: __schemaMod,
  console, document: documentStub, localStorage: localStorageStub, window: {}, navigator: {},
  crypto: { subtle: { digest: async () => new ArrayBuffer(32) } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: noop },
  Blob, TextEncoder, TextDecoder, setTimeout, clearTimeout,
  indexedDB: { open: () => ({}) }, DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
  fetch: async () => ({ ok: false }),
  JSZip: { file() { return this; }, folder() { return this; }, async generateAsync() { return new Blob([]); } },
};
sandbox.CSS = { escape: (s) => String(s) };
sandbox.window = sandbox;
sandbox.__schema = __schemaMod;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });
const T = sandbox.__t;

// --- Test altyapısı -------------------------------------------------------
let failures = 0, passed = 0;
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++; else failures++;
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${label}${ok ? '' : `  → beklenen ${JSON.stringify(expected)}, bulunan ${JSON.stringify(actual)}`}`);
}
function near(label, actual, expected, tol) {
  const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= tol;
  if (ok) passed++; else failures++;
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${label}${ok ? '' : `  → beklenen ~${expected}±${tol}, bulunan ${actual}`}`);
}

console.log('== Hesaplama birim testleri ==\n');

// --- 1. Levenshtein uzaklığı ---------------------------------------------
console.log('[1] Levenshtein uzaklığı');
eq('aynı diziler', T.editDistance([...'abc'], [...'abc']), 0);
eq('bir yerine koyma', T.editDistance([...'abc'], [...'abd']), 1);
eq('bir silme', T.editDistance([...'abc'], [...'ab']), 1);
eq('bir ekleme', T.editDistance([...'ab'], [...'abc']), 1);
eq('boş -> boş', T.editDistance([], []), 0);
eq('boş -> üç', T.editDistance([], [...'abc']), 3);

// --- 2. WER ---------------------------------------------------------------
console.log('\n[2] WER (kelime hata oranı)');
eq('aynı metin', T.computeWer('Merhaba dünya', 'Merhaba dünya').ratio, 0);
eq('1 kelime yerine koyma (2 kelime)', T.computeWer('Merhaba dünya', 'Merhaba evren').ratio, 0.5);
near('1 kelime silme (3 kelime)', T.computeWer('bir iki üç', 'bir iki').ratio, 1 / 3, 1e-9);
eq('1 kelime ekleme (2 kelime)', T.computeWer('bir iki', 'bir iki üç').ratio, 0.5);
eq('tamamen farklı', T.computeWer('bir iki', 'üç dört').ratio, 1);
eq('noktalama/büyük harf yok sayılır', T.computeWer('Merhaba, dünya!', 'merhaba dünya').ratio, 0);
eq('Türkçe özel karakter', T.computeWer('Şişli Çağrı', 'şişli çağrı').ratio, 0);
eq('referans kelime sayısı', T.computeWer('bir iki üç', 'bir').refCount, 3);
eq('hata sayısı', T.computeWer('bir iki üç', 'bir').errors, 2);

// --- 3. FFT ---------------------------------------------------------------
console.log('\n[3] FFT (bilinen sinüsler)');
function peakHz(freq, N = 1024, sr = 16000) {
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = Math.sin(2 * Math.PI * freq * i / sr);
  const mag = T.fftMagnitude(re, im);
  let bi = 0, bv = 0;
  for (let i = 1; i < N / 2; i++) if (mag[i] > bv) { bv = mag[i]; bi = i; }
  return bi * sr / N;
}
near('1000 Hz sinüs', peakHz(1000), 1000, 20);
near('3000 Hz sinüs', peakHz(3000), 3000, 20);
// Gerçek DC: sabit (tüm örnekler aynı) sinyal. FFT tepe noktası 0 Hz'de olmalı.
{
  const N = 1024, re = new Float32Array(N).fill(1), im = new Float32Array(N);
  const mag = T.fftMagnitude(re, im);
  let bi = 0, bv = 0;
  for (let i = 0; i < N / 2; i++) if (mag[i] > bv) { bv = mag[i]; bi = i; }
  eq('sabit sinyal (DC) -> 0 Hz', bi, 0);
}

// --- 4. Perde (temel frekans) --------------------------------------------
console.log('\n[4] Perde ölçümü (otokorelasyon)');
function sine(f, n, sr = 22050) { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.sin(2 * Math.PI * f * i / sr); return a; }
near('120 Hz', T.detectPitchHz(sine(120, 22050 * 0.4), 22050), 120, 6);
near('220 Hz', T.detectPitchHz(sine(220, 22050 * 0.4), 22050), 220, 10);
eq('gürültü -> sonuç yok', T.detectPitchHz(Float32Array.from({ length: 22050 * 0.4 }, () => Math.random() * 2 - 1), 22050), null);

// --- 5. Türkçe yönelme eki ------------------------------------------------
console.log('\n[5] Türkçe yönelme eki');
eq('Mahkemesi -> NE', T.trDative('Antalya 4. Asliye Hukuk Mahkemesi'), "NE");
eq('Başsavcılığı -> NA', T.trDative('Ankara Cumhuriyet Başsavcılığı'), "NA");
eq('Müdürlüğü -> NE', T.trDative('İzmir 5. İcra Müdürlüğü'), "NE");
eq('boş -> NE', T.trDative(''), "NE");

// --- 6. Zaman kodu --------------------------------------------------------
console.log('\n[6] Zaman kodu dönüşümü');
eq('0 sn', T.timecode(0), '00:00:00.000');
eq('65 sn', T.timecode(65), '00:01:05.000');
eq('3661 sn', T.timecode(3661), '01:01:01.000');
eq('timecode -> sn', T.secondsFromTimecode('00:01:05'), 65);
eq('bozuk giriş -> 0', T.secondsFromTimecode('abc'), 0);
// Milisaniye hassasiyeti: 0,1 sn'lik sınır kaydırma ve "buradan böl" bu
// dönüşüme dayanır; saniyeye yuvarlanırsa alt saniye kaybolur.
eq('0,1 sn korunur', T.timecode(5.1), '00:00:05.100');
eq('0,5 sn korunur', T.timecode(5.5), '00:00:05.500');
eq('ms -> sn', T.secondsFromTimecode('00:00:05.500'), 5.5);
near('0,1 sn gidiş-dönüş', T.secondsFromTimecode(T.timecode(5.1)), 5.1, 1e-9);
{
  let cur = T.secondsFromTimecode('00:00:05');
  for (let i = 0; i < 5; i++) cur = T.secondsFromTimecode(T.timecode(cur + 0.1));
  near('5 x +0,1 sn birikimi', cur, 5.5, 1e-9);
}
eq('tam saniye de ms gösterir', T.timecode(5), '00:00:05.000');

// --- 7. Dolgu tespiti -----------------------------------------------------
console.log('\n[7] Dolgu/halüsinasyon tespiti');
eq('boş metin', T.isHallucination(''), true);
eq('(Konuşma)', T.isHallucination('(Konuşma)'), true);
eq('(Müzik - Jenerik)', T.isHallucination('(Müzik - Jenerik)'), true);
eq('gerçek cümle', T.isHallucination('Merhaba, depozito hakkında konuşmak istiyorum.'), false);

// --- 7b. Paragraf oluşturma -----------------------------------------------
// Ardışık aynı konuşmacı bölümleri tek paragrafta birleşmeli; konuşmacı
// değişince yeni paragraf başlamalı. Zaman aralığı ilk baştan son bite
// genişlemeli ve onaylanmamış içerik paragraf onaylı sayılmamalı.
console.log('\n[7b] Paragraf oluşturma');
{
  const m = { segments: [
    { start: '00:00:00', end: '00:00:05', speaker: 'A', text: 'bir', review: 'onaylandi' },
    { start: '00:00:05', end: '00:00:09', speaker: 'A', text: 'iki', review: 'onaylandi' },
    { start: '00:00:09', end: '00:00:14', speaker: 'B', text: 'üç', review: 'bekliyor' },
  ] };
  T.paragraphize(m);
  eq('iki paragrafa indi', m.segments.length, 2);
  eq('aynı konuşmacı birleşti', m.segments[0].text, 'bir iki');
  eq('aralık genişledi', [m.segments[0].start, m.segments[0].end], ['00:00:00', '00:00:09']);
  eq('konuşmacı değişince yeni paragraf', m.segments[1].speaker, 'B');
  eq('onaylı içerik onaylı kalır', T.isReviewed(m.segments[0]), true);
  eq('onaysız içerik onaysız kalır', T.isReviewed(m.segments[1]), false);
}
{
  const m = { segments: [{ start: '00:00:00', end: '00:00:05', speaker: 'A', text: 'tek', review: 'onaylandi' }] };
  T.paragraphize(m);
  eq('tek bölüm değişmez', m.segments.length, 1);
}

// --- 7c. Sessizlik ölçümü -------------------------------------------------
// Sessizlik ölçümü deterministiktir: verilen sinyalin RMS dağılımına göre
// sessiz oranı hesaplanır. Uydurma bir "konuşma olasılığı" üretilmez.
console.log('\n[7c] Sessizlik ölçümü');
{
  const sr = 16000;
  // 3 sn: ilk 1.5 sn sessiz (küçük gürültü), son 1.5 sn konuşma (büyük genlik).
  const n = sr * 3; const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    s[i] = t < 1.5 ? 0.001 * Math.sin(i) : 0.3 * Math.sin(2 * Math.PI * 220 * t);
  }
  const st = T.analyzeSilence(s, sr, 0, 3);
  eq('ölçüm geçerli', st.ok, true);
  eq('süre ~3 sn', Math.round(st.durationSec), 3);
  // Sessiz oran yaklaşık yarı olmalı (±0.2 tolerans).
  near('sessiz oran ~0.5', st.ratio, 0.5, 0.2);
  // Tümü sessiz sinyalde oran ~1.
  const quiet = new Float32Array(n).fill(0.0005);
  near('tam sessiz ~1', T.analyzeSilence(quiet, sr, 0, 3).ratio, 1, 0.02);
  // Tümü konuşma sinyalinde oran ~0.
  const loud = new Float32Array(n);
  for (let i = 0; i < n; i++) loud[i] = 0.4 * Math.sin(2 * Math.PI * 200 * i / sr);
  near('tam konuşma ~0', T.analyzeSilence(loud, sr, 0, 3).ratio, 0, 0.02);
  // Boş aralık -> ok:false.
  eq('boş aralık', T.analyzeSilence(s, sr, 3, 3).ok, false);
  // İşaret yalnızca metin boş/dolgu iken ve yeterince sessizse üretilir.
  const stats = T.analyzeSilence(quiet, sr, 0, 3);
  eq('boş metin + sessiz -> işaret', !!T.segmentSilenceFlag(stats, '', T.isHallucination), true);
  eq('anlamlı metin + sessiz -> işaret yok', T.segmentSilenceFlag(stats, 'merhaba dünya', T.isHallucination), null);
}

// --- 7c-2. Seviye ölçümü ---------------------------------------------------
// Tepe/RMS, tepe kırpılma, gürültü tabanı ve SNR ölçümü bilinen sinyallerle
// sınanır. Bu değerler rapora "Seviye ölçümü" tablosu olarak girdiği için
// yanlış hesaplanmaları doğrudan raporu bozar.
console.log('\n[7c-2] Seviye ölçümü');
{
  const sr = 16000;
  // 1 sn, 0.5 genlikli sinüs: tepe 0.5 -> -6.02 dBFS, RMS 0.3536 -> -9.03 dBFS.
  const n = sr;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / sr);
  const lv = T.analyzeLevels(s, sr);
  eq('ölçüm geçerli', lv.ok, true);
  near('tepe 0,5', lv.peak, 0.5, 0.01);
  near('tepe dBFS ~ -6,0', lv.peakDb, -6.02, 0.15);
  near('RMS ~ 0,354', lv.rms, 0.3536, 0.01);
  near('RMS dBFS ~ -9,0', lv.rmsDb, -9.03, 0.15);
  eq('kırpılma yok', lv.clippedSamples, 0);
  eq('kırpılma oranı 0', lv.clippedRatio, 0);

  // Tam ölçekli kare dalga: örneklerin yarısı kırpılmış sayılmalı.
  const clip = new Float32Array(n);
  for (let i = 0; i < n; i++) clip[i] = i < n / 2 ? 1 : -1;
  const lv2 = T.analyzeLevels(clip, sr);
  eq('kırpılma sayıldı', lv2.clippedSamples > n * 0.4, true);
  eq('kırpılma oranı > %40', lv2.clippedRatio > 0.4, true);
  near('tam ölçek tepe 0 dBFS', lv2.peakDb, 0, 0.01);

  // Tek tükürük örneği kırpılma sayılmamalı (en az 3 ardışık örnek kuralı).
  const spike = new Float32Array(sr).fill(0.1);
  spike[100] = 1;
  eq('tek örnek kırpılma sayılmaz', T.analyzeLevels(spike, sr).clippedSamples, 0);

  // Gürültü tabanı ve SNR: sessiz zemin + yüksek düzey karışımı.
  const mix = new Float32Array(sr * 2);
  for (let i = 0; i < mix.length; i++) {
    const t = i / sr;
    mix[i] = t < 1 ? 0.002 * Math.sin((2 * Math.PI * 100 * i) / sr) : 0.5 * Math.sin((2 * Math.PI * 300 * i) / sr);
  }
  const lv3 = T.analyzeLevels(mix, sr);
  eq('SNR ölçüldü', Number.isFinite(lv3.snrDb), true);
  eq('SNR pozitif', lv3.snrDb > 10, true);
  eq('gürültü tabanı konuşmadan düşük', lv3.noiseFloor < lv3.speechLevel, true);

  // Boş kayıt ölçülemez.
  eq('boş kayıt', T.analyzeLevels(new Float32Array(0), sr).ok, false);

  // Sayısal sessizlik: gürültü tabanı tam 0 -> SNR sonsuz, "ölçülemedi" değil.
  const gated = new Float32Array(sr);
  for (let i = 0; i < sr / 2; i++) gated[i] = 0; // ilk yarı tam sessiz
  for (let i = sr / 2; i < sr; i++) gated[i] = 0.4 * Math.sin((2 * Math.PI * 200 * i) / sr);
  const lvG = T.analyzeLevels(gated, sr);
  eq('sayısal sessizlikte SNR sonsuz', lvG.snrDb, Infinity);
  eq('sonsuz SNR metni', T.snrText(Infinity), 'sonsuz (sayısal sessizlik)');
  eq('ölçülemeyen SNR metni', T.snrText(null), 'ölçülemedi');
  eq('normal SNR metni', T.snrText(42.06), '42,1 dB');
  // Negatif sıfır yazılmaz: 0'a yuvarlanan değer "0,0" olur.
  eq('negatif sıfır gösterilmez', T.fmtDb(-0.04), '0,0');
  eq('küçük negatif korunur', T.fmtDb(-0.6), '-0,6');
  // Gürültü tabanı tam sıfır -> sayısal sessizlik, "ölçülemedi" değil.
  eq('sıfır gürültü tabanı', T.floorText(0), 'sessizlik (0)');
  eq('normal gürültü tabanı', T.floorText(0.0005), '-66,0 dBFS');
  eq('ölçülemeyen gürültü tabanı', T.floorText(NaN), 'ölçülemedi');
}

// --- 7c-3. Stereo ve bant genişliği --------------------------------------
console.log('\n[7c-3] Stereo ve bant genişliği');
{
  const sr = 16000;
  const n = sr;
  // Aynı sinyal iki kanalda: korelasyon +1, denge 0 dB.
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { a[i] = 0.4 * Math.sin((2 * Math.PI * 200 * i) / sr); b[i] = a[i]; }
  const st = T.analyzeStereo(a, b, sr);
  eq('stereo ölçüm geçerli', st.ok, true);
  near('korelasyon +1', st.correlation, 1, 0.01);
  near('denge 0 dB', st.balanceDb, 0, 0.05);
  near('DC ~0', st.dcOffsetL, 0, 0.01);

  // Ters işaretli kanal: korelasyon -1.
  const c2 = new Float32Array(n);
  for (let i = 0; i < n; i++) c2[i] = -a[i];
  near('ters faz korelasyon -1', T.analyzeStereo(a, c2, sr).correlation, -1, 0.01);

  // Sağ kanal yarı genlikte: denge ~ +6 dB (sol daha yüksek).
  const half = new Float32Array(n);
  for (let i = 0; i < n; i++) half[i] = 0.2 * Math.sin((2 * Math.PI * 200 * i) / sr);
  near('yarı genlik denge ~6 dB', T.analyzeStereo(a, half, sr).balanceDb, 6.02, 0.3);

  // DC kayması doğru okunur.
  const dc = new Float32Array(n).fill(0.05);
  near('DC kayması 0,05', T.analyzeStereo(dc, dc, sr).dcOffsetL, 0.05, 1e-6);

  eq('boş stereo', T.analyzeStereo(new Float32Array(0), new Float32Array(0), sr).ok, false);

  // Bant genişliği: 300 Hz sinüs -> rolloff 300 Hz civarında olmalı.
  const tone = new Float32Array(n);
  for (let i = 0; i < n; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / sr);
  const ro = T.spectralRolloff(tone, sr);
  eq('rolloff ölçüldü', !!ro, true);
  eq('rolloff 300 Hz civarı', Math.abs(ro.rolloffHz - 300) < 120, true);
  eq('Nyquist 8000', ro.nyquistHz, 8000);
  // Çok kısa sinyal ölçülemez.
  eq('kısa sinyal -> null', T.spectralRolloff(new Float32Array(100), sr), null);
}

// --- 7d. Terim yazım tutarlılığı ------------------------------------------
// Aynı terimin küçük yazım farkıyla geçtiği durumlar bulunmalı; farklı
// terimler birbirine karıştırılmamalı. Uydurma yoktur; yalnızca metinde geçen
// sözcükler karşılaştırılır.
console.log('\n[7d] Terim yazım tutarlılığı');
{
  // "depozito" ve "depozit" gerçekten farklı yazımlar.
  const issues = T.findTermInconsistencies([
    'depozito ödemesi yapıldı', 'depozit iade edilecek', 'depozito tutarı',
  ]);
  eq('tutarsızlık bulundu', issues.length, 1);
  eq('en sık biçim esas', issues[0].canonical, 'depozito');
  eq('iki yazım listelendi', issues[0].forms.length, 2);
  // Tek yazım varsa küme oluşmaz.
  eq('tek yazım -> sonuç yok', T.findTermInconsistencies(['depozito depozito depozito']).length, 0);
  // İşlev sözcükleri elenir.
  eq('stopword elenir', T.contentWords('bir bu ve ile depozito').includes('depozito'), true);
  eq('stopword listede yok', T.contentWords('bir bu ve ile').length, 0);
  // Yazım düzeltme yalnızca tam sözcük sınırında çalışır.
  const m = { segments: [ { text: 'depozit iade', history: [] }, { text: 'depozitin bir kısmı', history: [] } ] };
  const changed = T.applyTermForm(m, 'depozit', 'depozito');
  eq('tek tam sözcük değişti', changed, 1);
  eq('metin güncellendi', m.segments[0].text, 'depozito iade');
  // "depozitin" içindeki "depozit" sözcük sınırıyla eşleşmemeli.
  eq('sözcük sınırı korunur', m.segments[1].text, 'depozitin bir kısmı');
}

// --- 7e. Tekrar/dolgu tespiti ---------------------------------------------
// Whisper bazen aynı ifadeyi arka arkaya tekrarlar; bu gerçek konuşma değil
// model artefaktı olabilir. Yalnızca metindeki gerçek tekrar ölçülür.
console.log('\n[7e] Tekrar/dolgu tespiti');
{
  // Ardışık aynı cümle (3 kez) -> tekrar.
  const r1 = T.detectRepetition('Evet. Evet. Evet.');
  eq('ardışık tekrar bulundu', !!r1, true);
  eq('ardışık sayı', r1.maxRun, 3);
  // Normal cümle -> tekrar yok.
  eq('normal metin -> tekrar yok', T.detectRepetition('Merhaba, depozito hakkında konuşmak istiyorum.'), null);
  // Aynı ifade bölüm boyunca çok kez.
  const r2 = T.detectRepetition('Teşekkürler. Teşekkürler. Teşekkürler. Teşekkürler.');
  eq('aşırı yinelenen ifade', !!r2, true);
  // Çok kısa metin değerlendirilmez.
  eq('kısa metin atlanır', T.detectRepetition('Evet.'), null);
  // Bölüm işareti yalnızca gerçek tekrarda.
  eq('bölüm işareti', !!T.segmentRepetitionFlag({ text: 'Evet. Evet. Evet. Evet.' }), true);
  eq('bölüm işareti yok', T.segmentRepetitionFlag({ text: 'Tek bir normal cümle yazılmış.' }), null);
}

// --- 7f. Yedekleme / geri yükleme -----------------------------------------
// Çalışma paketi (yedek) biçimi sabittir; doğrulama ve ses eşleme saf
// fonksiyonlarla test edilir. Böylece dışa/içe aktarma akışı regresyona karşı
// korunur.
console.log('\n[7f] Yedekleme / geri yükleme');
{
  const c = { id: 'c1', fileNo: '2026/214 E.', materials: [] };
  const pack = T.buildProjectPack(c);
  eq('şema sabit', pack.schema, 'mihenk.project.v1');
  eq('dosya taşınır', pack.case, c);
  eq('geçerli paket', T.validateProjectPack(pack), null);
  eq('yanlış şema reddedilir', T.validateProjectPack({ schema: 'x', case: {} }) !== null, true);
  eq('dosya yoksa reddedilir', T.validateProjectPack({ schema: 'mihenk.project.v1' }) !== null, true);
  eq('boş paket reddedilir', T.validateProjectPack(null) !== null, true);
  // Ses girdisi eşleme: `${m.id}_...` biçimi; klasör girdileri atlanır.
  const names = ['case.json', 'audio/', 'audio/m1_a.wav', 'audio/m2_b.wav'];
  const mats = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
  const matched = T.matchAudioEntries(names, mats);
  eq('iki ses eşlendi', matched.length, 2);
  eq('ilk eşleme', matched[0], { materialId: 'm1', entry: 'audio/m1_a.wav' });
  eq('eşleşmeyen materyal atlanır', matched.some((x) => x.materialId === 'm3'), false);
}

// --- 7g. Model yöneticisi -------------------------------------------------
// Bütünlük kontrolü saf fonksiyonla test edilir; kütüphane sağlama toplamı
// yayımlamadığı için yapısal denetim yapılır (gerekli dosyalar + boş olmama).
console.log('\n[7g] Model yöneticisi');
{
  const base = 'https://huggingface.co/onnx-community/whisper-small/resolve/main/';
  const full = [
    base + 'config.json',
    base + 'preprocessor_config.json',
    base + 'tokenizer.json',
    base + 'tokenizer_config.json',
    base + 'onnx/encoder_model.onnx',
    base + 'onnx/decoder_model_merged.onnx'
  ];
  eq('eksiksiz model geçer', T.evaluateModelIntegrity(full, 0).ok, true);
  eq('eksik dosya kalır', T.evaluateModelIntegrity(full.slice(0, 4), 0).ok, false);
  eq('boş dosya kalır', T.evaluateModelIntegrity(full, 1).ok, false);
  // Model kimliği URL'den çıkarılır.
  eq('model kimliği', T.modelIdFromUrl(full[0]), 'onnx-community/whisper-small');
  eq('model dışı URL', T.modelIdFromUrl('https://example.com/x.json'), null);
  // Donanım önerisi.
  eq('WebGPU -> orta model', T.recommendModel('webgpu').id, 'onnx-community/whisper-medium-ONNX');
  eq('CPU -> küçük model', T.recommendModel('wasm').id, 'onnx-community/whisper-small');
  // Duyarlılık (dtype): kalite öncelikli. WebGPU fp16, bellek yetmezse q4.
  // WASM fp32. Bileşen-bazlı nesne KULLANILMAZ (fp32 decoder bellek taşırır).
  const wasmC = T.dtypeCandidates('wasm');
  const gpuC = T.dtypeCandidates('webgpu');
  eq('WASM tek aday fp32', wasmC, ['fp32']);
  // WebGPU: fp16 onerilir, bellek yetmezse q4'e duser (asla fp32'ye yukselmez).
  eq('WebGPU ilk aday fp16', gpuC[0], 'fp16');
  eq('WebGPU yedek aday q4 (daha kucuk)', gpuC[1], 'q4');
  eq('dtype etiketi metin', T.dtypeLabel('fp16'), 'fp16');
  // Kısa model adları.
  eq('kısa ad (küçük)', T.modelShortName('onnx-community/whisper-small'), 'Küçük model');
  eq('kısa ad (orta)', T.modelShortName('onnx-community/whisper-medium-ONNX'), 'Orta model');
  eq('bilinmeyen ad', T.modelShortName('a/b'), 'b');
  eq('boş ad', T.modelShortName(null), '—');
}

// --- 7h. Deşifre motoru ---------------------------------------------------
// Pencere bölme ve model çıktısı ayrıştırma saf fonksiyonlarla test edilir;
// uzun kayıt yönetimi ve zaman ofseti buna dayanır.
console.log('\n[7h] Deşifre motoru');
{
  // 75 sn'lik kayıt, 30 sn pencere -> 3 pencere (30+30+15).
  const wins = T.asrWindows(75 * 16000, 16000, 30);
  eq('pencere sayısı', wins.length, 3);
  eq('ilk pencere', [wins[0].offset, wins[0].end, wins[0].seconds], [0, 30 * 16000, 30]);
  eq('son pencere taşmaz', [wins[2].startSeconds, wins[2].seconds], [60, 15]);
  eq('boş kayıt -> pencere yok', T.asrWindows(0).length, 0);
  // Model çıktısı ayrıştırma: zaman ofseti uygulanır.
  const res = { chunks: [{ text: ' merhaba', timestamp: [1, 3] }] };
  const segs = T.parseAsrResult(res, 60, 30);
  eq('ofset uygulandı', [segs[0].start, segs[0].end], ['00:01:01.000', '00:01:03.000']);
  eq('metin kırpıldı', segs[0].text, 'merhaba');
  // Kelime zamanları korunur (karaoke).
  const res2 = { chunks: [{ text: 'a b', timestamp: [0, 2], words: [{ word: 'a', start: 0, end: 1 }, { word: 'b', start: 1, end: 2 }] }] };
  const segs2 = T.parseAsrResult(res2, 0, 30);
  eq('kelime zamanları', segs2[0].words.length, 2);
  eq('kelime başlangıcı', segs2[0].words[1].s, '00:00:01.000');
  // Chunk yoksa metin fallback pencere süresini kullanır.
  const segs3 = T.parseAsrResult({ text: 'tek metin' }, 10, 5);
  eq('fallback aralığı', [segs3[0].start, segs3[0].end], ['00:00:10.000', '00:00:15.000']);
  // Boş çıktı -> bölüm yok.
  eq('boş çıktı', T.parseAsrResult({ chunks: [] }, 0, 30).length, 0);
  // Dil uyarısı: İngilizce işaretçiler + Türkçe karakter yok.
  eq('İngilizce görünüm', T.looksNonTurkish('the and you are here'), true);
  eq('Türkçe metin', T.looksNonTurkish('merhaba, depozito iade edilecek'), false);
  eq('Türkçe karakter varsa uyarı yok', T.looksNonTurkish('the çay'), false);
  // Dosya adı güvenliği.
  eq('güvenli ad', T.safeName('2026/214 E.'), '2026_214_E');
  eq('boş ad yedeği', T.safeName(''), 'AKIS_Raporu');
}

// --- 7i. Çöp çıktı tespiti (timestamp token sızıntısı) --------------------
// Whisper ONNX modelleri bazen timestamp/özel token'ları metne dökerek
// "- - - -" veya "< - < - < < <" gibi çöp üretir. Bu ASLA deşifre sayılmamalı.
console.log('\n[7i] Çöp çıktı tespiti');
{
  // Gerçek hatadan alınan desenler.
  const dashLine = '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -';
  const angleLine = '< - < - < - < - < - < - < < < < < < < < < < < < < < < < < < < < < < < < < < < < < <';
  eq('çizgi yığını çöp', T.looksLikeGarbage(dashLine), true);
  eq('açı yığını çöp', T.looksLikeGarbage(angleLine), true);
  eq('tırnak yığını çöp', T.looksLikeGarbage('" - " - " " " " " " " " " " " " " " " " " "'), true);
  // Gerçek Türkçe metin çöp değildir.
  eq('gerçek cümle temiz', T.looksLikeGarbage('Merhaba, depozito iadesi hakkında konuşmak istiyorum.'), false);
  eq('kısa gerçek metin temiz', T.looksLikeGarbage('Evet, doğru.'), false);
  eq('boş metin çöp', T.looksLikeGarbage(''), true);
  // Aynı kelimenin aşırı tekrarı çöp sayılır.
  eq('kelime tekrarı çöp', T.looksLikeGarbage('tamam tamam tamam tamam tamam tamam tamam tamam'), true);
  // isHallucination çöpü de yakalar.
  eq('isHallucination çöpü yakalar', T.isHallucination(dashLine), true);
  // parseAsrResult çöp bölümleri atar; süre sıfırlanmaz.
  const res = { chunks: [
    { text: dashLine, timestamp: [0, 0] },
    { text: 'Gerçek bir konuşma cümlesi burada.', timestamp: [1, 5] }
  ] };
  const segs = T.parseAsrResult(res, 0, 30);
  eq('çöp bölüm atıldı', segs.length, 1);
  eq('kalan bölüm gerçek', segs[0].text, 'Gerçek bir konuşma cümlesi burada.');
  // Bitiş zamanı gelmezse süre sıfır olmamalı.
  const res2 = { chunks: [{ text: 'Bitiş zamanı olmayan bölüm.', timestamp: [2] }] };
  const segs2 = T.parseAsrResult(res2, 0, 30);
  eq('bitiş zamanı tamamlandı', segs2[0].end, '00:00:32.000');
}

// --- 8. Geçmiş sıkıştırma -------------------------------------------------
console.log('\n[8] Metin geçmişi sıkıştırma');
const mk = (arr) => arr.map((t, i) => ({ text: t, at: 't' + i }));
eq('tuş-tuş zincir tek sürüme iner', T.compactHistory(mk(['', 'M', 'Me', 'Mer', 'Merhaba'])).map((x) => x.text), ['']);
eq('iki gerçek sürüm korunur', T.compactHistory(mk(['Merhaba', 'Tamamen farklı'])).map((x) => x.text), ['Merhaba', 'Tamamen farklı']);
eq('tek kayıt değişmez', T.compactHistory(mk(['tek'])).length, 1);

// --- 9. Kontrol durumu ----------------------------------------------------
console.log('\n[9] Kontrol durumu');
// v3 kanonik kodlar: pending | approved | inaudible | relisten.
// v2 Türkçe anahtarları okuma sırasında çevrilir (göç güvencesi).
eq('eski "checked" -> approved', T.segReview({ checked: true }), 'approved');
eq('yeni kayıt -> pending', T.segReview({}), 'pending');
eq('approved denetlenmiş sayılır', T.isReviewed({ review: 'approved' }), true);
eq('inaudible denetlenmiş sayılır', T.isReviewed({ review: 'inaudible' }), true);
eq('relisten denetlenmiş SAYILMAZ', T.isReviewed({ review: 'relisten' }), false);
eq('pending denetlenmiş SAYILMAZ', T.isReviewed({ review: 'pending' }), false);
eq('v2 onaylandi -> approved', T.segReview({ review: 'onaylandi' }), 'approved');
eq('v2 anlasilmadi -> inaudible', T.segReview({ review: 'anlasilmadi' }), 'inaudible');
eq('v2 yeniden -> relisten', T.segReview({ review: 'yeniden' }), 'relisten');
eq('v2 bekliyor -> pending', T.segReview({ review: 'bekliyor' }), 'pending');
eq('bilinmeyen kod -> pending', T.segReview({ review: 'saçma' }), 'pending');

// --- 10. Mercie özel ifadeler --------------------------------------------
console.log('\n[10] Mercie özel ifadeler');
const cHukuk = { reportType: 'hukuk' }, cSav = { reportType: 'savcilik' }, cIcra = { reportType: 'icra' };
eq('hukuk soru kaynağı', T.questionsFallbackText(cHukuk).startsWith('Mahkemece'), true);
eq('savcılık soru kaynağı', T.questionsFallbackText(cSav).startsWith('Cumhuriyet Başsavcılığınca'), true);
eq('icra soru kaynağı', T.questionsFallbackText(cIcra).startsWith('İcra Müdürlüğünce'), true);
eq('savcılıkta "mahkemece" GEÇMEZ', /mahkemece/i.test(T.questionsFallbackText(cSav)), false);

// --- 11. Bölüm sınırı ve dinleme döngüsü ---------------------------------
// v2.78: kullanıcı "dinlerken bölme çizgileri bozuluyor" dedi. İki gerçek hata
// vardı: (a) nudge karşı sınırı sessizce sürüklüyordu, (b) dalgaya dinlemek
// için tıklamak en yakın sınırı taşıyordu. Bu testler hatanın geri dönmesini
// engeller.
console.log('\n[11] Bölüm sınırı ve dinleme döngüsü');
{
  const m = { duration: 60, segments: [{ start: '00:00:10.000', end: '00:00:20.000', text: 'a' }] };
  // Başlangıcı bitişe doğru sonuna kadar it: karşı sınır DEĞİŞMEMELİ.
  T.nudgeBoundary(m, 0, 'start', 100);
  eq('başlangıç itilince bitiş DEĞİŞMEZ', m.segments[0].end, '00:00:20.000');
  eq('başlangıç bitişe 0,1 sn kalana kadar gelir', m.segments[0].start, '00:00:19.900');
  eq('bölüm sıfır uzunlukta kalmaz', T.secondsFromTimecode(m.segments[0].end) > T.secondsFromTimecode(m.segments[0].start), true);

  const m2 = { duration: 60, segments: [{ start: '00:00:10.000', end: '00:00:20.000', text: 'a' }] };
  T.nudgeBoundary(m2, 0, 'end', -100);
  eq('bitiş geri çekilince başlangıç DEĞİŞMEZ', m2.segments[0].start, '00:00:10.000');
  eq('bitiş başlangıca 0,1 sn kalana kadar gelir', m2.segments[0].end, '00:00:10.100');

  // Döngü: bölüm sınırlarına dokunmaz, oturumluk alanda yaşar.
  const m3 = { duration: 60, segments: [{ start: '00:00:10.000', end: '00:00:20.000', text: 'a' }] };
  eq('başlangıçta döngü yok', T.loopRange(m3), null);
  T.setLoopPoint(m3, 'a', 12);
  T.setLoopPoint(m3, 'b', 15);
  eq('A–B kuruldu', !!T.loopRange(m3), true);
  eq('döngü bölüm sınırını değiştirmez (başlangıç)', m3.segments[0].start, '00:00:10.000');
  eq('döngü bölüm sınırını değiştirmez (bitiş)', m3.segments[0].end, '00:00:20.000');
  eq('döngü etiketi A ve B gösterir', T.loopLabel(m3), 'A 00:00:12.000 → B 00:00:15.000');
  // Ters sıra: B, A'nın gerisine ayarlanırsa geçersiz aralık kabul edilmez.
  T.setLoopPoint(m3, 'b', 11);
  eq('B, A gerisindeyse aralık geçersiz', T.loopRange(m3), null);
}

// --- 12. Hızlı onaya uygunluk ölçütü --------------------------------------
// v2.80: kullanıcı "otomatik onaylanabilecek, doğruluğu yüksek olanları
// işaretleyelim" dedi. Uydurma bir doğruluk yüzdesi ÜRETİLMEZ; yalnız
// gözlemlenebilir işaretlere bakılır ve gerekçe metinle gösterilir.
console.log('\n[12] Hızlı onaya uygunluk');
{
  const good = { start: '00:00:01.000', end: '00:00:04.000', text: 'Merhaba, depozito iadesi hakkında konuşmak istiyorum.' };
  eq('normal bölüm uygun', T.segQuickCheck(good).ok, true);
  eq('uygun bölümde gerekçe yok', T.segQuickCheck(good).reasons.length, 0);

  const empty = { start: '00:00:01.000', end: '00:00:04.000', text: '' };
  eq('metinsiz bölüm uygun DEĞİL', T.segQuickCheck(empty).ok, false);
  eq('gerekçe: anlamlı metin yok', T.segQuickCheck(empty).reasons.includes('anlamlı metin yok'), true);

  const dash = { start: '00:00:01.000', end: '00:00:04.000', text: '- - - - - - - - - - - - - - - - -' };
  eq('dolgu metin uygun DEĞİL', T.segQuickCheck(dash).ok, false);

  const short = { start: '00:00:01.000', end: '00:00:01.500', text: 'Evet.' };
  eq('çok kısa bölüm uygun DEĞİL', T.segQuickCheck(short).ok, false);
  eq('gerekçe: çok kısa bölüm', T.segQuickCheck(short).reasons.includes('çok kısa bölüm'), true);

  const zero = { start: '00:00:05.000', end: '00:00:05.000', text: 'Evet, doğru.' };
  eq('süre sıfır uygun DEĞİL', T.segQuickCheck(zero).ok, false);

  // Tekrar ölçütü CÜMLE düzeyinde çalışır (detectRepetition). Bu yüzden test
  // gerçek model tekrarını taklit eder: aynı cümle arka arkaya.
  const rep = { start: '00:00:01.000', end: '00:00:12.000', text: 'Evet doğru. Evet doğru. Evet doğru. Evet doğru.' };
  eq('model tekrarı uygun DEĞİL', T.segQuickCheck(rep).ok, false);
  eq('gerekçe: model tekrarı', T.segQuickCheck(rep).reasons.includes('model tekrarı'), true);

  const overlapObs = { start: '00:00:01.000', end: '00:00:04.000', text: 'Normal bir cümle.', obs: { overlap: true } };
  eq('üst üste işaretli bölüm uygun DEĞİL', T.segQuickCheck(overlapObs).ok, false);

  const prev = { start: '00:00:00.000', end: '00:00:05.000', text: 'önceki' };
  const clash = { start: '00:00:03.000', end: '00:00:08.000', text: 'Normal bir cümle.' };
  eq('öncekiyle çakışan bölüm uygun DEĞİL', T.segQuickCheck(clash, prev).ok, false);

  // Filtre ve sayaç aynı ölçütü kullanmalı (arayüz ile liste ayrışmasın).
  const m = {
    segments: [
      { start: '00:00:00.000', end: '00:00:03.000', text: 'Birinci normal cümle burada.', review: 'pending' },
      { start: '00:00:03.000', end: '00:00:03.400', text: 'Kısa.', review: 'pending' },
      { start: '00:00:04.000', end: '00:00:08.000', text: 'Onaylanmış cümle.', review: 'approved' }
    ]
  };
  const counts = T.segCounts(m);
  eq('sayaç: yalnız uygun ve bekleyen sayılır', counts.quick, 1);
  eq('sayaç: onaylanmış hızlı sayılmaz', counts.approved, 1);
  eq('filtre uygun bölümü seçer', T.segMatchesFilter(m.segments[0], 'quick'), true);
  eq('filtre kısa bölümü seçmez', T.segMatchesFilter(m.segments[1], 'quick'), false);
  eq('filtre onaylanmış bölümü seçmez', T.segMatchesFilter(m.segments[2], 'quick'), false);
}

// --- 13. Çözümleme profilleri ---------------------------------------------
// v2.81: kullanıcı "şive, kıcırtı, malzeme sesi" gibi farklı çözümlemeler
// istedi. Bunlar ayrı model ister; uydurulmaz. Profil yalnız dil ipucu ve
// bağlam istemini değiştirir. Bu test, profilin SINIRINI de doğrular:
// dil her zaman Türkçe kalır ve görev transkripsiyondur.
console.log('\n[13] Çözümleme profilleri');
{
  eq('profil listesi dolu', T.ASR_PROFILES.length >= 2, true);
  eq('bilinmeyen profil standarda düşer', T.asrProfile('yok').id, 'standard');
  eq('standart profilde bağlam istemi yok', T.asrProfileOptions('standard')[0].prompt, undefined);

  for (const p of T.ASR_PROFILES) {
    const opts = T.asrProfileOptions(p.id);
    eq(`profil ${p.id}: dil Türkçe kalır`, opts.every((o) => o.language === 'turkish'), true);
    eq(`profil ${p.id}: görev transkripsiyon`, opts.every((o) => o.task === 'transcribe'), true);
    eq(`profil ${p.id}: geri düşüş merdiveni var`, opts.length, 3);
  }

  // Şive profili ipucu ekler ama dil kilidini bozmaz.
  const dia = T.asrProfileOptions('dialect');
  eq('şive profili bağlam istemi taşır', typeof dia[0].prompt === 'string' && dia[0].prompt.length > 0, true);
  eq('şive profili hâlâ Türkçe', dia[0].language, 'turkish');
  // İlk deneme zaman damgası ve tekrar ayarı taşır.
  eq('ilk deneme zaman damgası ister', dia[0].return_timestamps, true);
  eq('ilk deneme tekrar cezası taşır', dia[0].repetition_penalty > 1, true);
}


// --- 14. Rapor zaman aralığı biçimi ---------------------------------------
// v2.81: elle eklenen bölüm "00:00:00" (ms'siz) yazıldığı için raporda
// "00:00:00 – 00:00:05.000" gibi tutarsız satır çıkıyordu. Depo kuralı:
// zaman kodu HER ZAMAN milisaniye içerir.
console.log('\n[14] Rapor zaman aralığı biçimi');
{
  eq('her iki uç ms içerir', T.tcRange('00:00:00', '00:00:05.000'), '00:00:00.000 – 00:00:05.000');
  eq('zaten ms varsa korunur', T.tcRange('00:00:01.500', '00:00:03.250'), '00:00:01.500 – 00:00:03.250');
  eq('tek uç boşsa tire', T.tcRange('', '00:00:05.000'), '— – 00:00:05.000');
  eq('iki uç boşsa tek tire', T.tcRange('', ''), '—');
}


// --- 15. WER biçimi --------------------------------------------------------
// v2.81: "%94.0" okunaksızdı; Türkçe ondalık ayırıcı virgüldür.
console.log('\n[15] WER biçimi');
{
  eq('yüzde ve virgül', T.fmtWer(0.9403), '%94,0');
  eq('tam sıfır hata', T.fmtWer(0), '%0,0');
  eq('tam hata', T.fmtWer(1), '%100,0');
  eq('sayı değilse tire', T.fmtWer(NaN), '—');
  eq('nokta KULLANILMAZ', /\./.test(T.fmtWer(0.9403)), false);
}


// --- 16. Depolama gösterimi: dava verisi != model önbelleği ----------------
// v2.83: tek sayı göstermek "dava verim doldu" yanılgısı yaratıyordu; model
// indirmek (1,5 GB) dava verisini şişirmiş gibi görünüyordu.
console.log('\n[16] Depolama gösterimi');
{
  eq('KB biçimi', T.fmtBytesShort(5 * 1024), '5 KB');
  eq('MB biçimi', T.fmtBytesShort(17 * 1024 * 1024), '17.0 MB');
  eq('GB biçimi', T.fmtBytesShort(10 * 1024 * 1024 * 1024), '10.00 GB');
  eq('sıfır', T.fmtBytesShort(0), '0 B');
  eq('negatif sıfır sayılır', T.fmtBytesShort(-5), '0 B');
}

// --- 17. Kayda yazılabilir kopya (v2.87 — KRİTİK VERİ KAYBI) --------------
// GERÇEK HATA (canlı veride yaşandı): Bölüme tıklandığında `attachSegWave()`
// malzeme nesnesine FONKSİYON yazıyordu (m.__segWaveRebind / __segWaveRedraw).
// `persistNow()` appState'i doğrudan IndexedDB'ye put ediyor; structuredClone
// fonksiyon kopyalayamadığı için işlem DataCloneError ile iptal ediliyordu.
// Sonuç: bilirkişi bölüme tıkladıktan sonra yaptığı TÜM iş kayboldu.
// Ekranda yalnız küçük "● Kayıt başarısız" yazısı vardı; uyarı şeridi
// görünmüyordu (kota hatası sayılmadığı için).
// Bu test, kayda giden kopyanın HER ZAMAN klonlanabilir olduğunu doğrular.
console.log('\n[17] Kayda yazılabilir kopya (DataCloneError koruması)');
{
  eq('sanitizeForStorage tanımlı', typeof T.sanitizeForStorage, 'function');

  if (typeof T.sanitizeForStorage === 'function') {
    // Gerçek hata senaryosu: oturumluk fonksiyonlar malzemede duruyor.
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    m.__segWaveRebind = () => {};
    m.__segWaveRedraw = () => {};
    m.__specData = { cols: 2, bins: 2, data: [1, 2, 3, 4] };
    m.__zoom = { a: 0, b: 1 };
    m.__sdZoom = { a: 0, b: 1 };
    const state = { cases: [{ id: 'c1', materials: [m] }] };

    const clean = T.sanitizeForStorage(state);
    const keys = Object.keys(clean.cases[0].materials[0]);
    eq('fonksiyon alanı kalmadı', keys.filter((k) => k.startsWith('__')), []);
    eq('spektrogram verisi kayda girmez', '__specData' in clean.cases[0].materials[0], false);
    eq('yakınlaştırma penceresi kayda girmez', '__zoom' in clean.cases[0].materials[0], false);

    // Kopya gerçekten klonlanabilmeli (IndexedDB'nin yaptığı işlem).
    let cloneError = null;
    try {
      structuredClone(clean);
    } catch (e) {
      cloneError = e.name;
    }
    eq('kopya klonlanabilir (DataCloneError yok)', cloneError, null);

    // Temizlik orijinali bozmamalı: ekran hâlâ fonksiyonları kullanıyor.
    eq('orijinal nesne değişmedi', typeof state.cases[0].materials[0].__segWaveRebind, 'function');
    // Dava verisi korunur (temizlik veri atmaz).
    eq('dosya verisi korundu', clean.cases[0].materials[0].fileName, 'a.wav');
  }
}

// --- 18. Kayıt hatası GÖRÜNÜR olmalı (v2.87) ------------------------------
// GERÇEK HATA: yazma herhangi bir nedenle başarısız olduğunda yalnız küçük
// durum yazısı değişiyordu. Bilirkişi uyarıyı görmedi ve işini kaybetti.
// Her yazma hatası büyük, kapatılamaz uyarı şeridi göstermelidir.
console.log('\n[18] Kayıt hatası görünürlüğü');
{
  eq('showSaveFailureBanner tanımlı', typeof T.showSaveFailureBanner, 'function');

  if (typeof T.showSaveFailureBanner === 'function') {
    // Durum yazısı ve şerit gerçekten kurulmalı.
    T.showSaveFailureBanner('DataCloneError');
    eq('durum yazısı kayıt başarısız', String(T.el('#saveState').textContent).includes('KAYDEDİLMİYOR'), true);
    eq('büyük uyarı şeridi göründü', T.el('#saveFailureBanner').hidden, false);
    // Türkçe büyük İ küçük i'ye JS `/i` bayrağıyla eşlenmez; tr-TR ile indir.
    const bannerText = String(T.el('#saveFailureBanner').innerHTML).toLocaleLowerCase('tr-TR');
    eq('uyarı metni ne olduğunu söyler', bannerText.includes('kaydedilmiyor'), true);
    eq('uyarı metni ne yapılacağını söyler', bannerText.includes('dışa aktar'), true);

    T.hideSaveFailureBanner();
    eq('şerit kapatılabilir', T.el('#saveFailureBanner').hidden, true);
  }
}

// --- 19. Sürüm notu: kullanıcı kritik düzeltmeden haberdar olmalı (v2.87) --
// GERÇEK DURUM: bilirkişi "kayıt başarısız uyarısını görmedim" dedi ve işini
// kaybetti. Bir hata sessizce düzeltilip geçilemez: kullanıcı ne değiştiğini
// uygulamayı açtığında görmelidir. Not her sürümde BİR KEZ gösterilir
// (akis.seenNotice.<sürüm>), her açılışta tekrarlamaz.
console.log('\n[19] Sürüm notu (kullanıcı haberdar edilir)');
{
  eq('VERSION_NOTICES tanımlı', typeof T.VERSION_NOTICES, 'object');
  // Not, SÜRÜMDEN BAĞIMSIZ sınanır: her sürümde yeni bir anahtar eklenir ve
  // testin elle güncellenmesi gerekmez. Güncel sürümün notu MUTLAKA olmalı.
  const ver = T.APP_VERSION;
  eq('güncel sürüm için not var', !!(T.VERSION_NOTICES && T.VERSION_NOTICES[ver]), true);
  eq('2.87 notu korunuyor', !!(T.VERSION_NOTICES && T.VERSION_NOTICES['2.87']), true);
  const note = (T.VERSION_NOTICES && T.VERSION_NOTICES[ver]) || {};
  eq('notun başlığı var', String(note.title || '').length > 10, true);
  eq('notun gövdesi var', String(note.body || '').length > 40, true);

  eq('maybeShowVersionNotice tanımlı', typeof T.maybeShowVersionNotice, 'function');
  if (typeof T.maybeShowVersionNotice === 'function') {
    // Uygulamanın kullandığı depolama (sandbox) üzerinden sına.
    const store = T.store;
    store.removeItem(`akis.seenNotice.${ver}`);
    const first = T.maybeShowVersionNotice();
    eq('ilk açılışta gösterilir', first, true);
    eq('görüldü olarak işaretlendi', store.getItem(`akis.seenNotice.${ver}`), '1');
    // İkinci açılış: tekrar gösterilmez.
    const second = T.maybeShowVersionNotice();
    eq('ikinci açılışta tekrarlamaz', second, false);
    // Gösterilen şerit gerçekten kullanıcıya hitap etmeli.
    const notice = T.el('#versionNotice');
    eq('şerit görünür', notice.hidden, false);
    const t = String(notice.innerHTML).toLocaleLowerCase('tr-TR');
    // Şerit metni güncel sürümün notunu taşımalı (sürüme özel metin değişebilir).
    eq('şerit güncel not başlığını taşır', t.includes(String(note.title).toLocaleLowerCase('tr-TR').slice(0, 20)), true);
  }
}

// --- 20. Onay metne BAĞLI olmalı (v2.88 — adli bütünlük) ----------------
// GERÇEK HATA: `setSegmentText()` yalnız metni yazıyor, kontrol durumuna
// dokunmuyordu. Onaylanmış bir bölümün metni TAMAMEN değiştirilse bile rozet
// "Onaylandı" kalıyordu (gerçek tarayıcıda ölçüldü: boş bölüm onayla →
// "st-approved", metni değiştir → hâlâ "st-approved", sayaç "Onaylandı 1").
// Bu, depo ilkesinin doğrudan ihlali: "Kontrol edilmeyen deşifre, kontrol
// edilmiş gibi gösterilmez." Onay daima metne bağlıdır.
console.log('\n[20] Onay metne bağlı (metin değişince onay düşer)');
{
  const mkCase = () => {
    const c = T.emptyCaseForTest({ id: 'c1' });
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    const s = T.emptySegmentForTest({
      id: 's1',
      start: '00:00:00.000',
      end: '00:00:05.000',
      text: 'onaylanmış metin',
      review: 'approved'
    });
    m.segments.push(s);
    c.materials.push(m);
    T.setAppState({ cases: [c], activeCaseId: 'c1' });
    return { c, m, s };
  };

  // 1) Doğrudan metin yazımı (tek darboğaz: setSegmentText) onayı düşürmeli.
  {
    const { s } = mkCase();
    const changed = T.setSegmentText(s, 'TAMAMEN FARKLI BİR METİN');
    eq('metin yazıldı', changed, true);
    eq('onay düştü', T.segReview(s), 'pending');
    eq('onaylı sayılmıyor', T.isReviewed(s), false);
    eq('rapor etiketi "Kontrol bekliyor"', T.reviewLabel(s), 'Kontrol bekliyor');
  }

  // 2) Gerçek düzenleme yolu (applyTextEdit) da aynı sonucu vermeli.
  {
    const { s } = mkCase();
    T.applyTextEdit(s, 'BAŞKA BİR METİN');
    eq('applyTextEdit sonrası onay düştü', T.segReview(s), 'pending');
  }

  // 3) Metin DEĞİŞMEDİYSE onay korunur (gereksiz düşürme yok).
  {
    const { s } = mkCase();
    const changed = T.setSegmentText(s, 'onaylanmış metin');
    eq('aynı metin değişiklik sayılmaz', changed, false);
    eq('aynı metinde onay korunur', T.segReview(s), 'approved');
  }

  // 4) Onaysız bölümde durum zaten pending; "Anlaşılmadı" gibi insan kararı
  //    metin değişince korunmamalı (metin değişti = yeniden bakılmalı).
  {
    const { s } = mkCase();
    s.review = 'inaudible';
    T.setSegmentText(s, 'yeni metin');
    eq('"Anlaşılmadı" da düşer (metin değişti)', T.segReview(s), 'pending');
  }

  // 5) Yeniden dinleme işareti de metne bağlıdır.
  {
    const { s } = mkCase();
    s.review = 'relisten';
    T.setSegmentText(s, 'başka metin');
    eq('"Yeniden dinlenecek" düşer', T.segReview(s), 'pending');
  }

  // 6) SESSİZ düşüş yasak: onay düştüyse kullanıcı bilgilendirilmeli.
  //    Her tuşta uyarı gürültü olur; bu yüzden düşüş bir kez, odak kaybında
  //    bildirilir. Saf yardımcı test edilebilir olmalı.
  eq('approvalDroppedByEdit tanımlı', typeof T.approvalDroppedByEdit, 'function');
  if (typeof T.approvalDroppedByEdit === 'function') {
    const { s } = mkCase();
    T.snapshotSegmentText(s);
    T.setSegmentText(s, 'yeni metin');
    eq('onay düşüşü algılanır', T.approvalDroppedByEdit(s), true);
    // Aynı metin yazılırsa düşüş yok.
    const b = mkCase().s;
    T.snapshotSegmentText(b);
    T.setSegmentText(b, 'onaylanmış metin');
    eq('değişmeyen metinde düşüş bildirilmez', T.approvalDroppedByEdit(b), false);
    // Onaysız bölümde düşüş bildirilmez (zaten pending).
    const c2 = mkCase().s;
    c2.review = 'pending';
    T.snapshotSegmentText(c2);
    T.setSegmentText(c2, 'başka');
    eq('zaten bekleyen bölümde bildirim yok', T.approvalDroppedByEdit(c2), false);
  }
}

console.log(`\n== Sonuç: ${passed} geçti, ${failures} kaldı ==`);
process.exit(failures === 0 ? 0 : 1);
