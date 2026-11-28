/**
 * AKİS v3 veri şeması — TEK KAYNAK.
 *
 * NEDEN AYRI DOSYA: Şema, uygulamanın en kritik sözleşmesi. Tek dosyada
 * (app.js, 6600 satır) kaybolduğunda hem gözden kaçıyor hem test edilemiyor.
 * Burada saf fonksiyonlar var: tarayıcıya bağlı hiçbir şey yok, Node'da
 * doğrudan test edilebilir.
 *
 * v3'te çözülen sorunlar (v2 şeması):
 *   1. Bölüm ve sorunun kimliği yoktu; her şey dizi indeksiyle adreslenirdi.
 *      Sıralama değişince kayıt yanlış bölüme bağlanıyordu.
 *   2. Kalıcı veri ile oturumluk veri karışıktı (progress, uiTab, activeSeg…).
 *   3. Durum, Türkçe metinle karşılaştırılıyordu ('Çözümleme sürüyor').
 *      Metin değişince mantık sessizce bozuluyordu.
 *   4. Konuşmacı, bölümde AD ile tutuluyordu; ad değişince bağ kopuyordu.
 *   5. Delil günlüğü serbest metindi; değiştirilemezlik kanıtı yoktu.
 *   6. Sürüm alanı yoktu; şema değişince göç yolu bilinmiyordu.
 *
 * TASARIM İLKELERİ
 *   - Kimlik: her varlık `id` taşır. Referanslar id ile kurulur, ad ile değil.
 *   - Kod ≠ etiket: durum/rol/cinsiyet kodları sabit; Türkçe metin arayüzde
 *     türetilir (`STATUS_LABEL`). Kod değişmez, etiket serbestçe değişir.
 *   - Kalıcı ≠ geçici: oturumluk alanlar `_ui` altında ve kayda YAZILMAZ.
 *   - Delil: günlük girdileri `prevHash` + `hash` ile zincirlenir.
 *   - Genişletme: bilinmeyen alan korunur (`...extra`), doğrulayıcı katı
 *     değil yol göstericidir; eksik alan varsayılanla tamamlanır.
 */

// ---- 1. Sürüm ------------------------------------------------------------
export const SCHEMA_VERSION = 3;
export const SCHEMA_NAME = 'akis.case';

// ---- 2. Kodlar (sabit; Türkçe metin DEĞİL) --------------------------------

/** Dosya (case) durumu — TEK KAYNAK (v2.204). */
export const CASE_STATUS_DEFS = [
  { key: 'draft', label: 'Taslak' },
  { key: 'active', label: 'İncelemede' },
  { key: 'review', label: 'Kontrolde' },
  { key: 'completed', label: 'Tamamlandı' },
  { key: 'archived', label: 'Arşivlendi' }
];
const CASE_STATUS_OPT = defineOptions(CASE_STATUS_DEFS);
export const CASE_STATUS = CASE_STATUS_OPT.keys;
export const CASE_STATUS_LABEL = CASE_STATUS_OPT.label;

/** Kayıt (material) çözümleme durumu — TEK KAYNAK (v2.204). */
export const MATERIAL_STATUS_DEFS = [
  { key: 'pending', label: 'İnceleme bekliyor' },
  { key: 'transcribing', label: 'Çözümleme sürüyor' },
  { key: 'review', label: 'Kontrol bekliyor' },
  { key: 'empty', label: 'Çözümleme sonucu boş' },
  { key: 'partial', label: 'Kısmen çözümlendi (iptal)' },
  { key: 'cancelled', label: 'İptal edildi' },
  { key: 'error', label: 'Çözümleme hatası' }
];
const MATERIAL_STATUS_OPT = defineOptions(MATERIAL_STATUS_DEFS);
export const MATERIAL_STATUS = MATERIAL_STATUS_OPT.keys;
export const STATUS_LABEL = MATERIAL_STATUS_OPT.label;

/** Bölüm kontrol durumu. */
// KONTROL DURUMLARI. `machine` (v2.106): makinenin "hızlı onaya uygun"
// işaretlemesi. BİLİRKİŞİ ONAYI DEĞİLDİR: rapora "Onaylandı" olarak girmez,
// "kontrol edildi" sayılmaz. Amaç: toplu onayın ürettiği durum ile bilirkişinin
// dinleyerek verdiği onayı ayırmak (adli ayrım). Ekranda kısa etiket
// ("Çözümlendi"), ayrıntı ipucunda taşınır.
// `ambiguous` (v2.115): ses DUYULDU ama BİRDEN FAZLA okuma mümkün.
// `inaudible`'den farkı: orada ses anlaşılmıyor; burada ses anlaşılıyor ama
// iki farklı kelime/cümle duyulabiliyor. Adli açıdan ayrı tutulur ve raporda
// belirsizlik GİZLENMEZ: her iki okuma yazılır, bilirkişinin seçimi belirtilir.
export const REVIEW_DEFS = [
  {
    key: 'pending',
    label: 'Kontrol bekliyor',
    short: 'Bekliyor',
    hint: 'Henüz dinlenmedi. Metni ses kaydıyla karşılaştırıp onaylayın.',
    tone: 'none'
  },
  {
    key: 'machine',
    label: 'Çözümlendi',
    short: 'Çözümlendi',
    hint:
      'Otomatik çözümleme işareti — BİLİRKİŞİ ONAYI SAYILMAZ. Rapora onaylı ' +
      'olarak girmez; ses kaydı dinlenmesi ve onaylanması gerekir.',
    tone: 'info'
  },
  {
    key: 'approved',
    label: 'Onaylandı',
    short: 'Onaylandı',
    hint: 'Bilirkişi dinleyerek onayladı. Rapora "Onaylandı" olarak girer.',
    tone: 'good'
  },
  {
    key: 'inaudible',
    label: 'Anlaşılmadı',
    short: 'Anlaşılmadı',
    hint: 'Dinlendi, anlaşılmadı. Rapora bu şekilde işlenir.',
    tone: 'warn'
  },
  {
    key: 'relisten',
    label: 'Yeniden dinlenecek',
    short: 'Yeniden',
    hint: 'Dinlendi, yeniden dinlenmesi gerekiyor.',
    tone: 'warn'
  },
  {
    key: 'ambiguous',
    label: 'Belirsiz okuma',
    short: 'Belirsiz',
    hint:
      'Ses duyuldu ancak BİRDEN FAZLA okuma mümkün (ör. "geldi" / "kaldı"). ' +
      'Bilirkişi onayı sayılmaz. İki okumayı yazın ve hangisini seçtiğinizi belirtin; ' +
      'rapora belirsizlik AÇIKÇA yazılır.',
    tone: 'warn'
  }
];
const REVIEW_OPT = defineOptions(REVIEW_DEFS);
export const REVIEW_STATE = REVIEW_OPT.keys;
export const REVIEW_LABEL = REVIEW_OPT.label;
export const REVIEW_SHORT = REVIEW_OPT.short;
export const REVIEW_HINT = REVIEW_OPT.hint;
export const REVIEW_TONE = Object.fromEntries(REVIEW_DEFS.map((d) => [d.key, d.tone || 'none']));

/** Bilirkişinin DİNLEYEREK verdiği onaylar (rapora "Onaylandı" girer). */
export const HUMAN_APPROVED = ['approved'];

/** Makine işaretlemesi: onay değil, "dinlenmeyi bekliyor" işaretidir. */
export const MACHINE_REVIEW = 'machine';

/** Belirsiz okuma: iki (veya daha çok) okuma mümkün; onay değildir. */
export const AMBIGUOUS_REVIEW = 'ambiguous';

/**
 * v2 Türkçe kontrol kodları → v3 ASCII kodlar.
 * TEK KAYNAK: göç burada yapılır. `normalizeSegment` ve `segReview` (app.js)
 * aynı tabloyu kullanır; ikisi ayrışırsa v2 dosyalarındaki onaylar sessizce
 * kaybolur (v2.89'da yaşandı: bilirkişinin onayları yüklemede siliniyordu).
 */
export const REVIEW_LEGACY = {
  onaylandi: 'approved',
  bekliyor: 'pending',
  anlasilmadi: 'inaudible',
  yeniden: 'relisten'
};

/** Herhangi bir kontrol değerini v3 koduna çevirir; bilinmeyen → pending. */
export function normalizeReviewState(v) {
  const s = str(v).trim();
  if (!s) return 'pending';
  if (REVIEW_STATE.includes(s)) return s;
  return REVIEW_LEGACY[s] || 'pending';
}

/** Konuşmacı rolü — TEK KAYNAK (v2.204). */
export const SPEAKER_ROLE_DEFS = [
  { key: 'unspecified', label: 'Belirtilmedi' },
  { key: 'complainant', label: 'Müşteki / Davacı' },
  { key: 'defendant', label: 'Şüpheli / Davalı' },
  { key: 'witness', label: 'Tanık' },
  { key: 'expert', label: 'Bilirkişi' },
  { key: 'other', label: 'Diğer' }
];
const SPEAKER_ROLE_OPT = defineOptions(SPEAKER_ROLE_DEFS);
export const SPEAKER_ROLE = SPEAKER_ROLE_OPT.keys;
export const SPEAKER_ROLE_LABEL = SPEAKER_ROLE_OPT.label;

/** Konuşmacı cinsiyeti (uzman beyanı; tespit değil) — TEK KAYNAK. */
export const SPEAKER_GENDER_DEFS = [
  { key: 'unspecified', label: 'Belirtilmedi' },
  { key: 'female', label: 'Kadın' },
  { key: 'male', label: 'Erkek' },
  { key: 'uncertain', label: 'Belirsiz' }
];
const SPEAKER_GENDER_OPT = defineOptions(SPEAKER_GENDER_DEFS);
export const SPEAKER_GENDER = SPEAKER_GENDER_OPT.keys;
export const SPEAKER_GENDER_LABEL = SPEAKER_GENDER_OPT.label;

/** Kayıt kökeni ortam türü — TEK KAYNAK. */
export const MEDIUM_TYPE_DEFS = [
  { key: 'unspecified', label: 'Belirtilmedi' },
  { key: 'cd', label: 'CD / DVD' },
  { key: 'usb', label: 'USB flaş bellek' },
  { key: 'portable_disk', label: 'Taşınabilir disk' },
  { key: 'disk_image', label: 'Sabit disk / imaj' },
  { key: 'email', label: 'E-posta eki' },
  { key: 'cloud', label: 'Bulut / ağ paylaşımı' },
  { key: 'memory_card', label: 'Hafıza kartı' },
  { key: 'phone', label: 'Telefon' },
  { key: 'other', label: 'Diğer' }
];
const MEDIUM_TYPE_OPT = defineOptions(MEDIUM_TYPE_DEFS);
export const MEDIUM_TYPE = MEDIUM_TYPE_OPT.keys;
export const MEDIUM_TYPE_LABEL = MEDIUM_TYPE_OPT.label;

/**
 * FİZİKÎ DOSYA TESLİM VE İADE (v2.330) — TEK KAYNAK.
 *
 * Mahkeme bilirkişiye fizikî dava dosyası ve/veya ayrı fizikî nesneler (USB,
 * CD, DVD, harici disk, mühürlü zarf) teslim edebilir. Bu kayıt, neyin teslim
 * alındığını ve neyin iade edildiğini tutar; içerik analizi YAPMAZ.
 *
 * Bu tanımlar ses kaydı kökeninden (`origin`) AYRIDIR: `origin` sesin
 * nereden geldiğini, `physicalFile` ise kâğıt/nesne teslimini anlatır.
 */
export const PHYSICAL_ITEM_DEFS = [
  { key: 'usb', label: 'USB flaş bellek' },
  { key: 'cd', label: 'CD' },
  { key: 'dvd', label: 'DVD' },
  { key: 'external_disk', label: 'Harici disk' },
  { key: 'memory_card', label: 'Hafıza kartı' },
  { key: 'sealed_envelope', label: 'Mühürlü zarf / paket' },
  { key: 'document', label: 'Belge / evrak' },
  { key: 'other', label: 'Diğer' }
];
const PHYSICAL_ITEM_OPT = defineOptions(PHYSICAL_ITEM_DEFS);
export const PHYSICAL_ITEM_TYPE = PHYSICAL_ITEM_OPT.keys;
export const PHYSICAL_ITEM_LABEL = PHYSICAL_ITEM_OPT.label;

/** Dizi pusulası durumu — üç hâlli: verildi / verilmedi / belirtilmedi. */
export const PHYSICAL_INDEX_DEFS = [
  { key: 'yes', label: 'Verildi' },
  { key: 'no', label: 'Verilmedi' },
  { key: 'unknown', label: 'Belirtilmedi' }
];
const PHYSICAL_INDEX_OPT = defineOptions(PHYSICAL_INDEX_DEFS);
export const PHYSICAL_INDEX_STATE = PHYSICAL_INDEX_OPT.keys;
export const PHYSICAL_INDEX_LABEL = PHYSICAL_INDEX_OPT.label;

/**
 * ALAN TANIMLAMA — TEK KAYNAK (v2.203).
 *
 * Gözlem bayrakları burada tanımlanır. Yeni bir bayrak eklemek için YALNIZ
 * bu listeye bir satır ekleyin; aşağıdaki türetilmiş sabitler, `emptyObs()`,
 * arayüz düğmeleri, rapor etiketleri, yardım listesi ve testler buradan
 * beslenir. Böylece aynı alanı dört ayrı yerde elle yazmak gerekmez.
 *
 * Alanlar:
 *   key   — kayda yazılan ASCII kod (DEĞİŞMEZ)
 *   label — rapor/ipucu tam etiketi
 *   short — arayüz düğmesi kısa etiketi
 *   hint  — fare ipucu / erişilebilirlik açıklaması
 */
export const OBS_DEFS = [
  { key: 'noise', label: 'arka plan gürültüsü', short: 'gürültü', hint: 'Arka plan gürültüsü' },
  { key: 'overlap', label: 'üst üste konuşma', short: 'üst üste', hint: 'Üst üste konuşma' },
  { key: 'inaudible', label: 'anlaşılmaz bölüm', short: 'anlaşılmaz', hint: 'Anlaşılmayan bölüm' },
  { key: 'music', label: 'müzik/ses efekti', short: 'müzik', hint: 'Müzik/ses efekti' },
  {
    key: 'phone',
    label: 'telefon görüşmesi',
    short: 'telefon',
    hint: 'Konuşma telefon görüşmesi; karşı tarafın sesi duyuluyor veya duyulmuyor olabilir.'
  },
  {
    key: 'noSpeech',
    label: 'sessizlik (konuşma yok)',
    short: 'sessizlik',
    hint: 'Bu aralıkta konuşma yok; sessizlik. Ölçülen sessizlik oranından AYRIDIR.'
  },
  // v2.272 — dış standartla karşılaştırmada eksik kalan iki nesnel gözlem.
  {
    key: 'echo',
    label: 'yankı / oda akustiği',
    short: 'yankı',
    hint: 'Belirgin yankı veya oda akustiği; anlaşılırlığı düşürebilir. Ölçüm değil, uzman gözlemidir.'
  },
  {
    key: 'dropout',
    label: 'kesinti / kopukluk',
    short: 'kesinti',
    hint: 'Kayıtta kopma/kesinti; içeriğin bir bölümü eksik olabilir. Kayıt kalitesi gözlemidir.'
  },
  // v2.314 — "duyulmuyor ≠ anlaşılmaz" ayrımı ve teknik/ortam gözlemleri.
  {
    key: 'notAudible',
    label: 'duyulmuyor (ses yok/kısık)',
    short: 'duyulmuyor',
    hint: 'Ses yok veya çok kısık; kayıtta işitilmiyor. "Anlaşılmaz"dan farklıdır (ses duyulmuyor).'
  },
  {
    key: 'distance',
    label: 'uzaktan/zayıf konuşma',
    short: 'uzaktan',
    hint: 'Konuşma çok uzaktan veya zayıf; net değil. Teknik gözlemdir.'
  },
  {
    key: 'distortion',
    label: 'bozuk ses / artefakt',
    short: 'bozuk ses',
    hint: 'Bozulma/artefakt; ses çözülemiyor. Kayıt kalitesi gözlemidir.'
  },
  {
    key: 'foreignLanguage',
    label: 'dil değişimi (farklı dil/lehçe)',
    short: 'dil değişimi',
    hint: 'Farklı dil/lehçe; çözümleme güvenilir olmayabilir. Uzman gözlemidir.'
  }
];

/**
 * Ortak alan tanımı türeteci. Aynı desen ileride sınıflandırma/rol seçenekleri
 * için de kullanılabilir: `defineOptions(defs)` → { defs, keys, label, short,
 * hint }. Yeni bir alan ailesi eklerken bu yardımcıyı kullanın; etiketleri
 * ayrı ayrı kopyalamayın.
 */
export function defineOptions(defs) {
  const list = Array.isArray(defs) ? defs : [];
  return {
    defs: list,
    keys: list.map((d) => d.key),
    label: Object.fromEntries(list.map((d) => [d.key, d.label])),
    short: Object.fromEntries(list.map((d) => [d.key, d.short || d.label])),
    hint: Object.fromEntries(list.map((d) => [d.key, d.hint || d.label])),
    // Tanıma özgü ek alanlar (ör. REVIEW tone) `byKey` üzerinden okunur;
    // `defineOptions` bunları ayrı map'lere zorlamaz.
    byKey: Object.fromEntries(list.map((d) => [d.key, d]))
  };
}
const OBS = defineOptions(OBS_DEFS);
export const OBS_KEYS = OBS.keys;
export const OBS_LABEL = OBS.label;
export const OBS_SHORT = OBS.short;
export const OBS_HINT = OBS.hint;

/** Boş gözlem nesnesi — TEK KAYNAK. Bilinmeyen `over` anahtarları yok sayılır. */
export function emptyObs(over = {}) {
  const src = over && typeof over === 'object' ? over : {};
  return Object.fromEntries(OBS_KEYS.map((k) => [k, !!src[k]]));
}

/** Rapor türü. */
export const REPORT_TYPE = ['hukuk', 'ceza', 'savcilik', 'icra'];

/** Ekip üyesi rolü (ortak çalışma) — TEK KAYNAK (v2.204). */
export const TEAM_ROLE_DEFS = [
  { key: 'owner', label: 'Dosya sorumlusu', approver: true },
  { key: 'expert', label: 'Bilirkişi', approver: true },
  { key: 'assistant', label: 'Yardımcı', secondEyes: true },
  { key: 'reviewer', label: 'Kontrol eden', secondEyes: true },
  { key: 'observer', label: 'Gözlemci', secondEyes: true }
];
const TEAM_ROLE_OPT = defineOptions(TEAM_ROLE_DEFS);
export const TEAM_ROLE = TEAM_ROLE_OPT.keys;
export const TEAM_ROLE_LABEL = TEAM_ROLE_OPT.label;

// ---- 3. Etiketler (arayüz metni; kod değişmeden değişebilir) --------------
// Durum/kontrol etiketleri yukarıdaki `*_DEFS` listelerinden türetilir
// (v2.204); burada kopya tanım yok.

// Rol/cinsiyet/ortam etiketleri yukarıdaki `*_DEFS` listelerinden türetilir
// (v2.204); burada kopya tanım yok.

// v2.56'da teslim alma diyaloğu bir süre Türkçe ETİKET yazdı; şema ise kod
// bekler. Bu değerler kayıtta kalırsa doğrulayıcı hata verir ve bilgi
// kaybolur. Etiket → kod eşlemesi burada, tek yerde.
const MEDIUM_LABEL_TO_CODE = Object.fromEntries(
  Object.entries(MEDIUM_TYPE_LABEL).map(([code, label]) => [label, code])
);
export function normalizeMediumType(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return 'unspecified';
  if (MEDIUM_TYPE.includes(s)) return s;
  return MEDIUM_LABEL_TO_CODE[s] || 'unspecified';
}

// "İkinci göz" rolleri: metni düzeltir ama ONAY VEREMEZ. Kararı bilirkişi
// verir. Bu rollerin düzeltmesi `proposal` (öneri) olarak saklanır; bilirkişi
// kabul veya reddeder. Rapor bu yüzden hiçbir zaman "Onaylandı" yazmaz.
// v2.66: 'observer' (Gözlemci) de eklendi. Gözlemci SADECE bakar; onay
// vermesi adli belgede kabul edilemez. Düzeltmesi öneri olarak saklanır.
// TEK KAYNAK (v2.204): roller ve yetkileri `TEAM_ROLE_DEFS` bayraklarından
// türetilir; ayrı liste tutulmaz.
export const SECOND_EYES_ROLES = TEAM_ROLE_DEFS.filter((d) => d.secondEyes).map((d) => d.key);
export const isSecondEyesRole = (role) => SECOND_EYES_ROLES.includes(role);

// Onay yetkisi: yalnız dosya sorumlusu ve bilirkişi. Onay kararı hukuken
// bilirkişinindir; uygulama bu yetkiyi başkasına vermez.
export const APPROVER_ROLES = TEAM_ROLE_DEFS.filter((d) => d.approver).map((d) => d.key);
export const canApproveRole = (role) => APPROVER_ROLES.includes(role);

// OBS_LABEL artık yukarıda `OBS_DEFS`ten türetilir (v2.203); burada kopya yok.

// ---- 4. Kimlik üretimi ----------------------------------------------------
// Tarayıcıda crypto.randomUUID varsa o kullanılır; yoksa zaman + sayaç.
let idCounter = 0;
export function newId(prefix = 'x') {
  const g = globalThis;
  let core;
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    core = g.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  } else {
    idCounter = (idCounter + 1) % 1e6;
    core = Date.now().toString(36) + idCounter.toString(36).padStart(4, '0');
  }
  return `${prefix}_${core}`;
}

// ---- 5. Boş varlıklar -----------------------------------------------------
// Varsayılanlar TEK yerde. Yeni alan eklendiğinde yalnız burayı değiştirmek
// yeterli; doğrulayıcı eksik alanı buradan tamamlar.

export function emptyTeamMember(over = {}) {
  return {
    id: newId('tm'),
    name: '',
    role: 'expert',
    registryNo: '',
    institution: '',
    email: '',
    phone: '',
    ...over
  };
}

export function emptyQuestion(over = {}) {
  return {
    id: newId('q'),
    no: '', // Görevlendirme yazısındaki numara (varsa)
    question: '',
    answer: '',
    // Cevap düzenleme sayacı; bölümdeki textRev ile aynı mantık.
    answerRev: 0,
    // Dayanak artık serbest metin değil: bölümlere işaret eder.
    evidence: [], // [{ materialId, segmentId, note }]
    basisNote: '', // Serbest açıklama (delil işaretine ek)
    answeredBy: '', // teamMember.id
    ...over
  };
}

export function emptySpeaker(over = {}) {
  return {
    id: newId('sp'),
    // Standart konuşmacı kodu: S1, S2, S3… Rapor ve bölüm listesi bunu
    // kullanır. Serbest metin etiket (`label`) tanımlayıcı addır ("Kiracı").
    code: '',
    label: '', // Uzmanın verdiği etiket ("Kiracı", "Ev sahibi")
    role: 'unspecified',
    gender: 'unspecified',
    ageRange: '',
    notes: '',
    // DOSYA GENELİ KİŞİ BAĞI (v2.205). Aynı kişi birden çok kayıtta
    // görünüyorsa uzman bu alanla `case.speakers[]` kaydına bağlar. Boşsa
    // konuşmacı yalnız bu kayda özgüdür (eski davranış).
    personId: '',
    // Ölçüm sonucu; ölçülmediyse null (0 değil — 0 Hz diye bir perde yok).
    pitchHz: null,
    pitchSamples: 0,
    measuredAt: null,
    // DOĞRULANDI KİLİDİ (v2.264): uzman "bu kişi şu etiketle doğrudur" dediğinde
    // kart kilitlenir (yanlışlıkla değişmez). Boş = doğrulanmadı. Rapora
    // "doğrulandı" notu olarak yazılır; onay DEĞİLDİR (bölüm onayı ayrıdır).
    verifiedAt: '',
    verifiedBy: '',
    ...over
  };
}

/** Dosya geneli kişi (case-level registry) — v2.205. */
export function emptyCaseSpeaker(over = {}) {
  return {
    id: newId('ps'),
    // Dosya geneli kişi kodu: K1, K2… Kayıt içi S1/S2'den AYRIDIR.
    code: '',
    label: '', // "Kiracı", "Ev sahibi"…
    role: 'unspecified',
    gender: 'unspecified',
    ageRange: '',
    notes: '',
    ...over
  };
}

export function emptySegment(over = {}) {
  const out = {
    id: newId('sg'),
    start: '', // 'HH:MM:SS.mmm'
    end: '',
    speakerId: '', // speakers[].id — ad değil
    speaker: '', // görünen ad (kod S1..; raporda kod + etiket)
    // KONUŞMACI ÖN-ATAMASI (v2.301): bölümün konuşmacısı otomatik (anonim
    // benzerlik kümelemesiyle) önerildi mi? Uzman atamayı değiştirince temizlenir.
    // Kimlik tespiti DEĞİLDİR; yalnız "gözden geçir" işaretidir.
    speakerAuto: false,
    text: '', // bilirkişinin onayladığı/düzelttiği metin
    // OTOMATİK ÇÖZÜMLEME ÇIKTISI, ayrı saklanır ve ASLA üzerine yazılmaz.
    // Adli incelemede "modelin ne ürettiği" ile "bilirkişinin neyi
    // onayladığı" ayrı belgelerdir. `text` düzenlendikçe bu alan değişmez;
    // rapor farkı gösterebilir. v2.83'te eklendi (öncesinde model çıktısı
    // yalnız history'de kalıyordu ve 10 sürümden sonra SİLİNİYORDU).
    asrText: '',
    asrModel: '', // çıktıyı üreten model kimliği
    asrAt: '', // çözümleme zamanı (ISO)
    // Metin düzenleme sayacı. Birleştirmede hangi tarafın metninin daha yeni
    // olduğunu belirler. Duvar saati değil sayaç kullanılır: iki bilgisayarın
    // saati kayabilir, sayaç kaymaz.
    textRev: 0,
    // İkinci gözün (yardımcı/kontrol eden) önerdiği metin. Bilirkişi kabul
    // edene kadar `text` değişmez. { text, by, at, baseText }
    proposal: null,
    lastEditBy: '', // teamMember.id — son düzenleyen
    // Kontrol kararını KİMİN verdiği (v2.122). `lastEditBy` metin düzenleyeni
    // tutar; onay veren kişi metne dokunmadan dinleyip onaylayabilir. Birleştirme
    // onayı bu alanla doğrular; yoksa `lastEditBy`ye düşer (eski kayıt).
    reviewedBy: '', // teamMember.id — son kontrol kararını veren
    reviewedAt: '', // karar zamanı (ISO)
    review: 'pending',
    obs: emptyObs(),
    history: [], // [{ text, at, actor }]
    silence: null, // analyzeSilence çıktısı
    words: [], // [{ t, d, w }] — kelime zamanlaması (varsa)
    ...over
  };
  // `over.obs` KISMİ olabilir; bilinen anahtarların hepsi bulunmalı (v2.203).
  // Bilinmeyen (ileri sürüm) anahtarlar korunur.
  out.obs = { ...out.obs, ...emptyObs(out.obs) };
  return out;
}

export function emptyLevels(over = {}) {
  return {
    ok: false,
    schema: 0, // app.js LEVELS_SCHEMA ile karşılaştırılır
    ...over
  };
}

