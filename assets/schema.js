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

/** Dosya (case) durumu. */
export const CASE_STATUS = ['draft', 'active', 'review', 'completed', 'archived'];

/** Kayıt (material) çözümleme durumu. */
export const MATERIAL_STATUS = [
  'pending', // İnceleme bekliyor
  'transcribing', // Çözümleme sürüyor
  'review', // Kontrol bekliyor
  'empty', // Çözümleme sonucu boş
  'partial', // Kısmen çözümlendi (iptal)
  'cancelled', // İptal edildi
  'error' // Çözümleme hatası
];

/** Bölüm kontrol durumu. */
export const REVIEW_STATE = ['pending', 'approved', 'inaudible', 'relisten'];

/** Konuşmacı rolü. */
export const SPEAKER_ROLE = ['unspecified', 'complainant', 'defendant', 'witness', 'expert', 'other'];

/** Konuşmacı cinsiyeti (uzman beyanı; tespit değil). */
export const SPEAKER_GENDER = ['unspecified', 'female', 'male', 'uncertain'];

/** Kayıt kökeni ortam türü. */
export const MEDIUM_TYPE = [
  'unspecified',
  'cd',
  'usb',
  'portable_disk',
  'disk_image',
  'email',
  'cloud',
  'memory_card',
  'phone',
  'other'
];

/** Bölüm gözlem işaretleri (anahtar → etiket arayüzde). */
export const OBS_KEYS = ['noise', 'overlap', 'inaudible', 'music'];

/** Rapor türü. */
export const REPORT_TYPE = ['hukuk', 'ceza', 'savcilik', 'icra'];

/** Ekip üyesi rolü (ortak çalışma). */
export const TEAM_ROLE = ['owner', 'expert', 'assistant', 'reviewer', 'observer'];

// ---- 3. Etiketler (arayüz metni; kod değişmeden değişebilir) --------------

export const STATUS_LABEL = {
  pending: 'İnceleme bekliyor',
  transcribing: 'Çözümleme sürüyor',
  review: 'Kontrol bekliyor',
  empty: 'Çözümleme sonucu boş',
  partial: 'Kısmen çözümlendi (iptal edildi)',
  cancelled: 'İptal edildi',
  error: 'Çözümleme hatası'
};

export const CASE_STATUS_LABEL = {
  draft: 'Taslak',
  active: 'İncelemede',
  review: 'Kontrolde',
  completed: 'Tamamlandı',
  archived: 'Arşivlendi'
};

export const REVIEW_LABEL = {
  pending: 'Kontrol bekliyor',
  approved: 'Onaylandı',
  inaudible: 'Anlaşılmadı',
  relisten: 'Yeniden dinlenecek'
};

export const SPEAKER_ROLE_LABEL = {
  unspecified: 'Belirtilmedi',
  complainant: 'Müşteki / Davacı',
  defendant: 'Şüpheli / Davalı',
  witness: 'Tanık',
  expert: 'Bilirkişi',
  other: 'Diğer'
};

export const SPEAKER_GENDER_LABEL = {
  unspecified: 'Belirtilmedi',
  female: 'Kadın',
  male: 'Erkek',
  uncertain: 'Belirsiz'
};

export const MEDIUM_TYPE_LABEL = {
  unspecified: 'Belirtilmedi',
  cd: 'CD / DVD',
  usb: 'USB flaş bellek',
  portable_disk: 'Taşınabilir disk',
  disk_image: 'Sabit disk / imaj',
  email: 'E-posta eki',
  cloud: 'Bulut / ağ paylaşımı',
  memory_card: 'Hafıza kartı',
  phone: 'Telefon',
  other: 'Diğer'
};

export const TEAM_ROLE_LABEL = {
  owner: 'Dosya sorumlusu',
  expert: 'Bilirkişi',
  assistant: 'Yardımcı',
  reviewer: 'Kontrol eden',
  observer: 'Gözlemci'
};

export const OBS_LABEL = {
  noise: 'arka plan gürültüsü',
  overlap: 'üst üste konuşma',
  inaudible: 'anlaşılmaz bölüm',
  music: 'müzik/ses efekti'
};

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
    label: '', // Uzmanın verdiği etiket ("Kiracı", "Ev sahibi")
    role: 'unspecified',
    gender: 'unspecified',
    ageRange: '',
    notes: '',
    // Ölçüm sonucu; ölçülmediyse null (0 değil — 0 Hz diye bir perde yok).
    pitchHz: null,
    pitchSamples: 0,
    measuredAt: null,
    ...over
  };
}

