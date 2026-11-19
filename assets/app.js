const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// TEK SÜRÜM KAYNAĞI. Arayüzdeki sürüm etiketi buradan okunur. Her sürüm
// güncellemesinde yalnızca bu satır ve CHANGELOG başlığı değiştirilir; belgeler
// bu numaraya göre hizalanır. Sürüm şeması: MAJOR.MINOR (bkz. docs/YOL_HARITASI.md).
const APP_VERSION = '2.26';
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
    'Kayıtta konuşan kişiler, uzmanın verdiği etiketlere göre aşağıda listelenmiştir. Etiketler ve öznitelikler uzman beyanına dayanır; uygulama konuşmacı kimliğini kendiliğinden tespit etmez. Perde değeri otokorelasyon yöntemiyle hesaplanan bir tahmindir ve kayıt koşullarına bağlıdır.',
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
  originHeading: 'KAYIT KÖKENİ VE TESLİM ZİNCİRİ',
  originIntro:
    'Kayıtların hangi ortamdan geldiği, kim tarafından ve ne zaman teslim edildiği aşağıda gösterilmiştir. Bu bilgiler uzman beyanına ve teslim tutanağına dayanır; uygulama ortamı kendiliğinden tespit etmez.',
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
const DEFAULT_METHOD = `İnceleme kapsamında tarafıma sunulan dijital ses dosyalarının dosya adları, biçimleri, boyutları, süreleri ve teknik özellikleri kaydedilir. Orijinal dosyanın içerik baytları değiştirilmeden uygulama depolamasında tutulur. Otomatik çözümleme için ses verisi tarayıcı belleğine alınarak işlenir; kaynak ses dosyası üzerinde düzenleme yapılmaz.

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
    localStorage.setItem(STORE_KEY, JSON.stringify(appState));
    $('#saveState').textContent = '● Yerel kayıt güncellendi';
  } catch (e) {
    $('#saveState').textContent = '● Kayıt alanı dolu';
    console.warn(e);
  }
}
function freshCase() {
  return {
    id: uid(),
    name: 'Yeni inceleme dosyası',
    reportType: 'hukuk',
    court: '',
    fileNo: '',
    assignmentDate: '',
    dueDate: '',
    assignmentDurationDays: '',
    plaintiff: '',
    plaintiffCounsel: '',
    defendant: '',
    defendantCounsel: '',
    subject: '',
    caseDate: '',
    inspectionDate: '',
    expertName: '',
    registryNo: '',
    expertField: '56.12 – Ses kayıtlarının metin hâline dönüştürülmesi',
    reportDate: dateToday(),
    assignmentScope: '',
    questions: [],
    methodText: DEFAULT_METHOD,
    limitationsText: '',
    conclusionText: '',
    materials: [],
    synthetic: false,
    createdAt: new Date().toISOString()
  };
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
    out.push({ text: t, at: h.at });
  }
  return out.length ? out : [{ text: '', at: hist[hist.length - 1].at }];
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
      stripDerivedFields(appState);
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
  if (name === 'case') populateCaseForm();
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
}
function renderQuestions() {
  const c = currentCase();
  if (!c) return;
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
function audioStatusZoneHtml(m) {
  const segs = m.segments || [];
  const checked = segs.filter((s) => isReviewed(s)).length;
  const status = m.status || 'Bekliyor';
  return `<div class="audio-card-top"><div class="audio-file-icon">♫</div><div class="audio-file-main"><b title="${esc(m.name)}">${esc(m.name)}</b><small>${esc(m.type || 'Ses dosyası')} · ${fmtSize(m.size)} · ${fmtShort(m.duration || 0)}</small></div><div class="audio-actions">${m.status === 'Çözümleme sürüyor' ? `<button class="mini-button danger" data-cancel="${esc(m.id)}">İptal et</button>` : `<button class="mini-button primary" data-transcribe="${esc(m.id)}">${segs.length ? 'Yeniden çözümle' : 'Çözümle'}</button>`}<button class="mini-button" data-manual="${esc(m.id)}">＋ Bölüm</button><button class="mini-button" data-remove-audio="${esc(m.id)}">Kaldır</button></div></div><div class="audio-meta"><span>SHA-256: <b>${esc(m.sha256 || 'Hesaplanmadı')}</b></span><span>Durum: <b>${esc(status)}</b></span><span>Kontrol: <b>${checked}/${segs.length}</b></span>${m.synthetic ? '<span><b>Kurgusal sentetik kayıt</b></span>' : ''}</div><div class="audio-meta tech-meta"><span>Codec: <b>${esc(m.tech?.codec || '—')}</b></span><span>Kanal: <b>${esc(fmtChannels(m.tech?.channels))}</b></span><span>Örnekleme: <b>${m.tech?.sampleRate ? esc(m.tech.sampleRate + ' Hz') : '—'}</b></span><span>Bit derinliği: <b>${m.tech?.bitDepth ? esc(m.tech.bitDepth + ' bit') : '—'}</b></span><span>Eklenme: <b>${esc(m.addedAt ? new Date(m.addedAt).toLocaleString('tr-TR') : '—')}</b></span></div>${m.lastVerify ? `<div class="warn-box ${m.lastVerify.ok ? 'verify-ok' : ''}">Son SHA-256 doğrulaması: ${esc(new Date(m.lastVerify.at).toLocaleString('tr-TR'))} · ${m.lastVerify.ok ? 'özet eşleşti (dosya değişmemiş)' : 'özet farklı (dosya değişmiş olabilir)'}</div>` : ''}${m.transcribedWithModel ? `<div class="audio-meta model-meta"><span>Çözümleyen model: <b>${esc(modelShortName(m.transcribedWithModel))}</b>${m.transcribedAt ? ` · ${esc(new Date(m.transcribedAt).toLocaleString('tr-TR'))}` : ''}</span></div>` : ''}<div class="evidence-actions"><button class="mini-button" data-verify="${esc(m.id)}">SHA-256 doğrula</button><button class="mini-button" data-log="${esc(m.id)}">İşlem günlüğü</button></div>${typeof m.progress === 'number' ? `<div class="progress-wrap"><div class="progress-bar"><span style="width:${m.progress}%"></span></div><small>Çözümleme ilerlemesi: %${m.progress}</small></div>` : ''}${m.hallucinationWarning ? `<div class="warn-box">${esc(m.hallucinationWarning)}</div>` : ''}${m.languageWarning ? `<div class="warn-box">${esc(m.languageWarning)}</div>` : ''}`;
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
  const segs = m.segments || [];
  const checked = segs.filter((s) => isReviewed(s)).length;
  const pct = segs.length ? Math.round((checked / segs.length) * 100) : 0;
  const c = currentCase();
  const active = !!(c && c.activeMaterialId === m.id);
  const status = m.status || 'Bekliyor';
  const stCls = /hata|boş|iptal/i.test(status) ? 'bad' : /Kontrol bekliyor|tamamlandı/i.test(status) ? 'good' : '';
  const prog = typeof m.progress === 'number' ? `%${m.progress}` : segs.length ? `%${pct}` : '—';
  return `<div class="material-row ${active ? 'is-active' : ''}" data-material-row="${esc(m.id)}" role="button" tabindex="0" aria-pressed="${active}">
    <span class="mr-index">${i + 1}</span>
    <span class="mr-name" title="${esc(m.name)}">${esc(m.name)}</span>
    <span class="mr-meta">${fmtShort(m.duration || 0)} · ${fmtSize(m.size)}</span>
    <span class="mr-status ${stCls}">${esc(status)}</span>
    <span class="mr-progress">${segs.length ? `${checked}/${segs.length} · ${prog}` : prog}</span>
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
  return `<div class="audio-status-zone" id="status-zone-${esc(m.id)}">${audioStatusZoneHtml(m)}</div><div class="audio-content-zone"><div class="wave-wrap"><canvas class="wave-canvas" id="wave-${esc(m.id)}" width="1200" height="96" aria-label="Ses dalga formu"></canvas><div class="wave-hint">Dalga formuna tıklayarak kaydın istediğiniz yerine gidin.</div></div><div class="evidence-actions"><button class="mini-button" data-spec="${esc(m.id)}">Spektrogram ${m.spectrogramReviewed ? '✓' : ''}</button></div><div class="spec-wrap" id="spec-wrap-${esc(m.id)}" hidden><div class="zw-head"><span>Spektrogram (log frekans, 20 Hz – 8 kHz) · sarı çizgiler bölüm sınırları</span><span>FFT 512</span></div><canvas class="spec-canvas" id="spec-${esc(m.id)}" width="900" height="160" aria-label="Spektrogram"></canvas></div><audio class="audio-player" controls preload="none" id="player-${esc(m.id)}"></audio><div class="listen-tools"><label class="listen-filter-label"><span>Dinleme yardımcısı</span><select data-listen-filter="${esc(m.id)}">${LISTEN_FILTERS.map(([k, lbl]) => `<option value="${k}" ${listenFilter(m) === k ? 'selected' : ''}>${esc(lbl)}</option>`).join('')}</select></label>${m.tech?.channels === 2 ? `<div class="chan-select" role="group" aria-label="Kanal seçimi"><span class="lbl">Kanal:</span>${CHANNEL_MODES.map(([k, lbl]) => `<button class="seg-tool ${channelMode(m) === k ? 'on' : ''}" data-chan="${esc(m.id)}|${k}" title="${esc(lbl)}">${k === 'both' ? 'Stereo' : k === 'left' ? 'Sol' : 'Sağ'}</button>`).join('')}</div>` : ''}<small class="listen-note">Dinleme yardımcıları yalnızca dinlemeyi kolaylaştırır; kaydı değiştirmez. Kaynak ayrıştırma (yalnız konuşmayı ayırma) yapılmaz.</small></div><details class="config-fold" style="margin-top:10px"><summary>Kayıt kökeni ve teslim zinciri</summary><div class="panel"><div id="origin-panel-${esc(m.id)}">${originPanelHtml(m)}</div><p class="storage-note">Bu bilgiler kaydın hangi ortamdan geldiğini ve nasıl teslim edildiğini belgeler. Uzman beyanına dayanır; uygulama ortamı kendiliğinden tespit etmez.</p></div></details><details class="config-fold" style="margin-top:10px"><summary>Konuşmacılar ve ses özellikleri</summary><div class="panel"><div id="spk-panel-${esc(m.id)}"></div><div class="evidence-actions"><button class="mini-button" data-measure-pitch="${esc(m.id)}">Konuşmacı perdesini ölç</button></div><p class="storage-note">Konuşmacı etiketlerini uzman girer; uygulama kimlik tespiti yapmaz. Perde ölçümü otokorelasyon yöntemiyle hesaplanan bir tahmindir ve kayıt koşullarına bağlıdır.</p></div></details><div class="transcript-editor"><div class="transcript-head"><b>Deşifre ve kontrol</b><small>${segs.length} zamanlı bölüm · "Onaylandı" ve "Anlaşılmadı" uzman dinlemesini ifade eder; "Yeniden dinlenecek" doğrulanmış sayılmaz</small></div><div class="segments-root" id="segments-${esc(m.id)}"></div>${m.referenceSegments?.length ? `<details class="reference-box"><summary>Bu test kaydı için referans metni görüntüle</summary><div>${m.referenceSegments.map((s) => `<p><b>${timecode(s.start)}–${timecode(s.end)} · ${esc(s.speaker)}</b><br>${esc(s.text)}</p>`).join('')}</div></details>` : ''}</div></div>`;
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
      hideKaraoke(m);
      refreshPlayButtons();
    });
    if (m.tech?.channels === 2 && channelMode(m) !== 'both') ensureAudioGraph(m, player);
  }
  attachWave(card, m, url);
  renderSegments(m, card);
  ensureSpeakers(m);
  renderSpeakersPanel(m);
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
  (m.log = m.log || []).push({
    at: m.spectrogramReviewed.at,
    event: 'Spektrogram incelendi',
    detail: `${spec.cols} zaman sütunu, ${spec.bins} frekans kutusu, FFT ${spec.fftSize}`
  });
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