export function emptyMaterial(over = {}) {
  return {
    id: newId('mt'),
    // Dosya gerçekleri (değişmez)
    fileName: '',
    mimeType: '',
    sizeBytes: 0,
    durationSec: 0,
    sha256: '',
    tech: { codec: '', channels: 0, sampleRate: 0, bitDepth: 0 },
    addedAt: '',
    synthetic: false,

    // Durum (kod)
    status: 'pending',
    statusNote: '', // Hata/iptal açıklaması
    transcribedWithModel: '',
    transcribedAt: '',

    // İçerik
    segments: [],
    speakers: [],
    referenceSegments: [], // Test verisi: [{ start, end, speaker, text }]
    expectedText: '', // WER için referans metin

    // Ölçüm
    levels: null, // emptyLevels() veya null
    // KONUŞMACI SES TUTARLILIĞI (v2.265): bölüm bazında ölçülen perde + profil
    // + işaretler. Türetilmiş ölçümdür; kimlik tespiti DEĞİLDİR. Yoksa null.
    voiceCheck: null,
    voiceEmbed: null, // konuşmacı gömme ölçümü ÖZETİ (vektör saklanmaz; v2.279)
    spectrogramReviewedAt: null,

    // Delil
    origin: {
      mediumType: 'unspecified',
      mediumLabel: '',
      deliveredBy: '',
      // Teslim edenin sicili/kayıt no (varsa). Kurumdan kuruma değişir; TCKN
      // istenmez, doğrulanmaz, zorunlu değildir.
      deliveredByRegistry: '',
      deliveredAt: '',
      // Teslim yeri (ör. mahkeme/merci). Kapalı zarf içinde elden teslim gibi
      // teslim şekli ayrı bir alandır; burada yalnız YER tutulur.
      deliveryPlace: '',
      // Kaydı yapan CİHAZ ve kayıt TARİHİ (dosya metadata'sından veya uzman
      // beyanından). Bilinmiyorsa boş kalır; rapora "bilinmiyor" yazılır.
      // Edinme yöntemi/aracı buraya YAZILMAZ (v2.213).
      recordingDevice: '',
      recordingAt: '',
      // ORTAMDAN GÖZLENEN dosya zamanları (v2.216). Bunlar KAYIT ZAMANI
      // DEĞİLDİR: kopyalama, dosya sistemi ve saat dilimi ile değişir.
      // Yalnız edinme sırasında okunan değerlerdir; beyan değildir.
      fileTimes: { createdAt: '', modifiedAt: '', accessedAt: '' },
      // GÖMÜLÜ METADATA (v2.217): dosyanın KENDİ beyanı. Doğrulanmamıştır;
      // "kayıt zamanı" değil, "cihaz beyanı"dır. Rapora ancak kullanıcı
      // açarsa girer (report.includeEmbedded).
      embedded: { source: '', recordingAt: '', encodingAt: '', releaseAt: '', software: '', readAt: '' },
      // Eski tek alan (v2.212 ve öncesi). Görüntülemede yalnız gerçek cihaz
      // metni ise kullanılır; edinme metni buraya karışmış kayıtlar yok sayılır.
      deviceInfo: '',
      // Delil paketinden geldiyse edinme tutanağı (v2.208). Cihaz bilgisi
      // EDİNME ARACININ BEYANIDIR; uygulama cihazı görmez.
      acquisition: null
    },
    lastVerify: null, // { at, ok, hash }
    log: [],

    ...over
  };
}

// ---- 5a-2. Rapor ön bölüm ALAN görünürlüğü (v2.336) ---------------------
// KURAL: ön bölüm alanları da bölümler gibi tek tek açılıp kapatılabilir.
// Anahtar (key) sabittir; etiket arayüzde/raporda tek kaynaktan türetilir.
// `false` = gizli. Varsayılan AÇIK; eksik anahtar açık sayılır.
export const REPORT_FIELD_DEFS = {
  coverFields: [
    { key: 'fileNo' },
    { key: 'court' },
    { key: 'plaintiff' },
    { key: 'plaintiffCounsel' },
    { key: 'defendant' },
    { key: 'defendantCounsel' },
    { key: 'subject' },
    { key: 'caseDate' },
    { key: 'assignmentDate' },
    { key: 'assignmentDuration' },
    { key: 'dueDate' },
    { key: 'inspectionDate' },
    { key: 'reportDate' },
    { key: 'expertName' },
    { key: 'expertField' },
    { key: 'registryNo' },
    { key: 'annexList' },
    { key: 'impartiality' }
  ],
  summary: [
    { key: 'materialCount' },
    { key: 'totalDuration' },
    { key: 'transcriptDuration' },
    { key: 'speakerCodes' },
    { key: 'unclearSegments' },
    { key: 'asr' },
    { key: 'enhancement' }
  ]
};
export function normalizeReportFieldVisibility(src = {}) {
  const out = {};
  for (const [section, defs] of Object.entries(REPORT_FIELD_DEFS)) {
    const cur = src && typeof src === 'object' && src[section] && typeof src[section] === 'object' ? src[section] : {};
    out[section] = {};
    for (const d of defs) out[section][d.key] = cur[d.key] !== false;
    // Bilinmeyen anahtar korunur (ileri uyum); yalnız bilinen anahtarlar çizilir.
    for (const k of Object.keys(cur)) if (!(k in out[section])) out[section][k] = !!cur[k];
  }
  return out;
}
export function reportFieldVisible(c, section, key) {
  const v = c && c.report && c.report.fields;
  return !(v && v[section] && v[section][key] === false);
}
// UZMANLIK ALANI varsayılanı TEK KAYNAK (v2.336). Kullanıcı dosya künyesinden
// değiştirebilir; boş bırakılırsa bu metin kullanılır.
// v2.363: kapakta iki satıra ayrılır — `56.12 – BAŞLIK` ve parantezli not.
export const DEFAULT_EXPERT_FIELD =
  '56.12 – Ses Kayıtlarının Metin Haline Dönüştürülmesi (Yargı mercilerince Ses ve Görüntü Bilişim Sisteminin Kullanılması Hariç)';
// Kapakta mahkeme satırının altında görünen sabit aile satırı (v2.363).
export const REPORT_FAMILY_LINE = 'ADLİ VE KRİMİNALİSTİK İNCELEMELER';
// Eski varsayılanlar TAM metne çekilir; ÖZEL yazılmış metin korunur. Karşılaştırma
// boşluk/büyük-küçük harf duyarsızdır (Türkçe küçültme ile).
const LEGACY_EXPERT_DEFAULTS = [
  '56.12',
  '56.12 – Ses kayıtlarının metin hâline dönüştürülmesi',
  '56.12 Ses Kayıtlarının Metin Haline Dönüştürülmesi (Yargı Mercilerince Ses ve Görüntü Bilişim Sisteminin Kullanılması Hariç)'
];
export function normalizeExpertField(v) {
  const s = str(v).trim();
  if (!s) return DEFAULT_EXPERT_FIELD;
  const norm = (x) => x.replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
  const n = norm(s);
  if (LEGACY_EXPERT_DEFAULTS.some((d) => norm(d) === n)) return DEFAULT_EXPERT_FIELD;
  return s;
}
// Uzmanlık alanı metnini kapak satırlarına ayırır (v2.363):
//   "56.12 – Ses ... (Yargı ... Hariç)"
//   → { code:'56.12', title:'Ses ...', main:'56.12 – Ses ...', note:'(Yargı ... Hariç)' }
// Kod yoksa `main` metnin kendisidir. Uydurma kod üretilmez.
export function expertFieldParts(v) {
  // Kısa kod/eski varsayılan da TAM metne çekilir: ayrıştırıcı her çağrıldığında
  // normalize eder. Böylece normalizeCase'ten geçmemiş (bellek/test/göç) kayıt da
  // kapakta tam satırı gösterir; '56.12' tek başına kalmaz.
  const s = normalizeExpertField(v);
  const i = s.indexOf('(');
  const mainRaw = (i >= 0 ? s.slice(0, i) : s).trim();
  const note = i >= 0 ? s.slice(i).trim() : '';
  const m = mainRaw.match(/^(\d{2}\.\d{2})\s*(?:[–-]\s*)?(.+)$/);
  const code = m ? m[1] : '';
  const title = m ? m[2].trim() : mainRaw;
  return { code, title, main: code ? `${code} – ${title}` : title, note };
}

// ---- 5b. Rapor bölüm görünürlüğü (v2.219) --------------------------------
// RAPOR PARAMETRİKTİR: tüm bölümler hazır tutulur; bilirkişi her birini
// açıp kapatabilir. Anahtar (key) sabittir, başlık arayüzde `REPORT_TEXT`ten
// gelir. Varsayılan AÇIK: mevcut rapor görünümü değişmez.
// DİKKAT: yeni anahtar eklerken hem buraya hem `emptyCase.report.sections`
// hem `normalizeReportSections` hem arayüz gruplarına ekleyin; aksi hâlde
// normalize sırasında alan sessizce düşer (v2.212 dersi).
// `title` = numarasız başlık. Ana bölümlerin (s1…s7) numarası AÇIK ve SIRALI
// bölümlere göre TÜRETİLİR (v2.227): bölüm kapatılınca numarada boşluk kalmaz.
// `def` = varsayılan açık mı. Sıra `REPORT_BODY_ORDER` ile verilir; kullanıcı
// `case.report.layout.order` ile değiştirebilir.
export const REPORT_SECTION_DEFS = [
  // Ön bilgi
  { key: 'cover', def: true, group: 'front', title: 'KAPAK' },
  { key: 'coverFields', def: true, group: 'front', title: 'RAPOR KÜNYESİ' },
  { key: 'summary', def: false, group: 'front', title: 'RAPORUN KISA ÖZETİ' },
  { key: 'toc', def: true, group: 'front', title: 'İÇİNDEKİLER' },
  // Görev, kapsam ve yöntem
  { key: 's1', def: true, group: 'scope', title: 'GÖREVLENDİRME, İNCELEMENİN KONUSU VE SINIRLARI' },
  { key: 's2', def: true, group: 'scope', title: 'BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR' },
  { key: 's3', def: true, group: 'scope', title: 'BİLİRKİŞİDEN GÖZLEMLENMESİ VE İNCELENMESİ İSTENEN MADDİ UNSURLAR' },
  { key: 's4', def: true, group: 'scope', title: 'İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR' },
  { key: 'transcriptionMethod', def: false, group: 'scope', title: 'KONUŞMANIN METNE DÖNÜŞTÜRÜLMESİ YÖNTEMİ' },
  // Delilin kimliği ve güvenilirliği
  { key: 'origin', def: true, group: 'evidence', title: 'KAYIT KÖKENİ VE TESLİM ZİNCİRİ' },
  { key: 'embeddedInfo', def: true, group: 'evidence', title: 'DOSYAYA GÖMÜLÜ BİLGİLER (CİHAZ BEYANI)' },
  { key: 'acquisition', def: true, group: 'evidence', title: 'DELİL EDİNME VE DOĞRULAMA' },
  { key: 'integrity', def: false, group: 'evidence', title: 'ORİJİNALİN KORUNMASI VE BÜTÜNLÜK KAYDI' },
  // Bulgular
  { key: 's5', def: true, group: 'findings', title: 'KAYIT BAZINDA BULGULAR VE TRANSKRİPT' },
  { key: 'readingText', def: true, group: 'findings', title: 'OKUMA METNİ' },
  // Ölçümler ve konuşmacılar
  { key: 'speakers', def: true, group: 'measure', title: 'KONUŞMACILAR' },
  { key: 'speakerDurations', def: true, group: 'measure', title: 'KONUŞMACI SÜRELERİ' },
  { key: 'wer', def: true, group: 'measure', title: 'KELİME HATA ORANI ÖLÇÜMÜ (WER)' },
  { key: 'levels', def: true, group: 'measure', title: 'SES SEVİYESİ VE KIRPILMA ÖLÇÜMÜ' },
  { key: 'reviewSummary', def: true, group: 'measure', title: 'İNCELEME ÖZETİ (DENETİM KAYDI)' },
  // Değerlendirme ve sonuç
  { key: 'answers', def: true, group: 'assess', title: 'GÖREVLENDİRME SORULARINA CEVAPLAR' },
  { key: 'limits', def: true, group: 'assess', title: 'ANLAŞILABİLİRLİK VE TEKNİK SINIRLILIKLAR' },
  { key: 'scopeNote', def: false, group: 'assess', title: 'GÖREV ALANI DIŞINDA KALAN KONULAR VE SINIRLILIK BEYANI' },
  { key: 's6', def: true, group: 'assess', title: 'GEREKÇELİ SONUÇ' },
  // Teknik ayrıntı ve beyanlar
  { key: 'tech', def: false, group: 'detail', title: 'TEKNİK ÖZELLİKLER VE İNCELEME ORTAMI' },
  { key: 'enhancement', def: false, group: 'detail', title: 'SES İYİLEŞTİRME / FİLTRELEME İŞLEMLERİ' },
  { key: 'terms', def: false, group: 'detail', title: 'TERİM VE KONU LİSTESİ' },
  { key: 'qualityControl', def: false, group: 'detail', title: 'KALİTE KONTROLÜ VE DENETLENEBİLİRLİK' },
  { key: 'privacy', def: false, group: 'detail', title: 'KİŞİSEL VERİ, GİZLİLİK VE BİLGİ GÜVENLİĞİ' },
  // Tutanak ve kayıtlar (eski ek içerikleri — artık düz bölüm)
  { key: 'handoverRecord', def: true, group: 'records', title: 'MATERYAL TESLİM VE İADE TUTANAĞI' },
  { key: 'fileInventory', def: true, group: 'records', title: 'DOSYA TEKNİK ENVANTERİ' },
  { key: 'custodyLog', def: true, group: 'records', title: 'ZİNCİRLEME MUHAFAZA / İŞLEM GÜNLÜĞÜ' },
  { key: 'notationKey', def: true, group: 'records', title: 'TRANSKRİPT GÖSTERİM ANAHTARI' },
  { key: 'finalChecklist', def: true, group: 'records', title: 'SON KONTROL LİSTESİ' },
  { key: 'legalBasis', def: true, group: 'records', title: 'HUKUKİ VE YÖNTEMSEL DAYANAKLAR' },
  // Kapanış
  { key: 'signature', def: false, group: 'close', title: 'İMZA VE ALT BİLGİ' }
];
export const REPORT_SECTION_KEYS = REPORT_SECTION_DEFS.map((d) => d.key);
/** Grup anahtarı yalnız meta veridir; iskelette başlık olarak ÇİZİLMEZ. */
export const REPORT_SECTION_GROUPS = ['front', 'scope', 'evidence', 'findings', 'measure', 'assess', 'detail', 'records', 'close'];
// v2.380 — eski anahtar adları → yeni nötr adlar. Göç TEK yerde.
export const REPORT_KEY_ALIASES = {
  asr: 'transcriptionMethod',
  enhance: 'enhancement',
  reading: 'readingText',
  embedded: 'embeddedInfo',
  qc: 'qualityControl'
};
// Eski "ek" içerikleri artık düz bölüm anahtarlarıdır (EK kavramı YOK).
export const REPORT_RECORD_ALIASES = {
  ek1: 'handoverRecord',
  ek2: 'fileInventory',
  ek3: 'custodyLog',
  ek4: 'notationKey',
  ek5: 'finalChecklist',
  ek6: 'legalBasis'
};
export function mapReportKey(key) {
  const k = String(key || '');
  return REPORT_KEY_ALIASES[k] || REPORT_RECORD_ALIASES[k] || k;
}

// KAPAK/ön bölüm ve İMZA yapısaldır: sırası sabittir. Gövde bölümleri
// kullanıcı tarafından sıralanabilir; sıra `case.report.layout.order`'dadır.
export const REPORT_FRONT_KEYS = ['cover', 'coverFields', 'summary', 'toc'];
export const REPORT_NUMBERING = ['auto', 'letters', 'none'];
// Geriye uyum: numara artık ÇİZİLEN her bölüme verilir (v2.289). Bu liste
// yalnız eski çağrılar için tutulur.
export const REPORT_MAIN_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];
export const REPORT_BODY_ORDER = [
  's1',
  's2',
  's3',
  's4',
  'transcriptionMethod',
  'origin',
  'embeddedInfo',
  'acquisition',
  'integrity',
  's5',
  'readingText',
  'speakers',
  'speakerDurations',
  'wer',
  'levels',
  'reviewSummary',
  'answers',
  'limits',
  'scopeNote',
  's6',
  'tech',
  'enhancement',
  'terms',
  'qualityControl',
  'privacy',
  'handoverRecord',
  'fileInventory',
  'custodyLog',
  'notationKey',
  'finalChecklist',
  'legalBasis'
];
// EKLER AYRI KAYITTIR (v2.227): her ek tek tek açılıp kapatılabilir ve
// sıralanabilir. Numara ARTIK AÇIK EKLERE GÖRE TÜRETİLİR (EK-1…EK-N); kapatılan
// ek numarada boşluk bırakmaz. `title` numarasız temel başlıktır; "EK-n."
// öneki çizim sırasında eklenir. Kullanıcı özel ek ekleyebilir (x1, x2…).
export const REPORT_ANNEX_DEFS = [
  { key: 'ek1', title: 'MATERYAL TESLİM VE İADE TUTANAĞI' },
  { key: 'ek2', title: 'DOSYA TEKNİK ENVANTERİ' },
  { key: 'ek3', title: 'ZİNCİRLEME MUHAFAZA / İŞLEM GÜNLÜĞÜ' },
  { key: 'ek4', title: 'TRANSKRİPT GÖSTERİM ANAHTARI' },
  { key: 'ek5', title: 'SON KONTROL LİSTESİ' },
  { key: 'ek6', title: 'HUKUKİ VE YÖNTEMSEL DAYANAKLAR' },
  // v2.369 — GRUPLU EKLER: gövde bölümlerini İÇİNDE toplayan "kap" eklerdir.
  // Kendi üretilmiş içerikleri YOKTUR; içerikleri, `annexPlacement[key]='ekN'`
  // ile bu eke taşınmış gövde bölümleridir (EK-N.1, EK-N.2…). Boş grup çizilmez.
  { key: 'ek7', title: 'KAYIT KÖKENİ, EDİNME VE GÖMÜLÜ METADATA', group: true },
  { key: 'ek8', title: 'KONUŞMACILAR, ÖLÇÜMLER VE İNCELEME ÖZETİ', group: true },
  { key: 'ek9', title: 'TEKNİK ORTAM, KALİTE VE BEYANLAR', group: true },
  { key: 'ek10', title: 'YARDIMCI BİLGİLER VE YÖNTEM AYRINTISI', group: true }
];
export const REPORT_ANNEX_KEYS = REPORT_ANNEX_DEFS.map((d) => d.key);
export const REPORT_ANNEX_CUSTOM_TITLE = 'YENİ EK';
/** Gruplu (kap) ek anahtarları: içerikleri taşınmış bölümlerdir (v2.369). */
export const REPORT_ANNEX_GROUP_KEYS = REPORT_ANNEX_DEFS.filter((d) => d.group).map((d) => d.key);
export function isReportAnnexGroup(key) {
  return REPORT_ANNEX_GROUP_KEYS.includes(String(key || ''));
}
/**
 * Yeni dosyalar için ÖNERİ A yerleşimi (v2.369): teknik/ölçüm bölümleri gövdeyi
 * kesmemesi için gruplu eklere taşınır. YALNIZ yeni dosyada uygulanır; mevcut
 * dosyaların `annexPlacement`'ı korunur (göç: boş kalır).
 */
export const DEFAULT_ANNEX_PLACEMENT = {
  origin: 'ek7',
  embedded: 'ek7',
  acquisition: 'ek7',
  speakers: 'ek8',
  speakerDurations: 'ek8',
  wer: 'ek8',
  levels: 'ek8',
  reviewSummary: 'ek8',
  integrity: 'ek9',
  tech: 'ek9',
  qc: 'ek9',
  privacy: 'ek9',
  scopeNote: 'ek9',
  terms: 'ek10',
  enhance: 'ek10',
  asr: 'ek10'
};
/** Yeni dosya için varsayılan yerleşimin taze kopyası. */
export function defaultAnnexPlacement() {
  // v2.380 — EK kavramı yok: yeni dosyada hiçbir bölüm eke taşınmaz.
  return {};
}
/** Bir bölümün önerilen grup eki (yoksa ''). */
export function recommendedAnnexForKey(key) {
  const v = DEFAULT_ANNEX_PLACEMENT[key];
  return typeof v === 'string' ? v : '';
}
/** Yerleşik ek anahtarı ya da kullanıcı eki (x1, x2…). */
export function isReportAnnexKey(key) {
  const k = String(key || '');
  return REPORT_ANNEX_KEYS.includes(k) || /^x[0-9]+$/.test(k);
}
/** Sıradaki boş özel ek anahtarı (silinen anahtar yeniden kullanılır). */
export function newReportAnnexKey(layout) {
  const used = new Set([
    ...((layout && Array.isArray(layout.annexOrder)) ? layout.annexOrder : []),
    ...Object.keys((layout && layout.annexMeta) || {})
  ]);
  let n = 1;
  while (used.has('x' + n)) n++;
  return 'x' + n;
}
/** Ekin numarasız temel başlığı (özel ek için varsayılan). */
export function reportAnnexBaseTitle(key) {
  const d = REPORT_ANNEX_DEFS.find((x) => x.key === key);
  return d ? d.title : REPORT_ANNEX_CUSTOM_TITLE;
}
export function emptyReportAnnexes(over = {}) {
  const out = {};
  for (const k of REPORT_ANNEX_KEYS) out[k] = true;
  return { ...out, ...over };
}
/**
 * Rapor düzeni: gövde sırası + ek sırası + ek görünürlüğü + ek üst verisi.
 * `annexMeta[key] = { title, content, note }` (özel eklerde ve başlık/not
 * düzenlemesinde kullanılır; boş alan varsayılanı ezer).
 */
export function emptyReportLayout(over = {}) {
  return {
    order: [...REPORT_BODY_ORDER],
    parent: {},
    annexOrder: [...REPORT_ANNEX_KEYS],
    annexes: emptyReportAnnexes(),
    annexMeta: {},
    ...over
  };
}
/**
 * Kullanıcı sırasında EKSİK kanonik anahtarları kanonik komşularına yerleştirir.
 * Yeni bölüm eklendiğinde eski kayıtta anahtar yoktur; sona eklemek bölümü
 * eklerden/imzadan SONRA çıkarır (sessiz sıra bozulması). Bu yüzden her eksik
 * anahtar, kanonik sırada kendisinden önce gelen ve listede BULUNAN ilk
 * anahtarın hemen ardına girer; böyle bir komşu yoksa başa.
 */
export function insertMissingInCanonicalOrder(order, canonical) {
  const list = (Array.isArray(order) ? order : []).filter((k) => typeof k === 'string');
  const canon = Array.isArray(canonical) ? canonical : [];
  for (let ci = 0; ci < canon.length; ci++) {
    const key = canon[ci];
    if (list.includes(key)) continue;
    let at = 0;
    for (let j = ci - 1; j >= 0; j--) {
      const idx = list.indexOf(canon[j]);
      if (idx >= 0) {
        at = idx + 1;
        break;
      }
    }
    list.splice(at, 0, key);
  }
  return list;
}
/**
 * Eksik/bozuk düzeni güvenli hâle getirir. Gövdede bilinmeyen anahtar
 * düşürülür; eksik bölüm kanonik komşusunun yanına eklenir (sona değil).
 * Eklerde yerleşik ve özel (xN) anahtarlar korunur; geçersiz anahtar
 * düşürülür (veri kaybı yok).
 */
export function normalizeReportLayout(src) {
  const base = emptyReportLayout();
  if (!src || typeof src !== 'object') return base;
  const seen = new Set();
  const order = [];
  const srcOrder = Array.isArray(src.order) ? src.order : [];
  for (const k0 of srcOrder) {
    // v2.380: eski anahtar adları yeni nötr ada çevrilir; EK/s7 düşer.
    const k = mapReportKey(k0);
    if (k === 'annex' || k === 's7') continue;
    // v2.287: serbest blok anahtarları (`free:<id>`) korunur.
    if ((REPORT_BODY_ORDER.includes(k) || isFreeBlockKey(k)) && !seen.has(k)) {
      order.push(k);
      seen.add(k);
    }
  }
  // v2.261: eksik anahtarlar kanonik komşusunun yanına girer. Böylece yeni
  // bölüm (answers/limits/integrity) eski kayıtta da doğru yerde çıkar;
  // sona eklenirse eklerden ve imzadan sonra görünürdü.
  const filled = insertMissingInCanonicalOrder(order, REPORT_BODY_ORDER);
  order.length = 0;
  order.push(...filled);

  const srcAnnexes = src.annexes && typeof src.annexes === 'object' ? src.annexes : {};
  const srcMeta = src.annexMeta && typeof src.annexMeta === 'object' ? src.annexMeta : {};
  const annexSeen = new Set();
  const annexOrder = [];
  const pushAnnex = (k) => {
    if (isReportAnnexKey(k) && !annexSeen.has(k)) {
      annexOrder.push(k);
      annexSeen.add(k);
    }
  };
  for (const k of Array.isArray(src.annexOrder) ? src.annexOrder : []) pushAnnex(k);
  for (const k of REPORT_ANNEX_KEYS) pushAnnex(k);
  // Özel ekler yalnız annexOrder'da değil, annexes/annexMeta içinde de olabilir.
  for (const k of Object.keys(srcAnnexes)) pushAnnex(k);
  for (const k of Object.keys(srcMeta)) pushAnnex(k);

  const annexes = {};
  const annexMeta = {};
  for (const k of annexOrder) {
    annexes[k] = typeof srcAnnexes[k] === 'boolean' ? srcAnnexes[k] : true;
    const m = srcMeta[k];
    if (m && typeof m === 'object') {
      const title = typeof m.title === 'string' ? m.title : '';
      const content = typeof m.content === 'string' ? m.content : '';
      const note = typeof m.note === 'string' ? m.note : '';
      if (title || content || note) annexMeta[k] = { title, content, note };
    }
  }
  // v2.297 — ebeveyn haritası + derinlik-önce sıra.
  const parent = {};
  const srcParent = src.parent && typeof src.parent === 'object' ? src.parent : {};
  const inOrder = new Set(order);
  for (const [k0, p0] of Object.entries(srcParent)) {
    const k = mapReportKey(k0);
    const p = mapReportKey(p0);
    if (inOrder.has(k) && inOrder.has(p) && k !== p) parent[k] = p;
  }
  for (const k of Object.keys(parent)) {
    let cur = parent[k], guard = 0;
    while (cur && guard++ < 100) {
      if (cur === k) { delete parent[k]; break; }
      cur = parent[cur];
    }
  }
  const children = new Map();
  for (const k of order) {
    const p = parent[k] || '';
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(k);
  }
  const dfs = [];
  const walk = (p) => {
    for (const k of children.get(p) || []) { dfs.push(k); walk(k); }
  };
  walk('');
  for (const k of order) if (!dfs.includes(k)) dfs.push(k);
  return { ...src, order: dfs, parent, annexOrder, annexes, annexMeta };
}

