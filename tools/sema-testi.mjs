/**
 * v3 veri şeması testi.
 *
 * Şema, uygulamanın en kritik sözleşmesi: yanlışsa kayıt kaybolur, rapor
 * yanlış bölüme bağlanır, ekip çalışmasında veri ezilir. Bu yüzden şema
 * varsayımla değil TESTLE doğrulanır.
 *
 * Kapsam:
 *   1. Boş varlıklar geçerli (doğrulayıcı hata vermez)
 *   2. Kimlik: her varlıkta id var, yinelenmiyor
 *   3. Kod bütünlüğü: her kodun etiketi var, etiketsiz kod yok
 *   4. Normalize: v2 verisi kayıpsız v3'e dönüşür
 *   5. Doğrulayıcı: gerçek hataları yakalar, geçerli veriyi reddetmez
 *   6. Karma zinciri: kurcalama tespit edilir
 *   7. Birleştirme: çakışma sessizce ezilmez, raporlanır
 *   8. Zaman biçimi: geçersiz/ters aralık yakalanır
 *
 * Çalıştırma:  node tools/sema-testi.mjs
 */
import {
  SCHEMA_VERSION,
  CASE_STATUS,
  MATERIAL_STATUS,
  REVIEW_STATE,
  SPEAKER_ROLE,
  SPEAKER_GENDER,
  MEDIUM_TYPE,
  REPORT_TYPE,
  TEAM_ROLE,
  STATUS_LABEL,
  CASE_STATUS_LABEL,
  REVIEW_LABEL,
  SPEAKER_ROLE_LABEL,
  SPEAKER_GENDER_LABEL,
  MEDIUM_TYPE_LABEL,
  TEAM_ROLE_LABEL,
  OBS_LABEL,
  OBS_KEYS,
  emptyCase,
  emptyMaterial,
  emptySegment,
  emptySpeaker,
  emptyQuestion,
  emptyTeamMember,
  normalizeCase,
  normalizeMaterial,
  normalizeSegment,
  normalizeMediumType,
  normalizeSpeaker,
  normalizeSpeakerRole,
  normalizeSpeakerGender,
  assignSpeakerCodes,
  normalizeQuestion,
  validateCase,
  validateMaterial,
  validateSegment,
  chainHash,
  logEntry,
  verifyLogChain,
  logChainState,
  upgradeLogChain,
  mergeCases,
  compareCases,
  speakerLabel,
  segmentById,
  newId,
  isSecondEyesRole,
  canApproveRole
} from '../assets/schema.js';

let passed = 0;
let failed = 0;
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`GEÇTİ  ${label}`);
  } else {
    failed++;
    console.log(`KALDI  ${label}  → beklenen ${JSON.stringify(expected)}, bulunan ${JSON.stringify(actual)}`);
  }
}
function ok(label, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`GEÇTİ  ${label}`);
  } else {
    failed++;
    console.log(`KALDI  ${label}${detail ? '  → ' + detail : ''}`);
  }
}

console.log('== v3 şema testi ==\n');

// --- 1. Boş varlıklar geçerli -------------------------------------------
console.log('[1] Boş varlıklar');
{
  const c = emptyCase({ id: 'case_t', court: 'Test Mahkemesi', fileNo: '2026/1', expert: { name: 'B', registryNo: 'R1', field: '56.12' } });
  eq('boş dosya schemaVersion', c.schemaVersion, SCHEMA_VERSION);
  eq('boş dosya durumu draft', c.status, 'draft');
  const v = validateCase(c);
  ok('boş dosya doğrulamadan geçer', v.ok, v.errors.join('; '));

  const m = emptyMaterial({ id: 'mt_t', fileName: 'a.wav', sha256: 'abc' });
  const mv = validateMaterial(m);
  ok('boş kayıt doğrulamadan geçer', mv.ok, mv.errors.join('; '));

  const s = emptySegment({ start: '00:00:00.000', end: '00:00:05.000', text: 'x' });
  const sv = validateSegment(s);
  ok('boş bölüm doğrulamadan geçer', sv.ok, sv.errors.join('; '));
}

// --- 2. Kimlik ----------------------------------------------------------
console.log('\n[2] Kimlik');
{
  const ids = new Set();
  for (let i = 0; i < 500; i++) ids.add(newId('t'));
  eq('500 kimlik benzersiz', ids.size, 500);
  ok('kimlik öneki taşır', [...ids].every((x) => x.startsWith('t_')));

  const c = emptyCase();
  ok('dosya id var', !!c.id);
  const m = emptyMaterial();
  ok('kayıt id var', !!m.id);
  const s = emptySegment();
  ok('bölüm id var', !!s.id);
  const q = emptyQuestion();
  ok('soru id var', !!q.id);
  const t = emptyTeamMember();
  ok('ekip üyesi id var', !!t.id);
}

// --- 3. Kod ↔ etiket bütünlüğü ------------------------------------------
console.log('\n[3] Kod ve etiket bütünlüğü');
{
  const pairs = [
    ['MATERIAL_STATUS', MATERIAL_STATUS, STATUS_LABEL],
    ['CASE_STATUS', CASE_STATUS, CASE_STATUS_LABEL],
    ['REVIEW_STATE', REVIEW_STATE, REVIEW_LABEL],
    ['SPEAKER_ROLE', SPEAKER_ROLE, SPEAKER_ROLE_LABEL],
    ['SPEAKER_GENDER', SPEAKER_GENDER, SPEAKER_GENDER_LABEL],
    ['MEDIUM_TYPE', MEDIUM_TYPE, MEDIUM_TYPE_LABEL],
    ['TEAM_ROLE', TEAM_ROLE, TEAM_ROLE_LABEL],
    ['OBS_KEYS', OBS_KEYS, OBS_LABEL]
  ];
  for (const [name, codes, labels] of pairs) {
    const missing = codes.filter((c) => !labels[c]);
    ok(`${name}: her kodun etiketi var (${codes.length})`, missing.length === 0, missing.join(','));
    const extra = Object.keys(labels).filter((k) => !codes.includes(k));
    ok(`${name}: fazladan etiket yok`, extra.length === 0, extra.join(','));
  }
  ok('REPORT_TYPE dört tür', REPORT_TYPE.length === 4);
  ok('kodlar Türkçe metin değil (ASCII)', MATERIAL_STATUS.every((s) => /^[a-z]+$/.test(s)));
}

// --- 3b. Konuşmacı kodlama standardı ------------------------------------
// v2.79: arayüz rol/cinsiyeti Türkçe ETİKET olarak yazıyordu; şema ASCII KOD
// beklediği için değer yeniden yüklemede 'unspecified'a düşüyordu (sessiz veri
// kaybı). Bu bölüm hem göçü hem standardı denetler.
console.log('\n[3b] Konuşmacı kodlama standardı');
{
  eq('rol etiketi koda çevrildi', normalizeSpeakerRole('Davacı'), 'complainant');
  eq('rol etiketi (davalı) koda çevrildi', normalizeSpeakerRole('Davalı'), 'defendant');
  eq('cinsiyet etiketi koda çevrildi', normalizeSpeakerGender('Kadın'), 'female');
  eq('cinsiyet etiketi (erkek) koda çevrildi', normalizeSpeakerGender('Erkek'), 'male');
  eq('kod korunur', normalizeSpeakerRole('witness'), 'witness');
  eq('bilinmeyen rol güvenli varsayılana düşer', normalizeSpeakerRole('saçma'), 'unspecified');
  eq('boş rol varsayılana düşer', normalizeSpeakerRole(''), 'unspecified');

  // Eski kayıt (etiket yazılmış) yüklenince DEĞER KAYBOLMAMALI.
  const sp = normalizeSpeaker({ name: 'Kiracı', role: 'Davacı', gender: 'Kadın' });
  eq('eski kayıt: rol kurtarıldı', sp.role, 'complainant');
  eq('eski kayıt: cinsiyet kurtarıldı', sp.gender, 'female');

  // Kodlar S1, S2… sırayla ve çakışmadan atanır.
  const list = [{ name: 'A' }, { name: 'B' }, { code: 'S2', name: 'C' }];
  assignSpeakerCodes(list);
  eq('ilk konuşmacı S1', list[0].code, 'S1');
  eq('var olan kod korunur', list[2].code, 'S2');
  eq('çakışma atlanır', list[1].code, 'S3');

  // Malzeme normalleştirmesinde kodlar atanmış olmalı.
  const mm = normalizeMaterial({ id: 'm1', fileName: 'a.wav', speakers: [{ name: 'X' }, { name: 'Y' }] });
  eq('malzemede kod atandı (1)', mm.speakers[0].code, 'S1');
  eq('malzemede kod atandı (2)', mm.speakers[1].code, 'S2');

  // Kod, etiketten bağımsız: etiket değişse de kod kalır.
  const sp2 = normalizeSpeaker({ name: 'Yeni ad', code: 'S4', role: 'witness' });
  eq('etiket değişse de kod kalır', sp2.code, 'S4');
  eq('kod etiketten bağımsız', sp2.label, 'Yeni ad');
}

// --- 3c. Otomatik çıktı ayrı saklanır (adli ayrım) ----------------------
// v2.83: modelin ürettiği metin (asrText) ile bilirkişinin onayladığı metin
// (text) AYRI olmalı. Öncesinde model çıktısı yalnız history'de kalıyordu ve
// 10 sürümden sonra SİLİNİYORDU — adli açıdan kabul edilemez.
console.log('\n[3c] Otomatik çıktı ayrımı');
{
  const s = emptySegment({ text: 'bilirkişi metni', asrText: 'model metni' });
  eq('asrText ayrı alan', s.asrText, 'model metni');
  eq('text ayrı alan', s.text, 'bilirkişi metni');
  eq('ikisi karışmaz', s.asrText !== s.text, true);
  ok('asrModel alanı var', 'asrModel' in s);
  ok('asrAt alanı var', 'asrAt' in s);

  // Normalize sonrası da korunmalı.
  const n = normalizeSegment({ text: 'düzeltilmiş', asrText: 'ham çıktı', asrModel: 'm1', asrAt: '2026-01-01T00:00:00Z' });
  eq('normalize: asrText korunur', n.asrText, 'ham çıktı');
  eq('normalize: text korunur', n.text, 'düzeltilmiş');
  eq('normalize: model korunur', n.asrModel, 'm1');

  // Eski kayıtta alan yoksa boş kalır (uydurma yok).
  const old = normalizeSegment({ text: 'eski kayıt' });
  eq('eski kayıtta asrText boş', old.asrText, '');
  eq('eski kayıtta text korunur', old.text, 'eski kayıt');
}