function attachWave(card, m, url) {
  const canvas = card.querySelector('canvas.wave-canvas');
  if (!canvas) return;
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
      pushSegmentHistory(s);
      s.text = next;
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
// Bu filtreler yalnızca DİNLEMEYİ kolaylaştırır; kaydı değiştirmez ve rapora
// yalnızca gerçekten açıldıysa "dinleme yardımcısı" olarak yazılır.
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
  (m.log = m.log || []).push({
    at: new Date().toISOString(),
    event: 'Konuşmacı perde ölçümü',
    detail: `${m.speakers.length} konuşmacı için perde tahmini hesaplandı`
  });
  persist();
  renderSpeakersPanel(m); // Perde ölçümü tüm ses listesini yeniden çizmez; yalnızca konuşmacı paneli
  // güncellenir. Böylece sayfa yerinde kalır, kaydırma ve odak korunur.
  showToast('Konuşmacı perde ölçümü tamamlandı.');
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
  (m.log = m.log || []).push({
    at: new Date().toISOString(),
    event: 'Sessizlik ölçümü',
    detail: `Bölüm ${index + 1}: %${Math.round(stats.ratio * 100)} sessiz (${stats.silentSec.toFixed(1)} sn)`
  });
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
const SEG_FILTERS = [
  ['all', 'Tümü'],
  ['pending', 'Bekleyen'],
  ['onaylandi', 'Onaylandı'],
  ['anlasilmadi', 'Anlaşılmadı'],
  ['yeniden', 'Yeniden dinlenecek']
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
  const c = { all: segs.length, pending: 0, onaylandi: 0, anlasilmadi: 0, yeniden: 0 };
  for (const s of segs) {
    const r = segReview(s);
    if (r === 'onaylandi') c.onaylandi++;
    else if (r === 'anlasilmadi') c.anlasilmadi++;
    else if (r === 'yeniden') c.yeniden++;
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
    rev === 'onaylandi'
      ? '<span class="badge done">Onaylandı</span>'
      : rev === 'anlasilmadi'
        ? '<span class="badge warn">Anlaşılmadı</span>'
        : rev === 'yeniden'
          ? '<span class="badge again">Yeniden</span>'
          : '<span class="badge">Bekliyor</span>';
  return `<div class="seg-item st-${rev} ${halluc ? 'is-empty' : ''}" data-seg-item="${i}" role="button" tabindex="0">
    <span class="seg-no">${i + 1}</span>
    <span class="seg-time">${esc(s.start || '—')}</span>
    <span class="seg-text">${esc((s.text || '').trim()) || '(metin yok)'}</span>
    <span class="seg-badges">${spk}${segPriorityBadge(s, prev)}${state}</span>
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
  return `<div class="seg-detail-head">
      <span class="idx">Bölüm ${i + 1} / ${segs.length}</span>
      <span class="nav">
        <button class="seg-tool" data-seg-nav="prev" title="Önceki bölüm (↑)">↑</button>
        <button class="seg-tool" data-seg-nav="next" title="Sonraki bölüm (↓)">↓</button>
        <button class="seg-tool ${isPlaying ? 'on' : ''}" data-play-active="1" title="Dinle / duraklat (Boşluk)">${isPlaying ? '⏸ Duraklat' : '▶ Dinle'}</button>
        <button class="seg-tool" data-stop-active="1" title="Durdur ve başa dön" ${canStop ? '' : 'disabled'}>⏹ Durdur</button>
      </span>
    </div>
    ${halluc ? `<div class="halluc-note">Bu bölümde anlamlı metin yok. Kaydı dinleyip metni doldurun; boş bırakılamaz.</div>` : ''}
    ${repetitionNoteHtml(s)}
    ${silenceNoteHtml(s, i)}
    ${pr.score >= 15 ? `<div class="halluc-note" style="background:#eef4fb;border-color:#d6e4f2;color:#2f6f95">İnceleme önceliği: ${esc(pr.reasons.join(', '))}</div>` : ''}
    <div class="seg-row2">
      <div class="seg-field"><label>Başlangıç</label><input class="time-input" data-seg="${i}" data-key="start" value="${esc(s.start || '')}">
        <div class="seg-boundary"><span class="lbl">Kaydır</span><button class="nudge-btn" data-nudge="${i}|start|-1">−1s</button><button class="nudge-btn" data-nudge="${i}|start|-0.1">−0,1s</button><button class="nudge-btn" data-nudge="${i}|start|0.1">+0,1s</button><button class="nudge-btn" data-nudge="${i}|start|1">+1s</button></div>
      </div>
      <div class="seg-field"><label>Bitiş</label><input class="time-input" data-seg="${i}" data-key="end" value="${esc(s.end || '')}">
        <div class="seg-boundary"><span class="lbl">Kaydır</span><button class="nudge-btn" data-nudge="${i}|end|-1">−1s</button><button class="nudge-btn" data-nudge="${i}|end|-0.1">−0,1s</button><button class="nudge-btn" data-nudge="${i}|end|0.1">+0,1s</button><button class="nudge-btn" data-nudge="${i}|end|1">+1s</button></div>
      </div>
    </div>
    <div class="zoom-wave-wrap"><div class="zw-head"><span>Yakınlaştırılmış dalga formu · yeşil/kırmızı sınırı sürükleyin, tekerlekle yakınlaştırın, boşluğa tıklayıp konuma gidin</span><span class="zw-span">±0,5 sn</span></div><div class="zw-tools"><button class="seg-tool" data-zw-play="1" title="Bölümü dinle / duraklat">▶</button><button class="seg-tool" data-zw-stop="1" title="Durdur">⏹</button><span class="zw-sep"></span><button class="seg-tool" data-zw-zoom="in" title="Yakınlaştır">＋</button><button class="seg-tool" data-zw-zoom="out" title="Uzaklaştır">−</button><button class="seg-tool" data-zw-zoom="fit" title="Bölüme sığdır">Sığdır</button></div><canvas class="zoom-wave" id="zoom-wave-${esc(m.id)}" width="900" height="72"></canvas></div>
    <div class="seg-field"><label>Konuşmacı</label><input data-seg="${i}" data-key="speaker" list="spk-options-${esc(m.id)}" value="${esc(s.speaker || '')}" placeholder="Örn. Kiracı, Ev sahibi, Konuşmacı 1"></div>
    <div class="karaoke" id="karaoke-${esc(m.id)}" aria-live="polite" hidden></div>
    <div class="seg-field"><label>Çözümlenen konuşma (düzeltilebilir)</label>
      <div class="quick-insert" role="group" aria-label="Hızlı metin ekle">
        ${QUICK_TAGS.map((t) => `<button class="quick-tag" data-quick-tag="${i}|${esc(t.text)}" title="${esc(t.hint)}">${esc(t.label)}</button>`).join('')}
        <button class="quick-tag quick-tag-clear" data-quick-clear="${i}" title="Metni temizle">Temizle</button>
      </div>
      <textarea data-seg="${i}" data-key="text" placeholder="Kaydı dinleyerek metni doğrulayın ve düzeltin.">${esc(s.text || '')}</textarea>
    </div>
    <div class="seg-row2">
      <div class="seg-field"><label>Kontrol durumu</label><select data-seg="${i}" data-key="review" data-state="${rev}">${opts}</select></div>
      <div class="seg-field"><label>Bölüm işlemleri</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${hist ? `<button class="mini-button" data-history="${i}">Geçmiş (${hist})</button>` : ''}
          <button class="mini-button" data-silence="${i}" title="Bu bölümün sessizlik oranını ölç">Sessizlik ölç</button>
          <button class="mini-button" data-split-seg="${i}">Buradan böl</button>
          <button class="mini-button" data-merge-next="${i}">Sonrakiyle birleştir</button>
          <button class="mini-button danger" data-delete-seg="${i}">Sil</button>
        </div>
      </div>
    </div>
    <div class="seg-field"><label>Gözlem işaretleri (rapora yansır)</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="mini-button ${s.obs && s.obs.noise ? 'on' : ''}" data-obs="${i}|noise">Arka plan gürültüsü</button>
        <button class="mini-button ${s.obs && s.obs.overlap ? 'on' : ''}" data-obs="${i}|overlap">Üst üste konuşma</button>
        <button class="mini-button ${s.obs && s.obs.inaudible ? 'on' : ''}" data-obs="${i}|inaudible">Anlaşılmaz bölüm</button>
        <button class="mini-button ${s.obs && s.obs.music ? 'on' : ''}" data-obs="${i}|music">Müzik/ses efekti</button>
      </div>
    </div>
    <div class="seg-actions">
      <button class="mini-button primary" data-approve-seg="${i}">✓ Onayla ve sonrakine geç (Enter)</button>
      <button class="mini-button" data-review-set="${i}|yeniden">Yeniden dinlenecek</button>
      <button class="mini-button" data-review-set="${i}|anlasilmadi">Anlaşılmadı</button>
    </div>`;
}
function renderSegDetail(m) {
  const root = $(`#seg-detail-${CSS.escape(m.id)}`);
  if (!root) return;
  root.innerHTML = segDetailHtml(m);
  // Sağ panel çizildikten sonra yakınlaştırılmış dalga formunu bağla. Panel
  // yalnızca bölüm değişince çizildiği için bu maliyet düşüktür.
  const idx = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  attachZoomWave(m, idx);
}
function renderSegments(m, card) {
  const root = $(`#segments-${CSS.escape(m.id)}`, card || document);
  if (!root) return;
  const segs = m.segments || [];
  const counts = segCounts(m);
  const reviewed = counts.onaylandi + counts.anlasilmadi;
  const pct = segs.length ? Math.round((reviewed / segs.length) * 100) : 0;
  const filter = segFilter(m);
  const chips = SEG_FILTERS.map(
    ([k, label]) =>
      `<button class="filter-chip ${filter === k ? 'on' : ''}" data-seg-filter="${k}">${label} <span class="n">${counts[k]}</span></button>`
  ).join('');
  const spkOptions = [...new Set(segs.map((s) => s.speaker).filter((x) => x && x !== 'Belirtilmedi'))];
  root.innerHTML = `<div class="transcript-toolbar">
      <div class="group"><span>Hız</span>${PLAYBACK_SPEEDS.map((sp) => `<button class="seg-tool speed-tool ${(m.playbackRate || 1) === sp ? 'on' : ''}" data-seg-speed="${sp}">${sp}×</button>`).join('')}</div>
      <div class="group"><button class="seg-tool" data-jump-prio="1" title="En yüksek inceleme öncelikli bölüme git">⚠ Öncelikliye git</button></div>
      <div class="group"><button class="seg-tool" data-paragraph="1" title="Aynı konuşmacının ardışık bölümlerini birleştirip paragraf oluştur">¶ Paragraf oluştur</button></div>
      <div class="group"><button class="seg-tool" data-terms="1" title="Metinde aynı terimin farklı yazımlarını bul">Terim tutarlılığı</button></div>
    </div>
    <div id="term-panel-${esc(m.id)}" class="term-panel" hidden></div>
    <div class="transcript-toolbar">${chips}</div>
    <div class="seg-progress"><div class="bar"><span style="width:${pct}%"></span></div><small>${reviewed}/${segs.length} denetlendi · %${pct}</small></div>
    <datalist id="spk-options-${esc(m.id)}">${spkOptions.map((x) => `<option value="${esc(x)}"></option>`).join('')}</datalist>
    <div class="seg-workspace">
      <div class="seg-list" id="seg-list-${esc(m.id)}" role="list">${segListHtml(m)}</div>
      <div class="seg-detail" id="seg-detail-${esc(m.id)}">${segDetailHtml(m)}</div>
    </div>
    <div class="kbd-hint"><b>Klavye:</b> <kbd>Boşluk</kbd> oynat/durdur · <kbd>↑</kbd><kbd>↓</kbd> bölüm · <kbd>Enter</kbd> onayla · <kbd>Y</kbd> dinle · <kbd>[</kbd><kbd>]</kbd> hız · <kbd>←</kbd><kbd>→</kbd> 5 sn · <kbd>B</kbd> böl · <kbd>M</kbd> birleştir · Metin alanındayken <kbd>Esc</kbd> ile çık</div>`;
  // Aktif bölüm işaretini kur
  const active = Number.isInteger(m.activeSeg) ? m.activeSeg : 0;
  root
    .querySelectorAll('.seg-item')
    .forEach((el) => el.classList.toggle('is-active', Number(el.dataset.segItem) === active));
}
// Aktif bölümü değiştirir. Liste DOM'u yeniden kurulmaz; yalnızca sınıf taşınır
// ve sağ panel yenilenir. Kaydırma ve odak korunur.
function setActiveSegment(m, index, { scroll = true } = {}) {
  const segs = m.segments || [];
  if (!segs.length) return;
  m.activeSeg = Math.max(0, Math.min(segs.length - 1, index));
  const root = $(`#segments-${CSS.escape(m.id)}`);
  if (root) {
    root
      .querySelectorAll('.seg-item')
      .forEach((el) => el.classList.toggle('is-active', Number(el.dataset.segItem) === m.activeSeg));
    if (scroll) {
      const el = root.querySelector(`.seg-item[data-seg-item="${m.activeSeg}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
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
    if (segReview(segs[i]) === 'onaylandi') continue;
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
  if (!segs.length) return;
  if (!Number.isInteger(m.activeSeg)) m.activeSeg = 0;
  const i = m.activeSeg;
  const s = segs[i];
  if (!s) return;
  s.review = 'onaylandi';
  s.checked = true;
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
  const reviewed = counts.onaylandi + counts.anlasilmadi;
  const pct = segs.length ? Math.round((reviewed / segs.length) * 100) : 0;
  root.querySelectorAll('[data-seg-filter]').forEach((ch) => {
    const k = ch.dataset.segFilter;
    const n = ch.querySelector('.n');
    if (n) n.textContent = counts[k];
  });
  const bar = root.querySelector('.seg-progress .bar span');
  if (bar) bar.style.width = pct + '%';
  const lbl = root.querySelector('.seg-progress small');
  if (lbl) lbl.textContent = `${reviewed}/${segs.length} denetlendi · %${pct}`;
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
    playActiveSegment(m);
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
  const left = { ...s, end: timecode(cut), history: [] };
  const right = { ...s, start: timecode(cut), history: [] };
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
  if ((n.text || '').trim()) s.text = (s.text || '') + (s.text ? ' ' : '') + n.text;
  s.review = 'bekliyor';
  s.checked = false;
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
      start: first.start,
      end: last.end,
      speaker: first.speaker || '',
      text,
      checked: !anyUnreviewed,
      review: anyUnreviewed ? 'bekliyor' : segReview(first),
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
async function addAudioFiles(files, opts = {}) {
  const c = currentCase();
  if (!c) return;
  for (const file of files) {
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|ogg|flac|aac)$/i.test(file.name)) {
      showToast(`${file.name}: ses dosyası değil, atlandı.`);
      continue;
    }
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
      status: 'İnceleme bekliyor',
      synthetic: !!opts.synthetic,
      addedAt: new Date().toISOString(),
      log: [],
      origin: { mediumType: 'Belirtilmedi', mediumLabel: '', deliveredBy: '', deliveredAt: '', deviceInfo: '' }
    };
    c.materials.push(m);
    m.log.push({
      at: m.addedAt,
      event: 'Kayıt eklendi',
      detail: `${file.name} · ${file.size} bayt · SHA-256 hesaplandı`
    });
    await storeBlob(blobKey(c, m), file);
    const url = URL.createObjectURL(file);
    objectUrls.set(blobKey(c, m), url);
  }
  persist();
  renderOverview();
  renderAudioList();
  showToast(`${files.length} ses dosyası eklendi.`);
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
const REVIEW_STATES = {
  onaylandi: { label: 'Onaylandı', cls: 'good' },
  bekliyor: { label: 'Kontrol bekliyor', cls: '' },
  anlasilmadi: { label: 'Anlaşılmadı', cls: 'warn' },
  yeniden: { label: 'Yeniden dinlenecek', cls: 'warn' }
};
function segReview(s) {
  if (s.review && REVIEW_STATES[s.review]) return s.review;
  return s.checked ? 'onaylandi' : 'bekliyor';
}
function isReviewed(s) {
  const r = segReview(s);
  return r === 'onaylandi' || r === 'anlasilmadi';
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
function pushSegmentHistory(s, prevText) {
  if (!s.history) s.history = [];
  const prev = prevText ?? s.__editSnapshot ?? '';
  if (prev === (s.text || '')) return false;
  s.history.push({ text: prev, at: new Date().toISOString() });
  if (s.history.length > 20) s.history.shift();
  return true;
}
function timecode(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '00:00:00';
  const s = Math.max(0, seconds);
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const base = `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}`;
  if (ms === 0) return base;
  const carryMs = ms >= 1000 ? 0 : ms;
  return `${base}.${pad(carryMs, 3)}`;
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
  (m.log = m.log || []).push({
    at: m.lastVerify.at,
    event: 'SHA-256 doğrulama',
    detail: ok ? 'Özet eşleşti; dosya değişmemiş.' : `Özet farklı! Beklenen ${m.sha256}, bulunan ${now}`
  });
  persist();
  renderAudioList();
  showToast(ok ? 'SHA-256 doğrulandı; dosya değişmemiş.' : 'Uyarı: dosya özeti değişmiş görünüyor!');
}
function showEvidenceLog(m) {
  const existing = document.querySelector('.history-dialog');
  if (existing) existing.remove();
  const items = (m.log || []).slice().reverse();
  const dlg = document.createElement('div');
  dlg.className = 'history-dialog';
  dlg.innerHTML = `<div class="history-inner"><div class="history-head"><b>${esc(m.name)} · delil işlem günlüğü</b><button class="mini-button" data-close-history>Kapat</button></div><div class="history-body">${items.length ? items.map((h) => `<div class="history-item"><small>${esc(new Date(h.at).toLocaleString('tr-TR'))} · ${esc(h.event)}</small><p>${esc(h.detail || '')}</p></div>`).join('') : '<p class="paper-muted">Bu kayıt için işlem günlüğü boş.</p>'}</div></div>`;
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
    m.status = 'Çözümleme sürüyor';
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
        m.status = collected.length ? 'Kısmen çözümlendi (iptal edildi)' : 'İptal edildi';
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
        for (const f of found) collected.push({ ...f, speaker: 'Belirtilmedi', checked: false });
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
      m.status = 'Çözümleme sonucu boş';
      m.hallucinationWarning = 'Model bu kayıtta konuşma tespit edemedi. Kaydı elle dinleyip bölümleri kendiniz girin.';
    } else if (!meaningful.length) {
      m.status = 'Çözümleme sonucu boş';
      m.hallucinationWarning =
        'Model bu kayıtta anlamlı konuşma metni üretemedi (çıktı yalnızca anlamsız simge/token içeriyordu ve ayıklandı). ' +
        'Sonuç rapora aktarılmamalıdır. Denenebilecekler: (1) "Çözümleme ve model ayarları"nda Large-v3-turbo modelini seçip yükleyin; ' +
        '(2) kayıt kalitesini kontrol edin; (3) gerekirse bölümleri elle girin.';
    } else {
      if (fillerCount) {
        m.hallucinationWarning = `${fillerCount} bölümde anlamlı metin yerine dolgu ifadesi üretildi; bu bölümler uzman tarafından dinlenerek doldurulmalıdır.`;
      }
      m.status = 'Kontrol bekliyor';
    }
    delete m.progress;
    m.transcribedAt = new Date().toISOString();
    m.transcribedWithModel = (asrPipeline && asrPipeline.__modelId) || null;
    (m.log = m.log || []).push({
      at: m.transcribedAt,
      event: 'Çözümleme tamamlandı',
      detail: `${meaningful.length} anlamlı bölüm, ${fillerCount || 0} dolgu bölümü`
    });
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
    m.status = isLoad ? 'Model yüklenemedi' : 'Çözümleme hatası';
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
  m.segments.push({ start, end, speaker: 'Konuşmacı 1', text: '', checked: false });
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
  const typeOpts = REPORT_TEXT.mediumTypes
    .map((t) => `<option value="${esc(t)}" ${o.mediumType === t ? 'selected' : ''}>${esc(t)}</option>`)
    .join('');
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
      o.mediumType || REPORT_TEXT.originEmpty,
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
// İnceleme özeti: raporda ne yapıldığını ve ne kaldığını sayısal olarak
// gösterir. Her satır yalnızca gerçek veriden üretilir; tahmin içermez.
function reviewSummaryRows(c) {
  const mats = c.materials || [];
  const segs = mats.flatMap((m) => m.segments || []);
  const reviewed = segs.filter((s) => isReviewed(s)).length;
  const inaudible = segs.filter((s) => segReview(s) === 'anlasilmadi').length;
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
  // Köken belgelenmiş sayılır: ortam türü 'Belirtilmedi' dışında bir değer ve
  // en az bir teslim bilgisi (eden veya tarih) girilmişse.
  const originFilled = mats.filter((m) => {
    const o = m.origin || {};
    return o.mediumType && o.mediumType !== 'Belirtilmedi' && (o.deliveredBy || o.deliveredAt);
  }).length;
  const originMedium = mats.filter(
    (m) => m.origin && m.origin.mediumType && m.origin.mediumType !== 'Belirtilmedi'
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
    ['UZMANLIK ALANI', c.expertField],
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
  if (allSegs.length && checked < allSegs.length)
    warnings.push(`${allSegs.length - checked} deşifre bölümü henüz uzman tarafından kontrol edilmedi.`);
  const anlasilmadi = allSegs.filter((s) => segReview(s) === 'anlasilmadi').length;
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
  let html = `<div class="paper-topline"><span>${esc(reportTypeLabel(c.reportType))}</span><span>UZMANLIK ALANI · 56.12</span></div><div class="paper-title"><div class="republic">T.C.</div><h2>${esc((c.court || REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR'))}’${esc(trDative(c.court || 'Mahkemesi'))}</h2><h2>${esc(reportTypeSpec(c.reportType).heading)}</h2><p>${esc(REPORT_TEXT.subtitle)}</p></div>`;
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
  html += `<div class="paper-section"><h3>${esc(REPORT_TEXT.reviewSummaryHeading)}</h3><p>${esc(REPORT_TEXT.reviewSummaryIntro)}</p><table class="paper-table"><tbody>${rsRows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(String(r[1]))}</td></tr>`).join('')}</tbody></table></div>`;
  html += `<div class="paper-signature"><div><b>${esc(c.expertName || REPORT_TEXT.defaultExpert)}</b><br>${esc(c.expertField || REPORT_TEXT.defaultField)}<br>${esc(REPORT_TEXT.signatureRegistry)}: ${esc(c.registryNo || REPORT_TEXT.emptyFileNo)}<br><span class="paper-muted">${esc(REPORT_TEXT.signatureLabel)}</span></div></div><div class="paper-footer"><span>AKİS çalışma çıktısı · ${esc(c.fileNo || REPORT_TEXT.fileMissing)}</span><span>Rapor tarihi: ${esc(niceDate(c.reportDate))}</span></div></div>`;
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
  body += headingXml(REPORT_TEXT.reviewSummaryHeading);
  body += wP(REPORT_TEXT.reviewSummaryIntro);
  body += wTable(
    reviewSummaryRows(c).map((r) => [r[0], String(r[1])]),
    { widths: [6000, 3000], header: false, shadeFirstCol: true }
  );
  body += `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="260" w:after="0"/><w:keepLines/></w:pPr>${wRun(c.expertName || 'BİLİRKİŞİ', { bold: true, size: 22, color: '1C426B' })}<w:r><w:br/></w:r>${wRun(c.expertField || '56.12', { size: 20 })}<w:r><w:br/></w:r>${wRun(`${REPORT_TEXT.signatureRegistry}: ${c.registryNo || REPORT_TEXT.emptyFileNo}`, { size: 20 })}<w:r><w:br/></w:r>${wRun(REPORT_TEXT.signatureLabel, { size: 18, color: '718399' })}</w:p>`;
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
    `<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="1C426B"/></w:pBdr></w:pPr>${wRun('BİLİRKİŞİ RAPORU  |  UZMANLIK ALANI 56.12', { bold: true, color: '70869C', size: 15 })}</w:p></w:hdr>`
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
    return `<table tableName="AkisTable${serial}" columnCount="${colCount}" columnSpans="${safeWidths.join(',')}" border="borderCell" borderColor="${colors.line}" borderWidth="0.3">${rowXml}</table>`;
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
async function exportProject() {
  const c = currentCase();
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
          status: 'İnceleme bekliyor',
          synthetic: true,
          referenceSegments: sm.referenceSegments || [],
          addedAt: new Date().toISOString(),
          log: []
        };
        c.materials.push(m);
        m.log.push({
          at: m.addedAt,
          event: 'Kayıt eklendi',
          detail: `${sm.name} · ${blob.size} bayt · SHA-256 hesaplandı (test paketi)`
        });
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
function setFocusMode(on) {
  document.body.classList.toggle('focus-mode', on);
  const fb = $('#focusModeBtn');
  if (fb)
    fb.innerHTML = `<span class="nav-icon">⤢</span> ${on ? 'Odak modundan çık' : 'Odak modu (kenar çubuğunu daralt)'}`;
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
    switchView('case');
  });
  $('#view-case').addEventListener('input', readCaseForm);
  $('#view-case').addEventListener('change', readCaseForm);
  $('#view-questions').addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.q !== undefined) {
      const c = currentCase(),
        q = c.questions[Number(t.dataset.q)];
      if (q) q[t.dataset.k] = t.value;
      persist();
    } else readQuestionsForm();
  });
  $('#view-questions').addEventListener('change', (e) => {
    if (e.target.dataset.q === undefined) readQuestionsForm();
  });
  $('#addQuestionBtn').addEventListener('click', addQuestion);
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
    } else if (b.dataset.reviewSet !== undefined) {
      const card = b.closest('.audio-card');
      const id = card.querySelector('[data-transcribe]')?.dataset.transcribe;
      const m = c.materials.find((x) => x.id === id);
      if (m) {
        const [ix, val] = b.dataset.reviewSet.split('|');
        const s2 = m.segments[Number(ix)];
        if (s2) {
          s2.review = val;
          s2.checked = val === 'onaylandi';
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
      s.text = cur ? cur + ' ' + text : text;
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
      s.text = '';
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
    if (pushSegmentHistory(s)) persist(); // Odak aynı detay panelinde kaldıysa paneli yeniden çizmeyiz; yoksa odak kaybolur.
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
    if (el.dataset.key === 'text') s.text = el.value;
    else if (el.dataset.key === 'speaker') s.speaker = el.value;
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
    s.review = el.value;
    s.checked = el.value === 'onaylandi';
    el.dataset.state = el.value;
    persist();
    updateSegListItem(m, i);
    refreshSegChips(m);
    renderOverview();
    if ($('#view-report').classList.contains('active')) renderReport();
  });
  $('#view-audio').addEventListener('focusin', (e) => {
    const el = e.target;
    if (!el.dataset || el.dataset.key !== 'text') return;
    const card = el.closest('.audio-card');
    const id = card?.querySelector('[data-transcribe]')?.dataset.transcribe;
    const m = currentCase().materials.find((x) => x.id === id);
    const s = m?.segments[Number(el.dataset.seg)];
    if (s) snapshotSegmentText(s);
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
    if (pushSegmentHistory(s)) persist(); // Odak aynı detay panelinde kaldıysa paneli yeniden çizmeyiz; yoksa odak kaybolur.
    const rt = e.relatedTarget;
    const samePane = rt && rt.closest && rt.closest('.seg-detail');
    if (!samePane) {
      updateSegListItem(m, i);
      if ($('#view-report').classList.contains('active')) renderReport();
    }
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
      if (m.status === 'Çözümleme hatası') m.status = 'İnceleme bekliyor';
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
  $('#focusModeBtn').addEventListener('click', () => setFocusMode(!document.body.classList.contains('focus-mode')));
  $('#focusExitBtn').addEventListener('click', () => setFocusMode(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
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
      m.status !== 'Kontrol bekliyor' &&
      m.status !== 'Çözümleme sonucu boş' &&
      m.status !== 'Kısmen çözümlendi (iptal edildi)'
  );
}
function renderQueue() {
  const c = currentCase();
  if (!c) return;
  const mats = c.materials || [];
  const root = $('#queueList');
  if (!root) return;
  const done = mats.filter((m) => m.status === 'Kontrol bekliyor').length;
  const failed = mats.filter((m) => m.status === 'Çözümleme hatası').length;
  $('#queueLabel').textContent = mats.length ? `${done}/${mats.length} tamamlandı` : 'Kuyruk boş';
  $('#retryFailedBtn').hidden = failed === 0;
  root.innerHTML = mats.length
    ? mats
        .map(
          (m, i) =>
            `<div class="queue-item"><span class="queue-index">${i + 1}</span><span class="queue-name">${esc(m.name)}</span><span class="queue-state ${m.status === 'Çözümleme hatası' ? 'bad' : m.status === 'Kontrol bekliyor' ? 'good' : ''}">${esc(m.status || 'Bekliyor')}</span>${typeof m.progress === 'number' ? `<span class="queue-pct">%${m.progress}</span>` : ''}</div>`
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
function init() {
  // Sürüm etiketini tek kaynaktan (APP_VERSION) yaz.
  const verEl = $('#appVersion');
  if (verEl) verEl.textContent = `AKİS • v${APP_VERSION} • Yerel sürüm`;
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