// ---- 5b-3. Rapor tabloları: sütun görünürlüğü (v2.235) --------------------
// TEK KAYNAK: tablo → sütun anahtarları ve Türkçe etiketler. Kapatılan alan
// üç çıktıda da (HTML/DOCX/UDF) basılmaz. VERİ SİLİNMEZ; yalnız gösterim.
export const REPORT_COLUMN_TABLES = {
  inventory: ['name', 'format', 'size', 'duration', 'channels', 'sampleRate', 'sha256'],
  origin: ['name', 'mediumType', 'mediumLabel', 'deliveredBy', 'deliveredAt', 'deliveryPlace', 'recordingDevice', 'recordingAt'],
  acquisition: ['name', 'device', 'label', 'serial', 'method', 'tool', 'operator', 'acquiredAt', 'hashState'],
  wer: ['material', 'model', 'ref', 'hyp', 'errors', 'wer'],
  levels: ['name', 'peak', 'rms', 'clipped', 'noiseFloor', 'snr', 'extra'],
  // KANIT: konuşmacı KİMLİK (kod) ve ETİKET ayrı sütunlardır (v2.281).
  // Tek hücrede "S1 · Kiracı" yazmak, mahkemenin kodu ve adı ayrı okumasını
  // ve ayrı açıp kapatmasını engelliyordu.
  segments: ['time', 'speakerCode', 'speakerLabel', 'text', 'review', 'obs'],
  speakers: ['code', 'label', 'material', 'role', 'gender', 'age', 'pitch', 'parts'],
  speakerDurations: ['code', 'label', 'material', 'chapters', 'duration', 'span'],
  materialSpeakers: ['code', 'label', 'chapters', 'duration', 'span', 'person']
};
export const REPORT_COLUMN_LABELS = {
  inventory: {
    name: 'DOSYA ADI',
    format: 'DOSYA BİÇİMİ',
    size: 'DOSYA BOYUTU',
    duration: 'SÜRE',
    channels: 'SES KANALI',
    sampleRate: 'ÖRNEKLEME HIZI',
    sha256: 'SHA-256'
  },
  origin: {
    name: 'KAYIT',
    mediumType: 'ORTAM TÜRÜ',
    mediumLabel: 'ORTAM ETİKETİ',
    deliveredBy: 'TESLİM EDEN',
    deliveredAt: 'TESLİM TARİHİ',
    deliveryPlace: 'TESLİM YERİ',
    recordingDevice: 'KAYIT CİHAZI',
    recordingAt: 'KAYIT TARİHİ'
  },
  acquisition: {
    name: 'KAYIT',
    device: 'CİHAZ',
    label: 'ETİKET',
    serial: 'SERİ NO',
    method: 'YÖNTEM',
    tool: 'ARAÇ',
    operator: 'OPERATÖR',
    acquiredAt: 'ALINMA',
    hashState: 'DOĞRULAMA'
  },
  wer: { material: 'KAYIT', model: 'MODEL', ref: 'REFERANS KELİME', hyp: 'ÇIKTI KELİME', errors: 'HATA', wer: 'WER' },
  levels: {
    name: 'KAYIT',
    peak: 'TEPE (dBFS)',
    rms: 'RMS (dBFS)',
    clipped: 'TEPE KIRPILMA',
    noiseFloor: 'GÜRÜLTÜ TABANI',
    snr: 'SİNYAL / GÜRÜLTÜ',
    extra: 'EK ÖLÇÜMLER'
  },
  segments: {
    time: 'ZAMAN ARALIĞI',
    speakerCode: 'KONUŞMACI KODU',
    speakerLabel: 'KONUŞMACI ETİKETİ',
    text: 'ÇÖZÜMLENEN KONUŞMA',
    review: 'KONTROL DURUMU',
    obs: 'GÖZLEM'
  },
  speakers: {
    code: 'KOD',
    label: 'ETİKET',
    material: 'KAYIT',
    role: 'ROL',
    gender: 'CİNSİYET',
    age: 'YAŞ ARALIĞI',
    pitch: 'ÖLÇÜLEN PERDE',
    parts: 'BÖLÜM / NOT'
  },
  speakerDurations: {
    code: 'KOD',
    label: 'ETİKET',
    material: 'KAYIT',
    chapters: 'BÖLÜM',
    duration: 'SÜRE',
    span: 'İLK – SON'
  },
  materialSpeakers: {
    code: 'KOD',
    label: 'ETİKET',
    chapters: 'BÖLÜM',
    duration: 'SÜRE',
    span: 'İLK – SON',
    person: 'DOSYALAR ARASI KİŞİ'
  }
};
// Kanıt tablosunda ZORUNLU sütunlar: gizlenemez (adli kayıt bütünlüğü).
export const REPORT_COLUMN_LOCKED = { segments: ['time', 'text'] };
export const REPORT_COLUMN_TABLE_LABELS = {
  inventory: 'Envanter tablosu',
  origin: 'Kayıt kökeni tablosu',
  acquisition: 'Delil edinme tablosu',
  wer: 'WER tablosu',
  levels: 'Ses seviyesi tablosu',
  segments: 'Analiz / kanıt tablosu',
  speakers: 'Konuşmacı tablosu',
  speakerDurations: 'Konuşmacı süreleri',
  materialSpeakers: 'Kayıt konuşmacı tablosu'
};
/** Tüm sütunlar AÇIK. */
export function emptyReportColumns(over = {}) {
  const out = {};
  for (const table of Object.keys(REPORT_COLUMN_TABLES)) {
    out[table] = {};
    for (const key of REPORT_COLUMN_TABLES[table]) out[table][key] = true;
  }
  return { ...out, ...over };
}
/** Eksik/bozuk sütun tercihini güvenli hâle getirir (bilinmeyen tablo korunur). */
export function normalizeReportColumns(src) {
  const base = src && typeof src === 'object' ? src : {};
  const out = {};
  for (const table of Object.keys(REPORT_COLUMN_TABLES)) {
    let s = base[table] && typeof base[table] === 'object' ? base[table] : {};
    // GÖÇ (v2.281): kanıt tablosunda eski BİRLEŞİK `speaker` tercihi iki yeni
    // sütuna (kod + etiket) taşınır; aksi hâlde kullanıcının kapattığı sütun
    // sessizce geri açılırdı.
    if (table === 'segments' && typeof s.speaker === 'boolean') {
      s = { ...s, speakerCode: s.speaker, speakerLabel: s.speaker };
      delete s.speaker;
    }
    out[table] = {};
    for (const key of REPORT_COLUMN_TABLES[table]) out[table][key] = typeof s[key] === 'boolean' ? s[key] : true;
  }
  return { ...base, ...out };
}
/**
 * Bölüm başlığı düzenlemeleri (v2.285). Yalnız bilinen bölüm anahtarları
 * korunur; boş/boşluk değer atılır (varsayılan başlık kullanılır). Uzunluk
 * sınırlanır: başlık bir satırlık addır, paragraf değildir.
 */
export function normalizeReportTitles(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const key of REPORT_SECTION_KEYS) {
    const v = src[key];
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t) out[key] = t.slice(0, 160);
  }
  // v2.380: eski başlık anahtarları yeni ada taşınır.
  for (const [oldK, newK] of Object.entries({ ...REPORT_KEY_ALIASES, ...REPORT_RECORD_ALIASES })) {
    const v = src[oldK];
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t && !out[newK]) out[newK] = t.slice(0, 160);
  }
  return out;
}

// ---- Serbest rapor blokları (v2.287) -------------------------------------
// Kullanıcının kendi başlığı + metni. Sıra `layout.order` içinde `free:<id>`
// anahtarıyla tutulur; bölüm görünürlüğü bloktaki `on` alanındadır.
export function isFreeBlockKey(key) {
  return typeof key === 'string' && /^free:[A-Za-z0-9_-]{1,40}$/.test(key);
}
export function freeBlockKey(id) {
  return `free:${String(id || '')}`;
}
export function freeBlockId(key) {
  return isFreeBlockKey(key) ? key.slice(5) : '';
}
/**
 * Serbest blokları güvenli hâle getirir. Kimlik zorunludur ve tekildir;
 * başlık 160, metin 50.000 karakterle sınırlanır. Boş blok SİLİNMEZ (kullanıcı
 * yazmaya devam edebilir) ama `reportBlockRenders` boşu rapora sokmaz.
 */
export function normalizeReportBlocks(src) {
  const out = [];
  const seen = new Set();
  for (const b of Array.isArray(src) ? src : []) {
    if (!b || typeof b !== 'object') continue;
    const id = typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(b.id) ? b.id : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      ...b,
      id,
      title: typeof b.title === 'string' ? b.title.trim().slice(0, 160) : '',
      text: typeof b.text === 'string' ? b.text.slice(0, 50000) : '',
      on: b.on !== false
    });
  }
  return out;
}
/**
 * `layout.order` içindeki `free:` anahtarlarını bloklarla eşitler:
 * sahipsiz anahtarı düşürür, sırası olmayan bloğu `s6` (sonuç) öncesine ekler.
 * Böylece yeni blok eklerken sıra bozulmaz; blok silinince yetim anahtar kalmaz.
 */
export function ensureFreeBlockOrder(order, blocks) {
  const list = (Array.isArray(order) ? order : []).filter((k) => typeof k === 'string');
  const keys = new Set((blocks || []).map((b) => freeBlockKey(b.id)));
  for (let i = list.length - 1; i >= 0; i--) {
    if (isFreeBlockKey(list[i]) && !keys.has(list[i])) list.splice(i, 1);
  }
  for (const b of blocks || []) {
    const k = freeBlockKey(b.id);
    if (list.includes(k)) continue;
    const at = list.indexOf('s6');
    if (at >= 0) list.splice(at, 0, k);
    else list.push(k);
  }
  return list;
}

// ---- Tablo sütun başlığı düzenlemeleri (v2.295) ------------------------
// Yalnız bilinen tablo/sütun; boş değer varsayılan başlığı kullanır.
export function normalizeReportLabels(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const table of Object.keys(REPORT_COLUMN_TABLES)) {
    const t = src[table];
    if (!t || typeof t !== 'object') continue;
    const row = {};
    for (const key of REPORT_COLUMN_TABLES[table]) {
      const v = t[key];
      if (typeof v !== 'string') continue;
      const s = v.trim();
      if (s) row[key] = s.slice(0, 60);
    }
    if (Object.keys(row).length) out[table] = row;
  }
  return out;
}

// ---- Bölümü EK olarak taşıma (v2.291) ----------------------------------
// Yalnız gövde bölümleri taşınabilir; EKLER ve EK LİSTESİ kendini taşımaz.
export function isAnnexPlaceable(key) {
  return REPORT_BODY_ORDER.includes(key) && key !== 'annex' && key !== 's7';
}
export function normalizeAnnexPlacement(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const key of REPORT_BODY_ORDER) {
    if (!isAnnexPlaceable(key)) continue;
    const v = src[key];
    // v2.291: `true` = kendi eki. v2.369: `'ekN'`/`'xN'` = gruplu ekin içine.
    if (v === true) out[key] = true;
    else if (typeof v === 'string' && isReportAnnexKey(v)) out[key] = v;
  }
  return out;
}

// ---- Kullanıcı rapor profilleri (v2.288) --------------------------------
// Profil YALNIZ düzeni taşır: bölüm görünürlüğü, sıra, başlıklar, numara
// biçimi ve tablo alanları. Ses/deşifre kanıtı ve serbest blok METNİ girmez.
export function normalizeReportProfiles(src) {
  const out = [];
  const seen = new Set();
  for (const p of Array.isArray(src) ? src : []) {
    if (!p || typeof p !== 'object') continue;
    const id = typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(p.id) ? p.id : '';
    const name = typeof p.name === 'string' ? p.name.trim().slice(0, 80) : '';
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const layout = normalizeReportLayout({ order: p.order, annexOrder: p.annexOrder, annexes: p.annexes });
    out.push({
      id,
      name,
      at: typeof p.at === 'string' ? p.at : '',
      sections: normalizeReportSections(p.sections),
      order: layout.order,
      annexOrder: layout.annexOrder,
      annexes: layout.annexes,
      titles: normalizeReportTitles(p.titles),
      numbering: REPORT_NUMBERING.includes(p.numbering) ? p.numbering : 'auto',
      columns: normalizeReportColumns(p.columns)
    });
  }
  return out.slice(-20);
}

// ---- 5b-2. Rapor biçimi: sayfa · font · punto (v2.238) -------------------
// TEK KAYNAK. Ekran önizlemesi, yazdırma/PDF (@page), DOCX ve UDF bu değerleri
// okur. `fontFamily` ÜÇ çıktıya da uygulanır (v2.254): varsayılan **Times New
// Roman** (resmî UYAP standardı) → UDF/DOCX/PDF aynı tipografiyle gelir. Yön ve
// kenar boşluğu da UDF'e uygulanır (paperOrientation: "1" dikey, "0" yatay —
// yatay.udf ile doğrulandı, v2.245).
export const REPORT_FONT_DEFS = [
  { key: 'arial', label: 'Arial (sans-serif)', css: "Arial, 'Helvetica Neue', Helvetica, sans-serif", docx: 'Arial' },
  { key: 'times', label: 'Times New Roman (serif)', css: "'Times New Roman', Times, serif", docx: 'Times New Roman' },
  { key: 'segoe', label: 'Segoe UI (sans-serif)', css: "'Segoe UI', Tahoma, sans-serif", docx: 'Segoe UI' }
];
const REPORT_FONT_OPT = defineOptions(REPORT_FONT_DEFS);
export const REPORT_FONT_KEYS = REPORT_FONT_OPT.keys;
export const REPORT_FONT_LABEL = REPORT_FONT_OPT.label;
export const REPORT_FONT_CSS = Object.fromEntries(REPORT_FONT_DEFS.map((d) => [d.key, d.css]));
export const REPORT_FONT_DOCX = Object.fromEntries(REPORT_FONT_DEFS.map((d) => [d.key, d.docx]));

export const REPORT_ORIENTATIONS = ['portrait', 'landscape'];
export const REPORT_ORIENTATION_LABEL = { portrait: 'Dikey', landscape: 'Yatay' };
// v2.372 — TABLO STİLİ ve YOĞUNLUK (görsel; metin DEĞİŞMEZ).
// tableStyle: grid (tam çerçeve) · lines (yalnız yatay çizgi) · plain (çizgisiz).
// density: comfortable (rahat) · compact (sıkı). Ekran + yazdırma + DOCX'e
// uygulanır; UDF tablo kenarlığı UYAP şablonundan gelir (UDF'e uygulanmaz).
export const REPORT_TABLE_STYLES = ['grid', 'lines', 'plain'];
// v2.386 — KURUMSAL BELGE TASARIMI (yalnız GÖRSEL). İki tercih:
// künye düzeni (iki sütunlu sade / klasik tablo) ve tablo görünümü
// (nötr gri / mevcut koyu mavi). İçerik, durum ve hesaplar DEĞİŞMEZ.
export const REPORT_COVER_LAYOUTS = ['simple', 'classic'];
export const REPORT_COVER_LAYOUT_LABEL = { simple: 'İki sütunlu sade', classic: 'Klasik tablo' };
export const REPORT_TABLE_THEMES = ['neutral', 'classic'];
export const REPORT_TABLE_THEME_LABEL = { neutral: 'Nötr gri', classic: 'Koyu mavi' };
export const REPORT_TABLE_STYLE_LABEL = { grid: 'Tam çerçeve', lines: 'Yalnız yatay çizgi', plain: 'Çizgisiz' };
export const REPORT_DENSITIES = ['comfortable', 'compact'];
export const REPORT_DENSITY_LABEL = { comfortable: 'Rahat', compact: 'Sıkı' };
export const REPORT_MARGIN_MIN_MM = 10;
export const REPORT_MARGIN_MAX_MM = 50;
// Gövde puntosu 11–14: depo kuralı ekran metnini 11px altına indirmez; 11 taban
// mevcut görünümle aynıdır (ölçek 1), üstü daha okunaklıdır.
export const REPORT_FONT_SIZE_MIN = 11;
export const REPORT_FONT_SIZE_MAX = 14;
export const REPORT_FONT_SIZE_DEFAULT = 11; // DOCX/UDF gövde tabanı 11 pt

/**
 * Varsayılan rapor biçimi — 15 mm (1,5 cm) kenar boşluğu, 11 pt, dikey A4.
 * **Gerçek UYAP boş dokümanı** 1,5 cm marj kullanır; UDF bunu **punto** olarak
 * saklar (`42.525 pt = 15 mm`). Biz mm tutup UDF'e punto yazıyoruz (v2.257).
 * Üç çıktı (UDF/DOCX/PDF) aynı 15 mm'yi kullanır. Panelden 10–50 mm ayarlanır.
 */
export function emptyReportFormat(over = {}) {
  const base = {
    fontFamily: 'times',
    fontSizePt: REPORT_FONT_SIZE_DEFAULT,
    marginsMm: { top: 15, right: 15, bottom: 15, left: 15 },
    orientation: 'portrait',
    // v2.372 — yeni dosya: yalnız yatay çizgi + rahat yoğunluk (Öneri A görünümü).
    tableStyle: 'lines',
    density: 'comfortable',
    // v2.386 — kurumsal varsayılan: sade resmî künye + nötr tablo.
    coverFields: 'simple',
    tableTheme: 'neutral'
  };
  return { ...base, ...over, marginsMm: { ...base.marginsMm, ...(over && over.marginsMm) } };
}
function fmtClamp(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  // Kenar boşluğu 0,5 mm adımlarla (ör. 42,5 = UYAP boş şablon marjı).
  return Math.min(max, Math.max(min, Math.round(n * 2) / 2));
}
/** Eksik/bozuk biçimi güvenli hâle getirir; bilinmeyen alan korunur. */
export function normalizeReportFormat(src) {
  const base = emptyReportFormat();
  if (!src || typeof src !== 'object') return base;
  const fontFamily = REPORT_FONT_KEYS.includes(src.fontFamily) ? src.fontFamily : base.fontFamily;
  let size = Number(src.fontSizePt);
  if (!Number.isFinite(size)) size = base.fontSizePt;
  size = Math.min(REPORT_FONT_SIZE_MAX, Math.max(REPORT_FONT_SIZE_MIN, Math.round(size * 2) / 2));
  const m = src.marginsMm && typeof src.marginsMm === 'object' ? src.marginsMm : {};
  const marginsMm = {
    top: fmtClamp(m.top, REPORT_MARGIN_MIN_MM, REPORT_MARGIN_MAX_MM, base.marginsMm.top),
    right: fmtClamp(m.right, REPORT_MARGIN_MIN_MM, REPORT_MARGIN_MAX_MM, base.marginsMm.right),
    bottom: fmtClamp(m.bottom, REPORT_MARGIN_MIN_MM, REPORT_MARGIN_MAX_MM, base.marginsMm.bottom),
    left: fmtClamp(m.left, REPORT_MARGIN_MIN_MM, REPORT_MARGIN_MAX_MM, base.marginsMm.left)
  };
  const orientation = REPORT_ORIENTATIONS.includes(src.orientation) ? src.orientation : base.orientation;
  // v2.372 — ESKİ dosyalarda bu alanlar YOKTUR; mevcut görünümü (tam çerçeve +
  // rahat) KORUMAK için tanımsızsa eski değere düşülür. Yeni dosya (emptyReportFormat)
  // 'lines' alır; geçersiz değer base'e döner.
  const tableStyle =
    src.tableStyle === undefined
      ? 'grid'
      : REPORT_TABLE_STYLES.includes(src.tableStyle)
        ? src.tableStyle
        : base.tableStyle;
  const density =
    src.density === undefined
      ? 'comfortable'
      : REPORT_DENSITIES.includes(src.density)
        ? src.density
        : base.density;
  // v2.386 — tasarım tercihleri. Tanımsızsa (eski dosya) yeni kurumsal
  // varsayılan uygulanır: sade künye + nötr tablo. Geçersiz değer base'e döner.
  const coverFields = REPORT_COVER_LAYOUTS.includes(src.coverFields) ? src.coverFields : base.coverFields;
  const tableTheme = REPORT_TABLE_THEMES.includes(src.tableTheme) ? src.tableTheme : base.tableTheme;
  return { ...src, fontFamily, fontSizePt: size, marginsMm, orientation, tableStyle, density, coverFields, tableTheme };
}

// ---- 5c. Teknik ortam alanları (v2.222) ----------------------------------
// Bilirkişi elle doldurur; boşsa rapora "—" yazılır (uydurulmaz). Alanlar
// rapor 4. bölümünü (teknik özellikler/inceleme ortamı) besler.
export const REPORT_TECH_KEYS = [
  'workstation',
  'os',
  'software',
  'metaTool',
  'listening',
  'environment',
  'other'
];
// ---- 5d. Rapor profilleri (v2.223 / v2.261) ------------------------------
// Hazır bölüm kümeleri. Profil yalnız bölüm görünürlüğünü (ve `sablon` için
// SIRAYI) ayarlar; veriyi DEĞİŞTİRMEZ. Bilirkişi sonra tek tek açıp kapatır.
//
// `sablon` = 56.12 ana şablonunun sırası. Diğerleri kullanıcının sırasını
// KORUR (order: null) — mevcut dosyanın düzeni kendiliğinden değişmez.
export const REPORT_PRESET_DEFS = [
  { key: 'minimal', label: 'Yalın (asgari)' },
  { key: 'standard', label: 'Standart' },
  { key: 'full', label: 'Tümü' },
  { key: 'sablon', label: '56.12 Ana Şablon' }
];
const REPORT_MINIMAL_KEYS = ['cover', 'coverFields', 's1', 's2', 's5', 's6', 'signature'];
// 56.12 ana şablon sırası: görevlendirme → materyal/envanter → orijinalin
// korunması → teknik ortam → yöntem → iyileştirme → ASR → bulgular →
// (ölçümler) → sınırlılıklar → kalite kontrolü → cevaplar → kapsam dışı →
// gizlilik → sonuç → ekler. Sorular 1. bölümde değil, cevaplar bölümünde
// (soru + cevap birlikte) verildiği için ayrı soru listesi kapatılır.
export const REPORT_SABLON_ORDER = [
  's1',
  's3',
  'origin',
  'embeddedInfo',
  'acquisition',
  'integrity',
  'speakers',
  'speakerDurations',
  'tech',
  's4',
  'enhancement',
  'transcriptionMethod',
  's5',
  'readingText',
  'wer',
  'levels',
  'limits',
  'qualityControl',
  'reviewSummary',
  'answers',
  'scopeNote',
  'privacy',
  's6',
  'handoverRecord',
  'fileInventory',
  'custodyLog',
  'notationKey',
  'finalChecklist',
  'legalBasis'
];
/**
 * Profil → { sections, order }. `order` null ise kullanıcının sırası korunur.
 * `sections` her anahtarı AÇIKÇA taşır (eksik anahtar varsayılana düşmesin).
 */
export function reportPresetLayout(name) {
  const key = String(name || '');
  if (key === 'sablon') {
    const sections = {};
    for (const k of REPORT_SECTION_KEYS) sections[k] = k !== 's2';
    return { sections, order: [...REPORT_SABLON_ORDER] };
  }
  return { sections: reportSectionsForPreset(key), order: null };
}
export function reportSectionsForPreset(name) {
  if (name === 'full') {
    const all = {};
    for (const k of REPORT_SECTION_KEYS) all[k] = true;
    return all;
  }
  if (name === 'minimal') {
    const off = {};
    for (const d of REPORT_SECTION_DEFS) off[d.key] = false;
    const base = emptyReportSections(off);
    for (const k of REPORT_MINIMAL_KEYS) if (k in base) base[k] = true;
    return base;
  }
  return emptyReportSections(); // 'standard' ve bilinmeyen: varsayılan 19 bölüm
}
export function emptyReportTech(over = {}) {
  const out = {};
  for (const k of REPORT_TECH_KEYS) out[k] = '';
  return { ...out, ...over };
}
export function normalizeReportTech(src) {
  const base = emptyReportTech();
  if (!src || typeof src !== 'object') return base;
  for (const k of REPORT_TECH_KEYS) if (typeof src[k] === 'string') base[k] = src[k];
  for (const k of Object.keys(src)) if (!(k in base)) base[k] = src[k];
  return base;
}
/** Tüm bölümler varsayılanla açık; `over` ile tek tek kapatılabilir. */
export function emptyReportSections(over = {}) {
  const out = {};
  for (const d of REPORT_SECTION_DEFS) out[d.key] = d.def;
  return { ...out, ...over };
}
/** Eksik bölüm anahtarını varsayılanla tamamlar; bilinmeyen anahtarı korur. */
export function normalizeReportSections(src) {
  const base = emptyReportSections();
  if (!src || typeof src !== 'object') return base;
  // Yeni anahtarlar doğrudan okunur.
  for (const k of Object.keys(base)) if (typeof src[k] === 'boolean') base[k] = src[k];
  // Eski adlar → yeni adlar (v2.380 göçü).
  for (const [oldK, newK] of Object.entries(REPORT_KEY_ALIASES)) {
    if (typeof src[oldK] === 'boolean') base[newK] = src[oldK];
  }
  for (const [oldK, newK] of Object.entries(REPORT_RECORD_ALIASES)) {
    if (typeof src[oldK] === 'boolean') base[newK] = src[oldK];
  }
  // Eski EKLER sarmalayıcısı: açıksa altı kayıt bölümü de açılır (içerik korunur).
  if (typeof src.annex === 'boolean') {
    for (const newK of Object.values(REPORT_RECORD_ALIASES)) {
      if (typeof src[newK] !== 'boolean') base[newK] = src.annex;
    }
  }
  // Bilinmeyen anahtar korunur (ileri uyum); s7/annex/eski ad taşınmaz.
  const skip = new Set(['s7', 'annex', 'kunye', ...Object.keys(REPORT_KEY_ALIASES), ...Object.keys(REPORT_RECORD_ALIASES)]);
  for (const k of Object.keys(src)) if (!(k in base) && !skip.has(k)) base[k] = src[k];
  // v2.336: ayrı "RAPOR KÜNYESİ" bölümü tek künyeye (coverFields) birleşti.
  if (typeof src.kunye === 'boolean' && src.kunye && src.coverFields === false) base.coverFields = true;
  return base;
}
/** HİÇ GÖSTERME (v2.388): yalnız bilinen bölüm anahtarları, yalnız `true`. */
export function normalizeReportExcluded(src) {
  const base = src && typeof src === 'object' ? src : {};
  const out = {};
  for (const k of REPORT_SECTION_KEYS) if (base[k] === true) out[k] = true;
  return out;
}
/** Bu bölüm "hiç gösterme" olarak kilitli mi? */
export function reportSectionExcluded(c, key) {
  const v = c && c.report && c.report.excluded;
  return !!(v && v[key] === true);
}


// ---- ÜST YAZI (v2.323) ----------------------------------------------------
// Üst yazı (sunuş yazısı) AYRI bir belgedir; rapor onun EK-1'idir. "Teslim"
// sözcüğü son teslim TARİHİ için ayrılmıştır (deliveryInfo); belge kümesi için
// "belge ekleri" denir. Ayrıntı: docs/UST_YAZI_PLANI.md.
// v2.387 — belge eki türleri: EK-1 rapor · bölüm eki · serbest ek.
// `reportAnnex` KALDIRILDI: rapor içi ek kavramı v2.380'de kalktı; eski kayıtlar
// `sections` ekine göç eder (aşağıdaki normalizeLetterAnnexes).
export const LETTER_ANNEX_KINDS = ['report', 'sections', 'custom'];

export function emptyLetter() {
  return {
    place: '', // "Antalya" — boşsa yazılmaz
    date: '', // boşsa rapor tarihi
    addressee: '', // boşsa mahkeme adından türetilir
    subject: '', // boşsa varsayılan konu
    bodyText: '', // boşsa varsayılan gövde (tek kaynak)
    // İLGİ satırı (v2.327): boşsa görevlendirme tarihinden üretilir; gerçek
    // dayanak yoksa satır hiç çizilmez. `showReference:false` satırı kapatır.
    referenceText: '',
    showReference: true,
    // İmza kipi (v2.327): 'electronic' → imza ÇİZGİSİ yok (sahte imza izlenimi
    // verilmez); 'physical' → ıslak imza için çizgi.
    signatureMode: 'electronic',
    signerTitle: '' // boşsa "Bilirkişi"
  };
}

