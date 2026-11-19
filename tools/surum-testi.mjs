/**
 * Sürüm tutarlılık kontrolü.
 *
 * Depo kuralı (AGENTS.md): sürüm numarası tek kaynaktan gelir
 * (`assets/app.js` → `APP_VERSION`) ve her güncellemede şu üç yer birlikte
 * artırılır:
 *   1. `assets/app.js` → APP_VERSION
 *   2. `CHANGELOG.md` → yeni "## vX.Y" başlığı
 *   3. `docs/YOL_HARITASI.md` → ilgili sürüm başlığı
 * Ayrıca `index.html` içindeki `?v=` önbellek parametreleri güncellenir.
 *
 * Bu betik, sürüm numarası bir yerde artırılıp başka yerde unutulduğunda
 * (v2.32–v2.48 arasında olduğu gibi) sessiz kaymayı yakalar.
 *
 * Çalıştırma:  node tools/surum-testi.mjs
 * Çıkış kodu 0 = tutarlı, 1 = sapma var.
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

console.log('== Sürüm tutarlılık kontrolü ==\n');

// 1) Tek kaynak: APP_VERSION
const appJs = read('assets/app.js');
const versionMatch = appJs.match(/const APP_VERSION = '([^']+)'/);
check('APP_VERSION bulundu', !!versionMatch);
const version = versionMatch ? versionMatch[1] : '';
console.log(`Sürüm: v${version}\n`);

// 2) Arayüz etiketi APP_VERSION'dan yazılmalı; index.html yalnız başlangıç
//    metni taşır ve orada güncel sürüm yazılı olmamalı (yoksa etiket eskir).
const indexHtml = read('index.html');
const staticLabel = indexHtml.match(/id="appVersion"[^>]*>([^<]*)</);
check(
  'index.html sürüm etiketi sabit güncel değer taşımıyor',
  !staticLabel || !new RegExp(`v${version.replace(/\./g, '\\.')}(?!\\d)`).test(staticLabel[1] || ''),
  staticLabel ? `başlangıç metni: "${staticLabel[1].trim()}"` : ''
);

// 3) Önbellek parametreleri güncel sürümü göstermeli.
const cacheParams = [...indexHtml.matchAll(/assets\/(app\.js|app\.css|tokens\.css|reading-layer\.css)\?v=([0-9.]+)/g)];
check('index.html içinde dört ?v= parametresi var', cacheParams.length === 4, `${cacheParams.length} bulundu`);
for (const [, file, v] of cacheParams) {
  check(`${file} ?v= güncel sürümle aynı`, v === version, `?v=${v} · APP_VERSION=${version}`);
}

// 4) CHANGELOG: "Güncel sürüm" satırı ve en yeni sürüm başlığı.
const changelog = read('CHANGELOG.md');
const clCurrent = changelog.match(/\*\*Güncel sürüm: v([0-9.]+?)\W*\*\*/);
check('CHANGELOG "Güncel sürüm" satırı var', !!clCurrent);
if (clCurrent) check('CHANGELOG güncel sürüm = APP_VERSION', clCurrent[1] === version, `v${clCurrent[1]}`);
const clHeading = new RegExp(`^## v${version.replace(/\./g, '\\.')}(?!\\d)`, 'm').test(changelog);
check(`CHANGELOG "## v${version}" başlığı var`, clHeading);
// Sürüm bölümü gerçekten anlatılmalı: başlık altında en az bir madde olmalı.
const clSection = changelog.split(/^## /m).find((b) => b.startsWith(`v${version}`));
check(
  `CHANGELOG v${version} bölümü içerik taşıyor`,
  !!clSection && /[-*]\s/.test(clSection),
  clSection ? `${clSection.split('\n').length} satır` : 'bölüm yok'
);

// 5) Yol haritası: güncel sürüm satırı ve ilgili başlık.
const roadmap = read('docs/YOL_HARITASI.md');
const rmCurrent = roadmap.match(/\*\*Güncel sürüm: v([0-9.]+?)\W*\*\*/);
check('YOL_HARITASI "Güncel sürüm" satırı var', !!rmCurrent);
if (rmCurrent) check('YOL_HARITASI güncel sürüm = APP_VERSION', rmCurrent[1] === version, `v${rmCurrent[1]}`);
const minor = version.split('.').slice(0, 2).join('.');
check(
  `YOL_HARITASI v${minor} başlığını anıyor`,
  new RegExp(`v${minor.replace(/\./g, '\\.')}(?!\\d)`).test(roadmap)
);

// 6) README, OZELLIKLER ve AGENTS da aynı sürümü göstermeli.
for (const [file, re] of [
  ['README.md', /\*\*Sürüm:\*\* v([0-9.]+)/],
  ['docs/OZELLIKLER.md', /\(v([0-9.]+) — mevcut durum\)/],
  ['AGENTS.md', /\*\*Güncel sürüm: v([0-9.]+?)\W*\*\*/]
]) {
  const m = read(file).match(re);
  check(`${file} güncel sürümü gösteriyor`, !!m && m[1] === version, m ? `v${m[1]}` : 'eşleşme yok');
}

// 7) BELGE KAPSAMI: son sürümlerin özellikleri OZELLIKLER.md'de anılmalı.
// Kullanıcı: "Bugüne kadar yaptığımız her şeyi not alıyor muyuz? İki gün sonra
// unutmayalım, tasarımı değiştirdiğimizde kaybolmasın." Bu kontrol, yeni bir
// özellik belgeye yazılmadan sürüm çıkmasını engeller.
const ozellikler = read('docs/OZELLIKLER.md');
const REQUIRED_TOPICS = [
  ['geri alma', /geri al|Ctrl\+Z/i],
  ['bölme', /böl|✂/i],
  ['aralık çözümleme', /aralığı çözümle|yeniden çözümle/i],
  ['depolama / IndexedDB', /IndexedDB|depolama/i],
  ['metin geçmişi', /metin geçmişi|geçmiş \(N\)/i],
  ['dalga etkileşimi', /Shift\+sürükle|tekerlek/i],
  ['model seçimi', /model seçimi|akis\.model/i],
  // v2.78–v2.81 özellikleri. Bu satırlar olmadan yeni özellik belgeden
  // sessizce düşebilir; kullanıcının asıl kaygısı buydu.
  ['A–B dinleme döngüsü', /A–B dinleme döngüsü|🔁 Döngü/],
  ['dinlerken sınır bozulmaz', /Alt\+tıkla/],
  ['konuşmacı standardı (S1)', /S1, S2|standart konuşmacı kodu/i],
  ['hızlı onaya uygun', /Hızlı onaya uygun/i],
  ['toplu onay', /toplu onay|hızlı onayla/i],
  ['çözümleme profili', /Çözümleme profilleri|Çözümleme profili/i],
  ['profilin sınırı', /şive tanıma[\s\S]{0,200}yapmaz|kaynak ayrıştırma[\s\S]{0,120}yapmaz/i]
];
for (const [label, rx] of REQUIRED_TOPICS) {
  check(`OZELLIKLER.md '${label}' konusunu anıyor`, rx.test(ozellikler));
}

// 8) YARDIM EKRANI: kullanıcının sık sorduğu konular yardımda olmalı.
const helpHtml = read('index.html');
const HELP_TOPICS = [
  ['geri alma / Ctrl+Z', /Ctrl\+Z/],
  ['bölme', /Bölme ve geri alma/],
  ['dalga kullanımı', /Shift\+sürükle/],
  ['ekip çalışması', /Ekip çalışması/],
  // v2.78–v2.81 yardım bölümleri.
  ['A–B döngüsü', /A–B döngüsü/],
  ['konuşmacı standardı', /Konuşmacı standardı/],
  ['toplu onay', /toplu onay/],
  ['çözümleme profili', /Çözümleme profili/]
];
for (const [label, rx] of HELP_TOPICS) {
  check(`Yardım ekranı '${label}' konusunu anıyor`, rx.test(helpHtml));
}

// 9) ARAYÜZ KİMLİK EŞLEŞMESİ: JS'in aradığı kimlik HTML'de olmalı.
// v2.75–v2.81'de `renderUndoState` #undoState arıyordu ama düğmenin kimliği
// #undoBtn idi. Sayaç hiç yazılmadı, düğme hep devre dışı kaldı; "Ctrl+Z ile
// geri alınır" vaadi arayüzde çalışmıyordu. Testler sahte DOM kullandığı için
// bunu yakalayamıyordu. Bu kontrol, JS'in zorunlu kimliklerinin HTML'de
// bulunduğunu denetler.
const REQUIRED_IDS = [
  ['geri alma düğmesi', 'undoBtn'],
  ['sürüm etiketi', 'appVersion'],
  ['model seçici', 'modelSelect'],
  ['çözümleme profili seçici', 'asrProfileSelect'],
  ['ayarlar çekmecesi', 'settingsDrawer'],
  ['dosya bilgileri çekmecesi', 'caseDrawer'],
  ['yardım penceresi', 'helpDialog']
];
for (const [label, id] of REQUIRED_IDS) {
  check(`index.html '${label}' (#${id}) içeriyor`, new RegExp(`id="${id}"`).test(indexHtml));
}
// renderUndoState yanlış kimliğe dönmesin: #undoBtn aranmalı.
const undoFn = appJs.match(/function renderUndoState\(\)[\s\S]{0,700}?\n}/);
check(
  'renderUndoState doğru düğmeyi hedefliyor',
  !!undoFn && /#undoBtn/.test(undoFn[0]),
  undoFn ? '' : 'fonksiyon bulunamadı'
);

