// Rapor çalışma alanının SAF (DOM'suz) yardımcıları.
// Tarayıcıdan bağımsızdır; `tools/birim-testleri.mjs` bu dosyayı doğrudan
// içe aktarıp sınar. Uygulama (`assets/app.js`) da AYNI fonksiyonları kullanır;
// kopya tanım yoktur (tek kaynak).

/**
 * Anahtar sırasına duyarlı, deterministik JSON. İki revizyonun "aynı mı"
 * sorusu referansla değil içerikle yanıtlanır.
 */
export function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + stableJson(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/** Revizyon özetinin parmak izi (içerik eşitliği için). */
export function revisionDigest(snapshot) {
  return stableJson(snapshot && typeof snapshot === 'object' ? snapshot : {});
}

/**
 * İki revizyon özetini alan gruplarına göre karşılaştırır.
 * `labels` = { anahtar: görünenAd }. Döner: [{ key, label, changed }].
 */
export function compareRevisionGroups(left, right, labels) {
  const a = left && typeof left === 'object' ? left : {};
  const b = right && typeof right === 'object' ? right : {};
  const map = labels && typeof labels === 'object' ? labels : {};
  return Object.keys(map).map((key) => ({
    key,
    label: map[key],
    changed: stableJson(a[key]) !== stableJson(b[key])
  }));
}

/**
 * Dizide bir öğeyi (string ya da `{key}` nesnesi) yukarı/aşağı taşır.
 * Yeni dizi döner; sınır dışında değişiklik yapmaz (idempotent).
 */
export function moveInList(items, key, direction) {
  const list = Array.isArray(items) ? items.slice() : [];
  const index = list.findIndex((item) => (typeof item === 'string' ? item : item && item.key) === key);
  if (index < 0 || !Number.isInteger(direction) || direction === 0) return list;
  const target = Math.max(0, Math.min(list.length - 1, index + Math.sign(direction)));
  if (target === index) return list;
  const tmp = list[index];
  list[index] = list[target];
  list[target] = tmp;
  return list;
}

/**
 * Ana bölüm numaralarını AÇIK ve SIRALI bölümlere göre türetir.
 * Kapalı bölüm numara almaz → numarada boşluk kalmaz (1,2,3…).
 * `isOn` = (key) => boolean, `mainKeys` = ['s1'..'s7'].
 */
export function mainSectionNumbers(order, isOn, mainKeys) {
  const keys = Array.isArray(mainKeys) ? mainKeys : [];
  const on = typeof isOn === 'function' ? isOn : () => true;
  const map = {};
  let n = 0;
  for (const key of Array.isArray(order) ? order : []) {
    if (!keys.includes(key)) continue;
    if (!on(key)) continue;
    map[key] = ++n;
  }
  return map;
}

/** Bir anahtarı hedef anahtarın konumuna taşır (sürükle-bırak, v2.296). */
export function moveKeyTo(items, key, targetKey) {
  const list = Array.isArray(items) ? items.slice() : [];
  const from = list.indexOf(key);
  const to = list.indexOf(targetKey);
  if (from < 0 || to < 0 || from === to) return list;
  const [x] = list.splice(from, 1);
  list.splice(to, 0, x);
  return list;
}
