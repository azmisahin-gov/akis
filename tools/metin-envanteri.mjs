/**
 * Metin envanteri üreteci (v2.346).
 *
 * KURALLAR: `[object Object]` üretilmez; diziler okunabilir; fonksiyonlar kaynak
 * kod olarak basılmaz (dinamik metin sayılır); üretici içine gömülü uzun
 * cümleler taranır; her metnin belge/bölüm, koşul, düzenlenebilirlik, tür ve
 * durumu yazılır; sürüm `APP_VERSION`'dan okunur.
 *
 * Kullanım: node tools/metin-envanteri.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/METIN_ENVANTERI.md');
const APP = path.join(ROOT, 'assets/app.js');

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

const source = fs.readFileSync(APP, 'utf8');
const inlineImports = (src) =>
  src.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+'([^']+)';\s*$/gm, (_m, names, spec) => {
    const file = (spec.match(/([^/]+\.js)/) || [])[1];
    const target = { 'schema.js': '__schema', 'report-model.js': '__reportModel' }[file];
    if (!target) return _m;
    const list = names.split(',').map((n) => n.trim()).filter(Boolean);
    return `const { ${list.join(', ')} } = globalThis.${target};`;
  });
let code = inlineImports(source)
  .replace(/^init\(\)\.catch\([\s\S]*?\);\s*$/m, '')
  .replace(/^init\(\);\s*$/m, '');
code += '\n;globalThis.__dump={ REPORT_TEXT, LETTER_TEXT, DEFAULT_METHOD, APP_VERSION };';
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
const { REPORT_TEXT: R, LETTER_TEXT: L, DEFAULT_METHOD, APP_VERSION } = sandbox.__dump;

// ---------------------------------------------------------------- biçim
const hasTr = (s) => /[çğıöşüÇĞİÖŞÜ]/.test(s);
const clean = (s) => String(s == null ? '' : s).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
const fmtObject = (o) => {
  const parts = [];
  for (const [k, v] of Object.entries(o)) {
    if (v == null || typeof v === 'function') continue;
    const t = Array.isArray(v)
      ? v.filter((x) => x != null && String(x).trim() !== '').join(' · ')
      : typeof v === 'object' ? fmtObject(v) : clean(v);
    if (t) parts.push(`${k}: ${t}`);
  }
  return parts.join('; ');
};
const fmtValue = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return clean(v);
  if (typeof v === 'function') return '';
  if (Array.isArray(v)) return v.filter((x) => x != null && String(x).trim() !== '').map((x) => (typeof x === 'object' ? fmtObject(x) : clean(x))).join(' · ');
  if (typeof v === 'object') return fmtObject(v);
  return clean(v);
};

// ---------------------------------------------------------------- gruplar
const GROUPS = {
  'Künye / kapak': ['subtitle', 'defaultField', 'emptyCourt', 'emptyFileNo', 'expertFieldHeading', 'toplineField'],
  'Kapsam, sorular, yöntem, sonuç': ['defaultScope', 'defaultQuestions', 'defaultQuestion', 'defaultAnswer', 'defaultBasis', 'defaultEvaluation', 's5Intro', 'answersIntro', 'limitsIntro', 'defaultLimitations', 'defaultConclusion', 'summaryIntro', 'sections'],
  'Envanter ve kayıtlar': ['defaultInventoryIntro', 'inventoryNote', 'videoAudioNote'],
  'Konuşmacı': ['speakerIntro', 'speakerFootnote', 'speakerVerifiedNote', 'speakerMethodNote', 'speakerCodeNote', 'speakerCodeConflict'],
  'Köken, edinme, metadata': ['originIntro', 'originFileTimeNote', 'acqIntro', 'embeddedIntro', 'mediumTypes'],
  'Ölçümler (WER, seviye)': ['werIntro', 'werNoRows', 'levelIntro'],
  'İnceleme özeti, QC, bütünlük': ['reviewSummaryIntro', 'qcIntro', 'qcNote', 'integrityIntro', 'integrityNote'],
  'Beyan, gizlilik, dayanak, otomatik çözümleme': ['scopeNoteText', 'privacyText', 'annexLegalText', 'asrIntro', 'asrLocal', 'asrVerify', 'enhanceText', 'techIntro', 'techNote'],
  'Okuma metni / terim': ['readingIntro', 'termsIntro'],
  'Teslim kontrolü / beyan alanı': ['deliveryCheckNote', 'impartialityHint', 'impartialityTemplate'],
  'Uyarılar': ['warnLanguage', 'warnHallucination'],
  'Fizikî dosya (tutanak metinleri)': ['physicalAnnexEmpty', 'physicalIntro', 'physicalMissingWarning', 'physicalNoIndexWarning', 'physicalSignatureNote']
};
const usedKeys = new Set(Object.values(GROUPS).flat());
const extraLong = Object.keys(R).filter((k) => fmtValue(R[k]).length >= 60 && !usedKeys.has(k));
if (extraLong.length) GROUPS['Diğer uzun metinler'] = extraLong;

const CONDITIONAL = new Set(['embedded', 'acquisition', 'answers', 'integrity', 'wer', 'levels', 'reading', 'speakerDurations', 'terms', 's2', 's3', 'origin', 'qc', 'deliveryCheck']);
const ANNEX_TEXT = new Set(['physicalAnnexEmpty', 'physicalIntro', 'physicalMissingWarning', 'physicalNoIndexWarning', 'physicalSignatureNote', 'annexIntro', 'annexLegalText']);
const EDIT_NOTE = {
  defaultLimitations: ['Kod varsayılanı; **Ayarlar → Kendi varsayılan metinlerim** ile kullanıcı varsayılanı olur; dosya bazında **Rapor → Bölüm düzenle**.', 'beyan/otomatik'],
  defaultConclusion: ['Kod varsayılanı; **Ayarlar → Kendi varsayılan metinlerim**; dosya bazında **Rapor → Bölüm düzenle**.', 'beyan/otomatik'],
  impartialityTemplate: ['Kod sabiti; beyan alanındaki **“Engel bulunmadığını yaz”** düğmesi yazar.', 'beyan'],
  impartialityHint: ['Kod sabiti (panel ipucu).', 'arayüz'],
  DEFAULT_METHOD: ['Kod varsayılanı; **Ayarlar → Kendi varsayılan metinlerim**; dosya bazında **Rapor → Bölüm düzenle**.', 'beyan/otomatik']
};
const usageCount = (key) => (source.match(new RegExp('REPORT_TEXT\\.' + key + '\\b', 'g')) || []).length;
const statusOf = (key) => {
  if (usageCount(key) === 0) return 'Kullanılmıyor (kaynakta çağrı yok) — doğrulanmadan silinmemeli';
  if (ANNEX_TEXT.has(key)) return 'Aktif · tutanak/ek belgesi';
  if (CONDITIONAL.has(key)) return 'Aktif · koşullu';
  return 'Aktif';
};

// ---------------------------------------------------------------- gömülü tarama
const RENDERERS = ['renderReport', 'docxXml', 'udfDocument', 'letterPaperHtml', 'docxLetterXml', 'makeUdf', 'makeDocx', 'physicalTutanakBlocks', 'reportAnnexBlocks', 'letterDefaultBody'];
function literalTexts(src) {
  const out = [];
  let i = 0, line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === "'" || c === '"') {
      const q = c; let j = i + 1, buf = '';
      while (j < n && src[j] !== q) {
        if (src[j] === '\\') { buf += src[j + 1] || ''; j += 2; continue; }
        if (src[j] === '\n') break;
        buf += src[j]; j++;
      }
      out.push({ text: buf, line }); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, buf = '';
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') { buf += src[j + 1] || ''; j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') {
          out.push({ text: buf, line }); buf = '';
          let depth = 1; j += 2;
          while (j < n && depth > 0) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; else if (src[j] === '\n') line++; j++; }
          continue;
        }
        if (src[j] === '\n') line++;
        buf += src[j]; j++;
      }
      out.push({ text: buf, line }); i = j + 1; continue;
    }
    i++;
  }
  return out;
}
const stripHtml = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const isProse = (t) => {
  const s = stripHtml(t);
  if (s.length < 40) return false;
  if (!hasTr(s)) return false;
  if (s.split(' ').length < 6) return false;
  if (/[a-z-]+="/.test(t)) return false;
  if (/=>|\bfunction\b|\breturn\b|\bconst\b|querySelector/.test(s)) return false;
  if (/^[A-Z0-9 ÇĞİÖŞÜ.,:;()\/·\-]+$/.test(s)) return false;
  return true;
};
const knownValues = new Set([...Object.values(R), ...Object.values(L), DEFAULT_METHOD].map((v) => stripHtml(fmtValue(v))).filter(Boolean));
const embedded = [];
{
  const ranges = [];
  for (const name of RENDERERS) {
    const m = source.match(new RegExp('function ' + name + '\\s*\\('));
    if (!m) continue;
    const start = m.index;
    const next = source.slice(start + 10).search(/\n(?:async )?function [A-Za-z0-9_$]+\(/);
    ranges.push({ name, start, end: next < 0 ? source.length : start + 10 + next });
  }
  const linePos = [];
  { let acc = 0; for (const ln of source.split('\n')) { linePos.push(acc); acc += ln.length + 1; } }
  for (const lit of literalTexts(source)) {
    if (!isProse(lit.text)) continue;
    const pos = linePos[lit.line - 1] || 0;
    const owner = ranges.find((r) => pos >= r.start && pos <= r.end);
    if (!owner) continue;
    const text = stripHtml(lit.text);
    if (knownValues.has(text)) continue;
    if (embedded.some((e) => e.text === text)) continue;
    embedded.push({ fn: owner.name, line: lit.line, text });
  }
}
const val = (k) => fmtValue(R[k]);
const dynamicKeys = Object.keys(R).filter((k) => typeof R[k] === 'function');
const longKeys = Object.keys(R).filter((k) => val(k).length >= 60);
const shortKeys = Object.keys(R).filter((k) => val(k).length < 60);

// ---------------------------------------------------------------- markdown
let md = '# Metin Envanteri (uygulamadaki tüm belge metinleri)\n\n';
md += `**Üretildiği uygulama sürümü:** v${APP_VERSION} (kaynaktan okunur)\n\n`;
md += 'Bu dosya **koddaki güncel metinleri** tek yerde toplar. Amacı hukuk danışmanlığı ve\n';
md += 'denetimde “hangi metin, hangi belgede, hangi koşulda, kim düzenleyebilir” sorusunu\n';
md += 'yanıtlamaktır. **Elle düzenlenmez:** `node tools/metin-envanteri.mjs` ile üretilir;\n';
md += '`surum-testi` güncelliğini denetler.\n\n';
md += '**Ana ilke:** Rapor, yazılımın çalışma biçimini değil **bilirkişinin yaptığı incelemeyi**\n';
md += 'anlatır. Teknik terimler ana anlatımın zorunlu dili değildir; gerekli teknik bilgi\n';
md += 'ölçüsünde ve gerektiğinde verilir.\n\n';

md += '## 1) Ekranda nerede?\n\n| Ne | Yol |\n|---|---|\n';
md += '| Kendi varsayılan metinlerim (3 metin) | Üst bar **⚙ Ayarlar** → **“Kendi varsayılan metinlerim”** |\n';
md += '| Bir dosyada yöntem/sınırlılık/sonuç | **Rapor** → belgede bölüme tıkla → **Bölüm düzenle** |\n';
md += '| Kayıtlı metinlerim (tıkla-dolsun) | Aynı panelde, alanın altındaki **“Kayıtlı metinlerim (N)”** |\n';
md += '| Tarafsızlık beyanı | **Rapor → Kontrol** → **“Künye: tarafsızlığı etkileyebilecek hâl beyanı”** |\n';
md += '| Bölüm başlıkları / sıra | **Rapor** sol iskelet: kalem · ↑↓ · aç/kapa |\n';
md += '| Üst yazı metni | **Rapor → Üst yazı** sekmesi |\n\n';
md += '> **Tek düzenleme yeri (v2.345):** Yöntem, sınırlılık ve sonuç metinleri **yalnız**\n';
md += '> Rapor görünümünde düzenlenir; İnceleme görünümünde yalnız yönlendirme vardır.\n\n';

md += '## 2) Düzenlenebilirlik ayrımı\n\n| Katman | Ne | Nerede |\n|---|---|---|\n';
md += '| Kod varsayılanı | Uygulamanın kendi metni | `assets/app.js` |\n';
md += '| Kullanıcı varsayılanı | Yeni dosyada ne gelsin | **Ayarlar** (yalnız bu tarayıcı) |\n';
md += '| Dosya metni | O dosyada yazılan | **Rapor → Bölüm düzenle** (dosyaya yazılır) |\n\n';
md += 'Kod varsayılanı **dosyaya yazılmaz**; alan boşsa basılır. Eski dosyanın metni, varsayılan\n';
md += 'değişince kendiliğinden değişmez.\n\n';

md += '## 3) Yöntem metni — `DEFAULT_METHOD`\n\n';
md += '- **Belge/bölüm:** Rapor · İnceleme yöntemi (s4)\n';
md += '- **Koşul:** Bölüm açık ve dosyada metin yoksa (varsayılan)\n';
md += `- **Düzenlenebilir:** ${EDIT_NOTE.DEFAULT_METHOD[0]}\n- **Tür:** ${EDIT_NOTE.DEFAULT_METHOD[1]}\n- **Durum:** Aktif\n\n`;
md += '> ' + clean(DEFAULT_METHOD).replace(/\n+/g, '\n>\n> ') + '\n\n';

md += '## 4) Katalog metinleri (rapora/üst yazıya giren cümleler)\n\n';
md += 'Her metin için belge/bölüm, koşul, düzenlenebilirlik, tür ve **durum** yazılır.\n';
md += '“Kullanılmıyor” metinler **silinmez**; önce doğrulanır.\n\n';
for (const [g, keys] of Object.entries(GROUPS)) {
  const rows = keys.filter((k) => k in R && val(k).length >= 60);
  if (!rows.length) continue;
  md += `### ${g}\n\n`;
  for (const k of rows) {
    const ed = EDIT_NOTE[k] || ['Kod sabiti (dosya bazında düzenlenemez).', 'otomatik açıklama'];
    const st = statusOf(k);
    md += `**\`${k}\`**\n\n`;
    md += `- **Belge/bölüm:** ${ANNEX_TEXT.has(k) ? 'Ek/tutanak belgesi' : 'Rapor'} · ${g}\n`;
    md += `- **Koşul:** ${st.includes('koşullu') ? 'Yalnız veri/ölçüm varsa çizilir' : st.includes('tutanak') ? 'Ek/tutanak açıksa' : 'Bölüm açıksa'}\n`;
    md += `- **Düzenlenebilir:** ${ed[0]}\n- **Tür:** ${ed[1]}\n- **Durum:** ${st}\n\n`;
    md += '> ' + val(k).replace(/\n+/g, '\n>\n> ') + '\n\n';
  }
}

md += '## 5) Üst yazı metinleri (`LETTER_TEXT`)\n\n';
for (const k of Object.keys(L)) {
  md += `**\`${k}\`**\n\n- **Belge:** Üst yazı\n- **Düzenlenebilir:** Metin alanları **Rapor → Üst yazı**\n- **Tür:** otomatik/koşullu\n- **Durum:** Aktif\n\n`;
  md += '> ' + (fmtValue(L[k]) || '—') + '\n\n';
}

md += '## 6) Gömülü metinler (katalogda değil, üretici içinde)\n\n';
md += 'Rapor/üst yazı/tutanak üreticilerinde **doğrudan yazılmış** cümleler; katalog\n';
md += 'sabitlerinden gelmediği için gözden kaçabilir. Tarama bunu engeller.\n\n';
if (embedded.length) {
  md += '| Üretici | Satır | Tür | Metin (kısaltıldı) |\n|---|---|---|---|\n';
  const kindOf = (t) => {
    if (/kontrol edin|yüklenemedi|doğrulanamadı|tekrar deneyin|bulunamadı|oluşturuldu/i.test(t)) return 'hata/arayüz';
    if (/^[a-zçğıöşü]/.test(t) || /;$/.test(t)) return 'parça (dinamik)';
    return 'belge metni';
  };
  for (const e of embedded) {
    const body = e.text.slice(0, 220).replace(/\|/g, '\\|') + (e.text.length > 220 ? '…' : '');
    md += `| \`${e.fn}\` | ${e.line} | ${kindOf(e.text)} | ${body} |\n`;
  }
} else md += '_Gömülü uzun cümle bulunmadı._\n';
md += '\n';

md += '## 7) Kısa etiket ve başlıklar (60 karakterden kısa)\n\n';
md += 'Hukuki cümle değil; sütun adı/boş durum metni gibi **etiketler**.\n\n| Anahtar | Değer |\n|---|---|\n';
for (const k of shortKeys) md += `| \`${k}\` | ${val(k).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
if (dynamicKeys.length) md += '\n**Dinamik metinler (fonksiyon):** ' + dynamicKeys.map((k) => '`' + k + '`').join(', ') + ' — içerik veriye göre üretilir; kaynak kodu basılmaz.\n';
md += '\n';

md += '## 8) Arayüz / yardım metinleri (rapora girmez)\n\n';
md += 'Buton, ipucu, uyarı ve sürüm notları rapor metni değildir: `index.html` (yardım\n';
md += 'penceresi) ve `assets/app.js` → `VERSION_NOTICES` içinde tutulur. Bu envanterin\n';
md += 'kapsamı **belge çıktısıdır**.\n\n';

md += '## 9) Danışmana sorulacaklar\n\n';
md += 'Aşağıdakiler **hukuki/etik beyan** niteliğinde; metin değişikliğinden önce netleşmeli:\n\n';
md += '1. `DEFAULT_METHOD` — yapılan/yapılmayan işi anlatan yöntem paragrafı.\n';
md += '2. `scopeNoteText` — 56.12 kapsamı ve yapılmayan incelemeler.\n';
md += '3. `annexLegalText` — **kullanılan dayanakların künyesi**: metin, doğrulanmamış mevzuat/standart atfı kullanılmamasını söyler; danışmana soru, gerçekten kullanılan rehber/standart varsa tam künyesinin (başlık, sürüm, tarih) ne olacağıdır.\n';
md += '4. `privacyText` — kişisel veri/gizlilik sınırı.\n';
md += '5. Otomatik çözümleme metinleri (`asrIntro`, `asrLocal`, `asrVerify`) — bilirkişi anlatımıyla sadeleştirme ve gerçek kontrol durumuna bağlama.\n';
md += '6. `impartialityTemplate` / beyan alanı — tarafsızlığı etkileyebilecek hâl.\n';
md += '7. `defaultLimitations`, `defaultConclusion` — sınırlılık ve sonuç çerçevesi.\n';
md += '8. `integrityNote` — işlem günlüğü ve hash iddialarının sınırı.\n\n';
md += '> **Not:** Uygulama hukuki görüş üretmez; bu metinler bilirkişinin beyanı/teknik\n';
md += '> açıklamasıdır. Mevzuat maddesi ve uzmanlık alanı künyesi **doğrulanmadan** yazılmaz.\n';

// ---------------------------------------------------------------- değişmezler
const problems = [];
if (md.includes('[object Object]')) problems.push('[object Object] üretildi');
if (/function\s*\(/.test(md.replace(/`[^`]*`/g, ''))) problems.push('fonksiyon kaynak kodu basıldı');
if (!md.includes('v' + APP_VERSION)) problems.push('sürüm yazılmadı');
if (problems.length) {
  console.error('KALDI  envanter üretilemedi: ' + problems.join(' · '));
  process.exit(1);
}
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
console.log('yazıldı: docs/METIN_ENVANTERI.md (' + md.split('\n').length + ' satır, v' + APP_VERSION + ', gömülü metin: ' + embedded.length + ')');