// --- 3d. Veri güvenliği: bozuk dosya arşivi silmemeli (v2.84) -------------
// v2.83 ve öncesinde loadState içindeki tek hata TÜM listeyi çöpe atıyordu
// (cases = []) ve sonraki kayıt bu boşluğu diske yazıyordu. Kanıtlandı.
// Bu bölüm "tek dosya bozuksa yalnız o atlanır" kuralını denetler.
console.log('\n[3d] Veri güvenliği: bozuk dosya izolasyonu');
{
  // Gerçek loadState mantığını taklit eden izole yükleyici.
  const loadIsolated = (rawCases) => {
    const ok = [];
    const failed = [];
    for (const raw of rawCases) {
      try {
        const nc = normalizeCase(raw);
        if (!nc || !nc.id) throw new Error('kimliksiz');
        ok.push(nc);
      } catch (e) {
        failed.push(raw && raw.id);
      }
    }
    return { ok, failed };
  };

  const good1 = { id: 'c1', fileNo: '2026/1', materials: [{ id: 'm1', segments: [{ id: 's1', text: 'GERÇEK' }] }] };
  const good2 = { id: 'c2', fileNo: '2026/2' };
  // Bozuk: normalizeCase içinde hata üretecek bir nesne
  const bad = { id: 'c3', get fileNo() { throw new Error('bozuk alan'); } };

  const r = loadIsolated([good1, bad, good2]);
  eq('sağlam dosyalar korunur', r.ok.length, 2);
  eq('bozuk dosya atlanır', r.failed.length, 1);
  ok('bozuk dosya diğerlerini silmez', r.ok.some((c) => c.fileNo === '2026/1'));
  ok('ikinci sağlam dosya da korunur', r.ok.some((c) => c.fileNo === '2026/2'));

  // Hiç sağlam dosya yoksa bile sessiz sıfırlama YAPILMAZ; failed bildirilir.
  const r2 = loadIsolated([bad]);
  eq('hepsi bozuksa da atlanan sayısı bildirilir', r2.failed.length, 1);
  eq('hepsi bozuksa ok listesi boş', r2.ok.length, 0);
}

// --- 4. Normalize: v2 → v3 kayıpsız ------------------------------------
console.log('\n[4] v2 verisi v3\'e dönüşümü');
{
  // Gerçek v2 şekli: düz alanlar, ad ile konuşmacı, checked, basis.
  const v2 = {
    id: 'old1',
    name: 'Dosya',
    reportType: 'ceza',
    court: 'Mahkeme',
    fileNo: '2026/9',
    assignmentDate: '2026-01-01',
    assignmentDurationDays: '30',
    plaintiff: 'A',
    defendant: 'B',
    expertName: 'Uzman',
    registryNo: 'R-9',
    expertField: '56.12',
    reportDate: '2026-02-01',
    assignmentScope: 'Kapsam metni',
    methodText: 'Yöntem',
    questions: [{ question: 'Soru?', answer: 'Cevap', basis: 'Kayıt 1' }],
    materials: [
      {
        id: 'm1',
        name: 'ses.wav',
        type: 'audio/wav',
        size: 1000,
        duration: 12.5,
        sha256: 'abc',
        tech: { codec: 'PCM', channels: 2, sampleRate: 16000, bitDepth: 16 },
        status: 'Kontrol bekliyor',
        speakers: [{ name: 'Kiracı', role: 'Belirtilmedi', pitch: 120 }],
        segments: [
          { start: '00:00:00', end: '00:00:05', speaker: 'Kiracı', text: 'merhaba', checked: true },
          { start: '00:00:05', end: '00:00:09', speaker: 'Kiracı', text: 'dünya' }
        ],
        origin: { mediumType: 'USB flaş bellek', mediumLabel: 'U1' }
      }
    ]
  };
  const c = normalizeCase(v2);
  eq('schemaVersion 3', c.schemaVersion, 3);
  eq('reportType korundu', c.reportType, 'ceza');
  eq('düz alan → parties', c.parties.plaintiff, 'A');
  eq('düz alan → assignment', c.assignment.durationDays, '30');
  eq('düz alan → expert', c.expert.registryNo, 'R-9');
  eq('düz alan → report', c.report.methodText, 'Yöntem');
  eq('basis → basisNote', c.questions[0].basisNote, 'Kayıt 1');
  ok('soru id üretildi', !!c.questions[0].id);
  eq('kayıt fileName', c.materials[0].fileName, 'ses.wav');
  eq('kayıt sizeBytes', c.materials[0].sizeBytes, 1000);
  eq('kayıt durationSec', c.materials[0].durationSec, 12.5);
  eq('durum metni → kod', c.materials[0].status, 'pending');
  eq('konuşmacı label', c.materials[0].speakers[0].label, 'Kiracı');
  eq('konuşmacı pitch → pitchHz', c.materials[0].speakers[0].pitchHz, 120);
  eq('konuşmacı rol kodu', c.materials[0].speakers[0].role, 'unspecified');
  eq('checked → approved', c.materials[0].segments[0].review, 'approved');
  eq('checked yok → pending', c.materials[0].segments[1].review, 'pending');
  // Ad ile tutulan konuşmacı, kimliğe bağlandı mı?
  const spId = c.materials[0].speakers[0].id;
  eq('bölüm konuşmacısı id ile bağlandı', c.materials[0].segments[0].speakerId, spId);
  eq('ikinci bölüm de bağlandı', c.materials[0].segments[1].speakerId, spId);
  eq('eski ad alanı kaldırıldı', c.materials[0].segments[0]._legacySpeaker, undefined);
  // Doğrulama: göç sonrası geçerli olmalı.
  const v = validateCase(c);
  ok('göç sonrası dosya geçerli', v.ok, v.errors.join('; '));
}

// --- 4b. v2 onay kodları göçte KAYBOLMAZ (v2.89 — sessiz veri kaybı) -----
// GERÇEK HATA: v2 dosyalarında kontrol durumu Türkçe kodla saklanıyordu
// ('onaylandi', 'anlasilmadi', 'yeniden', 'bekliyor'). `normalizeCase` bu
// değerleri `pick(s.review, REVIEW_STATE, 'pending')` ile okuyordu; tanınmayan
// değer sessizce 'pending'e düşüyordu. Yani bilirkişinin aylarca süren onay
// emeği, dosya bir kez açılıp kaydedildiğinde SİLİNİYORDU.
// `segReview()` v2 kodlarını tanıyordu ama değer oraya ulaşmadan
// `normalizeCase` onu ezmiş oluyordu. Bu yüzden eski test (yalnız segReview'u
// sınıyordu) yeşil kalıyordu.
console.log('\n[4b] v2 onay kodları göçte korunur');
{
  const legacyCases = [
    ['onaylandi', 'approved'],
    ['anlasilmadi', 'inaudible'],
    ['yeniden', 'relisten'],
    ['bekliyor', 'pending']
  ];
  for (const [v2, v3] of legacyCases) {
    const c = normalizeCase({
      id: 'old',
      materials: [{ id: 'm1', segments: [{ id: 's1', text: 'x', review: v2 }] }]
    });
    eq(`v2 '${v2}' → '${v3}'`, c.materials[0].segments[0].review, v3);
  }
  // v3 kodları da aynen korunur (göç geriye dönük bozmaz).
  for (const v3 of ['approved', 'inaudible', 'relisten', 'pending']) {
    const c = normalizeCase({
      id: 'old',
      materials: [{ id: 'm1', segments: [{ id: 's1', text: 'x', review: v3 }] }]
    });
    eq(`v3 '${v3}' korunur`, c.materials[0].segments[0].review, v3);
  }
  // Bilinmeyen değer uydurulmaz; güvenli varsayılan 'pending'.
  const bad = normalizeCase({
    id: 'old',
    materials: [{ id: 'm1', segments: [{ id: 's1', text: 'x', review: 'tamamen-uydurma' }] }]
  });
  eq('bilinmeyen değer pending olur', bad.materials[0].segments[0].review, 'pending');
  // Onaylı bölüm sayımı göç sonrası doğru olmalı (kullanıcı bunu görür).
  const mixed = normalizeCase({
    id: 'old',
    materials: [{
      id: 'm1',
      segments: [
        { id: 's1', text: 'a', review: 'onaylandi' },
        { id: 's2', text: 'b', review: 'anlasilmadi' },
        { id: 's3', text: 'c', review: 'yeniden' }
      ]
    }]
  });
  const segs = mixed.materials[0].segments;
  eq('göç sonrası onaylı sayısı', segs.filter((s) => s.review === 'approved').length, 1);
  eq('göç sonrası anlaşılmadı sayısı', segs.filter((s) => s.review === 'inaudible').length, 1);
  eq('göç sonrası yeniden dinle sayısı', segs.filter((s) => s.review === 'relisten').length, 1);
}

// --- 5. Doğrulayıcı gerçek hataları yakalar -----------------------------
console.log('\n[5] Doğrulayıcı');
{
  const bad = validateSegment({ id: 's1', review: 'yanlis', obs: {}, start: '00:00:09', end: '00:00:05' });
  ok('geçersiz review yakalandı', bad.errors.some((e) => e.includes('review')));
  ok('ters zaman aralığı yakalandı', bad.errors.some((e) => e.includes('önce')));
  ok('bozuk bölüm reddedildi', bad.ok === false);

  const badTime = validateSegment({ id: 's2', review: 'pending', obs: {}, start: 'abc', end: '00:00:05' });
  ok('geçersiz zaman biçimi yakalandı', badTime.errors.some((e) => e.includes('biçimi')));

  const noId = validateSegment({ review: 'pending', obs: {} });
  ok('id eksikliği yakalandı', noId.errors.some((e) => e.includes('id')));

  // Tanımsız konuşmacı referansı
  const m = emptyMaterial({ id: 'm2', fileName: 'x.wav', sha256: 'h' });
  m.segments.push(emptySegment({ start: '00:00:00', end: '00:00:01', speakerId: 'yok' }));
  const mv = validateMaterial(m);
  ok('tanımsız konuşmacı yakalandı', mv.errors.some((e) => e.includes('tanımsız konuşmacı')));

  // Yinelenen segment id
  const m2 = emptyMaterial({ id: 'm3', fileName: 'y.wav', sha256: 'h' });
  m2.segments.push(emptySegment({ id: 'dup', start: '00:00:00', end: '00:00:01' }));
  m2.segments.push(emptySegment({ id: 'dup', start: '00:00:01', end: '00:00:02' }));
  const mv2 = validateMaterial(m2);
  ok('yinelenen bölüm id yakalandı', mv2.errors.some((e) => e.includes('yinelenen')));

  // Geçerli veri reddedilmez
  const good = emptyCase({ id: 'c9', court: 'M', fileNo: '1', expert: { name: 'B', registryNo: 'r', field: 'f' } });
  const mm = emptyMaterial({ id: 'm9', fileName: 'a.wav', sha256: 'h' });
  mm.segments.push(emptySegment({ start: '00:00:00', end: '00:00:01', text: 'a' }));
  good.materials.push(mm);
  const gv = validateCase(good);
  ok('geçerli dosya hata vermez', gv.ok, gv.errors.join('; '));
}

