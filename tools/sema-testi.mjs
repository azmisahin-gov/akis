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
  normalizeQuestion,
  validateCase,
  validateMaterial,
  validateSegment,
  chainHash,
  logEntry,
  verifyLogChain,
  mergeCases,
  compareCases,
  speakerLabel,
  segmentById,
  newId
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
