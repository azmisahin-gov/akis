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
  light: themeTokens(tokens, "html[data-theme='light']"),
  dark: themeTokens(tokens, "html[data-theme='dark']"),
  sepia: themeTokens(tokens, "html[data-theme='sepia']")
};
// Açık tema `:root` ile birlikte tanımlanır; oradan da topla.
const rootTokens = themeTokens(tokens, 'html:root');
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
  // v2.139 — KARAR GÜNCELLENDİ: kısa listelerde panel kaydırmaz (v2.121).
  // Uzun listede (362 bölüm) panel ekrandan uzun olursa, görünür kalabilmek
  // için KENDİ İÇİNDE kayar; ama yalnız `max-height` ile SINIRLI olarak.
  // Sınırsız `overflow-y:auto` (sabit yükseklik) hâlâ yasak.
  const scrollsInside = /overflow-y:\s*(auto|scroll)/.test(allDetail);
  check(
    'seg-detail kaydırıyorsa yüksekliği SINIRLI (max-height var)',
    !scrollsInside || /max-height:\s*[^;]+/.test(allDetail),
    scrollsInside ? allDetail.trim().slice(0, 120) : ''
  );
  check(
    'seg-detail yüksekliği sabitlenmiyor (içeriği kadar uzar)',
    !/height:\s*(100%|[0-9.]+px)\s*(!important)?/.test(allDetail.replace(/min-height[^;]*;/g, '')),
    allDetail.trim().slice(0, 80)
  );
}