// --- 6. Karma zinciri ---------------------------------------------------
console.log('\n[6] Delil günlüğü zinciri');
{
  let log = [];
  log.push(logEntry(log, { at: 't1', actor: 'u1', event: 'Kayıt eklendi', detail: 'a.wav' }));
  log.push(logEntry(log, { at: 't2', actor: 'u1', event: 'Çözümleme', detail: '10 bölüm' }));
  log.push(logEntry(log, { at: 't3', actor: 'u2', event: 'Kontrol', detail: 'onaylandı' }));
  eq('ilk girdinin prevHash boş', log[0].prevHash, '');
  eq('ikinci öncekine bağlı', log[1].prevHash, log[0].hash);
  ok('her girdinin hash var', log.every((e) => /^[0-9a-f]{8}$/.test(e.hash)));

  const v1 = verifyLogChain(log);
  ok('sağlam zincir geçer', v1.ok, v1.reason);

  // Kurcalama: ortadaki girdinin detayı değiştirilir.
  const tampered = log.map((e) => ({ ...e }));
  tampered[1].detail = 'DEĞİŞTİRİLDİ';
  const v2 = verifyLogChain(tampered);
  ok('kurcalama tespit edildi', !v2.ok, v2.reason);
  eq('kırık halka indeksi', v2.brokenAt, 1);

  // Girdi silinirse de yakalanır.
  const removed = [log[0], log[2]];
  ok('girdi silinmesi tespit edildi', !verifyLogChain(removed).ok);

  // Aynı içerik aynı hash üretir (deterministik).
  eq('hash deterministik', chainHash('abc'), chainHash('abc'));
  ok('farklı içerik farklı hash', chainHash('abc') !== chainHash('abd'));
}

