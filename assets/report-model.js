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

/**
 * Bir düğümü ALT AĞACIYLA birlikte kendi düzeyindeki (aynı ebeveynli) komşusuyla
 * yer değiştirir (↑↓ düğmeleri, v2.299).
 *
 * v2.297'de bölümler ağaç oldu (parent haritası) ve `order` DFS sırasıdır. Düz
 * `moveInList` yalnız TEK anahtarı kaydırıyordu: ebeveyni çocuklarının üstüne
 * indirince `normalizeReportLayout` sırayı yeniden DFS'e çevirip değişikliği
 * SESSİZCE geri alıyordu ("↑↓ hiçbir şey yapmıyor"). Bu fonksiyon düğümü alt
 * ağacıyla taşır; DFS korunur ve normalize sonucu bozmaz.
 *
 * `dir < 0` yukarı, `dir > 0` aşağı. Aynı düzeyde komşu yoksa dizi DEĞİŞMEZ.
 */
export function moveTreeBlock(order, parent, key, dir) {
  const list = Array.isArray(order) ? order.slice() : [];
  const par = parent && typeof parent === 'object' ? parent : {};
  const from = list.indexOf(key);
  if (from < 0 || !Number.isInteger(dir) || dir === 0) return list;

  const parentOf = (k) => par[k] || '';
  const subtree = (root) => {
    const set = new Set();
    const stack = [root];
    while (stack.length) {
      const k = stack.pop();
      if (set.has(k)) continue;
      set.add(k);
      for (const x of list) if (par[x] === k) stack.push(x);
    }
    return set;
  };

  const blockSet = subtree(key);
  const block = list.filter((k) => blockSet.has(k));
  const rest = list.filter((k) => !blockSet.has(k));
  const p = parentOf(key);

  if (dir < 0) {
    let prev = null;
    for (let i = from - 1; i >= 0; i--) {
      if (parentOf(list[i]) === p) {
        prev = list[i];
        break;
      }
    }
    if (!prev) return list;
    const prevBlock = subtree(prev);
    const at = rest.findIndex((k) => prevBlock.has(k));
    if (at < 0) return list;
    rest.splice(at, 0, ...block);
    return rest;
  }

  const blockEnd = list.indexOf(block[block.length - 1]);
  let next = null;
  for (let i = blockEnd + 1; i < list.length; i++) {
    if (parentOf(list[i]) === p) {
      next = list[i];
      break;
    }
  }
  if (!next) return list;
  const nextBlock = subtree(next);
  let end = -1;
  for (let i = 0; i < rest.length; i++) if (nextBlock.has(rest[i])) end = i;
  if (end < 0) return list;
  rest.splice(end + 1, 0, ...block);
  return rest;
}
