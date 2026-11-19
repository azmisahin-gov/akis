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

console.log(`\n== Sonuç: ${failures === 0 ? 'SÜRÜM TUTARLI' : failures + ' SAPMA VAR'} ==`);
process.exit(failures === 0 ? 0 : 1);