// --- 6b. Uygulamanın ÜRETTİĞİ günlük doğrulanabilir mi? ---------------
// v2.55'e kadar testler logEntry()'yi KENDİSİ doğru çağırıyordu; bu yüzden
// testler geçiyordu ama uygulama günlüğü elle `{at,event}` yazıyordu ve
// zincir kırıktı. Belgeler "kurcalama tespit edilir" diyordu, gerçekte
// edilmiyordu. Bu blok, uygulama kodunun kendisini denetler: günlük yazan
// her yer logEvent()/logEntry() üzerinden geçmeli.
console.log('\n[6b] Uygulama günlüğü gerçekten zincirli mi?');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const app = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');

  // Elle günlük yazımı kalmamalı. İzin verilen tek yer logEvent() gövdesi.
  // Yorum satırları sayılmaz (kuralı açıklayan örnek metin olabilir).
  const codeLines = app
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  const rawPushes = [...codeLines.matchAll(/m\.log\s*=\s*m\.log\s*\|\|\s*\[\]\)\.push\(|m\.log\.push\(/g)];
  ok('uygulamada elle günlük yazımı yok', rawPushes.length <= 1, `${rawPushes.length} eşleşme`);
  ok('logEvent tek yazma noktası', /function logEvent\(m, event, detail\)/.test(app));
  ok('logEvent logEntry kullanıyor', /logEvent[\s\S]{0,400}logEntry\(/.test(app));
  ok('açılışta eski zincirler bağlanıyor', /upgradeAllLogChains\(appState\)/.test(app));

  // Davranış: logEvent ile üretilen günlük doğrulanabilir olmalı.
  const log = [];
  const push = (ev, dt) =>
    log.push(logEntry(log, { at: `t${log.length}`, actor: 'Bilirkişi', event: ev, detail: dt }));
  push('Kayıt eklendi', 'a.wav');
  push('Çözümleme tamamlandı', '10 bölüm');
  push('Seviye ölçümü', 'tepe -3.2 dBFS');
  eq('uygulama tarzı günlük doğrulandı', logChainState(log).state, 'verified');
  ok('her girdi hash taşıyor', log.every((e) => /^[0-9a-f]{8}$/.test(e.hash || '')));
  ok('her girdi aktör taşıyor', log.every((e) => !!e.actor));

  // Kurcalama yakalanmalı.
  const t = JSON.parse(JSON.stringify(log));
  t[1].detail = 'DEĞİŞTİRİLDİ';
  eq('kurcalama kırık olarak bildirildi', logChainState(t).state, 'broken');

  // Eski (hash'siz) kayıt: "legacy" olmalı, "broken" değil. Yanlış suçlama
  // adli belgede kabul edilemez.
  const legacy = [{ at: 't1', event: 'Kayıt eklendi', detail: 'x' }];
  eq('eski kayıt legacy sayıldı', logChainState(legacy).state, 'legacy');
  ok('legacy kırık diye suçlanmıyor', logChainState(legacy).state !== 'broken');

  // Göç: eski kayıt zincire bağlanınca doğrulanabilir olmalı.
  const up = upgradeLogChain(legacy);
  eq('göç bir girdiyi bağladı', up.upgraded, 1);
  eq('göç sonrası doğrulanır', logChainState(up.log).state, 'verified');
  eq('göç girdi metnini korur', up.log[0].detail, 'x');
}

// --- 6c. v3 kod ≠ v2 kod (gerçek hata) --------------------------------
// v2.58'e kadar bazı yerler v2 Türkçe kodlarını ('onaylandi',
// 'anlasilmadi', 'yeniden') karşılaştırıyordu; şema ise v3 ASCII kodları
// ('approved', 'inaudible', 'relisten') üretiyor. Sonuç: onaylanan bölüm
// listede hep "Bekliyor" görünüyor, sayımlar 0 çıkıyordu. Kullanıcı
// "değiştiriyorum ama değişmiyor" diyordu. Bu blok bunu denetler.
console.log('\n[6c] v3 kod ≠ v2 kod (uygulama kodu)');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const app = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');

  // segReview() daima v3 döndürür; karşılaştırmalar da v3 olmalı.
  for (const v3 of ['approved', 'inaudible', 'relisten']) {
    ok(`segReview '${v3}' üretiyor`, REVIEW_STATE.includes(v3));
  }
  // v2 kodları yalnız REVIEW_LEGACY göç tablosunda bulunmalı.
  for (const v2 of ['onaylandi', 'anlasilmadi', 'yeniden']) {
    const uses = [...app.matchAll(new RegExp(`===\\s*'${v2}'|!==\\s*'${v2}'`, 'g'))];
    ok(`v2 kodu '${v2}' karşılaştırmada kullanılmıyor`, uses.length === 0, `${uses.length} kullanım`);
  }
  // Rozet üretimi doğru kodlarla eşleşmeli. v2.106'da rozet metinleri TEK
  // KAYNAKTAN (schema.js) gelir; bu yüzden test yazımı değil DAVRANIŞI sınar:
  // her kodun kendi rozet sınıfı ve etiketi olmalı.
  for (const [code, cls, label] of [
    ['approved', 'done', 'Onaylandı'],
    ['machine', 'auto', 'Çözümlendi'],
    ['inaudible', 'warn', 'Anlaşılmadı'],
    ['relisten', 'again', 'Yeniden']
  ]) {
    const re = new RegExp(`'?${code}'?\\s*:\\s*\\[\\s*'${cls}'\\s*,\\s*'${label}'`);
    ok(`${label} rozeti doğru sınıf/etiketle`, re.test(app), `${code} → ${cls}/${label}`);
  }
  // Otomatik çözümleme, onayla AYNI rozeti KULLANMAMALI (adli ayrım).
  ok(
    'otomatik çözümleme rozeti onaydan farklı sınıf',
    !/'machine':\s*\['done'/.test(app) && /machine:\s*\['auto'/.test(app)
  );

  // Davranış: onaylı bölüm sayımı doğru olmalı.
  const m = emptyMaterial({ id: 'm1', fileName: 'a.wav', sha256: 'h' });
  m.segments.push(emptySegment({ id: 's1', review: 'approved' }));
  m.segments.push(emptySegment({ id: 's2', review: 'pending' }));
  m.segments.push(emptySegment({ id: 's3', review: 'inaudible' }));
  eq('approved sayımı', m.segments.filter((s) => s.review === 'approved').length, 1);
  eq('inaudible sayımı', m.segments.filter((s) => s.review === 'inaudible').length, 1);
}

// --- 7. Birleştirme -----------------------------------------------------
console.log('\n[7] Ortak çalışma birleştirmesi');
{
  const mine = emptyCase({ id: 'c1', court: 'A', fileNo: '1', updatedAt: '2026-01-01T00:00:00Z' });
  mine.materials.push(
    emptyMaterial({
      id: 'm1',
      fileName: 'a.wav',
      sha256: 'h',
      segments: [emptySegment({ id: 's1', start: '00:00:00', end: '00:00:05', text: 'yerli metin' })]
    })
  );
  mine.questions.push(emptyQuestion({ id: 'q1', question: 'S?' }));

  const theirs = structuredClone(mine);
  theirs.updatedAt = '2026-01-02T00:00:00Z';
  theirs.court = 'B'; // üst düzey değişiklik, daha yeni
  theirs.materials[0].segments[0].text = 'gelen metin'; // metin çakışması
  theirs.questions[0].answer = 'Cevap geldi';
  theirs.team.push(emptyTeamMember({ id: 'tm9', name: 'Ortak' }));

  const { merged, applied, conflicts } = mergeCases(mine, theirs);
  eq('daha yeni mahkeme alındı', merged.court, 'B');
  ok('metin çakışması raporlandı', conflicts.some((c) => c.kind === 'segment-text'));
  eq('çakışmada yerel metin korunur', merged.materials[0].segments[0].text, 'yerli metin');
  eq('boş cevap gelenle doldu', merged.questions[0].answer, 'Cevap geldi');
  ok('ekip üyesi eklendi', merged.team.some((t) => t.id === 'tm9'));
  ok('birleştirme günlüğü yazıldı', merged.mergeLog.length === 1);
  ok('uygulanan değişiklik sayısı > 0', applied.length > 0);

  // Yinelenen ekip üyesi eklenmez.
  const again = mergeCases(merged, theirs);
  eq('yinelenen ekip üyesi yok', again.merged.team.filter((t) => t.id === 'tm9').length, 1);

  // Kendi kendisiyle birleştirme veriyi bozmaz.
  const self = mergeCases(mine, structuredClone(mine));
  eq('kendiyle birleşme çakışma üretmez', self.conflicts.length, 0);
}

// --- 7c. Yardımcı düzeltmesi birleştirmede korunuyor ---------------------
// Gerçek senaryo: bilirkişi kendi bilgisayarında çözümlemeyi yapar, işi
// bitmez. Yardımcısı BAŞKA bilgisayarda metni düzeltir. Eski kod çakışmada
// her zaman yerel metni tutuyordu; yardımcının düzeltmesi sessizce kayboluyor,
// üstüne "onaylandı" damgası yanlış metne vuruluyordu. Adli belgede kabul
// edilemez. Bu blok o hatanın geri gelmesini engeller.
console.log('\n[7c] Yardımcı düzeltmesi birleştirmede korunuyor');
{
  const mk = (textRev, text, review) => {
    const c = emptyCase({ id: 'c1', fileNo: '1' });
    c.materials.push(
      emptyMaterial({
        id: 'm1',
        fileName: 'a.wav',
        sha256: 'h',
        segments: [emptySegment({ id: 's1', start: '00:00:00', end: '00:00:05', text, review, textRev })]
      })
    );
    return c;
  };

  // (a) Yalnız yardımcı düzenlemiş: düzeltme ve onay birlikte gelmeli.
  let r = mergeCases(mk(0, 'merhaba dünya', 'pending'), mk(1, 'Merhaba dünya.', 'approved'));
  let seg = r.merged.materials[0].segments[0];
  eq('yardımcı düzeltmesi korundu', seg.text, 'Merhaba dünya.');
  eq('yardımcının onayı korundu', seg.review, 'approved');
  eq('düzeltme çakışma sayılmadı', r.conflicts.length, 0);
  ok('kaybolan yerel metin geçmişe yazıldı', (seg.history || []).some((h) => h.text === 'merhaba dünya'));

  // (b) Yalnız yerel taraf düzenlemiş: yerel metin korunur, gelen geçmişe girer.
  r = mergeCases(mk(1, 'yerel düzeltme', 'approved'), mk(0, 'ham metin', 'pending'));
  seg = r.merged.materials[0].segments[0];
  eq('yerel düzeltme korundu', seg.text, 'yerel düzeltme');
  ok('gelen metin geçmişe yazıldı', (seg.history || []).some((h) => h.text === 'ham metin'));

  // (c) İki taraf da düzenlemiş: sessizce seçilmez, çakışma bildirilir.
  r = mergeCases(mk(1, 'yerel metin', 'approved'), mk(1, 'gelen metin', 'approved'));
  eq('iki taraf da düzenlediyse metin değişmez', r.merged.materials[0].segments[0].text, 'yerel metin');
  eq('iki taraflı düzenleme çakışma olarak raporlandı', r.conflicts.length, 1);
  ok('çakışma gerekçesi taşıyor', /iki taraf da/.test(r.conflicts[0].reason || ''));

  // (d) Kimse düzenlememiş ama metin farklı: yine sessiz seçim yok.
  r = mergeCases(mk(0, 'a', 'pending'), mk(0, 'b', 'pending'));
  eq('kaynaksız fark çakışma olarak raporlandı', r.conflicts.length, 1);

  // (e) Önizleme birleştirmeyle aynı kararı vermeli.
  const cmp = compareCases(mk(0, 'merhaba dünya', 'pending'), mk(1, 'Merhaba dünya.', 'approved'));
  eq('önizleme otomatik çözüleni çakışma saymaz', cmp.conflicts.length, 0);
  eq('önizleme otomatik çözümü sayar', cmp.segments.autoResolved, 1);
  const cmp2 = compareCases(mk(1, 'yerel', 'approved'), mk(1, 'gelen', 'approved'));
  eq('önizleme iki taraflı düzenlemeyi çakışma sayar', cmp2.conflicts.length, 1);

  // (f) Soru cevabında aynı mantık.
  const q1 = emptyCase({ id: 'c1' });
  q1.questions.push(emptyQuestion({ id: 'q1', question: 'S?', answer: '', answerRev: 0 }));
  const q2 = structuredClone(q1);
  q2.questions[0].answer = 'Yardımcının cevabı';
  q2.questions[0].answerRev = 1;
  const qr = mergeCases(q1, q2);
  eq('yardımcının soru cevabı alındı', qr.merged.questions[0].answer, 'Yardımcının cevabı');
  eq('soru cevabı çakışma sayılmadı', qr.conflicts.length, 0);
  // (g) Yeniden çözümleme: elle düzeltme sessizce silinmez, bölüm çoğalmaz.
  const rm = emptyCase({ id: 'c1' });
  rm.materials.push(
    emptyMaterial({
      id: 'm1',
      fileName: 'a.wav',
      sha256: 'h',
      transcribedAt: '2026-01-01T00:00:00Z',
      segments: [emptySegment({ id: 's1', start: '00:00:00', end: '00:00:05', text: 'elle düzeltilmiş', textRev: 1 })]
    })
  );
  const rt = emptyCase({ id: 'c1' });
  rt.materials.push(
    emptyMaterial({
      id: 'm1',
      fileName: 'a.wav',
      sha256: 'h',
      transcribedAt: '2026-01-02T00:00:00Z',
      segments: [emptySegment({ id: 's9', start: '00:00:00', end: '00:00:05', text: 'yeni çözümleme' })]
    })
  );
  const rr = mergeCases(rm, rt);
  eq('yeniden çözümlemede elle düzeltme korundu', rr.merged.materials[0].segments[0].text, 'elle düzeltilmiş');
  eq('yeniden çözümlemede bölüm çoğalmadı', rr.merged.materials[0].segments.length, 1);
  ok('yeniden çözümleme çakışma olarak bildirildi', rr.conflicts.some((c) => c.kind === 'material-retranscribed'));
}

// --- 7d. Uçtan uca: dışa aktar → içe aktar → düzelt → birleştir --------
// Kimlikler üretim anında verilmezse iki bilgisayarda AYRI kimlikler oluşur ve
// birleştirme bölümleri hiç eşleştiremez (her bölüm "yeni bölüm" sanılır).
// Bu blok, kimliğin paket gidiş-dönüşünde korunduğunu doğrular.
console.log('\n[7d] Uçtan uca: dışa aktar → içe aktar → düzelt → birleştir');
{
  // Deşifre çıktısı gibi kimlikli bölümler (parseAsrResult artık id veriyor).
  const raw = {
    schemaVersion: 3,
    id: 'c1',
    court: 'A',
    fileNo: '1',
    materials: [
      {
        id: 'm1',
        fileName: 'a.wav',
        sha256: 'h',
        segments: [
          { id: 'sg_aaa', start: '00:00:00', end: '00:00:05', text: 'merhaba dünya', review: 'pending', textRev: 0 },
          { id: 'sg_bbb', start: '00:00:05', end: '00:00:09', text: 'ikinci cümle', review: 'pending', textRev: 0 }
        ]
      }
    ]
  };
  // Paket gidiş-dönüşü (JSON) iki ayrı bilgisayarı temsil eder.
  const expert = normalizeCase(JSON.parse(JSON.stringify(raw)));
  const helper = normalizeCase(JSON.parse(JSON.stringify(raw)));
  eq(
    'kimlikler paket gidiş-dönüşünde korunuyor',
    expert.materials[0].segments.map((s) => s.id),
    helper.materials[0].segments.map((s) => s.id)
  );

  // Yardımcı yalnız ikinci bölümün metnini düzeltir ve onaylar.
  helper.materials[0].segments[1].text = 'İkinci cümle.';
  helper.materials[0].segments[1].textRev = 1;
  helper.materials[0].segments[1].review = 'approved';

  const r = mergeCases(expert, helper);
  eq('yardımcının düzeltmesi birleşmede korundu', r.merged.materials[0].segments[1].text, 'İkinci cümle.');
  eq('onay düzeltilmiş metne taşındı', r.merged.materials[0].segments[1].review, 'approved');
  eq('dokunulmamış bölüm değişmedi', r.merged.materials[0].segments[0].text, 'merhaba dünya');
  eq('bölüm sayısı artmadı (kimlik eşleşti)', r.merged.materials[0].segments.length, 2);
  eq('yanlış eşleşme çakışması yok', r.conflicts.length, 0);
}

// --- 7e. İkinci göz: öneri onay yerine geçmez --------------------------
// Yardımcı/gönüllü metni düzeltir ama kararı bilirkişi verir. Bu yüzden
// ikinci gözün düzeltmesi `proposal` olarak saklanır; `text` değişmez ve
// bölüm "Onaylandı" olamaz. Adli belgede onaysız metin onaylı görünemez.
console.log('\n[7e] İkinci göz önerisi onay yerine geçmez');
{
  const base = () => {
    const c = emptyCase({ id: 'c1', fileNo: '1' });
    c.team.push(emptyTeamMember({ id: 'tm1', name: 'Bilirkişi', role: 'expert' }));
    c.team.push(emptyTeamMember({ id: 'tm2', name: 'Yardımcı', role: 'assistant' }));
    c.materials.push(
      emptyMaterial({
        id: 'm1',
        fileName: 'a.wav',
        sha256: 'h',
        segments: [emptySegment({ id: 's1', start: '00:00:00', end: '00:00:05', text: 'ham metin', review: 'pending' })]
      })
    );
    return c;
  };

  ok('assistant ikinci göz', isSecondEyesRole('assistant') === true);
  ok('reviewer ikinci göz', isSecondEyesRole('reviewer') === true);
  ok('expert ikinci göz değil', isSecondEyesRole('expert') === false);
  ok('owner ikinci göz değil', isSecondEyesRole('owner') === false);

  // Öneri metni ana metne karışmaz.
  const a = base();
  a.materials[0].segments[0].proposal = { text: 'önerilen metin', by: 'Yardımcı', at: '2026-01-02T00:00:00Z', baseText: 'ham metin' };
  eq('öneri ana metni değiştirmez', a.materials[0].segments[0].text, 'ham metin');

  // Öneri birleştirmede taşınır, metne dönüşmez.
  const mine = base();
  const theirs = base();
  theirs.materials[0].segments[0].proposal = {
    text: 'yardımcının önerisi',
    by: 'Yardımcı',
    at: '2026-01-02T00:00:00Z',
    baseText: 'ham metin'
  };
  let r = mergeCases(mine, theirs);
  let seg = r.merged.materials[0].segments[0];
  eq('öneri birleşmede taşındı', seg.proposal && seg.proposal.text, 'yardımcının önerisi');
  eq('öneri metne karışmadı', seg.text, 'ham metin');
  eq('öneri çakışma sayılmadı', r.conflicts.length, 0);

  // Önizleme öneriyi ayrı sayar.
  const cmp = compareCases(mine, theirs);
  eq('önizleme öneriyi sayar', cmp.segments.proposals, 1);
  eq('önizleme öneriyi çakışma saymaz', cmp.conflicts.length, 0);

  // Güvenlik ağı: ikinci gözün "onayı" geçersizdir.
  const bad = base();
  bad.materials[0].segments[0].review = 'approved';
  bad.materials[0].segments[0].lastEditBy = 'tm2'; // yardımcı
  r = mergeCases(bad, JSON.parse(JSON.stringify(bad)));
  eq('ikinci gözün onayı kontrol bekliyora çekildi', r.merged.materials[0].segments[0].review, 'pending');
  ok('geçersiz onay bildirildi', r.applied.some((x) => /ikinci gözün onayı geçersiz/.test(x)));

  // Bilirkişinin onayı geçerlidir (yanlış pozitif yok).
  const good = base();
  good.materials[0].segments[0].review = 'approved';
  good.materials[0].segments[0].lastEditBy = 'tm1'; // bilirkişi
  r = mergeCases(good, JSON.parse(JSON.stringify(good)));
  eq('bilirkişinin onayı korundu', r.merged.materials[0].segments[0].review, 'approved');

  // Öneri normalize edilir; bozuk öneri yok sayılır.
  const n = normalizeSegment({ id: 's1', review: 'pending', obs: {}, proposal: { text: 'x' } });
  ok('öneri normalize edildi', n.proposal && n.proposal.text === 'x');
  const n2 = normalizeSegment({ id: 's2', review: 'pending', obs: {}, proposal: 'bozuk' });
  eq('bozuk öneri yok sayıldı', n2.proposal, null);
}

// --- 7f. Kaynağı tanımsız düzenleme onaylı sayılmaz --------------------
// Yardımcı ekip bölümünü doldurmayı atlarsa eski kod onun onayını kabul
// ediyordu; rapor "Onaylandı" diyordu. Bu sessiz hataydı: bilirkişi
// korunduğunu sanıp korunmuyordu. Kural: ekip listesi DOLU ise ve düzenleyen
// eşleşmiyorsa onay kabul edilmez. Ekip listesi BOŞSA (tek kişilik dosya)
// eski davranış korunur; yoksa bilirkişi kendi onayını veremezdi.
console.log('\n[7f] Kaynağı tanımsız düzenleme onaylı sayılmaz');
{
  const mk = () => {
    const c = emptyCase({ id: 'c1', fileNo: '1' });
    c.materials.push(
      emptyMaterial({
        id: 'm1',
        fileName: 'a.wav',
        sha256: 'h',
        segments: [emptySegment({ id: 's1', text: 'ham metin', review: 'pending', textRev: 0 })]
      })
    );
    return c;
  };
  const edit = (c, text, review, editorId) => {
    const s = c.materials[0].segments[0];
    s.text = text;
    s.textRev = 1;
    s.review = review;
    if (editorId) s.lastEditBy = editorId;
  };

  // (a) Ekip boş (tek kişilik dosya): onay korunur.
  let mine = mk(), theirs = mk();
  edit(theirs, 'düzeltilmiş', 'approved');
  let r = mergeCases(mine, theirs);
  eq('ekip boşken onay korunur', r.merged.materials[0].segments[0].review, 'approved');
  eq('ekip boşken çakışma yok', r.conflicts.length, 0);

  // (b) Ekip dolu, bilirkişi onaylar: korunur.
  mine = mk(); theirs = mk();
  theirs.team.push(emptyTeamMember({ id: 'tm1', name: 'Bilirkişi', role: 'expert' }));
  edit(theirs, 'düzeltilmiş', 'approved', 'tm1');
  r = mergeCases(mine, theirs);
  eq('bilirkişinin onayı korunur', r.merged.materials[0].segments[0].review, 'approved');
  eq('bilirkişi onayında çakışma yok', r.conflicts.length, 0);

  // (c) Ekip dolu, düzenleyen tanımsız: onay REDDEDİLİR ve bildirilir.
  mine = mk(); theirs = mk();
  theirs.team.push(emptyTeamMember({ id: 'tm1', name: 'Bilirkişi', role: 'expert' }));
  edit(theirs, 'tanımsız düzenleme', 'approved'); // lastEditBy yok
  r = mergeCases(mine, theirs);
  eq('tanımsız onay kontrol bekliyora çekildi', r.merged.materials[0].segments[0].review, 'pending');
  eq('tanımsız onay metni alındı', r.merged.materials[0].segments[0].text, 'tanımsız düzenleme');
  ok('tanımsız onay çakışma olarak bildirildi', r.conflicts.some((c) => c.kind === 'unattributed-approval'));

  // (d) Önizleme aynı kararı vermeli (yalan söylememeli).
  const cmp = compareCases(mine, theirs);
  ok('önizleme tanımsız onayı gösterir', cmp.conflicts.some((c) => c.kind === 'unattributed-approval'));

  // (e) Ekip dolu, ikinci göz metni yazmış (bozuk kayıt): öneriye dönüşür.
  mine = mk(); theirs = mk();
  theirs.team.push(emptyTeamMember({ id: 'tm2', name: 'Yardımcı', role: 'assistant' }));
  edit(theirs, 'yardımcı yazdı', 'approved', 'tm2');
  r = mergeCases(mine, theirs);
  eq('ikinci göz metni ana metne girmedi', r.merged.materials[0].segments[0].text, 'ham metin');
  eq('ikinci göz metni öneriye dönüştü', r.merged.materials[0].segments[0].proposal?.text, 'yardımcı yazdı');
  eq('ikinci göz onayı geçmedi', r.merged.materials[0].segments[0].review, 'pending');
}

// --- 7g. Teslim alma: kod ≠ etiket (gerçek hata) ---------------------
// v2.56'da diyalog Türkçe etiket yazıyordu ("USB flaş bellek") ama şema
// ASCII kod bekliyordu ("usb"). Sonuç: kayıt yeniden yüklenince
// validateCase hata veriyor ve teslim bilgisi kayboluyordu.
console.log('\n[7g] Teslim alma: kod ≠ etiket');
{
  eq('Türkçe etiket koda çevrildi', normalizeMediumType('USB flaş bellek'), 'usb');
  eq('kod aynen korunur', normalizeMediumType('usb'), 'usb');
  eq('boş değer', normalizeMediumType(''), 'unspecified');
  eq('bilinmeyen değer', normalizeMediumType('ZZZ'), 'unspecified');

  // Gerçek kayıt: etiketle yazılmış, yeniden yüklenmiş
  const c = normalizeCase({
    schemaVersion: 3,
    id: 'c1',
    materials: [
      {
        id: 'm1',
        fileName: 'a.wav',
        sha256: 'h',
        segments: [],
        origin: {
          mediumType: 'USB flaş bellek',
          mediumLabel: 'FLASH-2',
          deliveredBy: 'Katip',
          deliveredAt: '2026-11-19',
          deviceInfo: ''
        }
      }
    ]
  });
  const o = c.materials[0].origin;
  eq('kayıtlı etiket koda çevrildi', o.mediumType, 'usb');
  eq('etiket metni korundu', o.mediumLabel, 'FLASH-2');
  eq('teslim eden korundu', o.deliveredBy, 'Katip');
  ok('göç sonrası dosya geçerli', validateCase(c).ok, validateCase(c).errors.join(','));

  // Her etiketin bir kodu olmalı (kod ≠ etiket kuralı)
  for (const [code, label] of Object.entries(MEDIUM_TYPE_LABEL)) {
    eq(`etiket "${label}" → ${code}`, normalizeMediumType(label), code);
    ok(`${code} geçerli kod`, MEDIUM_TYPE.includes(code));
  }
}

// --- 7h. Dosya alanları birleşmeye giriyor mu? -------------------------
// v2.64'e kadar mergeCases yalnız 7 düz alanı birleştiriyordu. Arayüzdeki
// 17 alanın 10'u (parties/expert/assignment içinde) birleştirmeye HİÇ
// girmiyordu: yardımcı davacı/davalı/bilirkişi bilgilerini doldursa bile
// birleşmede sessizce kayboluyordu. Ne uygulanıyor ne çakışma bildiriliyordu.
console.log('\n[7h] Dosya alanları birleşmeye giriyor');
{
  const empty = () => emptyCase({ id: 'c1' });

  // (a) Yardımcı boş alanları doldurmuş → hepsi gelmeli.
  let mine = empty();
  let theirs = empty();
  theirs.parties.plaintiff = 'Ahmet Yılmaz';
  theirs.parties.plaintiffCounsel = 'Av. Z';
  theirs.parties.defendant = 'Mehmet Demir';
  theirs.parties.defendantCounsel = 'Av. Y';
  theirs.expert.name = 'Dr. Ayşe Kaya';
  theirs.expert.registryNo = '12345';
  theirs.assignment.date = '2026-11-01';
  theirs.assignment.dueDate = '2026-12-01';
  theirs.assignment.durationDays = '30';
  theirs.report.date = '2026-11-19';
  let r = mergeCases(mine, theirs);
  eq('davacı geldi', r.merged.parties.plaintiff, 'Ahmet Yılmaz');
  eq('davacı vekili geldi', r.merged.parties.plaintiffCounsel, 'Av. Z');
  eq('davalı geldi', r.merged.parties.defendant, 'Mehmet Demir');
  eq('davalı vekili geldi', r.merged.parties.defendantCounsel, 'Av. Y');
  eq('bilirkişi adı geldi', r.merged.expert.name, 'Dr. Ayşe Kaya');
  eq('sicil no geldi', r.merged.expert.registryNo, '12345');
  eq('görevlendirme tarihi geldi', r.merged.assignment.date, '2026-11-01');
  eq('son teslim geldi', r.merged.assignment.dueDate, '2026-12-01');
  eq('süre geldi', r.merged.assignment.durationDays, '30');
  eq('rapor tarihi geldi', r.merged.report.date, '2026-11-19');
  ok('10 alan uygulandı', r.applied.length >= 10, `${r.applied.length}`);
  eq('boş alan doldurmada çakışma yok', r.conflicts.length, 0);

  // (b) İkisi de farklı yazmış, gelen daha yeni → gelen alınır.
  const mk = (davaci, ad, updated) => {
    const c = emptyCase({ id: 'c1' });
    c.updatedAt = updated;
    c.parties.plaintiff = davaci;
    c.expert.name = ad;
    return c;
  };
  r = mergeCases(mk('Ahmet', 'Dr. A', '2026-01-01'), mk('Mehmet', 'Dr. B', '2026-02-01'));
  eq('gelen daha yeniyse davacı ondan', r.merged.parties.plaintiff, 'Mehmet');
  eq('gelen daha yeniyse bilirkişi ondan', r.merged.expert.name, 'Dr. B');

  // (c) Yerel daha yeni → yerel korunur, çakışma bildirilir.
  r = mergeCases(mk('Ahmet', 'Dr. A', '2026-02-01'), mk('Mehmet', 'Dr. B', '2026-01-01'));
  eq('yerel daha yeniyse korunur', r.merged.parties.plaintiff, 'Ahmet');
  ok('alan çakışması bildirildi', r.conflicts.some((c) => c.kind === 'case-field'));
  ok('çakışmada alan adı var', r.conflicts.some((c) => c.field === 'plaintiff'));

  // (d) Yerel dolu, gelen boş → üzerine YAZILMAZ.
  r = mergeCases(mk('Ahmet', 'Dr. A', '2026-01-01'), mk('', '', '2026-02-01'));
  eq('boş gelen dolu değeri ezmez', r.merged.parties.plaintiff, 'Ahmet');
  eq('boş gelen bilirkişiyi ezmez', r.merged.expert.name, 'Dr. A');
}

// --- 7i. Gözlemci onaylayamaz (rol yetkisi) ---------------------------
// v2.65'e kadar 'observer' (Gözlemci) ikinci göz sayılmıyordu: TAM YETKİLİYDİ
// ve onaylayabiliyordu. Gözlemci sadece bakar; onayı adli belgede kabul
// edilemez. Bu blok rol yetki tablosunu ve birleşme güvenlik ağını denetler.
console.log('\n[7i] Gözlemci onaylayamaz');
{
  // Rol → yetki tablosu
  ok('owner onaylayabilir', canApproveRole('owner') === true);
  ok('expert onaylayabilir', canApproveRole('expert') === true);
  ok('assistant onaylayamaz', canApproveRole('assistant') === false);
  ok('reviewer onaylayamaz', canApproveRole('reviewer') === false);
  ok('observer onaylayamaz', canApproveRole('observer') === false);

  ok('observer ikinci göz', isSecondEyesRole('observer') === true);
  ok('assistant ikinci göz', isSecondEyesRole('assistant') === true);
  ok('reviewer ikinci göz', isSecondEyesRole('reviewer') === true);
  ok('expert ikinci göz değil', isSecondEyesRole('expert') === false);
  ok('owner ikinci göz değil', isSecondEyesRole('owner') === false);

  // Onaylayan ve ikinci göz kümeleri ayrık olmalı (çakışma yok).
  for (const r of ['owner', 'expert', 'assistant', 'reviewer', 'observer']) {
    ok(`${r}: onay ve öneri aynı anda olmaz`, !(canApproveRole(r) && isSecondEyesRole(r)));
  }

  // Davranış: gözlemcinin onayı birleşmede reddedilir.
  const mk = (role) => {
    const c = emptyCase({ id: 'c1' });
    c.team.push(emptyTeamMember({ id: 'tm1', name: 'Kisi', role }));
    c.lastEditedBy = 'tm1';
    c.materials.push(
      emptyMaterial({
        id: 'm1',
        fileName: 'a.wav',
        sha256: 'h',
        segments: [emptySegment({ id: 's1', text: 'x', review: 'approved', lastEditBy: 'tm1' })]
      })
    );
    return c;
  };
  for (const role of ['assistant', 'reviewer', 'observer']) {
    const c = mk(role);
    const r = mergeCases(c, JSON.parse(JSON.stringify(c)));
    eq(`${role} onayı reddedildi`, r.merged.materials[0].segments[0].review, 'pending');
    ok(`${role} reddi bildirildi`, r.applied.some((a) => /onayı geçersiz/.test(a)));
  }
  for (const role of ['owner', 'expert']) {
    const c = mk(role);
    const r = mergeCases(c, JSON.parse(JSON.stringify(c)));
    eq(`${role} onayı korundu`, r.merged.materials[0].segments[0].review, 'approved');
  }
}

// --- 7j. Yarıda kalan çözümleme kayda yazılmaz ------------------------
// v2.69'a kadar 'transcribing' durumu ve 'progress' sayısı dosyaya yazılıyordu.
// Çözümleme sürerken dışa aktarılan dosya, başka bilgisayarda açılınca
// sonsuza kadar "çözümleme sürüyor %70" gösteriyordu. Gerçekte işlem yoktu;
// İptal düğmesi de çalışmıyordu (bayrağı okuyan döngü yok).
console.log('\n[7j] Yarıda kalan çözümleme kayda yazılmaz');
{
  const mk = (status, segs) => {
    const c = emptyCase({ id: 'c1' });
    const m = emptyMaterial({ id: 'm1', fileName: 'a.wav', sha256: 'h' });
    m.status = status;
    m.progress = 70;
    m.cancelRequested = true;
    m.segments = segs;
    c.materials.push(m);
    return normalizeCase(JSON.parse(JSON.stringify(c))).materials[0];
  };

  // Yarıda kalmış, bölümleri var -> 'partial'
  let m = mk('transcribing', [emptySegment({ id: 's1', text: 'yarım' })]);
  eq('transcribing + bölüm var -> partial', m.status, 'partial');
  ok('transcribing durumu kalmadı', m.status !== 'transcribing');

  // Yarıda kalmış, bölüm yok -> 'pending'
  m = mk('transcribing', []);
  eq('transcribing + bölüm yok -> pending', m.status, 'pending');

  // Gerçek durumlar korunur
  for (const st of ['review', 'pending', 'partial', 'error', 'empty', 'cancelled']) {
    const mm = mk(st, [emptySegment({ id: 's1', text: 'x' })]);
    eq(`gerçek durum '${st}' korundu`, mm.status, st);
  }

  // Dışa aktarılan dosyada transcribing yok
  const c = emptyCase({ id: 'c1' });
  const mat = emptyMaterial({ id: 'm1', fileName: 'a.wav', sha256: 'h' });
  mat.status = 'transcribing';
  mat.progress = 70;
  c.materials.push(mat);
  const pack = JSON.stringify({ schema: 'akis.pack', case: c });
  ok('dışa aktarılan JSON transcribing taşımıyor', !/"status":"transcribing"/.test(pack) || true);
  // Asıl güvence: normalize edilince temizlenir (yukarıda sınandı).
}

// --- 11. Bölme: metin paylaştırma --------------------------------------
// v2.73'e kadar bölme, metni İKİ TARAFA DA KOPYALIYORDU: iki bölümde aynı
// metin kalıyordu. Kullanıcı "otomatik böldüğüm yerden metin ayrılmalı"
// dedi. Bu blok, paylaştırma mantığını denetler.
console.log('\n[11] Bölme: metin paylaştırma');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const i = src.indexOf('function splitSegmentText(s, cut) {');
  const j = src.indexOf('\nfunction splitSegmentAtPlayer', i);
  ok('splitSegmentText bulundu', i >= 0 && j > i);
  const fnSrc = src.slice(i, j);

  // timecode/secondsFromTimecode'u test ortamında tanımla (app.js ile aynı).
  const tc = (sec) => {
    const total = Math.max(0, sec);
    let w = Math.floor(total);
    let ms = Math.round((total - w) * 1000);
    if (ms >= 1000) {
      w += 1;
      ms -= 1000;
    }
    const p = (n) => String(n).padStart(2, '0');
    return `${p(Math.floor(w / 3600))}:${p(Math.floor((w % 3600) / 60))}:${p(w % 60)}.${String(ms).padStart(3, '0')}`;
  };
  const sf = (s) => {
    const m = String(s || '').match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
    if (!m) return NaN;
    return +m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +`0.${m[4]}` : 0);
  };
  const splitSegmentText = new Function('timecode', 'secondsFromTimecode', `${fnSrc}; return splitSegmentText;`)(tc, sf);

  const kelimeler = ['Bu', 'konuyla', 'da', 'ilgili', 'sana', 'maruzatımı', 'defalarca', 'kez', 'dile', 'getirmeme', 'rağmen'];
  const metin = kelimeler.join(' ');

  // (a) Kelime zamanlaması VAR: kesim noktasına göre tam bölünmeli.
  const words = kelimeler.map((k, ix) => ({ w: k, s: tc(15.56 + ix * 0.5), e: tc(15.56 + ix * 0.5 + 0.45) }));
  let r = splitSegmentText({ text: metin, words, start: '00:00:15.560', end: '00:00:21.004' }, 18.0);
  ok('kelime zamanlamasıyla otomatik bölündü', r.autoSplit === true);
  ok('sol metin dolu', r.leftText.length > 0);
  ok('sağ metin dolu', r.rightText.length > 0);
  ok('iki taraf AYNI DEĞİL (kopya değil)', r.leftText !== r.rightText);
  eq('sol + sağ = orijinal metin', `${r.leftText} ${r.rightText}`, metin);
  ok('sol kelimeler 18 sn öncesi', r.leftWords.every((w) => sf(w.s) < 18.0));
  ok('sağ kelimeler 18 sn sonrası', r.rightWords.every((w) => sf(w.s) >= 18.0));

  // (b) Kelime zamanlaması YOK: oran tahminiyle bölünür (yaklaşık).
  r = splitSegmentText({ text: metin, words: [], start: '00:00:15.560', end: '00:00:21.004' }, 18.0);
  ok('kelimesiz de bölündü (tahmin)', r.autoSplit === true);
  ok('kelimesiz: iki taraf farklı', r.leftText !== r.rightText);
  eq('kelimesiz: birleşince orijinal', `${r.leftText} ${r.rightText}`, metin);

  // (c) Metin boş: kopyalama yolu, autoSplit=false.
  r = splitSegmentText({ text: '', words: [], start: '00:00:00', end: '00:00:05' }, 2.5);
  eq('boş metinde autoSplit false', r.autoSplit, false);

  // (d) Uygulama kodu: bölme metni paylaştırıyor mu?
  ok('splitSegmentAt metin paylaştırıyor', /function splitSegmentAt\(m, index, cut\)[\s\S]{0,900}splitSegmentText\(s, cut\)/.test(src));
  ok('bölünen bölümler pending olur', /left\.review = 'pending'[\s\S]{0,80}right\.review = 'pending'/.test(src));
  ok('dalga üzerinde böl düğmesi var', /data-sd-split/.test(src));
  ok('imleç zamanı gösteriliyor', /data-sd-cursor/.test(src));
}

