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
  querySelectorAll: () => [], createElement: () => makeEl('new'), addEventListener: noop,
};
const localStorageStub = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

let code = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8')
  .replace(/^init\(\);\s*$/m, '');
const EXPOSE = [
  'computeWer', 'editDistance', 'normalizeForWer', 'werWords',
  'fftMagnitude', 'detectPitchHz', 'specColor',
  'trDative', 'timecode', 'secondsFromTimecode',
  'isHallucination', 'compactHistory', 'segReview', 'isReviewed',
  'reportTypeSpec', 'questionsFallbackText', 'evaluationFallbackText',
  'paragraphize', 'analyzeSilence', 'segmentSilenceFlag',
  'contentWords', 'findTermInconsistencies', 'applyTermForm',
  'detectRepetition', 'segmentRepetitionFlag',
  'buildProjectPack', 'validateProjectPack', 'matchAudioEntries',
  'evaluateModelIntegrity', 'recommendModel', 'modelIdFromUrl',
  'parseAsrResult', 'asrWindows', 'looksNonTurkish', 'safeName',
];
code += `\n;globalThis.__t={${EXPOSE.map((n) => `${n}:typeof ${n}!=='undefined'?${n}:undefined`).join(',')}};\n`;

const sandbox = {
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
eq('0 sn', T.timecode(0), '00:00:00');
eq('65 sn', T.timecode(65), '00:01:05');
eq('3661 sn', T.timecode(3661), '01:01:01');
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
eq('tam saniye kısa biçim', T.timecode(5), '00:00:05');

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
  eq('ofset uygulandı', [segs[0].start, segs[0].end], ['00:01:01', '00:01:03']);
  eq('metin kırpıldı', segs[0].text, 'merhaba');
  // Kelime zamanları korunur (karaoke).
  const res2 = { chunks: [{ text: 'a b', timestamp: [0, 2], words: [{ word: 'a', start: 0, end: 1 }, { word: 'b', start: 1, end: 2 }] }] };
  const segs2 = T.parseAsrResult(res2, 0, 30);
  eq('kelime zamanları', segs2[0].words.length, 2);
  eq('kelime başlangıcı', segs2[0].words[1].s, '00:00:01');
  // Chunk yoksa metin fallback pencere süresini kullanır.
  const segs3 = T.parseAsrResult({ text: 'tek metin' }, 10, 5);
  eq('fallback aralığı', [segs3[0].start, segs3[0].end], ['00:00:10', '00:00:15']);
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

// --- 8. Geçmiş sıkıştırma -------------------------------------------------
console.log('\n[8] Metin geçmişi sıkıştırma');
const mk = (arr) => arr.map((t, i) => ({ text: t, at: 't' + i }));
eq('tuş-tuş zincir tek sürüme iner', T.compactHistory(mk(['', 'M', 'Me', 'Mer', 'Merhaba'])).map((x) => x.text), ['']);
eq('iki gerçek sürüm korunur', T.compactHistory(mk(['Merhaba', 'Tamamen farklı'])).map((x) => x.text), ['Merhaba', 'Tamamen farklı']);
eq('tek kayıt değişmez', T.compactHistory(mk(['tek'])).length, 1);

// --- 9. Kontrol durumu ----------------------------------------------------
console.log('\n[9] Kontrol durumu');
eq('eski "checked" -> onaylandi', T.segReview({ checked: true }), 'onaylandi');
eq('yeni kayıt -> bekliyor', T.segReview({}), 'bekliyor');
eq('onaylandi denetlenmiş sayılır', T.isReviewed({ review: 'onaylandi' }), true);
eq('yeniden denetlenmiş SAYILMAZ', T.isReviewed({ review: 'yeniden' }), false);
eq('bekliyor denetlenmiş SAYILMAZ', T.isReviewed({ review: 'bekliyor' }), false);

// --- 10. Mercie özel ifadeler --------------------------------------------
console.log('\n[10] Mercie özel ifadeler');
const cHukuk = { reportType: 'hukuk' }, cSav = { reportType: 'savcilik' }, cIcra = { reportType: 'icra' };
eq('hukuk soru kaynağı', T.questionsFallbackText(cHukuk).startsWith('Mahkemece'), true);
eq('savcılık soru kaynağı', T.questionsFallbackText(cSav).startsWith('Cumhuriyet Başsavcılığınca'), true);
eq('icra soru kaynağı', T.questionsFallbackText(cIcra).startsWith('İcra Müdürlüğünce'), true);
eq('savcılıkta "mahkemece" GEÇMEZ', /mahkemece/i.test(T.questionsFallbackText(cSav)), false);

console.log(`\n== Sonuç: ${passed} geçti, ${failures} kaldı ==`);
process.exit(failures === 0 ? 0 : 1);