// 10) VERİ GÜVENLİĞİ KURALLARI (v2.84)
// Kullanıcı canlı veriye geçti; bu dört koruma kodsuz kalmamalı.
const hasFlush = /window\.addEventListener\('beforeunload'/.test(appJs);
check('sayfa kapanışında yazma zorlanıyor (beforeunload)', hasFlush);
check('pagehide/visibilitychange koruması var',
  /addEventListener\('pagehide'/.test(appJs) && /visibilitychange/.test(appJs));
check('çoklu sekme yazma koruması var (BroadcastChannel)',
  /new BroadcastChannel\('akis\.tab'\)/.test(appJs) && /tabWriteGuard/.test(appJs));
// loadState GÖVDESİNDE sessiz sıfırlama olmamalı (başlangıç değeri hariç).
const loadFn = appJs.match(/async function loadState\(\)[\s\S]*?\n\}/);
check('yükleme hatası veriyi silmiyor (showLoadFailure)',
  !!loadFn && /function showLoadFailure/.test(appJs) &&
    !/appState = \{ cases: \[\], activeCaseId: null \}/.test(loadFn[0]));
check('bozuk dosya izolasyonu (reportLoadFailures)',
  /function reportLoadFailures/.test(appJs) && /akis\.rescue\.failedCases/.test(appJs));
check('kurtarma kopyası yazılıyor ve okunuyor',
  /akis\.lastSnapshot/.test(appJs) && /function readLastSnapshot/.test(appJs));
check('dışa aktarma TÜM dosyaları kapsıyor (arşiv)',
  /kind: 'archive'/.test(appJs) && /archive\.json/.test(appJs));
check('arşivden geri yükleme var (importArchive)',
  /async function importArchive/.test(appJs) && /zip\.file\('archive\.json'\)/.test(appJs));
// v2.86: eksik ses sessizce atlanmamalı (yedek "tam" görünüp ses olmayabilir).
check('eksik ses yedeğe yazılıyor (EKSIK_SES_UYARISI)', /EKSIK_SES_UYARISI/.test(appJs));
check('eksik ses kullanıcıya bildiriliyor', /bulunamadı ve pakete GİRMEDİ/.test(appJs));
// v2.86: yazarken ağır yenileme geciktirilir (500 bölümde tuş başına 8,5 ms).
check('yazma sırasında ağır iş geciktiriliyor', /function scheduleLightRefresh/.test(appJs));

console.log(`\n== Sonuç: ${failures === 0 ? 'SÜRÜM TUTARLI' : failures + ' SAPMA VAR'} ==`);
process.exit(failures === 0 ? 0 : 1);
