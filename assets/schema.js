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

    // Rapor
    report: {
      date: '',
      methodText: '',
      limitationsText: '',
      conclusionText: ''
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
    measuredAt: s.measuredAt || s.pitchAt || null
  };
  // `name` alanı `label` ile AYNI tutulur (tek kaynak). Arayüz `name`,
  // şema `label` okuyor; ayrışırlarsa konuşmacı bağı kopar (v2.85).
  out.name = out.label;
  return out;
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

export function normalizeMaterial(src = {}) {
  const m = isObj(src) ? src : {};
  const tech = isObj(m.tech) ? m.tech : {};
  const origin = isObj(m.origin) ? m.origin : {};
  const speakers = assignSpeakerCodes((Array.isArray(m.speakers) ? m.speakers : []).map(normalizeSpeaker));
  const byLabel = new Map(speakers.map((s) => [s.label, s.id]));
  const segments = (Array.isArray(m.segments) ? m.segments : []).map((raw) => {
    const s = normalizeSegment(raw);
    if (!s.speakerId && s._legacySpeaker) {
      s.speakerId = byLabel.get(s._legacySpeaker) || '';
      delete s._legacySpeaker;
    }
    return s;
  });
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
    spectrogramReviewedAt: m.spectrogramReviewedAt || null,
    origin: {
      mediumType: pick(normalizeMediumType(origin.mediumType), MEDIUM_TYPE, 'unspecified'),
      mediumLabel: str(origin.mediumLabel),
      deliveredBy: str(origin.deliveredBy),
      // v2.212: beyaz liste; buraya yazılmayan alan ilk kaydetmede silinir.
      deliveredByRegistry: str(origin.deliveredByRegistry),
      deliveredAt: str(origin.deliveredAt),
      deliveryPlace: str(origin.deliveryPlace),
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

export function normalizeCase(src = {}) {
  const c = isObj(src) ? src : {};
  const parties = isObj(c.parties) ? c.parties : {};
  const assignment = isObj(c.assignment) ? c.assignment : {};
  const expert = isObj(c.expert) ? c.expert : {};
  const report = isObj(c.report) ? c.report : {};
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
      scope: str(assignment.scope || c.assignmentScope),
      body: str(assignment.body)
    },
    expert: {
      name: str(expert.name || c.expertName),
      registryNo: str(expert.registryNo || c.registryNo),
      field: str(expert.field || c.expertField) || '56.12'
    },
    team,
    speakers,
    report: {
      date: str(report.date || c.reportDate),
      methodText: str(report.methodText ?? c.methodText),
      limitationsText: str(report.limitationsText ?? c.limitationsText),
      conclusionText: str(report.conclusionText ?? c.conclusionText)
    },
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
  for (const k of ['court', 'fileNo', 'subject', 'caseDate', 'inspectionDate', 'reportType', 'status']) {
    mergeTextField(merged, mine, theirs, newer, k, applied, conflicts, k);
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

  // İç içe gruplar. Yardımcı bu alanları da doldurabilir/düzeltebilir.
  // v2.65: parties / expert / assignment alanları eksikti; yardımcının
  // doldurduğu davacı, davalı, bilirkişi adı, sicil no, tarihler sessizce
  // kayboluyordu. Artık hepsi birleştirmeye giriyor.
  for (const [group, keys] of [
    ['parties', ['plaintiff', 'plaintiffCounsel', 'defendant', 'defendantCounsel']],
    ['expert', ['name', 'registryNo', 'field']],
    ['assignment', ['date', 'dueDate', 'durationDays', 'scope', 'body']],
    ['report', ['date', 'methodText', 'limitationsText', 'conclusionText']]
  ]) {
    const mg = mine[group] || {};
    const tg = theirs[group] || {};
    merged[group] = merged[group] || {};
    for (const k of keys) mergeTextField(merged[group], mg, tg, newer, k, applied, conflicts, `${group}.${k}`);
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
  for (const k of ['court', 'fileNo', 'subject', 'caseDate', 'inspectionDate', 'reportType', 'status']) cmpField(null, k, k);
  for (const [g, keys] of [
    ['report', ['methodText', 'limitationsText', 'conclusionText']],
    ['assignment', ['scope', 'body']]
  ]) {
    for (const k of keys) cmpField(g, k, `${g}.${k}`);
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

  // Kaynağı tanımsız onaylar döngü sırasında `out.conflicts`'e eklenir; burada
  // yeniden atama onları SİLERDİ. Bu yüzden önce toplanır, sonra birleştirilir.
  out.conflicts = [
    ...out.segments.changed,
    ...out.questions.conflicts,
    ...out.caseFields.conflicts,
    ...out.speakers.conflicts,
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
