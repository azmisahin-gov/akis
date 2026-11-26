/**
 * Metin envanteri üreteci (v2.344).
 *
 * NEDEN: Rapor metinleri (REPORT_TEXT / LETTER_TEXT / DEFAULT_METHOD) kodda
 * durur; hukuk danışmanlığı için "hangi cümle nerede" listesi gerekir. Elle
 * kopyalanan liste kaçınılmaz olarak eskir. Bu araç belgeyi KODDAN üretir;
 * `--check` ile belgenin güncel olup olmadığını denetler.
 *
 * Kullanım:
 *   node tools/metin-envanteri.mjs          → docs/METIN_ENVANTERI.md yazar
 *   node tools/metin-envanteri.mjs --check  → farklıysa çıkış kodu 1
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/METIN_ENVANTERI.md');

// app.js tarayıcı modülü: sahte DOM + gerçek şema ile vm içinde yüklenir.
const noop = () => {};
const els = new Map();
const makeEl = (sel) => ({
  sel, value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, dataset: {}, style: {},
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
  closest: () => null, appendChild: noop, remove: noop, showModal: noop, close: noop,
  getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  getContext: () => ({ clearRect: noop, fillRect: noop, fillStyle: '' })
});
const documentStub = {
  querySelector: (s) => { if (!els.has(s)) els.set(s, makeEl(s)); return els.get(s); },
  querySelectorAll: () => [], createElement: () => makeEl('new'), addEventListener: noop
};
const localStorageStub = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
const schema = await import(path.join(ROOT, 'assets/schema.js'));
const reportModel = await import(path.join(ROOT, 'assets/report-model.js'));

const inlineImports = (src) =>
  src.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+'([^']+)';\s*$/gm, (_m, names, spec) => {
    const file = (spec.match(/([^/]+\.js)/) || [])[1];
    const target = { 'schema.js': '__schema', 'report-model.js': '__reportModel' }[file];
    if (!target) return _m;
    const list = names.split(',').map((n) => n.trim()).filter(Boolean);
    return `const { ${list.join(', ')} } = globalThis.${target};`;
  });

let code = inlineImports(fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8'))
  .replace(/^init\(\)\.catch\([\s\S]*?\);\s*$/m, '')
  .replace(/^init\(\);\s*$/m, '');
code += '\n;globalThis.__dump={ REPORT_TEXT, LETTER_TEXT, DEFAULT_METHOD };';
const sandbox = {
  __schema: schema, __reportModel: reportModel, console, document: documentStub,
  localStorage: localStorageStub, window: {}, navigator: {},
  getComputedStyle: () => ({ display: 'block', height: '0px', marginLeft: '0px', overflowX: 'visible' }),
  crypto: { subtle: { digest: async () => new ArrayBuffer(32) } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: noop },
  Blob, TextEncoder, TextDecoder, setTimeout, clearTimeout, indexedDB: { open: () => ({}) },
  DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
  fetch: async () => ({ ok: false })
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });
const { REPORT_TEXT: R, LETTER_TEXT: L, DEFAULT_METHOD } = sandbox.__dump;

const val = (k, o) => (Array.isArray(o[k]) ? o[k].join(' · ') : String(o[k] == null ? '' : o[k]));
const GROUPS = {
  'Künye / kapak': ['subtitle', 'defaultField', 'emptyCourt', 'emptyFileNo', 'expertFieldHeading', 'toplineField'],
  'Kapsam, sorular, yöntem, sonuç': [
    'defaultScope', 'defaultQuestions', 'defaultQuestion', 'defaultAnswer', 'defaultBasis', 'defaultEvaluation',
    's5Intro', 'answersIntro', 'limitsIntro', 'defaultLimitations', 'defaultConclusion', 'summaryIntro', 'sections'
  ],
  'Envanter ve kayıtlar': ['defaultInventoryIntro', 'inventoryNote', 'videoAudioNote'],
  Konuşmacı: ['speakerIntro', 'speakerFootnote', 'speakerVerifiedNote', 'speakerMethodNote', 'speakerCodeNote', 'speakerCodeConflict'],
  'Köken, edinme, metadata': ['originIntro', 'originFileTimeNote', 'acqIntro', 'embeddedIntro', 'mediumTypes'],
  'Ölçümler (WER, seviye)': ['werIntro', 'werNoRows', 'levelIntro'],
  'İnceleme özeti, QC, bütünlük': ['reviewSummaryIntro', 'qcIntro', 'qcNote', 'integrityIntro', 'integrityNote'],
  'Beyan, gizlilik, dayanak, ASR': ['scopeNoteText', 'privacyText', 'annexLegalText', 'asrIntro', 'asrLocal', 'asrVerify', 'enhanceText', 'techIntro', 'techNote'],
  'Okuma metni / terim': ['readingIntro', 'termsIntro'],
  'Teslim kontrolü / beyan alanı': ['deliveryCheckNote', 'impartialityHint', 'impartialityTemplate'],
  Uyarılar: ['warnLanguage', 'warnHallucination'],
  'Fizikî dosya (tutanak metinleri)': ['physicalAnnexEmpty', 'physicalIntro', 'physicalMissingWarning', 'physicalNoIndexWarning', 'physicalSignatureNote']
};
const used = new Set(Object.values(GROUPS).flat());
const extra = Object.keys(R).filter((k) => val(k, R).trim().length >= 60 && !used.has(k));
if (extra.length) GROUPS['Diğer uzun metinler'] = extra;

const EDITABLE = {
  defaultLimitations: '**Düzenlenebilir?** kod; **Ayarlar → Kendi varsayılan metinlerim** ile değiştirilebilir (boş alan için)',
  defaultConclusion: '**Düzenlenebilir?** kod; **Ayarlar → Kendi varsayılan metinlerim** ile değiştirilebilir (boş alan için)',
  impartialityTemplate: '**Düzenlenebilir?** kod; beyan alanındaki **“Engel bulunmadığını yaz”** düğmesi bu cümleyi yazar',
  impartialityHint: '**Düzenlenebilir?** kod (panel ipucu)'
};

let md = '# Metin Envanteri (uygulamadaki tüm rapor metinleri)\n\n';
md += 'Bu dosya **koddaki güncel metinleri** tek yerde toplar; hukuk danışmanlığı alırken\n';
md += '"hangi cümle nerede geçiyor, düzenlenebilir mi" sorusunu cevaplamak için üretildi.\n';
md += 'Metinler `assets/app.js` içindeki `REPORT_TEXT`, `LETTER_TEXT` ve `DEFAULT_METHOD`\n';
md += 'sabitlerinden **otomatik** çıkarıldı. **Bu dosyayı elle düzenlemeyin:**\n';
md += '`node tools/metin-envanteri.mjs` ile yeniden üretilir; `surum-testi` güncel olup\n';
md += 'olmadığını denetler.\n\n';
md += '## 1) Ekranda nerede?\n\n| Ne | Yol |\n|---|---|\n';
md += '| Kendi varsayılan metinlerim (3 metin) | Üst bar **⚙ Ayarlar** → çekmecede **“Kendi varsayılan metinlerim”** |\n';
md += '| Bir dosyada yöntem/sınırlılık/sonuç yazmak | **Rapor** görünümü → belgede bölüme tıkla → sağda **Bölüm düzenle** |\n';
md += '| Kayıtlı metinlerim (tıkla-dolsun) | Aynı **Bölüm düzenle** panelinde, alanın altındaki **“Kayıtlı metinlerim (N)”** |\n';
md += '| Tarafsızlık beyanı | **Rapor → Kontrol** modu → **“Künye: tarafsızlığı etkileyebilecek hâl beyanı”** |\n';
md += '| Bölüm başlıkları / sıra | **Rapor** sol iskelet: kalem (başlık), ↑↓ (sıra), aç/kapa |\n';
md += '| Üst yazı metni | **Rapor → Üst yazı** sekmesi (gövde, yer, ilgi) |\n\n';
md += '## 2) Şu anda uygulamadan düzenlenebilenler\n\n| Metin | Nerede | Kapsam |\n|---|---|---|\n';
md += '| İnceleme yöntemi | Bölüm düzenle + Ayarlar (varsayılan) | Dosya + yeni dosya varsayılanı |\n';
md += '| Teknik sınırlılıklar | Bölüm düzenle + Ayarlar (varsayılan) | Dosya + yeni dosya varsayılanı |\n';
md += '| Sonuç ve kanaat | Bölüm düzenle + Ayarlar (varsayılan) | Dosya + yeni dosya varsayılanı |\n';
md += '| Tarafsızlığı etkileyebilecek hâl beyanı | Rapor → Kontrol | Dosya |\n';
md += '| Üst yazı: yer, ilgi, gövde, imza | Rapor → Üst yazı | Dosya |\n';
md += '| Bölüm başlıkları, sıra, aç/kapa | Rapor iskeleti | Dosya |\n';
md += '| Ek başlığı / içerik / not | Rapor → Kontrol → Ekler | Dosya |\n';
md += '| Tablo sütunları ve başlıkları | Rapor → Kontrol → Rapor alanları | Dosya |\n';
md += '| Punto, kenar boşluğu, yön | Rapor → Kontrol → Rapor biçimi | Dosya |\n';
md += '| Teknik ortam (7 alan), ikinci kontrol (3 alan) | Rapor → Kontrol | Dosya |\n\n';
md += '## 3) Uzun metinler (rapora giren cümleler)\n\n';
md += 'Her metin **koddadır** (bugün sabit). “Düzenlenebilir?” satırı o metnin bugün\n';
md += 'uygulamadan değiştirilip değiştirilemediğini söyler.\n\n';
md += '### 3.0 İnceleme yöntemi — `DEFAULT_METHOD`\n\n';
md += '> ' + String(DEFAULT_METHOD).trim().replace(/\n+/g, '\n>\n> ') + '\n\n';
for (const [g, keys] of Object.entries(GROUPS)) {
  md += `### ${g}\n\n`;
  for (const k of keys) {
    if (!(k in R)) continue;
    const v = val(k, R);
    if (v.trim().length < 60) continue;
    md += `**\`${k}\`** — ${EDITABLE[k] || '**Düzenlenebilir?** hayır — kod sabiti'}\n\n`;
    md += '> ' + v.replace(/\n+/g, '\n>\n> ') + '\n\n';
  }
}
md += '## 4) Üst yazı metinleri (`LETTER_TEXT`)\n\n';
for (const k of Object.keys(L)) md += `**\`${k}\`**\n\n> ${val(k, L).replace(/\n+/g, '\n>\n> ')}\n\n`;
md += '## 5) Kısa etiket ve başlıklar (`REPORT_TEXT`, 60 karakterden kısa)\n\n';
md += 'Bunlar hukuki cümle değil, **etiket/başlık**tır (ör. sütun adları, boş durum metinleri).\n\n';
md += '| Anahtar | Değer |\n|---|---|\n';
for (const k of Object.keys(R)) {
  const v = val(k, R);
  if (v.trim().length >= 60) continue;
  md += `| \`${k}\` | ${v.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
}
md += '\n## 6) Danışmana sorulacaklar (öneri)\n\n';
md += 'Aşağıdaki metinler **hukuki/etik beyan** niteliğinde; önce bunlar netleşmeli:\n\n';
md += '1. `DEFAULT_METHOD` (İnceleme yöntemi) — yapılan/yapılmayan işi anlatır.\n';
md += '2. `scopeNoteText` (Görev alanı dışında kalan konular / sınırlılık beyanı).\n';
md += '3. `annexLegalText` (Hukuki ve yöntemsel dayanaklar) — **mevzuat atfı içerir**, doğrulanmalı.\n';
md += '4. `privacyText` (Kişisel veri / gizlilik).\n';
md += '5. `asrIntro`, `asrLocal`, `asrVerify` (otomatik çözümleme ve doğrulama sınırı).\n';
md += '6. `impartialityTemplate` / beyan alanı (tarafsızlığı etkileyebilecek hâl).\n';
md += '7. `defaultLimitations`, `defaultConclusion` (teknik sınırlılık ve sonuç çerçevesi).\n';
md += '8. `deliveryCheckNote` (teslim kontrolü tablosunun anlamı).\n\n';
md += '> **Not:** Uygulama hukuki görüş üretmez; bu metinler bilirkişinin beyanı/teknik\n';
md += '> açıklamasıdır. Mevzuat maddesi ve uzmanlık alanı künyesi **doğrulanmadan** yazılmaz.\n';

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) {
    console.error('KALDI  docs/METIN_ENVANTERI.md güncel değil — `node tools/metin-envanteri.mjs` çalıştırın.');
    process.exit(1);
  }
  console.log('GEÇTİ  metin envanteri güncel');
  process.exit(0);
}
fs.writeFileSync(OUT, md);
console.log(`yazıldı: docs/METIN_ENVANTERI.md (${md.split('\n').length} satır)`);