export function emptySegment(over = {}) {
  return {
    id: newId('sg'),
    start: '', // 'HH:MM:SS.mmm'
    end: '',
    speakerId: '', // speakers[].id — ad değil
    text: '',
    review: 'pending',
    obs: { noise: false, overlap: false, inaudible: false, music: false },
    history: [], // [{ text, at, actor }]
    silence: null, // analyzeSilence çıktısı
    words: [], // [{ t, d, w }] — kelime zamanlaması (varsa)
    ...over
  };
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
      deliveredAt: '',
      deviceInfo: ''
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
  const out = {
    ...s,
    id: s.id || newId('sg'),
    start: str(s.start),
    end: str(s.end),
    speakerId: str(s.speakerId),
    text: str(s.text),
    review: pick(s.review, REVIEW_STATE, 'pending'),
    obs: Object.fromEntries(OBS_KEYS.map((k) => [k, !!obs[k]])),
    history: Array.isArray(s.history)
      ? s.history.filter(isObj).map((h) => ({ text: str(h.text), at: str(h.at), actor: str(h.actor) }))
      : [],
    silence: isObj(s.silence) ? s.silence : null,
    words: Array.isArray(s.words) ? s.words.filter(isObj) : []
  };
  // v2 kalıntısı: `checked: true` → approved.
  if (!s.review && s.checked === true) out.review = 'approved';
  // v2 kalıntısı: `speaker` (ad) → konuşmacı listesinde eşleşen id.
  if (!out.speakerId && typeof s.speaker === 'string') out._legacySpeaker = s.speaker;
  return out;
}

export function normalizeSpeaker(src = {}) {
  const s = isObj(src) ? src : {};
  const out = {
    ...s,
    id: s.id || newId('sp'),
    label: str(s.label || s.name),
    role: pick(s.role, SPEAKER_ROLE, 'unspecified'),
    gender: pick(s.gender, SPEAKER_GENDER, 'unspecified'),
    ageRange: str(s.ageRange),
    notes: str(s.notes),
    pitchHz: Number.isFinite(Number(s.pitchHz ?? s.pitch)) ? Number(s.pitchHz ?? s.pitch) : null,
    pitchSamples: num(s.pitchSamples),
    measuredAt: s.measuredAt || s.pitchAt || null
  };
  return out;
}