export function normalizeLetter(v) {
  const base = emptyLetter();
  if (!isObj(v)) return base;
  const out = { ...base, ...v };
  for (const k of ['place', 'date', 'addressee', 'subject', 'bodyText', 'signerTitle', 'referenceText']) {
    out[k] = str(out[k]).trim();
  }
  out.signatureMode = out.signatureMode === 'physical' ? 'physical' : 'electronic';
  out.showReference = out.showReference !== false;
  // v2.387 — kaldırılan ölü alanlar eski kayıttan TAŞINMAZ.
  delete out.enabled;
  delete out.showRegistry;
  delete out.showPageCounts;
  return out;
}

/** Varsayılan: yalnız EK-1 (rapor). Rapor eki tek ve zorunludur. */
export function emptyLetterAnnexes() {
  return [{ id: 'la1', kind: 'report' }];
}

/**
 * Belge ekleri: sıra korunur, `report` tekildir ve BAŞTA durur.
 * Geçersiz tür/boş içerik düşer; bilinmeyen alanlar korunur.
 */
export function normalizeLetterAnnexes(list) {
  const src = Array.isArray(list) ? list : [];
  const out = [];
  let report = null;
  for (const raw of src) {
    if (!isObj(raw)) continue;
    const kind = String(raw.kind || '');
    // v2.387 — GÖÇ: `reportAnnex` artık yok. Rapor içi ek kavramı v2.380'de
    // kalktığı için eski ek, BÖLÜM EKİNE çevrilir; normalizeCase taşınan
    // bölümü raporda kapatır (aynı içerik iki yerde bulunmaz).
    if (kind === 'reportAnnex') {
      const k = mapReportKey(raw.key);
      if (!REPORT_SECTION_KEYS.includes(k)) continue;
      out.push({ ...raw, kind: 'sections', sections: [k], label: reportAnnexBaseTitle(raw.key), id: str(raw.id) });
      continue;
    }
    if (!LETTER_ANNEX_KINDS.includes(kind)) continue;
    if (kind === 'report') {
      if (report) continue;
      report = { ...raw, kind, id: str(raw.id) || 'la1' };
      continue;
    }
    if (kind === 'sections') {
      const sections = (Array.isArray(raw.sections) ? raw.sections : []).filter((k) => REPORT_SECTION_KEYS.includes(k));
      if (!sections.length) continue;
      out.push({ ...raw, kind, sections, label: str(raw.label), id: str(raw.id) });
    } else {
      const title = str(raw.title);
      const content = str(raw.content);
      if (!title && !content) continue; // boş serbest ek yazılmaz
      out.push({ ...raw, kind, title, content, id: str(raw.id) });
    }
  }
  const all = [report || { id: 'la1', kind: 'report' }, ...out];
  // Eksik kimlikler deterministik verilir (rastgele değil; test edilebilir).
  const used = new Set(all.map((a) => a.id).filter(Boolean));
  let n = 1;
  for (const a of all) {
    if (a.id) continue;
    while (used.has('la' + n)) n++;
    a.id = 'la' + n;
    used.add(a.id);
  }
  return all;
}

/**
 * Belge eklerine TAŞINMIŞ bölüm anahtarları (v2.324). Taşınan bölüm raporda
 * ÇİZİLMEZ; içerik yalnız ekinde bulunur (çift üretim yok).
 */
export function letterMovedSectionKeys(annexes) {
  const out = new Set();
  for (const a of normalizeLetterAnnexes(annexes)) {
    if (a.kind !== 'sections') continue;
    for (const k of a.sections) out.add(k);
  }
  return out;
}

/** Bölümleri belge eklerinden çıkarır (rapora geri döner); boşalan ek düşer. */
export function removeSectionsFromLetterAnnexes(annexes, keys) {
  const drop = new Set(Array.isArray(keys) ? keys : [keys]);
  const out = [];
  for (const a of normalizeLetterAnnexes(annexes)) {
    if (a.kind !== 'sections') {
      out.push(a);
      continue;
    }
    const left = a.sections.filter((k) => !drop.has(k));
    if (left.length) out.push({ ...a, sections: left });
  }
  return normalizeLetterAnnexes(out);
}

/** EK numarası TÜRETİLİR: bitişik, silinen/kapatılan ek boşluk bırakmaz. */
export function letterAnnexNumbering(annexes) {
  return normalizeLetterAnnexes(annexes).map((a, i) => ({ ...a, no: 'EK-' + (i + 1) }));
}

export function emptyCase(over = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    schemaName: SCHEMA_NAME,

    id: newId('case'),
    createdAt: '',
    updatedAt: '',

    // Durum
    status: 'draft',
    reportType: 'hukuk',

    // Kapak
    court: '',
    fileNo: '',
    subject: '',
    // İNCELEME KONUSU (v2.354): dava konusundan AYRI. Dava konusu hukuki
    // uyuşmazlıktır; inceleme konusu bilirkişiye verilen teknik görevdir.
    // Boşsa raporun 1. bölümünde satır yazılmaz (aynı metin iki kez basılmaz).
    examinationSubject: '',
    caseDate: '',
    inspectionDate: '',

    // Taraflar
    parties: {
      plaintiff: '',
      plaintiffCounsel: '',
      defendant: '',
      defendantCounsel: ''
    },

    // Görevlendirme
    assignment: {
      date: '',
      dueDate: '',
      durationDays: '',
      // Son teslim tarihi kullanıcı tarafından elle yazıldıysa true. Otomatik
      // hesap (görevlendirme tarihi + süre) elle yazılanı EZMEZ.
      dueDateManual: false,
      scope: '',
      body: '' // Görevlendirme yazısı metni
    },

    // Bilirkişi ve ekip
    expert: {
      name: '',
      registryNo: '',
      field: '56.12 – Ses kayıtlarının metin hâline dönüştürülmesi'
    },
    team: [], // emptyTeamMember() listesi
    // DOSYA GENELİ KİŞİLER (v2.205): aynı kişi birden çok kayıtta görünüyorsa
    // burada TEK kayıt olarak tutulur; kayıt içi konuşmacılar `personId` ile
    // bağlanır. Uzman kanaatidir; otomatik kimlik tespiti değildir.
    speakers: [], // emptyCaseSpeaker() listesi
    // ÇALIŞMA NOTLARI (v2.356): kişisel defter; rapora GİRMEZ, eklerine girmez.
    notebook: [],
    // DİSK ENVANTERİ (v2.215): delil paketindeki disk.json kayıtları.
    // Disk/bölüm/birim metadata'sı + dizin ağacı; raw sektör YOKTUR.
    // Kayıtlar burada tutulur; materyal `origin.acquisition.diskId` ile bağlanır.
    disks: [],

    // ÜST YAZI (v2.323): ayrı belge; rapor onun EK-1'idir.
    letter: emptyLetter(),
    letterAnnexes: emptyLetterAnnexes(),

    // FİZİKÎ DOSYA TESLİM VE İADE (v2.330): kâğıt dosya + fizikî materyal
    // (USB/CD/DVD…) teslim ve iade kaydı. Ses kökeninden (`origin`) AYRIDIR;
    // UYAP erişimi burada tutulmaz ve zorunlu değildir.
    physicalFile: emptyPhysicalFile(),

    // Rapor
    report: {
      date: '',
      // Gömülü metadata (cihaz beyanı) rapora girsin mi? VARSAYILAN KAPALI:
      // beyan niteliğindedir, kullanıcı bilinçli açmalıdır.
      includeEmbedded: false,
      // Konuşmacı yöntem notu (v2.303): otomatik ön-atama kullanıldıysa rapora
      // dürüst bir yöntem cümlesi eklenir. VARSAYILAN KAPALI; kullanıcı açar.
      speakerMethod: false,
      methodText: '',
      limitationsText: '',
      conclusionText: '',
      // RAPOR ÖZETİ GİRİŞİ (v2.359): dosyaya özel; boşsa etkin varsayılan
      // (Ayarlar → Kendi varsayılan metinlerim) kullanılır.
      summaryIntroText: '',
      // Bölüm görünürlüğü (v2.219): anahtar → açık mı. Varsayılan tümü açık.
      sections: emptyReportSections(),
      // HİÇ GÖSTERME (v2.388): anahtar → true. Bu bölüm HİÇBİR KOŞULDA rapora
      // girmez (profil, varsayılan, birleştirme açamaz). Silme DEĞİLDİR: veri
      // durur; yalnız kullanıcı geri açar. Numarayı tüketmez, içindekilere girmez.
      excluded: {},
      // Rapor iskeleti (v2.227): gövde sırası + ek sırası + ek görünürlüğü.
      layout: emptyReportLayout(),
      // Tablo sütun görünürlüğü (v2.235): tümü açık.
      columns: emptyReportColumns(),
      // Ön bölüm ALAN görünürlüğü (v2.336): tümü açık.
      fields: normalizeReportFieldVisibility(),
      // Numaralandırma (v2.285): 'auto' | 'letters' | 'none'.
      numbering: 'auto',
      // Bölüm başlığı düzenlemeleri (v2.285): anahtar → kullanıcı başlığı.
      // Boş/eksik anahtar varsayılan başlığı kullanır.
      titles: {},
      // Serbest rapor blokları (v2.287): { id, title, text, on }.
      // Sıra `layout.order` içinde `free:<id>` ile tutulur.
      blocks: [],
      // Kullanıcı rapor profilleri (v2.288): yalnız düzen; kanıt/metin taşımaz.
      userProfiles: [],
      // Bölümü EKLER altına taşıma (v2.291): { s5: true } gibi. v2.369: ÖNERİ A
      // yerleşimi YENİ dosyada `freshCase()` (app.js) tarafından atanır; şema
      // varsayılanı NÖTR kalır (mevcut dosyalar ve testler değişmez).
      annexPlacement: {},
      // Sütun başlığı düzenlemeleri (v2.295): tablo → sütun → metin.
      labels: {},
      // Sayfalı önizleme (v2.221): A4 sayfa çizgileri. VARSAYILAN KAPALI
      // (en temiz hâl sürekli kâğıttır); kullanıcı açarsa görünür.
      pageView: false,
      // Teknik ortam (v2.222): elle doldurulur; boşsa rapora "—".
      tech: emptyReportTech(),
      // Rapor biçimi (v2.238): sayfa · font · punto · yön. TEK KAYNAK; ekran,
      // yazdırma/PDF (@page), DOCX ve UDF bu değerleri okur.
      format: emptyReportFormat(),
      // Tarafsızlık beyanı (v2.341): 56.12 künyesinin "hâl beyanı" alanı.
      // Boşsa rapora SATIR BASILMAZ (uydurma "—" yok). `annexList` eski
      // sürümden kalan ölü alandır: okunur/korunur ama çıktıya girmez.
      impartiality: '',
      annexList: '',
      // Kalite kontrolü / ikinci göz (v2.226): elle; boşsa rapora "—".
      qcBy: '',
      qcScope: '',
      qcDate: '',
      // Rapor revizyonları (v2.227): yalnız rapor düzeni + rapor metinleri.
      // Kanıt (ses/bölüm) saklanmaz; en çok 10 kayıt tutulur.
      revisions: []
    },
    questions: [], // emptyQuestion() listesi

    // İçerik
    materials: [],

    // Ortak çalışma
    shared: false,
    lastEditedBy: '', // teamMember.id
    mergeLog: [], // [{ at, actor, source, applied, conflicts }]

    ...over
  };
}

// ---- 6. Normalleştirme (eksik alanı tamamla, tipi düzelt) ------------------
// Amaç: eski/eksik kaydı ÇÖKERTMEDEN açmak. Veri kaybı yok; bilinmeyen alan
// korunur (`...src`). Dönen nesne her zaman geçerli şekle sahiptir.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ---- 5b. Fizikî dosya teslim ve iade (v2.330) ----------------------------
// KURAL: teslim ve iade AYRI kayıtlardır (ayrı tarih/saat). Teslim alınan
// materyal listesi iade ekranına AYNEN gelir; hiçbir materyal kendiliğinden
// "iade edildi" sayılmaz. Dosya içeriği sayılmadıysa bu durum açıkça yazılır.
export function emptyPhysicalItem(over = {}) {
  return {
    id: newId('pf'),
    type: 'usb',
    label: '', // görülebilen marka/model/etiket
    serial: '',
    seal: '', // mühür/ambalaj numarası
    condition: '', // teslim anındaki fizikî durum
    related: false, // inceleme göreviyle ilgili mi
    materialId: '', // ilişkili ses kaydı (varsa)
    opened: false, // açıldı/incelendi mi (varsayılan HAYIR)
    returned: false,
    returnSeal: '',
    returnCondition: '',
    note: '',
    ...over
  };
}

export function emptyPhysicalFile(over = {}) {
  return {
    // Teslim alma
    handover: {
      delivered: false, // fizikî dosya teslim alındı mı (UYAP erişimi bunun dışındadır)
      at: '', // YYYY-MM-DDTHH:MM (yerel)
      deliveredBy: '', // teslim eden görevli
      receivedBy: '', // teslim alan bilirkişi
      folders: '', // klasör / cilt sayısı
      pages: '', // sayfa sayısı (biliniyorsa)
      condition: '',
      indexDelivered: 'unknown', // dizi pusulası: yes | no | unknown
      indexNote: '',
      note: ''
    },
    items: [], // emptyPhysicalItem() listesi
    // İade
    returned: false,
    return: {
      at: '',
      returnedBy: '', // iade eden bilirkişi
      receivedBy: '', // iade alan görevli
      folders: '',
      condition: '',
      indexCompared: 'unknown', // dizi pusulasıyla karşılaştırıldı mı: yes | no | unknown
      differences: '',
      note: ''
    },
    // Belge kopyaları (taranmış dizi pusulası, imzalı tutanak kopyaları).
    // Gövde IndexedDB'de tutulur; burada YALNIZ üst veri durur.
    documents: [], // { id, kind, name, at, size, note }
    ...over
  };
}

export function normalizePhysicalItem(src = {}) {
  const s = isObj(src) ? src : {};
  return {
    ...s,
    id: str(s.id) || newId('pf'),
    type: pick(s.type, PHYSICAL_ITEM_TYPE, 'other'),
    label: str(s.label),
    serial: str(s.serial),
    seal: str(s.seal),
    condition: str(s.condition),
    related: s.related === true,
    materialId: str(s.materialId),
    opened: s.opened === true,
    returned: s.returned === true,
    returnSeal: str(s.returnSeal),
    returnCondition: str(s.returnCondition),
    note: str(s.note)
  };
}

export function normalizePhysicalFile(src = {}) {
  const p = isObj(src) ? src : {};
  const base = emptyPhysicalFile();
  const h = isObj(p.handover) ? p.handover : {};
  const r = isObj(p.return) ? p.return : {};
  const docs = (Array.isArray(p.documents) ? p.documents : [])
    .filter(isObj)
    .map((d) => ({
      ...d,
      id: str(d.id) || newId('pfd'),
      kind: pick(d.kind, ['index', 'handover', 'return', 'other'], 'other'),
      name: str(d.name),
      at: str(d.at),
      size: num(d.size),
      note: str(d.note)
    }))
    .filter((d) => d.name);
  return {
    ...base,
    ...p,
    handover: {
      ...base.handover,
      ...h,
      delivered: h.delivered === true,
      indexDelivered: pick(h.indexDelivered, PHYSICAL_INDEX_STATE, 'unknown')
    },
    // Bozuk (nesne olmayan) girdi materyal SAYILMAZ: hayalet satır üretilmez.
    items: (Array.isArray(p.items) ? p.items : []).filter(isObj).map(normalizePhysicalItem),
    returned: p.returned === true,
    return: {
      ...base.return,
      ...r,
      indexCompared: pick(r.indexCompared, PHYSICAL_INDEX_STATE, 'unknown')
    },
    documents: docs
  };
}

const PHYSICAL_TEXT_KEYS = [
  'handover.at',
  'handover.deliveredBy',
  'handover.receivedBy',
  'handover.folders',
  'handover.pages',
  'handover.condition',
  'handover.indexNote',
  'handover.note',
  'return.at',
  'return.returnedBy',
  'return.receivedBy',
  'return.folders',
  'return.condition',
  'return.differences',
  'return.note'
];
const pfGet = (p, path) => {
  const [a, b] = path.split('.');
  return str((p && p[a] && p[a][b]) || '');
};

/** Kullanıcı verisi var mı? Boş taslak dosyayı "dosya" yapmaz. */
export function physicalFileActive(pf) {
  if (!isObj(pf)) return false;
  const h = isObj(pf.handover) ? pf.handover : {};
  const r = isObj(pf.return) ? pf.return : {};
  if (h.delivered === true || pf.returned === true) return true;
  if ((Array.isArray(pf.items) ? pf.items : []).length) return true;
  if ((Array.isArray(pf.documents) ? pf.documents : []).length) return true;
  if (PHYSICAL_TEXT_KEYS.some((k) => pfGet(pf, k).trim())) return true;
  if (h.indexDelivered && h.indexDelivered !== 'unknown') return true;
  if (r.indexCompared && r.indexCompared !== 'unknown') return true;
  return false;
}

/**
 * Bir materyalin iade durumu. ÜÇ HÂL:
 *   notReturned — iade edilmedi (teslim alınmışsa EKSİK demektir)
 *   returned    — iade edildi, mühür/durum aynı
 *   changed     — iade edildi ama mühür veya fizikî durum değişmiş
 */
export function physicalItemReturnState(item) {
  const it = item || {};
  if (!it.returned) return 'notReturned';
  const seal = str(it.seal).trim();
  const retSeal = str(it.returnSeal).trim();
  const cond = str(it.condition).trim();
  const retCond = str(it.returnCondition).trim();
  if ((seal && retSeal && seal !== retSeal) || (cond && retCond && cond !== retCond)) return 'changed';
  return 'returned';
}

/** Özet sayılar. Uydurma yok: yalnız kayıtlı materyaller sayılır. */
export function physicalCounts(pf) {
  const p = normalizePhysicalFile(pf);
  const items = p.items;
  const states = items.map(physicalItemReturnState);
  return {
    items: items.length,
    related: items.filter((i) => i.related).length,
    opened: items.filter((i) => i.opened).length,
    returned: states.filter((s) => s === 'returned').length,
    changed: states.filter((s) => s === 'changed').length,
    missing: states.filter((s) => s === 'notReturned').length,
    handoverDelivered: p.handover.delivered === true,
    fileReturned: p.returned === true,
    indexDelivered: p.handover.indexDelivered,
    indexCompared: p.return.indexCompared,
    documents: p.documents.length
  };
}

/** İade edilmemiş materyaller (senaryo 4: eksik görünür olmalı). */
export function physicalMissingItems(pf) {
  const p = normalizePhysicalFile(pf);
  return p.items.filter((i) => physicalItemReturnState(i) === 'notReturned');
}

/** İade tamam mı? Eksik materyal varsa TAMAM değildir (varsayılan kabul yok). */
export function physicalReturnComplete(pf) {
  const p = normalizePhysicalFile(pf);
  if (!p.returned) return false;
  return physicalMissingItems(p).length === 0;
}

/** Teslim kaydı yeterli mi? Fizikî dosya işaretliyse tarih ve teslim eden aranır. */
export function physicalHandoverComplete(pf) {
  const p = normalizePhysicalFile(pf);
  if (!p.handover.delivered && !p.items.length) return false;
  return !!str(p.handover.at).trim();
}

export function normalizeSegment(src = {}) {
  const s = isObj(src) ? src : {};
  const obs = isObj(s.obs) ? s.obs : {};
  // BİLİNMEYEN ANAHTAR KORUNUR (v2.203): ileri sürümün eklediği gözlem bayrağı
  // bu sürümde tanınmasa bile kayıtta kalır; kaydetmede sessizce silinmez.
  // Bilinen anahtarlar her zaman bulunur (eski kayıtta eksikse false).
  const obsOut = {
    ...Object.fromEntries(Object.entries(obs).map(([k, v]) => [k, !!v])),
    ...emptyObs(obs)
  };
  const out = {
    ...s,
    id: s.id || newId('sg'),
    start: str(s.start),
    end: str(s.end),
    speakerId: str(s.speakerId),
    speaker: str(s.speaker),
    speakerAuto: !!s.speakerAuto,
    text: str(s.text),
    // Otomatik çözümleme çıktısı korunur (v2.83). Eski kayıtlarda bu alan
    // yoktur; boş kalır ve rapor "otomatik çıktı saklanmadı" der — uydurma
    // yapılmaz.
    asrText: str(s.asrText),
    asrModel: str(s.asrModel),
    asrAt: str(s.asrAt),
    textRev: Math.max(0, Math.floor(Number(s.textRev) || 0)),
    // Öneri yalnız geçerli metin taşıyorsa saklanır; bozuk kayıt sessizce
    // düzeltme gibi görünmesin.
    proposal: isObj(s.proposal) && typeof s.proposal.text === 'string'
      ? {
          text: s.proposal.text,
          by: str(s.proposal.by),
          at: str(s.proposal.at),
          baseText: str(s.proposal.baseText)
        }
      : null,
    lastEditBy: str(s.lastEditBy),
    reviewedBy: str(s.reviewedBy),
    reviewedAt: str(s.reviewedAt),
    // v2 Türkçe kodları BURADA çevrilir (v2.89). Öncesinde `pick(...)` ile
    // okunuyordu ve tanınmayan değer sessizce 'pending'e düşüyordu; yani v2
    // dosyasındaki onaylar dosya açılır açılmaz SİLİNİYORDU.
    review: normalizeReviewState(s.review),
    obs: obsOut,
    history: Array.isArray(s.history)
      ? s.history.filter(isObj).map((h) => ({ text: str(h.text), at: str(h.at), actor: str(h.actor) }))
      : [],
    silence: isObj(s.silence) ? s.silence : null,
    // v2.73: veri IndexedDB'ye taşındı (GB mertebesi kota). Kelime zamanlaması
    // artık saklanabilir; karaoke yeniden yüklemede de çalışır.
    words: Array.isArray(s.words) ? s.words.filter(isObj) : []
  };
  // v2 kalıntısı: `checked: true` → approved.
  if (!s.review && s.checked === true) out.review = 'approved';
  // Oturum içi geçici alanlar (__editSnapshot vb.) kayda ve dışa aktarıma girmez.
  for (const k of Object.keys(out)) if (k.startsWith('__')) delete out[k];
  // v2 kalıntısı: `speaker` (ad) → konuşmacı listesinde eşleşen id.
  if (!out.speakerId && typeof s.speaker === 'string') out._legacySpeaker = s.speaker;
  return out;
}

// v2.79: arayüz uzun süre Türkçe ETİKET yazdı ("Davacı", "Kadın") ama şema
// ASCII KOD bekler ("complainant", "female"). Etiket kayda yazılınca
// normalizeSpeaker onu tanımıyor ve değeri 'unspecified'a düşürüyordu — yani
// bilirkişinin girdiği rol/cinsiyet SESSİZCE kayboluyordu. Aşağıdaki göç
// tabloları eski kayıtları kurtarır; arayüz artık yalnız kod yazar.
const SPEAKER_ROLE_ALIASES = {
  'Belirtilmedi': 'unspecified',
  'Davacı': 'complainant',
  'Müşteki/Mağdur': 'complainant',
  'Müşteki / Davacı': 'complainant',
  'Davalı': 'defendant',
  'Sanık': 'defendant',
  'Şüpheli': 'defendant',
  'Şüpheli / Davalı': 'defendant',
  'Alacaklı': 'complainant',
  'Borçlu': 'defendant',
  'Tanık': 'witness',
  'Bilirkişi': 'expert',
  'Üçüncü kişi': 'other',
  'Tercüman': 'other'
};
const SPEAKER_GENDER_ALIASES = {
  'Belirtilmedi': 'unspecified',
  'Kadın': 'female',
  'Erkek': 'male',
  'Belirsiz': 'uncertain'
};
export function normalizeSpeakerRole(v) {
  const s = str(v).trim();
  if (!s) return 'unspecified';
  if (SPEAKER_ROLE.includes(s)) return s;
  return SPEAKER_ROLE_ALIASES[s] || 'unspecified';
}
export function normalizeSpeakerGender(v) {
  const s = str(v).trim();
  if (!s) return 'unspecified';
  if (SPEAKER_GENDER.includes(s)) return s;
  return SPEAKER_GENDER_ALIASES[s] || 'unspecified';
}
// Standart konuşmacı kodu: S1, S2, S3… Var olan kod KORUNUR (rapor tutarlılığı
// için kod bir kez verilince değişmez); kodu olmayan konuşmacıya en küçük BOŞ
// kod verilir. Böylece silinen bir konuşmacının kodu yeniden kullanılır ve
// raporda S1, S3 gibi boşluklar oluşmaz.
export function assignSpeakerCodes(speakers) {
  const used = new Set();
  for (const sp of speakers || []) {
    const c = str(sp.code).trim();
    if (/^S\d+$/.test(c)) used.add(c);
  }
  let n = 1;
  for (const sp of speakers || []) {
    if (/^S\d+$/.test(str(sp.code).trim())) continue;
    while (used.has('S' + n)) n += 1;
    sp.code = 'S' + n;
    used.add(sp.code);
  }
  return speakers || [];
}
// Dosya geneli kişi kodları: K1, K2… Kayıt içi S1/S2'den AYRIDIR; iki kaydın
// S1'i aynı kişi olmayabilir. Var olan kod korunur, boş koda en küçük boş kod
// verilir (silinen kişinin kodu yeniden kullanılır).
export function assignCaseSpeakerCodes(speakers) {
  const used = new Set();
  for (const sp of speakers || []) {
    const c = str(sp.code).trim();
    if (/^K\d+$/.test(c)) used.add(c);
  }
  let n = 1;
  for (const sp of speakers || []) {
    if (/^K\d+$/.test(str(sp.code).trim())) continue;
    while (used.has('K' + n)) n += 1;
    sp.code = 'K' + n;
    used.add(sp.code);
  }
  return speakers || [];
}


// ---- Konuşmacı ses tutarlılığı (v2.265) ----------------------------------
// AMAÇ: "bu bölüm S1'e atanmış ama ölçülen ses S2'ye daha yakın" gibi
// İŞARETLERİ görünür kılmak. Kimlik tespiti DEĞİLDİR; ölçüm yalnız perde
// (f0) tahminine dayanır ve kararı uzman verir. Otomatik DEĞİŞTİRME yok.
export const VOICE_SCHEMA = 1;
export const VOICE_RATIO = 0.28; // ~4 yarım ton: "farklı olabilir" eşiği
export const VOICE_CHANGE_RATIO = 0.35; // ardışık bölümlerde değişim şüphesi
export const VOICE_MIN_SAMPLES = 3; // profil için en az bölüm sayısı

