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
import { execFileSync } from 'node:child_process';
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

// 2b) KRİTİK (v2.117): app.js içindeki `import './schema.js'` SÜRÜMSÜZ olamaz.
// NEDEN: v2.116'da canlı site AÇILMADI —
//   Uncaught SyntaxError: The requested module './schema.js' does not provide
//   an export named 'AMBIGUOUS_REVIEW'
// Sebep: index.html `app.js?v=2.116` yükler ama app.js içindeki import
// `from './schema.js'` SÜRÜMSÜZDÜ. `?v=` yalnız script etiketini kırar;
// iç import'u KIRMAZ. GitHub Pages `cache-control: max-age=600` verdiği için
// tarayıcı ESKİ schema.js'i kullandı → yeni export bulunamadı.
// KURAL: modül import'ları `?v=${APP_VERSION}` taşır (ya da hiç ?v= yoksa
// schema.js'in önbelleklenmesi engellenmelidir). Test bunu ZORUNLU kılar.
const appSrc = read('assets/app.js');
const importMatch = appSrc.match(/from\s+'\.\/schema\.js([^']*)'/);
check('app.js schema.js import satırı bulundu', !!importMatch, importMatch ? importMatch[0] : 'bulunamadı');
if (importMatch) {
  const q = importMatch[1];
  check(
    'schema.js import SÜRÜMLÜ (?v=) — önbellek uyuşmazlığı olmaz',
    /^\?v=[0-9.]+$/.test(q),
    q ? `import "${q}"` : 'sürüm parametresi YOK (canlı site açılmaz)'
  );
  if (/^\?v=/.test(q)) {
    check('schema.js import sürümü APP_VERSION ile aynı', q === `?v=${version}`, `import "${q}" · APP_VERSION=${version}`);
  }
}
// 2b-2) report-model.js import'u da SÜRÜMLÜ olmalı (v2.227). ?v= verilen bir
// modülün tüm import zinciri sürümlenmelidir; aksi hâlde tarayıcı karışık
// sürüm yükler (v2.117 dersi).
const modelMatch = appSrc.match(/from\s+'\.\/report-model\.js([^']*)'/);
check('app.js report-model.js import satırı bulundu', !!modelMatch, modelMatch ? modelMatch[0] : 'bulunamadı');
if (modelMatch) {
  const q = modelMatch[1];
  check('report-model.js import SÜRÜMLÜ (?v=)', /^\?v=[0-9.]+$/.test(q), q ? `import "${q}"` : 'sürüm parametresi YOK');
  if (/^\?v=/.test(q)) {
    check('report-model.js import sürümü APP_VERSION ile aynı', q === `?v=${version}`, `import "${q}" · APP_VERSION=${version}`);
  }
}

