// v3 veri şeması: doğrulama, normalleştirme, delil zinciri ve birleştirme
// saf fonksiyonları ayrı dosyada (test edilebilir). Uygulama yalnız buradan
// içe aktarır; şema kuralı tek yerde yaşar.
import {
  SCHEMA_VERSION,
  newId,
  normalizeCase,
  normalizeMaterial,
  validateCase,
  logEntry,
  verifyLogChain,
  logChainState,
  upgradeLogChain,
  mergeCases,
  compareCases,
  speakerLabel,
  emptyTeamMember,
  CASE_STATUS_LABEL,
  STATUS_LABEL,
  REVIEW_LABEL,
  REVIEW_LEGACY,
  REVIEW_STATE,
  normalizeReviewState,
  REVIEW_HINT,
  REVIEW_TONE,
  AMBIGUOUS_REVIEW,
  isHumanApprovedReview,
  SPEAKER_ROLE_LABEL,
  SPEAKER_GENDER_LABEL,
  MEDIUM_TYPE_LABEL,
  TEAM_ROLE_LABEL,
  TEAM_ROLE,
  SPEAKER_ROLE,
  SPEAKER_GENDER,
  MEDIUM_TYPE,
  normalizeSpeakerRole,
  normalizeSpeakerGender,
  assignSpeakerCodes,
  isSecondEyesRole,
  canApproveRole
} from './schema.js?v=2.156';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// TEK SÜRÜM KAYNAĞI. Arayüzdeki sürüm etiketi buradan okunur. Her sürüm
// güncellemesinde yalnızca bu satır ve CHANGELOG başlığı değiştirilir; belgeler
// bu numaraya göre hizalanır. Sürüm şeması: MAJOR.MINOR (bkz. docs/YOL_HARITASI.md).
const APP_VERSION = '2.156';
// Legacy storage key is intentionally retained so existing MİHENK work remains available after the AKİS update.
const STORE_KEY = 'mihenk.pro.cases.v1';
const DB_NAME = 'mihenk-pro-assets';
const DB_STORE = 'audio';
const STATE_STORE = 'state'; // dava verisi (v2.73)
// Browser speech recognition runs on WASM. Measured on the bundled test recordings:
// int8 throws (no ConvInteger kernel), q8 silently degrades into repeated filler
// text beyond ~15 seconds, fp16 stays accurate but needs a large download.
// Models are therefore offered as a trade-off between download size and accuracy.
// Measured on the bundled synthetic recordings (corpus WER against the
// reference transcripts): medium ~0.38, small ~0.65. Lower is better.
// The base model aborted on one window with "token_ids must be a non-empty
// array", so it is offered only as a fast, low-accuracy option.
// Boyutlar HuggingFace deposundaki GERÇEK ONNX dosyalarından ölçülmüştür
// (encoder + decoder toplamı). GPU'da fp16, CPU'da tam (fp32) indirilir.
// "GPU/CPU" etiketi indirilecek toplam boyutu gösterir.
const ASR_MODELS = {
  'onnx-community/whisper-tiny': { label: 'Tiny – en hızlı, en düşük doğruluk (GPU ~73 MB / CPU ~144 MB)', dtype: 'fp32', warn: true },
  'onnx-community/whisper-base': { label: 'Temel – hızlı, en düşük doğruluk (GPU ~139 MB / CPU ~278 MB)', dtype: 'fp32', warn: true },
  'onnx-community/whisper-small': { label: 'Küçük – orta doğruluk (GPU ~463 MB / CPU ~923 MB)', dtype: 'fp32', warn: false },
  'onnx-community/whisper-medium-ONNX': { label: 'Orta – ölçülen en yüksek doğruluk (GPU ~1,46 GB / CPU ~2,9 GB)', dtype: 'fp32', warn: false },
  'onnx-community/whisper-large-v3-turbo': { label: 'Large-v3-turbo – ölçülmedi (GPU ~1,54 GB / CPU ~657 MB)', dtype: 'fp32', warn: false }
};
// Kullanılan sayısal duyarlılık (dtype) cihaza göre seçilir. Kalite öncelikli;
// WebGPU'da fp16 doğru ve hızlıdır. Bellek yetmezse q4'e düşülür.
// Denenecek dtype adayları. ÖNEMLİ DERS: bileşen-bazlı dtype nesnesi
// ({encoder_model:..., decoder_model_merged:...}) orta modelde fp32 decoder
// indirmeye zorlar (~1.4 GB ekstra) ve 6 GB VRAM'de Aborted()/bellek taşması
// verir. Bu nedenle basit METİN dtype kullanılır; yükleme başarısız olursa
// daha küçük (kuantize) seçeneğe düşülür. Sıra bellek bakımından artmaz.
//  - WebGPU: fp16 (önerilen) → q4 (bellek yetersizse)
//  - WASM  : fp32 (fp16/q8 WASM'da güvenilmez)
function dtypeCandidates(device) {
  if (device === 'webgpu') return ['fp16', 'q4'];
  return ['fp32'];
}
// İnsan okunur özet (durum satırında gösterilir).
function dtypeLabel(dtype) {
  if (typeof dtype === 'string') return dtype;
  if (!dtype) return '—';
  return `encoder ${dtype.encoder_model || '?'} / decoder ${dtype.decoder_model_merged || '?'}`;
}
const DEFAULT_ASR_MODEL = 'onnx-community/whisper-small';
// Kısa model adları: yükleme durumunda ve kayıt kartlarında gösterilir.
const MODEL_LOAD_LABELS = {
  'onnx-community/whisper-tiny': 'Tiny model',
  'onnx-community/whisper-base': 'Temel model',
  'onnx-community/whisper-small': 'Küçük model',
  'onnx-community/whisper-medium-ONNX': 'Orta model',
  'onnx-community/whisper-large-v3-turbo': 'Large-v3-turbo modeli'
};
function modelShortName(id) {
  if (!id) return '—';
  return MODEL_LOAD_LABELS[id] || id.split('/').pop();
}
// Şu an bellekte yüklü model. Seçimden (dropdown) ayrıdır: kullanıcı seçim
// değiştirse bile çözümleme yüklü modelle yapılır; arayüz bunu açıkça gösterir.
let loadedModelId = null;
// WebGPU is much faster but not universally available; fall back to WASM when absent.
let asrDevice = 'wasm';
async function detectDevice() {
  try {
    if (navigator.gpu && (await navigator.gpu.requestAdapter())) {
      asrDevice = 'webgpu';
      return true;
    }
  } catch (e) {}
  asrDevice = 'wasm';
  return false;
}
// Single source of truth for every report text: section headings, default
// fallbacks, table headers and notes. The three renderers (HTML preview, DOCX,
// UDF) previously repeated these strings, which let them drift apart. They now
// read from here; only formatting (fonts, colours, XML/HTML shape) stays local.
// Where the renderers disagreed, the 2-of-3 majority wording is kept.
const REPORT_TEXT = {
  subtitle: 'SES KAYITLARININ TEKNİK İNCELEMESİ VE KONUŞMA İÇERİĞİNİN ÇÖZÜMLENMESİ',
  synthetic: 'KURGUSAL TEST MATERYALİDİR · RESMÎ BELGE DEĞİLDİR',
  tocHeading: 'İÇİNDEKİLER',
  sections: [
    '1. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI',
    '2. BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR',
    '3. BİLİRKİŞİDEN GÖZLEMLENMESİ VE İNCELENMESİ İSTENEN MADDİ UNSURLAR',
    '4. İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR',
    '5. ANALİZ, TESPİT VE DEĞERLENDİRME',
    '6. GEREKÇELİ SONUÇ',
    '7. EKLER'
  ],
  sub51: '5.1. Ses kayıtlarının çözümlenmesi',
  sub52: '5.2. Görevlendiren merci sorularına ilişkin teknik değerlendirme',
  sub53: '5.3. Teknik sınırlılıklar',
  emptyCourt: '……………………………… MAHKEMESİ',
  emptyFileNo: '—',
  defaultScope: 'Görevlendirme yazısında belirtilen inceleme konusu, kapsamı ve sınırları burada açıklanır.',
  defaultQuestions: 'Görevlendirme yazısında bilirkişiye yöneltilen sorular, yazıdaki sırasıyla bu bölümde gösterilir.',
  defaultQuestion: 'Soru metni girilmemiştir.',
  defaultAnswer: 'Bu soruya ilişkin teknik cevap henüz girilmemiştir.',
  defaultBasis: 'Belirtilmemiş',
  defaultLimitations:
    'İncelemede karşılaşılan teknik sınırlılıklar varsa, somut kayıt ve zaman aralıklarıyla açıklanır.',
  defaultConclusion:
    'Sonuç, yalnızca inceleme kapsamında tespit edilen ve gerekçelendirilen teknik bulgulara dayanılarak bilirkişi tarafından yazılır.',
  defaultExpert: 'BİLİRKİŞİ',
  defaultField: '56.12',
  toplineField: 'UZMANLIK ALANI · ',
  expertFieldHeading: 'UZMANLIK ALANI',
  defaultInventoryIntro: 'İncelemeye sunulan dijital ses materyalleri aşağıda envanter bilgileriyle gösterilmiştir.',
  noMaterials: 'İncelemeye sunulan ses kaydı bulunmamaktadır.',
  codecFallback: 'Ses dosyası',
  segmentCountLabel: 'Deşifre bölümü',
  defaultEvaluation:
    'Teknik sorulara ilişkin değerlendirme, görevlendirme yazısında yer alan sorular doğrultusunda eklenir.',
  noTranscript: 'Bu kayıt için henüz deşifre metni oluşturulmamıştır.',
  inventoryNote:
    'Envanterdeki codec, kanal, örnekleme ve bit derinliği bilgileri dosya konteynerinden okunmuştur; SHA-256 özeti ise dosyanın hesaplama anındaki dijital özetidir. Bu bilgiler tek başına kaydın gerçekliğini, kayıt tarihini, kayıt tarihçesini veya montaj yapılıp yapılmadığını doğrulamaz.',
  attachmentsText:
    'Raporla birlikte sunulan ekler, gerçekten eklenen materyallere göre numaralandırılarak bu bölümde gösterilir.',
  inventoryHeaders: ['DOSYA ADI', 'BİÇİM / BOYUT', 'SÜRE', 'KANAL / ÖRNEKLEME', 'SHA-256 ÖZETİ'],
  speakerHeaders: ['KONUŞMACI', 'ROL', 'CİNSİYET', 'YAŞ ARALIĞI', 'ÖLÇÜLEN PERDE', 'BÖLÜM / NOT'],
  speakerIntro:
    'Kayıtta konuşan kişiler, bilirkişinin verdiği etiketlere göre aşağıda listelenmiştir. Etiketler ve öznitelikler bilirkişi beyanına dayanır; konuşmacı kimliği kendiliğinden tespit edilmemiştir. Perde değeri otokorelasyon yöntemiyle hesaplanan bir tahmindir ve kayıt koşullarına bağlıdır.',
  noSpeakerRow: ['Konuşmacı etiketi girilmemiştir.', '', '', '', '', ''],
  obsLabels: {
    noise: 'arka plan gürültüsü',
    overlap: 'üst üste konuşma',
    inaudible: 'anlaşılmaz bölüm',
    music: 'müzik/ses efekti'
  },
  segmentHeadersObs: ['ZAMAN ARALIĞI', 'KONUŞMACI', 'ÇÖZÜMLENEN KONUŞMA', 'KONTROL DURUMU', 'GÖZLEM'],
  spectrogramLabel: 'Spektrogram incelendi',
  werHeading: 'ÇÖZÜMLEME DOĞRULUĞU ÖLÇÜMÜ (WER)',
  werIntro:
    'Aşağıdaki oranlar, referans metni bulunan kayıtlarda otomatik çözümlemenin ÜRETTİĞİ HAM ÇIKTININ (bilirkişi düzeltmesinden ÖNCEKİ hâli) referansla karşılaştırılmasıyla hesaplanmıştır. WER (kelime hata oranı) düşük olan daha iyidir; yerine koyma, silme ve ekleme hatalarını referans kelime sayısına böler. Ölçüm, düzeltilmiş metni DEĞİL modelin kendi çıktısını ölçer; bu yüzden bilirkişi düzeltmeleri oranı değiştirmez. Model çıktısı saklanmamış eski kayıtlar ile referans metni bulunmayan kayıtlar bu tabloya girmez.',
  werHeaders: ['KAYIT', 'MODEL', 'REFERANS KELİME', 'ÇIKTI KELİME', 'HATA', 'WER'],
  werNoRows: ['Ölçüm yapılabilecek kayıt yok (referans metni ve çözümleme gerekir).', '', '', '', '', ''],
  levelHeading: 'SES SEVİYESİ VE KIRPILMA ÖLÇÜMÜ',
  levelIntro:
    'Aşağıdaki değerler, kayıtların örneklerinden hesaplanan elektro-akustik ölçümlerdir. Tepe ve RMS düzeyleri dBFS (0 dBFS = tam ölçek) cinsindendir; tepe kırpılma oranı, örneklerin tam ölçek sınırına dayandığı sürenin örnek sayısına oranıdır. Gürültü tabanı ve sinyal/gürültü oranı, kısa pencerelerin RMS dağılımından okunur. Bu ölçümler kaydın içeriğini değil, yalnızca düzey ve kırpılma durumunu gösterir; ölçüm yapılmamış kayıt bu tabloya girmez.',
  levelHeaders: ['KAYIT', 'TEPE (dBFS)', 'RMS (dBFS)', 'TEPE KIRPILMA', 'GÜRÜLTÜ TABANI', 'SİNYAL / GÜRÜLTÜ', 'EK ÖLÇÜMLER'],
  rsLevel: 'Seviyesi ölçülen kayıt',
  originHeading: 'KAYIT KÖKENİ VE TESLİM ZİNCİRİ',
  originIntro:
    'Kayıtların hangi ortamdan geldiği, kim tarafından ve ne zaman teslim edildiği aşağıda gösterilmiştir. Bu bilgiler bilirkişi beyanına ve teslim tutanağına dayanır; ortam türü kendiliğinden tespit edilmemiştir.',
  originHeaders: ['KAYIT', 'ORTAM TÜRÜ', 'ORTAM ETİKETİ', 'TESLİM EDEN', 'TESLİM TARİHİ', 'KAYIT CİHAZI / TARİHİ'],
  originEmpty: '—',
  mediumTypes: [
    'Belirtilmedi',
    'CD / DVD',
    'USB flaş bellek',
    'Taşınabilir disk',
    'Sabit disk / imaj',
    'E-posta eki',
    'Bulut / ağ paylaşımı',
    'Hafıza kartı',
    'Telefon',
    'Diğer'
  ],
  reviewSummaryHeading: 'İNCELEME ÖZETİ (denetim kaydı)',
  reviewSummaryIntro:
    'Aşağıdaki özet, inceleme sırasında gerçekten yapılan işlemleri ve kalan eksikleri gösterir. Yapılmayan bir işlem raporda yapılmış gibi gösterilmez.',
  rsMaterials: 'İncelemeye alınan kayıt',
  rsSegments: 'Çözümlenen bölüm',
  rsReviewed: 'Uzman denetiminden geçen bölüm',
  rsUnreviewed: 'Denetim bekleyen bölüm',
  rsInaudible: 'Anlaşılmadı işaretli bölüm',
  rsBlank: 'Anlamlı metin içermeyen bölüm',
  rsObservations: 'Gözlem işareti konulan bölüm',
  rsSilence: 'Sessizlik oranı ölçülen bölüm',
  rsSpectrogram: 'Spektrogram incelenen kayıt',
  rsChannel: 'Kanal ayrımı yapılan kayıt',
  rsSpeaker: 'Etiketlenen konuşmacı',
  rsPitch: 'Perdesi ölçülen konuşmacı',
  rsOriginFilled: 'Kökeni belgelenen kayıt',
  rsOriginMedium: 'Ortam türü belirtilen kayıt',
  rsWerMeasured: 'WER ölçümü yapılan kayıt',
  segmentHeaders: ['ZAMAN ARALIĞI', 'KONUŞMACI', 'ÇÖZÜMLENEN KONUŞMA', 'KONTROL DURUMU'],
  emptySpeaker: 'Belirtilmemiş',
  timeDash: '—',
  signatureLabel: 'İmza',
  signatureRegistry: 'Sicil No',
  evidenceWarningPrefix: 'Çözümleme uyarısı:',
  languageWarningPrefix: 'Kontrol uyarısı:',
  fileMissing: 'Dosya numarası girilmemiştir',
  warnMissingFields: 'Mahkeme/merci, dosya numarası veya bilirkişi adı eksik.',
  warnNoMaterials: 'Rapora eklenecek ses kaydı bulunmuyor.',
  warnLanguage: 'En az bir kaydın transkriptinde dil tutarsızlığı olasılığı bulundu.',
  warnHallucination:
    'En az bir kayıtta model anlamlı konuşma üretemedi veya dolgu ifadesi üretti; bu bölümler rapora aktarılmadan önce elle doldurulmalıdır.',
  warnPreReport: 'Rapor öncesi kontrol:'
};
// Envanter tablosundaki boş satır, tek 'materyal yok' metninden türetilir;
// böylece iki metin birbirinden ayrı düşemez.
REPORT_TEXT.noInventoryRow = [REPORT_TEXT.noMaterials, '', '', '', ''];
// Hızlı etiketler: uzmanın elle yazmadan boş/anlaşılmaz/uzaktan gelen bölümleri
// işaretlemesini sağlar. Bunlar köşeli parantezle yazılır ve rapora aynen akar;
// uydurma metin üretilmez, yalnızca gözlem ifadesi eklenir.
const QUICK_TAGS = [
  { label: '[sessizlik]', text: '[sessizlik]', hint: 'Bu aralıkta konuşma yok; sessizlik.' },
  { label: '[anlaşılmaz]', text: '[anlaşılmaz]', hint: 'Konuşma var ancak kelimeler anlaşılamadı.' },
  { label: '[uzaktan konuşma]', text: '[uzaktan/zayıf konuşma]', hint: 'Konuşma çok uzaktan veya zayıf; net değil.' },
  { label: '[gürültülü]', text: '[gürültülü bölüm]', hint: 'Arka plan gürültüsü konuşmayı bastırıyor.' },
  { label: '[üst üste]', text: '[üst üste konuşma]', hint: 'İki veya daha fazla konuşma çakışıyor.' },
  { label: '[müzik/ses]', text: '[müzik/ses efekti]', hint: 'Müzik veya ses efekti; konuşma değil.' }
];
// Eski sürümlerin varsayılan yöntem metni (iki paragraf). Kayıtlı dosyalarda
// aracın kendisini anan ifadeler kalmasın diye birebir karşılaştırmayla
// değiştirilir; bilirkişinin kendi yazdığı metne dokunulmaz.
const LEGACY_DEFAULT_METHOD = `İnceleme kapsamında tarafıma sunulan dijital ses dosyalarının dosya adları, biçimleri, boyutları, süreleri ve teknik özellikleri kaydedilir. Orijinal dosyanın içerik baytları değiştirilmeden uygulama depolamasında tutulur. Otomatik çözümleme için ses verisi tarayıcı belleğine alınarak işlenir; kaynak ses dosyası üzerinde düzenleme yapılmaz.

Otomatik konuşma çözümleme çıktısı, dinlemeyi destekleyen bir taslak olarak değerlendirilir ve rapora aktarılmadan önce ilgili ses bölümleriyle karşılaştırılarak uzman tarafından kontrol edilir. Kontrol edilmeyen bölümler ayrıca işaretlenir. Konuşma bölümleri, elde edilen zaman bilgileriyle gösterilir. Konuşmacı etiketleri otomatik kimlik tespiti anlamına gelmez; kayıt içindeki kişileri ayırt etmek amacıyla uzman tarafından girilir. Anlaşılmayan veya üst üste gelen konuşmalar tahmin edilmez; kontrol sırasında uygun biçimde işaretlenir. Kayıt niteliğinin değerlendirmeyi sınırladığı durumlar ayrıca belirtilir.`;
const DEFAULT_METHOD = `İnceleme kapsamında tarafıma sunulan dijital ses dosyalarının dosya adları, biçimleri, boyutları, süreleri ve teknik özellikleri kaydedilir. Orijinal dosyanın içerik baytları değiştirilmeden saklanır ve her dosyanın SHA-256 özeti hesaplanır. Kaynak ses dosyası üzerinde düzenleme yapılmaz; çözümleme, dosyanın çalışma kopyası üzerinde yürütülür.

Otomatik konuşma çözümleme çıktısı, dinlemeyi destekleyen bir taslak olarak değerlendirilir ve rapora aktarılmadan önce ilgili ses bölümleriyle karşılaştırılarak uzman tarafından kontrol edilir. Kontrol edilmeyen bölümler ayrıca işaretlenir. Konuşma bölümleri, elde edilen zaman bilgileriyle gösterilir. Konuşmacı etiketleri otomatik kimlik tespiti anlamına gelmez; kayıt içindeki kişileri ayırt etmek amacıyla uzman tarafından girilir. Anlaşılmayan veya üst üste gelen konuşmalar tahmin edilmez; kontrol sırasında uygun biçimde işaretlenir. Kayıt niteliğinin değerlendirmeyi sınırladığı durumlar ayrıca belirtilir.`;
let appState = { cases: [], activeCaseId: null };
let asrPipeline = null;
let modelLoading = false;
let modelLoadPromise = null;
const objectUrls = new Map();
let dbPromise;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function esc(s = '') {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
function fmtTime(s) {
  if (!Number.isFinite(s)) return '—';
  const n = Math.max(0, Math.floor(s));
  return `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor((n % 3600) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function fmtShort(s) {
  if (!Number.isFinite(s)) return '—';
  const n = Math.max(0, Math.floor(s));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function fmtSize(n) {
  if (!Number.isFinite(n)) return '—';
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
}
function dateToday() {
  return new Date().toISOString().slice(0, 10);
}
function currentCase() {
  return appState.cases.find((c) => c.id === appState.activeCaseId) || null;
}
// Depolama dolduğunda veri SESSİZCE kaybolmamalı. Önce küçük deneme yapılır;
// başarısızsa kullanıcı büyük uyarıyla uyarılır ve "Dışa aktar" önerilir.
// ---- Kalıcı kayıt (v2.73) -----------------------------------------------
// v2.72'ye kadar dava verisi localStorage'a yazılıyordu: 5 MB sınır. Tarayıcı
// kotası ise GB mertebesinde. Veri artık IndexedDB'de (STATE_STORE); orada
// kota çok geniş ve dolduğunda da sessiz kayıp olmuyor.
let storageFullWarned = false;
let persistTimer = null;
// BOŞTA MI? — kendini güncelleme için GÜVENLİK KANCASI (v2.118).
// index.html yeni sürüm gördüğünde sayfayı yenilemek ister. Ama kullanıcı
// YAZARKEN veya ÇÖZÜMLERKEN yenilemek iş kaybettirir. Bu fonksiyon "şu an
// yenilemek güvenli mi" sorusunu yanıtlar; yalnız true ise yenilenir.
// Kural: bekleyen yazma yok + çözümleme yok + oynatma yok + metin odağı yok.
window.__akisIdle = function () {
  try {
    if (persistPending) return false; // kaydedilmemiş değişiklik var
    if (typeof queueRunning !== 'undefined' && queueRunning) return false; // toplu çözümleme
    const mats = (currentCase()?.materials) || [];
    if (mats.some((m) => materialStatus(m) === 'transcribing')) return false; // çözümleme sürüyor
    if (typeof segPlayback !== 'undefined' && segPlayback && segPlayback.playing) return false; // ses çalıyor
    if (document.querySelector('audio:not([paused])')) return false;
    const el = document.activeElement;
    const tag = (el && el.tagName ? el.tagName : '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (el && el.isContentEditable)) return false; // yazıyor
    // Açık diyalog varsa (onay/ birleştirme) yenileme YAPMA.
    if (document.querySelector('dialog[open]')) return false;
    return true;
  } catch (e) {
    return false; // bilinmiyorsa temkinli davran
  }
};
let persistPending = false;
let persistChain = Promise.resolve();
// Dava verisini değiştiren HER yazma `updatedAt`'i tazeler (v2.95).
// NEDEN: `mergeCases`/`compareCases` "gelen daha yeniyse onun değeri alınır"
// kuralını `updatedAt` ile uygular. Öncesinde yalnız `freshCase` ve
// `applyMerge` yazıyordu; normal düzenleme tazelemediği için aylar önce
// oluşturulmuş ama BUGÜN düzenlenmiş bir dosya "eski" sayılıp alan
// çakışmalarında sessizce eziliyordu.
// Kural: damga GERİ ÇEKİLMEZ (saat kayması/aynı ms) — en büyük değer korunur.
function touchCaseUpdated(c) {
  if (!c) return false;
  const now = new Date().toISOString();
  if (!c.updatedAt || now > c.updatedAt) {
    c.updatedAt = now;
    return true;
  }
  return false;
}
// Tek yazma kapısı: veriyi değiştiren her yol buradan geçer. `persist()`i
// doğrudan çağıran yerler bu yardımcıyı kullanmalıdır (aksi hâlde `updatedAt`
// bayatlar ve birleştirme yanlış karar verir).
function saveCaseNow(c) {
  touchCaseUpdated(c || currentCase());
  persist();
}
async function persistNow() {
  for (const c of appState.cases || []) syncCaseMirrors(c);
  // ÇOKLU SEKME KORUMASI (v2.84): iki sekmede aynı veri açıksa son yazan
  // diğerinin tüm işini ezer (kanıtlandı). Kilitlemek bilirkişiyi engeller;
  // bunun yerine bu sekmenin yazma hakkı olup olmadığı denetlenir.
  if (!tabWriteGuard()) return;
  try {
    // YAZILABİLİR KOPYA (v2.87 — kritik veri kaybı). appState içinde yalnız
    // kayda giren veri bulunmaz: ekranın kullandığı fonksiyonlar ve büyük
    // türetilmiş veriler (dalga bağlama, spektrogram) de nesnelerin üstünde
    // durur. IndexedDB yazarken structuredClone yapar ve FONKSİYON
    // kopyalayamaz → işlem DataCloneError ile iptal olur, hiçbir şey yazılmaz.
    // Canlı veride yaşandı: bölüme tıklayan bilirkişinin tüm işi kayboldu.
    // BOŞ TASLAK KAYDA YAZILMAZ (v2.109): yalnız veri taşıyan dosyalar yazılır.
    // Böylece yeni tarayıcıda "zaten dosya var" yanılgısı oluşmaz.
    const payload = persistPayloadFor(appState);
    const db = await dbOpen();
    if (!payload) {
      // Yazacak kullanıcı verisi yok: boş kayıt YAZILMAZ (v2.109/v2.134),
      // varsa eski kayıt SİLİNİR. Aksi hâlde ilk açılışta hayalet kayıt
      // oluşur ya da silinen dosyalar yeniden yüklenir.
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STATE_STORE, 'readwrite');
        tx.objectStore(STATE_STORE).delete(STORE_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } else {
      const clean = sanitizeForStorage(payload);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STATE_STORE, 'readwrite');
        tx.objectStore(STATE_STORE).put({ key: STORE_KEY, value: clean });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    // Kısa metin (v2.105): uzun hâli üst barda başlığı sıkıştırıyordu.
    // KRİTİK durum metinleri (KAYDEDİLMİYOR, DEPOLAMA DOLU, KAYIT OKUNAMADI)
    // KISALTILMAZ: onlar kullanıcının görmesi gereken uyarılardır.
    $('#saveState').textContent = '● Kayıt güncel';
    $('#saveState').classList.remove('danger');
    hideSaveFailureBanner();
    if (storageFullWarned) {
      storageFullWarned = false;
      hideStorageBanner();
    }
    refreshUsage();
  } catch (e) {
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(String(e.message || '')));
    console.warn('Kayıt başarısız:', e);
    // HER yazma hatası GÖRÜNÜR olmalı (v2.87). Öncesinde yalnız küçük durum
    // yazısı değişiyordu; bilirkişi uyarıyı görmedi ve işini kaybetti.
    if (full) {
      if (!storageFullWarned) {
        storageFullWarned = true;
        showStorageBanner();
      }
      $('#saveState').textContent = '● DEPOLAMA DOLU — paket oluşturun!';
      $('#saveState').classList.add('danger');
    } else {
      showSaveFailureBanner(e);
    }
  }
}
// Kayda/dışa aktarıma giden TEMİZ kopya. Derin kopyalar; orijinal nesneye
// DOKUNMAZ (ekran fonksiyonları kullanmaya devam eder). Kural: `__` ile
// başlayan her alan oturumluktur ve kayda girmez; fonksiyonlar hiçbir koşulda
// yazılmaz. Dava verisi (metin, ölçüm, günlük) aynen korunur.
function sanitizeForStorage(value) {
  const seen = new WeakMap();
  const walk = (v) => {
    if (v === null || typeof v !== 'object') {
      // Fonksiyon/simge kayda giremez; undefined da JSON'da kaybolur.
      return typeof v === 'function' || typeof v === 'symbol' || v === undefined ? undefined : v;
    }
    if (seen.has(v)) return seen.get(v);
    if (v instanceof Date) return new Date(v.getTime());
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v) || (typeof Blob !== 'undefined' && v instanceof Blob)) {
      return v; // ikili veri klonlanabilir; olduğu gibi geçer
    }
    if (Array.isArray(v)) {
      const arr = [];
      seen.set(v, arr);
      for (const item of v) arr.push(walk(item));
      return arr;
    }
    const out = {};
    seen.set(v, out);
    for (const k of Object.keys(v)) {
      if (k.startsWith('__')) continue; // oturumluk alan
      const w = walk(v[k]);
      if (w !== undefined) out[k] = w;
    }
    return out;
  };
  return walk(value);
}
// Yazma hatası şeridi. Kota hatasından AYRI: burada sorun boyut değil,
// yazmanın kendisi. Kullanıcı ne kaybettiğini ve ne yapacağını görmeli.
function showSaveFailureBanner(err) {
  const reason =
    err && err.name === 'DataCloneError'
      ? 'Kayıt verisi tarayıcıya aktarılamadı.'
      : err && err.name
        ? `Tarayıcı hatası: ${err.name}.`
        : 'Bilinmeyen yazma hatası.';
  let el = $('#saveFailureBanner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saveFailureBanner';
    document.body.appendChild(el);
  }
  el.className = 'storage-banner save-failure';
  // Ekran okuyucu bu şeridi kesintili duyurur: veri kaybı riski var (v2.135).
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  // İçerik HER çağrıda tazelenir: bayat/boş şerit kalırsa kullanıcı uyarıyı
  // görmez. Dinleyiciler bir kez bağlanır (yinelenen bağlama olmasın).
  el.innerHTML =
    '<div class="sb-body"><b>Değişiklikleriniz KAYDEDİLMİYOR</b>' +
    '<small>Son yaptığınız işlemler tarayıcıya yazılamadı; sayfayı yenilerseniz kaybolur. ' +
    'Hemen <b>Paket oluştur</b> ile çalışmanızı bilgisayarınıza alın, sonra sayfayı yenileyin.</small></div>' +
    '<button class="button button-primary button-small" id="saveFailureExport">Paket oluştur</button>' +
    '<button class="icon-button" id="saveFailureClose" aria-label="Kapat">×</button>';
  if (!el.dataset.wired) {
    el.dataset.wired = '1';
    $('#saveFailureExport')?.addEventListener('click', () => exportProject().catch((e) => showToast(e.message)));
    $('#saveFailureClose')?.addEventListener('click', hideSaveFailureBanner);
  }
  el.hidden = false;
  el.dataset.reason = reason;
  const st = $('#saveState');
  if (st) {
    st.textContent = '● KAYDEDİLMİYOR — paket oluşturun!';
    st.classList.add('danger');
  }
}
function hideSaveFailureBanner() {
  const el = $('#saveFailureBanner');
  if (el) el.hidden = true;
}
// ---- Geri alma (v2.75) ---------------------------------------------------
// Her YIKICI işlemden önce durumun anlık görüntüsü saklanır (son 20 adım).
// Ctrl+Z ile geri dönülür. Otomatik kaydın (her tuş vuruşu) geri alma
// geçmişini kirletmemesi için yalnız açıkça işaretlenen işlemler saklanır.
const UNDO_LIMIT = 20;
let undoStack = [];
let undoTimer = null;
function snapshotForUndo(label) {
  try {
    undoStack.push({
      label: label || 'işlem',
      at: Date.now(),
      cases: JSON.parse(JSON.stringify(appState.cases || [])),
      activeCaseId: appState.activeCaseId
    });
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    renderUndoState();
  } catch (e) {
    console.warn('Geri alma kaydı alınamadı', e);
  }
}
function undoDepth() {
  return undoStack.length;
}
async function undoLast() {
  if (!undoStack.length) {
    showToast('Geri alınacak işlem yok.');
    return;
  }
  const snap = undoStack.pop();
  appState.cases = snap.cases;
  appState.activeCaseId = snap.activeCaseId;
  for (const c of appState.cases) {
    syncCaseMirrors(c);
    defineCaseMirrors(c);
  }
  if (!currentCase() && appState.cases.length) appState.activeCaseId = appState.cases[0].id;
  renderUndoState();
  persist();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  await renderAudioList();
  showToast(`Geri alındı: ${snap.label}`);
}
function renderUndoState() {
  // Düğmenin kimliği index.html'de #undoBtn'dir. v2.75–v2.81 arasında burada
  // #undoState aranıyordu; eleman bulunamadığı için sayaç hiç yazılmıyor ve
  // düğme hep DEVRE DIŞI kalıyordu. Yani "Ctrl+Z ile geri alınır" vaadi
  // arayüzde çalışmıyordu (tarayıcıda yakalandı). İki kimlik de desteklenir.
  const el = $('#undoBtn') || $('#undoState');
  if (!el) return;
  const n = undoStack.length;
  el.textContent = n ? `↶ ${n}` : '↶ 0';
  el.disabled = !n;
  el.title = n
    ? `Geri alınabilir ${n} işlem (Ctrl+Z). Son: ${undoStack[n - 1].label}`
    : 'Geri alınacak işlem yok';
}

// ---- Çoklu sekme yazma koruması (v2.84) -------------------------------
// Aynı tarayıcıda iki sekme aynı dosyada çalışırsa, her sekme TÜM durumu
// yazar; son yazan diğerinin değişikliklerini ezer. Kanıtlandı.
// Çözüm: her sekme açılışta bir "sahip" damgası bırakır. Yeni sekme açılınca
// eskisine BroadcastChannel ile haber verilir; eski sekme YAZMAYI BIRAKIR ve
// kullanıcıyı uyarır. Böylece veri ezilmez ve iş kaybedilmez.
const TAB_ID = 'tab_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
let tabOwner = null;      // null = henüz belirlenmedi
let tabIsWriter = true;   // bu sekme yazabilir mi
let tabChannel = null;
function initTabGuard() {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    tabChannel = new BroadcastChannel('akis.tab');
    tabChannel.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.type === 'claim' && m.id !== TAB_ID) {
        // Başka bir sekme yazma hakkı istiyor: bu sekme bırakır.
        if (tabIsWriter) {
          tabIsWriter = false;
          const el = $('#saveState');
          if (el) {
            el.textContent = '● BAŞKA SEKME AÇIK — bu sekme artık kaydetmiyor';
            el.classList.add('danger');
          }
          showToast(
            'Uygulama başka bir sekmede açıldı. Bu sekmedeki değişiklikler KAYDEDİLMİYOR. ' +
              'Bu sekmeyi kapatın veya sayfayı yenileyin.'
          );
        }
      }
      if (m.type === 'claim' && m.id === TAB_ID) {
        tabIsWriter = true;
      }
    };
    tabChannel.postMessage({ type: 'claim', id: TAB_ID });
  } catch (e) {}
}
function tabWriteGuard() {
  return tabIsWriter;
}
// persist() sık çağrılır (her tuş vuruşu). Yazmalar sıraya alınır ve 400 ms
// içinde biriken çağrılar tek yazmada birleştirilir; böylece yazma yarışı
// olmaz ve disk yorulmaz.
// ANCAK gecikme, sayfa kapanırken son değişikliklerin kaybolmasına yol
// açıyordu (v2.84 öncesi: beforeunload yoktu). Kullanıcı yazıp hemen sekmeyi
// kapatırsa son 400 ms giderdi. Artık kapanışta bekleyen yazma ZORLANIR.
//
// v2.95: `updatedAt` tazeleme TEK KAPIDAN yapılır. Dava verisini değiştiren
// her yol persist() çağırır; damga burada tazelenir. Böylece 72 çağrı yerini
// tek tek düzeltmek (ve birini unutmak) gerekmez.
// Yükleme/göç yolu `persist({ touch: false })` kullanır: dosya AÇMAK düzenleme
// değildir; tazelenirse her açılışta dosya "en yeni" görünüp birleştirmede
// haksız kazanır.
function persist(opts = {}) {
  if (opts.touch !== false) {
    for (const c of appState.cases || []) touchCaseUpdated(c);
  }
  persistPending = true;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistChain = persistChain.then(persistNow, persistNow).then(() => {
      persistPending = false;
    });
  }, 400);
}
// Bekleyen yazmayı hemen diske indirir. Sayfa gizlenince/kapanınca çağrılır.
// IndexedDB yazması eşzamansızdır; kapanışta tamamlanmayabilir, bu yüzden
// ayrıca localStorage'a küçük bir "son durum" kopyası bırakılır (kurtarma
// için). Bu kopya yalnız yazma tamamlanmamışsa işe yarar.
function flushPersist() {
  if (!persistPending) return;
  clearTimeout(persistTimer);
  persistPending = false;
  try {
    // Küçük kurtarma kopyası: dava verisinin yalnız metin kısmı, ses hariç.
    // Boyut riski nedeniyle yalnız bekleyen durum varsa ve sığıyorsa yazılır.
    // Kurtarma kopyası da boş taslağı taşımaz (v2.109).
    const cases = casesForStorage(appState.cases);
    if (!cases.length) {
      // Yazacak veri yok: bayat kopya kalırsa silinen dosyalar geri gelir.
      localStorage.removeItem('akis.lastSnapshot');
    } else {
      const snapshot = { at: new Date().toISOString(), cases };
      const json = JSON.stringify(snapshot);
      if (json.length < 4.5 * 1024 * 1024) localStorage.setItem('akis.lastSnapshot', json);
    }
  } catch (e) {}
  persistChain = persistChain.then(persistNow, persistNow);
}
// Sayfa kapanırken/gizlenirken bekleyen yazmayı zorla.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeunload', flushPersist);
  window.addEventListener('pagehide', flushPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
}
// Büyük, kapatılamaz uyarı şeridi. Kullanıcı ne olduğunu ve ne yapacağını
// açıkça görmeli; sessiz veri kaybı adli belgede kabul edilemez.
function showStorageBanner() {
  let el = $('#storageBanner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'storageBanner';
    el.className = 'storage-banner';
    el.innerHTML =
      '<div class="sb-body"><b>Depolama doldu — yeni değişiklikler KAYDEDİLMİYOR</b>' +
      '<small>Tarayıcının yerel alanı doldu. Şu andan sonra yaptığınız düzenlemeler kaybolur. ' +
      'Hemen <b>Paket oluştur</b> ile dosyayı bilgisayarınıza alın, sonra eski dosyaları silin.</small></div>' +
      '<button class="button button-primary button-small" id="storageBannerExport">Paket oluştur</button>' +
      '<button class="icon-button" id="storageBannerClose" aria-label="Kapat">×</button>';
    document.body.appendChild(el);
    $('#storageBannerExport')?.addEventListener('click', () => exportProject().catch((e) => showToast(e.message)));
    $('#storageBannerClose')?.addEventListener('click', hideStorageBanner);
  }
  // Ekran okuyucu kesintili duyurur: yeni değişiklikler kaydedilmiyor (v2.135).
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'assertive');
  el.hidden = false;
}
function hideStorageBanner() {
  const el = $('#storageBanner');
  if (el) el.hidden = true;
}
function freshCase() {
  const now = new Date().toISOString();
  const c = {
    // --- v3 şeması (bkz. assets/schema.js) ---
    schemaVersion: 3,
    schemaName: 'akis.case',
    id: uid(),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    reportType: 'hukuk',
    court: '',
    fileNo: '',
    subject: '',
    caseDate: '',
    inspectionDate: '',
    parties: { plaintiff: '', plaintiffCounsel: '', defendant: '', defendantCounsel: '' },
    assignment: { date: '', dueDate: '', durationDays: '', scope: '', body: '' },
    expert: { name: '', registryNo: '', field: '56.12 – Ses kayıtlarının metin hâline dönüştürülmesi' },
    team: [],
    report: {
      date: dateToday(),
      methodText: DEFAULT_METHOD,
      limitationsText: '',
      conclusionText: ''
    },
    questions: [],
    materials: [],
    shared: false,
    lastEditedBy: '',
    mergeLog: [],
    // --- v2 uyumluluk: düz alanlar. Depolamada asıl veri yukarıdaki iç içe
    // yapıdadır; bu erişimciler okuma/yazmayı iki yapıya da yansıtır. Yeni
    // kod iç içe alanı kullanmalı; bunlar yalnız eski çağrılar içindir.
    synthetic: false
  };
  syncCaseMirrors(c);
  defineCaseMirrors(c);
  return c;
}
// v3 iç içe alanlar ile v2 düz alanları aynı değere bağlar. Hangi taraftan
// yazılırsa yazılsın ikisi tutarlı kalır; böylece 168 düz alan erişimini
// tek tek değiştirmek gerekmez ve veri iki biçimde ayrışmaz.
const CASE_MIRROR = [
  ['plaintiff', 'parties', 'plaintiff'],
  ['plaintiffCounsel', 'parties', 'plaintiffCounsel'],
  ['defendant', 'parties', 'defendant'],
  ['defendantCounsel', 'parties', 'defendantCounsel'],
  ['assignmentDate', 'assignment', 'date'],
  ['dueDate', 'assignment', 'dueDate'],
  ['assignmentDurationDays', 'assignment', 'durationDays'],
  ['assignmentScope', 'assignment', 'scope'],
  ['expertName', 'expert', 'name'],
  ['registryNo', 'expert', 'registryNo'],
  ['expertField', 'expert', 'field'],
  ['reportDate', 'report', 'date'],
  ['methodText', 'report', 'methodText'],
  ['limitationsText', 'report', 'limitationsText'],
  ['conclusionText', 'report', 'conclusionText']
];
function syncCaseMirrors(c) {
  if (!c) return c;
  for (const [flat, group, key] of CASE_MIRROR) {
    if (!c[group] || typeof c[group] !== 'object') c[group] = {};
    // Düz alan varsa iç içe yapıya, yoksa iç içeden düze kopyala.
    if (c[flat] !== undefined && c[flat] !== '' && c[flat] !== null) c[group][key] = c[flat];
    else c[flat] = c[group][key] || '';
  }
  c.name = c.name || c.fileNo || 'Yeni inceleme dosyası';
  return c;
}
// Düz alan okuma/yazma erişimcisi: `c.parties.plaintiff` ile `c.plaintiff`
// her zaman aynı değeri verir. Nesne üzerinde tanımlayıcı ile kurulur ki
// mevcut `c.plaintiff = ...` yazımları da çalışsın.
function defineCaseMirrors(c) {
  for (const [flat, group, key] of CASE_MIRROR) {
    if (Object.prototype.hasOwnProperty.call(c, flat) && Object.getOwnPropertyDescriptor(c, flat)?.get) continue;
    if (!c[group] || typeof c[group] !== 'object') c[group] = {};
    const value = c[flat] !== undefined && c[flat] !== '' ? c[flat] : c[group][key] || '';
    c[group][key] = value;
    Object.defineProperty(c, flat, {
      get() {
        return this[group] ? this[group][key] : '';
      },
      set(v) {
        if (!this[group]) this[group] = {};
        this[group][key] = v;
      },
      configurable: true,
      enumerable: false
    });
  }
  return c;
}
// Older builds persisted derived waveform peaks inside each material, which
// inflated localStorage by ~32 KB per recording. Drop them on load so existing
// records shrink back to their real size.
function stripDerivedFields(state) {
  let cleaned = false;
  for (const c of state.cases || []) {
    for (const m of c.materials || []) {
      if ('__peaks' in m) {
        delete m.__peaks;
        cleaned = true;
      }
      // A–B dinleme döngüsü oturumluktur; kayda ve dışa aktarıma girmez.
      if ('__loop' in m) {
        delete m.__loop;
        cleaned = true;
      }
      // v2.70: yarıda kalmış çözümleme durumu kayda yazılmışsa temizle.
      // Aksi hâlde dosya sonsuza kadar "çözümleme sürüyor %70" gösterir ve
      // iptal edilemez (dinleyen döngü yok).
      if (m.status === 'transcribing') {
        m.status = (m.segments || []).length ? 'partial' : 'pending';
        delete m.progress;
        cleaned = true;
      }
      if ('progress' in m && m.status !== 'transcribing') {
        delete m.progress;
        cleaned = true;
      }
      if ('cancelRequested' in m) {
        delete m.cancelRequested;
        cleaned = true;
      }
      // v2.72: kota temizliği. Eski kayıtlarda kalmış büyük alanlar atılır.
      for (const sg of m.segments || []) {
        if (Array.isArray(sg.history) && sg.history.length > 10) {
          sg.history = sg.history.slice(-10);
          cleaned = true;
        }
      }
      if (m.previousSegments) {
        for (const sg of m.previousSegments.segments || []) {
          if (Array.isArray(sg.words) && sg.words.length) {
            sg.words = [];
            cleaned = true;
          }
          if (Array.isArray(sg.history) && sg.history.length) {
            sg.history = [];
            cleaned = true;
          }
        }
      }
    }
    // Eski yöntem metni aracın kendisini anıyordu; kayıtlı dosyalarda da
    // rapora sızmasın diye yeni metne çevrilir. Yalnız eski varsayılanla
    // birebir aynıysa değiştirilir; bilirkişinin yazdığı metne dokunulmaz.
    if (c.methodText === LEGACY_DEFAULT_METHOD) {
      c.methodText = DEFAULT_METHOD;
      cleaned = true;
    }
    for (const m of c.materials || []) {
      // Eski şemayla üretilmiş ölçüm gösterilmez; bilirkişi düğmeye basınca
      // yeniden hesaplanır. Yapılmamış ölçüm yapılmış gibi görünmemeli.
      if (m.levels && m.levels.ok && m.levels.schema !== LEVELS_SCHEMA) {
        delete m.levels;
        cleaned = true;
      }
      // Aynı kural sessizlik ölçümü için (v2.92): eski ölçüm yalnız kanal 0'ı
      // okuyordu; konuşma sağ kanalda ise "tamamen sessiz" diyordu. Geçersiz.
      for (const sg of m.segments || []) {
        if (sg.silence && sg.silence.ok && sg.silence.schema !== SILENCE_SCHEMA) {
          delete sg.silence;
          cleaned = true;
        }
      }
    }
  }
  return cleaned;
}
// Eski sürümler metin geçmişini her tuş vuruşunda kaydettiği için kayıtlar aynı
// metnin onlarca ara hâlini taşır ("" -> "M" -> "Me" -> ...). Ardışık iki kayıt
// birbirinin öneki ise (yazma veya silme adımı) aynı düzenleme oturumudur;
// oturumun başlangıç hâli korunur, ara adımlar atılır. Önek ilişkisi kırıldığında
// yeni oturum başlar ve o hâl ayrıca korunur. Boş sürümler geçmişe girmez.
function compactHistory(hist) {
  if (!Array.isArray(hist) || hist.length < 2) return hist || [];
  const out = [];
  for (const h of hist) {
    const t = h.text || '';
    const prev = out[out.length - 1];
    const isPrefix = prev && (t.startsWith(prev.text) || prev.text.startsWith(t));
    if (isPrefix) continue; // aynı oturumun ara adımı; oturum başı korunur
    out.push({ text: t, at: h.at, actor: h.actor || '' });
  }
  return out.length ? out : [{ text: '', at: hist[hist.length - 1].at, actor: hist[hist.length - 1].actor || '' }];
}
function compactAllHistories(state) {
  let changed = false;
  for (const c of state.cases || []) {
    for (const m of c.materials || []) {
      for (const sg of m.segments || []) {
        if (Array.isArray(sg.history) && sg.history.length > 1) {
          const c2 = compactHistory(sg.history);
          if (c2.length !== sg.history.length) {
            sg.history = c2;
            changed = true;
          }
        }
      }
    }
  }
  return changed;
}
// IndexedDB'den dava verisini okur. Bulamazsa eski localStorage kaydını
// (v2.72 ve öncesi) okur ve IndexedDB'ye TAŞIR; böylece mevcut kullanıcı
// verisi kaybolmaz.
async function readStoredState() {
  try {
    const db = await dbOpen();
    const rec = await new Promise((resolve, reject) => {
      const r = db.transaction(STATE_STORE, 'readonly').objectStore(STATE_STORE).get(STORE_KEY);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
    if (rec && rec.value && Array.isArray(rec.value.cases)) return { state: rec.value, migrated: false };
  } catch (e) {
    console.warn('IndexedDB okunamadı, localStorage denenecek', e);
  }
  // Göç: eski localStorage kaydı
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const st = JSON.parse(raw);
      if (Array.isArray(st.cases)) {
        // Taşındıktan sonra localStorage'daki büyük kopya SİLİNİR (yer açar).
        localStorage.removeItem(STORE_KEY);
        return { state: st, migrated: true };
      }
    }
  } catch (e) {
    console.warn('localStorage kaydı okunamadı', e);
  }
  return { state: null, migrated: false };
}
// Kurtarma kopyasındaki dosyaları AYRI normalleştirir. Ana yükleme yoluyla
// aynı sözleşme (v2.132): bozuk dosya SESSİZCE atlanmaz, `failed` listesine
// girer ve `reportLoadFailures` ile bildirilir. v2.131 ve öncesinde bu yol
// `catch (e) {}` kullanıyordu: kullanıcı "2 dosya geri yüklendi" görüyor,
// üçüncünün kaybolduğunu bilmiyordu.
function normalizeRescueCases(rawCases) {
  const ok = [];
  const failed = [];
  for (const raw of Array.isArray(rawCases) ? rawCases : []) {
    try {
      const nc = normalizeCase(raw);
      syncCaseMirrors(nc);
      defineCaseMirrors(nc);
      ok.push(nc);
    } catch (e) {
      // `raw.id` okuması da fırlatabilir (bozuk kayıt); kimlik okunamazsa boş
      // kalır, bildirim yine yapılır.
      let id = '';
      try {
        id = (raw && raw.id) || '';
      } catch (err) {
        id = '';
      }
      failed.push({ id, error: e });
    }
  }
  return { cases: ok, failed };
}
async function loadState() {
  let stored = null;
  let migrated = false;
  try {
    const r = await readStoredState();
    stored = r.state;
    migrated = r.migrated;
  } catch (e) {
    // Okuma hatası: veriye DOKUNMA, boş durumla başlama, ÜZERİNE YAZMA.
    console.error('Kayıt okunamadı:', e);
    showLoadFailure(e, 'okuma');
    return;
  }
  if (!stored) {
    // Depo boş. Ama kurtarma kopyası varsa veri kaybı olmuş olabilir:
    // sessizce yeni dosya açmak yerine kullanıcıya SOR.
    const rescue = readLastSnapshot();
    if (rescue && rescue.cases && rescue.cases.length) {
      const ok = await askConfirm(
        'Kurtarma kopyası bulundu',
        `Yerel depo boş, ancak ${rescue.cases.length} dosyalık bir kurtarma kopyası var ` +
          `(${rescue.at ? new Date(rescue.at).toLocaleString('tr-TR') : 'zaman bilinmiyor'}). ` +
          'Bu kopya geri yüklensin mi? "Vazgeç" derseniz boş yeni dosyayla başlanır ve kopya korunur.'
      );
      if (ok) {
        const { cases, failed } = normalizeRescueCases(rescue.cases);
        // Bozuk dosya sessizce atlanmaz (v2.132). Ham kayıt kurtarma alanına
        // konur; kopya SİLİNMEZ (kullanıcı elle kurtarabilir).
        if (failed.length) reportLoadFailures(failed, { cases: rescue.cases });
        if (cases.length) {
          appState = { cases, activeCaseId: cases[0].id };
          persist();
          showToast(`${cases.length} dosya kurtarma kopyasından geri yüklendi.`);
          return;
        }
      }
    }
    // Gerçekten boş kurulum: ilk dosyayı oluştur.
    const c = freshCase();
    appState = { cases: [c], activeCaseId: c.id };
    persist();
    return;
  }
  if (!Array.isArray(stored.cases)) {
    // Kök yapı bozuk. Boş duruma düşüp üzerine yazmak = veri kaybı.
    showLoadFailure(new Error('Kök yapı bozuk (cases dizi değil)'), 'yapı');
    return;
  }
  if (migrated) console.info('Eski localStorage kaydı IndexedDB\'ye taşındı.');

  // HER DOSYA AYRI normalleştirilir. Bir dosya bozuksa YALNIZ o atlanır;
  // diğerleri korunur. v2.83 ve öncesinde tek hata tüm listeyi çöpe atıyor
  // (cases = []) ve sonraki kayıt bu boşluğu diske yazıyordu — yani tek bozuk
  // alan bütün arşivi siliyordu (kanıtlandı, v2.84).
  const ok = [];
  const failed = [];
  for (const raw of stored.cases) {
    try {
      const nc = normalizeCase(raw);
      syncCaseMirrors(nc);
      defineCaseMirrors(nc);
      ok.push(nc);
    } catch (e) {
      failed.push({ id: raw && raw.id, error: e });
    }
  }
  appState = { ...stored, cases: ok };
  if (!ok.some((c) => c.id === appState.activeCaseId)) appState.activeCaseId = ok[0] ? ok[0].id : null;

  // Yüklenemeyen dosyalar sessizce yok sayılmaz: kullanıcı bilir, ham veri
  // kurtarma alanına konur. Otomatik silme YOK.
  if (failed.length) reportLoadFailures(failed, stored);

  try {
    stripDerivedFields(appState);
    // Eski sürümler günlüğü hash'siz yazıyordu. Bu kayıtlar "kurcalanmış"
    // sayılmamalı ama "doğrulandı" da denmemeli; zincire bağlanır.
    upgradeAllLogChains(appState);
    if (compactAllHistories(appState)) persist({ touch: false });
  } catch (e) {
    // Bakım hatası veriyi silmemeli: yalnız atlanır ve bildirilir.
    console.error('Yükleme sonrası bakım hatası:', e);
  }
  // BOŞ DOSYA TEMİZLİĞİ (v2.102): eski sürümlerde geri yükleme "boş dosya +
  // gelen dosyalar" bırakıyordu. Veri taşımayan kayıtlar açılışta düşürülür;
  // kaybedilecek veri yoktur ve seçicide sahte "dosya" görünmez.
  if (appState.cases.length) {
    const cleaned = dropEmptyCases(appState.cases);
    if (cleaned.dropped) appState.cases = cleaned.cases;
  }
  if (!appState.cases.length) {
    const c = freshCase();
    appState.cases.push(c);
    appState.activeCaseId = c.id;
  }
  if (!currentCase()) appState.activeCaseId = appState.cases[0].id;
  clearLastSnapshot();
  // Dosya AÇMAK düzenleme değildir; `updatedAt` tazelenmez (v2.95).
  persist({ touch: false });
}
// Son durum kurtarma kopyasını okur (flushPersist yazar). Bozuksa null.
function readLastSnapshot() {
  try {
    const raw = localStorage.getItem('akis.lastSnapshot');
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !Array.isArray(v.cases)) return null;
    return v;
  } catch (e) {
    return null;
  }
}
// Başarılı yüklemeden sonra kurtarma kopyası silinir: artık asıl kayıt var.
function clearLastSnapshot() {
  try {
    localStorage.removeItem('akis.lastSnapshot');
  } catch (e) {}
}
// Yükleme başarısızsa: kullanıcıya söyle, ham veriye DOKUNMA.
// Sessiz sıfırlama yasak (v2.84).
function showLoadFailure(err, kind) {
  const el = $('#saveState');
  if (el) {
    el.textContent = '● KAYIT OKUNAMADI — veriye dokunulmadı';
    el.classList.add('danger');
  }
  showToast(
    `Kayıt okunamadı (${kind}). Hiçbir şey silinmedi. Sayfayı yenilemeyin; önce Paket oluşturmayı deneyin.`,
    true
  );
  console.error('loadState hatası:', err);
}
// Bir veya birkaç dosya yüklenemedi: ham kayıt ayrı anahtarda saklanır,
// kullanıcı bilgilendirilir. "Bozuk dosya yüzünden arşiv gitti" olmaz.
function reportLoadFailures(failed, stored) {
  try {
    const ids = new Set(failed.map((f) => f.id).filter(Boolean));
    localStorage.setItem(
      'akis.rescue.failedCases',
      JSON.stringify({
        at: new Date().toISOString(),
        count: failed.length,
        cases: (stored.cases || []).filter((c) => c && ids.has(c.id))
      })
    );
  } catch (e) {}
  const el = $('#saveState');
  if (el) {
    el.textContent = `● ${failed.length} dosya yüklenemedi — diğerleri korundu`;
    el.classList.add('danger');
  }
  showToast(
    `${failed.length} dosya okunamadı ve atlandı; diğer dosyalarınız korundu. ` +
      'Ham kayıt kurtarma alanında tutuldu. Lütfen paket oluşturun.',
    true
  );
  console.error('Yüklenemeyen dosyalar:', failed.map((f) => f.error));
}
function dbOpen() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    // v2.73: dava verisi de IndexedDB'ye taşındı. localStorage 5 MB ile
    // sınırlıydı; tarayıcı kotası ise 10 GB mertebesinde. Aynı veritabanında
    // ikinci bir store açılıyor (STATE_STORE).
    const r = indexedDB.open(DB_NAME, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE, { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}
async function storeBlob(key, blob) {
  try {
    const db = await dbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put({ key, blob });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Ses dosyası kalıcı depoya yazılamadı', e);
  }
}
async function readBlob(key) {
  try {
    const db = await dbOpen();
    return await new Promise((resolve, reject) => {
      const r = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      r.onsuccess = () => resolve(r.result?.blob || null);
      r.onerror = () => reject(r.error);
    });
  } catch (e) {
    return null;
  }
}
async function deleteBlob(key) {
  try {
    const db = await dbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {}
}
function blobKey(c, m) {
  return `${c.id}::${m.id}`;
}
// `urgent` = kritik uyarı (kayıt okunamadı, dosya atlandı, yazma hatası):
// ekran okuyucu bekleyen işi kesip okur (role=alert, assertive). Normal bilgi
// polite kalır; kullanıcıyı sürekli bölmez (v2.135).
function showToast(msg, urgent) {
  const el = $('#toast');
  el.textContent = msg;
  el.setAttribute('role', urgent ? 'alert' : 'status');
  el.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => el.classList.remove('show'), 3400);
}
function switchView(name) {
  // "Dosya bilgileri" artık ayrı sayfa değil, sağ çekmece. Böylece çalışma
  // alanı kapanmaz; dosya formu üzerine açılır.
  if (name === 'case') {
    populateCaseForm();
    setCaseDrawer(true);
    return;
  }
  // Ses kayıtları açılırken: kayıt varsa doğrudan çalışma moduna gir. Uzman
  // zaten tek kaydı dinleyip yazıyor; materyal şeridi sürekli gerekmiyor.
  // Kullanıcı "← Kayıt listesine dön" ile şeride geçebilir.
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  $$('.nav-item[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  const labels = {
    overview: 'Genel görünüm',
    case: 'Dosya bilgileri',
    audio: 'Ses kayıtları',
    questions: 'İnceleme ve sorular',
    report: 'Rapor oluştur'
  };
  $('#pageTitle').textContent = labels[name] || 'AKİS';
  $('#topEyebrow').textContent =
    name === 'overview'
      ? 'ÇALIŞMA ALANI'
      : `0${['overview', 'case', 'audio', 'questions', 'report'].indexOf(name)} / AKİS`;
  if (name === 'report') renderReport();
  if (name === 'questions') populateQuestionsForm();
  if (name === 'audio') {
    // GÖRÜNÜR OLDUKTAN SONRA BİR KEZ DAHA ÇİZ (v2.154). Gizli görünümde
    // çizilen tuvalin genişliği 0'dır; dalga boş kalır (ölçüldü: painted=0,
    // bölüm değiştirince 3020). Yeniden çizim, gerçek genişlikle bağlanır.
    renderAudioList()
      .then(() =>
        requestAnimationFrame(() => {
          const m = activeMaterial();
          if (m && techOpenPref()) renderSegDetail(m);
        })
      )
      .catch(() => {});
  }
}
function renderCaseSelect() {
  const sel = $('#caseSelect');
  // ARŞİVLİ DOSYALAR SEÇİCİDE GÖRÜNMEZ (v2.107): çalışma alanı sade kalır.
  // Verileri SİLİNMEZ; "Arşiv (N)" düğmesinden geri alınır.
  const shown = visibleCases(appState.cases);
  // Aktif dosya arşivlenmişse seçici boş görünmesin: ilk görünür dosyaya geç.
  if (shown.length && !shown.some((c) => c.id === appState.activeCaseId)) {
    appState.activeCaseId = shown[0].id;
  }
  sel.innerHTML = shown
    .map((c) => {
      // BOŞ TASLAK "dosya" gibi görünmez (v2.109): kayda yazılmadığı için
      // zaten dosya değildir. Kullanıcı "ilk açılış boş" görür.
      const label = isEmptyCase(c) ? '— Yeni dosya —' : caseDisplayName(c);
      return `<option value="${esc(c.id)}" ${c.id === appState.activeCaseId ? 'selected' : ''}>${esc(label)}</option>`;
    })
    .join('');
  const archivedCount = (appState.cases || []).filter(isArchivedCase).length;
  const btn = $('#archiveBtn');
  if (btn) {
    btn.textContent = `Arşiv (${archivedCount})`;
    btn.classList.toggle('has-items', archivedCount > 0);
    btn.disabled = archivedCount === 0;
    btn.title =
      archivedCount === 0
        ? 'Arşivde dosya yok. Arşivlenen dosyalar burada saklanır; verileri silinmez.'
        : `Arşivde ${archivedCount} dosya var. Aç, geri al veya (iki onayla) kalıcı sil.`;
  }
}
const CASE_FIELDS = [
  'reportType',
  'court',
  'fileNo',
  'assignmentDate',
  'dueDate',
  'assignmentDurationDays',
  'plaintiff',
  'plaintiffCounsel',
  'defendant',
  'defendantCounsel',
  'subject',
  'caseDate',
  'inspectionDate',
  'expertName',
  'registryNo',
  'expertField',
  'reportDate'
];
function populateCaseForm() {
  const c = currentCase();
  if (!c) return;
  for (const k of CASE_FIELDS) {
    const el = $(`#${k}`);
    if (el) el.value = c[k] ?? '';
  }
  applyRoleLabels(c.reportType);
  renderTeam();
}
// ---- Ekip (ortak çalışma) ----------------------------------------------
// Ekip, aynı dosyada çalışan bilirkişi/yardımcıları tanımlar. Rapora GİRMEZ;
// amaç iş bölümü, cevap atfı ve birleştirmede kimin ne yaptığını bilmektir.
function renderTeam() {
  const c = currentCase();
  const host = $('#teamList');
  if (!c || !host) return;
  const team = c.team || [];
  if (!team.length) {
    host.innerHTML = '<div class="seg-empty-note">Henüz ekip üyesi yok. Tek başınıza çalışıyorsanız bu bölümü boş bırakabilirsiniz.</div>';
    return;
  }
  const roleOpts = (sel) =>
    TEAM_ROLE.map((r) => `<option value="${esc(r)}" ${sel === r ? 'selected' : ''}>${esc(TEAM_ROLE_LABEL[r])}</option>`).join('');
  // "Şu an bu bilgisayarda kim çalışıyor" seçicisi. Seçilen kişi metin
  // geçmişine yazılır ve ikinci göz ise düzeltmeleri öneri olarak saklanır.
  const whoOpts = [
    '<option value="">— seçilmedi —</option>',
    ...team.map(
      (t) =>
        `<option value="${esc(t.id)}" ${c.lastEditedBy === t.id ? 'selected' : ''}>${esc(t.name || '(ad girilmedi)')} · ${esc(TEAM_ROLE_LABEL[t.role] || t.role)}</option>`
    )
  ].join('');
  const whoBox = `<div class="team-who">
      <label class="seg-field"><span>Şu an bu bilgisayarda çalışan</span>
        <select id="whoEditingSelect">${whoOpts}</select></label>
      <p class="drawer-note">Seçilen kişi metin geçmişine yazılır. Yardımcı veya kontrol eden seçilirse düzeltmeler <b>öneri</b> olur; onay yetkisi dosya sorumlusunda kalır.</p>
    </div>`;
  host.innerHTML =
    whoBox +
    team
      .map(
        (t, i) => `<div class="team-card" data-team-card="${esc(t.id)}">
      <div class="seg-row2">
        <label class="seg-field"><span>Ad soyad</span><input data-team="${esc(t.id)}" data-team-key="name" value="${esc(t.name || '')}" placeholder="Ad Soyad"></label>
        <label class="seg-field"><span>Görev</span><select data-team="${esc(t.id)}" data-team-key="role">${roleOpts(t.role)}</select></label>
      </div>
      <div class="seg-row2">
        <label class="seg-field"><span>Sicil no</span><input data-team="${esc(t.id)}" data-team-key="registryNo" value="${esc(t.registryNo || '')}" placeholder="Bilirkişi sicil no"></label>
        <label class="seg-field"><span>Kurum</span><input data-team="${esc(t.id)}" data-team-key="institution" value="${esc(t.institution || '')}" placeholder="Birim / kurum"></label>
      </div>
      <button class="mini-button tiny danger" data-team-remove="${esc(t.id)}" type="button">ekipten çıkar</button>
    </div>`
      )
      .join('');
}
function addTeamMember() {
  const c = currentCase();
  if (!c) return;
  c.team = c.team || [];
  c.team.push(emptyTeamMember({ role: c.team.length ? 'assistant' : 'expert' }));
  persist();
  renderTeam();
}
function updateTeamMember(id, key, value) {
  const c = currentCase();
  const t = (c?.team || []).find((x) => x.id === id);
  if (!t) return;
  t[key] = value;
  persist();
  // Ad veya görev değişince "kim çalışıyor" seçicisinin etiketi de tazelenir.
  if (key === 'name' || key === 'role') refreshWhoOptions();
}
// "Kim çalışıyor" seçicisinin seçeneklerini, odağı bozmadan tazeler.
function refreshWhoOptions() {
  const c = currentCase();
  const sel = $('#whoEditingSelect');
  if (!c || !sel) return;
  sel.innerHTML =
    '<option value="">— seçilmedi —</option>' +
    (c.team || [])
      .map(
        (t) =>
          `<option value="${esc(t.id)}" ${c.lastEditedBy === t.id ? 'selected' : ''}>${esc(t.name || '(ad girilmedi)')} · ${esc(TEAM_ROLE_LABEL[t.role] || t.role)}</option>`
      )
      .join('');
}
function removeTeamMember(id) {
  const c = currentCase();
  if (!c?.team) return;
  c.team = c.team.filter((x) => x.id !== id);
  // Çıkarılan kişi "şu an çalışan" ise seçim temizlenir; tanımsız kimlik kalmasın.
  if (c.lastEditedBy === id) c.lastEditedBy = '';
  persist();
  renderTeam();
}
function applyRoleLabels(type) {
  const spec = reportTypeSpec(type);
  const map = {
    labelFileNo: spec.fileNo + ' *',
    labelPlaintiff: spec.roles.plaintiff,
    labelPlaintiffCounsel: spec.roles.plaintiffCounsel,
    labelDefendant: spec.roles.defendant,
    labelDefendantCounsel: spec.roles.defendantCounsel,
    labelSubject: spec.subject + ' *',
    labelCaseDate: spec.date
  };
  for (const id in map) {
    const el = $(`#${id}`);
    if (el) el.textContent = map[id];
  }
}
function updateCaseName(c) {
  c.name = c.fileNo ? `${c.fileNo} · ${c.court || 'İnceleme dosyası'}` : c.court || 'Yeni inceleme dosyası';
  renderCaseSelect();
}
function readCaseForm() {
  const c = currentCase();
  if (!c) return;
  for (const k of CASE_FIELDS) {
    const el = $(`#${k}`);
    if (el) c[k] = el.value;
  }
  applyRoleLabels(c.reportType);
  updateCaseName(c);
  persist();
  renderOverview();
}
function populateQuestionsForm() {
  const c = currentCase();
  if (!c) return;
  $('#assignmentScope').value = c.assignmentScope || '';
  $('#methodText').value = c.methodText || DEFAULT_METHOD;
  $('#limitationsText').value = c.limitationsText || '';
  $('#conclusionText').value = c.conclusionText || '';
  renderQuestions();
}
function readQuestionsForm() {
  const c = currentCase();
  if (!c) return;
  c.assignmentScope = $('#assignmentScope').value;
  c.methodText = $('#methodText').value;
  c.limitationsText = $('#limitationsText').value;
  c.conclusionText = $('#conclusionText').value;
  persist();
}
function renderOverview() {
  const c = currentCase();
  if (!c) return;
  $('#welcomeTitle').textContent = c.court || 'Çalışmaya başlayın';
  $('#welcomeSub').textContent = c.fileNo
    ? `Dosya: ${c.fileNo} · ${c.subject || 'İnceleme konusu henüz girilmedi.'}`
    : 'Dosya bilgilerini girin, ses kayıtlarını ekleyin ve inceleme raporunuzu hazırlayın.';
  const mats = c.materials || [];
  const total = mats.reduce((n, m) => n + (m.duration || 0), 0);
  const segments = mats.flatMap((m) => m.segments || []);
  const checked = segments.filter((s) => isReviewed(s)).length;
  $('#statAudio').textContent = mats.length;
  $('#statDuration').textContent = fmtShort(total);
  $('#statSegments').textContent = segments.length;
  $('#statChecked').textContent = segments.length ? `${Math.round((checked / segments.length) * 100)}%` : '0%';
  $('#audioCount').textContent = mats.length;
  $('#stepCase').textContent = c.court && c.fileNo && c.expertName ? 'Tamamlandı' : 'Bilgi bekliyor';
  $('#stepAudio').textContent = `${mats.length} kayıt`;
  $('#stepQuestions').textContent = c.questions.length ? 'Düzenlendi' : 'Bekliyor';
  $('#stepReport').textContent = mats.length && c.court && c.fileNo ? 'Önizlenebilir' : 'Bilgi bekliyor';
  $('#overviewCase').innerHTML = [
    ['MER Cİ', 'Mahkeme / merci', c.court],
    ['DOSYA NO', 'Dosya numarası', c.fileNo],
    ['KONU', 'İnceleme konusu', c.subject],
    ['BİLİRKİŞİ', 'Bilirkişi', c.expertName]
  ]
    .map((x) => `<div class="overview-item"><small>${x[1].toUpperCase()}</small><b>${esc(x[2] || '—')}</b></div>`)
    .join('');
  renderStatusBar();
}
// Alt durum çubuğu: hangi dosyada olduğumuzu ve genel durumu her an gösterir.
// Genel görünüm sayfasındaki tekrarın yerini alır.
function renderStatusBar() {
  const c = currentCase();
  if (!c) return;
  const mats = c.materials || [];
  const segs = mats.flatMap((m) => m.segments || []);
  const checked = segs.filter((s) => isReviewed(s)).length;
  const pct = segs.length ? Math.round((checked / segs.length) * 100) : 0;
  const set = (sel, val) => {
    const el = $(sel);
    if (el) el.textContent = val;
  };
  set(
    '#sbCase',
    [c.fileNo, c.court].filter(Boolean).join(' · ') ||
      (isEmptyCase(c) ? 'Henüz dosya yok — bilgi girin veya içe aktarın' : 'Yeni inceleme dosyası')
  );
  set('#sbAudio', String(mats.length));
  set('#sbSegments', String(segs.length));
  set('#sbChecked', `%${pct}`);
  // EKSİK DÖKÜMÜ (v2.114): "%100 olmuyor" sorusunun cevabı.
  // Sayı doğru; kullanıcı HANGİ bölümlerin eksik olduğunu görmeli.
  const pend = $('#sbPending');
  if (pend) {
    const b = pendingBreakdown(segs);
    const txt = pendingSummaryText(segs);
    pend.hidden = !txt;
    pend.textContent = txt ? `· ${txt}` : '';
    pend.title = txt
      ? 'Bu bölümler "kontrol edildi" sayılmaz. Tıklayın: yalnız eksikleri listeleyin.'
      : '';
    pend.dataset.pendingCount = String(b.total);
  }
  const modelEl = $('#sbModel');
  if (modelEl) {
    if (loadedModelId) {
      modelEl.textContent = `${modelShortName(loadedModelId)} · ${asrPipeline && asrPipeline.__device === 'webgpu' ? 'GPU' : 'CPU'}`;
      modelEl.classList.remove('none');
    } else {
      modelEl.textContent = 'model yüklenmedi';
      modelEl.classList.add('none');
    }
  }
}
function renderQuestions() {
  const c = currentCase();
  if (!c) return;
  const qc = $('#qCount');
  if (qc) qc.textContent = String(c.questions.length);
  // Son kullanılan inceleme bölümünü geri yükle.
  try {
    const saved = localStorage.getItem('akis.qTab');
    if (saved) {
      const btn = $(`.split-item[data-qtab="${saved}"]`);
      if (btn && !btn.classList.contains('on')) btn.click();
    }
  } catch (e) {}
  const root = $('#questionsList');
  root.innerHTML = '';
  if (!c.questions.length) {
    root.innerHTML =
      '<div class="empty-state" style="padding:14px"><b>Henüz soru eklenmedi</b><span>Mahkemece cevaplanması istenen soruları ekleyin.</span></div>';
    return;
  }
  c.questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question-card';
    div.innerHTML = `<label class="field"><span>${i + 1}. Soru</span><textarea rows="2" data-q="${i}" data-k="question" placeholder="Mahkemenin sorusu">${esc(q.question || '')}</textarea></label><label class="field"><span>Teknik cevap</span><textarea rows="3" data-q="${i}" data-k="answer" placeholder="Doğrulanmış teknik bulgulara dayalı cevap">${esc(q.answer || '')}</textarea></label><label class="field"><span>Dayanak (kayıt / zaman aralığı)</span><input data-q="${i}" data-k="basis" value="${esc(q.basis || '')}" placeholder="Kayıt adı, 00:00–00:15"></label><button class="mini-button remove-question" data-remove-q="${i}">Soruyu kaldır</button>`;
    root.appendChild(div);
  });
}
function addQuestion() {
  const c = currentCase();
  c.questions.push({ question: '', answer: '', basis: '' });
  persist();
  renderQuestions();
}
async function attachObjectUrl(c, m) {
  const key = blobKey(c, m);
  if (objectUrls.has(key)) return objectUrls.get(key);
  const blob = await readBlob(key);
  if (!blob) return '';
  const u = URL.createObjectURL(blob);
  objectUrls.set(key, u);
  return u;
}
async function getAudioBlob(c, m) {
  const key = blobKey(c, m);
  let blob = await readBlob(key);
  return blob;
}
// Kaydırma ve odak koruması: liste yeniden kurulurken sayfanın ve liste
// panelinin kaydırma konumu saklanır ve geri yüklenir. Böylece işlem sırasında
// ekran zıplamaz; uygulama masaüstü programı gibi davranır.
// Bir kaydın durum bölgesi HTML'i (üst bilgi, ilerleme, uyarılar). Bu bölge
// çözümleme sırasında sık güncellenir; içerik bölgesi (oynatıcı, dalga formu,
// deşifre) yalnızca gerçekten değişince yeniden kurulur. Böylece uzun
// kayıtta sayfa sıçramaz.
// Kayıt durumu artık KOD ile tutulur (pending | transcribing | review | ...).
// Türkçe metin yalnız arayüzde türetilir. Eski kayıtlarda durum metin olarak
// duruyorsa okuma sırasında koda çevrilir; böylece v2 verisi çökertmez.
// Etiketler tek kaynaktan (assets/schema.js) gelir; burada yalnız v2 metin →
// kod eşlemesi tutulur (eski kayıtları okumak için).
const MATERIAL_STATUS_LEGACY = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([code, label]) => [label, code])
);
function materialStatus(m) {
  const raw = m?.status || 'pending';
  return STATUS_LABEL[raw] ? raw : MATERIAL_STATUS_LEGACY[raw] || 'pending';
}
function materialStatusLabel(m) {
  return STATUS_LABEL[materialStatus(m)];
}
function audioStatusZoneHtml(m) {
  // Durum şeridi TEK satır: dosya + durum + kontrol + model + eylemler.
  // Tekrar eden bilgiler (SHA-256, codec, köken, doğrulama, günlük) artık
  // "Kayıt bilgileri" sekmesinde; burada ölü alan bırakılmaz.
  const segs = m.segments || [];
  const checked = segs.filter((s) => isReviewed(s)).length;
  const status = materialStatusLabel(m);
  const stCode = materialStatus(m);
  const stCls = stCode === 'error' || stCode === 'empty' || stCode === 'cancelled' || stCode === 'partial' ? 'bad' : stCode === 'review' ? 'good' : '';
  return `<div class="audio-card-top"><div class="audio-file-icon">♫</div><div class="audio-file-main"><b title="${esc(m.name)}">${esc(m.name)}</b><small>${esc(m.type || 'Ses dosyası')} · ${fmtSize(m.size)} · ${fmtShort(m.duration || 0)}</small></div><span class="head-state ${stCls}">${esc(status)}</span><span class="head-check" title="${esc(pendingSummaryText(segs) || 'Tüm bölümler kontrol edildi.')}">${checked}/${segs.length}</span>${m.transcribedWithModel ? `<span class="head-model">${esc(modelShortName(m.transcribedWithModel))}</span>` : ''}${m.transcribedWithProfile ? `<span class="head-profile" title="Bu kayıt bu çözümleme profiliyle çözümlendi. Profil yalnız dil ipucu/bağlam istemini değiştirir; rapora yazılmaz. Yeni çözümleme, Ayarlar'daki GÜNCEL profili kullanır.">${esc(profileRunLabel(m.transcribedWithProfile))}</span>` : ''}<div class="audio-actions">${materialStatus(m) === 'transcribing' ? `<button class="mini-button danger" data-cancel="${esc(m.id)}">İptal</button>` : `<button class="mini-button primary" data-transcribe="${esc(m.id)}">${segs.length ? 'Yeniden çözümle' : 'Çözümle'}</button>`}<button class="mini-button" data-manual="${esc(m.id)}">＋ Bölüm</button><button class="mini-button" data-remove-audio="${esc(m.id)}">Kaldır</button></div></div>${m.synthetic ? '<div class="synthetic-flag">Kurgusal sentetik kayıt</div>' : ''}${m.lastVerify && m.lastVerify.state === 'mismatch' ? `<div class="warn-box">Son SHA-256 doğrulaması FARKLI: dosya değişmiş olabilir. Ayrıntı "Kayıt bilgileri" sekmesinde.</div>` : ''}${m.lastVerify && m.lastVerify.state === 'unavailable' ? `<div class="warn-box">Son SHA-256 doğrulaması YAPILAMADI: bu tarayıcıda özet hesaplanamıyor (güvenli bağlantı gerekir). Dosya doğrulanmış sayılmaz.</div>` : ''}${typeof m.progress === 'number' ? `<div class="progress-wrap"><div class="progress-bar"><span style="width:${m.progress}%"></span></div><small>Çözümleme ilerlemesi: %${m.progress}</small></div>` : ''}${m.hallucinationWarning ? `<div class="warn-box">${esc(m.hallucinationWarning)}</div>` : ''}${m.languageWarning ? `<div class="warn-box">${esc(m.languageWarning)}</div>` : ''}`;
}
// Yalnızca durum bölgesini tazeler; oynatıcı, dalga formu ve deşifre korunur.
function refreshAudioStatusZone(m) {
  const zone = $(`#status-zone-${CSS.escape(m.id)}`);
  if (zone) zone.innerHTML = audioStatusZoneHtml(m);
  refreshMaterialRow(m);
}
// ---- Master-detail düzeni ----
// Onlarca ses kaydı olduğunda her kayıt için tam bir editör çizmek sayfayı
// aşırı uzatıyordu. Artık üstte kompakt bir kayıt listesi, altta yalnızca
// seçili kaydın tam detayı gösterilir. Böylece sayfa uzamaz ve uzman kayıtlar
// arasında hızla geçebilir; rapor yine tek çalışma dosyasında bütün kalır.
function activeMaterial() {
  const c = currentCase();
  if (!c) return null;
  const mats = c.materials || [];
  if (!mats.length) return null;
  let m = mats.find((x) => x.id === c.activeMaterialId);
  if (!m) {
    m = mats[0];
    c.activeMaterialId = m.id;
  }
  return m;
}
function setActiveMaterial(id) {
  const c = currentCase();
  if (!c || c.activeMaterialId === id) return;
  c.activeMaterialId = id;
  persist();
  renderMaterialList();
  renderMaterialDetail();
}
// Kompakt kayıt satırı: sıra, dosya adı, süre/boyut, durum ve kontrol ilerlemesi.
function materialRowHtml(m, i) {
  // Yatay şerit için kompakt "çip": numara, dosya adı, süre, durum, yüzde.
  // Dikey liste 190px yer kaplıyordu ve deşifre alanını aşağı itiyordu;
  // yatay şerit aynı bilgiyi ~60px yükseklikte verir.
  const segs = m.segments || [];
  const checked = segs.filter((s) => isReviewed(s)).length;
  const pct = segs.length ? Math.round((checked / segs.length) * 100) : 0;
  const c = currentCase();
  const active = !!(c && c.activeMaterialId === m.id);
  const status = materialStatusLabel(m);
  const stCode = materialStatus(m);
  const stCls = stCode === 'error' || stCode === 'empty' || stCode === 'cancelled' || stCode === 'partial' ? 'bad' : stCode === 'review' ? 'good' : '';
  const short = status.length > 20 ? status.slice(0, 18) + '…' : status;
  return `<div class="material-chip ${active ? 'is-active' : ''}" data-material-row="${esc(m.id)}" role="button" tabindex="0" aria-pressed="${active}" title="${esc(m.name)} — ${esc(status)}">
    <span class="mc-top"><span class="mc-index">${i + 1}</span><span class="mc-name">${esc(m.name)}</span></span>
    <span class="mc-bottom"><span class="mc-dur">${fmtShort(m.duration || 0)}</span><span class="mc-state ${stCls}">${esc(short)}</span>${segs.length ? `<span class="mc-pct">%${pct}</span>` : ''}</span>
  </div>`;
}
// Yalnızca kayıt listesini çizer. Kaydırma konumu korunur.
function renderMaterialList() {
  const c = currentCase();
  if (!c) return;
  const root = $('#audioList');
  if (!root) return;
  const prev = root.scrollTop;
  const mats = c.materials || [];
  $('#audioListLabel').textContent = `${mats.length} kayıt`;
  renderQueue();
  root.classList.toggle('empty-list', !mats.length);
  if (!mats.length) {
    root.innerHTML =
      '<div class="empty-state"><div class="empty-symbol">♫</div><b>Henüz ses kaydı eklenmedi</b><span>İncelemeye sunulan ses dosyalarını ekleyin.</span></div>';
    return;
  }
  activeMaterial();
  root.innerHTML = mats.map((m, i) => materialRowHtml(m, i)).join('');
  root.scrollTop = prev;
}
// Tek bir kayıt satırını yerinde tazeler (durum/ilerleme değişince).
function refreshMaterialRow(m) {
  const row = document.querySelector(`[data-material-row="${CSS.escape(m.id)}"]`);
  if (!row) return;
  const c = currentCase();
  const i = (c?.materials || []).indexOf(m);
  if (i < 0) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = materialRowHtml(m, i);
  const fresh = tmp.firstElementChild;
  fresh.classList.toggle('is-active', row.classList.contains('is-active'));
  row.replaceWith(fresh);
}
// Seçili kaydın tam kartı (durum bölgesi + içerik bölgesi).
function materialCardHtml(m) {
  const segs = m.segments || [];
  // Kart iki ana işe göre düzenlenir:
  //  - DEŞİFRE (varsayılan): dinleme çubuğu (dalga formu + oynatıcı) ÜSTTE,
  //    bölüm listesi + metin ALTTA. Böylece dinlerken metni aynı anda görür.
  //  - ANALİZ: spektrogram, seviye ölçümü, köken, konuşmacılar. Bunlar
  //    deşifre sırasında nadiren gerekir. Dinleme yardımcısı ve kanal seçimi
  //    ise her zaman görünür olmaları gerektiği için dinleme şeridindedir.
  // Tüm id/data-* işaretleri korunur.
  const tab = m.uiTab === 'record' ? 'record' : m.uiTab === 'listen' ? 'listen' : 'transcript';
  const tabBtn = (k, label, extra = '') =>
    `<button class="card-tab ${tab === k ? 'on' : ''}" data-card-tab="${esc(m.id)}|${k}" role="tab" aria-selected="${tab === k}">${label}${extra}</button>`;
  return `<div class="audio-status-zone" id="status-zone-${esc(m.id)}">${audioStatusZoneHtml(m)}</div>
    <div class="card-tabs" role="tablist" aria-label="Kayıt çalışma alanı">
      ${tabBtn('transcript', 'Deşifre', ` <span class="tab-n">${segs.length}</span>`)}
      ${tabBtn('listen', 'Analiz')}
      ${tabBtn('record', 'Kayıt bilgileri')}
    </div>
    <div class="audio-content-zone">
      <div class="card-pane ${tab === 'transcript' ? 'on' : ''}" data-pane="transcript" role="tabpanel">
        <div class="listen-strip">
          <div class="listen-row">
            <button class="main-play" data-main-play="${esc(m.id)}" title="Kaydın tamamını çal / duraklat (Boşluk)">▶ Çal</button>
            <span class="play-time" id="ptime-${esc(m.id)}">0:00 / 0:00</span>
            <button class="mini-button follow-btn" data-follow-mode="autoAdvance" title="Çalarken sol listede BİR SONRAKİ bölüme otomatik geç (F). Varsayılan: kapalı.">Otomatik geçiş</button>
            <button class="mini-button follow-btn" data-follow-mode="liveHighlight" title="Sağ panelde okunan kelimeyi canlı vurgula (G). Varsayılan: kapalı.">Canlı vurgu</button>
            <label class="listen-filter-label" title="Dinleme yardımcısı yalnızca dinlemeyi kolaylaştırır; kaydı değiştirmez. Kaynak ayrıştırma (yalnız konuşmayı müzikten ayırma) yapılmaz."><select data-listen-filter="${esc(m.id)}" aria-label="Dinleme yardımcısı">${LISTEN_FILTERS.map(([k, lbl]) => `<option value="${k}" ${listenFilter(m) === k ? 'selected' : ''}>${esc(lbl)}</option>`).join('')}</select></label>${m.tech?.channels === 2 ? `<div class="chan-select" role="group" aria-label="Kanal seçimi"><span class="lbl">Kanal:</span>${CHANNEL_MODES.map(([k, lbl]) => `<button class="seg-tool ${channelMode(m) === k ? 'on' : ''}" data-chan="${esc(m.id)}|${k}" title="${esc(lbl)}">${k === 'both' ? 'Stereo' : k === 'left' ? 'Sol' : 'Sağ'}</button>`).join('')}</div>` : ''}</div>
          <canvas class="wave-canvas" id="wave-${esc(m.id)}" width="1200" height="96" aria-label="Ses dalga formu — tıklayarak konuma gidin"></canvas>
          <audio class="audio-player" controls preload="none" id="player-${esc(m.id)}" aria-hidden="true"></audio>
        </div>
        <div class="transcript-editor">
          <div class="transcript-head"><b>Deşifre ve kontrol</b><small>${segs.length} bölüm · yalnızca "Onaylandı" ve "Anlaşılmadı" denetlenmiş sayılır</small></div>
          <div class="segments-root" id="segments-${esc(m.id)}"></div>
          ${m.referenceSegments?.length ? `<details class="reference-box"><summary>Bu test kaydı için referans metni görüntüle</summary><div>${m.referenceSegments.map((x) => `<p><b>${timecode(x.start)}–${timecode(x.end)} · ${esc(x.speaker)}</b><br>${esc(x.text)}</p>`).join('')}</div></details>` : ''}
        </div>
      </div>
      <div class="card-pane ${tab === 'listen' ? 'on' : ''}" data-pane="listen" role="tabpanel">
        <div class="pane-section"><div class="pane-title">Spektrogram<span class="info-i" tabindex="0" data-tip="Log frekans ekseni 20 Hz – 8 kHz. Sarı çizgiler bölüm sınırlarını gösterir. Talep üzerine hesaplanır.">i</span></div><div class="evidence-actions"><button class="mini-button" data-spec="${esc(m.id)}">Spektrogramı göster ${m.spectrogramReviewed ? '✓' : ''}</button></div><div class="spec-wrap" id="spec-wrap-${esc(m.id)}" hidden><div class="zw-head"><span>20 Hz – 8 kHz · sarı çizgiler bölüm sınırları</span><span>FFT 512</span></div><canvas class="spec-canvas" id="spec-${esc(m.id)}" width="900" height="160" aria-label="Spektrogram"></canvas></div></div>
        <div class="pane-section"><div class="pane-title">Seviye ölçümü<span class="info-i" tabindex="0" data-tip="Tepe ve RMS düzeyi, tepe kırpılma oranı, gürültü tabanı ve sinyal/gürültü oranı kaydın örneklerinden hesaplanır. Ölçüm yapılmadan rapora yazılmaz.">i</span></div><div id="level-panel-${esc(m.id)}">${levelPanelHtml(m)}</div><div class="evidence-actions"><button class="mini-button" data-measure-levels="${esc(m.id)}">Seviye ölçümü yap</button></div></div>
        <div class="pane-section"><div class="pane-title">Kayıt kökeni ve teslim zinciri<span class="info-i" tabindex="0" data-tip="Kaydın hangi ortamdan geldiğini ve nasıl teslim edildiğini belgeler. Uzman beyanına dayanır; uygulama ortamı kendiliğinden tespit etmez.">i</span></div><div id="origin-panel-${esc(m.id)}">${originPanelHtml(m)}</div></div>
        <div class="pane-section"><div class="pane-title">Konuşmacılar ve ses özellikleri<span class="info-i" tabindex="0" data-tip="Etiketleri uzman girer; uygulama kimlik tespiti yapmaz. Perde ölçümü otokorelasyonla hesaplanan bir tahmindir, kayıt koşullarına bağlıdır.">i</span></div><div id="spk-panel-${esc(m.id)}"></div><div class="evidence-actions"><button class="mini-button" data-measure-pitch="${esc(m.id)}">Konuşmacı perdesini ölç</button></div></div>
      </div>
      <div class="card-pane ${tab === 'record' ? 'on' : ''}" data-pane="record" role="tabpanel">
        <div class="pane-section"><div class="pane-title">Kayıt bilgileri</div><div id="record-panel-${esc(m.id)}">${recordPanelHtml(m)}</div></div>
      </div>
    </div>`;
}
// Ondalık ayırıcı Türkçe biçimdedir; rapor ve arayüz aynı yardımcıyı kullanır.
function fmtDb(x) {
  if (!Number.isFinite(x)) return '—';
  const t = x.toFixed(1);
  // "-0,0" yazmak yanıltıcıdır; sıfıra yuvarlanan değerin işareti atılır.
  return (Number(t) === 0 ? (0).toFixed(1) : t).replace('.', ',');
}
function fmtPct(x) {
  return Number.isFinite(x) ? (x * 100).toFixed(3).replace('.', ',') : '—';
}
// Gürültü tabanı metni. Girdi LİNEER genliktir; dBFS'e burada çevrilir.
// Tam sıfır sayısal sessizliktir, "ölçülemedi" değil.
function floorText(linear) {
  if (!Number.isFinite(linear)) return 'ölçülemedi';
  if (linear <= 0) return 'sessizlik (0)';
  return `${fmtDb(20 * Math.log10(linear))} dBFS`;
}
// SNR metni: ölçülemedi / sonsuz (sayısal sessizlik) / dB değeri.
function snrText(x) {
  if (x == null) return 'ölçülemedi';
  if (!Number.isFinite(x)) return 'sonsuz (sayısal sessizlik)';
  return `${fmtDb(x)} dB`;
}
// Stereo kayıtlarda kanal dengesi, faz ilişkisi ve DC kayması. Bunlar
// montaj/format dönüşümü izlerini değerlendirmede kullanılan ölçülebilir
// büyüklüklerdir; hiçbiri "montaj var/yok" iddiası üretmez, yalnızca ölçüm
// sunar. Saf fonksiyon; birim testiyle sınanır.
function analyzeStereo(left, right, sampleRate) {
  const n = Math.min(left.length, right.length);
  if (!n) return { ok: false, reason: 'boş kayıt' };
  let sumL = 0,
    sumR = 0,
    sqL = 0,
    sqR = 0,
    prod = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i],
      r = right[i];
    sumL += l;
    sumR += r;
    sqL += l * l;
    sqR += r * r;
    prod += l * r;
  }
  const meanL = sumL / n,
    meanR = sumR / n;
  const rmsL = Math.sqrt(sqL / n),
    rmsR = Math.sqrt(sqR / n);
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  // Pearson korelasyonu: +1 aynı faz, 0 ilgisiz, -1 ters faz.
  const cov = prod / n - meanL * meanR;
  const sdL = Math.sqrt(Math.max(0, sqL / n - meanL * meanL));
  const sdR = Math.sqrt(Math.max(0, sqR / n - meanR * meanR));
  const correlation = sdL > 0 && sdR > 0 ? cov / (sdL * sdR) : null;
  return {
    ok: true,
    sampleCount: n,
    dcOffsetL: meanL,
    dcOffsetR: meanR,
    rmsL,
    rmsR,
    rmsLdb: db(rmsL),
    rmsRdb: db(rmsR),
    balanceDb: rmsL > 0 && rmsR > 0 ? db(rmsL) - db(rmsR) : null,
    correlation,
    durationSec: n / (sampleRate || 16000)
  };
}
// Etkin bant genişliği: ortalama güç spektrumunda toplam enerjinin verilen
// yüzdesinin altında kaldığı üst frekans. Kaydın bant sınırlaması (yeniden
// kodlama, telefon bandı, düşük örnekleme) hakkında ölçülebilir bilgi verir.
// Saf fonksiyon: örnek dizisi, örnekleme frekansı, yüzde (varsayılan %95).
function spectralRolloff(samples, sampleRate, percentile = 0.95, fftSize = 1024) {
  const sr = sampleRate || 16000;
  const n = samples.length;
  if (n < fftSize) return null;
  const frames = Math.min(32, Math.max(1, Math.floor(n / fftSize)));
  const step = Math.floor((n - fftSize) / Math.max(1, frames));
  const re = new Float32Array(fftSize),
    im = new Float32Array(fftSize);
  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  const bins = fftSize >> 1;
  const acc = new Float64Array(bins);
  for (let f = 0; f < frames; f++) {
    const start = f * step;
    for (let i = 0; i < fftSize; i++) {
      const idx = start + i;
      re[i] = (idx < n ? samples[idx] : 0) * hann[i];
      im[i] = 0;
    }
    const mag = fftMagnitude(re, im);
    for (let b = 0; b < bins; b++) acc[b] += mag[b] * mag[b];
  }
  let total = 0;
  for (let b = 0; b < bins; b++) total += acc[b];
  if (!(total > 0)) return null;
  let cum = 0;
  for (let b = 0; b < bins; b++) {
    cum += acc[b];
    if (cum >= total * percentile) {
      // Nyquist = sr/2, bins fftSize/2 noktasına yayılır.
      return { rolloffHz: (b / bins) * (sr / 2), nyquistHz: sr / 2, percentile, frames };
    }
  }
  return { rolloffHz: sr / 2, nyquistHz: sr / 2, percentile, frames };
}
// Seviye ölçümü paneli: ölçülmemişse ne yapılacağını söyler, ölçülmüşse
// değerleri tek biçimde gösterir. Rapor metniyle aynı kaynaktan beslenir.
function levelPanelHtml(m) {
  const lv = m.levels;
  if (!lv || !lv.ok || lv.schema !== LEVELS_SCHEMA) return '<div class="seg-empty-note">Seviye ölçümü yapılmadı. Düğmeye basıldığında kaydın örneklerinden hesaplanır.</div>';
  // Hangi kanaldan ölçüldüğü gösterilir (v2.91). Mono kayıtta yazılmaz.
  const chNote = (n) => (lv.channels > 1 && n ? ` <small class="muted">(kanal ${n})</small>` : '');
  return `<table class="record-table"><tbody>
    <tr><td>Tepe düzeyi</td><td>${fmtDb(lv.peakDb)} dBFS${chNote(lv.peakChannel)}</td></tr>
    <tr><td>RMS düzeyi</td><td>${fmtDb(lv.rmsDb)} dBFS</td></tr>
    <tr><td>Tepe kırpılma</td><td>%${fmtPct(lv.clippedRatio)} (${lv.clippedSamples} örnek)${chNote(lv.clippedSamples > 0 ? lv.clipChannel : 0)}</td></tr>
    <tr><td>Gürültü tabanı</td><td>${floorText(lv.noiseFloor)}</td></tr>
    <tr><td>Sinyal/gürültü oranı</td><td>${snrText(lv.snrDb)}</td></tr>
    ${lv.rolloff ? `<tr><td>Etkin bant genişliği (P95)</td><td>${fmtDb(lv.rolloff.rolloffHz)} Hz · Nyquist ${fmtDb(lv.rolloff.nyquistHz)} Hz · ${fmtDb(lv.analysisRate)} Hz örnekleme</td></tr>` : ''}
    ${lv.stereo ? `<tr><td>Kanal dengesi (L−R)</td><td>${lv.stereo.balanceDb == null ? 'ölçülemedi' : fmtDb(lv.stereo.balanceDb) + ' dB'}</td></tr>
    <tr><td>Kanallar arası korelasyon</td><td>${lv.stereo.correlation == null ? 'ölçülemedi' : lv.stereo.correlation.toFixed(3).replace('.', ',')}</td></tr>
    <tr><td>DC kayması (L / R)</td><td>${lv.stereo.dcOffsetL.toFixed(5).replace('.', ',')} / ${lv.stereo.dcOffsetR.toFixed(5).replace('.', ',')}</td></tr>` : ''}
    <tr><td>Ölçüm zamanı</td><td>${lv.at ? new Date(lv.at).toLocaleString('tr-TR') : '—'}</td></tr>
  </tbody></table>`;
}
// Kayıt bilgileri paneli: teknik envanter, doğrulama, işlem günlüğü.
function recordPanelHtml(m) {
  const rows = [
    ['Dosya adı', m.name || '—'],
    ['Biçim / boyut', `${m.type || '—'} · ${fmtSize(m.size)}`],
    ['Süre', fmtShort(m.duration || 0)],
    ['Codec', m.tech?.codec || '—'],
    ['Kanal', fmtChannels(m.tech?.channels)],
    ['Örnekleme', m.tech?.sampleRate ? `${m.tech.sampleRate} Hz` : '—'],
    ['Bit derinliği', m.tech?.bitDepth ? `${m.tech.bitDepth} bit` : '—'],
    ['Eklenme', m.addedAt ? new Date(m.addedAt).toLocaleString('tr-TR') : '—'],
    ['Durum', materialStatusLabel(m)],
    ['Çözümleyen model', m.transcribedWithModel ? `${modelShortName(m.transcribedWithModel)}${m.transcribedAt ? ' · ' + new Date(m.transcribedAt).toLocaleString('tr-TR') : ''}` : '—']
  ];
  return `<table class="record-table"><tbody>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(String(r[1]))}</td></tr>`).join('')}</tbody></table>
    <div class="pane-sub"><span>SHA-256 özeti</span></div>
    <div class="sha-box">${esc(m.sha256 || 'Hesaplanmadı')}</div>
    ${m.lastVerify ? `<div class="warn-box ${m.lastVerify.ok ? 'verify-ok' : ''}">Son doğrulama: ${esc(new Date(m.lastVerify.at).toLocaleString('tr-TR'))} · ${m.lastVerify.ok ? 'özet eşleşti' : 'özet farklı'}</div>` : ''}
    <div class="evidence-actions"><button class="mini-button" data-verify="${esc(m.id)}">SHA-256 doğrula</button><button class="mini-button" data-log="${esc(m.id)}">İşlem günlüğü</button>${
      m.previousSegments && (m.previousSegments.segments || []).length
        ? `<button class="mini-button" data-restore-segments="${esc(m.id)}" title="Yeniden çözümleme öncesi bölümleri geri yükle">Önceki bölümleri geri yükle (${m.previousSegments.count})</button>`
        : ''
    }</div>`;
}
// Seçili kaydın detayını çizer ve oynatıcı/dalga formu/deşifreyi bağlar.
async function renderMaterialDetail() {
  const c = currentCase();
  const wrap = $('#audioDetail');
  if (!c || !wrap) return;
  const panel = wrap.closest('.detail-panel');
  const m = activeMaterial();
  if (!m) {
    wrap.innerHTML = '';
    if (panel) panel.hidden = true;
    return;
  }
  if (panel) panel.hidden = false;
  const title = $('#audioDetailTitle');
  if (title) title.textContent = m.name;
  const card = document.createElement('div');
  card.className = 'audio-card';
  card.innerHTML = materialCardHtml(m);
  wrap.innerHTML = '';
  wrap.appendChild(card);
  const url = await attachObjectUrl(c, m);
  const player = $(`#player-${CSS.escape(m.id)}`, card);
  if (player && url) {
    player.src = url;
    if (m.playbackRate) player.playbackRate = m.playbackRate;
    player.addEventListener('play', () => {
      ensureSegStopListener(player);
      if (segPlayback.materialId === m.id) segPlayback.playing = true;
      refreshPlayButtons();
    });
    player.addEventListener('pause', () => {
      if (segPlayback.materialId === m.id) segPlayback.playing = false;
      // Takip açıksa vurgu kalsın (duraklatınca nerede kaldığını göster).
      if (!followState.on) hideKaraoke(m);
      refreshPlayButtons();
    });
    if (m.tech?.channels === 2 && channelMode(m) !== 'both') ensureAudioGraph(m, player);
  }
  // Kalıcı dinleme filtresi yeniden uygulanır. Kart her çizimde yeni bir
  // <audio> düğümü kurduğu için eski grafik oynatıcıya bağlı kalır; filtre
  // yalnızca gösterge olarak kalırsa ses özgün hâliyle çalar ve arayüz
  // "filtre açık" diyerek yanlış bilgi verir.
  if (url && listenFilter(m) !== 'off' && player) {
    ensureAudioGraph(m, player).then((g) => {
      if (g) runNoiseGate(m);
    });
    // Şeritte görsel geri bildirim: altın kenar + kalın yazı.
    const lb = card.querySelector('.listen-filter-label');
    if (lb) lb.classList.add('filter-on');
  }
  attachWave(card, m, url);
  renderSegments(m, card);
  // Kart DOM'a eklendikten SONRA uygula: ölçü doğru, spektrogram görünür olsun.
  setAnalysisMode(m, analysisMode);
  ensureSpeakers(m);
  renderSpeakersPanel(m);
  // Takip durumu dosya bazlı saklanır; sayfa yenilenince korunur.
  const c2 = currentCase();
  if (c2 && typeof c2.followMode === 'boolean') {
    followState.on = c2.followMode;
    document.body.classList.toggle('follow-on', followState.on);
  }
  refreshFollowButtons();
}
// Kayıt listesi + seçili kaydın detayı.
async function renderAudioList() {
  const c = currentCase();
  if (!c) return;
  renderMaterialList();
  await renderMaterialDetail();
}
// Waveform rendering. Peaks are computed once per material and cached on the
// material object, so re-rendering the list does not re-decode the audio.
// Segment boundaries are drawn on top so the expert can see which part of the
// recording each transcript row refers to.
async function computePeaks(blob, buckets) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let buf;
  try {
    buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch (e) {
    await ctx.close();
    return null;
  }
  const ch = buf.numberOfChannels;
  const len = buf.length;
  const data = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) data[i] += d[i] / ch;
  }
  const step = Math.max(1, Math.floor(len / buckets));
  const peaks = new Float32Array(buckets);
  for (let b = 0; b < buckets; b++) {
    let max = 0;
    const s0 = b * step;
    const s1 = Math.min(len, s0 + step);
    for (let i = s0; i < s1; i++) {
      const v = Math.abs(data[i]);
      if (v > max) max = v;
    }
    peaks[b] = max;
  }
  await ctx.close();
  return peaks;
}
function drawWave(canvas, peaks, m) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!peaks || !peaks.length) {
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, h / 2 - 1, w, 2);
    return;
  }
  const dur = Number(m.duration) || 0;
  ctx.fillStyle = '#c9d6e4';
  ctx.fillRect(0, 0, w, h);
  const mid = h / 2;
  for (let x = 0; x < w; x++) {
    const p = peaks[Math.floor((x / w) * peaks.length)] || 0;
    const bar = Math.max(1, p * mid * 0.92);
    ctx.fillStyle = '#4a7bab';
    ctx.fillRect(x, mid - bar, 1, bar * 2);
  }
  const segs = m.segments || [];
  if (dur > 0) {
    for (const sg of segs) {
      const st = secondsFromTimecode(sg.start);
      const en = secondsFromTimecode(sg.end);
      if (!(en > st)) continue;
      const x0 = Math.floor((st / dur) * w);
      const x1 = Math.ceil((en / dur) * w);
      ctx.fillStyle = 'rgba(49,95,145,0.10)';
      ctx.fillRect(x0, 0, Math.max(1, x1 - x0), h);
      ctx.strokeStyle = '#315f91';
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, h);
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, h);
      ctx.stroke();
    }
  }
}

// ==== Spektrogram (FFT) ====
// Konuşmanın frekans içeriğini zaman içinde gösterir. Bölüm sınırının tam
// yerini görmek ve gürültü/tıslama gibi unsurları ayırt etmek için kullanılır.
// Hesaplama deterministiktir: aynı kayıt her zaman aynı spektrogramı verir.
// Radix-2 Cooley-Tukey FFT (yerinde, gerçek giriş). Giriş uzunluğu 2'nin
// kuvveti olmalıdır. Dönüş: genlik dizisi (re/iz yeniden kullanılır).
function fftMagnitude(re, im) {
  const n = re.length;
  // Bit ters çevirme permütasyonu
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang),
      wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1,
        cwi = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k],
          ui = im[i + k];
        const vr = re[i + k + half] * cwr - im[i + k + half] * cwi;
        const vi = re[i + k + half] * cwi + im[i + k + half] * cwr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const nwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = nwr;
      }
    }
  }
  const mag = new Float32Array(n);
  for (let i = 0; i < n; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  return mag;
}
// Kaydın tamamı için spektrogram hesaplar. cols zaman sütunu sayısıdır; her
// sütunda bins frekans kutusu vardır. Değerler dB'dir. Hann penceresi kullanılır.
// `opts.startSec/endSec` (v2.115): yalnız bir ARALIK hesaplanır (bölüm
// spektrogramı için). Verilmezse tüm kayıt hesaplanır (eski davranış).
async function computeSpectrogram(blob, cols, fftSize = 512, opts = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let buf;
  try {
    buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch (e) {
    await ctx.close();
    return null;
  }
  const ch = buf.numberOfChannels;
  const sr0 = buf.sampleRate;
  const from = Number.isFinite(opts.startSec) ? Math.max(0, Math.floor(opts.startSec * sr0)) : 0;
  const toRaw = Number.isFinite(opts.endSec) ? Math.ceil(opts.endSec * sr0) : buf.length;
  const to = Math.max(from + 1, Math.min(buf.length, toRaw));
  const len = to - from;
  const data = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) data[i] += d[from + i] / ch;
  }
  await ctx.close();
  const bins = fftSize >> 1;
  const hop = Math.max(1, Math.floor((len - fftSize) / Math.max(1, cols - 1)));
  const out = new Float32Array(cols * bins);
  const re = new Float32Array(fftSize),
    im = new Float32Array(fftSize);
  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
  let maxDb = -Infinity,
    minDb = Infinity;
  for (let x = 0; x < cols; x++) {
    const start = x * hop;
    for (let i = 0; i < fftSize; i++) {
      const idx = start + i;
      re[i] = (idx < len ? data[idx] : 0) * hann[i];
      im[i] = 0;
    }
    const mag = fftMagnitude(re, im);
    for (let b = 0; b < bins; b++) {
      const db = 20 * Math.log10(mag[b] + 1e-6);
      out[x * bins + b] = db;
      if (db > maxDb) maxDb = db;
      if (db < minDb) minDb = db;
    }
  }
  return {
    cols,
    bins,
    data: out,
    minDb,
    maxDb,
    fftSize,
    sampleRate: sr0,
    duration: len / sr0,
    startSec: from / sr0
  };
}
// dB değerini renge çevirir (koyu lacivert -> mavi -> sarı -> beyaz).
function specColor(t) {
  const c = Math.max(0, Math.min(1, t));
  if (c < 0.25) {
    const k = c / 0.25;
    return `rgb(${Math.round(10 + 20 * k)},${Math.round(20 + 40 * k)},${Math.round(60 + 80 * k)})`;
  }
  if (c < 0.5) {
    const k = (c - 0.25) / 0.25;
    return `rgb(${Math.round(30 + 40 * k)},${Math.round(60 + 90 * k)},${Math.round(140 + 70 * k)})`;
  }
  if (c < 0.75) {
    const k = (c - 0.5) / 0.25;
    return `rgb(${Math.round(70 + 150 * k)},${Math.round(150 + 90 * k)},${Math.round(210 - 120 * k)})`;
  }
  const k = (c - 0.75) / 0.25;
  return `rgb(${Math.round(220 + 35 * k)},${Math.round(240 - 30 * k)},${Math.round(90 + 165 * k)})`;
}
// Spektrogramı canvas'a çizer. Frekans ekseni logaritmiktir (insan kulağı
// logaritmik algılar); 0-8000 Hz aralığı gösterilir. Bölüm sınırları üstte.
function drawSpectrogram(canvas, spec, m) {
  if (!canvas || !spec) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b1a2e';
  ctx.fillRect(0, 0, w, h);
  const { cols, bins, data, minDb, maxDb } = spec;
  const range = maxDb - minDb || 1;
  const nyq = spec.sampleRate / 2;
  const fMax = Math.min(8000, nyq);
  // Log frekans eşlemesi: her piksel satırı bir frekansa karşılık gelir.
  for (let y = 0; y < h; y++) {
    const frac = 1 - y / h; // üst = yüksek frekans
    const f = 20 * Math.pow(fMax / 20, frac); // 20 Hz - fMax arası log
    const bin = Math.max(0, Math.min(bins - 1, Math.round((f / nyq) * bins)));
    for (let x = 0; x < w; x++) {
      const col = Math.min(cols - 1, Math.floor((x / w) * cols));
      const db = data[col * bins + bin];
      ctx.fillStyle = specColor((db - minDb) / range);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Bölüm sınırları
  const dur = spec.duration || Number(m.duration) || 0;
  if (dur > 0) {
    for (const sg of m.segments || []) {
      const st = secondsFromTimecode(sg.start);
      const en = secondsFromTimecode(sg.end);
      if (!(en > st)) continue;
      const x0 = Math.floor((st / dur) * w),
        x1 = Math.ceil((en / dur) * w);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x0, 0, Math.max(1, x1 - x0), h);
      ctx.strokeStyle = '#ffd479';
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, h);
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, h);
      ctx.stroke();
    }
  }
}
// Spektrogram panelini kurar. Talep üzerine hesaplanır; sonuç kayda bağlı
// saklanır (yeniden hesaplanmasın).
async function toggleSpectrogram(m) {
  const wrap = $(`#spec-wrap-${CSS.escape(m.id)}`);
  const canvas = $(`#spec-${CSS.escape(m.id)}`);
  if (!wrap || !canvas) return;
  if (wrap.hidden) {
    wrap.hidden = false;
  }
  if (m.__specData) {
    drawSpectrogram(canvas, m.__specData, m);
    return;
  }
  canvas.width = canvas.clientWidth || 900;
  showToast('Spektrogram hesaplanıyor…');
  const c = currentCase();
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası bulunamadı.');
    return;
  }
  const spec = await computeSpectrogram(blob, Math.max(400, canvas.width));
  if (!spec) {
    showToast('Spektrogram hesaplanamadı.');
    return;
  }
  m.__specData = spec;
  drawSpectrogram(canvas, spec, m);
  // Spektrogram incelendiği rapora yansıtılır (yalnızca gerçekten açıldıysa).
  m.spectrogramReviewed = { at: new Date().toISOString() };
  logEvent(m, 'Spektrogram incelendi', `${spec.cols} zaman sütunu, ${spec.bins} frekans kutusu, FFT ${spec.fftSize}`);
  persist();
  renderOverview();
  showToast('Spektrogram hazır.');
}

const peakCache = new Map();
// ---- Sessizlik/boşluk ölçümü (NLP öncesi sinyal katmanı) ----
// Bir zaman aralığında konuşma olup olmadığını ölçer. Uydurma yoktur: RMS
// tabanlı bir ölçüm yapılır ve uzmana yalnızca "bu bölümün büyük kısmı sessiz"
// gibi gerekçeli bir işaret sunulur. Eşik, kaydın kendi gürültü zeminine göre
// uyarlanır (mutlak eşik kullanmak yanlış olurdu).
// Saf fonksiyon: Float32 örnek dizisi ve örnekleme frekansı alır, aralıktaki
// sessiz oranı ve RMS dağılımını döndürür. Birim testiyle doğrulanır.
function analyzeSilence(samples, sampleRate, startSec, endSec, opts = {}) {
  const n = samples.length;
  const sr = sampleRate || 16000;
  const s0 = Math.max(0, Math.floor((startSec || 0) * sr));
  const s1 = Math.min(n, Math.ceil((endSec || 0) * sr));
  const len = s1 - s0;
  if (!(len > 0)) return { ok: false, reason: 'boş aralık' };
  // Kısa pencerelerde RMS ölçülür; pencere ~20 ms.
  const win = Math.max(1, Math.round(sr * 0.02));
  const rms = [];
  for (let p = s0; p < s1; p += win) {
    const e = Math.min(s1, p + win);
    let sum = 0;
    for (let i = p; i < e; i++) sum += samples[i] * samples[i];
    rms.push(Math.sqrt(sum / (e - p)));
  }
  const sorted = rms.slice().sort((a, b) => a - b);
  const pct = (q) => {
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
    return sorted[idx];
  };
  const floor = pct(0.1); // alt %10 = gürültü zemini
  const peak = pct(0.95); // üst %5 = konuşma düzeyi
  // Eşik: zemin ile konuşma düzeyi belirgin biçimde ayrıksa aralarında bir
  // değer; ayrık değilse (tek düze sinyal: ya tam sessiz ya tam konuşma) genliğe
  // göre karar verilir. Mutlak taban, gerçek sessizliğin çok küçük genlikli
  // olmasından yararlanır.
  const spread = peak - floor;
  const threshold = spread > Math.max(floor, 1e-4) ? floor + spread * 0.3 : Math.max(peak * 0.5, 0.002);
  let silent = 0;
  for (const r of rms) if (r < threshold) silent++;
  const ratio = rms.length ? silent / rms.length : 0;
  // Sessiz aralıkların toplam süresi.
  const silentSec = (ratio * len) / sr;
  return { ok: true, ratio, silentSec, durationSec: len / sr, rmsFloor: floor, rmsPeak: peak, threshold };
}
// Bölüm metni zaten anlamlıysa sessizlik uyarısı üretmeyiz; yalnızca metin boş
// veya dolgu iken ve aralık büyük ölçüde sessizse işaret veririz.
function segmentSilenceFlag(stats, text, isHallucinationFn) {
  if (!stats || !stats.ok) return null;
  if (stats.durationSec < 0.5) return null;
  const blank = isHallucinationFn ? isHallucinationFn(text) : !text || !String(text).trim();
  if (!blank) return null;
  if (stats.ratio >= 0.8 && stats.durationSec >= 1.5) return { level: 'high', stats };
  if (stats.ratio >= 0.55 && stats.durationSec >= 1) return { level: 'mid', stats };
  return null;
}

// ---- Seviye ölçümü (elektro-akustik ölçüm katmanı) ----
// Aşağıdaki ölçümler kaydın kendisinden hesaplanır; hiçbiri tahmin değildir ve
// hiçbiri rapora yazılmadan önce bilirkişinin tetiklemesini bekler. Ölçüm
// yapılmamışsa rapora satır yazılmaz.
// Tepe (peak) ve RMS genliği, tepe kırpılma oranı, gürültü tabanı ve sinyal-
// gürültü oranı. Saf fonksiyon: Float32 örnek dizisi + örnekleme frekansı.
// Kırpılma, ardışık örneklerin tam ölçek sınırına dayanmasıyla ölçülür; tek
// tükürük örneği kırpılma sayılmaz (en az 3 ardışık örnek gerekir).
function analyzeLevels(samples, sampleRate, opts = {}) {
  const n = samples.length;
  if (!n) return { ok: false, reason: 'boş kayıt' };
  const clipThreshold = opts.clipThreshold ?? 0.999;
  const clipRun = Math.max(2, opts.clipRun ?? 3);
  let peak = 0,
    sumSq = 0,
    clipped = 0,
    run = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    sumSq += v * v;
    if (a >= clipThreshold) {
      run++;
      if (run === clipRun) clipped += clipRun;
      else if (run > clipRun) clipped++;
    } else run = 0;
  }
  const rms = Math.sqrt(sumSq / n);
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  // Gürültü tabanı ve konuşma düzeyi, kısa pencerelerin RMS dağılımından
  // okunur: alt %10 gürültü zemini, üst %10 konuşma düzeyi kabul edilir.
  const win = Math.max(1, Math.round((sampleRate || 16000) * 0.02));
  const frames = [];
  for (let p = 0; p + win <= n; p += win) {
    let s = 0;
    for (let i = p; i < p + win; i++) s += samples[i] * samples[i];
    frames.push(Math.sqrt(s / win));
  }
  frames.sort((a, b) => a - b);
  const pick = (q) => (frames.length ? frames[Math.min(frames.length - 1, Math.max(0, Math.round(q * (frames.length - 1))))] : 0);
  const noiseFloor = pick(0.1);
  const speechLevel = pick(0.9);
  // Gürültü tabanı tam sıfırsa kayıt sessiz aralıklarda sayısal sessizlik
  // içeriyor demektir; oran sonsuzdur, "ölçülemedi" değil.
  const snrDb =
    speechLevel <= 0
      ? null
      : noiseFloor > 0
        ? (speechLevel > noiseFloor ? db(speechLevel) - db(noiseFloor) : 0)
        : Infinity;
  return {
    ok: true,
    durationSec: n / (sampleRate || 16000),
    sampleCount: n,
    peak,
    peakDb: db(peak),
    rms,
    rmsDb: db(rms),
    clippedSamples: clipped,
    clippedRatio: clipped / n,
    noiseFloor,
    noiseFloorDb: db(noiseFloor),
    speechLevel,
    speechLevelDb: db(speechLevel),
    snrDb
  };
}
// KANAL KANAL seviye ölçümü (v2.91).
// GERÇEK HATA (öncesi): tüm kanallar ortalamayla tek "mono"ya indiriliyordu.
// Ses yalnız bir kanalda ise tepe yarıya düşüyor (−6 dB), tek kanaldaki
// kırpılma tamamen kayboluyor, ters fazda tepe sıfır görünüyordu. "Tepe" ve
// "kırpılma" 56.12 alanının çekirdek ölçümleridir; mono ortalama bunları
// sistematik olarak yanlış gösteriyordu.
// KURAL: tepe ve kırpılma EN KÖTÜ kanaldan raporlanır ve hangi kanal olduğu
// yazılır. Gürültü tabanı/SNR için kanalların ortalaması (mono) kullanılır —
// bu, gürültünün kanallar arasında dağılımı için doğru ölçüdür ve raporda
// böyle belirtilir. Girdi: kanal dizisi (Float32Array[]) + örnekleme hızı.
function analyzeChannelLevels(channels, sampleRate) {
  const chs = (channels || []).filter((c) => c && c.length);
  if (!chs.length) return { ok: false, reason: 'boş kayıt' };
  const sr = sampleRate || 16000;
  const len = Math.min(...chs.map((c) => c.length));
  // Kanal bazında tepe ve kırpılma; en kötü kanal raporlanır.
  let peak = -1,
    peakDb = -Infinity,
    peakChannel = 0;
  let clippedSamples = 0,
    clipChannel = 0;
  chs.forEach((data, idx) => {
    const r = analyzeLevels(data.subarray(0, len), sr);
    if (!r.ok) return;
    if (r.peak > peak) {
      peak = r.peak;
      peakDb = r.peakDb;
      peakChannel = idx + 1; // 1 tabanlı: kanal numarası kullanıcıya böyle yazılır
    }
    if (r.clippedSamples > clippedSamples) {
      clippedSamples = r.clippedSamples;
      clipChannel = idx + 1;
    }
  });
  // Gürültü tabanı / SNR / RMS: kanalların ortalaması (mono karışım).
  const mono = new Float32Array(len);
  for (const data of chs) for (let i = 0; i < len; i++) mono[i] += data[i] / chs.length;
  const m = analyzeLevels(mono, sr);
  return {
    ok: true,
    durationSec: len / sr,
    sampleCount: len,
    channels: chs.length,
    // En kötü kanaldan gelen ölçümler (raporda bunlar yazılır).
    peak: Math.max(0, peak),
    peakDb,
    peakChannel,
    clippedSamples,
    clippedRatio: len ? clippedSamples / len : 0,
    clipChannel,
    // Mono karışımdan gelen ölçümler.
    rms: m.rms,
    rmsDb: m.rmsDb,
    noiseFloor: m.noiseFloor,
    noiseFloorDb: m.noiseFloorDb,
    speechLevel: m.speechLevel,
    speechLevelDb: m.speechLevelDb,
    snrDb: m.snrDb
  };
}
// EN YÜKSEK ENERJİLİ KANAL (v2.92).
// GERÇEK HATA (öncesi): sessizlik ve perde ölçümleri yalnız `getChannelData(0)`
// kullanıyordu. Stereo kayıtta konuşma sağ kanalda ise sessizlik "oran 1,0 →
// yüksek" çıkıyor, perde ölçülemiyordu. Uzman "bu bölüm sessiz" uyarısı alıp
// metni [sessizlik] diye işaretliyordu — yanlış.
// Kural: ölçüm en yüksek enerjili kanaldan yapılır; hangi kanal olduğu
// yazılır. Eşitlikte ilk kanal (sol) seçilir — kararlı ve öngörülebilir.
// Girdi: Float32Array[] kanallar. Dönüş: {index, channel (1 tabanlı), rms}.
function pickActiveChannel(channels) {
  const chs = (channels || []).filter((c) => c && c.length);
  if (!chs.length) return { index: 0, channel: 1, rms: 0 };
  let bestIdx = 0;
  let bestRms = -1;
  for (let i = 0; i < chs.length; i++) {
    const d = chs[i];
    let sum = 0;
    for (let j = 0; j < d.length; j++) sum += d[j] * d[j];
    const rms = Math.sqrt(sum / d.length);
    if (rms > bestRms) {
      bestRms = rms;
      bestIdx = i;
    }
  }
  return { index: bestIdx, channel: bestIdx + 1, rms: Math.max(0, bestRms) };
}
// Kanal farkındalı sessizlik ölçümü: en yüksek enerjili kanal üzerinden
// `analyzeSilence` çağırır ve hangi kanaldan ölçüldüğünü ekler.
function analyzeSilenceChannelAware(channels, sampleRate, startSec, endSec, opts = {}) {
  const chs = (channels || []).filter((c) => c && c.length);
  if (!chs.length) return { ok: false, reason: 'boş kayıt' };
  const pick = pickActiveChannel(chs);
  const stats = analyzeSilence(chs[pick.index], sampleRate, startSec, endSec, opts);
  if (!stats || !stats.ok) return stats || { ok: false, reason: 'ölçüm yapılamadı' };
  return { ...stats, channel: pick.channel, channels: chs.length, channelRms: pick.rms };
}
function attachWave(card, m, url) {
  const canvas = card.querySelector('canvas.wave-canvas');
  const player = card.querySelector('audio');
  if (!player) return;
  const paint = () => {
    drawWave(canvas, peakCache.get(m.id), m);
    const zw = card.querySelector('canvas.zoom-wave');
    if (zw) {
      const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
      drawZoomWave(zw, peakCache.get(m.id), m, idx);
    }
  };
  if (peakCache.has(m.id)) {
    paint();
  } else if (url) {
    getAudioBlob(currentCase(), m).then((blob) => {
      if (!blob) return;
      return computePeaks(blob, 1200).then((pk) => {
        if (pk) peakCache.set(m.id, pk);
        paint();
      });
    });
  }
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = Number(m.duration) || player.duration || 0;
    if (dur > 0) {
      player.currentTime = ratio * dur;
      player.play().catch(() => {});
    }
  });
  const ph = () => {
    const dur = Number(m.duration) || player.duration || 0;
    // Süre göstergesi: yerleşik <audio> denetimi gizli olduğu için zaman
    // bilgisi burada yazılır.
    const pt = card.querySelector(`#ptime-${CSS.escape(m.id)}`);
    if (pt) pt.textContent = `${fmtShort(player.currentTime)} / ${fmtShort(dur)}`;
    if (!(dur > 0)) return;
    paint();
    const x = Math.floor((player.currentTime / dur) * canvas.width);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#b88645';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  };
  player.addEventListener('timeupdate', ph);
  player.addEventListener('seeked', ph);
  player.addEventListener('loadedmetadata', ph);
  ph();
}

// ==== Konuşma çözümleme doğruluğu (WER) ====
// WER = kelime hata oranı = (yerine koyma + silme + ekleme) / referans kelime
// sayısı. Levenshtein uzaklığının kelime düzeyinde uygulanmasıdır. Referans
// metni bulunan kayıtlarda (örneğin test verisi) model çıktısı ile
// karşılaştırılır. Bu, doğruluğun ölçülebilir tek göstergesidir; tahmin
// içermez. Sonuç rapora yazılırken hangi model ve hangi metinle ölçüldüğü
// belirtilir.
// Türkçe metni karşılaştırmaya hazırlar: küçük harf, noktalama atılır,
// sayılar olduğu gibi korunur, fazla boşluklar teklenir. Aynı normalizasyon
// hem referansa hem çıktıya uygulanır; yoksa ölçüm yanıltıcı olur.
// Türkçe küçük harfe çevirme — TEK KAYNAK (v2.100).
// Düz `toLowerCase()` Türkçe büyük `İ` harfini `i` + BİRLEŞİK NOKTA (U+0307)
// yapar; sonra `\p{L}` dışı sayılan birleşik işaret atılır ve kelime
// "stanbul"a dönüşür. `toLocaleLowerCase('tr-TR')` doğru sonucu verir.
// Türkçe metin küçültmesi gereken HER yer bunu kullanmalıdır.
function trLowerCase(v) {
  return String(v == null ? '' : v).toLocaleLowerCase('tr-TR');
}
function normalizeForWer(text) {
  return trLowerCase(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function werWords(text) {
  const n = normalizeForWer(text);
  return n ? n.split(' ') : [];
}
// ---- Terim yazım tutarlılığı (NLP katmanı) ----
// Aynı terimin metin içinde farklı yazımlarla geçtiğini bulur. Bu bir ÖNERİdir:
// otomatik değiştirme yapılmaz, yalnızca uzmana "şu yazımlar geçiyor, birini
// seçin" diye hatırlatılır. Uydurma yoktur; yalnızca metinde gerçekten geçen
// kelimeler karşılaştırılır.
const TR_STOPWORDS = new Set([
  'bir',
  'bu',
  've',
  'ile',
  'için',
  'de',
  'da',
  'mi',
  'mı',
  'mu',
  'mü',
  'ne',
  'ki',
  'ama',
  'fakat',
  'ancak',
  'ya',
  'veya',
  'çok',
  'daha',
  'en',
  'gibi',
  'kadar',
  'sonra',
  'önce',
  'ise',
  'ben',
  'sen',
  'o',
  'biz',
  'siz',
  'onlar',
  'var',
  'yok',
  'değil',
  'olarak',
  'olan',
  'oldu',
  'olur',
  'benim',
  'senin',
  'onun',
  'bunu',
  'şunu',
  'onu'
]);
// Metinden anlamlı sözcükleri çıkarır (küçük harfe indirir, noktalama atar,
// kısa ve işlev sözcüklerini eler). Sayı içeren jetonlar korunur.
function contentWords(text) {
  // trLowerCase: Türkçe büyük İ doğru küçülür (v2.100). Düz toLowerCase
  // "İstanbul"u "stanbul"a parçalıyordu; "istanbul" ile hiç eşleşmiyordu.
  const raw = trLowerCase(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/);
  const out = [];
  for (const w of raw) {
    if (!w || w.length < 4) continue;
    if (TR_STOPWORDS.has(w)) continue;
    out.push(w);
  }
  return out;
}
// Bir dizi metinden, birbirine çok benzeyen (küçük yazım farkı olan) sözcük
// kümelerini bulur. Dönen her küme: {forms:[{w,count}...],total,canonical}.
// Yalnızca gerçekten birden fazla yazım varsa kümeye girer.
function findTermInconsistencies(texts, { minCount = 2, maxDist = 1, minLen = 4 } = {}) {
  const counts = new Map();
  for (const t of texts) {
    for (const w of contentWords(t)) {
      if (w.length < minLen) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  const words = [...counts.keys()];
  const used = new Set();
  const groups = [];
  for (let i = 0; i < words.length; i++) {
    const a = words[i];
    if (used.has(a)) continue;
    if ((counts.get(a) || 0) < minCount) continue;
    const cluster = [a];
    for (let j = i + 1; j < words.length; j++) {
      const b = words[j];
      if (used.has(b)) continue;
      // Aynı ilk 3 harf şartı, gereksiz eşleşmeleri azaltır.
      if (a.slice(0, 3) !== b.slice(0, 3)) continue;
      const d = editDistance(a, b);
      const maxLen = Math.max(a.length, b.length);
      if (d <= maxDist && d / maxLen <= 0.2) cluster.push(b);
    }
    if (cluster.length < 2) continue;
    const forms = cluster
      .map((w) => ({ w, count: counts.get(w) || 0 }))
      .sort((x, y) => y.count - x.count || x.w.localeCompare(y.w, 'tr'));
    const total = forms.reduce((n, f) => n + f.count, 0);
    if (total < 2) continue;
    cluster.forEach((w) => used.add(w));
    groups.push({ forms, total, canonical: forms[0].w });
  }
  return groups.sort((a, b) => b.total - a.total);
}
// Bir kaydın tüm bölüm metinlerinde terim tutarsızlıklarını bulur.
function materialTermIssues(m) {
  const texts = (m.segments || []).map((s) => s.text || '');
  return findTermInconsistencies(texts);
}
// Bir yazımı tüm bölümlerde önerilen biçimle değiştirir (yalnızca kullanıcı
// onayıyla çağrılır). Sözcük sınırlarına saygı gösterir; metin geçmişine yazar.
function applyTermForm(m, from, to) {
  const re = new RegExp(
    `(^|[^\\p{L}\\p{N}])(${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=$|[^\\p{L}\\p{N}])`,
    'giu'
  );
  let changed = 0;
  for (const s of m.segments || []) {
    if (!s.text) continue;
    const next = s.text.replace(re, (mm, p1) => {
      changed++;
      return p1 + to;
    });
    if (next !== s.text) {
      const prev = s.text;
      applyTextEdit(s, next);
      pushSegmentHistory(s, prev);
    }
  }
  return changed;
}
// Kelime düzeyinde Levenshtein. Bellek için iki satır yeterlidir.
function editDistance(a, b) {
  const n = a.length,
    m = b.length;
  if (!n) return m;
  if (!m) return n;
  let prev = new Array(m + 1),
    cur = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[m];
}
// WER hesabı. Dönen değer: oran, ham sayılar ve kategoriler.
function computeWer(reference, hypothesis) {
  const ref = werWords(reference),
    hyp = werWords(hypothesis);
  const dist = editDistance(ref, hyp);
  const ratio = ref.length ? dist / ref.length : hyp.length ? 1 : 0;
  return { ratio, refCount: ref.length, hypCount: hyp.length, errors: dist };
}
function fmtWer(r) {
  // Türkçe ondalık AYIRICI virgüldür. "%94.0" okunaksız; "%94,0" yazılır.
  // Depo kuralı: biçimlendirme tek kaynaktan (bkz. fmtDb, fmtPct).
  return Number.isFinite(r) ? `%${(r * 100).toFixed(1).replace('.', ',')}` : '—';
}
// Referans metni olan tüm kayıtlar için WER ölçer. Yalnızca gerçekten
// çözümlenmiş bölümler kullanılır; çözümlenmemiş kayıt atlanır.
// WER: MODELİN çıktısını ölçer (v2.90).
// GERÇEK HATA (öncesi): hipotez olarak `s.text` (bilirkişinin düzelttiği metin)
// kullanılıyordu; modelin ham çıktısı `s.asrText`'te duruyor ama ölçüme
// girmiyordu. Sonuç: ölçüm TERS çalışıyordu — model %100 hatalı, bilirkişi
// metni referansa eşit → rapor "%0 WER"; model mükemmel, bilirkişi metni
// bozuk → "%100 WER". Raporda "çözümleme doğruluğu" diye sunulan tablo,
// modelin değil bilirkişinin referansa ne kadar yaklaştığını ölçüyordu.
// KURAL: hipotez YALNIZ asrText'ten gelir (modelin ürünü). asrText yoksa
// (eski kayıt) satır YAZILMAZ — uydurma yapılmaz.
function measureWerForCase(c) {
  const out = [];
  for (const m of c.materials || []) {
    const ref = m.expectedText || (m.referenceSegments || []).map((s) => s.text || '').join(' ');
    if (!ref || !String(ref).trim()) continue;
    // Yalnız model çıktısı olan bölümler hipoteze girer.
    const asrParts = (m.segments || []).map((s) => String(s.asrText || '').trim()).filter(Boolean);
    if (!asrParts.length) continue;
    const r = computeWer(ref, asrParts.join(' '));
    out.push({ material: m.name, model: m.transcribedWithModel || null, ...r });
  }
  return out;
}

// WER ölçülebilen kayıt sayısı. TABLO ile ÖZET SAYACI aynı ölçütü kullanmalı;
// aksi hâlde "WER ölçümü yapılan kayıt: 1" yazarken tabloda 0 satır olur.
function werMeasuredCount(c) {
  return measureWerForCase(c).length;
}

// ==== Kanal seçimi (stereo kayıtlarda) ====
// Stereo bir kayıtta sol ve sağ kanalları ayrı dinlemek, uzmanın arka plan
// gürültüsünü veya bir kanaldaki konuşmayı ayırt etmesine yardımcı olur.
// Web Audio grafiği: source -> splitter -> (gainL, gainR) -> merger -> çıkış.
// Kanal modu gain değerleriyle ayarlanır; oynatma konumu ve hız korunur.
// Seviye ölçümü şeması. Ölçüm alanları değiştiğinde artırılır; eski kayıtlar
// geçersiz sayılıp yeniden ölçülür. Böylece arayüz eski kodla üretilmiş,
// eksik ya da çelişkili değerleri göstermez.
const LEVELS_SCHEMA = 3;
// Sessizlik ölçümü şeması (v2.92): 1 = yalnız kanal 0'dan (hatalı),
// 2 = en yüksek enerjili kanaldan. Eski kayıtlar atılır, yeniden ölçülür.
const SILENCE_SCHEMA = 2;
const audioGraphs = new Map(); // m.id -> {ctx, player, gainL, gainR, merger, hp, lp, gate, gateGain}
const CHANNEL_MODES = [
  ['both', 'Stereo (her iki kanal)'],
  ['left', 'Yalnız sol kanal'],
  ['right', 'Yalnız sağ kanal']
];
// Dinleme yardımcıları: yalnızca ses işleme (DSP) filtreleri. Kaynak ayrıştırma
// (ör. yalnız konuşmayı müzikten ayırma) bu uygulamada yapılmaz; ağır bir
// makine öğrenmesi işidir ve burada uydurulmaz. Sunulan filtreler:
//  - "Konuşma odağı": 300 Hz yüksek geçiren + 3,4 kHz alçak geçiren (telefon
//    bandı). Uğultuyu ve tiz hışırtıyı azaltır, konuşmayı öne çıkarır.
//  - "Uğultu kes": 80 Hz yüksek geçiren; masa/trafik uğultusunu keser.
//  - "Gürültü kapısı": sessiz aralıklarda kazancı düşürür.
// Bu filtreler yalnızca DİNLEMEYİ kolaylaştırır ve kaydı değiştirmez. Oturum
// ayarıdır: rapora yazılmaz, çünkü ölçülen bir bulgu değildir.
const LISTEN_FILTERS = [
  ['off', 'Kapalı (özgün ses)'],
  ['voice', 'Konuşma odağı (300 Hz – 3,4 kHz)'],
  ['rumble', 'Uğultu kes (80 Hz üstü)'],
  ['voice_gate', 'Konuşma odağı + gürültü kapısı']
];
function listenFilter(m) {
  return m.listenFilter || 'off';
}
function applyListenFilters(m) {
  const g = audioGraphs.get(m.id);
  if (!g) return;
  const mode = listenFilter(m);
  const t = g.ctx.currentTime;
  const hpOn = mode !== 'off';
  const lpOn = mode === 'voice' || mode === 'voice_gate';
  const gateOn = mode === 'voice_gate';
  if (g.hp) g.hp.frequency.setTargetAtTime(hpOn ? (lpOn ? 300 : 80) : 10, t, 0.02);
  if (g.lp) g.lp.frequency.setTargetAtTime(lpOn ? 3400 : 20000, t, 0.02);
  if (g.gateGain && !gateOn) g.gateGain.gain.setTargetAtTime(1, t, 0.02);
  g.gateEnabled = gateOn;
}
function channelMode(m) {
  return m.channelMode || 'both';
}
function applyChannelMode(m) {
  const g = audioGraphs.get(m.id);
  if (!g || !g.gainL || !g.gainR) return;
  const mode = channelMode(m);
  const t = g.ctx.currentTime;
  // Sol kanal: left ve both modlarında açık; sağ kanal: right ve both modlarında.
  g.gainL.gain.setTargetAtTime(mode === 'right' ? 0 : 1, t, 0.01);
  g.gainR.gain.setTargetAtTime(mode === 'left' ? 0 : 1, t, 0.01);
}
// Bir oynatıcı için ses grafiğini kurar. createMediaElementSource bir elemente
// yalnızca bir kez uygulanabildiği için, element değişince eski bağlam kapatılır.
// Zincir: source -> yüksek geçiren -> alçak geçiren -> kapı -> kanal -> çıkış.
async function ensureAudioGraph(m, player) {
  const existing = audioGraphs.get(m.id);
  if (existing && existing.player === player) {
    applyChannelMode(m);
    applyListenFilters(m);
    return existing;
  }
  if (existing) {
    try {
      await existing.ctx.close();
    } catch (e) {}
    audioGraphs.delete(m.id);
  }
  let ctx,
    source,
    hp,
    lp,
    gateGain,
    analyser,
    splitter = null,
    gainL = null,
    gainR = null,
    merger = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    source = ctx.createMediaElementSource(player);
    hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 10;
    hp.Q.value = 0.7;
    lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 20000;
    lp.Q.value = 0.7;
    gateGain = ctx.createGain();
    gateGain.gain.value = 1;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(hp);
    hp.connect(lp);
    lp.connect(gateGain);
    gateGain.connect(analyser);
    // Stereo kayıtta kanal seçimi için splitter/merger kurulur; mono kayıtta
    // doğrudan çıkışa bağlanır ki sağ kanal sessiz kalmasın.
    if (m.tech?.channels === 2) {
      splitter = ctx.createChannelSplitter(2);
      gainL = ctx.createGain();
      gainR = ctx.createGain();
      merger = ctx.createChannelMerger(2);
      analyser.connect(splitter);
      splitter.connect(gainL, 0);
      splitter.connect(gainR, 1);
      gainL.connect(merger, 0, 0);
      gainR.connect(merger, 0, 1);
      merger.connect(ctx.destination);
    } else {
      analyser.connect(ctx.destination);
    }
  } catch (e) {
    // Bazı tarayıcılar MediaElementSource'a izin vermez; sessizce normal oynat.
    if (ctx)
      try {
        await ctx.close();
      } catch (e2) {}
    return null;
  }
  const g = {
    ctx,
    player,
    gainL,
    gainR,
    merger,
    hp,
    lp,
    gateGain,
    analyser,
    gateEnabled: false,
    gateTimer: null,
    mono: !(m.tech?.channels === 2)
  };
  audioGraphs.set(m.id, g);
  applyChannelMode(m);
  applyListenFilters(m);
  return g;
}
// Gürültü kapısı: analiz düğümünden kısa aralıklarla RMS ölçülür; konuşma
// yokken kazanç yumuşakça düşürülür. Bu bir "dinleme yardımcısı"dır; kaydı
// değiştirmez ve ölçülen eşik yalnızca geçerli oturum içindir.
function runNoiseGate(m) {
  const g = audioGraphs.get(m.id);
  if (!g || !g.analyser) return;
  if (g.gateTimer) return;
  const buf = new Float32Array(g.analyser.fftSize);
  let floor = 0.004;
  g.gateTimer = setInterval(() => {
    if (!g.gateEnabled) {
      g.gateGain.gain.setTargetAtTime(1, g.ctx.currentTime, 0.02);
      return;
    }
    g.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    // Zemin gürültüsü yavaşça güncellenir; konuşma bunun üstündedir.
    if (rms < floor * 2.5) floor = Math.min(0.05, floor * 0.98 + rms * 0.02);
    const open = rms > Math.max(floor * 2.5, 0.006);
    g.gateGain.gain.setTargetAtTime(open ? 1 : 0.18, g.ctx.currentTime, 0.05);
  }, 60);
}
// Oynatma başlamadan önce bağlamı uyandır (tarayıcı politikası).
function resumeAudioGraph(m) {
  const g = audioGraphs.get(m.id);
  if (g && g.ctx.state === 'suspended') g.ctx.resume().catch(() => {});
}
function closeAudioGraph(m) {
  const g = audioGraphs.get(m.id);
  if (!g) return;
  if (g.gateTimer) {
    clearInterval(g.gateTimer);
    g.gateTimer = null;
  }
  try {
    g.ctx.close();
  } catch (e) {}
  audioGraphs.delete(m.id);
}
// Kayıt kaldırıldığında grafiği de kapat (kaynak sızıntısını önler).

// ==== Konuşmacı yönetimi ve ses analizi ====
// Önemli sınır: uygulama konuşmacı KİMLİĞİNİ tespit etmez. Konuşmacı etiketleri
// uzman tarafından verilir. Burada yapılan, ölçülebilir akustik büyüklüklerdir:
// temel frekans (perde) tahmini ve konuşma süresi. Perde, cinsiyet hakkında
// güçlü bir gösterge olabilir ama kesin değildir; arayüz bunu "ölçüm" olarak
// sunar, "tespit" olarak değil. Aynı konuşmacıyı bulma yalnızca benzer perde
// aralığına göre ÖNERİ üretir ve öneri olduğu açıkça yazılır.
// Perde aralığı ölçümüne göre kaba yönlendirme (tıbbi/kesin değil, kaba gösterge).
// Rapor "ÖLÇÜLEN PERDE" hücresi — TEK KAYNAK (v2.101).
// Oktav belirsizse TEK bir kesin sayı yazılmaz: otokorelasyon, temel frekans
// zayıfken 2. harmoniğin periyodunu bulabilir ve perdeyi iki katına çıkarır.
// Bu durumda olası aralık + uyarı yazılır; "genellikle kadın/erkek" gibi
// cinsiyet ipucu tek sayıya bağlanmaz (yanıltıcı olur).
function pitchCellText(sp) {
  const hz = sp && sp.pitch;
  if (!hz) return 'Ölçülmedi';
  if (sp.pitchAmbiguous) {
    const low = sp.pitchOctaveHz || hz / 2;
    return `oktav belirsiz: ≈${Math.round(low)}–${Math.round(hz)} Hz (tek sayı iddia edilmez)`;
  }
  return `${Math.round(hz)} Hz (${pitchHint(hz)})`;
}
function pitchHint(f0) {
  if (!f0) return '';
  if (f0 < 95) return 'çok düşük perde (genellikle yetişkin erkek)';
  if (f0 < 155) return 'düşük perde (genellikle erkek)';
  if (f0 < 200) return 'orta perde';
  if (f0 < 255) return 'yüksek perde (genellikle kadın)';
  return 'çok yüksek perde (genellikle kadın veya çocuk)';
}
// Segment listesindeki konuşmacı etiketlerinden konuşmacı kayıtlarını türetir.
// Var olan profillerin nitelikleri korunur; yeni etiketler eklenir. Standart
// kod (S1, S2…) burada atanır; eksikse sıradaki boş kod verilir.
function ensureSpeakers(m) {
  m.speakers = m.speakers || [];
  const byName = new Map(m.speakers.map((s) => [s.name, s]));
  for (const sg of m.segments || []) {
    const name = (sg.speaker || '').trim();
    if (!name || name === 'Belirtilmedi') continue;
    if (!byName.has(name)) {
      const rec = {
        id: uid(),
        code: '',
        name,
        role: 'unspecified',
        gender: 'unspecified',
        ageRange: '',
        notes: '',
        pitch: null,
        pitchAt: null
      };
      m.speakers.push(rec);
      byName.set(name, rec);
    }
  }
  assignSpeakerCodes(m.speakers);
  return m.speakers;
}
function speakerByName(m, name) {
  return (m.speakers || []).find((s) => s.name === name) || null;
}
function speakerSegments(m, name) {
  return (m.segments || []).filter((sg) => (sg.speaker || '') === name);
}
function fmtHz(hz) {
  return hz ? `${Math.round(hz)} Hz` : '';
}

// Temel frekans (f0) tahmini: otokorelasyon yöntemi. Bir bölümün ortasından
// 0,4 sn'lik pencere alınır, 70-400 Hz aralığında en güçlü periyodiklik aranır.
// Bu gerçek bir DSP ölçümüdür; sonuç "kayıt koşullarına bağlı tahmin" olarak
// sunulur. Kullanıcı ölçümü tetikler, uygulama kendiliğinden çalıştırmaz.
function detectPitchHz(samples, sampleRate) {
  const N = Math.min(samples.length, Math.floor(sampleRate * 0.4));
  if (N < sampleRate * 0.05) return null;
  const buf = new Float32Array(N);
  let mean = 0;
  for (let i = 0; i < N; i++) {
    buf[i] = samples[i];
    mean += buf[i];
  }
  mean /= N;
  for (let i = 0; i < N; i++) buf[i] -= mean; // DC bileşenini çıkar
  let r0 = 0;
  for (let i = 0; i < N; i++) r0 += buf[i] * buf[i];
  if (r0 <= 0) return null;
  const minLag = Math.max(2, Math.floor(sampleRate / 400)),
    maxLag = Math.floor(sampleRate / 70);
  let bestLag = -1,
    bestNorm = 0;
  for (let lag = minLag; lag <= maxLag && lag < N; lag++) {
    let corr = 0;
    for (let i = 0; i < N - lag; i++) corr += buf[i] * buf[i + lag];
    // Normalize otokorelasyon: r(lag)/r(0). 1'e yakın = güçlü periyodiklik.
    const norm = corr / r0;
    if (norm > bestNorm) {
      bestNorm = norm;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestNorm < 0.3) return null; // yeterli periyodiklik yok
  return sampleRate / bestLag;
}
// OKTAV BELİRSİZLİĞİ (v2.101).
// Otokorelasyon, temel frekans (H1) zayıf ve 2. harmonik (H2) güçlü olduğunda
// H2'nin periyodunu bulur ve perdeyi İKİ KATINA çıkarır (ölçüldü: gerçek
// 120 Hz → 238,8 Hz). Bunu otokorelasyondan ayırmak GÜVENİLİR biçimde mümkün
// değildir: her periyodik sinyal 2×lag'de de tepe verir. "Düzeltme" denemesi
// normal sesleri de bozdu (ölçüldü: 210 Hz → 105 Hz).
// DÜRÜST ÇÖZÜM: belirsizliği TESPİT ET ve BİLDİR. Spektrumda H1 bileşeni
// H2'den belirgin biçimde zayıfsa (≥ 10 dB), ölçülen perde oktav yukarıda
// olabilir; rapor bunu "oktav belirsiz" diye yazar ve tek bir kesin sayı
// iddia etmez. Uydurma yok, ölçülemeyen kesinlik iddia edilmez.
function detectPitchAmbiguity(samples, sampleRate, measuredHz) {
  if (!measuredHz) return { ambiguous: false, octaveHz: null };
  const N = Math.min(samples.length, Math.floor(sampleRate * 0.4));
  if (N < sampleRate * 0.05) return { ambiguous: false, octaveHz: null };
  // Basit Goertzel: f ve 2f'deki enerji oranı.
  const power = (freq) => {
    const w = (2 * Math.PI * freq) / sampleRate;
    const c = 2 * Math.cos(w);
    let s1 = 0,
      s2 = 0;
    for (let i = 0; i < N; i++) {
      const s0 = samples[i] + c * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    return s1 * s1 + s2 * s2 - c * s1 * s2;
  };
  const fHalf = measuredHz / 2; // oktav aşağısı
  if (fHalf < 70) return { ambiguous: false, octaveHz: null };
  const pMeas = power(measuredHz);
  const pHalf = power(fHalf);
  if (!(pMeas > 0)) return { ambiguous: false, octaveHz: null };
  // Ölçülen frekansın YARISINDA anlamlı enerji varsa, gerçek temel o olabilir:
  // ölçülen aslında 2. harmoniktir (oktav yukarıda). Eşik −30 dB: bu kadar
  // zayıf bir bileşen bile "yarım frekansta enerji var" demektir; normal
  // seslerde f/2'de enerji pratikte YOKTUR (ölçüldü: −250 dB civarı).
  const ratioDb = 10 * Math.log10(Math.max(pHalf, 1e-20) / pMeas);
  const ambiguous = ratioDb > -30;
  return { ambiguous, octaveHz: ambiguous ? fHalf : null, ratioDb };
}
// Kayıttaki konuşmacılar için perde ölçümü. Her konuşmacının bölümlerinden
// birkaç örnek alınır, ortanca (medyan) perde hesaplanır. Ölçüm tek seferde
// yapılır ve kayda bağlı saklanır.
async function measureSpeakerPitch(m) {
  const c = currentCase();
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası bulunamadı.');
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let audio;
  try {
    audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch (e) {
    await ctx.close();
    showToast('Ses çözümlenemedi.');
    return;
  }
  const sr = audio.sampleRate;
  // TÜM kanallar (v2.92). Öncesinde yalnız kanal 0 okunuyordu; konuşma sağ
  // kanalda ise perde "ölçülemedi" çıkıyordu. Her bölüm için en yüksek
  // enerjili kanal seçilir.
  const chCount = audio.numberOfChannels;
  const channels = [];
  for (let ch = 0; ch < chCount; ch++) channels.push(audio.getChannelData(ch));
  ensureSpeakers(m);
  for (const sp of m.speakers) {
    const segs = speakerSegments(m, sp.name).slice(0, 12);
    const vals = [];
    for (const sg of segs) {
      const st = secondsFromTimecode(sg.start);
      const en = secondsFromTimecode(sg.end);
      // Süresi olmayan bölümde de ölçüm yapılabilir: başlangıçtan pencere alınır.
      const mid = en > st ? Math.floor(((st + en) / 2) * sr) : Math.floor(st * sr) + Math.floor(sr * 0.2);
      const a = Math.max(0, mid - Math.floor(sr * 0.2));
      const b = Math.min(channels[0].length, mid + Math.floor(sr * 0.2));
      // Bölüm aralığındaki en yüksek enerjili kanal (konuşma tek kanalda olabilir).
      const segChannels = channels.map((c) => c.subarray(a, b));
      const pick = pickActiveChannel(segChannels);
      const f = detectPitchHz(segChannels[pick.index], sr);
      if (f) {
        // Oktav belirsizliğini de ölç (v2.101): rapora tek bir kesin sayı
        // yazmadan önce "oktav yukarıda olabilir mi" bilinmeli.
        const amb = detectPitchAmbiguity(segChannels[pick.index], sr, f);
        vals.push({ hz: f, ambiguous: !!(amb && amb.ambiguous), octaveHz: (amb && amb.octaveHz) || null });
      }
    }
    if (vals.length) {
      // Medyan: perde tahminleri arasında en dayanıklı özet.
      vals.sort((a, b) => a.hz - b.hz);
      const med = vals[Math.floor(vals.length / 2)];
      sp.pitch = med.hz;
      sp.pitchSamples = vals.length;
      // Oktav belirsizse raporda tek sayı iddia edilmez (v2.101).
      const ambCount = vals.filter((v) => v.ambiguous).length;
      sp.pitchAmbiguous = ambCount > 0;
      sp.pitchOctaveHz = med.octaveHz;
      sp.pitchAt = new Date().toISOString();
    } else {
      sp.pitch = null;
      sp.pitchAmbiguous = false;
      sp.pitchOctaveHz = null;
      sp.pitchAt = new Date().toISOString();
    }
  }
  await ctx.close();
  logEvent(m, 'Konuşmacı perde ölçümü', `${m.speakers.length} konuşmacı için perde tahmini hesaplandı`);
  persist();
  renderSpeakersPanel(m); // Perde ölçümü tüm ses listesini yeniden çizmez; yalnızca konuşmacı paneli
  // güncellenir. Böylece sayfa yerinde kalır, kaydırma ve odak korunur.
  showToast('Konuşmacı perde ölçümü tamamlandı.');
}
// Kaydın tamamı için seviye ölçümü: tepe/RMS, tepe kırpılma, gürültü tabanı ve
// sinyal/gürültü oranı. Sonuç kayda bağlanır ve rapora "Seviye ölçümü" satırı
// olarak yalnızca gerçekten ölçüldüyse yazılır.
async function measureLevels(m) {
  const c = currentCase();
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası bulunamadı.');
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  // Ölçüm, dosyanın kendi örnekleme hızında yapılır. Aksi hâlde tarayıcı
  // 48 kHz'e yeniden örnekler ve bant genişliği dosyanın gerçek üst sınırından
  // yüksek görünür; bu da rapora yanlış bir "geniş bant" izlenimi yazdırır.
  const nativeRate = Number(m.tech?.sampleRate) || 0;
  let ctx;
  try {
    ctx = nativeRate ? new AC({ sampleRate: nativeRate }) : new AC();
  } catch (e) {
    ctx = new AC();
  }
  let audio;
  try {
    audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch (e) {
    await ctx.close();
    showToast('Ses çözümlenemedi.');
    return;
  }
  // KANAL KANAL ölçüm (v2.91). Öncesinde tüm kanallar ortalamayla tek
  // "mono"ya indiriliyordu; ses yalnız bir kanalda ise tepe −6 dB düşük,
  // tek kanaldaki kırpılma tamamen görünmez oluyordu. Artık tepe ve kırpılma
  // en kötü kanaldan raporlanır; gürültü tabanı/SNR mono karışımdan.
  const chCount = audio.numberOfChannels;
  const channels = [];
  for (let ch = 0; ch < chCount; ch++) channels.push(audio.getChannelData(ch));
  const lv = analyzeChannelLevels(channels, audio.sampleRate);
  // Stereo ise kanal dengesi, faz ilişkisi ve DC kayması da ölçülür.
  const stereo = chCount === 2 ? analyzeStereo(audio.getChannelData(0), audio.getChannelData(1), audio.sampleRate) : null;
  // Etkin bant genişliği tüm spektrumun ölçüsüdür; mono karışım burada
  // doğrudur (bant sınırlaması kanallardan bağımsızdır).
  const lenAll = audio.length;
  const mono = new Float32Array(lenAll);
  for (let ch = 0; ch < chCount; ch++) {
    const d = audio.getChannelData(ch);
    for (let i = 0; i < lenAll; i++) mono[i] += d[i] / chCount;
  }
  const rolloff = spectralRolloff(mono, audio.sampleRate);
  await ctx.close();
  if (!lv.ok) {
    showToast('Ölçüm yapılamadı: kayıt boş görünüyor.');
    return;
  }
  m.levels = {
    ...lv,
    schema: LEVELS_SCHEMA,
    channels: chCount,
    analysisRate: audio.sampleRate,
    stereo: stereo && stereo.ok ? stereo : null,
    rolloff: rolloff || null,
    at: new Date().toISOString()
  };
  // Günlüğe hangi kanaldan ölçüldüğü de yazılır: sonradan denetlenebilir olsun.
  const chInfo = lv.channels > 1 ? ` · tepe kanal ${lv.peakChannel}` : '';
  const clipInfo = lv.clippedSamples > 0 ? ` (kanal ${lv.clipChannel})` : '';
  logEvent(m, 'Seviye ölçümü', `Tepe ${lv.peakDb.toFixed(1)} dBFS · RMS ${lv.rmsDb.toFixed(1)} dBFS · kırpılma %${(lv.clippedRatio * 100).toFixed(3)}${clipInfo}${chInfo}`);
  persist();
  renderAudioList();
  renderOverview();
  showToast('Seviye ölçümü tamamlandı.');
}
// Seçili bölümün sessizlik oranını ölçer. Ses dosyası çözülür, aralık RMS
// tabanlı analyzeSilence ile incelenir ve sonuç bölüme bağlanır. Ölçüm
// deterministiktir; uydurma bir "konuşma olasılığı" üretilmez.
async function measureSegmentSilence(m, index) {
  const s = (m.segments || [])[index];
  if (!s) return;
  const c = currentCase();
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası bulunamadı.');
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let audio;
  try {
    audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch (e) {
    await ctx.close();
    showToast('Ses çözümlenemedi.');
    return;
  }
  const sr = audio.sampleRate;
  // TÜM kanallar (v2.92). Öncesinde yalnız kanal 0 okunuyordu; konuşma sağ
  // kanalda ise bölüm "tamamen sessiz" sanılıyordu.
  const chCount = audio.numberOfChannels;
  const channels = [];
  for (let ch = 0; ch < chCount; ch++) channels.push(audio.getChannelData(ch));
  const st = secondsFromTimecode(s.start);
  const en = secondsFromTimecode(s.end);
  const stats = analyzeSilenceChannelAware(channels, sr, st, en);
  await ctx.close();
  if (!stats.ok) {
    showToast('Ölçüm için geçerli bir zaman aralığı gerekir.');
    return;
  }
  s.silence = { ...stats, schema: SILENCE_SCHEMA };
  // Hangi kanaldan ölçüldüğü günlüğe yazılır (v2.92): sonradan denetlenebilir.
  const chNote = stats.channels > 1 ? ` · kanal ${stats.channel}` : '';
  logEvent(m, 'Sessizlik ölçümü', `Bölüm ${index + 1}: %${Math.round(stats.ratio * 100)} sessiz (${stats.silentSec.toFixed(1)} sn)${chNote}`);
  persist();
  renderSegDetail(m);
  updateSegListItem(m, index);
  renderOverview();
  showToast(`Bölüm ${index + 1} sessizlik: %${Math.round(stats.ratio * 100)}`);
}
// Benzer perde aralığındaki konuşmacıları gruplama ÖNERİSİ. Kimlik tespiti
// değildir; yalnızca "bu etiketler benzer perdede, aynı kişi olabilir"
// ihtimalini uzmana hatırlatır. Uzman kararı esastır.
function suggestSpeakerMerges(m) {
  const sp = (m.speakers || []).filter((s) => s.pitch);
  const groups = [];
  for (const s of sp) {
    let placed = false;
    for (const g of groups) {
      const ref = g[0];
      if (Math.abs(s.pitch - ref.pitch) / ref.pitch < 0.12) {
        g.push(s);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([s]);
  }
  return groups.filter((g) => g.length > 1);
}

// Konuşmacı paneli: her konuşmacı için standart kod, etiket, rol, cinsiyet,
// yaş aralığı, not ve ölçülen perde. Bu bilgiler rapora "Konuşmacılar" tablosu
// olarak akar.
// KURAL (v2.79): seçeneklerin `value` değeri ASCII KOD'dur, görünen metin
// Türkçe ETİKETTİR. v2.78 ve öncesinde value'ya etiket yazılıyordu; şema kodu
// beklediği için kaydedilen rol/cinsiyet yeniden yüklemede 'unspecified'a
// düşüyordu (sessiz veri kaybı).
function speakersPanelHtml(m) {
  const sp = m.speakers || [];
  if (!sp.length)
    return '<div class="seg-empty-note">Konuşmacı etiketi girilmedi. Bölümlerde konuşmacı adı girdiğinizde burada listelenir.</div>';
  const merges = suggestSpeakerMerges(m);
  const mergeNote = merges.length
    ? `<div class="halluc-note" style="background:#eef4fb;border-color:#d6e4f2;color:#2f6f95">Öneri (kimlik tespiti değildir): benzer perdede görünen etiketler — ${merges.map((g) => g.map((s) => esc(s.name)).join(' ≈ ')).join(' · ')}. Aynı kişi olup olmadığına uzman karar verir.</div>`
    : '';
  const rows = sp
    .map((s) => {
      const segs = speakerSegments(m, s.name);
      const roleOpts = SPEAKER_ROLE.map(
        (code) =>
          `<option value="${esc(code)}" ${normalizeSpeakerRole(s.role) === code ? 'selected' : ''}>${esc(SPEAKER_ROLE_LABEL[code] || code)}</option>`
      ).join('');
      const genOpts = SPEAKER_GENDER.map(
        (code) =>
          `<option value="${esc(code)}" ${normalizeSpeakerGender(s.gender) === code ? 'selected' : ''}>${esc(SPEAKER_GENDER_LABEL[code] || code)}</option>`
      ).join('');
      return `<div class="spk-card" data-spk-card="${esc(s.id)}">
      <div class="seg-row2">
        <div class="seg-field"><label>Standart kod</label><input data-spk="${esc(s.id)}" data-spk-key="code" value="${esc(s.code || '')}" placeholder="S1" title="Raporda ve bölüm listesinde bu kod görünür. Etiket değişse de aynı kişi aynı kodla kalır."></div>
        <div class="seg-field"><label>Konuşmacı etiketi</label><input data-spk="${esc(s.id)}" data-spk-key="name" value="${esc(s.name)}" placeholder="Örn. Kiracı, Ev sahibi"></div>
      </div>
      <div class="seg-row2">
        <div class="seg-field"><label>Rol</label><select data-spk="${esc(s.id)}" data-spk-key="role">${roleOpts}</select></div>
        <div class="seg-field"><label>Cinsiyet (uzman beyanı)</label><select data-spk="${esc(s.id)}" data-spk-key="gender">${genOpts}</select></div>
      </div>
      <div class="seg-row2">
        <div class="seg-field"><label>Yaş aralığı</label><input data-spk="${esc(s.id)}" data-spk-key="ageRange" value="${esc(s.ageRange || '')}" placeholder="Örn. 30-40"></div>
        <div class="seg-field"><label>Not / gözlem</label><input data-spk="${esc(s.id)}" data-spk-key="notes" value="${esc(s.notes || '')}" placeholder="Örn. aksanlı, kısık ses"></div>
      </div>
      <small>${segs.length} bölüm · ${s.pitch ? `ölçülen perde ≈ <b>${fmtHz(s.pitch)}</b> — ${esc(pitchHint(s.pitch))}${s.pitchSamples ? ` (${s.pitchSamples} örnek)` : ''}` : 'perde ölçülmedi'}</small>
    </div>`;
    })
    .join('');
  return `${mergeNote}<div class="spk-list">${rows}</div>`;
}
function renderSpeakersPanel(m) {
  const root = $(`#spk-panel-${CSS.escape(m.id)}`);
  if (!root) return;
  root.innerHTML = speakersPanelHtml(m);
}
// ==== Deşifre ve kontrol çalışma alanı ====
// Bilirkişinin en çok zaman geçirdiği alan. Mimari kararlar:
//  1) İki panel: solda bölüm listesi, sağda aktif bölüm detayı. Aktif bölüm
//     değişince DOM yeniden çizilmez; yalnızca .is-active sınıfı taşınır ve
//     sağ panel alanları güncellenir. Böylece kaydırma, odak ve ok tuşları
//     bozulmaz (önceki sürümde tam yeniden çizim bunları bozuyordu).
//  2) Liste bir kez kurulur; metin değişikliği yalnızca ilgili öğeyi günceller.
//  3) Model güven skoru vermediği için uydurma skor üretilmez; bunun yerine
//     şeffaf, gerekçeli bir "inceleme önceliği" hesaplanır (bkz. segPriority).
// Filtre anahtarları v3 kontrol kodlarıyla aynıdır; Türkçe yalnız etikettir.
const SEG_FILTERS = [
  ['all', 'Tümü'],
  ['pending', 'Bekleyen'],
  ['quick', 'Hızlı onaya uygun'],
  ['approved', 'Onaylandı'],
  ['inaudible', 'Anlaşılmadı'],
  ['relisten', 'Yeniden dinlenecek'],
  ['time', 'Zaman sorunları']
];
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
// ZAMAN BÜTÜNLÜĞÜ (v2.144). Bölüm aralıkları sıralı ve örtüşmesiz olmalı.
// Bu fonksiyon yalnız GÖZLEMLENEBİLİR hatayı bildirir; hiçbir zamanı DÜZELTMEZ.
// Kullanıcı: "82 bölüm var; yanlışlıkla aynı zamanı mı böldük, aralıklar
// birbirine giriyor mu, listeden göremiyoruz."
const TIME_ISSUE_LABEL = {
  overlap: 'önceki bölümle çakışıyor',
  duplicate: 'aynı aralık yinelenmiş',
  zero: 'sıfır süre',
  inverted: 'bitiş başlangıçtan önce',
  invalid: 'zaman okunamadı'
};
function segmentTimeIssueLabel(kind) {
  return TIME_ISSUE_LABEL[kind] || 'zaman sorunu';
}
function segmentTimeIssues(segments) {
  const segs = Array.isArray(segments) ? segments : [];
  const issues = [];
  const seen = new Map();
  let prevEnd = -Infinity;
  let prevIdx = -1;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i] || {};
    const a = parseTimecodeStrict(s.start);
    const b = parseTimecodeStrict(s.end);
    if (a == null || b == null) {
      issues.push({ kind: 'invalid', i, j: i });
      continue;
    }
    if (b < a) issues.push({ kind: 'inverted', i, j: i });
    else if (b === a) issues.push({ kind: 'zero', i, j: i });
    const key = a + '|' + b;
    if (seen.has(key)) issues.push({ kind: 'duplicate', i, j: seen.get(key) });
    else seen.set(key, i);
    if (a < prevEnd - 1e-9) issues.push({ kind: 'overlap', i, j: prevIdx });
    if (b > prevEnd) {
      prevEnd = b;
      prevIdx = i;
    }
  }
  return issues;
}
// Bir bölümün zaman sorunu (varsa). Çakışmanın/yinelenmenin DİĞER tarafı da
// kendi satırında işaretlenir (v2.146).
function segmentTimeIssueAt(segments, i) {
  for (const it of segmentTimeIssues(segments)) {
    if (it.i === i) return it;
    if (it.j === i) return { ...it, i: it.j, j: it.i };
  }
  return null;
}
function segmentTimeIssueIndexes(segments) {
  const set = new Set();
  for (const it of segmentTimeIssues(segments)) {
    set.add(it.i);
    if (it.j != null) set.add(it.j);
  }
  return set;
}
// KAPSAMA DENETİMİ (v2.149). "Sesin hiç bölüme girmemiş aralığı var mı?"
// Kullanıcı: "bölerken/çözümlerken parça kaçabiliyor mu, listeden göremiyoruz."
// Kapsanan süre BİRLEŞİM uzunluğudur: çakışan bölüm iki kez sayılmaz.
// Dürüst sınır: boşluk "konuşma yok" demek DEĞİLDİR; yalnız "bölümlenmemiş"tir.
const COVERAGE_TOL = 0.001; // 1 ms — bitişik bölüm boşluk sayılmaz
function segmentCoverage(segments, duration) {
  const segs = Array.isArray(segments) ? segments : [];
  const total = Number(duration);
  const known = Number.isFinite(total) && total > 0;
  const zero = [];
  const outside = [];
  const intervals = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i] || {};
    const a = parseTimecodeStrict(s.start);
    const b = parseTimecodeStrict(s.end);
    if (a == null || b == null) continue;
    if (b - a <= COVERAGE_TOL) {
      zero.push(i);
      continue;
    }
    if (known && (b > total + COVERAGE_TOL || a < -COVERAGE_TOL)) outside.push(i);
    const lo = Math.max(0, a);
    const hi = known ? Math.min(total, b) : b;
    if (hi - lo > COVERAGE_TOL) intervals.push([lo, hi]);
  }
  intervals.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const [a, b] of intervals) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + COVERAGE_TOL) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  let coveredSec = 0;
  for (const [a, b] of merged) coveredSec += b - a;
  const gaps = [];
  if (known) {
    let cur = 0;
    for (const [a, b] of merged) {
      if (a > cur + COVERAGE_TOL) gaps.push({ a: cur, b: a });
      cur = Math.max(cur, b);
    }
    if (total > cur + COVERAGE_TOL) gaps.push({ a: cur, b: total });
  }
  return {
    ok: known,
    totalSec: known ? total : 0,
    coveredSec,
    pct: known ? (coveredSec / total) * 100 : null,
    gaps,
    outside,
    zero
  };
}
// Ekran etiketi: boşluk varsa yüzde ASLA %100 yazılmaz (99 tavanı), çünkü
// "%100" boşluk varken yanıltıcıdır.
function coveragePctText(cov) {
  if (!cov || !cov.ok) return 'Kapsam hesaplanamadı';
  if (!cov.gaps.length) return 'Kapsam %100';
  const pct = Math.max(0, Math.min(99, Math.floor(cov.pct)));
  return `Kapsam %${pct} · ${cov.gaps.length} boşluk`;
}
function segFilter(m) {
  return m.uiFilter || 'all';
}
// "Hızlı onaya uygun" ölçütü. Uydurma bir doğruluk yüzdesi DEĞİLDİR; model
// güven skoru vermediği için yalnızca GÖZLENEBİLİR ve gerekçesi yazılabilir
// işaretlere bakar. Uzman bu listeyi dinleyerek yine de kontrol eder; toplu
// onay yalnız zaman kazandırır, denetim sorumluluğunu kaldırmaz.
// Uygun sayılmama nedenleri (hepsi metinle gösterilir):
//   • metin yok / dolgu (anlamlı konuşma yok)
//   • süre geçersiz ya da çok kısa (< 1,2 sn) — sınır hatası olasılığı yüksek
//   • model tekrarı işareti
//   • üst üste konuşma / anlaşılmaz gözlemi
//   • önceki bölümle çakışan zaman aralığı
function segQuickCheck(s, prev) {
  const reasons = [];
  if (isHallucination(s.text)) reasons.push('anlamlı metin yok');
  const d = segDurationSec(s);
  if (d <= 0) reasons.push('süre geçersiz');
  else if (d < 1.2) reasons.push('çok kısa bölüm');
  if (segmentRepetitionFlag(s)) reasons.push('model tekrarı');
  const o = s.obs || {};
  if (o.overlap) reasons.push('üst üste konuşma işaretli');
  if (o.inaudible) reasons.push('anlaşılmaz işaretli');
  if (prev) {
    const pb = secondsFromTimecode(prev.end);
    const pa = secondsFromTimecode(prev.start);
    if (pa < pb && secondsFromTimecode(s.start) < pb) reasons.push('öncekiyle çakışıyor');
  }
  return { ok: reasons.length === 0, reasons };
}
// HIZLI ONAYA UYGUN BÖLÜMLER — TEK KAYNAK (v2.99).
// Sayaç (`segCounts`), filtre (`segMatchesFilter`) ve toplu onay
// (`bulkApproveQuick`) AYNI listeyi kullanmalıdır. Öncesinde sayaç
// `segQuickCheck(s, prev)` (çakışma dahil) çağırırken filtre `segQuickCheck(s)`
// (prev yok) çağırıyordu: sayaç 1 derken filtre 2 listeliyor, kullanıcı
// listelediği bölümün toplu onayda atlandığını görüyordu.
// Dönüş: uygun bölümlerin DİZİ İNDEKSLERİ.
function quickApproveTargets(m) {
  const segs = (m && m.segments) || [];
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (isReviewed(s)) continue;
    if (segQuickCheck(s, segs[i - 1]).ok) out.push(i);
  }
  return out;
}
// BELİRSİZ OKUMA (v2.115). Ses duyuldu ama birden fazla okuma mümkün.
// `inaudible`'den FARKI: orada ses anlaşılmıyor; burada ses anlaşılıyor ama
// iki farklı kelime/cümle duyulabiliyor. Adli kural: belirsizlik GİZLENMEZ.
// Her iki okuma saklanır ve rapora yazılır; bilirkişi seçimini belirtir.
function ambiguousReadings(s) {
  if (!s) return [];
  return [s.reading1, s.reading2]
    .map((v) => String(v == null ? '' : v).trim())
    .filter(Boolean);
}
// Rapor hücresi: "Belirsiz: 'a' / 'b' (seçilen: a)" gibi.
// Seçim yoksa "seçilmedi" yazar — uydurma yok.
function ambiguousReportText(s) {
  const list = ambiguousReadings(s);
  if (!list.length) return 'Belirsiz okuma (okuma girilmedi)';
  const quoted = list.map((v) => `"${v}"`).join(' / ');
  const chosen = String((s && s.chosen) || '').trim();
  return `Belirsiz: ${quoted} (seçilen: ${chosen || 'seçilmedi'})`;
}
// "%100 OLMAZ" SORUSUNUN CEVABI (v2.114).
// Sayaç `isReviewed()` kullanır: yalnız `approved` ve `inaudible` sayılır.
// `relisten` (yeniden dinlenecek), `machine` (otomatik çözümlendi) ve `pending`
// KASTEN sayılmaz — bunlar kontrol edilmiş değildir. Kural doğru; eksik olan
// AÇIKLAMAYDI: kullanıcı hangi bölümlerin eksik olduğunu göremiyordu.
function pendingBreakdown(segments) {
  const segs = Array.isArray(segments) ? segments : [];
  const out = { total: 0, pending: 0, relisten: 0, machine: 0, ambiguous: 0, approved: 0, inaudible: 0 };
  for (const s of segs) {
    const r = segReview(s);
    if (r === 'approved') out.approved++;
    else if (r === 'inaudible') out.inaudible++;
    else if (r === 'relisten') {
      out.relisten++;
      out.total++;
    } else if (r === 'machine') {
      out.machine++;
      out.total++;
    } else if (r === 'ambiguous') {
      out.ambiguous++;
      out.total++;
    } else {
      out.pending++;
      out.total++;
    }
  }
  return out;
}
// Tek satırlık açıklama. Eksik yoksa BOŞ döner (gürültü yapmaz).
// Örnek: "3 bölüm eksik: 2 yeniden dinlenecek · 1 çözümlendi"
function pendingSummaryText(segments) {
  const b = pendingBreakdown(segments);
  if (!b.total) return '';
  const parts = [];
  if (b.pending) parts.push(`${b.pending} kontrol bekliyor`);
  if (b.relisten) parts.push(`${b.relisten} yeniden dinlenecek`);
  if (b.machine) parts.push(`${b.machine} çözümlendi`);
  if (b.ambiguous) parts.push(`${b.ambiguous} belirsiz okuma`);
  return `${b.total} bölüm eksik: ${parts.join(' · ')}`;
}
function segMatchesFilter(s, filter, prev, idx, issueSet) {
  const r = segReview(s);
  if (filter === 'all') return true;
  if (filter === 'pending') return !isReviewed(s);
  if (filter === 'quick') return !isReviewed(s) && segQuickCheck(s, prev).ok;
  if (filter === 'time') return !!(issueSet && issueSet.has(idx));
  return r === filter;
}
function segCounts(m) {
  const segs = m.segments || [];
  const c = { all: segs.length, pending: 0, quick: 0, approved: 0, inaudible: 0, relisten: 0, time: 0 };
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const r = segReview(s);
    if (r === 'approved') c.approved++;
    else if (r === 'inaudible') c.inaudible++;
    else if (r === 'relisten') c.relisten++;
    if (!isReviewed(s)) c.pending++;
  }
  // Hızlı onay sayısı TEK KAYNAKTAN gelir (filtre ve toplu onayla aynı).
  c.quick = quickApproveTargets(m).length;
  // Zaman sorunlu bölüm SAYISI (çakışmanın iki tarafı da sayılır).
  c.time = segmentTimeIssueIndexes(segs).size;
  return c;
}
// İnceleme önceliği: hangi bölümün önce dinlenmesi gerektiğini gösteren şeffaf
// bir işaret. Model güven skoru verilmediği için yalnızca gözlemlenebilir
// işaretlerden hesaplanır: boş/dolgu metin, çok kısa bölüm, çok uzun bölüm,
// sıfır süre, üst üste binen aralık. Gerekçe arayüzde gösterilir; uydurma bir
// "doğruluk yüzdesi" sunulmaz.
// Zaman damgasını saniyeye çevirir. Bölüm çalma ve öncelik hesabı bunu kullanır.
function secondsFromTimecode(t) {
  const p = String(t || '').split(':');
  if (p.some((x) => x !== '' && Number.isNaN(Number(x)))) return 0;
  if (p.length === 3) return Number(p[0]) * 3600 + Number(p[1]) * 60 + Number(p[2]);
  if (p.length === 2) return Number(p[0]) * 60 + Number(p[1]);
  return Number(p[0]) || 0;
}
// KATI zaman kodu çözücü (v2.97). `secondsFromTimecode` çözemezse 0 döner —
// 0 ise GEÇERLİ bir andır (kaydın başlangıcı). Bu yüzden "bozuk girdi" ile
// "gerçekten 0" ayırt edilemiyordu ve raporda sessizce `00:00:00.000` yazılıyordu.
// Bu fonksiyon geçersiz girdide `null` döner.
// Kabul edilen biçim: [S:]DD:SS[(.|,)mmm] — Türkçe ondalık virgül de geçerli.
// Sınırlar: dakika/saniye 0–59, ms en fazla 3 hane. Negatif reddedilir.
function parseTimecodeStrict(t) {
  const s = String(t == null ? '' : t).trim();
  if (!s) return null;
  // Virgül → nokta (Türkçe ondalık ayırıcı). Yalnız SON virgülü çevir.
  const norm = s.replace(/,(\d{1,3})$/, '.$1');
  const m = norm.match(/^(\d{1,3}):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/);
  if (m) {
    const ms = m[4] ? Number(`0.${m[4]}`) : 0;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + ms;
  }
  // "DD:SS[.mmm]" biçimi de kabul edilir (saatsiz).
  const m2 = norm.match(/^([0-5]?\d):([0-5]\d)(?:\.(\d{1,3}))?$/);
  if (m2) {
    const ms = m2[3] ? Number(`0.${m2[3]}`) : 0;
    return Number(m2[1]) * 60 + Number(m2[2]) + ms;
  }
  return null;
}
// Girdi alanından gelen değeri doğrular ve KANONİK biçime çevirir (v2.97).
// Dönüş: kanonik "HH:MM:SS.mmm" ya da null (reddedildi).
// `end` verilirse aralık da denetlenir: end > start olmalı.
function normalizeTimeInput(value, end) {
  const sec = parseTimecodeStrict(value);
  if (sec == null) return null;
  if (end !== undefined) {
    const endSec = parseTimecodeStrict(end);
    if (endSec == null || endSec <= sec) return null;
  }
  return timecode(sec);
}
function segDurationSec(s) {
  const a = secondsFromTimecode(s.start),
    b = secondsFromTimecode(s.end);
  return b > a ? b - a : 0;
}
function segPriority(s, prev) {
  let score = 0;
  const reasons = [];
  if (isHallucination(s.text)) {
    score += 40;
    reasons.push('anlamlı metin yok');
  }
  const d = segDurationSec(s);
  if (d === 0) {
    score += 25;
    reasons.push('süre sıfır');
  } else if (d < 1.2) {
    score += 15;
    reasons.push('çok kısa bölüm');
  }
  if (d > 60) {
    score += 10;
    reasons.push('çok uzun bölüm');
  }
  if (prev) {
    const pa = secondsFromTimecode(prev.start),
      pb = secondsFromTimecode(prev.end);
    if (pa < pb && secondsFromTimecode(s.start) < pb) {
      score += 12;
      reasons.push('öncekiyle çakışıyor');
    }
  }
  return { score, reasons };
}
function segPriorityBadge(s, prev) {
  const p = segPriority(s, prev);
  if (p.score < 15) return '';
  const label = p.score >= 40 ? 'Yüksek' : p.score >= 20 ? 'Orta' : 'Düşük';
  return `<span class="badge prio" title="${esc(p.reasons.join(', '))}">Öncelik: ${label}</span>`;
}

// ---- Liste (sol panel) ----
// BELİRSİZ OKUMA PANELİ (v2.115). Yalnız gerektiğinde görünür:
// kontrol "Belirsiz okuma" ise veya okuma girilmişse. İki okuma + seçim.
function ambiguousPanelHtml(s, i) {
  const r1 = esc(s.reading1 || '');
  const r2 = esc(s.reading2 || '');
  const chosen = String(s.chosen || '');
  const opt = (v, label) => `<option value="${esc(v)}" ${chosen === v ? 'selected' : ''}>${esc(label)}</option>`;
  return `<div class="sd-ambiguous" data-ambiguous="${i}">
    <div class="sd-amb-head"><b>Belirsiz okuma</b>
      <span class="sd-amb-note" title="Ses duyuldu ama birden fazla okuma mümkün. İki okumayı yazın; rapora belirsizlik AÇIKÇA yazılır ve seçiminiz belirtilir.">iki okuma · rapora yazılır</span></div>
    <div class="sd-amb-fields">
      <label class="sd-amb-field"><span>1. okuma</span><input data-amb="reading1" data-seg="${i}" value="${r1}" placeholder="ör. geldi"></label>
      <label class="sd-amb-field"><span>2. okuma</span><input data-amb="reading2" data-seg="${i}" value="${r2}" placeholder="ör. kaldı"></label>
      <label class="sd-amb-field"><span>Seçilen</span>
        <select data-amb="chosen" data-seg="${i}">
          ${opt('', '— seçilmedi —')}
          ${s.reading1 ? opt(s.reading1, '1. okuma') : ''}
          ${s.reading2 ? opt(s.reading2, '2. okuma') : ''}
        </select>
      </label>
    </div>
  </div>`;
}
function segItemHtml(m, s, i, prev, issue) {
  const rev = segReview(s);
  const halluc = isHallucination(s.text);
  const spkRec = s.speaker ? speakerByName(m, s.speaker) : null;
  const spk =
    s.speaker && s.speaker !== 'Belirtilmedi'
      ? `<span class="badge spk" title="Konuşmacı: ${esc(s.speaker)}">${esc(spkRec?.code ? spkRec.code : s.speaker)}</span>`
      : '';
  // KISA etiket + İPUCU (v2.106). Liste sade kalmalı: uzun açıklama rozetin
  // içine değil `title` ipucuna yazılır. `machine` = otomatik çözümlendi,
  // BİLİRKİŞİ ONAYI DEĞİL; bu yüzden "Onaylandı" değil "Çözümlendi" ve
  // farklı renk (info) kullanır. Tek kaynak: schema.js etiketleri.
  const badgeFor = {
    approved: ['done', 'Onaylandı'],
    machine: ['auto', 'Çözümlendi'],
    inaudible: ['warn', 'Anlaşılmadı'],
    relisten: ['again', 'Yeniden'],
    // BELİRSİZ OKUMA (v2.115): kısa etiket, onay yeşili DEĞİL.
    ambiguous: ['amb', 'Belirsiz']
  };
  const [bCls, bTxt] = badgeFor[rev] || ['', 'Bekliyor'];
  const state = `<span class="badge ${bCls}" title="${esc(reviewHintText(s))}">${esc(bTxt)}</span>`;
  // ZAMAN SORUNU (v2.144): çakışma/yinelenme/sıfır süre listede GÖRÜNÜR.
  const timeBadge = issue
    ? `<span class="badge warn" title="Zaman sorunu: ${esc(segmentTimeIssueLabel(issue.kind))}${
        issue.j != null && issue.j !== i ? ` (bölüm ${issue.j + 1})` : ''
      }">⚠</span>`
    : '';
  // Öneri varsa listede görünmeli; yoksa bilirkişi hangi bölümde bekleyen
  // öneri olduğunu ancak tek tek gezinerek bulabilir.
  const propBadge = s.proposal
    ? `<span class="badge prop" title="İkinci göz önerisi: ${esc((s.proposal.by || '') + ' — ' + (s.proposal.text || ''))}">Öneri</span>`
    : '';
  return `<div class="seg-item st-${rev} ${halluc ? 'is-empty' : ''} ${s.proposal ? 'has-proposal' : ''}" data-seg-item="${i}" role="button" tabindex="0">
    <span class="seg-no">${i + 1}</span>
    <span class="seg-time"><span class="seg-start">${esc(s.start || '—')}</span><span class="seg-end">→ ${esc(s.end || '—')}</span></span>
    <span class="seg-text">${esc((s.text || '').trim()) || '(metin yok)'}</span>
    <span class="seg-badges">${timeBadge}${state}${propBadge}${spk}${segPriorityBadge(s, prev)}</span>
  </div>`;
}
function segListHtml(m) {
  const segs = m.segments || [];
  if (!segs.length) return '<div class="seg-empty-note">Henüz bölüm yok. "Çözümle" veya "＋ Bölüm" ile başlayın.</div>';
  const filter = segFilter(m);
  const issues = segmentTimeIssues(segs);
  const issueSet = segmentTimeIssueIndexes(segs);
  const issueAt = new Map();
  for (const it of issues) {
    if (!issueAt.has(it.i)) issueAt.set(it.i, it);
    // Çakışmanın/yinelenmenin DİĞER tarafı da işaretlenir; yoksa filtrede
    // görünen bölüm rozetsiz kalır (v2.144).
    if (it.j != null && it.j !== it.i && !issueAt.has(it.j)) {
      issueAt.set(it.j, { ...it, i: it.j, j: it.i });
    }
  }
  // `prev` geçilir: 'quick' filtresi sayaçla AYNI ölçütü kullanmalı (v2.99).
  const rows = segs
    .map((s, i) => ({ s, i }))
    .filter((x) => segMatchesFilter(x.s, filter, segs[x.i - 1], x.i, issueSet));
  if (!rows.length) return '<div class="seg-empty-note">Bu filtreye uyan bölüm yok.</div>';
  return rows.map(({ s, i }) => segItemHtml(m, s, i, segs[i - 1], issueAt.get(i))).join('');
}
function renderSegList(m) {
  const root = $(`#seg-list-${CSS.escape(m.id)}`);
  if (!root) return;
  root.innerHTML = segListHtml(m);
}
// Metin/durum değişince yalnızca tek liste öğesini günceller; tam çizim yok.
function updateSegListItem(m, i) {
  const root = $(`#seg-list-${CSS.escape(m.id)}`);
  if (!root) return;
  const item = root.querySelector(`[data-seg-item="${i}"]`);
  if (!item) return;
  const s = m.segments[i];
  // Zaman sorunu rozeti de tazelenir (v2.146): yalnız metin değil, süre
  // düzenlemesi de satırı değiştirir. Aksi hâlde ⚠ yenilemeden görünmüyordu.
  const issue = segmentTimeIssueAt(m.segments, i);
  const tmp = document.createElement('div');
  tmp.innerHTML = segItemHtml(m, s, i, m.segments[i - 1], issue);
  const fresh = tmp.firstElementChild;
  fresh.classList.toggle('is-active', item.classList.contains('is-active'));
  item.replaceWith(fresh);
}

// ---- Detay (sağ panel) ----
// Bölümde model tekrarı (aynı ifadenin yinelenmesi) varsa gösterilir. Uydurma
// yoktur; yalnızca metindeki gerçek tekrar ölçülür.
function repetitionNoteHtml(s) {
  const f = segmentRepetitionFlag(s);
  if (!f) return '';
  const info = f.info;
  const msg =
    info.maxRun >= 3
      ? `Aynı ifade ${info.maxRun} kez arka arkaya yinelenmiş görünüyor.`
      : `Aynı ifade bölüm içinde ${info.topCount} kez geçiyor.`;
  return `<div class="halluc-note">Model tekrarı olasılığı: ${esc(msg)} Kaydı dinleyerek doğrulayın; tekrar gerçek konuşma değilse düzeltin.</div>`;
}
// Ölçülmüş sessizlik sonucunu gösteren not. Yalnızca gerçekten ölçüldüyse
// görünür; ölçüm yapılmadıysa hiçbir şey gösterilmez (uydurma yok).
function silenceNoteHtml(s, i) {
  const st = s.silence;
  // Eski şemalı (kanal 0) ölçüm gösterilmez (v2.92).
  if (!st || !st.ok || st.schema !== SILENCE_SCHEMA) return '';
  const pct = Math.round(st.ratio * 100);
  const lvl = st.ratio >= 0.8 ? 'yüksek' : st.ratio >= 0.55 ? 'orta' : 'düşük';
  const cls = st.ratio >= 0.55 ? '' : ' style="background:#f4f8fb;border-color:#d6e4f2;color:#2f6f95"';
  const hasText = !isHallucination(s.text);
  let hint = '';
  if (st.ratio >= 0.55 && !hasText)
    hint = ' Bu bölüm büyük ölçüde sessiz; metin yerine [sessizlik] etiketi uygun olabilir.';
  else if (st.ratio >= 0.55 && hasText)
    hint = ' Sessizlik oranı yüksek ama metin girilmiş; kaydı dinleyerek doğrulayın.';
  return `<div class="halluc-note"${cls}>Ölçülen sessizlik: %${pct} (${lvl}) · sessiz süre ${st.silentSec.toFixed(1)} sn / ${st.durationSec.toFixed(1)} sn.${hint}</div>`;
}
// İkinci göz öneri bandı. Kabul edilene kadar ana metin değişmez; bölüm
// "Onaylandı" sayılmaz. Bilirkişi kabul/reddeder.
function proposalBandHtml(s, i) {
  const prop = s.proposal;
  if (!prop) return '';
  return `<div class="seg-proposal" role="group" aria-label="İkinci göz önerisi">
      <div class="sp-head"><b>İkinci göz önerisi</b><small>${esc(prop.by || 'Ad belirtilmedi')}${prop.at ? ' · ' + esc(new Date(prop.at).toLocaleString('tr-TR')) : ''}</small></div>
      <div class="sp-diff">
        <div><small>Şu anki metin</small><p>${esc(s.text || '(boş)')}</p></div>
        <div><small>Önerilen</small><p>${esc(prop.text || '(boş)')}</p></div>
      </div>
      <div class="sp-actions">
        <button class="mini-button primary" data-proposal-accept="${i}">Öneriyi kabul et</button>
        <button class="mini-button" data-proposal-reject="${i}">Reddet</button>
      </div>
      <p class="sp-note">Öneri kabul edilene kadar rapora yansımaz ve bölüm onaylanmış sayılmaz.</p>
    </div>`;
}
// Bölümdeki konuşmacı seçimi. Serbest metin yerine standart liste: kod + etiket.
// Böylece aynı kişi her bölümde aynı kodla görünür ve rapor tutarlı kalır.
// Kayıtta olmayan eski bir etiket varsa kaybolmasın diye seçenek olarak eklenir.
function spkSelectOptions(m, current) {
  const list = (m.speakers || []).filter((sp) => sp.name);
  const cur = (current || '').trim();
  const known = list.some((sp) => sp.name === cur);
  const opt = (val, label, sel) => `<option value="${esc(val)}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
  const head = opt('', '— Konuşmacı seçilmedi —', !cur);
  const body = list
    .map((sp) => opt(sp.name, `${sp.code ? sp.code + ' · ' : ''}${sp.name}`, sp.name === cur))
    .join('');
  const legacy = cur && !known ? opt(cur, `${cur} (kayıtlı değil)`, true) : '';
  return head + body + legacy;
}
// OTOMATİK ÇÖZÜMLEME ÇIKTISI ile bilirkişinin metnini karşılaştırır (v2.83).
// Adli incelemede "model ne dedi" ile "bilirkişi neyi onayladı" ayrı
// belgelerdir; bu blok ikisini yan yana gösterir. Metin değişmediyse blok
// gösterilmez (gereksiz gürültü yok). Otomatik çıktı yoksa (eski kayıt veya
// elle girilmiş bölüm) hiçbir şey uydurulmaz, sessiz kalınır.
function asrCompareHtml(m, s, i) {
  const asr = (s.asrText || '').trim();
  if (!asr) return '';
  const cur = (s.text || '').trim();
  if (asr === cur) return '';
  const model = s.asrModel ? ` · ${esc(modelShortName(s.asrModel))}` : '';
  const when = s.asrAt ? ` · ${esc(new Date(s.asrAt).toLocaleString('tr-TR'))}` : '';
  return `<details class="asr-compare">
    <summary>Otomatik çözümleme çıktısı (değiştirilmedi${model}${when})</summary>
    <div class="asr-body"><p>${esc(asr)}</p>
    <p class="asr-note">Bu metin modelin ürettiği ham çıktıdır ve <b>değiştirilmez</b>. Yukarıdaki alan sizin düzeltmenizdir; rapora onayladığınız metin girer.</p></div>
  </details>`;
}
// BÖLÜM BAŞLIĞI — TEK KAYNAK (v2.148).
// NEDEN: ilk çizim "Bölüm 3 / 100" yazıyordu; yerinde güncelleme `.sd-idx`in
// textContent'ini yazıp içindeki ` / N` span'ını SİLİYORDU → oynatma başlayınca
// başlık "Bölüm 3"e düşüyordu (kullanıcı: "orada bir değişiklik oluyor").
// Artık etiket ve toplam AYRI span'lardır; ikisi de aynı fonksiyondan gelir.
function segHeadParts(i, total) {
  const n = Math.max(0, Number(i) || 0);
  const t = Math.max(0, Number(total) || 0);
  return { label: `Bölüm ${n + 1}`, of: t ? ` / ${t}` : '' };
}
function segDetailHtml(m) {
  const segs = m.segments || [];
  if (!segs.length)
    return '<div class="seg-detail-empty">Bölüm seçmek için soldan bir kayıt çözümleyin veya bölüm ekleyin.</div>';
  const i = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  const s = segs[i];
  if (!s) return '<div class="seg-detail-empty">Bölüm bulunamadı.</div>';
  const rev = segReview(s);
  const opts = Object.keys(REVIEW_STATES)
    .map((k) => `<option value="${k}" ${rev === k ? 'selected' : ''}>${REVIEW_STATES[k].label}</option>`)
    .join('');
  const hist = (s.history || []).length;
  const halluc = isHallucination(s.text);
  const pr = segPriority(s, segs[i - 1]);
  const pb = segPlayback.materialId === m.id && segPlayback.index === i ? segPlayback : null;
  const isPlaying = !!(pb && pb.playing);
  const canStop = !!pb;
  const rep = segmentRepetitionFlag(s);
  const notes = [];
  if (halluc) notes.push('anlamlı metin yok');
  if (rep) notes.push('model tekrarı olasılığı');
  if (pr.score >= 15) notes.push(`öncelik: ${pr.reasons.join(', ')}`);
  const silence = s.silence && s.silence.ok && s.silence.schema === SILENCE_SCHEMA ? `sessizlik %${Math.round(s.silence.ratio * 100)}` : '';

  const obsBtns = [
    ['noise', 'gürültü', 'Arka plan gürültüsü'],
    ['overlap', 'üst üste', 'Üst üste konuşma'],
    ['inaudible', 'anlaşılmaz', 'Anlaşılmaz bölüm'],
    ['music', 'müzik', 'Müzik/ses efekti']
  ]
    .map(
      ([k, lbl, tip]) =>
        `<button class="mini-button obs-btn ${s.obs && s.obs[k] ? 'on' : ''}" data-obs="${i}|${k}" title="${esc(tip)}">${lbl}</button>`
    )
    .join('');
  const opsBtns = [
    hist ? `<button class="mini-button tiny" data-history="${i}" title="Metin geçmişi">geçmiş (${hist})</button>` : '',
    `<button class="mini-button tiny" data-silence="${i}" title="Sessizlik oranını ölç">sessizlik ölç</button>`,
    `<button class="mini-button tiny" data-split-seg="${i}" title="Bu bölümü oynatıcının konumundan ikiye ayırır. Metin yeniden çözümlenmez; kesim noktasına göre paylaştırılır.">buradan böl</button>`,
    `<button class="mini-button tiny" data-retranscribe-seg="${i}" title="Yalnız bu bölümün zaman aralığını (başlangıç–bitiş) ses dosyasından kesip yeniden çözümler. Metin kaybolduysa geri getirir; diğer bölümlere dokunmaz.">↻ Bu aralığı çözümle</button>`,
    `<button class="mini-button tiny" data-merge-next="${i}" title="Sonrakiyle birleştir">sonrakine ekle</button>`,
    `<button class="mini-button tiny danger" data-delete-seg="${i}" title="Bölümü sil">sil</button>`
  ]
    .filter(Boolean)
    .join('');

  // YERLEŞİM (v2.62): beş bölge, hiçbiri diğerinin üstüne binmez.
  //   1. Başlık        — bölüm no + gezinme + dinle
  //   2. Öneri bandı   — varsa (ikinci göz)
  //   3. Dalga + zaman — sürüklenebilir sınırlar; elle yazmak zorunda değilsin
  //   4. Metin         — en çok yer buraya
  //   5. Onay + araçlar
  // YERLEŞİM (v2.63): İKİ SÜTUN. Sol = teknik (dalga/zaman/konuşmacı),
  // sağ = METİN (asıl iş, tam yükseklik). Alt = onay + araçlar (tam genişlik).
  // Sabit yükseklik YOK; panel ihtiyacı kadar yer alır (eski clamp taşmaya
  // yol açıyordu: içerik 642px, kap 416-562px).
  // TEK PANEL, İKİ BÖLGE (v2.154). SABİT başlıkta yalnız GÜNLÜK İŞ vardır:
  // gezinme, dinleme, onay ve teknik bölüm anahtarı. Teknik alan (dalga, zaman,
  // konuşmacı, gözlem) istenince açılır; metin alanı kalan yüksekliği alır.
  // Böylece hiçbir birincil eylem kaydırmadan erişilemez olmaz.
  const techOpen = techOpenPref();
  return `
  <div class="sd-head">
    <span class="sd-idx">${segHeadParts(i, segs.length).label}</span><span class="sd-of">${segHeadParts(i, segs.length).of}</span>
    <span class="sd-nav">
      <button class="seg-tool" data-seg-nav="prev" title="Önceki bölüm (↑)">↑</button>
      <button class="seg-tool" data-seg-nav="next" title="Sonraki bölüm (↓)">↓</button>
      <button class="seg-tool play-main ${isPlaying ? 'on' : ''}" data-play-active="1" title="Bu bölümü dinle / duraklat (Boşluk)">${isPlaying ? '⏸' : '▶'} Dinle</button>
      <button class="seg-tool" data-stop-active="1" title="Durdur ve başa dön" ${canStop ? '' : 'disabled'}>⏹</button>
    </span>
    <span class="sd-primary">
      <button class="mini-button primary" data-approve-seg="${i}" title="Onayla ve sonraki bölüme geç (Enter)">✓ Onayla →</button>
      <button class="mini-button" data-review-set="${i}|yeniden">Yeniden dinle</button>
      <button class="mini-button" data-review-set="${i}|anlasilmadi">Anlaşılmadı</button>
      <details class="sd-more"><summary title="Geçmiş, ölçüm ve bölme araçları. Günlük onay akışını kalabalıklaştırmamak için katlanmıştır.">Diğer işlemler</summary><span class="sd-ops">${opsBtns}</span></details>
    </span>
    <button class="seg-tool sd-tech-btn ${techOpen ? 'on' : ''}" data-tech-toggle="1" aria-expanded="${techOpen}" title="Dalga, zamanlar, konuşmacı ve gözlem alanlarını göster/gizle. Yazarken kapalı tutun.">Teknik ${techOpen ? '▴' : '▾'}</button>
  </div>

  ${proposalBandHtml(s, i)}

  ${
    notes.length || silence
      ? `<div class="sd-notes">${halluc ? '<span class="sn bad">anlamlı metin yok</span>' : ''}${rep ? '<span class="sn warn">model tekrarı</span>' : ''}${silence ? `<span class="sn">${esc(silence)}</span>` : ''}${pr.score >= 15 ? `<span class="sn info" title="${esc(pr.reasons.join(', '))}">öncelik ${pr.score >= 40 ? 'yüksek' : pr.score >= 20 ? 'orta' : 'düşük'}</span>` : ''}</div>`
      : ''
  }

  <div class="sd-body">
    <div class="sd-left sd-tech"${techOpen ? '' : ' hidden'}>
      <div class="sd-wave">
        <div class="sd-wave-bar">
          <span class="sd-wave-hint">Tıkla: konuma git · Sınır: sürükle · Alt+tıkla: sınır · Shift+sürükle: kaydır · Tekerlek: zoom</span>
          <span class="sd-cursor-time" data-sd-cursor>—</span>
          <div class="sd-wave-tools">
            <span class="sd-zoom" data-sd-zoom-span>±0,5 sn</span>
            <button class="seg-tool" data-sd-zoom="fit" title="Bölüme sığdır">Sığdır</button>
            <button class="seg-tool" data-loop-a title="Döngü başlangıcını (A) oynatıcının olduğu ana ayarla (kısayol: A)">A</button>
            <button class="seg-tool" data-loop-b title="Döngü bitişini (B) oynatıcının olduğu ana ayarla (kısayol: B)">B</button>
            <button class="seg-tool" data-loop-toggle title="A–B aralığını tekrar tekrar dinle (sınırları değiştirmez, kısayol: K)">🔁 Döngü</button>
            <span class="sd-loop-span" data-loop-span></span>
            <button class="seg-tool" data-sd-split title="AKTİF bölümü, imlecin olduğu yerden ikiye ayırır. Metin yeniden çözümlenmez; mevcut metin kesim noktasına göre paylaştırılır. Ctrl+Z ile geri alınabilir.">✂ Böl</button>
            <span class="sd-view-modes" role="group" aria-label="Analiz görünümü">
              <button class="seg-tool" data-analysis-mode="wave" title="Yalnız dalga: zaman, ritim, kırpılma ve sınır düzenleme">Dalga</button>
              <button class="seg-tool" data-analysis-mode="spec" data-seg-spec="${esc(m.id)}" title="Yalnız spektrogram: frekans içeriği (p/t/k, sürtünmeli sesler, gürültü)">Spek</button>
              <button class="seg-tool" data-analysis-mode="both" title="Dalga + spektrogram: aynı zaman ekseninde, katmanlı (profesyonel araçların standardı)">İkisi</button>
            </span>
          </div>
        </div>
        <!-- TEK GÖRÜNÜM ALANI (v2.121): dalga ve spektrogram AYNI kutuda geçişir.
             Böylece düğme dalga araç çubuğunda kalır ve sağ panel uzamaz. -->
        <div class="sd-canvas-wrap mode-both" id="sdwrap-${esc(m.id)}">
          <canvas class="sd-wave-canvas" id="sdwave-${esc(m.id)}" width="900" height="48" aria-label="Bölüm dalga formu — başlangıç ve bitiş sınırlarını sürükleyin"></canvas>
          <canvas class="sd-spec-canvas" id="sdspec-${esc(m.id)}" width="900" height="112" aria-label="Bölüm spektrogramı — tıkla: konuma git, sürükle: A–B seç, Alt+tıkla: sınırı taşı" hidden></canvas>
          <canvas class="sd-spec-overlay" id="sdspecov-${esc(m.id)}" aria-hidden="true" hidden></canvas>
          <span class="sd-spec-readout" id="sdspecread-${esc(m.id)}" hidden></span>
        </div>
      </div>
      <div class="sd-times">
        <label class="sd-time"><span>Başlangıç</span><input class="time-input" data-seg="${i}" data-key="start" value="${esc(s.start || '')}"></label>
        <label class="sd-time"><span>Bitiş</span><input class="time-input" data-seg="${i}" data-key="end" value="${esc(s.end || '')}"></label>
        <label class="sd-time sd-time-dur"><span>Süre</span><output class="sd-dur">${esc(fmtShort(Math.max(0, secondsFromTimecode(s.end) - secondsFromTimecode(s.start))))}</output></label>
      </div>
      <div class="sd-meta">
        <label class="sd-field"><span>Konuşmacı</span><span class="sd-spk-pick"><select data-seg="${i}" data-key="speaker" title="Konuşmacı seçimi standarttır: S1, S2… Bölümdeki konuşmacıyı listeden seçin.">${spkSelectOptions(m, s.speaker)}</select><button class="seg-tool" data-add-spk="${esc(m.id)}" title="Yeni konuşmacı ekle (sıradaki standart kod verilir)">＋</button></span></label>
        <label class="sd-field"><span>Kontrol</span><select data-seg="${i}" data-key="review" data-state="${rev}">${opts}</select></label>
        ${rev === 'ambiguous' || s.reading1 || s.reading2 ? ambiguousPanelHtml(s, i) : ''}
        <span class="sd-field sd-profile" title="${esc(
          'Bu kaydın çözümlenmesinde kullanılan profil. Profil yalnız dil ipucu ve bağlam istemini değiştirir; ' +
            'şive tanıma veya kaynak ayrıştırma YAPMAZ, rapora yazılmaz. ' +
            'Bir sonraki çözümleme, Ayarlar\'daki güncel profili kullanır.'
        )}"><span>Profil</span><b>${esc(m.transcribedWithProfile ? profileRunLabel(m.transcribedWithProfile) : 'Henüz çözümlenmedi')}</b></span>
      </div>
      <div class="sd-obs">${obsBtns}</div>
    </div>
    <div class="sd-right">
      ${'' /* karaoke kutusu kaldırıldı (v2.119): tek görsel alan .sd-follow */}
      <div class="sd-text">
        ${asrCompareHtml(m, s, i)}
        <textarea data-seg="${i}" data-key="text" placeholder="${isSecondEyesEditor() ? 'Düzeltmenizi yazın — öneri olarak kaydedilir, ana metne girmez.' : 'Kaydı dinleyerek metni doğrulayın ve düzeltin.'}">${esc(isSecondEyesEditor() && s.proposal ? s.proposal.text : s.text || '')}</textarea>
        <div class="quick-insert" role="group" aria-label="Hızlı metin ekle">
          ${QUICK_TAGS.map((t) => `<button class="quick-tag" data-quick-tag="${i}|${esc(t.text)}" title="${esc(t.hint)}">${esc(t.label)}</button>`).join('')}
          <button class="quick-tag quick-tag-clear" data-quick-clear="${i}" title="Metni temizle">Temizle</button>
        </div>
      </div>
    </div>
  </div>
  `;
}
// Öneri bandını, panelin geri kalanına dokunmadan yerinde tazeler. Yazarken
// her tuş vuruşunda çağrılır; bu yüzden textarea odağı ve imleç korunmalı.
function refreshProposalBand(m, idx) {
  const root = $(`#seg-detail-${CSS.escape(m.id)}`);
  if (!root) return;
  const s = (m.segments || [])[idx];
  if (!s) return;
  const old = root.querySelector('.seg-proposal');
  if (!s.proposal) {
    if (old) old.remove();
    return;
  }
  const html = proposalBandHtml(s, idx);
  if (old) old.outerHTML = html;
  else root.insertAdjacentHTML('afterbegin', html);
}
// Bölüm dalgası: başlangıç/bitiş sınırlarını SÜRÜKLEYEREK ayarla.
// Elle saat yazmak zorunda kalmak, deşifrede en çok zaman kaybettiren şeydi.
// Davranış:
//   • Sınıra yakın tıkla/sürükle → o sınırı taşı
//   • Ortaya tıkla → en yakın sınıra at (hangisi yakınsa)
//   • Tekerlek → imlecin altındaki an sabit kalacak şekilde yakınlaştır
//   • Sınır dışı hafif karartılır; konum çizgisi canlı güncellenir
// BÖLÜM SPEKTROGRAMI (v2.115). Dalga zaman/ritim içindir; spektrogram
// frekans içeriğini gösterir. Patlamalı sessizler (p/t/k), sürtünmeli sesler
// (s/ş/f) ve gürültü içinde konuşma spektrogramda daha okunur. Bu yüzden
// İKİSİ BİRLİKTE sunulur (biri diğerinin yerine geçmez).
// SPEKTROGRAM ETKİLEŞİMİ (v2.126) — saf yardımcılar.
// x: tuval solundan uzaklık (CSS px), width: görünen genişlik.
function specTimeAt(x, width, start, end) {
  const w = Number(width) || 1;
  const ratio = Math.max(0, Math.min(1, (Number(x) || 0) / w));
  const a = Number(start) || 0;
  const b = Number(end) || 0;
  return a + ratio * Math.max(0, b - a);
}
// y: tuval üstünden uzaklık. Çizim log ölçeklidir: 20 Hz (alt) … min(8k, Nyquist).
function specHzAt(y, height, sampleRate) {
  const h = Number(height) || 1;
  const frac = 1 - Math.max(0, Math.min(1, (Number(y) || 0) / h));
  const nyq = (Number(sampleRate) || 0) / 2;
  const fMax = Math.min(8000, nyq || 8000);
  return 20 * Math.pow(fMax / 20, frac);
}
// Alt+tıkla: t'ye en yakın bölüm sınırı.
function specNearestBoundary(t, start, end) {
  return Math.abs(t - start) <= Math.abs(t - end) ? 'start' : 'end';
}

// ---- ANALİZ GÖRÜNÜMÜ (v2.128) -------------------------------------------
// Profesyonel araçlarda (Praat, Audacity, RX) dalga ve spektrogram AYNI zaman
// ekseninde, AYNI kutuda katmanlanır. Kutu yüksekliği SABİTTİR; mod değişince
// yerleşim zıplamaz. Çizgiler (sınır, oynatma, A–B, imleç) en üst katmandadır.
const ANALYSIS_MODES = ['wave', 'spec', 'both'];
const ANALYSIS_PANE_H = 160;
const ANALYSIS_MODE_KEY = 'akis.analysisMode';
function normalizeAnalysisMode(v) {
  return ANALYSIS_MODES.includes(v) ? v : 'both';
}
// Mod → katman yükseklikleri (px). wave+spec = pane; specTop = wave.
function analysisLayout(mode) {
  const m = normalizeAnalysisMode(mode);
  if (m === 'wave') return { mode: m, pane: ANALYSIS_PANE_H, wave: ANALYSIS_PANE_H, spec: 0, specTop: 0 };
  if (m === 'spec') return { mode: m, pane: ANALYSIS_PANE_H, wave: 0, spec: ANALYSIS_PANE_H, specTop: 0 };
  return { mode: m, pane: ANALYSIS_PANE_H, wave: 48, spec: 112, specTop: 48 };
}
// ORTAK GÖRÜNÜR PENCERE: dalga ve spektrogram aynı [a,b] aralığını çizer.
// Bölüm ±0,5 sn (kayıt sınırlarına kırpılır); zoom varsa o pencere.
function analysisView(m, index) {
  const s = (m && m.segments && m.segments[index]) || null;
  if (!s) return null;
  if (m.__sdZoom && m.__sdZoom.materialId === m.id && m.__sdZoom.index === index) {
    return { a: m.__sdZoom.a, b: m.__sdZoom.b };
  }
  const dur = Number(m.duration) || 0;
  const a0 = Math.max(0, secondsFromTimecode(s.start) - 0.5);
  const b0 = Math.min(dur || secondsFromTimecode(s.end) + 0.5, secondsFromTimecode(s.end) + 0.5);
  const v = { materialId: m.id, index, a: a0, b: Math.max(a0 + 0.05, b0) };
  m.__sdZoom = v;
  return v;
}
// Zoom: dalga ve spektrogram AYNI pencereyi kullanır; ikisi birlikte güncellenir.
function zoomAnalysisAt(m, index, ratio, factor) {
  const v = analysisView(m, index);
  if (!v) return;
  const dur = Number(m.duration) || 0;
  const t = v.a + Math.max(0, Math.min(1, ratio)) * (v.b - v.a);
  const span = Math.max(0.05, Math.min(dur || 3600, (v.b - v.a) * factor));
  let a = t - Math.max(0, Math.min(1, ratio)) * span;
  let b = a + span;
  if (a < 0) {
    a = 0;
    b = span;
  }
  if (dur && b > dur) {
    b = dur;
    a = Math.max(0, dur - span);
  }
  m.__sdZoom = { materialId: m.id, index, a, b };
  refreshSegWave(m, index);
  scheduleSpecRefresh(m, index);
}
let analysisMode = (() => {
  try {
    return normalizeAnalysisMode(localStorage.getItem(ANALYSIS_MODE_KEY));
  } catch (e) {
    return 'both';
  }
})();

function fitCanvas(cv) {
  if (!cv) return null;
  const r = cv.getBoundingClientRect();
  const w = Math.max(200, Math.round(r.width || 0));
  const h = Math.max(40, Math.round(r.height || 0));
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
  return { w, h };
}

function setAnalysisMode(m, mode) {
  const next = normalizeAnalysisMode(mode);
  analysisMode = next;
  try {
    localStorage.setItem(ANALYSIS_MODE_KEY, next);
  } catch (e) {}
  const wrap = $(`#sdwrap-${CSS.escape(m.id)}`);
  if (!wrap) return;
  wrap.classList.remove('mode-wave', 'mode-spec', 'mode-both');
  wrap.classList.add(`mode-${next}`);
  const L = analysisLayout(next);
  const wave = wrap.querySelector('.sd-wave-canvas');
  const spec = wrap.querySelector('.sd-spec-canvas');
  const overlay = wrap.querySelector('.sd-spec-overlay');
  const readout = wrap.querySelector('.sd-spec-readout');
  if (wave) wave.hidden = L.wave === 0;
  if (spec) spec.hidden = L.spec === 0;
  if (overlay) overlay.hidden = L.spec === 0;
  if (readout) {
    readout.hidden = true;
    readout.textContent = '';
  }
  document.querySelectorAll('[data-analysis-mode]').forEach((b) => {
    b.classList.toggle('on', b.dataset.analysisMode === next);
  });
  const idx = activeSegIndex(m);
  if (L.wave) {
    fitCanvas(wave);
    refreshSegWave(m, idx);
  }
  if (L.spec) refreshSegmentSpectrogram(m, idx, { force: true }).catch(() => {});
}

// Zoom/kaydırma sonrası spektrogramı yeniden hesapla (kısa gecikmeyle).
function scheduleSpecRefresh(m, index) {
  if (analysisMode === 'wave') return;
  clearTimeout(m.__specTimer);
  m.__specTimer = setTimeout(() => {
    refreshSegmentSpectrogram(m, index, { force: true }).catch(() => {});
  }, 250);
}

// KAPLAMA KATMANI: sınırlar, oynatma, A–B, imleç. Spektrogramın ÜSTÜNDE.
function paintSpecOverlay(m, index, ev) {
  const canvas = $(`#sdspec-${CSS.escape(m.id)}`);
  const overlay = $(`#sdspecov-${CSS.escape(m.id)}`);
  const readout = $(`#sdspecread-${CSS.escape(m.id)}`);
  if (!canvas || !overlay || canvas.hidden) return;
  const ctx = overlay.getContext('2d');
  const w = overlay.width;
  const h = overlay.height;
  ctx.clearRect(0, 0, w, h);
  const v = canvas.__specView || analysisView(m, index);
  if (!v) return;
  const span = Math.max(0.001, v.b - v.a);
  const xOf = (t) => ((t - v.a) / span) * w;
  const L = loopRange(m);
  if (L) {
    const xa = Math.max(0, Math.min(w, xOf(L.a)));
    const xb = Math.max(0, Math.min(w, xOf(L.b)));
    if (xb > xa) {
      ctx.fillStyle = L.on ? 'rgba(184,134,69,.22)' : 'rgba(184,134,69,.10)';
      ctx.fillRect(xa, 0, xb - xa, h);
      ctx.fillStyle = 'rgba(230,190,120,.95)';
      ctx.fillRect(xa, 0, 1, h);
      ctx.fillRect(xb - 1, 0, 1, h);
    }
  }
  const s = (m.segments || [])[index] || {};
  const st = secondsFromTimecode(s.start);
  const en = secondsFromTimecode(s.end);
  if (Number.isFinite(st)) {
    ctx.fillStyle = 'rgba(44,128,98,.95)';
    ctx.fillRect(xOf(st) - 1, 0, 3, h);
  }
  if (Number.isFinite(en)) {
    ctx.fillStyle = 'rgba(138,99,32,.95)';
    ctx.fillRect(xOf(en) - 1, 0, 3, h);
  }
  const p = canvas.closest('.audio-card')?.querySelector('audio') || document.querySelector('audio');
  if (p && Number.isFinite(p.currentTime) && p.currentTime >= v.a && p.currentTime <= v.b) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(xOf(p.currentTime), 0, 1, h);
  }
  if (!ev) {
    if (readout) readout.hidden = true;
    return;
  }
  const r = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
  const y = Math.max(0, Math.min(r.height, ev.clientY - r.top));
  const sx = w / Math.max(1, r.width);
  const sy = h / Math.max(1, r.height);
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x * sx, 0);
  ctx.lineTo(x * sx, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y * sy);
  ctx.lineTo(w, y * sy);
  ctx.stroke();
  if (readout) {
    const t = specTimeAt(x, r.width, v.a, v.b);
    const hz = specHzAt(y, r.height, canvas.__specSampleRate || 48000);
    const hzText = hz >= 1000 ? `${(hz / 1000).toFixed(1).replace('.', ',')} kHz` : `${Math.round(hz)} Hz`;
    readout.textContent = `${timecode(t)} · ${hzText}`;
    readout.hidden = false;
  }
}

// Spektrogramı ORTAK GÖRÜNÜR PENCERE için hesapla ve çiz. Mod 'wave' ise atla.
async function refreshSegmentSpectrogram(m, index, opts = {}) {
  if (analysisMode === 'wave' && !opts.force) return;
  const canvas = $(`#sdspec-${CSS.escape(m.id)}`);
  const overlay = $(`#sdspecov-${CSS.escape(m.id)}`);
  const readout = $(`#sdspecread-${CSS.escape(m.id)}`);
  const s = (m.segments || [])[index];
  if (!canvas || !s) return;
  const v = analysisView(m, index);
  if (!v) return;
  const a = v.a;
  const b = v.b;
  if (!(Number.isFinite(a) && Number.isFinite(b) && b > a)) return;
  const c = currentCase();
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası bulunamadı; spektrogram çizilemedi.');
    return;
  }
  const fit = fitCanvas(canvas);
  if (!fit) return;
  if (overlay) {
    overlay.width = canvas.width;
    overlay.height = canvas.height;
  }
  if (readout) {
    readout.hidden = true;
    readout.textContent = '';
  }
  const seq = (m.__specSeq = (m.__specSeq || 0) + 1);
  const spec = await computeSpectrogram(blob, Math.max(400, Math.min(1200, canvas.width)), 512, { startSec: a, endSec: b });
  if (seq !== m.__specSeq) return; // daha yeni bir istek var
  if (!spec) {
    showToast('Spektrogram hesaplanamadı (ses çözülemedi).');
    return;
  }
  drawSegmentSpectrogram(canvas, spec);
  canvas.__specSampleRate = spec.sampleRate;
  canvas.__specView = { a, b };
  attachSegmentSpectrogram(m, index);
  paintSpecOverlay(m, index, null);
  if (!m.spectrogramReviewed) {
    m.spectrogramReviewed = { at: new Date().toISOString() };
    logEvent(m, 'Spektrogram incelendi', `Bölüm ${index + 1}: ${s.start}–${s.end}`);
    persist();
    renderOverview();
  }
}

// Spektrogram üzerinde analiz: tıkla = konuma git · sürükle = A–B seç ·
// Alt+tıkla = en yakın sınırı taşı · fare = zaman/frekans okuması.
// Çizim her harekette YENİDEN YAPILMAZ; imleç/A–B ayrı bir katmanda çizilir.
function attachSegmentSpectrogram(m, index) {
  const canvas = $(`#sdspec-${CSS.escape(m.id)}`);
  const overlay = $(`#sdspecov-${CSS.escape(m.id)}`);
  if (!canvas || !overlay) return;
  canvas.__specIndex = index;
  if (canvas.__specBound) return;
  canvas.__specBound = true;
  let drag = null;
  let pan = null;
  const seg = () => (m.segments || [])[Number.isInteger(m.activeSeg) ? m.activeSeg : 0];
  const player = () => canvas.closest('.audio-card')?.querySelector('audio') || document.querySelector('audio');
  const view = () => canvas.__specView || analysisView(m, index);
  const timeAt = (ev) => {
    const r = canvas.getBoundingClientRect();
    const v = view();
    return specTimeAt(ev.clientX - r.left, r.width, v.a, v.b);
  };
  canvas.addEventListener('pointermove', (ev) => {
    if (pan) {
      const r = canvas.getBoundingClientRect();
      const span = pan.b - pan.a;
      const dt = ((pan.x - ev.clientX) / Math.max(1, r.width)) * span;
      const dur = Number(m.duration) || 0;
      let a = pan.a + dt;
      let b = pan.b + dt;
      if (a < 0) {
        b -= a;
        a = 0;
      }
      if (dur && b > dur) {
        a -= b - dur;
        b = dur;
      }
      m.__sdZoom = { materialId: m.id, index, a: Math.max(0, a), b: Math.min(dur || b, b) };
      refreshSegWave(m, index);
      scheduleSpecRefresh(m, index);
      return;
    }
    if (!drag) paintSpecOverlay(m, index, ev);
  });
  canvas.addEventListener('pointerleave', () => {
    if (!drag) paintSpecOverlay(m, index, null);
  });
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    if (ev.shiftKey) {
      const v = view();
      pan = { x: ev.clientX, a: v.a, b: v.b };
      canvas.setPointerCapture?.(ev.pointerId);
      return;
    }
    const t = timeAt(ev);
    const s0 = seg() || {};
    const st = secondsFromTimecode(s0.start);
    const en = secondsFromTimecode(s0.end);
    if (ev.altKey) {
      const field = specNearestBoundary(t, st, en);
      const other = field === 'start' ? en : st;
      if (field === 'start' && t >= other - 0.1) return;
      if (field === 'end' && t <= other + 0.1) return;
      s0[field] = timecode(t);
      persist();
      const root = $(`#seg-detail-${CSS.escape(m.id)}`);
      const inp = root?.querySelector(`[data-seg="${index}"][data-key="${field}"]`);
      if (inp) inp.value = s0[field];
      updateSegListItem(m, index);
      showToast(`${field === 'start' ? 'Başlangıç' : 'Bitiş'}: ${s0[field]}`);
      m.__sdZoom = null; // sınır değişti: görünür pencere yeniden hesaplanır
      refreshSegmentSpectrogram(m, index, { force: true }).catch(() => {});
      return;
    }
    drag = { start: t, moved: false };
    canvas.setPointerCapture?.(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const t = timeAt(ev);
    if (Math.abs(t - drag.start) > 0.03) drag.moved = true;
    if (drag.moved) {
      setLoopPoint(m, 'a', Math.min(drag.start, t));
      setLoopPoint(m, 'b', Math.max(drag.start, t));
      paintSpecOverlay(m, index, ev);
    }
  });
  const endDrag = (ev) => {
    if (pan) {
      pan = null;
      return;
    }
    if (!drag) return;
    const moved = drag.moved;
    const startT = drag.start;
    drag = null;
    if (!moved) {
      const p = player();
      if (p) {
        try {
          p.currentTime = startT;
        } catch (e) {}
      }
      showToast(`Konum: ${timecode(startT)}`);
      paintSpecOverlay(m, index, null);
      return;
    }
    const L = loopRange(m);
    if (L) {
      L.on = true;
      paintLoopIndicators(m);
      showToast(`A–B döngüsü açık: ${loopLabel(m)} (K ile kapat)`);
    }
    paintSpecOverlay(m, index, ev);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const r = canvas.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width)));
      zoomAnalysisAt(m, index, ratio, ev.deltaY < 0 ? 0.8 : 1.25);
    },
    { passive: false }
  );
}

// Bölüm spektrogramı: yalnız görüntü (sınır çizgisi yok, eksen etiketi var).
function drawSegmentSpectrogram(canvas, spec) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b1a2e';
  ctx.fillRect(0, 0, w, h);
  const { cols, bins, data, minDb, maxDb } = spec;
  const range = maxDb - minDb || 1;
  const nyq = spec.sampleRate / 2;
  const fMax = Math.min(8000, nyq);
  for (let y = 0; y < h; y++) {
    const frac = 1 - y / h;
    const f = 20 * Math.pow(fMax / 20, frac);
    const bin = Math.max(0, Math.min(bins - 1, Math.round((f / nyq) * bins)));
    for (let x = 0; x < w; x++) {
      const col = Math.min(cols - 1, Math.floor((x / w) * cols));
      ctx.fillStyle = specColor((data[col * bins + bin] - minDb) / range);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Eksen etiketleri (okunur, küçük)
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '9px Segoe UI';
  ctx.fillText('8k', 3, 10);
  ctx.fillText('1k', 3, h * 0.62);
  ctx.fillText('20', 3, h - 3);
}
function attachSegWave(m, index) {
  const canvas = $(`#sdwave-${CSS.escape(m.id)}`);
  if (!canvas) return;
  // Takip modunda panel yeniden çizilmez; yalnız alanlar yerinde yazılır. Bu
  // yüzden dalga, bölümü KAPALI değişkenle tutmamalı: aksi hâlde takip
  // ilerledikçe sınır sürükleme eski bölümü düzenler ve "bölme çizgileri
  // bozuldu" hatası doğar. Bölüm her erişimde aktif bölümden okunur.
  let s = (m.segments || [])[index];
  let index2 = index;
  const activeIdx = () => (Number.isInteger(m.activeSeg) ? m.activeSeg : 0);
  const rebind = () => {
    index2 = activeIdx();
    s = (m.segments || [])[index2];
  };
  m.__segWaveRebind = rebind;
  if (!s) return;
  const dur = Number(m.duration) || 0;
  const card = canvas.closest('.audio-card');
  const player = card?.querySelector('audio');

  // Görünüm penceresi: dalga ve spektrogram AYNI aralığı kullanır (v2.128).
  const view = () => analysisView(m, index2);

  const draw = () => {
    rebind();
    if (!s) return;
    fitCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const w = canvas.width,
      h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fbfcfd';
    ctx.fillRect(0, 0, w, h);
    const peaks = peakCache.get(m.id);
    const st = secondsFromTimecode(s.start);
    const en = secondsFromTimecode(s.end);
    const v = view();
    const span = Math.max(0.02, v.b - v.a);
    const mid = h / 2;
    const xs = (t) => Math.floor(((t - v.a) / span) * w);

    // Dalga çubukları
    if (peaks && dur > 0) {
      ctx.fillStyle = '#4a7bab';
      for (let x = 0; x < w; x++) {
        const t = v.a + (x / w) * span;
        const p = peaks[Math.floor((t / dur) * peaks.length)] || 0;
        const bar = Math.max(1, p * mid * 0.86);
        ctx.fillRect(x, mid - bar, 1, bar * 2);
      }
    } else {
      ctx.fillStyle = '#e6ecf2';
      ctx.fillRect(0, mid - 1, w, 2);
    }

    // Bölüm dışı karartma
    if (st > v.a) {
      ctx.fillStyle = 'rgba(20,44,77,0.07)';
      ctx.fillRect(0, 0, Math.max(0, xs(st)), h);
    }
    if (en < v.b) {
      const x1 = Math.max(0, xs(en));
      ctx.fillStyle = 'rgba(20,44,77,0.07)';
      ctx.fillRect(x1, 0, w - x1, h);
    }

    // Sınır çizgileri: kalın, tutamaçlı
    const drawEdge = (t, color, label) => {
      const x = xs(t);
      if (x < -4 || x > w + 4) return;
      ctx.fillStyle = color;
      ctx.fillRect(x - 1, 0, 3, h);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, 11);
      ctx.textAlign = 'left';
    };
    drawEdge(st, '#2c8062', 'B');
    drawEdge(en, '#8a6320', 'S');

    // Oynatma konumu
    if (player && Number.isFinite(player.currentTime) && player.currentTime >= v.a && player.currentTime <= v.b) {
      const x = xs(player.currentTime);
      ctx.fillStyle = 'rgba(29,74,120,0.75)';
      ctx.fillRect(x, 0, 1, h);
    }

    // A–B döngü aralığı: yalnız görsel işaret; bölüm sınırlarına dokunmaz.
    const L = loopRange(m);
    if (L) {
      const xa = Math.max(0, xs(L.a)),
        xb = Math.min(w, xs(L.b));
      if (xb > xa) {
        ctx.fillStyle = L.on ? 'rgba(184,134,69,0.16)' : 'rgba(184,134,69,0.07)';
        ctx.fillRect(xa, 0, xb - xa, h);
        ctx.strokeStyle = L.on ? 'rgba(184,134,69,0.9)' : 'rgba(184,134,69,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xa, 0);
        ctx.lineTo(xa, h);
        ctx.moveTo(xb, 0);
        ctx.lineTo(xb, h);
        ctx.stroke();
      }
    }

    const zs = canvas.closest('.sd-wave')?.querySelector('[data-sd-zoom-span]');
    if (zs) zs.textContent = `±${((v.b - v.a) / 2).toFixed(1).replace('.', ',')} sn`;
    // Döngü etiketi ve düğme durumu her çizimde tazelenir.
    const w2 = canvas.closest('.sd-wave');
    const lsp = w2?.querySelector('[data-loop-span]');
    if (lsp) lsp.textContent = loopLabel(m);
    const ltg = w2?.querySelector('[data-loop-toggle]');
    if (ltg) ltg.classList.toggle('on', !!(loopRange(m) || {}).on);
  };

  const hitTime = (ev) => {
    const r = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    const v = view();
    return { t: v.a + ratio * (v.b - v.a), ratio };
  };
  const nearEdge = (t) => {
    const v = view();
    const tol = (v.b - v.a) * 0.045;
    const st = secondsFromTimecode(s.start),
      en = secondsFromTimecode(s.end);
    if (Math.abs(t - st) <= tol) return 'start';
    if (Math.abs(t - en) <= tol) return 'end';
    return null;
  };

  const syncFields = () => {
    const root = $(`#seg-detail-${CSS.escape(m.id)}`);
    if (!root) return;
    const a = root.querySelector(`[data-seg="${index2}"][data-key="start"]`);
    const b = root.querySelector(`[data-seg="${index2}"][data-key="end"]`);
    if (a) a.value = s.start || '';
    if (b) b.value = s.end || '';
    const d = root.querySelector('.sd-dur');
    if (d) d.textContent = fmtShort(Math.max(0, secondsFromTimecode(s.end) - secondsFromTimecode(s.start)));
  };

  const commit = (field) => {
    persist();
    syncFields();
    updateSegListItem(m, index2);
    draw();
  };

  let drag = null;
  // Shift + sürükle = KAYDIR (pan). Tekerlek zoom, düz sürükle sınır taşır;
  // üçü ayrı işlevdir ve birbirine karışmaz.
  let pan = null;
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.shiftKey || ev.button === 1) {
      ev.preventDefault();
      const v = view();
      pan = { x: ev.clientX, a: v.a, b: v.b };
      canvas.setPointerCapture?.(ev.pointerId);
      canvas.style.cursor = 'grabbing';
      return;
    }
    ev.preventDefault();
    const { t } = hitTime(ev);
    const edge = nearEdge(t);
    if (edge) {
      drag = edge;
      canvas.setPointerCapture?.(ev.pointerId);
      canvas.style.cursor = 'ew-resize';
      return;
    }
    // Ortaya tıklandı: KONUMA GİT, sınırı TAŞIMA.
    // v2.77 ve öncesinde ortaya tıklamak "en yakın sınırı" sessizce taşıyordu;
    // uzman bir yeri dinlemek için tıkladığında bölüm sınırı bozuluyor, sonra
    // elle düzeltmesi gerekiyordu (kullanıcı bildirimi: "dinlerken bölme
    // çizgileri bozuluyor"). Artık sınırı taşımanın iki açık yolu var:
    // sınırı sürüklemek, ya da Alt+tıkla ile en yakın sınırı taşımak.
    const st = secondsFromTimecode(s.start),
      en = secondsFromTimecode(s.end);
    if (ev.altKey) {
      const field = Math.abs(t - st) <= Math.abs(t - en) ? 'start' : 'end';
      const other = field === 'start' ? en : st;
      // Sınırlar çakışmasın (en az 0,1 sn aralık).
      if (field === 'start' && t >= other - 0.1) return;
      if (field === 'end' && t <= other + 0.1) return;
      s[field] = timecode(t);
      commit(field);
      showToast(`${field === 'start' ? 'Başlangıç' : 'Bitiş'}: ${s[field]}`);
      return;
    }
    if (player) {
      try {
        player.currentTime = t;
      } catch (e) {}
      draw();
      showToast(`Konum: ${timecode(t)} — sınırı taşımak için sınırı sürükleyin veya Alt+tıklayın.`);
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (pan) {
      const rect = canvas.getBoundingClientRect();
      const span = pan.b - pan.a;
      const dt = ((pan.x - ev.clientX) / rect.width) * span;
      let a = pan.a + dt,
        b = pan.b + dt;
      if (dur) {
        if (a < 0) {
          b -= a;
          a = 0;
        }
        if (b > dur) {
          a -= b - dur;
          b = dur;
        }
      }
      const v = view();
      v.a = Math.max(0, a);
      v.b = Math.min(dur || b, b);
      draw();
      scheduleSpecRefresh(m, index2);
      return;
    }
    const { t } = hitTime(ev);
    if (drag) {
      const other = drag === 'start' ? secondsFromTimecode(s.end) : secondsFromTimecode(s.start);
      const ok = drag === 'start' ? t <= other - 0.1 : t >= other + 0.1;
      if (ok) {
        s[drag] = timecode(Math.max(0, Math.min(dur || t, t)));
        syncFields();
        draw();
      }
      return;
    }
    canvas.style.cursor = nearEdge(t) ? 'ew-resize' : 'crosshair';
  });
  const endDrag = () => {
    if (pan) {
      pan = null;
      canvas.style.cursor = 'crosshair';
      return;
    }
    if (!drag) return;
    const f = drag;
    drag = null;
    canvas.style.cursor = 'crosshair';
    commit(f);
    showToast(`${f === 'start' ? 'Başlangıç' : 'Bitiş'}: ${s[f]}`);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const { ratio } = hitTime(ev);
      zoomAnalysisAt(m, index2, ratio, ev.deltaY < 0 ? 0.8 : 1.25);
    },
    { passive: false }
  );
  const fit = () => {
    m.__sdZoom = null;
    draw();
    scheduleSpecRefresh(m, index2);
  };
  const waveWrap = canvas.closest('.sd-wave');
  waveWrap?.querySelector('[data-sd-zoom="fit"]')?.addEventListener('click', fit);

  // İmleç zamanı: fare dalga üzerindeyken konumu göster. Kullanıcı nereyi
  // böleceğini görsün; "ortayı böldü" hissi biter.
  const cursorEl = waveWrap?.querySelector('[data-sd-cursor]');
  let cursorT = null;
  canvas.addEventListener('pointermove', (ev) => {
    const { t } = hitTime(ev);
    cursorT = t;
    if (cursorEl) cursorEl.textContent = timecode(t);
  });
  canvas.addEventListener('pointerleave', () => {
    cursorT = null;
    if (cursorEl) cursorEl.textContent = '—';
  });

  // ✂ Böl: imlecin olduğu yerden (yoksa oynatıcı konumundan) böler.
  // Böylece kullanıcı TAM noktayı seçer; oynatıcıyı ortalamak gerekmez.
  waveWrap?.querySelector('[data-sd-split]')?.addEventListener('click', () => {
    const st = secondsFromTimecode(s.start);
    const en = secondsFromTimecode(s.end);
    const target = cursorT != null ? cursorT : player && Number.isFinite(player.currentTime) ? player.currentTime : null;
    if (target == null) {
      showToast('Bölmek için dalga üzerinde bir noktaya tıklayın.');
      return;
    }
    if (!(target > st + 0.05 && target < en - 0.05)) {
      showToast('Bölme noktası bölümün içinde olmalı.');
      return;
    }
    splitSegmentAt(m, index2, target);
  });

  // A–B döngüsü: sınırları DEĞİŞTİRMEZ. Uzman anlamadığı aralığı tekrar tekrar
  // dinler. A/B imlecin (yoksa oynatıcının) bulunduğu ana ayarlanır.
  const loopAt = () => (cursorT != null ? cursorT : player && Number.isFinite(player.currentTime) ? player.currentTime : null);
  const paintLoop = () => {
    const sp = waveWrap?.querySelector('[data-loop-span]');
    if (sp) sp.textContent = loopLabel(m);
    const tg = waveWrap?.querySelector('[data-loop-toggle]');
    const L = loopRange(m);
    if (tg) tg.classList.toggle('on', !!(L && L.on));
  };
  waveWrap?.querySelector('[data-loop-a]')?.addEventListener('click', () => {
    const t = loopAt();
    if (t == null) return showToast('A için dalgada bir noktaya tıklayın.');
    setLoopPoint(m, 'a', t);
    paintLoop();
    draw();
    paintLoopIndicators(m);
    showToast(`A: ${timecode(t)}`);
  });
  waveWrap?.querySelector('[data-loop-b]')?.addEventListener('click', () => {
    const t = loopAt();
    if (t == null) return showToast('B için dalgada bir noktaya tıklayın.');
    setLoopPoint(m, 'b', t);
    paintLoop();
    draw();
    paintLoopIndicators(m);
    showToast(`B: ${timecode(t)}`);
  });
  waveWrap?.querySelector('[data-loop-toggle]')?.addEventListener('click', () => {
    toggleLoop(m, player, index2);
    paintLoop();
    draw();
  });
  if (player) {
    const ph = () => draw();
    player.addEventListener('timeupdate', ph);
    player.addEventListener('seeked', ph);
  }
  // Takip modunda panel yeniden çizilmez; bölüm değişince dalganın yeni bölüme
  // geçmesi için yeniden çizim dışarıdan çağrılabilir olmalı.
  m.__segWaveRedraw = draw;
  draw();
}
// DÖNGÜ GÖSTERGESİ — TEK KAYNAK (v2.112).
// NEDEN: v2.111'de etiket ve düğme durumu yalnız `draw()` içinde tazeleniyordu.
// Klavyeden A/B/K basıldığında dalga yeniden çizilmezse (veya `__segWaveRedraw`
// bağlı değilse) kullanıcı hiçbir geri bildirim görmüyordu — "tuşlar çalışmıyor"
// izlenimi. Artık gösterge ayrı ve doğrudan DOM'dan tazelenir.
function paintLoopIndicators(m) {
  if (!m) return;
  const id = CSS.escape(m.id);
  const root = document.getElementById(`seg-detail-${id}`) || document;
  const spans = root.querySelectorAll('[data-loop-span]');
  const label = loopLabel(m);
  const isOn = !!(loopRange(m) || {}).on;
  spans.forEach((el) => {
    el.textContent = label;
    el.classList.toggle('on', isOn);
  });
  root.querySelectorAll('[data-loop-toggle]').forEach((el) => el.classList.toggle('on', isOn));
}
function refreshSegWave(m, idx) {
  m.__segWaveRebind?.();
  m.__segWaveRedraw?.();
  paintLoopIndicators(m);
}
// Toplu onay düğmesi. Yalnız "hızlı onaya uygun" bölümleri onaylar; uygun
// olmayanlara DOKUNMAZ. Onay yetkisi kuralı korunur: ikinci göz bu düğmeyi
// görmez (onaylayamaz). Uzman onaylar; sorumluluk uygulamada değildir.
function quickBulkBtn(counts, secondEyes) {
  if (secondEyes) return '';
  const n = counts.quick || 0;
  if (!n) return '';
  return `<button class="seg-tool bulk-approve" data-bulk-approve="1" title="Yalnız 'hızlı onaya uygun' ölçütünü geçen ${n} bölümü onaylar. Uygun olmayanlara dokunmaz. Onaydan önce liste bir kez dinlenmelidir; bu düğme denetim yerine geçmez.">✓ ${n} hızlı onayla</button>`;
}
function renderSegDetail(m) {
  const root = $(`#seg-detail-${CSS.escape(m.id)}`);
  if (!root) return;
  // Panel içi kaydırma konumu korunur; takip sırasında ekran zıplamaz.
  const keepScroll = root.scrollTop;
  root.innerHTML = segDetailHtml(m);
  root.scrollTop = keepScroll;
  // Sağ panel çizildikten sonra yakınlaştırılmış dalga formunu bağla. Panel
  // yalnızca bölüm değişince çizildiği için bu maliyet düşüktür.
  const idx = activeSegIndex(m);
  ensureFollowStrip(m, idx);
  // TEKNİK BÖLÜM KAPALIYKEN çizim bağlanmaz (v2.154): gizli tuvalin genişliği
  // 0'dır; burada çizmek ölçeği bozar ve spektrogram hesabı boşa gider.
  if (techOpenPref()) {
    attachSegWave(m, idx);
    // Analiz görünümü (v2.128) her çizimde uygulanır: dalga/spek aynı kutuda,
    // seçili mod korunur; spektrogram yeni bölüm için yeniden hesaplanır.
    setAnalysisMode(m, analysisMode);
  }
}
function renderSegments(m, card) {
  const root = $(`#segments-${CSS.escape(m.id)}`, card || document);
  if (!root) return;
  const segs = m.segments || [];
  const counts = segCounts(m);
  const reviewed = counts.approved + counts.inaudible;
  const pct = segs.length ? Math.round((reviewed / segs.length) * 100) : 0;
  const filter = segFilter(m);
  const chips = segFilterChipsHtml(counts, filter);
  const spkOptions = (m.speakers || []).map((sp) => sp.label).filter(Boolean);
  root.innerHTML = `<div class="transcript-toolbar compact-bar">
      <div class="group"><span>Hız</span>${PLAYBACK_SPEEDS.map((sp) => `<button class="seg-tool speed-tool ${(m.playbackRate || 1) === sp ? 'on' : ''}" data-seg-speed="${sp}">${sp}×</button>`).join('')}</div>
      <div class="tb-sep"></div>
      <div class="tb-filters">${chips}</div>
      <div class="tb-spacer"></div>
      <div class="tb-progress" title="${reviewed}/${segs.length} denetlendi"><div class="bar"><span style="width:${pct}%"></span></div><small>%${pct}</small></div>
      <div class="group tb-more"><button class="seg-tool" data-jump-prio="1" title="En yüksek inceleme öncelikli bölüme git">⚠</button><button class="seg-tool" data-paragraph="1" title="Paragraf oluştur">¶</button><button class="seg-tool" data-terms="1" title="Terim tutarlılığı">Aa</button>${coverageButtonHtml(m)}${quickBulkBtn(counts, isSecondEyesEditor())}</div>
    </div>
    <div id="term-panel-${esc(m.id)}" class="term-panel" hidden></div>
    <div id="coverage-panel-${esc(m.id)}" class="coverage-panel" hidden></div>
    <datalist id="spk-options-${esc(m.id)}">${spkOptions.map((x) => `<option value="${esc(x)}"></option>`).join('')}</datalist>
    <div class="seg-workspace">
      <div class="seg-list" id="seg-list-${esc(m.id)}" role="list">${segListHtml(m)}</div>
      <div class="seg-detail" id="seg-detail-${esc(m.id)}">${segDetailHtml(m)}</div>
    </div>
    <details class="kbd-fold"><summary>Klavye kısayolları</summary><div class="kbd-hint"><b>Klavye:</b> <kbd>Boşluk</kbd> oynat/durdur · <kbd>↑</kbd><kbd>↓</kbd> bölüm · <kbd>Enter</kbd> onayla · <kbd>Y</kbd> dinle · <kbd>[</kbd><kbd>]</kbd> hız · <kbd>←</kbd><kbd>→</kbd> 5 sn · <kbd>B</kbd> böl · <kbd>M</kbd> birleştir · Metin alanındayken <kbd>Esc</kbd> ile çık</div></details>`;
  // Aktif bölüm işaretini kur
  const active = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  root
    .querySelectorAll('.seg-item')
    .forEach((el) => el.classList.toggle('is-active', Number(el.dataset.segItem) === active));
}
// Aktif bölümü değiştirir. Liste DOM'u yeniden kurulmaz; yalnızca sınıf taşınır
// ve sağ panel yenilenir. Kaydırma ve odak korunur.
// Yalnızca bölüm listesini kaydırır; sayfa ve diğer paneller yerinde kalır.
// scrollIntoView tüm üst öğeleri kaydırabildiği için elle hesaplanır.
// Kaydırma hedefi — SAF FONKSİYON (v2.113).
// NEDEN: v2.112 ve öncesinde `list.scrollTop += et.bottom - lt.bottom` yazılıydı.
// `scrollTop` TAM SAYIYA yuvarlanır; artımlı eklemede hata BİRİKİR ve uzun
// listelerde (100 bölüm) son öğe görünür alana oturmaz. Ölçüm: scrollTop=3184,
// maxScroll=3227 → son öğe 28px görünmüyordu ("3 kayıt görünmüyor").
// Kural: hedef MUTLAK olarak hesaplanır, [0, maxScroll] aralığına kırpılır ve
// idempotenttir (aynı öğe için tekrar çağrılırsa sonuç değişmez).
function nextScrollTop({ listTop, listBottom, itemTop, itemBottom, scrollTop, maxScroll }) {
  const cur = Number.isFinite(scrollTop) ? scrollTop : 0;
  let next = cur;
  if (Number.isFinite(itemTop) && itemTop < listTop) {
    next = cur - (listTop - itemTop); // yukarı taşıyor
  } else if (Number.isFinite(itemBottom) && itemBottom > listBottom) {
    next = cur + (itemBottom - listBottom); // aşağı taşıyor
  }
  if (!Number.isFinite(maxScroll)) return Math.max(0, next);
  return Math.max(0, Math.min(maxScroll, next));
}
function scrollListToItem(list, el) {
  if (!list || !el) return;
  const lt = list.getBoundingClientRect();
  const et = el.getBoundingClientRect();
  const next = nextScrollTop({
    listTop: lt.top,
    listBottom: lt.bottom,
    itemTop: et.top,
    itemBottom: et.bottom,
    scrollTop: list.scrollTop,
    maxScroll: list.scrollHeight - list.clientHeight
  });
  // Yuvarlama farkı birikmesin: mutlak değer yazılır (artımlı ekleme YOK).
  if (Math.abs(next - list.scrollTop) >= 0.5) list.scrollTop = next;
}
function setActiveSegment(m, index, { scroll = true } = {}) {
  const segs = m.segments || [];
  if (!segs.length) return;
  m.activeSeg = Math.max(0, Math.min(segs.length - 1, index));
  const root = $(`#segments-${CSS.escape(m.id)}`);
  if (root) {
    root
      .querySelectorAll('.seg-item')
      .forEach((el) => el.classList.toggle('is-active', Number(el.dataset.segItem) === m.activeSeg));
    if (scroll) scrollListToItem(root.querySelector('.seg-list'), root.querySelector(`.seg-item[data-seg-item="${m.activeSeg}"]`));
  }
  renderSegDetail(m);
}
function navSegment(m, dir) {
  const segs = m.segments || [];
  if (!segs.length) return;
  const filter = segFilter(m);
  const issueSet = segmentTimeIssueIndexes(segs);
  const order = segs.map((s, i) => i).filter((i) => segMatchesFilter(segs[i], filter, segs[i - 1], i, issueSet));
  const list = order.length ? order : segs.map((s, i) => i);
  const cur = Number.isInteger(m.activeSeg) ? m.activeSeg : list[0];
  let pos = list.indexOf(cur);
  if (pos < 0) {
    setActiveSegment(m, list[0]);
    return;
  }
  pos = Math.max(0, Math.min(list.length - 1, pos + dir));
  setActiveSegment(m, list[pos]);
}
// En yüksek inceleme önceliğini taşıyan ve henüz onaylanmamış bölüme atlar.
// Toplu onay: YALNIZ "hızlı onaya uygun" ölçütünü geçen bölümler. Uygun
// olmayan bölümlere dokunulmaz ve sayısı bildirilir. Onay yetkisi korunur:
// ikinci göz çağıramaz. İşlem geri alınabilir ve delil günlüğüne yazılır.
function bulkApproveQuick(m) {
  if (isSecondEyesEditor()) {
    showToast('Onay yetkisi dosya sorumlusunda. İkinci göz düzeltme önerir, onaylayamaz.');
    return;
  }
  const segs = m.segments || [];
  // TEK KAYNAK (v2.99): sayaç ve filtre ile aynı liste.
  const targets = quickApproveTargets(m);
  if (!targets.length) {
    showToast('Hızlı onaya uygun bölüm yok. Önce listeyi dinleyin.');
    return;
  }
  snapshotForUndo(`${targets.length} bölüm otomatik çözümlendi olarak işaretlendi`);
  for (const i of targets) {
    // BİLİRKİŞİ ONAYI DEĞİL (v2.106): `approved` yazmak, dinlenmemiş metni
    // raporda "Onaylandı" göstermek olurdu. `machine` = "otomatik çözümlendi,
    // dinlenmeli". Bilirkişi dinleyip onaylayınca `approved` olur.
    setSegReview(segs[i], 'machine');
  }
  logEvent(
    m,
    'Toplu otomatik işaretleme',
    `${targets.length} bölüm "otomatik çözümlendi" olarak işaretlendi (bilirkişi onayı değil)`
  );
  persist();
  renderSegments(m, $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card'));
  renderOverview();
  if ($('#view-report').classList.contains('active')) renderReport();
  showToast(
    `${targets.length} bölüm "Çözümlendi" olarak işaretlendi — BUNLAR ONAYLANMADI. ` +
      'Rapora "Onaylandı" yazılması için dinleyip onaylamanız gerekir. Ctrl+Z ile geri alınır.'
  );
}
function jumpToPriority(m) {
  const segs = m.segments || [];
  if (!segs.length) return;
  let best = -1,
    bestScore = 14;
  for (let i = 0; i < segs.length; i++) {
    if (segReview(segs[i]) === 'approved') continue;
    const p = segPriority(segs[i], segs[i - 1]);
    if (p.score > bestScore) {
      bestScore = p.score;
      best = i;
    }
  }
  if (best < 0) {
    showToast('Öncelikli bekleyen bölüm yok.');
    return;
  }
  if (segFilter(m) !== 'all') {
    m.uiFilter = 'all';
    renderSegments(m, $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card'));
  }
  setActiveSegment(m, best);
  showToast(`Öncelikli bölüme gidildi: ${best + 1}. bölüm.`);
}
function playActiveSegment(m) {
  // GÖRÜNEN bölüm ile oynatılan bölüm AYNI olmalı (v2.127). Detay ilk bölümü
  // gösterirken `activeSeg` tanımsız olabiliyordu; "▶ Dinle" sessizce hiçbir
  // şey yapmıyordu (ölçüldü). Artık varsayılan 0 ve `activeSeg` yazılır.
  const idx = activeSegIndex(m);
  const s = (m.segments || [])[idx];
  if (!s) return;
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  if (!card) return;
  m.activeSeg = idx;
  playSegmentRange(card, m, s, idx);
}
// ANA oynat: tüm kaydı kesintisiz çalar; bölümler takip moduyla ilerler.
// Tek bölümü çalmak isteyen uzman bölüm başlığındaki "▶ Dinle"yi kullanır
// (davranış aynı: duraklat/devam).
function playWholeRecording(m) {
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  const player = card && card.querySelector('audio');
  if (!player) return;
  ensureSegStopListener(player);
  resumeAudioGraph(m);
  player.playbackRate = m.playbackRate || 1;
  if (!player.paused) {
    player.pause();
    refreshPlayButtons();
    return;
  }
  // Döngü AÇIKSA kayıt sonuna kadar değil, B'de durur (v2.112).
  // Döngü kapalıysa bitiş sınırı YOK: kayıt sonuna kadar çalar.
  if (player.__segStop) {
    player.__segStop.stopAt = loopStopTarget(m, null);
    player.__segStop.materialId = m.id;
    player.__segStop.index = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  }
  segPlayback = { materialId: m.id, index: Number.isInteger(m.activeSeg) ? m.activeSeg : 0, playing: true, atEnd: false };
  // OTOMATİK AÇMA YOK (v2.119): kullanıcı takibi açmadıysa açılmaz.
  // Önceden burada `setFollow(true)` vardı; kullanıcı ana oynata basınca
  // istemediği hâlde takip açılıyordu (canlı veri bildirimi).
  player.play().catch(() => {});
  refreshPlayButtons();
}
function cycleSpeed(m, delta) {
  const cur = m.playbackRate || 1;
  let i = PLAYBACK_SPEEDS.indexOf(cur);
  if (i < 0) i = PLAYBACK_SPEEDS.indexOf(1);
  i = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, i + delta));
  m.playbackRate = PLAYBACK_SPEEDS[i];
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  const player = card?.querySelector('audio');
  if (player) player.playbackRate = m.playbackRate;
  card
    ?.querySelectorAll('[data-seg-speed]')
    .forEach((b) => b.classList.toggle('on', Number(b.dataset.segSpeed) === m.playbackRate));
  persist();
  showToast(`Oynatma hızı: ${m.playbackRate}×`);
}
// Aktif bölümü onaylar ve sonrakine geçer. Liste öğesi ve sağ panel cerrahi
// güncellenir; tam yeniden çizim yapılmaz.
function approveActiveSegment(m) {
  const segs = m.segments || [];
  // Sessiz başarısızlık yok: bölüm yoksa kullanıcı NEDEN onaylayamadığını
  // görmeli. Aksi hâlde "Onayla"ya basıp hiçbir şey olmaması hata sanılır.
  if (!segs.length) {
    showToast('Bu kayıtta onaylanacak bölüm yok. Önce çözümleme yapın veya elle bölüm ekleyin.');
    return;
  }
  if (!Number.isInteger(m.activeSeg)) m.activeSeg = 0;
  const i = m.activeSeg;
  const s = segs[i];
  if (!s) {
    showToast('Önce listeden bir bölüm seçin.');
    return;
  }
  // Onay kararı bilirkişinindir. İkinci göz (yardımcı/kontrol eden) onaylayamaz;
  // aksi hâlde kontrol edilmemiş metin "Onaylandı" diye rapora girer.
  if (isSecondEyesEditor()) {
    showToast('Onay yetkisi dosya sorumlusunda. İkinci göz düzeltme önerir, onaylayamaz.');
    return;
  }
  // Onayı KİMİN verdiği kaydedilir (v2.122): birleştirmede onay ancak sahibi
  // biliniyorsa aktarılır.
  setSegReview(s, 'approved');
  persist();
  renderOverview();
  const root = $(`#segments-${CSS.escape(m.id)}`);
  // Filtre "Bekleyen" ise onaylanan öğe listeden düşer; o durumda listeyi kur.
  if (root) {
    const filter = segFilter(m);
    if (filter === 'pending') {
      renderSegList(m);
    } else {
      updateSegListItem(m, i);
    }
    refreshSegChips(m);
  }
  // Tercih açıksa sıradaki KONTROL EDİLMEMİŞ bölüme geç (v2.151). Bekleyen
  // yoksa YERİNDE kalınır; başa dönmek yanlış bölüme atlamaya yol açardı.
  let next = Math.min(segs.length - 1, i + 1);
  let msg = `Bölüm ${i + 1} onaylandı. Şimdi ${next + 1}. bölüm.`;
  if (nextPendingPref()) {
    const np = nextPendingIndex(segs, i);
    if (np >= 0) {
      next = np;
      msg = `Bölüm ${i + 1} onaylandı. Sıradaki bekleyen: ${np + 1}. bölüm.`;
    } else {
      next = i;
      msg = `Bölüm ${i + 1} onaylandı. Bekleyen başka bölüm yok.`;
    }
  }
  m.activeSeg = next;
  setActiveSegment(m, next);
  if ($('#view-report').classList.contains('active')) renderReport();
  showToast(msg);
}
// Yazma sırasında ağır yenilemeyi geciktirir (v2.86). Son tuştan 250 ms
// sonra bir kez çalışır; yazma akıcı kalır, sayaçlar yine doğru görünür.
let lightRefreshTimer = null;
function scheduleLightRefresh(m) {
  clearTimeout(lightRefreshTimer);
  lightRefreshTimer = setTimeout(() => {
    try {
      refreshSegChips(m);
      renderOverview();
    } catch (e) {}
  }, 250);
}
// Filtre çipleri TEK KAYNAK (v2.146). "Zaman sorunları" çipi yalnız sorun
// varsa görünür; sayı sıfıra düşerse çip kaldırılır.
function segFilterChipsHtml(counts, filter) {
  return SEG_FILTERS.filter(([k]) => k !== 'time' || counts.time > 0)
    .map(
      ([k, label]) =>
        `<button class="filter-chip ${filter === k ? 'on' : ''}" data-seg-filter="${k}">${label} <span class="n">${counts[k]}</span></button>`
    )
    .join('');
}
function refreshSegChips(m) {
  const root = $(`#segments-${CSS.escape(m.id)}`);
  if (!root) return;
  const counts = segCounts(m);
  const segs = m.segments || [];
  const reviewed = counts.approved + counts.inaudible;
  const pct = segs.length ? Math.round((reviewed / segs.length) * 100) : 0;
  root.querySelectorAll('[data-seg-filter]').forEach((ch) => {
    const k = ch.dataset.segFilter;
    const n = ch.querySelector('.n');
    if (n) n.textContent = counts[k];
  });
  // Zaman sorunları çipi: sorun YENİ oluştuysa ekle, bittiyse kaldır (v2.146).
  const holder = root.querySelector('.tb-filters');
  const timeChip = root.querySelector('[data-seg-filter="time"]');
  if (holder && counts.time > 0 && !timeChip) {
    const tmp = document.createElement('div');
    tmp.innerHTML = segFilterChipsHtml(counts, segFilter(m));
    const fresh = tmp.querySelector('[data-seg-filter="time"]');
    if (fresh) holder.appendChild(fresh);
  } else if (timeChip && counts.time === 0) {
    timeChip.remove();
  }
  // İlerleme artık araç çubuğunun içinde (.tb-progress); eski .seg-progress
  // sınıfı da desteklenir.
  const bar = root.querySelector('.tb-progress .bar span') || root.querySelector('.seg-progress .bar span');
  if (bar) bar.style.width = pct + '%';
  const lbl = root.querySelector('.tb-progress small') || root.querySelector('.seg-progress small');
  if (lbl) lbl.textContent = `%${pct}`;
  const tip = root.querySelector('.tb-progress');
  if (tip) tip.title = `${reviewed}/${segs.length} denetlendi`;
  // Toplu onay düğmesi sayaca bağlıdır: yazarken/onaylarken sayı değişir.
  // Yalnız tam çizimde eklenirse kullanıcı düğmeyi hiç görmez (v2.80'de
  // tarayıcıda yakalandı). Yerinde tazelenir.
  const more = root.querySelector('.tb-more');
  if (more) {
    const want = quickBulkBtn(counts, isSecondEyesEditor());
    let btn = more.querySelector('[data-bulk-approve]');
    if (!want) {
      if (btn) btn.remove();
    } else if (!btn) {
      more.insertAdjacentHTML('beforeend', want);
    } else {
      btn.outerHTML = want;
    }
  }
  refreshCoverage(m, root);
}
// ---- Kapsama denetimi (v2.149) ----
// Düğme etiketi ve açık panel, bölüm listesi değiştikçe YERİNDE tazelenir;
// aksi hâlde kullanıcı sayfayı yenileyene kadar eski yüzdeyi görür (v2.146
// dersi: yerinde güncelleme tüm girdileri geçmeli).
function coverageButtonHtml(m) {
  const cov = segmentCoverage(m.segments || [], Number(m.duration) || 0);
  const cls = cov.ok && cov.gaps.length ? ' has-gaps' : '';
  return `<button class="seg-tool coverage-tool${cls}" data-coverage="1" title="Sesin ne kadarının bölümlere ayrıldığını denetler. 'Boşluk' konuşma olmadığı anlamına gelmez; yalnız hiçbir bölüme girmemiş aralık olduğunu söyler.">${esc(coveragePctText(cov))}</button>`;
}
function coveragePanelHtml(m) {
  const cov = segmentCoverage(m.segments || [], Number(m.duration) || 0);
  const head =
    '<div class="term-head"><b>Kapsama denetimi</b><small>Boşluk "konuşma yok" demek değildir; yalnız bölümlenmemiş aralıktır. Hiçbir zaman otomatik düzeltilmez.</small></div>';
  if (!cov.ok) {
    return `${head}<div class="term-empty">Kayıt süresi bilinmiyor (ses henüz yüklenmemiş olabilir); kapsama hesaplanamadı. Sonuç uydurulmadı.</div>`;
  }
  const parts = [];
  if (!cov.gaps.length) {
    parts.push(
      `<div class="cov-line cov-ok">Sesin tamamı (${fmtShort(cov.totalSec)}) bölümlere ayrılmış; boşluk yok.</div>`
    );
  } else {
    const gapSec = cov.gaps.reduce((n, g) => n + (g.b - g.a), 0);
    parts.push(
      `<div class="cov-line">${cov.gaps.length} boşluk · toplam ${gapSec.toFixed(1)} sn · kapsanan ${fmtShort(cov.coveredSec)} / ${fmtShort(cov.totalSec)} (%${Math.floor(cov.pct)})</div>`
    );
    parts.push(
      cov.gaps
        .map(
          (g) =>
            `<div class="cov-gap"><span class="cov-range">${timecode(g.a)} – ${timecode(g.b)}</span><span class="cov-len">${(g.b - g.a).toFixed(1)} sn</span><button class="mini-button" data-cov-goto="${esc(m.id)}|${g.a}" title="Oynatıcıyı bu aralığın başına getir">Git</button></div>`
        )
        .join('')
    );
  }
  if (cov.outside.length) {
    parts.push(
      `<div class="cov-line cov-warn">${cov.outside.length} bölüm kayıt süresini aşıyor (bölüm ${cov.outside.map((i) => i + 1).join(', ')}). Bitiş kayıt sonundan sonra; kapsama hesabında kayıt sonunda kesildi.</div>`
    );
  }
  if (cov.zero.length) {
    parts.push(
      `<div class="cov-line cov-warn">${cov.zero.length} bölümün süresi sıfır (bölüm ${cov.zero.map((i) => i + 1).join(', ')}); kapsamaya katkısı yok.</div>`
    );
  }
  return head + parts.join('');
}
function renderCoveragePanel(m) {
  const panel = $(`#coverage-panel-${CSS.escape(m.id)}`);
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = coveragePanelHtml(m);
}
function closeCoveragePanel(m) {
  const panel = $(`#coverage-panel-${CSS.escape(m.id)}`);
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = '';
  }
}
function refreshCoverage(m, root) {
  const scope = root || $(`#segments-${CSS.escape(m.id)}`);
  if (!scope) return;
  const btn = scope.querySelector('[data-coverage]');
  if (btn) btn.outerHTML = coverageButtonHtml(m);
  const panel = scope.querySelector(`#coverage-panel-${CSS.escape(m.id)}`);
  if (panel && !panel.hidden) panel.innerHTML = coveragePanelHtml(m);
}
// "Git": oynatıcıyı boşluğun başına getirir; oynatmayı KENDİLİĞİNDEN başlatmaz.
function seekPlayerTo(m, sec, card) {
  const player = (card || document).querySelector('audio');
  if (!player || !Number.isFinite(sec)) return false;
  try {
    player.currentTime = Math.max(0, sec);
  } catch (e) {
    return false;
  }
  showToast(`Konum: ${timecode(sec)}`);
  return true;
}
function focusSegmentRow(el) {
  const card = el.closest('.audio-card');
  if (!card) return;
  const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
  const m = currentCase().materials.find((x) => x.id === id);
  if (!m) return;
  setActiveSegment(m, Number(el.dataset.segItem), { scroll: false });
}
function handleSegKey(e, card, m) {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'textarea' || tag === 'input' || tag === 'select';
  const onButton = tag === 'button' || tag === 'a';
  // Ctrl+Z / Cmd+Z: geri al. Metin alanındaysa tarayıcının kendi geri alması
  // çalışsın (yazarken karakter geri alma); belge düzeyinde işlem geri alınır.
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z') && !typing) {
    e.preventDefault();
    undoLast();
    return true;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key === 'Escape' && typing) {
    e.preventDefault();
    e.target.blur(); // Metinden çıkınca odağı etkin bölüme taşı; aksi hâlde odak gövdeye düşer
    // ve klavye gezinmesi çalışmaz.
    const root = $(`#segments-${CSS.escape(m.id)}`);
    const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
    const el = root?.querySelector(`.seg-item[data-seg-item="${idx}"]`);
    if (el && el.focus) el.focus();
    return true;
  }
  if (e.key === 'ArrowUp' && !typing) {
    navSegment(m, -1);
    e.preventDefault();
    return true;
  }
  if (e.key === 'ArrowDown' && !typing) {
    navSegment(m, 1);
    e.preventDefault();
    return true;
  }
  if (e.key === ' ' && !typing && !onButton) {
    // Boşluk = ana oynat: kaydın tamamı + takip. Tek bölüm için Y veya
    // bölüm başlığındaki "▶ Dinle".
    playWholeRecording(m);
    e.preventDefault();
    return true;
  }
  // Enter: odak bir düğmedeyse tarayıcı zaten tıklama üretir; ayrıca onaylamak
  // çift işlem yapardı. Bu yüzden düğme odaktayken kısayol devre dışı bırakılır.
  if (e.key === 'Enter') {
    if (tag === 'button' || tag === 'a') return false; // tarayıcının tıklamasına bırak
    if (tag === 'textarea') return false; // metinde yeni satır
    if (tag === 'input' || tag === 'select') {
      e.preventDefault();
      e.target.blur();
      return true;
    }
    approveActiveSegment(m);
    e.preventDefault();
    return true;
  }
  if ((e.key === 'y' || e.key === 'Y') && !typing) {
    playActiveSegment(m);
    e.preventDefault();
    return true;
  }
  // F = otomatik bölüm geçişi, G = canlı metin vurgusu (v2.119).
  // İkisi ayrı; kullanıcı yalnız istediğini açar.
  if ((e.key === 'f' || e.key === 'F') && !typing) {
    setFollow(!followState.autoAdvance, 'autoAdvance');
    showToast(followState.autoAdvance ? 'Otomatik bölüm geçişi açık.' : 'Otomatik bölüm geçişi kapalı.');
    e.preventDefault();
    return true;
  }
  if ((e.key === 'g' || e.key === 'G') && !typing) {
    setFollow(!followState.liveHighlight, 'liveHighlight');
    showToast(followState.liveHighlight ? 'Canlı metin vurgusu açık.' : 'Canlı metin vurgusu kapalı.');
    e.preventDefault();
    return true;
  }
  // A–B DÖNGÜSÜ KISAYOLLARI (v2.112). Önceden A–B için hiç kısayol yoktu ve
  // `B` tuşu bölmeye bağlıydı; kullanıcı "tuşlar yanlış" dedi. Artık:
  //   A = döngü başlangıcı, B = döngü bitişi, K = döngü aç/kapa
  // Bölme kısayolu `S` tuşuna taşındı (Split).
  // Oynatıcı `card` içindedir; `handleSegKey` kapsamında hazır bir `player`
  // değişkeni YOKTUR (v2.112'de bu yüzden tuşlar sessizce çalışmıyordu).
  const lp = card?.querySelector('audio') || null;
  const loopIdx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  if ((e.key === LOOP_KEYS.a || e.key === LOOP_KEYS.a.toUpperCase()) && !typing) {
    const t = lp && Number.isFinite(lp.currentTime) ? lp.currentTime : null;
    if (t == null) {
      showToast('A için önce kaydı oynatın veya dalgada bir noktaya tıklayın.');
      return false;
    }
    setLoopPoint(m, 'a', t);
    refreshSegWave(m, loopIdx);
    showToast(`A: ${timecode(t)} — B'yi belirlemek için B tuşuna basın.`);
    e.preventDefault();
    return true;
  }
  if ((e.key === LOOP_KEYS.b || e.key === LOOP_KEYS.b.toUpperCase()) && !typing) {
    const t = lp && Number.isFinite(lp.currentTime) ? lp.currentTime : null;
    if (t == null) {
      showToast('B için önce kaydı oynatın veya dalgada bir noktaya tıklayın.');
      return false;
    }
    setLoopPoint(m, 'b', t);
    refreshSegWave(m, loopIdx);
    const L = loopRange(m);
    showToast(
      L
        ? `B: ${timecode(t)} — A–B hazır (${loopLabel(m)}). K ile döngüyü açın.`
        : 'B: başlangıçtan sonra olmalı. Önce A noktasını belirleyin.'
    );
    e.preventDefault();
    return true;
  }
  if ((e.key === LOOP_KEYS.toggle || e.key === LOOP_KEYS.toggle.toUpperCase()) && !typing) {
    toggleLoop(m, lp, loopIdx);
    e.preventDefault();
    return true;
  }
  // Bölme: S tuşu (eski B tuşu A–B'ye ayrıldı).
  if ((e.key === 's' || e.key === 'S') && !typing) {
    const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
    splitSegmentAtPlayer(m, idx);
    e.preventDefault();
    return true;
  }
  if ((e.key === 'm' || e.key === 'M') && !typing) {
    const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
    mergeSegmentWithNext(m, idx);
    e.preventDefault();
    return true;
  }
  if (e.key === '[' && !typing) {
    cycleSpeed(m, -1);
    e.preventDefault();
    return true;
  }
  if (e.key === ']' && !typing) {
    cycleSpeed(m, 1);
    e.preventDefault();
    return true;
  }
  if (e.key === 'ArrowLeft' && !typing) {
    const player = card.querySelector('audio');
    if (player) player.currentTime = Math.max(0, player.currentTime - 5);
    e.preventDefault();
    return true;
  }
  if (e.key === 'ArrowRight' && !typing) {
    const player = card.querySelector('audio');
    if (player) player.currentTime = player.currentTime + 5;
    e.preventDefault();
    return true;
  }
  return false;
}
// Kısayollar belge düzeyinde dinlenir; böylece odak listeden çıksa bile (örneğin
// metin alanından Esc ile çıkıldığında) çalışmaya devam eder. Yalnızca ses
// kayıtları görünümü açıkken etkindir ve metin alanlarında yazmayı engellemez.
let focusedMaterialId = null;
function onGlobalSegKey(e) {
  if (!$('#view-audio')?.classList.contains('active')) return;
  const mats = currentCase()?.materials || [];
  let card = e.target?.closest?.('.audio-card') || null;
  let m = null;
  if (card) {
    const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
    m = mats.find((x) => x.id === id) || null;
  }
  if (!m && focusedMaterialId) {
    m = mats.find((x) => x.id === focusedMaterialId) || null;
    if (m) card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card') || null;
  }
  if (!m && mats.length === 1) {
    m = mats[0];
    card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card') || null;
  }
  if (!m || !card) return;
  handleSegKey(e, card, m);
}
// Bir bölümün zaman aralığını çalar ve bitişte durur. Oynatma hızı uygulanır.
// Aktif bölüm yalnızca sınıflarla işaretlenir; tablo yeniden çizilmez, böylece
// oynatma sırasında metin ve kaydırma yerinde kalır.

// Bölüm sınırını hassas kaydırma. Uzman, konuşmanın tam nerede başladığını
// dalga formunda göremeyebilir; bu düğmeler başlangıç/bitiş zamanını 0,1 sn
// adımlarla kaydırır. Böylece ayırma "tam sınır" üzerinde yapılabilir.
function nudgeBoundary(m, index, field, deltaSec) {
  const s = (m.segments || [])[index];
  if (!s) return;
  const cur = secondsFromTimecode(s[field]);
  let next = Math.max(0, cur + deltaSec);
  const dur = Number(m.duration) || 0;
  if (dur > 0) next = Math.min(next, dur);
  // Karşı sınır SÜRÜKLENMEZ. v2.77 ve öncesinde başlangıç kaydırılınca bitiş de
  // sessizce taşınıyor, bölüm sıfır uzunlukta kalıyordu; uzman bunu ancak
  // dinlerken fark ediyordu. Artık karşı sınıra 0,1 sn kalınca durur ve nedenini
  // söyler.
  const other = secondsFromTimecode(field === 'start' ? s.end : s.start);
  if (field === 'start' && next > other - 0.1) {
    next = Math.max(0, other - 0.1);
    if (Math.abs(next - cur) < 1e-6) {
      showToast('Başlangıç bitişe dayandı. Önce bitişi ileri alın.');
      return;
    }
  }
  if (field === 'end' && next < other + 0.1) {
    next = other + 0.1;
    if (Math.abs(next - cur) < 1e-6) {
      showToast('Bitiş başlangıca dayandı. Önce başlangıcı geri alın.');
      return;
    }
  }
  s[field] = timecode(next);
  persist();
  // Girdi alanını yerinde güncelle; tam panel yeniden çizilmez.
  const root = $(`#segments-${CSS.escape(m.id)}`);
  if (root) {
    const inp = root.querySelector(`.seg-detail [data-seg="${index}"][data-key="${field}"]`);
    if (inp) inp.value = s[field];
  }
  updateSegListItem(m, index);
  showToast(`${field === 'start' ? 'Başlangıç' : 'Bitiş'}: ${s[field]}`);
}
// Yakınlaştırılmış dalga formunun görünüm penceresi. Varsayılan olarak bölümün
// ±0,5 sn'si gösterilir; kullanıcı tekerlekle veya düğmelerle daraltıp
// genişletebilir. Pencere bölüm değişince sıfırlanır.
function zoomView(m, index) {
  const s = (m.segments || [])[index];
  const dur = Number(m.duration) || 0;
  const a0 = Math.max(0, secondsFromTimecode(s.start) - 0.5),
    b0 = Math.min(dur, secondsFromTimecode(s.end) + 0.5);
  if (m.__zoom && m.__zoom.index === index && m.__zoom.materialId === m.id) {
    return m.__zoom;
  }
  m.__zoom = { materialId: m.id, index, a: a0, b: b0 };
  return m.__zoom;
}
// Aktif bölümün yakınlaştırılmış dalga formu. Görünüm penceresi, sınır
// çizgileri, oynatma imleci ve imleç konumu gösterilir. Kullanıcı sınırı
// sürükleyerek veya boşluğa tıklayarak konuma giderek çalışır.
function drawZoomWave(canvas, peaks, m, index) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(0, 0, w, h);
  const s = (m.segments || [])[index];
  const dur = Number(m.duration) || 0;
  if (!s || !peaks || !dur) {
    ctx.fillStyle = '#93a0ad';
    ctx.font = '11px Segoe UI';
    ctx.fillText('Yakınlaştırma için bölüm ve dalga verisi gerekir.', 8, 34);
    return;
  }
  const v = zoomView(m, index);
  const a = v.a,
    b = v.b;
  const span = Math.max(0.02, b - a);
  const mid = h / 2;
  ctx.fillStyle = '#4a7bab';
  for (let x = 0; x < w; x++) {
    const t = a + (x / w) * span;
    const pi = Math.floor((t / dur) * peaks.length);
    const p = peaks[pi] || 0;
    const bar = Math.max(1, p * mid * 0.9);
    ctx.fillRect(x, mid - bar, 1, bar * 2);
  }
  const xs = (t) => Math.floor(((t - a) / span) * w);
  const st = secondsFromTimecode(s.start),
    en = secondsFromTimecode(s.end);
  // Bölüm aralığının dışı hafifçe karartılır; sınırlar net görünür.
  if (st > a) {
    ctx.fillStyle = 'rgba(20,44,77,0.06)';
    ctx.fillRect(0, 0, xs(st), h);
  }
  if (en < b) {
    ctx.fillStyle = 'rgba(20,44,77,0.06)';
    ctx.fillRect(xs(en), 0, w - xs(en), h);
  }
  const x0 = xs(st),
    x1 = xs(en);
  ctx.strokeStyle = '#2c8062';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.lineTo(x0, h);
  ctx.stroke();
  ctx.strokeStyle = '#b95252';
  ctx.beginPath();
  ctx.moveTo(x1, 0);
  ctx.lineTo(x1, h);
  ctx.stroke();
  const card = canvas.closest('.audio-card');
  const player = card?.querySelector('audio');
  if (player) {
    const xp = xs(player.currentTime);
    ctx.strokeStyle = '#b88645';
    ctx.beginPath();
    ctx.moveTo(xp, 0);
    ctx.lineTo(xp, h);
    ctx.stroke();
  }
  ctx.fillStyle = '#7d8ea0';
  ctx.font = '9px Segoe UI';
  ctx.fillText(timecode(a), 4, 10);
  ctx.fillText(timecode(b), w - 70, 10);
  const sp = canvas.closest('.zoom-wave-wrap')?.querySelector('.zw-span');
  if (sp) sp.textContent = `${span.toFixed(2)} sn görünür`;
}
// Yakınlaştırılmış dalga formu etkileşimi: sınır sürükleme, tekerlek zoom,
// boşluğa tıklayarak konuma gitme. Sınır çizgilerine yakın tıklama o sınırı
// yakalar; uzak tıklama oynatıcıyı o konuma taşır.
function attachZoomWave(m, index) {
  const canvas = $(`#zoom-wave-${CSS.escape(m.id)}`);
  if (!canvas) return;
  const s = (m.segments || [])[index];
  const dur = Number(m.duration) || 0;
  if (!s || !dur) return;
  const peaks = peakCache.get(m.id);
  const card = canvas.closest('.audio-card');
  const player = card?.querySelector('audio');
  const hit = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const v = zoomView(m, index);
    return { ratio, t: v.a + ratio * (v.b - v.a), rect };
  };
  const nearBoundary = (t) => {
    const st = secondsFromTimecode(s.start),
      en = secondsFromTimecode(s.end);
    const v = zoomView(m, index);
    const tol = (v.b - v.a) * 0.03;
    if (Math.abs(t - st) <= tol) return 'start';
    if (Math.abs(t - en) <= tol) return 'end';
    return null;
  };
  let drag = null;
  const syncInputs = (field) => {
    const root = $(`#segments-${CSS.escape(m.id)}`);
    if (root) {
      const inp = root.querySelector(`.seg-detail [data-seg="${index}"][data-key="${field}"]`);
      if (inp) inp.value = s[field];
    }
  };
  canvas.addEventListener('pointerdown', (ev) => {
    const { t } = hit(ev);
    const field = nearBoundary(t);
    if (field) {
      drag = field;
      canvas.setPointerCapture?.(ev.pointerId);
      canvas.style.cursor = 'ew-resize';
    } else {
      const st = secondsFromTimecode(s.start),
        en = secondsFromTimecode(s.end);
      const mid = (st + en) / 2;
      const f = t < mid ? 'start' : 'end';
      s[f] = timecode(t);
      persist();
      syncInputs(f);
      updateSegListItem(m, index);
      drawZoomWave(canvas, peaks, m, index);
      if (player && t >= st && t <= en) {
        try {
          player.currentTime = t;
        } catch (e) {}
      }
      showToast(`${f === 'start' ? 'Başlangıç' : 'Bitiş'} ayarlandı: ${s[f]}`);
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const { t } = hit(ev);
    if (drag) {
      s[drag] = timecode(t);
      persist();
      drawZoomWave(canvas, peaks, m, index);
      return;
    }
    canvas.style.cursor = nearBoundary(t) ? 'ew-resize' : 'crosshair';
  });
  const endDrag = () => {
    if (!drag) return;
    const f = drag;
    drag = null;
    canvas.style.cursor = 'crosshair';
    syncInputs(f);
    updateSegListItem(m, index);
    drawZoomWave(canvas, peaks, m, index);
    showToast(`${f === 'start' ? 'Başlangıç' : 'Bitiş'} ayarlandı: ${s[f]}`);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  // Tekerlek: imlecin altındaki zaman sabit kalacak şekilde pencere daraltılır.
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const { ratio, t } = hit(ev);
      const v = zoomView(m, index);
      const factor = ev.deltaY < 0 ? 0.8 : 1.25;
      let span = (v.b - v.a) * factor;
      span = Math.max(0.05, Math.min(dur, span));
      let a = t - ratio * span,
        b = a + span;
      if (a < 0) {
        a = 0;
        b = span;
      }
      if (b > dur) {
        b = dur;
        a = dur - span;
      }
      v.a = Math.max(0, a);
      v.b = Math.min(dur, b);
      drawZoomWave(canvas, peaks, m, index);
    },
    { passive: false }
  );
  if (player) {
    const ph = () => drawZoomWave(canvas, peaks, m, index);
    player.addEventListener('timeupdate', ph);
    player.addEventListener('seeked', ph);
  }
  drawZoomWave(canvas, peaks, m, index);
}
// Yakınlaştırma düğmeleri (＋ / − / Sığdır).
function zoomWaveBy(m, index, mode) {
  const s = (m.segments || [])[index];
  const dur = Number(m.duration) || 0;
  if (!s || !dur) return;
  const v = zoomView(m, index);
  const st = secondsFromTimecode(s.start),
    en = secondsFromTimecode(s.end);
  if (mode === 'fit') {
    v.a = Math.max(0, st - 0.5);
    v.b = Math.min(dur, en + 0.5);
  } else {
    const factor = mode === 'in' ? 0.7 : 1.4;
    const c = (v.a + v.b) / 2;
    let span = (v.b - v.a) * factor;
    span = Math.max(0.05, Math.min(dur, span));
    v.a = Math.max(0, c - span / 2);
    v.b = Math.min(dur, v.a + span);
    if (v.b - v.a < span) v.a = Math.max(0, v.b - span);
  }
  const canvas = $(`#zoom-wave-${CSS.escape(m.id)}`);
  if (canvas) drawZoomWave(canvas, peakCache.get(m.id), m, index);
}
// Aktif bölümün çalma durumu. Dinle düğmesi artık akıllı: aynı bölümde tekrar
// basınca duraklar, duraklatılmışken devam eder, başka bölüme geçilince baştan
// başlar. Durdur düğmesi başa sarar. Bu durum tek bir nesnede tutulur; böylece
// her çizimde doğru düğme metni gösterilebilir.
let segPlayback = { materialId: null, index: null, playing: false, atEnd: false, stopAt: null };
// A–B dinleme aralığı: uzman bir aralığı anlamadığında sınırları değiştirmeden
// tekrar tekrar dinlemek ister. Bölme çizgilerini oynatmak zorunda kalmak
// sınırları bozuyordu (kullanıcı bildirimi). Döngü yalnız OYNATMAYI sarar;
// bölüm sınırlarına (start/end) dokunmaz. Oturumluktur, şemaya yazılmaz.
function loopRange(m) {
  const L = m && m.__loop;
  if (!L || !Number.isFinite(L.a) || !Number.isFinite(L.b) || L.b <= L.a) return null;
  return L;
}
function setLoopPoint(m, which, t) {
  if (!m || !Number.isFinite(t)) return;
  const L = (m.__loop = m.__loop || { on: false, a: null, b: null });
  L[which] = Math.max(0, t);
  if (which === 'a' && Number.isFinite(L.b) && L.b <= L.a + 0.05) L.b = null;
  if (which === 'b' && Number.isFinite(L.a) && L.b <= L.a + 0.05) L.a = null;
}
function loopLabel(m) {
  const L = loopRange(m);
  if (!L) return '';
  return `A ${timecode(L.a)} → B ${timecode(L.b)}`;
}
// TEK KAYNAK: bir oynatma yolunun DURMA noktası (v2.112).
// NEDEN: v2.111'de `playSegmentRange()` ve ana oynat döngüyü hiç kontrol
// etmiyordu; her "▶ Dinle" çağrısı `stopAt = bölüm sonu` yazıp döngüyü
// SESSİZCE öldürüyordu (canlı veri: "tam kullanamadık").
// Kural: döngü AÇIK ve geçerliyse durma noktası B'dir; bölüm sonu değil.
// Bölüm sonu yoksa (ana oynat) yine B'de durur — döngü sınır koyar.
function loopStopTarget(m, segmentEnd) {
  const L = loopRange(m);
  if (L && L.on) return L.b;
  return Number.isFinite(segmentEnd) ? segmentEnd : null;
}
// A–B klavye kısayolları (v2.112). `B` tuşu bölmeye bağlıydı; A–B için hiç
// kısayol yoktu. Artık: A = başlangıç, B = bitiş, K = döngü aç/kapa.
const LOOP_KEYS = Object.freeze({ a: 'a', b: 'b', toggle: 'k' });
// Döngü aç/kapa — TEK KAYNAK (v2.112). Hem 🔁 düğmesi hem K tuşu bunu çağırır;
// iki ayrı kopya mantık ayrışmasın (v2.99'daki sayaç/filtre dersinin tekrarı).
function toggleLoop(m, player, index) {
  const L = loopRange(m);
  if (!L) {
    showToast('Önce A ve B noktalarını belirleyin (A ve B tuşları).');
    return false;
  }
  L.on = !L.on;
  if (L.on && player) {
    try {
      player.currentTime = L.a;
    } catch (e) {}
    ensureSegStopListener(player);
    player.__segStop.stopAt = L.b;
    player.__segStop.materialId = m.id;
    player.__segStop.index = index;
    segPlayback = { materialId: m.id, index, playing: true, atEnd: false };
    player.play().catch(() => {});
    refreshPlayButtons();
    showToast(`Döngü açık: ${loopLabel(m)} — bölüm sınırları değişmedi. K ile kapatın.`);
  } else {
    if (player && player.__segStop) player.__segStop.stopAt = null;
    showToast('Döngü kapalı.');
  }
  refreshSegWave(m, Number.isInteger(index) ? index : 0);
  return L.on;
}
// Bölüm bitişinde durmayı sağlayan tek dinleyici. Önceki sürümde her çalma yeni
// bir timeupdate dinleyicisi ekliyor, bazıları kaldırılmıyordu; bu da üst üste
// durma çağrılarına yol açıyordu.
function ensureSegStopListener(player) {
  if (player.__segStop) return;
  const onTime = () => {
    const st = player.__segStop;
    if (!st) return;
    if (st.materialId) {
      const mm = currentCase()?.materials.find((x) => x.id === st.materialId);
      if (mm) {
        // ESKİ İNDEKS DEĞİL (v2.147): otomatik geçişte çalan bölüm aktif olandır.
        const idxNow = activeSegIndex(mm);
        renderKaraoke(mm, idxNow);
        paintSpecOverlay(mm, idxNow, null);
      }
    }
    if (st.stopAt != null && player.currentTime >= st.stopAt - 0.01) {
      // A–B döngüsü açıksa durmak yerine A'ya sar ve çalmaya devam et.
      const L = st.materialId ? loopRange(currentCase()?.materials.find((x) => x.id === st.materialId)) : null;
      if (L && L.on) {
        try {
          player.currentTime = L.a;
        } catch (e) {}
        player.play().catch(() => {});
        return;
      }
      player.pause();
      st.stopAt = null;
      segPlayback.playing = false;
      segPlayback.atEnd = true;
      refreshPlayButtons();
      if (st.materialId) {
        const mm = currentCase()?.materials.find((x) => x.id === st.materialId);
        if (mm) hideKaraoke(mm);
      }
    }
  };
  player.__segStop = onTime;
  player.addEventListener('timeupdate', onTime);
  player.addEventListener('ended', () => {
    segPlayback.playing = false;
    segPlayback.atEnd = true;
    refreshPlayButtons();
  });
}
// Yalnızca oynatma düğmelerinin metnini/sınıfını günceller; panel yeniden çizilmez.
function refreshPlayButtons() {
  // Ana oynat düğmesi: çalıyorsa "⏸ Duraklat".
  document.querySelectorAll('[data-main-play]').forEach((btn) => {
    const id = btn.dataset.mainPlay;
    const playing = segPlayback.materialId === id && segPlayback.playing;
    btn.textContent = playing ? '⏸ Duraklat' : '▶ Çal';
    btn.classList.toggle('on', playing);
  });
  document.querySelectorAll('.audio-card').forEach((card) => {
    const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
    const btn = card.querySelector('[data-play-active]');
    const stop = card.querySelector('[data-stop-active]');
    if (!btn) return;
    const isThis = segPlayback.materialId === id;
    const playing = isThis && segPlayback.playing;
    btn.textContent = playing ? '⏸ Duraklat' : '▶ Dinle';
    btn.classList.toggle('on', playing);
    if (stop) stop.disabled = !isThis;
  });
}
// ---- Takip modu (film gibi izleme) ----
// Ana oynatıcı çalarken aktif bölüm otomatik değişir, bölüm listesi kendiliğinden
// kayar ve metin canlı vurgulanır. Uzman hiç kaydırma yapmaz; yalnız dinler.
// Uydurma zamanlama yoktur: vurgu gerçek oynatma konumundan hesaplanır.
let followTimer = null;
// Kullanıcı "listeye dön" dediyse bu oturumda otomatik çalışma moduna girme.
// TAKİP MODU — İKİ AYRI KAVRAM (v2.119).
// Kullanıcı haklıydı: tek düğme iki işi birden yapıyordu ve isimleri karışıyordu.
//   autoAdvance   : çalarken sol listede BİR SONRAKİ bölüme otomatik geçiş
//   liveHighlight : sağ panelde okunan kelimenin CANLI vurgusu
// İkisi bağımsız açılabilir. Varsayılan: İKİSİ DE KAPALI.
const FOLLOW_MODES = ['autoAdvance', 'liveHighlight'];
// Otomatik başlatma YALNIZ kullanıcı açıkça açtıysa (tercih true).
// `followState` her zaman false başlar; tercih ayrı saklanır.
// ONAYDAN SONRA SONRAKİ BEKLEYENE GEÇ (v2.151) — İSTEĞE BAĞLI, VARSAYILAN
// KAPALI. "Tek düğme iki iş yapmaz": takip modlarından AYRI bir tercihtir.
// Bekleyen bölüm yoksa YERİNDE kalınır; başa dönülmez (yorgunlukla yanlış
// bölüme atlamak, sessiz hata üretir).
const NEXT_PENDING_KEY = 'akis.nextPending';
function nextPendingIndex(segments, from) {
  const segs = Array.isArray(segments) ? segments : [];
  const start = Number.isInteger(from) ? from + 1 : 0;
  for (let i = Math.max(0, start); i < segs.length; i++) {
    if (!isReviewed(segs[i])) return i;
  }
  return -1;
}
function nextPendingPref() {
  try {
    return localStorage.getItem(NEXT_PENDING_KEY) === '1';
  } catch (e) {
    return false;
  }
}
function setNextPending(on) {
  try {
    localStorage.setItem(NEXT_PENDING_KEY, on ? '1' : '0');
  } catch (e) {}
  renderBehaviorPanel();
  showToast(on ? 'Onaydan sonra sonraki bekleyen bölüme geçilecek.' : 'Onaydan sonra bir sonraki bölümde kalınacak.');
}
// Ayarlar çekmecesindeki "Onay davranışı" bölümü. Metin ve durum TEK KAYNAK.
function behaviorPanelHtml() {
  const on = nextPendingPref();
  return `<div class="panel behavior-panel">
    <div class="panel-heading"><div><div class="eyebrow">ONAY DAVRANIŞI</div>
      <h3>Onaydan sonra ne olsun?<span class="info-i" tabindex="0" data-tip="Açıkken, bir bölümü onayladığınızda uygulama sıradaki KONTROL EDİLMEMİŞ bölüme geçer. Bekleyen bölüm yoksa bulunduğunuz yerde kalır. Yalnız bu tarayıcıda saklanır; kayda ve rapora yazılmaz.">i</span></h3></div></div>
    <button class="behavior-toggle ${on ? 'on' : ''}" id="nextPendingToggle" aria-pressed="${on}" title="Açıkken onay sonrası sıradaki kontrol edilmemiş bölüme geçilir. Varsayılan: kapalı.">
      <span class="behavior-state">${on ? 'AÇIK' : 'KAPALI'}</span>
      <span class="behavior-text"><b>Sonraki bekleyene geç</b><small>${on ? 'Onaydan sonra sıradaki kontrol edilmemiş bölüme geçilir.' : 'Onaydan sonra bir sonraki bölümde kalınır.'}</small></span>
    </button>
  </div>`;
}
function renderBehaviorPanel() {
  const host = $('#behaviorHost');
  if (host) host.innerHTML = behaviorPanelHtml();
}
function followShouldAutoStart(pref) {
  return !!(pref && pref.autoFollow === true);
}
// TEKNİK BÖLÜM TERCİHİ (v2.154). Tek panel, iki bölge: METİN (asıl iş) ve
// TEKNİK (dalga/zaman/konuşmacı/gözlem). Varsayılan KAPALI: deşifre yazarken
// metin alanı tüm yüksekliği alır. Tercih yalnız bu tarayıcıda saklanır.
const TECH_KEY = 'akis.techOpen';
function techOpenPref() {
  try {
    return localStorage.getItem(TECH_KEY) === '1';
  } catch (e) {
    return false;
  }
}
function setTechOpen(on) {
  try {
    localStorage.setItem(TECH_KEY, on ? '1' : '0');
  } catch (e) {}
}
// Takip modu durumu (dosya bazlı saklanır: case.followMode).
const followState = { on: false, autoAdvance: false, liveHighlight: false };
// `setFollow(on, mode)` — v2.119: iki bağımsız mod.
// mode verilmezse eski davranış (ikisi birden) korunur (geriye dönük).
function setFollow(on, mode) {
  if (mode && FOLLOW_MODES.includes(mode)) {
    followState[mode] = !!on;
  } else {
    followState.autoAdvance = !!on;
    followState.liveHighlight = !!on;
  }
  followState.on = !!(followState.autoAdvance || followState.liveHighlight);
  document.body.classList.toggle('follow-on', followState.on);
  const c = currentCase();
  if (c) {
    c.followMode = followState.on;
    persist();
  }
  // KULLANICI TERCİHİ HATIRLANIR: açtıysa bir sonraki açılışta da açılır.
  // (Yalnız kullanıcı EYLEMİYLE açıldığında yazılır; otomatik açma yok.)
  try {
    localStorage.setItem('akis.followPref', JSON.stringify({ autoFollow: followState.on }));
  } catch (e) {}
  refreshFollowButtons();
  // Canlı vurgu açıldıysa şerit YER TUTUCU olarak hemen kurulur (v2.148):
  // oynatma anında sayfa zıplamasın.
  const mm = activeMaterial();
  if (mm) ensureFollowStrip(mm, activeSegIndex(mm));
  // Takip zamanlayıcısı yalnız "otomatik geçiş" için gerekir; canlı vurgu
  // oynatma olaylarıyla (timeupdate) zaten besleniyor.
  if (followState.autoAdvance) startFollow();
  else stopFollow();
}
function refreshFollowButtons() {
  // İKİ AYRI DÜĞME (v2.119): her mod kendi durumunu gösterir.
  document.querySelectorAll('[data-follow-mode]').forEach((b) => {
    const mode = b.dataset.followMode;
    const on = !!followState[mode];
    b.classList.toggle('on', on);
    const base = mode === 'autoAdvance' ? 'Otomatik geçiş' : 'Canlı vurgu';
    b.textContent = (on ? '⏸ ' : '') + base;
  });
  document.body.classList.toggle('follow-on', !!(followState.autoAdvance || followState.liveHighlight));
}
function startFollow() {
  stopFollow();
  followTimer = setInterval(followTick, 120);
}
function stopFollow() {
  if (followTimer) {
    clearInterval(followTimer);
    followTimer = null;
  }
}
// Oynatma konumuna göre aktif bölümü seç, listeyi kaydır, metni vurgula.
// ZAMAN t İÇİN BÖLÜM SEÇİMİ — SAF (v2.145).
// NEDEN: çakışan aralıklarda "t'yi içeren İLK bölüm" seçilince, oynatma
// sonraki bölüme geçtiğinde zaman geriye atlıyor ve vurgu ÖNCEKİ bölüme
// dönüyordu (kullanıcı: "bir önceki segment bir sonrakiyle karışıyor").
// KURAL: t hâlâ AKTİF bölümün aralığındaysa aktif kalır; değilse t'yi içeren
// ilk bölüm; o da yoksa t'den sonra başlayan ilk bölüm.
function segmentIndexAtTime(segments, t, preferIdx = -1) {
  const segs = Array.isArray(segments) ? segments : [];
  const span = (s) => {
    const a = parseTimecodeStrict(s && s.start);
    const b = parseTimecodeStrict(s && s.end);
    if (a == null || b == null) return null;
    return [a, b > a ? b : a + 0.01];
  };
  if (preferIdx >= 0 && preferIdx < segs.length) {
    const r = span(segs[preferIdx]);
    if (r && t >= r[0] && t < r[1]) return preferIdx;
  }
  for (let i = 0; i < segs.length; i++) {
    const r = span(segs[i]);
    if (r && t >= r[0] && t < r[1]) return i;
  }
  for (let i = 0; i < segs.length; i++) {
    const r = span(segs[i]);
    if (r && r[0] > t) return i;
  }
  return -1;
}
function followTick() {
  // Yalnız "otomatik bölüm geçişi" modu bu zamanlayıcıyı kullanır (v2.119).
  // Canlı vurgu oynatma olaylarıyla beslenir; listede gezinmez.
  if (!followState.autoAdvance) return;
  const m = activeMaterial();
  if (!m) return;
  const segs = m.segments || [];
  if (!segs.length) return;
  // Kart, AKTİF kaydın kartı olmalı. v2.77 ve öncesinde document.querySelector
  // ilk ses kartını alıyordu; birden fazla kayıt varsa yanlış dosyanın konumu
  // okunuyor ve takip hiç ilerlemiyordu (kullanıcı: "takip çalışmıyor").
  const card = document.querySelector(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  const player = card && card.querySelector('audio');
  if (!player) return;
  if (player.paused) return; // duraklatınca takip bekler, konum korunur
  const t = player.currentTime;
  // t'yi içeren bölümü bul; ÇAKIŞMADA aktif bölüm korunur (v2.145).
  const idx = segmentIndexAtTime(segs, t, Number.isInteger(m.activeSeg) ? m.activeSeg : -1);
  if (idx < 0) return;
  if (m.activeSeg !== idx) {
    m.activeSeg = idx;
    followHighlight(m, idx);
  }
  followKaraoke(m, idx, t);
}
// Listede aktif bölümü işaretle ve görünür alana getir (yalnız liste kayar).
// Takip sırasında sağ paneli GÜNCELLER ama baştan ÇİZMEZ.
// Neden: renderSegDetail innerHTML'i sıfırlar → scroll sıfırlanır, düğme
// metinleri eskir, panel kıpırdar (kullanıcı bildirimi: "sağ detay kıpırdıyor,
// scroll çıkıyor, Dinle çalışıyor gibi görünüyor").
// Yalnızca değişen alanlar (bölüm no, zamanlar, metin, konuşmacı, kontrol)
// yerinde yazılır. Panel DOM'u korunur → kıpırdama yok.
function syncSegDetailInPlace(m, idx) {
  const detail = $(`#seg-detail-${CSS.escape(m.id)}`);
  if (!detail) return;
  const s = (m.segments || [])[idx];
  if (!s) return;
  const segs = m.segments || [];
  const q = (sel) => detail.querySelector(sel);
  const setVal = (sel, val) => { const el = q(sel); if (el && el.value !== val) el.value = val; };
  const setTxt = (sel, val) => { const el = q(sel); if (el && el.textContent !== val) el.textContent = val; };
  // Seçiciler segDetailHtml() ile AYNI olmalı. v2.77 ve öncesinde burada
  // .seg-detail-head / .seg-times / .seg-meta-row / .seg-text-wrap yazıyordu;
  // panel v2.62'de .sd-head / .sd-times / .sd-meta / .sd-text olarak
  // yeniden yazıldığı için hiçbir alan eşleşmiyordu. Sonuç: takip modunda
  // bölüm listesi ilerliyor, sağ panel eski bölümde kalıyordu — kullanıcının
  // "takip etmiyor" gözlemi buydu.
  const head = segHeadParts(idx, segs.length);
  setTxt('.sd-head .sd-idx', head.label);
  setTxt('.sd-head .sd-of', head.of);
  const times = detail.querySelectorAll('.sd-times .sd-time input');
  if (times[0] && times[0].value !== (s.start || '')) times[0].value = s.start || '';
  if (times[1] && times[1].value !== (s.end || '')) times[1].value = s.end || '';
  setTxt('.sd-times .sd-dur', fmtShort(Math.max(0, secondsFromTimecode(s.end) - secondsFromTimecode(s.start))));
  const meta = detail.querySelectorAll('.sd-meta .sd-field');
  const spkSel = meta[0]?.querySelector('select');
  if (spkSel) {
    const want = s.speaker || '';
    if (spkSel.value !== want) {
      // Liste bölümün konuşmacısını içermiyorsa seçenek olarak ekle; aksi hâlde
      // tarayıcı sessizce ilk seçeneği gösterir ve kullanıcı yanlış kişiyi görür.
      if (want && ![...spkSel.options].some((o) => o.value === want)) {
        spkSel.insertAdjacentHTML('beforeend', `<option value="${esc(want)}">${esc(want)} (kayıtlı değil)</option>`);
      }
      spkSel.value = want;
    }
  }
  // Bölüm değişince GÖRÜNÜM DALGAYA DÖNER (v2.121): eski bölümün spektrogramı
  // kalırsa yanlış izlenim olur. Dalga tekrar görünür, spektrogram gizlenir.
  // Bölüm değişince analiz görünümü KORUNUR; spektrogram yeni bölüm için
  // yeniden hesaplanır (v2.128). Dalga ve spek aynı kutuda kalır.
  if (techOpenPref()) setAnalysisMode(m, analysisMode);
  setVal('.sd-text textarea', s.text || '');
  const sel = meta[1]?.querySelector('select');
  if (sel) {
    const rev = segReview(s);
    if (sel.value !== rev) sel.value = rev;
    sel.dataset.state = rev;
  }
  // data-seg indeksleri yeni bölüme göre güncellenmeli (düzenleme doğru
  // bölüme yazsın). Tüm data-seg taşıyan alanları yeniden işaretle.
  detail.querySelectorAll('[data-seg]').forEach((el) => { el.dataset.seg = String(idx); });
  detail.querySelectorAll('[data-nudge]').forEach((el) => {
    const p = el.dataset.nudge.split('|');
    el.dataset.nudge = `${idx}|${p[1]}|${p[2]}`;
  });
  detail.querySelectorAll('[data-quick-tag]').forEach((el) => {
    const p = el.dataset.quickTag.split('|');
    el.dataset.quickTag = `${idx}|${p[1]}`;
  });
  detail.querySelectorAll('[data-quick-clear]').forEach((el) => { el.dataset.quickClear = String(idx); });
  detail.querySelectorAll('[data-obs]').forEach((el) => {
    const p = el.dataset.obs.split('|');
    el.dataset.obs = `${idx}|${p[1]}`;
  });
  ['data-history', 'data-silence', 'data-split-seg', 'data-retranscribe-seg', 'data-merge-next', 'data-delete-seg', 'data-approve-seg'].forEach((k) => {
    detail.querySelectorAll(`[${k}]`).forEach((el) => {
      el.setAttribute(k, String(idx));
    });
  });
  detail.querySelectorAll('[data-review-set]').forEach((el) => {
    const p = el.dataset.reviewSet.split('|');
    el.dataset.reviewSet = `${idx}|${p[1]}`;
  });
  // Gözlem düğmelerinin "on" durumu yeni bölüme göre.
  detail.querySelectorAll('[data-obs]').forEach((el) => {
    const key = el.dataset.obs.split('|')[1];
    el.classList.toggle('on', !!(s.obs && s.obs[key]));
  });
  // Zoom dalgası yeni bölüme bağlanmalı.
  attachZoomWave(m, idx);
  // Başlıktaki "Dinle" düğmesi ve dalga, yeni bölüme göre tazelenir.
  const playBtn = detail.querySelector('[data-play-active]');
  if (playBtn) {
    const playing = segPlayback.materialId === m.id && segPlayback.index === idx && segPlayback.playing;
    const label = playing ? '⏸ Duraklat' : '▶ Dinle';
    if (playBtn.textContent.trim() !== label) playBtn.textContent = label;
    playBtn.classList.toggle('on', playing);
  }
  const stopBtn = detail.querySelector('[data-stop-active]');
  if (stopBtn) stopBtn.disabled = !(segPlayback.materialId === m.id);
  const obs = s.obs || {};
  detail.querySelectorAll('[data-obs]').forEach((el) => {
    const key = el.dataset.obs.split('|')[1];
    el.classList.toggle('on', !!obs[key]);
  });
  // Dalga yeniden çizilir: bölüm değişince görünüm penceresi de değişir.
  if (typeof refreshSegWave === 'function') refreshSegWave(m, idx);
}
function followHighlight(m, idx) {
  const root = $(`#segments-${CSS.escape(m.id)}`);
  if (!root) return;
  const items = root.querySelectorAll('.seg-item');
  items.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.segItem) === idx));
  scrollListToItem(root.querySelector('.seg-list'), root.querySelector(`.seg-item[data-seg-item="${idx}"]`));
  // Sağ panel yerinde güncellenir (yeniden çizilmez) → kıpırdama ve scroll
  // sıfırlanması olmaz, düğme metinleri doğru kalır.
  syncSegDetailInPlace(m, idx);
}
// Konuşulan yeri canlı vurgula: kelime zamanı varsa kelime, yoksa bölüm metni.
// Sağ paneldeki metin alanının üstünde "şu an okunan" vurgusunu gösterir.
// Kelime zamanlaması varsa kelime kelime, yoksa oransal ilerleme.
// KARAOKE — SABİT PARÇALAR + SINIF DEĞİŞİMİ (v2.116).
// NEDEN: v2.115 ve öncesinde `markTextFollow` HER 120ms'de `bar.innerHTML`
// yazıyordu → 3 saniyede 25 DOM değişikliği → METİN TİTRİYORDU. Kullanıcı
// okurken metin kayıyordu. Kural: parçalar BİR KEZ çizilir, her tick'te yalnız
// `on`/`done` SINIFI değişir (DOM yapısı korunur, titreme olmaz).
// Parçalar: kelime zamanı varsa kelime, yoksa metin parçaları (oransal).
function karaokeSegments(s) {
  if (!s) return [];
  const words = Array.isArray(s.words) && s.words.length ? s.words : null;
  if (words) {
    return words
      .map((w) => ({
        w: String(w.w || ''),
        s: secondsFromTimecode(w.s),
        e: secondsFromTimecode(w.e)
      }))
      .filter((x) => x.w);
  }
  const text = String(s.text || '').trim();
  if (!text) return [];
  const a = secondsFromTimecode(s.start);
  const b = secondsFromTimecode(s.end);
  const span = b > a ? b - a : 0;
  // Kelime sınırlarından böl (boşluk korunur): sabit sayıda parça.
  const parts = text.split(/(\s+)/).filter((p) => p.length);
  const visible = parts.filter((p) => p.trim());
  const step = visible.length ? span / visible.length : 0;
  let k = 0;
  return parts.map((p) => {
    const isWord = !!p.trim();
    const idx = isWord ? k++ : -1;
    return {
      w: p,
      s: isWord ? a + idx * step : NaN,
      e: isWord ? a + (idx + 1) * step : NaN
    };
  });
}
// Zaman → aktif parça indeksi. -1: hiçbiri (bölüm dışı veya boşluk).
function karaokeActiveIndex(segments, t) {
  const list = Array.isArray(segments) ? segments : [];
  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    if (!Number.isFinite(x.s) || !Number.isFinite(x.e)) continue;
    if (t >= x.s && t < x.e + 0.001) return i;
  }
  return -1;
}
// CÜMLE SINIRI (v2.125): takip şeridi SABİT 2 satırlık pencerede o anki
// cümleyi gösterir. Sınır: bitiş noktalaması VEYA kelimeler arası ≥0,4 sn
// sessizlik. Kelime zamanı yoksa yalnız noktalama; hiçbiri yoksa tek cümle.
const SENTENCE_GAP = 0.4;
const SENTENCE_END = /[.!?…;:]["'”’)]?$/;

/** Karaoke parçalarını cümle aralıklarına böler (indeksler `segs` içindedir). */
function karaokeSentences(segs) {
  const list = Array.isArray(segs) ? segs : [];
  const wordIdx = [];
  for (let i = 0; i < list.length; i++) if (Number.isFinite(list[i].s)) wordIdx.push(i);
  if (!wordIdx.length) return [];
  const ranges = [];
  let start = 0;
  for (let k = 1; k < wordIdx.length; k++) {
    const prev = list[wordIdx[k - 1]];
    const cur = list[wordIdx[k]];
    const gap = cur.s - prev.e;
    const ends = SENTENCE_END.test(String(prev.w || '').trim());
    if (ends || (Number.isFinite(gap) && gap >= SENTENCE_GAP)) {
      ranges.push({ from: wordIdx[start], to: wordIdx[k - 1] });
      start = k;
    }
  }
  ranges.push({ from: wordIdx[start], to: wordIdx[wordIdx.length - 1] });
  return ranges;
}

/** Aktif kelime hangi cümlede? Bulunamazsa -1. */
function activeSentenceIndex(ranges, activeIdx) {
  if (!Array.isArray(ranges) || activeIdx < 0) return -1;
  for (let i = 0; i < ranges.length; i++) {
    if (activeIdx >= ranges[i].from && activeIdx <= ranges[i].to) return i;
  }
  return -1;
}

// TAKİP ŞERİDİ HANGİ BÖLÜMÜ GÖSTERİR — SAF (v2.147).
// NEDEN: bölüm oynatıcısının `timeupdate`i, çalmaya BAŞLADIĞI indeksi
// (`__segStop.index`) kullanıyordu. Otomatik geçiş bir sonraki bölüme geçince
// şerit eski bölümün metnine dönüyordu (gerçek sesle ölçüldü: 1,3 sn'de 5 kez).
// KURAL: otomatik geçiş açıkken şerit AKTİF bölümü gösterir.
function followStripIndex(m, idx, autoAdvance) {
  if (autoAdvance && m && Number.isInteger(m.activeSeg)) return m.activeSeg;
  return idx;
}
// TAKİP ŞERİDİ YER TUTUCUSU (v2.148).
// NEDEN: şerit yalnız OYNATMA başlayınca DOM'a ekleniyordu; iki satırlık kutu
// metni aşağı itiyor, sayfa oynatma anında zıplıyordu. Canlı vurgu açıksa
// şerit ÖNCEDEN (boş yer tutucu olarak) kurulur; oynatma yalnız METNİ değiştirir.
function ensureFollowStrip(m, idx) {
  const wrap = document.querySelector(`#seg-detail-${CSS.escape(m.id)} .sd-text`);
  if (!wrap) return;
  const bar = wrap.querySelector('.sd-follow');
  if (!followState.liveHighlight) {
    if (bar) bar.remove();
    return;
  }
  if (bar) return;
  const el = document.createElement('div');
  el.className = 'sd-follow is-placeholder';
  el.textContent = 'Canlı vurgu açık — oynatınca okunan cümle burada görünür.';
  wrap.insertBefore(el, wrap.firstChild);
}
function markTextFollow(m, idx, t) {
  idx = followStripIndex(m, idx, followState.autoAdvance);
  const wrap = document.querySelector(`#seg-detail-${CSS.escape(m.id)} .sd-text`);
  if (!wrap) return;
  // CANLI VURGU KAPALIYSA ÇİZME (v2.119): kullanıcı istemediyse metin vurgusu
  // görünmez. Takip şeridi de temizlenir.
  if (!followState.liveHighlight) {
    wrap.querySelector('.sd-follow')?.remove();
    delete wrap.__karaokeKey;
    delete wrap.__followSentence;
    return;
  }
  const s = (m.segments || [])[idx];
  const toPlaceholder = () => {
    // Yerleşim SABİT kalır: şerit silinmez, yer tutucuya döner (v2.148).
    const bar = wrap.querySelector('.sd-follow');
    if (bar) {
      bar.classList.add('is-placeholder');
      bar.textContent = 'Canlı vurgu açık — oynatınca okunan cümle burada görünür.';
    }
    delete wrap.__karaokeKey;
    delete wrap.__followSentence;
  };
  if (!s || !s.text || isHallucination(s.text)) {
    toPlaceholder();
    return;
  }
  const segs = karaokeSegments(s);
  if (!segs.length) {
    toPlaceholder();
    return;
  }
  // SABİT PENCERE (v2.125): yalnız O ANKİ CÜMLE gösterilir. Kutu yüksekliği
  // metne göre değişmez; içerik 2 satıra sığmazsa SATIR SATIR kayar (5 satır
  // atlama yok). Aktif kelime yalnız arka planla vurgulanır → satır kaymaz.
  const ranges = karaokeSentences(segs);
  const active = karaokeActiveIndex(segs, t);
  let si = activeSentenceIndex(ranges, active);
  if (si < 0) {
    si = Number.isInteger(wrap.__followSentence) && ranges[wrap.__followSentence] ? wrap.__followSentence : 0;
  }
  const range = ranges[si] || { from: 0, to: segs.length - 1 };
  // ANAHTAR: bölüm + cümle + metin. Değişmedikçe DOM YENİDEN YAZILMAZ.
  // v2.115'te her tick'te innerHTML yazılıyordu → titreme (25 değişiklik/3sn).
  const key = `${idx}|${si}|${s.text}`;
  let bar = wrap.querySelector('.sd-follow');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'sd-follow';
    wrap.insertBefore(bar, wrap.firstChild);
  }
  bar.classList.remove('is-placeholder');
  if (wrap.__karaokeKey !== key) {
    // Kelime listesi boşluk parçası taşımıyorsa (ASR `words` yalnız kelimeleri
    // verir) kelimeler arasına boşluk KONUR; aksi hâlde metin tek kelime gibi
    // taşar ve satır kırılmaz (v2.125 ölçümü: 30 kelime 2 satıra sığmıyordu).
    const hasSpaces = segs.some((x) => !x.w.trim());
    let firstWord = true;
    bar.innerHTML = segs
      .slice(range.from, range.to + 1)
      .map((x, k) => {
        const gi = range.from + k;
        if (!x.w.trim()) return esc(x.w);
        const lead = !hasSpaces && !firstWord ? ' ' : '';
        firstWord = false;
        return `${lead}<span data-k="${gi}">${esc(x.w)}</span>`;
      })
      .join('');
    wrap.__karaokeKey = key;
    wrap.__followSentence = si;
    bar.__active = -2;
    bar.scrollTop = 0;
  }
  // Yalnız SINIF değişir: aktif parça `on`, öncekiler `done`. DOM sabit → titreme yok.
  if (bar.__active !== active) {
    const spans = bar.querySelectorAll('span[data-k]');
    spans.forEach((el) => {
      const i = Number(el.dataset.k);
      el.classList.toggle('on', i === active);
      el.classList.toggle('done', active >= 0 ? i < active : false);
    });
    bar.__active = active;
    // 2 satırlık sabit pencere: aktif kelime görünür alanın dışına çıkarsa
    // SATIR SATIR kaydır. Aşağı çıkınca kelime İKİNCİ satıra gelir (bir satır
    // ilerler); yukarı çıkınca ilk satıra gelir. Konum MUTLAK hesaplanır.
    const act = bar.querySelector('span.on');
    if (act && bar.scrollHeight > bar.clientHeight + 1) {
      const bt = bar.getBoundingClientRect();
      const at = act.getBoundingClientRect();
      if (at.top < bt.top + 1 || at.bottom > bt.bottom - 1) {
        const lh = Math.max(1, parseFloat(getComputedStyle(bar).lineHeight) || 16);
        const lineTop = Math.floor((at.top - bt.top + bar.scrollTop) / lh) * lh;
        const target = at.top < bt.top + 1 ? lineTop : lineTop - lh;
        const max = Math.max(0, bar.scrollHeight - bar.clientHeight);
        bar.scrollTop = Math.max(0, Math.min(target, max));
      }
    }
  }
}
// TAKİP ALT YAZISI — TEK ALAN (v2.116).
// NEDEN: v2.115 ve öncesinde aynı metin ÜÇ yerde gösteriliyordu:
//   1) `.karaoke` kutusu (innerHTML her tick yeniden yazılıyordu → TİTREME)
//   2) `.sd-follow` şeridi (aynı metin, ikinci kez)
//   3) `.sd-text textarea` (düzenlenebilir asıl metin)
// Kullanıcı haklıydı: "neden iki tane alan koyduk bilemiyorum". Artık karaoke
// kutusu KULLANILMAZ (gizli kalır); takip yalnız `.sd-follow` ile yapılır.
// Bu, `markTextFollow`'un sınıf-tabanlı (titremesiz) yoludur.
function followKaraoke(m, idx, t) {
  const box = $(`#karaoke-${CSS.escape(m.id)}`);
  // Karaoke kutusu varsa gizle: aynı metni ikinci kez göstermenin anlamı yok.
  if (box) {
    if (!box.hidden) box.hidden = true;
    box.innerHTML = '';
  }
  markTextFollow(m, idx, t);
}
// Karaoke vurgulaması: çalma sırasında o an konuşulan kelime (kelime zamanı
// varsa) ya da bölüm metni vurgulanır. Kelime zamanı yoksa bölüm aralığına göre
// tüm metin "okunuyor" olarak işaretlenir; uydurma zamanlama yapılmaz.
// KARAOKE KUTUSU KALDIRILDI (v2.119).
// NEDEN: v2.118'de bu fonksiyon HER `timeupdate`'te `box.innerHTML` yazıyordu.
// Aynı metin iki yerde (karaoke + sd-follow) gösteriliyor, karaoke olan
// sürekli yeniden yazıldığı için BOZULUYORDU ("sabit değil" — canlı veri).
// Tek görsel alan `.sd-follow`dur ve sınıf-tabanlı çalışır (v2.116).
// Bu fonksiyon artık yalnız delege eder; karaoke kutusu DOM'da tutulmaz.
function renderKaraoke(m, index) {
  const box = $(`#karaoke-${CSS.escape(m.id)}`);
  if (box) {
    // Kalıntı kutu varsa temizle ve gizle (eski DOM/önbellek).
    if (!box.hidden) box.hidden = true;
    if (box.innerHTML) box.innerHTML = '';
  }
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  const player = card?.querySelector('audio');
  const now = player && Number.isFinite(player.currentTime) ? player.currentTime : null;
  if (now == null) return;
  markTextFollow(m, index, now);
}
function hideKaraoke(m) {
  const box = $(`#karaoke-${CSS.escape(m.id)}`);
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
}
function playSegmentRange(card, m, s, index, { restart = false } = {}) {
  const player = card.querySelector('audio');
  if (!player) return;
  resumeAudioGraph(m);
  const start = secondsFromTimecode(s.start);
  const end = secondsFromTimecode(s.end);
  ensureSegStopListener(player);
  const same = segPlayback.materialId === m.id && segPlayback.index === index;
  player.playbackRate = m.playbackRate || 1;
  if (same && segPlayback.playing) {
    player.pause();
    segPlayback.playing = false;
    refreshPlayButtons();
    return;
  }
  if (
    same &&
    !segPlayback.playing &&
    !restart &&
    player.currentTime > start + 0.05 &&
    player.currentTime < end - 0.05
  ) {
    // Duraklatılmış konumdan devam et. Döngü açıksa B'de dur (v2.112).
    player.__segStop.stopAt = loopStopTarget(m, end);
    player.__segStop.materialId = m.id;
    player.__segStop.index = index;
    segPlayback.playing = true;
    player.play().catch(() => {});
    refreshPlayButtons();
    return;
  }
  try {
    player.currentTime = start;
  } catch (e) {}
  // DÖNGÜ KORUNUR (v2.112): açıksa durma noktası B'dir, bölüm sonu değil.
  player.__segStop.stopAt = loopStopTarget(m, end > start ? end : null);
  player.__segStop.materialId = m.id;
  player.__segStop.index = index;
  segPlayback = { materialId: m.id, index, playing: true, atEnd: false };
  player.play().catch(() => {});
  // OTOMATİK AÇMA YOK (v2.119): "Dinle" de takibi kendiliğinden açmaz.
  if (Number.isInteger(index)) {
    m.activeSeg = index;
    const root = $(`#segments-${CSS.escape(m.id)}`, card);
    if (root) {
      root
        .querySelectorAll('.seg-item')
        .forEach((el) => el.classList.toggle('is-active', Number(el.dataset.segItem) === index));
    }
    renderSegDetail(m);
  }
  showToast(`Bölüm ${(index ?? 0) + 1} dinleniyor: ${s.start || '—'}–${s.end || '—'}`);
}
// Durdur: çalmayı keser ve bölüm başına sarar.
function stopSegmentPlayback(m) {
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  const player = card?.querySelector('audio');
  if (!player) return;
  player.pause();
  const idx = Number.isInteger(segPlayback.index) ? segPlayback.index : Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  const s = (m.segments || [])[idx];
  if (s) {
    try {
      player.currentTime = secondsFromTimecode(s.start);
    } catch (e) {}
  }
  if (player.__segStop) player.__segStop.stopAt = null;
  segPlayback = { materialId: m.id, index: idx, playing: false, atEnd: false };
  hideKaraoke(m);
  refreshPlayButtons();
  showToast('Dinleme durduruldu.');
}
function playSegment(btn) {
  const card = btn.closest('.audio-card');
  if (!card) return;
  const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
  const m = currentCase().materials.find((x) => x.id === id);
  const i = Number(btn.dataset.playSeg);
  const s = m?.segments?.[i];
  if (!s) return;
  playSegmentRange(card, m, s, i);
}
// Bölümü, oynatıcının geçerli konumundan ikiye böler. Uzun bir bölümün ortası
// ayrı bir konuşma içeriyorsa uzman kaydı dinlerken buradan ayırır.
// Bölme sırasında metni paylaştırır.
// 1) Kelime zamanlaması (words) varsa: kesim anından önceki kelimeler sola,
//    sonrakiler sağa. En doğru yöntem; model bu bilgiyi veriyorsa kullanılır.
// 2) Kelime zamanlaması yoksa: metni kesim oranına göre kelime sınırından
//    bölmeyi dener (yaklaşık). Bu bir TAHMİNDİR; kullanıcı kontrol etmeli.
// 3) Hiçbiri mümkün değilse: metin ikiye kopyalanır (autoSplit=false).
function splitSegmentText(s, cut) {
  const text = s.text || '';
  const words = Array.isArray(s.words) ? s.words : [];
  const st = secondsFromTimecode(s.start);
  const en = secondsFromTimecode(s.end);

  // 1) Kelime zamanlaması
  if (words.length) {
    const leftWords = [];
    const rightWords = [];
    for (const w of words) {
      const ws = secondsFromTimecode(w.s);
      (ws < cut ? leftWords : rightWords).push(w);
    }
    const leftText = leftWords.map((w) => w.w).join(' ').trim();
    const rightText = rightWords.map((w) => w.w).join(' ').trim();
    if (leftText || rightText) {
      return { leftText, rightText, leftWords, rightWords, autoSplit: true };
    }
  }

  // 2) Oran tahmini: metni kelime sınırından böl
  const span = en - st;
  if (span > 0 && text.trim()) {
    const ratio = Math.min(1, Math.max(0, (cut - st) / span));
    const tokens = text.split(/(\s+)/);
    let acc = 0;
    let bestIdx = -1;
    let bestDiff = Infinity;
    let seen = 0;
    const totalChars = text.length;
    for (let i = 0; i < tokens.length; i++) {
      acc += tokens[i].length;
      seen = acc;
      if (!tokens[i].trim()) continue;
      const r = seen / totalChars;
      const d = Math.abs(r - ratio);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestIdx < tokens.length - 1) {
      const leftText = tokens.slice(0, bestIdx + 1).join('').trim();
      const rightText = tokens.slice(bestIdx + 1).join('').trim();
      if (leftText && rightText) {
        return { leftText, rightText, leftWords: [], rightWords: [], autoSplit: true };
      }
    }
  }

  // 3) Kopyala (kullanıcı temizler)
  return { leftText: text, rightText: text, leftWords: words, rightWords: [], autoSplit: false };
}
function splitSegmentAtPlayer(m, index) {
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  if (!card) return;
  const player = card.querySelector('audio');
  if (!player) return;
  const s = (m.segments || [])[index];
  if (!s) return;
  const a = secondsFromTimecode(s.start),
    b = secondsFromTimecode(s.end);
  const cut = player.currentTime;
  if (!(cut > a + 0.05 && cut < b - 0.05)) {
    showToast('Bölmek için oynatıcıyı bölümün içine getirin ya da dalgada bir noktaya tıklayın.');
    return;
  }
  splitSegmentAt(m, index, cut);
}
// Belirli bir ANDAN böler. Dalga tıklaması ve oynatıcı konumu buradan geçer;
// böylece iki yol aynı davranır.
function splitSegmentAt(m, index, cut) {
  const segs = m.segments || [];
  const s = segs[index];
  if (!s) return;
  snapshotForUndo(`bölüm ${index + 1} bölündü`);
  const parts = splitSegmentText(s, cut);
  const left = { ...s, id: newId('sg'), end: timecode(cut), history: [], words: parts.leftWords };
  const right = { ...s, id: newId('sg'), start: timecode(cut), history: [], words: parts.rightWords };
  left.text = parts.leftText;
  right.text = parts.rightText;
  // ADLİ AYRIM (v2.98): `{...s}` TAM asrText'i iki yarıya kopyalıyordu; oysa
  // modelin çıktısı da metinle aynı oranda paylaştırılmalıdır. Aksi hâlde iki
  // bölüm de "model tüm metni söyledi" der ve adli ayrım bozulur.
  // Otomatik çıktı yoksa uydurulmaz (boş kalır).
  const asrParts = s.asrText ? splitSegmentText({ ...s, text: s.asrText, words: s.words || [] }, cut) : null;
  left.asrText = asrParts ? asrParts.leftText : '';
  right.asrText = asrParts ? asrParts.rightText : '';
  // Yeni bölümler doğrulanmamıştır; metin değiştiği için onay düşer.
  setSegReview(left, 'pending');
  setSegReview(right, 'pending');
  left.textRev = 0;
  right.textRev = 0;
  segs.splice(index, 1, left, right);
  m.activeSeg = index;
  segPlayback = { materialId: null, index: null, playing: false, atEnd: false, stopAt: null };
  persist();
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  if (card) renderSegments(m, card);
  renderOverview();
  const item = card?.querySelector(`#seg-list-${CSS.escape(m.id)} .seg-item[data-seg-item="${index + 1}"]`);
  if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  showToast(
    parts.autoSplit
      ? `Bölüm ${index + 1} ikiye ayrıldı (${timecode(cut)}). Metin de paylaştırıldı — kontrol edin.`
      : `Bölüm ${index + 1} ikiye ayrıldı (${timecode(cut)}). Metin ikiye kopyalandı; her iki bölümü de düzeltin.`
  );
}
function mergeSegmentWithNext(m, index) {
  const segs = m.segments || [];
  const s = segs[index],
    n = segs[index + 1];
  if (!s || !n) {
    showToast('Birleştirilecek sonraki bölüm yok.');
    return;
  }
  snapshotForUndo(`bölüm ${index + 1} birleştirildi`);
  s.end = n.end;
  if ((n.text || '').trim()) {
    const prev = s.text;
    applyTextEdit(s, (s.text || '') + (s.text ? ' ' : '') + n.text);
    pushSegmentHistory(s, prev);
  }
  setSegReview(s, 'pending');
  segs.splice(index + 1, 1);
  m.activeSeg = index;
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  persist();
  if (card) renderSegments(m, card);
  renderOverview();
  showToast(`Bölüm ${index + 1} ile sonraki birleştirildi.`);
}
// Paragraf oluşturma: ardışık ve aynı konuşmacıya ait bölümleri tek paragrafta
// toplar. Metinler boşlukla birleştirilir; zaman aralığı ilk başlangıçtan son
// bitişe genişler. Konuşmacı değiştiğinde yeni paragraf başlar, böylece farklı
// kişilerin sözleri karışmaz. Hiçbir metin uydurulmaz; yalnızca mevcut bölümler
// birleştirilir. Onaylanmamış bölümler paragrafa katıldığında kontrol durumu
// "bekliyor"a döner ki doğrulanmamış içerik onaylı sayılmasın.
// Paragrafa giren bölümlerin model kimliği TEKSE onu döndürür; farklı
// modeller karıştıysa boş string döner (yanlış atıf yapılmaz — v2.98).
function uniformAsrModel(segs) {
  const models = [...new Set((segs || []).map((s) => String(s.asrModel || '').trim()).filter(Boolean))];
  return models.length === 1 ? models[0] : '';
}
function paragraphize(m) {
  const segs = m.segments || [];
  if (segs.length < 2) {
    showToast('Paragraf oluşturmak için en az iki bölüm gerekir.');
    return;
  }
  snapshotForUndo('paragraf oluşturuldu');
  const groups = [];
  let cur = null;
  for (const s of segs) {
    const spk = (s.speaker || '').trim();
    if (cur && cur.speaker === spk) cur.segs.push(s);
    else {
      cur = { speaker: spk, segs: [s] };
      groups.push(cur);
    }
  }
  const merged = [];
  for (const g of groups) {
    const first = g.segs[0],
      last = g.segs[g.segs.length - 1];
    const texts = g.segs.map((s) => String(s.text || '').trim()).filter(Boolean);
    const text = texts.join(' ');
    const anyUnreviewed = g.segs.some((s) => !isReviewed(s));
    const obs = g.segs.reduce((o, s) => {
      for (const k in s.obs || {}) {
        if (s.obs[k]) o[k] = true;
      }
      return o;
    }, null);
    merged.push({
      // Paragraf yeni bir bölümdür: kimliği yeni olmalı, yoksa iki bilgisayarda
      // aynı kimlik iki farklı metni gösterir.
      id: newId('sg'),
      start: first.start,
      end: last.end,
      speaker: first.speaker || '',
      text,
      // ADLİ AYRIM (v2.98): modelin ürettiği ham metin KORUNUR. Paragrafın
      // otomatik çıktısı, girdi bölümlerinin asrText'lerinin birleşimidir.
      // Öncesinde bu alanlar hiç taşınmıyor, paragraf oluşturan bilirkişi
      // "model ne dedi" bilgisini kaybediyordu (v2.83 kuralı bozuluyordu).
      // Girdilerde asrText yoksa UYDURULMAZ (boş kalır).
      asrText: g.segs.map((s) => String(s.asrText || '').trim()).filter(Boolean).join(' '),
      // Model kimliği: hepsi aynıysa korunur; farklı modeller karıştıysa
      // boşaltılır (yanlış atıf yapmamak için).
      asrModel: uniformAsrModel(g.segs),
      asrAt: g.segs.map((s) => s.asrAt || '').filter(Boolean).sort()[0] || '',
      // Paragrafa giren bölümlerden biri elle düzenlenmişse birleşik metin de
      // "elle düzenlenmiş" sayılır; kaynağı otomatik metin olsa bile.
      textRev: g.segs.some((s) => (Number(s.textRev) || 0) > 0) ? 1 : 0,
      checked: !anyUnreviewed,
      review: anyUnreviewed ? 'pending' : segReview(first),
      history: [],
      obs: obs || undefined,
      words: g.segs.flatMap((s) => s.words || [])
    });
  }
  m.segments = merged;
  m.activeSeg = 0;
  segPlayback = { materialId: null, index: null, playing: false, atEnd: false, stopAt: null };
  persist();
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  if (card) renderSegments(m, card);
  renderOverview();
  showToast(`Paragraf oluşturuldu: ${segs.length} bölüm ${merged.length} paragrafa indirildi.`);
}
// Terim tutarlılığı panelini çizer. Bulunan kümeler listelenir; uzman bir
// biçimi "esas al" seçerse diğer yazımlar o biçime çevrilir (yalnızca onayla).
function renderTermPanel(m) {
  const panel = $(`#term-panel-${CSS.escape(m.id)}`);
  if (!panel) return;
  const issues = materialTermIssues(m);
  if (!issues.length) {
    panel.hidden = false;
    panel.innerHTML =
      '<div class="term-empty">Aynı terimin farklı yazımı bulunamadı. (Yalnızca metinde gerçekten geçen sözcükler karşılaştırılır.)</div>';
    return;
  }
  panel.hidden = false;
  panel.innerHTML =
    `<div class="term-head"><b>Terim yazım tutarlılığı</b><small>Öneri listesidir; hiçbir şey siz seçmeden değiştirilmez.</small></div>` +
    issues
      .map(
        (g, gi) => `<div class="term-group">
      <div class="term-forms">${g.forms.map((f) => `<span class="term-form">${esc(f.w)} <i>×${f.count}</i></span>`).join('<span class="term-arrow">·</span>')}</div>
      <div class="term-actions">${g.forms.map((f) => `<button class="mini-button" data-term-apply="${esc(m.id)}|${gi}|${esc(f.w)}" title="Bu yazımı esas al; diğerlerini buna çevir">"${esc(f.w)}" esas al</button>`).join('')}</div>
    </div>`
      )
      .join('');
  panel.dataset.issues = JSON.stringify(issues);
}
function closeTermPanel(m) {
  const panel = $(`#term-panel-${CSS.escape(m.id)}`);
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = '';
    delete panel.dataset.issues;
  }
}
function showSegmentHistory(m, index, anchor) {
  const s = m.segments[index];
  if (!s) return;
  const existing = document.querySelector('.history-dialog');
  if (existing) existing.remove();
  const items = (s.history || []).slice().reverse();
  const dlg = document.createElement('div');
  dlg.className = 'history-dialog';
  dlg.innerHTML = `<div class="history-inner"><div class="history-head"><b>${esc(m.name)} · bölüm ${index + 1} metin geçmişi</b><button class="mini-button" data-close-history>Kapat</button></div><div class="history-body">${items.length ? items.map((h) => `<div class="history-item"><small>${esc(new Date(h.at).toLocaleString('tr-TR'))}</small><p>${esc(h.text || '(boş)')}</p></div>`).join('') : '<p class="paper-muted">Bu bölüm için kayıtlı önceki metin yok.</p>'}</div></div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.dataset.closeHistory !== undefined) dlg.remove();
  });
}
// SHA-256 özeti. Hesaplanamazsa `null` döner (v2.96).
// ÖNCESİ: hata durumunda bir METİN döndürüyordu
// ('Hesaplanamadı (tarayıcı güvenlik kısıtı)'). Bu metin özet olarak kaydedildiği
// için `now === m.sha256` karşılaştırması eşit çıkıyor ve uygulama sahte
// "doğrulandı" diyordu. Güvenli olmayan bağlamda (http:// LAN IP) her doğrulama
// böyleydi. Artık "hesaplanamadı" ile "hesaplandı" ayırt edilir.
async function sha256(blob) {
  try {
    if (!crypto || !crypto.subtle || !crypto.subtle.digest) return null;
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return null;
  }
}
// Geçerli bir SHA-256 özeti mi? (64 küçük harf hex). Eski sürümlerin kaydettiği
// hata METNİ bu kontrolü geçemez; böylece "hesaplanamadı" özet sanılmaz.
function isSha256Hex(v) {
  return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
}
// İki özeti karşılaştırır; ÜÇ hâl döner (v2.96):
//   'verified'    → iki geçerli özet eşit; dosya değişmemiş
//   'mismatch'    → iki geçerli özet FARKLI; dosya değişmiş
//   'unavailable' → özet(ler) hesaplanamadı/geçersiz; DOĞRULANAMADI
// "unavailable" ASLA "verified" sayılmaz: ölçülemeyen bir şey doğrulanmış
// gösterilemez.
function verifyHashState(nowHash, storedHash) {
  if (!isSha256Hex(nowHash) || !isSha256Hex(storedHash)) return 'unavailable';
  return nowHash === storedHash ? 'verified' : 'mismatch';
}
// Technical inventory for the evidence record. The browser can only expose
// container-level facts (codec, channel count, sample rate, bit depth); these are
// read straight from the decoded buffer or the WAV header, never guessed.
async function audioTech(blob) {
  const info = { channels: null, sampleRate: null, bitDepth: null, codec: null };
  try {
    const buf = await blob.arrayBuffer();
    const dv = new DataView(buf);
    if (buf.byteLength > 12 && dv.getUint32(0, false) === 0x52494646 && dv.getUint32(8, false) === 0x57415645) {
      let off = 12;
      while (off + 8 <= buf.byteLength) {
        const id = dv.getUint32(off, false);
        const size = dv.getUint32(off + 4, true);
        if (id === 0x666d7420 && off + 24 <= buf.byteLength) {
          info.codec = 'PCM (WAV)';
          info.channels = dv.getUint16(off + 10, true);
          info.sampleRate = dv.getUint32(off + 12, true);
          info.bitDepth = dv.getUint16(off + 22, true);
          break;
        }
        off += 8 + size + (size % 2);
      }
      if (info.codec) return info;
    }
  } catch (e) {}
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    info.channels = audio.numberOfChannels;
    info.sampleRate = audio.sampleRate;
    await ctx.close();
  } catch (e) {}
  const t = (blob.type || '').toLowerCase();
  info.codec = t.includes('mpeg')
    ? 'MPEG (MP3)'
    : t.includes('mp4') || t.includes('m4a')
      ? 'AAC (M4A/MP4)'
      : t.includes('ogg')
        ? 'Vorbis (OGG)'
        : t.includes('flac')
          ? 'FLAC'
          : 'Bilinmiyor';
  return info;
}
function fmtChannels(n) {
  if (!n) return '—';
  return n === 1 ? 'Mono (1 kanal)' : n === 2 ? 'Stereo (2 kanal)' : `${n} kanal`;
}
async function audioDuration(blob) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const dur = buf.duration;
    await ctx.close();
    return dur;
  } catch (e) {
    return 0;
  }
}
// Teslim alma: dosya eklemeden ÖNCE ortam bilgisi sorulur. Tarayıcı USB'nin
// seri numarasını göremez (teknik sınır); bu bilgi uzman beyanıdır. Aynı
// ortamdan gelen dosyalar tek beyanı paylaşır — bu, adli pratikteki
// "delil teslim alındı" işlemidir, dosya sayısı kadar tekrarlanmaz.
function intakeDialogHtml(fill) {
  const sel = $('#intakeMediumType');
  if (!sel) return;
  // Değer ASCII KOD (usb), etiket Türkçe (USB flaş bellek). Karşılaştırma
  // daima kodla yapılır; şema MEDIUM_TYPE kodlarını doğrular.
  sel.innerHTML = MEDIUM_TYPE.map(
    (code) =>
      `<option value="${esc(code)}" ${(fill && fill.mediumType === code) ? 'selected' : ''}>${esc(MEDIUM_TYPE_LABEL[code] || code)}</option>`
  ).join('');
}
function askIntake(count) {
  return new Promise((resolve) => {
    const dlg = $('#intakeDialog');
    if (!dlg) return resolve(null);
    intakeDialogHtml();
    $('#intakeCount').textContent = String(count);
    $('#intakeMediumLabel').value = '';
    $('#intakeDeliveredBy').value = '';
    $('#intakeDeliveredAt').value = '';
    $('#intakeDeviceInfo').value = '';
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      ['#intakeOk', '#intakeSkip', '#closeIntake'].forEach((s) => {
        const el = $(s);
        if (el) el.removeEventListener('click', handler);
      });
      if (dlg.open) dlg.close();
      resolve(v);
    };
    const handler = (e) => {
      const id = e.currentTarget.id;
      if (id === 'intakeSkip') return finish(null);
      finish({
        mediumType: $('#intakeMediumType').value || 'unspecified',
        mediumLabel: $('#intakeMediumLabel').value.trim(),
        deliveredBy: $('#intakeDeliveredBy').value.trim(),
        deliveredAt: $('#intakeDeliveredAt').value || '',
        deviceInfo: $('#intakeDeviceInfo').value.trim()
      });
    };
    ['#intakeOk', '#intakeSkip', '#closeIntake'].forEach((s) => {
      const el = $(s);
      if (el) el.addEventListener('click', handler);
    });
    dlg.addEventListener('close', () => finish(null), { once: true });
    dlg.showModal();
  });
}
async function addAudioFiles(files, opts = {}) {
  const c = currentCase();
  if (!c) return;
  // Geçerli ses dosyalarını önce ayıkla; teslim bilgisi kaç dosya için
  // sorulacağını bilmek gerekir.
  const valid = files.filter(
    (f) => f.type.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|flac|aac)$/i.test(f.name)
  );
  for (const f of files) if (!valid.includes(f)) showToast(`${f.name}: ses dosyası değil, atlandı.`);
  if (!valid.length) return;
  // Teslim bilgisi: yalnız kullanıcıdan gelen dosyalarda sorulur (test paketi
  // hariç). "Sonra dolduracağım" denirse boş kalır; rapor "—" yazar.
  const intake = opts.synthetic || opts.skipIntake ? null : await askIntake(valid.length);
  for (const file of valid) {
    const id = uid();
    const tech = await audioTech(file);
    const m = {
      id,
      name: file.name,
      type: file.type || 'audio',
      size: file.size,
      duration: await audioDuration(file),
      sha256: await sha256(file),
      tech,
      segments: [],
      status: 'pending',
      synthetic: !!opts.synthetic,
      addedAt: new Date().toISOString(),
      log: [],
      origin: intake
        ? { ...intake }
        : { mediumType: 'unspecified', mediumLabel: '', deliveredBy: '', deliveredAt: '', deviceInfo: '' }
    };
    c.materials.push(m);
    logEvent(
      m,
      'Kayıt eklendi',
      `${file.name} · ${file.size} bayt · ${m.sha256 ? 'SHA-256 hesaplandı' : 'SHA-256 HESAPLANAMADI (güvenli bağlantı gerekir)'}`
    );
    if (intake) {
      logEvent(
        m,
        'Teslim bilgisi girildi',
        `${MEDIUM_TYPE_LABEL[intake.mediumType] || intake.mediumType}${intake.mediumLabel ? ' · ' + intake.mediumLabel : ''}${
          intake.deliveredBy ? ' · teslim eden: ' + intake.deliveredBy : ''
        }`
      );
    }
    await storeBlob(blobKey(c, m), file);
    const url = URL.createObjectURL(file);
    objectUrls.set(blobKey(c, m), url);
  }
  persist();
  renderOverview();
  renderAudioList();
  showToast(
    intake
      ? `${valid.length} ses dosyası teslim bilgisiyle eklendi.`
      : `${valid.length} ses dosyası eklendi. Teslim bilgisi sonra doldurulabilir.`
  );
}
async function ensureModel() {
  const modelId = $('#modelSelect').value;
  if (asrPipeline && asrPipeline.__modelId === modelId) return asrPipeline;
  // Yarış durumu düzeltmesi: model zaten yükleniyorsa hata fırlatmak yerine
  // aynı yüklemeyi BEKLE. Kullanıcı "Çözümle"ye indirme sürerken basarsa
  // çözümleme, indirme bitince kendiliğinden başlar.
  if (modelLoading) {
    if (modelLoadPromise) return modelLoadPromise;
    throw new Error('Model yükleniyor. Lütfen bekleyin.');
  }
  modelLoading = true;
  modelLoadPromise = (async () => {
  const spec = ASR_MODELS[modelId] || ASR_MODELS[DEFAULT_ASR_MODEL];
  // Kullanıcı "Çalışma birimi" seçimini yaptıysa onu kullan; "auto" ise
  // algılanan cihaz. Böylece orta model GPU belleğine sığmazsa CPU seçilebilir.
  const devSel = $('#modelDeviceSelect') ? $('#modelDeviceSelect').value : 'auto';
  const useDevice = devSel === 'auto' ? asrDevice : devSel;
  const candidates = dtypeCandidates(useDevice);
  let dtype = candidates[0];
  // Genel ilerleme: dosya bazlı yüzde yerine, tamamlanan dosya sayısına göre
  // yüzde hesaplanır. Böylece "%100 → %3" gibi zıplayan, anlaşılmaz görüntü
  // yerine tek ve tutarlı bir ilerleme çubuğu gösterilir.
  const fileState = new Map();
  let maxPct = 0;
  let sawDownload = false;
  // Beklenen dosya sayısı sabittir (Whisper ONNX paketi ~7 dosya).
  // "%70'ten başlıyor" gizemi: önbellekteki dosyalar anında %100 rapor edilir;
  // 7 dosyadan 5'i önbellekteyse 5/7=%71 çıkar. Bu teknik olarak doğru ama
  // kullanıcıya yanıltıcı gelir. Bu yüzden önbellekten gelen dosyalar ayrı
  // sayılır ve ilerleme metni "önbellekten yüklendi" olarak açıklanır.
  const EXPECTED_FILES = 7;
  const cachedFiles = new Set();
  const refreshLoadStatus = (activeFile) => {
    const vals = [...fileState.values()];
    const denom = Math.max(EXPECTED_FILES, vals.length);
    const sum = vals.reduce((a, b) => a + Math.max(0, Math.min(100, b)), 0);
    let pct = Math.min(99, Math.round(sum / denom));
    if (pct < maxPct) pct = maxPct; // asla geri gitme
    maxPct = pct;
    const done = vals.filter((v) => v >= 100).length;
    const label = MODEL_LOAD_LABELS[modelId] || modelId;
    const active = activeFile ? ` · ${activeFile}` : '';
    // Önbellekten gelenler varsa açıkça belirt (yanıltıcı "%70 başlangıç" yerine).
    const cachedNote = cachedFiles.size ? ` · ${cachedFiles.size} dosya önbellekten` : '';
    $('#modelStatus').innerHTML =
      `<b>${esc(label)}</b> yükleniyor… %${pct} (${done}/${denom} dosya)${cachedNote}${esc(active)}`;
    const bar = $('#modelLoadBar');
    if (bar) {
      bar.hidden = false;
      const fill = bar.querySelector('span');
      if (fill) fill.style.width = pct + '%';
    }
  };
  $('#modelStatus').textContent = `${spec.label} indiriliyor… İlk kullanımda dosya boyutu yüksek olabilir.`;
  $('#loadModelBtn').disabled = true;
  try {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2');
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    if (asrPipeline && asrPipeline.dispose) {
      try {
        await asrPipeline.dispose();
      } catch (e) {}
    }
    // Dtype kademesi: istenen bileşen-bazlı dtype ile yüklenir. Depoda o
    // varyant yoksa veya yüklenemezse, tümü fp32 (en güvenilir) ile yeniden
    // denenir. Böylece dtype seçimi yüklemeyi asla kırmaz.
    const loadWith = async (dt, dev = useDevice) =>
      pipeline('automatic-speech-recognition', modelId, {
        device: dev,
        dtype: dt,
        progress_callback: (p) => {
          if (p.status === 'progress' && p.file) {
            // Önbellekten gelen dosyalar neredeyse anında %100'e ulaşır;
            // bunları "önbellekten" olarak işaretle ki yüzde yanıltmasın.
            const prev = fileState.get(p.file);
            const val = Number(p.progress || 0);
            if (prev === undefined && val >= 99) cachedFiles.add(p.file);
            fileState.set(p.file, val);
            refreshLoadStatus(p.file);
          } else if (p.status === 'ready') {
            $('#modelStatus').textContent = 'Model hazır.';
          }
        }
      });
    // Dtype adayları sırayla denenir. Her başarısız denemeden önce önceki
    // oturum serbest bırakılır ki bellek birikmesin (6 GB GPU'da önemli).
    // Deneme planı: önce istenen cihaz + dtype adayları. GPU'da hepsi
    // başarısız olursa (ör. bellek yetmez → Aborted) CPU (WASM) ile son bir
    // deneme yapılır. Böylece model, GPU belleğine sığmasa da çalışır.
    const plan = candidates.map((d) => ({ dtype: d, device: useDevice }));
    if (useDevice !== 'wasm') plan.push({ dtype: 'fp32', device: 'wasm' });
    let usedDtype = null;
    let usedDevice = useDevice;
    let lastErr = null;
    for (const step of plan) {
      if (asrPipeline && asrPipeline.dispose) {
        try {
          await asrPipeline.dispose();
        } catch (e) {}
        asrPipeline = null;
      }
      try {
        $('#modelStatus').textContent =
          `${spec.label} yükleniyor… (${step.device === 'webgpu' ? 'GPU' : 'CPU'} · ${dtypeLabel(step.dtype)})`;
        asrPipeline = await loadWith(step.dtype, step.device);
        usedDtype = step.dtype;
        usedDevice = step.device;
        break;
      } catch (candErr) {
        lastErr = candErr;
        console.warn('Yükleme denemesi başarısız:', step.device, dtypeLabel(step.dtype), candErr);
      }
    }
    if (!usedDtype) throw lastErr || new Error('Model hiçbir ayarla yüklenemedi (GPU ve CPU denendi).');
    asrPipeline.__spec = spec;
    asrPipeline.__modelId = modelId;
    asrPipeline.__dtype = usedDtype;
    asrPipeline.__device = usedDevice;
    loadedModelId = modelId;
    dtype = usedDtype;
    const bar = $('#modelLoadBar');
    if (bar) {
      bar.hidden = true;
      const fill = bar.querySelector('span');
      if (fill) fill.style.width = '0%';
    }
    updateModelBadge();
    $('#modelStatus').textContent =
      (spec.warn
        ? 'Model hazır. Bu model hızlıdır ancak doğruluğu düşüktür; metni mutlaka kayıttan doğrulayın.'
        : 'Model hazır. Türkçe kaynak dili ve transkripsiyon görevi zorunlu olarak kullanılacak.') +
      ` Çalışma birimi: ${usedDevice === 'webgpu' ? 'WebGPU' : 'WASM (CPU)'} · duyarlılık: ${dtypeLabel(usedDtype)}.`;
    showToast('Konuşma modeli hazır.');
    refreshStorage();
    return asrPipeline;
  } catch (e) {
    asrPipeline = null;
    loadedModelId = null;
    updateModelBadge();
    const bar = $('#modelLoadBar');
    if (bar) bar.hidden = true;
    $('#modelStatus').textContent =
      `Model yüklenemedi: ${e.message}. İnternet bağlantısını ve tarayıcı izinlerini kontrol edin.`;
    throw e;
  } finally {
    modelLoading = false;
    $('#loadModelBtn').disabled = false;
  }
  })();
  try {
    return await modelLoadPromise;
  } finally {
    modelLoadPromise = null;
  }
}
async function decodeForAsr(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC({ sampleRate: 16000 });
  let buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  if (buffer.sampleRate !== 16000) {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offline = new Offline(1, Math.ceil(buffer.duration * 16000), 16000);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(0);
    buffer = await offline.startRendering();
  }
  const out = new Float32Array(buffer.length);
  if (buffer.numberOfChannels === 1) out.set(buffer.getChannelData(0));
  else {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels;
    }
  }
  await ctx.close();
  return out;
}
// Long recordings are decoded and transcribed window by window. Keeping one
// window in memory at a time avoids holding a second full-length Float32Array,
// and persisting after every window means an interrupted run resumes instead of
// restarting. 30 s matches Whisper's own receptive window.
const ASR_WINDOW_SECONDS = 30;
// Uzun kaydı pencerelere böler: her pencere [başlangıç, bitiş) örnek aralığı ve
// saniye cinsinden ofsettir. Son pencere kaydın sonunu aşmaz. Saf fonksiyon;
// uzun kayıt yönetimi (kesinti, ilerleme) bu sınırlara dayandığı için test edilir.
function asrWindows(totalSamples, sampleRate = 16000, windowSeconds = ASR_WINDOW_SECONDS) {
  const step = Math.max(1, Math.round(windowSeconds * sampleRate));
  const out = [];
  for (let offset = 0; offset < totalSamples; offset += step) {
    const end = Math.min(totalSamples, offset + step);
    out.push({ offset, end, startSeconds: offset / sampleRate, seconds: (end - offset) / sampleRate });
  }
  return out;
}
// Segment review states. "checked" from earlier versions maps to "onaylandi" so
// existing MİHENK/AKİS records keep their meaning. Only onaylandi and anlasilmadi
// count as reviewed: "yeniden" means the expert still has to listen again, and
// must never be reported as verified.
// Bölüm kontrol durumu. v3 kanonik kodları: pending | approved | inaudible |
// relisten. v2'nin Türkçe anahtarları (onaylandi, bekliyor, anlasilmadi,
// yeniden) okuma sırasında çevrilir; böylece eski kayıtlar çökertmez ve tüm
// okuma noktaları tek yerden geçer.
// Etiketler TEK KAYNAKTAN gelir (schema.js → REVIEW_LABEL/REVIEW_HINT/REVIEW_TONE).
// Burada kopya metin TUTULMAZ: kopya ayrışırsa rapor ile ekran farklı şey söyler.
// `machine` (v2.106): otomatik çözümleme işareti. BİLİRKİŞİ ONAYI DEĞİLDİR;
// raporda "Onaylandı" yazmaz, "kontrol edildi" sayılmaz.
const REVIEW_STATES = Object.fromEntries(
  REVIEW_STATE.map((k) => [k, { label: REVIEW_LABEL[k], cls: REVIEW_TONE[k] === 'none' ? '' : REVIEW_TONE[k], hint: REVIEW_HINT[k] }])
);
// v2 anahtar → v3 kod. TEK KAYNAK: `assets/schema.js` (REVIEW_LEGACY).
// Burada kopya tablo TUTULMAZ: kopya ayrışırsa v2 dosyalarındaki onaylar
// sessizce kaybolur (v2.89'da tam olarak bu yaşandı).
function segReview(s) {
  const raw = s.review || (s.checked ? 'approved' : 'pending');
  return REVIEW_STATES[raw] ? raw : REVIEW_LEGACY[raw] || 'pending';
}
// Kontrol kararını YAZAN TEK NOKTA (v2.122). Onayı KİMİN verdiği burada
// kaydedilir; birleştirmede onay ancak sahibi biliniyorsa aktarılır. Dinleyip
// onaylayan bilirkişi metne dokunmaz, bu yüzden `lastEditBy` yeterli değildir.
// `machine` (otomatik işaretleme) insan kararı değildir; atıf taşımaz.
const HUMAN_REVIEW_CODES = ['approved', 'inaudible', 'relisten', 'ambiguous'];
function setSegReview(s, code) {
  const next = normalizeReviewState(code);
  const prev = segReview(s);
  s.review = next;
  s.checked = next === 'approved';
  if (HUMAN_REVIEW_CODES.includes(next)) {
    const c = currentCase();
    s.reviewedBy = (c && c.lastEditedBy) || '';
    s.reviewedAt = new Date().toISOString();
  } else {
    s.reviewedBy = '';
    s.reviewedAt = '';
  }
  return prev !== next;
}
function isReviewed(s) {
  const r = segReview(s);
  return r === 'approved' || r === 'inaudible';
}
// GÖRÜNEN bölüm indeksi (v2.127). `activeSeg` tanımsızsa detay 0. bölümü
// gösterir; oynatma/onay da aynı bölümü kullanmalıdır.
function activeSegIndex(m) {
  const segs = (m && m.segments) || [];
  const i = Number.isInteger(m && m.activeSeg) ? m.activeSeg : 0;
  return segs[i] ? i : 0;
}
// BİLİRKİŞİ ONAYI (dinleyerek). `machine` buraya GİRMEZ: rapor "Onaylandı"
// basmadan önce bu sorulur. Adli ayrım: makine işaretlemesi onay değildir.
function isHumanApproved(s) {
  return isHumanApprovedReview(segReview(s));
}
function reviewLabel(s) {
  return REVIEW_STATES[segReview(s)].label;
}
// Rapor hücresi. "Onaylandı" yalnız bilirkişi onayında yazılır;
// `machine` → "Çözümlendi". `ambiguous` → "Belirsiz okuma" + İKİ OKUMA
// (v2.115): adli kural gereği belirsizlik rapora GİZLENMEDEN yazılır.
function reviewCellText(s) {
  if (segReview(s) === AMBIGUOUS_REVIEW) {
    return `${reviewLabel(s)} — ${ambiguousReportText(s)}`;
  }
  return reviewLabel(s);
}
// İpucu (tooltip): uzun açıklama ekrana değil ipucuna yazılır (kullanıcı isteği).
function reviewHintText(s) {
  const r = segReview(s);
  return REVIEW_STATES[r] ? REVIEW_STATES[r].hint || '' : '';
}
// Metin geçmişi, her tuş vuruşunda değil düzenleme oturumu başına bir kez tutulur.
// Focus anında metnin anlık görüntüsü saklanır, blur anında gerçekten değiştiyse
// geçmişe eklenir. Böylece geçmiş gerçek önceki sürümleri gösterir, tuş tuş dolmaz.
function snapshotSegmentText(s) {
  s.__editSnapshot = s.text || '';
  s.__reviewSnapshot = segReview(s);
  delete s.__reviewDropped;
}
// Metin düzenlemesi bir ONAYI düşürdü mü? (v2.88)
// Bayrak `setSegmentText()` içinde kurulur; bu yüzden `focusin` çalışmasa bile
// (programatik yazma, yapıştırma, odak hiç girmediyse) düşüş KAÇMAZ. Bildirim
// odak kaybında bir kez yapılır (her tuşta gürültü olmaz).
function approvalDroppedByEdit(s) {
  return !!s.__reviewDropped;
}
// Metin geçmişine kimin yazdığını yazmak için: dosyada "son düzenleyen" olarak
// işaretlenmiş ekip üyesinin adı. Tanımsızsa boş kalır (uydurma kimlik yok).
function editorName() {
  const c = currentCase();
  if (!c || !c.lastEditedBy) return '';
  const t = (c.team || []).find((x) => x.id === c.lastEditedBy);
  return t ? t.name || '' : '';
}
// Bu dosyada çalışan kişi "ikinci göz" mü? (Yardımcı / kontrol eden.)
// İkinci göz metni düzeltir ama ONAY VEREMEZ; düzeltmesi öneri olarak saklanır.
function isSecondEyesEditor() {
  const c = currentCase();
  if (!c || !c.lastEditedBy) return false;
  const t = (c.team || []).find((x) => x.id === c.lastEditedBy);
  return !!t && isSecondEyesRole(t.role);
}
// Bölüm metnini yazar. TEK darboğaz: bütün metin yazma yolları buradan geçer.
// KURAL (v2.88): onay METNE bağlıdır. Metin gerçekten değiştiyse kontrol
// durumu "Kontrol bekliyor"a düşer. Aksi hâlde onaylanmış bir bölümün metni
// tamamen değiştirilse bile rozet "Onaylandı" kalıyordu ve kontrol edilmemiş
// metin rapora onaylı olarak giriyordu (adli bütünlük ihlali).
// Sayaç artırmaz: sayaç düzenleme oturumu başına bir kez markTextEdited ile
// işaretlenir (bkz. aşağısı).
function setSegmentText(s, next) {
  const v = next == null ? '' : String(next);
  if ((s.text || '') === v) return false;
  const wasDecision = segReview(s) !== 'pending';
  s.text = v;
  // Metin değişti → insan kararı geçersiz. "Anlaşılmadı"/"Yeniden dinlenecek"
  // de düşer: metin değiştiyse bölüm yeniden dinlenip kontrol edilmelidir.
  setSegReview(s, 'pending');
  // Düşüş bayrağı BURADA kurulur (odak olayına bağlı değil): programatik
  // yazma veya yapıştırmada da kullanıcı bilgilendirilir.
  if (wasDecision) s.__reviewDropped = true;
  return true;
}
// "Bu metne insan eli değdi" işareti. Birleştirmede iki tarafın metni
// farklıysa: yalnız bir taraf düzenlemişse o taraf alınır; ikisi de düzenlemişse
// otomatik seçim YAPILMAZ, çakışma olarak bilirkişiye bildirilir. Ölçüt sayacın
// büyüklüğü değil, sıfırdan farklı olmasıdır; bu yüzden çok yazan taraf haksız
// yere kazanamaz.
function markTextEdited(s) {
  if ((Number(s.textRev) || 0) === 0) s.textRev = 1;
  const c = currentCase();
  if (c && c.lastEditedBy) s.lastEditBy = c.lastEditedBy;
}
// Metin düzenlemesini kaydeder. İkinci göz yazıyorsa metin DEĞİŞMEZ; öneri
// saklanır. Böylece onaysız bir düzeltme rapora "Onaylandı" olarak giremez.
// Geçmiş kaydı BURADA tutulmaz: yazarken her tuş vuruşu geçmişe girmemeli.
// Geçmiş odak kaybında (pushSegmentHistory) tutulur.
function applyTextEdit(s, next) {
  const v = next == null ? '' : String(next);
  if ((s.text || '') === v) return false;
  if (isSecondEyesEditor()) {
    s.proposal = {
      text: v,
      by: editorName(),
      at: new Date().toISOString(),
      baseText: (s.proposal && s.proposal.baseText) || s.text || ''
    };
    return true;
  }
  return setSegmentText(s, v);
}
function pushSegmentHistory(s, prevText) {
  if (!s.history) s.history = [];
  const prev = prevText ?? s.__editSnapshot ?? '';
  if (prev === (s.text || '')) return false;
  s.history.push({ text: prev, at: new Date().toISOString(), actor: editorName() });
  // v2.73: veri IndexedDB'ye taşındı; geçmiş sınırı 3 -> 10'a çıkarıldı.
  // Daha uzun geri dönüş geçmişi tutulabilir.
  if (s.history.length > 10) s.history.shift();
  markTextEdited(s);
  return true;
}
// ---- Delil günlüğü -------------------------------------------------------
// TEK yazma noktası. Girdi her zaman logEntry() ile üretilir; böylece
// prevHash + hash zinciri kurulur ve verifyLogChain() kurcalamayı yakalar.
// Elle `m.log.push({at,event})` yazmak zinciri kırar (v2.56 öncesi böyleydi).
function logEvent(m, event, detail) {
  if (!m) return;
  m.log = m.log || [];
  const entry = logEntry(m.log, {
    at: new Date().toISOString(),
    actor: editorName() || 'bilinmiyor',
    event,
    detail
  });
  m.log.push(entry);
  return entry;
}
// Eski (hash'siz) günlükleri zincire bağlar. Açılışta bir kez çağrılır.
function upgradeAllLogChains(state) {
  let total = 0;
  for (const c of state.cases || []) {
    for (const m of c.materials || []) {
      const r = upgradeLogChain(m.log);
      if (r.upgraded) {
        m.log = r.log;
        total += r.upgraded;
      }
    }
  }
  return total;
}
function timecode(seconds) {
  // Zaman kodu HER ZAMAN milisaniye içerir: "00:00:06.880".
  // Tutarlılık kritik: bir bölüm "00:00:00" diğeri "00:00:06.880" yazarsa
  // uzman sütunu okuyamaz. Eski "HH:MM:SS" biçimi hâlâ okunur.
  if (seconds == null || !Number.isFinite(seconds)) return '00:00:00.000';
  const total = Math.max(0, seconds);
  let whole = Math.floor(total);
  let ms = Math.round((total - whole) * 1000);
  if (ms >= 1000) {
    whole += 1;
    ms -= 1000;
  }
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}.${pad(ms, 3)}`;
}
// Filler-only output ("(Konuşma)", "(Müzik - Jenerik)" and similar bracketed tokens)
// is how Whisper reports hallucinated silence. Such a segment carries no transcript,
// so it must never be presented as analysed speech.
// Whisper, sessizliği "(Konuşma)", "(Müzik - Jenerik)", "[Müzik]" gibi KISA
// etiketlerle bildirir. Bu etiketler deşifre değildir; rapora konuşma olarak
// girmemelidir.
// DÜZELTME (v2.93): eski desen `[\s\S]*?` ile "bu kelimeyle BAŞLAYAN her
// metni" yakalıyordu. "Konuşma sırasında bağırdı", "Nefes alıyor",
// "Müzik kutusu çalındı" gibi GERÇEK cümleler dolgu sayılıyor, çözümlemede
// çöpe atılıyordu. Artık yalnız TAM eşleşme: isteğe bağlı açılış/kapanış
// parantezi + etiket + isteğe bağlı tireyle ayrılmış ikinci etiket + nokta.
const FILLER_WORD =
  '(konuşma|müzik|jenerik|kalabalık|nefes|alkış|sessizlik|tutaklar|beep|music|applause|silence|blank|no speech|background noise)';
const HALLUCINATION_RE = new RegExp(
  '^[\\s(\\[]*' + FILLER_WORD + '(?:\\s*[-–—]\\s*' + FILLER_WORD + ')*[\\s)\\].,;:!?]*$',
  'i'
);
// Metnin gerçek konuşma olup olmadığını kaba ama güvenli biçimde denetler.
// Whisper bazı modellerde timestamp/özel token'ları metne dökebilir; çıktı
// "- - - -" veya "< - < - < < <" gibi anlamsız karakter yığınına dönüşür.
// Böyle bir metin ASLA deşifre olarak sunulmamalıdır. Uydurma yoktur; yalnızca
// harf/rakam oranı ve yineleme ölçülür.
function looksLikeGarbage(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  const alnum = (t.match(/[\p{L}\p{N}]/gu) || []).length;
  const ratio = alnum / t.length;
  // Gerçek Türkçe metinde harf/rakam oranı ~0,7'nin üzerindedir. 0,35'in
  // altındaki metin neredeyse tamamen noktalama/simgedir: çöp.
  if (ratio < 0.35) return true;
  // Aynı kısa jetonun baskın tekrarı (ör. "- " yüzlerce kez).
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length >= 8) {
    const counts = new Map();
    for (const w of tokens) counts.set(w, (counts.get(w) || 0) + 1);
    let top = 0;
    for (const v of counts.values()) if (v > top) top = v;
    if (top / tokens.length >= 0.6) return true;
  }
  return false;
}
function isHallucination(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (looksLikeGarbage(t)) return true;
  const stripped = t.replace(/[()\[\]\s.]/g, '');
  if (!stripped) return true;
  return HALLUCINATION_RE.test(t) && t.length < 60;
}
// Çıktının Türkçe dışı görünüp görünmediğini kaba biçimde tahmin eder: yaygın
// İngilizce işlev sözcükleri var ve hiç Türkçe özel karakter yoksa uyarı verilir.
// Bu bir ÖNERİdir; kesin dil tespiti değildir. Saf fonksiyon; test edilebilir.
function looksNonTurkish(text) {
  const t = String(text || '');
  const englishMarkers = /\b(the|and|you|are|this|that|with|have|for|not|was|were)\b/i.test(t);
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(t);
  return englishMarkers && !turkishChars;
}
// ---- Tekrar tespiti (NLP katmanı) ----
// Whisper bazen aynı cümleyi/ifadeyi arka arkaya tekrarlar veya aynı kısa
// ifadeyi bir bölüm boyunca yineler. Bu, gerçek konuşma değil model artefaktı
// olabilir; uzmanın bunu görmesi gerekir. Uydurma yoktur: yalnızca metindeki
// gerçek tekrarlar ölçülür ve oranı raporlanır.
// Bir metindeki ardışık yinelenen cümleleri ve aşırı tekrar eden ifadeleri bulur.
function detectRepetition(text) {
  const t = String(text || '').trim();
  if (t.length < 12) return null;
  // Cümlelere/parçalara ayır (nokta, soru, ünlem, satır sonu).
  const parts = t
    .split(/[.!?…]+|\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4);
  // Ardışık aynı parçalar (ör. "Evet. Evet. Evet.").
  let run = 1,
    maxRun = 1;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].toLowerCase() === parts[i - 1].toLowerCase()) {
      run++;
      if (run > maxRun) maxRun = run;
    } else run = 1;
  }
  // Aynı kısa ifadenin tüm metinde aşırı yinelenmesi (ör. aynı cümle 4+ kez).
  const counts = new Map();
  for (const p of parts) {
    const k = p.toLowerCase();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let topCount = 0,
    topPart = '';
  for (const [k, v] of counts) {
    if (v > topCount) {
      topCount = v;
      topPart = k;
    }
  }
  const repeated = maxRun >= 3 || (parts.length >= 4 && topCount >= 4 && topCount / parts.length >= 0.6);
  if (!repeated) return null;
  return { maxRun, topCount, topPart, parts: parts.length };
}
// Bölüm düzeyinde tekrar işareti. Yalnızca gerçek tekrar varsa üretilir.
function segmentRepetitionFlag(s) {
  const r = detectRepetition(s && s.text);
  if (!r) return null;
  return { level: r.maxRun >= 4 || r.topCount >= 5 ? 'high' : 'mid', info: r };
}
// Transcribe one decoded window. chunk_length_s is omitted because the caller
// already sliced the audio, so the pipeline must not chunk it a second time.
// Re-hash the stored blob and compare with the value captured on import. A
// mismatch means the stored copy no longer matches what was recorded, which is
// exactly the kind of change the evidence chain has to surface.
async function verifyIntegrity(id) {
  const c = currentCase(),
    m = c.materials.find((x) => x.id === id);
  if (!m) return;
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Kayıt yerel depoda bulunamadı; doğrulanamadı.');
    return;
  }
  const now = await sha256(blob);
  // ÜÇ HÂL (v2.96): "hesaplanamadı" ASLA "doğrulandı" sayılmaz.
  const state = verifyHashState(now, m.sha256);
  m.lastVerify = {
    at: new Date().toISOString(),
    ok: state === 'verified',
    state,
    hash: now || ''
  };
  if (state === 'verified') {
    logEvent(m, 'SHA-256 doğrulama', 'Özet eşleşti; dosya değişmemiş.');
  } else if (state === 'mismatch') {
    logEvent(m, 'SHA-256 doğrulama', `Özet farklı! Beklenen ${m.sha256}, bulunan ${now}`);
  } else {
    logEvent(
      m,
      'SHA-256 doğrulama',
      `Doğrulanamadı: özet ${now ? 'kayıtlı özet geçersiz' : 'bu tarayıcıda hesaplanamadı'} (güvenli bağlam gerekir).`
    );
  }
  persist();
  renderAudioList();
  if (state === 'verified') showToast('SHA-256 doğrulandı; dosya değişmemiş.');
  else if (state === 'mismatch') showToast('Uyarı: dosya özeti değişmiş görünüyor!');
  else
    showToast(
      'SHA-256 DOĞRULANAMADI: bu tarayıcıda özet hesaplanamıyor (güvenli bağlantı gerekir). ' +
        'Dosya değişmemiş sayılmaz.'
    );
}
function showEvidenceLog(m) {
  const existing = document.querySelector('.history-dialog');
  if (existing) existing.remove();
  const items = (m.log || []).slice().reverse();
  const chain = logChainState(m.log);
  const chainBox = {
    verified: `<div class="chain-state ok"><b>Zincir doğrulandı</b><small>${m.log.length} girdi birbirine bağlı; sonradan değiştirilmiş girdi yok.</small></div>`,
    legacy: `<div class="chain-state warn"><b>Zincir bu sürümden önce kurulmuş</b><small>${esc(chain.reason)}. Girdiler korunmuştur; bu andan sonraki işlemler zincire bağlanır.</small></div>`,
    broken: `<div class="chain-state bad"><b>Zincir kırık</b><small>${esc(chain.brokenAt + 1)}. girdide ${esc(chain.reason)}. Bu, günlüğün sonradan değiştirildiğini gösterir.</small></div>`,
    empty: ''
  }[chain.state] || '';
  const dlg = document.createElement('div');
  dlg.className = 'history-dialog';
  dlg.innerHTML = `<div class="history-inner"><div class="history-head"><b>${esc(m.name)} · delil işlem günlüğü</b><button class="mini-button" data-close-history>Kapat</button></div><div class="history-body">${chainBox}${items.length ? items.map((h) => `<div class="history-item"><small>${esc(new Date(h.at).toLocaleString('tr-TR'))} · ${esc(h.event)}${h.actor ? ' · ' + esc(h.actor) : ''}</small><p>${esc(h.detail || '')}</p></div>`).join('') : '<p class="paper-muted">Bu kayıt için işlem günlüğü boş.</p>'}</div></div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.dataset.closeHistory !== undefined) dlg.remove();
  });
}
// Model çıktısını bölümlere çeviren saf fonksiyon. Zaman ofseti uygulanır;
// kelime düzeyi zamanlar (varsa) karaoke için saklanır. Ağ/model olmadan
// test edilebilir: bilinen bir sonuç nesnesi verilip çıktı doğrulanır.
function parseAsrResult(result, offsetSeconds, windowSeconds) {
  const chunks = (result && result.chunks ? result.chunks : []).filter((x) => String(x.text || '').trim());
  const out = [];
  if (chunks.length) {
    for (const x of chunks) {
      const text = String(x.text || '').trim();
      // Çöp çıktı (timestamp token sızıntısı) deşifreye hiç girmemeli.
      if (looksLikeGarbage(text)) continue;
      const st = x.timestamp?.[0] ?? 0;
      let en = x.timestamp?.[1];
      // Bitiş zamanı gelmezse (bazı ONNX modelleri) pencere sonuna kadar
      // varsayılan bir süre ver; aksi halde bölüm "00:00:00–00:00:00" olur.
      if (en == null || en <= st) en = st + (windowSeconds || 1);
      const seg = {
        // Kimlik burada, üretim anında verilir. Sonradan verilirse iki
        // bilgisayarda AYRI kimlikler oluşur ve birleştirme bölümleri
        // eşleştiremez (yardımcının düzeltmesi "yeni bölüm" sanılır).
        id: newId('sg'),
        start: timecode(offsetSeconds + st),
        end: timecode(offsetSeconds + en),
        text,
        // Modelin ÜRETTİĞİ metin ayrı ve değişmez. Bilirkişi düzenledikçe
        // `text` değişir, bu alan DEĞİŞMEZ (adli ayrım).
        asrText: text,
        asrAt: new Date().toISOString()
      };
      if (Array.isArray(x.words)) {
        seg.words = x.words.map((w) => ({
          w: String(w.word ?? w.text ?? ''),
          s: timecode(offsetSeconds + (w.start ?? 0)),
          e: timecode(offsetSeconds + (w.end ?? w.start ?? 0))
        }));
      }
      out.push(seg);
    }
  } else if (result && String(result.text || '').trim()) {
    const text = String(result.text || '').trim();
    if (!looksLikeGarbage(text)) {
      out.push({
        id: newId('sg'),
        start: timecode(offsetSeconds),
        end: timecode(offsetSeconds + (windowSeconds || 0)),
        text,
        asrText: text,
        asrAt: new Date().toISOString()
      });
    }
  }
  return out;
}
// `profileId` ÇAĞIRAN tarafından verilir (v2.111). NEDEN: v2.110 ve öncesinde
// bu fonksiyon HER PENCEREDE `savedProfilePref()` okuyordu. Uzun bir çözümleme
// sürerken kullanıcı profili değiştirirse aynı kaydın farklı bölümleri FARKLI
// profille çözümlenirdi — kayıt kendi içinde tutarsız olurdu. Profil artık
// çözümleme BAŞINDA bir kez sabitlenir ve kayda yazılır.
async function transcribeWindow(pipe, window, offsetSeconds, profileId) {
  // Zaman damgası merdiveni: bazı Whisper ONNX modelleri `return_timestamps`
  // seçeneklerini desteklemez veya bozuk çıktı üretir. Sırayla denenir ve ilk
  // ANLAMLI sonuç kullanılır. Çöp çıktı hiçbir zaman kabul edilmez.
  // Türkçe dil ve transkripsiyon görevi sabittir; profil yalnız bağlam istemi
  // ve tekrar ayarlarını değiştirir (bkz. ASR_PROFILES / PROFILE_LOCK).
  const attempts = asrProfileOptions(profileId || savedProfilePref());
  for (const opts of attempts) {
    let result;
    try {
      result = await pipe(window, opts);
    } catch (e) {
      continue; // bu seçenek desteklenmiyor; sonrakini dene
    }
    const segs = parseAsrResult(result, offsetSeconds, window.length / 16000);
    if (segs.length) return segs; // anlamlı sonuç
  }
  return [];
}
// ---- Çözümleme profilleri (v2.81) ---------------------------------------
// Kullanıcı "şive, kıcırtı, malzeme sesi gibi farklı çözümlemeler" istedi.
// DÜRÜST SINIR: bunlar ayrı eğitilmiş modeller ister ve bu depo öyle bir model
// içermez. Yapılmış gibi gösterilmez. Bunun yerine, aynı modelin
// yönlendirilebilir ayarlarını (dil ipucu, bağlam istemi, sıcaklık, tekrar
// cezası) profil olarak sunuyoruz. Profil, çıktı kalitesini ETKİLER ama
// "şive tanıma" veya "kaynak ayrıştırma" YAPMAZ; rapora da yazılmaz.
const ASR_PROFILES = [
  {
    id: 'standard',
    short: 'Standart',
    label: 'Standart Türkçe konuşma',
    hint: 'Varsayılan. Net, gürültüsüz görüşme kayıtları.',
    prompt: '',
    language: 'turkish'
  },
  {
    id: 'dialect',
    short: 'Şive/aksan',
    label: 'Şive / ağır aksan (ipucu)',
    hint: 'Yalnızca dil ipucu ve bağlam istemi ekler; şive tanıma modeli DEĞİLDİR.',
    prompt: 'Konuşma Türkçedir; yerel şive ve ağır aksan içerebilir.',
    language: 'turkish'
  },
  {
    id: 'noisy',
    short: 'Gürültülü',
    label: 'Gürültülü / kıcırtılı kayıt (ipucu)',
    hint: 'Bağlam istemi ve tekrar cezası ekler; kaynak ayrıştırma YAPMAZ.',
    prompt: 'Kayıt gürültülü veya kıcırtılı olabilir; anlaşılan konuşmayı yaz.',
    language: 'turkish'
  },
  {
    id: 'telephone',
    short: 'Telefon',
    label: 'Telefon / dar bant (ipucu)',
    hint: 'Dar bantlı telefon kaydı için bağlam istemi; bant genişliğini geri getirmez.',
    prompt: 'Kayıt dar bantlı bir telefon görüşmesidir.',
    language: 'turkish'
  }
];
const ASR_PROFILE_KEY = 'akis.asrProfile';
// DİL KİLİDİ (değişmez): profil yalnız ipucu/bağlam değiştirir. Kaynak dil
// Türkçe ve görev transkripsiyon HER ZAMAN sabittir; profil bunu gevşetmez.
const PROFILE_LOCK = Object.freeze({ language: 'turkish', task: 'transcribe' });
function asrProfile(id) {
  return ASR_PROFILES.find((p) => p.id === id) || ASR_PROFILES[0];
}
// Tek kaynak: profil kimliği → ASR_PROFILES kaydı. Bilinmeyen kimlik standart.
function profileById(id) {
  return asrProfile(id);
}
// Ekranda gösterilecek KISA etiket. Uzun açıklama `hint` alanında (ipucu).
function profileRunLabel(id) {
  return asrProfile(id).short || 'Standart';
}
function savedProfilePref() {
  try {
    const v = localStorage.getItem(ASR_PROFILE_KEY);
    return ASR_PROFILES.some((p) => p.id === v) ? v : 'standard';
  } catch (e) {
    return 'standard';
  }
}
function saveProfilePref(id) {
  try {
    localStorage.setItem(ASR_PROFILE_KEY, id);
  } catch (e) {}
}
// Profil → model seçenekleri. Saf fonksiyon; test edilebilir.
function asrProfileOptions(profileId) {
  const p = asrProfile(profileId);
  const base = { language: p.language, task: 'transcribe' };
  if (p.prompt) base.prompt = p.prompt;
  const attempts = [
    { ...base, return_timestamps: true, no_repeat_ngram_size: 3, repetition_penalty: 1.2 },
    { ...base, return_timestamps: true },
    { ...base }
  ];
  return attempts;
}
// BÖLÜM ARALIĞINI YENİDEN ÇÖZÜMLE (v2.76)
// Tek bir bölümün başlangıç–bitiş aralığını ses dosyasından kesip yalnız o
// parçayı modele verir. Kullanıcı "bu iki sınır arasındaki konuşmayı yeniden
// çözümle" dediğinde bunu yapar. Diğer bölümlere DOKUNMAZ.
// Metin kaybolduysa (bölme sonrası boş kaldıysa) bu yolla geri getirilir.
async function retranscribeSegment(materialId, index) {
  const c = currentCase();
  const m = c?.materials.find((x) => x.id === materialId);
  if (!m) return;
  const s = (m.segments || [])[index];
  if (!s) return;
  const a = secondsFromTimecode(s.start);
  const b = secondsFromTimecode(s.end);
  if (!(Number.isFinite(a) && Number.isFinite(b) && b > a)) {
    showToast('Bu bölümün zaman aralığı geçersiz. Başlangıç ve bitişi düzeltin.');
    return;
  }
  if (b - a < 0.3) {
    showToast('Aralık çok kısa (en az 0,3 sn). Sınırları genişletin.');
    return;
  }
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası yerel depoda bulunamadı.');
    return;
  }
  const btn = $(`[data-retranscribe-seg="${index}"]`);
  const oldText = s.text || '';
  if (oldText.trim()) {
    const ok = await askConfirm(
      'Bu bölümün metni yeniden çözümlenecek',
      `Bölüm ${index + 1} (${s.start} – ${s.end}) ses dosyasından kesilip yeniden ` +
        'çözümlenecek. Bu bölümün mevcut metni ve onayı değişecek. ' +
        'Diğer bölümlere dokunulmaz. Ctrl+Z ile geri alınabilir. Devam edilsin mi?'
    );
    if (!ok) return;
  }
  snapshotForUndo(`bölüm ${index + 1} yeniden çözümlendi`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Çözümleniyor…';
  }
  try {
    const pipe = await ensureModel();
    const audio = await decodeForAsr(blob);
    const sr = 16000;
    const from = Math.max(0, Math.floor(a * sr));
    const to = Math.min(audio.length, Math.ceil(b * sr));
    const slice = audio.subarray(from, to);
    if (slice.length < sr * 0.2) {
      showToast('Aralık ses dosyasının dışında. Sınırları kontrol edin.');
      return;
    }
    // Bölüm yeniden çözümlemesi de kendi profilini sabitler (v2.111).
    const segProfile = savedProfilePref();
    const found = await transcribeWindow(pipe, slice, a, segProfile);
    const meaningful = found.filter((f) => !isHallucination(f.text));
    if (!meaningful.length) {
      // Çıkmaz sokak bırakma: sessizliği ÖLÇ ve ne olduğunu somut söyle.
      // Bu bir DSP ölçümüdür (ML değil); "konuşma yok" iddiası değil, sinyal
      // düzeyi bilgisidir. Uzman ne yapacağını bilsin.
      let hint = '';
      try {
        const stats = analyzeSilence(slice, sr, 0, slice.length / sr);
        if (stats.ok) {
          const pctSilent = Math.round(stats.ratio * 100);
          hint =
            pctSilent >= 80
              ? ` Aralığın %${pctSilent}'i sessiz görünüyor — sınırlar boşluğa denk gelmiş olabilir.`
              : ` Aralıkta ses var (%${pctSilent} sessiz) ama model konuşma çözemedi — modeli büyütmeyi veya "Gürültülü/kıcırtılı" profilini deneyin.`;
        }
      } catch (e) {}
      showToast(
        `Model bu aralıkta anlamlı konuşma bulamadı.${hint} Metni elle girin veya aralığı genişletin.`
      );
      return;
    }
    const text = meaningful.map((f) => f.text).join(' ').replace(/\s+/g, ' ').trim();
    // Eski metni geçmişe yaz; yeni metin doğrulanmamıştır.
    if (oldText.trim()) {
      pushSegmentHistory(s, oldText);
    }
    s.text = text;
    // Yeniden çözümlemede de model çıktısı ayrı saklanır (v2.83).
    s.asrText = text;
    s.asrModel = (asrPipeline && asrPipeline.__modelId) || s.asrModel || '';
    s.asrAt = new Date().toISOString();
    s.textRev = 0;
    setSegReview(s, 'pending');
    s.words = meaningful.flatMap((f) => f.words || []);
    logEvent(m, 'Bölüm yeniden çözümlendi', `Bölüm ${index + 1}: ${s.start}–${s.end} · ${meaningful.length} parça`);
    persist();
    renderAudioList();
    renderOverview();
    showToast(`Bölüm ${index + 1} yeniden çözümlendi. Metni dinleyerek doğrulayın.`);
  } catch (e) {
    showToast(`Yeniden çözümleme başarısız: ${e.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '↻ Bu aralığı çözümle';
    }
  }
}
// YENİDEN ÇÖZÜMLEME KORUMASI — saf karar fonksiyonu (v2.103).
// NEDEN: `transcribe()` mevcut bölümlerin ÜZERİNE yazar. v2.102'de koruma
// yalnız "elle düzeltilmiş/onaylanmış" bölüm varsa devreye giriyordu; modelin
// ürettiği ama henüz kimsenin dokunmadığı bölümler SORULMADAN ve GERİ
// ALINAMADAN siliniyordu. Bilirkişi "yanlışlıkla tümünü çözümle" dediğinde
// işi kayboluyordu (canlı veri).
// KURAL: mevcut bölüm varsa üzerine yazılacak demektir → her zaman sor ve geri
// alma kaydı al. Sayıma dayalı dar bir koşul (ör. "yalnız düzeltilmiş varsa")
// tam olarak v2.102'deki hatayı üretti; koşulu geniş tutmak yerine tek ve
// açıklanabilir kural kullanılır. Metni boş bölümler bile EMEKTİR: elle
// yerleştirilmiş zaman sınırları yeniden çözümlemede kaybolur.
function reprocessPlan(segments) {
  const segs = Array.isArray(segments) ? segments : [];
  let edited = 0;
  let approved = 0;
  let untouched = 0;
  for (const s of segs) {
    const rev = Number(s && s.textRev) || 0;
    const hasText = String((s && s.text) || '').trim().length > 0;
    if (rev > 0) edited++;
    else if (s && s.review === 'approved') approved++;
    else if (hasText) untouched++;
  }
  // Hiç bölüm yoksa ilk çözümlemedir; kaybedilecek bir şey yoktur.
  const ask = segs.length > 0;
  return {
    ask,
    snapshot: ask,
    segmentCount: segs.length,
    edited,
    approved,
    untouched
  };
}
// Kuyruk (toplu çözümleme) için toplu özet. Kayıt başına diyalog açmak
// kullanıcıyı yorar; tek soru, kaç kayıtta kaç bölümün silineceğini söyler.
function queueReprocessSummary(materials) {
  const list = Array.isArray(materials) ? materials : [];
  let withSegments = 0;
  let edited = 0;
  let approved = 0;
  let untouched = 0;
  let totalSegments = 0;
  for (const m of list) {
    const p = reprocessPlan(m && m.segments);
    if (p.segmentCount > 0) withSegments++;
    edited += p.edited;
    approved += p.approved;
    untouched += p.untouched;
    totalSegments += p.segmentCount;
  }
  return {
    materials: list.length,
    withSegments,
    edited,
    approved,
    untouched,
    totalSegments,
    ask: withSegments > 0
  };
}
async function transcribe(id, opts = {}) {
  const c = currentCase(),
    m = c.materials.find((x) => x.id === id);
  if (!m) return;
  // Elle yapılmış düzeltme varsa yeniden çözümleme onları SİLER (m.segments
  // üzerine yazılır). Bu, uyarısız yapılamaz. Kullanıcıya sorulur ve eski
  // bölümler geri dönüş için saklanır.
  // v2.103: koruma ARTIK YALNIZ "elle düzeltilmiş" bölüme bağlı değil. Modelin
  // ürettiği, henüz kimsenin dokunmadığı metin de kaybedilebilir; bu yüzden
  // kaybedilecek metin varsa her durumda sorulur ve geri alma kaydı alınır.
  // `opts.confirmed` yalnız toplu çözümlemeden gelir: kullanıcı tek soruda
  // TÜM kayıtlar için onay vermiştir. Geri alma kaydı yine alınır.
  const plan = reprocessPlan(m.segments);
  if (plan.ask) {
    const why = [
      plan.edited ? `${plan.edited} bölüm elle düzeltilmiş` : '',
      plan.approved ? `${plan.approved} bölüm onaylanmış` : '',
      plan.untouched ? `${plan.untouched} bölümde model metni var (henüz kontrol edilmedi)` : ''
    ]
      .filter(Boolean)
      .join(', ');
    if (!opts.confirmed) {
      const devam = await askConfirm(
        'Yeniden çözümleme mevcut metni siler',
        `Bu kayıtta ${plan.segmentCount} bölüm var: ${why}. ` +
          'Yeniden çözümleme bölümlerin TAMAMINI siler ve modelin yeni çıktısıyla değiştirir. ' +
          'Düzeltmeler ve onaylar kaybolur. ' +
          'Eski hâli geri dönebilmek için saklanacak (Ctrl+Z ve İşlem günlüğü). Devam edilsin mi?'
      );
      if (!devam) {
        showToast('Yeniden çözümleme iptal edildi. Mevcut metin korundu.');
        return;
      }
    }
    snapshotForUndo('yeniden çözümleme');
    // Geri dönüş kopyası: eski bölümler kayda yazılır (yalnız son 1 kopya).
    // Anlık kopya yalnız geri dönüş için: metin, zaman, konuşmacı, kontrol durumu.
    // Geçmiş ve kelime zamanlaması kopyalanmaz (dosyayı iki katına çıkarıyordu).
    m.previousSegments = {
      at: new Date().toISOString(),
      count: (m.segments || []).length,
      segments: (m.segments || []).map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        speaker: s.speaker,
        speakerId: s.speakerId,
        text: s.text,
        review: s.review,
        textRev: s.textRev,
        obs: s.obs,
        history: []
      }))
    };
    logEvent(
      m,
      'Yeniden çözümleme öncesi hâl',
      `${plan.segmentCount} bölüm saklandı (${why})`
    );
  }
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası yerel depoda bulunamadı. Yeniden ekleyin.');
    return;
  }
  // PROFİLİ BURADA SABİTLE (v2.111): çözümleme sürerken seçim değişse bile bu
  // kayıt baştan sona AYNI profille çözümlenir. Kayda yazılır; ekranda görünür.
  const runProfile = savedProfilePref();
  try {
    const pipe = await ensureModel();
    m.status = 'transcribing';
    m.hallucinationWarning = null;
    m.progress = 0;
    persist();
    refreshAudioStatusZone(m);
    const audio = await decodeForAsr(blob);
    const total = audio.length;
    const collected = [];
    for (const win of asrWindows(total)) {
      const { offset, end, startSeconds } = win;
      if (m.cancelRequested) {
        m.cancelRequested = false;
        m.status = collected.length ? 'partial' : 'cancelled';
        delete m.progress;
        persist();
        refreshAudioStatusZone(m);
        renderOverview();
        showToast(`${m.name} için çözümleme iptal edildi.`);
        return;
      }
      const window = audio.subarray(offset, end);
      let found = [];
      let windowError = null;
      try {
        found = await transcribeWindow(pipe, window, startSeconds, runProfile);
      } catch (err) {
        windowError = err;
        console.warn('Pencere çözümlenemedi', offset, err);
      }
      if (windowError) {
        m.failedWindows = (m.failedWindows || 0) + 1;
      } else {
        for (const f of found) collected.push({ ...f, speaker: '', review: 'pending' });
      }
      m.progress = Math.min(100, Math.round((end / total) * 100));
      persist();
      refreshAudioStatusZone(m);
    }
    const meaningful = collected.filter((s) => !isHallucination(s.text));
    // Model kimliği ve zamanı her bölüme yazılır; otomatik çıktı (asrText)
    // parseAsrResult içinde zaten ayrıldı (v2.83).
    const mid = (asrPipeline && asrPipeline.__modelId) || '';
    const at = new Date().toISOString();
    for (const sg of collected) {
      if (!sg.asrText) sg.asrText = sg.text || '';
      sg.asrModel = mid;
      if (!sg.asrAt) sg.asrAt = at;
    }
    m.segments = collected;
    const fillerCount = collected.length - meaningful.length;
    if (m.failedWindows) {
      m.hallucinationWarning =
        (m.hallucinationWarning ? m.hallucinationWarning + ' ' : '') +
        `${m.failedWindows} pencere çözümlenemedi; bu bölümler kayıttan elle dinlenip doldurulmalıdır.`;
    }
    delete m.failedWindows;
    if (!collected.length) {
      m.status = 'empty';
      m.hallucinationWarning = 'Model bu kayıtta konuşma tespit edemedi. Kaydı elle dinleyip bölümleri kendiniz girin.';
    } else if (!meaningful.length) {
      m.status = 'empty';
      m.hallucinationWarning =
        'Model bu kayıtta anlamlı konuşma metni üretemedi (çıktı yalnızca anlamsız simge/token içeriyordu ve ayıklandı). ' +
        'Sonuç rapora aktarılmamalıdır. Denenebilecekler: (1) "Çözümleme ve model ayarları"nda Large-v3-turbo modelini seçip yükleyin; ' +
        '(2) kayıt kalitesini kontrol edin; (3) gerekirse bölümleri elle girin.';
    } else {
      if (fillerCount) {
        m.hallucinationWarning = `${fillerCount} bölümde anlamlı metin yerine dolgu ifadesi üretildi; bu bölümler uzman tarafından dinlenerek doldurulmalıdır.`;
      }
      m.status = 'review';
    }
    delete m.progress;
    m.transcribedAt = new Date().toISOString();
    m.transcribedWithModel = (asrPipeline && asrPipeline.__modelId) || null;
    // Hangi çözümleme profili kullanıldı (v2.111). RAPORA YAZILMAZ; yalnız
    // "bu kayıt hangi ayarla çözümlendi" sorusunu yanıtlar.
    m.transcribedWithProfile = runProfile;
    logEvent(m, 'Çözümleme tamamlandı', `${meaningful.length} anlamlı bölüm, ${fillerCount || 0} dolgu bölümü`);
    const text = meaningful.map((s) => s.text).join(' ');
    if (looksNonTurkish(text)) {
      m.languageWarning = 'Çıktı Türkçe dışı görünebilir; kaydı dinleyerek kontrol edin.';
    } else {
      delete m.languageWarning;
    }
    persist();
    renderAudioList();
    renderOverview();
    showToast(`${m.name} için çözümleme tamamlandı. Metin kontrol bekliyor.`);
  } catch (e) {
    // Yükleme hatası ile çözümleme hatasını ayır: kullanıcı ne olduğunu ve ne
    // yapması gerektiğini anlasın.
    const isLoad = /Model yüklenemedi|yükleniyor/i.test(String(e && e.message));
    // Model yükleme hatası da bir çözümleme hatasıdır; ayrım statusNote'ta
    // ve uyarı metninde tutulur (kullanıcı ne yapacağını görsün).
    m.status = 'error';
    m.statusNote = isLoad ? 'model-yuklenemedi' : 'cozumleme-hatasi';
    m.hallucinationWarning = isLoad
      ? 'Model yüklenemedi. "Çözümleme ve model ayarları"ndan modeli yeniden yükleyip tekrar deneyin. Ayrıntı: ' +
        String(e && e.message)
      : 'Çözümleme sırasında hata oluştu: ' + String(e && e.message);
    delete m.progress;
    persist();
    refreshAudioStatusZone(m);
    showToast(`${m.name}: ${isLoad ? 'model yüklenemedi' : 'çözümleme başarısız'} — ${e.message}`);
  }
}
// A new manual segment starts where the previous one ended, or at the player's
// current position, so the expert does not have to type timecodes by hand while
// listening. Both fall back to 00:00:00 when neither is available.
function addManualSegment(id) {
  const c = currentCase(),
    m = c.materials.find((x) => x.id === id);
  if (!m) return;
  m.segments = m.segments || [];
  const last = m.segments[m.segments.length - 1];
  let start = last ? last.end : null;
  if (!start) {
    const card0 = $(`[data-transcribe="${CSS.escape(id)}"]`)?.closest('.audio-card');
    const pl = card0?.querySelector('audio');
    if (pl && Number.isFinite(pl.currentTime) && pl.currentTime > 0) start = timecode(pl.currentTime);
  }
  // Zaman kodu HER ZAMAN milisaniye içerir (depo kuralı). Eski '00:00:00'
  // biçimi raporda "00:00:00 – 00:00:05.000" gibi tutarsız satır üretiyordu.
  start = start || timecode(0);
  const stSec = secondsFromTimecode(start);
  const durSec = Number(m.duration) || 0;
  let endSec = stSec + 5;
  if (durSec > 0) endSec = Math.min(endSec, durSec);
  const end = timecode(endSec > stSec ? endSec : stSec);
  snapshotForUndo('elle bölüm eklendi');
  // Konuşmacı kaydı yoksa oluştur; aksi hâlde bölüm, listede olmayan bir
  // konuşmacıya bağlanır ve seçim kutusu "(kayıtlı değil)" gösterir.
  ensureSpeakers(m);
  const spk = (m.speakers || []).find((x) => x.name === 'Konuşmacı 1') || null;
  if (!spk) {
    m.speakers.push({
      id: uid(),
      code: '',
      name: 'Konuşmacı 1',
      role: 'unspecified',
      gender: 'unspecified',
      ageRange: '',
      notes: '',
      pitch: null,
      pitchAt: null
    });
    assignSpeakerCodes(m.speakers);
  }
  m.segments.push({
    id: newId('sg'),
    start,
    end,
    speaker: 'Konuşmacı 1',
    text: '',
    checked: false,
    review: 'pending',
    textRev: 0
  });
  m.activeSeg = m.segments.length - 1;
  persist();
  const card = $(`[data-transcribe="${CSS.escape(id)}"]`)?.closest('.audio-card');
  if (card) renderSegments(m, card);
  renderSpeakersPanel(m);
  renderOverview();
}
function niceDate(d) {
  if (!d) return '—';
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString('tr-TR');
  } catch (e) {
    return d;
  }
}
// Court type drives the cover-field terminology and the report heading. The
// Ministry publishes a separate template per jurisdiction, so a criminal file
// must not be labelled with civil "davacı/davalı" roles.
// Cover-field terminology per jurisdiction, taken from the Ministry's published
// templates. Measured fact: all four templates use the *same* seven report
// sections; only the cover labels differ. So jurisdiction handling lives here,
// not in the section structure.
// Merci türüne göre kapak terminolojisi VE bölüm içi ifadeler. Bakanlığın
// yayımladığı dört şablonun yedi bölümlü yapısı aynıdır; ancak soruları yönelten
// merci farklı olduğundan (mahkeme, savcılık, icra müdürlüğü) bölüm içi ifadeler
// merciye göre uyarlanmalıdır. "Mahkemece yöneltilen sorular" savcılık dosyasında
// yanlış olurdu.
const REPORT_TYPES = {
  hukuk: {
    label: 'HUKUK MAHKEMELERİ – İDARE / VERGİ MAHKEMELERİ',
    heading: 'BİLİRKİŞİ RAPORU',
    merci: 'Mahkeme',
    fileNo: 'DOSYA NO',
    roles: {
      plaintiff: 'DAVACI',
      plaintiffCounsel: 'DAVACI VEKİLİ',
      defendant: 'DAVALI',
      defendantCounsel: 'DAVALI VEKİLİ'
    },
    subject: 'DAVA KONUSU',
    date: 'DAVA TARİHİ',
    questionSource: 'Mahkemece',
    assignmentLabel: 'Görevlendirme yazısı'
  },
  ceza: {
    label: 'CEZA MAHKEMELERİ',
    heading: 'BİLİRKİŞİ RAPORU',
    merci: 'Mahkeme',
    fileNo: 'DOSYA NO',
    roles: {
      plaintiff: 'MÜŞTEKİ/MAĞDUR /KATILAN',
      plaintiffCounsel: 'VEKİLİ',
      defendant: 'SANIK',
      defendantCounsel: 'SANIK VEKİLİ'
    },
    subject: 'İNCELEME KONUSU',
    date: 'SUÇ TARİHİ',
    questionSource: 'Mahkemece',
    assignmentLabel: 'Görevlendirme yazısı'
  },
  savcilik: {
    label: 'CUMHURİYET BAŞSAVCILIĞI',
    heading: 'BİLİRKİŞİ RAPORU',
    merci: 'Cumhuriyet Başsavcılığı',
    fileNo: 'SORUŞTURMA NO',
    roles: {
      plaintiff: 'MÜŞTEKİ/MAĞDUR',
      plaintiffCounsel: 'VEKİLİ',
      defendant: 'ŞÜPHELİ',
      defendantCounsel: 'ŞÜPHELİ VEKİLİ'
    },
    subject: 'SORUŞTURMA KONUSU',
    date: 'SUÇ TARİHİ',
    questionSource: 'Cumhuriyet Başsavcılığınca',
    assignmentLabel: 'Görevlendirme yazısı'
  },
  icra: {
    label: 'İCRA MÜDÜRLÜĞÜ',
    heading: 'BİLİRKİŞİ RAPORU',
    merci: 'İcra Müdürlüğü',
    fileNo: 'DOSYA NO',
    roles: {
      plaintiff: 'ALACAKLI',
      plaintiffCounsel: 'ALACAKLI VEKİLİ',
      defendant: 'BORÇLU',
      defendantCounsel: 'BORÇLU VEKİLİ'
    },
    subject: 'TAKİP KONUSU',
    date: 'TAKİP TARİHİ',
    questionSource: 'İcra Müdürlüğünce',
    assignmentLabel: 'Görevlendirme yazısı'
  }
};
// Turkish dative suffix for institution names, so the report heading reads
// "…MAHKEMESİ'NE", "…BAŞSAVCILIĞI'NA", "…MÜDÜRLÜĞÜ'NE" instead of a fixed "NE".
// Buffer is 'n' after a 3rd-person possessive, otherwise 'y'; the vowel follows
// the last vowel of the name (back -> a, front -> e).
const TR_VOWELS = 'aeıioöuü';
const TR_POSSESSIVE = /(sı|si|su|sü|ğı|ği|ğu|ğü)$/;
function trDative(name) {
  const s = String(name || '').trim();
  if (!s) return 'NE';
  const lower = s.toLocaleLowerCase('tr-TR');
  let last = 'e';
  for (let i = lower.length - 1; i >= 0; i--) {
    if (TR_VOWELS.includes(lower[i])) {
      last = lower[i];
      break;
    }
  }
  const back = 'aıou'.includes(last);
  const v = back ? 'a' : 'e';
  const endsVowel = TR_VOWELS.includes(lower[lower.length - 1]);
  const suf = endsVowel ? (TR_POSSESSIVE.test(lower) ? 'n' : 'y') + v : v;
  return suf.toLocaleUpperCase('tr-TR');
}
// Konuşmacı tablosu satırlarını üretir (HTML/DOCX/UDF ortak veri).
// Kayıt kökeni (chain of custody) paneli. Her kayıt için ortam türü, ortam
// etiketi, teslim eden kişi, teslim tarihi ve kayıt cihazı bilgisi girilir.
// Bu, kaydın nereden geldiğini ve nasıl teslim edildiğini belgeler.
function originPanelHtml(m) {
  const o = m.origin || {};
  const typeOpts = MEDIUM_TYPE.map(
    (code) =>
      `<option value="${esc(code)}" ${o.mediumType === code ? 'selected' : ''}>${esc(MEDIUM_TYPE_LABEL[code] || code)}</option>`
  ).join('');
  return `<div class="seg-row2">
    <div class="seg-field"><label>Ortam türü</label><select data-origin="${esc(m.id)}" data-origin-key="mediumType">${typeOpts}</select></div>
    <div class="seg-field"><label>Ortam etiketi / seri no</label><input data-origin="${esc(m.id)}" data-origin-key="mediumLabel" value="${esc(o.mediumLabel || '')}" placeholder="Örn. CD-1, FLASH-2, SN:..."></div>
  </div>
  <div class="seg-row2">
    <div class="seg-field"><label>Teslim eden</label><input data-origin="${esc(m.id)}" data-origin-key="deliveredBy" value="${esc(o.deliveredBy || '')}" placeholder="Ad soyad / birim"></div>
    <div class="seg-field"><label>Teslim tarihi</label><input type="date" data-origin="${esc(m.id)}" data-origin-key="deliveredAt" value="${esc(o.deliveredAt || '')}"></div>
  </div>
  <div class="seg-field"><label>Kayıt cihazı / kayıt tarihi (varsa)</label><input data-origin="${esc(m.id)}" data-origin-key="deviceInfo" value="${esc(o.deviceInfo || '')}" placeholder="Örn. cep telefonu, 12.03.2026 14:20"></div>`;
}
function originRows(c) {
  const out = [];
  for (const m of c.materials || []) {
    const o = m.origin || {};
    out.push([
      m.name,
      o.mediumType ? MEDIUM_TYPE_LABEL[o.mediumType] || o.mediumType : REPORT_TEXT.originEmpty,
      o.mediumLabel || REPORT_TEXT.originEmpty,
      o.deliveredBy || REPORT_TEXT.originEmpty,
      o.deliveredAt ? niceDate(o.deliveredAt) : REPORT_TEXT.originEmpty,
      o.deviceInfo || REPORT_TEXT.originEmpty
    ]);
  }
  return out;
}
function speakerRows(c) {
  const out = [];
  for (const m of c.materials || []) {
    for (const sp of m.speakers || []) {
      if (!sp.name || sp.name === 'Belirtilmedi') continue;
      const segs = (m.segments || []).filter((sg) => (sg.speaker || '') === sp.name);
      const dur = segs.length ? `${m.name}: ${segs.length} bölüm` : `${m.name}`;
      const note = [sp.notes, sp.pitchSamples ? `perde ${sp.pitchSamples} örnek` : ''].filter(Boolean).join(' · ');
      // Standart kod (S1, S2…) raporda kimliği belirsizleştirmeden taşır;
      // etiket değişse de aynı kişi aynı kodla görünür.
      const code = sp.code ? `${sp.code} · ` : '';
      // Rol ve cinsiyet KOD olarak saklanır; raporda Türkçe ETİKET görünür.
      // Kod yazılırsa rapora "complainant" girer — kabul edilemez.
      out.push([
        `${code}${sp.name}`,
        SPEAKER_ROLE_LABEL[sp.role] || sp.role || 'Belirtilmedi',
        SPEAKER_GENDER_LABEL[sp.gender] || sp.gender || 'Belirtilmedi',
        sp.ageRange || '—',
        pitchCellText(sp),
        `${dur}${note ? ' · ' + note : ''}`
      ]);
    }
  }
  return out;
}
// Rapor tablosunda zaman aralığını TEK biçimde yazar. Bölüm sınırı elle
// girilmiş eski kayıtta "00:00:00" (ms'siz) olabilir; yanında ".000" varsa
// sütun tutarsız görünür. Bu yardımcı her iki ucu aynı biçime çeker.
// Depo kuralı: zaman kodu HER ZAMAN milisaniye içerir.
function tcRange(a, b) {
  const dash = REPORT_TEXT.timeDash;
  if (!a && !b) return dash;
  const norm = (v) => (v == null || v === '' ? dash : timecode(secondsFromTimecode(v)));
  return `${norm(a)} – ${norm(b)}`;
}
function segObsText(s) {
  const o = s.obs || {};
  const keys = Object.keys(o).filter((k) => o[k]);
  if (!keys.length) return '—';
  return keys.map((k) => REPORT_TEXT.obsLabels[k] || k).join(', ');
}
// Raporun ÜÇ çıktısı (HTML/DOCX/UDF) aynı hücreyi kullanır. Aksi hâlde aynı
// bölüm bir çıktıda "S1 · Kiracı", diğerinde "Kiracı" görünür ve tutarlılık
// testi haklı olarak kalır.
function segSpeakerCell(m, s) {
  const name = s.speaker || REPORT_TEXT.emptySpeaker;
  if (!s.speaker) return name;
  const rec = speakerByName(m, s.speaker);
  return rec?.code ? `${rec.code} · ${name}` : name;
}
function chanModeText(m) {
  const mode = channelMode(m);
  if (m.tech?.channels !== 2) return '—';
  return mode === 'left' ? 'Yalnız sol kanal' : mode === 'right' ? 'Yalnız sağ kanal' : 'Stereo (her iki kanal)';
}
// Seviye ölçümü tablosunun satırları. Yalnızca gerçekten ölçülmüş kayıtlar
// girer; ölçülmemiş kayıt için satır üretilmez (yapılmayan ölçüm rapora
// yazılmaz). Üç oluşturucu da bu tek kaynaktan beslenir.
function levelRowsForCase(c) {
  return (c.materials || [])
    .filter((m) => m.levels && m.levels.ok && m.levels.schema === LEVELS_SCHEMA)
    .map((m) => {
      const lv = m.levels;
      const extra = [];
      // HANGİ KANALDAN ölçüldüğü yazılır (v2.91): iki kanal çok farklıysa
      // "tepe" değerinin hangi kanala ait olduğu kritik bilgidir. Mono
      // kayıtta kanal numarası yazılmaz (yanıltıcı olur).
      if (lv.channels > 1 && lv.peakChannel) extra.push(`tepe kanal ${lv.peakChannel}`);
      if (lv.channels > 1 && lv.clippedSamples > 0 && lv.clipChannel)
        extra.push(`kırpılma kanal ${lv.clipChannel}`);
      if (lv.rolloff) extra.push(`bant P95: ${fmtDb(lv.rolloff.rolloffHz)} Hz`);
      if (lv.stereo && lv.stereo.balanceDb != null) extra.push(`denge: ${fmtDb(lv.stereo.balanceDb)} dB`);
      if (lv.stereo && lv.stereo.correlation != null)
        extra.push(`korelasyon: ${lv.stereo.correlation.toFixed(3).replace('.', ',')}`);
      return [
        m.name,
        fmtDb(lv.peakDb),
        fmtDb(lv.rmsDb),
        `%${fmtPct(lv.clippedRatio)}`,
        floorText(lv.noiseFloor),
        snrText(lv.snrDb),
        extra.join(' · ') || '—'
      ];
    });
}
// İnceleme özeti: raporda ne yapıldığını ve ne kaldığını sayısal olarak
// gösterir. Her satır yalnızca gerçek veriden üretilir; tahmin içermez.
function reviewSummaryRows(c) {
  const mats = c.materials || [];
  const segs = mats.flatMap((m) => m.segments || []);
  const reviewed = segs.filter((s) => isReviewed(s)).length;
  const inaudible = segs.filter((s) => segReview(s) === 'inaudible').length;
  const blank = segs.filter((s) => isHallucination(s.text)).length;
  const observed = segs.filter((s) => s.obs && Object.keys(s.obs).some((k) => s.obs[k])).length;
  const silenceMeasured = segs.filter((s) => s.silence && s.silence.ok && s.silence.schema === SILENCE_SCHEMA).length;
  const spec = mats.filter((m) => m.spectrogramReviewed).length;
  const chan = mats.filter((m) => m.tech?.channels === 2 && channelMode(m) !== 'both').length;
  const speakers = mats.reduce(
    (n, m) => n + (m.speakers || []).filter((s) => s.name && s.name !== 'Belirtilmedi').length,
    0
  );
  const pitched = mats.reduce((n, m) => n + (m.speakers || []).filter((s) => s.pitch).length, 0);
  const levelMeasured = mats.filter((m) => m.levels && m.levels.ok && m.levels.schema === LEVELS_SCHEMA).length;
  // Köken belgelenmiş sayılır: ortam türü 'Belirtilmedi' dışında bir değer ve
  // en az bir teslim bilgisi (eden veya tarih) girilmişse.
  const originFilled = mats.filter((m) => {
    const o = m.origin || {};
    return o.mediumType && o.mediumType !== 'unspecified' && (o.deliveredBy || o.deliveredAt);
  }).length;
  const originMedium = mats.filter(
    (m) => m.origin && m.origin.mediumType && m.origin.mediumType !== 'unspecified'
  ).length;
  // Özet sayacı TABLO ile aynı kaynaktan gelir (v2.90): ikisi ayrışırsa
  // "WER ölçümü yapılan kayıt: 1" yazarken tabloda 0 satır görünür.
  const werMeasured = werMeasuredCount(c);
  return [
    [REPORT_TEXT.rsMaterials, mats.length],
    [REPORT_TEXT.rsSegments, segs.length],
    [REPORT_TEXT.rsReviewed, reviewed],
    [REPORT_TEXT.rsUnreviewed, segs.length - reviewed],
    [REPORT_TEXT.rsInaudible, inaudible],
    [REPORT_TEXT.rsBlank, blank],
    [REPORT_TEXT.rsObservations, observed],
    [REPORT_TEXT.rsSilence, silenceMeasured],
    [REPORT_TEXT.rsSpectrogram, spec],
    [REPORT_TEXT.rsChannel, chan],
    [REPORT_TEXT.rsSpeaker, speakers],
    [REPORT_TEXT.rsPitch, pitched],
    [REPORT_TEXT.rsLevel, levelMeasured],
    [REPORT_TEXT.rsOriginMedium, originMedium],
    [REPORT_TEXT.rsOriginFilled, originFilled],
    [REPORT_TEXT.rsWerMeasured, werMeasured]
  ];
}
// Soru ve değerlendirme bölümlerinin varsayılan metinleri mercie göre
// uyarlanır. Örneğin savcılık dosyasında "mahkemece yöneltilen sorular"
// yanlış olurdu; soruları Cumhuriyet Başsavcılığı yöneltir.
function questionsFallbackText(c) {
  const spec = reportTypeSpec(c.reportType);
  return `${spec.questionSource} bilirkişiye yöneltilen sorular, yazıdaki sırasıyla bu bölümde gösterilir.`;
}
function evaluationFallbackText(c) {
  const spec = reportTypeSpec(c.reportType);
  return `Teknik sorulara ilişkin değerlendirme, ${spec.assignmentLabel.toLowerCase()}nda yer alan sorular doğrultusunda eklenir.`;
}
function reportTypeSpec(t) {
  return REPORT_TYPES[t] || REPORT_TYPES.hukuk;
}
function reportTypeLabel(t) {
  return reportTypeSpec(t).label;
}
// Raporun üst satırı ve belge üst bilgisi, dosyada girilen uzmanlık alanını
// gösterir. Alan boşsa yalnızca kod yazılır; uydurma bir açıklama eklenmez.
function expertFieldShort(c) {
  const raw = String((c && c.expertField) || '').trim() || REPORT_TEXT.defaultField;
  const code = raw.match(/^\d+(?:\.\d+)*/);
  return code ? code[0] : raw;
}
function reportRows(c) {
  const spec = reportTypeSpec(c.reportType);
  const r = spec.roles;
  return [
    [spec.fileNo, c.fileNo],
    [r.plaintiff, c.plaintiff],
    [r.plaintiffCounsel, c.plaintiffCounsel],
    [r.defendant, c.defendant],
    [r.defendantCounsel, c.defendantCounsel],
    [spec.subject, c.subject],
    [spec.date, niceDate(c.caseDate)],
    ['GÖREVLENDİRME TARİHİ', niceDate(c.assignmentDate)],
    ['VERİLEN SÜRE', c.assignmentDurationDays ? `${c.assignmentDurationDays} GÜN` : ''],
    ['SON TESLİM TARİHİ', niceDate(c.dueDate)],
    ['KEŞİF / İNCELEME TARİHİ', niceDate(c.inspectionDate)],
    ['RAPOR TARİHİ', niceDate(c.reportDate)],
    ['BİLİRKİŞİ ADI SOYADI', c.expertName],
    [REPORT_TEXT.expertFieldHeading, c.expertField],
    ['BİLİRKİŞİ SİCİL NO', c.registryNo]
  ].filter((x) => x[1] && x[1] !== '—');
}
// RAPOR HAZIRLIK DENETİMİ (v2.150).
// Kullanıcı: "eksikle rapor üretmeyi engelle." KURAL: uydurma "hazırlık
// yüzdesi" YOK; yalnız madde + sayı. Her madde nereye gidileceğini söyler.
// Bu bir DENETİM LİSTESİDİR, onay değildir; raporu yine de okuyun.
const READINESS_TARGETS = ['case', 'audio', 'questions', 'report'];
function reportReadiness(c) {
  const items = [];
  const materials = c && Array.isArray(c.materials) ? c.materials : [];
  const segs = materials.flatMap((m) => (m && Array.isArray(m.segments) ? m.segments : []));
  const txt = (v) => String(v == null ? '' : v).trim();
  const add = (key, label, count, target, detail, filter, action) => {
    if (!(count > 0)) return;
    items.push({ key, label, count, target, detail: detail || '', filter: filter || '', action: action || '' });
  };
  add('fileNo', 'Dosya numarası boş', txt(c && c.fileNo) ? 0 : 1, 'case', 'Kapak ve alt bilgi boş kalır.');
  add('court', 'Mahkeme boş', txt(c && c.court) ? 0 : 1, 'case', 'Rapor başlığı varsayılan mahkeme adıyla yazılır.');
  add('expert', 'Bilirkişi adı boş', txt(c && c.expertName) ? 0 : 1, 'case', 'Künyede ad alanı boş kalır.');
  add('materials', 'Ses kaydı yok', materials.length ? 0 : 1, 'audio', 'Envanter ve deşifre bölümleri boş görünür.');
  add(
    'noSegments',
    'Bölümlenmemiş kayıt',
    materials.filter((m) => !((m && m.segments) || []).length).length,
    'audio',
    'Bu kayıtların deşifre tablosu boş görünür.'
  );
  const b = pendingBreakdown(segs);
  add('pending', 'Kontrol edilmemiş bölüm', b.total, 'audio', pendingSummaryText(segs), 'pending');
  const amb = segs.filter((s) => segReview(s) === 'ambiguous' && !txt(s.chosen)).length;
  add('ambiguous', 'Belirsiz okumada seçim yok', amb, 'audio', 'Rapora "seçilmedi" olarak girer; belirsizlik gizlenmez.');
  const noSpk = segs.filter((s) => !txt(s.speaker) || txt(s.speaker) === 'Belirtilmedi').length;
  add('speaker', 'Konuşmacı atanmamış bölüm', noSpk, 'audio', 'Raporda konuşmacı sütunu boş kalır.');
  // KAPSAMA (v2.156): "Kapsam" düğmesi ile "Rapor hazırlığı" AYNI gerçeği
  // söyler. Boşluk = bölümlenmemiş aralık; süre bilinmiyorsa boşluk üretilmez
  // (uydurma yok). Dürüst sınır: boşluk "konuşma yok" demek değildir.
  const covs = materials.map((m) => segmentCoverage((m && m.segments) || [], Number(m && m.duration) || 0)).filter((x) => x.ok);
  const gapCount = covs.reduce((n, x) => n + x.gaps.length, 0);
  const gapSec = covs.reduce((n, x) => n + x.gaps.reduce((t, g) => t + (g.b - g.a), 0), 0);
  add(
    'coverage',
    'Bölümlenmemiş ses aralığı',
    gapCount,
    'audio',
    `${String(gapSec.toFixed(1)).replace('.', ',')} sn · "Kapsam" düğmesinden aralıkları görün.`,
    '',
    'coverage'
  );
  add(
    'time',
    'Zaman sorunu olan bölüm',
    segmentTimeIssueIndexes(segs).size,
    'audio',
    'Çakışan/yinelenen aralıklar raporda da çelişkili görünür.',
    'time'
  );
  add(
    'hash',
    'SHA-256 hesaplanmamış kayıt',
    materials.filter((m) => !isSha256Hex(m && m.sha256)).length,
    'audio',
    'Envanterde "Hesaplanamadı" yazar; bütünlük iddia edilemez.'
  );
  add(
    'origin',
    'Teslim/köken bilgisi girilmemiş kayıt',
    materials.filter((m) => m && !m.synthetic && (!m.origin || !m.origin.mediumType || m.origin.mediumType === 'unspecified'))
      .length,
    'audio',
    'Köken tablosunda "—" görünür.'
  );
  add(
    'log',
    'Delil günlüğünde zincir kırığı',
    materials.filter((m) => m && logChainState(m.log).state === 'broken').length,
    'audio',
    'Günlük sonradan değiştirilmiş olabilir.'
  );
  add(
    'questions',
    'İnceleme sorusu yok',
    c && Array.isArray(c.questions) && c.questions.length ? 0 : 1,
    'questions',
    'Raporda varsayılan soru metni kullanılır.'
  );
  return { ok: items.length === 0, items };
}
function readinessRowsHtml(r) {
  const items = (r && r.items) || [];
  if (!items.length)
    return '<div class="ready-empty">Eksik görünmüyor. Bu bir denetim listesidir, onay değildir — raporu yine de okuyun.</div>';
  return items
    .map(
      (it) =>
        `<button class="ready-row" data-ready-goto="${esc(it.target)}"${it.filter ? ` data-ready-filter="${esc(it.filter)}"` : ''}${it.action ? ` data-ready-action="${esc(it.action)}"` : ''} title="${esc(it.detail || '')}"><span class="ready-n">${it.count}</span><span class="ready-l">${esc(it.label)}</span><span class="ready-go">git ›</span></button>`
    )
    .join('');
}
function renderReportReadiness(c) {
  const el = $('#reportReadiness');
  if (!el) return;
  const r = reportReadiness(c);
  el.classList.toggle('is-ok', r.ok);
  el.innerHTML =
    `<div class="ready-head"><b>Rapor hazırlığı</b><small>${
      r.ok ? 'Eksik görünmüyor' : `${r.items.length} konu eksik`
    } · denetim listesidir, onay değildir</small></div>` + readinessRowsHtml(r);
}
function renderReport() {
  const c = currentCase();
  if (!c) return;
  renderReportReadiness(c);
  const materials = c.materials || [];
  const allSegs = materials.flatMap((m) => m.segments || []);
  const checked = allSegs.filter((s) => isReviewed(s)).length;
  const warnings = [];
  if (!c.court || !c.fileNo || !c.expertName) warnings.push(REPORT_TEXT.warnMissingFields);
  if (!materials.length) warnings.push(REPORT_TEXT.warnNoMaterials);
  // Teslim bilgisi girilmemiş kayıtlar rapora "—" olarak yazılır. Uzman
  // bunu görmeden raporu bitirmemeli; eksik künye sessizce geçmemeli.
  const noIntake = materials.filter(
    (m) => !m.synthetic && (!m.origin || !m.origin.mediumType || m.origin.mediumType === 'unspecified')
  );
  if (noIntake.length)
    warnings.push(
      `${noIntake.length} kaydın teslim bilgisi (ortam türü/teslim eden) girilmedi; raporda "—" olarak görünecek.`
    );
  // Zinciri kırık günlük varsa bu adli bir uyarıdır; sessiz geçemez.
  const brokenLogs = materials.filter((m) => logChainState(m.log).state === 'broken');
  if (brokenLogs.length)
    warnings.push(
      `${brokenLogs.length} kaydın delil günlüğünde zincir kırığı var; günlük sonradan değiştirilmiş olabilir.`
    );
  if (allSegs.length && checked < allSegs.length)
    warnings.push(`${allSegs.length - checked} deşifre bölümü henüz uzman tarafından kontrol edilmedi.`);
  const anlasilmadi = allSegs.filter((s) => segReview(s) === 'inaudible').length;
  if (anlasilmadi)
    warnings.push(`${anlasilmadi} bölüm "anlaşılmadı" olarak işaretlendi; bu bölümler için metin iddia edilmemelidir.`);
  if (materials.some((m) => m.languageWarning)) warnings.push(REPORT_TEXT.warnLanguage);
  if (materials.some((m) => m.hallucinationWarning)) warnings.push(REPORT_TEXT.warnHallucination);
  const blankSegs = allSegs.filter((s) => isHallucination(s.text)).length;
  if (blankSegs) warnings.push(`${blankSegs} deşifre bölümünde anlamlı metin yok (dolgu/boş).`);
  const repSegs = allSegs.filter((s) => segmentRepetitionFlag(s)).length;
  if (repSegs) warnings.push(`${repSegs} deşifre bölümünde model tekrarı olasılığı var; kaydı dinleyerek doğrulayın.`);
  const warning = $('#reportWarning');
  if (warnings.length) {
    warning.classList.add('show');
    warning.innerHTML = `<b>${esc(REPORT_TEXT.warnPreReport)}</b> ` + warnings.map(esc).join(' ');
  } else {
    warning.classList.remove('show');
    warning.innerHTML = '';
  }
  const toc = REPORT_TEXT.sections;
  let html = `<div class="paper-topline"><span>${esc(reportTypeLabel(c.reportType))}</span><span>${esc(REPORT_TEXT.toplineField)}${esc(expertFieldShort(c))}</span></div><div class="paper-title"><div class="republic">T.C.</div><h2>${esc((c.court || REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR'))}’${esc(trDative(c.court || 'Mahkemesi'))}</h2><h2>${esc(reportTypeSpec(c.reportType).heading)}</h2><p>${esc(REPORT_TEXT.subtitle)}</p></div>`;
  if (c.synthetic) html += `<div class="paper-synthetic">${esc(REPORT_TEXT.synthetic)}</div>`;
  html += `<table class="paper-table cover-fields"><tbody>${reportRows(c)
    .map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`)
    .join('')}</tbody></table>`;
  html += `<div class="paper-section toc-section"><h3>${esc(REPORT_TEXT.tocHeading)}</h3><ol>${toc.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
  html += `<div class="paper-page-break"><div class="paper-section"><h3>${esc(REPORT_TEXT.sections[0])}</h3><p>${esc(c.assignmentScope || REPORT_TEXT.defaultScope)}</p><p><b>İnceleme konusu:</b> ${esc(c.subject || '—')}</p></div>`;
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[1])}</h3>`;
  if (c.questions?.length) {
    html += `<ol class="question-list">${c.questions.map((q) => `<li>${esc(q.question || REPORT_TEXT.defaultQuestion)}</li>`).join('')}</ol>`;
  } else html += `<p>${esc(questionsFallbackText(c))}</p>`;
  html += `</div>`;
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[2])}</h3><p>${esc(REPORT_TEXT.defaultInventoryIntro)}</p><table class="paper-table"><thead><tr>${REPORT_TEXT.inventoryHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${materials.length ? materials.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.tech?.codec || m.type || REPORT_TEXT.codecFallback)} / ${fmtSize(m.size)}</td><td>${fmtTime(m.duration || 0)}</td><td>${esc(fmtChannels(m.tech?.channels))}${m.tech?.sampleRate ? ' · ' + esc(m.tech.sampleRate) + ' Hz' : ''}${m.tech?.bitDepth ? ' · ' + esc(m.tech.bitDepth) + ' bit' : ''}${m.tech?.channels === 2 ? '<br>Dinlenen: ' + esc(chanModeText(m)) : ''}${m.spectrogramReviewed ? '<br>' + esc(REPORT_TEXT.spectrogramLabel) + ' (' + esc(new Date(m.spectrogramReviewed.at).toLocaleString('tr-TR')) + ')' : ''}</td><td style="font-size:8px;word-break:break-all">${esc(m.sha256 || 'Hesaplanamadı')}</td></tr>`).join('') : `<tr><td colspan="5">${esc(REPORT_TEXT.noInventoryRow[0])}</td></tr>`}</tbody></table><p class="paper-muted">${esc(REPORT_TEXT.inventoryNote)}</p></div>`;
  const orgRows = originRows(c);
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.originHeading)}</h3><p>${esc(REPORT_TEXT.originIntro)}</p><table class="paper-table"><thead><tr>${REPORT_TEXT.originHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${orgRows.length ? orgRows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="6">${esc(REPORT_TEXT.noMaterials)}</td></tr>`}</tbody></table></div>`;
  const spkRows = speakerRows(c);
  html += `<div class="paper-section"><h3>Konuşmacılar</h3><p>${esc(REPORT_TEXT.speakerIntro)}</p><table class="paper-table"><thead><tr>${REPORT_TEXT.speakerHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${spkRows.length ? spkRows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="6">${esc(REPORT_TEXT.noSpeakerRow[0])}</td></tr>`}</tbody></table></div>`;
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[3])}</h3><p>${esc(c.methodText || DEFAULT_METHOD).replace(/\n/g, '<br>')}</p></div>`;
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[4])}</h3><h4>${esc(REPORT_TEXT.sub51)}</h4>`;
  if (materials.length) {
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      html += `<h4>5.1.${i + 1}. ${esc(m.name)}</h4><p class="paper-muted">Süre: ${fmtTime(m.duration || 0)} · Biçim: ${esc(m.type || REPORT_TEXT.codecFallback)} · ${esc(REPORT_TEXT.segmentCountLabel)}: ${(m.segments || []).length}</p>`;
      if (m.hallucinationWarning)
        html += `<p class="paper-muted">${esc(REPORT_TEXT.evidenceWarningPrefix)} ${esc(m.hallucinationWarning)}</p>`;
      if (m.languageWarning)
        html += `<p class="paper-muted">${esc(REPORT_TEXT.languageWarningPrefix)} ${esc(m.languageWarning)}</p>`;
      if (m.segments?.length) {
        html += `<table class="paper-table"><thead><tr>${REPORT_TEXT.segmentHeadersObs.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${m.segments.map((s) => `<tr><td>${esc(tcRange(s.start, s.end))}</td><td>${esc(segSpeakerCell(m, s))}</td><td>${esc(s.text || '')}</td><td>${esc(reviewCellText(s))}</td><td>${esc(segObsText(s))}</td></tr>`).join('')}</tbody></table>`;
      } else html += `<p>${esc(REPORT_TEXT.noTranscript)}</p>`;
    }
  } else html += `<p>${esc(REPORT_TEXT.noMaterials)}</p>`;
  html += `<h4>${esc(REPORT_TEXT.sub52)}</h4>`;
  if (c.questions?.length) {
    for (let i = 0; i < c.questions.length; i++) {
      const q = c.questions[i];
      html += `<h4>5.2.${i + 1}. ${esc(q.question || REPORT_TEXT.defaultQuestion)}</h4><p>${esc(q.answer || REPORT_TEXT.defaultAnswer)}</p><p class="paper-muted"><b>Dayanak:</b> ${esc(q.basis || REPORT_TEXT.defaultBasis)}</p>`;
    }
  } else html += `<p>${esc(evaluationFallbackText(c))}</p>`;
  html += `<h4>${esc(REPORT_TEXT.sub53)}</h4><p>${esc(c.limitationsText || REPORT_TEXT.defaultLimitations)}</p></div>`;
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[5])}</h3><p>${esc(c.conclusionText || REPORT_TEXT.defaultConclusion)}</p></div>`;
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[6])}</h3><p>${esc(REPORT_TEXT.attachmentsText)}</p></div>`;
  const rsRows = reviewSummaryRows(c);
  const werRows = measureWerForCase(c);
  if (werRows.length) {
    html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.werHeading)}</h3><p>${esc(REPORT_TEXT.werIntro)}</p><table class="paper-table"><thead><tr>${REPORT_TEXT.werHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${werRows.map((r) => `<tr><td>${esc(r.material)}</td><td>${esc(r.model || '—')}</td><td>${r.refCount}</td><td>${r.hypCount}</td><td>${r.errors}</td><td>${esc(fmtWer(r.ratio))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const levelRows = levelRowsForCase(c);
  if (levelRows.length) {
    html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.levelHeading)}</h3><p>${esc(REPORT_TEXT.levelIntro)}</p><table class="paper-table"><thead><tr>${REPORT_TEXT.levelHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${levelRows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.reviewSummaryHeading)}</h3><p>${esc(REPORT_TEXT.reviewSummaryIntro)}</p><table class="paper-table"><tbody>${rsRows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(String(r[1]))}</td></tr>`).join('')}</tbody></table></div>`;
  html += `<div class="paper-signature"><div><b>${esc(c.expertName || REPORT_TEXT.defaultExpert)}</b><br>${esc(c.expertField || REPORT_TEXT.defaultField)}<br>${esc(REPORT_TEXT.signatureRegistry)}: ${esc(c.registryNo || REPORT_TEXT.emptyFileNo)}<br><span class="paper-muted">${esc(REPORT_TEXT.signatureLabel)}</span></div></div><div class="paper-footer"><span>${esc(c.fileNo || REPORT_TEXT.fileMissing)}</span><span>Rapor tarihi: ${esc(niceDate(c.reportDate))}</span></div></div>`;
  $('#reportPreview').innerHTML = html;
  $('#reportStatus').innerHTML =
    `<span class="status-dot"></span>${materials.length} kayıt · ${allSegs.length} deşifre bölümü · ${checked} kontrol edildi`;
}
function xesc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function wRun(text, { bold = false, color = null, size = 20, italic = false } = {}) {
  return `<w:r><w:rPr>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:sz w:val="${size}"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/></w:rPr><w:t xml:space="preserve">${xesc(text)}</w:t></w:r>`;
}
function wP(
  text = '',
  {
    style = null,
    bold = false,
    color = null,
    size = 22,
    align = null,
    before = 0,
    after = 80,
    keep = false,
    italic = false
  } = {}
) {
  const ppr = `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${align ? `<w:jc w:val="${align}"/>` : ''}<w:spacing w:before="${before}" w:after="${after}" w:line="300" w:lineRule="auto"/>${keep ? '<w:keepNext/>' : ''}</w:pPr>`;
  const runs = String(text)
    .split('\n')
    .map((line, i) => (i ? '<w:r><w:br/></w:r>' : '') + wRun(line, { bold, color, size, italic }))
    .join('');
  return `<w:p>${ppr}${runs}</w:p>`;
}
function cell(text, { header = false, shade = null, bold = false, width = 2200, size = 18, color = null } = {}) {
  const sh = shade ? `<w:shd w:fill="${shade}"/>` : '';
  const col = header ? 'FFFFFF' : color || '24384D';
  const p = `<w:p><w:pPr><w:spacing w:after="50" w:line="240"/></w:pPr>${wRun(text, { bold: bold || header, color: col, size })}</w:p>`;
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${sh}<w:vAlign w:val="center"/></w:tcPr>${p}</w:tc>`;
}
function wTable(rows, { widths = null, header = true, shadeFirstCol = false } = {}) {
  const n = rows[0]?.length || 1;
  const ws = widths || Array(n).fill(Math.floor(9000 / n));
  const borders =
    '<w:tblBorders><w:top w:val="single" w:sz="5" w:color="C9D5E1"/><w:left w:val="single" w:sz="5" w:color="C9D5E1"/><w:bottom w:val="single" w:sz="5" w:color="C9D5E1"/><w:right w:val="single" w:sz="5" w:color="C9D5E1"/><w:insideH w:val="single" w:sz="4" w:color="E1E8EF"/><w:insideV w:val="single" w:sz="4" w:color="E1E8EF"/></w:tblBorders>';
  const r = rows
    .map(
      (row, ri) =>
        `<w:tr>${header && ri === 0 ? '<w:trPr><w:tblHeader w:val="true"/></w:trPr>' : ''}${row
          .map((t, ci) => {
            const isHead = header && ri === 0;
            const shade = isHead ? '1C426B' : shadeFirstCol && ci === 0 ? 'EAF0F6' : ri % 2 === 0 ? 'F8FAFC' : null;
            return cell(String(t ?? ''), {
              header: isHead,
              shade,
              bold: isHead || (shadeFirstCol && ci === 0),
              width: ws[ci] || 2200,
              size: isHead ? 17 : 18,
              color: shadeFirstCol && ci === 0 ? '1C426B' : null
            });
          })
          .join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="95" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="95" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${r}</w:tbl>`;
}
function headingXml(text, level = 1) {
  return wP(text, {
    style: `Heading${level}`,
    color: level === 1 ? '1C426B' : '385873',
    bold: true,
    size: level === 1 ? 24 : 20,
    before: level === 1 ? 220 : 140,
    after: 90,
    keep: true
  });
}
function docxXml(c) {
  let body = '';
  body += wP('T.C.', { bold: true, color: '1C426B', size: 24, align: 'center', before: 120, after: 90 });
  body += wP((c.court || REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR') + '’' + trDative(c.court || 'Mahkemesi'), {
    bold: true,
    color: '1C426B',
    size: 26,
    align: 'center',
    after: 180,
    keep: true
  });
  body += wP(reportTypeSpec(c.reportType).heading, {
    bold: true,
    color: '1C426B',
    size: 34,
    align: 'center',
    before: 170,
    after: 100,
    keep: true
  });
  body += wP(REPORT_TEXT.subtitle, { color: '58718A', size: 18, align: 'center', after: 240 });
  if (c.synthetic) {
    body += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="90" w:after="170"/></w:pPr>${wRun(REPORT_TEXT.synthetic, { bold: true, color: '9A6B2D', size: 18 })}</w:p>`;
  }
  const coverSpec = reportTypeSpec(c.reportType);
  body += wTable(
    [
      [coverSpec.fileNo, c.fileNo || REPORT_TEXT.emptyFileNo],
      ...reportRows(c).filter((r) => r[0] !== coverSpec.fileNo)
    ],
    { widths: [3000, 6000], header: false, shadeFirstCol: true }
  );
  body += headingXml(REPORT_TEXT.tocHeading);
  const toc = REPORT_TEXT.sections;
  toc.forEach((t) => {
    body += wP(t, { size: 20, bold: true, color: '385873', before: 60, after: 120, keep: true });
  });
  body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  body += headingXml(REPORT_TEXT.sections[0]);
  body += wP(c.assignmentScope || REPORT_TEXT.defaultScope);
  body += wP(`İnceleme konusu: ${c.subject || '—'}`, { bold: true });
  body += headingXml(REPORT_TEXT.sections[1]);
  if (c.questions?.length) {
    c.questions.forEach((q, i) => {
      body += wP(`${i + 1}. ${q.question || REPORT_TEXT.defaultQuestion}`, {
        size: 21,
        bold: true,
        color: '385873',
        before: 70,
        after: 80,
        keep: true
      });
    });
  } else body += wP(questionsFallbackText(c));
  body += headingXml(REPORT_TEXT.sections[2]);
  body += wP(REPORT_TEXT.defaultInventoryIntro);
  body += wTable(
    [
      [...REPORT_TEXT.inventoryHeaders],
      ...(c.materials.length
        ? c.materials.map((m) => [
            m.name,
            `${m.tech?.codec || m.type || REPORT_TEXT.codecFallback} / ${fmtSize(m.size)}`,
            fmtTime(m.duration || 0),
            `${fmtChannels(m.tech?.channels)}${m.tech?.sampleRate ? ' · ' + m.tech.sampleRate + ' Hz' : ''}${m.tech?.bitDepth ? ' · ' + m.tech.bitDepth + ' bit' : ''}${m.tech?.channels === 2 ? ' · Dinlenen: ' + chanModeText(m) : ''}${m.spectrogramReviewed ? ' · Spektrogram incelendi' : ''}`,
            m.sha256 || 'Hesaplanamadı'
          ])
        : [REPORT_TEXT.noInventoryRow])
    ],
    { widths: [2200, 1500, 900, 1700, 2700], header: true }
  );
  body += wP(REPORT_TEXT.inventoryNote, { color: '74869A', size: 17, italic: true });
  const dOrg = originRows(c);
  body += headingXml(REPORT_TEXT.originHeading);
  body += wP(REPORT_TEXT.originIntro);
  body += wTable([[...REPORT_TEXT.originHeaders], ...(dOrg.length ? dOrg : [REPORT_TEXT.noInventoryRow])], {
    widths: [1500, 1300, 1300, 1300, 1300, 1500],
    header: true
  });
  const dSpk = speakerRows(c);
  body += headingXml('Konuşmacılar');
  body += wP(REPORT_TEXT.speakerIntro);
  body += wTable([[...REPORT_TEXT.speakerHeaders], ...(dSpk.length ? dSpk : [REPORT_TEXT.noSpeakerRow])], {
    widths: [1500, 1200, 1100, 1200, 1900, 2200],
    header: true
  });
  body += headingXml(REPORT_TEXT.sections[3]);
  body += wP(c.methodText || DEFAULT_METHOD);
  body += headingXml(REPORT_TEXT.sections[4]);
  body += headingXml(REPORT_TEXT.sub51, 2);
  for (let i = 0; i < c.materials.length; i++) {
    const m = c.materials[i];
    body += headingXml(`5.1.${i + 1}. ${m.name}`, 2);
    body += wP(
      `Süre: ${fmtTime(m.duration || 0)}  |  Biçim: ${m.type || REPORT_TEXT.codecFallback}  |  ${REPORT_TEXT.segmentCountLabel}: ${(m.segments || []).length}`,
      { color: '6F8295', size: 17 }
    );
    if (m.hallucinationWarning)
      body += wP(`${REPORT_TEXT.evidenceWarningPrefix} ${m.hallucinationWarning}`, { color: '9A6B2D', size: 17 });
    if (m.languageWarning)
      body += wP(`${REPORT_TEXT.languageWarningPrefix} ${m.languageWarning}`, { color: '9A6B2D', size: 17 });
    if (m.segments?.length) {
      body += wTable(
        [
          [...REPORT_TEXT.segmentHeadersObs],
          ...m.segments.map((s) => [
            tcRange(s.start, s.end),
            segSpeakerCell(m, s),
            s.text || '',
            reviewCellText(s),
            segObsText(s)
          ])
        ],
        { widths: [1300, 1200, 3600, 1100, 900], header: true }
      );
    } else body += wP(REPORT_TEXT.noTranscript);
  }
  body += headingXml(REPORT_TEXT.sub52, 2);
  if (c.questions?.length) {
    c.questions.forEach((q, i) => {
      body += wP(`5.2.${i + 1}. ${q.question || REPORT_TEXT.defaultQuestion}`, {
        bold: true,
        color: '385873',
        size: 20,
        before: 80,
        after: 60,
        keep: true
      });
      body += wP(q.answer || REPORT_TEXT.defaultAnswer);
      body += wP(`Dayanak: ${q.basis || REPORT_TEXT.defaultBasis}`, { color: '657D92', size: 17, italic: true });
    });
  } else body += wP(evaluationFallbackText(c));
  body += headingXml(REPORT_TEXT.sub53, 2);
  body += wP(c.limitationsText || REPORT_TEXT.defaultLimitations);
  body += headingXml(REPORT_TEXT.sections[5]);
  body += wP(c.conclusionText || REPORT_TEXT.defaultConclusion);
  body += headingXml(REPORT_TEXT.sections[6]);
  body += wP(REPORT_TEXT.attachmentsText);
  const dWer = measureWerForCase(c);
  if (dWer.length) {
    body += headingXml(REPORT_TEXT.werHeading);
    body += wP(REPORT_TEXT.werIntro);
    body += wTable(
      [
        [...REPORT_TEXT.werHeaders],
        ...dWer.map((r) => [
          r.material,
          r.model || '—',
          String(r.refCount),
          String(r.hypCount),
          String(r.errors),
          fmtWer(r.ratio)
        ])
      ],
      { widths: [1800, 2200, 1200, 1200, 900, 700], header: true }
    );
  }
  const dLevel = levelRowsForCase(c);
  if (dLevel.length) {
    body += headingXml(REPORT_TEXT.levelHeading);
    body += wP(REPORT_TEXT.levelIntro);
    body += wTable([[...REPORT_TEXT.levelHeaders], ...dLevel], {
      widths: [1500, 800, 800, 900, 1000, 1000, 1900],
      header: true
    });
  }
  body += headingXml(REPORT_TEXT.reviewSummaryHeading);
  body += wP(REPORT_TEXT.reviewSummaryIntro);
  body += wTable(
    reviewSummaryRows(c).map((r) => [r[0], String(r[1])]),
    { widths: [6000, 3000], header: false, shadeFirstCol: true }
  );
  body += `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="260" w:after="0"/><w:keepLines/></w:pPr>${wRun(c.expertName || 'BİLİRKİŞİ', { bold: true, size: 22, color: '1C426B' })}<w:r><w:br/></w:r>${wRun(c.expertField || REPORT_TEXT.defaultField, { size: 20 })}<w:r><w:br/></w:r>${wRun(`${REPORT_TEXT.signatureRegistry}: ${c.registryNo || REPORT_TEXT.emptyFileNo}`, { size: 20 })}<w:r><w:br/></w:r>${wRun(REPORT_TEXT.signatureLabel, { size: 18, color: '718399' })}</w:p>`;
  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1276" w:bottom="1134" w:left="1276" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}
async function makeDocx() {
  const c = currentCase();
  if (!window.JSZip) {
    throw new Error('DOCX oluşturma bileşeni yüklenemedi. İnternet bağlantısını kontrol edin.');
  }
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`
  );
  zip
    .folder('_rels')
    .file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
    );
  const w = zip.folder('word');
  w.file('document.xml', docxXml(c));
  w.file(
    '_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`
  );
  w.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="90" w:line="276"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1C426B"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="70"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="385873"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>`
  );
  w.file(
    'header1.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="1C426B"/></w:pBdr></w:pPr>${wRun(`BİLİRKİŞİ RAPORU  |  ${REPORT_TEXT.toplineField}${expertFieldShort(c)}`, { bold: true, color: '70869C', size: 15 })}</w:p></w:hdr>`
  );
  w.file(
    'footer1.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${wRun(`Dosya: ${c.fileNo || '—'}  •  Sayfa `, { color: '8293A3', size: 15 })}<w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`
  );
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  downloadBlob(blob, `${safeName(c.fileNo || 'Bilirkisi_Raporu')}.docx`);
  showToast('Word raporu indirildi.');
}
function safeName(s) {
  return (
    String(s)
      .replace(/[^\w\-\.ğüşöçıİĞÜŞÖÇ]+/gi, '_')
      .replace(/^[_\-.]+|[_\-.]+$/g, '')
      .slice(0, 70) || 'AKIS_Raporu'
  );
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function udfAttr(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function udfCdata(v = '') {
  return String(v).replace(/]]>/g, ']]]]><![CDATA[>');
}
function udfSignedColor(hex) {
  const n = (0xff000000 | parseInt(hex.replace('#', ''), 16)) >>> 0;
  return n > 0x7fffffff ? n - 0x100000000 : n;
}
async function makeUdf() {
  const c = currentCase();
  if (!window.JSZip) throw new Error('UDF oluşturma bileşeni yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
  const templateResponse = await fetch('templates/BOS.udf');
  if (!templateResponse.ok)
    throw new Error('Boş UYAP UDF şablonu bulunamadı. templates/BOS.udf dosyasını kontrol edin.');
  const templateZip = await JSZip.loadAsync(await templateResponse.blob());
  const templateXml = await templateZip.file('content.xml').async('string');
  let properties = (templateXml.match(/<properties>[\s\S]*?<\/properties>/i) || [])[0];
  const styles = (templateXml.match(/<styles>[\s\S]*?<\/styles>/i) || [])[0];
  const formatId = (templateXml.match(/<template\s+format_id="([^"]+)"/i) || [])[1] || '1.8';
  const resolver = (templateXml.match(/<elements\s+resolver="([^"]+)"/i) || [])[1] || 'hvl-default';
  if (!properties || !styles) throw new Error('Boş UYAP UDF şablonunun sayfa veya stil tanımları okunamadı.');
  // Match the DOCX page geometry: balanced A4 margins, no horizontal drift.
  properties = properties
    .replace(/leftMargin="[^"]+"/, 'leftMargin="60.0"')
    .replace(/rightMargin="[^"]+"/, 'rightMargin="60.0"')
    .replace(/topMargin="[^"]+"/, 'topMargin="56.7"')
    .replace(/bottomMargin="[^"]+"/, 'bottomMargin="56.7"');
  const textParts = [];
  let codePointOffset = 0;
  let serial = 0;
  const colors = {
    navy: udfSignedColor('1C426B'),
    mid: udfSignedColor('385873'),
    muted: udfSignedColor('58718A'),
    body: udfSignedColor('24384D'),
    white: -1,
    pale: udfSignedColor('EAF0F6'),
    line: udfSignedColor('D9E2EB')
  };
  function addText(value) {
    let text = String(value ?? '')
      .replace(/\r\n?/g, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    if (!text) text = '\u200B';
    const length = Array.from(text).length,
      start = codePointOffset;
    textParts.push(text, '\n');
    codePointOffset += length + 1;
    return `<content startOffset="${start}" length="${length}" family="Times New Roman" size="11" bold="false" italic="false" underline="false" foreground="${colors.body}" background="-1" />`;
  }
  function paragraph(
    text,
    { size = 11, bold = false, italic = false, color = 'body', align = 0, before = 0, after = 5, justify = false } = {}
  ) {
    const ref = addText(text);
    const fg = colors[color] ?? colors.body;
    const formatted = ref
      .replace('size="11"', `size="${size}"`)
      .replace('bold="false"', `bold="${bold ? 'true' : 'false'}"`)
      .replace('italic="false"', `italic="${italic ? 'true' : 'false'}"`)
      .replace('underline="false"', 'underline="false"')
      .replace(`foreground="${colors.body}"`, `foreground="${fg}"`);
    return `<paragraph Alignment="${align}" SpaceBefore="${before}" SpaceAfter="${after}" LineSpacing="1.15">${formatted}</paragraph>`;
  }
  function paragraphLines(text, opts = {}) {
    return String(text ?? '')
      .split(/\r?\n/)
      .filter((line, i, a) => line.length || i < a.length - 1)
      .map((line) => paragraph(line, opts))
      .join('');
  }
  function pageBreak() {
    return `<page-break><paragraph><content startOffset="${codePointOffset}" length="0" family="Times New Roman" size="11" underline="false" /></paragraph></page-break>`;
  }
  function table(rows, widths, { header = true, shadeFirstCol = false } = {}) {
    if (!rows?.length) return '';
    const colCount = rows[0].length;
    const safeWidths = widths?.length === colCount ? widths : Array(colCount).fill(Math.floor(510 / colCount));
    const rowXml = rows
      .map((row, ri) => {
        const isHeader = header && ri === 0;
        const cells = row
          .map((value, ci) => {
            let cellText = String(value ?? '');
            if (!isHeader) cellText = cellText.replace(/(\S{8})(?=\S)/g, '$1\u200B');
            const fill = isHeader
              ? colors.pale
              : shadeFirstCol && ci === 0
                ? colors.pale
                : ri % 2 === 0
                  ? '16777215'
                  : udfSignedColor('F8FAFC');
            const fg = isHeader ? colors.navy : shadeFirstCol && ci === 0 ? colors.navy : colors.body;
            const bold = isHeader || (shadeFirstCol && ci === 0);
            const ref = addText(cellText);
            const formatted = ref
              .replace('bold="false"', `bold="${bold ? 'true' : 'false'}"`)
              .replace(`foreground="${colors.body}"`, `foreground="${fg}"`)
              .replace('size="11"', `size="${isHeader ? 9.5 : 9.5}"`);
            return `<cell colspan="1" align="top" fillColor="${fill}" border="borderCell" borderSpec="3" paddingTop="3" paddingBottom="3" paddingLeft="4" paddingRight="4"><paragraph Alignment="0" SpaceBefore="1" SpaceAfter="1" LineSpacing="1.05">${formatted}</paragraph></cell>`;
          })
          .join('');
        return `<row rowName="r${++serial}" rowType="dataRow">${cells}</row>`;
      })
      .join('');
    return `<table tableName="Tablo${serial}" columnCount="${colCount}" columnSpans="${safeWidths.join(',')}" border="borderCell" borderColor="${colors.line}" borderWidth="0.3">${rowXml}</table>`;
  }
  const el = [];
  el.push(paragraph('T.C.', { size: 16, bold: true, color: 'navy', align: 1, after: 4 }));
  el.push(
    paragraph(`${(c.court || REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR')}’${trDative(c.court || 'Mahkemesi')}`, {
      size: 15,
      bold: true,
      color: 'navy',
      align: 1,
      after: 16
    })
  );
  el.push(
    paragraph(reportTypeSpec(c.reportType).heading, {
      size: 22,
      bold: true,
      color: 'navy',
      align: 1,
      before: 8,
      after: 7
    })
  );
  el.push(paragraph(REPORT_TEXT.subtitle, { size: 10, bold: true, color: 'muted', align: 1, after: 15 }));
  if (c.synthetic)
    el.push(paragraph(REPORT_TEXT.synthetic, { size: 10, bold: true, color: 'mid', align: 1, after: 10 }));
  const coverSpec = reportTypeSpec(c.reportType);
  el.push(
    table(
      [
        [coverSpec.fileNo, c.fileNo || REPORT_TEXT.emptyFileNo],
        ...reportRows(c).filter((r) => r[0] !== coverSpec.fileNo)
      ],
      [170, 340],
      { header: false, shadeFirstCol: true }
    )
  );
  el.push(paragraph(REPORT_TEXT.tocHeading, { size: 16, bold: true, color: 'navy', before: 8, after: 12 }));
  const toc = REPORT_TEXT.sections;
  toc.forEach((t) => el.push(paragraph(t, { size: 11, bold: true, color: 'mid', before: 5, after: 8 })));
  el.push(pageBreak());
  const h = (t) => paragraph(t, { size: 14, bold: true, color: 'navy', before: 9, after: 5 });
  el.push(h(REPORT_TEXT.sections[0]));
  el.push(paragraphLines(c.assignmentScope || REPORT_TEXT.defaultScope, { justify: true }));
  el.push(paragraph(`İnceleme konusu: ${c.subject || '—'}`, { bold: true, after: 7 }));
  el.push(h(REPORT_TEXT.sections[1]));
  if (c.questions?.length)
    c.questions.forEach((q, i) =>
      el.push(
        paragraph(`${i + 1}. ${q.question || REPORT_TEXT.defaultQuestion}`, {
          size: 11,
          bold: true,
          color: 'mid',
          before: 4,
          after: 6
        })
      )
    );
  else el.push(paragraph(questionsFallbackText(c)));
  el.push(h(REPORT_TEXT.sections[2]));
  el.push(paragraph(REPORT_TEXT.defaultInventoryIntro));
  const inventory = (c.materials || []).map((m) => [
    m.name,
    `${m.tech?.codec || m.type || REPORT_TEXT.codecFallback} / ${fmtSize(m.size)}`,
    fmtTime(m.duration || 0),
    `${fmtChannels(m.tech?.channels)}${m.tech?.sampleRate ? ' · ' + m.tech.sampleRate + ' Hz' : ''}${m.tech?.bitDepth ? ' · ' + m.tech.bitDepth + ' bit' : ''}${m.tech?.channels === 2 ? ' · Dinlenen: ' + chanModeText(m) : ''}${m.spectrogramReviewed ? ' · Spektrogram incelendi' : ''}`,
    m.sha256 || 'Hesaplanamadı'
  ]);
  el.push(
    table(
      [
        [...REPORT_TEXT.inventoryHeaders],
        ...(inventory.length ? inventory : [[REPORT_TEXT.noInventoryRow[0], '—', '—', '—', '—']])
      ],
      [125, 95, 45, 120, 155],
      { header: true }
    )
  );
  el.push(paragraph(REPORT_TEXT.inventoryNote, { size: 9, italic: true, color: 'muted', after: 7 }));
  const uOrg = originRows(c);
  el.push(h(REPORT_TEXT.originHeading));
  el.push(paragraph(REPORT_TEXT.originIntro, { size: 10 }));
  el.push(
    table(
      [[...REPORT_TEXT.originHeaders], ...(uOrg.length ? uOrg : [REPORT_TEXT.noInventoryRow])],
      [95, 85, 85, 85, 85, 105],
      { header: true }
    )
  );
  const uSpk = speakerRows(c);
  el.push(h('Konuşmacılar'));
  el.push(paragraph(REPORT_TEXT.speakerIntro, { size: 10 }));
  el.push(
    table(
      [[...REPORT_TEXT.speakerHeaders], ...(uSpk.length ? uSpk : [REPORT_TEXT.noSpeakerRow])],
      [90, 80, 70, 70, 110, 150],
      { header: true }
    )
  );
  el.push(h(REPORT_TEXT.sections[3]));
  el.push(paragraphLines(c.methodText || DEFAULT_METHOD, { justify: true }));
  el.push(h(REPORT_TEXT.sections[4]));
  el.push(paragraph(REPORT_TEXT.sub51, { size: 12, bold: true, color: 'mid', before: 5, after: 4 }));
  if (c.materials?.length) {
    c.materials.forEach((m, i) => {
      el.push(paragraph(`5.1.${i + 1}. ${m.name}`, { size: 11, bold: true, color: 'mid', before: 6, after: 3 }));
      el.push(
        paragraph(
          `Süre: ${fmtTime(m.duration || 0)}   |   Biçim: ${m.type || REPORT_TEXT.codecFallback}   |   ${REPORT_TEXT.segmentCountLabel}: ${(m.segments || []).length}`,
          { size: 9, color: 'muted', after: 3 }
        )
      );
      if (m.hallucinationWarning)
        el.push(
          paragraph(`${REPORT_TEXT.evidenceWarningPrefix} ${m.hallucinationWarning}`, {
            size: 9,
            italic: true,
            color: 'muted'
          })
        );
      if (m.languageWarning)
        el.push(
          paragraph(`${REPORT_TEXT.languageWarningPrefix} ${m.languageWarning}`, {
            size: 9,
            italic: true,
            color: 'muted'
          })
        );
      if (m.segments?.length) {
        const segments = m.segments.map((seg) => [
          tcRange(seg.start, seg.end),
          segSpeakerCell(m, seg),
          seg.text || '',
          reviewLabel(seg),
          segObsText(seg)
        ]);
        el.push(table([[...REPORT_TEXT.segmentHeadersObs], ...segments], [70, 68, 235, 75, 62], { header: true }));
      } else el.push(paragraph(REPORT_TEXT.noTranscript, { italic: true, color: 'muted' }));
    });
  } else el.push(paragraph(REPORT_TEXT.noMaterials));
  el.push(paragraph(REPORT_TEXT.sub52, { size: 12, bold: true, color: 'mid', before: 7, after: 4 }));
  if (c.questions?.length)
    c.questions.forEach((q, i) => {
      el.push(
        paragraph(`5.2.${i + 1}. ${q.question || REPORT_TEXT.defaultQuestion}`, {
          size: 11,
          bold: true,
          color: 'mid',
          before: 5,
          after: 3
        })
      );
      el.push(paragraphLines(q.answer || REPORT_TEXT.defaultAnswer, { justify: true }));
      el.push(
        paragraph(`Dayanak: ${q.basis || REPORT_TEXT.defaultBasis}`, {
          size: 9,
          italic: true,
          color: 'muted',
          after: 5
        })
      );
    });
  else el.push(paragraph(evaluationFallbackText(c)));
  el.push(paragraph(REPORT_TEXT.sub53, { size: 12, bold: true, color: 'mid', before: 7, after: 4 }));
  el.push(paragraphLines(c.limitationsText || REPORT_TEXT.defaultLimitations, { justify: true }));
  el.push(h(REPORT_TEXT.sections[5]));
  el.push(paragraphLines(c.conclusionText || REPORT_TEXT.defaultConclusion, { justify: true }));
  el.push(h(REPORT_TEXT.sections[6]));
  el.push(paragraph(REPORT_TEXT.attachmentsText));
  const uWer = measureWerForCase(c);
  if (uWer.length) {
    el.push(h(REPORT_TEXT.werHeading));
    el.push(paragraph(REPORT_TEXT.werIntro, { size: 10 }));
    el.push(
      table(
        [
          [...REPORT_TEXT.werHeaders],
          ...uWer.map((r) => [
            r.material,
            r.model || '—',
            String(r.refCount),
            String(r.hypCount),
            String(r.errors),
            fmtWer(r.ratio)
          ])
        ],
        [110, 130, 70, 70, 55, 45],
        { header: true }
      )
    );
  }
  const uLevel = levelRowsForCase(c);
  if (uLevel.length) {
    el.push(h(REPORT_TEXT.levelHeading));
    el.push(paragraph(REPORT_TEXT.levelIntro, { size: 10 }));
    el.push(table([[...REPORT_TEXT.levelHeaders], ...uLevel], [110, 70, 70, 80, 80, 80], { header: true }));
  }
  el.push(h(REPORT_TEXT.reviewSummaryHeading));
  el.push(paragraph(REPORT_TEXT.reviewSummaryIntro, { size: 10 }));
  el.push(
    table(
      reviewSummaryRows(c).map((r) => [r[0], String(r[1])]),
      [320, 160],
      { header: false, shadeFirstCol: true }
    )
  );
  el.push(
    paragraph(c.expertName || REPORT_TEXT.defaultExpert, {
      size: 13,
      bold: true,
      color: 'navy',
      align: 2,
      before: 18,
      after: 2
    })
  );
  el.push(paragraph(c.expertField || REPORT_TEXT.defaultField, { size: 10, align: 2, after: 2 }));
  el.push(
    paragraph(`${REPORT_TEXT.signatureRegistry}: ${c.registryNo || REPORT_TEXT.emptyFileNo}`, {
      size: 10,
      align: 2,
      after: 2
    })
  );
  el.push(paragraph(REPORT_TEXT.signatureLabel, { size: 10, color: 'muted', align: 2, after: 0 }));
  const bodyText = textParts.join('');
  const udfXml = `<?xml version="1.0" encoding="UTF-8" ?>\n<template format_id="${udfAttr(formatId)}">\n<content><![CDATA[${udfCdata(bodyText)}]]></content>${properties}\n<elements resolver="${udfAttr(resolver)}">${el.join('')}</elements>${styles}\n</template>`;
  const parsed = new DOMParser().parseFromString(udfXml, 'application/xml');
  if (parsed.querySelector('parsererror')) throw new Error('UDF XML yapısı doğrulanamadı; çıktı oluşturulmadı.');
  const outZip = new JSZip();
  outZip.file('content.xml', udfXml);
  const blob = await outZip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  downloadBlob(blob, `${safeName(c.fileNo || 'Bilirkisi_Raporu')}.udf`);
  showToast('UDF raporu oluşturuldu. UYAP Editöründe son görünümü kontrol edin.');
}
// Çalışma paketi (yedek) oluşturma ve doğrulama saf fonksiyonlara ayrıldı;
// böylece otomatik test edilebilir. Paket biçimi MİHENK uyumluluğu için sabittir.
const PROJECT_SCHEMA = 'mihenk.project.v1';
function buildProjectPack(c) {
  return { schema: PROJECT_SCHEMA, exportedAt: new Date().toISOString(), case: c };
}
// Paketi doğrular; geçerliyse null, değilse açıklayıcı hata metni döndürür.
function validateProjectPack(pack) {
  if (!pack || typeof pack !== 'object') return 'Paket okunamadı.';
  if (pack.schema !== PROJECT_SCHEMA) return 'Paket sürümü tanınmadı.';
  if (!pack.case || typeof pack.case !== 'object') return 'Pakette dosya verisi yok.';
  return null;
}
// Paket içindeki ses girdilerini materyallere eşler. Girdi adı
// `${m.id}_...` (tekil paket) veya `audio/<dosyaId>/${m.id}_...` (arşiv)
// biçimindedir. `caseId` verilirse YALNIZ o dosyanın klasörü aranır; aksi
// hâlde başka dosyanın sesi yanlış dosyaya bağlanabilirdi.
function matchAudioEntries(entryNames, materials, caseId) {
  const dirs = new Set(entryNames.filter((n) => n.endsWith('/')));
  const prefixBase = caseId ? `audio/${caseId}/` : 'audio/';
  const out = [];
  for (const m of materials || []) {
    const prefix = `${prefixBase}${m.id}_`;
    const entry = entryNames.find((path) => path.startsWith(prefix) && !dirs.has(path));
    if (entry) out.push({ materialId: m.id, entry });
  }
  return out;
}
// ---- Paket sözleşmesi (v2.102) ------------------------------------------
// KURAL: çalışma alanı (dosya) KULLANICI VERİSİ taşıyorsa dosyadır.
// Uygulama boş kurulumda çalışabilmek için kendiliğinden boş bir dosya açar;
// bu dosya kullanıcı verisi DEĞİLDİR. v2.101 ve öncesinde yedeğe, arşive ve
// geri yüklemeye giriyordu: yeni tarayıcıda "2 dosya" görünüyor, geri yükleme
// sonrası "3 kayıt" oluşuyordu (canlı veride yaşandı).
// Boş sayılan alanlar `freshCase()` varsayılanlarıdır (uzmanlık alanı metni,
// varsayılan yöntem metni, tarih); bunlar kullanıcı girdisi değildir.
function isEmptyCase(c) {
  if (!c || typeof c !== 'object') return true;
  if ((c.materials || []).length) return false;
  if ((c.team || []).length) return false;
  if ((c.questions || []).some((q) => String(q?.question || '').trim() || String(q?.answer || '').trim())) return false;
  const filled = [
    c.court,
    c.fileNo,
    c.subject,
    c.caseDate,
    c.inspectionDate,
    c.parties?.plaintiff,
    c.parties?.plaintiffCounsel,
    c.parties?.defendant,
    c.parties?.defendantCounsel,
    c.assignment?.date,
    c.assignment?.dueDate,
    c.assignment?.scope,
    c.assignment?.body,
    c.expert?.name,
    c.expert?.registryNo,
    c.report?.conclusionText,
    c.report?.limitationsText,
    c.lastEditedBy
  ];
  return !filled.some((v) => String(v == null ? '' : v).trim());
}
// Pakete girecek dosyaları belirler. Boş dosyalar sessizce atılmaz;
// `skipped` ile bildirilir (sessiz hata yasak).
function buildExportPlan(cases) {
  const all = Array.isArray(cases) ? cases : [];
  const keep = all.filter((c) => !isEmptyCase(c));
  const skipped = all.filter((c) => isEmptyCase(c));
  const kind = keep.length === 0 ? 'none' : keep.length === 1 ? 'single' : 'archive';
  return { kind, cases: keep, skipped };
}
// BOŞ ÇALIŞMA ALANI KAYDA YAZILMAZ (v2.109).
// NEDEN: uygulama boş kurulumda çalışabilmek için bellekte boş bir taslak dosya
// tutar (arayüz currentCase()'e bağlı; nesne olmadan çöküyor — ölçüldü). Ama bu
// taslak KULLANICI VERİSİ DEĞİLDİR: kayda yazılırsa yeni tarayıcıda "zaten bir
// dosya var" görünür (canlı veride yaşandı: "ilk açtığımız boş olmalı ama değil").
// Kural: kayda ve arşive yalnız VERİ TAŞIYAN dosyalar girer.
function casesForStorage(cases) {
  return (Array.isArray(cases) ? cases : []).filter((c) => !isEmptyCase(c));
}
// Yazılacak kayıt gövdesi. Kullanıcı verisi taşıyan dosya yoksa `null`:
// boş taslak KAYDA YAZILMAZ (v2.109/v2.134). `persistNow` bu durumda kaydı
// SİLER; yalnız yazmayı atlamak, silinen veriyi diskte bırakıp yeniden
// yüklenmesine yol açardı.
function persistPayloadFor(state) {
  if (!state) return null;
  const cases = casesForStorage(state.cases);
  if (!cases.length) return null;
  return { ...state, cases };
}
// Çalışma alanı "boş" mu? Yalnız boş taslak(lar) varsa evet.
function isEmptyWorkspace(cases) {
  return casesForStorage(cases).length === 0;
}

// ---- Dışa aktarma kapsamı (v2.110) --------------------------------------
// KULLANICI KAFASI KARIŞMASIN: "Dışa aktar" artık NE aktarılacağını SORAR.
// v2.109 ve öncesinde düğme sessizce "hepsi"ne dönüşüyordu: 3 dosya varken
// tek dosya sanıp basan kullanıcı 3 dosyalık paket indiriyordu (ölçüldü).
const EXPORT_SCOPE = ['current', 'all'];
// `scope`: 'current' (yalnız aktif dosya) veya 'all' (tüm dosyalar).
// Arşivli dosyalar 'all' kapsamına GİRER: yedekte kaybolmamalı.
// Dönen `scope` ADI belirler (v2.124): tek dosya varken "tüm dosyalar"
// seçilirse paket "Tam" adıyla iner. `kind` ise paket BİÇİMİNİ belirler
// (case.json / archive.json) ve dosya sayısına bağlıdır.
function exportPlanFor(cases, activeCaseId, scope) {
  const all = Array.isArray(cases) ? cases : [];
  const keepAll = all.filter((c) => !isEmptyCase(c));
  if (scope === 'current') {
    const cur = keepAll.find((c) => c.id === activeCaseId);
    const list = cur ? [cur] : [];
    return {
      kind: list.length ? 'single' : 'none',
      scope: 'current',
      cases: list,
      skipped: all.length - list.length
    };
  }
  const kind = keepAll.length === 0 ? 'none' : keepAll.length === 1 ? 'single' : 'archive';
  return { kind, scope: 'all', cases: keepAll, skipped: all.length - keepAll.length };
}
// Dosya adı PAKET olduğunu, KAPSAMI (yalnız bu dosya / tam), hangi dosya
// olduğunu ve ZAMANI söyler (v2.123/v2.124). Aynı gün iki paket birbirinin
// üzerine yazmaz. Eğik çizgi dosya sisteminde sorun çıkardığı için dosya
// numarasında '-' kullanılır: 2024/108 → 2024-108.
function backupFileName(plan, when) {
  // `instanceof Date` farklı çalışma bağlamlarında (test sandbox'ı, iframe)
  // güvenilmez; geçerli bir Date benzeri mi diye davranıştan anlaşılır.
  const d = when && typeof when.getTime === 'function' && Number.isFinite(when.getTime()) ? when : new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}-${p2(d.getMinutes())}`;
  const list = (plan && plan.cases) || [];
  if (!list.length) return `AKIS_Paket_bos_${stamp}.akis`;
  // KAPSAM seçimi adda görünür. Tek dosya varken "tüm dosyalar" seçilirse
  // "Tam" yazar; aksi hâlde iki seçim aynı adı üretir ve hangisinin alındığı
  // sonradan anlaşılmaz (v2.124'te canlı veride bildirildi).
  if (plan.scope === 'all' || plan.kind === 'archive') {
    return `AKIS_Paket_Tam_${list.length}dosya_${stamp}.akis`;
  }
  const c = list[0];
  const base = String(c.fileNo || c.name || 'Dosya').trim().replace(/[\\/]+/g, '-') || 'Dosya';
  return `AKIS_Paket_${safeName(base)}_${stamp}.akis`;
}

// Arşiv paketinden, bu bilgisayardaki dosyayla eşleşen kaydı seçer.
// Eşleşme sırası: kimlik (id) → dosya numarası + mahkeme. Bulunamazsa
// `case: null` ve NEDENİNİ söyleyen metin döner; "uyumsuz" demek yetmez,
// kullanıcı hangi dosyanın pakette olduğunu görmeli.
function selectCaseFromArchive(arch, mine) {
  const list = Array.isArray(arch?.cases) ? arch.cases : [];
  if (!list.length) return { case: null, reason: 'Pakette hiç dosya yok.' };
  const byId = mine?.id ? list.find((c) => c && c.id === mine.id) : null;
  if (byId) return { case: byId, reason: '' };
  const byNo =
    mine?.fileNo
      ? list.find((c) => c && c.fileNo === mine.fileNo && (c.court || '') === (mine.court || ''))
      : null;
  if (byNo) return { case: byNo, reason: '' };
  if (list.length === 1) return { case: list[0], reason: '' };
  const names = list.map((c) => c.fileNo || c.name || c.id).join(', ');
  return {
    case: null,
    reason:
      `Pakette ${list.length} dosya var: ${names}. ` +
      'Bu dosya (aynı dosya numarası ve mahkeme) pakette bulunamadı. ' +
      'Birleştirmek istediğiniz dosyayı çalışma alanında açın, sonra tekrar deneyin.'
  };
}
// Kullanıcı verisi taşımayan dosyaları çalışma alanından çıkarır. Yalnız
// `isEmptyCase` DOĞRU olan kayıtlar silinir: bunlarda kaybedilecek veri yoktur.
// Geri yükleme sonrası "boş dosya + gelen dosyalar" kalabalığını önler.
function dropEmptyCases(cases) {
  const all = Array.isArray(cases) ? cases : [];
  const keep = all.filter((c) => !isEmptyCase(c));
  return { cases: keep, dropped: all.length - keep.length };
}

// ---- Arşivleme ve silme (v2.107) ----------------------------------------
// KURAL: arşivleme VERİ SİLMEZ. Dosya seçiciden gizlenir, verisi ve sesi
// durur, yedeğe girmeye devam eder. Silme yalnız ARŞİVLİ dosyada mümkündür ve
// iki aşamalı onay ister: (1) sesin de silineceğini söyleyen onay, (2) dosya
// numarasını elle yazma.
// NEDEN bu kadar sıkı: `snapshotForUndo` yalnız `appState.cases` kopyalar; ses
// IndexedDB'de ayrı durur ve `deleteBlob` KALICIDIR. Ctrl+Z metni getirir,
// sesi getirmez. Adli kayıtta ses asıl delildir.
function isArchivedCase(c) {
  return !!c && c.status === 'archived';
}
// Dosya seçicide görünecek dosyalar: arşivliler gizlenir.
function visibleCases(cases) {
  return (Array.isArray(cases) ? cases : []).filter((c) => !isArchivedCase(c));
}
function archiveCase(c) {
  const at = new Date().toISOString();
  const log = Array.isArray(c.auditLog) ? c.auditLog.slice() : [];
  log.push({ at, event: 'arşivlendi', by: c.lastEditedBy || '' });
  return { ...c, status: 'archived', archivedAt: at, auditLog: log };
}
function unarchiveCase(c) {
  const at = new Date().toISOString();
  const log = Array.isArray(c.auditLog) ? c.auditLog.slice() : [];
  log.push({ at, event: 'arşivden çıkarıldı', by: c.lastEditedBy || '' });
  const next = { ...c, status: 'draft', auditLog: log };
  delete next.archivedAt;
  return next;
}
// KISA KİMLİK (v2.108): ham kimlik (`mwp6t1x5-fdist0v`) ekranda görünmez ve
// yazdırılamaz — bilirkişi onu okuyamaz. Görünen ad ve onay ifadesi bu kısa
// son 6 karakteri kullanır; böylece aynı adlı iki dosya da ayırt edilir.
function caseShortId(c) {
  const id = String((c && c.id) || '');
  if (!id) return '';
  return id.length > 6 ? id.slice(-6) : id;
}
// Ekranda görünen dosya adı. Dosya numarası varsa yalnız o; yoksa ad + kısa
// kimlik (aynı adlı iki dosya birbirinden ayrılabilsin).
function caseDisplayName(c) {
  if (!c) return '';
  const no = String(c.fileNo || '').trim();
  if (no) return no;
  const nm = String(c.name || '').trim() || 'Yeni inceleme dosyası';
  const short = caseShortId(c);
  return short ? `${nm} #${short}` : nm;
}
// Boş dosya arşivlenmez: kaybedilecek veri yoktur, arşivi kirletir ve kullanıcı
// "iki tane aynı dosya var" görür (canlı veride yaşandı).
function canArchiveCase(c) {
  return !!c && !isArchivedCase(c) && !isEmptyCase(c);
}
// Silme onayı için yazılması gereken ifade: EKRANDA GÖRÜNEN ad.
// v2.107'de ham kimlik isteniyordu; kullanıcı göremediği bir şeyi yazamaz.
function deleteConfirmPhrase(c) {
  return caseDisplayName(c);
}
function deleteConfirmMatches(c, typed) {
  const want = deleteConfirmPhrase(c);
  const got = String(typed == null ? '' : typed).trim();
  if (!want || !got) return false;
  return want === got;
}
// Silme yalnız arşivli dosyada. Arşivsiz dosya önce arşivlenmelidir: böylece
// "yanlış dosyayı sildim" iki ayrı, bilinçli adım gerektirir.
function canDeleteCase(c) {
  return isArchivedCase(c);
}

// Veri tarayıcıda (localStorage + IndexedDB) durur. Tarayıcı verisi silinirse
// her şey gider. Bu yüzden son yedeğin ne zaman alındığı izlenir ve uzun süre
// yedek alınmadıysa kullanıcı uyarılır.
const BACKUP_KEY = 'akis.lastBackup';
const BACKUP_WARN_DAYS = 3;
function markBackupDone() {
  try {
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
  } catch (e) {}
  renderBackupState();
}
function lastBackupAt() {
  try {
    const v = localStorage.getItem(BACKUP_KEY);
    return v ? new Date(v) : null;
  } catch (e) {
    return null;
  }
}
function backupState() {
  const at = lastBackupAt();
  // Kısa görünen metinler (v2.105): uzun hâlleri üst barda başlığı sıkıştırıyordu.
  // Tam açıklama `title` ipucunda ve Ayarlar → yedek bölümünde.
  if (!at || Number.isNaN(at.getTime())) return { level: 'none', text: 'Paket yok' };
  const days = Math.floor((Date.now() - at.getTime()) / 86400000);
  const d = at.toLocaleDateString('tr-TR');
  if (days >= BACKUP_WARN_DAYS) return { level: 'stale', days, text: `Son paket ${days} gün önce` };
  return { level: 'ok', days, text: `Son paket ${d}` };
}
function renderBackupState() {
  const el = $('#backupState');
  if (!el) return;
  const st = backupState();
  el.textContent = st.text;
  el.className = 'backup-state ' + st.level;
  el.title =
    st.level === 'none'
      ? 'Henüz paket oluşturmadınız. Veri yalnız bu tarayıcıda; tarayıcı verisi silinirse kaybolur.'
      : st.level === 'stale'
        ? 'Uzun süredir paket oluşturmadınız. Veri kaybını önlemek için Paket oluşturun.'
        : 'Paket güncel.';
}

// Dışa aktarmadan önce "kim olarak çalışıyorsun?" sorusu. Dosyayı paylaşan
// kişinin kimliği belli olmadan yapılan düzeltmeler sonradan çözülemez
// (bkz. mergeCases: kaynağı tanımsız onay kabul edilmez). Bu yüzden soru
// burada, doğru anda sorulur.
async function ensureEditorIdentity() {
  const c = currentCase();
  if (!c) return true;
  const team = c.team || [];
  // Tek kişilik dosya: ekip yoksa ayrım yapılamaz, sormak anlamsız.
  if (!team.length) return true;
  // Zaten seçili ve geçerliyse tekrar sorma.
  if (c.lastEditedBy && team.some((t) => t.id === c.lastEditedBy)) return true;
  return askConfirm(
    'Kim olarak paket oluşturuyorsunuz?',
    'Dosya bilgileri → İnceleme ekibi bölümünde "Şu an bu bilgisayarda çalışan" alanını doldurun. ' +
      'Bu bilgi olmadan yaptığınız düzeltmelerin kime ait olduğu sonradan çözülemez ve onayları geçersiz sayılır. ' +
      'Şimdi doldurmak ister misiniz? (Vazgeç derseniz yine de paket oluşturulur.)'
  );
}
// `scope`: 'current' | 'all'. Verilmezse KULLANICIYA SORULUR (v2.110).
// NEDEN: v2.109'da düğme sessizce "hepsi"ne dönüşüyordu; tek dosya sanıp basan
// kullanıcı 3 dosyalık paket indiriyordu (ölçüldü).
async function exportProject(scope) {
  const c = currentCase();
  if (!c) return;
  const real = (appState.cases || []).filter((x) => !isEmptyCase(x));
  if (!real.length) {
    showToast(
      'Pakete girecek dosya yok: dosya numarası, mahkeme, taraf veya ses kaydı yok. ' +
        'Önce bir dosyaya bilgi girin veya ses kaydı ekleyin.'
    );
    return;
  }
  if (!EXPORT_SCOPE.includes(scope)) {
    // Aktif dosya boşsa "bu dosya" seçeneği sunulamaz.
    const curEmpty = isEmptyCase(c);
    const pick = await askExportScope({
      currentName: curEmpty ? '' : caseDisplayName(c),
      total: real.length
    });
    if (!pick) return; // kullanıcı vazgeçti
    scope = pick;
  }
  // Kimliği belirsiz paylaşım sonradan çözülemez; doğru anda sorulur.
  if (!(await ensureEditorIdentity())) {
    setCaseDrawer(true);
    showToast('Önce "Şu an bu bilgisayarda çalışan" alanını doldurun, sonra tekrar paket oluşturun.');
    return;
  }
  // YEDEK KAPSAMI (v2.84): v2.83 ve öncesinde YALNIZ aktif dosya paketlenir,
  // ekran yine de "bu bir yedektir" derdi. Birden fazla dosya varsa diğerleri
  // sessizce yedek dışı kalıyordu (kanıtlandı). Artık TÜM dosyalar paketlenir.
  // BOŞ DOSYA PAKETE GİRMEZ (v2.102): uygulamanın kendiliğinden açtığı, hiç
  // kullanıcı verisi taşımayan dosya "dosya" değildir. Girerse yeni tarayıcıda
  // "2 dosya" görünür ve geri yükleme sonrası sahte kayıt birikir.
  const plan = exportPlanFor(appState.cases || [], appState.activeCaseId, scope);
  if (plan.kind === 'none') {
    showToast(
      scope === 'current'
        ? 'Bu dosya boş (dosya numarası, mahkeme, taraf veya ses kaydı yok). Önce bilgi girin.'
        : 'Pakete girecek dosya yok: dosyalar boş (dosya numarası, mahkeme, taraf, ses kaydı yok).'
    );
    return;
  }
  const all = plan.cases;
  const multi = plan.kind === 'archive';
  // Boş dosyalar sessizce atlanmaz: kullanıcı neyin pakete girmediğini bilir.
  const skippedNote = plan.skipped.length
    ? ` ${plan.skipped.length} boş çalışma alanı (veri içermiyor) yedeğe alınmadı.`
    : '';
  const zip = new JSZip();
  const missingAudio = [];
  if (multi) {
    zip.file(
      'archive.json',
      JSON.stringify(
        {
          schema: PROJECT_SCHEMA,
          exportedAt: new Date().toISOString(),
          kind: 'archive',
          activeCaseId: all.some((x) => x.id === c.id) ? c.id : all[0].id,
          cases: all
        },
        null,
        2
      )
    );
    // Sesler dosya kimliğiyle ayrı klasörlere yazılır; ad çakışması olmaz.
    for (const cc of all) {
      const folder = zip.folder(`audio/${cc.id}`);
      for (const m of cc.materials || []) {
        const blob = await getAudioBlob(cc, m);
        if (blob && folder) folder.file(`${m.id}_${safeName(m.name)}`, blob);
        else missingAudio.push(`${cc.fileNo || cc.name || cc.id} → ${m.name}`);
      }
    }
  } else {
    // Tek dosyalı paket: paketlenen dosya aktif dosya olmayabilir (aktif dosya
    // boşsa elenmiştir). Paket DAİMA paketlenen dosyayı taşır.
    const only = all[0];
    zip.file('case.json', JSON.stringify(buildProjectPack(only), null, 2));
    const assets = zip.folder('audio');
    for (const m of only.materials || []) {
      const blob = await getAudioBlob(only, m);
      if (blob) assets.file(`${m.id}_${safeName(m.name)}`, blob);
      else missingAudio.push(`${only.fileNo || only.name || only.id} → ${m.name}`);
    }
  }
  // EKSİK SES SESSİZCE ATLANMAZ (v2.86). Ses blobu kaybolmuşsa (tarayıcı
  // verisi temizlendi, kota) yedek "tam" görünür ama ses yoktur. Adli
  // incelemede bu kabul edilemez: kullanıcı neyi kaybettiğini bilmeli.
  if (missingAudio.length) {
    zip.file(
      'EKSIK_SES_UYARISI.txt',
      'Bu pakette aşağıdaki ses dosyaları YOKTUR (yerel depoda bulunamadı):\n\n' +
        missingAudio.map((x) => '• ' + x).join('\n') +
        '\n\nDeşifre metinleri ve rapor verisi pakette vardır. ' +
        'Ses dosyalarını orijinal kaynaktan yeniden eklemeniz gerekir.\n'
    );
  }
  const out = await zip.generateAsync({ type: 'blob' });
  // Dosya adı TARİH + SAAT taşır: aynı gün iki yedek üzerine yazmaz (v2.110).
  const fileName = backupFileName(plan, new Date());
  downloadBlob(out, fileName);
  markBackupDone();
  if (missingAudio.length) {
    showToast(
      `Paket oluşturuldu ANCAK ${missingAudio.length} ses dosyası bulunamadı ve pakete GİRMEDİ.` +
        ' Ayrıntı paketteki EKSIK_SES_UYARISI.txt dosyasında. Deşifre metinleri pakette var.' +
        skippedNote
    );
  } else {
    showToast(
      (plan.scope === 'all'
        ? `Paket oluşturuldu: TÜM dosyalar (${all.length} dosya) → ${fileName}`
        : `Paket oluşturuldu: yalnız "${caseDisplayName(all[0])}" → ${fileName}`) +
        ' — güvenli yerde saklayın.' +
        skippedNote
    );
  }
}
// ---- Ekip çalışması: dosya birleştirme ---------------------------------
// İki bilirkişi aynı davada çalıştığında her biri kendi .akis dosyasında
// ilerler; sonra dosyalar birleştirilir. Birleştirme KİMLİK (id) ile yapılır:
// aynı bölüm iki tarafta da varsa metin çakışması sessizce EZİLMEZ, kullanıcıya
// gösterilir. Sunucu, hesap, internet gerekmez; dosya transferi yeterlidir.
// Bütünlük: paket içindeki her ses dosyasının SHA-256 özeti taşınır.
let pendingMerge = null; // { theirs, compare }

// Gönderilen .akis paketini okur; dosyayı uygulamaya EKLEMEZ.
// İKİ PAKET BİÇİMİ DE KABUL EDİLİR (v2.102): tekil (`case.json`) ve arşiv
// (`archive.json`). v2.101'de arşiv paketi "Bu dosya bir AKİS çalışma paketi
// değil (case.json yok)" diye REDDEDİLİYORDU — yedek ile birleştirme paketi
// aynı biçimde üretildiği için kullanıcı "uyumsuz" hatası görüyordu.
// Arşivde birden çok dosya varsa, bu bilgisayardaki dosyayla eşleşen seçilir.
async function readProjectPack(file) {
  if (!window.JSZip) throw new Error('Paket açma bileşeni yüklenemedi. Sayfayı yenileyin.');
  const zip = await JSZip.loadAsync(file);
  const archMeta = zip.file('archive.json');
  if (archMeta) {
    const arch = JSON.parse(await archMeta.async('string'));
    if (arch && arch.schema !== PROJECT_SCHEMA) throw new Error('Arşiv paketi sürümü tanınmadı.');
    const list = Array.isArray(arch?.cases) ? arch.cases : [];
    if (!list.length) throw new Error('Arşiv paketinde hiç dosya yok.');
    const mine = currentCase();
    const pick = selectCaseFromArchive(arch, mine);
    if (!pick.case) throw new Error(pick.reason);
    const theirs = normalizeCase(pick.case);
    // Arşivde ses girdileri dosya klasörü altındadır.
    const entryNames = Object.keys(zip.files);
    return { zip, theirs, entryNames, archiveCount: list.length };
  }
  const meta = zip.file('case.json');
  if (!meta) throw new Error('Bu dosya bir paket değil (ne case.json ne archive.json var).');
  const pack = JSON.parse(await meta.async('string'));
  const err = validateProjectPack(pack);
  if (err) throw new Error(err);
  const theirs = normalizeCase(pack.case);
  return { zip, theirs, entryNames: Object.keys(zip.files), archiveCount: 1 };
}

// Karşılaştırmayı diyalogda gösterir. Hiçbir şey değiştirmez.
function renderMergePreview(cmp) {
  const sum = $('#mergeSummary');
  const conf = $('#mergeConflicts');
  if (!sum || !conf) return;
  const row = (label, value, cls = '') =>
    `<div class="merge-row ${cls}"><span>${esc(label)}</span><b>${esc(String(value))}</b></div>`;
  const addedMat = cmp.materials.added.length;
  const sameMat = cmp.materials.same.length;
  const differMat = cmp.materials.differ.length;
  sum.innerHTML = [
    `<div class="merge-pair"><div><small>Bu dosya</small><b>${esc(cmp.mineLabel)}</b></div><div class="merge-arrow">⇄</div><div><small>Gönderilen</small><b>${esc(cmp.theirsLabel)}</b></div></div>`,
    row('Yeni eklenecek kayıt', addedMat),
    row('Değişecek kayıt', differMat),
    row('Alınacak kayıt bilgisi (ölçüm/konuşmacı/köken)', (cmp.materials.fields || []).length),
    row('Aynı kalan kayıt', sameMat),
    row('Yeni eklenecek bölüm', cmp.segments.added),
    row('Metni çakışan bölüm', cmp.segments.changed.length, cmp.segments.changed.length ? 'warn' : ''),
    row('Otomatik alınacak bölüm metni', cmp.segments.autoResolved),
    row('Alınacak ikinci göz önerisi', cmp.segments.proposals),
    row('Kontrol durumu ilerleyen bölüm', cmp.segments.reviewAdvanced),
    row(
      'Aktarılmayan onay (kaynağı doğrulanamadı)',
      cmp.segments.approvalsRejected || 0,
      cmp.segments.approvalsRejected ? 'warn' : ''
    ),
    row(
      'Metin değiştiği için düşen onay',
      cmp.segments.approvalsDropped || 0,
      cmp.segments.approvalsDropped ? 'warn' : ''
    ),
    row('Doldurulacak soru cevabı', cmp.questions.filled),
    row('Otomatik alınacak soru cevabı', cmp.questions.autoResolved),
    row('Yeni soru', cmp.questions.added),
    row('Doldurulacak dosya alanı', cmp.caseFields.filled.length),
    row('Otomatik alınacak dosya alanı', cmp.caseFields.autoResolved.length),
    row('Çakışan dosya alanı', cmp.caseFields.conflicts.length, cmp.caseFields.conflicts.length ? 'warn' : ''),
    row('Ekibe eklenecek kişi', cmp.team.added.length)
  ].join('');

  if (!cmp.conflicts.length) {
    conf.innerHTML =
      '<div class="merge-ok">Çakışma yok. Birleştirme güvenle uygulanabilir.</div>';
    return;
  }
  conf.innerHTML =
    `<h3 class="merge-h3">Çakışmalar (${cmp.conflicts.length})</h3>` +
    `<p class="merge-note">Metin çakışmalarında <b>bu dosyadaki metin korunur</b>; gelen metin kaybolmaz, işlem günlüğüne ve metin geçmişine yazılır. <b>Aktarılmayan onay</b> kaynağı doğrulanamadığı için kabul edilmez; o bölüm <b>kontrol bekliyor</b> olur. Karşı tarafın metnini istiyorsanız önce bu dosyada düzeltin, sonra tekrar birleştirin.</p>` +
    cmp.conflicts
      .slice(0, 20)
      .map((c) => {
        const head =
          c.kind === 'question-answer'
            ? `Soru cevabı · ${(c.questionId || '').slice(-6)}`
            : c.kind === 'case-field'
              ? `Dosya alanı · ${c.field || ''}`
              : c.kind === 'approval-not-attributed' || c.kind === 'unattributed-approval'
                ? `Aktarılmayan onay · ${c.materialName || ''} · bölüm ${(c.segmentId || '').slice(-6)}`
                : `${c.materialName || ''} · bölüm ${(c.segmentId || '').slice(-6)}`;
        return `<div class="merge-conflict">
        <div class="merge-conflict-head">${esc(head)}</div>
        ${c.reason ? `<p class="merge-reason">${esc(c.reason)}</p>` : ''}
        <div class="merge-cols"><div><small>Bu dosya</small><p>${esc(c.mine || '(boş)')}</p></div><div><small>Gelen</small><p>${esc(c.theirs || '(boş)')}</p></div></div>
      </div>`;
      })
      .join('') +
    (cmp.conflicts.length > 20 ? `<p class="merge-note">… ve ${cmp.conflicts.length - 20} çakışma daha.</p>` : '');
}

async function startMerge(file) {
  const { zip, theirs, entryNames } = await readProjectPack(file);
  const mine = currentCase();
  if (!mine) throw new Error('Önce bir çalışma dosyası açın.');
  const cmp = compareCases(mine, theirs);
  pendingMerge = { zip, theirs, cmp, entryNames };
  renderMergePreview(cmp);
  const dlg = $('#mergeDialog');
  if (dlg && !dlg.open) dlg.showModal();
}

// Birleştirmeyi uygular: veriyi birleştirir, gelen ses dosyalarını saklar,
// işlemi delil günlüğüne yazar.
async function applyMerge() {
  if (!pendingMerge) return;
  const { zip, theirs, entryNames } = pendingMerge;
  const mine = currentCase();
  if (!mine) return;
  snapshotForUndo('çalışma dosyası birleştirildi');
  const { merged, applied, conflicts } = mergeCases(mine, theirs);

  // Gelen paketteki ses dosyalarını sakla (aynı kayıt id'si varsa zaten var).
  // Paket arşivse sesler `audio/<GELEN dosyaId>/` altındadır; klasör, birleşmiş
  // dosyanın id'si DEĞİL, paketteki kaydın id'sidir. Bu yüzden gelen dosyanın
  // kimliği verilir. MIME alanı `m.type`tır (`mimeType` diye bir alan yok —
  // v2.101'de yanlış okunuyordu, ses blobu daima audio/wav etiketiyle yazıldı).
  const myKeys = new Set((mine.materials || []).map((m) => blobKey(mine, m)));
  const audioCaseId = theirs.id;
  for (const { materialId, entry } of matchAudioEntries(entryNames, merged.materials || [], audioCaseId)) {
    const key = `${mine.id}::${materialId}`;
    if (myKeys.has(key)) continue;
    const blob = await zip.file(entry).async('blob');
    const m = (merged.materials || []).find((x) => x.id === materialId);
    await storeBlob(key, new Blob([blob], { type: m?.type || 'audio/wav' }));
  }

  // Birleşmiş dosyayı yerel dosyanın yerine koy (id korunur).
  merged.id = mine.id;
  // Birleştirme sonucu yeni bir nesnedir; düz alan erişimcileri (CASE_MIRROR)
  // yoktur. Yeniden kurulmazsa rapor `c.plaintiff` gibi düz alanları BOŞ
  // okur (v2.94).
  syncCaseMirrors(merged);
  defineCaseMirrors(merged);
  const idx = appState.cases.findIndex((c) => c.id === mine.id);
  if (idx >= 0) appState.cases[idx] = merged;
  merged.updatedAt = new Date().toISOString();
  (merged.mergeLog = merged.mergeLog || []).push({
    at: merged.updatedAt,
    source: theirs.fileNo || theirs.id,
    applied: applied.length,
    conflicts: conflicts.length
  });
  persist();
  pendingMerge = null;
  const dlg = $('#mergeDialog');
  if (dlg && dlg.open) dlg.close();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  await renderAudioList();
  // Çakışma türleri AYRI anlatılır: metin çakışmasında yerel metin korunur,
  // aktarılmayan onayda ise bölüm kontrol bekliyor olur. Tek cümlede
  // birleştirmek kullanıcıyı yanıltıyordu (v2.122).
  const approvalConflicts = conflicts.filter(
    (c) => c.kind === 'approval-not-attributed' || c.kind === 'unattributed-approval'
  ).length;
  const textConflicts = conflicts.length - approvalConflicts;
  const parts = [`Birleştirildi: ${applied.length} değişiklik uygulandı.`];
  if (textConflicts) {
    parts.push(`${textConflicts} metin çakışmasında bu dosyadaki metin korundu (gelen metin geçmişe yazıldı).`);
  }
  if (approvalConflicts) {
    parts.push(`${approvalConflicts} onay aktarılamadı: kaynağı doğrulanamadı, o bölümler kontrol bekliyor.`);
  }
  showToast(parts.join(' '));
}

// ÇOK DOSYALI ARŞİV GERİ YÜKLEME (v2.84). Dışa aktarma artık tüm dosyaları
// tek pakete koyar; bu yol olmadan o yedek işe yaramazdı.
// v2.102: (a) boş dosyalar geri yüklenmez, (b) bu bilgisayarda zaten olan
// dosya KOPYA olarak eklenmez, (c) sesi bulunamayan dosya sessizce atlanmaz.
async function importArchive(zip, arch) {
  const rawList = Array.isArray(arch.cases) ? arch.cases : [];
  if (!rawList.length) throw new Error('Arşivde dosya yok.');
  // Boş dosyalar (hiç kullanıcı verisi taşımayan) geri yüklenmez: yedekte
  // zaten olmamalı; eski yedeklerde kalmış olabilir.
  const list = rawList.filter((raw) => !isEmptyCase(raw));
  const emptySkipped = rawList.length - list.length;
  if (!list.length) throw new Error('Arşivdeki dosyaların hepsi boş (veri içermiyor). Geri yükleme yapılmadı.');
  // Bu bilgisayarda zaten olan dosyalar: kopya açmak veri karışıklığı yaratır.
  const existing = appState.cases || [];
  const dup = list.filter((raw) =>
    existing.some((x) => x.id === raw.id || (x.fileNo && raw.fileNo && x.fileNo === raw.fileNo && (x.court || '') === (raw.court || '')))
  );
  const fresh = list.filter((raw) => !dup.includes(raw));
  const dupNote = dup.length ? ` Bu bilgisayarda zaten bulunan ${dup.length} dosya KOPYA olarak eklenmedi.` : '';
  if (!fresh.length) {
    showToast(`Paketteki ${list.length} dosya bu bilgisayarda zaten var. Kopya eklenmedi.${dupNote}`);
    return;
  }
  const ok = await askConfirm(
    'Arşivden geri yükleme',
    `Pakette ${list.length} dosya var. Bunlardan ${fresh.length} tanesi bu bilgisayara EKLENİR; ` +
      'mevcut dosyalarınız silinmez.' +
      dupNote +
      (emptySkipped ? ` Paketteki ${emptySkipped} boş kayıt (veri içermiyor) atlandı.` : '') +
      ' Devam edilsin mi?'
  );
  if (!ok) return;
  snapshotForUndo('arşivden geri yükleme');
  let added = 0;
  const missingAudio = [];
  let identityNeeded = false;
  for (const raw of fresh) {
    try {
      const c = normalizeCase(raw);
      const sourceId = c.id;
      c.id = uid();
      // Kimlik bu bilgisayara ait değildir (v2.122): onay atfı yanlış olmasın.
      c.lastEditedBy = '';
      if ((c.team || []).length) identityNeeded = true;
      c.materials = c.materials || [];
      const hits = matchAudioEntries(Object.keys(zip.files), c.materials, sourceId);
      const found = new Set(hits.map((h) => h.materialId));
      for (const { materialId, entry } of hits) {
        const m = c.materials.find((x) => x.id === materialId);
        const blob = await zip.file(entry).async('blob');
        await storeBlob(`${c.id}::${materialId}`, new Blob([blob], { type: m?.type || 'audio/wav' }));
      }
      // Sesi bulunamayan kayıt sessizce atlanmaz (dışa aktarmada uyarı vardı,
      // içeri alırken yoktu — v2.102'de kapatıldı).
      for (const m of c.materials) {
        if (!found.has(m.id)) missingAudio.push(`${c.fileNo || c.name || c.id} → ${m.name}`);
      }
      c.name = c.name || c.fileNo || 'Geri yüklenen dosya';
      appState.cases.push(c);
      added++;
    } catch (e) {
      console.error('Arşiv dosyası atlandı:', e);
    }
  }
  if (!added) throw new Error('Arşivdeki dosyaların hiçbiri yüklenemedi.');
  appState.activeCaseId = appState.cases[appState.cases.length - added].id;
  // Geri yükleme sonrası "boş dosya + gelen dosyalar" kalabalığı OLUŞMAZ:
  // veri taşımayan kayıtlar düşürülür (kaybedilecek veri yoktur) ve aktif
  // dosya gelen dosyaya çekilir. v2.101'de boş dosya kalıyor, ekran
  // "toplamda üç kayıt" gösteriyordu.
  appState.cases = dropEmptyCases(appState.cases).cases;
  if (!currentCase()) appState.activeCaseId = appState.cases[0].id;
  persist();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  await renderAudioList();
  switchView('overview');
  if (missingAudio.length) {
    showToast(
      `${added} dosya geri yüklendi ANCAK ${missingAudio.length} ses kaydı pakette bulunamadı. ` +
        `Deşifre metinleri geldi; sesi orijinal kaynaktan yeniden ekleyin: ${missingAudio.slice(0, 3).join(', ')}` +
        (missingAudio.length > 3 ? '…' : '')
    );
  } else {
    showToast(
      `${added} dosya arşivden geri yüklendi.` +
        (identityNeeded
          ? ' Dosya bilgileri → "Şu an bu bilgisayarda çalışan" alanından kendinizi seçin.'
          : '')
    );
  }
}
async function importProject(file) {
  if (!window.JSZip) throw new Error('Çalışma paketi açma bileşeni yüklenemedi. İnternet bağlantısını kontrol edin.');
  const zip = await JSZip.loadAsync(file);
  // Çok dosyalı yedek mi?
  const archMeta = zip.file('archive.json');
  if (archMeta) {
    const arch = JSON.parse(await archMeta.async('string'));
    return importArchive(zip, arch);
  }
  const meta = zip.file('case.json');
  if (!meta) throw new Error('Dosya geçerli bir AKİS veya önceki MİHENK paketi değil.');
  const pack = JSON.parse(await meta.async('string'));
  const err = validateProjectPack(pack);
  if (err) throw new Error(err);
  const c = pack.case;
  // Aynı dosya zaten açıksa kopya açmak veri karışıklığına yol açar.
  // Kullanıcı "İçe aktar" ile "Birleştir"i karıştırabilir; burada durup sorarız.
  const same = (appState.cases || []).find(
    (x) => x.id === c.id || (x.fileNo && c.fileNo && x.fileNo === c.fileNo && x.court === c.court)
  );
  if (same) {
    const devam = await askConfirm(
      'Bu dosya zaten açık',
      `"${c.fileNo || c.id}" numaralı dosya bu bilgisayarda zaten var. ` +
        'Paketten yükleme YENİ BİR KOPYA açar; birleştirme yapmaz. ' +
        'Yardımcıdan gelen düzeltmeleri almak istiyorsanız "Vazgeç" deyip ⇄ Birleştir düğmesini kullanın. ' +
        'Yine de ayrı bir kopya açmak istiyor musunuz?'
    );
    if (!devam) {
      showToast('Paketten yükleme iptal edildi. Yardımcı dosyası için ⇄ Birleştir kullanın.');
      return;
    }
  }
  c.id = uid();
  // Kimlik bu bilgisayara AİT DEĞİLDİR (v2.122). Devralınırsa bu makinede
  // verilen onaylar yanlış kişiye yazılır ve "ikinci göz onaylayamaz" kuralı
  // sessizce delinebilir. Kullanıcı kendini seçmeli.
  c.lastEditedBy = '';
  c.materials = c.materials || [];
  const entryNames = Object.keys(zip.files);
  for (const { materialId, entry } of matchAudioEntries(entryNames, c.materials)) {
    const m = c.materials.find((x) => x.id === materialId);
    const blob = await zip.file(entry).async('blob');
    const mime = m.type || 'audio/wav';
    await storeBlob(`${c.id}::${materialId}`, new Blob([blob], { type: mime }));
  }
  c.name = c.name || c.fileNo || 'Paketten yüklenen dosya';
  snapshotForUndo('paketten dosya yüklendi');
  appState.cases.push(c);
  appState.activeCaseId = c.id;
  // Boş çalışma alanı (veri içermiyor) yeni dosyanın yanında bırakılmaz.
  appState.cases = dropEmptyCases(appState.cases).cases;
  if (!currentCase()) appState.activeCaseId = appState.cases[0].id;
  persist();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  await renderAudioList();
  switchView('overview');
  showToast(
    'Dosya paketten yüklendi.' +
      ((c.team || []).length
        ? ' Bu dosya başka bilgisayardan geldi: Dosya bilgileri → "Şu an bu bilgisayarda çalışan" alanından kendinizi seçin.'
        : '')
  );
}
async function loadSamples() {
  if (appState.cases.some((c) => c.sampleKey)) {
    showToast('Hazır test dosyaları daha önce yüklenmiş.');
    return;
  }
  const btn = $('#loadSamplesBtn');
  btn.disabled = true;
  btn.querySelector('b').textContent = 'Test dosyaları yükleniyor…';
  try {
    const res = await fetch('sample_data/cases.json');
    if (!res.ok) throw new Error('Test dosyaları bulunamadı.');
    const pack = await res.json();
    let first = null;
    for (const sc of pack.cases) {
      const c = { ...freshCase(), ...sc, id: uid(), materials: [], synthetic: true, sampleKey: sc.sampleKey };
      for (const sm of sc.materials) {
        const fr = await fetch(sm.path);
        if (!fr.ok) throw new Error(`${sm.name} yüklenemedi.`);
        const blob = await fr.blob();
        const tech = await audioTech(blob);
        const m = {
          id: uid(),
          name: sm.name,
          type: 'audio/wav',
          size: blob.size,
          duration: sm.duration || (await audioDuration(blob)),
          sha256: await sha256(blob),
          tech,
          segments: [],
          status: 'pending',
          synthetic: true,
          referenceSegments: sm.referenceSegments || [],
          addedAt: new Date().toISOString(),
          log: []
        };
        c.materials.push(m);
        logEvent(m, 'Kayıt eklendi', `${sm.name} · ${blob.size} bayt · SHA-256 hesaplandı (test paketi)`);
        await storeBlob(blobKey(c, m), blob);
      }
      appState.cases.push(c);
      if (!first) first = c;
    }
    appState.activeCaseId = first.id;
    persist();
    renderCaseSelect();
    populateCaseForm();
    populateQuestionsForm();
    renderOverview();
    await renderAudioList();
    showToast('4 kurgusal dosya ve 10 sentetik ses kaydı yüklendi.');
  } catch (e) {
    showToast(`Test paketi yüklenemedi: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.querySelector('b').textContent = 'Hazır test dosyalarını yükle';
  }
}
// Odak modu tek noktadan yönetilir. Kenar çubuğu gizlendiğinde modu kapatan
// düğme de gizlenirdi; bu yüzden çıkış için ayrıca üst çubukta bir düğme ve
// Esc kısayolu bulunur.
// Ayarlar çekmecesi: model, toplu çözümleme ve depolama burada durur. Çalışma
// alanını kapatmadığı için uzman bağlamı kaybetmez.
// Rapor tam ekran modu: kabuk gizlenir, yalnızca ince çubuk kalır.
function setReportFull(on) {
  document.body.classList.toggle('report-full', on);
  const bar = $('#reportFullbar');
  if (bar) bar.hidden = !on;
  if (on) {
    switchView('report');
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }
}
// Dosya bilgileri çekmecesi. Form artık ayrı sayfa değil; çalışma alanının
// üzerine sağdan açılır. Aynı anda yalnızca bir çekmece açık olur.
function setCaseDrawer(open) {
  const d = $('#caseDrawer');
  const b = $('#drawerBackdrop');
  if (!d) return;
  if (open) setSettingsDrawer(false);
  d.classList.toggle('open', open);
  d.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (b) b.hidden = !open;
}
function setSettingsDrawer(open) {
  const d = $('#settingsDrawer');
  const b = $('#drawerBackdrop');
  if (!d) return;
  if (open) setCaseDrawer(false);
  d.classList.toggle('open', open);
  d.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (b) b.hidden = !open;
  if (open) {
    // Açılınca güncel model/depolama durumunu tazele.
    try {
      updateModelBadge();
      refreshStorage();
    } catch (e) {}
  }
}
function setFocusMode(on) {
  document.body.classList.toggle('focus-mode', on);
  const fb = $('#focusModeBtn');
  if (fb) {
    fb.textContent = on ? '⤡' : '⤢';
    fb.title = on ? 'Odak modundan çık' : 'Odak modu';
  }
  const eb = $('#focusExitBtn');
  if (eb) eb.hidden = !on;
  try {
    localStorage.setItem('akis.focusMode', on ? '1' : '0');
  } catch (e) {}
  showToast(on ? 'Odak modu açık. Kenar çubuğu gizlendi. Çıkmak için Esc.' : 'Odak modu kapalı.');
}
function setupEvents() {
  $$('.nav-item[data-view]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.goto)));
  $$('[data-view]');
  $$('.workflow-step').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.goto)));
  $$('.quick-action[data-goto]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.goto)));
  $('#caseSelect').addEventListener('change', async (e) => {
    appState.activeCaseId = e.target.value;
    persist();
    populateCaseForm();
    populateQuestionsForm();
    renderOverview();
    await renderAudioList();
    renderQueue();
  });
  $('#newCaseBtn').addEventListener('click', () => {
    const c = freshCase();
    // Zaten boş bir çalışma alanı varsa yenisini eklemek "hayalet dosya"
    // biriktirir (seçicide birden çok adsız kayıt). Boş kayıt yeni dosyayla
    // DEĞİŞTİRİLİR; veri taşıyan kayıtlara dokunulmaz.
    const cur = currentCase();
    const replaced = cur && isEmptyCase(cur);
    if (replaced) {
      const i = appState.cases.findIndex((x) => x.id === cur.id);
      if (i >= 0) appState.cases.splice(i, 1);
    }
    appState.cases.push(c);
    appState.activeCaseId = c.id;
    persist();
    renderCaseSelect();
    populateCaseForm();
    populateQuestionsForm();
    renderOverview();
    renderAudioList();
    setCaseDrawer(true);
  });
  $('#caseDrawer').addEventListener('input', readCaseForm);
  $('#caseDrawer').addEventListener('change', readCaseForm);
  // Ekip alanları: yazma/kaldırma. Delegasyon kullanılır çünkü panel yeniden
  // çizildiğinde düğümler tazelenir.
  $('#caseDrawer').addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'whoEditingSelect') return; // change olayında işlenir
    if (el.dataset && el.dataset.team !== undefined) {
      updateTeamMember(el.dataset.team, el.dataset.teamKey, el.value);
    }
  });
  $('#caseDrawer').addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'whoEditingSelect') {
      const c = currentCase();
      if (c) {
        c.lastEditedBy = el.value || '';
        persist();
        renderOverview();
        // Seçilen kişinin rolü kullanıcıya açıkça söylenir: onaylayabilir mi?
        const t = (c.team || []).find((x) => x.id === el.value);
        if (t) {
          showToast(
            canApproveRole(t.role)
              ? `${t.name || 'Seçilen kişi'} — ${TEAM_ROLE_LABEL[t.role]}: metni onaylayabilir.`
              : `${t.name || 'Seçilen kişi'} — ${TEAM_ROLE_LABEL[t.role]}: düzeltmeleri ÖNERİ olur, onaylayamaz.`
          );
        }
      }
      return;
    }
    if (el.dataset && el.dataset.team !== undefined) {
      updateTeamMember(el.dataset.team, el.dataset.teamKey, el.value);
    }
  });
  $('#caseDrawer').addEventListener('click', (e) => {
    const b = e.target.closest('[data-team-remove]');
    if (b) removeTeamMember(b.dataset.teamRemove);
  });
  const addTeamBtn = $('#addTeamBtn');
  if (addTeamBtn) addTeamBtn.addEventListener('click', addTeamMember);
  // Görünüm seçenekleri: panel her yeniden çizildiğinde düğümler tazelenir,
  // bu yüzden dinleyici kapsayıcıya (delegasyon) bağlanır.
  const appearanceHost = $('#appearanceHost');
  if (appearanceHost) {
    appearanceHost.addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme],[data-density],[data-fontscale]');
      if (!b) return;
      if (b.dataset.theme) setTheme(b.dataset.theme);
      else if (b.dataset.density) setDensity(b.dataset.density);
      else if (b.dataset.fontscale) setFontscale(b.dataset.fontscale);
    });
  }
  $('#view-questions').addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.q !== undefined) {
      const c = currentCase(),
        q = c.questions[Number(t.dataset.q)];
      if (q) {
        q[t.dataset.k] = t.value;
        // Cevap düzenlemesi ayrı sayılır; birleştirmede "kim dokundu" buna dayanır.
        if (t.dataset.k === 'answer' && t.value.trim()) q.answerRev = 1;
      }
      persist();
    } else readQuestionsForm();
  });
  $('#view-questions').addEventListener('change', (e) => {
    if (e.target.dataset.q === undefined) readQuestionsForm();
  });
  $('#addQuestionBtn').addEventListener('click', addQuestion);
  // İnceleme bölüm menüsü: yalnız görünürlük değişir, DOM yeniden çizilmez.
  $$('.split-item[data-qtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.qtab;
      $$('.split-item[data-qtab]').forEach((x) => {
        const on = x.dataset.qtab === tab;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      $$('.split-pane[data-qpane]').forEach((x) => x.classList.toggle('on', x.dataset.qpane === tab));
      try {
        localStorage.setItem('akis.qTab', tab);
      } catch (e) {}
    });
  });
  $('#questionsList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove-q]');
    if (!b) return;
    const c = currentCase();
    c.questions.splice(Number(b.dataset.removeQ), 1);
    persist();
    renderQuestions();
  });
  $('#audioInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (files.length) await addAudioFiles(files);
    e.target.value = '';
  });
  const dz = $('#dropZone');
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('drag');
    })
  );
  dz.addEventListener('drop', async (e) => {
    const files = [...e.dataTransfer.files];
    if (files.length) await addAudioFiles(files);
  });
  $('#view-audio').addEventListener('click', async (e) => {
    const mr = e.target.closest('[data-material-row]');
    if (mr) {
      setActiveMaterial(mr.dataset.materialRow);
      return;
    }
    const item = e.target.closest('.seg-item');
    if (item) {
      focusSegmentRow(item);
    }
    const b = e.target.closest('button');
    if (!b) return;
    const c = currentCase();
    if (b.dataset.transcribe) {
      await transcribe(b.dataset.transcribe);
    } else if (b.dataset.cancel) {
      const mm = c.materials.find((x) => x.id === b.dataset.cancel);
      if (mm) {
        mm.cancelRequested = true;
        showToast('İptal istendi; geçerli pencere bitince duracak.');
      }
    } else if (b.dataset.manual) {
      addManualSegment(b.dataset.manual);
    } else if (b.dataset.removeAudio) {
      const m = c.materials.find((x) => x.id === b.dataset.removeAudio);
      if (!m) return;
      snapshotForUndo(`kayıt kaldırıldı: ${m.fileName || m.name || ''}`);
      closeAudioGraph(m);
      await deleteBlob(blobKey(c, m));
      const url = objectUrls.get(blobKey(c, m));
      if (url) URL.revokeObjectURL(url);
      objectUrls.delete(blobKey(c, m));
      c.materials = c.materials.filter((x) => x.id !== m.id);
      persist();
      renderAudioList();
      renderOverview();
      showToast('Ses kaydı kaldırıldı.');
    } else if (b.dataset.verify) {
      await verifyIntegrity(b.dataset.verify);
    } else if (b.dataset.restoreSegments) {
      const m = c.materials.find((x) => x.id === b.dataset.restoreSegments);
      if (!m || !m.previousSegments) return;
      const ok = await askConfirm(
        'Önceki bölümleri geri yükle',
        `Şu anki ${(m.segments || []).length} bölüm, yeniden çözümleme öncesindeki ` +
          `${m.previousSegments.count} bölümle değiştirilecek. Şu anki hâl kaybolur. Devam edilsin mi?`
      );
      if (!ok) return;
      m.segments = JSON.parse(JSON.stringify(m.previousSegments.segments || []));
      delete m.previousSegments;
      m.activeSeg = 0;
      logEvent(m, 'Önceki bölümler geri yüklendi', `${m.segments.length} bölüm`);
      persist();
      renderAudioList();
      renderOverview();
      showToast('Önceki bölümler geri yüklendi.');
    } else if (b.dataset.log) {
      const lm = c.materials.find((x) => x.id === b.dataset.log);
      if (lm) showEvidenceLog(lm);
    } else if (b.dataset.history !== undefined) {
      const card = b.closest('.audio-card');
      const hid = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
      const hm = c.materials.find((x) => x.id === hid);
      if (hm) showSegmentHistory(hm, Number(b.dataset.history));
    } else if (b.dataset.playSeg !== undefined) {
      playSegment(b);
    } else if (b.dataset.segFilter !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        m.uiFilter = b.dataset.segFilter;
        renderSegments(m, card);
      }
    } else if (b.dataset.segNav !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) navSegment(m, b.dataset.segNav === 'next' ? 1 : -1);
    } else if (b.dataset.segSpeed !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        m.playbackRate = Number(b.dataset.segSpeed);
        const pl = card.querySelector('audio');
        if (pl) pl.playbackRate = m.playbackRate;
        renderSegments(m, card);
        persist();
      }
    } else if (b.dataset.segApprove !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      approveActiveSegment(m);
    } else if (b.dataset.approveSeg !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) approveActiveSegment(m);
    } else if (b.dataset.proposalAccept !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      const i = Number(b.dataset.proposalAccept);
      const s2 = m?.segments[i];
      if (!s2 || !s2.proposal) return;
      if (isSecondEyesEditor()) {
        showToast('Öneriyi yalnız dosya sorumlusu kabul edebilir.');
        return;
      }
      const prev = s2.text;
      const prop = s2.proposal;
      s2.text = prop.text;
      s2.proposal = null;
      pushSegmentHistory(s2, prev);
      // Onay metne bağlıdır: kabul edilen metin yeniden kontrol ister.
      setSegReview(s2, 'pending');
      persist();
      renderSegments(m, card);
      renderOverview();
      if ($('#view-report').classList.contains('active')) renderReport();
      showToast('Öneri kabul edildi. Metni dinleyip onaylayın.');
    } else if (b.dataset.proposalReject !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      const i = Number(b.dataset.proposalReject);
      const s2 = m?.segments[i];
      if (!s2 || !s2.proposal) return;
      if (isSecondEyesEditor()) {
        showToast('Öneriyi yalnız dosya sorumlusu reddedebilir.');
        return;
      }
      s2.proposal = null;
      persist();
      renderSegments(m, card);
      renderOverview();
      showToast('Öneri reddedildi. Metin değişmedi.');
    } else if (b.dataset.reviewSet !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        const [ix, val] = b.dataset.reviewSet.split('|');
        const s2 = m.segments[Number(ix)];
        if (s2) {
          // Eski Türkçe kodlar burada koda çevrilir; atıf da yazılır (v2.122).
          setSegReview(s2, val);
          persist();
          updateSegListItem(m, Number(ix));
          refreshSegChips(m);
          renderSegDetail(m);
          renderOverview();
          if ($('#view-report').classList.contains('active')) renderReport();
        }
      }
    } else if (b.dataset.playActive !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) playActiveSegment(m);
    } else if (b.dataset.stopActive !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) stopSegmentPlayback(m);
    } else if (b.dataset.zwPlay !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) playActiveSegment(m);
    } else if (b.dataset.zwStop !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) stopSegmentPlayback(m);
    } else if (b.dataset.zwZoom !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) zoomWaveBy(m, Number.isInteger(m.activeSeg) ? m.activeSeg : 0, b.dataset.zwZoom);
    } else if (b.dataset.jumpPrio !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) jumpToPriority(m);
    } else if (b.dataset.bulkApprove !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) bulkApproveQuick(m);
    } else if (b.dataset.paragraph !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) paragraphize(m);
    } else if (b.dataset.terms !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        const panel = $(`#term-panel-${CSS.escape(m.id)}`);
        if (panel && !panel.hidden) closeTermPanel(m);
        else renderTermPanel(m);
      }
    } else if (b.dataset.coverage !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        const panel = $(`#coverage-panel-${CSS.escape(m.id)}`);
        if (panel && !panel.hidden) closeCoveragePanel(m);
        else renderCoveragePanel(m);
      }
    } else if (b.dataset.techToggle !== undefined) {
      const card = b.closest('.audio-card');
      const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        setTechOpen(!techOpenPref());
        renderSegDetail(m);
        showToast(techOpenPref() ? 'Teknik bölüm açık.' : 'Teknik bölüm kapalı — metin alanı büyüdü.');
      }
    } else if (b.dataset.covGoto !== undefined) {
      const [id, at] = b.dataset.covGoto.split('|');
      const m = c.materials.find((x) => x.id === id);
      if (m) seekPlayerTo(m, Number(at), b.closest('.audio-card'));
    } else if (b.dataset.mainPlay !== undefined) {
      const mm = c.materials.find((x) => x.id === b.dataset.mainPlay);
      if (mm) playWholeRecording(mm);
    } else if (b.dataset.followMode !== undefined) {
      // İKİ AYRI MOD (v2.119)
      const mode = b.dataset.followMode;
      setFollow(!followState[mode], mode);
      const label = mode === 'autoAdvance' ? 'Otomatik bölüm geçişi' : 'Canlı metin vurgusu';
      showToast(followState[mode] ? `${label} açık.` : `${label} kapalı.`);
    } else if (b.dataset.cardTab !== undefined) {
      // Sekme değiştir: DOM yeniden çizilmez, yalnız görünürlük değişir.
      const [id, tab] = b.dataset.cardTab.split('|');
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        m.uiTab = tab;
        persist();
        const card = b.closest('.audio-card');
        if (card) {
          card.querySelectorAll('[data-card-tab]').forEach((x) => {
            const on = x.dataset.cardTab === b.dataset.cardTab;
            x.classList.toggle('on', on);
            x.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          card.querySelectorAll('[data-pane]').forEach((x) => x.classList.toggle('on', x.dataset.pane === tab));
          // Gizliyken çizilen canvas 0 genişlikte olur; sekme açılınca
          // dalga formunu yeniden çiz ki doğru boyutta görünsün. Dalga formu
          // artık Deşifre sekmesinde (dinlerken metni görmek için).
          const cv = card.querySelector('canvas.wave-canvas');
          const pk = peakCache.get(m.id);
          if (cv && pk) requestAnimationFrame(() => drawWave(cv, pk, m));
        }
      }
    } else if (b.dataset.techToggle !== undefined) {
      const id = b.dataset.techToggle;
      const fold = $(`#tech-${CSS.escape(id)}`);
      if (fold) {
        const open = fold.hidden;
        fold.hidden = !open;
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        b.textContent = open ? 'Teknik bilgi ▲' : 'Teknik bilgi';
      }
    } else if (b.dataset.termApply !== undefined) {
      const [mid, gi, form] = b.dataset.termApply.split('|');
      const m = c.materials.find((x) => x.id === mid);
      if (m) {
        const issues = materialTermIssues(m);
        const g = issues[Number(gi)];
        if (g) {
          let changed = 0;
          for (const f of g.forms) {
            if (f.w !== form) changed += applyTermForm(m, f.w, form);
          }
          persist();
          renderSegments(m, b.closest('.audio-card'));
          renderOverview();
          renderTermPanel(m);
          showToast(changed ? `${changed} yazım "${form}" biçimine çevrildi.` : 'Değiştirilecek yazım bulunamadı.');
        }
      }
    } else if (b.dataset.analysisMode !== undefined) {
      // ANALİZ GÖRÜNÜMÜ (v2.128): Dalga / Spek / İkisi. Aynı kutu, sabit yükseklik.
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) setAnalysisMode(m, b.dataset.analysisMode);
    } else if (b.dataset.segSpec !== undefined) {
      // Eski yol (uyumluluk): yalnız spektrogram moduna geç.
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) setAnalysisMode(m, 'spec');
    } else if (b.dataset.silence !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) measureSegmentSilence(m, Number(b.dataset.silence));
    } else if (b.dataset.splitSeg !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) splitSegmentAtPlayer(m, Number(b.dataset.splitSeg));
    } else if (b.dataset.retranscribeSeg !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) retranscribeSegment(m.id, Number(b.dataset.retranscribeSeg));
    } else if (b.dataset.mergeNext !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) mergeSegmentWithNext(m, Number(b.dataset.mergeNext));
    } else if (b.dataset.addSpk !== undefined) {
      // Yeni konuşmacı: sıradaki standart kod verilir (S1, S2…). Uzman etiketi
      // sonra yazar; kayıt anında kod hazır olur, rapor tutarlı kalır.
      const m = c.materials.find((x) => x.id === b.dataset.addSpk);
      if (!m) return;
      ensureSpeakers(m);
      const n = (m.speakers || []).length + 1;
      const rec = {
        id: uid(),
        code: '',
        name: `Konuşmacı ${n}`,
        role: 'unspecified',
        gender: 'unspecified',
        ageRange: '',
        notes: '',
        pitch: null,
        pitchAt: null
      };
      m.speakers.push(rec);
      assignSpeakerCodes(m.speakers);
      // Yeni konuşmacı aktif bölüme atanır: uzman genellikle bu niyetle ekler.
      const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
      if (m.segments?.[idx]) m.segments[idx].speaker = rec.name;
      persist();
      renderSegDetail(m);
      updateSegListItem(m, idx);
      renderSpeakersPanel(m);
      renderOverview();
      showToast(`${rec.code} eklendi ve bu bölüme atandı. Etiketini konuşmacı panelinden yazın.`);
    } else if (b.dataset.spec !== undefined) {
      const mm = c.materials.find((x) => x.id === b.dataset.spec);
      if (mm) toggleSpectrogram(mm);
    } else if (b.dataset.measurePitch !== undefined) {
      const mm = c.materials.find((x) => x.id === b.dataset.measurePitch);
      if (mm) measureSpeakerPitch(mm);
    } else if (b.dataset.measureLevels !== undefined) {
      const mm = c.materials.find((x) => x.id === b.dataset.measureLevels);
      if (mm) measureLevels(mm);
    } else if (b.dataset.obs !== undefined) {
      const card = b.closest('.audio-card');
      const [ix, key] = b.dataset.obs.split('|');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        const sg = m.segments[Number(ix)];
        if (sg) {
          sg.obs = sg.obs || {};
          sg.obs[key] = !sg.obs[key];
          b.classList.toggle('on', sg.obs[key]);
          persist();
          renderOverview();
          if ($('#view-report').classList.contains('active')) renderReport();
        }
      }
    } else if (b.dataset.chan !== undefined) {
      const card = b.closest('.audio-card');
      const [mid, mode] = b.dataset.chan.split('|');
      const m = c.materials.find((x) => x.id === mid);
      if (m) {
        m.channelMode = mode;
        persist();
        if (mode !== 'both') ensureAudioGraph(m, card.querySelector('audio'));
        card
          .querySelectorAll('[data-chan]')
          .forEach((x) => x.classList.toggle('on', x.dataset.chan.endsWith('|' + mode)));
        applyChannelMode(m);
        resumeAudioGraph(m);
        showToast(
          mode === 'both' ? 'Stereo (her iki kanal)' : mode === 'left' ? 'Yalnız sol kanal' : 'Yalnız sağ kanal'
        );
      }
    } else if (b.dataset.nudge !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        const [ix, field, delta] = b.dataset.nudge.split('|');
        nudgeBoundary(m, Number(ix), field, Number(delta));
      }
    } else if (b.dataset.deleteSeg !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      snapshotForUndo(`bölüm ${Number(b.dataset.deleteSeg) + 1} silindi`);
      m.segments.splice(Number(b.dataset.deleteSeg), 1);
      persist();
      renderAudioList();
      renderOverview();
    }
  });
  // Hızlı etiket: metnin sonuna gözlem ifadesi ekler (varsa boşlukla). Temizle
  // yalnızca metni boşaltır; geçmiş kaydı odak değişiminde tutulur.
  $('#view-audio').addEventListener('click', (e) => {
    const tag = e.target.closest('[data-quick-tag]');
    const clear = e.target.closest('[data-quick-clear]');
    if (!tag && !clear) return;
    const card = e.target.closest('.audio-card');
    if (!card) return;
    const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    if (!m) return;
    if (tag) {
      const [ix, text] = tag.dataset.quickTag.split('|');
      const s = m.segments[Number(ix)];
      if (!s) return;
      const cur = (s.text || '').trim();
      const prev = s.text;
      applyTextEdit(s, cur ? cur + ' ' + text : text);
      pushSegmentHistory(s, prev);
      persist();
      renderSegDetail(m);
      updateSegListItem(m, Number(ix));
      refreshSegChips(m);
      renderOverview();
      showToast('Etiket eklendi.');
      return;
    }
    if (clear) {
      const ix = Number(clear.dataset.quickClear);
      const s = m.segments[ix];
      if (!s) return;
      const prev = s.text;
      applyTextEdit(s, '');
      pushSegmentHistory(s, prev);
      persist();
      renderSegDetail(m);
      updateSegListItem(m, ix);
      refreshSegChips(m);
      renderOverview();
      showToast('Bölüm metni temizlendi.');
    }
  });
  $('#view-audio').addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.key === 'text') {
      const card = el.closest('.audio-card');
      const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = currentCase().materials.find((x) => x.id === id);
      const s = m?.segments[Number(el.dataset.seg)];
      if (s) snapshotSegmentText(s);
    }
  });
  // Zaman alanı doğrulaması (v2.97). Geçerliyse kanonik biçim yazılır;
  // geçersizse kayda DOKUNULMAZ, alan eski değerine döner ve neden
  // reddedildiği söylenir. Sessiz sıfırlama yok.
  $('#view-audio').addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.amb) return;
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    const s2 = m?.segments[Number(el.dataset.seg)];
    if (!s2) return;
    s2[el.dataset.amb] = el.value;
    persist();
    if ($('#view-report').classList.contains('active')) renderReport();
  });
  $('#view-audio').addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.dataset || (el.dataset.key !== 'start' && el.dataset.key !== 'end')) return;
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    const idx = Number(el.dataset.seg);
    const s = m?.segments[idx];
    if (!s) return;
    const key = el.dataset.key;
    const raw = el.value;
    // Aralık denetimi: başlangıç yazılıyorsa bitiş, bitiş yazılıyorsa
    // başlangıç referanstır. `normalizeTimeInput(value, end)` imzası
    // "value + end" bekler; biz her iki durumu tek çağrıya indirgeriz.
    const otherKey = key === 'start' ? 'end' : 'start';
    const other = s[otherKey] || '';
    let canon;
    if (key === 'start') {
      canon = normalizeTimeInput(raw, other);
    } else {
      // Bitiş için: (başlangıç, yeni bitiş) çiftini doğrula, bitişi döndür.
      const startCanon = parseTimecodeStrict(other);
      const endCanon = parseTimecodeStrict(raw);
      canon =
        startCanon != null && endCanon != null && endCanon > startCanon ? timecode(endCanon) : null;
    }
    if (canon == null) {
      // Reddedildi: alanı eski değere döndür, kayda dokunma.
      el.value = s[key] || '';
      showToast(
        `Bölüm ${idx + 1}: "${raw}" geçerli bir zaman kodu değil. ` +
          'Biçim: SS:DD:ss.mmm (ör. 00:01:23.450). Bitiş, başlangıçtan sonra olmalı. Değer değiştirilmedi.'
      );
      return;
    }
    if (s[key] === canon) return;
    s[key] = canon;
    el.value = canon;
    persist();
    // Çakışma iki satırı ilgilendirir: kendisi + önceki/sonraki (v2.146).
    updateSegListItem(m, idx);
    if (idx > 0) updateSegListItem(m, idx - 1);
    if (idx + 1 < (m.segments || []).length) updateSegListItem(m, idx + 1);
    scheduleLightRefresh(m);
    if ($('#view-report').classList.contains('active')) renderReport();
  });
  $('#view-audio').addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.dataset || el.dataset.key !== 'text') return;
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    const i = Number(el.dataset.seg);
    const s = m?.segments[i];
    if (!s) return;
    // İkinci göz yazdıysa metin değişmedi; geçmişe yazılacak bir şey yok.
    if (!isSecondEyesEditor() && pushSegmentHistory(s)) persist();
    const rt = e.relatedTarget;
    const samePane = rt && rt.dataset && (rt.dataset.seg !== undefined || (rt.closest && rt.closest('.seg-detail')));
    if (!samePane) {
      updateSegListItem(m, i);
      if ($('#view-report').classList.contains('active')) renderReport();
    }
  });
  $('#view-audio').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.seg === undefined) return;
    // BELİRSİZ OKUMA alanları (v2.115): iki okuma + seçim.
    if (el.dataset.amb) {
      const card = el.closest('.audio-card');
      const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = currentCase().materials.find((x) => x.id === id);
      const s2 = m?.segments[Number(el.dataset.seg)];
      if (!s2) return;
      s2[el.dataset.amb] = el.value;
      // Seçim listesi okumalar değişince tazelenmeli; panel yeniden çizilmez
      // (odak kaybolmasın) ama seçenekler yerinde güncellenir.
      if (el.dataset.amb !== 'chosen') {
        const sel = el.closest('.sd-ambiguous')?.querySelector('[data-amb="chosen"]');
        if (sel) {
          const cur = sel.value;
          const opt = (v, label) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(label)}</option>`;
          sel.innerHTML =
            opt('', '— seçilmedi —') +
            (s2.reading1 ? opt(s2.reading1, '1. okuma') : '') +
            (s2.reading2 ? opt(s2.reading2, '2. okuma') : '');
        }
      }
      persist();
      return;
    }
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    const s = m?.segments[Number(el.dataset.seg)];
    if (!s) return;
    if (el.dataset.key === 'text') {
      const wasProposal = applyTextEdit(s, el.value);
      // İkinci göz yazdıysa ana metin DEĞİŞMEDİ; kullanıcı bunu görmeli.
      // Panel yeniden çizilmez (odak kaybolmasın) ama öneri bandı yerinde
      // güncellenir. Aksi hâlde yazdığı metin kaybolmuş gibi görünür.
      if (wasProposal && isSecondEyesEditor()) refreshProposalBand(m, Number(el.dataset.seg));
      // ONAY DÜŞTÜYSE SÖYLE (v2.88) — BİR KEZ. Bayrak setSegmentText içinde
      // kurulur; burada gösterilip silinir, böylece her tuşta gürültü olmaz
      // ve odak olayına bağlı kalmadan (yapıştırma, programatik yazma dahil)
      // kullanıcı mutlaka bilgilendirilir.
      if (approvalDroppedByEdit(s)) {
        delete s.__reviewDropped;
        showToast(
          `Bölüm ${Number(el.dataset.seg) + 1}: metin değiştiği için kontrol durumu ` +
            '"Kontrol bekliyor"a döndü. Metni dinleyip yeniden onaylayın.'
        );
      }
    } else if (el.dataset.key === 'speaker') s.speaker = el.value;
    else if (el.dataset.key === 'start' || el.dataset.key === 'end') {
      // ZAMAN ALANI (v2.97): yazarken kayda YAZILMAZ. Yarım yazılmış
      // "00:00:0" gibi değer kayda girerse rapor bozulur. Odak kaybında
      // doğrulanır (aşağıdaki focusout); geçersizse reddedilir ve söylenir.
      return;
    } else s[el.dataset.key] = el.value;
    persist();
    updateSegListItem(m, Number(el.dataset.seg));
    // YAZARKEN ağır iş yapılmaz (v2.86). Her tuşta segCounts tüm bölümleri
    // geziyor (500 bölümde ~8,5 ms) ve renderOverview tüm özeti yeniden
    // çiziyor. Yazma akıcılığı için bunlar 250 ms geciktirilir; son tuştan
    // sonra bir kez çalışır. Ölçüm: 500 bölümde tuş başına 8,5 ms → 0 ms.
    scheduleLightRefresh(m);
    if ($('#view-report').classList.contains('active')) renderReport();
  });
  $('#view-audio').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.origin !== undefined) {
      const card = el.closest('.audio-card');
      const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = currentCase().materials.find((x) => x.id === id);
      if (!m) return;
      m.origin = m.origin || {};
      m.origin[el.dataset.originKey] = el.value;
      persist();
      return;
    }
    if (!el.dataset || el.dataset.spk === undefined) return;
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    if (!m) return;
    const rec = (m.speakers || []).find((x) => x.id === el.dataset.spk);
    if (!rec) return;
    const key = el.dataset.spkKey;
    const oldName = rec.name || rec.label || '';
    rec[key] = el.value;
    // `name` ve `label` TEK KAYNAKTAN türetilir. Arayüz `name` yazar, şema
    // `label` okur; ikisi ayrışırsa yükleme sonrası konuşmacı bağı kopar ve
    // raporda S1 kodu kaybolur (v2.85'te kanıtlandı).
    if (key === 'name') {
      rec.label = el.value;
      rec.name = el.value;
      // Etiket adı değişirse bölümlerdeki konuşmacı referansları da güncellenir.
      if (el.value.trim() && el.value !== oldName) {
        for (const sg of m.segments || []) {
          if ((sg.speaker || '') === oldName) sg.speaker = el.value;
        }
      }
    }
    persist();
  });
  $('#view-audio').addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.listenFilter !== undefined) {
      const card = el.closest('.audio-card');
      const id = el.dataset.listenFilter;
      const m = currentCase().materials.find((x) => x.id === id);
      if (!m) return;
      m.listenFilter = el.value;
      // Filtre açıksa şeritte görsel geri bildirim (altın kenar + kalın yazı).
      const label = el.closest('.listen-filter-label');
      if (label) label.classList.toggle('filter-on', el.value !== 'off');
      persist();
      const player = card.querySelector('audio');
      if (el.value !== 'off' && player) {
        ensureAudioGraph(m, player).then((g) => {
          if (g) {
            applyListenFilters(m);
            runNoiseGate(m);
          }
          resumeAudioGraph(m);
        });
      } else if (audioGraphs.get(id)) {
        applyListenFilters(m);
      }
      showToast(
        el.value === 'off'
          ? 'Dinleme yardımcısı kapatıldı.'
          : 'Dinleme yardımcısı: ' + (LISTEN_FILTERS.find((f) => f[0] === el.value)?.[1] || el.value)
      );
      return;
    }
    if (el.dataset && el.dataset.spk !== undefined) {
      const card = el.closest('.audio-card');
      const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = currentCase().materials.find((x) => x.id === id);
      if (m) {
        const rec = (m.speakers || []).find((x) => x.id === el.dataset.spk);
        if (rec) {
          const key = el.dataset.spkKey;
          // Rol ve cinsiyet seçeneklerinin value'su ASCII KOD'dur; kayda kod
          // yazılır, etiket yalnız görünür. Etiket yazılırsa şema onu tanımaz ve
          // değer 'unspecified'a düşerdi (v2.78 ve öncesi sessiz veri kaybı).
          if (key === 'role') rec.role = normalizeSpeakerRole(el.value);
          else if (key === 'gender') rec.gender = normalizeSpeakerGender(el.value);
          else rec[key] = el.value;
          persist();
          renderSpeakersPanel(m);
          renderOverview();
        }
      }
    }
    if (el.dataset.key !== 'review') return;
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    const i = Number(el.dataset.seg);
    const s = m?.segments[i];
    if (!s) return;
    // İkinci göz onay veremez. "Anlaşılmadı" ve "Yeniden dinlenecek" bir onay
    // değil, gözlem olduğu için serbesttir.
    if (el.value === 'approved' && isSecondEyesEditor()) {
      showToast('Onay yetkisi dosya sorumlusunda. İkinci göz düzeltme önerir, onaylayamaz.');
      el.value = segReview(s);
      return;
    }
    setSegReview(s, el.value);
    el.dataset.state = el.value;
    persist();
    updateSegListItem(m, i);
    refreshSegChips(m);
    renderOverview();
    if ($('#view-report').classList.contains('active')) renderReport();
  });
  $('#loadModelBtn').addEventListener('click', () => ensureModel().catch((e) => showToast(e.message)));
  const modelSelectEl = $('#modelSelect');
  if (modelSelectEl)
    modelSelectEl.addEventListener('change', () => {
      saveModelPref(modelSelectEl.value);
      updateModelBadge();
    });
  // Çözümleme profili: aynı modelin yönlendirilebilir ayarı. Seçim hatırlanır;
  // yeni çözümleme bu profille yapılır. Ayrı model DEĞİLDİR (bkz. ASR_PROFILES).
  const profSel = $('#asrProfileSelect');
  if (profSel) {
    profSel.innerHTML = ASR_PROFILES.map(
      (p) => `<option value="${esc(p.id)}" title="${esc(p.hint)}">${esc(p.label)}</option>`
    ).join('');
    profSel.value = savedProfilePref();
    profSel.addEventListener('change', () => {
      saveProfilePref(profSel.value);
      const p = asrProfile(profSel.value);
      showToast(`Çözümleme profili: ${p.label}. ${p.hint}`);
    });
  }
  $('#refreshStorageBtn').addEventListener('click', () => refreshStorage());
  $('#clearAllModelsBtn').addEventListener('click', () => clearModelCache());
  $('#storageList').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.deleteModel) {
      await deleteModelCache(b.dataset.deleteModel);
    } else if (b.dataset.verifyModel) {
      await verifyModelCache(b.dataset.verifyModel);
    } else if (b.dataset.useModel) {
      const sel = $('#modelSelect');
      if (sel) {
        sel.value = b.dataset.useModel;
        showToast('Model seçildi: ' + b.dataset.useModel);
      }
    }
  });
  $('#startQueueBtn').addEventListener('click', () => runQueue());
  $('#cancelQueueBtn').addEventListener('click', () => {
    const c = currentCase();
    if (c) c.queueCancel = true;
    showToast('Kuyruk durdurulacak; geçerli kayıt bitince duracak.');
  });
  $('#retryFailedBtn').addEventListener('click', () => {
    const c = currentCase();
    if (!c) return;
    for (const m of c.materials || []) {
      if (materialStatus(m) === 'error') m.status = 'pending';
    }
    persist();
    renderQueue();
    renderAudioList();
    showToast('Hatalı kayıtlar kuyruğa alındı.');
  });
  $('#loadSamplesBtn').addEventListener('click', loadSamples);
  $('#downloadDocxBtn').addEventListener('click', () => makeDocx().catch((e) => showToast(e.message)));
  $('#downloadUdfBtn').addEventListener('click', () => makeUdf().catch((e) => showToast(e.message)));
  $('#exportProjectBtn').addEventListener('click', () => exportProject().catch((e) => showToast(e.message)));
  $('#importProjectBtn').addEventListener('click', () => $('#importProjectInput').click());
  // Ekip çalışması: birleştirme düğmesi ve diyaloğu.
  const mergeBtn = $('#mergeProjectBtn');
  if (mergeBtn) mergeBtn.addEventListener('click', () => $('#mergeProjectInput').click());
  const mergeInput = $('#mergeProjectInput');
  if (mergeInput) {
    mergeInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (f) {
        try {
          await startMerge(f);
        } catch (err) {
          showToast(`Birleştirme açılamadı: ${err.message}`);
        }
      }
      e.target.value = '';
    });
  }
  const mergeApply = $('#mergeApply');
  if (mergeApply) mergeApply.addEventListener('click', () => applyMerge().catch((e) => showToast(e.message)));
  for (const id of ['mergeCancel', 'closeMerge']) {
    const b = $(`#${id}`);
    if (b)
      b.addEventListener('click', () => {
        pendingMerge = null;
        const d = $('#mergeDialog');
        if (d && d.open) d.close();
      });
  }
  $('#importProjectInput').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      try {
        await importProject(f);
      } catch (err) {
        showToast(`Paketten yükleme başarısız: ${err.message}`);
      }
      e.target.value = '';
    }
  });
  $('#view-audio').addEventListener('focusin', (e) => {
    const card = e.target.closest?.('.audio-card');
    if (card) {
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      if (id) focusedMaterialId = id;
    }
  });
  document.addEventListener('keydown', (e) => {
    // Ctrl+Z belge düzeyinde: hangi görünümde olursa olsun işlem geri alınır.
    // Metin alanındayken tarayıcının kendi geri almasına bırakılır.
    const tag = (e.target?.tagName || '').toLowerCase();
    const typing = tag === 'textarea' || tag === 'input';
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z') && !typing) {
      e.preventDefault();
      undoLast();
      return;
    }
    onGlobalSegKey(e);
  });
  const undoBtn = $('#undoBtn');
  if (undoBtn) undoBtn.addEventListener('click', () => undoLast());
  $('#settingsBtn').addEventListener('click', () => setSettingsDrawer(true));
$('#closeSettings').addEventListener('click', () => setSettingsDrawer(false));
// RAPOR HAZIRLIĞI (v2.150): satıra tıklayınca ilgili yere gider. Filtre
// verilmişse (bekleyen/zaman) ses görünümü o filtreyle açılır.
const readyBox = $('#reportReadiness');
if (readyBox)
  readyBox.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-ready-goto]') : null;
    if (!b) return;
    const target = b.dataset.readyGoto;
    const filter = b.dataset.readyFilter || '';
    const action = b.dataset.readyAction || '';
    if (filter) {
      const m = activeMaterial();
      if (m) {
        m.uiFilter = filter;
        persist();
      }
    }
    switchView(target);
    if (target === 'audio') {
      renderAudioList()
        .then(() => {
          // Kapsama satırı doğrudan boşluk listesini açar (v2.156): kullanıcı
          // "nerede" sorusunu ikinci bir tıklama yapmadan görür.
          if (action === 'coverage') {
            const mm = activeMaterial();
            if (mm) {
              renderCoveragePanel(mm);
              const panel = document.getElementById(`coverage-panel-${mm.id}`);
              if (panel) panel.scrollIntoView({ block: 'nearest' });
            }
          }
        })
        .catch(() => {});
    }
  });
const behaviorHost = $('#behaviorHost');
if (behaviorHost)
  behaviorHost.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('#nextPendingToggle') : null;
    if (b) setNextPending(!nextPendingPref());
  });
$('#reportFullBtn').addEventListener('click', () => setReportFull(true));
$('#reportBackBtn').addEventListener('click', () => setReportFull(false));
$('#reportPrintBtn').addEventListener('click', () => window.print());
$('#reportUdfBtn2').addEventListener('click', () => makeUdf().catch((e) => showToast(e.message)));
$('#drawerBackdrop').addEventListener('click', () => {
  setSettingsDrawer(false);
  setCaseDrawer(false);
});
$('#closeCase').addEventListener('click', () => setCaseDrawer(false));
// Dosya bilgilerini açan düğmeler (özet ekranı).
['#openCaseDrawer', '#quickCaseBtn', '#overviewEditBtn', '#stepCaseBtn'].forEach((sel) => {
  const el = $(sel);
  if (el)
    el.addEventListener('click', () => {
      populateCaseForm();
      setCaseDrawer(true);
    });
});
$('#focusModeBtn').addEventListener('click', () => setFocusMode(!document.body.classList.contains('focus-mode')));
  $('#focusExitBtn').addEventListener('click', () => setFocusMode(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
    // Tam ekran rapordan çık.
    if (document.body.classList.contains('report-full')) {
      setReportFull(false);
      return;
    }
    // Önce açık çekmeceyi kapat, sonra odak modunu.
    const anyOpen = ['#settingsDrawer', '#caseDrawer'].some((sel) => {
      const el = $(sel);
      return el && el.classList.contains('open');
    });
    if (anyOpen) {
      setSettingsDrawer(false);
      setCaseDrawer(false);
      return;
    }
    if (document.body.classList.contains('focus-mode')) setFocusMode(false);
  });
  $('#helpBtn').addEventListener('click', () => $('#helpDialog').showModal());
  $('#closeHelp').addEventListener('click', () => $('#helpDialog').close());
  // Sürüm etiketine tıklayınca geçmiş: hangi sürümde ne değişti (kullanıcı dili).
  const verBtn = $('#appVersion');
  if (verBtn) {
    verBtn.addEventListener('click', () => {
      renderVersionHistory();
      const d = $('#versionDialog');
      if (d && !d.open) d.showModal();
    });
  }
  $('#closeVersion')?.addEventListener('click', () => $('#versionDialog')?.close());

  // --- Arşiv (v2.107) ---------------------------------------------------
  // Eksik dökümüne tıklayınca yalnız kontrol edilmemiş bölümler listelenir.
  $('#sbPending')?.addEventListener('click', () => {
    const m = activeMaterial();
    if (!m) return;
    m.uiFilter = 'pending';
    renderSegments(m, $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card'));
    renderStatusBar();
    switchView('audio');
    showToast('Yalnız kontrol edilmemiş bölümler gösteriliyor.');
  });
  $('#archiveBtn')?.addEventListener('click', () => {
    renderArchiveList();
    const d = $('#archiveDialog');
    if (d && !d.open) d.showModal();
  });
  $('#closeArchive')?.addEventListener('click', () => $('#archiveDialog')?.close());
  $('#archiveCaseBtn')?.addEventListener('click', () => archiveCurrentCase().catch((e) => showToast(e.message)));
  $('#archiveList')?.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.unarchive) await unarchiveById(b.dataset.unarchive);
    else if (b.dataset.purge) await purgeCaseById(b.dataset.purge);
  });
  $('#confirmCancel').addEventListener('click', () => $('#confirmDialog').close());
  $('#closeConfirm').addEventListener('click', () => $('#confirmDialog').close());
  $('#confirmOk').addEventListener('click', () => $('#confirmDialog').close());
}
// Sequential batch transcription. Running one file at a time keeps memory flat
// and lets the user stop between files; per-file state is derived from the
// material itself so a reload shows the same queue.
let queueRunning = false;
function queuePending() {
  return (currentCase()?.materials || []).filter(
    (m) =>
      materialStatus(m) !== 'review' &&
      materialStatus(m) !== 'empty' &&
      materialStatus(m) !== 'partial'
  );
}
function renderQueue() {
  const c = currentCase();
  if (!c) return;
  const mats = c.materials || [];
  const root = $('#queueList');
  if (!root) return;
  const done = mats.filter((m) => materialStatus(m) === 'review').length;
  const failed = mats.filter((m) => materialStatus(m) === 'error').length;
  $('#queueLabel').textContent = mats.length ? `${done}/${mats.length} tamamlandı` : 'Kuyruk boş';
  $('#retryFailedBtn').hidden = failed === 0;
  root.innerHTML = mats.length
    ? mats
        .map(
          (m, i) =>
            `<div class="queue-item"><span class="queue-index">${i + 1}</span><span class="queue-name">${esc(m.name)}</span><span class="queue-state ${materialStatus(m) === 'error' ? 'bad' : materialStatus(m) === 'review' ? 'good' : ''}">${esc(materialStatusLabel(m))}</span>${typeof m.progress === 'number' ? `<span class="queue-pct">%${m.progress}</span>` : ''}</div>`
        )
        .join('')
    : '<div class="empty-state" style="padding:14px"><span>Ses kaydı eklenince kuyruk burada görünür.</span></div>';
}
function queueUpdateProgress(doneCount, totalCount, elapsedMs) {
  const wrap = $('#queueProgressWrap');
  if (!wrap) return;
  wrap.hidden = false;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  $('#queueProgressBar').style.width = pct + '%';
  $('#queueProgressText').textContent = `${doneCount}/${totalCount} kayıt · %${pct}`;
  if (doneCount > 0 && doneCount < totalCount) {
    const eta = (elapsedMs / doneCount) * (totalCount - doneCount);
    $('#queueEtaText').textContent = `Tahmini kalan süre: ${fmtShort(eta / 1000)}`;
  } else {
    $('#queueEtaText').textContent = '';
  }
}
async function runQueue() {
  const c = currentCase();
  if (!c || queueRunning) return;
  const pending = queuePending();
  if (!pending.length) {
    showToast('Çözümlenecek kayıt yok.');
    return;
  }
  // TOPLU ÇÖZÜMLEME KORUMASI (v2.103). Kullanıcı "yanlışlıkla tümünü çözümle"
  // diyebiliyor; kuyrukta metni olan bir kayıt varsa üzerine yazılır. Kayıt
  // başına ayrı diyalog açmak yerine TEK soru sorulur ve kaç kayıtta kaç
  // bölümün silineceği yazılır. Geri alma kaydı her kayıt için yine alınır.
  const summary = queueReprocessSummary(pending);
  let confirmed = false;
  if (summary.ask) {
    const why = [
      summary.edited ? `${summary.edited} bölüm elle düzeltilmiş` : '',
      summary.approved ? `${summary.approved} bölüm onaylanmış` : '',
      summary.untouched ? `${summary.untouched} bölümde model metni var (henüz kontrol edilmedi)` : ''
    ]
      .filter(Boolean)
      .join(', ');
    const devam = await askConfirm(
      'Toplu çözümleme mevcut metinlerin üzerine yazar',
      `${pending.length} kayıt çözümlenecek. Bunlardan ${summary.withSegments} kayıtta toplam ` +
        `${summary.totalSegments} bölüm var: ${why}. ` +
        'Bu bölümlerin TAMAMI silinip modelin yeni çıktısıyla değiştirilecek. ' +
        'Düzeltmeler ve onaylar kaybolur. Eski hâller Ctrl+Z ile geri alınabilir. Devam edilsin mi?'
    );
    if (!devam) {
      showToast('Toplu çözümleme iptal edildi. Mevcut metinler korundu.');
      return;
    }
    confirmed = true;
  }
  queueRunning = true;
  c.queueCancel = false;
  $('#startQueueBtn').disabled = true;
  $('#cancelQueueBtn').disabled = false;
  const t0 = Date.now();
  let done = 0;
  for (const m of pending) {
    if (c.queueCancel) break;
    try {
      await transcribe(m.id, { confirmed });
    } catch (e) {}
    done++;
    queueUpdateProgress(done, pending.length, Date.now() - t0);
    renderQueue();
  }
  queueRunning = false;
  $('#startQueueBtn').disabled = false;
  $('#cancelQueueBtn').disabled = true;
  renderQueue();
  renderOverview();
  showToast(c.queueCancel ? 'Kuyruk durduruldu.' : 'Toplu çözümleme tamamlandı.');
}
// Model manager. transformers.js stores every downloaded file in the browser
// Cache Storage under a fixed name, so the same cache can be enumerated,
// measured and pruned here. File URLs contain the repo id, which is how an
// entry is attributed back to a model.
// Promise wrapper around the existing confirm dialog so callers can await a
// decision instead of juggling the dialog's own event handlers.
function askConfirm(title, text) {
  return new Promise((resolve) => {
    const dlg = $('#confirmDialog');
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      $('#confirmOk').removeEventListener('click', onOk);
      $('#confirmCancel').removeEventListener('click', onCancel);
      $('#closeConfirm').removeEventListener('click', onCancel);
      if (dlg.open) dlg.close();
      resolve(v);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    $('#confirmOk').addEventListener('click', onOk);
    $('#confirmCancel').addEventListener('click', onCancel);
    $('#closeConfirm').addEventListener('click', onCancel);
    dlg.addEventListener('close', () => finish(false), { once: true });
    dlg.showModal();
  });
}
// Dışa aktarma kapsamı sorar (v2.110). Kullanıcı TEK dosya mı TÜM dosyalar mı
// aktaracağını görür; sessizce "hepsi"ne dönüşmez.
function askExportScope({ currentName, total }) {
  return new Promise((resolve) => {
    const dlg = $('#exportScopeDialog');
    const curLabel = $('#scopeCurrentLabel');
    const curInput = $('#scopeCurrent');
    const allInput = $('#scopeAll');
    $('#scopeCurrentName').textContent = currentName || '';
    $('#scopeAllName').textContent = `${total} dosya + ses kayıtları`;
    // Aktif dosya boşsa "yalnız bu dosya" sunulamaz: seçilemez ve açıklanır.
    const canCurrent = !!currentName;
    curInput.disabled = !canCurrent;
    curLabel.classList.toggle('is-disabled', !canCurrent);
    curLabel.title = canCurrent ? '' : 'Aktif dosya boş: önce bilgi girin.';
    // Her açılışta GÜVENLİ varsayılan: tüm dosyalar. Önceki seçim hatırlanmaz;
    // aksi hâlde ikinci pakette yalnız bir dosya gidebilir (v2.110'daki
    // "hepsini indirdim sandım" karışıklığı geri gelir).
    allInput.checked = true;
    curInput.checked = false;
    if (!canCurrent) allInput.checked = true;
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      $('#exportScopeOk').removeEventListener('click', onOk);
      $('#exportScopeCancel').removeEventListener('click', onCancel);
      $('#closeExportScope').removeEventListener('click', onCancel);
      if (dlg.open) dlg.close();
      resolve(v);
    };
    const onOk = () => finish(curInput.checked && canCurrent ? 'current' : 'all');
    const onCancel = () => finish(null);
    $('#exportScopeOk').addEventListener('click', onOk);
    $('#exportScopeCancel').addEventListener('click', onCancel);
    $('#closeExportScope').addEventListener('click', onCancel);
    dlg.addEventListener('close', () => finish(null), { once: true });
    dlg.showModal();
  });
}

// Dosya numarasını ELLE yazdıran onay (v2.107). Kazara tıklama imkânsız olsun:
// kalıcı silme ses kaydını da siler ve Ctrl+Z sesi geri getirmez.
function askTypedConfirm({ title, text, phrase, okLabel }) {
  return new Promise((resolve) => {
    const dlg = $('#typeConfirmDialog');
    $('#typeConfirmTitle').textContent = title || 'Son onay';
    $('#typeConfirmText').innerHTML = text || '';
    const input = $('#typeConfirmInput');
    const ok = $('#typeConfirmOk');
    const err = $('#typeConfirmError');
    input.value = '';
    ok.disabled = true;
    ok.textContent = okLabel || 'Kalıcı sil';
    if (err) err.hidden = true;
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      input.removeEventListener('input', onInput);
      ok.removeEventListener('click', onOk);
      $('#typeConfirmCancel').removeEventListener('click', onCancel);
      $('#closeTypeConfirm').removeEventListener('click', onCancel);
      if (dlg.open) dlg.close();
      resolve(v);
    };
    const onInput = () => {
      const okNow = deleteConfirmMatches({ fileNo: phrase, id: phrase }, input.value);
      ok.disabled = !okNow;
      if (err) err.hidden = okNow || !input.value.trim();
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    input.addEventListener('input', onInput);
    ok.addEventListener('click', onOk);
    $('#typeConfirmCancel').addEventListener('click', onCancel);
    $('#closeTypeConfirm').addEventListener('click', onCancel);
    dlg.addEventListener('close', () => finish(false), { once: true });
    dlg.showModal();
    setTimeout(() => input.focus(), 30);
  });
}

// --- Arşiv (v2.107) -------------------------------------------------------
// ARŞİV VERİ SİLMEZ. Dosya seçiciden gizlenir; verisi ve sesi durur; yedeğe
// girmeye devam eder. Geri alınabilir. Kalıcı silme ayrı ve iki aşamalıdır.
function renderArchiveList() {
  const host = $('#archiveList');
  if (!host) return;
  const archived = (appState.cases || []).filter(isArchivedCase);
  if (!archived.length) {
    host.innerHTML =
      '<p class="drawer-note">Arşivde dosya yok. Bir dosyayı arşivlemek için Dosya bilgileri çekmecesindeki <b>Bu dosyayı arşivle</b> düğmesini kullanın.</p>';
    return;
  }
  host.innerHTML =
    '<p class="drawer-note">Arşivlenen dosyalar burada durur; <b>verileri ve ses kayıtları silinmez</b>. ' +
    'Pakete dâhil edilirler. İsterseniz geri alabilir veya iki onayla kalıcı silebilirsiniz.</p>' +
    archived
      .map(
        (c) => `<div class="archive-row">
        <div class="archive-main"><b>${esc(caseDisplayName(c))}</b>
          <small>${esc(c.court || '—')} · ${(c.materials || []).length} kayıt · ` +
          `arşiv: ${esc(c.archivedAt ? new Date(c.archivedAt).toLocaleString('tr-TR') : '—')}</small></div>
        <div class="archive-actions">
          <button class="mini-button" data-unarchive="${esc(c.id)}">↩ Geri al</button>
          <button class="mini-button danger" data-purge="${esc(c.id)}">Kalıcı sil</button>
        </div></div>`
      )
      .join('');
}
async function archiveCurrentCase() {
  const c = currentCase();
  if (!c) return;
  if (isArchivedCase(c)) return showToast('Bu dosya zaten arşivde.');
  // BOŞ DOSYA ARŞİVLENMEZ (v2.108): 0 kayıt + dosya no yok → arşivi kirletir.
  // Canlı veride her basışta yeni boş dosya arşivlendi ("iki tane aynı").
  if (!canArchiveCase(c)) {
    showToast(
      'Boş çalışma alanı arşivlenmez: dosya numarası, mahkeme, taraf veya ses kaydı yok. ' +
        'Arşivlenecek veri bulunmuyor.'
    );
    return;
  }
  const nm = caseDisplayName(c);
  if ((appState.cases || []).filter((x) => !isArchivedCase(x)).length <= 1) {
    const ok = await askConfirm(
      'Son görünür dosyayı arşivliyorsunuz',
      `"${nm}" arşivlenecek ve çalışma alanında görünür dosya kalmayacak. ` +
        'Yeni bir dosya açılır. Arşivdeki dosya SİLİNMEZ; Arşiv düğmesinden geri alabilirsiniz. Devam edilsin mi?'
    );
    if (!ok) return;
  }
  const idx = appState.cases.findIndex((x) => x.id === c.id);
  if (idx < 0) return;
  snapshotForUndo('dosya arşivlendi');
  appState.cases[idx] = archiveCase(appState.cases[idx]);
  // Görünür dosya kalmadıysa yeni bir çalışma alanı aç: seçici BOŞ KALMAZ
  // (boş seçici "verim gitti" izlenimi verir; oysa dosya arşivde duruyor).
  if (!visibleCases(appState.cases).length) {
    const fresh = freshCase();
    appState.cases.push(fresh);
    appState.activeCaseId = fresh.id;
  }
  persist();
  renderCaseSelect();
  populateCaseForm();
  renderOverview();
  await renderAudioList();
  showToast(
    `"${nm}" arşivlendi. Verisi ve sesleri SİLİNMEDİ. ` +
      'Geri almak için üst bardaki "Arşiv" düğmesini kullanın.'
  );
}
async function unarchiveById(id) {
  const idx = (appState.cases || []).findIndex((x) => x.id === id);
  if (idx < 0) return;
  snapshotForUndo('dosya arşivden çıkarıldı');
  appState.cases[idx] = unarchiveCase(appState.cases[idx]);
  appState.activeCaseId = appState.cases[idx].id;
  persist();
  renderCaseSelect();
  populateCaseForm();
  renderOverview();
  await renderAudioList();
  renderArchiveList();
  showToast(`"${caseDisplayName(appState.cases[idx])}" arşivden çıkarıldı.`);
}
// KALICI SİLME: iki aşamalı. (1) sesin de silineceğini söyleyen onay,
// (2) dosya numarasını elle yazma. Ses IndexedDB'den KALICI silinir; Ctrl+Z
// sesi geri getirmez (ölçüldü: snapshotForUndo yalnız appState.cases kopyalar).
async function purgeCaseById(id) {
  const c = (appState.cases || []).find((x) => x.id === id);
  if (!c) return;
  if (!canDeleteCase(c)) {
    showToast('Yalnız arşivlenmiş dosya kalıcı silinebilir. Önce arşivleyin.');
    return;
  }
  const phrase = deleteConfirmPhrase(c);
  const mats = (c.materials || []).length;
  const ok1 = await askConfirm(
    'KALICI SİLME — geri alınamaz',
    `"${phrase}" kalıcı olarak silinecek. ${mats} ses kaydı ve tüm deşifre/rapor verisi ` +
      'bu tarayıcıdan SİLİNİR. Ctrl+Z bu dosyayı geri getirmez; ses dosyaları da gider. ' +
      'Tek kurtarma yolu daha önce oluşturduğunuz .akis paketidir. Devam edilsin mi?'
  );
  if (!ok1) return showToast('Kalıcı silme iptal edildi. Dosya arşivde duruyor.');
  const ok2 = await askTypedConfirm({
    title: 'Son onay: kalıcı silme',
    text:
      `Son adım. Silinecek dosya: <b>${esc(phrase)}</b> · ${mats} kayıt.<br>` +
      '<b>Ses dosyaları da silinecek.</b> Bu işlem geri alınamaz.',
    phrase,
    okLabel: 'Kalıcı sil'
  });
  if (!ok2) return showToast('Kalıcı silme iptal edildi. Dosya arşivde duruyor.');
  snapshotForUndo('dosya kalıcı silindi');
  // Ses bloblarını KALICI sil (deleteBlob geri dönüşü yoktur).
  for (const m of c.materials || []) {
    try {
      await deleteBlob(blobKey(c, m));
    } catch (e) {}
  }
  appState.cases = (appState.cases || []).filter((x) => x.id !== id);
  if (appState.activeCaseId === id) appState.activeCaseId = (visibleCases(appState.cases)[0] || appState.cases[0] || {}).id || null;
  persist();
  renderCaseSelect();
  populateCaseForm();
  renderOverview();
  await renderAudioList();
  renderArchiveList();
  showToast(
    `"${phrase}" KALICI SİLİNDİ (${mats} kayıt). Ses dosyaları da silindi. ` +
      'Ctrl+Z yalnız kaydı geri getirir; SES GERİ GELMEZ — paketten yükleyin.'
  );
}
const MODEL_CACHE = 'transformers-cache';
function modelIdFromUrl(u) {
  const m = String(u).match(/huggingface\.co\/([^/]+\/[^/]+)\//);
  return m ? m[1] : null;
}
function fmtBytes(n) {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}
async function scanModelCache() {
  const out = { supported: typeof caches !== 'undefined', models: {}, total: 0, entries: 0 };
  if (!out.supported) return out;
  let cache;
  try {
    cache = await caches.open(MODEL_CACHE);
  } catch (e) {
    out.supported = false;
    return out;
  }
  const keys = await cache.keys();
  for (const req of keys) {
    const url = req.url;
    const id = modelIdFromUrl(url) || 'Diğer dosyalar';
    let size = 0;
    try {
      const res = await cache.match(req);
      if (res) {
        const buf = await res.clone().arrayBuffer();
        size = buf.byteLength;
      }
    } catch (e) {}
    if (!out.models[id]) out.models[id] = { files: 0, bytes: 0 };
    out.models[id].files++;
    out.models[id].bytes += size;
    out.total += size;
    out.entries++;
  }
  return out;
}
function renderStorage(scan) {
  const summary = $('#storageSummary');
  const list = $('#storageList');
  if (!summary || !list) return;
  if (!scan.supported) {
    summary.textContent = 'Bu tarayıcı model önbelleğini listeleme (Cache Storage) izni vermiyor.';
    list.innerHTML = '';
    return;
  }
  const ids = Object.keys(scan.models).sort((a, b) => scan.models[b].bytes - scan.models[a].bytes);
  summary.innerHTML = `<b>${scan.entries}</b> dosya · toplam <b>${fmtBytes(scan.total)}</b> · ${ids.length} model/klasör`;
  if (!ids.length) {
    list.innerHTML =
      '<div class="empty-state" style="padding:14px"><span>Önbellekte indirilmiş model yok.</span></div>';
    return;
  }
  list.innerHTML = ids
    .map((id) => {
      const info = scan.models[id];
      const known = !!ASR_MODELS[id];
      return `<div class="storage-item"><div class="storage-main"><b>${esc(known ? ASR_MODELS[id].label.split('–')[0].trim() : id)}</b><small>${esc(id)} · ${info.files} dosya · ${fmtBytes(info.bytes)}</small></div><div class="storage-item-actions">${known ? `<button class="mini-button" data-use-model="${esc(id)}">Bu modeli seç</button>` : ''}<button class="mini-button" data-verify-model="${esc(id)}">Doğrula</button><button class="mini-button danger" data-delete-model="${esc(id)}">Sil</button></div></div>`;
    })
    .join('');
}
// ---- Depolama kullanımı (v2.73) -----------------------------------------
// Kullanıcı "ne kadar yer kaldı" sorusunu ekranda görmeli. Veri artık
// IndexedDB'de (GB mertebesi kota); yine de kullanım izlenir.
let usageInfo = { usage: 0, quota: 0, modelBytes: 0 };
async function refreshUsage() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return;
    const e = await navigator.storage.estimate();
    usageInfo = { usage: e.usage || 0, quota: e.quota || 0, modelBytes: usageInfo.modelBytes || 0 };
    renderUsage();
  } catch (e) {}
}
function fmtBytesShort(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
// Depolama göstergesi İKİ havuzu AYIRIR (v2.83).
// Neden: `navigator.storage.estimate()` tarayıcının TÜM kullanımını verir;
// model önbelleği (1,5 GB'a kadar) bu sayının içindedir. Tek sayı göstermek
// "dava verim doldu" yanılgısı yaratıyordu: model indirince %15 dolu görünüp
// veri kaybı korkusu doğuruyordu. Artık model ayrı, dava verisi ayrı yazılır.
// Kota yine tarayıcıdan gelir (uydurma yok); yalnız sunum dürüstleşir.
function renderUsage() {
  const el = $('#usageState');
  if (!el) return;
  const { usage, quota, modelBytes } = usageInfo;
  const dataBytes = Math.max(0, usage - (modelBytes || 0));
  // Kota okunamazsa (gizli mod, kısıtlı tarayıcı) gösterge BOŞ BIRAKILMAZ:
  // bilinen büyüklükler yazılır, kota "bilinmiyor" olur. Sessiz boşluk,
  // "veri yok" izlenimi verirdi.
  if (!quota) {
    if (!usage && !modelBytes) {
      el.textContent = '';
      el.className = 'usage-state';
      el.title = 'Tarayıcı depolama kotası okunamadı. Veriler yine kaydedilir.';
      return;
    }
    // KISA görünen metin (v2.105): uzun etiket üst barda başlığı eziyordu.
    // Tam ayrıntı `title` ipucunda; görünen metin tek satırda kalmalı.
    el.textContent = `Dava: ${fmtBytesShort(dataBytes)} · Model: ${fmtBytesShort(modelBytes)} · kota bilinmiyor`;
    el.className = 'usage-state';
    el.title =
      'Tarayıcı bu ortamda kota bilgisi vermiyor (gizli mod olabilir).\n' +
      `Dava verisi: ${fmtBytesShort(dataBytes)}\nİndirilen modeller: ${fmtBytesShort(modelBytes)}\n` +
      'Veriler yine kaydedilir; paket oluşturmayı ihmal etmeyin.';
    return;
  }
  const pct = Math.min(100, Math.round((usage / quota) * 100));
  // KISA görünen metin (v2.105): "Dava verisi: … · Model: … · Kota: … (%n)"
  // 302px yer kaplıyordu ve üst barda başlığı sıkıştırıyordu. Yüzde, dolu olma
  // oranını tek başına anlatır; tam sayılar title ipucunda.
  el.textContent = `Dava: ${fmtBytesShort(dataBytes)} · Model: ${fmtBytesShort(modelBytes)} · %${pct} dolu`;
  el.className = 'usage-state' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
  el.title =
    `Dava verisi (ses + deşifre + rapor): ${fmtBytesShort(dataBytes)}\n` +
    `İndirilen modeller (önbellek): ${fmtBytesShort(modelBytes)}\n` +
    `Toplam kullanılan: ${fmtBytesShort(usage)}\n` +
    `Tarayıcı kotası: ${fmtBytesShort(quota)}\n` +
    `Kalan: ${fmtBytesShort(quota - usage)}\n\n` +
    'Model önbelleği dava verisinden ayrıdır; "Tüm model önbelleğini temizle" ile silinip yeniden indirilebilir. ' +
    'Dava verisi silinirse geri gelmez; düzenli paket oluşturun.';
}
async function refreshStorage() {
  try {
    const scan = await scanModelCache();
    renderStorage(scan);
    // Model önbelleği boyutu depolama göstergesine aktarılır; böylece üst bar
    // "dava verisi" ile "model" ayrımını gösterebilir (v2.83).
    usageInfo.modelBytes = scan.total || 0;
    renderUsage();
  } catch (e) {
    $('#storageSummary').textContent = 'Önbellek okunamadı: ' + e.message;
  }
}
// Integrity check. The library publishes no checksums, so the honest check is
// structural: the files a Whisper ASR pipeline actually needs must all be
// present and non-empty. A partial download (interrupted transfer) fails this.
const REQUIRED_MODEL_FILES = [
  /config\.json$/,
  /preprocessor_config\.json$/,
  /tokenizer\.json$/,
  /tokenizer_config\.json$/,
  /encoder_model.*\.onnx$/,
  /decoder_model_merged.*\.onnx$/
];
// Bütünlük kontrolü saf fonksiyon: verilen URL listesi ve boş dosya sayısına
// göre eksik dosyaları ve genel sonucu döndürür. Tarayıcı önbelleğinden
// bağımsızdır; böylece otomatik test edilebilir.
function evaluateModelIntegrity(presentUrls, emptyCount) {
  const missing = REQUIRED_MODEL_FILES.filter((rx) => !presentUrls.some((u) => rx.test(u)));
  const ok = !missing.length && emptyCount === 0;
  const detail = ok
    ? `${presentUrls.length} dosya eksiksiz ve boş olmayan boyutta.`
    : `Eksik dosya: ${missing.length}, boş dosya: ${emptyCount}. İndirme tamamlanmamış olabilir; modeli yeniden yükleyin.`;
  return { ok, missing: missing.length, empty: emptyCount, detail };
}
async function verifyModelCache(id) {
  try {
    const cache = await caches.open(MODEL_CACHE);
    const keys = await cache.keys();
    const mine = [];
    for (const req of keys) {
      if ((modelIdFromUrl(req.url) || 'Diğer dosyalar') === id) mine.push(req);
    }
    if (!mine.length) {
      showToast('Bu model için önbellekte dosya yok.');
      return;
    }
    const present = [];
    let empty = 0;
    for (const req of mine) {
      let size = 0;
      try {
        const res = await cache.match(req);
        if (res) size = (await res.clone().arrayBuffer()).byteLength;
      } catch (e) {}
      if (size === 0) empty++;
      present.push(req.url);
    }
    const { ok, detail } = evaluateModelIntegrity(present, empty);
    const st = $('#modelStatus');
    if (st) st.textContent = `${id} bütünlük kontrolü: ${ok ? 'geçti' : 'başarısız'} — ${detail}`;
    showToast(
      ok ? `${id} bütünlük kontrolü geçti.` : `${id} bütünlük kontrolü başarısız. Ayrıntı model durumunda.`
    );
  } catch (e) {
    showToast('Doğrulama başarısız: ' + e.message);
  }
}
async function deleteModelCache(id) {
  if (
    !(await askConfirm(
      'Model önbelleğini sil',
      `"${id}" için indirilmiş dosyalar silinsin mi? Gerekirse yeniden indirilir.`
    ))
  )
    return;
  try {
    const cache = await caches.open(MODEL_CACHE);
    const keys = await cache.keys();
    let n = 0;
    for (const req of keys) {
      const mid = modelIdFromUrl(req.url) || 'Diğer dosyalar';
      if (mid === id) {
        await cache.delete(req);
        n++;
      }
    }
    if (asrPipeline && asrPipeline.__modelId === id) {
      try {
        await asrPipeline.dispose();
      } catch (e) {}
      asrPipeline = null;
      const st = $('#modelStatus');
      if (st) st.textContent = 'Seçili modelin önbelleği silindi. Yeniden kullanmak için modeli yükleyin.';
    }
    showToast(`${n} dosya silindi.`);
    refreshStorage();
  } catch (e) {
    showToast('Silme başarısız: ' + e.message);
  }
}
async function clearModelCache() {
  if (
    !(await askConfirm(
      'Tüm model önbelleğini temizle',
      'İndirilmiş tüm konuşma modelleri silinecek. Gerekirse yeniden indirilir. Devam edilsin mi?'
    ))
  )
    return;
  try {
    await caches.delete(MODEL_CACHE);
    if (asrPipeline) {
      try {
        await asrPipeline.dispose();
      } catch (e) {}
      asrPipeline = null;
      const st = $('#modelStatus');
      if (st) st.textContent = 'Model önbelleği temizlendi. Yeniden kullanmak için modeli yükleyin.';
    }
    showToast('Model önbelleği temizlendi.');
    refreshStorage();
  } catch (e) {
    showToast('Temizleme başarısız: ' + e.message);
  }
}
// Recommendation from observed hardware: WebGPU can carry the heavy models,
// WASM (CPU) is realistic only for the smaller ones.
// Öneri, ölçülen donanıma göre verilir. Cihaz parametre olarak alınabilir;
// böylece fonksiyon saf ve test edilebilirdir (varsayılan: algılanan cihaz).
function recommendModel(device = asrDevice) {
  if (device === 'webgpu')
    return {
      id: 'onnx-community/whisper-medium-ONNX',
      why: 'WebGPU kullanılabilir; ölçülen en yüksek doğruluğu veren orta model önerilir (WER ~0,38).'
    };
  return {
    id: 'onnx-community/whisper-small',
    why: 'WebGPU yok; CPU üzerinde hız/doğruluk dengesi için küçük model önerilir (WER ~0,65). Doğruluk öncelikliyse orta modeli seçin (WER ~0,38), ancak CPU üzerinde belirgin şekilde yavaştır.'
  };
}
const MODEL_PREF_KEY = 'akis.model';
function savedModelPref() {
  try {
    const v = localStorage.getItem(MODEL_PREF_KEY);
    return v && $('#modelSelect')?.querySelector(`option[value="${CSS.escape(v)}"]`) ? v : null;
  } catch (e) {
    return null;
  }
}
function saveModelPref(id) {
  try {
    localStorage.setItem(MODEL_PREF_KEY, id);
  } catch (e) {}
}
function applyRecommendation() {
  const rec = recommendModel();
  const sel = $('#modelSelect');
  // Kullanıcı bir model seçmişse öneri onu EZMEZ. Önceki sürümlerde her
  // açılışta öneri uygulanıyordu; kullanıcı Large-v3-turbo seçse bile
  // ertesi açılışta "Küçük"e dönüyordu. Seçim artık hatırlanır.
  const saved = savedModelPref();
  if (sel && saved) sel.value = saved;
  else if (sel) sel.value = rec.id;
  const el = $('#modelRecommendation');
  if (el) {
    el.textContent = saved
      ? 'Seçtiğiniz model korunuyor: ' + modelShortName(saved) + '. ' + rec.why
      : 'Öneri: ' + rec.why;
  }
  updateModelBadge();
}
// Yüklü model rozetini ve seçim-yükleme uyumunu gösterir. Kullanıcı dropdown'da
// başka bir model seçip yüklemeden çözümlerse, hangi modelin gerçekten
// kullanılacağı belirsiz kalırdı; bu rozet bunu netleştirir.
function updateModelBadge() {
  renderStatusBar();
  const badge = $('#loadedModelBadge');
  if (!badge) return;
  const selected = $('#modelSelect') ? $('#modelSelect').value : null;
  if (!loadedModelId) {
    badge.textContent = 'Yüklü model: yok — çözümleme için model yükleyin';
    badge.classList.add('none');
    badge.classList.remove('ok', 'mismatch');
    return;
  }
  const loaded = modelShortName(loadedModelId);
  if (selected && selected !== loadedModelId) {
    badge.innerHTML = `Yüklü model: <b>${esc(loaded)}</b> · Seçili: <b>${esc(modelShortName(selected))}</b> — seçili modeli kullanmak için "Modeli yükle"ye basın.`;
    badge.classList.add('mismatch');
    badge.classList.remove('ok', 'none');
  } else {
    badge.innerHTML = `Yüklü model: <b>${esc(loaded)}</b> — çözümleme bu modelle yapılır.`;
    badge.classList.add('ok');
    badge.classList.remove('none', 'mismatch');
  }
}
async function restoreAudioUrls() {
  const cList = appState.cases;
  let changed = false;
  for (const c of cList) {
    for (const m of c.materials || []) {
      const url = await attachObjectUrl(c, m);
      if (!m.tech || !m.log) {
        const blob = await getAudioBlob(c, m);
        if (blob) {
          if (!m.tech) m.tech = await audioTech(blob);
          if (!m.log)
            m.log = [
              {
                at: m.addedAt || new Date().toISOString(),
                event: 'Kayıt eklendi',
                detail: `${m.name} · ${m.size} bayt · SHA-256 hesaplandı`
              }
            ];
          changed = true;
        }
      }
    }
  }
  if (changed) persist();
}
// ---- Görünüm: tema, yoğunluk, yazı boyutu -------------------------------
// Bilirkişi bu ekranda saatlerce çalışıyor; göz yorgunluğu bir konfor değil,
// doğruluk sorunudur. Tercih <html> özniteliğine yazılır (CSS tarafı
// assets/tokens.css), localStorage'da saklanır ve sayfa yenilenince korunur.
// İlk boyama öncesi uygulanması için index.html'deki küçük satır içi betik
// aynı anahtarları okur (FOUC önlemi).
const THEME_KEY = 'akis.theme';
const DENSITY_KEY = 'akis.density';
const FONTSCALE_KEY = 'akis.fontscale';
const THEMES = [
  ['light', 'Açık', 'Gündüz çalışması için dengeli aydınlık zemin.'],
  ['dark', 'Koyu', 'Loş odada ve gece çalışmasında göz yormaz.'],
  ['sepia', 'Sepya', 'Kâğıt hissi; uzun okumada mavi ışığı azaltır.']
];
const DENSITIES = [
  ['comfortable', 'Rahat', 'Daha çok nefes payı, daha büyük hedefler.'],
  ['compact', 'Sıkı', 'Ekranda daha çok satır; uzun kayıtlarda hızlı gezinme.']
];
const FONTSCALES = [
  ['normal', 'Normal', 'Varsayılan punto.'],
  ['large', 'Büyük', 'Bir kademe büyük metin.'],
  ['xlarge', 'Çok büyük', 'İki kademe büyük metin.']
];
function readPref(key, allowed, fallback) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch (e) {
    return fallback;
  }
}
function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}
function themePref() {
  return readPref(THEME_KEY, THEMES.map((t) => t[0]), 'light');
}
function densityPref() {
  return readPref(DENSITY_KEY, DENSITIES.map((d) => d[0]), 'comfortable');
}
function fontscalePref() {
  return readPref(FONTSCALE_KEY, FONTSCALES.map((f) => f[0]), 'normal');
}
// Temayı uygular. `announce` yalnız kullanıcı tıkladığında true olur; açılışta
// sessiz kalır ki her yenilemede bildirim çıkmasın.
function applyTheme({ announce = false } = {}) {
  const root = document.documentElement;
  const theme = themePref();
  root.dataset.theme = theme;
  root.dataset.density = densityPref();
  root.dataset.fontscale = fontscalePref();
  // Tarayıcı çubuğu rengi temaya uysun.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#12171e' : theme === 'sepia' ? '#efe7d8' : '#14283f');
  renderAppearancePanel();
  renderBehaviorPanel();
  if (announce) {
    const label = (THEMES.find((t) => t[0] === theme) || THEMES[0])[1];
    showToast(`Görünüm: ${label} tema.`);
  }
}
function setTheme(theme) {
  if (!THEMES.some((t) => t[0] === theme)) return;
  writePref(THEME_KEY, theme);
  applyTheme({ announce: true });
}
function setDensity(density) {
  if (!DENSITIES.some((d) => d[0] === density)) return;
  writePref(DENSITY_KEY, density);
  applyTheme({ announce: true });
}
function setFontscale(scale) {
  if (!FONTSCALES.some((f) => f[0] === scale)) return;
  writePref(FONTSCALE_KEY, scale);
  applyTheme({ announce: true });
}
// Ayarlar çekmecesindeki "Görünüm" bölümü. Seçenekler düğme olarak çizilir;
// seçili olan aria-pressed ile işaretlenir (ekran okuyucu da görür).
function appearancePanelHtml() {
  const theme = themePref(),
    density = densityPref(),
    scale = fontscalePref();
  const opt = (kind, value, label, hint, active) =>
    `<button class="appearance-opt ${active ? 'on' : ''}" data-${kind}="${esc(value)}"
       role="radio" aria-checked="${active}" title="${esc(hint)}">
       <b>${esc(label)}</b><small>${esc(hint)}</small></button>`;
  return `<div class="panel appearance-panel">
    <div class="panel-heading"><div><div class="eyebrow">GÖRÜNÜM</div>
      <h3>Okuma konforu<span class="info-i" tabindex="0" data-tip="Bu ekranda saatlerce çalışacaksınız. Tema, yoğunluk ve yazı boyutu yalnız sizin tarayıcınızda saklanır; rapora ve belgelere yansımaz.">i</span></h3></div>
      <span class="subtle-pill">${esc((THEMES.find((t) => t[0] === theme) || THEMES[0])[1])}</span></div>
    <div class="appearance-group" role="radiogroup" aria-label="Tema">
      <div class="appearance-lbl">Tema</div>
      <div class="appearance-opts">${THEMES.map(([v, l, h]) => opt('theme', v, l, h, theme === v)).join('')}</div>
    </div>
    <div class="appearance-group" role="radiogroup" aria-label="Yoğunluk">
      <div class="appearance-lbl">Yoğunluk</div>
      <div class="appearance-opts">${DENSITIES.map(([v, l, h]) => opt('density', v, l, h, density === v)).join('')}</div>
    </div>
    <div class="appearance-group" role="radiogroup" aria-label="Yazı boyutu">
      <div class="appearance-lbl">Yazı boyutu</div>
      <div class="appearance-opts">${FONTSCALES.map(([v, l, h]) => opt('fontscale', v, l, h, scale === v)).join('')}</div>
    </div>
    <p class="appearance-note">Seçimler yalnız bu tarayıcıda saklanır. Rapor çıktısı (UDF/DOCX) her zaman kurumsal biçimde üretilir; tema yalnız ekranı etkiler.</p>
  </div>`;
}
function renderAppearancePanel() {
  const host = $('#appearanceHost');
  if (host) host.innerHTML = appearancePanelHtml();
}

// ---- Sürüm notu (v2.87) --------------------------------------------------
// Kullanıcıya görünen davranış değişiklikleri burada toplanır. Bilirkişi
// teknik ayrıntıyı okumaz; ne kaybettiğini/ne kazandığını uygulamayı açtığında
// görmelidir. Kural: bir not her sürümde BİR KEZ gösterilir
// (`akis.seenNotice.<sürüm>`), her açılışta tekrarlamaz; ayrıca yardım
// ekranındaki "Son değişiklikler" bölümünde kalıcı olarak durur.
// SÜRÜM GEÇMİŞİ (v2.104). Kullanıcı sürüm etiketine tıklayınca ne değiştiğini
// görmek ister. TEK KAYNAK: VERSION_NOTICES (yeni sürümde oraya not eklenir;
// geçmiş kendiliğinden güncellenir, ikinci bir liste tutulmaz).
function versionHistoryEntries() {
  return Object.keys(VERSION_NOTICES)
    .map((k) => ({ version: k, ...VERSION_NOTICES[k] }))
    .sort((a, b) => {
      const pa = String(a.version).split('.').map(Number);
      const pb = String(b.version).split('.').map(Number);
      return pb[0] - pa[0] || pb[1] - pa[1];
    });
}
function renderVersionHistory() {
  const host = $('#versionHistoryList');
  if (!host) return;
  const rows = versionHistoryEntries();
  host.innerHTML =
    `<p class="drawer-note">Uygulamanın sürüm numarası: <b>v${esc(APP_VERSION)}</b>. ` +
    'Aşağıda her sürümde <b>kullanıcı olarak ne değiştiği</b> yazar (teknik ayrıntı için CHANGELOG).</p>' +
    rows
      .map(
        (r) =>
          `<div class="ver-row"><h3>v${esc(r.version)} — ${esc(r.title || '')}</h3>` +
          `<p>${esc(r.body || '')}</p></div>`
      )
      .join('');
}
const VERSION_NOTICES = {
  '2.156': {
    title: 'Rapor hazırlığı artık sesin bölümlenmemiş aralığını da sayar',
    body:
      'Daha önce "Kapsam" düğmesi 16 boşluk gösterirken "Rapor hazırlığı" kartı ' +
      '"1 konu eksik" diyebiliyordu. Artık aynı gerçeği söylüyorlar: kartta ' +
      '"Bölümlenmemiş ses aralığı" satırı çıkar; tıklayınca ses görünümü açılır ' +
      've boşluk listesi kendiliğinden gelir. Dürüst sınır korunur: boşluk ' +
      '"konuşma yok" demek değildir; süre bilinmiyorsa boşluk üretilmez.'
  },
  '2.155': {
    title: 'Paket diyaloğu onarıldı, terimler tek dile indi',
    body:
      'Paket oluşturma diyaloğunda bir cümle iki kez görünüyor ve "lt;dosya no" ' +
      'gibi bozuk metin çıkıyordu; düzeltildi. Diyaloğun düğmesi artık "Paketi ' +
      'oluştur" (önce "Yedeği oluştur"); arşiv notu "Pakete dâhil edilirler" der. ' +
      'Sözlük tek: Dosya (tek dava) · Paket (.akis).'
  },
  '2.154': {
    title: 'Bölüm paneli iki bölgeye ayrıldı: yazarken daha çok yer',
    body:
      'Panel artık TEK panel, İKİ bölge: sabit başlıkta gezinme, dinleme, ONAYLA ' +
      've "Teknik" anahtarı; metin alanı kalan tüm yüksekliği alır. Dalga, ' +
      'zamanlar, konuşmacı ve gözlem "Teknik" ile açılır. Ölçüm: kapalıyken ' +
      'metin alanı 446 px (önce 160), panelde kaydırma 0; açıkken bile 34 ' +
      'kontrolün TAMAMI görünür ve kaydırma 0. Teknik tercih hatırlanır.'
  },
  '2.153': {
    title: 'Bölüm detayı sıkıştırıldı: daha az kaydırma',
    body:
      'Detay panelinde başlangıç/bitiş etiketleri kutuların yanına, konuşmacı · ' +
      'kontrol · profil tek satıra alındı; "geçmiş, sessizlik ölç, böl, sil" gibi ' +
      'ikincil araçlar "Diğer işlemler" başlığı altında katlandı. Panel içeriği ' +
      '795 → 680 px indi; gözlem düğmelerine kalan kaydırma 125 → 46 px. Metin ' +
      'alanı ve analiz kutusu KÜÇÜLTÜLMEDİ.'
  },
  '2.152': {
    title: 'Listede bitiş zamanı da görünüyor',
    body:
      'Bölüm listesindeki zaman hücresi artık iki satır: başlangıç ve "→ bitiş". ' +
      'Hangi saatin ne olduğu tahmin edilmez. Satır biraz uzar (+13 px); bilgi ' +
      'eksikliği yerleşimden daha pahalı olduğu için kabul edildi. Zaman sütunu ' +
      'milisaniye için genişletildi; hiçbir saat KESİLMEZ.'
  },
  '2.151': {
    title: 'Onaydan sonra sonraki bekleyene geçme seçeneği',
    body:
      'Ayarlar → "Onay davranışı" bölümünde isteğe bağlı bir anahtar var. ' +
      'Açıkken bir bölümü onayladığınızda uygulama sıradaki KONTROL EDİLMEMİŞ ' +
      'bölüme geçer; bekleyen yoksa bulunduğunuz yerde kalır. Varsayılan KAPALI; ' +
      'tercih yalnız bu tarayıcıda saklanır, kayda ve rapora yazılmaz.'
  },
  '2.150': {
    title: 'Rapor hazırlığı: eksikler tek listede',
    body:
      'Rapor görünümünde "Rapor hazırlığı" kartı var. Kontrol edilmemiş bölüm, ' +
      'seçilmemiş belirsiz okuma, konuşmacı atanmamış bölüm, zaman sorunu, ' +
      'SHA-256 yok, teslim/köken bilgisi yok, boş künye ve soru yokluğu tek ' +
      'listede SAYIYLA görünür; satıra tıklayınca ilgili yere gider. Uydurma bir ' +
      '"hazırlık yüzdesi" yoktur; bu bir denetim listesidir, onay değildir.'
  },
  '2.149': {
    title: 'Kapsama denetimi: sesin bölümlenmemiş aralığı görünür',
    body:
      'Araç çubuğunda artık "Kapsam %98 · 2 boşluk" gibi bir düğme var. Sesin ne ' +
      'kadarının bölümlere ayrıldığını söyler; tıklayınca boşlukları zaman ' +
      'aralığıyla listeler ve "Git" ile oynatıcıyı o ana getirir. Çakışan bölüm ' +
      'iki kez sayılmaz. Dürüst sınır: boşluk "konuşma yok" demek DEĞİLDİR; yalnız ' +
      'hiçbir bölüme girmemiş aralıktır. Uygulama hiçbir zamanı kendiliğinden ' +
      'düzeltmez.'
  },
  '2.148': {
    title: 'Oynatma başlarken sayfa artık zıplamıyor',
    body:
      'Canlı vurgu açıkken takip şeridi ancak OYNATMA başlayınca ekleniyordu ve ' +
      'metni aşağı itiyordu; ayrıca bölüm başlığı oynatma anında "Bölüm 1"den ' +
      '"Bölüm 1 / 100"ye dönüşüyordu. Artık şerit canlı vurgu açıkken YER TUTUCU ' +
      'olarak önceden kurulur (oynatma yalnız metni değiştirir) ve başlık her zaman ' +
      '"Bölüm X / N" yazar. Ölçüm: metin alanı oynatma öncesi/sonrası aynı yerde.'
  },
  '2.147': {
    title: 'Takip şeridi artık önceki bölüme dönmüyor',
    body:
      'Otomatik geçiş açıkken bölüm oynatıcısı, çalmaya başladığı ESKİ indeksi ' +
      'kullanıyordu; şerit bir an önceki bölümün metnine dönüp sonra düzeliyordu ' +
      '("bir öncekiyle karışıyor"). Artık şerit her zaman AKTİF bölümü gösterir. ' +
      'Gerçek örnek sesle ölçüldü: 1,3 sn\'de 5 geri dönüş → 0.'
  },
  '2.146': {
    title: 'Zaman sorunu düzenlerken anında görünüyor',
    body:
      'Bir bölümün bitişini uzatıp çakışma yarattığınızda ⚠ rozeti ve "Zaman ' +
      'sorunları" filtresi ancak sayfa yenilenince görünüyordu. Artık düzenleme ' +
      'biter bitmez İKİ satırda da ⚠ çıkar ve filtre görünür. Sorun kalmayınca ' +
      'filtre kendiliğinden kalkar.'
  },
  '2.145': {
    title: 'Takip vurgusu çakışan bölümlerde geri atlamıyor',
    body:
      'Otomatik geçiş + canlı vurgu açıkken, zaman aralıkları çakışan bölümlerde ' +
      'vurgu bir önceki bölüme dönebiliyordu (oynatma sonraki bölüme geçince zaman ' +
      'geriye atlıyordu). Artık oynatma konumu hâlâ AKTİF bölümün aralığındaysa ' +
      'vurgu o bölümde kalır. Çakışma varsa "Zaman sorunları" filtresinde görünür.'
  },
  '2.144': {
    title: 'Bölüm zamanlarındaki çakışmalar artık görünüyor',
    body:
      'Bölüm aralıkları çakışırsa, aynı aralık iki kez girilmişse veya süre sıfırsa ' +
      'liste satırında ⚠ çıkar. Araç çubuğunda "Zaman sorunları N" filtresi yalnız bu ' +
      'bölümleri gösterir. Uygulama zamanı KENDİLİĞİNDEN DÜZELTMEZ; hangi bölümün ' +
      'sorunlu olduğunu söyler, kararı size bırakır.'
  },
  '2.143': {
    title: 'Bölüm detayının alt kısmı artık görünüyor',
    body:
      'Sağdaki bölüm detayında başlangıç/bitiş, konuşmacı, kontrol ve gözlem ' +
      'düğmeleri panelin altında KIRPILIYORDU ("sd-meta\'nın yarısı görünmüyor"); ' +
      'panel kaydırılamıyordu. Artık panel kendi içinde kayıyor ve tüm alanlar ' +
      'erişilebiliyor. Hiçbir bilgi kesilmiyor.'
  },
  '2.142': {
    title: 'Çalışma modu kaldırıldı; kayıtlar dikey listede',
    body:
      'Kayıtlar artık solda tek sütun hâlinde ALT ALTA listelenir ve sütun kendi ' +
      'içinde kayar; 100 kayıtta da sayfa uzamaz. "← Kayıt listesine dön" ve ' +
      '"⛶ Çalışma modu" tamamen kaldırıldı. Kayıt sütununun başlığı ve ' +
      '"N kayıt" sayısı artık görünür.'
  },
  '2.141': {
    title: 'Masaüstünde "Kayıt listesine dön" kaldırıldı',
    body:
      'Kayıtlar artık sürekli solda olduğu için çalışma modu ve "← Kayıt ' +
      'listesine dön" düğmesi gereksizdi. Masaüstünde kaldırıldı: dosyalar solda ' +
      'alt alta listelenir, düzenleme paneli sağda durur. Dar ekranda (900 piksel ' +
      've altı) çalışma modu eskisi gibi çalışır.'
  },
  '2.140': {
    title: 'Masaüstü düzeni: sayfa kaymıyor, paneller kendi kaydırıyor',
    body:
      '362 bölümlü kayıtta her şey tek uzun sayfada akıyordu (14 bin piksel); ' +
      'aşağı indikçe düzenleme paneli kayboluyordu. Artık üst bar ve durum çubuğu ' +
      'SABİT: kayıtlar solda, bölüm listesi ve düzenleme paneli kendi içinde kayıyor. ' +
      'Panel her zaman görünür. 900 pikselden dar ekranlarda eski düzen korunur.'
  },
  '2.139': {
    title: 'Uzun listede düzenleme paneli hep görünür',
    body:
      '362 bölümlü bir kayıtta aşağı kaydırıp bir bölüme tıkladığınızda detay ' +
      'paneli ekranın binlerce piksel üstünde kalıyordu; tıklama \"hiçbir şey ' +
      'olmadı\" gibi hissediliyordu. Artık panel YAPIŞKAN: sağda hep görünür ve ' +
      'üstteki çalışma çubuğunun altında durur. Panel ekrandan uzunsa yalnız o ' +
      'zaman kendi içinde kayar.'
  },
  '2.138': {
    title: 'Görünür değişiklik yok (iç düzen ölçümü)',
    body:
      'Bu sürümde ekranda göreceğiniz bir değişiklik yok. Stil katmanının ' +
      'birikmiş borcu ölçüldü ve belgelendi; bundan sonra borcu ARTIRAN bir ' +
      'değişiklik testi kıracak. Amaç: ileride yapılacak düzeltmelerin başka ' +
      'bir paneli bozmasını önlemek.'
  },
  '2.137': {
    title: 'Rapor kâğıdı dar ekranda kırpılmıyor',
    body:
      '760 piksel ve altında rapor önizlemesinin sağ kenarı kesiliyordu (kâğıt ' +
      '678 px, alan 642 px). Artık dar ekranda iç boşluk azalıyor ve tablo hücreleri ' +
      'sarıyor; kâğıdın sağ kenarı görünür. Yazdırma ve UDF/DOCX çıktısı değişmedi.'
  },
  '2.136': {
    title: 'Sekme simgesi eklendi',
    body:
      'Tarayıcı sekmesinde artık uygulamanın simgesi görünür; konsoldaki ' +
      'favicon 404 uyarısı bitti. Görünüm ve işlev değişmedi.'
  },
  '2.135': {
    title: 'Kritik uyarılar ekran okuyucuya da duyuruluyor',
    body:
      'Kayıt yapılamadığında çıkan "KAYDEDİLMİYOR" şeridi, depolama uyarısı ve ' +
      'kritik bildirimler artık ekran okuyucu tarafından kesintili okunur. Normal ' +
      'bilgiler bekleyen işi bölmeden duyurulur. Görsel uyarılar değişmedi.'
  },
  '2.134': {
    title: 'İlk açılışta hayalet kayıt oluşmuyor',
    body:
      'Boş çalışma alanı artık kayda yazılmıyor: yeni tarayıcıda veya yeni sekmede ' +
      '"zaten dosya var" görünmez. Bir bilgi yazdığınız anda dosya gerçek olur ve ' +
      'kaydedilir. Ayrıca tüm veri silinirse eski kayıt diskte bırakılmaz; silinen ' +
      'dosyalar yeniden yüklenmez.'
  },
  '2.133': {
    title: 'Durum çubuğu yazıları artık kesilmiyor',
    body:
      'Dar ekranda (1100 piksel ve altı) durum çubuğundaki dosya/mahkeme, eksik ' +
      'bölüm özeti ve model bilgisi kesiliyordu; 6 öğenin 6\'sı da "…" ile ' +
      'kısalıyordu. Artık çubuk sığmayan öğeyi alt satıra indirir ve yüksekliği ' +
      'içerikle büyür: hiçbir yazı kesilmez. Çalışma modundaki kayıt başlığında ' +
      'tam ad fareyle üzerine gelince görünür.'
  },
  '2.132': {
    title: 'Kurtarma kopyasından geri yüklemede dosya kaybı artık bildirilir',
    body:
      'Depo boşken kurtarma kopyasından geri yükleme yapılırsa, okunamayan bir dosya ' +
      'sessizce atlanıyordu: ekran yalnız "2 dosya geri yüklendi" diyor, üçüncünün ' +
      'kaybolduğunu söylemiyordu. Artık kaç dosyanın okunamadığı bildirilir, ham kayıt ' +
      'kurtarma alanında tutulur ve kopya silinmez. Ana yükleme yoluyla aynı kural.'
  },
  '2.131': {
    title: 'Çalışma modunda üst bar artık hep görünür',
    body:
      'Uzun bir listede çalışma modundaki üst bar (önceki/sonraki kayıt) ilk ekrandan ' +
      'sonra kayboluyordu; durum çubuğu da bölüm satırlarının üstüne binip tıklamayı ' +
      'yutuyordu. Artık görünüm kutusu içeriği kadar uzuyor: üst bar liste boyunca ' +
      'yapışkan kalıyor, durum çubuğu listenin altına iniyor ve hiçbir satırın üstüne ' +
      'binmiyor. Kaydırma yine tek yerde (ana alan).'
  },
  '2.130': {
    title: 'Bölüm listesinde onay durumu artık görünüyor',
    body:
      'Liste satırındaki rozet alanı sabit 96 pikseldi ve taşan kısım gizleniyordu. ' +
      'Durum rozeti en sonda olduğu için "Bekliyor / Onaylandı / Çözümlendi" HİÇ ' +
      'görünmüyordu; satırda yalnız "Öncelik" rozeti vardı. Artık durum rozeti ilk ' +
      'sırada ve her zaman görünür. Rozetler sığmazsa alt satıra sarar, hiçbiri ' +
      'kesilmez. Dar ekranda rozetler metnin altına iner; metin sütunu daralmaz.'
  },
  '2.129': {
    title: 'Ses görünümü artık taşmıyor: tek kaydırma',
    body:
      'Çalışma modu kapalıyken alt içerik (onay/araçlar, klavye kısayolları, ' +
      '29–36. bölümler) sayfadan taşıyor ve görünmüyordu. Artık kaydırma YALNIZ ' +
      'ana alanda: liste içeriği kadar uzuyor, klavye kısayolları listenin ' +
      'ALTINDA kalıyor, tüm bölümler ve araçlar erişilebilir. Çalışma modunda ' +
      'üst bar (önceki/sonraki kayıt) yapışkan kalır.'
  },
  '2.128': {
    title: 'Analiz kutusu: dalga + spektrogram aynı yerde',
    body:
      'Spektrogram artık dalganın ALTINA açılmıyor; AYNI kutuda, aynı zaman ' +
      'ekseninde katmanlanıyor. Üç mod var: Dalga (160 px), Spek (160 px), ' +
      'İkisi (48 px dalga + 112 px spektrogram). Kutu yüksekliği sabit; metin ' +
      'kaymıyor. Sınır, oynatma, A–B ve imleç çizgileri spektrogramın ÜSTÜNDE. ' +
      'Zoom/kaydırma iki katmanı birlikte günceller; spektrogram yeniden ' +
      'hesaplanır. v2.126’daki "altında tam genişlik" düzeni geri alındı.'
  },
  '2.127': {
    title: 'Yazı listeye bitişik, oynat/ok düğmeleri yanında',
    body:
      'Bölüm detayında METİN artık segment listesine BİTİŞİK (solda); dalga, ' +
      'zaman ve konuşmacı alanları sağa geçti. Oynat ve ok düğmeleri sağa ' +
      'yaslıydı (listeden ~700 px); artık başlığın solunda (~190 px). Ayrıca ' +
      'bir bölümü listeden seçmeden "▶ Dinle"ye basınca hiçbir şey olmuyordu; ' +
      'artık görünen bölümü çalar.'
  },
  '2.126': {
    title: 'Spektrogram artık tam genişlikte ve etkileşimli',
    body:
      'Spektrogram açıldığında detayın TÜM genişliğini kullanır (200 px). ' +
      'Üzerinde çalışabilirsiniz: tıkla = konuma git; sürükle = A–B aralığı seç ' +
      've döngüyü aç; Alt+tıkla = en yakın bölüm sınırını taşı; fareyi gezdir = ' +
      'zaman ve frekans okuması (ör. "00:00:01.000 · 1,8 kHz"). Dalga gizlenir, ' +
      'spektrogram aynı alanda açılır; bölüm değişince dalgaya döner.'
  },
  '2.125': {
    title: 'Takip şeridi artık sabit: yazı kaymıyor',
    body:
      'Canlı metin vurgusu (G) artık SABİT iki satırlık bir şeritte O ANKİ ' +
      'CÜMLEYİ gösterir. Önce kutu içeriğe göre uzayıp kısalıyor ve uzun metinde ' +
      '5 satır birden atlıyordu; şimdi yükseklik hiç değişmiyor, cümle iki satıra ' +
      'sığmazsa birer satır kayıyor. Aktif kelime yalnız arka planla işaretlenir; ' +
      'kalınlaştırma satır sonlarını kaydırmıyor. Böylece göz hep aynı yerde kalır.'
  },
  '2.124': {
    title: '"Tüm dosyalar" seçimi artık paket adında görünüyor',
    body:
      'Tek dosyanız olsa bile "Tüm dosyalar" seçtiğinizde paket ' +
      '"AKIS_Paket_Tam_1dosya_..." adıyla iner; "Yalnız bu dosya" seçtiğinizde ' +
      'dosya numarasıyla iner (ör. "AKIS_Paket_2024-108_..."). Önceden ad, ' +
      'seçiminize değil dosya sayısına göre belirleniyordu; tek dosya varken iki ' +
      'seçim aynı adı üretiyor ve hangisini aldığınız anlaşılmıyordu. Artık iki ' +
      'seçim her zaman farklı ad üretir ve bildirim de seçimi söyler.'
  },
  '2.123': {
    title: 'Terimler sadeleşti: Paket oluştur, Paketten yükle',
    body:
      'Aynı şeye iki ad verilmiyor. "Dosya" tek dava; "Paket" taşınabilir .akis ' +
      'dosyası (1+ dosya + ses kayıtları). Menüdeki "Dışa aktar" artık ' +
      '"Paket oluştur", "İçe aktar" artık "Paketten yükle". Paket adı ne ' +
      'olduğunu ve ne zaman alındığını söyler: ' +
      'AKIS_Paket_2024-108_2026-11-20_16-55.akis; tüm dosyalar için ' +
      'AKIS_Paket_Tam_3dosya_.... Böylece indirdiğiniz dosyanın ne olduğu ' +
      'adından anlaşılır ve aynı gün iki paket birbirinin üzerine yazmaz. ' +
      '"Arşivle" değişmedi: yalnız gizler, veriyi ve sesi silmez.'
  },
  '2.122': {
    title: 'Birleştirmede bilirkişi onayları artık aktarılıyor',
    body:
      'Dosya başka bilgisayarda onaylanıp size geri geldiğinde, onaylı bölümler ' +
      'birleştirmeden sonra "Kontrol bekliyor" görünüyordu. Nedeni: onayın KİM ' +
      'tarafından verildiği kaydedilmiyordu; uygulama yalnız metni düzenleyen kişiye ' +
      'bakıyordu. Dinleyip onaylayan bilirkişi metne dokunmadığı için onay sahipsiz ' +
      'sayılıp sessizce düşürülüyordu. Artık onayı veren kişi kaydedilir ve ' +
      'birleştirmede aktarılır. Aktarılamayan onay (kaynağı ekipte tanımlı değilse) ' +
      'artık sessizce kaybolmaz: birleştirme ekranında ve sonuç bildiriminde ' +
      '"N onay aktarılamadı" diye yazar. Ayrıca içe aktarılan dosyada "Şu an bu ' +
      'bilgisayarda çalışan" alanı temizlenir; kendinizi seçmeniz istenir.'
  },
  '2.121': {
    title: 'Sağ paneldeki kaydırma çubuğu kaldırıldı; spektrogram dalganın yerine geçiyor',
    body:
      'Önceki sürümde listenin altı kesilmesin derken sağ detay paneli sıkıştı ve ' +
      'orada ayrı bir kaydırma çubuğu çıktı. Artık detay paneli içeriği kadar uzar; ' +
      'kaydırma yalnız soldaki bölüm listesinde. Spektrogram düğmesi dalga araç ' +
      'çubuğuna taşındı ve artık AYNI alanda geçiş yapıyor: dalga ↔ spektrogram. ' +
      'Böylece panel uzamıyor, sınırlar korunuyor ve bölümün kendi aralığının ' +
      'spektrogramı gösteriliyor.'
  },
  '2.120': {
    title: 'Bölüm listesinin altı kesilmiyor',
    body:
      'Uzun listelerde (ör. 82 bölüm) listenin alt birkaç bölümü görünmüyordu; ' +
      'kaydırma çubuğu sona gelse bile son bölümlere ulaşılamıyordu. Ölçüm: liste ' +
      '497px yüksekliğindeydi ama onu saran alan yalnız 360px idi ve fazlası ' +
      'sessizce kesiliyordu (yaklaşık 4 bölüm). Artık liste, saran alanın tam ' +
      'yüksekliğini kullanır; kaydırdığınızda son bölüm de tam görünür.'
  },
  '2.119': {
    title: 'Takip iki ayrı özelliğe ayrıldı; karaoke kutusu kaldırıldı',
    body:
      'Önceden ana oynata bastığınızda takip KENDİLİĞİNDEN açılıyordu; siz ' +
      'açmadığınız hâlde metin vurgusu ve liste geçişi devreye giriyordu. Artık ' +
      'varsayılan KAPALI: açmak için "Otomatik geçiş" (F) ve "Canlı vurgu" (G) ' +
      'düğmelerini kendiniz kullanırsınız; açtıysanız hatırlanır. Ayrıca aynı metin ' +
      'iki yerde gösteriliyordu ve üstteki "karaoke" kutusu sürekli yeniden yazıldığı ' +
      'için BOZULUYORDU. O kutu tamamen kaldırıldı; metin vurgusu tek yerde ve sabit.'
  },
  '2.118': {
    title: 'Yeni sürüm kendiliğinden geliyor — tuşa basmanız gerekmiyor',
    body:
      'Önceden yeni sürüm çıktığında tarayıcı eski sayfayı önbellekten göstermeye ' +
      'devam ediyordu; siz Ctrl+Shift+R basmadan güncelleme gelmiyordu. Artık uygulama ' +
      'kendi sürümünü dakikada bir denetler: yeni sürüm varsa ve o anda bir işlem ' +
      'yapmıyorsanız (yazmıyorsanız, çözümleme/oynatma yoksa) KENDİSİNİ yeniler. ' +
      'Çalışırken yakalarsa çalışmanızı bölmez; ekranın altında "Yeni sürüm hazır" ' +
      'bildirimi çıkar ve işiniz bitince "Şimdi yenile"ye basarsınız. Yani artık ' +
      'sürüm güncellemesi için bir şey yapmanız gerekmiyor.'
  },
  '2.117': {
    title: 'Acil düzeltme: uygulama açılmıyordu',
    body:
      'v2.116’da uygulama canlı sitede hiç açılmadı; ekranda "Uncaught SyntaxError" ' +
      'hatası vardı. Sebep: ana dosya sürüm numarasıyla yükleniyordu ama içindeki ' +
      'yardımcı dosya (schema.js) sürümsüz yükleniyordu. Tarayıcı eski yardımcı dosyayı ' +
      'önbellekten kullanınca yeni özellikler bulunamadı ve uygulama durdu. Artık iki ' +
      'dosya da aynı sürüm numarasıyla yüklenir; bu tür uyuşmazlık bir daha olamaz. ' +
      'Bir de önlem eklendi: sürüm kontrol testi bu hatayı otomatik yakalar.'
  },
  '2.116': {
    title: 'Takip modu: metin artık titremiyor, tek alan',
    body:
      'Takip açıkken okuduğunuz metin sürekli titriyordu; takip etmek imkânsızlaşıyordu. ' +
      'Sebep: metin saniyede ~8 kez baştan yazılıyordu. Artık metin bir kez çizilir, ' +
      'yalnız okunan kelime vurgulanır — titreme YOK. Ayrıca aynı metin üç yerde ' +
      'gösteriliyordu (biri "karaoke" kutusu, biri takip şeridi, biri düzenleme alanı); ' +
      'artık iki: takip şeridi (okunanı gösterir) ve düzenleme alanı (sizin metniniz). ' +
      'Uzun metinde vurgu görünür alanda kalır. Takip açıkken sol liste otomatik ' +
      'ilerler; siz yalnız okunanı izlersiniz.'
  },
  '2.115': {
    title: 'Belirsiz okuma etiketi ve bölüm spektrogramı',
    body:
      'Ses duyulduğu hâlde iki farklı okuma mümkünse (ör. "geldi" / "kaldı") artık ' +
      'bunun için ayrı bir etiket var: "Belirsiz okuma". "Anlaşılmadı"dan farkı: orada ' +
      'ses anlaşılmıyor, burada ses anlaşılıyor ama iki kelime duyulabiliyor. Bölüm ' +
      'panelinde iki okuma alanı ve "seçilen" listesi çıkar. Rapor, belirsizliği ' +
      'GİZLEMEZ: her iki okumayı ve sizin seçiminizi yazar (adli dürüstlük). Ayrıca ' +
      'bölüm panelinde artık "Spektrogram" düğmesi var: dalganın altında frekans ' +
      'görünümü açılır (patlamalı sessizler p/t/k ve gürültü içinde konuşma burada ' +
      'daha okunur). Dalga ile spektrogram birlikte kullanılır; biri diğerinin yerine ' +
      'geçmez.'
  },
  '2.114': {
    title: '“Neden %100 olmuyor?” sorusu artık cevaplı',
    body:
      'Tüm onayları verdiğinizde sayaç %100 olmuyorsa artık NEDEN olduğunu ' +
      'görürsünüz: durum çubuğunda "3 bölüm eksik: 2 yeniden dinlenecek · ' +
      '1 çözümlendi" gibi bir açıklama çıkar. Üzerine tıklayınca yalnız eksik ' +
      'bölümler listelenir. Kayıt kartındaki "2/5" sayısının üzerine gelince de ' +
      'aynı açıklama görünür. Kural değişmedi: "Onaylandı" ve "Anlaşılmadı" ' +
      'kontrol edilmiş sayılır; "Yeniden dinlenecek" ve "Çözümlendi" sayılmaz.'
  },
  '2.113': {
    title: 'Bölüm listesinde son bölüm artık görünüyor',
    body:
      'Uzun listelerde (ör. 100 bölüm) sona kaydırdığınızda son birkaç bölüm ' +
      'görünmüyordu. Sebep: kaydırma konumu her adımda "biraz daha" eklenerek ' +
      'hesaplanıyordu ve yuvarlama hatası birikiyordu (ölçüm: 43px eksik kalıyordu). ' +
      'Artık konum tek seferde ve kesin hesaplanır; listenin sonuna geldiğinizde ' +
      'son bölüm tam görünür. Takip modu da son bölüme kadar sorunsuz izler.'
  },
  '2.112': {
    title: 'A–B döngüsü artık gerçekten çalışıyor',
    body:
      'A–B aralığı dinleme üç yerden bozuktu ve bu yüzden "tam kullanamadık" ' +
      'hissi doğuyordu. (1) "▶ Dinle" düğmesine her bastığınızda döngü sessizce ' +
      'kapanıyordu; artık açık kaldığı sürece B noktasında sarıp tekrar çalar. ' +
      '(2) A–B için hiç klavye kısayolu yoktu, B tuşu bölmeye bağlıydı. Artık: ' +
      'A = başlangıç, B = bitiş, K = döngü aç/kapa; bölme S tuşunda. (3) Tuşlarla ' +
      'A/B belirlediğinizde ekranda hiçbir geri bildirim görünmüyordu; artık ' +
      'aralık yazısı ve düğme durumu anında güncellenir. Düğmelerin üzerine ' +
      'gelince kısayolları da yazar.'
  },
  '2.111': {
    title: 'Hangi çözümleme profiliyle çözümlendiği artık görünüyor',
    body:
      'Bir kaydı çözümlediğinizde hangi profilin kullanıldığı belirsizdi; "en son ' +
      'seçtiğim mi?" diye emin olamıyordunuz. Artık kayıt kartında ve bölüm panelinde ' +
      'kısa bir rozet var: Standart · Şive/aksan · Gürültülü · Telefon. Üzerine ' +
      'gelince ne anlama geldiği yazar. Ayrıca daha önemli bir hata düzeltildi: uzun ' +
      'bir çözümleme sürerken profili değiştirirseniz aynı kaydın farklı bölümleri ' +
      'FARKLI profille çözümlenebiliyordu. Artık profil çözümleme başında bir kez ' +
      'sabitlenir; kayıt baştan sona aynı profille çözümlenir. Profil adı RAPORA ' +
      'yazılmaz (yalnız çözümleme ayarıdır).'
  },
  '2.110': {
    title: 'Yedek artık neyi aktardığınızı soruyor',
    body:
      'Eskiden "Dışa aktar" sessizce TÜM dosyaları paketliyordu; tek dosya sanıp ' +
      'basıyordunuz, hepsi iniyordu ve bunu söyleyen hiçbir şey yoktu. Artık basınca ' +
      'sorulur: "Yalnız bu dosya" (adıyla görünür) veya "Tüm dosyalar" (kaç dosya ' +
      'olduğu yazar). Paket adına TARİH ve SAAT eklenir ' +
      '(AKIS_2024-A_2026-11-20_16-55.akis), böylece aynı gün iki yedek birbirinin ' +
      'üzerine yazmaz. Arşivlenmiş dosyalar da yedeğe dâhildir. Ayrıca düğmelerin ' +
      'üzerine gelince ne yaptıkları yazar: Dışa aktar (yedek oluştur), İçe aktar ' +
      '(paketi EKLE, kopya açar), ⇄ Birleştir (paketi bu dosyayla BİRLEŞTİR). ' +
      'Yardım ekranına terim sözlüğü eklendi.'
  },
  '2.109': {
    title: 'İlk açılış artık gerçekten boş',
    body:
      'Uygulama boş bir tarayıcıda açıldığında kendiliğinden bir "Yeni inceleme ' +
      'dosyası" oluşturup KAYDEDİYORDU. Bu yüzden ilk açılış boş görünmüyor, ' +
      'yeni sekmede de sahte bir dosya varmış gibi duruyordu. Artık çalışma alanı ' +
      'gerçekten boş: seçicide "— Yeni dosya —" yazar, alt durum çubuğu "Henüz dosya ' +
      'yok — bilgi girin veya içe aktarın" der ve BOŞ TASLAK KAYDA YAZILMAZ. ' +
      'Bir bilgi yazdığınız veya ses eklediğiniz anda dosya gerçek olur ve ' +
      'kaydedilir; sayfayı yenilediğinizde durur. Yedek, arşiv ve silme yalnız ' +
      'gerçek dosyalarla çalışır.'
  },
  '2.108': {
    title: 'Arşiv/silme: boş dosya ve görünmeyen kimlik düzeltildi',
    body:
      'Denemede fark edilen üç hata giderildi. (1) BOŞ çalışma alanı artık ' +
      'arşivlenmez: dosya numarası, mahkeme, taraf veya ses kaydı yoksa "arşivlenecek ' +
      'veri yok" denir. Önceki sürümde her basışta yeni bir boş dosya arşive giriyor, ' +
      'arşivde aynı adlı kayıtlar birikiyordu. (2) Dosya adları artık ayırt edilir: ' +
      'dosya numarası yoksa adın yanında KISA bir kimlik görünür ' +
      '("Yeni inceleme dosyası #39tuib"). (3) Kalıcı silmede artık EKRANDA GÖRDÜĞÜNÜZ ' +
      'ad sorulur; önceki sürümde ekranda hiç görünmeyen ham bir kimlik ' +
      '(mwp6t1x5-fdist0v gibi) yazmanız isteniyordu — bu imkânsızdı. Kısa kimlik ' +
      'yanlışlıkla başka dosyayı silmeyi de önler.'
  },
  '2.107': {
    title: 'Dosya arşivleme ve (isteğe bağlı) kalıcı silme',
    body:
      'Çalışma alanı artık düzenli kalabilir. Dosya bilgileri çekmecesindeki ' +
      '"Bu dosyayı arşivle" ile bir dosya listeden gizlenir; VERİSİ VE SES ' +
      'KAYITLARI SİLİNMEZ. Üst bardaki "Arşiv (N)" düğmesinden istediğiniz zaman ' +
      'geri alabilirsiniz; arşivdeki dosyalar yedeğe de dâhil edilir. ' +
      'Gerçekten silmek isterseniz: Arşiv → Kalıcı sil. Silme iki onay ister: ' +
      'önce ses kayıtlarının da silineceğini söyleyen uyarı, sonra dosya ' +
      'numarasını ELLE yazmanız. Yanlış yazarsanız silme yapılmaz. ' +
      'DİKKAT: kalıcı silinen dosyanın sesi Ctrl+Z ile GERİ GELMEZ; tek kurtarma ' +
      'yolu daha önce aldığınız .akis yedeğidir.'
  },
  '2.106': {
    title: 'Otomatik onay artık "Onaylandı" sayılmıyor',
    body:
      'Toplu "hızlı onayla" işlemi bölümleri eskiden doğrudan "Onaylandı" yapıyordu. ' +
      'Bu yanıltıcıydı: makine sizin yerinize onaylamış oluyordu ve rapor da ' +
      '"Onaylandı" yazıyordu. Artık toplu işlem bölümleri "Çözümlendi" olarak ' +
      'işaretler (gri rozet) — bu BİLİRKİŞİ ONAYI DEĞİLDİR. Raporda da "Çözümlendi" ' +
      'yazar, "Onaylandı" değil. Dinleyip onayladığınız bölümler yeşil "Onaylandı" ' +
      'olur ve rapora öyle girer. Rozetin üzerine gelince ne anlama geldiği yazar; ' +
      'liste kalabalıklaşmaz. Kontrol sayacı (x/y) da doğru: otomatik işaretlenen ' +
      'bölümler "kontrol edildi" sayılmaz.'
  },
  '2.105': {
    title: 'Üst bar başlığı artık kesilmiyor',
    body:
      'Ekranın üstündeki sayfa başlığı ("Genel görünüm", "İnceleme ve sorular"…) ' +
      'sağdaki düğmeler yer kapladığı için yarısı görünmüyordu; üstelik hiçbir ' +
      'uyarı çıkmıyordu. Artık başlık tam görünür. Sığmadığında üst bar alt satıra ' +
      'SARAR — yani düğmeler aşağı iner, yazı kesilmez. Bu davranış görünürdür; ' +
      'sessizce kırpılan yazı olmaz. Durum yazıları da kısaltıldı ("Kayıt güncel", ' +
      '"Yedek yok"); ayrıntı hâlâ fareyle üzerine gelince görünür. UYARI yazıları ' +
      '("KAYDEDİLMİYOR — yedek alın!", "DEPOLAMA DOLU") kısaltılmadı.'
  },
  '2.104': {
    title: 'Sürüm bilgisi okunaklı; küçük yazılar büyütüldü',
    body:
      'Sol alttaki sürüm yazısı 7 punto ile çiziliyordu ve okunamıyordu; ayrıca ' +
      '"AKİS • Yerel sürüm" kalabalığı taşıyordu. Artık yalnız "v2.104" yazar ve ' +
      'okunaklı puntodadır. Üzerine tıklarsanız SÜRÜM GEÇMİŞİ açılır: her sürümde ' +
      'sizin için ne değiştiği sade dille listelenir. Ayrıca ekranın her yerinde ' +
      '11 puntonun altında yazı kalmadı (ölçüldü: sürüm etiketi 7→11, bölüm ' +
      'numaraları 8→11, bilgi simgeleri 9→11, küçük etiketler 10→11). Metinler ' +
      'büyüdüğü için hiçbir yazı kesilmedi; kesilme olmadığı tarayıcıda ölçüldü.'
  },
  '2.103': {
    title: 'Yeniden çözümleme artık veriyi sormadan silmiyor',
    body:
      'Bir kaydı yeniden çözümlediğinizde (tek kayıt veya "Tüm kayıtları çözümle") ' +
      'mevcut bölümlerin üzerine yazılır. Önceki sürümde bu yalnız elle ' +
      'düzeltilmiş bölüm varsa soruluyordu; modelin ürettiği, henüz kontrol ' +
      'etmediğiniz metin SORULMADAN siliniyordu ve Ctrl+Z geri getirmiyordu. ' +
      'Artık kayıtta bölüm varsa her zaman sorulur: kaç bölümün değişeceği ve ' +
      'kaçının elle düzeltilmiş/onaylanmış olduğu yazılır. "Vazgeç" derseniz ' +
      'hiçbir şey silinmez. Onaylarsanız eski hâl saklanır ve Ctrl+Z ile geri ' +
      'alınabilir. Toplu çözümlemede kayıt başına ayrı soru yerine TEK soru çıkar.'
  },
  '2.102': {
    title: 'Yedek, geri yükleme ve birleştirme düzeltildi',
    body:
      'Yedeği başka bir bilgisayarda açtığınızda boş çalışma alanı da pakete ' +
      'giriyordu: ekran "2 dosya" diyor, içe aktarma sonrası çalışma alanında ' +
      '"3 kayıt" oluşuyordu. Artık boş çalışma alanı (dosya numarası, mahkeme, ' +
      'taraf ve ses kaydı olmayan kayıt) yedeğe GİRMEZ; geri yükleme sonrası ' +
      'boş kayıt düşürülür ve aynı dosya ikinci kez eklenirse kopya açılmaz. ' +
      '⇄ Birleştir, çok dosyalı yedek paketini de kabul eder (önceki sürümde ' +
      '"bu bir çalışma paketi değil" hatası alıyordunuz). Arşivden geri ' +
      'yüklemede bir ses dosyası bulunamazsa artık hangi kayıt olduğu söylenir.'
  },
  '2.101': {
    title: 'Perde ölçümü: yanıltıcı tek sayı yerine "oktav belirsiz" uyarısı',
    body:
      'Konuşmacı perdesi, temel frekans zayıf olduğunda iki katına çıkabiliyordu ' +
      '(ör. gerçek 120 Hz iken 240 Hz) ve rapor bu değere "genellikle kadın" gibi ' +
      'bir cinsiyet ipucu ekliyordu. Bu hatayı güvenilir biçimde düzeltmek mümkün ' +
      'değil (denendi, normal sesleri de bozdu). Artık böyle bir durumda rapor tek ' +
      'bir kesin sayı iddia etmez: "oktav belirsiz: ≈120–240 Hz" yazar ve cinsiyet ' +
      'ipucu vermez. Perde güvenilir ölçüldüyse davranış değişmez.'
  },
  '2.100': {
    title: 'Türkçe "İ" ile başlayan kelimeler artık doğru tanınıyor',
    body:
      'Terim tutarlılık paneli, büyük "İ" ile başlayan kelimeleri yanlış ' +
      'küçültüyordu: "İstanbul" → "stanbul" oluyor ve "istanbul" ile hiç ' +
      'eşleşmiyordu. Bu yüzden aynı terimin büyük/küçük yazımı iki ayrı kelime ' +
      'gibi görünüyordu. Artık Türkçe küçültme tek yerden yapılır; "İstanbul" ve ' +
      '"istanbul" aynı kelime sayılır, gerçek yazım farkları yine yakalanır.'
  },
  '2.99': {
    title: 'Hızlı onay sayısı artık listeyle aynı',
    body:
      '"Hızlı onaya uygun" sayısı ile filtreye geçince listelenen bölüm sayısı ' +
      'farklıydı: sayaç 1 derken liste 2 bölüm gösteriyordu. Çünkü sayaç ' +
      '"önceki bölümle çakışma" denetimini yapıyor, liste yapmıyordu. Artık ' +
      'sayaç, liste ve toplu onay düğmesi aynı ölçütü kullanır; listelediğiniz ' +
      'bölüm toplu onayda atlanmaz.'
  },
  '2.98': {
    title: 'Paragraf ve bölme, modelin çıktısını artık silmiyor',
    body:
      'Adli ayrım kuralı gereği modelin ürettiği ham metin hiçbir işlemde ' +
      'silinmemelidir. Paragraf oluşturduğunuzda modelin çıktısı tamamen ' +
      'kayboluyordu; bölme yaptığınızda ise aynı metin iki yarıya kopyalanıyordu ' +
      '(iki bölüm de "model tüm metni söyledi" diyordu). Artık paragrafta model ' +
      'çıktısı birleştirilir, bölmede adil biçimde paylaştırılır. Farklı ' +
      'modeller karışırsa model adı boş bırakılır (yanlış atıf yapılmaz).'
  },
  '2.97': {
    title: 'Zaman alanları artık doğrulanıyor',
    body:
      'Başlangıç/bitiş alanlarına geçersiz bir değer yazıldığında (harf, 99 saniye, ' +
      'ters aralık) bu değer sessizce kaydediliyor ve raporda "00:00:00.000" olarak ' +
      'görünüyordu. Artık geçersiz değer KAYDEDİLMEZ: alan eski değerine döner ve ' +
      'neden kabul edilmediği söylenir. Türkçe ondalık virgülle de yazabilirsiniz ' +
      '(00:00:05,250 → 00:00:05.250).'
  },
  '2.96': {
    title: 'SHA-256 doğrulaması artık sahte "eşleşti" demiyor',
    body:
      'Dosya özeti (SHA-256) hesaplanamadığında uygulama bunu "doğrulandı" ' +
      'sayabiliyordu. Bu özellikle LAN IP üzerinden http:// ile çalışırken ' +
      'oluyordu (tarayıcı güvenli bağlantı olmadan özet hesaplamaz). Artık böyle ' +
      'bir durumda "DOĞRULANAMADI" der ve nedenini söyler; dosya değişmiş sayılmaz ' +
      'ama doğrulanmış da sayılmaz. "Dosya değişmiş olabilir" uyarısı yalnız ' +
      'özetler gerçekten farklıysa çıkar. SHA-256 doğrulaması için https veya ' +
      'localhost kullanın.'
  },
  '2.95': {
    title: 'Dosya birleştirmede "eski dosya" yanlış belirleniyordu',
    body:
      'Birleştirmede "karşı dosya daha yeniyse onun değeri alınır" kuralı var. Ama ' +
      'bir dosyanın son düzenleme zamanı hiç güncellenmiyordu; yalnız ilk ' +
      'oluşturulduğu tarih kalıyordu. Bu yüzden aylarca düzenlediğiniz bir dosya ' +
      '"en eski" görünüp karşı taraftan gelen değer tarafından sessizce ' +
      'ezilebiliyordu. Artık her düzenleme zamanı tazeler; bir dosyayı yalnız ' +
      'açmak ise onu "yeni" göstermez.'
  },
  '2.94': {
    title: 'Dosya birleştirmede ölçüm ve konuşmacı bilgileri artık kaybolmuyor',
    body:
      'İki dosyayı birleştirdiğinizde, aynı ses kaydına ait seviye ölçümleri, ' +
      'konuşmacılar, köken/teslim bilgisi, referans metni ve delil günlüğü hiç ' +
      'aktarılmıyordu — üstelik "çakışma yok" deniyordu. Artık bu bilgiler karşı ' +
      'taraf doldurmuşsa gelir; birleştirme öncesi kaç bilginin alınacağı yazar. ' +
      'İki tarafta farklı değer varsa sessizce seçilmez, çakışma olarak gösterilir ' +
      've bu dosyadaki değer korunur.'
  },
  '2.93': {
    title: 'Gerçek cümleler artık "boş/dolgu" sayılmıyor',
    body:
      'Uygulama, "konuşma", "müzik", "nefes" gibi bir kelimeyle BAŞLAYAN her metni ' +
      'dolgu (boş) sayıyordu. Bu yüzden "Konuşma sırasında bağırdı", "Nefes alıyor", ' +
      '"Müzik kutusu çalındı" gibi gerçek cümleler deşifreden çöpe atılabiliyor, ' +
      'kayıt "anlamlı konuşma bulunamadı" uyarısı alabiliyordu. Artık yalnız gerçek ' +
      'dolgu etiketleri ((Konuşma), [Müzik] gibi) dolgu sayılır; cümleler korunur. ' +
      'Etkilenmiş kayıtlarınızı yeniden çözümlemeniz önerilir.'
  },
  '2.92': {
    title: 'Sessizlik ve perde ölçümü düzeltildi (stereo kayıtlar)',
    body:
      'Bu ölçümler yalnız sol kanalı okuyordu. Konuşma sağ kanalda ise bölüm ' +
      '"tamamen sessiz" sanılıyor, size "bu bölüm sessiz" uyarısı veriliyordu; ' +
      'perde de ölçülemiyordu. Artık en yüksek sesin olduğu kanal kullanılır ve ' +
      'hangi kanaldan ölçüldüğü yazılır. Eski sessizlik ölçümleri geçersiz sayıldı: ' +
      'bölüm detayındaki "Sessizlik ölç" düğmesiyle yeniden ölçün. Yeniden ' +
      'ölçülmemiş değer gösterilmez.'
  },
  '2.91': {
    title: 'Ses seviyesi ve kırpılma ölçümü düzeltildi (stereo kayıtlar)',
    body:
      'Ölçüm, iki kanalı ortalamayla tek sese indiriyordu. Bu yüzden ses yalnız bir ' +
      'kanalda ise tepe düzeyi olduğundan düşük görünüyor, tek kanaldaki kırpılma ise ' +
      'tamamen görünmüyordu — kırpılmış bir kayıt "kırpılma yok" diye rapora ' +
      'girebiliyordu. Artık tepe ve kırpılma kanalların EN KÖTÜSÜNDEN ölçülür ve ' +
      'hangi kanal olduğu yazılır. Önceki sürümlerle yapılmış seviye ölçümleri ' +
      'geçersiz sayıldı; kaydı açıp "Seviye ölç" düğmesine basarak yeniden ölçün. ' +
      'Yeniden ölçülmemiş kayıtlar raporun seviye tablosuna girmez.'
  },
  '2.90': {
    title: 'Rapordaki "çözümleme doğruluğu" (WER) tablosu düzeltildi',
    body:
      'Bu tablo, modelin ürettiği metni ölçmesi gerekirken sizin düzelttiğiniz ' +
      'metni ölçüyordu. Sonuç ters çıkıyordu: model kötüyken "%0 hata", model çok ' +
      'iyiyken "%100 hata" gibi görünebiliyordu. Artık yalnız modelin HAM çıktısı ' +
      'ölçülür; sizin düzeltmeleriniz oranı değiştirmez. Model çıktısı saklanmamış ' +
      'eski kayıtlar bu tabloya girmez (uydurma oran gösterilmez). Daha önce ' +
      'üretilmiş raporlardaki WER değerleri güvenilir değildir; yeni sürümle ' +
      'yeniden üretin.'
  },
  '2.89': {
    title: 'Eski dosyalarınızdaki onaylar artık silinmiyor',
    body:
      'Önceki sürümde, eski (v2) biçimindeki bir dosyayı açtığınızda onayladığınız ' +
      'bölümler sessizce "Kontrol bekliyor"a dönüyordu; dosya açılır açılmaz ' +
      'onaylarınız kayboluyordu. Artık eski dosyalar açıldığında onaylar korunur ve ' +
      'sayaçlar doğru görünür. Daha önce bu sürümle açılıp onayları silinmiş bir ' +
      'dosyanın kaybı geri getirilemez; elinizde eski bir yedek varsa onu açtığınızda ' +
      'onaylar korunur.'
  },
  '2.88': {
    title: 'Onay artık metne bağlı — metni değiştirirseniz yeniden onaylayın',
    body:
      'Önceki sürümde onayladığınız bir bölümün metnini değiştirdiğinizde onay ' +
      'duruyordu; yani kontrol etmediğiniz yeni metin rapora "Onaylandı" olarak ' +
      'girebiliyordu. Artık metin değişince bölüm otomatik olarak "Kontrol ' +
      'bekliyor"a döner ve ekranda neden döndüğünü söyleyen bir uyarı çıkar. ' +
      'Değişikliği dinleyip yeniden onaylamanız gerekir. Aynı metni yeniden ' +
      'yazarsanız onayınız korunur.'
  },
  '2.87': {
    title: 'Kayıt sorunu giderildi — çalışmanız artık kaydediliyor',
    body:
      'Önceki sürümde bir bölüme tıkladıktan sonra yaptığınız değişiklikler ' +
      'tarayıcıya yazılamıyor ve sayfayı yenileyince kayboluyordu. Uyarı da ' +
      'yeterince görünmüyordu. Her ikisi düzeltildi. Bundan sonra bir yazma ' +
      'sorunu olursa ekranın üstünde büyük bir uyarı çıkar ve ne yapmanız ' +
      'gerektiğini söyler. Kaybolan çalışma geri getirilemez; elinizdeki ' +
      'dosyaları "Paket oluştur" ile yedeklemeniz önerilir.'
  }
};
const SEEN_NOTICE_KEY = (v) => `akis.seenNotice.${v}`;
function maybeShowVersionNotice() {
  const note = VERSION_NOTICES[APP_VERSION];
  if (!note) return false;
  try {
    if (localStorage.getItem(SEEN_NOTICE_KEY(APP_VERSION)) === '1') return false;
    localStorage.setItem(SEEN_NOTICE_KEY(APP_VERSION), '1');
  } catch (e) {
    return false;
  }
  const el = $('#versionNotice');
  if (el) {
    el.innerHTML =
      `<div class="sb-body"><b>${esc(note.title)}</b><small>${esc(note.body)}</small></div>` +
      '<button class="button button-primary button-small" id="versionNoticeExport">Paket oluştur</button>' +
      '<button class="icon-button" id="versionNoticeClose" aria-label="Kapat">×</button>';
    el.hidden = false;
    $('#versionNoticeExport')?.addEventListener('click', () => exportProject().catch((e) => showToast(e.message)));
    $('#versionNoticeClose')?.addEventListener('click', () => {
      el.hidden = true;
    });
  } else {
    // Şerit düğümü yoksa bile kullanıcı bilgilendirilir (sessiz kalmak yasak).
    showToast(`${note.title}. Ayrıntı: Yardım (?) → Son değişiklikler.`);
  }
  return true;
}

async function init() {
  // Sürüm etiketi: YALNIZ sürüm numarası, okunaklı punto (v2.104).
  // Neden: eski etiket "AKİS • v2.103 • Yerel sürüm" idi ve 7px puntoyla
  // çiziliyordu; bilirkişi okuyamıyordu. Ayrıntı ve geçmiş artık tıklamada.
  const verEl = $('#appVersion');
  if (verEl) verEl.textContent = `v${APP_VERSION}`;
  // Görünüm tercihini uygula (index.html'deki satır içi betik ilk boyamayı
  // zaten yaptı; burada yalnız paneli çizip durumu tazeliyoruz).
  applyTheme();
  // v2.73: durum IndexedDB'den okunur (async). Bitmeden çizmek boş ekran
  // gösterirdi; bu yüzden beklenir.
  await loadState();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  setupEvents();
  renderQueue();
  try {
    if (localStorage.getItem('akis.focusMode') === '1') setFocusMode(true);
    // TAKİP TERCİHİ (v2.119): yalnız kullanıcı DAHA ÖNCE açıkça açtıysa açılır.
    // Otomatik açma yok; varsayılan KAPALI.
    try {
      const pref = JSON.parse(localStorage.getItem('akis.followPref') || '{}');
      if (followShouldAutoStart(pref)) setFollow(true);
    } catch (e) {}
  } catch (e) {}
  $('#reportDate').value = currentCase().reportDate || dateToday();
  detectDevice().then((ok) => {
    const b = $('#deviceBadge');
    if (b) b.textContent = ok ? '● WebGPU hızlandırma kullanılabilir' : '● WebGPU yok · WASM (CPU) kullanılacak';
    applyRecommendation();
  });
  renderBackupState();
  renderUndoState();
  initTabGuard();
  // Kullanıcıya sürüm notunu göster (bir kez). Kritik düzeltme sessiz geçmez.
  maybeShowVersionNotice();
  refreshUsage();
  refreshStorage();
  restoreAudioUrls().then(() => renderAudioList());
}
init().catch((e) => { console.error(e); });