/** Sayı dizisinin ortancası (NaN/boş yok sayılır). */
export function medianOf(values) {
  const nums = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/**
 * Ölçülen bölümlerden konuşmacı profilleri (ortanca perde).
 * `points` = [{ index, speakerId, hz, ambiguous }]
 * Döner: [{ speakerId, count, medianHz, reliable }]
 * `reliable` = yeterli sayıda GÜVENİLİR (oktav belirsiz olmayan) ölçüm var mı.
 */
export function speakerVoiceProfiles(points) {
  const by = new Map();
  for (const p of Array.isArray(points) ? points : []) {
    if (!p || !p.speakerId) continue;
    if (p.ambiguous) continue; // oktav belirsiz ölçüm profile girmez
    if (!Number.isFinite(p.hz) || p.hz <= 0) continue;
    if (!by.has(p.speakerId)) by.set(p.speakerId, []);
    by.get(p.speakerId).push(p.hz);
  }
  const out = [];
  for (const [speakerId, hz] of by) {
    out.push({
      speakerId,
      count: hz.length,
      medianHz: medianOf(hz),
      reliable: hz.length >= VOICE_MIN_SAMPLES
    });
  }
  return out;
}

/**
 * Atanan konuşmacıdan ölçülen perdeye göre uzaklaşan bölümler.
 * Döner: [{ index, speakerId, hz, expectedHz, ratio, nearestSpeakerId, nearestHz, kind }]
 * KURAL: yalnız GÜVENİLİR profiller karşılaştırılır; eşik altındaki fark
 * işaretlenmez. Otomatik düzeltme YOK.
 */
export function voiceOutliers(points, profiles, ratio = VOICE_RATIO) {
  const prof = new Map((Array.isArray(profiles) ? profiles : []).map((p) => [p.speakerId, p]));
  const out = [];
  for (const p of Array.isArray(points) ? points : []) {
    if (!p || !p.speakerId || p.ambiguous) continue;
    if (!Number.isFinite(p.hz) || p.hz <= 0) continue;
    const mine = prof.get(p.speakerId);
    if (!mine || !mine.reliable || !mine.medianHz) continue;
    const dev = Math.abs(Math.log(p.hz / mine.medianHz));
    if (dev <= Math.log(1 + ratio)) continue;
    // En yakın DİĞER konuşmacı profili (bilgi amaçlı; karar uzmanın).
    let nearest = null;
    for (const q of prof.values()) {
      if (q.speakerId === p.speakerId || !q.reliable || !q.medianHz) continue;
      const d = Math.abs(Math.log(p.hz / q.medianHz));
      if (!nearest || d < nearest.d) nearest = { speakerId: q.speakerId, hz: q.medianHz, d };
    }
    out.push({
      index: p.index,
      speakerId: p.speakerId,
      hz: p.hz,
      expectedHz: mine.medianHz,
      ratio: Math.exp(dev) - 1,
      nearestSpeakerId: nearest ? nearest.speakerId : '',
      nearestHz: nearest ? nearest.hz : 0,
      kind: nearest && nearest.d < dev ? 'nearest-other' : 'deviation'
    });
  }
  return out;
}

/**
 * Aynı konuşmacıya atanmış ARDIŞIK bölümlerde ani perde sıçraması.
 * "Burada konuşmacı değişmiş olabilir" işaretidir; bölme/sınır kontrolü için.
 */
export function voiceChangeSuspects(points, ratio = VOICE_CHANGE_RATIO) {
  const list = (Array.isArray(points) ? points : []).filter((p) => p && !p.ambiguous && Number.isFinite(p.hz) && p.hz > 0);
  list.sort((a, b) => a.index - b.index);
  const out = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1];
    const b = list[i];
    if (!a.speakerId || a.speakerId !== b.speakerId) continue;
    if (b.index !== a.index + 1) continue; // yalnız komşu bölüm
    const dev = Math.abs(Math.log(b.hz / a.hz));
    if (dev <= Math.log(1 + ratio)) continue;
    out.push({ prevIndex: a.index, index: b.index, speakerId: a.speakerId, prevHz: a.hz, hz: b.hz, ratio: Math.exp(dev) - 1 });
  }
  return out;
}

// ---- Konuşmacı GÖMME (embedding) benzerliği (v2.279) ---------------------
// NEDEN: perde (f0) ayrımı zayıftır; benzer perdeli iki kişi ayrışmaz
// (v2.265'in dürüst sınırı). Konuşmacı doğrulama modeli (WavLM-SV) konuşmacı
// parmak izi (x-vector) üretir; bölümün ATANDIĞI konuşmacıya ne kadar
// benzediğini ölçer. KİMLİK TESPİTİ DEĞİLDİR: yalnız benzerlik; atama
// otomatik DEĞİŞMEZ, kararı uzman verir.
export const VOICE_EMBED_SCHEMA = 'akis.voice-embed.v1';
export const VOICE_EMBED_MODEL = 'Xenova/wavlm-base-plus-sv';
export const VOICE_EMBED_DTYPE = 'q8';
export const VOICE_EMBED_BYTES = 101683453; // onnx/model_quantized.onnx (ölçüldü)
export const VOICE_EMBED_DIM = 512;
export const VOICE_EMBED_SR = 16000;
export const VOICE_EMBED_WINDOW_SEC = 5;
export const VOICE_EMBED_MIN_SEC = 1.2; // çok kısa bölüm güvenilir değil
export const VOICE_EMBED_MIN_PROFILE = 3;
// EŞİKLER ÖLÇÜLDÜ (v2.279, gerçek Chromium + model, VoxCeleb çiftleri):
//   aynı konuşmacı: 0.963 · 0.917
//   farklı konuşmacı: 0.786 · 0.678 · 0.764 · 0.664
//   aynı TTS kaydın iki penceresi: 0.876 · perde kaydırılmış varyant: 0.576
// Bu yüzden ≥ 0.88 "aynı", < 0.72 "farklı"; ARASI BELİRSİZ → işaretlenmez.
export const VOICE_EMBED_SAME = 0.88;
export const VOICE_EMBED_DIFF = 0.72;
export const VOICE_EMBED_MIN_MARGIN = 0.1;

const roundSim = (v) => Math.round(v * 1000) / 1000;

/** L2 birim vektör (boş/sıfır güvenli). */
export function l2Normalize(vec) {
  const a = Array.isArray(vec) ? vec.map(Number) : [];
  const n = Math.sqrt(a.reduce((s, v) => s + (Number.isFinite(v) ? v * v : 0), 0));
  if (!n) return a.map(() => 0);
  return a.map((v) => (Number.isFinite(v) ? v / n : 0));
}

/** Kosinüs benzerliği; boyut/boş/sıfır uyuşmazlığında 0 (uydurma yok). */
export function cosineSimilarity(a, b) {
  const x = Array.isArray(a) ? a : [];
  const y = Array.isArray(b) ? b : [];
  if (!x.length || x.length !== y.length) return 0;
  let d = 0,
    nx = 0,
    ny = 0;
  for (let i = 0; i < x.length; i++) {
    const p = Number(x[i]),
      q = Number(y[i]);
    if (!Number.isFinite(p) || !Number.isFinite(q)) return 0;
    d += p * q;
    nx += p * p;
    ny += q * q;
  }
  if (!nx || !ny) return 0;
  return d / (Math.sqrt(nx) * Math.sqrt(ny));
}

/** Vektörlerin ortalamasının birim hâli (profil merkezi). */
export function embeddingCentroid(vectors) {
  const list = (Array.isArray(vectors) ? vectors : []).filter((v) => Array.isArray(v) && v.length);
  if (!list.length) return [];
  const dim = list[0].length;
  const sum = new Array(dim).fill(0);
  let n = 0;
  for (const v of list) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += Number(v[i]) || 0;
    n++;
  }
  if (!n) return [];
  return l2Normalize(sum.map((x) => x / n));
}

/** Konuşmacı profilleri: { speakerId, count, centroid, reliable }. */
export function speakerEmbeddingProfiles(points) {
  const by = new Map();
  for (const p of Array.isArray(points) ? points : []) {
    if (!p || !p.speakerId || !Array.isArray(p.vec) || !p.vec.length) continue;
    if (!by.has(p.speakerId)) by.set(p.speakerId, []);
    by.get(p.speakerId).push(p);
  }
  const out = [];
  for (const [speakerId, list] of by) {
    out.push({
      speakerId,
      count: list.length,
      centroid: embeddingCentroid(list.map((p) => p.vec)),
      reliable: list.length >= VOICE_EMBED_MIN_PROFILE
    });
  }
  return out;
}

/**
 * Atandığı konuşmacıya benzemeyip BAŞKA konuşmacıya belirgin biçimde benzeyen
 * bölümler. Kural (ölçülmüş eşikler):
 *   own < DIFF  VE  enYakınDiğer ≥ SAME  VE  fark ≥ 0,1.
 * Kendi merkezi "leave-one-out" ile hesaplanır: bölüm kendi ortalamasını
 * şişirmez. Tek örneklik konuşmacı değerlendirilmez (kanıt yok).
 */
export function embeddingOutliers(points, profiles) {
  const list = Array.isArray(points) ? points : [];
  const byId = new Map();
  for (const p of list) {
    if (!p || !p.speakerId || !Array.isArray(p.vec) || !p.vec.length) continue;
    if (!byId.has(p.speakerId)) byId.set(p.speakerId, []);
    byId.get(p.speakerId).push(p);
  }
  const prof = (Array.isArray(profiles) ? profiles : []).filter((q) => q && q.centroid && q.centroid.length);
  const out = [];
  for (const p of list) {
    if (!p || !p.speakerId || !Array.isArray(p.vec) || !p.vec.length) continue;
    const own = byId.get(p.speakerId) || [];
    if (own.length < 2) continue;
    const ownCentroid = embeddingCentroid(own.filter((q) => q !== p).map((q) => q.vec));
    if (!ownCentroid.length) continue;
    const ownSim = cosineSimilarity(p.vec, ownCentroid);
    let best = null;
    for (const q of prof) {
      if (q.speakerId === p.speakerId || q.count < 2) continue;
      const sim = cosineSimilarity(p.vec, q.centroid);
      if (!best || sim > best.sim) best = { speakerId: q.speakerId, sim };
    }
    if (!best) continue;
    if (!(ownSim < VOICE_EMBED_DIFF && best.sim >= VOICE_EMBED_SAME && best.sim - ownSim >= VOICE_EMBED_MIN_MARGIN)) continue;
    out.push({
      index: p.index,
      speakerId: p.speakerId,
      ownSim: roundSim(ownSim),
      nearestSpeakerId: best.speakerId,
      nearestSim: roundSim(best.sim),
      kind: 'nearest-other'
    });
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Aynı konuşmacıya atanmış ARDIŞIK bölümlerde büyük benzerlik düşüşü. */
export function embeddingChangeSuspects(points) {
  const list = (Array.isArray(points) ? points : [])
    .filter((p) => p && Array.isArray(p.vec) && p.vec.length)
    .slice()
    .sort((a, b) => a.index - b.index);
  const out = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1],
      b = list[i];
    if (!a.speakerId || a.speakerId !== b.speakerId) continue;
    if (b.index !== a.index + 1) continue;
    const sim = cosineSimilarity(a.vec, b.vec);
    if (sim >= VOICE_EMBED_DIFF) continue;
    out.push({ prevIndex: a.index, index: b.index, speakerId: a.speakerId, sim: roundSim(sim) });
  }
  return out;
}

/** Atanmamış bölüm için "hangi konuşmacıya benziyor" ÖNERİSİ (işaret değil). */
export function embeddingSuggestions(points, profiles) {
  const prof = (Array.isArray(profiles) ? profiles : []).filter((p) => p && p.count >= 2 && p.centroid && p.centroid.length);
  const out = [];
  for (const p of Array.isArray(points) ? points : []) {
    if (!p || p.speakerId || !Array.isArray(p.vec) || !p.vec.length) continue;
    let best = null;
    for (const q of prof) {
      const sim = cosineSimilarity(p.vec, q.centroid);
      if (!best || sim > best.sim) best = { speakerId: q.speakerId, sim };
    }
    if (!best || best.sim < VOICE_EMBED_SAME) continue;
    out.push({ index: p.index, speakerId: best.speakerId, sim: roundSim(best.sim) });
  }
  return out.sort((a, b) => a.index - b.index);
}

/**
 * Atanmamış bölümleri gömme benzerliğine göre gruplar (v2.292).
 * Eşik altındaki çiftler ayrı kalır; en az `minSize` bölüm olan gruplar döner.
 * Hiçbir atama yapmaz; yalnız "benzer görünüyor" işaretidir.
 */
export function embeddingClusters(points, { threshold = VOICE_EMBED_SAME, minSize = 2 } = {}) {
  const pts = Array.isArray(points) ? points : [];
  const n = pts.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a),
      rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosineSimilarity(pts[i].vec, pts[j].vec) >= threshold) union(i, j);
    }
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(pts[i]);
  }
  const list = [...groups.values()]
    .filter((g) => g.length >= minSize)
    .map((g) => g.map((p) => Number(p.index)).sort((a, b) => a - b))
    .sort((a, b) => a[0] - b[0]);
  return list.map((indexes, i) => ({
    key: String.fromCharCode(65 + (i % 26)),
    indexes,
    count: indexes.length,
    first: indexes[0],
    last: indexes[indexes.length - 1]
  }));
}

/**
 * Konuşmacı ÖN-ATAMA planı (v2.301). Bölüm gömmelerini benzerliğe göre kümelere
 * ayırır ve her kümeye **ilk görülme sırasına göre** anonim kod (S1, S2…) verir.
 * Her bölüm bir kümeye düşer (minSize=1) → tüm hedef bölümler ön-atama alır.
 * KİMLİK TESPİTİ DEĞİLDİR; yalnız "hangi bölümler aynı sese benziyor" sorusu.
 * Saf; test edilir (`birim`).
 */
export function autoSpeakerPlan(points, { threshold = VOICE_EMBED_SAME, minSize = 1 } = {}) {
  const clusters = embeddingClusters(points, { threshold, minSize });
  return clusters.map((c, i) => ({
    code: 'S' + (i + 1),
    indexes: c.indexes,
    count: c.count,
    first: c.first,
    last: c.last
  }));
}

/**
 * Bir bölüm gömgesini mevcut konuşmacı profilleriyle karşılaştırır (v2.302).
 * `candidates = [{ code, vec }]`; döner `{ code, sim, match }`.
 * match: 'certain' (≥ SAME) · 'uncertain' (DIFF–SAME) · 'none' (< DIFF).
 * KİMLİK TESPİTİ DEĞİLDİR; en yakın konuşmacı **önerisi**dir. Saf; test edilir.
 */
export function bestSpeakerMatch(targetVec, candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  let best = null;
  for (const c of list) {
    if (!c || !Array.isArray(c.vec) || !Array.isArray(targetVec)) continue;
    const sim = cosineSimilarity(targetVec, c.vec);
    if (!best || sim > best.sim) best = { code: String(c.code || ''), sim };
  }
  if (!best) return { code: '', sim: null, match: 'none' };
  const match =
    best.sim >= VOICE_EMBED_SAME ? 'certain' : best.sim >= VOICE_EMBED_DIFF ? 'uncertain' : 'none';
  return { ...best, match };
}

/**
 * KANIT ZAMAN TUTARLILIĞI (v2.308, A1). Gömülü metadata'nın **beyan** ettiği
 * kayıt tarihi, dosyanın **gözlenen** değişiklik zamanından belirgin biçimde
 * SONRA ise çelişki bildirir (bir dosya, kaydedilmeden önce değiştirilmiş olamaz).
 * Yalnız iki değer de tarih olarak çözülebiliyorsa çalışır; aksi hâlde
 * { conflict:false } döner (uydurma yok). Saat dilimi sapmaları için 1 gün tolerans.
 * BEYAN ≠ GÖZLEM; bu bir KANIT değil, DİKKAT işaretidir.
 */
export function evidenceTimeConflict(origin) {
  const o = origin && typeof origin === 'object' ? origin : {};
  const embRaw = o.embedded && o.embedded.recordingAt ? String(o.embedded.recordingAt) : '';
  const ft = o.fileTimes && typeof o.fileTimes === 'object' ? o.fileTimes : {};
  const fileRaw = ft.modifiedAt || ft.createdAt || '';
  const emb = embRaw ? Date.parse(embRaw) : NaN;
  const file = fileRaw ? Date.parse(String(fileRaw)) : NaN;
  if (!Number.isFinite(emb) || !Number.isFinite(file)) return { conflict: false };
  const tolMs = 24 * 60 * 60 * 1000;
  if (emb - file > tolMs) {
    return { conflict: true, embeddedAt: embRaw, fileAt: String(fileRaw), embeddedMs: emb, fileMs: file };
  }
  return { conflict: false };
}

// ---- Konuşmacı kodu çakışması (v2.262) -----------------------------------
// Kod KİMLİK ANAHTARIDIR: iki konuşmacı aynı kodu taşırsa rapor iki kez "S1"
// yazar ve hangi bölümün kime ait olduğu okunamaz. Çakışma VERİ OLARAK
// bildirilir; yüklemede sessizce yeniden numaralanmaz (kod değişikliği
// kullanıcının bilerek verdiği bir karardır — v2.261 "sessiz değişiklik yok").
export function speakerCodeIssues(caseObj) {
  const out = [];
  for (const m of (caseObj && caseObj.materials) || []) {
    const byCode = new Map();
    for (const sp of (m && m.speakers) || []) {
      const code = str(sp && sp.code).trim();
      if (!code) continue; // boş kod çakışma değildir; assignSpeakerCodes doldurur
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push(sp);
    }
    for (const [code, list] of byCode) {
      if (list.length < 2) continue;
      out.push({
        materialId: m.id,
        materialName: m.name || m.fileName || '',
        code,
        speakerIds: list.map((s) => s.id),
        names: list.map((s) => s.name || s.label || '')
      });
    }
  }
  return out;
}
/**
 * Çakışan kodları sıradaki BOŞ koda taşır. İlk konuşmacının kodu KORUNUR
 * (bölümler ve rapor o koda göre okunur); sonrakiler S(n) alır.
 * `materialId` verilirse yalnız o kayıt düzeltilir. Değişenler döner;
 * çağıran taraf günlüğe yazar ve kullanıcıya bildirir.
 */
export function fixSpeakerCodeConflicts(caseObj, materialId) {
  const changed = [];
  const issues = speakerCodeIssues(caseObj).filter((i) => !materialId || i.materialId === materialId);
  for (const issue of issues) {
    const m = ((caseObj && caseObj.materials) || []).find((x) => x && x.id === issue.materialId);
    if (!m) continue;
    const list = m.speakers || [];
    for (let i = 1; i < issue.speakerIds.length; i++) {
      const sp = list.find((x) => x && x.id === issue.speakerIds[i]);
      if (!sp) continue;
      const from = str(sp.code);
      sp.code = '';
      assignSpeakerCodes(list);
      changed.push({
        materialId: m.id,
        materialName: issue.materialName,
        speakerId: sp.id,
        name: sp.name || sp.label || '',
        from,
        to: sp.code
      });
    }
  }
  return changed;
}

export function normalizeSpeaker(src = {}) {
  const s = isObj(src) ? src : {};
  const out = {
    ...s,
    id: s.id || newId('sp'),
    code: str(s.code),
    // `label` şemanın alanı; `name` arayüzün yaygın olarak okuduğu alan.
    // v2.85 öncesinde yalnız `label` yazılıyordu ve `speakerByName()` gibi
    // 15+ yer `name` aradığı için yükleme sonrası konuşmacı bağı KOPUYORDU
    // (raporda S1 kodu kayboluyordu). İkisi tek kaynaktan türetilir.
    label: str(s.label || s.name),
    role: normalizeSpeakerRole(s.role),
    gender: normalizeSpeakerGender(s.gender),
    ageRange: str(s.ageRange),
    notes: str(s.notes),
    // Dosya geneli kişi bağı (v2.205). Boşsa kayda özgü konuşmacı.
    personId: str(s.personId),
    pitchHz: Number.isFinite(Number(s.pitchHz ?? s.pitch)) ? Number(s.pitchHz ?? s.pitch) : null,
    pitchSamples: num(s.pitchSamples),
    measuredAt: s.measuredAt || s.pitchAt || null,
    verifiedAt: str(s.verifiedAt),
    verifiedBy: str(s.verifiedBy)
  };
  // `name` alanı `label` ile AYNI tutulur (tek kaynak). Arayüz `name`,
  // şema `label` okuyor; ayrışırlarsa konuşmacı bağı kopar (v2.85).
  out.name = out.label;
  return out;
}

/**
 * Konuşmacı DOĞRULANDI mı (v2.264). Doğrulanmış kayıt kilidlidir: etiket/rol/
 * cinsiyet/yaş/not alanları arayüzde değiştirilemez ve silinemez.
 * DİKKAT: bu bir BÖLÜM ONAYI değildir; yalnız konuşmacı künyesinin
 * doğruluğudur. Rapor "Kontrol" sütununu etkilemez.
 */
export function isSpeakerVerified(sp) {
  return !!(sp && str(sp.verifiedAt));
}

// Dosya geneli kişi normalleştirmesi (v2.205). Kayıt içi konuşmacıdan farkı:
// perde/ölçüm alanı yoktur; kimlik kayıtlar arasında ortaktır.
export function normalizeCaseSpeaker(src = {}) {
  const s = isObj(src) ? src : {};
  const out = {
    ...s,
    id: s.id || newId('ps'),
    code: str(s.code),
    label: str(s.label || s.name),
    role: normalizeSpeakerRole(s.role),
    gender: normalizeSpeakerGender(s.gender),
    ageRange: str(s.ageRange),
    notes: str(s.notes)
  };
  out.name = out.label;
  return out;
}

/**
 * Bölümün konuşmacı referansını konuşmacı listesiyle UZLAŞTIRIR.
 *
 * Kural: `speakerId` KİMLİKTİR, ad yalnız görünür addır. Bayat bir kimlik
 * (ad değişmiş, kimlik eskisinde kalmış) `speakerSegments`in ad VEYA kimlik
 * eşleştirmesi yüzünden aynı bölümü İKİ konuşmacıda gösterebiliyordu —
 * raporda çift sayım. Burada:
 *  - kimlik boşsa ad ile doldurulur (v2 eski kayıt göçü dâhil),
 *  - kimlik tanınmıyorsa ad ile çözülür, çözülemezse boşaltılır,
 *  - kimliğin adı ile bölümdeki ad çelişirse ve ad listede VARSA ad kazanır
 *    (uzmanın açık seçimi), yoksa ad kimlikten yazılır (tek kaynak).
 */
export function reconcileSpeakerRefs(speakers, segments) {
  const list = Array.isArray(speakers) ? speakers.filter(isObj) : [];
  const byLabel = new Map();
  const byId = new Map();
  for (const sp of list) {
    if (sp.id) byId.set(sp.id, sp);
    const label = str(sp.label || sp.name);
    if (label && !byLabel.has(label)) byLabel.set(label, sp.id);
  }
  const segs = Array.isArray(segments) ? segments : [];
  for (const s of segs) {
    if (!isObj(s)) continue;
    const legacy = str(s._legacySpeaker);
    delete s._legacySpeaker;
    if (!str(s.speaker) && legacy) s.speaker = legacy;
    const label = str(s.speaker);
    if (!s.speakerId) {
      s.speakerId = (label && byLabel.get(label)) || '';
      continue;
    }
    const rec = byId.get(s.speakerId);
    if (!rec) {
      s.speakerId = (label && byLabel.get(label)) || '';
      continue;
    }
    const recName = str(rec.label || rec.name);
    if (label && recName && label !== recName) {
      const id = byLabel.get(label);
      if (id) s.speakerId = id;
      else s.speaker = recName;
    } else if (!label && recName) {
      s.speaker = recName;
    }
  }
  return segs;
}

export function normalizeMaterial(src = {}) {
  const m = isObj(src) ? src : {};
  const tech = isObj(m.tech) ? m.tech : {};
  const origin = isObj(m.origin) ? m.origin : {};
  const speakers = assignSpeakerCodes((Array.isArray(m.speakers) ? m.speakers : []).map(normalizeSpeaker));
  const segments = reconcileSpeakerRefs(
    speakers,
    (Array.isArray(m.segments) ? m.segments : []).map(normalizeSegment)
  );
  return {
    ...m,
    id: m.id || newId('mt'),
    fileName: str(m.fileName || m.name),
    mimeType: str(m.mimeType || m.type),
    sizeBytes: num(m.sizeBytes ?? m.size),
    durationSec: num(m.durationSec ?? m.duration),
    sha256: str(m.sha256),
    tech: {
      codec: str(tech.codec),
      channels: num(tech.channels),
      sampleRate: num(tech.sampleRate),
      bitDepth: num(tech.bitDepth)
    },
    addedAt: str(m.addedAt),
    synthetic: !!m.synthetic,
    // Geçici durumlar kayda/dışa aktarıma GİRMEZ. 'transcribing' bir işlem
    // durumudur; dosyaya yazılırsa başka bilgisayarda açılınca sonsuza kadar
    // "çözümleme sürüyor %70" görünür ve iptal edilemez (dinleyen döngü yok).
    // v2.70: transcribing -> pending/partial olarak normalize edilir.
    status: pick(m.status, MATERIAL_STATUS, 'pending') === 'transcribing'
      ? (Array.isArray(m.segments) && m.segments.length ? 'partial' : 'pending')
      : pick(m.status, MATERIAL_STATUS, 'pending'),
    statusNote: str(m.statusNote),
    transcribedWithModel: str(m.transcribedWithModel),
    transcribedAt: str(m.transcribedAt),
    segments,
    speakers,
    referenceSegments: Array.isArray(m.referenceSegments) ? m.referenceSegments.filter(isObj) : [],
    expectedText: str(m.expectedText),
    levels: isObj(m.levels) ? m.levels : null,
    voiceCheck: isObj(m.voiceCheck) ? m.voiceCheck : null,
    voiceEmbed: isObj(m.voiceEmbed) ? m.voiceEmbed : null,
    spectrogramReviewedAt: m.spectrogramReviewedAt || null,
    origin: {
      mediumType: pick(normalizeMediumType(origin.mediumType), MEDIUM_TYPE, 'unspecified'),
      mediumLabel: str(origin.mediumLabel),
      deliveredBy: str(origin.deliveredBy),
      // v2.212: beyaz liste; buraya yazılmayan alan ilk kaydetmede silinir.
      deliveredByRegistry: str(origin.deliveredByRegistry),
      deliveredAt: str(origin.deliveredAt),
      deliveryPlace: str(origin.deliveryPlace),
      // Göç (v2.213): eski tek `deviceInfo` alanı GERÇEK cihaz metniyse yeni
      // `recordingDevice` alanına taşınır. v2.208–v2.212'de buraya edinme
      // yöntemi yazılıyordu; o metin cihaz sanılmaz (görüntülenmez).
      recordingDevice:
        str(origin.recordingDevice) ||
        (str(origin.deviceInfo) && !/Mantıksal|write-blocker|PowerShell|Edinim|edinme\.ps1/i.test(str(origin.deviceInfo))
          ? str(origin.deviceInfo)
          : ''),
      recordingAt: str(origin.recordingAt),
      fileTimes: {
        createdAt: str(isObj(origin.fileTimes) ? origin.fileTimes.createdAt : ''),
        modifiedAt: str(isObj(origin.fileTimes) ? origin.fileTimes.modifiedAt : ''),
        accessedAt: str(isObj(origin.fileTimes) ? origin.fileTimes.accessedAt : '')
      },
      embedded: {
        source: str(isObj(origin.embedded) ? origin.embedded.source : ''),
        recordingAt: str(isObj(origin.embedded) ? origin.embedded.recordingAt : ''),
        encodingAt: str(isObj(origin.embedded) ? origin.embedded.encodingAt : ''),
        releaseAt: str(isObj(origin.embedded) ? origin.embedded.releaseAt : ''),
        software: str(isObj(origin.embedded) ? origin.embedded.software : ''),
        readAt: str(isObj(origin.embedded) ? origin.embedded.readAt : '')
      },
      deviceInfo: str(origin.deviceInfo),
      // Edinme tutanağı bilinmeyen alanlarıyla birlikte korunur; v2.208.
      acquisition: isObj(origin.acquisition) ? { ...origin.acquisition } : null
    },
    lastVerify: isObj(m.lastVerify) ? m.lastVerify : null,
    log: Array.isArray(m.log) ? m.log.filter(isObj) : []
  };
}

