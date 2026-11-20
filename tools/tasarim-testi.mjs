/**
 * Tasarım tutarlılık kontrolü.
 *
 * NEDEN: Bilirkişi bu ekranda saatlerce deşifre yazıyor. Punto ve kontrast
 * keyfî seçilemez; ölçülebilir olmalı. Bu betik, tasarım kararlarını
 * varsayım değil ÖLÇÜM olarak denetler:
 *
 *   1. Renk kontrastı — üç temada da her metin rengi WCAG AA (≥4.5:1).
 *   2. Punto alt sınırı — hiçbir kural 11px'in altında metin tanımlamaz.
 *   3. Token disiplini — okuma katmanında ham metin rengi (#hex) kalmaz.
 *   4. Yükleme sırası — tokens → app → reading-layer (katman en sonda).
 *   5. Tema bütünlüğü — her tema aynı token kümesini tanımlar.
 *
 * Çalıştırma:  node tools/tasarim-testi.mjs
 * Çıkış kodu 0 = tüm kontroller geçti, 1 = en az bir sapma var.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${label}${detail ? '  → ' + detail : ''}`);
}

// --- WCAG hesapları -------------------------------------------------------
function rgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}
function luminance(hex) {
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb(hex).map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --- CSS ayrıştırma yardımcıları -----------------------------------------
// Bir tema bloğunun içindeki --token: değer; çiftlerini toplar.
function themeTokens(css, selector) {
  const out = {};
  // Seçiciyi (virgülle ayrılmış olabilir) regex'e çevir.
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc}\\s*\\{([^}]*)\\}`, 'g');
  let m;
  while ((m = re.exec(css))) {
    for (const decl of m[1].split(';')) {
      const d = decl.match(/--([\w-]+)\s*:\s*([^;]+)/);
      if (d) out[d[1].trim()] = d[2].trim();
    }
  }
  return out;
}

console.log('== Tasarım tutarlılık kontrolü ==\n');

const tokens = read('assets/tokens.css');
const appCss = read('assets/app.css');
const layer = read('assets/reading-layer.css');
const html = read('index.html');

// --- 1. Kontrast ----------------------------------------------------------
console.log('[1] Renk kontrastı (WCAG AA ≥ 4.5)');
const themes = {
  light: themeTokens(tokens, "[data-theme='light']"),
  dark: themeTokens(tokens, "[data-theme='dark']"),
  sepia: themeTokens(tokens, "[data-theme='sepia']")
};
// Açık tema `:root` ile birlikte tanımlanır; oradan da topla.
const rootTokens = themeTokens(tokens, ':root');
const lightMerged = { ...rootTokens, ...themes.light };
themes.light = lightMerged;

const TEXT_TOKENS = ['ink', 'ink-2', 'ink-3', 'accent', 'gold', 'green', 'red'];
for (const [name, t] of Object.entries(themes)) {
  check(`${name}: zemin tokenları var`, !!t.surface && !!t.bg, t.surface ? '' : 'surface yok');
  for (const tok of TEXT_TOKENS) {
    const fg = t[tok];
    if (!fg || !fg.startsWith('#')) {
      check(`${name}: --${tok} tanımlı`, false, fg || 'yok');
      continue;
    }
    const onSurface = contrast(fg, t.surface);
    const onBg = contrast(fg, t.bg);
    const worst = Math.min(onSurface, onBg);
    check(
      `${name}: --${tok} AA`,
      worst >= 4.5,
      `${worst.toFixed(2)}:1 (surface ${onSurface.toFixed(2)}, bg ${onBg.toFixed(2)})`
    );
  }
}

// Rapor kâğıdı: koyu temada bile okunur kalmalı.
const paperDark = themeTokens(tokens, "[data-theme='dark']");
const paperBlock = tokens.slice(tokens.indexOf('Rapor kâğıdı'));
const darkPaper = {};
for (const d of paperBlock.matchAll(/--paper(-[\w]+)?\s*:\s*(#[0-9a-fA-F]{3,6})/g)) {
  darkPaper[d[1] || ''] = d[2];
}
console.log('\n[1b] Rapor kâğıdı kontrastı');
if (darkPaper[''] && darkPaper['-ink']) {
  const c = contrast(darkPaper['-ink'], darkPaper['']);
  check('koyu temada kâğıt metni AA', c >= 4.5, `${c.toFixed(2)}:1`);
  const c2 = contrast(darkPaper['-muted'] || darkPaper['-ink'], darkPaper['']);
  check('koyu temada kâğıt ikincil metni AA', c2 >= 4.5, `${c2.toFixed(2)}:1`);
} else {
  check('koyu tema kâğıt tokenları bulundu', false);
}

// --- 2. Punto alt sınırı -------------------------------------------------
// Okuma katmanı en sonda yüklendiği için onun tanımladığı punto geçerlidir.
// app.css'te kalan küçük değerler sorun değil; sorun, katmanın da küçük
// değer tanımlamasıdır.
console.log('\n[2] Punto alt sınırı (okuma katmanı ≥ 11px)');
const layerFontSizes = [...layer.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => Number(m[1]));
const tooSmall = layerFontSizes.filter((v) => v < 11);
check(
  `okuma katmanında 11px altı punto yok (${layerFontSizes.length} tanım)`,
  tooSmall.length === 0,
  tooSmall.length ? `küçük: ${[...new Set(tooSmall)].join(', ')}px` : ''
);
check('okuma katmanı punto değişkeni kullanıyor', /var\(--fs-/.test(layer));
// Taban ölçek 11px'in altına inmemeli.
const scaleMin = [...tokens.matchAll(/--fs-[\w]+\s*:\s*([0-9.]+)px/g)].map((m) => Number(m[1]));
check(
  'punto ölçeğinin en küçük kademesi ≥ 11px',
  scaleMin.length > 0 && Math.min(...scaleMin) >= 11,
  `en küçük ${Math.min(...scaleMin)}px`
);
// Yazı boyutu küçültme seçeneği yok: yalnız büyütme var (okunabilirlik).
check(
  'yazı boyutu yalnız büyütülebilir (küçültme seçeneği yok)',
  !/data-fontscale='small'/.test(tokens)
);

// --- 2b. app.css punto kaçakları (v2.104) --------------------------------
// GERÇEK HATA: v2.103'e kadar bu bölüm yalnız `reading-layer.css`'e bakıyordu.
// Oysa app.css'te 11px altı punto tanımlayan 19 seçici reading-layer
// tarafından EZİLMİYORDU; gerçek tarayıcıda ölçüldü: sürüm etiketi 7px,
// .eyebrow 8px, .split-n 8px, .info-i 9px, .subtle-pill 10px… Yani "hiçbir
// metin 11px altında olamaz" kuralı ekranda TUTMUYORDU; test bunu göremediği
// için sessizce geçiyordu.
// KURAL: app.css'te tanımlanan her küçük punto, reading-layer'da karşılık
// bulan bir ezme kuralına sahip olmalı. Aksi hâlde son kullanıcı küçük punto görür.
console.log('\n[2b] app.css punto kaçakları (okuma katmanı eziyor mu)');
{
  const appRules = [...appCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const layerSelectors = new Set();
  for (const r of [...layer.matchAll(/([^{}]+)\{([^{}]*)\}/g)]) {
    for (const s of r[1].split(',')) layerSelectors.add(s.trim().replace(/\s+/g, ' '));
  }
  // Eşleştirme KATI olmalı. v2.104'te gevşek eşleştirme (son bileşen yeter)
  // yanlış negatif verdi: `.notice-box b` seçicisi, okuma katmanındaki herhangi
  // bir `b` kuralıyla "kapsandı" sanıldı ve 10px metin ekranda kaldı.
  // Kural: okuma katmanında ya TAM seçici bulunmalı, ya da seçicinin TÜM
  // sınıf/id bileşenlerini taşıyan bir kural (ör. `.notice-box p`) olmalı.
  // Jenerik etiket (`b`, `span`, `small`) tek başına kapsam sayılmaz.
  const classesOf = (sel) => (sel.match(/[.#][\w-]+/g) || []);
  const covered = (sel) => {
    if (layerSelectors.has(sel)) return true;
    const mine = classesOf(sel);
    if (!mine.length) return false; // düz etiket: tam eşleşme yoksa kapsanmış sayılmaz
    for (const ls of layerSelectors) {
      const theirs = classesOf(ls);
      if (mine.every((c) => theirs.includes(c))) return true;
    }
    return false;
  };
  const leaks = [];
  for (const r of appRules) {
    const decl = r[2];
    const sizes = [...decl.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => Number(m[1]));
    const sh = [...decl.matchAll(/font:\s*[^;]*?([0-9.]+)px/g)].map((m) => Number(m[1]));
    if (![...sizes, ...sh].some((v) => v < 11)) continue;
    for (const raw of r[1].split(',')) {
      const sel = raw.trim().replace(/\s+/g, ' ');
      // Yorum/artık CSS parçalarını atla (seçici gibi görünmeyenler).
      if (!/^[.#\[a-zA-Z*:]/.test(sel) || sel.includes('/*')) continue;
      if (!covered(sel)) leaks.push(sel);
    }
  }
  const unique = [...new Set(leaks)];
  check(
    `app.css'teki 11px altı kural okuma katmanınca eziliyor (kaçak yok)`,
    unique.length === 0,
    unique.length ? `${unique.length} kaçak: ${unique.slice(0, 8).join(', ')}${unique.length > 8 ? '…' : ''}` : ''
  );
}

// --- 2c. Başlık sessizce kesilmez (v2.105) ------------------------------
// GERÇEK HATA: `#pageTitle` 5 görünümün hepsinde kesiliyordu (ölçüldü):
//   "Genel görünüm" 164px içerik / 95px kutu · "İnceleme ve sorular" 211/95
// Sebep: `.top-actions` `flex:none` ile 922px yer kaplıyor, `.top-title`'e
// 95px kalıyor ve `overflow:hidden` + `text-overflow:ellipsis` yazıyı
// SESSİZCE kırpıyordu. AGENTS.md kuralı: sığmayan öğe sessizce kesilmez.
// Bu test yapısal güvence verir; asıl kanıt tarayıcı ölçümüdür
// (scrollWidth <= clientWidth).
console.log('\n[2c] Başlık sessizce kesilmez (üst bar yerleşimi)');
{
  // Üst bar sarmalı (wrap) olmalı: sığmayan eylem alt satıra geçer.
  const topbarRule = [...appCss.matchAll(/\.topbar\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  const layerTopbar = [...layer.matchAll(/\.topbar\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  const both = topbarRule + ';' + layerTopbar;
  check(
    'üst bar sarmalı (flex-wrap: wrap) — sığmayan eylem kesilmez',
    /flex-wrap:\s*wrap/.test(both),
    /flex-wrap:\s*wrap/.test(both) ? '' : 'üst bar tek satıra zorlanıyor; başlık ezilir'
  );
  // Başlık kabı esnemeli; sabit genişlikte kalmamalı.
  const titleRule = [...layer.matchAll(/\.top-title\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check(
    '.top-title esnemez (flex: 0 0 auto) — başlık sıkıştırılmaz',
    /flex:\s*0\s+0\s+auto/.test(titleRule) || /flex:\s*none/.test(titleRule),
    titleRule.trim().slice(0, 60)
  );
  // Başlıkta kırpma yerine görünür kalsın.
  const h1Rules = [...layer.matchAll(/([^{}]*#?pageTitle[^{}]*|\.top-title h1[^{}]*)\{([^}]*)\}/g)];
  const h1Decl = h1Rules.map((m) => m[2]).join(';');
  check(
    'başlık overflow:hidden ile kırpılmıyor',
    !/overflow:\s*hidden/.test(h1Decl) || /overflow:\s*visible/.test(h1Decl),
    h1Decl.trim().slice(0, 70)
  );
  // Depolama göstergesi tek satırda kalmalı (304px'lik metin başlığı eziyordu).
  const usageRule = [...layer.matchAll(/#usageState[^{}]*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check(
    'depolama göstergesi tek satır (nowrap)',
    /white-space:\s*nowrap/.test(usageRule),
    usageRule.trim().slice(0, 60)
  );
  // KENDİ KURALIMI İHLAL ETMEYİN: `max-width` + `text-overflow: ellipsis`
  // birleşimi metni KIRPAR (v2.105'te 201px → 152px). Üst bar sarabildiği için
  // kırpmaya gerek yok. Kırpma, "sessiz kesme" yasağının ihlalidir.
  check(
    'depolama göstergesi kırpılmıyor (max-width/text-overflow yok)',
    !/max-width/.test(usageRule) && !/text-overflow/.test(usageRule),
    usageRule.trim().slice(0, 60)
  );
}

// --- 2d. Liste yüksekliği kabı AŞMAZ (v2.120) ---------------------------
// GERÇEK HATA: 82 bölümlü kayıtta kullanıcı "78'e kadar görüyorum, 79 yarım"
// dedi. ÖLÇÜM (gerçek Chromium):
//   .seg-list      : height 497px  (max-height: 62vh)
//   .seg-workspace : height 360px  overflow: hidden   ← KIRPAN
//   Fark 137px ≈ 3,8 bölüm kırpılıyordu.
// KÖK NEDEN: reading-layer.css'te `.seg-list{max-height:62vh !important}`
// vardı; ama onu SARAN `.seg-workspace` daha kısaydı ve `overflow:hidden`
// olduğu için listenin altı sessizce KESİLİYORDU.
// KURAL: liste yüksekliği kabına uyar (`height:100%`), kaptan uzun olamaz.
// Kırpma kararı kullanıcıya görünür olmalı (kaydırma), sessiz kesme yasak.
console.log('\n[2d] Liste yüksekliği kabı aşmıyor');
{
  // Yorumları çıkar: yorum metninde geçen "overflow:hidden" yanlış pozitif verir.
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  // @media bloklarını çıkar: dar ekranda listenin kısa olması MAKULDÜR
  // (dikey alan yok). Kural yalnız MASAÜSTÜ yerleşimi için geçerlidir.
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));

  // v2.121 — GERÇEK KURAL (v2.120'deki ifade yanlıştı):
  // `max-height: Nvh` KENDİ BAŞINA zararsızdır; zararlı olan, KABIN daha kısa
  // olup `overflow:hidden` ile çocuğu kırpmasıdır. Bu yüzden ölçüt:
  // (a) liste kendi içinde kayabilmeli (overflow-y auto/scroll),
  // (b) kabı KIRPMAMALI (seg-workspace overflow:hidden yasak),
  // (c) sabit `height:100%` ile kaba bağlanmamalı (kap kısalırsa taşar).
  const listRules = [...base.matchAll(/#view-audio \.seg-list\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const allList = listRules.join(';');
  check(
    'seg-list kendi içinde kayabiliyor (overflow-y auto/scroll)',
    /overflow-y:\s*(auto|scroll)/.test(allList),
    allList.trim().slice(0, 70)
  );
  check(
    'seg-list sabit height:100% ile kaba bağlanmıyor (kap kısalırsa taşar)',
    !/height:\s*100%/.test(allList),
    /height:\s*100%/.test(allList) ? 'height:100% → kap kısalınca taşma/kırpılma' : ''
  );
  // `.seg-workspace` çocuğu kırpmamalı: ya görünür ya kaydırmalı.
  const wsRules = [...base.matchAll(/#view-audio \.seg-workspace\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const allWs = wsRules.join(';');
  check(
    'seg-workspace sessizce kırpmıyor (overflow hidden yok)',
    !/overflow:\s*hidden/.test(allWs),
    /overflow:\s*hidden/.test(allWs) ? 'overflow:hidden → çocuk sessizce kesilir' : ''
  );
}

// --- 2e. Sağ panel (bölüm detayı) kendi içinde kaymaz (v2.121) -----------
// GERÇEK HATA (v2.120 yan etkisi): `.seg-workspace { height:100% }` verilince
// `.seg-detail` 351px'e indi ama içeriği 547px → SAĞ PANELDE KAYDIRMA ÇUBUĞU
// çıktı. Kullanıcı: "sağ taraftaki segment detay kısmına kaydırma çubuğu gelmiş,
// o neden geldi? ... detay çok önemli, orası."
// KURAL: detay paneli kendi içinde kaydırmaz; içeriği kadar uzar ve
// dıştaki tek kaydırma (.seg-list veya sayfa) kullanılır.
console.log('\n[2e] Sağ panel kendi içinde kaymıyor');
{
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));
  const detailRules = [...base.matchAll(/#view-audio \.seg-detail\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const allDetail = detailRules.join(';');
  check(
    'seg-detail kendi içinde kaydırmıyor (overflow-y auto/scroll yok)',
    !/overflow-y:\s*(auto|scroll)/.test(allDetail),
    /overflow-y:\s*(auto|scroll)/.test(allDetail) ? 'overflow-y: auto → panel içinde ayrı çubuk' : ''
  );
  check(
    'seg-detail yüksekliği sabitlenmiyor (içeriği kadar uzar)',
    !/height:\s*(100%|[0-9.]+px)\s*(!important)?/.test(allDetail.replace(/min-height[^;]*;/g, '')),
    allDetail.trim().slice(0, 80)
  );
}

// --- 2f. Takip şeridi: sabit yükseklik + metrik sabit vurgu (v2.125) ------
// ÖLÇÜM (v2.124): kutu 120px tavanlıydı, içerik 202–314px; iç kaydırma 74px
// (~5 satır) sıçrıyordu. Aktif kelime kalın+dolgu ile satır sonlarını
// kaydırabiliyordu. Kural: sabit yükseklik, iç çubuk yok, vurgu yalnız arka plan.
console.log('\n[2f] Takip şeridi sabit ve vurgu metrik değiştirmiyor');
{
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));
  const follow = [...base.matchAll(/#view-audio \.sd-follow\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('takip şeridi sabit yükseklik taşır', /(^|;)\s*height:\s*[^;]+/.test(follow), follow.trim().slice(0, 80));
  check('takip şeridi 120px tavanına dönmedi', !/max-height:\s*120px/.test(follow));
  check('takip şeridi iç kaydırma çubuğu göstermez', /overflow:\s*hidden/.test(follow), follow.trim().slice(0, 80));
  const on = [...base.matchAll(/#view-audio \.sd-follow span\.on\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('aktif kelime kalınlaştırmıyor (metrik sabit)', !/font-weight/.test(on), on.trim().slice(0, 80));
  check('aktif kelime dolgu eklemiyor (metrik sabit)', !/(^|;)\s*padding/.test(on), on.trim().slice(0, 80));
  check('aktif kelime arka planla vurgulanıyor', /background/.test(on));
}

// --- 2g. Analiz kutusu: katmanlı, sabit yükseklik (v2.128) ----------------
// KURAL: dalga + spektrogram AYNI kutuda; kutu 160px SABİT; mod değişince
// yerleşim zıplamaz. Tam genişlik-altı düzen (v2.126) GERİ GELMEMELİ.
console.log('\n[2g] Analiz kutusu: katmanlı, sabit yükseklik');
{
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));
  const wrap = [...base.matchAll(/#view-audio \.sd-canvas-wrap\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('analiz kutusu sabit 160px', /height:\s*160px/.test(wrap), wrap.trim().slice(0, 80));
  check('analiz kutusu konumlandırma kabı', /position:\s*relative/.test(wrap));
  check('mode-wave: dalga 160px', /\.mode-wave \.sd-wave-canvas\s*\{[^}]*height:\s*160px/.test(base));
  check('mode-spec: spek 160px', /\.mode-spec \.sd-spec-canvas\s*\{[^}]*height:\s*160px/.test(base));
  check('mode-both: dalga 48px', /\.mode-both \.sd-wave-canvas\s*\{[^}]*height:\s*48px/.test(base));
  check('mode-both: spek 112px', /\.mode-both \.sd-spec-canvas\s*\{[^}]*height:\s*112px/.test(base));
  check('mode-both: spek dalganın altında (top 48)', /\.mode-both \.sd-spec-canvas\s*\{[^}]*top:\s*48px/.test(base));
  check(
    'kaplama spek ile aynı yerde',
    /\.mode-both \.sd-spec-overlay\s*\{[^}]*top:\s*48px[^}]*height:\s*112px/.test(base)
  );
  check('kaplama tıklamayı engellemez', /\.sd-spec-overlay\s*\{[^}]*pointer-events:\s*none/.test(base));
  check('spek tuvali mutlak (aynı kutuda)', /\.sd-spec-canvas\s*\{[^}]*position:\s*absolute/.test(base));
  check('tam genişlik-altı düzen GERİ GELMEDİ', !/\.sd-body\.spec-mode/.test(base));
}

// --- 2h. Yerleşim: metin listeye bitişik, kontroller solda (v2.127) -------
// ÖLÇÜM (v2.126, 1440px): liste sağ 591, metin sol 952 → 361 px boşluk;
// oynat düğmesi x 1290 → listeden 699 px. Metin SOLA, kontroller SOLA.
console.log('\n[2h] Yerleşim: metin listeye bitişik, kontroller solda');
{
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));
  const body = [...base.matchAll(/#view-audio \.sd-body\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('gövde metin sütunuyla başlar (1fr önce)', /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(280px,\s*42%\)/.test(body), body.trim().slice(0, 100));
  check('metin sütunu görsel olarak solda (order 1)', /#view-audio \.sd-right\s*\{[^}]*order:\s*1/.test(base));
  check('teknik sütun görsel olarak sağda (order 2)', /#view-audio \.sd-left\s*\{[^}]*order:\s*2/.test(base));
  const head = [...base.matchAll(/#view-audio \.sd-head\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('başlık kontrolleri sola yaslar', /justify-content:\s*flex-start/.test(head), head.trim().slice(0, 80));
}

// --- 2i. Ses görünümü: tek kaydırma, iç içe kaydırma yok (v2.129) ---------
// ÖLÇÜM (v2.128): html/body overflow:hidden + #audioDetail visible +
// .seg-list 612px > .seg-workspace 285px → liste kabı taşıyor, kbd-fold ve
// .sd-actions listenin üstüne biniyor, alt içerik erişilemiyordu.
console.log('\n[2i] Ses görünümü: tek kaydırma (v2.129)');
{
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));
  check('ana alan kaydırılır', /\.main-area\s*\{[^}]*overflow-y:\s*auto\s*!important/.test(base));
  check('detay paneli iç kaydırma yapmaz', /#view-audio #audioDetail\s*\{[^}]*overflow:\s*visible\s*!important/.test(base));
  check(
    'liste iç kaydırma yapmaz',
    /#view-audio \.seg-list\s*\{[^}]*height:\s*auto\s*!important[^}]*max-height:\s*none\s*!important[^}]*overflow:\s*visible\s*!important/.test(base)
  );
  check('çalışma modunda üst bar yapışkan', /body\.ws-mode \.workspace-bar\s*\{[^}]*position:\s*sticky/.test(base));
}

// --- 2j. Bölüm rozeti: durum HER ZAMAN görünür (v2.130) ---------------------
// ÖLÇÜM (v2.129): `#view-audio .seg-badges{max-width:96px;overflow:hidden}`.
// Durum rozeti DOM'da EN SONDA olduğu için hiç görünmüyordu (sağ kenar 656 >
// kap 582). Satırda yalnız "Öncelik: Düşü…" görünüyordu; bilirkişi onay
// durumunu listede göremiyordu.
console.log('\n[2j] Bölüm rozeti: durum her zaman görünür (v2.130)');
{
  const rl = read('assets/reading-layer.css');
  const appJs = read('assets/app.js');
  const badgeRules = [...rl.matchAll(/#view-audio \.seg-badges[^{]*\{[^}]*\}/g)].map((m) => m[0]);
  // Kötü kural `app.css`te (max-width:96px + overflow:hidden). Okuma katmanı
  // onu AÇIKÇA ezmeli; "kural yok" yeterli değil (eski katman hâlâ yürürlükte).
  check(
    'rozet kabi sabit dar değil (max-width: none ile ezilir)',
    badgeRules.some((r) => /max-width:\s*none/.test(r))
  );
  check(
    'rozet kabi taşmayı gizlemiyor (overflow: visible ile ezilir)',
    badgeRules.some((r) => /overflow:\s*visible/.test(r))
  );
  check('rozetler sığmazsa sarar (flex-wrap: wrap)', badgeRules.some((r) => /flex-wrap:\s*wrap/.test(r)));

  const inner = (appJs.match(/<span class="seg-badges">([^`]*)<\/span>/) || [])[1] || '';
  check(
    'durum rozeti ilk sırada (kırpılacaksa en önemsiz kırpılsın)',
    inner.includes('${state}') && inner.indexOf('${state}') < inner.indexOf('${spk}')
  );
  check(
    'dar ekranda rozetler metnin altına iner',
    /@media[^{]*max-width:\s*1200px[\s\S]{0,400}grid-column:\s*3/.test(rl)
  );
}

// --- 3. Token disiplini --------------------------------------------------
// Okuma katmanı metin rengini ham hex ile yazmamalı.
console.log('\n[3] Token disiplini');
const layerColorHex = [...layer.matchAll(/^\s*color:\s*(#[0-9a-fA-F]{3,6})/gm)];
check(
  'okuma katmanında ham `color: #hex` yok',
  layerColorHex.length === 0,
  layerColorHex.length ? `${layerColorHex.length} yerde` : ''
);
// Ham hex yalnız tema tanımında (tokens.css) bulunmalı.
const layerBgHex = [...layer.matchAll(/^\s*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/gm)];
check(
  'okuma katmanında ham `background: #hex` yok',
  layerBgHex.length === 0,
  layerBgHex.length ? `${layerBgHex.length} yerde` : ''
);

// --- 4. Yükleme sırası ---------------------------------------------------
console.log('\n[4] Stil yükleme sırası');
const iTokens = html.indexOf('tokens.css');
const iApp = html.indexOf('app.css');
const iLayer = html.indexOf('reading-layer.css');
check('tokens.css bağlı', iTokens > -1);
check('reading-layer.css bağlı', iLayer > -1);
check('tokens.css app.css ten önce', iTokens > -1 && iApp > -1 && iTokens < iApp);
check('okuma katmanı en sonda (yamaları ezer)', iLayer > iApp);

// --- 5. Tema bütünlüğü ---------------------------------------------------
console.log('\n[5] Tema bütünlüğü');
for (const name of ['light', 'dark', 'sepia']) {
  const t = themes[name];
  const missing = ['bg', 'surface', 'ink', 'ink-2', 'ink-3', 'line', 'accent'].filter((k) => !t[k]);
  check(`${name} teması tam`, missing.length === 0, missing.join(', '));
}
// FOUC önlemi: satır içi betik ilk boyamadan önce temayı yazmalı.
check('FOUC önleyici satır içi betik var', /dataset\.theme/.test(html) && html.indexOf('dataset.theme') < html.indexOf('app.css'));
// Tema tercihleri JS tarafında da tanımlı.
const js = read('assets/app.js');
for (const key of ['akis.theme', 'akis.density', 'akis.fontscale']) {
  check(`tercih anahtarı ${key} hem HTML hem JS'te`, html.includes(key) && js.includes(key));
}

// --- 6. Erişilebilirlik --------------------------------------------------
console.log('\n[6] Erişilebilirlik');
check('hareket azaltma tercihi destekleniyor', /prefers-reduced-motion/.test(tokens));
check('yüksek karşıtlık tercihi destekleniyor', /prefers-contrast/.test(tokens));
check('odak halkası tanımlı', /--focus-ring/.test(tokens) && /:focus-visible/.test(layer));
check('tema seçenekleri radiogroup', /role="radiogroup"/.test(js) && /aria-checked/.test(js));
// Uyarılar yalnız renkle anlatılmamalı: metin + kenarlık da var.
check('uyarı kutuları kenarlık + metin taşıyor', /\.warn-box[\s\S]{0,200}border:/.test(layer));

// --- v2.82 — Yerleşim: kesilen öğe olmamalı --------------------------------
// Kullanıcı: "son değişikliklerde bazı görsel sorunlar olmuş."
// Üç gerçek hata vardı; hepsi CSS seçici/taşma sınıfındandı.
console.log('\n[Yerleşim] Taşma ve seçici sızıntısı');
{
  const rl = read('assets/reading-layer.css');

  // 1) .sd-field > span, .sd-spk-pick sarmalayıcısını ezmemeli.
  const fieldSpan = rl.match(/#view-audio \.sd-field > span[^{]*\{[^}]*\}/g) || [];
  const leaky = fieldSpan.filter((r) => !/:not\(\.sd-spk-pick\)/.test(r));
  check('sd-field span kuralı .sd-spk-pick\'i dışlar', leaky.length === 0, leaky.join(' | '));

  // 2) Araç çubuğu ve dalga çubuğu kesmemeli (nowrap + hidden yasak).
  const compact = rl.match(/#view-audio \.compact-bar \{[^}]*\}/g) || [];
  const nowrap = compact.filter((r) => /nowrap/.test(r) && /overflow:\s*hidden/.test(r));
  check('compact-bar öğe kesmiyor (nowrap+hidden yok)', nowrap.length === 0, nowrap.join(' | '));
  check('compact-bar alt satıra inebiliyor', compact.some((r) => /flex-wrap:\s*wrap/.test(r)));

  // Dalga çubuğu: v2.82'de wrap denendi ama 5 satıra kırıldı (ölçüldü: 84px).
  // Doğru çözüm İKİ satırlı grid: ipucu üstte, araçlar altta tek satır.
  const waveBar = rl.match(/#view-audio \.sd-wave-bar \{[^}]*\}/g) || [];
  check(
    'sd-wave-bar iki satırlı grid (ipucu + araçlar)',
    waveBar.some((r) => /display:\s*grid/.test(r) && /grid-template-areas/.test(r)),
    waveBar.join(' | ')
  );
  check(
    'araç satırı tek satırda kalır (yatay kaydırma)',
    /sd-wave-tools \{[^}]*overflow-x:\s*auto/.test(rl) && /sd-wave-tools > \* \{[^}]*flex:\s*0 0 auto/.test(rl)
  );

  // 3) Toplu onay düğmesi onay ailesinde (yeşil) görünmeli.
  check('toplu onay düğmesi yeşil ailede', /\[data-bulk-approve\][^{]*\{[^}]*var\(--green\)/.test(rl));
}

console.log(`\n== Sonuç: ${failures === 0 ? 'TASARIM TUTARLI' : failures + ' SAPMA VAR'} ==`);
process.exit(failures === 0 ? 0 : 1);