// --- 2n. Uzun listede detay görünür kalır (v2.139) ------------------------
// ÖLÇÜM (v2.138, 362 bölüm): listede %45'e kaydırıp 181. bölüme tıklayınca
// detay "Bölüm 181 / 362" olarak GÜNCELLENİYOR ama blok −5.899 px'te
// (ekranın 5,9 bin px üstünde) kalıyordu; editör görünmüyordu. Tıklama
// "hiçbir şey olmadı" gibi hissediliyordu (iki modda da).
// KURAL: detay paneli yapışkan (sticky) ve ekran yüksekliğiyle sınırlı.
console.log('\n[2n] Uzun listede detay görünür kalır (v2.139)');
{
  const rl = read('assets/reading-layer.css');
  const stickyRule = (rl.match(/#view-audio \.seg-detail\s*\{[^}]*\}/g) || []).find((r) => /position:\s*sticky/.test(r)) || '';
  check('detay paneli yapışkan (position: sticky)', /position:\s*sticky/.test(stickyRule), stickyRule.slice(0, 80));
  check('yapışma noktası tanımlı (top)', /top:\s*[0-9]+px/.test(stickyRule));
  check('yükseklik ekranla sınırlı (max-height)', /max-height:\s*calc\(100vh/.test(stickyRule));
}

// --- 2o. Masaüstü kabuğu: sabit çerçeve, paneller kendi kaydırır (v2.140) --
// ÖLÇÜM (v2.139, 362 bölüm): ses görünümü TEK sayfa olarak 14.156 px; tüm
// bölümler aynı kaydırmada akıyor. Masaüstü uygulaması böyle çalışmaz.
// KURAL (≥901 px): kabuk sabit (html/body/main-area taşmaz), kayıt sütunu +
// bölüm listesi + düzenleme paneli kendi içinde kayar; durum çubuğu sabittir.
// ≤900 px: eski tek-kaydırma davranışı (dar ekran yedeği) korunur.
console.log('\n[2o] Masaüstü kabuğu: sabit çerçeve, paneller kendi kaydırır (v2.140)');
{
  const rl = read('assets/reading-layer.css');
  // Yorumlar çıkarılır: yorum içindeki `{...}` örneği regex'i bozuyordu.
  const rlNoComments = rl.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = rlNoComments.indexOf('@media (min-width: 901px)');
  const block = i >= 0 ? rlNoComments.slice(i, i + 8000) : '';
  check('masaüstü kabuğu tanımlı (≥901 px)', i >= 0);
  check('ana alan taşmıyor (kabuk sabit)', /\.main-area\s*\{[^}]*overflow:\s*hidden\s*!important/.test(block));
  check(
    'ses görünümü üç bölmeli ızgara',
    /#view-audio\.active\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*220px\s+minmax\(0,\s*1fr\)/.test(block)
  );
  check('bölüm listesi kendi içinde kayar', /#view-audio \.seg-list\s*\{[^}]*overflow-y:\s*auto\s*!important/.test(block));
  check(
    'düzenleme paneli kendi içinde kayar (yapışkan değil)',
    /#view-audio \.seg-detail\s*\{[^}]*position:\s*static[^}]*overflow-y:\s*auto/.test(block)
  );
  check('oynatıcı şeridi korunur (dalga gizlenir)', /#view-audio \.listen-strip \.wave-canvas\s*\{[^}]*display:\s*none/.test(block));
}

// --- 2p. Çalışma modu TAMAMEN kaldırıldı (v2.142) --------------------------
// Kayıtlar sürekli solda olduğu için çalışma modu, "← Kayıt listesine dön" ve
// "⛶ Çalışma modu" düğmesi tamamen kaldırıldı (kullanıcı: "o buton gereksiz
// olmuş, kaldıralım"). Dar ekranda da ayrı mod yok; liste her zaman görünür.
console.log('\n[2p] Çalışma modu tamamen kaldırıldı (v2.142)');
{
  const html = read('index.html');
  const js = read('assets/app.js');
  check('çalışma çubuğu HTML\'den kaldırıldı', !/id="workspaceBar"/.test(html));
  check('çalışma modu düğmesi HTML\'den kaldırıldı', !/id="workspaceBtn"/.test(html));
  check('çalışma modu mantığı kaldırıldı (setWorkspace yok)', !/function setWorkspace\b/.test(js));
  check('ws-mode sınıfı artık kullanılmıyor', !/ws-mode/.test(js));
}

// --- 2q. Kayıt sütunu: başlık görünür, liste tek kaydırma (v2.142) ---------
// Kullanıcı devtools'ta gördü: kayıt sütununun başlığı ("9 kayıt") gizliydi ve
// liste kendi içinde ayrıca kayıyordu. 100 kayıtta iki kaydırma çubuğu olur.
console.log('\n[2q] Kayıt sütunu: başlık görünür, liste tek kaydırma (v2.142)');
{
  const rl = read('assets/reading-layer.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const i = rl.indexOf('@media (min-width: 901px)');
  const block = i >= 0 ? rl.slice(i, i + 9000) : '';
  check(
    'kayıt sütunu başlığı görünür',
    /#view-audio > \.panel:not\(\.detail-panel\) \.panel-heading\s*\{[^}]*display:\s*flex/.test(block)
  );
  check(
    'kayıt listesi DİKEY ve sütunla birlikte kayar',
    /#view-audio > \.panel:not\(\.detail-panel\) \.audio-list\s*\{[^}]*display:\s*grid[^}]*max-height:\s*none[^}]*overflow:\s*visible/.test(
      rl
    )
  );
}

// --- 2r. Detay paneli kırpmıyor: alt içerik erişilebilir (v2.143) ---------
// Kullanıcı: "sd-left diye bir şey görüyorum; sd-meta'nın yarısı görünmüyor,
// ondan sonrası yok." ÖLÇÜM: panel 385 px, içerik 795 px; v2.129'un
// `overflow: visible !important` kuralı panelin kaydırmasını eziyordu →
// içerik `.seg-workspace`in `overflow:hidden`ı tarafından KIRPILIYORDU.
// KURAL (≥901 px): detay paneli kendi içinde kayar; alt içerik erişilebilir.
console.log('\n[2r] Detay paneli kırpmıyor (v2.143)');
{
  const rl = read('assets/reading-layer.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const i = rl.indexOf('@media (min-width: 901px)');
  const block = i >= 0 ? rl.slice(i, i + 9000) : '';
  check(
    'masaüstünde detay paneli kendi içinde kayar',
    /#view-audio \.seg-detail\s*\{[^}]*overflow-y:\s*auto\s*!important/.test(block)
  );
  check(
    'panel yüksekliği sabit değil (max-height: none)',
    /#view-audio \.seg-detail\s*\{[^}]*max-height:\s*none/.test(block)
  );
}

// --- 2s. Canlı vurgu metin kutusunun İÇİNDE (v2.188) ----------------------
// KULLANICI: "vurguyu text box içinde yaptır." Ayrı `.sd-follow` şeridi
// kaldırıldı; okunan kelime textarea'nın arkasındaki saydam `.sd-hl`
// katmanında vurgulanır. Metin tek yerde kalır, ~48 px dikey yer kazanılır.
console.log('\n[2s] Canlı vurgu metin kutusunun içinde (v2.188)');
{
  const rl = read('assets/reading-layer.css');
  const js = read('assets/app.js');
  check('vurgu katmanı .sd-hl çizilir', /class="sd-hl"/.test(js));
  check('vurgu katmanı mutlak konumlu', /#view-audio \.sd-hl\s*\{[^}]*position:\s*absolute/.test(rl));
  check('vurgu kelimesi arka planla işaretlenir', /\.sd-hl \.hl-word\s*\{[^}]*background/.test(rl));
  check('eski ayrı şerit kaldırıldı', !/class="sd-follow"/.test(js) && !/#view-audio \.sd-follow\s*\{/.test(rl));
  check('kelime konumu saf fonksiyonla bulunur', /function karaokeCharSpans\(/.test(js));
  check('katman hazırlığı metin kutusunu hedefler', /ensureFollowStrip[\s\S]{0,220}sd-ta-wrap/.test(js));
}

// --- 2t. Listede bitiş zamanı iki satır (v2.152) ---------------------------
// Kullanıcı: "listedeki saat başlangıç mı bitiş mi belli değil." KURAL: zaman
// hücresi iki satır (başlangıç / → bitiş), ms biçimi korunur, KESME YOK.
console.log('\n[2t] Listede başlangıç–bitiş YAN YANA (v2.152 → v2.186)');
{
  const rl = read('assets/reading-layer.css');
  const js = read('assets/app.js');
  check('zaman hücresi TEK satır (flex row)', /#view-audio \.seg-item \.seg-time\s*\{[^}]*flex-direction:\s*row/.test(rl));
  check('başlangıç sınıfı taşınır', /class="seg-start"/.test(js));
  check('bitiş sınıfı taşınır', /class="seg-end"/.test(js));
  check('tire ayırıcı var', /class="seg-dash"/.test(js));
  // v2.186: listede KISA saat (ms YOK); ms DETAYDA düzenlenebilir kalır.
  check('bitiş zamanı kayıttan yazılır (kısa biçim)', /seg-end">\$\{esc\(shortClock\(s\.end\)\)/.test(js));
  check('detayda ms korunur (start/end girdileri tam)', /data-key="start"[^>]*value="\$\{esc\(s\.start/.test(js));
  check('zaman hücresinde kesme (ellipsis) yok', !/#view-audio \.seg-time\s*\{[^}]*text-overflow/.test(rl));
  check('zaman sütunu kısa saate göre (132px)', /#view-audio \.seg-item\s*\{[^}]*grid-template-columns:\s*26px 132px/.test(rl));
}

// --- 2u. Detay paneli sıkıştırma (v2.153) --------------------------------
// ÖLÇÜM (v2.152): panel 577 px, içerik 795 px; sd-meta ve gözlem düğmeleri
// ekran dışında. Sıkıştırma metin alanını ve analiz kutusunu KORUR.
console.log('\n[2u] Detay paneli sıkıştırma (v2.153)');
{
  const rl = read('assets/reading-layer.css');
  const js = read('assets/app.js');
  // v2.180: konuşmacı/kontrol başlığın altına taşındı; yerleşim grid değil
  // FLEX satır (niyet aynı: tek satır, sığmazsa sarar).
  check('konuşmacı/kontrol tek satır (flex)', /#view-audio \.sd-meta\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/.test(rl));
  // v2.189: zaman alanları dalga kutusunun ÜSTÜNDE yarı saydam şeritte.
  const iCanvas = js.indexOf('class="sd-canvas-wrap');
  const iTimes = js.indexOf('class="sd-times sd-times-overlay"');
  check('zaman şeridi dalga kutusunun içinde', iCanvas > 0 && iTimes > iCanvas, `canvas=${iCanvas} times=${iTimes}`);
  check('zaman şeridi yarı saydam', /\.sd-times-overlay\s*\{[^}]*color-mix\(/.test(rl));
  check('zaman şeridi tıklamayı geçirir', /\.sd-times-overlay\s*\{[^}]*pointer-events:\s*none/.test(rl));
  check('sıra: başlangıç → süre → bitiş', (() => {
    const b = js.slice(iTimes, iTimes + 1200);
    const a = b.indexOf('data-key="start"');
    const d = b.indexOf('class="sd-dur"');
    const e = b.indexOf('data-key="end"');
    return a >= 0 && d > a && e > d;
  })());
  // v2.177: ikincil araçlar artık SATIR MENÜSÜNDE (⋮). Katlama kaldırıldı;
  // aynı işler kaybolmadı, satır menüsüne taşındı.
  check('ikincil araçlar satır menüsünde (⋮)', /data-seg-menu="/.test(js));
  check('menü aynı işleri taşır (birleştir/böl/çözümle/sil)',
    /data-merge-next/.test(js) && /data-split-seg/.test(js) && /data-retranscribe-seg/.test(js) && /data-delete-seg/.test(js));
  check('detayda katlama kalmadı', !/<details class="sd-more">/.test(js));
  // v2.191: metin kutusu kalan yüksekliği alır; taban 160 px, kendi içinde kayar.
  check('metin alanı tabanı 120 px', /#view-audio \.seg-detail \.sd-text \.sd-editor \.sd-ta-wrap textarea\s*\{[^}]*min-height:\s*120px/.test(rl));
  check('metin alanı 11 px altına inmiyor', !/sd-text textarea[^}]*font-size:\s*(?:[0-9]|10)px/.test(rl));
}

// --- 2v. Tek panel, iki bölge (v2.154) -----------------------------------
// ÖLÇÜM (v2.153): detayda 38 kontrol; 16'sı kaydırmadan görünmüyordu.
// KURAL: sabit başlıkta günlük iş (gezinme, dinle, ONAYLA, teknik anahtarı),
// metin alanı kalan yüksekliği alır, teknik bölüm istenince açılır.
console.log('\n[2v] Tek panel, iki bölge (v2.154)');
{
  const js = read('assets/app.js');
  const rl = read('assets/reading-layer.css');
  // v2.186: "✓ Onayla" düğmesi başlıktan kaldırıldı (Kontrol seçicisi + Enter
  // aynı işi yapar). Eylem GÖRÜNÜR kalır: satır menüsünde "✓ Onayla".
  check('onay eylemi satır menüsünde', /role="menuitem" data-approve-seg="\$\{index\}"/.test(js));
  check('onay eylemi Enter ile de çalışır', /approveActiveSegment/.test(js));
  check('teknik bölüm .sd-tech taşıyor', /class="sd-left sd-tech"/.test(js));
  check('alt eylem satırı kaldırıldı (.sd-actions yok)', !/class="sd-actions"/.test(js));
  check('metin kutusu kalan yüksekliği alır (flex:1)', /#view-audio \.seg-detail \.sd-text \.sd-editor\s*\{[^}]*flex:\s*1 1 auto/.test(rl));
  check('metin alanı kalan yüksekliği alır (flex:1)', /#view-audio \.seg-detail \.sd-text \.sd-editor \.sd-ta-wrap textarea\s*\{[^}]*flex:\s*1 1 auto/.test(rl));
  // v2.186: TEKNİK DÜĞMESİ KALDIRILDI — bölüm her zaman görünür, çizim koşulsuz.
  check('teknik düğmesi yok', !/data-tech-toggle/.test(js));
  check('teknik bölüm her zaman görünür (hidden koşulu yok)', /class="sd-left sd-tech">/.test(js));
  check('analiz çizimi koşulsuz', /attachSegWave\(m, idx\);\s*\n\s*setAnalysisMode\(m, analysisMode\);/.test(js));
}

// --- 2w. Dar ekranda yinelenen başlık gizlenir (v2.159) -------------------
// ÖLÇÜM (v2.158, 900 px): "Ses kayıtları" (sayfa) + "MATERYAL LİSTESİ / Ses
// kayıtları" + "SEÇİLİ KAYIT / <dosya adı>" + karttaki dosya adı → tek kayıt
// için 4 başlık. Dar ekranda detay paneli başlığı GİZLENİR (kart kendi adını
// ve eylemlerini taşır); masaüstünde başlık korunur.
console.log('\n[2w] Dar ekranda yinelenen başlık gizlenir (v2.159)');
{
  const rl = read('assets/reading-layer.css');
  check('dar ekranda detay başlığı gizli', /@media \(max-width: 900px\)[\s\S]{0,600}detail-panel > \.panel-heading\s*\{\s*display:\s*none/.test(rl));
  check('masaüstünde başlık korunur', !/@media \(min-width: 901px\)[\s\S]{0,600}detail-panel > \.panel-heading\s*\{\s*display:\s*none/.test(rl));
}

// --- 2x. Kozmetik düzen: boş alan yok, hiyerarşi var (v2.160) -------------
// ÖLÇÜM (v2.159): genel bakışta iş akışı kartı ~290 px boş alan taşıyordu;
// istatistik kartları düz metindi. KURAL: kart içeriği kadar uzar, sayı
// hiyerarşisi vardır, dar ekranda kartlar birbirinin üstüne binmez.
console.log('\n[2x] Kozmetik düzen: boş alan yok, hiyerarşi var (v2.160)');
{
  const rl = read('assets/reading-layer.css');
  check('genel bakış kartları içeriğe göre hizalanır', /#view-overview \.content-grid\s*\{[^}]*align-items:\s*start/.test(rl));
  check('kart alanı büyümez (boşluk yok)', /#view-overview \.content-grid\s*\{[^}]*flex-grow:\s*0/.test(rl));
  check('kart alanı kısalmaz (üst üste binmez)', /#view-overview \.content-grid\s*\{[^}]*flex-shrink:\s*0/.test(rl));
  check('istatistik kartında ikon yuvası var', /#view-overview \.stat-card::before\s*\{/.test(rl));
  check('sayı hiyerarşisi (30 px token)', /#view-overview \.stat-card > strong\s*\{[^}]*font-size:\s*var\(--fs-3xl\)/.test(rl));
  check('adım açıklamaları geniş ekranda görünür', /@media \(min-width: 901px\)[\s\S]{0,200}workflow-step small\s*\{\s*display:\s*block/.test(rl));
  check('sorular metni ölçülü ve ortalı', /#view-questions \.split-body textarea\s*\{[^}]*margin-inline:\s*auto/.test(rl));
  check('yeni bölümde ham hex yok', !/v2\.160[\s\S]*?#[0-9a-fA-F]{3,6}/.test(rl));
}

// --- 2y. Punto ölçeği ve tema özgüllüğü (v2.161/v2.162) -------------------
// BULGU: tema blokları `[data-theme=…]` (0,1,0) idi; app.css `:root` da
// (0,1,0) ve sonra yüklendiği için 7 ortak token HER temada açık değeri
// alıyordu (koyu temada başlıklar okunamıyordu). Ayrıca punto ölçeği token
// değildi: app.css 13 farklı punto kullanıyor, okuma katmanında ham px kalıyordu.
console.log('\n[2y] Punto ölçeği ve tema özgüllüğü (v2.161/v2.162)');
{
  const rl = read('assets/reading-layer.css');
  const tok = read('assets/tokens.css');
  // Tema seçicileri app.css :root'tan daha özgül olmalı.
  for (const th of ['light', 'dark', 'sepia']) {
    check(`${th}: tema seçicisi özgül (html[…])`, new RegExp(`html\\[data-theme='${th}'\\]`).test(tok));
  }
  // app.css'in kendi adları temaya bağlı.
  for (const legacy of ['--navy', '--blue', '--muted', '--pale']) {
    check(`${legacy} temaya bağlı`, new RegExp(`${legacy}: var\\(--`).test(tok));
  }
  // Ölçek: artan sıra ve 11 px taban.
  const fs = (name) => {
    const m = tok.match(new RegExp(`--fs-${name}:\\s*([0-9.]+)px`));
    return m ? Number(m[1]) : null;
  };
  const order = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
  const vals = order.map(fs);
  check('punto ölçeği eksiksiz', vals.every((v) => v != null), vals.join('/'));
  check('punto ölçeği artan', vals.every((v, i) => i === 0 || v > vals[i - 1]), vals.join('/'));
  check('en küçük punto 11 px', vals[0] === 11, String(vals[0]));
  // Okuma katmanında ham punto kalmadı (tek kaynak).
  check('okuma katmanında ham font-size yok', !/font-size:\s*\d+px/.test(rl));
  // Büyütme kademeleri tabanın altına inmez.
  const large = tok.match(/\[data-fontscale='large'\]\s*\{([^}]*)\}/)[1];
  const xlarge = tok.match(/\[data-fontscale='xlarge'\]\s*\{([^}]*)\}/)[1];
  const minOf = (blk) => Math.min(...[...blk.matchAll(/--fs-[\w]+:\s*([0-9.]+)px/g)].map((m) => Number(m[1])));
  check('büyük yazı tabanı düşürmez', minOf(large) >= 12, String(minOf(large)));
  check('çok büyük yazı tabanı düşürmez', minOf(xlarge) >= 13, String(minOf(xlarge)));
}

// --- 2z. Tema tam uygulama (v2.162) ---------------------------------------
// ÖLÇÜM: app.css'te 151 sabit background ve onlarca sabit metin rengi vardı;
// koyu temada sorular paneli BEYAZ, "▶ Çal" 1.16:1, bölüm metni 1.67:1,
// rozetler açık çipte kalıyordu. KURAL: yüzey/metin rengi token'dan gelir.
console.log('\n[2z] Tema tam uygulama (v2.162)');
{
  const rl = read('assets/reading-layer.css');
  const js = read('assets/app.js');
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // paper/print dışında saf beyaz zemin kalmadı.
  const uiRules = [...strip(appCss).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => !/paper|print/i.test(m[1]));
  const white = uiRules.filter((m) => /background(?:-color)?\s*:\s*#fff(?:fff)?\b/i.test(m[2]));
  check('paper/print dışında #fff zemin yok', white.length === 0, white.slice(0, 3).map((m) => m[1].trim().slice(0, 30)).join(' | '));
  // Rozet/uç yüzeyleri token'a bağlı.
  for (const hex of ['#e8f5ef', '#fdf3f3', '#fff4e3', '#f1eefb', '#f7fafc', '#edf3f8']) {
    check(`${hex} token'a çevrildi`, !new RegExp('background[^;}]*' + hex, 'i').test(strip(appCss)));
  }
  // Dolu düğmeler tema accent'i kullanır.
  check('oynat düğmesi accent kullanır', /\.main-play\{[^}]*background:var\(--accent\)/.test(appCss));
  check('split numarası accent kullanır', /\.split-no\{background:var\(--accent\)/.test(appCss));
  // Tuval renkleri token'dan okunur ve tema değişince yeniden çizilir.
  check('tuval renkleri token\'dan', /function themeVar\(/.test(js) && /themeVar\('--surface-2'/.test(js));
  check('tema değişince tuval tazelenir', /__segWaveRedraw\?\.\(\)/.test(js));
}

// --- 2aa. Durum renkleri tek anlam (v2.163) -------------------------------
// BULGU (kullanıcı gözlemi): "seg-tool play-main siyah zemin/mavi yazı",
// "mini-button follow-btn on kahverengi zemin/beyaz yazı". Ölçüm: `.play-main`
// 1.1:1, `#view-audio .follow-btn.on` altın zemin + koyu yazı (3.03:1).
// KURAL: altın yalnız UYARI/GÖZLEM; açık (on) durumu accent-soft; birincil
// eylem accent. Durum rengi ham hex olamaz.
console.log('\n[2aa] Durum renkleri tek anlam (v2.163)');
{
  const ac = read('assets/app.css');
  const rl = read('assets/reading-layer.css');
  const rules = [...(ac + '\n' + rl).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ sel: m[1].replace(/\s+/g, ' ').trim(), body: m[2] }))
    .filter((r) => /(^|[\s,])\.(on|is-active)\b/.test(r.sel) || /:(hover|focus)/.test(r.sel) === false && /\.on\b/.test(r.sel));
  const goldBg = rules.filter((r) => /background[^;]*var\(--gold\)/.test(r.body));
  check('açık durumda altın zemin yok', goldBg.length === 0, goldBg.slice(0, 2).map((r) => r.sel).join(' | '));
  const hexBg = rules.filter((r) => /background[^;]*#[0-9a-fA-F]{3,6}/.test(r.body));
  check('açık durumda ham hex zemin yok', hexBg.length === 0, hexBg.slice(0, 2).map((r) => r.sel).join(' | '));
  check('takip düğmesi açıkken accent-soft', /#view-audio \.follow-btn\.on\{[^}]*background:var\(--accent-soft\)/.test(ac));
  check('dinle düğmesi çalarken yeşil', /#view-audio \.play-main\.on\{[^}]*background:var\(--green\)/.test(ac));
  check('seg-tool açıkken accent-soft', /\.seg-tool\.on[^{]*\{[^}]*background: var\(--accent-soft\)/.test(rl));
  check('birincil mini-button dolu accent', /\.mini-button\.primary \{[^}]*background: var\(--accent\)/.test(rl));
}

// --- 2f. Vurgu katmanı metrik değiştirmiyor (v2.188) ---------------------
// KURAL: vurgu katmanı textarea ile AYNI puntoda, satır aralığında ve dolguda
// olmalı; yoksa kelime metnin üstünde kayar. Vurgu yalnız ARKA PLANLA yapılır
// (kalın/dolgu satır sonlarını kaydırır).
console.log('\n[2f] Vurgu katmanı metrik değiştirmiyor (v2.188)');
{
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const stripMedia = (css) => css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const base = stripMedia(stripComments(layer));
  const ta = [...base.matchAll(/#view-audio \.seg-detail \.sd-text \.sd-editor \.sd-ta-wrap textarea\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  const hl = [...base.matchAll(/#view-audio \.sd-hl\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('textarea dolgusu tanımlı', /padding:\s*8px 10px/.test(ta));
  check('vurgu katmanı aynı dolguyu taşır', /padding:\s*8px 10px/.test(hl), hl.trim().slice(0, 80));
  check('textarea aynı puntoyu taşır', /font-size:\s*var\(--fs-sm\)/.test(ta));
  check('vurgu katmanı aynı puntoyu taşır', /font-size:\s*var\(--fs-sm\)/.test(hl));
  check('vurgu katmanı aynı satır aralığını taşır', /line-height:\s*1\.7/.test(hl));
  const word = [...base.matchAll(/#view-audio \.sd-hl \.hl-word\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';');
  check('aktif kelime kalınlaştırmıyor (metrik sabit)', !/font-weight/.test(word), word.trim().slice(0, 80));
  check('aktif kelime dolgu eklemiyor (metrik sabit)', !/(^|;)\s*padding/.test(word), word.trim().slice(0, 80));
  check('aktif kelime arka planla vurgulanıyor', /background/.test(word));
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
  // v2.186: rozetler SAĞA yaslanır; DURUM rozeti en sağdadır (kullanıcı:
  // "st-approved kısmını sağa yasasan daha düzgün olmaz mı?"). Kırpma yok,
  // sarma var; sağ kenardaki rozet her zaman görünür.
  check(
    'durum rozeti EN SAĞDA',
    inner.includes('${state}') && inner.lastIndexOf('${state}') > inner.indexOf('${spk}')
  );
  check(
    'rozetler sağa yaslı',
    badgeRules.some((r) => /justify-content:\s*flex-end/.test(r))
  );
  check(
    'dar ekranda rozetler metnin altına iner',
    /@media[^{]*max-width:\s*1200px[\s\S]{0,400}grid-column:\s*3/.test(rl)
  );
}

// --- 2k. Görünüm kutusu içerikle büyür (v2.131) ----------------------------
// ÖLÇÜM (v2.130, 60 bölüm, 1440×900):
//   #view-audio kutusu 635 px · içerik 2582 px · flex: 1 1 auto
//   → yapışkan çalışma çubuğu 635 px sonra bırakıyor (scroll 700'de top −42)
//   → durum çubuğu içeriğin ÜSTÜNE biniyor (2 satır) ve tıklamayı yutuyor
//     (elementFromPoint → .sb-item)
// KURAL: görünüm kutusu yükseklik dayatmaz; içeriği kadar uzar. Kaydırma
// .main-area'da kalır, çubuk tüm listeyi kapsar, durum çubuğu içeriğin ALTINDA.
console.log('\n[2k] Görünüm kutusu içerikle büyür (v2.131)');
{
  const rl = read('assets/reading-layer.css');
  check(
    'ses görünümü kutusu içerikle büyür (flex: 0 0 auto)',
    /#view-audio\.active\s*\{[^}]*flex:\s*0\s+0\s+auto/.test(rl)
  );
  check('ses görünümü iç kaydırma yapmaz', /#view-audio\.active\s*\{[^}]*overflow:\s*visible/.test(rl));
}

// --- 2l. Durum çubuğu kesmez (v2.133) --------------------------------------
// ÖLÇÜM (v2.132, 60 bölüm):
//   1440 px'te tüm öğeler sığıyor (273+38+53+280+102+246).
//   1100 px'te 6 öğenin 6'sı da kırpılıyor (ör. sbCase 241/273,
//   sbCheckWrap 248/280); 900 px'te 5 öğe + çalışma çubuğu başlığı.
// KURAL: durum çubuğu öğesi ellipsis ile KESİLMEZ; sığmayan öğe alt satıra
// iner (bar yüksekliği içerikle büyür). Çalışma çubuğu başlığı tek satır
// kalabilir ama tam ad `title` ipucunda bulunmalıdır.
console.log('\n[2l] Durum çubuğu kesmez (v2.133)');
{
  const rl = read('assets/reading-layer.css');
  const appJs = read('assets/app.js');
  const i = rl.indexOf('@media (max-width: 1200px)');
  const window1200 = i >= 0 ? rl.slice(i, i + 1200) : '';
  check('dar ekranda durum çubuğu sarar (flex-wrap)', /\.statusbar\s*\{[^}]*flex-wrap:\s*wrap/.test(window1200));
  check('durum çubuğu yüksekliği içerikle büyür', /\.statusbar\s*\{[^}]*height:\s*auto/.test(window1200));
  check(
    'durum çubuğu öğeleri kesilmez (normal + visible + clip)',
    /\.statusbar \.sb-item\s*\{[^}]*white-space:\s*normal[^}]*overflow:\s*visible[^}]*text-overflow:\s*clip/.test(window1200)
  );
}

// --- 2m. Rapor kâğıdı dar ekranda kırpılmıyor (v2.137) ---------------------
// ÖLÇÜM (v2.136): #view-report overflow-x:hidden. 760 px'te kâğıt 678 px,
// görünüm 642 px → 26 px sessiz kesme; 600 px'te 40 px. KURAL: dar ekranda
// iç boşluk azalır ve tablo hücreleri SARAR; kâğıdın sağ kenarı görünür kalır.
console.log('\n[2m] Rapor kâğıdı dar ekranda kırpılmıyor (v2.137)');
{
  const rl = read('assets/reading-layer.css');
  const blocks = [...rl.matchAll(/@media \(max-width: 900px\) \{[\s\S]{0,600}?\n\}/g)].map((m) => m[0]);
  const block = blocks.find((b) => /report-paper/.test(b)) || '';
  check('dar ekranda rapor iç boşluğu azalır', /#view-report \.report-paper\s*\{[^}]*padding:/.test(block));
  check(
    'tablo hücreleri sarar (overflow-wrap: anywhere)',
    /\.paper-table th,[\s\S]{0,100}\.paper-table td\s*\{[^}]*overflow-wrap:\s*anywhere/.test(block)
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

// --- 4b. Simge (favicon) -------------------------------------------------
// Denetim (v2.135): tarayıcı /favicon.ico istiyor, 404 dönüyordu. Simge
// tanımlanmamışsa sekmede kırık/boş simge görünür.
console.log('\n[4b] Simge (favicon)');
{
  const iconLink = html.match(/<link[^>]+rel="icon"[^>]*>/);
  check('index.html simge bağlantısı taşıyor', !!iconLink);
  const href = iconLink && (iconLink[0].match(/href="([^"]+)"/) || [])[1];
  check('simge dosyası var', !!href && fs.existsSync(path.join(ROOT, href)), href || 'href yok');
  check(
    'kök favicon.ico da var (tarayıcı varsayılan isteği)',
    fs.existsSync(path.join(ROOT, 'favicon.ico'))
  );
}

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
// v2.135 — canlı bölgeler: bildirim ve sürüm notu ekran okuyucuya duyurulur.
check('bildirim (toast) canlı bölge', /id="toast"[^>]*role="status"[^>]*aria-live="polite"/.test(html));
check('sürüm notu canlı bölge', /id="versionNotice"[^>]*role="status"[^>]*aria-live="polite"/.test(html));
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

  // Dalga çubuğu: v2.82'de tek satır + GİZLİ yatay kaydırma vardı; ölçüm
  // (v2.190): 1100 px'te araç satırı 470 px, kap 372 px → "Dalga/Spek/İkisi"
  // düğmeleri görünmüyordu. Görünmez kaydırma sessiz kesmedir. Artık SARAR.
  const waveBar = rl.match(/#view-audio \.sd-wave-bar \{[^}]*\}/g) || [];
  check(
    'sd-wave-bar iki satırlı grid (ipucu + araçlar)',
    waveBar.some((r) => /display:\s*grid/.test(r) && /grid-template-areas/.test(r)),
    waveBar.join(' | ')
  );
  check(
    'araç satırı sığmayan düğmeyi SARAR (kesmez)',
    /sd-wave-tools \{[^}]*flex-wrap:\s*wrap/.test(rl) &&
      /sd-wave-tools \{[^}]*overflow:\s*visible/.test(rl) &&
      /sd-wave-tools > \* \{[^}]*flex:\s*0 0 auto/.test(rl)
  );
  check('analiz görünümü düğmeleri birlikte kalır', /sd-view-modes \{[^}]*flex-wrap:\s*nowrap/.test(rl));

  // 3) Toplu onay düğmesi onay ailesinde (yeşil) görünmeli.
  check('toplu onay düğmesi yeşil ailede', /\[data-bulk-approve\][^{]*\{[^}]*var\(--green\)/.test(rl));
}

console.log('\n[2ab] Künye: zorunlu alanlar ilk ekranda (v2.164)');
{
  // Ölçüm (v2.163): çekmecede 17 alan, ilk ekranda 8; zorunlu #expertName
  // 454 px, #subject 166 px aşağıdaydı. Zorunlu alanlar İSTEĞE BAĞLI
  // alanlardan önce gelmeli; aksi hâlde yeni dosya açan kullanıcı künyeyi
  // tamamlamak için çekmeceyi kaydırmak zorunda kalır.
  const start = html.indexOf('id="caseDrawer"');
  const drawer = html.slice(start, html.indexOf('</aside>', start));
  const pos = (id) => drawer.indexOf('id="' + id + '"');
  const required = ['reportType', 'court', 'fileNo', 'expertName', 'subject'];
  const optional = [
    'assignmentDate', 'assignmentDurationDays', 'dueDate',
    'plaintiff', 'plaintiffCounsel', 'defendant', 'defendantCounsel',
    'caseDate', 'inspectionDate', 'registryNo', 'expertField', 'reportDate',
    'addTeamBtn', 'archiveCaseBtn'
  ];
  check('çekmecede beş zorunlu alan var', required.every((id) => pos(id) >= 0));
  const lastRequired = Math.max(...required.map(pos));
  const firstOptional = Math.min(...optional.map(pos).filter((p) => p >= 0));
  check(
    'zorunlu alanların tümü isteğe bağlı alanlardan ÖNCE',
    lastRequired < firstOptional,
    `son zorunlu ${lastRequired} < ilk isteğe bağlı ${firstOptional}`
  );
  const firstRequired = Math.min(...required.map(pos));
  check(
    'zorunlu blok "Zorunlu bilgiler" başlığı altında',
    /Zorunlu bilgiler/i.test(drawer.slice(0, firstRequired))
  );
}

console.log('\n[2ac] Dar ekranda bölüm işlemleri erişilebilir (v2.165)');
{
  // Ölçüm (v2.164, 900 px, 10 bölüm): bölüm listesi 554–1290 px arasında,
  // "✓ Onayla" düğmesi y=1313 → ekranın 413 px ALTINDA. Dar ekranda liste
  // uzadıkça onay/dinle erişilemez oluyordu. Çözüm: kartın içinde, aynı
  // işleyicileri kullanan yapışkan bir çubuk (yeni mantık YOK).
  const js = read('assets/app.js');
  const rl = read('assets/reading-layer.css');
  const cardStart = js.indexOf('function materialCardHtml');
  const cardEnd = js.indexOf('\nfunction ', cardStart + 10);
  const cardFn = js.slice(cardStart, cardEnd > 0 ? cardEnd : cardStart + 40000);
  check('kart içinde dar ekran çubuğu çiziliyor', /narrowBarHtml\(m\)/.test(cardFn) && /data-narrow-bar/.test(js));
  check('çubuk aynı işleyicileri kullanır (data-approve-seg / data-seg-nav / data-play-active)',
    /data-narrow-bar/.test(js) && /data-approve-seg="\$\{i\}"/.test(js) && /data-seg-nav="prev"/.test(js) && /data-play-active="1"/.test(js));
  check('çubuk yalnız bölüm varsa çizilir', /narrowBarHtml/.test(js) && /segs\.length\s*\?\s*''|!segs\.length\)\s*return ''/.test(js));

  const baseRule = rl.match(/(^|\n)\.narrow-bar\s*\{([^}]*)\}/);
  check('çubuk varsayılan olarak gizli (masaüstü değişmez)',
    !!baseRule && /display:\s*none/.test(baseRule[2]), baseRule ? baseRule[2].trim() : 'kural yok');

  // ≤900 px bloklarından birinde .narrow-bar görünür + yapışkan olmalı.
  let okNarrow = false;
  let re = /@media\s*\(max-width:\s*900px\)/g;
  let m;
  while ((m = re.exec(rl))) {
    const chunk = rl.slice(m.index, m.index + 6000);
    const rule = chunk.match(/\.narrow-bar\s*\{([^}]*)\}/);
    if (rule && /display:\s*flex/.test(rule[1]) && /position:\s*sticky/.test(rule[1])) { okNarrow = true; break; }
  }
  check('≤900 px çubuk görünür ve yapışkan', okNarrow);

  // Bildirim çubuğun üstünde kalmalı: toast bottom = status-h + çubuğun
  // GERÇEK yüksekliği + 12px. v2.199: sabit 66 px, çubuk 360 px'te iki satıra
  // sarınca yetmiyordu; yükseklik JS ile `--narrow-bar-h`'a yazılır.
  let toastClear = false;
  let re2 = /@media\s*\(max-width:\s*900px\)/g;
  let m2;
  while ((m2 = re2.exec(rl))) {
    const chunk = rl.slice(m2.index, m2.index + 6000);
    const rule = chunk.match(/\.toast\s*\{([^}]*)\}/);
    if (rule && /--narrow-bar-h/.test(rule[1]) && /bottom:\s*calc\(/.test(rule[1])) { toastClear = true; break; }
  }
  check('≤900 px bildirim yapışkan çubuğun üstünde', toastClear);
  check('çubuk yüksekliği CSS değişkenine yazılıyor', /--narrow-bar-h/.test(js) && /function syncNarrowBarHeight/.test(js));
}

console.log('\n[2ad] Künye her görünümden erişilir (v2.167)');
{
  // Ölçüm (v2.166): Ses görünümünden künyeyi açmak **4 tık + 2 görünüm
  // değişimi** (Ses→Özet→aç→kapat→Ses). Üst barda dosya seçici vardı ama
  // künye düğmesi yoktu; bilgi yalnız Genel görünümden erişilebiliyordu.
  // KURAL: dosya künyesi her görünümden TEK tıkla açılır ve görünüm değişmez.
  const js = read('assets/app.js');
  const csStart = html.indexOf('class="case-switcher"');
  const switcher = html.slice(csStart, html.indexOf('</div>', csStart));
  check('üst barda künye düğmesi var', /id="caseInfoBtn"/.test(switcher));
  check('künye düğmesi erişilebilir ad taşır', /id="caseInfoBtn"[^>]*aria-label="[^"]+"/.test(html));
  check('düğme çekmeceyi açar (görünüm değişmez)',
    /#caseInfoBtn[\s\S]{0,200}setCaseDrawer\(true\)/.test(js));
}

console.log('\n[2ae] Dar ekranda düzenleme alanı görünür alana gelir (v2.168)');
{
  // ÖLÇÜM (v2.167, 900×900, 100 bölüm): liste 7.224 px, metin alanı listenin
  // 7.349 px altında; satıra dokununca metin ekranda DEĞİL. Masaüstünde ise
  // metin listenin yanında (107 px) — kaydırma gerekmez ve zıplama olmamalı.
  // KURAL: ≤900 px'te bölüm değişince düzenleme alanı görünür alana gelir;
  // ≥901 px'te HİÇ kaydırma yapılmaz.
  const js = read('assets/app.js');
  check('revealSegDetail tanımlı', /function revealSegDetail\(/.test(js));
  const fn = js.slice(js.indexOf('function revealSegDetail('), js.indexOf('function revealSegDetail(') + 700);
  check('yalnız ≤900 px\'te çalışır', /innerWidth\s*>\s*900\)\s*return|innerWidth\s*<=\s*900/.test(fn));
  check('düzenleme alanını görünür alana getirir', /scrollIntoView\(/.test(fn));
  const focus = js.slice(js.indexOf('function focusSegmentRow('), js.indexOf('function focusSegmentRow(') + 900);
  check('satıra tıklayınca çağrılır', /revealSegDetail\(/.test(focus));
  const nav = js.slice(js.indexOf('function navSegment('), js.indexOf('function navSegment(') + 1400);
  check('önceki/sonraki ile çağrılır', /revealSegDetail\(/.test(nav));
  const appr = js.slice(js.indexOf('function approveActiveSegment('), js.indexOf('function approveActiveSegment(') + 3000);
  check('onaydan sonra çağrılır', /revealSegDetail\(/.test(appr));
}

console.log('\n[2af] Rapor kâğıdı: punto alt sınırı ve belge fontu (v2.169)');
{
  // Ölçüm (v2.168, gerçek Chromium): raporda 137 metin düğümü 11px, 1 tanesi
  // **8px** (SHA-256 hücresi, satır içi stil) — okunması en kritik dize.
  // Kâğıt da belge fontu yerine arayüz fontuyla (Segoe UI) çiziliyordu:
  // reading-layer `.report-paper { font-family: var(--font-ui) }`, app.css'in
  // Arial'ini eziyordu.
  const js = read('assets/app.js');
  const inlineSizes = [...js.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => Number(m[1]));
  check('app.js içinde 11px altı satır içi punto yok', inlineSizes.every((v) => v >= 11), inlineSizes.join(',') || 'yok');
  const tok = read('assets/tokens.css');
  check('--paper-font token olarak tanımlı', /--paper-font\s*:/.test(tok));
  const fontVal = (tok.match(/--paper-font\s*:\s*([^;]+);/) || [])[1] || '';
  check('kâğıt fontu belge fontu (Arial/Times)', /Arial|Times|Georgia/i.test(fontVal), fontVal.trim());
  const rl2 = read('assets/reading-layer.css');
  const paperRule = rl2.match(/(^|\n)\.report-paper\s*\{([^}]*)\}/);
  check("kâğıt kendi font token'ını kullanır", !!paperRule && /font-family:\s*var\(--paper-font\)/.test(paperRule[2]));
  check('kâğıt arayüz fontu kullanmaz', !(paperRule && /var\(--font-ui\)/.test(paperRule[2])));
  check('SHA hücresi sınıf taşır (satır içi stil yok)', /class="paper-hash"/.test(js));
  check('paper-hash 11px tabanlı', /\.paper-hash\s*\{[^}]*font-size:\s*var\(--fs-2xs\)/.test(rl2));
}

console.log('\n[2ag] Ölü seg-* sınıfları geri gelmez (v2.170)');
{
  // Ölçüm (v2.169): bu sınıflar app.js'te ÜRETİLMİYOR, index.html'de yok,
  // malzemeli sayfada DOM sayısı 0; buna rağmen reading-layer'da 18 kural
  // vardı (v2.62'de sd-* yapısına geçilince etkisiz kalmışlardı). Silindi.
  // Geri gelirse test kalır.
  const rl3 = read('assets/reading-layer.css');
  const js3 = read('assets/app.js');
  const DEAD = ['seg-meta-row', 'seg-times', 'seg-text-wrap', 'seg-actions', 'seg-obs-row', 'seg-ops-row'];
  for (const cls of DEAD) {
    check(`reading-layer'da .${cls} kuralı yok`, !rl3.includes('.' + cls));
    check(`app.js .${cls} sınıfını üretmiyor`, !new RegExp('class="[^"]*' + cls).test(js3));
  }
}

console.log('\n[2ah] Rapor önizlemesi kırpılmıyor (v2.172)');
{
  // ÖLÇÜM (v2.171, 100 bölüm, 1440×900): #view-report 804 px; üstteki
  // bölüm tanıtımı (63) + araç çubuğu (38) + hazırlık kartı (303) + uyarı (56)
  // + çıktı notu (77) = 537 px alıyor, kâğıda 196 px kalıyordu. Kâğıdın
  // içeriği 6.452 px → rapor, 196 px'lik bir kutuda kaydırılıyordu.
  // KURAL: rapor görünümü TEK kaydırma; kâğıt kendi içinde kırpılmaz.
  const rl4 = read('assets/reading-layer.css');
  const viewRule = rl4.match(/#view-report[^{]*\{([^}]*)\}/g) || [];
  const scrolls = viewRule.some((r) => /overflow-y:\s*auto/.test(r));
  check('rapor görünümü kendi içinde kayar (overflow-y:auto)', scrolls);
  // app.css'teki `#view-report #reportPreview { flex:1 1 auto }` (2,0,0)
  // eziliyor; bu yüzden kural id seçicisiyle yazılır.
  const paperRules = [...rl4.matchAll(/#view-report #reportPreview\s*\{([^}]*)\}/g)].map((m) => m[1]);
  check('kâğıt küçülmez (flex: 0 0 auto)', paperRules.some((r) => /flex:\s*0 0 auto/.test(r)));
  check('kâğıt kendi içinde kırpılmaz (overflow: visible)', paperRules.some((r) => /overflow:\s*visible/.test(r)));
  const toolbarRule = (rl4.match(/#view-report \.report-toolbar\s*\{([^}]*)\}/) || [])[1] || '';
  check('araç çubuğu yapışkan (indirme erişilebilir)', /position:\s*sticky/.test(toolbarRule), toolbarRule.trim());
}

console.log('\n[2ai] Tek durum satırı her zaman görünür (v2.184)');
{
  // KULLANICI KURALI: "gizli bir şey olmasın, yeri dursun, ne işe yaradığı
  // ekranda yazsın." Üç ayrı şerit (ses yok · notlar · model ipucu) tek
  // satırda toplandı; satır KOŞULSUZ çizilir ve en az "Ses: …" çipi taşır.
  const js5 = read('assets/app.js');
  const rl5 = read('assets/reading-layer.css');
  const start5 = js5.indexOf('function segDetailHtml');
  const end5 = js5.indexOf('\nfunction ', start5 + 10);
  const body5 = js5.slice(start5, end5 > 0 ? end5 : start5 + 30000);
  check('durum satırı KOŞULSUZ çizilir', /\$\{statusRowHtml\(m, s, i\)\}/.test(body5));
  check('eski üç şerit kaldırıldı', !/sd-audio-state|sd-notes|asr-hint/.test(body5));
  check('satırda "Ses:" çipi var', /data-status-audio[\s\S]{0,140}Ses:/.test(js5));
  check('durum satırı yüksekliği sabit', /#view-audio \.sd-status\s*\{[^}]*min-height:\s*[0-9]+px/.test(rl5));
  const sync5 = js5.slice(js5.indexOf('function syncSegDetailInPlace'), js5.indexOf('function syncSegDetailInPlace') + 9000);
  check('bölüm değişince de tazelenir', /refreshAudioState\(m\)/.test(sync5));
  check('ilk çizimde de tazelenir', /function renderSegments\([\s\S]{0,6000}refreshAudioState\(m\)/.test(js5));
}
console.log('\n[2aj] Sürükle-bırak birleştirme güvenli (v2.178)');
{
  // KURAL: sürükleme bir HIZLANDIRICIDIR (klavye M ve satır menüsü korunur),
  // yalnız TUTAMAKTAN başlar, yalnız KOMŞU satıra bırakılır ve filtre
  // "Tümü" değilse KAPALIDIR (filtreli listede komşu görünen satırlar
  // gerçekte komşu olmayabilir).
  const js6 = read('assets/app.js');
  const rl6 = read('assets/reading-layer.css');
  check('satırda sürükleme tutamağı var', /data-seg-drag="/.test(js6));
  check('tutamak draggable', /class="seg-drag" draggable="true"/.test(js6));
  check('dragstart yalnız tutamakta', /closest\('\[data-seg-drag\]'\)/.test(js6));
  check('filtre kilidi var', /segFilter\(m\) !== 'all'/.test(js6) && /yalnız "Tümü" filtresinde/.test(js6));
  check('yalnız komşu hedef', /Math\.abs\(i - segDrag\.index\) === 1/.test(js6));
  check('bırakma mevcut birleştirmeyi çağırır', /drop[\s\S]{0,600}mergeSegmentWithNext\(m, base\)/.test(js6));
  check('bırakma hedefi görsel', /\.seg-item\.drop-merge\s*\{/.test(rl6));
  // Klavye ve menü yolu KORUNUR (sürükleme tek yol olmamalı).
  check('klavye yolu korunur (M)', /LOOP_KEYS|'m'/.test(js6) && /mergeSegmentWithNext/.test(js6));
  check('menü yolu korunur', /data-merge-next/.test(js6));
}

console.log('\n[2al] Metin kutusu: tek kutu, saydam alan, vurgu arkada (v2.188)');
{
  // v2.188: ayrı vurgu şeridi kaldırıldı. Metin alanı kendi içinde KAYMAZ
  // (içeriği kadar büyür) ki arkadaki vurgu katmanı hizada kalsın.
  const rl7 = read('assets/reading-layer.css');
  check('metin alanı saydam (vurgu arkadan görünür)', /\.sd-ta-wrap textarea\s*\{[^}]*background:\s*transparent/.test(rl7));
  check('metin alanı kendi içinde kayar (vurgu eşlenir)', /\.sd-ta-wrap textarea\s*\{[^}]*overflow-y:\s*auto/.test(rl7));
  check('metin alanı 120 px tabanı', /\.sd-ta-wrap textarea\s*\{[^}]*min-height:\s*120px/.test(rl7));
  check('236 px tabanı kaldırıldı (panel kaymaz)', !/\.sd-body\s*\{[^}]*min-height:\s*236px/.test(rl7) && !/\.sd-right\s*\{[^}]*min-height:\s*236px/.test(rl7));
}

console.log('\n[2am] Konuşmacı/kontrol/gözlem her zaman görünür (v2.180 → v2.188)');
{
  // v2.188: gözlem işaretleri (rapora aktarılır) metin kutusunun ALT SOLUNDA;
  // hızlı ekle menüsü ALT SAĞINDA; model çıktısı ÜST SAĞINDA.
  const js8 = read('assets/app.js');
  const i0 = js8.indexOf('function segDetailHtml');
  const i1 = js8.indexOf('\nfunction ', i0 + 10);
  const body8 = js8.slice(i0, i1 > 0 ? i1 : i0 + 30000);
  const iMeta = body8.indexOf('class="sd-meta"');
  const iTech = body8.indexOf('sd-left sd-tech');
  const iEditor = body8.indexOf('class="sd-editor"');
  const iBottom = body8.indexOf('class="sd-editor-bottom"');
  const iObs = body8.indexOf('class="sd-obs"');
  const iQuick = body8.indexOf('class="sd-quick"');
  const iAsr = body8.indexOf('class="sd-editor-top"');
  check('konuşmacı/kontrol var', iMeta > 0);
  check('konuşmacı/kontrol Teknik DIŞINDA (önce)', iTech > 0 && iMeta < iTech, `meta=${iMeta} tech=${iTech}`);
  check('metin kutusu tek kutu', iEditor > 0 && iTech > 0 && iEditor > iTech, `editor=${iEditor} tech=${iTech}`);
  check('gözlem kutunun ALT bölgesinde', iObs > iBottom, `obs=${iObs} bottom=${iBottom}`);
  check('gözlem hızlı ekle ile aynı alt şeritte', iObs > iBottom && iQuick > iBottom, `obs=${iObs} quick=${iQuick}`);
  check('model çıktısı kutunun ÜST bölgesinde', iAsr > 0 && iAsr < iEditor + 400, `asr=${iAsr} editor=${iEditor}`);
}

console.log("\n[2an] ASR kökeni metin kutusunun sağ üstünde (v2.188)");
{
  // KULLANICI: "Otomatik çözümleme çıktısı kısmını text box içine sağ üst
  // köşeye koy; basınca bir kutu açılsın." Eski katlanır blok kaldırıldı.
  const js9 = read('assets/app.js');
  const rl9 = read('assets/reading-layer.css');
  const i0 = js9.indexOf('function segDetailHtml');
  const i1 = js9.indexOf('\nfunction ', i0 + 10);
  const body9 = js9.slice(i0, i1 > 0 ? i1 : i0 + 30000);
  const iEditorTop = body9.indexOf('class="sd-editor-top"');
  const iAsrCall = body9.indexOf('${asrPopoverHtml(m, s, i)}');
  check('ASR düğmesi üst şeritte', iEditorTop > 0 && iAsrCall > iEditorTop, `asr=${iAsrCall} top=${iEditorTop}`);
  check('ASR kutusu gizli başlar', /class="sd-asr-pop"[^>]*hidden/.test(js9));
  check('ASR kutusu açılır/kapanır', /dataset\.asrToggle[\s\S]{0,300}hidden = !pop\.hidden/.test(js9));
  check('eski katlanır blok kaldırıldı', !/class="asr-compare"/.test(js9) && !/\.asr-compare\s*\{/.test(rl9));
  check('model farkı durum çipinde', /st-chip info action[^>]*data-asr-open/.test(js9));
  const statusFn9 = js9.slice(js9.indexOf('function statusRowHtml'), js9.indexOf('\nfunction ', js9.indexOf('function statusRowHtml') + 10));
  check('çip durum satırı üreticisinde', /data-asr-open/.test(statusFn9));
  check('çip ASR kutusunu açar', /dataset\.asrOpen[\s\S]{0,300}openAsrPopover/.test(js9));
  check('öncelik rozeti korunur', /function segPriorityBadge/.test(js9) && /badge prio/.test(js9));
}

console.log("\n[2ao] Başlıkta birleşik işlem satırı (v2.183)");
{
  // ÖLÇÜM (v2.182, 1440×900): başlıkta 3 düğme (Onayla/Yeniden dinle/
  // Anlaşılmadı) + hemen altında AYNI işleri yapan Kontrol seçicisi vardı;
  // üst bölge 76 px (1440) / 78 px (900). Artık 42 px / 42 px.
  const jsA = read('assets/app.js');
  const i0 = jsA.indexOf('function segDetailHtml');
  const i1 = jsA.indexOf('\nfunction ', i0 + 10);
  const bodyA = jsA.slice(i0, i1 > 0 ? i1 : i0 + 30000);
  check('Yeniden dinle/Anlaşılmadı düğmeleri kaldırıldı', !/data-review-set="\$\{i\}\|(yeniden|anlasilmadi)"/.test(bodyA));
  // v2.186: onay düğmesi başlıktan kalktı; eylem satır menüsünde (data-approve-seg).
  check('onay eylemi menüde tanımlı', /role="menuitem" data-approve-seg="\$\{index\}"/.test(jsA));
  const iHead = bodyA.indexOf('class="sd-head"');
  const iTech = bodyA.indexOf('sd-left sd-tech');
  const iSpk = bodyA.indexOf('data-key="speaker"');
  const iRev = bodyA.indexOf('data-key="review"');
  check('konuşmacı başlıkta', iSpk > iHead && iSpk < iTech, `head=${iHead} spk=${iSpk} tech=${iTech}`);
  check('kontrol başlıkta', iRev > iHead && iRev < iTech, `head=${iHead} rev=${iRev} tech=${iTech}`);
  // v2.188: Profil alanı KALDIRILDI; "Henüz çözümlenmedi" DURUM satırına taşındı.
  check('profil alanı kaldırıldı', !/sd-profile/.test(bodyA));
  const statusFnA = jsA.slice(jsA.indexOf('function statusRowHtml'), jsA.indexOf('\nfunction ', jsA.indexOf('function statusRowHtml') + 10));
  check('"Henüz çözümlenmedi" durum satırında', /Henüz çözümlenmedi/.test(statusFnA));
  check('boş meta çizilmez (yalnız belirsiz okumada)', /\$\{rev === 'ambiguous'[\s\S]{0,140}sd-meta/.test(bodyA));
}

console.log('\n[2ap] Bölüm listesi: metin önizlemesi (v2.193)');
{
  // v2.185 metni listeden kaldırmıştı; birleştirme/bölmede satırlar ayırt
  // edilemiyordu. v2.193: TEK satır önizleme geri geldi; tam metin ipucunda.
  const jsB = read('assets/app.js');
  const rlB = read('assets/reading-layer.css');
  const i0 = jsB.indexOf('function segItemHtml');
  const i1 = jsB.indexOf('\nfunction ', i0 + 10);
  const rowFn = jsB.slice(i0, i1 > 0 ? i1 : i0 + 4000);
  check('satırda metin ÖNİZLEMESİ var', /class="seg-text-preview/.test(rowFn));
  check('tam metin satır ipucunda', /title="\$\{esc\(\(s\.text/.test(rowFn));
  check('ızgara iki satır (bilgi + metin)', /#view-audio \.seg-item\s*\{[^}]*grid-template-areas:\s*"no time badges"\s*"text text text"/.test(rlB));
  check('önizleme tek satır, taşarsa …', /\.seg-text-preview\s*\{[^}]*text-overflow:\s*ellipsis/.test(rlB));
  check('rozetler SAĞA hizalanır (durum en sağda)', /#view-audio \.seg-item \.seg-badges\s*\{[^}]*justify-content:\s*flex-end/.test(rlB));
  // Rozet görünürlüğü korunur (v2.130 kuralı): kırpma yok.
  check('rozet kutusu kırpmaz (v2.130 korunuyor)', /#view-audio \.seg-badges\s*\{[^}]*overflow:\s*visible/.test(rlB));
}

// --- 8. CSS borcu: ölçüm ve nöbetçi ---------------------------------------
// NEDEN: app.css tarihsel yamalarla büyüdü (tek satır minify, çok sayıda
// !important, aynı seçicinin onlarca kez yeniden tanımlanması). Otomatik
// temizlik DENENDİ ve YAYINLANMADI: kendi ayrıştırıcımızla üretilen kanıt
// (son değer haritası) tutmadı; kanıtsız 500 bildirim silmek "bir düzeltme
// başka paneli bozar" sınıfını üretir. Bu bölüm borcu ÖLÇER ve ARTIRAN
// değişikliği durdurur. Ayrıntı: docs/CSS_BORCU.md.
console.log('\n[2aq] Dalga çubuğu: menüler görünür, metinle çakışmaz (v2.190)');
{
  // ÖLÇÜM (v2.190, 1440): metin alanı 349–751, dalga çubuğu 595'te başlıyordu
  // → METİN, dalga araçlarının ÜSTÜNE taşıyordu. Ayrıca 1100 px'te araç satırı
  // 470 px, kap 372 px; "Dalga/Spek/İkisi" görünmüyordu (gizli yatay kaydırma).
  // KURAL: gövde kalan yüksekliği alır; metin KENDİ İÇİNDE kayar (panel kaymaz,
  // dalga görünür kalır). Araç satırı sığmayınca SARAR.
  const rl = read('assets/reading-layer.css');
  const js = read('assets/app.js');
  check('gövde kalan yüksekliği alır (flex:1, min-height:0)', /#view-audio \.seg-detail \.sd-body \{[^}]*flex:\s*1 1 auto[^}]*min-height:\s*0/.test(rl));
  // v2.218: sağ sütun esner AMA içeriğinden aşağı inmez (min-height:auto).
  // `min-height:0` panel kısalınca metin alanını analiz kutusunun üstüne
  // bindiriyordu (ölçüldü). Ezme değil, .seg-detail kaydırır.
  check(
    'sağ sütun esner ama içeriğinden aşağı inmez (min-height:auto)',
    /#view-audio \.seg-detail \.sd-right \{[^}]*flex:\s*1 1 auto[^}]*min-height:\s*auto/.test(rl)
  );
  check('metin sütunu kalan yüksekliği alır', /#view-audio \.seg-detail \.sd-right \.sd-text \{[^}]*flex:\s*1 1 auto/.test(rl));
  check('metin alanı kendi içinde kayar (panel kaymaz)', /\.sd-ta-wrap textarea\s*\{[^}]*overflow-y:\s*auto/.test(rl));
  check('satır içi yükseklik dayatılmıyor', !/ta\.style\.height\s*=\s*['"]auto['"]/.test(js));
  check('ipucu kısa metin + tam metin title', /sd-wave-hint" title="Tıkla: konuma git/.test(js));
  check('araç satırı sarar (gizli kaydırma yok)', /sd-wave-tools \{[^}]*flex-wrap:\s*wrap/.test(rl) && !/sd-wave-tools \{[^}]*overflow-x:\s*auto/.test(rl));
}

console.log('\n[2ar] Konuşmacı silme ve kullanılmayanları temizleme (v2.192)');
{
  // KULLANICI: "Bölümde konuşmacı seçilmedi yapıyorum ama raporda ve ses
  // dosyasında yine görünüyor; silemiyor muyuz?" Kök: kayıt silinmiyordu ve
  // rapor tüm kayıtları listeliyordu. Artık Sil + Temizle var, rapor filtreler.
  const js = read('assets/app.js');
  check('kart başlığında Sil düğmesi var', /data-del-spk="\$\{esc\(m\.id\)\}\|\$\{esc\(s\.id\)\}"/.test(js));
  check('kullanılmayanları temizle düğmesi var', /data-clean-spk="\$\{esc\(m\.id\)\}"/.test(js));
  check('rapor atanmamış konuşmacıyı atlar', /if \(!segs\.length\) continue;/.test(js));
  check('silme bölüm atamalarını temizler', /function removeSpeaker[\s\S]{0,700}speakerId = ''/.test(js));
  check('atanmış bölüm sayısı isim VE kimlikle bulunur', /function speakerSegments[\s\S]{0,400}sg\.speakerId === id/.test(js));
}

console.log('\n[2as] Birleştirme/bölme sonrası kaydırma korunur (v2.193)');
{
  // KULLANICI: "Birleştirme yaptıktan sonra sayfa başa geliyor." Kök:
  // renderSegments listeyi yeniden kuruyor, scrollTop sıfırlanıyordu.
  const js = read('assets/app.js');
  check('kaydırma yakalanır', /function captureSegScroll\(m\)/.test(js));
  check('kaydırma geri yüklenir', /function restoreSegScroll\(m, st, focusIndex\)/.test(js));
  check('birleştirme kaydırmayı korur', /function mergeSegmentWithNext[\s\S]{0,5000}captureSegScroll\(m\)[\s\S]{0,400}restoreSegScroll\(m, scroll, index\)/.test(js));
  check('bölme kaydırmayı korur', /function splitSegmentAt[\s\S]{0,3500}captureSegScroll\(m\)[\s\S]{0,300}restoreSegScroll\(m, scroll, index \+ 1\)/.test(js));
  check('scrollIntoView kullanılmıyor (sayfayı kaydırıyordu)', !/item\.scrollIntoView/.test(js));
}

console.log('\n[2at] Yeniden çözümleme sonrası kaydırma korunur (v2.194)');
{
  // KULLANICI: "Çözümleye bastığımda bölüm listesi yenileniyor, kullanım
  // deneyimini etkiliyor." retranscribeSegment renderAudioList() çağırıyordu.
  const js = read('assets/app.js');
  check('yeniden çözümleme kaydırmayı yakalar', /async function retranscribeSegment[\s\S]{0,7000}captureSegScroll\(m\)/.test(js));
  check('yeniden çözümleme kaydırmayı geri yükler', /async function retranscribeSegment[\s\S]{0,7500}restoreSegScroll\(m, scroll, index\)/.test(js));
  check('renderAudioList bekleniyor (await)', /await renderAudioList\(\)[\s\S]{0,200}restoreSegScroll/.test(js));
}

console.log('\n[2au] Paragraf görünümü salt okunur (v2.195)');
{
  // KULLANICI: "Salt-okunur paragraf görünümü yapalım." Eski `paragraphize`
  // bölümleri değiştiriyordu; artık ¶ yalnız GÖRÜNÜM açar.
  const js = read('assets/app.js');
  const html = read('index.html');
  check('¶ düğmesi paragraf görünümünü açar', /data-paragraph="1" title="Paragraf görünümü \(salt okunur\)/.test(js));
  check('görünüm segmentlere dokunmaz', /function paragraphGroups\(segments\)/.test(js) && !/paragraphize\(/.test(js));
  check('görünüm diyaloğu var', /id="paragraphDialog"/.test(html) && /id="paragraphBody"/.test(html));
  check('salt okunur notu görünür', /Salt okunur: bölümleri değiştirmez/.test(js));
  check('önerilen bölüm uzunluğu yazılı', /1–3 cümle veya 15–30 sn/.test(js));
  check('telefonda konuşma hızlı etiketi var', /\[telefonda konuşma\]/.test(js));
}

console.log('\n[2av] Hızlı karar: Kontrol Dinle yanında + 1/2/3/4 (v2.196)');
{
  // KULLANICI: "Dinle → Kontrol → en sola dön" turu yavaş. Kontrol, Dinle'nin
  // yanına alındı ve 1/2/3/4 karar kısayolları eklendi.
  const js = read('assets/app.js');
  const html = read('index.html');
  const i0 = js.indexOf('function segDetailHtml');
  const i1 = js.indexOf('\nfunction ', i0 + 10);
  const body = js.slice(i0, i1 > 0 ? i1 : i0 + 30000);
  const iPlay = body.indexOf('data-play-active');
  const iReview = body.indexOf('data-key="review"');
  const iSpk = body.indexOf('data-key="speaker"');
  check('Kontrol, Dinle\'nin yanında (önce konuşmacı)', iPlay > 0 && iReview > iPlay && iReview < iSpk, `play=${iPlay} review=${iReview} spk=${iSpk}`);
  check('1/2/3/4 karar kısayolları tanımlı', /'1': 'approved'/.test(js) && /'2': 'inaudible'/.test(js) && /'3': 'relisten'/.test(js) && /'4': 'ambiguous'/.test(js));
  check('karar tek kapıdan yazılır (applyReviewChoice)', /function applyReviewChoice[\s\S]{0,600}setSegReview\(s, code\)/.test(js));
  check('ikinci göz onaylayamaz (kısayolda da)', /function applyReviewChoice[\s\S]{0,300}isSecondEyesEditor/.test(js));
  check('klavye ipucu 1/2/3/4 taşır', /<kbd>1<\/kbd>\/<kbd>2<\/kbd>/.test(js));
  check('yardımda hızlı ritim bölümü var', /Hızlı çalışma ritmi/.test(html));
}

console.log('\n[8] CSS borcu (nöbetçi)');
{
  const appCss = read('assets/app.css');
  const layerCss = read('assets/reading-layer.css');

  function rulesOf(css) {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
    const rules = [];
    const media = [];
    const matchBrace = (open, end) => {
      let d = 1, j = open + 1;
      while (j < end) {
        if (src[j] === '{') d++;
        else if (src[j] === '}') { d--; if (!d) return j; }
        j++;
      }
      return end;
    };
    const walk = (start, end) => {
      let k = start, from = start;
      while (k < end) {
        if (src[k] === '{') {
          const prelude = src.slice(from, k).trim();
          const close = matchBrace(k, end);
          if (/^@(-webkit-)?keyframes\b/i.test(prelude)) { k = close + 1; from = k; continue; }
          if (prelude.startsWith('@')) {
            if (/^@media\b/i.test(prelude)) media.push(prelude);
            walk(k + 1, close);
            if (/^@media\b/i.test(prelude)) media.pop();
          } else {
            const decls = src.slice(k + 1, close).split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
              const c = d.indexOf(':');
              return c < 0 ? null : { prop: d.slice(0, c).trim().toLowerCase(), important: /!important/i.test(d) };
            }).filter(Boolean);
            for (const sel of prelude.split(',')) rules.push({ selector: sel.trim().replace(/\s+/g, ' '), media: media.join(' && '), decls });
          }
          k = close + 1; from = k; continue;
        }
        k++;
      }
    };
    walk(0, src.length);
    return rules;
  }

  function deadCount(rules) {
    const last = new Map();
    let dead = 0;
    for (const r of rules) {
      for (const d of r.decls) {
        const key = r.selector + '|' + d.prop;
        const prev = last.get(key);
        if (prev && (r.media === '' || r.media === prev.media) && (!prev.important || d.important)) dead++;
        last.set(key, { media: r.media, important: d.important });
      }
    }
    return dead;
  }

  const appRules = rulesOf(appCss);
  const layerRules = rulesOf(layerCss);
  const layerUncond = new Map();
  for (const r of layerRules) {
    if (r.media) continue;
    for (const d of r.decls) layerUncond.set(r.selector + '|' + d.prop, d);
  }
  let cross = 0;
  for (const r of appRules) {
    for (const d of r.decls) {
      const later = layerUncond.get(r.selector + '|' + d.prop);
      if (later && (!d.important || later.important)) cross++;
    }
  }
  // Yorum içindeki "!important" kelimesi SAYILMAZ (v2.139'da yanlış pozitif üretti).
  const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  const impApp = (noComments(appCss).match(/!important/g) || []).length;
  const impLayer = (noComments(layerCss).match(/!important/g) || []).length;
  const mainArea = (appCss.match(/\.main-area\s*\{/g) || []).length + (layerCss.match(/\.main-area\s*\{/g) || []).length;
  console.log(`  ölçüm: app.css kural ${appRules.length} · reading-layer ${layerRules.length} · !important ${impApp}+${impLayer} · .main-area ${mainArea}`);
  console.log(`  ölü bildirim: reading-layer içi ${deadCount(layerRules)} · app.css→layer ${cross}`);

  // Nöbetçi eşikleri (v2.141 ölçümü: 26/70/98/507/15). Borç ARTARSA test
  // kalır; temizlik yapılırsa eşik DÜŞÜRÜLÜR. 97→98 ve 501→507: v2.139'un
  // v2.140 masaüstü kabuğu 7 zorunlu `!important` ekledi (v2.129'un
  // `!important` taşıyan taşma kurallarını ezmek için). !important sayacı
  // YORUMLARI saymaz (v2.139'da yanlış pozitif üretti).
  check('app.css !important sayısı artmadı (<=26)', impApp <= 26, String(impApp));
  check('reading-layer !important sayısı artmadı (<=55)', impLayer <= 55, String(impLayer));
  check('reading-layer içi ölü bildirim artmadı (<=60)', deadCount(layerRules) <= 60, String(deadCount(layerRules)));
  check('app.css→reading-layer ölü bildirim artmadı (<=500)', cross <= 500, String(cross));
  check('.main-area tanımı artmadı (<=15)', mainArea <= 15, String(mainArea));
}

console.log('\n[2aw] Birleştirme adayı rozeti ve filtresi (v2.198)');
{
  const appJs = read('assets/app.js');
  const layerCss = read('assets/reading-layer.css');
  // Rozet yalnız işarettir; yıkıcı eylem tek tıkla olmaz. Renk token'lardan
  // gelmeli (ham hex yasak) ve durum tablosunun "açık/seçili" satırını kullanmalı.
  const candRule = layerCss.match(/#view-audio \.seg-item \.badge\.cand\s*\{([\s\S]*?)\}/);
  check('aday rozeti kuralı var (.badge.cand)', !!candRule);
  check('aday rozeti accent-soft zemin kullanıyor', !!candRule && /var\(--accent-soft\)/.test(candRule[1]));
  check('aday rozeti accent yazı kullanıyor', !!candRule && /color:\s*var\(--accent\)/.test(candRule[1]));
  check('aday rozeti ham hex taşımıyor', !!candRule && !/#[0-9a-f]{3,8}/i.test(candRule[1]));
  // Filtre anahtarı ve etiketi koddan gelmeli.
  check("SEG_FILTERS 'merge' anahtarını taşıyor", /\['merge', 'Birleştirme adayı'\]/.test(appJs));
  check('sayaç, filtre ve rozet aynı kaynağı kullanıyor',
    /mergeCandidateIndexes\(segs\)/.test(appJs) && /mergeCandidateAt\(m\.segments, i\)/.test(appJs));
  check('aday rozeti buton DEĞİL (yanlışlıkla birleştirmez)',
    /class="badge cand"/.test(appJs) && !/class="badge cand"[^>]*data-merge-next/.test(appJs));
}

console.log('\n[2ax] 5 tuşu: birleştirme adayı filtresi (v2.198 düzeltme)');
{
  const appJs = read('assets/app.js');
  const help = read('index.html');
  // 5 KARAR değildir: yalnız görünüm filtresi. Veri değiştirmemeli.
  check("5 tuşu toggleMergeFilter çağırıyor", /e\.key === '5'[\s\S]{0,160}toggleMergeFilter/.test(appJs));
  check('toggleMergeFilter saf kararı kullanıyor', /nextMergeFilter\(segFilter\(m\), count\)/.test(appJs));
  check('aday yoksa filtre değişmiyor (saf fonksiyon)', /if \(!\(Number\(count\) > 0\)\) return current;/.test(appJs));
  check('yardım 5 tuşunu anıyor', /<b>5<\/b>/.test(help) && /5<\/b>[^<]{0,60}(birleştirme|aday)/i.test(help));
  check('yardım tanımsız 8 tuşu uydurmuyor', !/<b>8<\/b>/.test(help));
}

console.log('\n[2ay] Dar ekran karar çubuğu: Kontrol + sarma (v2.199)');
{
  const appJs = read('assets/app.js');
  const layer = read('assets/reading-layer.css');
  const help = read('index.html');
  // 900 px'te Dinle/Kontrol ekran dışındaydı (y=1631); çubuk artık Kontrol
  // seçicisini taşır ve sığmayan öğe SARAR (kırpma yasak).
  check('dar çubuk Kontrol seçicisi taşıyor', /class="narrow-review"[\s\S]{0,500}data-key="review"/.test(appJs));
  check('dar çubuk kısa etiketleri kullanıyor', /reviewSelectOptions\(rev, true\)/.test(appJs));
  check('seçenekler tek kaynaktan (reviewSelectOptions)', /function reviewSelectOptions\(rev, short\)/.test(appJs));
  check('çubuk sarar (kırpma yok)', /#view-audio \.narrow-bar \{[\s\S]{0,500}flex-wrap: wrap/.test(layer));
  check('karar tek kapıdan (applyReviewChoice)', /if \(el\.dataset\.key !== 'review'\) return;[\s\S]{0,1200}applyReviewChoice\(m, i, el\.value\)/.test(appJs));
  check('toast çubuğun gerçek yüksekliğini kullanıyor', /--narrow-bar-h/.test(layer) && /syncNarrowBarHeight/.test(appJs));
  check('yardım dar ekran çubuğunu anıyor', /<h3>Dar ekran \(≤900 px\)<\/h3>/.test(help));
}

console.log('\n[2az] Bölüm uzunluğu: 45 sn üstü uyarı (v2.200)');
{
  const appJs = read('assets/app.js');
  const help = read('index.html');
  const mergeFn = appJs.slice(
    appJs.indexOf('function mergeSegmentWithNext'),
    appJs.indexOf('function paragraphGroups')
  );
  check('saf eşik fonksiyonu var', /function segmentLengthInfo\(seconds\)/.test(appJs) && /hardMaxSec:\s*45/.test(appJs));
  check('liste satırında ⏱ rozeti', /lenBadge/.test(appJs) && /Uzun bölüm:/.test(appJs));
  check('Durum satırında kalıcı çip', /Uzun bölüm \$\{esc\(len\.short\)\}/.test(appJs));
  check('birleştirme 45 sn uyarısını gösterir', /len\.level === 'long'/.test(mergeFn) && /showToast\(/.test(mergeFn));
  check('birleştirme 45 sn üstünde ENGELLEMEZ (koşullu çıkış yok)', !/if \(len\.level === 'long'\)/.test(mergeFn));
  check('rapor hazırlığında 45 sn maddesi', /'longSegments'/.test(appJs) && /45 sn üstü bölüm/.test(appJs));
  check('rapor uyarısında standart', /bölüm 45 sn üstünde/.test(appJs));
  check('yardım standardı anıyor', /45 sn|45 saniye/.test(help) && /1–3 cümle/.test(help));
}

console.log('\n[2ba] Rapor hazırlığı: zaman sayacı kayıt başına (v2.201)');
{
  const appJs = read('assets/app.js');
  const fn = appJs.slice(
    appJs.indexOf('function reportReadiness'),
    appJs.indexOf('function readinessRowsHtml')
  );
  // Kayıtların zaman çizgileri AYRIDIR; düzleştirilmiş sayım olmayan çakışma
  // üretiyordu. Hazırlık sayacı, ses görünümündeki `time` filtresiyle aynı
  // (kayıt başına) olmalı.
  check(
    'zaman sorunu kayıt başına toplanıyor',
    /materials\.reduce\([\s\S]{0,220}segmentTimeIssueIndexes\(\(m && m\.segments\) \|\| \[\]\)/.test(fn)
  );
  check('düzleştirilmiş zaman sayımı kaldırıldı', !/segmentTimeIssueIndexes\(segs\)\.size/.test(fn));
  check('hazırlık maddesi time filtresine götürür', /'Zaman sorunu olan bölüm'/.test(fn) && /'time'/.test(fn));
}

console.log('\n[2bb] Raporda okuma metni (v2.202)');
{
  const appJs = read('assets/app.js');
  check('okuma metni tek kaynaktan (readingGroupsFor)', /function readingGroupsFor\(m\)/.test(appJs));
  check(
    'paragraf görünümü de aynı kaynağı kullanıyor',
    /function paragraphViewText\(m\)[\s\S]{0,220}readingGroupsFor\(m\)/.test(appJs)
  );
  check('okuma metni başlığı REPORT_TEXT te', /readingHeading: 'Okuma metni'/.test(appJs) && /readingIntro:/.test(appJs));
  check(
    'HTML raporu okuma metnini ekliyor',
    /readingGroupsFor\(m\)[\s\S]{0,400}REPORT_TEXT\.readingHeading/.test(appJs)
  );
  const uses = (appJs.match(/readingGroupsFor\(m\)/g) || []).length;
  check('üç çıktı da okuma metnini üretiyor', uses >= 3, String(uses));
  check('okuma metni salt okunur (paragraphize yok)', /function readingGroupsFor\(m\)[\s\S]{0,400}paragraphGroups/.test(appJs) && !/paragraphize\(/.test(appJs));
}

console.log('\n[2bc] Alan tanımlama: gözlem bayrakları tek kaynak (v2.203)');
{
  const appJs = read('assets/app.js');
  const schemaJs = read('assets/schema.js');
  const help = read('index.html');
  const layer = read('assets/reading-layer.css');
  check('OBS_DEFS tek tanım noktası', /export const OBS_DEFS = \[/.test(schemaJs));
  check('türetilmiş sabitler defineOptions ile', /const OBS = defineOptions\(OBS_DEFS\)/.test(schemaJs));
  check('gözlem düğmeleri OBS_DEFS ten', /OBS_DEFS\.map\(/.test(appJs) && !/\['noise', 'gürültü'/.test(appJs));
  check('rapor etiketleri OBS_LABEL den', /obsLabels: OBS_LABEL/.test(appJs));
  check('yardım listesi dinamik', /id="obsHelpList"/.test(help) && /function renderObsHelp/.test(appJs));
  check('telefon ve sessizlik tanımlı', /key: 'phone'/.test(schemaJs) && /key: 'noSpeech'/.test(schemaJs));
  check('bilinmeyen anahtar normalize da korunur', /BİLİNMEYEN ANAHTAR KORUNUR/.test(schemaJs));
  check('mergeCases gözlemleri OR lar', /gözlem işaretleri birleşti/.test(schemaJs));
  // Dar ekranda düğme yığını metni ezmesin: tek "Gözlem" düğmesi + panel.
  check('dar ekran gözlem menüsü var', /class="sd-obs-menu"/.test(appJs) && /sd-obs-row/.test(appJs));
  check('dar ekran menüsü ≤600 px', /@media \(max-width: 600px\)[\s\S]{0,300}sd-obs-row/.test(layer));
  check('menü aynı düğmeleri kullanır (kopya mantık yok)', /activeObsCount/.test(appJs) && /Gözlem\$\{activeObsCount/.test(appJs));
}
console.log('\n[2bd] Alan tanımlama: sınıflandırma/rol seçenekleri (v2.204)');
{
  const appJs = read('assets/app.js');
  const schemaJs = read('assets/schema.js');
  check('defineOptions ek alanları taşır (byKey)', /byKey: Object\.fromEntries/.test(schemaJs));
  for (const name of ['CASE_STATUS', 'MATERIAL_STATUS', 'REVIEW', 'SPEAKER_ROLE', 'SPEAKER_GENDER', 'MEDIUM_TYPE', 'TEAM_ROLE']) {
    check(`${name}_DEFS tek kaynak`, new RegExp(`export const ${name}_DEFS = \\[`).test(schemaJs));
  }
  check('REVIEW_SHORT schema dan gelir', /export const REVIEW_SHORT = REVIEW_OPT\.short/.test(schemaJs));
  check('uygulamada kısa etiket kopyası yok', !/REVIEW_SHORT_LABEL/.test(appJs));
  check('rozet metni REVIEW_SHORT tan', /approved: \['done', REVIEW_SHORT\.approved\]/.test(appJs));
  check('filtre etiketleri REVIEW_LABEL den', /\['approved', REVIEW_LABEL\.approved\]/.test(appJs));
  check('rol yetkileri TEAM_ROLE_DEFS bayraklarından', /SECOND_EYES_ROLES = TEAM_ROLE_DEFS\.filter/.test(schemaJs) && /APPROVER_ROLES = TEAM_ROLE_DEFS\.filter/.test(schemaJs));
}
console.log('\n[2be] Dosyalar arası kişi kaydı (v2.205)');
{
  const appJs = read('assets/app.js');
  const schemaJs = read('assets/schema.js');
  check('emptyCase dosya geneli kişi taşır', /speakers: \[\], \/\/ emptyCaseSpeaker/.test(schemaJs));
  check('kişi kodu K1 üretilir', /assignCaseSpeakerCodes/.test(schemaJs) && /\^K\\d\+\$/.test(schemaJs));
  check('kayıt içi personId korunur', /personId: str\(s\.personId\)/.test(schemaJs));
  check('rapor kişiye göre gruplar', /linksByPerson/.test(appJs) && /emitted\.has\(pid\)/.test(appJs));
  check('kişi paneli ve bağ seçici var', /data-add-person/.test(appJs) && /data-person-key/.test(appJs) && /data-spk-key="personId"/.test(appJs));
  check('kişi silme onay ister', /data-del-person/.test(appJs) && /Dosya geneli kişiyi sil/.test(appJs));
  check('birleştirme kişi/bağ çakışması', /kind: 'case-speaker'/.test(schemaJs) && /kind: 'speaker-person'/.test(schemaJs));
  check('rapor açıklaması uzman kanaati der', /uzman kanaatidir, otomatik kimlik tespiti değildir/.test(appJs));
}
console.log('\n[2bg] Delil paketi: yükleme, doğrulama, rapor (v2.208)');
{
  const appJs = read('assets/app.js');
  const html = read('index.html');
  const layer = read('assets/reading-layer.css');
  check('delil yükleme düğmesi ve girişi var', /id="importDelilBtn"/.test(html) && /id="importDelilInput"/.test(html));
  check('doğrulama penceresi var', /id="delilResultDialog"/.test(html) && /id="delilResultBody"/.test(html));
  check('kural: cihaz bilgisi beyandır', /edinme aracının beyanıdır/.test(html) || /edinme aracının beyanıdır/.test(appJs));
  check('paket içe aktarma ve şema doğrulama var', /async function importDelilPack/.test(appJs) && /function validateDelilPack/.test(appJs));
  check('hash doğrulaması verifyHashState kullanır', /function delilFileState\([\s\S]{0,120}verifyHashState/.test(appJs));
  check('içe aktarma delil günlüğüne yazar', /Delil paketinden alındı/.test(appJs) && /SHA-256 doğrulandı/.test(appJs));
  check('rapor üç çıktıda edinme satırı', (appJs.match(/acquisitionRows\(c\)/g) || []).length >= 3);
  check('delil tablosu sarar (kırpma yok)', /\.delil-table[\s\S]{0,500}overflow-wrap:\s*anywhere/.test(layer));
  check('delil stilinde ham hex yok', !/\.delil-[^{]*\{[^}]*#[0-9a-fA-F]{3,8}/.test(layer));
}

console.log('\n[2bh] Delil teslim zinciri ve alet deneyimi (v2.212)');
{
  const appJs = read('assets/app.js');
  const html = read('index.html');
  check('alet metni tek kaynaktan', /function delilToolText\(/.test(appJs));
  check('araç adı ürün markası değil', /ToolName = 'Edinim'/.test(read('tools/edinme/edinme.ps1')));
  check('köken panelinde sicil alanı', /data-origin-key="deliveredByRegistry"/.test(appJs));
  check('köken panelinde teslim yeri alanı', /data-origin-key="deliveryPlace"/.test(appJs));
  check('teslim alma penceresinde sicil alanı', /id="intakeDeliveredByRegistry"/.test(html));
  check('teslim alma penceresinde yer alanı', /id="intakeDeliveryPlace"/.test(html));
  check('köken tablosu teslim yerini taşır', /'TESLİM YERİ'/.test(appJs));
  check('rapor cihaz hücresi sürücü harfi taşımaz', !/vols\.join/.test(appJs) && !/vols\.length \? vols/.test(appJs));
  check('alet indirme düğmesi var', /id="downloadToolBtn"/.test(html));
  check('yardım ekranı v2.212 değişikliğini anar', /Son değişiklikler \(v2\.212\)/.test(html));
}

console.log('\n[2bi] Delil raporu sütunları ve Edinim aracı (v2.213)');
{
  const appJs = read('assets/app.js');
  const ps1 = read('tools/edinme/edinme.ps1');
  check('envanter 7 ayrı sütun', /inventoryHeaders: \['DOSYA ADI', 'DOSYA BİÇİMİ', 'DOSYA BOYUTU', 'SÜRE', 'SES KANALI', 'ÖRNEKLEME HIZI', 'SHA-256'\]/.test(appJs));
  check('envanter tek kaynak', /function inventoryRows\(/.test(appJs));
  check('köken tablosu kayıt cihazı/tarihi ayrı', /'KAYIT CİHAZI', 'KAYIT TARİHİ'\]/.test(appJs));
  check('edinme tablosu cihaz/etiket ayrı', /'CİHAZ', 'ETİKET', 'SERİ NO'/.test(appJs));
  check('kayıt cihazı/tarihi ayrı alan', /data-origin-key="recordingDevice"/.test(appJs) && /data-origin-key="recordingAt"/.test(appJs));
  check('edinme yöntemi cihaz alanına yazılmaz', !/deviceInfo: \[delilCopyTypeLabel/.test(appJs));
  check('alet adı Edinim', /ToolName = 'Edinim'/.test(ps1));
  check('alet sürümü 1.3', /ToolVersion = '1\.3'/.test(ps1));
  check('sürücü yolu normalize edilir', /function Normalize-DrivePath/.test(ps1));
  check('tek harf sürücü kabul edilir', /\^\[A-Za-z\]\$/.test(ps1));
  check('Türkçe konsol (UTF-8)', /chcp\.com 65001/.test(ps1));
  check('sihirbaz/sihirbaz adımı var', /EDİNİM|Edinim 1\.1/.test(ps1));
  // Windows PowerShell 5.1, BOM'suz UTF-8 dosyayı ANSI okur ve Türkçe bozulur.
  const raw = fs.readFileSync(path.join(ROOT, 'tools/edinme/edinme.ps1'));
  check('ps1 UTF-8 BOM taşır', raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf);
  // BOM kaybolursa cp1252'de "—" -> "”" olur ve PowerShell onu dize sınırı
  // sanıp sözdizimi hatası verir (v2.213'te canlıda yaşandı). Tipografik
  // karakter kullanmayız.
  check('ps1 tipografik tire içermez', !/\u2014/.test(ps1));
  check('ps1 akıllı tırnak içermez', !/[\u2018\u2019\u201c\u201d]/.test(ps1));
  check('zip BOM yardımcısı var', /function acquisitionToolFileContent\(/.test(appJs));
}

console.log('\n[2bj] Paket v2: kaynak dizin yapısı ve disk.json (v2.215)');
{
  const appJs = read('assets/app.js');
  const ps1 = read('tools/edinme/edinme.ps1');
  const html = read('index.html');
  const schema = read('assets/schema.js');
  check('paket yapısı icerik/ altında', /icerik\//.test(ps1) && /contentRoot/.test(ps1));
  check('relPath kaynak yolu (ses/ eklenmez)', /relPath\s*=\s*\$relPosix/.test(ps1) && !/relPath\s*=\s*\('ses\/'/.test(ps1));
  check('paket içi yol ayrı alan', /packagePath\s*=\s*\(\$contentRoot/.test(ps1));
  check('disk.json üretilir', /akis\.disk\.v1/.test(ps1) && /disk\.json/.test(ps1));
  check('varsayılan tüm dosyalar', /-AudioOnly/.test(ps1) && /-not \$AudioOnly/.test(ps1));
  check('uygulama disk.json okur', /function findDelilDiskPath/.test(appJs) && /function validateDiskDoc/.test(appJs));
  check('uygulama paket yolunu çözer', /function delilFilePath/.test(appJs));
  check('şema disk envanteri taşır', /disks: \[\]/.test(schema));
  check('yardım paket yapısını anar', /icerik\//.test(html) && /disk\.json/.test(html));
}

console.log('\n[2bk] Delil envanteri arayüzü (v2.216)');
{
  const appJs = read('assets/app.js');
  const html = read('index.html');
  const layer = read('assets/reading-layer.css');
  check('envanter bloğu HTML\'de', /id="delilInventory"/.test(html) && /id="delilInventoryBody"/.test(html));
  check('envanter çizimi tek kaynak', /function renderDelilInventory\(/.test(appJs) && /function inventoryTree\(/.test(appJs));
  check('ses satırı kaydı açar', /data-inv-material/.test(appJs) && /setActiveMaterial\(btn\.dataset\.invMaterial\)/.test(appJs));
  check('filtre ve paket seçimi', /id="invFilter"/.test(appJs) && /id="invPackSelect"/.test(appJs));
  check('envanter stili token kullanır', /\.di-tree[\s\S]{0,400}var\(--ink/.test(layer));
  check('envanter kırpmaz (sarar)', /\.di-name\s*\{[^}]*overflow-wrap:\s*anywhere/.test(layer));
  check('yardım envanteri anar', /Delil envanteri/.test(html));
}

console.log('\n[2bl] Gömülü metadata (cihaz beyanı) (v2.217)');
{
  const appJs = read('assets/app.js');
  const html = read('index.html');
  const layer = read('assets/reading-layer.css');
  check('rapor anahtarı var', /id="reportEmbeddedToggle"/.test(html));
  check('anahtar varsayılan kapalı', /includeEmbedded:\s*false/.test(read('assets/schema.js')));
  check('ayrıştırıcılar tanımlı', /function parseId3v2/.test(appJs) && /function parseMp4Meta/.test(appJs) && /function parseWavMeta/.test(appJs) && /function parseFlacMeta/.test(appJs));
  check('köken panelinde okuma düğmesi', /data-read-embedded/.test(appJs));
  check('rapor bölümü tek kaynak', /function embeddedRows/.test(appJs) && /REPORT_TEXT.embeddedHeading/.test(appJs));
  check('gömülü stil token kullanır', /\.origin-embedded[\s\S]{0,200}var\(--ink-2/.test(layer));
  check('yardım gömülü metadata anar', /Gömülü metadata/.test(html));
}

console.log('\n[2bm] Masaüstü ızgarası: delil envanteri kendi satırında (v2.218)');
{
  // ÖLÇÜM (v2.217, 1440×900): `#delilInventory` masaüstü ızgarasına
  // yerleştirilmemişti; örtük 3. satıra düşüp 220px sütunda 418px yer
  // kaplıyor, kayıt listesini 194px'e sıkıştırıyor ve detay panelini yarım
  // bırakıyordu (sağda ~448px boş bant). Ayrıca genişletilince detay paneli
  // kısalıyor, `.sd-right` `min-height:0` yüzünden metin alanı analiz
  // kutusunun ÜSTÜNE biniyordu (textarea alt 823 > dalga üst 742).
  // KURAL: envanter TAM GENİŞLİK kendi satırında; detay 2–3. satırı kaplar;
  // sağ sütun içeriğinden aşağı inmez (ezme değil, panel kaydırır).
  const rl = read('assets/reading-layer.css').replace(/\/\*[\s\S]*?\*\//g, '');
  check(
    'üç satırlı ızgara (envanter · yükleme · liste)',
    /#view-audio\.active\s*\{[^}]*grid-template-rows:\s*auto\s+auto\s+minmax\(0,\s*1fr\)/.test(rl)
  );
  check(
    'envanter tam genişlik üst satırda',
    /#view-audio > \.delil-inventory\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-row:\s*1/.test(rl)
  );
  check('yükleme alanı 2. satırda', /#view-audio > \.upload-zone\s*\{[^}]*grid-row:\s*2/.test(rl));
  check(
    'kayıt listesi 3. satırda',
    /#view-audio > \.panel:not\(\.detail-panel\)\s*\{[^}]*grid-row:\s*3/.test(rl)
  );
  check(
    'detay paneli 2–3. satırı kaplar (tam yükseklik)',
    /#view-audio > \.detail-panel\s*\{[^}]*grid-row:\s*2\s*\/\s*span\s*2/.test(rl)
  );
  check(
    'detay sağ sütunu içeriğinden aşağı inmez (örtüşme yok)',
    /#view-audio \.seg-detail \.sd-right\s*\{[^}]*min-height:\s*auto/.test(rl) &&
      !/#view-audio \.seg-detail \.sd-right\s*\{[^}]*min-height:\s*0\b/.test(rl)
  );
  check(
    'envanter panel diliyle uyumlu (radius + gölge token)',
    /\.delil-inventory\s*\{[^}]*border-radius:\s*var\(--r-lg\)[^}]*box-shadow:\s*var\(--shadow-sm\)/.test(rl)
  );
}

console.log(`\n== Sonuç: ${failures === 0 ? 'TASARIM TUTARLI' : failures + ' SAPMA VAR'} ==`);
process.exit(failures === 0 ? 0 : 1);