export function normalizeQuestion(src = {}) {
  const q = isObj(src) ? src : {};
  const evidence = Array.isArray(q.evidence)
    ? q.evidence.filter(isObj).map((e) => ({
        materialId: str(e.materialId),
        segmentId: str(e.segmentId),
        note: str(e.note)
      }))
    : [];
  return {
    ...q,
    id: q.id || newId('q'),
    no: str(q.no),
    question: str(q.question),
    answer: str(q.answer),
    answerRev: Math.max(0, Math.floor(Number(q.answerRev) || 0)),
    evidence,
    // v2: `basis` serbest metindi → basisNote'a taşınır, kaybolmaz.
    basisNote: str(q.basisNote || q.basis),
    answeredBy: str(q.answeredBy)
  };
}

/**
 * Bir sorunun yapılandırılmış dayanaklarını (question.evidence) çözümler (v2.300).
 * Her bağ `{ materialId, segmentId }` → `{ material, range, text, note }`.
 * Segment/kayıt BULUNAMAZSA atlanır (uydurma dayanak yazılmaz). Saf; test edilir.
 */
export function questionEvidenceRows(c, q) {
  const materials = Array.isArray(c && c.materials) ? c.materials : [];
  const links = Array.isArray(q && q.evidence) ? q.evidence : [];
  const out = [];
  for (const e of links) {
    if (!e) continue;
    const m = materials.find((x) => x && x.id === e.materialId);
    const s = m && (Array.isArray(m.segments) ? m.segments : []).find((x) => x && x.id === e.segmentId);
    if (!m || !s) continue;
    out.push({
      materialId: m.id,
      segmentId: s.id,
      material: str(m.name),
      range: s.start && s.end ? `${s.start} – ${s.end}` : str(s.start || s.end),
      text: str(s.text),
      note: str(e.note)
    });
  }
  return out;
}

// ---- ÇALIŞMA NOTLARI (v2.356) -------------------------------------------
// KURAL: not bir BULGU DEĞİLDİR. Rapora, rapor eklerine ve belge paketine
// kendiliğinden girmez; bilirkişinin dosyayı incelerken tuttuğu kişisel
// çalışma defteridir (tarih, kişi, iddia, büyük resim).
export const NOTEBOOK_TEXT_MAX = 4000;
export const NOTEBOOK_MAX = 500;

export function emptyNotebookEntry(over = {}) {
  return {
    id: newId('nt'),
    at: new Date().toISOString(),
    updatedAt: '',
    by: '',
    text: '',
    pinned: false,
    // BAĞLAM (v2.358): not belirli bir bölüme/zamana bağlanabilir. Kimlikle
    // bağlanır (materialId + segmentId); sıra değişse de kopmaz. `timecode`
    // yalnız bölüm silinirse gösterim için saklanan anlık kopyadır.
    materialId: '',
    segmentId: '',
    timecode: '',
    ...(isObj(over) ? over : {})
  };
}

export function normalizeNotebookEntry(src) {
  const e = isObj(src) ? src : {};
  const text = str(e.text).trim().slice(0, NOTEBOOK_TEXT_MAX);
  if (!text) return null;
  return {
    ...e,
    id: e.id || newId('nt'),
    at: str(e.at) || new Date().toISOString(),
    updatedAt: str(e.updatedAt),
    by: str(e.by),
    text,
    pinned: e.pinned === true,
    // Bağlam alanları (v2.358): bilinmeyen değer korunur; boşsa '' olur.
    materialId: str(e.materialId),
    segmentId: str(e.segmentId),
    timecode: str(e.timecode)
  };
}

export function normalizeNotebook(list) {
  const arr = Array.isArray(list) ? list : [];
  const out = [];
  for (const x of arr) {
    const e = normalizeNotebookEntry(x);
    if (e) out.push(e);
    if (out.length >= NOTEBOOK_MAX) break;
  }
  return out;
}

/**
 * TEK KAYNAK: birleştirme ve önizleme AYNI planı kullanır (v2.156 dersi).
 * Notlar id ile eşleşir; aynı id + farklı metin SESSİZCE ezilmez.
 */
export function notebookMergePlan(mine, theirs) {
  const a = normalizeNotebook(mine);
  const b = normalizeNotebook(theirs);
  const byId = new Map(a.map((e) => [e.id, e]));
  const added = [];
  const conflicts = [];
  for (const te of b) {
    const me = byId.get(te.id);
    if (!me) {
      added.push(te);
      continue;
    }
    if (
      String(me.text) !== String(te.text) ||
      !!me.pinned !== !!te.pinned ||
      String(me.materialId || '') !== String(te.materialId || '') ||
      String(me.segmentId || '') !== String(te.segmentId || '')
    ) {
      conflicts.push({ kind: 'notebook', id: te.id, mine: me, theirs: te });
    }
  }
  const merged = [...a, ...added].sort((x, y) => String(x.at).localeCompare(String(y.at)));
  return { merged, added, conflicts };
}

/**
 * Bir bölüme bağlı notlar (v2.358). Segment listesindeki rozet ve "bu bölümün
 * notları" sayacı AYNI kaynağı kullanır (v2.99 dersi: sayaç ≠ filtre olmaz).
 */
export function notebooksForSegment(notebook, materialId, segmentId) {
  const mid = String(materialId || '');
  const sid = String(segmentId || '');
  if (!sid) return [];
  return normalizeNotebook(notebook).filter(
    (e) => String(e.segmentId || '') === sid && (!e.materialId || String(e.materialId) === mid)
  );
}

/** Paket dışa aktarımında "notları pakete koyma" seçeneği (v2.356). */
export function caseWithoutNotebook(c) {
  if (!isObj(c)) return c;
  return { ...c, notebook: [] };
}

export function normalizeCase(src = {}) {
  const c = isObj(src) ? src : {};
  const parties = isObj(c.parties) ? c.parties : {};
  const assignment = isObj(c.assignment) ? c.assignment : {};
  const expert = isObj(c.expert) ? c.expert : {};
  // v2.336: düz alan ile iç içe alan AYNI değeri taşımalı; aksi hâlde
  // defineCaseMirrors eski düz değeri geri yazar ve göç kaybolur.
  const expertFieldNorm = normalizeExpertField(expert.field || c.expertField);
  const report = isObj(c.report) ? c.report : {};
  // v2.287: serbest bloklar ve sıra birlikte normalize edilir; yetim
  // `free:` anahtarı düşer, sırası olmayan blok `s6` öncesine girer.
  const reportBlocks = normalizeReportBlocks(report.blocks);
  const reportLayout = normalizeReportLayout(report.layout);
  reportLayout.order = ensureFreeBlockOrder(reportLayout.order, reportBlocks);
  const sectionsSrc = { ...(report.sections && typeof report.sections === 'object' ? report.sections : {}) };
  // v2.388 — HİÇ GÖSTERME kilidi: kilitli bölüm her koşulda KAPALI kalır.
  const reportExcluded = normalizeReportExcluded(report.excluded);
  for (const k of Object.keys(reportExcluded)) sectionsSrc[k] = false;
  // Yalnız ESKİ varsayılanı (s7 açık) taşı. s7=false yeni "Ek listesi"
  // tercihidir; annex'i kapatmamalıdır (v2.290'da ölçüldü).
  if (sectionsSrc.annex === undefined && sectionsSrc.s7 === true) {
    sectionsSrc.annex = true;
    sectionsSrc.s7 = false;
  }
  // v2.387 — BELGE EKİNE TAŞINMIŞ BÖLÜM RAPORDA AÇIK KALAMAZ (tek kopya).
  const letterAnnexes = normalizeLetterAnnexes(c.letterAnnexes);
  for (const k of letterMovedSectionKeys(letterAnnexes)) sectionsSrc[k] = false;
  const team = (Array.isArray(c.team) ? c.team : []).map((t) => ({
    ...emptyTeamMember(),
    ...(isObj(t) ? t : {}),
    id: (isObj(t) && t.id) || newId('tm'),
    role: pick(isObj(t) ? t.role : null, TEAM_ROLE, 'expert')
  }));
  // DOSYA GENELİ KİŞİLER (v2.205): eski kayıtta yoktur; boş dizi olur.
  const speakers = assignCaseSpeakerCodes(
    (Array.isArray(c.speakers) ? c.speakers : []).map(normalizeCaseSpeaker)
  );
  return {
    ...c,
    schemaVersion: SCHEMA_VERSION,
    schemaName: SCHEMA_NAME,
    id: c.id || newId('case'),
    createdAt: str(c.createdAt),
    updatedAt: str(c.updatedAt),
    status: pick(c.status, CASE_STATUS, 'draft'),
    reportType: pick(c.reportType, REPORT_TYPE, 'hukuk'),
    court: str(c.court),
    fileNo: str(c.fileNo),
    subject: str(c.subject),
    examinationSubject: str(c.examinationSubject),
    caseDate: str(c.caseDate),
    inspectionDate: str(c.inspectionDate),
    // v2 düz alanları → iç içe (kaybolmadan).
    parties: {
      plaintiff: str(parties.plaintiff || c.plaintiff),
      plaintiffCounsel: str(parties.plaintiffCounsel || c.plaintiffCounsel),
      defendant: str(parties.defendant || c.defendant),
      defendantCounsel: str(parties.defendantCounsel || c.defendantCounsel)
    },
    assignment: {
      date: str(assignment.date || c.assignmentDate),
      dueDate: str(assignment.dueDate || c.dueDate),
      durationDays: str(assignment.durationDays || c.assignmentDurationDays),
      dueDateManual: assignment.dueDateManual === true,
      scope: str(assignment.scope || c.assignmentScope),
      body: str(assignment.body)
    },
    expert: {
      name: str(expert.name || c.expertName),
      registryNo: str(expert.registryNo || c.registryNo),
      // UZMANLIK ALANI (v2.336): boş, yalnız kod ("56.12") veya eski varsayılan
      // metin ise TAM varsayılana çekilir. Kullanıcının yazdığı özel metin korunur.
      field: expertFieldNorm
    },
    expertField: expertFieldNorm,
    team,
    speakers,
    notebook: normalizeNotebook(c.notebook),
    // Disk envanteri: bilinmeyen alanlar korunur; kimlik yoksa verilir.
    disks: (Array.isArray(c.disks) ? c.disks : []).filter(isObj).map((d) => ({ ...d, id: d.id || newId('dk') })),
    report: {
      date: str(report.date || c.reportDate),
      includeEmbedded: !!report.includeEmbedded,
      speakerMethod: !!report.speakerMethod,
      methodText: str(report.methodText ?? c.methodText),
      // Boş iç içe alan düz alandan (eski/göç) doldurulur: `??` boş dizeyi
      // geçirmediği için `||` kullanılır.
      summaryIntroText: str(report.summaryIntroText || c.summaryIntroText),
      limitationsText: str(report.limitationsText ?? c.limitationsText),
      conclusionText: str(report.conclusionText ?? c.conclusionText),
      // Bölüm görünürlüğü (v2.219): eksik anahtar varsayılanla tamamlanır.
      // v2.290: eski kayıtta EKLER listesi (s7) açıksa asıl EKLER bölümüne
      // (annex) taşınır; boş "EKLER" listesi varsayılan olarak kapanır.
      sections: normalizeReportSections(sectionsSrc),
      // HİÇ GÖSTERME (v2.388): profil/birleştirme açamaz; normalize da kapatır.
      excluded: reportExcluded,
      // Rapor iskeleti (v2.227): sıra/ekler; bozuk düzen güvenli hâle getirilir.
      layout: reportLayout,
      // Serbest bloklar (v2.287): kullanıcı başlığı + metni.
      blocks: reportBlocks,
      // Kullanıcı profilleri (v2.288): yalnız kullanıcı tanımlı düzenler.
      userProfiles: normalizeReportProfiles(report.userProfiles),
      annexPlacement: normalizeAnnexPlacement(report.annexPlacement),
      labels: normalizeReportLabels(report.labels),
      // Tablo sütun görünürlüğü (v2.235): eksik alan açık varsayılır.
      columns: normalizeReportColumns(report.columns),
      // Ön bölüm alan görünürlüğü (v2.336): eksik alan açık varsayılır.
      fields: normalizeReportFieldVisibility(report.fields),
      // Numaralandırma (v2.285): bilinmeyen/boş değer 'auto' olur.
      numbering: REPORT_NUMBERING.includes(report.numbering) ? report.numbering : 'auto',
      // Başlık düzenlemeleri: yalnız bilinen bölüm anahtarları, boş atılır.
      titles: normalizeReportTitles(report.titles),
      // Sayfalı önizleme (v2.221): varsayılan kapalı.
      pageView: !!report.pageView,
      // Teknik ortam (v2.222): eksik alan boş metin; bilinmeyen korunur.
      tech: normalizeReportTech(report.tech),
      // Rapor biçimi (v2.238): eksik/bozuk güvenli varsayılana çekilir.
      format: normalizeReportFormat(report.format),
      // Künye ek alanları (v2.225): boş metin varsayılan.
      impartiality: str(report.impartiality),
      annexList: str(report.annexList),
      // Kalite kontrolü / ikinci göz (v2.226): boş metin varsayılan.
      qcBy: str(report.qcBy),
      qcScope: str(report.qcScope),
      qcDate: str(report.qcDate),
      // Rapor revizyonları (v2.227): en çok 10; bozuk girdi atılır.
      revisions: (Array.isArray(report.revisions) ? report.revisions : [])
        .filter(isObj)
        .slice(-10)
    },
    // ÜST YAZI (v2.323): eksik/bozuk alan güvenli varsayılana çekilir.
    letter: normalizeLetter(c.letter),
    letterAnnexes,
    // FİZİKÎ DOSYA (v2.330): eski kayıtta yoktur; boş kayıt olur (veri kaybı yok).
    physicalFile: normalizePhysicalFile(c.physicalFile),
    questions: (Array.isArray(c.questions) ? c.questions : []).map(normalizeQuestion),
    materials: (Array.isArray(c.materials) ? c.materials : []).map(normalizeMaterial),
    shared: !!c.shared,
    lastEditedBy: str(c.lastEditedBy),
    mergeLog: Array.isArray(c.mergeLog) ? c.mergeLog.filter(isObj) : []
  };
}

// ---- 7. Doğrulama ---------------------------------------------------------
// Katı değil, yol gösterici: eksik/yanlış alanı raporlar ama veriyi atmaz.
// Dönüş: { ok, errors[], warnings[] }. `ok=false` yalnız yapısal çöküşte.

export function validateSegment(s) {
  const errors = [];
  const warnings = [];
  if (!isObj(s)) return { ok: false, errors: ['segment: nesne değil'], warnings };
  if (!s.id) errors.push('segment.id eksik');
  if (!REVIEW_STATE.includes(s.review)) errors.push(`segment.review geçersiz: ${s.review}`);
  if (!isObj(s.obs)) errors.push('segment.obs eksik');
  const t = (v) => {
    if (!v) return null;
    const m = String(v).match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
    if (!m) return NaN;
    return +m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +`0.${m[4]}` : 0);
  };
  const a = t(s.start),
    b = t(s.end);
  if (a === null) warnings.push(`segment ${s.id}: başlangıç boş`);
  else if (Number.isNaN(a)) errors.push(`segment ${s.id}: başlangıç biçimi geçersiz (${s.start})`);
  if (b === null) warnings.push(`segment ${s.id}: bitiş boş`);
  else if (Number.isNaN(b)) errors.push(`segment ${s.id}: bitiş biçimi geçersiz (${s.end})`);
  if (a !== null && b !== null && !Number.isNaN(a) && !Number.isNaN(b) && b < a)
    errors.push(`segment ${s.id}: bitiş başlangıçtan önce (${s.start} > ${s.end})`);
  if (!s.text && s.review === 'approved')
    warnings.push(`segment ${s.id}: onaylandı ama metin boş`);
  return { ok: errors.length === 0, errors, warnings };
}

