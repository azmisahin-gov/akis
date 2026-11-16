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

// --- 7. Dolgu tespiti -----------------------------------------------------
console.log('\n[7] Dolgu/halüsinasyon tespiti');
eq('boş metin', T.isHallucination(''), true);
eq('(Konuşma)', T.isHallucination('(Konuşma)'), true);
eq('(Müzik - Jenerik)', T.isHallucination('(Müzik - Jenerik)'), true);
eq('gerçek cümle', T.isHallucination('Merhaba, depozito hakkında konuşmak istiyorum.'), false);

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