export function normalizeMaterial(src = {}) {
  const m = isObj(src) ? src : {};
  const tech = isObj(m.tech) ? m.tech : {};
  const origin = isObj(m.origin) ? m.origin : {};
  const speakers = (Array.isArray(m.speakers) ? m.speakers : []).map(normalizeSpeaker);
  // Konuşmacı adı → id eşlemesi (v2 göçü için).
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
    status: pick(m.status, MATERIAL_STATUS, 'pending'),
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
      mediumType: pick(origin.mediumType, MEDIUM_TYPE, 'unspecified'),
      mediumLabel: str(origin.mediumLabel),
      deliveredBy: str(origin.deliveredBy),
      deliveredAt: str(origin.deliveredAt),
      deviceInfo: str(origin.deviceInfo)
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

// ---- 9. Birleştirme (ortak çalışma) --------------------------------------
// İki dosya kopyası birleştirilirken hangi tarafın kazandığı ve neyin
// çakıştığı açıkça raporlanır. Sessizce üzerine yazmak YOK.

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

  // Üst düzey skaler alanlar: gelen daha yeniyse onun değeri alınır.
  const newer = (theirs.updatedAt || '') > (mine.updatedAt || '');
  if (newer) {
    for (const k of ['court', 'fileNo', 'subject', 'caseDate', 'inspectionDate', 'reportType', 'status']) {
      if ((theirs[k] || '') !== (mine[k] || '') && (theirs[k] || '')) {
        merged[k] = theirs[k];
        applied.push(`${k}: gelen sürüm alındı`);
      }
    }
  }

  // Bölümler: id ile eşleşen kayıtlarda METİN çakışması ayrıca raporlanır.
  const myMats = new Map((merged.materials || []).map((m) => [m.id, m]));
  for (const tm of theirs.materials || []) {
    const mm = myMats.get(tm.id);
    if (!mm) {
      merged.materials.push(tm);
      applied.push(`kayıt eklendi: ${tm.fileName || tm.id}`);
      continue;
    }
    // Kayıt düzeyi: durum ve ölçüm gelen tarafta daha yeniyse alınır.
    if ((tm.transcribedAt || '') > (mm.transcribedAt || '')) {
      mm.status = tm.status;
      mm.segments = tm.segments;
      mm.transcribedWithModel = tm.transcribedWithModel;
      mm.transcribedAt = tm.transcribedAt;
      applied.push(`kayıt çözümlemesi güncellendi: ${tm.fileName || tm.id}`);
    } else {
      // Bölüm bazında birleştir.
      const mySegs = new Map((mm.segments || []).map((s) => [s.id, s]));
      for (const ts of tm.segments || []) {
        const ms = mySegs.get(ts.id);
        if (!ms) {
          mm.segments.push(ts);
          applied.push(`bölüm eklendi: ${ts.id}`);
          continue;
        }
        if ((ms.text || '') !== (ts.text || '')) {
          // İkisi de değişmişse çakışma; kullanıcı karar verir.
          conflicts.push({
            kind: 'segment-text',
            materialId: mm.id,
            segmentId: ms.id,
            mine: ms.text || '',
            theirs: ts.text || ''
          });
        }
        // Kontrol durumu ilerlemiş olanı al (pending < relisten < approved/inaudible).
        const rank = { pending: 0, relisten: 1, inaudible: 2, approved: 2 };
        if ((rank[ts.review] ?? 0) > (rank[ms.review] ?? 0)) {
          ms.review = ts.review;
          applied.push(`bölüm kontrolü güncellendi: ${ms.id}`);
        }
      }
    }
  }

  // Sorular: id ile eşleşir; cevap boşsa gelen doldurur.
  const myQs = new Map((merged.questions || []).map((q) => [q.id, q]));
  for (const tq of theirs.questions || []) {
    const mq = myQs.get(tq.id);
    if (!mq) {
      merged.questions.push(tq);
      applied.push(`soru eklendi: ${tq.id}`);
    } else if (!mq.answer && tq.answer) {
      mq.answer = tq.answer;
      mq.answeredBy = tq.answeredBy || '';
      applied.push(`soru cevabı alındı: ${tq.id}`);
    } else if (mq.answer && tq.answer && mq.answer !== tq.answer) {
      conflicts.push({ kind: 'question-answer', questionId: mq.id, mine: mq.answer, theirs: tq.answer });
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
    materials: { added: [], same: [], differ: [] },
    segments: { added: 0, changed: [], reviewAdvanced: 0 },
    questions: { added: 0, filled: 0, conflicts: [] },
    team: { added: [] },
    conflicts: []
  };
  if (!mine || !theirs) return empty;

  const label = (c) => `${c.fileNo || '—'} · ${c.court || '—'}`;
  const out = { ...empty, mineLabel: label(mine), theirsLabel: label(theirs) };
  out.sameFile = mine.id === theirs.id;

  const mineMats = new Map((mine.materials || []).map((m) => [m.id, m]));
  for (const tm of theirs.materials || []) {
    const mm = mineMats.get(tm.id);
    if (!mm) {
      out.materials.added.push({ id: tm.id, name: tm.fileName || tm.id, segments: (tm.segments || []).length });
      continue;
    }
    // Aynı kayıt: bölüm düzeyinde karşılaştır.
    const mineSegs = new Map((mm.segments || []).map((s) => [s.id, s]));
    let matDiffer = false;
    for (const ts of tm.segments || []) {
      const ms = mineSegs.get(ts.id);
      if (!ms) {
        out.segments.added++;
        matDiffer = true;
        continue;
      }
      const rank = { pending: 0, relisten: 1, inaudible: 2, approved: 2 };
      if ((ms.text || '') !== (ts.text || '')) {
        out.segments.changed.push({
          materialId: mm.id,
          materialName: mm.fileName || mm.id,
          segmentId: ms.id,
          mine: ms.text || '',
          theirs: ts.text || ''
        });
        matDiffer = true;
      }
      if ((rank[ts.review] ?? 0) > (rank[ms.review] ?? 0)) out.segments.reviewAdvanced++;
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
    if (!mq.answer && tq.answer) out.questions.filled++;
    else if (mq.answer && tq.answer && mq.answer !== tq.answer)
      out.questions.conflicts.push({ id: mq.id, question: mq.question || '', mine: mq.answer, theirs: tq.answer });
  }

  const mineTeam = new Set((mine.team || []).map((t) => t.id));
  for (const tt of theirs.team || []) {
    if (!mineTeam.has(tt.id)) out.team.added.push({ id: tt.id, name: tt.name || tt.id, role: tt.role });
  }

  out.conflicts = [...out.segments.changed, ...out.questions.conflicts];
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