export function validateMaterial(m) {
  const errors = [];
  const warnings = [];
  if (!isObj(m)) return { ok: false, errors: ['material: nesne değil'], warnings };
  if (!m.id) errors.push('material.id eksik');
  if (!MATERIAL_STATUS.includes(m.status)) errors.push(`material.status geçersiz: ${m.status}`);
  if (!m.fileName) warnings.push(`material ${m.id}: dosya adı boş`);
  if (!m.sha256) warnings.push(`material ${m.id}: SHA-256 hesaplanmamış`);
  if (!MEDIUM_TYPE.includes(m.origin?.mediumType))
    errors.push(`material ${m.id}: origin.mediumType geçersiz`);
  const ids = new Set();
  for (const s of m.segments || []) {
    const r = validateSegment(s);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (ids.has(s.id)) errors.push(`material ${m.id}: yinelenen segment id ${s.id}`);
    ids.add(s.id);
  }
  const spkIds = new Set((m.speakers || []).map((s) => s.id));
  for (const s of m.segments || []) {
    if (s.speakerId && !spkIds.has(s.speakerId))
      errors.push(`segment ${s.id}: tanımsız konuşmacı ${s.speakerId}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validateCase(c) {
  const errors = [];
  const warnings = [];
  if (!isObj(c)) return { ok: false, errors: ['case: nesne değil'], warnings };
  if (c.schemaVersion !== SCHEMA_VERSION)
    errors.push(`schemaVersion ${c.schemaVersion} ≠ ${SCHEMA_VERSION}`);
  if (!c.id) errors.push('case.id eksik');
  if (!CASE_STATUS.includes(c.status)) errors.push(`case.status geçersiz: ${c.status}`);
  if (!REPORT_TYPE.includes(c.reportType)) errors.push(`case.reportType geçersiz: ${c.reportType}`);

  const matIds = new Set();
  for (const m of c.materials || []) {
    const r = validateMaterial(m);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (matIds.has(m.id)) errors.push(`yinelenen material id ${m.id}`);
    matIds.add(m.id);
  }

  const teamIds = new Set((c.team || []).map((t) => t.id));
  if (c.lastEditedBy && !teamIds.has(c.lastEditedBy))
    warnings.push(`lastEditedBy tanımsız ekip üyesi: ${c.lastEditedBy}`);

  const segIds = new Set();
  for (const m of c.materials || []) for (const s of m.segments || []) segIds.add(s.id);

  const qIds = new Set();
  for (const q of c.questions || []) {
    if (!q.id) errors.push('question.id eksik');
    if (qIds.has(q.id)) errors.push(`yinelenen question id ${q.id}`);
    qIds.add(q.id);
    for (const e of q.evidence || []) {
      if (e.materialId && !matIds.has(e.materialId))
        errors.push(`question ${q.id}: tanımsız materialId ${e.materialId}`);
      if (e.segmentId && !segIds.has(e.segmentId))
        errors.push(`question ${q.id}: tanımsız segmentId ${e.segmentId}`);
      if (e.segmentId && !e.materialId)
        warnings.push(`question ${q.id}: segmentId var ama materialId yok`);
    }
    if (q.answeredBy && !teamIds.has(q.answeredBy))
      warnings.push(`question ${q.id}: tanımsız answeredBy ${q.answeredBy}`);
  }

  if (!c.court) warnings.push('mahkeme adı boş');
  if (!c.fileNo) warnings.push('dosya numarası boş');
  if (!c.expert?.name) warnings.push('bilirkişi adı boş');
  if (!(c.materials || []).length) warnings.push('ses kaydı yok');

  return { ok: errors.length === 0, errors, warnings };
}

// ---- 8. Delil günlüğü: karma zinciri --------------------------------------
// Her girdi önceki girdinin hash'ini taşır. Böylece "şu satır sonradan
// değiştirilmiş" iddiası ölçülebilir olur. Kriptografik olarak zayıf (FNV-1a
// tabanlı) bir özettir: amaç kurcalama tespiti, imza değil. Gerçek SHA-256
// zaten dosya bütünlüğü için kullanılıyor; burada tarayıcıda senkron çalışan
// hafif bir zincir yeter.

export function chainHash(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Günlük girdisi üretir; önceki girdinin hash'ini zincire bağlar. */
export function logEntry(log, { at, actor, event, detail }) {
  const prev = Array.isArray(log) && log.length ? log[log.length - 1].hash || '' : '';
  const base = { at: at || '', actor: actor || '', event: event || '', detail: detail || '', prevHash: prev };
  const hash = chainHash(`${base.at}|${base.actor}|${base.event}|${base.detail}|${base.prevHash}`);
  return { ...base, hash };
}

/** Zinciri doğrular: kırık halka varsa indeksini döndürür. */
export function verifyLogChain(log) {
  if (!Array.isArray(log)) return { ok: false, brokenAt: -1, reason: 'günlük yok' };
  let prev = '';
  for (let i = 0; i < log.length; i++) {
    const e = log[i] || {};
    if ((e.prevHash || '') !== prev) return { ok: false, brokenAt: i, reason: 'prevHash uyuşmuyor' };
    const expect = chainHash(`${e.at}|${e.actor}|${e.event}|${e.detail}|${e.prevHash}`);
    if ((e.hash || '') !== expect) return { ok: false, brokenAt: i, reason: 'hash uyuşmuyor' };
    prev = e.hash;
  }
  return { ok: true, brokenAt: -1, reason: '' };
}

/**
 * Günlüğün durumunu üç hâlde bildirir. Eski kayıtlarda günlük `logEntry()`
 * olmadan yazılmıştı (hash yok). Bunları "kurcalanmış" diye suçlamak yanlış
 * olur; ama "doğrulandı" demek de yanlış olur. Üçüncü hâl bu boşluğu kapatır.
 * @returns {{state:'verified'|'legacy'|'broken'|'empty', brokenAt:number, reason:string, legacyCount:number}}
 */
export function logChainState(log) {
  if (!Array.isArray(log) || !log.length)
    return { state: 'empty', brokenAt: -1, reason: 'günlük boş', legacyCount: 0 };
  const legacyCount = log.filter((e) => !(e && e.hash)).length;
  if (legacyCount) {
    // Hash'siz girdi varsa zincir kurulamaz. Bu eski kayıttır; kurcalama
    // iddiası değildir. Karışık durum (bir kısmı hash'li) da "legacy" sayılır.
    return {
      state: 'legacy',
      brokenAt: -1,
      reason: `${legacyCount} girdi hash taşımıyor (bu sürümden önce yazılmış)`,
      legacyCount
    };
  }
  const v = verifyLogChain(log);
  return v.ok
    ? { state: 'verified', brokenAt: -1, reason: '', legacyCount: 0 }
    : { state: 'broken', brokenAt: v.brokenAt, reason: v.reason, legacyCount: 0 };
}

/**
 * Eski günlüğü zincire bağlar. Girdiler DEĞİŞTİRİLMEZ; yalnız prevHash/hash
 * eklenir. Böylece eski kayıt "legacy" kalmaz, doğrulanabilir olur. Girdi
 * metni aynen korunduğu için içerik iddiası bozulmaz; yalnız "bu andan sonra
 * kurcalanmadı" garantisi başlar.
 */
export function upgradeLogChain(log) {
  if (!Array.isArray(log)) return { log: [], upgraded: 0 };
  const out = [];
  let upgraded = 0;
  for (const e of log) {
    if (!isObj(e)) continue;
    if (e.hash && e.prevHash !== undefined) {
      out.push(e);
      continue;
    }
    const prev = out.length ? out[out.length - 1].hash || '' : '';
    const base = {
      at: str(e.at),
      actor: str(e.actor),
      event: str(e.event),
      detail: str(e.detail),
      prevHash: prev
    };
    out.push({
      ...base,
      hash: chainHash(`${base.at}|${base.actor}|${base.event}|${base.detail}|${base.prevHash}`)
    });
    upgraded++;
  }
  return { log: out, upgraded };
}

// ---- 9. Birleştirme (ortak çalışma) --------------------------------------
// İki dosya kopyası birleştirilirken hangi tarafın kazandığı ve neyin
// çakıştığı açıkça raporlanır. Sessizce üzerine yazmak YOK.

/** Bölüm metin geçmişine bir sürüm ekler (kaybolan metin burada saklanır). */
function pushSegHistory(s, text, actor, at) {
  if (!text) return;
  if (!Array.isArray(s.history)) s.history = [];
  s.history.push({ text, at: at || new Date().toISOString(), actor: actor || '' });
}

/** Üst düzey metin alanı: boşsa doldur, ikisi de doluysa çakışma bildir. */
function mergeTextField(merged, mine, theirs, newer, key, applied, conflicts, label) {
  const mv = mine[key] || '';
  const tv = theirs[key] || '';
  if (!tv || tv === mv) return;
  if (!mv) {
    merged[key] = tv;
    applied.push(`${label}: boş alan dolduruldu`);
  } else if (newer) {
    merged[key] = tv;
    applied.push(`${label}: gelen sürüm alındı (daha yeni)`);
  } else {
    conflicts.push({ kind: 'case-field', field: key, mine: mv, theirs: tv });
  }
}

// Şema VARSAYILANLARI da "boş" sayılır: yeni bir kayıtta mediumType
// 'unspecified', tech.channels 0'dır. Bunlar bilgi taşımaz; gelen dosyada
// gerçek değer varsa doldurulmalıdır (aksi hâlde alan hiç gelmez).
// TEK KAYNAK: birleştirme ve önizleme aynı kuralı kullanır.
function isBlankValue(v) {
  return (
    v == null ||
    v === '' ||
    v === 'unspecified' ||
    v === 0 ||
    (Array.isArray(v) && !v.length) ||
    (isObj(v) && !Object.keys(v).length)
  );
}

/**
 * `origin` değerleri metin veya NESNE olabilir (`acquisition` tutanağı).
 * Nesneyi referansla karşılaştırmak, içerik aynı olsa bile "farklı" der:
 * önizleme "alınacak alan", birleştirme "çakışma" üretir ve ekranda
 * "[object Object]" görünür (v2.212'de ölçüldü). Karşılaştırma JSON ile,
 * gösterim okunur metinle yapılır.
 */
function sameOriginValue(a, b) {
  if (a === b) return true;
  if (isObj(a) && isObj(b)) return JSON.stringify(a) === JSON.stringify(b);
  return false;
}
/** Nesne değerini çakışma ekranında okunur tek satıra çevirir. */
function originValueText(v) {
  if (v == null || v === '') return '';
  if (!isObj(v)) return String(v);
  const d = v.device || {};
  const op = v.operator || {};
  const parts = [];
  if (d.model) parts.push(String(d.model));
  if (d.serial) parts.push(`seri ${d.serial}`);
  if (op.name) parts.push(`operatör ${op.name}`);
  if (v.acquiredAt) parts.push(String(v.acquiredAt).slice(0, 10));
  return parts.length ? parts.join(' · ') : JSON.stringify(v).slice(0, 120);
}

/**
 * İki kayıt kopyası arasındaki KAYIT DÜZEYİ farkları listeler — v2.94.
 * Önizleme (`compareCases`) ve birleştirme (`mergeMaterialFields`) aynı
 * kümeyi görmelidir; ayrışırlarsa kullanıcı yanlış bilgiyle karar verir.
 * Dönüş: [{field, mine, theirs}] — yalnız gerçekten doldurulacak/çakışanlar.
 */
function diffMaterialFields(mm, tm) {
  const out = [];
  const consider = (field, mv, tv) => {
    if (isBlankValue(tv) || tv === mv) return;
    out.push({ field, mine: isBlankValue(mv) ? '' : mv, theirs: tv });
  };
  for (const key of ['expectedText', 'sha256', 'statusNote', 'transcribedWithModel', 'transcribedAt']) {
    consider(key, mm[key], tm[key]);
  }
  if (isObj(tm.tech)) for (const k of Object.keys(tm.tech)) consider(`tech.${k}`, mm.tech && mm.tech[k], tm.tech[k]);
  if (isObj(tm.origin))
    for (const k of Object.keys(tm.origin)) {
      const mv = mm.origin && mm.origin[k];
      const tv = tm.origin[k];
      if (isBlankValue(tv) || sameOriginValue(mv, tv)) continue;
      out.push({
        field: `origin.${k}`,
        mine: isBlankValue(mv) ? '' : originValueText(mv),
        theirs: originValueText(tv)
      });
    }
  if (isObj(tm.levels) && !isObj(mm.levels)) consider('levels', null, tm.levels);
  if (isObj(tm.levels) && isObj(mm.levels) && JSON.stringify(mm.levels) !== JSON.stringify(tm.levels)) {
    out.push({ field: 'levels', mine: `tepe ${mm.levels.peakDb}`, theirs: `tepe ${tm.levels.peakDb}` });
  }
  if (isObj(tm.spectrogramReviewed) && !isObj(mm.spectrogramReviewed)) consider('spectrogramReviewed', null, tm.spectrogramReviewed);
  // Konuşmacı: yalnız YENİ id'ler fark sayılır (mevcutlar çoğalmaz).
  if (Array.isArray(tm.speakers) && tm.speakers.length) {
    const mineIds = new Set((mm.speakers || []).map((s) => s.id));
    const fresh = tm.speakers.filter((s) => !mineIds.has(s.id));
    if (fresh.length) out.push({ field: 'speakers', mine: `${(mm.speakers || []).length} kişi`, theirs: `+${fresh.length} kişi` });
  }
  // Delil günlüğü: yalnız yeni hash'ler.
  if (Array.isArray(tm.log) && tm.log.length) {
    const have = new Set((mm.log || []).map((e) => e.hash).filter(Boolean));
    const fresh = tm.log.filter((e) => !e.hash || !have.has(e.hash));
    if (fresh.length) out.push({ field: 'log', mine: `${(mm.log || []).length} girdi`, theirs: `+${fresh.length} girdi` });
  }
  return out;
}

/**
 * Kayıt (material) düzeyinde birleştirme — v2.94.
 *
 * NEDEN: `mergeCases` yalnız bölüm ve birkaç durum alanını işliyordu. Aynı
 * kayıt iki dosyada bulunduğunda `speakers`, `levels`, `origin`,
 * `spectrogramReviewed`, `expectedText`, `sha256`, `tech` ve `log` alanları
 * gelen dosyada DOLU olsa bile hiç aktarılmıyor, üstelik çakışma da
 * bildirilmiyordu — sessiz veri kaybı (ölçüm: 8 alan kayboluyor, 0 çakışma).
 *
 * KURAL
 *  - Yerel alan boşsa gelen değer alınır (veri kaybı yok).
 *  - İki taraf da dolu ve aynıysa dokunulmaz.
 *  - İki taraf da dolu ve FARKLIysa sessiz seçim YAPILMAZ; yerel korunur ve
 *    `material-field` çakışması bildirilir. Bu, `sha256`/`tech` gibi değişmez
 *    dosya gerçekleri için de geçerlidir (delil bütünlüğü).
 *  - Konuşmacı listesi id ile birleşir; kodlar `assignSpeakerCodes` ile
 *    benzersizleştirilir (aynı kişi iki makinede ayrı id ile eklenmişse
 *    çoğalmaz).
 */
function mergeMaterialFields(mm, tm, applied, conflicts) {
  const name = mm.fileName || mm.id;
  // Şema VARSAYILANLARI da "boş" sayılır: yeni bir kayıtta mediumType
  // 'unspecified', tech.channels 0'dır. Bunlar bilgi taşımaz; gelen dosyada
  // gerçek değer varsa doldurulmalıdır (aksi hâlde alan hiç gelmez).
  const isEmpty = (v) =>
    v == null ||
    v === '' ||
    v === 'unspecified' ||
    v === 0 ||
    (Array.isArray(v) && !v.length) ||
    (isObj(v) && !Object.keys(v).length);

  // Basit skaler alanlar.
  for (const key of ['expectedText', 'sha256', 'statusNote', 'transcribedWithModel', 'transcribedAt']) {
    const mv = mm[key];
    const tv = tm[key];
    if (isEmpty(tv) || tv === mv) continue;
    if (isEmpty(mv)) {
      mm[key] = tv;
      applied.push(`kayıt alanı dolduruldu: ${name}.${key}`);
    } else {
      conflicts.push({
        kind: 'material-field',
        materialId: mm.id,
        materialName: name,
        field: key,
        mine: mv,
        theirs: tv
      });
    }
  }

  // Teknik envanter: dosyanın kendi gerçeği; alan alan doldur, farkı bildir.
  if (isObj(tm.tech)) {
    mm.tech = mm.tech || {};
    for (const key of Object.keys(tm.tech)) {
      const mv = mm.tech[key];
      const tv = tm.tech[key];
      if (isEmpty(tv) || tv === mv) continue;
      if (isEmpty(mv)) {
        mm.tech[key] = tv;
        applied.push(`teknik bilgi dolduruldu: ${name}.tech.${key}`);
      } else {
        conflicts.push({
          kind: 'material-field',
          materialId: mm.id,
          materialName: name,
          field: `tech.${key}`,
          mine: mv,
          theirs: tv
        });
      }
    }
  }

  // Köken / teslim zinciri (uzman beyanı): alan alan birleştir.
  // v2.212: nesne değerler (`acquisition`) JSON ile karşılaştırılır; aynı
  // içerik çakışma sayılmaz, farklı içerik okunur metinle bildirilir.
  if (isObj(tm.origin)) {
    mm.origin = mm.origin || {};
    for (const key of Object.keys(tm.origin)) {
      const mv = mm.origin[key];
      const tv = tm.origin[key];
      if (isEmpty(tv) || sameOriginValue(mv, tv)) continue;
      if (isEmpty(mv)) {
        mm.origin[key] = tv;
        applied.push(`köken bilgisi dolduruldu: ${name}.origin.${key}`);
      } else {
        conflicts.push({
          kind: 'material-field',
          materialId: mm.id,
          materialName: name,
          field: `origin.${key}`,
          mine: originValueText(mv),
          theirs: originValueText(tv)
        });
      }
    }
  }

  // Ölçüm: yalnız bir tarafta varsa alınır; ikisi de varsa farkı bildir.
  if (isObj(tm.levels)) {
    if (!isObj(mm.levels)) {
      mm.levels = tm.levels;
      applied.push(`seviye ölçümü gelen dosyadan alındı: ${name}`);
    } else if (JSON.stringify(mm.levels) !== JSON.stringify(tm.levels)) {
      conflicts.push({
        kind: 'material-field',
        materialId: mm.id,
        materialName: name,
        field: 'levels',
        mine: `tepe ${mm.levels.peakDb}`,
        theirs: `tepe ${tm.levels.peakDb}`
      });
    }
  }

  // Spektrogram incelemesi: zaman damgası; biri boşsa doldur.
  if (isObj(tm.spectrogramReviewed) && !isObj(mm.spectrogramReviewed)) {
    mm.spectrogramReviewed = tm.spectrogramReviewed;
    applied.push(`spektrogram incelemesi gelen dosyadan alındı: ${name}`);
  }

  // Konuşmacılar: id ile birleştir; aynı kişi çoğalmaz.
  if (Array.isArray(tm.speakers) && tm.speakers.length) {
    mm.speakers = mm.speakers || [];
    const byId = new Map(mm.speakers.map((s) => [s.id, s]));
    let added = 0;
    for (const sp of tm.speakers) {
      if (!byId.has(sp.id)) {
        mm.speakers.push(sp);
        byId.set(sp.id, sp);
        added++;
      }
    }
    if (added) applied.push(`konuşmacı eklendi: ${name} (+${added})`);
    // Kod çakışması olmasın: iki makinede ayrı id ile eklenen kişiler
    // aynı kodu almış olabilir.
    assignSpeakerCodes(mm.speakers);
    // DOĞRULAMA KİLİDİ (v2.264): gelen dosyada doğrulanmış kişi bende boşsa
    // devralınır. İkisi de doğrulanmışsa daha YENİ tarih korunur; eski kayıt
    // sessizce ezilmez (uygulananlar listesine yazılır).
    for (const sp of tm.speakers) {
      const mineSp = byId.get(sp.id);
      if (!mineSp || !isSpeakerVerified(sp)) continue;
      if (!isSpeakerVerified(mineSp)) {
        mineSp.verifiedAt = str(sp.verifiedAt);
        mineSp.verifiedBy = str(sp.verifiedBy);
        applied.push(`konuşmacı doğrulaması gelen dosyadan alındı: ${name} · ${sp.code || sp.id}`);
      } else if (str(sp.verifiedAt) > str(mineSp.verifiedAt)) {
        mineSp.verifiedAt = str(sp.verifiedAt);
        mineSp.verifiedBy = str(sp.verifiedBy);
        applied.push(`konuşmacı doğrulaması yenilendi: ${name} · ${sp.code || sp.id}`);
      }
    }
    // DOSYA GENELİ KİŞİ BAĞI (v2.205): aynı konuşmacı id'sinde gelen bağ
    // boşsa doldurulur; iki farklı bağ sessizce ezilmez, çakışma bildirilir.
    for (const sp of tm.speakers) {
      const mineSp = byId.get(sp.id);
      if (!mineSp) continue;
      const mp = str(mineSp.personId);
      const tp = str(sp.personId);
      if (!tp) continue;
      if (!mp) {
        mineSp.personId = tp;
        applied.push(`konuşmacı dosya geneli kişiye bağlandı: ${name} · ${sp.code || sp.id}`);
      } else if (mp !== tp) {
        conflicts.push({
          kind: 'speaker-person',
          materialId: mm.id,
          materialName: name,
          speakerName: `${sp.code || ''} ${sp.name || sp.id}`.trim(),
          mine: mp,
          theirs: tp,
          reason: 'aynı konuşmacı iki farklı dosya geneli kişiye bağlı'
        });
      }
    }
  }

  // Delil günlüğü: yerel korunur; gelen dosyanın girdileri zincire EKLENİR
  // (kaybolmaz). Aynı hash zaten varsa yinelenmez.
  if (Array.isArray(tm.log) && tm.log.length) {
    mm.log = mm.log || [];
    const have = new Set(mm.log.map((e) => e.hash).filter(Boolean));
    const fresh = tm.log.filter((e) => !e.hash || !have.has(e.hash));
    if (fresh.length) {
      mm.log.push(...fresh);
      applied.push(`delil günlüğü girdisi eklendi: ${name} (+${fresh.length})`);
    }
  }
}

// Kontrol durumlarının "ilerleme" sırası. `machine` (otomatik işaretleme)
// pending ile AYNI seviyededir: bilirkişi onayı değildir, bu yüzden gelen
// `approved` onu geçebilmelidir (0 < 2).
const REVIEW_RANK = { pending: 0, machine: 0, relisten: 1, inaudible: 2, approved: 2 };

/**
 * Gelen bölümün kontrol kararı bu dosyaya aktarılabilir mi? (v2.122)
 *
 * NEDEN: Onayı KİMİN verdiği bilinmeden kabul edilemez; kimsenin metin
 * yazmadan yalnız onay vererek bir metni "onaylı" yapması engellenir. Kaynak
 * sırası: `reviewedBy` (kararı veren) → `lastEditBy` (eski kayıtlarda metin
 * düzenleyen). Ekip listesi BOŞSA (tek kişilik dosya) ayrım yapılamaz; eski
 * davranış korunur.
 *
 * DÖNEN `valid=false` ise karar aktarılmaz: bölüm "kontrol bekliyor" olur ve
 * çağıran taraf bunu KULLANICIYA BİLDİRMEK zorundadır (sessiz düşürme yasak).
 */
function approvalTransfer(seg, team, teamKnown) {
  const code = normalizeReviewState(seg.review);
  const reviewerId = str(seg.reviewedBy) || str(seg.lastEditBy);
  const reviewer = reviewerId ? team.get(reviewerId) : null;
  const unattributed = teamKnown && !reviewer;
  const secondEyes = !!reviewer && isSecondEyesRole(reviewer.role);
  const isApproval = code === 'approved';
  const valid = !isApproval || !teamKnown || (!!reviewer && !secondEyes);
  return {
    code: valid ? code : 'pending',
    valid,
    reviewerId,
    unattributed,
    secondEyes,
    reason: !isApproval
      ? ''
      : unattributed
        ? 'gelen onayın kaynağı ekipte tanımlı bir kişiye ait değil'
        : secondEyes
          ? 'gelen onayı ikinci göz (yardımcı/gözlemci) vermiş; onay yetkisi dosya sorumlusunda'
          : ''
  };
}

/**
 * @param {object} mine  Yerel dosya (v3)
 * @param {object} theirs Gelen dosya (v3)
 * @returns {{merged:object, applied:string[], conflicts:object[]}}
 */
export function mergeCases(mine, theirs) {
  const applied = [];
  const conflicts = [];
  if (!mine || !theirs) return { merged: mine || theirs, applied, conflicts };
  const merged = structuredCloneSafe(mine);

  // Üst düzey skaler alanlar: boş alan her zaman doldurulur (veri kaybı yok);
  // ikisi de doluysa gelen dosya daha yeniyse onun değeri alınır, aksi hâlde
  // sessizce seçmek yerine çakışma olarak raporlanır.
  const newer = (theirs.updatedAt || '') > (mine.updatedAt || '');
  for (const k of ['court', 'fileNo', 'subject', 'examinationSubject', 'caseDate', 'inspectionDate', 'reportType', 'status']) {
    mergeTextField(merged, mine, theirs, newer, k, applied, conflicts, k);
  }

  // ÇALIŞMA NOTLARI (v2.356): id ile eklenir; aynı id + farklı metin çakışma.
  {
    const plan = notebookMergePlan(merged.notebook, theirs.notebook);
    merged.notebook = plan.merged;
    for (const a of plan.added) applied.push(`notebook: ${a.id} eklendi`);
    for (const c of plan.conflicts) conflicts.push(c);
  }

  // DOSYA GENELİ KİŞİLER (v2.205): id ile birleşir. Boş alan doldurulur;
  // iki dolu farklı değer sessizce ezilmez, çakışma bildirilir.
  merged.speakers = Array.isArray(merged.speakers) ? merged.speakers : [];
  const myPersons = new Map(merged.speakers.map((p) => [p.id, p]));
  for (const tp of Array.isArray(theirs.speakers) ? theirs.speakers : []) {
    const mp = myPersons.get(tp.id);
    if (!mp) {
      merged.speakers.push(tp);
      myPersons.set(tp.id, tp);
      applied.push(`dosya geneli kişi eklendi: ${tp.code || tp.label || tp.id}`);
      continue;
    }
    for (const k of ['label', 'role', 'gender', 'ageRange', 'notes']) {
      const mv = str(mp[k]);
      const tv = str(tp[k]);
      const isEmpty = k === 'role' || k === 'gender' ? (v) => !v || v === 'unspecified' : (v) => !v;
      if (isEmpty(mv) && !isEmpty(tv)) {
        mp[k] = tp[k];
        applied.push(`dosya geneli kişi alanı dolduruldu: ${mp.code || mp.id} (${k})`);
      } else if (!isEmpty(mv) && !isEmpty(tv) && mv !== tv) {
        conflicts.push({
          kind: 'case-speaker',
          personId: mp.id,
          personLabel: `${mp.code || ''} ${mp.label || ''}`.trim(),
          field: k,
          mine: mv,
          theirs: tv,
          reason: 'aynı dosya geneli kişide farklı değer'
        });
      }
    }
  }
  assignCaseSpeakerCodes(merged.speakers);

  // DİSK ENVANTERİ (v2.215): aynı disk iki dosyada varsa id ile eşleşir.
  // Aynı içerik tekrar eklenmez; farklı içerik sessizce ezilmez.
  merged.disks = Array.isArray(merged.disks) ? merged.disks : [];
  const myDisks = new Map(merged.disks.map((d) => [d.id, d]));
  for (const td of Array.isArray(theirs.disks) ? theirs.disks : []) {
    const md = myDisks.get(td.id);
    if (!md) {
      merged.disks.push(td);
      myDisks.set(td.id, td);
      applied.push(`disk envanteri eklendi: ${(td.device && (td.device.serial || td.device.model)) || td.id}`);
    } else if (JSON.stringify(md) !== JSON.stringify(td)) {
      conflicts.push({
        kind: 'case-disk',
        diskId: md.id,
        field: 'disks',
        mine: `${(md.content && md.content.fileCount) || 0} dosya`,
        theirs: `${(td.content && td.content.fileCount) || 0} dosya`,
        reason: 'aynı disk kimliğinde farklı envanter'
      });
    }
  }

  // FİZİKÎ DOSYA TESLİM VE İADE (v2.330): teslim ve iade AYRI kayıtlardır;
  // metin alanları boşsa doldurulur, iki dolu farklı değer ÇAKIŞMA bildirir.
  // Materyaller ve belgeler KİMLİKLE eşleşir; aynı kimlikte farklı içerik
  // sessizce ezilmez.
  {
    const mf = normalizePhysicalFile(mine.physicalFile);
    const tf = normalizePhysicalFile(theirs.physicalFile);
    const out = normalizePhysicalFile(merged.physicalFile);
    for (const g of ['handover', 'return']) {
      out[g] = out[g] || {};
      for (const k of Object.keys(mf[g] || {})) {
        const mv = str(mf[g][k]);
        const tv = str(tf[g][k]);
        if (!mv && tv) {
          out[g][k] = tf[g][k];
          applied.push(`fizikî dosya alanı dolduruldu: ${g}.${k}`);
        } else if (mv && tv && mv !== tv) {
          conflicts.push({
            kind: 'physical-file',
            field: `${g}.${k}`,
            mine: mv,
            theirs: tv,
            reason: 'aynı fizikî dosya alanında farklı değer'
          });
        }
      }
    }
    if (!out.handover.delivered && tf.handover.delivered) {
      out.handover.delivered = true;
      applied.push('fizikî dosya teslim alındı bilgisi alındı');
    }
    if (!out.returned && tf.returned) {
      out.returned = true;
      applied.push('fizikî dosya iade edildi bilgisi alındı');
    }
    // Materyaller: id ile ekle; farklı içerik çakışma.
    const byId = new Map(out.items.map((x) => [x.id, x]));
    for (const ti of tf.items) {
      const mi = byId.get(ti.id);
      if (!mi) {
        out.items.push(ti);
        byId.set(ti.id, ti);
        applied.push(`fizikî materyal eklendi: ${PHYSICAL_ITEM_LABEL[ti.type] || ti.type} ${ti.label || ''}`.trim());
      } else if (JSON.stringify(mi) !== JSON.stringify(ti)) {
        // İade bilgisi gelen tarafta ilerlemişse alınır (tek yön: iadeye doğru).
        if (!mi.returned && ti.returned) {
          mi.returned = true;
          mi.returnSeal = ti.returnSeal || mi.returnSeal;
          mi.returnCondition = ti.returnCondition || mi.returnCondition;
          applied.push(`fizikî materyal iadesi alındı: ${mi.label || mi.id}`);
        } else {
          conflicts.push({
            kind: 'physical-item',
            itemId: mi.id,
            field: 'items',
            mine: `${PHYSICAL_ITEM_LABEL[mi.type] || mi.type} ${mi.label || ''}`.trim(),
            theirs: `${PHYSICAL_ITEM_LABEL[ti.type] || ti.type} ${ti.label || ''}`.trim(),
            reason: 'aynı fizikî materyalde farklı bilgi'
          });
        }
      }
    }
    // Belgeler: id ile ekle; aynı kimlikte farklı ad → çakışma (gövde taşınmaz).
    const docIds = new Set(out.documents.map((d) => d.id));
    for (const td of tf.documents) {
      if (docIds.has(td.id)) continue;
      out.documents.push(td);
      docIds.add(td.id);
      applied.push(`fizikî dosya belgesi eklendi: ${td.name}`);
    }
    merged.physicalFile = out;
  }

  // İç içe gruplar. Yardımcı bu alanları da doldurabilir/düzeltebilir.
  // v2.65: parties / expert / assignment alanları eksikti; yardımcının
  // doldurduğu davacı, davalı, bilirkişi adı, sicil no, tarihler sessizce
  // kayboluyordu. Artık hepsi birleştirmeye giriyor.
  for (const [group, keys] of [
    ['parties', ['plaintiff', 'plaintiffCounsel', 'defendant', 'defendantCounsel']],
    ['expert', ['name', 'registryNo', 'field']],
    ['assignment', ['date', 'dueDate', 'durationDays', 'scope', 'body']],
    ['report', ['date', 'methodText', 'summaryIntroText', 'limitationsText', 'conclusionText', 'impartiality', 'qcBy', 'qcScope', 'qcDate']]
  ]) {
    const mg = mine[group] || {};
    const tg = theirs[group] || {};
    merged[group] = merged[group] || {};
    for (const k of keys) mergeTextField(merged[group], mg, tg, newer, k, applied, conflicts, `${group}.${k}`);
  }
  // Teknik ortam (v2.222): boş alan dolar; dolu farklı değer sessizce ezilmez.
  {
    const mr = mine.report || {};
    const tr = theirs.report || {};
    merged.report = merged.report || {};
    merged.report.tech = merged.report.tech || {};
    for (const k of REPORT_TECH_KEYS)
      mergeTextField(merged.report.tech, mr.tech || {}, tr.tech || {}, newer, k, applied, conflicts, `report.tech.${k}`);
  }

  // Serbest rapor blokları (v2.287): id ile eşleşir. Gelen blok yoksa eklenir;
  // aynı kimlikte farklı içerik sessizce EZİLMEZ, çakışma olarak bildirilir.
  {
    const mr = mine.report || {};
    const tr = theirs.report || {};
    merged.report = merged.report || {};
    const blocks = normalizeReportBlocks(mr.blocks);
    const byId = new Map(blocks.map((b) => [b.id, b]));
    for (const tb of normalizeReportBlocks(tr.blocks)) {
      const mb = byId.get(tb.id);
      if (!mb) {
        blocks.push(tb);
        byId.set(tb.id, tb);
        applied.push(`serbest bölüm eklendi: ${tb.title || tb.id}`);
      } else if (JSON.stringify(mb) !== JSON.stringify(tb)) {
        conflicts.push({
          kind: 'report-block',
          blockId: mb.id,
          field: 'blocks',
          mine: mb.title || mb.id,
          theirs: tb.title || tb.id,
          reason: 'aynı serbest bölüm kimliğinde farklı içerik'
        });
      }
    }
    merged.report.blocks = normalizeReportBlocks(blocks);
    const layout = normalizeReportLayout(merged.report.layout || mr.layout);
    merged.report.layout = { ...layout, order: ensureFreeBlockOrder(layout.order, merged.report.blocks) };
  }

  // Kullanıcı rapor profilleri (v2.288): id ile eklenir; aynı kimlikte farklı
  // düzen sessizce ezilmez, çakışma olarak bildirilir.
  {
    const mp = normalizeReportProfiles((mine.report || {}).userProfiles);
    const byId = new Map(mp.map((p) => [p.id, p]));
    for (const tp of normalizeReportProfiles((theirs.report || {}).userProfiles)) {
      const ep = byId.get(tp.id);
      if (!ep) {
        mp.push(tp);
        byId.set(tp.id, tp);
        applied.push(`rapor profili eklendi: ${tp.name}`);
      } else if (JSON.stringify(ep) !== JSON.stringify(tp)) {
        conflicts.push({
          kind: 'report-profile',
          profileId: ep.id,
          field: 'userProfiles',
          mine: ep.name,
          theirs: tp.name,
          reason: 'aynı profil kimliğinde farklı düzen'
        });
      }
    }
    merged.report.userProfiles = normalizeReportProfiles(mp);
  }

  // Bölüm → EK yerleşimi (v2.291): gelen taşıma eklenir; kanıt etkilenmez.
  {
    const mp = normalizeAnnexPlacement((mine.report || {}).annexPlacement);
    const tp = normalizeAnnexPlacement((theirs.report || {}).annexPlacement);
    for (const k of Object.keys(tp)) {
      if (!mp[k]) {
        // v2.369: değer `true` (kendi eki) VEYA grup anahtarı ('ek7') olabilir;
        // gelen değeri AYNEN koru (grubu `true`'ya çevirmek taşımayı bozardı).
        mp[k] = tp[k];
        applied.push(`bölüm EK'e taşındı: ${k}`);
      }
    }
    merged.report.annexPlacement = normalizeAnnexPlacement(mp);
  }

  // Bölümler: id ile eşleşen kayıtlarda metin, düzenleme sayacıyla (textRev)
  // çözülür. Sayaç yüksek olan taraf daha yeni düzenlemedir ve kazanır; kaybeden
  // metin silinmez, geçmişe yazılır. Sayaçlar eşitse gerçek çakışma bildirilir.
  const myMats = new Map((merged.materials || []).map((m) => [m.id, m]));
  for (const tm of theirs.materials || []) {
    const mm = myMats.get(tm.id);
    if (!mm) {
      merged.materials.push(tm);
      applied.push(`kayıt eklendi: ${tm.fileName || tm.id}`);
      continue;
    }
    const myEdits = (mm.segments || []).filter((s) => (Number(s.textRev) || 0) > 0).length;
    if ((tm.transcribedAt || '') > (mm.transcribedAt || '')) {
      if (myEdits) {
        // Yeniden çözümleme bölüm kimliklerini baştan üretir; elle yapılmış
        // düzeltmeleri sessizce silmek adli belgede kabul edilemez. Bölüm
        // birleştirmesine de girilmez: kimlikler tutmadığı için her bölüm
        // "yeni" sanılır ve içerik çoğalırdı.
        conflicts.push({
          kind: 'material-retranscribed',
          materialId: mm.id,
          materialName: mm.fileName || mm.id,
          mine: `${myEdits} elle düzeltilmiş bölüm`,
          theirs: `yeni çözümleme: ${tm.transcribedAt}`
        });
        continue;
      } else {
        mm.status = tm.status;
        mm.segments = tm.segments;
        mm.transcribedWithModel = tm.transcribedWithModel;
        mm.transcribedAt = tm.transcribedAt;
        applied.push(`kayıt çözümlemesi güncellendi: ${tm.fileName || tm.id}`);
        continue;
      }
    }
    // KAYIT DÜZEYİ ALANLAR (v2.94). Öncesinde bunlar hiç birleştirilmiyordu:
    // gelen dosyada dolu olsa bile sessizce kayboluyor, çakışma da
    // bildirilmiyordu. Kural: boş alan doldurulur; iki taraf da dolu ve
    // farklıysa ÇAKIŞMA bildirilir (sessizce ezme yok).
    mergeMaterialFields(mm, tm, applied, conflicts);
    // Bölüm bazında birleştir.
    const mySegs = new Map((mm.segments || []).map((s) => [s.id, s]));
    // Gelen dosyanın ekip listesi: bir düzenlemenin KİME ait olduğunu çözmek
    // için. Ekip listesi BOŞSA ayrım yapılamaz (tek kişilik dosya); bu durumda
    // eski davranış korunur. Ekip listesi DOLUYSA ve düzenleyen eşleşmiyorsa
    // onay kabul edilmez: kimin yaptığı bilinmeyen onay, adli belgede onay
    // değildir. Bu yüzden bilirkişi kendi profilini bir kez tanımlamalıdır.
    const theirTeam = new Map((theirs.team || []).map((t) => [t.id, t]));
    const teamKnown = theirTeam.size > 0;
    for (const ts of tm.segments || []) {
      const ms = mySegs.get(ts.id);
      if (!ms) {
        mm.segments.push(ts);
        applied.push(`bölüm eklendi: ${ts.id}`);
        continue;
      }
      // Öneri (ikinci göz düzeltmesi) metne karışmaz; ayrı taşınır.
      if (ts.proposal && (!ms.proposal || (ts.proposal.at || '') > (ms.proposal.at || ''))) {
        ms.proposal = ts.proposal;
        applied.push(`ikinci göz önerisi alındı: ${ms.id}`);
      }
      // GÖZLEM İŞARETLERİ (v2.203): iki tarafın işaretleri BİRLEŞİR (OR).
      // Önceden `ts.obs` hiç okunmuyordu; gelen tarafın işaretleri sessizce
      // kayboluyordu. Bilinmeyen (ileri sürüm) anahtarlar da korunur.
      const myObs = isObj(ms.obs) ? ms.obs : {};
      const theirObs = isObj(ts.obs) ? ts.obs : {};
      const obsKeys = new Set([...Object.keys(myObs), ...Object.keys(theirObs)]);
      if (obsKeys.size) {
        const mergedObs = {};
        const addedObs = [];
        for (const k of obsKeys) {
          mergedObs[k] = !!(myObs[k] || theirObs[k]);
          if (!myObs[k] && theirObs[k]) addedObs.push(k);
        }
        ms.obs = mergedObs;
        if (addedObs.length) applied.push(`gözlem işaretleri birleşti: ${ms.id} (${addedObs.join(', ')})`);
      }
      // Gelen metni KİM düzenledi? (öneriye çevirme kararı için)
      const tEditor = ts.lastEditBy ? theirTeam.get(ts.lastEditBy) : null;
      const tSecondEyes = !!tEditor && isSecondEyesRole(tEditor.role);
      // Kontrol kararını KİM verdi? Onay aktarımı metin düzenleyenden AYRIDIR
      // (v2.122): dinleyip onaylayan bilirkişi metne hiç dokunmamış olabilir.
      const decision = approvalTransfer(ts, theirTeam, teamKnown);
      const mt = ms.text || '';
      const tt = ts.text || '';
      if (mt !== tt) {
        const touchedMine = (Number(ms.textRev) || 0) > 0;
        const touchedTheirs = (Number(ts.textRev) || 0) > 0;
        if (!touchedMine && touchedTheirs) {
          if (tSecondEyes) {
            // İkinci gözün yazdığı metin ana metne GİRMEZ; öneriye dönüşür.
            // (Uygulama bunu normalde engeller; eski/bozuk kayıt için ağ.)
            ms.proposal = {
              text: tt,
              by: tEditor.name || ts.lastEditBy,
              at: new Date().toISOString(),
              baseText: mt
            };
            applied.push(`ikinci göz düzeltmesi öneriye çevrildi: ${ms.id}`);
          } else {
            // Yalnız gelen taraf düzenlemiş: metin alınır.
            pushSegHistory(ms, mt, 'birleştirme: yerel sürüm');
            ms.text = tt;
            ms.textRev = Number(ts.textRev) || 1;
            // Metni kimin yazdığı da taşınır; aksi hâlde birleşmiş bölüm
            // yanlış kişiyi "son düzenleyen" gösterir ve sonraki birleştirmede
            // ikinci göz koruması yanlış çalışır.
            ms.lastEditBy = ts.lastEditBy || ms.lastEditBy;
            // Onay metne bağlıdır. Kararı KİMİN verdiği bilinmiyorsa onay
            // kabul EDİLMEZ; bölüm "kontrol bekliyor"a çekilir ve BİLDİRİLİR.
            ms.review = decision.code;
            ms.reviewedBy = decision.valid ? str(ts.reviewedBy) : '';
            ms.reviewedAt = decision.valid ? str(ts.reviewedAt) : '';
            if (!decision.valid) {
              conflicts.push({
                kind: 'approval-not-attributed',
                materialId: mm.id,
                materialName: mm.fileName || mm.id,
                segmentId: ms.id,
                mine: mt,
                theirs: tt,
                reason: decision.reason
              });
              applied.push(`onay aktarılamadı (kaynağı doğrulanamadı), kontrol bekliyor: ${ms.id}`);
            }
            applied.push(`bölüm metni gelen sürümden alındı (gelen taraf düzenlemiş): ${ms.id}`);
          }
        } else if (touchedMine && !touchedTheirs) {
          // Yalnız yerel taraf düzenlemiş: korunur, gelen metin geçmişe yazılır.
          pushSegHistory(ms, tt, 'birleştirme: gelen sürüm');
          applied.push(`bölüm metni yerel sürümde korundu (yerel taraf düzenlemiş): ${ms.id}`);
        } else {
          // İki taraf da düzenlemiş ya da ikisi de dokunmamış: sessizce seçmek
          // adli belgede kabul edilemez. Kararı bilirkişi verir.
          conflicts.push({
            kind: 'segment-text',
            materialId: mm.id,
            segmentId: ms.id,
            mine: mt,
            theirs: tt,
            reason: touchedMine && touchedTheirs ? 'iki taraf da düzenlemiş' : 'metin farklı, düzenleme kaydı yok'
          });
        }
      } else {
        // Metin aynı: yalnız kontrol durumu ilerleyebilir. Kararı KİMİN
        // verdiği bilinmeyen onay kabul edilmez; aksi hâlde kimse metin
        // yazmadan yalnız onay vererek metni "onaylı" yapabilirdi.
        // SESSİZ DÜŞÜRME YASAK: aktarılmayan onay BİLDİRİLİR.
        const myRank = REVIEW_RANK[normalizeReviewState(ms.review)] ?? 0;
        const inRank = REVIEW_RANK[normalizeReviewState(ts.review)] ?? 0;
        if (inRank > myRank) {
          if (decision.valid) {
            ms.review = decision.code;
            ms.reviewedBy = str(ts.reviewedBy);
            ms.reviewedAt = str(ts.reviewedAt);
            applied.push(`bölüm kontrolü güncellendi: ${ms.id}`);
          } else {
            conflicts.push({
              kind: 'approval-not-attributed',
              materialId: mm.id,
              materialName: mm.fileName || mm.id,
              segmentId: ms.id,
              mine: mt,
              theirs: tt,
              reason: decision.reason
            });
          }
        }
      }
    }
  }

  // Sorular: id ile eşleşir; cevap düzenleme sayacıyla (answerRev) çözülür.
  const myQs = new Map((merged.questions || []).map((q) => [q.id, q]));
  for (const tq of theirs.questions || []) {
    const mq = myQs.get(tq.id);
    if (!mq) {
      merged.questions.push(tq);
      applied.push(`soru eklendi: ${tq.id}`);
      continue;
    }
    const ma = mq.answer || '';
    const ta = tq.answer || '';
    if (!ta || ta === ma) continue;
    if (!ma) {
      mq.answer = ta;
      mq.answerRev = Number(tq.answerRev) || 1;
      mq.answeredBy = tq.answeredBy || '';
      applied.push(`soru cevabı dolduruldu: ${mq.id}`);
      continue;
    }
    const touchedMine = (Number(mq.answerRev) || 0) > 0;
    const touchedTheirs = (Number(tq.answerRev) || 0) > 0;
    if (!touchedMine && touchedTheirs) {
      mq.answer = ta;
      mq.answerRev = Number(tq.answerRev) || 1;
      mq.answeredBy = tq.answeredBy || mq.answeredBy;
      applied.push(`soru cevabı gelen sürümden alındı (gelen taraf düzenlemiş): ${mq.id}`);
    } else if (touchedMine && !touchedTheirs) {
      applied.push(`soru cevabı yerel sürümde korundu (yerel taraf düzenlemiş): ${mq.id}`);
    } else {
      conflicts.push({ kind: 'question-answer', questionId: mq.id, mine: ma, theirs: ta });
    }
  }

  // Onay yetkisi güvenlik ağı: bir bölüm "onaylandı" diyorsa ama kararı veren
  // (yoksa son düzenleyen) ikinci gözse (yardımcı/kontrol eden), bu onay
  // geçersizdir. Eski kayıtlarda veya yanlış seçimde oluşmuş olabilir; sessizce
  // onaylı göstermek adli belgede kabul edilemez. Durum "kontrol bekliyor"a
  // çekilir ve bildirilir.
  const teamById = new Map((merged.team || []).map((t) => [t.id, t]));
  for (const m of merged.materials || []) {
    for (const s of m.segments || []) {
      const who = s.reviewedBy || s.lastEditBy;
      const ed = who ? teamById.get(who) : null;
      if (s.review === 'approved' && ed && isSecondEyesRole(ed.role)) {
        s.review = 'pending';
        s.reviewedBy = '';
        s.reviewedAt = '';
        applied.push(`ikinci gözün onayı geçersiz sayıldı, kontrol bekliyor: ${s.id}`);
      }
    }
  }

  // Ekip: id ile birleşir (yinelenmez).
  const myTeam = new Map((merged.team || []).map((t) => [t.id, t]));
  for (const tt of theirs.team || []) {
    if (!myTeam.has(tt.id)) {
      merged.team.push(tt);
      applied.push(`ekip üyesi eklendi: ${tt.name || tt.id}`);
    }
  }

  merged.mergeLog = [
    ...(merged.mergeLog || []),
    {
      at: new Date().toISOString(),
      source: theirs.id || '',
      applied: applied.length,
      conflicts: conflicts.length
    }
  ];
  return { merged, applied, conflicts };
}

