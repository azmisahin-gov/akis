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
  SPEAKER_ROLE_LABEL,
  SPEAKER_GENDER_LABEL,
  MEDIUM_TYPE_LABEL,
  TEAM_ROLE_LABEL,
  TEAM_ROLE,
  SPEAKER_ROLE,
  SPEAKER_GENDER,
  MEDIUM_TYPE,
  isSecondEyesRole
} from './schema.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// TEK SÜRÜM KAYNAĞI. Arayüzdeki sürüm etiketi buradan okunur. Her sürüm
// güncellemesinde yalnızca bu satır ve CHANGELOG başlığı değiştirilir; belgeler
// bu numaraya göre hizalanır. Sürüm şeması: MAJOR.MINOR (bkz. docs/YOL_HARITASI.md).
const APP_VERSION = '2.64';
// Legacy storage key is intentionally retained so existing MİHENK work remains available after the AKİS update.
const STORE_KEY = 'mihenk.pro.cases.v1';
const DB_NAME = 'mihenk-pro-assets';
const DB_STORE = 'audio';
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
    'Aşağıdaki oranlar, referans metni bulunan kayıtlarda otomatik çözümleme çıktısının referansla karşılaştırılmasıyla hesaplanmıştır. WER (kelime hata oranı) düşük olan daha iyidir; yerine koyma, silme ve ekleme hatalarını referans kelime sayısına böler. Ölçüm yalnızca referans metni bulunan kayıtlar için yapılabilir; gerçek dosyalarda referans metni genellikle bulunmaz.',
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
function persist() {
  try {
    // Düz alan (v2 uyumluluk) üzerinden yapılan yazmaları iç içe yapıya aktar.
    for (const c of appState.cases || []) syncCaseMirrors(c);
    localStorage.setItem(STORE_KEY, JSON.stringify(appState));
    $('#saveState').textContent = '● Yerel kayıt güncellendi';
  } catch (e) {
    $('#saveState').textContent = '● Kayıt alanı dolu';
    console.warn(e);
  }
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
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      appState = JSON.parse(raw);
      if (!Array.isArray(appState.cases)) throw 0;
      // v3: her dosya şemaya göre normalleştirilir (eksik alan tamamlanır,
      // eski düz alanlar iç içe yapıya taşınır) ve düz alan erişimcileri
      // yeniden kurulur — JSON tanımlayıcıları taşımaz.
      appState.cases = appState.cases.map((c) => {
        const nc = normalizeCase(c);
        syncCaseMirrors(nc);
        defineCaseMirrors(nc);
        return nc;
      });
      stripDerivedFields(appState);
      // Eski sürümler günlüğü hash'siz yazıyordu. Bu kayıtlar "kurcalanmış"
      // sayılmamalı ama "doğrulandı" da denmemeli; zincire bağlanır.
      upgradeAllLogChains(appState);
      if (compactAllHistories(appState)) persist();
    }
  } catch (e) {
    appState = { cases: [], activeCaseId: null };
  }
  if (!appState.cases.length) {
    const c = freshCase();
    appState.cases.push(c);
    appState.activeCaseId = c.id;
  }
  if (!currentCase()) appState.activeCaseId = appState.cases[0].id;
  persist();
}
function dbOpen() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'key' });
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
function showToast(msg) {
  const el = $('#toast');
  el.textContent = msg;
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
  if (name === 'audio') {
    const c0 = currentCase();
    if (c0 && (c0.materials || []).length && !workspaceDeclined && !document.body.classList.contains('ws-mode')) {
      setWorkspace(true);
    }
  }
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
  if (name === 'audio') renderAudioList();
}
function renderCaseSelect() {
  const sel = $('#caseSelect');
  sel.innerHTML = appState.cases
    .map(
      (c) =>
        `<option value="${esc(c.id)}" ${c.id === appState.activeCaseId ? 'selected' : ''}>${esc(c.name || c.fileNo || 'Yeni inceleme')}</option>`
    )
    .join('');
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
  set('#sbCase', [c.fileNo, c.court].filter(Boolean).join(' · ') || 'Yeni inceleme dosyası');
  set('#sbAudio', String(mats.length));
  set('#sbSegments', String(segs.length));
  set('#sbChecked', `%${pct}`);
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
  return `<div class="audio-card-top"><div class="audio-file-icon">♫</div><div class="audio-file-main"><b title="${esc(m.name)}">${esc(m.name)}</b><small>${esc(m.type || 'Ses dosyası')} · ${fmtSize(m.size)} · ${fmtShort(m.duration || 0)}</small></div><span class="head-state ${stCls}">${esc(status)}</span><span class="head-check">${checked}/${segs.length}</span>${m.transcribedWithModel ? `<span class="head-model">${esc(modelShortName(m.transcribedWithModel))}</span>` : ''}<div class="audio-actions">${materialStatus(m) === 'transcribing' ? `<button class="mini-button danger" data-cancel="${esc(m.id)}">İptal</button>` : `<button class="mini-button primary" data-transcribe="${esc(m.id)}">${segs.length ? 'Yeniden çözümle' : 'Çözümle'}</button>`}<button class="mini-button" data-manual="${esc(m.id)}">＋ Bölüm</button><button class="mini-button" data-remove-audio="${esc(m.id)}">Kaldır</button></div></div>${m.synthetic ? '<div class="synthetic-flag">Kurgusal sentetik kayıt</div>' : ''}${m.lastVerify && !m.lastVerify.ok ? `<div class="warn-box">Son SHA-256 doğrulaması farklı: dosya değişmiş olabilir. Ayrıntı "Kayıt bilgileri" sekmesinde.</div>` : ''}${typeof m.progress === 'number' ? `<div class="progress-wrap"><div class="progress-bar"><span style="width:${m.progress}%"></span></div><small>Çözümleme ilerlemesi: %${m.progress}</small></div>` : ''}${m.hallucinationWarning ? `<div class="warn-box">${esc(m.hallucinationWarning)}</div>` : ''}${m.languageWarning ? `<div class="warn-box">${esc(m.languageWarning)}</div>` : ''}`;
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
  updateWorkspaceBar();
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
            <button class="mini-button follow-btn" data-follow-toggle="${esc(m.id)}" title="Çalarken bölümleri otomatik izle (F)">Takip</button>
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
  return `<table class="record-table"><tbody>
    <tr><td>Tepe düzeyi</td><td>${fmtDb(lv.peakDb)} dBFS</td></tr>
    <tr><td>RMS düzeyi</td><td>${fmtDb(lv.rmsDb)} dBFS</td></tr>
    <tr><td>Tepe kırpılma</td><td>%${fmtPct(lv.clippedRatio)} (${lv.clippedSamples} örnek)</td></tr>
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
    <div class="evidence-actions"><button class="mini-button" data-verify="${esc(m.id)}">SHA-256 doğrula</button><button class="mini-button" data-log="${esc(m.id)}">İşlem günlüğü</button></div>`;
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
async function computeSpectrogram(blob, cols, fftSize = 512) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let buf;
  try {
    buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch (e) {
    await ctx.close();
    return null;
  }
  const ch = buf.numberOfChannels,
    len = buf.length;
  const data = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) data[i] += d[i] / ch;
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
  return { cols, bins, data: out, minDb, maxDb, fftSize, sampleRate: buf.sampleRate, duration: buf.duration };
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
function normalizeForWer(text) {
  return String(text || '')
    .toLocaleLowerCase('tr-TR')
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
  const raw = String(text || '')
    .toLowerCase()
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
  return Number.isFinite(r) ? `%${(r * 100).toFixed(1)}` : '—';
}
// Referans metni olan tüm kayıtlar için WER ölçer. Yalnızca gerçekten
// çözümlenmiş bölümler kullanılır; çözümlenmemiş kayıt atlanır.
function measureWerForCase(c) {
  const out = [];
  for (const m of c.materials || []) {
    const ref = m.expectedText || (m.referenceSegments || []).map((s) => s.text || '').join(' ');
    if (!ref || !String(ref).trim()) continue;
    const hyp = (m.segments || []).map((s) => s.text || '').join(' ');
    if (!hyp.trim()) continue;
    const r = computeWer(ref, hyp);
    out.push({ material: m.name, model: m.transcribedWithModel || null, ...r });
  }
  return out;
}

// ==== Kanal seçimi (stereo kayıtlarda) ====
// Stereo bir kayıtta sol ve sağ kanalları ayrı dinlemek, uzmanın arka plan
// gürültüsünü veya bir kanaldaki konuşmayı ayırt etmesine yardımcı olur.
// Web Audio grafiği: source -> splitter -> (gainL, gainR) -> merger -> çıkış.
// Kanal modu gain değerleriyle ayarlanır; oynatma konumu ve hız korunur.
// Seviye ölçümü şeması. Ölçüm alanları değiştiğinde artırılır; eski kayıtlar
// geçersiz sayılıp yeniden ölçülür. Böylece arayüz eski kodla üretilmiş,
// eksik ya da çelişkili değerleri göstermez.
const LEVELS_SCHEMA = 2;
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
const SPEAKER_ROLES = [
  'Belirtilmedi',
  'Davacı',
  'Davalı',
  'Müşteki/Mağdur',
  'Sanık',
  'Şüpheli',
  'Alacaklı',
  'Borçlu',
  'Tanık',
  'Bilirkişi',
  'Üçüncü kişi',
  'Tercüman'
];
const SPEAKER_GENDERS = ['Belirtilmedi', 'Kadın', 'Erkek', 'Belirsiz'];
// Perde aralığı ölçümüne göre kaba yönlendirme (tıbbi/kesin değil, kaba gösterge).
function pitchHint(f0) {
  if (!f0) return '';
  if (f0 < 95) return 'çok düşük perde (genellikle yetişkin erkek)';
  if (f0 < 155) return 'düşük perde (genellikle erkek)';
  if (f0 < 200) return 'orta perde';
  if (f0 < 255) return 'yüksek perde (genellikle kadın)';
  return 'çok yüksek perde (genellikle kadın veya çocuk)';
}
// Segment listesindeki konuşmacı etiketlerinden konuşmacı kayıtlarını türetir.
// Var olan profillerin nitelikleri korunur; yeni etiketler eklenir.
function ensureSpeakers(m) {
  m.speakers = m.speakers || [];
  const byName = new Map(m.speakers.map((s) => [s.name, s]));
  for (const sg of m.segments || []) {
    const name = (sg.speaker || '').trim();
    if (!name || name === 'Belirtilmedi') continue;
    if (!byName.has(name)) {
      const rec = {
        id: uid(),
        name,
        role: 'Belirtilmedi',
        gender: 'Belirtilmedi',
        ageRange: '',
        notes: '',
        pitch: null,
        pitchAt: null
      };
      m.speakers.push(rec);
      byName.set(name, rec);
    }
  }
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
  const ch = audio.getChannelData(0);
  ensureSpeakers(m);
  for (const sp of m.speakers) {
    const segs = speakerSegments(m, sp.name).slice(0, 12);
    const vals = [];
    for (const sg of segs) {
      const st = secondsFromTimecode(sg.start);
      const en = secondsFromTimecode(sg.end);
      // Süresi olmayan bölümde de ölçüm yapılabilir: başlangıçtan pencere alınır.
      const mid = en > st ? Math.floor(((st + en) / 2) * sr) : Math.floor(st * sr) + Math.floor(sr * 0.2);
      const win = ch.subarray(Math.max(0, mid - Math.floor(sr * 0.2)), Math.min(ch.length, mid + Math.floor(sr * 0.2)));
      const f = detectPitchHz(win, sr);
      if (f) vals.push(f);
    }
    if (vals.length) {
      vals.sort((a, b) => a - b);
      sp.pitch = vals[Math.floor(vals.length / 2)];
      sp.pitchSamples = vals.length;
      sp.pitchAt = new Date().toISOString();
    } else {
      sp.pitch = null;
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
  // Kanallar örnek düzeyinde birleştirilir; kanal dengesi ayrı ölçülür.
  const chCount = audio.numberOfChannels;
  const len = audio.length;
  const mono = new Float32Array(len);
  for (let ch = 0; ch < chCount; ch++) {
    const d = audio.getChannelData(ch);
    for (let i = 0; i < len; i++) mono[i] += d[i] / chCount;
  }
  const lv = analyzeLevels(mono, audio.sampleRate);
  // Stereo ise kanal dengesi, faz ilişkisi ve DC kayması da ölçülür.
  const stereo = chCount === 2 ? analyzeStereo(audio.getChannelData(0), audio.getChannelData(1), audio.sampleRate) : null;
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
  logEvent(m, 'Seviye ölçümü', `Tepe ${lv.peakDb.toFixed(1)} dBFS · RMS ${lv.rmsDb.toFixed(1)} dBFS · kırpılma %${(lv.clippedRatio * 100).toFixed(3)}`);
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
  const data = audio.getChannelData(0);
  const st = secondsFromTimecode(s.start);
  const en = secondsFromTimecode(s.end);
  const stats = analyzeSilence(data, sr, st, en);
  await ctx.close();
  if (!stats.ok) {
    showToast('Ölçüm için geçerli bir zaman aralığı gerekir.');
    return;
  }
  s.silence = stats;
  logEvent(m, 'Sessizlik ölçümü', `Bölüm ${index + 1}: %${Math.round(stats.ratio * 100)} sessiz (${stats.silentSec.toFixed(1)} sn)`);
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

// Konuşmacı paneli: her konuşmacı için rol, cinsiyet, yaş aralığı, not ve
// ölçülen perde. Bu bilgiler rapora "Konuşmacılar" tablosu olarak akar.
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
      const roleOpts = SPEAKER_ROLES.map(
        (r) => `<option value="${esc(r)}" ${s.role === r ? 'selected' : ''}>${esc(r)}</option>`
      ).join('');
      const genOpts = SPEAKER_GENDERS.map(
        (r) => `<option value="${esc(r)}" ${s.gender === r ? 'selected' : ''}>${esc(r)}</option>`
      ).join('');
      return `<div class="spk-card" data-spk-card="${esc(s.id)}">
      <div class="seg-row2">
        <div class="seg-field"><label>Konuşmacı etiketi</label><input data-spk="${esc(s.id)}" data-spk-key="name" value="${esc(s.name)}"></div>
        <div class="seg-field"><label>Rol</label><select data-spk="${esc(s.id)}" data-spk-key="role">${roleOpts}</select></div>
      </div>
      <div class="seg-row2">
        <div class="seg-field"><label>Cinsiyet (uzman beyanı)</label><select data-spk="${esc(s.id)}" data-spk-key="gender">${genOpts}</select></div>
        <div class="seg-field"><label>Yaş aralığı</label><input data-spk="${esc(s.id)}" data-spk-key="ageRange" value="${esc(s.ageRange || '')}" placeholder="Örn. 30-40"></div>
      </div>
      <div class="seg-field"><label>Not / gözlem</label><input data-spk="${esc(s.id)}" data-spk-key="notes" value="${esc(s.notes || '')}" placeholder="Örn. aksanlı, kısık ses"></div>
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
  ['approved', 'Onaylandı'],
  ['inaudible', 'Anlaşılmadı'],
  ['relisten', 'Yeniden dinlenecek']
];
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
function segFilter(m) {
  return m.uiFilter || 'all';
}
function segMatchesFilter(s, filter) {
  const r = segReview(s);
  if (filter === 'all') return true;
  if (filter === 'pending') return !isReviewed(s);
  return r === filter;
}
function segCounts(m) {
  const segs = m.segments || [];
  const c = { all: segs.length, pending: 0, approved: 0, inaudible: 0, relisten: 0 };
  for (const s of segs) {
    const r = segReview(s);
    if (r === 'approved') c.approved++;
    else if (r === 'inaudible') c.inaudible++;
    else if (r === 'relisten') c.relisten++;
    if (!isReviewed(s)) c.pending++;
  }
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
function segItemHtml(m, s, i, prev) {
  const rev = segReview(s);
  const halluc = isHallucination(s.text);
  const spk =
    s.speaker && s.speaker !== 'Belirtilmedi'
      ? `<span class="badge spk" title="Konuşmacı">${esc(s.speaker)}</span>`
      : '';
  const state =
    rev === 'approved'
      ? '<span class="badge done">Onaylandı</span>'
      : rev === 'inaudible'
        ? '<span class="badge warn">Anlaşılmadı</span>'
        : rev === 'relisten'
          ? '<span class="badge again">Yeniden</span>'
          : '<span class="badge">Bekliyor</span>';
  // Öneri varsa listede görünmeli; yoksa bilirkişi hangi bölümde bekleyen
  // öneri olduğunu ancak tek tek gezinerek bulabilir.
  const propBadge = s.proposal
    ? `<span class="badge prop" title="İkinci göz önerisi: ${esc((s.proposal.by || '') + ' — ' + (s.proposal.text || ''))}">Öneri</span>`
    : '';
  return `<div class="seg-item st-${rev} ${halluc ? 'is-empty' : ''} ${s.proposal ? 'has-proposal' : ''}" data-seg-item="${i}" role="button" tabindex="0">
    <span class="seg-no">${i + 1}</span>
    <span class="seg-time">${esc(s.start || '—')}</span>
    <span class="seg-text">${esc((s.text || '').trim()) || '(metin yok)'}</span>
    <span class="seg-badges">${spk}${propBadge}${segPriorityBadge(s, prev)}${state}</span>
  </div>`;
}
function segListHtml(m) {
  const segs = m.segments || [];
  if (!segs.length) return '<div class="seg-empty-note">Henüz bölüm yok. "Çözümle" veya "＋ Bölüm" ile başlayın.</div>';
  const filter = segFilter(m);
  const rows = segs.map((s, i) => ({ s, i })).filter((x) => segMatchesFilter(x.s, filter));
  if (!rows.length) return '<div class="seg-empty-note">Bu filtreye uyan bölüm yok.</div>';
  return rows.map(({ s, i }) => segItemHtml(m, s, i, segs[i - 1])).join('');
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
  const tmp = document.createElement('div');
  tmp.innerHTML = segItemHtml(m, s, i, m.segments[i - 1]);
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
  if (!st || !st.ok) return '';
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
  const silence = s.silence && s.silence.ok ? `sessizlik %${Math.round(s.silence.ratio * 100)}` : '';

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
    `<button class="mini-button tiny" data-split-seg="${i}" title="Oynatıcı konumundan böl">buradan böl</button>`,
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
  return `
  <div class="sd-head">
    <span class="sd-idx">Bölüm ${i + 1}<span class="sd-of"> / ${segs.length}</span></span>
    <span class="sd-nav">
      <button class="seg-tool" data-seg-nav="prev" title="Önceki bölüm (↑)">↑</button>
      <button class="seg-tool" data-seg-nav="next" title="Sonraki bölüm (↓)">↓</button>
      <button class="seg-tool play-main ${isPlaying ? 'on' : ''}" data-play-active="1" title="Bu bölümü dinle / duraklat (Boşluk)">${isPlaying ? '⏸' : '▶'} Dinle</button>
      <button class="seg-tool" data-stop-active="1" title="Durdur ve başa dön" ${canStop ? '' : 'disabled'}>⏹</button>
    </span>
  </div>

  ${proposalBandHtml(s, i)}

  ${
    notes.length || silence
      ? `<div class="sd-notes">${halluc ? '<span class="sn bad">anlamlı metin yok</span>' : ''}${rep ? '<span class="sn warn">model tekrarı</span>' : ''}${silence ? `<span class="sn">${esc(silence)}</span>` : ''}${pr.score >= 15 ? `<span class="sn info" title="${esc(pr.reasons.join(', '))}">öncelik ${pr.score >= 40 ? 'yüksek' : pr.score >= 20 ? 'orta' : 'düşük'}</span>` : ''}</div>`
      : ''
  }

  <div class="sd-body">
    <div class="sd-left">
      <div class="sd-wave">
        <div class="sd-wave-bar">
          <span class="sd-wave-hint">Sınırları sürükle · tekerlek: zoom</span>
          <span class="sd-zoom" data-sd-zoom-span>±0,5 sn</span>
          <button class="seg-tool" data-sd-zoom="fit" title="Bölüme sığdır">Sığdır</button>
        </div>
        <canvas class="sd-wave-canvas" id="sdwave-${esc(m.id)}" width="900" height="88" aria-label="Bölüm dalga formu — başlangıç ve bitiş sınırlarını sürükleyin"></canvas>
      </div>
      <div class="sd-times">
        <label class="sd-time"><span>Başlangıç</span><input class="time-input" data-seg="${i}" data-key="start" value="${esc(s.start || '')}"></label>
        <label class="sd-time"><span>Bitiş</span><input class="time-input" data-seg="${i}" data-key="end" value="${esc(s.end || '')}"></label>
        <label class="sd-time sd-time-dur"><span>Süre</span><output class="sd-dur">${esc(fmtShort(Math.max(0, secondsFromTimecode(s.end) - secondsFromTimecode(s.start))))}</output></label>
      </div>
      <div class="sd-meta">
        <label class="sd-field"><span>Konuşmacı</span><input data-seg="${i}" data-key="speaker" list="spk-options-${esc(m.id)}" value="${esc(s.speaker || '')}" placeholder="Konuşmacı"></label>
        <label class="sd-field"><span>Kontrol</span><select data-seg="${i}" data-key="review" data-state="${rev}">${opts}</select></label>
      </div>
      <div class="sd-obs">${obsBtns}</div>
    </div>
    <div class="sd-right">
      <div class="karaoke" id="karaoke-${esc(m.id)}" aria-live="polite" hidden></div>
      <div class="sd-text">
        <textarea data-seg="${i}" data-key="text" placeholder="Kaydı dinleyerek metni doğrulayın ve düzeltin.">${esc(s.text || '')}</textarea>
        <div class="quick-insert" role="group" aria-label="Hızlı metin ekle">
          ${QUICK_TAGS.map((t) => `<button class="quick-tag" data-quick-tag="${i}|${esc(t.text)}" title="${esc(t.hint)}">${esc(t.label)}</button>`).join('')}
          <button class="quick-tag quick-tag-clear" data-quick-clear="${i}" title="Metni temizle">Temizle</button>
        </div>
      </div>
    </div>
  </div>

  <div class="sd-actions">
    <button class="mini-button primary" data-approve-seg="${i}" title="Onayla ve sonraki bölüme geç (Enter)">✓ Onayla →</button>
    <button class="mini-button" data-review-set="${i}|yeniden">Yeniden dinle</button>
    <button class="mini-button" data-review-set="${i}|anlasilmadi">Anlaşılmadı</button>
    <span class="sd-ops">${opsBtns}</span>
  </div>`;
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
function attachSegWave(m, index) {
  const canvas = $(`#sdwave-${CSS.escape(m.id)}`);
  if (!canvas) return;
  const s = (m.segments || [])[index];
  if (!s) return;
  const dur = Number(m.duration) || 0;
  const card = canvas.closest('.audio-card');
  const player = card?.querySelector('audio');

  // Görünüm penceresi (bölüm ±0,5 sn); bölüm başına saklanır.
  const view = () => {
    if (m.__sdZoom && m.__sdZoom.index === index && m.__sdZoom.materialId === m.id) return m.__sdZoom;
    const a0 = Math.max(0, secondsFromTimecode(s.start) - 0.5);
    const b0 = Math.min(dur || secondsFromTimecode(s.end) + 0.5, secondsFromTimecode(s.end) + 0.5);
    m.__sdZoom = { materialId: m.id, index, a: a0, b: Math.max(a0 + 0.05, b0) };
    return m.__sdZoom;
  };

  const draw = () => {
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

    const zs = canvas.closest('.sd-wave')?.querySelector('[data-sd-zoom-span]');
    if (zs) zs.textContent = `±${((v.b - v.a) / 2).toFixed(1).replace('.', ',')} sn`;
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
    const a = root.querySelector(`[data-seg="${index}"][data-key="start"]`);
    const b = root.querySelector(`[data-seg="${index}"][data-key="end"]`);
    if (a) a.value = s.start || '';
    if (b) b.value = s.end || '';
    const d = root.querySelector('.sd-dur');
    if (d) d.textContent = fmtShort(Math.max(0, secondsFromTimecode(s.end) - secondsFromTimecode(s.start)));
  };

  const commit = (field) => {
    persist();
    syncFields();
    updateSegListItem(m, index);
    draw();
  };

  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const { t } = hitTime(ev);
    const edge = nearEdge(t);
    if (edge) {
      drag = edge;
      canvas.setPointerCapture?.(ev.pointerId);
      canvas.style.cursor = 'ew-resize';
      return;
    }
    // Ortaya tıklandı: hangi sınıra daha yakınsa onu taşı.
    const st = secondsFromTimecode(s.start),
      en = secondsFromTimecode(s.end);
    const field = Math.abs(t - st) <= Math.abs(t - en) ? 'start' : 'end';
    const other = field === 'start' ? en : st;
    // Sınırlar çakışmasın (en az 0,1 sn aralık).
    if (field === 'start' && t >= other - 0.1) return;
    if (field === 'end' && t <= other + 0.1) return;
    s[field] = timecode(t);
    commit(field);
    showToast(`${field === 'start' ? 'Başlangıç' : 'Bitiş'}: ${s[field]}`);
    if (player && t >= st && t <= en) {
      try {
        player.currentTime = t;
      } catch (e) {}
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
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
      const { t, ratio } = hitTime(ev);
      const v = view();
      const factor = ev.deltaY < 0 ? 0.8 : 1.25;
      let span = Math.max(0.05, Math.min(dur || 3600, (v.b - v.a) * factor));
      let a = t - ratio * span,
        b = a + span;
      if (a < 0) {
        a = 0;
        b = span;
      }
      if (dur && b > dur) {
        b = dur;
        a = Math.max(0, dur - span);
      }
      v.a = a;
      v.b = b;
      draw();
    },
    { passive: false }
  );
  const fit = () => {
    m.__sdZoom = null;
    draw();
  };
  canvas.closest('.sd-wave')?.querySelector('[data-sd-zoom="fit"]')?.addEventListener('click', fit);
  if (player) {
    const ph = () => draw();
    player.addEventListener('timeupdate', ph);
    player.addEventListener('seeked', ph);
  }
  draw();
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
  const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  attachSegWave(m, idx);
}
function renderSegments(m, card) {
  const root = $(`#segments-${CSS.escape(m.id)}`, card || document);
  if (!root) return;
  const segs = m.segments || [];
  const counts = segCounts(m);
  const reviewed = counts.approved + counts.inaudible;
  const pct = segs.length ? Math.round((reviewed / segs.length) * 100) : 0;
  const filter = segFilter(m);
  const chips = SEG_FILTERS.map(
    ([k, label]) =>
      `<button class="filter-chip ${filter === k ? 'on' : ''}" data-seg-filter="${k}">${label} <span class="n">${counts[k]}</span></button>`
  ).join('');
  const spkOptions = (m.speakers || []).map((sp) => sp.label).filter(Boolean);
  root.innerHTML = `<div class="transcript-toolbar compact-bar">
      <div class="group"><span>Hız</span>${PLAYBACK_SPEEDS.map((sp) => `<button class="seg-tool speed-tool ${(m.playbackRate || 1) === sp ? 'on' : ''}" data-seg-speed="${sp}">${sp}×</button>`).join('')}</div>
      <div class="tb-sep"></div>
      <div class="tb-filters">${chips}</div>
      <div class="tb-spacer"></div>
      <div class="tb-progress" title="${reviewed}/${segs.length} denetlendi"><div class="bar"><span style="width:${pct}%"></span></div><small>%${pct}</small></div>
      <div class="group tb-more"><button class="seg-tool" data-jump-prio="1" title="En yüksek inceleme öncelikli bölüme git">⚠</button><button class="seg-tool" data-paragraph="1" title="Paragraf oluştur">¶</button><button class="seg-tool" data-terms="1" title="Terim tutarlılığı">Aa</button></div>
    </div>
    <div id="term-panel-${esc(m.id)}" class="term-panel" hidden></div>
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
function scrollListToItem(list, el) {
  if (!list || !el) return;
  const lt = list.getBoundingClientRect();
  const et = el.getBoundingClientRect();
  if (et.top < lt.top) list.scrollTop -= lt.top - et.top;
  else if (et.bottom > lt.bottom) list.scrollTop += et.bottom - lt.bottom;
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
  const order = segs.map((s, i) => i).filter((i) => segMatchesFilter(segs[i], filter));
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
  const s = m.segments?.[m.activeSeg];
  if (!s) return;
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  if (!card) return;
  playSegmentRange(card, m, s, m.activeSeg);
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
  // Bitiş sınırı YOK: kayıt sonuna kadar çalar.
  if (player.__segStop) {
    player.__segStop.stopAt = null;
    player.__segStop.materialId = m.id;
    player.__segStop.index = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  }
  segPlayback = { materialId: m.id, index: Number.isInteger(m.activeSeg) ? m.activeSeg : 0, playing: true, atEnd: false };
  // Takip kapalıysa otomatik aç: film gibi izleme ana oynatın amacıdır.
  if (!followState.on) setFollow(true);
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
  s.review = 'approved';
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
  const next = Math.min(segs.length - 1, i + 1);
  m.activeSeg = next;
  setActiveSegment(m, next);
  if ($('#view-report').classList.contains('active')) renderReport();
  showToast(`Bölüm ${i + 1} onaylandı. Şimdi ${next + 1}. bölüm.`);
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
  // İlerleme artık araç çubuğunun içinde (.tb-progress); eski .seg-progress
  // sınıfı da desteklenir.
  const bar = root.querySelector('.tb-progress .bar span') || root.querySelector('.seg-progress .bar span');
  if (bar) bar.style.width = pct + '%';
  const lbl = root.querySelector('.tb-progress small') || root.querySelector('.seg-progress small');
  if (lbl) lbl.textContent = `%${pct}`;
  const tip = root.querySelector('.tb-progress');
  if (tip) tip.title = `${reviewed}/${segs.length} denetlendi`;
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
  // Böl / birleştir kısayolları: uzman kaydı dinlerken elleri klavyede kalır.
  if ((e.key === 'l' || e.key === 'L') && !typing) {
    // Kayıt listesini aç/kapat (çalışma modundan çıkar).
    setWorkspace(!document.body.classList.contains('ws-mode'));
    e.preventDefault();
    return true;
  }
  if ((e.key === 'f' || e.key === 'F') && !typing) {
    setFollow(!followState.on);
    showToast(followState.on ? 'Takip açık.' : 'Takip kapalı.');
    e.preventDefault();
    return true;
  }
  if ((e.key === 'w' || e.key === 'W') && !typing) {
    setWorkspace(!document.body.classList.contains('ws-mode'));
    e.preventDefault();
    return true;
  }
  if ((e.key === 'b' || e.key === 'B') && !typing) {
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
  s[field] = timecode(next);
  if (field === 'start' && secondsFromTimecode(s.end) < next) s.end = s[field];
  if (field === 'end' && secondsFromTimecode(s.start) > next) s.start = s[field];
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
      if (mm) renderKaraoke(mm, st.index);
    }
    if (st.stopAt != null && player.currentTime >= st.stopAt - 0.01) {
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
let workspaceDeclined = false;
// Takip modu durumu (dosya bazlı saklanır: case.followMode).
const followState = { on: false };
function setFollow(on) {
  followState.on = !!on;
  document.body.classList.toggle('follow-on', followState.on);
  const c = currentCase();
  if (c) {
    c.followMode = followState.on;
    persist();
  }
  refreshFollowButtons();
  if (followState.on) startFollow(); else stopFollow();
}
function refreshFollowButtons() {
  document.querySelectorAll('[data-follow-toggle]').forEach((b) => {
    b.classList.toggle('on', followState.on);
    b.textContent = followState.on ? '⏸ Takibi bırak' : '▶ Takip et';
    b.title = followState.on ? 'Otomatik takibi durdur' : 'Çalarken bölümleri otomatik izle (F)';
  });
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
function followTick() {
  if (!followState.on) return;
  const m = activeMaterial();
  if (!m) return;
  const segs = m.segments || [];
  if (!segs.length) return;
  const card = document.querySelector('.audio-card');
  const player = card && card.querySelector('audio');
  if (!player) return;
  if (player.paused) return; // duraklatınca takip bekler, konum korunur
  const t = player.currentTime;
  // t'yi içeren bölümü bul (yoksa en yakın sonraki).
  let idx = -1;
  for (let i = 0; i < segs.length; i++) {
    const a = secondsFromTimecode(segs[i].start);
    const b = secondsFromTimecode(segs[i].end);
    if (t >= a && t < (b > a ? b : a + 0.01)) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    for (let i = 0; i < segs.length; i++) {
      if (secondsFromTimecode(segs[i].start) > t) {
        idx = i;
        break;
      }
    }
  }
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
  setTxt('.seg-detail-head .idx', `Bölüm ${idx + 1} / ${segs.length}`);
  const startEl = q('.seg-times .st-item:nth-child(1) .time-input');
  if (startEl && startEl.value !== (s.start || '')) startEl.value = s.start || '';
  const endEl = q('.seg-times .st-item:nth-child(2) .time-input');
  if (endEl && endEl.value !== (s.end || '')) endEl.value = s.end || '';
  setVal('.seg-meta-row .sm-item:nth-child(1) input', s.speaker || '');
  setVal('.seg-text-wrap textarea', s.text || '');
  const sel = q('.seg-meta-row .sm-item:nth-child(2) select');
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
  ['data-history', 'data-silence', 'data-split-seg', 'data-merge-next', 'data-delete-seg', 'data-approve-seg'].forEach((k) => {
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
function followKaraoke(m, idx, t) {
  const box = $(`#karaoke-${CSS.escape(m.id)}`);
  if (!box) return;
  const s = m.segments[idx];
  if (!s || !s.text || isHallucination(s.text)) {
    box.hidden = true;
    return;
  }
  const words = s.words && s.words.length ? s.words : null;
  if (!words) {
    // Kelime zamanı yok: bölüm aralığına göre okunma oranını göster.
    const a = secondsFromTimecode(s.start);
    const b = secondsFromTimecode(s.end);
    const ratio = b > a ? Math.max(0, Math.min(1, (t - a) / (b - a))) : 1;
    const chars = Math.floor(ratio * s.text.length);
    box.hidden = false;
    box.innerHTML = `<span class="kk-done">${esc(s.text.slice(0, chars))}</span><span class="kk-rest">${esc(s.text.slice(chars))}</span>`;
    return;
  }
  box.hidden = false;
  box.innerHTML = words
    .map((w) => {
      const wa = secondsFromTimecode(w.s);
      const wb = secondsFromTimecode(w.e);
      const on = t >= wa && t < wb + 0.001;
      const done = t >= wb;
      return `<span class="${on ? 'on' : done ? 'done' : ''}">${esc(w.w)}</span>`;
    })
    .join(' ');
}
// Karaoke vurgulaması: çalma sırasında o an konuşulan kelime (kelime zamanı
// varsa) ya da bölüm metni vurgulanır. Kelime zamanı yoksa bölüm aralığına göre
// tüm metin "okunuyor" olarak işaretlenir; uydurma zamanlama yapılmaz.
function renderKaraoke(m, index) {
  const box = $(`#karaoke-${CSS.escape(m.id)}`);
  if (!box) return;
  const s = (m.segments || [])[index];
  if (!s || !s.text || isHallucination(s.text)) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const card = box.closest('.audio-card');
  const player = card?.querySelector('audio');
  const now = player ? player.currentTime : null;
  const playing = segPlayback.materialId === m.id && segPlayback.index === index && segPlayback.playing;
  if (!playing || now == null) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const words =
    s.words && s.words.length
      ? s.words
      : String(s.text)
          .split(/\s+/)
          .map((w) => ({ w, s: null, e: null }));
  box.hidden = false;
  box.innerHTML = words
    .map((w) => {
      let active = false;
      if (w.s != null) {
        const a = secondsFromTimecode(w.s),
          b = secondsFromTimecode(w.e);
        active = now >= a && now < b + 0.001;
      }
      return `<span class="${active ? 'on' : ''}">${esc(w.w)}</span>`;
    })
    .join(' ');
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
    // Duraklatılmış konumdan devam et.
    player.__segStop.stopAt = end;
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
  player.__segStop.stopAt = end > start ? end : null;
  player.__segStop.materialId = m.id;
  player.__segStop.index = index;
  segPlayback = { materialId: m.id, index, playing: true, atEnd: false };
  player.play().catch(() => {});
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
function splitSegmentAtPlayer(m, index) {
  const card = $(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  if (!card) return;
  const player = card.querySelector('audio');
  const segs = m.segments || [];
  const s = segs[index];
  if (!s || !player) return;
  const cut = player.currentTime;
  const a = secondsFromTimecode(s.start),
    b = secondsFromTimecode(s.end);
  if (!(cut > a + 0.2 && cut < b - 0.2)) {
    showToast('Bölmek için oynatıcıyı bölümün ortasına getirin.');
    return;
  }
  const left = { ...s, id: newId('sg'), end: timecode(cut), history: [] };
  const right = { ...s, id: newId('sg'), start: timecode(cut), history: [] };
  segs.splice(index, 1, left, right);
  m.activeSeg = index;
  segPlayback = { materialId: null, index: null, playing: false, atEnd: false, stopAt: null };
  persist();
  renderSegments(m, card);
  renderOverview();
  // Yeni oluşan sağ bölümü görünür alana getir; uzman kaldığı yerden devam eder.
  const item = card.querySelector(`#seg-list-${CSS.escape(m.id)} .seg-item[data-seg-item="${index + 1}"]`);
  if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  showToast(`Bölüm ${index + 1} ikiye ayrıldı (${timecode(cut)}). Yeni bölüm: ${index + 2}.`);
}
function mergeSegmentWithNext(m, index) {
  const segs = m.segments || [];
  const s = segs[index],
    n = segs[index + 1];
  if (!s || !n) {
    showToast('Birleştirilecek sonraki bölüm yok.');
    return;
  }
  s.end = n.end;
  if ((n.text || '').trim()) {
    const prev = s.text;
    applyTextEdit(s, (s.text || '') + (s.text ? ' ' : '') + n.text);
    pushSegmentHistory(s, prev);
  }
  s.review = 'pending';
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
function paragraphize(m) {
  const segs = m.segments || [];
  if (segs.length < 2) {
    showToast('Paragraf oluşturmak için en az iki bölüm gerekir.');
    return;
  }
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
async function sha256(blob) {
  try {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'Hesaplanamadı (tarayıcı güvenlik kısıtı)';
  }
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
    logEvent(m, 'Kayıt eklendi', `${file.name} · ${file.size} bayt · SHA-256 hesaplandı`);
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
const REVIEW_STATES = {
  approved: { label: 'Onaylandı', cls: 'good' },
  pending: { label: 'Kontrol bekliyor', cls: '' },
  inaudible: { label: 'Anlaşılmadı', cls: 'warn' },
  relisten: { label: 'Yeniden dinlenecek', cls: 'warn' }
};
// v2 anahtar → v3 kod. Okuma sırasında uygulanır; yazma her zaman v3 yazar.
const REVIEW_LEGACY = {
  onaylandi: 'approved',
  bekliyor: 'pending',
  anlasilmadi: 'inaudible',
  yeniden: 'relisten'
};
function segReview(s) {
  const raw = s.review || (s.checked ? 'approved' : 'pending');
  return REVIEW_STATES[raw] ? raw : REVIEW_LEGACY[raw] || 'pending';
}
function isReviewed(s) {
  const r = segReview(s);
  return r === 'approved' || r === 'inaudible';
}
function reviewLabel(s) {
  return REVIEW_STATES[segReview(s)].label;
}
// Metin geçmişi, her tuş vuruşunda değil düzenleme oturumu başına bir kez tutulur.
// Focus anında metnin anlık görüntüsü saklanır, blur anında gerçekten değiştiyse
// geçmişe eklenir. Böylece geçmiş gerçek önceki sürümleri gösterir, tuş tuş dolmaz.
function snapshotSegmentText(s) {
  s.__editSnapshot = s.text || '';
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
// Bölüm metnini yazar; sayaç artırmaz (sayaç düzenleme oturumu başına bir kez
// markTextEdited ile işaretlenir, bkz. aşağısı).
function setSegmentText(s, next) {
  const v = next == null ? '' : String(next);
  if ((s.text || '') === v) return false;
  s.text = v;
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
  if (s.history.length > 20) s.history.shift();
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
const HALLUCINATION_RE =
  /^[\s(]*[(\[]?\s*(konuşma|müzik|jenerik|kalabalık|nefes|alkış|sessizlik|tutaklar|beep|music|applause|silence|blank|no speech)[\s\S]*?[)\]]?\s*$/i;
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
  const ok = now === m.sha256;
  m.lastVerify = { at: new Date().toISOString(), ok, hash: now };
  logEvent(m, 'SHA-256 doğrulama', ok ? 'Özet eşleşti; dosya değişmemiş.' : `Özet farklı! Beklenen ${m.sha256}, bulunan ${now}`);
  persist();
  renderAudioList();
  showToast(ok ? 'SHA-256 doğrulandı; dosya değişmemiş.' : 'Uyarı: dosya özeti değişmiş görünüyor!');
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
        text
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
        text
      });
    }
  }
  return out;
}
async function transcribeWindow(pipe, window, offsetSeconds) {
  // Zaman damgası merdiveni: bazı Whisper ONNX modelleri `return_timestamps`
  // seçeneklerini desteklemez veya bozuk çıktı üretir. Sırayla denenir ve ilk
  // ANLAMLI sonuç kullanılır. Çöp çıktı hiçbir zaman kabul edilmez.
  // Türkçe dil ve transkripsiyon görevi sabittir.
  const base = { language: 'turkish', task: 'transcribe' };
  const attempts = [
    { ...base, return_timestamps: true, no_repeat_ngram_size: 3, repetition_penalty: 1.2 },
    { ...base, return_timestamps: true },
    { ...base }
  ];
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
async function transcribe(id) {
  const c = currentCase(),
    m = c.materials.find((x) => x.id === id);
  if (!m) return;
  const blob = await getAudioBlob(c, m);
  if (!blob) {
    showToast('Ses dosyası yerel depoda bulunamadı. Yeniden ekleyin.');
    return;
  }
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
        found = await transcribeWindow(pipe, window, startSeconds);
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
  start = start || '00:00:00'; // Yeni bölüme makul bir bitiş ver: oynatıcı konumundan 5 sn, kayıt sonunu aşmaz.
  const stSec = secondsFromTimecode(start);
  const durSec = Number(m.duration) || 0;
  let endSec = stSec + 5;
  if (durSec > 0) endSec = Math.min(endSec, durSec);
  const end = timecode(endSec > stSec ? endSec : stSec);
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
      out.push([
        sp.name,
        sp.role || 'Belirtilmedi',
        sp.gender || 'Belirtilmedi',
        sp.ageRange || '—',
        sp.pitch ? `${Math.round(sp.pitch)} Hz (${pitchHint(sp.pitch)})` : 'Ölçülmedi',
        `${dur}${note ? ' · ' + note : ''}`
      ]);
    }
  }
  return out;
}
function segObsText(s) {
  const o = s.obs || {};
  const keys = Object.keys(o).filter((k) => o[k]);
  if (!keys.length) return '—';
  return keys.map((k) => REPORT_TEXT.obsLabels[k] || k).join(', ');
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
  const silenceMeasured = segs.filter((s) => s.silence && s.silence.ok).length;
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
  const werMeasured = mats.filter((m) => {
    const ref = m.expectedText || (m.referenceSegments || []).map((s) => s.text || '').join(' ');
    return ref && String(ref).trim() && (m.segments || []).some((s) => String(s.text || '').trim());
  }).length;
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
function renderReport() {
  const c = currentCase();
  if (!c) return;
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
        html += `<table class="paper-table"><thead><tr>${REPORT_TEXT.segmentHeadersObs.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${m.segments.map((s) => `<tr><td>${esc(s.start || REPORT_TEXT.timeDash)} – ${esc(s.end || REPORT_TEXT.timeDash)}</td><td>${esc(s.speaker || REPORT_TEXT.emptySpeaker)}</td><td>${esc(s.text || '')}</td><td>${reviewLabel(s)}</td><td>${esc(segObsText(s))}</td></tr>`).join('')}</tbody></table>`;
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
            `${s.start || REPORT_TEXT.timeDash} – ${s.end || REPORT_TEXT.timeDash}`,
            s.speaker || REPORT_TEXT.emptySpeaker,
            s.text || '',
            reviewLabel(s),
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
          `${seg.start || REPORT_TEXT.timeDash} – ${seg.end || REPORT_TEXT.timeDash}`,
          seg.speaker || REPORT_TEXT.emptySpeaker,
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
  if (!pack || typeof pack !== 'object') return 'Çalışma paketi okunamadı.';
  if (pack.schema !== PROJECT_SCHEMA) return 'Çalışma paketi sürümü tanınmadı.';
  if (!pack.case || typeof pack.case !== 'object') return 'Çalışma paketinde dosya verisi yok.';
  return null;
}
// Paket içindeki ses girdilerini materyallere eşler. Girdi adı `${m.id}_...`
// biçimindedir; bu eşleme saf ve test edilebilirdir.
function matchAudioEntries(entryNames, materials) {
  const dirs = new Set(entryNames.filter((n) => n.endsWith('/')));
  const out = [];
  for (const m of materials || []) {
    const prefix = `audio/${m.id}_`;
    const entry = entryNames.find((path) => path.startsWith(prefix) && !dirs.has(path));
    if (entry) out.push({ materialId: m.id, entry });
  }
  return out;
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
    'Kim olarak dışa aktarıyorsunuz?',
    'Dosya bilgileri → İnceleme ekibi bölümünde "Şu an bu bilgisayarda çalışan" alanını doldurun. ' +
      'Bu bilgi olmadan yaptığınız düzeltmelerin kime ait olduğu sonradan çözülemez ve onayları geçersiz sayılır. ' +
      'Şimdi doldurmak ister misiniz? (Vazgeç derseniz yine de dışa aktarılır.)'
  );
}
async function exportProject() {
  const c = currentCase();
  if (!c) return;
  // Kimliği belirsiz paylaşım sonradan çözülemez; doğru anda sorulur.
  if (!(await ensureEditorIdentity())) {
    setCaseDrawer(true);
    showToast('Önce "Şu an bu bilgisayarda çalışan" alanını doldurun, sonra tekrar dışa aktarın.');
    return;
  }
  const zip = new JSZip();
  zip.file('case.json', JSON.stringify(buildProjectPack(c), null, 2));
  const assets = zip.folder('audio');
  for (const m of c.materials) {
    const blob = await getAudioBlob(c, m);
    if (blob) assets.file(`${m.id}_${safeName(m.name)}`, blob);
  }
  const out = await zip.generateAsync({ type: 'blob' });
  downloadBlob(out, `${safeName(c.fileNo || 'AKIS_Calisma_Dosyasi')}.akis`);
  showToast('AKİS çalışma dosyası dışa aktarıldı (.akis).');
}
// ---- Ekip çalışması: dosya birleştirme ---------------------------------
// İki bilirkişi aynı davada çalıştığında her biri kendi .akis dosyasında
// ilerler; sonra dosyalar birleştirilir. Birleştirme KİMLİK (id) ile yapılır:
// aynı bölüm iki tarafta da varsa metin çakışması sessizce EZİLMEZ, kullanıcıya
// gösterilir. Sunucu, hesap, internet gerekmez; dosya transferi yeterlidir.
// Bütünlük: paket içindeki her ses dosyasının SHA-256 özeti taşınır.
let pendingMerge = null; // { theirs, compare }

// Gönderilen .akis paketini okur; dosyayı uygulamaya EKLEMEZ.
async function readProjectPack(file) {
  if (!window.JSZip) throw new Error('Paket açma bileşeni yüklenemedi. Sayfayı yenileyin.');
  const zip = await JSZip.loadAsync(file);
  const meta = zip.file('case.json');
  if (!meta) throw new Error('Bu dosya bir AKİS çalışma paketi değil (case.json yok).');
  const pack = JSON.parse(await meta.async('string'));
  const err = validateProjectPack(pack);
  if (err) throw new Error(err);
  const theirs = normalizeCase(pack.case);
  return { zip, theirs, entryNames: Object.keys(zip.files) };
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
    row('Aynı kalan kayıt', sameMat),
    row('Yeni eklenecek bölüm', cmp.segments.added),
    row('Metni çakışan bölüm', cmp.segments.changed.length, cmp.segments.changed.length ? 'warn' : ''),
    row('Otomatik alınacak bölüm metni', cmp.segments.autoResolved),
    row('Alınacak ikinci göz önerisi', cmp.segments.proposals),
    row('Kontrol durumu ilerleyen bölüm', cmp.segments.reviewAdvanced),
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
    `<h3 class="merge-h3">Çakışan metinler (${cmp.conflicts.length})</h3>` +
    `<p class="merge-note">Aşağıdaki metinler iki tarafta da <b>elle düzenlenmiş</b> ya da farkın kaynağı bilinmiyor. Birleştirmede <b>bu dosyadaki metin korunur</b>; gelen metin kaybolmaz, işlem günlüğüne ve metin geçmişine yazılır. Karşı tarafın metnini istiyorsanız önce bu dosyada düzeltin, sonra tekrar birleştirin.</p>` +
    cmp.conflicts
      .slice(0, 20)
      .map((c) => {
        const head =
          c.kind === 'question-answer'
            ? `Soru cevabı · ${(c.questionId || '').slice(-6)}`
            : c.kind === 'case-field'
              ? `Dosya alanı · ${c.field || ''}`
              : c.kind === 'unattributed-approval'
                ? `Kaynağı tanımsız düzenleme · ${c.materialName || ''} · bölüm ${(c.segmentId || '').slice(-6)}`
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
  const { merged, applied, conflicts } = mergeCases(mine, theirs);

  // Gelen paketteki ses dosyalarını sakla (aynı kayıt id'si varsa zaten var).
  const myKeys = new Set((mine.materials || []).map((m) => blobKey(mine, m)));
  for (const { materialId, entry } of matchAudioEntries(entryNames, merged.materials || [])) {
    const key = `${mine.id}::${materialId}`;
    if (myKeys.has(key)) continue;
    const blob = await zip.file(entry).async('blob');
    const m = (merged.materials || []).find((x) => x.id === materialId);
    await storeBlob(key, new Blob([blob], { type: m?.mimeType || 'audio/wav' }));
  }

  // Birleşmiş dosyayı yerel dosyanın yerine koy (id korunur).
  merged.id = mine.id;
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
  showToast(
    `Birleştirildi: ${applied.length} değişiklik uygulandı` +
      (conflicts.length ? `, ${conflicts.length} çakışma bu dosyadaki metinle korundu (gelen metin geçmişe yazıldı).` : '.')
  );
}

async function importProject(file) {
  if (!window.JSZip) throw new Error('Çalışma paketi açma bileşeni yüklenemedi. İnternet bağlantısını kontrol edin.');
  const zip = await JSZip.loadAsync(file);
  const meta = zip.file('case.json');
  if (!meta) throw new Error('Dosya geçerli bir AKİS veya önceki MİHENK çalışma paketi değil.');
  const pack = JSON.parse(await meta.async('string'));
  const err = validateProjectPack(pack);
  if (err) throw new Error(err);
  const c = pack.case;
  c.id = uid();
  c.materials = c.materials || [];
  const entryNames = Object.keys(zip.files);
  for (const { materialId, entry } of matchAudioEntries(entryNames, c.materials)) {
    const m = c.materials.find((x) => x.id === materialId);
    const blob = await zip.file(entry).async('blob');
    const mime = m.type || 'audio/wav';
    await storeBlob(`${c.id}::${materialId}`, new Blob([blob], { type: mime }));
  }
  c.name = c.name || c.fileNo || 'İçe aktarılan dosya';
  appState.cases.push(c);
  appState.activeCaseId = c.id;
  persist();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  await renderAudioList();
  switchView('overview');
  showToast('Çalışma dosyası içe aktarıldı.');
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
// Çalışma modu: seçili kayıt tam ekranı kaplar. Yükleme alanı ve kayıt şeridi
// gizlenir; deşifre/analiz alanına mümkün olan en fazla yer kalır. Kayıtlar
// arasında önceki/sonraki ile geçilir, böylece moddan çıkmak gerekmez.
function setWorkspace(on) {
  document.body.classList.toggle('ws-mode', on);
  const bar = $('#workspaceBar');
  if (bar) bar.hidden = !on;
  if (on) {
    switchView('audio');
    updateWorkspaceBar();
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }
  // Gizliyken çizilmiş canvas'lar 0 genişlikte olur; mod açılınca yeniden çiz.
  if (on) {
    requestAnimationFrame(() => {
      const m = activeMaterial();
      if (!m) return;
      const cv = document.querySelector('canvas.wave-canvas');
      const pk = peakCache.get(m.id);
      if (cv && pk) drawWave(cv, pk, m);
    });
  }
}
function updateWorkspaceBar() {
  const c = currentCase();
  const m = activeMaterial();
  if (!c || !m) return;
  const idx = (c.materials || []).indexOf(m);
  const segs = m.segments || [];
  const checked = segs.filter((s) => isReviewed(s)).length;
  const t = $('#wsTitle');
  if (t) t.textContent = `${idx + 1}. ${m.name}`;
  const meta = $('#wsMeta');
  if (meta) meta.textContent = `${fmtShort(m.duration || 0)} · ${segs.length} bölüm · ${checked} denetlendi`;
  const prev = document.querySelector('[data-ws-nav="-1"]');
  const next = document.querySelector('[data-ws-nav="1"]');
  if (prev) prev.disabled = idx <= 0;
  if (next) next.disabled = idx >= (c.materials || []).length - 1;
}
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
      s2.review = 'pending';
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
          s2.review = val;
          s2.checked = val === 'approved';
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
    } else if (b.dataset.mainPlay !== undefined) {
      const mm = c.materials.find((x) => x.id === b.dataset.mainPlay);
      if (mm) playWholeRecording(mm);
    } else if (b.dataset.followToggle !== undefined) {
      setFollow(!followState.on);
      showToast(followState.on ? 'Takip açık: bölümler otomatik ilerleyecek.' : 'Takip kapalı.');
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
    } else if (b.dataset.mergeNext !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) mergeSegmentWithNext(m, Number(b.dataset.mergeNext));
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
    } else if (el.dataset.key === 'speaker') s.speaker = el.value;
    else s[el.dataset.key] = el.value;
    persist();
    updateSegListItem(m, Number(el.dataset.seg));
    refreshSegChips(m);
    renderOverview();
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
    const oldName = rec.name;
    rec[key] = el.value; // Etiket adı değişirse bölümlerdeki konuşmacı referansları da güncellenir.
    if (key === 'name' && el.value.trim() && el.value !== oldName) {
      for (const sg of m.segments || []) {
        if ((sg.speaker || '') === oldName) sg.speaker = el.value;
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
          rec[el.dataset.spkKey] = el.value;
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
    s.review = el.value;
    s.checked = el.value === 'approved';
    el.dataset.state = el.value;
    persist();
    updateSegListItem(m, i);
    refreshSegChips(m);
    renderOverview();
    if ($('#view-report').classList.contains('active')) renderReport();
  });
  $('#loadModelBtn').addEventListener('click', () => ensureModel().catch((e) => showToast(e.message)));
  const modelSelectEl = $('#modelSelect');
  if (modelSelectEl) modelSelectEl.addEventListener('change', () => updateModelBadge());
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
        showToast(`İçe aktarma başarısız: ${err.message}`);
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
  document.addEventListener('keydown', onGlobalSegKey);
  $('#settingsBtn').addEventListener('click', () => setSettingsDrawer(true));
$('#closeSettings').addEventListener('click', () => setSettingsDrawer(false));
$('#workspaceBtn').addEventListener('click', () => setWorkspace(true));
$('#wsListBtn').addEventListener('click', () => {
  setWorkspace(false);
  showToast('Kayıt listesi açık. Bir kayda tıklayınca çalışma moduna döner.');
});
$('#workspaceBackBtn').addEventListener('click', () => {
  // Kullanıcı bilinçli olarak listeye döndü; bu oturumda tekrar otomatik girme.
  workspaceDeclined = true;
  setWorkspace(false);
});
$$('[data-ws-nav]').forEach((b) =>
  b.addEventListener('click', () => {
    const c = currentCase();
    if (!c) return;
    const mats = c.materials || [];
    const idx = mats.indexOf(activeMaterial());
    const next = idx + Number(b.dataset.wsNav);
    if (next >= 0 && next < mats.length) {
      setActiveMaterial(mats[next].id);
      updateWorkspaceBar();
    }
  })
);
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
    // Çalışma modundan çık.
    if (document.body.classList.contains('ws-mode')) {
      setWorkspace(false);
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
  queueRunning = true;
  c.queueCancel = false;
  $('#startQueueBtn').disabled = true;
  $('#cancelQueueBtn').disabled = false;
  const t0 = Date.now();
  let done = 0;
  for (const m of pending) {
    if (c.queueCancel) break;
    try {
      await transcribe(m.id);
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
async function refreshStorage() {
  try {
    const scan = await scanModelCache();
    renderStorage(scan);
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
function applyRecommendation() {
  const rec = recommendModel();
  const sel = $('#modelSelect');
  if (sel) sel.value = rec.id;
  const el = $('#modelRecommendation');
  if (el) el.textContent = 'Öneri: ' + rec.why;
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

function init() {
  // Sürüm etiketini tek kaynaktan (APP_VERSION) yaz.
  const verEl = $('#appVersion');
  if (verEl) verEl.textContent = `AKİS • v${APP_VERSION} • Yerel sürüm`;
  // Görünüm tercihini uygula (index.html'deki satır içi betik ilk boyamayı
  // zaten yaptı; burada yalnız paneli çizip durumu tazeliyoruz).
  applyTheme();
  loadState();
  renderCaseSelect();
  populateCaseForm();
  populateQuestionsForm();
  renderOverview();
  setupEvents();
  renderQueue();
  try {
    if (localStorage.getItem('akis.focusMode') === '1') setFocusMode(true);
  } catch (e) {}
  $('#reportDate').value = currentCase().reportDate || dateToday();
  detectDevice().then((ok) => {
    const b = $('#deviceBadge');
    if (b) b.textContent = ok ? '● WebGPU hızlandırma kullanılabilir' : '● WebGPU yok · WASM (CPU) kullanılacak';
    applyRecommendation();
  });
  refreshStorage();
  restoreAudioUrls().then(() => renderAudioList());
}
init();