// 2c) KENDİ KENDİNE GÜNCELLEME (v2.118): version.json + bootstrap.
// NEDEN: GitHub Pages HER dosyaya `cache-control: max-age=600` verir —
// `index.html` dâhil. Push sonrası kullanıcı 10 dk ESKİ index.html görür;
// o dosyadaki `?v=` de eski kalır. Kullanıcıya "Ctrl+Shift+R bas" dedirtmek
// ölçeklenmez (çok kullanıcı var). Çözüm: sayfa kendi sürümünü periyodik
// olarak `version.json` ile karşılaştırır ve gerekirse KENDİSİ yenilenir.
const versionJsonPath = path.join(ROOT, 'version.json');
check('version.json var', fs.existsSync(versionJsonPath));
if (fs.existsSync(versionJsonPath)) {
  let vj = null;
  try {
    vj = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  } catch (e) {}
  check('version.json geçerli JSON', !!vj, vj ? '' : 'okunamadı');
  check('version.json sürümü APP_VERSION ile aynı', vj && String(vj.version) === version, vj ? `version.json=${vj.version} · APP_VERSION=${version}` : '');
}
// index.html bootstrap: RUNNING sabiti + version.json okuma + yenileme
check(
  'index.html güncelleme denetimi taşıyor (version.json)',
  /version\.json/.test(indexHtml)
);
check(
  'index.html bootstrap sürümü APP_VERSION ile aynı',
  new RegExp(`var RUNNING = '${version.replace(/\./g, '\\.')}'`).test(indexHtml),
  ''
);
check(
  'index.html yenileme önbelleği kırıyor (location.replace + ?t=)',
  /location\.replace/.test(indexHtml) && /set\(\s*'t'/.test(indexHtml)
);
// app.js: güvenli yenileme kancası (yazarken/çözümlerken yenileme YOK)
check(
  'app.js güvenli yenileme kancası tanımlıyor (__akisIdle)',
  /__akisIdle\s*=/.test(appSrc)
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
  ['profilin sınırı', /şive tanıma[\s\S]{0,200}yapmaz|kaynak ayrıştırma[\s\S]{0,120}yapmaz/i],
  ['gözlem işaretleri (telefon/sessizlik)', /telefon görüşmesi[\s\S]{0,300}sessizlik \(konuşma yok\)|sessizlik \(konuşma yok\)[\s\S]{0,300}telefon görüşmesi/i],
  ['sınıflandırma/rol tek kaynak', /Sınıflandırma\/rol seçenekleri tek kaynaktan|sınıflandırma ve rol etiketleri[\s\S]{0,100}tek kaynak/i],
  ['dosyalar arası konuşmacı', /Dosyalar arası konuşmacı kaydı|Dosyalar arası kişi/i],
  ['delil paketi', /Delil paketi|delil\.json/i],
  // v2.330 — fizikî dosya teslim ve iade.
  ['fizikî dosya teslim/iade', /Fizikî dosya teslim ve iade/],
  // v2.331 — belge paketi UDF + DOCX.
  ['belge paketi UDF + DOCX', /UDF \+ DOCX|UDF ve DOCX/],
  // v2.339 — teslim kontrol listesi (EK-5).
  ['teslim kontrol listesi (EK-5)', /Teslim kontrol listesi \(EK-5|TESLİM KONTROLÜ/],
  // v2.341 — tarafsızlık beyanı (56.12 hâl beyanı).
  ['tarafsızlık beyanı', /Tarafsızlığı etkileyebilecek hâl beyanı|TARAFSIZLIĞI ETKİLEYEBİLECEK HÂL BEYANI/],
  // v2.342 — kullanıcı varsayılan metinleri.
  ['varsayılan metinler', /Kendi varsayılan metinlerim|Varsayılan metinler \(v2\.342\)/],
  // v2.343 — kayıtlı metinler (tek tıkla ekle).
  ['kayıtlı metinler', /Kayıtlı metinlerim/],
  // v2.383 — okuma metni durumu + kısa kayıt adı.
  ['okuma metni kontrol durumu', /Okuma metninde kontrol durumu görünür|readingStatusLabel/],
  ['kısa kayıt adı', /Kayıt 1[\s\S]{0,160}(KAYIT NUMARALARI|speakerRecordLegend)/],
  // v2.384 — belge akışı: kısa bölümler akar, tablo notu tabloyla kalır.
  ['belge akışı', /Belge akışı|keepLines|tek paragraf kalan sayfa/i],
  // v2.385 — her kayıt yeni sayfa + DOCX XML güvenliği.
  ['kayıt yeni sayfa / XML güvenliği', /Her kayıt yeni sayfadan|XML güvenliği|xesc/i],
  // v2.386 — kurumsal belge tasarımı (üst/alt bilgi, künye, tablo teması).
  ['kurumsal belge tasarımı', /Kurumsal belge tasarımı|İki sütunlu sade|Nötr gri/],
  // v2.387 — üst yazı sıfırdan: A4 kâğıt + çekmece, kendi yazdırma ayarı.
  ['üst yazı yeniden yapım', /Üst yazı yeniden yapıldı|Üst yazı sıfırdan|A4 kâğıt.*çekmece/i],
  // v2.389 — bölüm arşivi (listeden çıkar, geri alınabilir).
  ['bölüm arşivi', /Bölüm arşivi|Arşiv \(N\)|arşive al/i],
  // v2.391 — bilirkişi unvanı ayrı alan.
  ['bilirkişi unvanı', /Bilirkişi unvanı|BİLİRKİŞİ UNVANI|Unvan/i]
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
  ['çözümleme profili', /Çözümleme profili/],
  ['gözlem işaretleri', /Gözlem işaretleri/],
  ['sınıflandırma/rol tek kaynak', /Sınıflandırma ve rol etiketleri artık tek kaynaktan/],
  ['dosyalar arası kişiler', /Dosyalar arası kişiler/],
  ['delil paketi', /Delil paketi \(Tier 1\)/],
  ['ses gömme ölçümü', /Ses gömme ölçümü/],
  ['hızlı etiket sözlüğü', /Hızlı etiketler \(metne ekleme\)/],
  ['duyulmuyor/anlaşılmaz ayrımı', /\[duyulmuyor\]/],
  ['dosya görünümü', /Dosya görünümü \(v2\.315\)/],
  // v2.330 — fizikî dosya teslim ve iade.
  ['fizikî dosya teslim/iade', /Fizikî dosya teslim ve iade \(v2\.330\)/]
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
  ['yardım penceresi', 'helpDialog'],
  ['delil paketi penceresi', 'delilResultDialog'],
  ['delil paketi düğmesi', 'importDelilBtn'],
  ['rapor çalışma alanı', 'reportWorkspace'],
  ['rapor revizyon kartı', 'reportRevisions'],
  ['A4 sayfa sayacı', 'reportPageCount'],
  ['rapor mod düğmeleri', 'reportModes'],
  ['kontrol özet çipi', 'reportCheckChip'],
  ['rapor bölüm arama', 'reportSectionSearch'],
  ['rapor yalnız açık', 'reportOnlyOpen'],
  ['rapor kategori çipleri', 'reportSectionCats'],
  ['durum çubuğu bölüm sayacı', 'sbSegmentsWrap'],
  ['bölüm düzenleyici', 'reportSectionEditor'],
  ['bölüm düzenleyici alanları', 'reportSectionEditorFields'],
  ['sayfaya sığdır anahtarı', 'reportFitToggle'],
  ['sayfa penceresi', 'reportPageWindow'],
  ['sayfa gezinme', 'reportPageNav'],
  ['sürekli mod anahtarı', 'reportContinuousToggle'],
  ['rapor alanları paneli', 'reportColumnsBox'],
  ['rapor alanları listesi', 'reportColumnsFields'],
  ['rapor ayar sekmeleri', 'reportSideTabs'],
  ['dar ekran iskelet düğmesi', 'reportOutlineBtn'],
  ['rapor diğer işlemler menüsü', 'reportMore'],
  ['rapor ayarları düğmesi', 'reportSettingsBtn'],
  ['rapor ayarları kapatma', 'closeReportSettings'],
  ['rapor çekmece karartması', 'reportDrawerBackdrop'],
  ['rapor profili penceresi', 'profileDialog'],
  ['rapor profili adı', 'profileName'],
  // v2.312 — teslim tarihi zekâsı (JS bu kimlikleri arıyor; yoksa sessiz boş).
  ['dashboard teslim paneli', 'deliveryPanel'],
  ['durum çubuğu teslim göstergesi', 'sbDue'],
  ['rayda dosya girişi', 'navCase'],
  ['son teslim hesapla düğmesi', 'dueDateAutoBtn'],
  ['son teslim ipucu', 'dueDateHint'],
  ['rapor ekranı teslim çipi', 'reportDueChip'],
  // v2.319 — görünür sürüm + tek tık yenile.
  ['sürüm yenile düğmesi', 'reloadVersionBtn'],
  ['üst sürüm etiketi', 'topVersion'],
  // v2.315 — Dosya görünümü (sayfa).
  ['dosya görünümü', 'view-case'],
  ['dosya sayfası gövdesi', 'casePageBody'],
  ['dosya sayfası durumu', 'casePageStatus'],
  // v2.330 — fizikî dosya teslim ve iade (form çekmecede, tek düzenleyici).
  ['fizikî dosya formu', 'physicalFileForm'],
  // v2.338 — açılış gecikme uyarısı (JS #dueNotice arıyor).
  ['gecikme şeridi', 'dueNotice'],
  // v2.342 — varsayılan metinler (Ayarlar).
  ['varsayılan metinler paneli', 'defaultsHost'],
  // v2.356 — çalışma notları (kişisel defter; rapora girmez).
  ['not defteri düğmesi', 'notebookBtn'],
  ['not defteri çekmecesi', 'notebookDrawer'],
  ['not defteri girişi', 'notebookInput'],
  ['not defteri ekle düğmesi', 'notebookAdd'],
  ['not defteri listesi', 'notebookList'],
  ['paket not anahtarı', 'scopeExcludeNotes'],
  // v2.360 — Ayarlar sekmeleri + metin araması.
  ['ayarlar sekmeleri', 'settingsTabs'],
  ['metin sayacı', 'settingsTextCount'],
  // v2.361 — rapor metinleri ayrı pencere.
  ['metinler penceresi', 'textsDialog'],
  ['metinler bağlantısı', 'openTextsBtn'],
  ['rapor metinleri düğmesi', 'reportTextsBtn']
  // `defaultsSearch` JS ile üretilir (statik HTML'de yok); tasarim [2dv] denetler.
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

// [10b] METİN ENVANTERİ (v2.344): rapor metinleri değiştiyse belge yenilenmeli.
// NEDEN: hukuk danışmanlığı için üretilen metin listesi elle tutulursa eskir;
// belge KODDAN üretilir ve burada güncelliği denetlenir.
check('metin envanteri belgesi var', fs.existsSync(path.join(ROOT, 'docs/METIN_ENVANTERI.md')));
try {
  execFileSync(process.execPath, [path.join(ROOT, 'tools/metin-envanteri.mjs'), '--check'], { cwd: ROOT, stdio: 'pipe' });
  check('metin envanteri güncel (kod ile aynı)', true);
} catch (e) {
  check('metin envanteri güncel (kod ile aynı)', false, 'node tools/metin-envanteri.mjs çalıştırın');
}

// [10c] DEMO PAKETİ (v2.351): kurgusal demo paketi okunabilir ve doludur.
{
  const demoPath = path.join(ROOT, 'sample_data/demo/AKIS_Demo_Kurgusal.akis');
  check('demo paketi var', fs.existsSync(demoPath));
  if (fs.existsSync(demoPath)) {
    const size = fs.statSync(demoPath).size;
    check('demo paketi makul boyutta', size > 500 * 1024 && size < 6 * 1024 * 1024, `${(size / 1024 / 1024).toFixed(2)} MB`);
    const JSZip = (await import(path.join(ROOT, 'assets/vendor/jszip.min.js'))).default;
    const zip = await JSZip.loadAsync(fs.readFileSync(demoPath));
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    check('demo: case.json var', names.includes('case.json'));
    check('demo: iki ses dosyası var', names.filter((n) => n.startsWith('audio/') && n.endsWith('.wav')).length === 2);
    const pack = JSON.parse(await zip.file('case.json').async('string'));
    check('demo: paket şeması', pack.schema === 'mihenk.project.v1', pack.schema);
    check('demo: kurgusal dosya numarası', pack.case && pack.case.fileNo === '2026/214 E.', pack.case && pack.case.fileNo);
    check('demo: bölümler dolu', pack.case.materials.reduce((n, m) => n + m.segments.length, 0) >= 10);
    check('demo: sorular dolu', (pack.case.questions || []).length >= 3);
    check('demo: kişi eşleştirmesi var', (pack.case.speakers || []).length >= 1);
  }
}

// [11] Terim tutarlılığı (v2.123) -----------------------------------------
// KURAL: kullanıcı aynı şeye iki ad vermez. "Dosya" = tek dava/çalışma alanı;
// "Paket" = taşınabilir .akis dosyası (1+ dosya + ses). Eylemler: Paket
// oluştur · Paketten yükle · ⇄ Birleştir · Arşivle. Eski sürüm notlarında
// tarihsel olarak "Dışa aktar" geçebilir; sözlük bugünkü adı söyler.
console.log('\n[11] Terim tutarlılığı (paket / dosya / birleştir / arşiv)');
{
  const html = read('index.html');
  const btnText = (id) => {
    const m = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>([^<]*)<`));
    return (m ? m[1] : '').trim();
  };
  check('dışa aktarma düğmesi "Paket oluştur"', btnText('exportProjectBtn') === 'Paket oluştur', btnText('exportProjectBtn'));
  check('içe aktarma düğmesi "Paketten yükle"', btnText('importProjectBtn') === 'Paketten yükle', btnText('importProjectBtn'));
  check('birleştirme düğmesi "⇄ Birleştir"', /Birleştir/.test(btnText('mergeProjectBtn')));

  // Kapsam diyaloğu paket dilini kullanır.
  const dlg = (html.match(/<dialog id="exportScopeDialog"[\s\S]*?<\/dialog>/) || [''])[0];
  check('kapsam diyaloğu "PAKET" der', /PAKET/.test(dlg));
  check('kapsam diyaloğu ne sorduğunu söyler', /pakete girsin/i.test(dlg));
  check('kapsam diyaloğu "Paketten yükle" yönlendirir', /Paketten yükle/.test(dlg));
  check('bayat dosya adı örneği kalmadı', !/AKIS_Yedek_N_dosya/.test(html));
  check('yeni paket adı yardımda örneklenir', /AKIS_Paket_/.test(html));

  // [11b] "Yedek" KULLANICI METNİNDE YOK (v2.155). Sözlük "Paket" der; eski
  // sürüm notları ve yardım ekranındaki geçmiş TARİHSELDİR, taranmaz.
  // Yorumlar taranmaz (kullanıcı görmez).
  const stripComments = (src) => src.replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const uiHtml = html.replace(/<dialog id="helpDialog"[\s\S]*?<\/dialog>/, '');
  const appNoNotices = stripComments(read('assets/app.js')).replace(/const VERSION_NOTICES = \{[\s\S]*?\n\};/, '');
  const yedekHits = [];
  for (const [src, txt] of [['index.html', uiHtml], ['app.js', appNoNotices]]) {
    for (const m of txt.matchAll(/.{0,24}Yede[kğ].{0,24}/g)) yedekHits.push(src + ': ' + m[0].replace(/\s+/g, ' ').trim());
  }
  check('kullanıcı metninde "Yedek" yok', yedekHits.length === 0, yedekHits.slice(0, 3).join(' | '));
  check('kapsam düğmesi "Paketi oluştur"', btnText('exportScopeOk') === 'Paketi oluştur', btnText('exportScopeOk'));
  check('kapsam notu bozulmamış (<code> içine <p> girmemiş)', !/<code>AKIS_Paket_<p/.test(html));
  check('arşiv notu "pakete dâhil" der', /Pakete dâhil edilirler/.test(read('assets/app.js')));
  // YAPISAL SAĞLIK: satır içi etiketin içine blok etiket girmemeli. v2.155'te
  // kapsam notu bozulmuştu (`<code>...<p class="scope-note">`) ve tarayıcı
  // metni iki kez gösteriyordu; etiket sayısı dengeli olduğu için yalnız
  // denge kontrolü bunu YAKALAMAZ.
  check('satır içi etiket içine blok girmemiş', !/<(code|b|small|span|label)[^>]*>[^<]*<(p|div)[\s>]/.test(uiHtml));
  const bal = (tag) => [(uiHtml.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length, (uiHtml.match(new RegExp('</' + tag + '>', 'g')) || []).length];
  check('index.html <p> dengesi', bal('p')[0] === bal('p')[1], bal('p').join('/'));
  check('index.html <code> dengesi', bal('code')[0] === bal('code')[1], bal('code').join('/'));

  // Yardım sözlüğü tek kaynak: terimler açıkça tanımlı.
  check('yardımda terim sözlüğü var', /Terimler: dosya, paket/.test(html));
  check('yardım paketi tanımlar', /Paket \(\.akis\)|Paket<\/b> =/.test(html));
  check('yardım arşivin silmediğini söyler', /Arşivle<\/b> = .*silinmez/.test(html));

  // Durum yazıları: "yedek" yerine "paket".
  check('üst bar "Hiç paket oluşturulmadı"', /Hiç paket oluşturulmadı/.test(html));
  check('uygulama "Paket yok" der', /'Paket yok'/.test(appJs));
  check('uygulama "Son paket" der', /Son paket/.test(appJs));
  check('kaydetme hatası paket oluşturmayı önerir', /Paket oluştur/.test(appJs));
}


// 12) KÖK DİZİN HİJYENİ (v2.276). Kök dizin GitHub Pages'te HERKESE AÇIK
// yayınlanır. Uygulama dışı belge/medya (rapor çıktısı, ses, video) kökte
// durursa kullanıcı dosyası farkında olmadan yayınlanır. AGENTS kuralı:
// "Kök dizine eklenecek her dosya canlı siteye çıkar."
{
  const ROOT_ALLOW = new Set([
    '.gitignore', '.nojekyll', '.prettierrc.json',
    'AGENTS.md', 'CHANGELOG.md', 'README.md',
    'START.bat', 'favicon.ico', 'index.html', 'run.ps1', 'version.json',
    'assets', 'docs', 'sample_data', 'templates', 'tools'
  ]);
  // YAYINLANAN = git'e İZLENEN. Yerelde kalan ama `.gitignore`da olan dosya
  // (ör. kullanıcı raporu) yayınlanmaz; onu suçlamak yanlış pozitif olur.
  let rootEntries = null;
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
    rootEntries = [...new Set(out.split('\u0000').filter(Boolean).map((p) => p.split('/')[0]))];
  } catch (e) {
    rootEntries = fs.readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.name !== '.git')
      .map((e) => e.name);
  }
  const unexpected = rootEntries.filter((n) => !ROOT_ALLOW.has(n));
  check('kök dizinde yalnız uygulama dosyaları var', unexpected.length === 0, unexpected.join(', '));
  const media = rootEntries.filter((n) => /\.(udf|docx|pdf|wav|mp3|mp4|mov|webm|akis|zip)$/i.test(n));
  check('kök dizinde rapor/medya dosyası yok', media.length === 0, media.join(', '));
}

console.log(`\n== Sonuç: ${failures === 0 ? 'SÜRÜM TUTARLI' : failures + ' SAPMA VAR'} ==`);
process.exit(failures === 0 ? 0 : 1);