// ---- 9b. Birleştirme önizlemesi ------------------------------------------
// Kullanıcı birleştirmeden ÖNCE ne değişeceğini görmeli. Bu fonksiyon hiçbir
// şey değiştirmez; yalnız iki dosyayı karşılaştırıp özet çıkarır. Amaç:
// "sessizce üzerine yazma" yerine "ne olacağını göster, sonra uygula".

/**
 * @returns {{
 *   sameFile: boolean,
 *   mineLabel: string, theirsLabel: string,
 *   materials: {added:object[], same:object[], differ:object[]},
 *   segments: {added:number, changed:object[], reviewAdvanced:number},
 *   questions: {added:number, filled:number, conflicts:object[]},
 *   team: {added:object[]},
 *   conflicts: object[]
 * }}
 */
export function compareCases(mine, theirs) {
  const empty = {
    sameFile: false,
    mineLabel: '',
    theirsLabel: '',
    materials: { added: [], same: [], differ: [], fields: [] },
    segments: {
      added: 0,
      changed: [],
      reviewAdvanced: 0,
      // Onay aktarılamadı (kaynağı doğrulanamadı) / metin değiştiği için düştü.
      approvalsRejected: 0,
      approvalsDropped: 0,
      autoResolved: 0,
      proposals: 0
    },
    questions: { added: 0, filled: 0, conflicts: [], autoResolved: 0 },
    caseFields: { filled: [], autoResolved: [], conflicts: [] },
    team: { added: [] },
    // Serbest rapor blokları (v2.287): önizleme = birleştirme kuralı.
    blocks: { added: [], conflicts: [] },
    // Kullanıcı profilleri (v2.288): önizleme = birleştirme kuralı.
    profiles: { added: [], conflicts: [] },
    placement: { added: [] },
    // Çalışma notları (v2.356): önizleme = birleştirme kuralı.
    notebook: { added: 0, conflicts: [] },
    disks: { added: 0 },
    // Fizikî dosya teslim/iade (v2.330): önizleme = birleştirme kuralı.
    physical: { filled: 0, conflicts: [], itemsAdded: 0, docsAdded: 0, returnsAdvanced: 0 },
    // Dosya geneli kişiler (v2.205): önizleme, birleştirmenin ne yapacağını
    // göstermeli. `linked` = doldurulacak konuşmacı bağı sayısı.
    speakers: { added: [], filled: 0, linked: 0, conflicts: [] },
    conflicts: []
  };
  if (!mine || !theirs) return empty;

  const label = (c) => `${c.fileNo || '—'} · ${c.court || '—'}`;
  const out = { ...empty, mineLabel: label(mine), theirsLabel: label(theirs) };
  out.sameFile = mine.id === theirs.id;
  const newer = (theirs.updatedAt || '') > (mine.updatedAt || '');

  // Üst düzey metin alanları: önizleme, birleştirmenin gerçekte ne yapacağını
  // göstermeli. Boş alan dolar; iki dolu farklı değer, gelen daha yeniyse
  // otomatik çözülür, değilse çakışma sayılır.
  const cmpField = (group, key, labelText) => {
    const mg = group ? mine[group] || {} : mine;
    const tg = group ? theirs[group] || {} : theirs;
    const mv = mg[key] || '';
    const tv = tg[key] || '';
    if (!tv || tv === mv) return;
    const item = { field: labelText, mine: mv, theirs: tv };
    if (!mv) out.caseFields.filled.push(item);
    else if (newer) out.caseFields.autoResolved.push(item);
    else out.caseFields.conflicts.push(item);
  };
  for (const k of ['court', 'fileNo', 'subject', 'examinationSubject', 'caseDate', 'inspectionDate', 'reportType', 'status']) cmpField(null, k, k);
  for (const [g, keys] of [
    ['report', ['methodText', 'summaryIntroText', 'limitationsText', 'conclusionText', 'impartiality', 'qcBy', 'qcScope', 'qcDate']],
    ['assignment', ['scope', 'body']]
  ]) {
    for (const k of keys) cmpField(g, k, `${g}.${k}`);
  }
  // Teknik ortam (v2.222): önizleme birleştirmeyle aynı kuralı gösterir.
  {
    const mt = (mine.report || {}).tech || {};
    const tt = (theirs.report || {}).tech || {};
    for (const k of REPORT_TECH_KEYS) {
      const mv = mt[k] || '';
      const tv = tt[k] || '';
      if (!tv || tv === mv) continue;
      const item = { field: `report.tech.${k}`, mine: mv, theirs: tv };
      if (!mv) out.caseFields.filled.push(item);
      else if (newer) out.caseFields.autoResolved.push(item);
      else out.caseFields.conflicts.push(item);
    }
  }

  // Disk envanteri: yalnız YENİ kimlikler "eklenecek" sayılır.
  {
    const have = new Set((mine.disks || []).map((d) => d.id));
    out.disks.added = (theirs.disks || []).filter((d) => !have.has(d.id)).length;
  }

  // Fizikî dosya (v2.330): önizleme = birleştirme kuralı. Boş alan dolar;
  // iki dolu farklı değer çakışmadır (sessiz seçim yok). Yeni materyal/belge
  // kimlikleri "eklenecek" sayılır.
  {
    const mf = normalizePhysicalFile(mine.physicalFile);
    const tf = normalizePhysicalFile(theirs.physicalFile);
    const cmpPf = (label, mv, tv) => {
      if (!tv || tv === mv) return;
      if (!mv) out.physical.filled++;
      else out.physical.conflicts.push({ field: label, mine: mv, theirs: tv });
    };
    for (const g of ['handover', 'return']) {
      for (const k of Object.keys(mf[g] || {})) cmpPf(`${g}.${k}`, str(mf[g][k]), str(tf[g][k]));
    }
    const myItems = new Set(mf.items.map((i) => i.id));
    out.physical.itemsAdded = tf.items.filter((i) => !myItems.has(i.id)).length;
    const myDocs = new Set(mf.documents.map((d) => d.id));
    out.physical.docsAdded = tf.documents.filter((d) => !myDocs.has(d.id)).length;
    // Materyal iadesi ilerlemişse "alınacak" sayılır (birleştirme bunu yapar).
    const itemMap = new Map(mf.items.map((i) => [i.id, i]));
    out.physical.returnsAdvanced = tf.items.filter((ti) => {
      const mi = itemMap.get(ti.id);
      return mi && !mi.returned && ti.returned;
    }).length;
  }

  const mineMats = new Map((mine.materials || []).map((m) => [m.id, m]));
  // Gelen dosyanın ekibi: bir düzenlemenin kime ait olduğunu çözmek için.
  // Birleştirme (mergeCases) ile AYNI kural kullanılır; önizleme yalan söylemez.
  const theirTeam = new Map((theirs.team || []).map((t) => [t.id, t]));
  const teamKnown = theirTeam.size > 0;
  for (const tm of theirs.materials || []) {
    const mm = mineMats.get(tm.id);
    if (!mm) {
      out.materials.added.push({ id: tm.id, name: tm.fileName || tm.id, segments: (tm.segments || []).length });
      continue;
    }
    // Aynı kayıt: KAYIT DÜZEYİ alanlar (v2.94) + bölüm düzeyi karşılaştır.
    // Önizleme, birleştirmenin gerçekte ne yapacağını göstermeli; kayıt
    // düzeyi alanlar atlanırsa "değişecek kayıt yok" deyip veri değiştirirdi.
    let matDiffer = false;
    for (const f of diffMaterialFields(mm, tm)) {
      out.materials.fields.push({ materialId: mm.id, materialName: mm.fileName || mm.id, field: f.field, mine: f.mine, theirs: f.theirs });
      matDiffer = true;
    }
    const mineSegs = new Map((mm.segments || []).map((s) => [s.id, s]));
    for (const ts of tm.segments || []) {
      const ms = mineSegs.get(ts.id);
      if (!ms) {
        out.segments.added++;
        matDiffer = true;
        continue;
      }
      // Öneri metne karışmaz; ayrı sayılır ve birleştirmede taşınır.
      if (ts.proposal && (!ms.proposal || (ts.proposal.at || '') > (ms.proposal.at || ''))) {
        out.segments.proposals++;
        matDiffer = true;
      }
      // Gelen metni KİM düzenledi / kararı KİM verdi? (birleştirme ile AYNI kural)
      const tEditor = ts.lastEditBy ? theirTeam.get(ts.lastEditBy) : null;
      const tSecondEyes = !!tEditor && isSecondEyesRole(tEditor.role);
      const decision = approvalTransfer(ts, theirTeam, teamKnown);
      const myReview = normalizeReviewState(ms.review);
      const myRank = REVIEW_RANK[myReview] ?? 0;
      const inRank = REVIEW_RANK[normalizeReviewState(ts.review)] ?? 0;
      if ((ms.text || '') !== (ts.text || '')) {
        matDiffer = true;
        const touchedMine = (Number(ms.textRev) || 0) > 0;
        const touchedTheirs = (Number(ts.textRev) || 0) > 0;
        if (touchedMine === touchedTheirs) {
          // İki taraf da düzenlemiş ya da ikisi de dokunmamış: gerçek çakışma.
          // Birleştirme bu dosyadaki metni ve kontrol durumunu korur.
          out.segments.changed.push({
            materialId: mm.id,
            materialName: mm.fileName || mm.id,
            segmentId: ms.id,
            mine: ms.text || '',
            theirs: ts.text || ''
          });
        } else if (tSecondEyes && !touchedMine) {
          // İkinci göz yazmış: metne girmez, öneriye dönüşür.
          out.segments.proposals++;
        } else if (!touchedMine && touchedTheirs) {
          // Birleştirme gelen metni alır; kontrol durumu da gelen karara göre
          // yeniden yazılır. Önizleme bunu AYNI şekilde göstermeli.
          out.segments.autoResolved++;
          if (!decision.valid) {
            out.segments.approvalsRejected++;
            out.conflicts.push({
              kind: 'approval-not-attributed',
              materialId: mm.id,
              materialName: mm.fileName || mm.id,
              segmentId: ms.id,
              mine: ms.text || '',
              theirs: ts.text || '',
              reason: decision.reason
            });
          }
          const newRank = REVIEW_RANK[decision.code] ?? 0;
          if (newRank > myRank) out.segments.reviewAdvanced++;
          else if (newRank < myRank && (myReview === 'approved' || myReview === 'inaudible')) {
            out.segments.approvalsDropped++;
          }
        } else {
          // Yalnız yerel taraf düzenlemiş: metin ve kontrol durumu korunur.
          out.segments.autoResolved++;
        }
      } else if (inRank > myRank) {
        // Metin aynı: kontrol durumu ilerleyebilir. Kaynağı doğrulanamayan
        // onay ilerleme sayılmaz; kullanıcı birleştirmeden ÖNCE görsün.
        if (decision.valid) out.segments.reviewAdvanced++;
        else {
          out.segments.approvalsRejected++;
          out.conflicts.push({
            kind: 'approval-not-attributed',
            materialId: mm.id,
            materialName: mm.fileName || mm.id,
            segmentId: ms.id,
            mine: ms.text || '',
            theirs: ts.text || '',
            reason: decision.reason
          });
        }
      }
    }
    if (matDiffer) out.materials.differ.push({ id: mm.id, name: mm.fileName || mm.id });
    else out.materials.same.push({ id: mm.id, name: mm.fileName || mm.id });
  }

  const mineQs = new Map((mine.questions || []).map((q) => [q.id, q]));
  for (const tq of theirs.questions || []) {
    const mq = mineQs.get(tq.id);
    if (!mq) {
      out.questions.added++;
      continue;
    }
    const ma = mq.answer || '';
    const ta = tq.answer || '';
    if (!ta || ta === ma) continue;
    if (!ma) out.questions.filled++;
    else if (((Number(mq.answerRev) || 0) > 0) === ((Number(tq.answerRev) || 0) > 0))
      out.questions.conflicts.push({ id: mq.id, question: mq.question || '', mine: ma, theirs: ta });
    else out.questions.autoResolved++;
  }

  const mineTeam = new Set((mine.team || []).map((t) => t.id));
  for (const tt of theirs.team || []) {
    if (!mineTeam.has(tt.id)) out.team.added.push({ id: tt.id, name: tt.name || tt.id, role: tt.role });
  }

  // DOSYA GENELİ KİŞİLER (v2.205): önizleme, birleştirme ile AYNI kuralı
  // kullanmalı. Ekleme/doldurma/çakışma sayıları burada çıkar.
  // ÇALIŞMA NOTLARI (v2.356): önizleme, birleştirmenin gerçekte ne yapacağını
  // gösterir; aynı plan fonksiyonu kullanılır.
  {
    const plan = notebookMergePlan(mine.notebook, theirs.notebook);
    out.notebook.added = plan.added.length;
    out.notebook.conflicts.push(...plan.conflicts);
    for (const c of plan.conflicts) out.conflicts.push(c);
  }

  const minePersons = new Map((mine.speakers || []).map((p) => [p.id, p]));
  for (const tp of theirs.speakers || []) {
    const mp = minePersons.get(tp.id);
    if (!mp) {
      out.speakers.added.push({ id: tp.id, code: tp.code || '', label: tp.label || tp.id });
      continue;
    }
    for (const k of ['label', 'role', 'gender', 'ageRange', 'notes']) {
      const mv = str(mp[k]);
      const tv = str(tp[k]);
      const isEmpty = k === 'role' || k === 'gender' ? (v) => !v || v === 'unspecified' : (v) => !v;
      if (isEmpty(mv) && !isEmpty(tv)) out.speakers.filled++;
      else if (!isEmpty(mv) && !isEmpty(tv) && mv !== tv) {
        out.speakers.conflicts.push({
          kind: 'case-speaker',
          personId: mp.id,
          personLabel: `${mp.code || ''} ${mp.label || ''}`.trim(),
          field: k,
          mine: mv,
          theirs: tv,
          reason: 'aynı dosya geneli kişide farklı değer'
        });
      }
    }
  }
  const myMatById = new Map((mine.materials || []).map((m) => [m.id, m]));
  for (const tm of theirs.materials || []) {
    const mm = myMatById.get(tm.id);
    if (!mm) continue;
    const mySpk = new Map((mm.speakers || []).map((s) => [s.id, s]));
    for (const sp of tm.speakers || []) {
      const ms = mySpk.get(sp.id);
      if (!ms) continue;
      const mp = str(ms.personId);
      const tp = str(sp.personId);
      if (!tp) continue;
      if (!mp) out.speakers.linked++;
      else if (mp !== tp) {
        out.speakers.conflicts.push({
          kind: 'speaker-person',
          materialId: mm.id,
          materialName: mm.fileName || mm.id,
          speakerName: `${sp.code || ''} ${sp.name || sp.id}`.trim(),
          mine: mp,
          theirs: tp,
          reason: 'aynı konuşmacı iki farklı dosya geneli kişiye bağlı'
        });
      }
    }
  }

  // Serbest bloklar (v2.287): yeni blok eklenir; aynı kimlikte farklı içerik
  // çakışma olarak görünür (birleştirme sessizce ezmez).
  {
    const mineBlocks = new Map(
      normalizeReportBlocks((mine.report || {}).blocks).map((b) => [b.id, b])
    );
    for (const tb of normalizeReportBlocks((theirs.report || {}).blocks)) {
      const mb = mineBlocks.get(tb.id);
      if (!mb) out.blocks.added.push({ id: tb.id, title: tb.title || tb.id });
      else if (JSON.stringify(mb) !== JSON.stringify(tb)) {
        out.blocks.conflicts.push({
          kind: 'report-block',
          blockId: mb.id,
          field: 'blocks',
          mine: mb.title || mb.id,
          theirs: tb.title || tb.id,
          reason: 'aynı serbest bölüm kimliğinde farklı içerik'
        });
      }
    }
  }

  // Kullanıcı profilleri (v2.288): yeni profil eklenir; aynı kimlikte farklı
  // düzen çakışma olarak görünür.
  {
    const mineProfiles = new Map(
      normalizeReportProfiles((mine.report || {}).userProfiles).map((p) => [p.id, p])
    );
    for (const tp of normalizeReportProfiles((theirs.report || {}).userProfiles)) {
      const ep = mineProfiles.get(tp.id);
      if (!ep) out.profiles.added.push({ id: tp.id, name: tp.name });
      else if (JSON.stringify(ep) !== JSON.stringify(tp)) {
        out.profiles.conflicts.push({
          kind: 'report-profile',
          profileId: ep.id,
          field: 'userProfiles',
          mine: ep.name,
          theirs: tp.name,
          reason: 'aynı profil kimliğinde farklı düzen'
        });
      }
    }
  }

  // Bölüm → EK yerleşimi (v2.291): önizleme birleştirmeyle aynı.
  {
    const mp = normalizeAnnexPlacement((mine.report || {}).annexPlacement);
    for (const k of Object.keys(normalizeAnnexPlacement((theirs.report || {}).annexPlacement))) {
      if (!mp[k]) out.placement.added.push(k);
    }
  }

  // Kaynağı tanımsız onaylar döngü sırasında `out.conflicts`'e eklenir; burada
  // yeniden atama onları SİLERDİ. Bu yüzden önce toplanır, sonra birleştirilir.
  out.conflicts = [
    ...out.segments.changed,
    ...out.questions.conflicts,
    ...out.caseFields.conflicts,
    ...out.speakers.conflicts,
    ...out.blocks.conflicts,
    ...out.profiles.conflicts,
    ...out.physical.conflicts,
    ...out.conflicts
  ];
  return out;
}

function structuredCloneSafe(o) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(o);
    } catch (e) {}
  }
  return JSON.parse(JSON.stringify(o));
}

// ---- 10. Yardımcı çözücüler (arayüz ve rapor ortak kullanır) --------------

export function speakerLabel(material, speakerId) {
  const sp = (material?.speakers || []).find((s) => s.id === speakerId);
  return sp ? sp.label : '';
}

export function materialById(c, id) {
  return (c?.materials || []).find((m) => m.id === id) || null;
}

export function segmentById(c, materialId, segmentId) {
  const m = materialById(c, materialId);
  return (m?.segments || []).find((s) => s.id === segmentId) || null;
}

export function teamMemberById(c, id) {
  return (c?.team || []).find((t) => t.id === id) || null;
}

export function statusLabel(status) {
  return STATUS_LABEL[status] || status || '';
}

export function reviewLabel(code) {
  return REVIEW_LABEL[code] || code || '';
}

/** İpucu (tooltip) metni. Ekranı kalabalıklaştırmadan ayrıntı verir. */
export function reviewHint(code) {
  return REVIEW_HINT[code] || '';
}

/** Bu kontrol kodu bilirkişinin DİNLEYEREK verdiği onay mı? */
export function isHumanApprovedReview(code) {
  return HUMAN_APPROVED.includes(code);
}