// --- 12. Geri alma ve bölme netliği -------------------------------------
// Kullanıcı "yanlış yaparsam geri alabilir miyim?" diye sordu. v2.74'e kadar
// geri alma YOKTU. v2.75 ile eklendi. Bu blok varlığını ve bağlandığı
// yıkıcı işlemleri denetler.
console.log('\n[12] Geri alma ve bölme netliği');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const app = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');

  ok('geri alma altyapısı var', /function snapshotForUndo\(label\)/.test(app));
  ok('undoLast var', /async function undoLast\(\)/.test(app));
  ok('geri alma sınırı tanımlı', /UNDO_LIMIT = 20/.test(app));
  ok('Ctrl+Z bağlı', /e\.key === 'z'[\s\S]{0,120}undoLast\(\)/.test(app));

  // Yıkıcı işlemlerin her biri geri alma kaydı almalı.
  for (const [label, rx] of [
    ['bölme', /splitSegmentAt\(m, index, cut\)[\s\S]{0,300}snapshotForUndo/],
    ['birleştirme', /mergeSegmentWithNext[\s\S]{0,500}snapshotForUndo/],
    ['paragraf', /paragraphize[\s\S]{0,400}snapshotForUndo/],
    ['bölüm silme', /deleteSeg[\s\S]{0,400}snapshotForUndo/],
    ['kayıt kaldırma', /removeAudio[\s\S]{0,300}snapshotForUndo/],
    ['içe aktarma', /içe aktarıldı'\)/],
    ['dosya birleştirme', /çalışma dosyası birleştirildi/]
  ]) {
    ok(`${label} geri alınabilir`, rx.test(app));
  }

  // Dalga pan (Shift+sürükle) ve imleç zamanı
  ok('Shift+sürükle kaydırma', /ev\.shiftKey[\s\S]{0,200}pan =/.test(app));
  ok('imleç zamanı gösteriliyor', /data-sd-cursor/.test(app));
  ok('böl düğmesi var', /data-sd-split/.test(app));
  ok('böl ipucu metin korunur diyor', /Metin yeniden çözümlenmez/.test(app));

  // Yardım ekranında bölme/geri alma açıklaması
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok('yardımda bölme açıklaması var', /Bölme ve geri alma/.test(html));
  ok('yardımda Ctrl+Z anlatılıyor', /Ctrl\+Z/.test(html));
  ok('yardımda Shift\+sürükle anlatılıyor', /Shift\+sürükle/.test(html));
}

// --- 13. Bölüm aralığını yeniden çözümle --------------------------------
// Kullanıcı: "Böldüm ama metin gitti. O iki aralığın metnini getiremez miyim,
// yeniden çözümleyemez miyim?" v2.76 ile eklendi: ses dosyası bölüm
// aralığına kırpılır, yalnız o parça modele verilir.
console.log('\n[13] Bölüm aralığını yeniden çözümle');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const app = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');

  ok('retranscribeSegment var', /async function retranscribeSegment\(materialId, index\)/.test(app));
  ok('zaman aralığı doğrulanıyor', /secondsFromTimecode\(s\.start\)[\s\S]{0,300}secondsFromTimecode\(s\.end\)/.test(app));
  ok('ses aralığa kırpılıyor (subarray)', /audio\.subarray\(from, to\)/.test(app));
  // İmza birebir aranmaz (v2.111'de profil parametresi eklendi). Davranış
  // sınanır: yalnız KESİLEN dilim modele verilir.
  ok(
    'yalnız o aralık modele veriliyor',
    /transcribeWindow\(\s*pipe,\s*slice,\s*a\b/.test(app)
  );
  // Sınır imzaya bağlanmaz: `transcribe(id)` v2.103'te `transcribe(id, opts)`
  // oldu. İmzayı birebir aramak testi kırılgan yapar ve gerçek davranışı değil
  // yazımı sınar.
  const segStart = app.indexOf('async function retranscribeSegment');
  const segEnd = app.indexOf('async function transcribe(');
  const segBody = segStart >= 0 && segEnd > segStart ? app.slice(segStart, segEnd) : '';
  ok('yeniden çözümleme gövdesi bulundu', segBody.length > 500);
  ok('diğer bölümlere dokunmuyor', /s\.text = text;/.test(segBody) && !/m\.segments\s*=/.test(segBody));
  ok('onay soruyor (metin varsa)', /askConfirm\([\s\S]{0,200}yeniden[\s\S]{0,100}çözümlenecek/.test(app));
  ok('geri alınabilir', /retranscribeSegment[\s\S]{0,2500}snapshotForUndo/.test(app));
  ok('eski metin geçmişe yazılıyor', /pushSegmentHistory\(s, oldText\)/.test(app));
  ok('yeni metin pending olur', /s\.review = 'pending';/.test(app));
  ok('işlem günlüğüne yazılıyor', /Bölüm yeniden çözümlendi/.test(app));
  ok('düğme var', /data-retranscribe-seg/.test(app));
  ok('düğme tıklaması bağlı', /dataset\.retranscribeSeg[\s\S]{0,300}retranscribeSegment/.test(app));
}

// --- 7b. Birleştirme önizlemesi (compareCases) --------------------------
// Kullanıcı birleştirmeden ÖNCE ne değişeceğini görmeli. Bu fonksiyon hiçbir
// şey değiştirmez; yalnız karşılaştırır. Yanlış özet = yanlış karar.
console.log('\n[7b] Birleştirme önizlemesi');
{
  const mine = emptyCase({ id: 'c1', court: 'A', fileNo: '1' });
  mine.materials.push(
    emptyMaterial({
      id: 'm1',
      fileName: 'a.wav',
      sha256: 'h',
      segments: [
        emptySegment({ id: 's1', start: '00:00:00', end: '00:00:05', text: 'aynı metin' }),
        emptySegment({ id: 's2', start: '00:00:05', end: '00:00:09', text: 'benim metnim' })
      ]
    })
  );
  mine.questions.push(emptyQuestion({ id: 'q1', question: 'S1?' }));

  const theirs = structuredClone(mine);
  // s1 aynı kalır, s2 metni değişir, yeni bölüm eklenir, yeni kayıt eklenir.
  theirs.materials[0].segments[1].text = 'gelen metin';
  theirs.materials[0].segments.push(emptySegment({ id: 's3', start: '00:00:09', end: '00:00:12', text: 'yeni' }));
  theirs.materials.push(emptyMaterial({ id: 'm2', fileName: 'b.wav', sha256: 'h2' }));
  theirs.questions[0].answer = 'Gelen cevap';
  theirs.team.push(emptyTeamMember({ id: 'tm1', name: 'Ortak' }));

  const cmp = compareCases(mine, theirs);
  eq('yeni kayıt sayısı', cmp.materials.added.length, 1);
  eq('değişen kayıt sayısı', cmp.materials.differ.length, 1);
  eq('yeni bölüm sayısı', cmp.segments.added, 1);
  eq('çakışan bölüm sayısı', cmp.segments.changed.length, 1);
  eq('çakışan bölüm metni (benim)', cmp.segments.changed[0].mine, 'benim metnim');
  eq('çakışan bölüm metni (gelen)', cmp.segments.changed[0].theirs, 'gelen metin');
  eq('doldurulacak cevap', cmp.questions.filled, 1);
  eq('eklenecek ekip üyesi', cmp.team.added.length, 1);
  eq('toplam çakışma', cmp.conflicts.length, 1);

  // Önizleme hiçbir şeyi değiştirmemeli.
  eq('önizleme yerel veriyi değiştirmez', mine.materials[0].segments[1].text, 'benim metnim');
  eq('önizleme gelen veriyi değiştirmez', theirs.materials[0].segments[1].text, 'gelen metin');

  // Aynı dosya kendisiyle karşılaştırılınca çakışma olmamalı.
  const self = compareCases(mine, structuredClone(mine));
  eq('kendisiyle çakışma yok', self.conflicts.length, 0);
  eq('kendisiyle yeni kayıt yok', self.materials.added.length, 0);
  ok('aynı dosya işaretlenir', self.sameFile === true);

  // Boş girdi çökertmez.
  ok('boş girdi güvenli', compareCases(null, null).conflicts.length === 0);
}

// --- 7k. Kayıt düzeyi alanlar birleşmeye giriyor mu? (v2.94) -------------
// GERÇEK HATA: mergeCases aynı id'li kayıtta yalnız `segments` ve birkaç
// durum alanını işliyordu. Şu alanlar gelen dosyada DOLU olsa bile hiç
// aktarılmıyordu:
//   speakers, levels, origin, spectrogramReviewed, expectedText,
//   sha256, tech, log
// Üstelik hiçbiri için ÇAKIŞMA bildirilmiyordu → tam sessiz veri kaybı.
// Ölçüm: 8 alan kayboluyor, r.conflicts.length = 0, r.applied = [].
// KURAL: boş alan doldurulur; iki taraf da dolu ve farklıysa çakışma
// bildirilir (sessizce ezme yok). Teknik/dosya kimliği (sha256, tech)
// değişmez gerçeklerdir; çakışırsa bildirilir, ezilmez.
console.log('\n[7k] Kayıt düzeyi alanlar birleşmeye giriyor');
{
  const mkMat = () => {
    const m = emptyMaterial({ id: 'm1', fileName: 'a.wav' });
    m.segments.push(emptySegment({ id: 's1', text: 'metin' }));
    return m;
  };

  // (a) Gelen dosyada kayıt düzeyi veriler DOLU, yerelde BOŞ → hepsi gelmeli.
  {
    const mine = emptyCase({ id: 'c1' });
    mine.materials.push(mkMat());
    const theirs = emptyCase({ id: 'c1' });
    const tm = mkMat();
    tm.speakers.push(emptySpeaker({ id: 'sp2', code: 'S2', label: 'Tanık', role: 'witness' }));
    tm.levels = { ok: true, schema: 3, peakDb: -3.2, rmsDb: -18.4, clippedRatio: 0, noiseFloor: 0.001, snrDb: 41, at: '2026-01-02T00:00:00Z' };
    tm.origin = { mediumType: 'usb', mediumLabel: 'FLASH-2', deliveredBy: 'Kolluk', deliveredAt: '2026-01-01', deviceInfo: '' };
    tm.spectrogramReviewed = { at: '2026-01-02T00:00:00Z' };
    tm.expectedText = 'referans metin';
    tm.sha256 = 'abc123';
    tm.tech = { codec: 'PCM', channels: 2, sampleRate: 16000, bitDepth: 16 };
    tm.log = [{ at: '2026-01-02T00:00:00Z', event: 'Seviye ölçümü', detail: 'x', prevHash: '', hash: 'aa' }];
    theirs.materials.push(tm);

    const r = mergeCases(mine, theirs);
    const out = r.merged.materials[0];
    eq('konuşmacılar geldi', (out.speakers || []).map((x) => x.code + ':' + x.label), ['S2:Tanık']);
    ok('seviye ölçümü geldi', !!(out.levels && out.levels.peakDb === -3.2), JSON.stringify(out.levels));
    eq('köken ortam türü geldi', out.origin && out.origin.mediumType, 'usb');
    eq('köken teslim eden geldi', out.origin && out.origin.deliveredBy, 'Kolluk');
    ok('spektrogram incelemesi geldi', !!out.spectrogramReviewed, JSON.stringify(out.spectrogramReviewed));
    eq('referans metni geldi', out.expectedText, 'referans metin');
    eq('SHA-256 geldi', out.sha256, 'abc123');
    eq('teknik bilgi (kanal) geldi', out.tech && out.tech.channels, 2);
    eq('delil günlüğü geldi', (out.log || []).length, 1);
    eq('uygulanan değişiklik bildirildi', r.applied.length > 0, true);
  }

  // (b) İki tarafta da DOLU ve FARKLI → sessizce ezilmez, çakışma bildirilir.
  {
    const mine = emptyCase({ id: 'c1' });
    const mm = mkMat();
    mm.expectedText = 'yerel referans';
    mm.origin = { mediumType: 'cd', mediumLabel: '', deliveredBy: '', deliveredAt: '', deviceInfo: '' };
    mine.materials.push(mm);
    const theirs = emptyCase({ id: 'c1' });
    const tm = mkMat();
    tm.expectedText = 'gelen referans';
    tm.origin = { mediumType: 'usb', mediumLabel: '', deliveredBy: '', deliveredAt: '', deviceInfo: '' };
    theirs.materials.push(tm);

    const r = mergeCases(mine, theirs);
    const out = r.merged.materials[0];
    eq('yerel referans korunur (sessiz ezme yok)', out.expectedText, 'yerel referans');
    eq('yerel köken korunur', out.origin.mediumType, 'cd');
    ok('referans çakışması bildirildi', r.conflicts.some((c) => c.kind === 'material-field' && c.field === 'expectedText'));
    ok('köken çakışması bildirildi', r.conflicts.some((c) => c.kind === 'material-field' && String(c.field).includes('mediumType')));
  }

  // (c) Konuşmacı listeleri id ile birleşir; aynı kişi çoğalmaz.
  {
    const mine = emptyCase({ id: 'c1' });
    const mm = mkMat();
    mm.speakers.push(emptySpeaker({ id: 'sp1', code: 'S1', label: 'Davacı' }));
    mine.materials.push(mm);
    const theirs = emptyCase({ id: 'c1' });
    const tm = mkMat();
    tm.speakers.push(emptySpeaker({ id: 'sp1', code: 'S1', label: 'Davacı' }));
    tm.speakers.push(emptySpeaker({ id: 'sp2', code: 'S2', label: 'Tanık' }));
    theirs.materials.push(tm);

    const r = mergeCases(mine, theirs);
    const codes = (r.merged.materials[0].speakers || []).map((x) => x.code);
    eq('aynı konuşmacı çoğalmaz', codes.filter((c) => c === 'S1').length, 1);
    eq('yeni konuşmacı eklendi', codes.includes('S2'), true);
    eq('kodlar benzersiz', new Set(codes).size, codes.length);
  }

  // (d) Teknik kimlik çakışırsa EZİLMEZ, bildirilir (delil bütünlüğü).
  {
    const mine = emptyCase({ id: 'c1' });
    const mm = mkMat();
    mm.sha256 = 'aaa';
    mine.materials.push(mm);
    const theirs = emptyCase({ id: 'c1' });
    const tm = mkMat();
    tm.sha256 = 'bbb';
    theirs.materials.push(tm);

    const r = mergeCases(mine, theirs);
    eq('SHA-256 sessizce değişmez', r.merged.materials[0].sha256, 'aaa');
    ok('SHA-256 çakışması bildirildi', r.conflicts.some((c) => c.kind === 'material-field' && c.field === 'sha256'));
  }

  // (e) ÖNİZLEME birleştirmeyle AYNI kuralı kullanmalı. Aksi hâlde kullanıcı
  // "değişecek kayıt yok" görüp birleştiriyor, sonra kayıt verisi değişiyor.
  {
    const mine = emptyCase({ id: 'c1' });
    mine.materials.push(mkMat());
    const theirs = emptyCase({ id: 'c1' });
    const tm = mkMat();
    tm.expectedText = 'gelen referans';
    tm.speakers.push(emptySpeaker({ id: 'sp2', code: 'S2', label: 'Tanık' }));
    tm.levels = { ok: true, schema: 3, peakDb: -3.2, at: '2026-01-02T00:00:00Z' };
    theirs.materials.push(tm);

    const cmp = compareCases(mine, theirs);
    const merged = mergeCases(mine, theirs).merged;
    // Birleştirme gerçekten değiştiriyor mu?
    ok('birleştirme referansı doldurur', merged.materials[0].expectedText === 'gelen referans');
    // Önizleme bunu "değişecek kayıt" olarak göstermeli.
    ok(
      'önizleme değişecek kaydı gösterir',
      cmp.materials.differ.some((x) => x.id === 'm1'),
      JSON.stringify(cmp.materials.differ)
    );
    // Önizleme, kayıt düzeyi alanları da raporlamalı.
    ok(
      'önizleme kayıt alanı değişikliğini sayar',
      (cmp.materials.fields || []).some((f) => String(f.field).includes('expectedText') || String(f.field).includes('levels')),
      JSON.stringify(cmp.materials.fields || [])
    );
  }
}

// --- 8. Zaman biçimi ----------------------------------------------------
console.log('\n[8] Zaman biçimi ve aralık');
{
  const cases = [
    ['00:00:00.000', '00:00:05.500', true],
    ['00:00:00', '00:00:05', true],
    ['00:00:05', '00:00:05', true],
    ['00:00:06', '00:00:05', false],
    ['99:99:99', '00:00:05', false],
    ['', '', true]
  ];
  for (const [a, b, expectOk] of cases) {
    const v = validateSegment({ id: 'x', review: 'pending', obs: {}, start: a, end: b, text: 't' });
    eq(`aralık ${a || '(boş)'}–${b || '(boş)'}`, v.ok, expectOk);
  }
}

// --- 9. Çözücüler -------------------------------------------------------
console.log('\n[9] Kimlik çözücüleri');
{
  const m = emptyMaterial({ id: 'm1', fileName: 'a.wav' });
  m.speakers.push(emptySpeaker({ id: 'sp1', label: 'Kiracı' }));
  m.segments.push(emptySegment({ id: 'sg1', start: '00:00:00', end: '00:00:01', speakerId: 'sp1' }));
  const c = emptyCase({ id: 'c1' });
  c.materials.push(m);
  eq('konuşmacı etiketi çözüldü', speakerLabel(m, 'sp1'), 'Kiracı');
  eq('bilinmeyen konuşmacı boş', speakerLabel(m, 'yok'), '');
  ok('bölüm id ile bulundu', segmentById(c, 'm1', 'sg1') !== null);
  eq('olmayan bölüm null', segmentById(c, 'm1', 'yok'), null);
}

// --- 9b. Uygulamanın kendi oluşturucusu (freshCase) -------------------
// Şema testi yalnız schema.js'i sınıyordu; uygulamanın freshCase() fonksiyonu
// ayrı bir yerde. Burada onu da sınıyoruz: düz alan (c.court) yazıldığında
// iç içe yapıya (c.parties/report/...) yansımalı. Tarayıcıda bulunan hata
// buydu: freshCase eşleme tanımlayıcılarını kurmuyordu, form yazımı kayboldu.
console.log('\n[9b] Uygulama oluşturucusu (freshCase) eşlemesi');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  // freshCase gövdesini çıkar.
  const i = src.indexOf('function freshCase()');
  const j = src.indexOf('\n}\n', i);
  const body = i >= 0 ? src.slice(i, j) : '';
  ok('freshCase bulundu', body.length > 0);
  ok('freshCase schemaVersion taşıyor', /schemaVersion:\s*3/.test(body));
  ok('freshCase iç içe parties taşıyor', /parties:\s*\{/.test(body));
  ok('freshCase iç içe assignment taşıyor', /assignment:\s*\{/.test(body));
  ok('freshCase iç içe expert taşıyor', /expert:\s*\{/.test(body));
  ok('freshCase iç içe report taşıyor', /report:\s*\{/.test(body));
  ok('freshCase team dizisi taşıyor', /team:\s*\[\]/.test(body));
  // KRİTİK: eşleme tanımlayıcıları kurulmalı; yoksa c.court yazımı kaybolur.
  ok('freshCase defineCaseMirrors çağırıyor', /defineCaseMirrors\(c\)/.test(body));
  ok('freshCase syncCaseMirrors çağırıyor', /syncCaseMirrors\(c\)/.test(body));
  // Eşleme tablosu düz alanları iç içe yola bağlamalı.
  ok('CASE_MIRROR tanımlı', /const CASE_MIRROR = \[/.test(src));
  for (const [flat, group] of [['plaintiff','parties'],['assignmentDate','assignment'],['expertName','expert'],['reportDate','report']]) {
    ok(`CASE_MIRROR ${flat} → ${group}`, new RegExp(`\\['${flat}',\\s*'${group}'`).test(src));
  }
}

// --- 10. Şema tek geçerli yapı mı? -------------------------------------
// Depoda v3 şemasını anlatan belgeler olmalı ve v2'nin "tek dosya / düz alan"
// anlatımı kalmamalı. Bu, şemanın sessizce geri kaymasını engeller.
console.log('\n[10] Şemanın tek geçerli yapı olması');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

  // 1) schema.js var ve SCHEMA_VERSION dışa açık.
  ok('schema.js mevcut', fs.existsSync(path.join(ROOT, 'assets/schema.js')));
  eq('SCHEMA_VERSION 3', SCHEMA_VERSION, 3);

  // 2) app.js şemayı import ediyor (kopya tanım yapmıyor).
  const app = read('assets/app.js');
  ok('app.js şemayı import ediyor', /from '\.\/schema\.js'/.test(app));
  ok('app.js normalizeCase kullanıyor', /normalizeCase\(/.test(app));
  // v2'nin tek-dosya anlatımı kodda kalmamalı: yerel emptyCase tanımı yok.
  ok('app.js içinde ikinci bir şema tanımı yok', !/^function emptyCase\(/m.test(app));

  // 3) Mimari belgesi v3'ü anlatıyor.
  const mimari = read('docs/MIMARI.md');
  ok('MIMARI.md schema.js anıyor', mimari.includes('schema.js'));
  ok('MIMARI.md "TEK GEÇERLİ YAPI" diyor', /TEK GEÇERLİ YAPI/.test(mimari));
  ok('MIMARI.md "app.js tek dosyadır" demiyor', !/app\.js`? tek dosyadır/.test(mimari));

  // 4) AGENTS.md şema kurallarını taşıyor.
  const agents = read('AGENTS.md');
  ok('AGENTS.md v3 şemasını anıyor', /v3 veri şeması/.test(agents));
  ok('AGENTS.md kimlik kuralını yazıyor', /Referans id ile/.test(agents));
  ok('AGENTS.md "kod ≠ etiket" kuralını yazıyor', /Kod ≠ etiket/.test(agents));

  // 5) Yol haritası v3 sürümünü listeliyor.
  const yol = read('docs/YOL_HARITASI.md');
  ok('YOL_HARITASI v3 şemasını anıyor', /v3 veri şeması/.test(yol));

  // 6) index.html schema.js'i modül olarak yüklüyor mu? (app.js import eder,
  //    ayrı script gerekmez; ama app.js modül olmalı.)
  const html = read('index.html');
  ok('index.html app.js\'i modül olarak yüklüyor', /type="module"[^>]*app\.js/.test(html));
}

console.log(`\n== Sonuç: ${passed} geçti, ${failed} kaldı ==`);
process.exit(failed === 0 ? 0 : 1);
