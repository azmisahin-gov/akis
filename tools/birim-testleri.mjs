/**
 * Hesaplama birim testleri.
 *
 * Uygulamanın kritik hesaplama fonksiyonlarını bilinen girdilerle sınar:
 * WER, Levenshtein, FFT, perde (temel frekans), Türkçe yönelme eki, zaman kodu,
 * dolgu tespiti, geçmiş sıkıştırma. Bu fonksiyonlar yanlış hesaplarsa rapora
 * yanlış sonuç girer; bu yüzden her değişiklikte sınanmalıdır.
 *
 * Çalıştırma:  node tools/birim-testleri.mjs
 * Gereksinim:  Node.js (harici paket gerekmez)
 *
 * Çıkış kodu 0 = tüm testler geçti, 1 = en az bir test kaldı.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- app.js'i sahte DOM ile yükle -----------------------------------------
const noop = () => {};
const els = new Map();
function makeEl(sel) {
  return {
    sel, value: '', textContent: '', innerHTML: '', hidden: false, disabled: false,
    dataset: {}, style: {}, attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    appendChild: noop, remove: noop, showModal: noop, close: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    getContext: () => ({ clearRect: noop, fillRect: noop, fillStyle: '', strokeStyle: '', lineWidth: 0, beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop, font: '' }),
  };
}
const documentStub = {
  querySelector: (s) => { if (!els.has(s)) els.set(s, makeEl(s)); return els.get(s); },
  querySelectorAll: () => [], createElement: () => makeEl('new'),
  // createElement + appendChild ile kurulan öğeler kimlikleriyle erişilebilir
  // olmalı; aksi hâlde banner gibi çalışma zamanında üretilen düğümler testte
  // görünmez (v2.87: kayıt hatası şeridi bu yüzden sınanamıyordu).
  body: {
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: (el) => { if (el && el.id) els.set('#' + el.id, el); },
  },
  addEventListener: noop,
};
const localStorageStub = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

// app.js artık ES modülü: `import ... from './schema.js'`. Bu betik onu vm
// içinde çalıştırdığı için import bloğu, aynı adları sandbox global'inden alan
// bir atama bloğuna çevrilir. Böylece testler GERÇEK şemayı kullanır (kopya
// değil); şema ayrıca tools/sema-testi.mjs ile ayrıntılı sınanır.
const __importTargets = { 'schema.js': '__schema', 'report-model.js': '__reportModel' };
const __inlineImports = (src) =>
  src.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+'([^']+)';\s*$/gm, function (_m, names, spec) {
    const file = (spec.match(/([^/]+\.js)/) || [])[1];
    const target = __importTargets[file];
    if (!target) return _m;
    const list = names.split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    return 'const { ' + list.join(', ') + ' } = globalThis.' + target + ';';
  });
let code = __inlineImports(fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8'))
  .replace(/^init\(\)\.catch\([\s\S]*?\);\s*$/m, '')
  .replace(/^init\(\);\s*$/m, '');
// KORUYUCU: app.js'e yeni bir modül import'u eklenirse koşum onu sıyırmalı.
// Sıyrılamayan import kalırsa `node:vm` SyntaxError verir (v2.227 dersi).
if (/^\s*import\s/m.test(code)) {
  console.error('KALDI  app.js içinde sıyırılamayan import satırı var; test koşumu güncel değil.');
  process.exit(1);
}
const EXPOSE = [
  'computeWer', 'editDistance', 'normalizeForWer', 'werWords',
  'fftMagnitude', 'detectPitchHz', 'specColor',
  'trDative', 'timecode', 'secondsFromTimecode',
  'isHallucination', 'compactHistory', 'segReview', 'isReviewed',
  'reportTypeSpec', 'questionsFallbackText', 'evaluationFallbackText',
  'paragraphGroups', 'splitSegmentAt', 'quickApproveTargets', 'trLowerCase',
  'detectPitchAmbiguity', 'pitchCellText', 'analyzeSilence', 'segmentSilenceFlag',
  'analyzeLevels', 'levelRowsForCase', 'expertFieldShort',
  'analyzeStereo', 'spectralRolloff', 'snrText', 'floorText', 'fmtDb',
  'contentWords', 'findTermInconsistencies', 'applyTermForm',
  'detectRepetition', 'segmentRepetitionFlag',
  'buildProjectPack', 'validateProjectPack', 'matchAudioEntries',
  'evaluateModelIntegrity', 'recommendModel', 'modelIdFromUrl',
  'parseAsrResult', 'asrWindows', 'looksNonTurkish', 'safeName',
  'dtypeCandidates', 'dtypeLabel', 'modelShortName', 'looksLikeGarbage',
  'nudgeBoundary', 'loopRange', 'setLoopPoint', 'loopLabel',
  'segQuickCheck', 'segCounts', 'segMatchesFilter', 'tcRange', 'fmtWer',
  'fmtBytesShort',
  'asrProfile', 'asrProfileOptions', 'ASR_PROFILES',
  'sanitizeForStorage', 'showSaveFailureBanner', 'hideSaveFailureBanner',
  'VERSION_NOTICES', 'maybeShowVersionNotice', 'APP_VERSION',
  'setSegmentText', 'applyTextEdit', 'reviewLabel', 'emptySegmentForTest', 'mergeSegmentWithNext',
  'snapshotSegmentText', 'approvalDroppedByEdit',
  'measureWerForCase', 'werMeasuredCount',
  'analyzeChannelLevels', 'LEVELS_SCHEMA', 'levelRowsForCase',
  'pickActiveChannel', 'analyzeSilenceChannelAware', 'segmentSilenceFlag', 'SILENCE_SCHEMA',
  'touchCaseUpdated', 'saveCaseNow', 'mergeCasesForTest', 'persist',
  'isSha256Hex', 'verifyHashState', 'sha256',
  'parseTimecodeStrict', 'normalizeTimeInput',
  'paragraphGroups', 'splitSegmentAt', 'quickApproveTargets', 'trLowerCase',
  'detectPitchAmbiguity', 'pitchCellText',
  'isEmptyCase', 'buildExportPlan', 'selectCaseFromArchive', 'freshCase',
  'reprocessPlan', 'queueReprocessSummary',
  'isHumanApproved', 'reviewCellText', 'reviewHintText',
  'isArchivedCase', 'visibleCases', 'archiveCase', 'unarchiveCase',
  'deleteConfirmPhrase', 'deleteConfirmMatches', 'canDeleteCase',
  'canArchiveCase', 'caseShortId', 'caseDisplayName',
  'casesForStorage', 'isEmptyWorkspace',
  'exportPlanFor', 'backupFileName', 'EXPORT_SCOPE',
  'profileRunLabel', 'profileById', 'PROFILE_LOCK',
  'speakerSegments', 'removeSpeaker', 'unusedSpeakers', 'speakerRows', 'reviewSummaryRows',
  'loopStopTarget', 'LOOP_KEYS',
  'nextScrollTop', 'pendingBreakdown', 'pendingSummaryText', 'clampSegMenuPosition', 'insertTagAt', 'segmentWorkSummary',
  'QUICK_TAGS', 'QUICK_TAG_GROUPS', 'QUICK_TAG_DEFS', 'quickTagButton', 'quickMenuHtml', 'quickTagRecent', 'rememberQuickTag', 'filterQuickMenu',
  'reportFormat', 'normalizeReportFormat', 'emptyReportFormat', 'REPORT_FONT_KEYS', 'REPORT_FONT_DOCX', 'REPORT_FONT_CSS', 'REPORT_ORIENTATIONS',
  'caseWorkload', 'formatWorkloadDuration',
  'parseDateOnly', 'dateOnlyStr', 'dateValueToDay', 'addDaysToDate', 'calendarDaysBetween',
  'daysRemaining', 'elapsedDays', 'deliveryInfo', 'deliverySummaryText', 'deliveryDetailText',
  'deliveryToneClass', 'applyAutoDueDate', 'deliveryPanelHtml', 'caseIdentityRows', 'caseMissingItems',
  'AMBIGUOUS_REVIEW', 'ambiguousReadings', 'ambiguousReportText',
  'karaokeSegments', 'karaokeActiveIndex', 'karaokeCharSpans',
  'FOLLOW_MODES', 'followShouldAutoStart',
  'setSegReview',
  'karaokeSentences', 'activeSentenceIndex',
  'specTimeAt', 'specHzAt', 'specNearestBoundary',
  'activeSegIndex',
  'ANALYSIS_MODES', 'ANALYSIS_PANE_H', 'normalizeAnalysisMode', 'analysisLayout', 'analysisView',
  'normalizeRescueCases', 'persistPayloadFor',
  'showToast', 'showSaveFailureBanner', 'showStorageBanner',
  'segmentTimeIssues', 'segmentTimeIssueIndexes', 'segmentTimeIssueLabel',
  'segmentIndexAtTime', 'segmentTimeIssueAt', 'followStripIndex', 'segHeadParts',
  'segmentCoverage', 'coveragePctText',
  'mergeCandidateAt', 'mergeCandidateIndexes', 'MERGE_CANDIDATE', 'SEG_FILTERS', 'CONDITIONAL_FILTERS', 'segFilterChipsHtml', 'nextMergeFilter',
  'reviewSelectOptions', 'syncNarrowBarHeight', 'segmentLengthInfo', 'SEG_LENGTH', 'readingGroupsFor',
  'reportReadiness', 'readinessRowsHtml', 'readinessRowHtml', 'readinessSummary', 'readinessSeverity', 'READINESS_SEVERITY', 'READINESS_GROUPS', 'reportRecordStatus', 'reportSectionCategory', 'reportOutlineState', 'reportOutlineMatch', 'reportSectionEditableFields', 'reportSectionDerivedTarget', 'reportSectionInspectorKey', 'reportFitWidth', 'reportFitPref', 'reportPageCountFor', 'reportContinuousPref', 'reportColumnOn', 'reportColumnLocked', 'reportTableColumns', 'normalizeReportColumns', 'emptyReportColumns', 'REPORT_COLUMN_TABLES', 'REPORT_COLUMN_LOCKED', 'nextPendingIndex', 'nextPendingPref', 'sampleCases', 'audioStateText', 'audioStateHint', 'removeAudioWarning',
  'DELIL_SCHEMA', 'DELIL_COPY_TYPES', 'delilCopyTypeLabel', 'findDelilManifestPath', 'validateDelilPack',
  'delilFileState', 'delilOriginFromPack', 'delilSummary', 'delilStateLabel', 'acquisitionRows',
  'isAudioFileName', 'delilDuplicateOf', 'isVideoFileName', 'isMediaFileName', 'isMediaFileObject', 'isVideoMaterial', 'reportVideoNote', 'videoNoteSuffix', 'zwspWrapLongHex',
  'delilToolText', 'originRows', 'inventoryRows', 'audioFormatLabel', 'REPORT_TEXT',
  'acquisitionToolFileContent',
  'findDelilDiskPath', 'validateDiskDoc', 'delilFilePath', 'DELIL_DISK_SCHEMA',
  'fileTimesFromEntry', 'inventoryCounts', 'inventoryTree',
  'readEmbeddedMeta', 'parseId3v2', 'parseMp4Meta', 'parseWavMeta', 'parseFlacMeta', 'embeddedSummary', 'embeddedRows', 'mp4EpochToIso',
  // v2.227 — rapor iskeleti, türetilmiş numara, ekler, revizyon
  'reportBodyOrder', 'reportNumberMap', 'reportHeadingText', 'reportSubHeadings',
  'reportSectionTitle', 'reportUiLabel', 'reportLetter',
  'reportTocEntries', 'reportAnnexList', 'reportAnnexBlocks', 'reportBlockRenders', 'reportBlockEmptyReason', 'reportAttachmentLines', 'reportMovedSections', 'questionBasisText', 'speakerMethodNoteText', 'questionSegmentSuggestions', 'parseId3v1', 'parseMp4MetaTail', 'frequentTerms', 'termsText',
  'addReportAnnex', 'removeReportAnnex', 'patchReportAnnexMeta', 'reportLayoutOf',
  'reportSnapshot', 'applyReportSnapshot', 'reportSnapshotDiff',
  'normalizeReportLayout', 'emptyReportLayout', 'REPORT_ANNEX_DEFS', 'REPORT_BODY_ORDER', 'REPORT_MAIN_KEYS',
  'REPORT_SECTION_DEFS', 'emptyReportSections', 'REPORT_PRESET_DEFS',
  'speakerIndexList', 'assignSpeakerByIndex', 'speakerQueueIndexes', 'speakerStats', 'setSegmentSpeakerByName',
  'speakerLegendItems', 'materialSpeakerLine', 'speakerDurationRows', 'speakerGroups', 'materialSpeakerRows',
  'addManualSegment', 'addSpeakerAndAssign',
  'speakerEmbeddingProfiles',
  'embeddingOutliers', 'embeddingChangeSuspects', 'embeddingSuggestions',
  'VOICE_EMBED_SCHEMA', 'VOICE_EMBED_MODEL', 'VOICE_EMBED_BYTES', 'VOICE_EMBED_DIM',
  'VOICE_EMBED_SR', 'VOICE_EMBED_SAME', 'VOICE_EMBED_DIFF', 'VOICE_EMBED_MIN_MARGIN',
  'VOICE_EMBED_MIN_PROFILE', 'VOICE_EMBED_WINDOW_SEC', 'VOICE_EMBED_MIN_SEC',
  'discardMaterialMedia', 'purgeCaseMedia', 'objectUrls', 'audioGraphs', 'blobKey', 'closeAudioGraph',
  'measurementStatus', 'measurementStatusText', 'MEASURE_ALL_STEPS', 'measurementPanelHtml',
  'werStatus', 'werStatusText', 'werPanelHtml', 'segObsText',
  'reportSectionsForPreset', 'reportPresetLayout', 'mainSectionNumbers', 'segSpeakerCells', 'decodeErrorText', 'unassignedSegments', 'reportNumbering',
];
code += `\n;globalThis.__t={${EXPOSE.map((n) => `${n}:typeof ${n}!=='undefined'?${n}:undefined`).join(',')}};\n`;
// Testin ihtiyaç duyduğu yardımcılar: sahte DOM elemanına erişim ve şema
// varsayılan üreticisi. Üretim kodunda bunlar yok; yalnız testte kullanılır.
code += `\n;globalThis.__t.el = (s) => document.querySelector(s);
globalThis.__t.emptyMaterialForTest = (o) => globalThis.__schema.emptyMaterial(o);
globalThis.__t.emptyCaseForTest = (o) => globalThis.__schema.emptyCase(o);
globalThis.__t.emptySegmentForTest = (o) => globalThis.__schema.emptySegment(o);
globalThis.__t.setAppState = (s) => { appState = s; };
globalThis.__t.store = localStorage;
globalThis.__t.mergeCasesForTest = (a, b) => globalThis.__schema.mergeCases(a, b);
globalThis.__t.compareCasesForTest = (a, b) => globalThis.__schema.compareCases(a, b);
globalThis.__t.resetDb = () => { dbPromise = undefined; };
`;

// Gerçek şema modülünü sandbox'a ver: app.js içindeki import bloğu buradan
// okur. Kopya tanım yok — test edilen şema ile üretimdeki şema aynı dosya.
import * as __schemaMod from '../assets/schema.js';
import * as __reportModelMod from '../assets/report-model.js';
const revoked = [];
const sandbox = {
  __schema: __schemaMod,
  __reportModel: __reportModelMod,
  console, document: documentStub, localStorage: localStorageStub, window: {}, navigator: {},
  getComputedStyle: () => ({ display: 'block', height: '0px', marginLeft: '0px', overflowX: 'visible' }),
  crypto: { subtle: { digest: async () => new ArrayBuffer(32) } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: (u) => revoked.push(String(u)) },
  Blob, TextEncoder, TextDecoder, setTimeout, clearTimeout,
  indexedDB: {
    // Silme yolları gerçek bir işlem (transaction) bekler; sahte DB
    // tamamlanmazsa `await deleteBlob()` sonsuza kadar asılı kalır (v2.275).
    open: () => {
      const req = {};
      setTimeout(() => {
        const store = { delete: noop, put: noop, get: () => ({}) };
        req.result = {
          objectStoreNames: { contains: () => true, length: 2 },
          transaction: () => {
            const tx = { objectStore: () => store, error: null };
            setTimeout(() => { if (typeof tx.oncomplete === 'function') tx.oncomplete(); }, 0);
            return tx;
          },
          close: noop
        };
        if (typeof req.onsuccess === 'function') req.onsuccess();
      }, 0);
      return req;
    }
  },
  DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
  fetch: async () => ({ ok: false }),
  JSZip: { file() { return this; }, folder() { return this; }, async generateAsync() { return new Blob([]); } },
};
sandbox.CSS = { escape: (s) => String(s) };
sandbox.window = sandbox;
sandbox.__schema = __schemaMod;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });
const T = sandbox.__t;
T.reconcileSpeakerRefsForTest = __schemaMod.reconcileSpeakerRefs;
T.l2Normalize = __schemaMod.l2Normalize;
T.cosineSimilarity = __schemaMod.cosineSimilarity;
T.embeddingCentroid = __schemaMod.embeddingCentroid;
T.revoked = revoked;

// --- Test altyapısı -------------------------------------------------------
let failures = 0, passed = 0;
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++; else failures++;
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${label}${ok ? '' : `  → beklenen ${JSON.stringify(expected)}, bulunan ${JSON.stringify(actual)}`}`);
}
function near(label, actual, expected, tol) {
  const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= tol;
  if (ok) passed++; else failures++;
  console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${label}${ok ? '' : `  → beklenen ~${expected}±${tol}, bulunan ${actual}`}`);
}

console.log('== Hesaplama birim testleri ==\n');

// --- 1. Levenshtein uzaklığı ---------------------------------------------
console.log('[1] Levenshtein uzaklığı');
eq('aynı diziler', T.editDistance([...'abc'], [...'abc']), 0);
eq('bir yerine koyma', T.editDistance([...'abc'], [...'abd']), 1);
eq('bir silme', T.editDistance([...'abc'], [...'ab']), 1);
eq('bir ekleme', T.editDistance([...'ab'], [...'abc']), 1);
eq('boş -> boş', T.editDistance([], []), 0);
eq('boş -> üç', T.editDistance([], [...'abc']), 3);

// --- 2. WER ---------------------------------------------------------------
console.log('\n[2] WER (kelime hata oranı)');
eq('aynı metin', T.computeWer('Merhaba dünya', 'Merhaba dünya').ratio, 0);
eq('1 kelime yerine koyma (2 kelime)', T.computeWer('Merhaba dünya', 'Merhaba evren').ratio, 0.5);
near('1 kelime silme (3 kelime)', T.computeWer('bir iki üç', 'bir iki').ratio, 1 / 3, 1e-9);
eq('1 kelime ekleme (2 kelime)', T.computeWer('bir iki', 'bir iki üç').ratio, 0.5);
eq('tamamen farklı', T.computeWer('bir iki', 'üç dört').ratio, 1);
eq('noktalama/büyük harf yok sayılır', T.computeWer('Merhaba, dünya!', 'merhaba dünya').ratio, 0);
eq('Türkçe özel karakter', T.computeWer('Şişli Çağrı', 'şişli çağrı').ratio, 0);
eq('referans kelime sayısı', T.computeWer('bir iki üç', 'bir').refCount, 3);
eq('hata sayısı', T.computeWer('bir iki üç', 'bir').errors, 2);

// --- 3. FFT ---------------------------------------------------------------
console.log('\n[3] FFT (bilinen sinüsler)');
function peakHz(freq, N = 1024, sr = 16000) {
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = Math.sin(2 * Math.PI * freq * i / sr);
  const mag = T.fftMagnitude(re, im);
  let bi = 0, bv = 0;
  for (let i = 1; i < N / 2; i++) if (mag[i] > bv) { bv = mag[i]; bi = i; }
  return bi * sr / N;
}
near('1000 Hz sinüs', peakHz(1000), 1000, 20);
near('3000 Hz sinüs', peakHz(3000), 3000, 20);
// Gerçek DC: sabit (tüm örnekler aynı) sinyal. FFT tepe noktası 0 Hz'de olmalı.
{
  const N = 1024, re = new Float32Array(N).fill(1), im = new Float32Array(N);
  const mag = T.fftMagnitude(re, im);
  let bi = 0, bv = 0;
  for (let i = 0; i < N / 2; i++) if (mag[i] > bv) { bv = mag[i]; bi = i; }
  eq('sabit sinyal (DC) -> 0 Hz', bi, 0);
}

// --- 4. Perde (temel frekans) --------------------------------------------
console.log('\n[4] Perde ölçümü (otokorelasyon)');
function sine(f, n, sr = 22050) { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.sin(2 * Math.PI * f * i / sr); return a; }
near('120 Hz', T.detectPitchHz(sine(120, 22050 * 0.4), 22050), 120, 6);
near('220 Hz', T.detectPitchHz(sine(220, 22050 * 0.4), 22050), 220, 10);
eq('gürültü -> sonuç yok', T.detectPitchHz(Float32Array.from({ length: 22050 * 0.4 }, () => Math.random() * 2 - 1), 22050), null);

// --- 5. Türkçe yönelme eki ------------------------------------------------
console.log('\n[5] Türkçe yönelme eki');
eq('Mahkemesi -> NE', T.trDative('Antalya 4. Asliye Hukuk Mahkemesi'), "NE");
eq('Başsavcılığı -> NA', T.trDative('Ankara Cumhuriyet Başsavcılığı'), "NA");
eq('Müdürlüğü -> NE', T.trDative('İzmir 5. İcra Müdürlüğü'), "NE");
eq('boş -> NE', T.trDative(''), "NE");

// --- 6. Zaman kodu --------------------------------------------------------
console.log('\n[6] Zaman kodu dönüşümü');
eq('0 sn', T.timecode(0), '00:00:00.000');
eq('65 sn', T.timecode(65), '00:01:05.000');
eq('3661 sn', T.timecode(3661), '01:01:01.000');
eq('timecode -> sn', T.secondsFromTimecode('00:01:05'), 65);
eq('bozuk giriş -> 0', T.secondsFromTimecode('abc'), 0);
// Milisaniye hassasiyeti: 0,1 sn'lik sınır kaydırma ve "buradan böl" bu
// dönüşüme dayanır; saniyeye yuvarlanırsa alt saniye kaybolur.
eq('0,1 sn korunur', T.timecode(5.1), '00:00:05.100');
eq('0,5 sn korunur', T.timecode(5.5), '00:00:05.500');
eq('ms -> sn', T.secondsFromTimecode('00:00:05.500'), 5.5);
near('0,1 sn gidiş-dönüş', T.secondsFromTimecode(T.timecode(5.1)), 5.1, 1e-9);
{
  let cur = T.secondsFromTimecode('00:00:05');
  for (let i = 0; i < 5; i++) cur = T.secondsFromTimecode(T.timecode(cur + 0.1));
  near('5 x +0,1 sn birikimi', cur, 5.5, 1e-9);
}
eq('tam saniye de ms gösterir', T.timecode(5), '00:00:05.000');

// --- 7. Dolgu tespiti -----------------------------------------------------
console.log('\n[7] Dolgu/halüsinasyon tespiti');
eq('boş metin', T.isHallucination(''), true);
eq('(Konuşma)', T.isHallucination('(Konuşma)'), true);
eq('(Müzik - Jenerik)', T.isHallucination('(Müzik - Jenerik)'), true);
eq('gerçek cümle', T.isHallucination('Merhaba, depozito hakkında konuşmak istiyorum.'), false);

// --- 7b. Paragraf görünümü (SALT OKUNUR) --------------------------------
// v2.195: eski `paragraphize` bölümleri DEĞİŞTİRİYORDU. Artık paragraf bir
// GÖRÜNÜMDÜR: aynı konuşmacının ardışık bölümleri gruplanır; `segments`
// dokunulmaz. Kanıt tablosu aynen kalır.
console.log('\n[7b] Paragraf görünümü (salt okunur)');
{
  const m = { segments: [
    { id: 'a1', start: '00:00:00', end: '00:00:05', speaker: 'A', text: 'bir', review: 'onaylandi' },
    { id: 'a2', start: '00:00:05', end: '00:00:09', speaker: 'A', text: 'iki', review: 'onaylandi' },
    { id: 'b1', start: '00:00:09', end: '00:00:14', speaker: 'B', text: 'üç', review: 'bekliyor' }
  ] };
  const groups = T.paragraphGroups(m.segments);
  eq('iki paragraf grubu', groups.length, 2);
  eq('aynı konuşmacı birleşti', groups[0].text, 'bir iki');
  eq('aralık genişledi', [groups[0].start, groups[0].end], ['00:00:00', '00:00:09']);
  eq('konuşmacı değişince yeni grup', groups[1].speaker, 'B');
  eq('grup bölüm sayısı', groups[0].count, 2);
  eq('onaysız içerik işaretli', groups[1].unreviewed, true);
  // SALT OKUNUR: segmentler DEĞİŞMEZ.
  eq('segment sayısı korunur', m.segments.length, 3);
  eq('segment metni korunur', m.segments[1].text, 'iki');
}

// --- 7c. Sessizlik ölçümü -------------------------------------------------
// Sessizlik ölçümü deterministiktir: verilen sinyalin RMS dağılımına göre
// sessiz oranı hesaplanır. Uydurma bir "konuşma olasılığı" üretilmez.
console.log('\n[7c] Sessizlik ölçümü');
{
  const sr = 16000;
  // 3 sn: ilk 1.5 sn sessiz (küçük gürültü), son 1.5 sn konuşma (büyük genlik).
  const n = sr * 3; const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    s[i] = t < 1.5 ? 0.001 * Math.sin(i) : 0.3 * Math.sin(2 * Math.PI * 220 * t);
  }
  const st = T.analyzeSilence(s, sr, 0, 3);
  eq('ölçüm geçerli', st.ok, true);
  eq('süre ~3 sn', Math.round(st.durationSec), 3);
  // Sessiz oran yaklaşık yarı olmalı (±0.2 tolerans).
  near('sessiz oran ~0.5', st.ratio, 0.5, 0.2);
  // Tümü sessiz sinyalde oran ~1.
  const quiet = new Float32Array(n).fill(0.0005);
  near('tam sessiz ~1', T.analyzeSilence(quiet, sr, 0, 3).ratio, 1, 0.02);
  // Tümü konuşma sinyalinde oran ~0.
  const loud = new Float32Array(n);
  for (let i = 0; i < n; i++) loud[i] = 0.4 * Math.sin(2 * Math.PI * 200 * i / sr);
  near('tam konuşma ~0', T.analyzeSilence(loud, sr, 0, 3).ratio, 0, 0.02);
  // Boş aralık -> ok:false.
  eq('boş aralık', T.analyzeSilence(s, sr, 3, 3).ok, false);
  // İşaret yalnızca metin boş/dolgu iken ve yeterince sessizse üretilir.
  const stats = T.analyzeSilence(quiet, sr, 0, 3);
  eq('boş metin + sessiz -> işaret', !!T.segmentSilenceFlag(stats, '', T.isHallucination), true);
  eq('anlamlı metin + sessiz -> işaret yok', T.segmentSilenceFlag(stats, 'merhaba dünya', T.isHallucination), null);
}

// --- 7c-2. Seviye ölçümü ---------------------------------------------------
// Tepe/RMS, tepe kırpılma, gürültü tabanı ve SNR ölçümü bilinen sinyallerle
// sınanır. Bu değerler rapora "Seviye ölçümü" tablosu olarak girdiği için
// yanlış hesaplanmaları doğrudan raporu bozar.
console.log('\n[7c-2] Seviye ölçümü');
{
  const sr = 16000;
  // 1 sn, 0.5 genlikli sinüs: tepe 0.5 -> -6.02 dBFS, RMS 0.3536 -> -9.03 dBFS.
  const n = sr;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / sr);
  const lv = T.analyzeLevels(s, sr);
  eq('ölçüm geçerli', lv.ok, true);
  near('tepe 0,5', lv.peak, 0.5, 0.01);
  near('tepe dBFS ~ -6,0', lv.peakDb, -6.02, 0.15);
  near('RMS ~ 0,354', lv.rms, 0.3536, 0.01);
  near('RMS dBFS ~ -9,0', lv.rmsDb, -9.03, 0.15);
  eq('kırpılma yok', lv.clippedSamples, 0);
  eq('kırpılma oranı 0', lv.clippedRatio, 0);

  // Tam ölçekli kare dalga: örneklerin yarısı kırpılmış sayılmalı.
  const clip = new Float32Array(n);
  for (let i = 0; i < n; i++) clip[i] = i < n / 2 ? 1 : -1;
  const lv2 = T.analyzeLevels(clip, sr);
  eq('kırpılma sayıldı', lv2.clippedSamples > n * 0.4, true);
  eq('kırpılma oranı > %40', lv2.clippedRatio > 0.4, true);
  near('tam ölçek tepe 0 dBFS', lv2.peakDb, 0, 0.01);

  // Tek tükürük örneği kırpılma sayılmamalı (en az 3 ardışık örnek kuralı).
  const spike = new Float32Array(sr).fill(0.1);
  spike[100] = 1;
  eq('tek örnek kırpılma sayılmaz', T.analyzeLevels(spike, sr).clippedSamples, 0);

  // Gürültü tabanı ve SNR: sessiz zemin + yüksek düzey karışımı.
  const mix = new Float32Array(sr * 2);
  for (let i = 0; i < mix.length; i++) {
    const t = i / sr;
    mix[i] = t < 1 ? 0.002 * Math.sin((2 * Math.PI * 100 * i) / sr) : 0.5 * Math.sin((2 * Math.PI * 300 * i) / sr);
  }
  const lv3 = T.analyzeLevels(mix, sr);
  eq('SNR ölçüldü', Number.isFinite(lv3.snrDb), true);
  eq('SNR pozitif', lv3.snrDb > 10, true);
  eq('gürültü tabanı konuşmadan düşük', lv3.noiseFloor < lv3.speechLevel, true);

  // Boş kayıt ölçülemez.
  eq('boş kayıt', T.analyzeLevels(new Float32Array(0), sr).ok, false);

  // Sayısal sessizlik: gürültü tabanı tam 0 -> SNR sonsuz, "ölçülemedi" değil.
  const gated = new Float32Array(sr);
  for (let i = 0; i < sr / 2; i++) gated[i] = 0; // ilk yarı tam sessiz
  for (let i = sr / 2; i < sr; i++) gated[i] = 0.4 * Math.sin((2 * Math.PI * 200 * i) / sr);
  const lvG = T.analyzeLevels(gated, sr);
  eq('sayısal sessizlikte SNR sonsuz', lvG.snrDb, Infinity);
  eq('sonsuz SNR metni', T.snrText(Infinity), 'sonsuz (sayısal sessizlik)');
  eq('ölçülemeyen SNR metni', T.snrText(null), 'ölçülemedi');
  eq('normal SNR metni', T.snrText(42.06), '42,1 dB');
  // Negatif sıfır yazılmaz: 0'a yuvarlanan değer "0,0" olur.
  eq('negatif sıfır gösterilmez', T.fmtDb(-0.04), '0,0');
  eq('küçük negatif korunur', T.fmtDb(-0.6), '-0,6');
  // Gürültü tabanı tam sıfır -> sayısal sessizlik, "ölçülemedi" değil.
  eq('sıfır gürültü tabanı', T.floorText(0), 'sessizlik (0)');
  eq('normal gürültü tabanı', T.floorText(0.0005), '-66,0 dBFS');
  eq('ölçülemeyen gürültü tabanı', T.floorText(NaN), 'ölçülemedi');
}

// --- 7c-3. Stereo ve bant genişliği --------------------------------------
console.log('\n[7c-3] Stereo ve bant genişliği');
{
  const sr = 16000;
  const n = sr;
  // Aynı sinyal iki kanalda: korelasyon +1, denge 0 dB.
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { a[i] = 0.4 * Math.sin((2 * Math.PI * 200 * i) / sr); b[i] = a[i]; }
  const st = T.analyzeStereo(a, b, sr);
  eq('stereo ölçüm geçerli', st.ok, true);
  near('korelasyon +1', st.correlation, 1, 0.01);
  near('denge 0 dB', st.balanceDb, 0, 0.05);
  near('DC ~0', st.dcOffsetL, 0, 0.01);

  // Ters işaretli kanal: korelasyon -1.
  const c2 = new Float32Array(n);
  for (let i = 0; i < n; i++) c2[i] = -a[i];
  near('ters faz korelasyon -1', T.analyzeStereo(a, c2, sr).correlation, -1, 0.01);

  // Sağ kanal yarı genlikte: denge ~ +6 dB (sol daha yüksek).
  const half = new Float32Array(n);
  for (let i = 0; i < n; i++) half[i] = 0.2 * Math.sin((2 * Math.PI * 200 * i) / sr);
  near('yarı genlik denge ~6 dB', T.analyzeStereo(a, half, sr).balanceDb, 6.02, 0.3);

  // DC kayması doğru okunur.
  const dc = new Float32Array(n).fill(0.05);
  near('DC kayması 0,05', T.analyzeStereo(dc, dc, sr).dcOffsetL, 0.05, 1e-6);

  eq('boş stereo', T.analyzeStereo(new Float32Array(0), new Float32Array(0), sr).ok, false);

  // Bant genişliği: 300 Hz sinüs -> rolloff 300 Hz civarında olmalı.
  const tone = new Float32Array(n);
  for (let i = 0; i < n; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / sr);
  const ro = T.spectralRolloff(tone, sr);
  eq('rolloff ölçüldü', !!ro, true);
  eq('rolloff 300 Hz civarı', Math.abs(ro.rolloffHz - 300) < 120, true);
  eq('Nyquist 8000', ro.nyquistHz, 8000);
  // Çok kısa sinyal ölçülemez.
  eq('kısa sinyal -> null', T.spectralRolloff(new Float32Array(100), sr), null);
}

// --- 7d. Terim yazım tutarlılığı ------------------------------------------
// Aynı terimin küçük yazım farkıyla geçtiği durumlar bulunmalı; farklı
// terimler birbirine karıştırılmamalı. Uydurma yoktur; yalnızca metinde geçen
// sözcükler karşılaştırılır.
console.log('\n[7d] Terim yazım tutarlılığı');
{
  // "depozito" ve "depozit" gerçekten farklı yazımlar.
  const issues = T.findTermInconsistencies([
    'depozito ödemesi yapıldı', 'depozit iade edilecek', 'depozito tutarı',
  ]);
  eq('tutarsızlık bulundu', issues.length, 1);
  eq('en sık biçim esas', issues[0].canonical, 'depozito');
  eq('iki yazım listelendi', issues[0].forms.length, 2);
  // Tek yazım varsa küme oluşmaz.
  eq('tek yazım -> sonuç yok', T.findTermInconsistencies(['depozito depozito depozito']).length, 0);
  // İşlev sözcükleri elenir.
  eq('stopword elenir', T.contentWords('bir bu ve ile depozito').includes('depozito'), true);
  eq('stopword listede yok', T.contentWords('bir bu ve ile').length, 0);
  // Yazım düzeltme yalnızca tam sözcük sınırında çalışır.
  const m = { segments: [ { text: 'depozit iade', history: [] }, { text: 'depozitin bir kısmı', history: [] } ] };
  const changed = T.applyTermForm(m, 'depozit', 'depozito');
  eq('tek tam sözcük değişti', changed, 1);
  eq('metin güncellendi', m.segments[0].text, 'depozito iade');
  // "depozitin" içindeki "depozit" sözcük sınırıyla eşleşmemeli.
  eq('sözcük sınırı korunur', m.segments[1].text, 'depozitin bir kısmı');
}

// --- 7e. Tekrar/dolgu tespiti ---------------------------------------------
// Whisper bazen aynı ifadeyi arka arkaya tekrarlar; bu gerçek konuşma değil
// model artefaktı olabilir. Yalnızca metindeki gerçek tekrar ölçülür.
console.log('\n[7e] Tekrar/dolgu tespiti');
{
  // Ardışık aynı cümle (3 kez) -> tekrar.
  const r1 = T.detectRepetition('Evet. Evet. Evet.');
  eq('ardışık tekrar bulundu', !!r1, true);
  eq('ardışık sayı', r1.maxRun, 3);
  // Normal cümle -> tekrar yok.
  eq('normal metin -> tekrar yok', T.detectRepetition('Merhaba, depozito hakkında konuşmak istiyorum.'), null);
  // Aynı ifade bölüm boyunca çok kez.
  const r2 = T.detectRepetition('Teşekkürler. Teşekkürler. Teşekkürler. Teşekkürler.');
  eq('aşırı yinelenen ifade', !!r2, true);
  // Çok kısa metin değerlendirilmez.
  eq('kısa metin atlanır', T.detectRepetition('Evet.'), null);
  // Bölüm işareti yalnızca gerçek tekrarda.
  eq('bölüm işareti', !!T.segmentRepetitionFlag({ text: 'Evet. Evet. Evet. Evet.' }), true);
  eq('bölüm işareti yok', T.segmentRepetitionFlag({ text: 'Tek bir normal cümle yazılmış.' }), null);
}

// --- 7f. Yedekleme / geri yükleme -----------------------------------------
// Çalışma paketi (yedek) biçimi sabittir; doğrulama ve ses eşleme saf
// fonksiyonlarla test edilir. Böylece dışa/içe aktarma akışı regresyona karşı
// korunur.
console.log('\n[7f] Yedekleme / geri yükleme');
{
  const c = { id: 'c1', fileNo: '2026/214 E.', materials: [] };
  const pack = T.buildProjectPack(c);
  eq('şema sabit', pack.schema, 'mihenk.project.v1');
  eq('dosya taşınır', pack.case, c);
  eq('geçerli paket', T.validateProjectPack(pack), null);
  eq('yanlış şema reddedilir', T.validateProjectPack({ schema: 'x', case: {} }) !== null, true);
  eq('dosya yoksa reddedilir', T.validateProjectPack({ schema: 'mihenk.project.v1' }) !== null, true);
  eq('boş paket reddedilir', T.validateProjectPack(null) !== null, true);
  // Ses girdisi eşleme: `${m.id}_...` biçimi; klasör girdileri atlanır.
  const names = ['case.json', 'audio/', 'audio/m1_a.wav', 'audio/m2_b.wav'];
  const mats = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
  const matched = T.matchAudioEntries(names, mats);
  eq('iki ses eşlendi', matched.length, 2);
  eq('ilk eşleme', matched[0], { materialId: 'm1', entry: 'audio/m1_a.wav' });
  eq('eşleşmeyen materyal atlanır', matched.some((x) => x.materialId === 'm3'), false);
}

// --- 7g. Model yöneticisi -------------------------------------------------
// Bütünlük kontrolü saf fonksiyonla test edilir; kütüphane sağlama toplamı
// yayımlamadığı için yapısal denetim yapılır (gerekli dosyalar + boş olmama).
console.log('\n[7g] Model yöneticisi');
{
  const base = 'https://huggingface.co/onnx-community/whisper-small/resolve/main/';
  const full = [
    base + 'config.json',
    base + 'preprocessor_config.json',
    base + 'tokenizer.json',
    base + 'tokenizer_config.json',
    base + 'onnx/encoder_model.onnx',
    base + 'onnx/decoder_model_merged.onnx'
  ];
  eq('eksiksiz model geçer', T.evaluateModelIntegrity(full, 0).ok, true);
  eq('eksik dosya kalır', T.evaluateModelIntegrity(full.slice(0, 4), 0).ok, false);
  eq('boş dosya kalır', T.evaluateModelIntegrity(full, 1).ok, false);
  // Model kimliği URL'den çıkarılır.
  eq('model kimliği', T.modelIdFromUrl(full[0]), 'onnx-community/whisper-small');
  eq('model dışı URL', T.modelIdFromUrl('https://example.com/x.json'), null);
  // Donanım önerisi.
  eq('WebGPU -> orta model', T.recommendModel('webgpu').id, 'onnx-community/whisper-medium-ONNX');
  eq('CPU -> küçük model', T.recommendModel('wasm').id, 'onnx-community/whisper-small');
  // Duyarlılık (dtype): kalite öncelikli. WebGPU fp16, bellek yetmezse q4.
  // WASM fp32. Bileşen-bazlı nesne KULLANILMAZ (fp32 decoder bellek taşırır).
  const wasmC = T.dtypeCandidates('wasm');
  const gpuC = T.dtypeCandidates('webgpu');
  eq('WASM tek aday fp32', wasmC, ['fp32']);
  // WebGPU: fp16 onerilir, bellek yetmezse q4'e duser (asla fp32'ye yukselmez).
  eq('WebGPU ilk aday fp16', gpuC[0], 'fp16');
  eq('WebGPU yedek aday q4 (daha kucuk)', gpuC[1], 'q4');
  eq('dtype etiketi metin', T.dtypeLabel('fp16'), 'fp16');
  // Kısa model adları.
  eq('kısa ad (küçük)', T.modelShortName('onnx-community/whisper-small'), 'Küçük model');
  eq('kısa ad (orta)', T.modelShortName('onnx-community/whisper-medium-ONNX'), 'Orta model');
  eq('bilinmeyen ad', T.modelShortName('a/b'), 'b');
  eq('boş ad', T.modelShortName(null), '—');
}

// --- 7h. Deşifre motoru ---------------------------------------------------
// Pencere bölme ve model çıktısı ayrıştırma saf fonksiyonlarla test edilir;
// uzun kayıt yönetimi ve zaman ofseti buna dayanır.
console.log('\n[7h] Deşifre motoru');
{
  // 75 sn'lik kayıt, 30 sn pencere -> 3 pencere (30+30+15).
  const wins = T.asrWindows(75 * 16000, 16000, 30);
  eq('pencere sayısı', wins.length, 3);
  eq('ilk pencere', [wins[0].offset, wins[0].end, wins[0].seconds], [0, 30 * 16000, 30]);
  eq('son pencere taşmaz', [wins[2].startSeconds, wins[2].seconds], [60, 15]);
  eq('boş kayıt -> pencere yok', T.asrWindows(0).length, 0);
  // Model çıktısı ayrıştırma: zaman ofseti uygulanır.
  const res = { chunks: [{ text: ' merhaba', timestamp: [1, 3] }] };
  const segs = T.parseAsrResult(res, 60, 30);
  eq('ofset uygulandı', [segs[0].start, segs[0].end], ['00:01:01.000', '00:01:03.000']);
  eq('metin kırpıldı', segs[0].text, 'merhaba');
  // Kelime zamanları korunur (karaoke).
  const res2 = { chunks: [{ text: 'a b', timestamp: [0, 2], words: [{ word: 'a', start: 0, end: 1 }, { word: 'b', start: 1, end: 2 }] }] };
  const segs2 = T.parseAsrResult(res2, 0, 30);
  eq('kelime zamanları', segs2[0].words.length, 2);
  eq('kelime başlangıcı', segs2[0].words[1].s, '00:00:01.000');
  // Chunk yoksa metin fallback pencere süresini kullanır.
  const segs3 = T.parseAsrResult({ text: 'tek metin' }, 10, 5);
  eq('fallback aralığı', [segs3[0].start, segs3[0].end], ['00:00:10.000', '00:00:15.000']);
  // Boş çıktı -> bölüm yok.
  eq('boş çıktı', T.parseAsrResult({ chunks: [] }, 0, 30).length, 0);
  // Dil uyarısı: İngilizce işaretçiler + Türkçe karakter yok.
  eq('İngilizce görünüm', T.looksNonTurkish('the and you are here'), true);
  eq('Türkçe metin', T.looksNonTurkish('merhaba, depozito iade edilecek'), false);
  eq('Türkçe karakter varsa uyarı yok', T.looksNonTurkish('the çay'), false);
  // Dosya adı güvenliği.
  eq('güvenli ad', T.safeName('2026/214 E.'), '2026_214_E');
  eq('boş ad yedeği', T.safeName(''), 'AKIS_Raporu');
}

// --- 7i. Çöp çıktı tespiti (timestamp token sızıntısı) --------------------
// Whisper ONNX modelleri bazen timestamp/özel token'ları metne dökerek
// "- - - -" veya "< - < - < < <" gibi çöp üretir. Bu ASLA deşifre sayılmamalı.
console.log('\n[7i] Çöp çıktı tespiti');
{
  // Gerçek hatadan alınan desenler.
  const dashLine = '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -';
  const angleLine = '< - < - < - < - < - < - < < < < < < < < < < < < < < < < < < < < < < < < < < < < < <';
  eq('çizgi yığını çöp', T.looksLikeGarbage(dashLine), true);
  eq('açı yığını çöp', T.looksLikeGarbage(angleLine), true);
  eq('tırnak yığını çöp', T.looksLikeGarbage('" - " - " " " " " " " " " " " " " " " " " "'), true);
  // Gerçek Türkçe metin çöp değildir.
  eq('gerçek cümle temiz', T.looksLikeGarbage('Merhaba, depozito iadesi hakkında konuşmak istiyorum.'), false);
  eq('kısa gerçek metin temiz', T.looksLikeGarbage('Evet, doğru.'), false);
  eq('boş metin çöp', T.looksLikeGarbage(''), true);
  // Aynı kelimenin aşırı tekrarı çöp sayılır.
  eq('kelime tekrarı çöp', T.looksLikeGarbage('tamam tamam tamam tamam tamam tamam tamam tamam'), true);
  // isHallucination çöpü de yakalar.
  eq('isHallucination çöpü yakalar', T.isHallucination(dashLine), true);
  // parseAsrResult çöp bölümleri atar; süre sıfırlanmaz.
  const res = { chunks: [
    { text: dashLine, timestamp: [0, 0] },
    { text: 'Gerçek bir konuşma cümlesi burada.', timestamp: [1, 5] }
  ] };
  const segs = T.parseAsrResult(res, 0, 30);
  eq('çöp bölüm atıldı', segs.length, 1);
  eq('kalan bölüm gerçek', segs[0].text, 'Gerçek bir konuşma cümlesi burada.');
  // Bitiş zamanı gelmezse süre sıfır olmamalı.
  const res2 = { chunks: [{ text: 'Bitiş zamanı olmayan bölüm.', timestamp: [2] }] };
  const segs2 = T.parseAsrResult(res2, 0, 30);
  eq('bitiş zamanı tamamlandı', segs2[0].end, '00:00:32.000');
}

// --- 8. Geçmiş sıkıştırma -------------------------------------------------
console.log('\n[8] Metin geçmişi sıkıştırma');
const mk = (arr) => arr.map((t, i) => ({ text: t, at: 't' + i }));
eq('tuş-tuş zincir tek sürüme iner', T.compactHistory(mk(['', 'M', 'Me', 'Mer', 'Merhaba'])).map((x) => x.text), ['']);
eq('iki gerçek sürüm korunur', T.compactHistory(mk(['Merhaba', 'Tamamen farklı'])).map((x) => x.text), ['Merhaba', 'Tamamen farklı']);
eq('tek kayıt değişmez', T.compactHistory(mk(['tek'])).length, 1);

// --- 9. Kontrol durumu ----------------------------------------------------
console.log('\n[9] Kontrol durumu');
// v3 kanonik kodlar: pending | approved | inaudible | relisten.
// v2 Türkçe anahtarları okuma sırasında çevrilir (göç güvencesi).
eq('eski "checked" -> approved', T.segReview({ checked: true }), 'approved');
eq('yeni kayıt -> pending', T.segReview({}), 'pending');
eq('approved denetlenmiş sayılır', T.isReviewed({ review: 'approved' }), true);
eq('inaudible denetlenmiş sayılır', T.isReviewed({ review: 'inaudible' }), true);
eq('relisten denetlenmiş SAYILMAZ', T.isReviewed({ review: 'relisten' }), false);
eq('pending denetlenmiş SAYILMAZ', T.isReviewed({ review: 'pending' }), false);
eq('v2 onaylandi -> approved', T.segReview({ review: 'onaylandi' }), 'approved');
eq('v2 anlasilmadi -> inaudible', T.segReview({ review: 'anlasilmadi' }), 'inaudible');
eq('v2 yeniden -> relisten', T.segReview({ review: 'yeniden' }), 'relisten');
eq('v2 bekliyor -> pending', T.segReview({ review: 'bekliyor' }), 'pending');
eq('bilinmeyen kod -> pending', T.segReview({ review: 'saçma' }), 'pending');

// --- 10. Mercie özel ifadeler --------------------------------------------
console.log('\n[10] Mercie özel ifadeler');
const cHukuk = { reportType: 'hukuk' }, cSav = { reportType: 'savcilik' }, cIcra = { reportType: 'icra' };
eq('hukuk soru kaynağı', T.questionsFallbackText(cHukuk).startsWith('Mahkemece'), true);
eq('savcılık soru kaynağı', T.questionsFallbackText(cSav).startsWith('Cumhuriyet Başsavcılığınca'), true);
eq('icra soru kaynağı', T.questionsFallbackText(cIcra).startsWith('İcra Müdürlüğünce'), true);
eq('savcılıkta "mahkemece" GEÇMEZ', /mahkemece/i.test(T.questionsFallbackText(cSav)), false);

// --- 11. Bölüm sınırı ve dinleme döngüsü ---------------------------------
// v2.78: kullanıcı "dinlerken bölme çizgileri bozuluyor" dedi. İki gerçek hata
// vardı: (a) nudge karşı sınırı sessizce sürüklüyordu, (b) dalgaya dinlemek
// için tıklamak en yakın sınırı taşıyordu. Bu testler hatanın geri dönmesini
// engeller.
console.log('\n[11] Bölüm sınırı ve dinleme döngüsü');
{
  const m = { duration: 60, segments: [{ start: '00:00:10.000', end: '00:00:20.000', text: 'a' }] };
  // Başlangıcı bitişe doğru sonuna kadar it: karşı sınır DEĞİŞMEMELİ.
  T.nudgeBoundary(m, 0, 'start', 100);
  eq('başlangıç itilince bitiş DEĞİŞMEZ', m.segments[0].end, '00:00:20.000');
  eq('başlangıç bitişe 0,1 sn kalana kadar gelir', m.segments[0].start, '00:00:19.900');
  eq('bölüm sıfır uzunlukta kalmaz', T.secondsFromTimecode(m.segments[0].end) > T.secondsFromTimecode(m.segments[0].start), true);

  const m2 = { duration: 60, segments: [{ start: '00:00:10.000', end: '00:00:20.000', text: 'a' }] };
  T.nudgeBoundary(m2, 0, 'end', -100);
  eq('bitiş geri çekilince başlangıç DEĞİŞMEZ', m2.segments[0].start, '00:00:10.000');
  eq('bitiş başlangıca 0,1 sn kalana kadar gelir', m2.segments[0].end, '00:00:10.100');

  // Döngü: bölüm sınırlarına dokunmaz, oturumluk alanda yaşar.
  const m3 = { duration: 60, segments: [{ start: '00:00:10.000', end: '00:00:20.000', text: 'a' }] };
  eq('başlangıçta döngü yok', T.loopRange(m3), null);
  T.setLoopPoint(m3, 'a', 12);
  T.setLoopPoint(m3, 'b', 15);
  eq('A–B kuruldu', !!T.loopRange(m3), true);
  eq('döngü bölüm sınırını değiştirmez (başlangıç)', m3.segments[0].start, '00:00:10.000');
  eq('döngü bölüm sınırını değiştirmez (bitiş)', m3.segments[0].end, '00:00:20.000');
  eq('döngü etiketi A ve B gösterir', T.loopLabel(m3), 'A 00:00:12.000 → B 00:00:15.000');
  // Ters sıra: B, A'nın gerisine ayarlanırsa geçersiz aralık kabul edilmez.
  T.setLoopPoint(m3, 'b', 11);
  eq('B, A gerisindeyse aralık geçersiz', T.loopRange(m3), null);
}

// --- 12. Hızlı onaya uygunluk ölçütü --------------------------------------
// v2.80: kullanıcı "otomatik onaylanabilecek, doğruluğu yüksek olanları
// işaretleyelim" dedi. Uydurma bir doğruluk yüzdesi ÜRETİLMEZ; yalnız
// gözlemlenebilir işaretlere bakılır ve gerekçe metinle gösterilir.
console.log('\n[12] Hızlı onaya uygunluk');
{
  const good = { start: '00:00:01.000', end: '00:00:04.000', text: 'Merhaba, depozito iadesi hakkında konuşmak istiyorum.' };
  eq('normal bölüm uygun', T.segQuickCheck(good).ok, true);
  eq('uygun bölümde gerekçe yok', T.segQuickCheck(good).reasons.length, 0);

  const empty = { start: '00:00:01.000', end: '00:00:04.000', text: '' };
  eq('metinsiz bölüm uygun DEĞİL', T.segQuickCheck(empty).ok, false);
  eq('gerekçe: anlamlı metin yok', T.segQuickCheck(empty).reasons.includes('anlamlı metin yok'), true);

  const dash = { start: '00:00:01.000', end: '00:00:04.000', text: '- - - - - - - - - - - - - - - - -' };
  eq('dolgu metin uygun DEĞİL', T.segQuickCheck(dash).ok, false);

  const short = { start: '00:00:01.000', end: '00:00:01.500', text: 'Evet.' };
  eq('çok kısa bölüm uygun DEĞİL', T.segQuickCheck(short).ok, false);
  eq('gerekçe: çok kısa bölüm', T.segQuickCheck(short).reasons.includes('çok kısa bölüm'), true);

  const zero = { start: '00:00:05.000', end: '00:00:05.000', text: 'Evet, doğru.' };
  eq('süre sıfır uygun DEĞİL', T.segQuickCheck(zero).ok, false);

  // Tekrar ölçütü CÜMLE düzeyinde çalışır (detectRepetition). Bu yüzden test
  // gerçek model tekrarını taklit eder: aynı cümle arka arkaya.
  const rep = { start: '00:00:01.000', end: '00:00:12.000', text: 'Evet doğru. Evet doğru. Evet doğru. Evet doğru.' };
  eq('model tekrarı uygun DEĞİL', T.segQuickCheck(rep).ok, false);
  eq('gerekçe: model tekrarı', T.segQuickCheck(rep).reasons.includes('model tekrarı'), true);

  const overlapObs = { start: '00:00:01.000', end: '00:00:04.000', text: 'Normal bir cümle.', obs: { overlap: true } };
  eq('üst üste işaretli bölüm uygun DEĞİL', T.segQuickCheck(overlapObs).ok, false);

  const prev = { start: '00:00:00.000', end: '00:00:05.000', text: 'önceki' };
  const clash = { start: '00:00:03.000', end: '00:00:08.000', text: 'Normal bir cümle.' };
  eq('öncekiyle çakışan bölüm uygun DEĞİL', T.segQuickCheck(clash, prev).ok, false);

  // Filtre ve sayaç aynı ölçütü kullanmalı (arayüz ile liste ayrışmasın).
  const m = {
    segments: [
      { start: '00:00:00.000', end: '00:00:03.000', text: 'Birinci normal cümle burada.', review: 'pending' },
      { start: '00:00:03.000', end: '00:00:03.400', text: 'Kısa.', review: 'pending' },
      { start: '00:00:04.000', end: '00:00:08.000', text: 'Onaylanmış cümle.', review: 'approved' }
    ]
  };
  const counts = T.segCounts(m);
  eq('sayaç: yalnız uygun ve bekleyen sayılır', counts.quick, 1);
  eq('sayaç: onaylanmış hızlı sayılmaz', counts.approved, 1);
  eq('filtre uygun bölümü seçer', T.segMatchesFilter(m.segments[0], 'quick'), true);
  eq('filtre kısa bölümü seçmez', T.segMatchesFilter(m.segments[1], 'quick'), false);
  eq('filtre onaylanmış bölümü seçmez', T.segMatchesFilter(m.segments[2], 'quick'), false);
}

// --- 13. Çözümleme profilleri ---------------------------------------------
// v2.81: kullanıcı "şive, kıcırtı, malzeme sesi" gibi farklı çözümlemeler
// istedi. Bunlar ayrı model ister; uydurulmaz. Profil yalnız dil ipucu ve
// bağlam istemini değiştirir. Bu test, profilin SINIRINI de doğrular:
// dil her zaman Türkçe kalır ve görev transkripsiyondur.
console.log('\n[13] Çözümleme profilleri');
{
  eq('profil listesi dolu', T.ASR_PROFILES.length >= 2, true);
  eq('bilinmeyen profil standarda düşer', T.asrProfile('yok').id, 'standard');
  eq('standart profilde bağlam istemi yok', T.asrProfileOptions('standard')[0].prompt, undefined);

  for (const p of T.ASR_PROFILES) {
    const opts = T.asrProfileOptions(p.id);
    eq(`profil ${p.id}: dil Türkçe kalır`, opts.every((o) => o.language === 'turkish'), true);
    eq(`profil ${p.id}: görev transkripsiyon`, opts.every((o) => o.task === 'transcribe'), true);
    eq(`profil ${p.id}: geri düşüş merdiveni var`, opts.length, 3);
  }

  // Şive profili ipucu ekler ama dil kilidini bozmaz.
  const dia = T.asrProfileOptions('dialect');
  eq('şive profili bağlam istemi taşır', typeof dia[0].prompt === 'string' && dia[0].prompt.length > 0, true);
  eq('şive profili hâlâ Türkçe', dia[0].language, 'turkish');
  // İlk deneme zaman damgası ve tekrar ayarı taşır.
  eq('ilk deneme zaman damgası ister', dia[0].return_timestamps, true);
  eq('ilk deneme tekrar cezası taşır', dia[0].repetition_penalty > 1, true);
}


// --- 14. Rapor zaman aralığı biçimi ---------------------------------------
// v2.81: elle eklenen bölüm "00:00:00" (ms'siz) yazıldığı için raporda
// "00:00:00 – 00:00:05.000" gibi tutarsız satır çıkıyordu. Depo kuralı:
// zaman kodu HER ZAMAN milisaniye içerir.
console.log('\n[14] Rapor zaman aralığı biçimi');
{
  eq('her iki uç ms içerir', T.tcRange('00:00:00', '00:00:05.000'), '00:00:00.000 – 00:00:05.000');
  eq('zaten ms varsa korunur', T.tcRange('00:00:01.500', '00:00:03.250'), '00:00:01.500 – 00:00:03.250');
  eq('tek uç boşsa tire', T.tcRange('', '00:00:05.000'), '— – 00:00:05.000');
  eq('iki uç boşsa tek tire', T.tcRange('', ''), '—');
}


// --- 15. WER biçimi --------------------------------------------------------
// v2.81: "%94.0" okunaksızdı; Türkçe ondalık ayırıcı virgüldür.
console.log('\n[15] WER biçimi');
{
  eq('yüzde ve virgül', T.fmtWer(0.9403), '%94,0');
  eq('tam sıfır hata', T.fmtWer(0), '%0,0');
  eq('tam hata', T.fmtWer(1), '%100,0');
  eq('sayı değilse tire', T.fmtWer(NaN), '—');
  eq('nokta KULLANILMAZ', /\./.test(T.fmtWer(0.9403)), false);
}


// --- 16. Depolama gösterimi: dava verisi != model önbelleği ----------------
// v2.83: tek sayı göstermek "dava verim doldu" yanılgısı yaratıyordu; model
// indirmek (1,5 GB) dava verisini şişirmiş gibi görünüyordu.
console.log('\n[16] Depolama gösterimi');
{
  eq('KB biçimi', T.fmtBytesShort(5 * 1024), '5 KB');
  eq('MB biçimi', T.fmtBytesShort(17 * 1024 * 1024), '17.0 MB');
  eq('GB biçimi', T.fmtBytesShort(10 * 1024 * 1024 * 1024), '10.00 GB');
  eq('sıfır', T.fmtBytesShort(0), '0 B');
  eq('negatif sıfır sayılır', T.fmtBytesShort(-5), '0 B');
}

// --- 17. Kayda yazılabilir kopya (v2.87 — KRİTİK VERİ KAYBI) --------------
// GERÇEK HATA (canlı veride yaşandı): Bölüme tıklandığında `attachSegWave()`
// malzeme nesnesine FONKSİYON yazıyordu (m.__segWaveRebind / __segWaveRedraw).
// `persistNow()` appState'i doğrudan IndexedDB'ye put ediyor; structuredClone
// fonksiyon kopyalayamadığı için işlem DataCloneError ile iptal ediliyordu.
// Sonuç: bilirkişi bölüme tıkladıktan sonra yaptığı TÜM iş kayboldu.
// Ekranda yalnız küçük "● Kayıt başarısız" yazısı vardı; uyarı şeridi
// görünmüyordu (kota hatası sayılmadığı için).
// Bu test, kayda giden kopyanın HER ZAMAN klonlanabilir olduğunu doğrular.
console.log('\n[17] Kayda yazılabilir kopya (DataCloneError koruması)');
{
  eq('sanitizeForStorage tanımlı', typeof T.sanitizeForStorage, 'function');

  if (typeof T.sanitizeForStorage === 'function') {
    // Gerçek hata senaryosu: oturumluk fonksiyonlar malzemede duruyor.
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    m.__segWaveRebind = () => {};
    m.__segWaveRedraw = () => {};
    m.__specData = { cols: 2, bins: 2, data: [1, 2, 3, 4] };
    m.__zoom = { a: 0, b: 1 };
    m.__sdZoom = { a: 0, b: 1 };
    const state = { cases: [{ id: 'c1', materials: [m] }] };

    const clean = T.sanitizeForStorage(state);
    const keys = Object.keys(clean.cases[0].materials[0]);
    eq('fonksiyon alanı kalmadı', keys.filter((k) => k.startsWith('__')), []);
    eq('spektrogram verisi kayda girmez', '__specData' in clean.cases[0].materials[0], false);
    eq('yakınlaştırma penceresi kayda girmez', '__zoom' in clean.cases[0].materials[0], false);

    // Kopya gerçekten klonlanabilmeli (IndexedDB'nin yaptığı işlem).
    let cloneError = null;
    try {
      structuredClone(clean);
    } catch (e) {
      cloneError = e.name;
    }
    eq('kopya klonlanabilir (DataCloneError yok)', cloneError, null);

    // Temizlik orijinali bozmamalı: ekran hâlâ fonksiyonları kullanıyor.
    eq('orijinal nesne değişmedi', typeof state.cases[0].materials[0].__segWaveRebind, 'function');
    // Dava verisi korunur (temizlik veri atmaz).
    eq('dosya verisi korundu', clean.cases[0].materials[0].fileName, 'a.wav');
  }
}

// --- 18. Kayıt hatası GÖRÜNÜR olmalı (v2.87) ------------------------------
// GERÇEK HATA: yazma herhangi bir nedenle başarısız olduğunda yalnız küçük
// durum yazısı değişiyordu. Bilirkişi uyarıyı görmedi ve işini kaybetti.
// Her yazma hatası büyük, kapatılamaz uyarı şeridi göstermelidir.
console.log('\n[18] Kayıt hatası görünürlüğü');
{
  eq('showSaveFailureBanner tanımlı', typeof T.showSaveFailureBanner, 'function');

  if (typeof T.showSaveFailureBanner === 'function') {
    // Durum yazısı ve şerit gerçekten kurulmalı.
    T.showSaveFailureBanner('DataCloneError');
    eq('durum yazısı kayıt başarısız', String(T.el('#saveState').textContent).includes('KAYDEDİLMİYOR'), true);
    eq('büyük uyarı şeridi göründü', T.el('#saveFailureBanner').hidden, false);
    // Türkçe büyük İ küçük i'ye JS `/i` bayrağıyla eşlenmez; tr-TR ile indir.
    const bannerText = String(T.el('#saveFailureBanner').innerHTML).toLocaleLowerCase('tr-TR');
    eq('uyarı metni ne olduğunu söyler', bannerText.includes('kaydedilmiyor'), true);
    eq('uyarı metni ne yapılacağını söyler', bannerText.includes('paket oluştur'), true);

    T.hideSaveFailureBanner();
    eq('şerit kapatılabilir', T.el('#saveFailureBanner').hidden, true);
  }
}

// --- 19. Sürüm notu: kullanıcı kritik düzeltmeden haberdar olmalı (v2.87) --
// GERÇEK DURUM: bilirkişi "kayıt başarısız uyarısını görmedim" dedi ve işini
// kaybetti. Bir hata sessizce düzeltilip geçilemez: kullanıcı ne değiştiğini
// uygulamayı açtığında görmelidir. Not her sürümde BİR KEZ gösterilir
// (akis.seenNotice.<sürüm>), her açılışta tekrarlamaz.
console.log('\n[19] Sürüm notu (kullanıcı haberdar edilir)');
{
  eq('VERSION_NOTICES tanımlı', typeof T.VERSION_NOTICES, 'object');
  // Not, SÜRÜMDEN BAĞIMSIZ sınanır: her sürümde yeni bir anahtar eklenir ve
  // testin elle güncellenmesi gerekmez. Güncel sürümün notu MUTLAKA olmalı.
  const ver = T.APP_VERSION;
  eq('güncel sürüm için not var', !!(T.VERSION_NOTICES && T.VERSION_NOTICES[ver]), true);
  eq('2.87 notu korunuyor', !!(T.VERSION_NOTICES && T.VERSION_NOTICES['2.87']), true);
  const note = (T.VERSION_NOTICES && T.VERSION_NOTICES[ver]) || {};
  eq('notun başlığı var', String(note.title || '').length > 10, true);
  eq('notun gövdesi var', String(note.body || '').length > 40, true);

  eq('maybeShowVersionNotice tanımlı', typeof T.maybeShowVersionNotice, 'function');
  if (typeof T.maybeShowVersionNotice === 'function') {
    // Uygulamanın kullandığı depolama (sandbox) üzerinden sına.
    const store = T.store;
    store.removeItem(`akis.seenNotice.${ver}`);
    const first = T.maybeShowVersionNotice();
    eq('ilk açılışta gösterilir', first, true);
    eq('görüldü olarak işaretlendi', store.getItem(`akis.seenNotice.${ver}`), '1');
    // İkinci açılış: tekrar gösterilmez.
    const second = T.maybeShowVersionNotice();
    eq('ikinci açılışta tekrarlamaz', second, false);
    // Gösterilen şerit gerçekten kullanıcıya hitap etmeli.
    const notice = T.el('#versionNotice');
    eq('şerit görünür', notice.hidden, false);
    // Şerit metni güncel sürümün notunu taşımalı. Karşılaştırma HTML
    // kaçışlarından arındırılarak yapılır (başlıkta " veya & olabilir).
    const plain = (x) => String(x).replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .toLocaleLowerCase('tr-TR');
    eq('şerit güncel not başlığını taşır',
      plain(notice.innerHTML).includes(plain(note.title).slice(0, 20)), true);
  }
}

// --- 20. Onay metne BAĞLI olmalı (v2.88 — adli bütünlük) ----------------
// GERÇEK HATA: `setSegmentText()` yalnız metni yazıyor, kontrol durumuna
// dokunmuyordu. Onaylanmış bir bölümün metni TAMAMEN değiştirilse bile rozet
// "Onaylandı" kalıyordu (gerçek tarayıcıda ölçüldü: boş bölüm onayla →
// "st-approved", metni değiştir → hâlâ "st-approved", sayaç "Onaylandı 1").
// Bu, depo ilkesinin doğrudan ihlali: "Kontrol edilmeyen deşifre, kontrol
// edilmiş gibi gösterilmez." Onay daima metne bağlıdır.
console.log('\n[20] Onay metne bağlı (metin değişince onay düşer)');
{
  const mkCase = () => {
    const c = T.emptyCaseForTest({ id: 'c1' });
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    const s = T.emptySegmentForTest({
      id: 's1',
      start: '00:00:00.000',
      end: '00:00:05.000',
      text: 'onaylanmış metin',
      review: 'approved'
    });
    m.segments.push(s);
    c.materials.push(m);
    T.setAppState({ cases: [c], activeCaseId: 'c1' });
    return { c, m, s };
  };

  // 1) Doğrudan metin yazımı (tek darboğaz: setSegmentText) onayı düşürmeli.
  {
    const { s } = mkCase();
    const changed = T.setSegmentText(s, 'TAMAMEN FARKLI BİR METİN');
    eq('metin yazıldı', changed, true);
    eq('onay düştü', T.segReview(s), 'pending');
    eq('onaylı sayılmıyor', T.isReviewed(s), false);
    eq('rapor etiketi "Kontrol bekliyor"', T.reviewLabel(s), 'Kontrol bekliyor');
  }

  // 2) Gerçek düzenleme yolu (applyTextEdit) da aynı sonucu vermeli.
  {
    const { s } = mkCase();
    T.applyTextEdit(s, 'BAŞKA BİR METİN');
    eq('applyTextEdit sonrası onay düştü', T.segReview(s), 'pending');
  }

  // 3) Metin DEĞİŞMEDİYSE onay korunur (gereksiz düşürme yok).
  {
    const { s } = mkCase();
    const changed = T.setSegmentText(s, 'onaylanmış metin');
    eq('aynı metin değişiklik sayılmaz', changed, false);
    eq('aynı metinde onay korunur', T.segReview(s), 'approved');
  }

  // 4) Onaysız bölümde durum zaten pending; "Anlaşılmadı" gibi insan kararı
  //    metin değişince korunmamalı (metin değişti = yeniden bakılmalı).
  {
    const { s } = mkCase();
    s.review = 'inaudible';
    T.setSegmentText(s, 'yeni metin');
    eq('"Anlaşılmadı" da düşer (metin değişti)', T.segReview(s), 'pending');
  }

  // 5) Yeniden dinleme işareti de metne bağlıdır.
  {
    const { s } = mkCase();
    s.review = 'relisten';
    T.setSegmentText(s, 'başka metin');
    eq('"Yeniden dinlenecek" düşer', T.segReview(s), 'pending');
  }

  // 6) SESSİZ düşüş yasak: onay düştüyse kullanıcı bilgilendirilmeli.
  //    Her tuşta uyarı gürültü olur; bu yüzden düşüş bir kez, odak kaybında
  //    bildirilir. Saf yardımcı test edilebilir olmalı.
  eq('approvalDroppedByEdit tanımlı', typeof T.approvalDroppedByEdit, 'function');
  if (typeof T.approvalDroppedByEdit === 'function') {
    const { s } = mkCase();
    T.snapshotSegmentText(s);
    T.setSegmentText(s, 'yeni metin');
    eq('onay düşüşü algılanır', T.approvalDroppedByEdit(s), true);
    // Aynı metin yazılırsa düşüş yok.
    const b = mkCase().s;
    T.snapshotSegmentText(b);
    T.setSegmentText(b, 'onaylanmış metin');
    eq('değişmeyen metinde düşüş bildirilmez', T.approvalDroppedByEdit(b), false);
    // Onaysız bölümde düşüş bildirilmez (zaten pending).
    const c2 = mkCase().s;
    c2.review = 'pending';
    T.snapshotSegmentText(c2);
    T.setSegmentText(c2, 'başka');
    eq('zaten bekleyen bölümde bildirim yok', T.approvalDroppedByEdit(c2), false);
  }
}

// --- 21. WER MODELİN çıktısını ölçmeli (v2.90 — yanıltıcı doğruluk) ------
// GERÇEK HATA: `measureWerForCase` hipotez olarak `s.text` (bilirkişinin
// düzenlediği metin) kullanıyordu. Modelin ürettiği ham metin `s.asrText`'te
// duruyor ama ölçüme hiç girmiyordu. Sonuç: ölçüm TERS çalışıyordu.
//   • model %100 hatalı, bilirkişi metni referansa eşit → rapor "%0 WER"
//   • model mükemmel, bilirkişi metni bozuk               → rapor "%100 WER"
// Yani "çözümleme doğruluğu" tablosu modelin doğruluğunu değil, bilirkişinin
// referansa ne kadar yaklaştığını ölçüyordu. Rapor metni ise "otomatik
// çözümleme çıktısının referansla karşılaştırılması" diyordu — yanlış iddia.
// Kural: WER modelin çıktısını ölçer; model çıktısı yoksa satır YAZILMAZ.
console.log('\n[21] WER modelin çıktısını ölçer');
{
  const mk = (asr, human, ref) => ({
    materials: [{
      name: 'a.wav',
      expectedText: ref,
      transcribedWithModel: 'Xenova/whisper-small',
      segments: [{ text: human, asrText: asr }]
    }]
  });

  // 1) Model %100 hatalı, bilirkişi metni referansa EŞİT → WER yüksek olmalı.
  {
    const rows = T.measureWerForCase(
      mk('tamamen farklı model çıktısı', 'merhaba dünya nasılsın', 'merhaba dünya nasılsın')
    );
    eq('model hatalıysa satır var', rows.length, 1);
    eq('model hatalıyken WER %0 ÇIKMAZ', !!(rows[0] && rows[0].ratio > 0.9), true);
  }

  // 2) Model MÜKEMMEL, bilirkişi metni bozuk → WER 0 olmalı.
  {
    const rows = T.measureWerForCase(
      mk('merhaba dünya nasılsın', 'tamamen uydurma metin', 'merhaba dünya nasılsın')
    );
    eq('model mükemmelse WER 0', rows[0] && rows[0].ratio, 0);
  }

  // 3) Ölçülen metin gerçekten asrText olmalı (uzman metni değişse bile
  //    WER değişmez: modelin çıktısı değişmedi).
  {
    const a = T.measureWerForCase(mk('model çıktısı', 'uzman A', 'referans'));
    const b = T.measureWerForCase(mk('model çıktısı', 'tamamen başka uzman metni', 'referans'));
    eq('uzman metni değişince WER değişmez', a[0].ratio, b[0].ratio);
    eq('WER model çıktısını ölçer', a[0].hypCount, T.werWords('model çıktısı').length);
  }

  // 4) Model çıktısı saklanmamışsa (eski kayıt) satır YAZILMAZ — uydurma yok.
  {
    const rows = T.measureWerForCase({
      materials: [{ name: 'b.wav', expectedText: 'merhaba dünya', segments: [{ text: 'merhaba dünya' }] }]
    });
    eq('asrText yoksa satır üretilmez', rows.length, 0);
  }

  // 5) Referans yoksa satır yok (değişmedi).
  {
    const rows = T.measureWerForCase({
      materials: [{ name: 'c.wav', segments: [{ text: 'x', asrText: 'x' }] }]
    });
    eq('referans yoksa satır üretilmez', rows.length, 0);
  }

  // 6) Bölüm bazında: asrText yalnız bazı bölümlerde varsa o bölümler ölçülür;
  //    asrText'siz bölüm hipoteze katılmaz (uydurma metin eklenmez).
  {
    const rows = T.measureWerForCase({
      materials: [{
        name: 'd.wav',
        expectedText: 'bir iki',
        segments: [
          { id: 's1', text: 'bir', asrText: 'bir' },
          { id: 's2', text: 'iki' } // asrText yok → modele ait değil
        ]
      }]
    });
    eq('ölçüm var', rows.length, 1);
    eq('yalnız model çıktısı olan bölüm sayılır', rows[0].hypCount, 1);
  }

  // 7) ÖZET SAYACI ile TABLO aynı ölçütü kullanmalı. Aksi hâlde raporda
  //    "WER ölçümü yapılan kayıt: 1" yazarken tabloda 0 satır olur.
  {
    const c = {
      materials: [
        // Ölçülebilir: referans + model çıktısı var.
        { name: 'olculur.wav', expectedText: 'a b', segments: [{ text: 'a b', asrText: 'a b' }] },
        // Ölçülemez: referans var ama MODEL ÇIKTISI yok (eski kayıt).
        { name: 'model-yok.wav', expectedText: 'c d', segments: [{ text: 'c d' }] }
      ]
    };
    const rows = T.measureWerForCase(c);
    const summaryCount = T.werMeasuredCount(c);
    eq('tabloda 1 satır', rows.length, 1);
    eq('özet sayacı tabloyla aynı', summaryCount, rows.length);
  }
}

// --- 22. Seviye/kırpılma KANAL KANAL ölçülmeli (v2.91) -------------------
// GERÇEK HATA: `measureLevels` tüm kanalları ortalamayla tek "mono"ya
// indiriyor, sonra ölçüyordu. Ölçüm sonuçları:
//   • ses yalnız SOL kanalda, tepe 0,9 (−0,92 dBFS) → rapor −6,94 dBFS
//   • kırpılma yalnız SOL kanalda 500 örnek         → rapor 0 kırpık örnek
//   • ters faz stereo (L = −R)                      → tepe 0 → "—"
// "Tepe düzeyi" ve "tepe kırpılma" 56.12 alanının çekirdek ölçümleridir;
// mono ortalama bunları sistematik olarak DÜŞÜK gösterir. Kırpılmış bir kanal
// rapora "kırpılma yok" olarak girebiliyordu.
// Kural: tepe ve kırpılma EN KÖTÜ kanaldan raporlanır; hangi kanal olduğu
// yazılır. Mono karışım yalnız gürültü tabanı/SNR için kullanılır.
console.log('\n[22] Seviye/kırpılma kanal kanal ölçülür');
{
  const sr = 16000;
  const len = sr; // 1 sn
  const mkCh = (fn) => {
    const a = new Float32Array(len);
    for (let i = 0; i < len; i++) a[i] = fn(i);
    return a;
  };

  eq('analyzeChannelLevels tanımlı', typeof T.analyzeChannelLevels, 'function');

  if (typeof T.analyzeChannelLevels === 'function') {
    // 1) Ses yalnız sol kanalda → tepe kanalın gerçek tepesine eşit olmalı.
    {
      const L = mkCh((i) => 0.9 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const R = mkCh(() => 0);
      const res = T.analyzeChannelLevels([L, R], sr);
      eq('tepe doğru kanaldan ölçülür', T.fmtDb(res.peakDb), T.fmtDb(20 * Math.log10(0.9)));
      eq('tepe kanalı bildirilir', res.peakChannel, 1); // 1 = sol
    }

    // 2) Kırpılma yalnız sol kanalda → rapor 0 DEĞİL.
    {
      const L = mkCh((i) => (i < 500 ? 1.0 : 0.5 * Math.sin((2 * Math.PI * 500 * i) / sr)));
      const R = mkCh((i) => 0.5 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const res = T.analyzeChannelLevels([L, R], sr);
      eq('kırpık örnek sayısı kanaldan gelir', res.clippedSamples, 500);
      eq('kırpılma kanalı bildirilir', res.clipChannel, 1);
    }

    // 3) Ters faz stereo → tepe 0 olmamalı.
    {
      const L = mkCh((i) => 0.9 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const R = mkCh((i) => -0.9 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const res = T.analyzeChannelLevels([L, R], sr);
      eq('ters fazda tepe kaybolmaz', T.fmtDb(res.peakDb), T.fmtDb(20 * Math.log10(0.9)));
    }

    // 4) Mono kayıt tek kanal olarak ölçülür (davranış korunur).
    {
      const M = mkCh((i) => 0.5 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const res = T.analyzeChannelLevels([M], sr);
      eq('mono tepe', T.fmtDb(res.peakDb), T.fmtDb(20 * Math.log10(0.5)));
      eq('mono kırpılma yok', res.clippedSamples, 0);
    }

    // 5) Gürültü tabanı/SNR için mono karışım da döner (ayrı alan).
    {
      const L = mkCh((i) => 0.4 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const R = mkCh((i) => 0.4 * Math.sin((2 * Math.PI * 500 * i) / sr));
      const res = T.analyzeChannelLevels([L, R], sr);
      eq('gürültü tabanı ölçüldü', Number.isFinite(res.noiseFloor), true);
      eq('kanal sayısı bildirilir', res.channels, 2);
    }

    // 6) Ölçüm şeması yükseltilmeli: eski kayıtlar yeniden ölçülmeli.
    eq('ölçüm şeması 3', T.LEVELS_SCHEMA, 3);
  }

  // 7) HANGİ KANALDAN ölçüldüğü rapora yazılmalı (dürüstlük). Aksi hâlde
  //    okuyucu "tepe −0,9 dBFS" değerinin hangi kanala ait olduğunu bilmez;
  //    iki kanal birbirinden çok farklıysa bu bilgi kritiktir.
  {
    const L = mkCh((i) => 0.9 * Math.sin((2 * Math.PI * 500 * i) / sr));
    const R = mkCh((i) => 0.1 * Math.sin((2 * Math.PI * 500 * i) / sr));
    const lv = T.analyzeChannelLevels([L, R], sr);
    const c = {
      materials: [{
        id: 'm1',
        name: 'stereo.wav',
        levels: { ...lv, ok: true, schema: T.LEVELS_SCHEMA, analysisRate: sr, at: new Date().toISOString() }
      }]
    };
    const rows = T.levelRowsForCase(c);
    eq('satır üretildi', rows.length, 1);
    const joined = rows[0].join(' | ');
    eq('hangi kanaldan ölçüldüğü yazılır', /kanal\s*1|sol/i.test(joined), true);
  }

  // 8) Mono kayıtta "kanal" bilgisi yanıltıcı olmamalı (tek kanal).
  {
    const M = mkCh((i) => 0.5 * Math.sin((2 * Math.PI * 500 * i) / sr));
    const lv = T.analyzeChannelLevels([M], sr);
    const c = {
      materials: [{ id: 'm', name: 'mono.wav', levels: { ...lv, ok: true, schema: T.LEVELS_SCHEMA, analysisRate: sr } }]
    };
    const rows = T.levelRowsForCase(c);
    eq('mono satırı üretildi', rows.length, 1);
    eq('mono kayıtta kanal numarası yazılmaz', /kanal\s*\d/i.test(rows[0].join(' | ')), false);
  }
}

// --- 23. Sessizlik/perde ölçümü TÜM kanalları görmeli (v2.92) ------------
// GERÇEK HATA: `measureSegmentSilence` ve `measureSpeakerPitch` yalnız
// `getChannelData(0)` kullanıyordu. Stereo kayıtta konuşma sağ kanalda ise:
//   • sessizlik ölçümü  → "oran 1,0 → yüksek" (bölüm büyük ölçüde sessiz!)
//   • perde ölçümü      → null ("ölçülemedi")
// Gerçek: sol kanal sessiz, sağ kanalda konuşma var. Uzman "bu bölüm sessiz"
// uyarısı alır ve metni [sessizlik] diye işaretler — yanlış.
// Kural: ölçüm, kanalların EN YÜKSEK ENERJİLİSİ üzerinden yapılır ve hangi
// kanal olduğu yazılır. Böylece tek kanalda konuşma varsa kaçmaz.
console.log('\n[23] Sessizlik/perde tüm kanalları görür');
{
  const sr = 16000;
  const n = sr * 3;
  const mkCh = (fn) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = fn(i); return a; };
  const silent = mkCh(() => 0);
  const speech = mkCh((i) => 0.3 * Math.sin((2 * Math.PI * 220 * i) / sr));

  eq('pickActiveChannel tanımlı', typeof T.pickActiveChannel, 'function');

  if (typeof T.pickActiveChannel === 'function') {
    // 1) Sol sessiz, sağ konuşma → sağ kanal seçilmeli.
    {
      const pick = T.pickActiveChannel([silent, speech]);
      eq('konuşan kanal seçilir', pick.index, 1);
      eq('kanal numarası 1 tabanlı', pick.channel, 2);
      eq('enerji bildirilir', pick.rms > 0.1, true);
    }
    // 2) Sol konuşma, sağ sessiz → sol seçilmeli.
    {
      const pick = T.pickActiveChannel([speech, silent]);
      eq('sol kanal seçilir', pick.index, 0);
      eq('kanal numarası 1', pick.channel, 1);
    }
    // 3) Mono → tek kanal, kanal numarası 1.
    {
      const pick = T.pickActiveChannel([speech]);
      eq('mono kanal seçilir', pick.index, 0);
      eq('mono kanal numarası', pick.channel, 1);
    }
    // 4) İki kanal da sessiz → yine de bir kanal döner (indeks 0), çökmez.
    {
      const pick = T.pickActiveChannel([silent, silent]);
      eq('tamamen sessizde çökmez', typeof pick.index, 'number');
      eq('tamamen sessizde enerji 0', pick.rms, 0);
    }
  }

  // 5) Gerçek senaryo: yalnız SAĞ kanalda konuşma → sessizlik YÜKSEK ÇIKMAMALI.
  if (typeof T.analyzeSilenceChannelAware === 'function') {
    const st = T.analyzeSilenceChannelAware([silent, speech], sr, 0, 3);
    eq('sessizlik oranı düşük', st.ratio < 0.2, true);
    eq('ölçülen kanal bildirilir', st.channel, 2);
    eq('sessizlik uyarısı ÜRETİLMEZ', T.segmentSilenceFlag(st, '', (x) => !x), null);
  } else {
    eq('analyzeSilenceChannelAware tanımlı', false, true);
  }

  // 6) ESKİ sessizlik ölçümü (kanal 0'dan) geçersiz sayılmalı. Aksi hâlde
  //    "kanal 0 sessiz" sonucu ekranda/raporda kalır ve düzeltme görünmez.
  eq('SILENCE_SCHEMA tanımlı', typeof T.SILENCE_SCHEMA, 'number');
  if (typeof T.SILENCE_SCHEMA === 'number') {
    eq('sessizlik ölçümü şeması 2', T.SILENCE_SCHEMA, 2);
    // Yeni ölçüm şemayı taşımalı (yoksa her yüklemede atılır).
    const fresh = T.analyzeSilenceChannelAware([speech], sr, 0, 3);
    eq('yeni ölçüm şemasız üretilmez (çağıran ekler)', 'schema' in fresh, false);
  }
}

// --- 24. isHallucination gerçek cümleyi dolgu saymamalı (v2.93) ----------
// GERÇEK HATA: HALLUCINATION_RE "bu kelimeyle BAŞLAYAN ve 60 karakterden
// kısa her metin"i yakalıyordu (`[\s\S]*?` her şeyi kabul ediyordu).
// Ölçülen yanlış pozitifler:
//   "Konuşma sırasında bağırdı"      → dolgu sayılıyordu
//   "Müzik çalıyordu ama konuşma vardı" → dolgu
//   "Nefes alıyor"                   → dolgu
//   "Kalabalık içinde konuşuyor"     → dolgu
//   "Sessizlik oldu sonra devam etti"→ dolgu
// Sonucu: gerçek deşifre "anlamlı metin yok" sayılıyor; çözümlemede bu kalıba
// uyan bölümler çöpe atılıyor (meaningful = filter(!isHallucination)) ve kayıt
// "sonuç rapora aktarılmamalıdır" uyarısı alabiliyor.
// KURAL: yalnız TAM eşleşme (isteğe bağlı parantez içi) dolgu sayılır.
// Whisper'ın dolgu çıktısı "(Konuşma)", "[Müzik]" gibi KISA ve YALNIZ etiket
// olan metindir; cümle değildir.
console.log('\n[24] isHallucination yalnız tam dolgu etiketini yakalar');
{
  // 1) Gerçek cümleler dolgu SAYILMAMALI (yanlış pozitif).
  const realSentences = [
    'Konuşma sırasında bağırdı',
    'Müzik çalıyordu ama konuşma vardı',
    'Sessizlik oldu sonra devam etti',
    'Nefes alıyor',
    'Kalabalık içinde konuşuyor',
    'Müzik eşliğinde söyledi',
    'Konuşma odasında bekledim',
    'Alkış sesleri duyuldu',
    'Merhaba, depozito hakkında konuşmak istiyorum.'
  ];
  for (const t of realSentences) {
    eq(`gerçek cümle dolgu DEĞİL: "${t.slice(0, 30)}"`, T.isHallucination(t), false);
  }

  // 2) Whisper'ın gerçek dolgu çıktıları dolgu SAYILMALI (doğru pozitif).
  const fillers = [
    '(Konuşma)',
    '(Müzik - Jenerik)',
    '[Müzik]',
    'Konuşma',
    'Müzik',
    'Sessizlik',
    '(konuşma)',
    'Müzik.',
    '  ( Müzik )  ',
    '(alkış)',
    'no speech',
    'Music'
  ];
  for (const t of fillers) {
    eq(`dolgu etiketi yakalanır: "${t}"`, T.isHallucination(t), true);
  }

  // 3) Boş/çöp metin davranışı korunur.
  eq('boş metin dolgu', T.isHallucination(''), true);
  eq('yalnız boşluk dolgu', T.isHallucination('   '), true);
  eq('çöp token dolgu', T.isHallucination('- - - -'), true);
  eq('yalnız noktalama dolgu', T.isHallucination('...'), true);

  // 4) Uzun metin ASLA dolgu sayılmaz (60 karakter sınırı artık gerekmiyor
  //    ama uzun metnin etiket olmadığı açıktır).
  const long = '(Konuşma) ' + 'bu cümle devam ediyor ve uzun bir metin oluşturuyor.';
  eq('etiketle başlayan uzun cümle dolgu değil', T.isHallucination(long), false);

  // 5) Tırnak içinde geçen etiket kelimesi dolgu değildir.
  eq('cümle içinde "müzik" geçmesi dolgu değil', T.isHallucination('Müzik kutusu çalındı'), false);
}

// --- 25. updatedAt düzenlemede tazelenmeli (v2.95) -----------------------
// GERÇEK HATA: `updatedAt` yalnız `freshCase()` ve `applyMerge()` içinde
// yazılıyordu; NORMAL düzenleme (metin, kapak alanı, ölçüm…) hiç tazelemiyordu.
// `mergeCases`/`compareCases` ise "gelen daha yeniyse onun değeri alınır"
// kuralını `updatedAt` ile uygular. Sonuç: aylar önce oluşturulmuş ama BUGÜN
// düzenlenmiş bir dosya "eski" sayılıp alan çakışmalarında sessizce eziliyordu
// (ölçüldü: çakışma 0, gelen değer uygulandı).
// KURAL: dava verisini değiştiren her yazma `updatedAt`'i tazeler. Böylece
// "daha yeni kazanır" ölçütü gerçekten çalışır.
console.log('\n[25] updatedAt düzenlemede tazelenir');
{
  eq('touchCaseUpdated tanımlı', typeof T.touchCaseUpdated, 'function');
  eq('saveCaseNow tanımlı', typeof T.saveCaseNow, 'function');

  if (typeof T.touchCaseUpdated === 'function') {
    // 1) Dokunma zaman damgasını ilerletir.
    {
      const c = T.emptyCaseForTest({ id: 'c1', updatedAt: '2020-01-01T00:00:00.000Z' });
      const changed = T.touchCaseUpdated(c);
      eq('değişiklik bildirildi', changed, true);
      eq('zaman damgası ilerledi', c.updatedAt > '2020-01-01T00:00:00.000Z', true);
      eq('geçerli ISO biçimi', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(c.updatedAt), true);
    }

    // 2) Aynı milisaniye içinde ikinci dokunma damgayı GERİ ÇEKMEZ.
    {
      const c = T.emptyCaseForTest({ id: 'c1', updatedAt: '2099-01-01T00:00:00.000Z' });
      T.touchCaseUpdated(c);
      eq('damga geri çekilmez', c.updatedAt >= '2099-01-01T00:00:00.000Z', true);
    }

    // 3) GERÇEK SENARYO: bugün düzenlenen dosya birleştirmede ezilmemeli.
    {
      const mine = T.emptyCaseForTest({ id: 'c1', court: 'YEREL', updatedAt: '2020-01-01T00:00:00.000Z' });
      const theirs = T.emptyCaseForTest({ id: 'c1', court: 'GELEN', updatedAt: '2025-01-01T00:00:00.000Z' });
      // Kullanıcı yerel dosyayı "şimdi" düzenledi.
      T.touchCaseUpdated(mine);
      const r = T.mergeCasesForTest(mine, theirs);
      eq('bugün düzenlenen yerel değer korunur', r.merged.court, 'YEREL');
      eq('sessiz ezme yok', r.applied.some((a) => /gelen sürüm alındı/.test(a)), false);
    }

    // 4) Gelen gerçekten daha yeniyse yine de kazanır (kural bozulmaz).
    {
      const mine = T.emptyCaseForTest({ id: 'c1', court: 'YEREL', updatedAt: '2020-01-01T00:00:00.000Z' });
      const theirs = T.emptyCaseForTest({ id: 'c1', court: 'GELEN', updatedAt: '2099-01-01T00:00:00.000Z' });
      const r = T.mergeCasesForTest(mine, theirs);
      eq('gelen gerçekten yeniyse kazanır', r.merged.court, 'GELEN');
    }

    // 5) persist() — 72 yazma noktasının hepsi buradan geçer — tazelemeli.
    //    Aksi hâlde düzinelerce çağrı yerini tek tek düzeltmek gerekir ve
    //    biri unutulur; damga yine bayatlar.
    {
      const c = T.emptyCaseForTest({ id: 'c1', updatedAt: '2020-01-01T00:00:00.000Z' });
      T.setAppState({ cases: [c], activeCaseId: 'c1' });
      T.persist();
      eq('persist() damgayı tazeler', c.updatedAt > '2020-01-01T00:00:00.000Z', true);
    }

    // 6) YÜKLEME yolu damgayı tazelememeli: dosya açmak "düzenleme" değildir,
    //    aksi hâlde her açılışta dosya "en yeni" görünür ve birleştirmede
    //    haksız kazanır.
    {
      const c = T.emptyCaseForTest({ id: 'c1', updatedAt: '2020-01-01T00:00:00.000Z' });
      T.setAppState({ cases: [c], activeCaseId: 'c1' });
      T.persist({ touch: false });
      eq('yükleme damgayı tazelemez', c.updatedAt, '2020-01-01T00:00:00.000Z');
    }
  }
}

// --- 26. SHA-256 doğrulaması ÜÇ hâlli olmalı (v2.96) ---------------------
// GERÇEK HATA: `sha256()` hesaplayamadığında bir METİN döndürüyordu:
//   'Hesaplanamadı (tarayıcı güvenlik kısıtı)'
// `verifyIntegrity()` ise `now === m.sha256` karşılaştırması yapıyordu.
// Eski sürüm bu metni özet olarak KAYDETTİĞİ için iki metin eşit çıkıyor ve
// uygulama "SHA-256 doğrulandı; dosya değişmemiş" diyordu. Güvenli olmayan
// bağlamda (ör. LAN IP üzerinden http://) `crypto.subtle` yoktur; orada HER
// doğrulama sahte "eşleşti" veriyordu. Bu, adli raporda en ağır iddia türü.
// KURAL: özet hesaplanamıyorsa null döner ve doğrulama "ölçülemedi" der —
// "doğrulandı" ASLA denmez. Üç hâl: verified / unavailable / mismatch.
console.log('\n[26] SHA-256 doğrulaması üç hâlli');
{
  eq('isSha256Hex tanımlı', typeof T.isSha256Hex, 'function');
  eq('verifyHashState tanımlı', typeof T.verifyHashState, 'function');

  if (typeof T.isSha256Hex === 'function') {
    eq('geçerli özet tanınır', T.isSha256Hex('a'.repeat(64)), true);
    eq('kısa metin özet değil', T.isSha256Hex('abc'), false);
    eq('hata metni özet değil', T.isSha256Hex('Hesaplanamadı (tarayıcı güvenlik kısıtı)'), false);
    eq('boş özet değil', T.isSha256Hex(''), false);
    eq('64 karakter ama hex değil', T.isSha256Hex('z'.repeat(64)), false);
  }

  if (typeof T.verifyHashState === 'function') {
    const h = 'b'.repeat(64);
    // 1) İki geçerli özet eşitse → verified.
    eq('eşleşen özet verified', T.verifyHashState(h, h), 'verified');
    // 2) İki geçerli özet farklıysa → mismatch.
    eq('farklı özet mismatch', T.verifyHashState('c'.repeat(64), h), 'mismatch');
    // 3) Hesaplanamadıysa (null) → unavailable, ASLA verified değil.
    eq('hesaplanamayan özet unavailable', T.verifyHashState(null, h), 'unavailable');
    // 4) Kayıtlı özet geçersizse (eski sürümün metni) → unavailable.
    eq('eski hata metni unavailable', T.verifyHashState(h, 'Hesaplanamadı (tarayıcı güvenlik kısıtı)'), 'unavailable');
    // 5) İkisi de yoksa → unavailable.
    eq('ikisi de yoksa unavailable', T.verifyHashState(null, null), 'unavailable');
    // 6) İki hata metni YAN YANA GELSE BİLE verified OLMAZ.
    eq(
      'iki hata metni verified sayılmaz',
      T.verifyHashState('Hesaplanamadı (tarayıcı güvenlik kısıtı)', 'Hesaplanamadı (tarayıcı güvenlik kısıtı)'),
      'unavailable'
    );
  }
}

// --- 27. Zaman alanı doğrulanmalı (v2.97) --------------------------------
// GERÇEK HATA: bölüm detayındaki zaman alanları (`input` dinleyicisi) HİÇ
// doğrulanmıyordu; yazılan değer olduğu gibi kayda giriyordu.
// `secondsFromTimecode()` çözemeyince 0 döndürüyor, `tcRange()` de 0'ı
// `00:00:00.000` diye yazıyor. Ölçülen sonuçlar:
//   "00:00:05,100" (Türkçe virgül) → raporda "00:00:00.000"  (sessiz sıfır!)
//   "00:00:09.000 – 00:00:05.000"  → ters aralık, süre 0, sessiz
//   "00:00:99.000"                 → "00:01:39.000" (sessizce taşıyor)
//   "abc"                          → "00:00:00.000"
// `validateSegment()` bunları YAKALIYOR ama hiçbir yerde çağrılmıyordu.
// KURAL: yazılan zaman ya geçerli bir zaman kodudur ya da kayda GİRMEZ.
// Kullanıcıya neden kabul edilmediği söylenir; sessiz sıfırlama yok.
console.log('\n[27] Zaman alanı doğrulanır');
{
  eq('parseTimecodeStrict tanımlı', typeof T.parseTimecodeStrict, 'function');
  eq('normalizeTimeInput tanımlı', typeof T.normalizeTimeInput, 'function');

  if (typeof T.parseTimecodeStrict === 'function') {
    // 1) Geçerli biçimler.
    eq('noktalı ms', T.parseTimecodeStrict('00:00:05.100'), 5.1);
    eq('noktasız', T.parseTimecodeStrict('00:00:05'), 5);
    eq('saatli', T.parseTimecodeStrict('01:02:03.500'), 3723.5);
    eq('tek hane saat', T.parseTimecodeStrict('0:00:05'), 5);
    // 2) Türkçe ondalık virgül KABUL EDİLİR (kullanıcı böyle yazıyor).
    eq('virgüllü ms', T.parseTimecodeStrict('00:00:05,100'), 5.1);
    eq('virgüllü saatli', T.parseTimecodeStrict('01:02:03,5'), 3723.5);
    // 3) Geçersiz biçimler null döner (0 DEĞİL — 0 geçerli bir andır!).
    eq('harf null', T.parseTimecodeStrict('abc'), null);
    eq('boş null', T.parseTimecodeStrict(''), null);
    eq('99 saniye null', T.parseTimecodeStrict('00:00:99.000'), null);
    eq('99 dakika null', T.parseTimecodeStrict('00:99:00.000'), null);
    eq('fazla hane null', T.parseTimecodeStrict('00:00:05.1234'), null);
    eq('negatif null', T.parseTimecodeStrict('-00:00:05'), null);
  }

  if (typeof T.normalizeTimeInput === 'function') {
    // 4) normalizeTimeInput: geçerliyse KANONİK biçim, değilse null.
    eq('virgül kanonikleşir', T.normalizeTimeInput('00:00:05,100'), '00:00:05.100');
    eq('ms eklenir', T.normalizeTimeInput('00:00:05'), '00:00:05.000');
    eq('geçersiz null', T.normalizeTimeInput('abc'), null);
    eq('99 saniye null', T.normalizeTimeInput('00:00:99.000'), null);
    // 5) Ters aralık reddedilir: end < start.
    eq('ters aralık reddedilir', T.normalizeTimeInput('00:00:09.000', '00:00:05.000'), null);
    eq('eşit sınır reddedilir', T.normalizeTimeInput('00:00:05.000', '00:00:05.000'), null);
    eq('geçerli aralık geçer', T.normalizeTimeInput('00:00:05.000', '00:00:09.000'), '00:00:05.000');
    eq('bozuk bitiş aralığı reddeder', T.normalizeTimeInput('00:00:05.000', 'abc'), null);
  }
}

// --- 28. Paragraf görünümü veriyi değiştirmez; bölme asrText paylaştırır ---
// v2.195: paragraf artık salt-okunur. Aşağıdaki test, görünümün segmentlere ve
// `asrText` alanına DOKUNMADIĞINI kanıtlar. Bölme kuralı (v2.98) korunur.
console.log('\n[28] Paragraf görünümü veriyi değiştirmez; bölme asrText paylaştırır');
{
  // A) Salt okunur paragraf görünümü.
  const m = { segments: [
    { id: 's1', start: '00:00:00.000', end: '00:00:02.000', speaker: 'A', text: 'model bir', asrText: 'model bir', asrModel: 'X', review: 'approved' },
    { id: 's2', start: '00:00:02.000', end: '00:00:04.000', speaker: 'A', text: 'model iki', asrText: 'model iki', asrModel: 'X', review: 'approved' }
  ] };
  const groups = T.paragraphGroups(m.segments);
  eq('tek paragraf grubu', groups.length, 1);
  eq('grup metni birleşik', groups[0].text, 'model bir model iki');
  eq('asrText segmentte korunur', m.segments[0].asrText, 'model bir');
  eq('segment sayısı değişmez', m.segments.length, 2);
  eq('segment id değişmez', m.segments[1].id, 's2');

  // B) Bölme: `{...s}` TAM asrText'i iki yarıya kopyalamamalı; PAYLAŞTIRMALI.
  {
    const c = T.emptyCaseForTest({ id: 'c1' });
    const mm = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    mm.segments.push(T.emptySegmentForTest({
      id: 's1', start: '00:00:00.000', end: '00:00:10.000', speaker: 'A',
      text: 'bir iki üç dört', asrText: 'bir iki üç dört',
      asrModel: 'Xenova/whisper-small', asrAt: '2026-01-01T00:00:00Z', review: 'approved'
    }));
    c.materials.push(mm);
    T.setAppState({ cases: [c], activeCaseId: 'c1' });
    T.splitSegmentAt(mm, 0, 5);
    eq('ikiye ayrıldı', mm.segments.length, 2);
    const leftAsr = mm.segments[0].asrText;
    const rightAsr = mm.segments[1].asrText;
    eq('sol yarı asrText var', leftAsr.length > 0, true);
    eq('sağ yarı asrText var', rightAsr.length > 0, true);
    eq('asrText ikiye PAYLAŞTIRILIR, kopyalanmaz', `${leftAsr} ${rightAsr}`, 'bir iki üç dört');
  }
}

// --- 29. Hızlı onay sayacı ile filtresi AYNI ölçütü kullanmalı (v2.99) ---
// GERÇEK HATA: `segCounts()` hızlı onay sayısını `segQuickCheck(s, segs[i-1])`
// ile hesaplıyordu (önceki bölümle çakışma denetimi DAHİL), ama
// `segMatchesFilter(s, 'quick')` `segQuickCheck(s)` çağırıyordu (prev YOK).
// Sonuç: sayaç 1 derken filtre 2 bölüm listeliyordu. Kullanıcı "Hızlı onaya
// uygun 2" filtresine geçip listelenen bölümü görüyor, ama toplu onay ona
// dokunmuyordu. AGENTS.md kuralı: "Filtre ve sayaç aynı fonksiyonu kullanır;
// arayüz ile liste ayrışamaz."
// Ölçüm: sayaç 1 · filtre listesi 2 · 2. bölüm prev ile
// {"ok":false,"reasons":["öncekiyle çakışıyor"]}, prev yok {"ok":true}.
console.log('\n[29] Hızlı onay sayacı = filtresi');
{
  const m = {
    segments: [
      { start: '00:00:00.000', end: '00:00:10.000', text: 'birinci bölüm metni', review: 'pending' },
      { start: '00:00:05.000', end: '00:00:20.000', text: 'ikinci bölüm metni', review: 'pending' }
    ]
  };
  // 2. bölüm öncekiyle çakışıyor → hızlı onaya UYGUN DEĞİL.
  eq('çakışan bölüm uygun değil (prev ile)', T.segQuickCheck(m.segments[1], m.segments[0]).ok, false);

  // Sayaç ve filtre aynı sonucu vermeli.
  const counts = T.segCounts(m);
  const filtered = m.segments.filter((s, i) => T.segMatchesFilter(s, 'quick', m.segments[i - 1]));
  eq('sayaç ile filtre aynı sayıyı verir', counts.quick, filtered.length);
  eq('beklenen değer 1 (yalnız 1. bölüm uygun)', counts.quick, 1);

  // Filtre de "öncekiyle çakışma" yı görmeli → liste tek bölüm.
  eq('filtre çakışan bölümü listelemez', filtered.length, 1);

  // Bulk approve da aynı kümeyi onaylamalı.
  const targets = T.quickApproveTargets(m);
  eq('toplu onay hedefi = sayaç', targets.length, counts.quick);

  // Çakışma yoksa hepsi uygun olmalı (kural bozulmadı).
  const ok = {
    segments: [
      { start: '00:00:00.000', end: '00:00:05.000', text: 'birinci bölüm metni', review: 'pending' },
      { start: '00:00:05.000', end: '00:00:10.000', text: 'ikinci bölüm metni', review: 'pending' }
    ]
  };
  const okCounts = T.segCounts(ok);
  const okFiltered = ok.segments.filter((s, i) => T.segMatchesFilter(s, 'quick', ok.segments[i - 1]));
  eq('çakışmasız: sayaç = filtre', okCounts.quick, okFiltered.length);
  eq('çakışmasız: ikisi de 2', okCounts.quick, 2);
}

// --- 30. Türkçe büyük İ terim tutarlılığını bozmamalı (v2.100) ---------
// GERÇEK HATA: `contentWords()` düz `toLowerCase()` kullanıyordu. Türkçe'de
// büyük `İ` düz küçültüldüğünde `i` + BİRLEŞİK NOKTA (U+0307) olur; sonra
// `\p{L}` dışı sayılan birleşik işaret atılır ve kelime `stanbul`a dönüşür.
// Sonuç: "İstanbul" ile "istanbul" hiç eşleşmez ve "İ" ile başlayan terimler
// yanlış yazıma dönüşür. `normalizeForWer` doğru yapıyordu
// (`toLocaleLowerCase('tr-TR')`), `contentWords` yapmıyordu — tek kaynak
// kurulı ihlali. Ölçüm: contentWords("İstanbul istanbul") -> ["stanbul","istanbul"].
// KURAL: Türkçe metin küçültme TEK YERDEN (`trLowerCase`) yapılır.
console.log('\n[30] Türkçe büyük İ terim tutarlılığı');
{
  eq('trLowerCase tanımlı', typeof T.trLowerCase, 'function');
  if (typeof T.trLowerCase === 'function') {
    eq('İstanbul küçültme', T.trLowerCase('İstanbul'), 'istanbul');
    eq('İzmir küçültme', T.trLowerCase('İzmir'), 'izmir');
    eq('I küçültme (noktasız)', T.trLowerCase('IŞIK'), 'ışık');
    eq('İ birleşik nokta bırakmaz', /[\u0307]/.test(T.trLowerCase('İstanbul')), false);
  }

  // Gerçek senaryo: aynı terimin büyük/küçük yazımı AYNI sayılmalı.
  {
    const w1 = T.contentWords('İstanbul');
    const w2 = T.contentWords('istanbul');
    eq('İstanbul -> tek kelime', w1.length, 1);
    eq('İstanbul == istanbul', w1[0], w2[0]);
    eq('kelime parçalanmaz (stanbul değil)', w1[0], 'istanbul');
  }

  // Terim tutarlılık: "İstanbul" ve "istanbul" ARTIK AYNI kelimedir, bu
  // yüzden küme OLUŞMAMALI (yanlış pozitif verilmemeli).
  {
    const groups = T.findTermInconsistencies(['İstanbul istanbul İstanbul']);
    eq('aynı yazım küme oluşturmaz', groups.length, 0);
  }
  // Gerçek yazım farkı (İstambul) yakalanmalı — kural bozulmadı.
  {
    const groups = T.findTermInconsistencies(['İstanbul İstambul İstanbul']);
    eq('gerçek yazım farkı bulunur', groups.length > 0, true);
  }
}

// --- 31. Perde tahmininde oktav belirsizliği (v2.101) -------------------
// GERÇEK HATA: `detectPitchHz` yalnız "en yüksek normalize otokorelasyon"
// gecikmesini alıyordu. Temel frekans (H1) zayıf, 2. harmonik (H2) güçlü
// olduğunda algoritma H2'nin periyodunu buluyor ve perdeyi İKİ KATINA
// çıkarıyor. Ölçüm: zayıf temel (H1=0,05 · H2=1,0), gerçek 120 Hz → 239 Hz.
// Rapor bu değeri `pitchHint` ile birlikte ("genellikle kadın") bastığı için
// yanıltıcı bir cinsiyet ipucu da üretiyordu.
//
// NEDEN DÜZELTME DEĞİL, BİLDİRİM: Otokorelasyonda "oktav düzeltmesi" her
// periyodik sinyal 2×lag'de de tepe verdiği için güvenilir değildir. Denendi
// ve ÖLÇÜLDÜ: normal sesleri bozdu (210 Hz → 105 Hz). Bu yüzden yanlış sayıyı
// "düzeltmek" yerine BELİRSİZLİĞİ TESPİT EDİP BİLDİRİYORUZ. Rapor tek bir
// kesin sayı iddia etmez; "oktav belirsiz, olası aralık" yazar.
console.log('\n[31] Perde tahmininde oktav belirsizliği');
{
  const sr = 16000;
  const synth = (f0, amps, dur = 0.4) => {
    const n = Math.floor(sr * dur);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      amps.forEach((a, k) => { v += a * Math.sin(2 * Math.PI * f0 * (k + 1) * t + k * 0.7); });
      x[i] = v;
    }
    return x;
  };
  const near = (got, want) => got != null && Math.abs(got - want) / want < 0.08;

  eq('detectPitchAmbiguity tanımlı', typeof T.detectPitchAmbiguity, 'function');

  // 1) Normal sesler doğru ölçülür ve belirsiz SAYILMAZ (yanlış alarm yok).
  for (const [f0, amps] of [[120, [1.0, 0.5, 0.3, 0.2]], [210, [1.0, 0.4, 0.2]], [100, [1.0, 0.6, 0.3]], [250, [1.0, 0.3]]]) {
    const x = synth(f0, amps);
    const hz = T.detectPitchHz(x, sr);
    eq(`normal ${f0} Hz doğru ölçülür`, near(hz, f0), true);
    const amb = T.detectPitchAmbiguity(x, sr, hz);
    eq(`normal ${f0} Hz belirsiz SAYILMAZ`, amb.ambiguous, false);
  }

  // 2) ZAYIF TEMEL: ölçüm oktav yukarıda; belirsizlik TESPİT EDİLİR.
  {
    const x = synth(120, [0.05, 1.0]);
    const hz = T.detectPitchHz(x, sr);
    // Ölçüm gerçekten 2× hatalı (bu, bilinen sınır; belgelemesi bu testte).
    eq('zayıf temelde ölçüm 2× hatalı (bilinen sınır)', near(hz, 240), true);
    const amb = T.detectPitchAmbiguity(x, sr, hz);
    eq('oktav belirsizliği TESPİT EDİLİR', amb.ambiguous, true);
    eq('oktav aşağı adayı doğru (≈120)', near(amb.octaveHz, 120), true);
  }

  // 3) H1 güçlü olduğunda belirsizlik YOK (yanlış alarm yok).
  {
    const x = synth(90, [0.2, 1.0, 0.3, 0.2]);
    const hz = T.detectPitchHz(x, sr);
    eq('H2 baskın 90 Hz doğru', near(hz, 90), true);
    eq('H1 yeterince güçlü → belirsiz değil', T.detectPitchAmbiguity(x, sr, hz).ambiguous, false);
  }

  // 4) Sessizlikte null döner (uydurma yok).
  eq('sessizlik null', T.detectPitchHz(new Float32Array(sr * 0.4), sr), null);

  // 5) RAPOR: belirsiz perde TEK bir kesin sayı olarak yazılmaz (v2.101).
  //    Aksi hâlde yanıltıcı "genellikle kadın" ipucu rapora girer.
  eq('pitchCellText tanımlı', typeof T.pitchCellText, 'function');
  if (typeof T.pitchCellText === 'function') {
    // Belirsiz değil → normal biçim.
    eq('belirsiz olmayan perde', T.pitchCellText({ pitch: 120, pitchAmbiguous: false }), '120 Hz (düşük perde (genellikle erkek))');
    // Belirsiz → olası aralık + uyarı; CİNSİYET İPUCU YOK (yanıltıcı olur).
    const amb = T.pitchCellText({ pitch: 240, pitchAmbiguous: true, pitchOctaveHz: 120 });
    eq('belirsiz perde aralık verir', /120/.test(amb) && /240/.test(amb), true);
    eq('belirsiz perde uyarı taşır', /oktav/i.test(amb), true);
    eq('belirsiz perde cinsiyet ipucu VERMEZ', /kadın|erkek/i.test(amb), false);
    eq('belirsiz perde tek kesin sayı iddia etmez', /belirsiz/i.test(amb), true);
    // Ölçülmemiş → "Ölçülmedi".
    eq('ölçülmemiş perde', T.pitchCellText({ pitch: null }), 'Ölçülmedi');
  }
}

// --- 32. Paket sözleşmesi: boş çalışma alanı dosya değildir (v2.102) -----
// Canlı veride yaşandı: yeni bir tarayıcıda uygulama kendiliğinden BOŞ bir
// dosya açıyor. Bu dosya yedeğe giriyor, arşive yazılıyor ve geri yüklenince
// "toplamda üç kayıt" oluşuyordu. Ayrıca "⇄ Birleştir" arşiv paketini
// reddediyordu ("case.json yok") — kullanıcının gördüğü "uyumsuz" hatası.
console.log('\n[32] Paket sözleşmesi (boş dosya, arşiv, kopya)');
{
  const need = ['isEmptyCase', 'buildExportPlan', 'selectCaseFromArchive', 'matchAudioEntries'];
  for (const n of need) eq(`${n} tanımlı`, typeof T[n], 'function');

  if (need.every((n) => typeof T[n] === 'function')) {
    const fresh = T.freshCase();

    eq('boş çalışma alanı "dosya değil" sayılır', T.isEmptyCase(fresh), true);
    eq('dosya numarası girilmiş alan dosyadır', T.isEmptyCase({ ...fresh, fileNo: '2024/123' }), false);
    eq('mahkeme girilmiş alan dosyadır', T.isEmptyCase({ ...fresh, court: 'İstanbul 1. Asliye Hukuk' }), false);
    eq('taraf girilmiş alan dosyadır', T.isEmptyCase({ ...fresh, parties: { plaintiff: 'Ahmet Y.' } }), false);
    eq('soru girilmiş alan dosyadır', T.isEmptyCase({ ...fresh, questions: [{ id: 'q1', question: 'Soru?' }] }), false);
    eq('ses kaydı olan alan dosyadır', T.isEmptyCase({ ...fresh, materials: [{ id: 'm1', segments: [] }] }), false);

    const real1 = { ...fresh, id: 'c1', fileNo: '2024/1', materials: [{ id: 'm1', segments: [] }] };
    const real2 = { ...fresh, id: 'c2', fileNo: '2024/2', materials: [{ id: 'm2', segments: [] }] };

    const plan1 = T.buildExportPlan([fresh, real1]);
    eq('tek gerçek dosya → tekil paket (case.json)', plan1.kind, 'single');
    eq('boş dosya pakete GİRMEZ', plan1.cases.length, 1);
    eq('paket gerçek dosyayı taşır', plan1.cases[0].id, 'c1');

    const plan2 = T.buildExportPlan([fresh, real1, real2]);
    eq('iki gerçek dosya → arşiv paketi', plan2.kind, 'archive');
    eq('arşivde boş dosya yok', plan2.cases.length, 2);

    const plan0 = T.buildExportPlan([fresh]);
    eq('yalnız boş dosya varsa yedek alınmaz', plan0.kind, 'none');
    eq('yedek alınmayınca dosya listesi boş', plan0.cases.length, 0);

    const arch = { schema: 'mihenk.project.v1', kind: 'archive', cases: [real1, real2] };
    const pickById = T.selectCaseFromArchive(arch, { id: 'c2', fileNo: '', court: '' });
    eq('arşivden birleştirilecek dosya id ile bulunur', pickById.case && pickById.case.id, 'c2');
    eq('id eşleşince gerekçe boş', pickById.reason, '');
    const pickByNo = T.selectCaseFromArchive(arch, { id: 'yok', fileNo: '2024/1', court: '' });
    eq('arşivden dosya, dosya numarasıyla bulunur', pickByNo.case && pickByNo.case.id, 'c1');
    const pickNone = T.selectCaseFromArchive(arch, { id: 'yok', fileNo: '9999/9', court: '' });
    eq('eşleşme yoksa dosya seçilmez', pickNone.case, null);
    eq('eşleşme yoksa NEDEN söylenir (uyumsuz demek yetmez)', /2024\/1/.test(pickNone.reason), true);

    const names = ['audio/c2/m9_ses.wav', 'audio/c2/', 'audio/c1/m1_a.wav'];
    const hit = T.matchAudioEntries(names, [{ id: 'm9', name: 'ses.wav' }], 'c2');
    eq('arşivdeki ses, dosya klasörüyle eşleşir', hit.length, 1);
    eq('eşleşen girdi doğru', hit[0] && hit[0].entry, 'audio/c2/m9_ses.wav');
    eq('başka dosyanın sesi bu dosyaya bağlanmaz', T.matchAudioEntries(names, [{ id: 'm1', name: 'a.wav' }], 'c2').length, 0);
    eq('dosya klasörü verilmezse eski davranış korunur', T.matchAudioEntries(['audio/m1_a.wav'], [{ id: 'm1' }]).length, 1);
  }
}

// --- 33. Yeniden çözümleme: onay ve geri alma ZORUNLU (v2.103) ------------
// CANLI VERİ: bilirkişi "yanlışlıkla tümünü çözümle diyebiliyoruz" dedi.
// ÖLÇÜM (v2.102): modelin ürettiği ama HİÇ dokunulmamış 2 bölüm varken
// `transcribe()` çağrısı askConfirm=0, snapshotForUndo=0 yapıyordu; bölümler
// sormadan siliniyor ve Ctrl+Z geri getirmiyordu. Yalnız "elle düzeltilmiş"
// bölüm sayısı (edited.length) koruma tetikliyordu; modelin emeği korumasızdı.
console.log('\n[33] Yeniden çözümleme koruması (onay + geri alma)');
{
  eq('reprocessPlan tanımlı', typeof T.reprocessPlan, 'function');

  if (typeof T.reprocessPlan === 'function') {
    // Hiç bölüm yok: ilk çözümleme, soru sorulmaz.
    eq('boş kayıtta soru sorulmaz', T.reprocessPlan([]).ask, false);
    eq('boş kayıtta geri alma kaydı gerekmez', T.reprocessPlan([]).snapshot, false);

    // Model çıktısı var, HİÇ dokunulmamış: SORULMALI + GERİ ALINABİLMELİ.
    const untouched = [
      { id: 'sg1', start: '00:00:00.000', end: '00:00:05.000', text: 'model metni 1', review: 'pending', textRev: 0 },
      { id: 'sg2', start: '00:00:05.000', end: '00:00:10.000', text: 'model metni 2', review: 'pending', textRev: 0 }
    ];
    const p1 = T.reprocessPlan(untouched);
    eq('dokunulmamış model çıktısı varken SORULUR', p1.ask, true);
    eq('dokunulmamış model çıktısı varken GERİ ALINIR', p1.snapshot, true);
    eq('kaç bölümün değişeceği bildirilir', p1.segmentCount, 2);
    eq('dokunulmamış bölüm sayısı ayrı raporlanır', p1.untouched, 2);
    eq('elle düzeltilmiş bölüm sayısı', p1.edited, 0);

    // Elle düzeltilmiş + onaylanmış: aynı koruma, ayrı gerekçe.
    const mixed = [
      { id: 'sg1', text: 'düzeltilmiş', review: 'pending', textRev: 2 },
      { id: 'sg2', text: 'onaylı', review: 'approved', textRev: 0 },
      { id: 'sg3', text: 'dokunulmamış', review: 'pending', textRev: 0 }
    ];
    const p2 = T.reprocessPlan(mixed);
    eq('karma kayıtta da SORULUR', p2.ask, true);
    eq('karma kayıtta da GERİ ALINIR', p2.snapshot, true);
    eq('elle düzeltilmiş sayısı', p2.edited, 1);
    eq('onaylanmış sayısı', p2.approved, 1);
    eq('dokunulmamış sayısı', p2.untouched, 1);
    eq('toplam değişecek bölüm', p2.segmentCount, 3);

    // Metni boş bölüm (model hiçbir şey üretmedi): yine de üzerine yazılır,
    // ama kaybedilecek metin yok. Yine de sorulur — kullanıcı bilmeli.
    const blank = [{ id: 'sg1', text: '', review: 'pending', textRev: 0 }];
    eq('metinsiz bölümde de SORULUR', T.reprocessPlan(blank).ask, true);
    eq('metinsiz bölüm "dokunulmamış" sayılmaz', T.reprocessPlan(blank).untouched, 0);
  }

  // TOPLU (kuyruk) YOLU: kayıt başına diyalog yerine TEK özet soru.
  eq('queueReprocessSummary tanımlı', typeof T.queueReprocessSummary, 'function');
  if (typeof T.queueReprocessSummary === 'function') {
    eq('kuyrukta bölüm yoksa sorulmaz', T.queueReprocessSummary([{ segments: [] }]).ask, false);
    const s1 = T.queueReprocessSummary([
      { segments: [{ id: 'a', text: 'model', review: 'pending', textRev: 0 }] },
      { segments: [{ id: 'b', text: 'elle', review: 'pending', textRev: 3 }] },
      { segments: [] }
    ]);
    eq('kuyrukta metin varsa SORULUR', s1.ask, true);
    eq('kuyrukta kaç kayıtta bölüm var', s1.withSegments, 2);
    eq('kuyrukta toplam bölüm sayısı', s1.totalSegments, 2);
    eq('kuyrukta elle düzeltilmiş sayısı', s1.edited, 1);
    eq('kuyrukta dokunulmamış sayısı', s1.untouched, 1);
  }
}

// --- 34. Otomatik onay ≠ bilirkişi onayı (v2.106) -------------------------
// CANLI VERİ. Bilirkişi: "otomatik onay yap dediğimizde onaylandı yazıyor ama
// yine de biz tekrar kontrol ediyoruz... orada başka bir kontrol etiketi
// olabilir, mesela çözümlendi gibi."
// ÖLÇÜM (v2.105): `bulkApproveQuick` bölüme `review='approved'` yazıyordu ve
// rapor `reviewLabel()` ile "Onaylandı" basıyordu. Yani MAKİNE kararı ile
// BİLİRKİŞİ onayı raporda AYNI görünüyordu. Adli açıdan yanlış: "Onaylandı"
// yazan bir bölümü bilirkişi dinlemiş olmalıdır.
console.log('\n[34] Otomatik onay ile bilirkişi onayı ayrı');
{
  // 1) Kısa etiket (kullanıcı isteği): ekranda uzun metin olmaz.
  eq('otomatik onay etiketi KISA', T.reviewLabel({ review: 'machine' }), 'Çözümlendi');
  eq('bilirkişi onayı etiketi', T.reviewLabel({ review: 'approved' }), 'Onaylandı');
  // 2) Ayrıntı ipucunda (tooltip) taşınır; ekranı kalabalıklaştırmaz.
  const hint = T.reviewHintText({ review: 'machine' });
  eq('otomatik onayın ipucu var', /otomatik/i.test(hint), true);
  eq('ipucu dinlenmesi gerektiğini söyler', /dinlen/i.test(hint), true);
  eq('ipucu "onaylandı" DEMEZ', /onaylandı/i.test(hint), false);

  // 3) isReviewed: dinlenmesi gereken bölüm "kontrol edildi" sayılmaz.
  eq('otomatik onay KONTROL EDİLMİŞ sayılmaz', T.isReviewed({ review: 'machine' }), false);
  eq('bilirkişi onayı kontrol edilmiş sayılır', T.isReviewed({ review: 'approved' }), true);
  eq('anlaşılmadı kontrol edilmiş sayılır', T.isReviewed({ review: 'inaudible' }), true);

  // 4) İnsan onayı ayrı sorulur (rapor "Onaylandı" basmak için).
  eq('machine insan onayı DEĞİL', T.isHumanApproved({ review: 'machine' }), false);
  eq('approved insan onayı', T.isHumanApproved({ review: 'approved' }), true);

  // 5) RAPOR hücresi: makine onayı "Onaylandı" olarak yazılmaz.
  eq('raporda otomatik onay "Onaylandı" değil', T.reviewCellText({ review: 'machine' }), 'Çözümlendi');
  eq('raporda insan onayı "Onaylandı"', T.reviewCellText({ review: 'approved' }), 'Onaylandı');

  // 6) Hızlı onay hedefi: machine bölüm hâlâ "bekliyor" sayılır (tekrar denenebilir).
  const m = { segments: [{ id: 'a', start: '00:00:01.000', end: '00:00:04.000',
    text: 'Anlamlı bir cümle burada.', review: 'machine', textRev: 0 }] };
  eq('otomatik onaylı bölüm hâlâ bekleyen sayılır', T.segCounts(m).pending, 1);
  eq('otomatik onaylı bölüm hızlı onaya uygun kalır', T.quickApproveTargets(m).length, 1);

  // 7) Şema: kod tanımlı, etiketi var, göç tablosunda değil.
  eq('REVIEW_STATE machine içeriyor', __schemaMod.REVIEW_STATE.includes('machine'), true);
  eq('REVIEW_LABEL machine tanımlı', typeof __schemaMod.REVIEW_LABEL.machine, 'string');
  eq('normalizeReviewState machine korur', __schemaMod.normalizeReviewState('machine'), 'machine');
  eq('bilinmeyen kod pending olur', __schemaMod.normalizeReviewState('zzz'), 'pending');
}

// --- 35. Arşivleme ve silme (v2.107) -------------------------------------
// CANLI VERİ. Bilirkişi: "çalışma alanlarının karışmasını istemiyorum... illa
// silmek istiyorsa arşivden silebilir... hepsini yapalım".
// ÖLÇÜLEN RİSK: `snapshotForUndo` yalnız `appState.cases` kopyalar; ses
// IndexedDB'de AYRI durur ve `deleteBlob` kalıcıdır. Yani Ctrl+Z metni getirir,
// SESİ GETİRMEZ. Bu yüzden silme iki aşamalı onay ister ve sesin de gideceğini
// AÇIKÇA söylemek zorundadır.
console.log('\n[35] Arşivleme ve silme');
{
  const real = (id, fileNo) => ({ id, fileNo, court: 'Mahkeme', materials: [{ id: 'm' + id, segments: [] }] });
  const a = real('c1', '2024/1');
  const b = real('c2', '2024/2');

  // 1) Arşiv durumu: yalnız status==='archived' arşivlidir.
  eq('status archived → arşivli', T.isArchivedCase({ status: 'archived' }), true);
  eq('status draft → arşivli DEĞİL', T.isArchivedCase({ status: 'draft' }), false);
  eq('status yok → arşivli DEĞİL', T.isArchivedCase({}), false);
  eq('null güvenli', T.isArchivedCase(null), false);

  // 2) Seçicide yalnız arşivsiz dosyalar görünür.
  const list = [{ ...a, status: 'draft' }, { ...b, status: 'archived' }];
  eq('görünür dosya sayısı', T.visibleCases(list).length, 1);
  eq('görünen dosya arşivsiz olan', T.visibleCases(list)[0].id, 'c1');

  // 3) Arşivleme: durum değişir, VERİ SİLİNMEZ.
  const src = { ...real('c3', '2024/3'), status: 'draft' };
  const arch = T.archiveCase(src);
  eq('arşivlenen dosya archived olur', arch.status, 'archived');
  eq('arşivlenen dosyanın kayıtları DURUR', arch.materials.length, 1);
  eq('arşivlenen dosyanın numarası DURUR', arch.fileNo, '2024/3');
  eq('arşiv zamanı yazılır', typeof arch.archivedAt, 'string');
  eq('arşivleme günlüğe yazılır', Array.isArray(arch.auditLog) && arch.auditLog.length, 1);

  // 4) Geri alma: arşivden çıkarma veriyi korur.
  const back = T.unarchiveCase(arch);
  eq('arşivden çıkan dosya draft olur', back.status, 'draft');
  eq('arşivden çıkan dosyanın kayıtları DURUR', back.materials.length, 1);
  eq('arşivden çıkarma günlüğe yazılır', back.auditLog.length, 2);

  // 5) SİLME ONAYI: dosya numarası elle yazılmalı (kazara tıklama imkânsız).
  eq('onay ifadesi dosya numarasını ister', T.deleteConfirmPhrase({ fileNo: '2024/7' }), '2024/7');
  // v2.108: dosya numarası yoksa GÖRÜNEN ad kullanılır (ham id değil).
  // Eski beklenti 'c9' idi; kullanıcı ham kimliği ekranda göremez.
  eq('dosya numarası yoksa görünen ad kullanılır', T.deleteConfirmPhrase({ id: 'c9' }), 'Yeni inceleme dosyası #c9');
  eq('doğru yazım kabul', T.deleteConfirmMatches({ fileNo: '2024/7' }, '2024/7'), true);
  eq('boşluklar kırpılır', T.deleteConfirmMatches({ fileNo: '2024/7' }, '  2024/7  '), true);
  eq('yanlış yazım reddedilir', T.deleteConfirmMatches({ fileNo: '2024/7' }, '2024/8'), false);
  eq('boş yazım reddedilir', T.deleteConfirmMatches({ fileNo: '2024/7' }, ''), false);

  // 6) Silme YALNIZ arşivli dosyada: arşivsiz dosya silinemez (iki aşama).
  eq('arşivli dosya silinebilir', T.canDeleteCase({ status: 'archived' }), true);
  eq('arşivsiz dosya silinemez (önce arşivle)', T.canDeleteCase({ status: 'draft' }), false);

  // 7) Yedek arşivli dosyaları KAPSAR: arşiv "kayıp" demek değildir.
  const plan = T.buildExportPlan([{ ...real('c4', '2024/4'), status: 'archived' }]);
  eq('arşivli dosya yedeğe GİRER', plan.cases.length, 1);
  eq('yedek biçimi tekil', plan.kind, 'single');
}

// --- 36. Arşiv/silme: boş dosya ve görünmeyen kimlik (v2.108) -------------
// CANLI VERİ. Bilirkişi denedi: "her şeyi arşive aldım, aynı butona tekrar
// bastım tekrar arşivlendi, arşivde iki tane var... silerken bana kendi
// atadığı numarayı sordu... bu id'leri ekranda görmüyoruz."
// ÖLÇÜM (v2.107): boş dosya (0 kayıt, dosya no yok) arşivlenebiliyordu; her
// arşivlemede yeni boş dosya açıldığı için arşiv "Yeni inceleme dosyası" ile
// doluyordu; silme onayı ekranda GÖRÜNMEYEN ham kimliği (mwp6t1x5-fdist0v)
// yazdırıyordu.
console.log('\n[36] Arşiv/silme: boş dosya ve görünmeyen kimlik');
{
  // 1) BOŞ dosya arşivlenemez: kaybedilecek veri yok, arşivi kirletir.
  const blank = { id: 'abc123def456', status: 'draft', materials: [], fileNo: '', court: '' };
  eq('boş dosya arşivlenemez', T.canArchiveCase(blank), false);
  const filled = { id: 'x', status: 'draft', materials: [{ id: 'm', segments: [] }], fileNo: '2024/1' };
  eq('veri taşıyan dosya arşivlenebilir', T.canArchiveCase(filled), true);
  eq('arşivdeki dosya tekrar arşivlenmez', T.canArchiveCase({ ...filled, status: 'archived' }), false);

  // 2) KISA KİMLİK: ekranda gösterilebilir, yazılabilir (ham uuid değil).
  eq('kısa kimlik son 6 karakter', T.caseShortId({ id: 'mwp6t1x5-fdist0v' }), 'dist0v');
  eq('kısa kimlik kısa id ile çalışır', T.caseShortId({ id: 'abc123' }), 'abc123');
  eq('kimlik yoksa boş', T.caseShortId({}), '');
  eq('null güvenli', T.caseShortId(null), '');

  // 3) GÖRÜNEN AD: dosya no varsa o; yoksa ad + kısa kimlik (ayırt edilebilir).
  eq('dosya no varsa yalnız o', T.caseDisplayName({ id: 'x1y2z3', fileNo: '2024/9' }), '2024/9');
  eq(
    'dosya no yoksa ad + kısa kimlik',
    T.caseDisplayName({ id: 'mwp6t1x5-fdist0v', name: 'Yeni inceleme dosyası', fileNo: '' }),
    'Yeni inceleme dosyası #dist0v'
  );
  eq(
    'aynı adlı iki dosya ayırt edilir',
    T.caseDisplayName({ id: 'aaaaaaaa-111111', name: 'Yeni inceleme dosyası' }) !==
      T.caseDisplayName({ id: 'bbbbbbbb-222222', name: 'Yeni inceleme dosyası' }),
    true
  );

  // 4) SİLME ONAYI: ekranda GÖRÜNEN ifade istenir (ham uuid değil).
  const c = { id: 'mwp6t1x5-fdist0v', name: 'Yeni inceleme dosyası', fileNo: '' };
  eq('silme onayı görünen adı ister', T.deleteConfirmPhrase(c), 'Yeni inceleme dosyası #dist0v');
  eq('onay ifadesi ham uuid İÇERMEZ', /mwp6t1x5/.test(T.deleteConfirmPhrase(c)), false);
  eq('görünen ad yazılınca eşleşir', T.deleteConfirmMatches(c, 'Yeni inceleme dosyası #dist0v'), true);
  eq('ham uuid yazılınca EŞLEŞMEZ', T.deleteConfirmMatches(c, 'mwp6t1x5-fdist0v'), false);

  // 5) Dosya no varsa onay ifadesi yalnız dosya numarasıdır (kısa, tanıdık).
  eq('dosya no varsa onay ifadesi o', T.deleteConfirmPhrase({ id: 'zzz', fileNo: '2024/7' }), '2024/7');
}

// --- 37. Boş çalışma alanı KAYDA YAZILMAZ (v2.109) -----------------------
// CANLI VERİ. Bilirkişi: "boş bir tarayıcı açtım, içinde hiçbir şey yoktu ama
// bana otomatikmen yeni çalışma sayfası varmış gibi getirdi. İlk açtığımız boş
// olmalı ama değil?"
// ÖLÇÜM (v2.108, tam boş profil): IndexedDB'de 1 kayıt vardı:
//   { fileNo:"", name:"Yeni inceleme dosyası", mats:0 }
// Arayüz currentCase()'e bağlı olduğu için dosya nesnesi BELLEKTE gerekli
// (kaldırınca `reportDate` hatasıyla çöküyor — ölçüldü). Ama BOŞ çalışma alanı
// "dosya" değildir: KAYDA YAZILMAZ ve yedek/arşiv/silme ona dokunmaz.
console.log('\n[37] Boş çalışma alanı kayda yazılmaz');
{
  eq('casesForStorage tanımlı', typeof T.casesForStorage, 'function');
  eq('isEmptyWorkspace tanımlı', typeof T.isEmptyWorkspace, 'function');

  const fresh = T.freshCase();
  // 1) Yalnız boş taslak varsa kayda YAZILACAK DOSYA YOKTUR.
  eq('yalnız boş taslak → kayıt boş', T.casesForStorage([fresh]).length, 0);
  eq('yalnız boş taslak → çalışma alanı boş', T.isEmptyWorkspace([fresh]), true);

  // 2) Gerçek dosya varsa o yazılır.
  const real = { ...T.freshCase(), fileNo: '2024/1', materials: [{ id: 'm', segments: [] }] };
  eq('gerçek dosya kayda yazılır', T.casesForStorage([real]).length, 1);
  eq('boş taslak gerçek dosyayla birlikte yazılmaz', T.casesForStorage([fresh, real]).length, 1);
  eq('çalışma alanı boş DEĞİL', T.isEmptyWorkspace([fresh, real]), false);

  // 3) Arşivli dosya da "gerçek" sayılır (kaybolmaz).
  const archived = { ...real, id: 'x2', status: 'archived' };
  eq('arşivli dosya kayda yazılır', T.casesForStorage([archived]).length, 1);
  eq('arşivli dosya çalışma alanını dolu yapar', T.isEmptyWorkspace([fresh, archived]), false);

  // 4) Tamamen boş liste.
  eq('boş liste → kayıt boş', T.casesForStorage([]).length, 0);
  eq('boş liste → çalışma alanı boş', T.isEmptyWorkspace([]), true);
  eq('null güvenli', T.casesForStorage(null).length, 0);
  eq('null çalışma alanı boş', T.isEmptyWorkspace(null), true);

  // 5) Boş taslak "dosya gibi" GÖRÜNMEZ: seçicide değil, "Yeni dosya" olarak.
  eq('boş taslak için görünen ad', T.caseDisplayName(fresh), 'Yeni inceleme dosyası #' + T.caseShortId(fresh));
}

// --- 38. Paket oluşturma kapsamı ve adı (v2.110 · ad v2.123) --------------
// CANLI VERİ. Bilirkişi: "dışa aktar derken bu çalışma alanını mı dışa
// aktarıyoruz yoksa tüm çalışmalarımızı mı? netleştirelim... çıkan dosyalar
// alındığı andaki zaman bilgileri ile alırsa iyi olur."
// ÖLÇÜM (v2.109, 3 dosya varken AKTİF=2024/A): "Dışa aktar" düğmesinin ipucu
// YOKTU ve 3 dosyanın HEPSİ indi (AKIS_Yedek_3_dosya_2026-11-20.akis).
// Kullanıcı tek dosya sandı, hepsi gitti. Dosya adında SAAT de yoktu.
// v2.123: terim birliği — "dışa aktar" yerine PAKET OLUŞTUR; ad paketin ne
// olduğunu söyler: AKIS_Paket_<dosya no>_<tarih>_<saat>.akis.
console.log('\n[38] Paket oluşturma kapsamı ve adı');
{
  const real = (id, no) => ({ id, fileNo: no, court: 'Mahkeme', materials: [{ id: 'm' + id, segments: [] }] });
  const A = real('cA', '2024/A');
  const B = real('cB', '2024/B');
  const C = real('cC', '2024/C');

  // 1) KAPSAM AÇIK: 'current' = yalnız aktif dosya, 'all' = hepsi.
  eq('EXPORT_SCOPE tanımlı', Array.isArray(T.EXPORT_SCOPE), true);
  eq('iki kapsam var', T.EXPORT_SCOPE.length, 2);

  const onlyA = T.exportPlanFor([A, B, C], 'cA', 'current');
  eq('current: yalnız aktif dosya', onlyA.cases.length, 1);
  eq('current: doğru dosya', onlyA.cases[0].id, 'cA');
  eq('current: paket biçimi tekil', onlyA.kind, 'single');

  const allPlan = T.exportPlanFor([A, B, C], 'cA', 'all');
  eq('all: hepsi', allPlan.cases.length, 3);
  eq('all: paket biçimi arşiv', allPlan.kind, 'archive');

  // 2) Aktif dosya boşsa 'current' seçilemez → güvenli davranış.
  const blank = { id: 'cZ', materials: [], fileNo: '' };
  const noCurrent = T.exportPlanFor([blank, A], 'cZ', 'current');
  eq('aktif dosya boşsa current boş döner', noCurrent.cases.length, 0);
  eq('aktif dosya boşsa biçim none', noCurrent.kind, 'none');
  // Ama 'all' gerçek dosyayı bulur.
  eq('all: boş taslak atlanır', T.exportPlanFor([blank, A], 'cZ', 'all').cases.length, 1);

  // 3) Arşivli dosya 'all' kapsamına GİRER (yedekte kaybolmaz).
  const arch = { ...B, status: 'archived' };
  eq('all: arşivli dosya da girer', T.exportPlanFor([A, arch], 'cA', 'all').cases.length, 2);

  // 4) DOSYA ADI: paket olduğunu, hangi dosya olduğunu ve zamanı söyler.
  const fixed = new Date('2026-11-20T16:45:00');
  const single = T.backupFileName({ kind: 'single', cases: [A] }, fixed);
  eq('tek dosya adı .akis ile biter', /\.akis$/.test(single), true);
  eq('tek dosya adı tarih içerir', /2026-11-20/.test(single), true);
  eq('tek dosya adı SAAT içerir', /16-45/.test(single), true);
  // Paket olduğu addan anlaşılır (v2.123).
  eq('tek dosya adı PAKET olduğunu söyler', /^AKIS_Paket_/.test(single), true);
  // Dosya numarası okunur biçimde: '2024/A' → '2024-A'.
  eq('tek dosya adı dosya numarasını taşır', /2024-A/.test(single), true);
  eq('tek dosya adı eğik çizgi içermez', single.includes('/'), false);

  const allName = T.backupFileName({ kind: 'archive', cases: [A, B, C] }, fixed);
  eq('tam paket adı dosya sayısını söyler', /3dosya/.test(allName), true);
  eq('tam paket adı tarih+saat içerir', /2026-11-20_16-45/.test(allName), true);
  eq('tam paket adı TAM olduğunu söyler', /^AKIS_Paket_Tam_/.test(allName), true);
  eq('tam paket adı .akis ile biter', /\.akis$/.test(allName), true);

  // Boş paket (olmamalı; yine de ad tutarlı).
  const noneName = T.backupFileName({ kind: 'none', cases: [] }, fixed);
  eq('boş paket adı da PAKET der', /^AKIS_Paket_bos_/.test(noneName), true);

  // Dosya numarası yoksa ad kullanılır; dosya sistemine uygun kalır.
  const noNo = { id: 'cN', name: 'Yeni inceleme dosyası', materials: [{ id: 'mN', segments: [] }] };
  const noNoName = T.backupFileName({ kind: 'single', cases: [noNo] }, fixed);
  eq('numarasız dosyada ad kullanılır', /Yeni_inceleme_dosyas/.test(noNoName), true);
  eq('numarasız ad da PAKET der', /^AKIS_Paket_/.test(noNoName), true);
  eq('numarasız ad güvenli', /[\\/]/.test(noNoName), false);

  // 5) İki farklı zaman → iki farklı ad (üzerine yazma yok).
  const later = new Date('2026-11-20T16:46:00');
  eq('farklı dakika farklı ad', T.backupFileName({ kind: 'single', cases: [A] }, fixed) !==
    T.backupFileName({ kind: 'single', cases: [A] }, later), true);

  // 6) AD, KULLANICININ SEÇİMİNİ söyler (v2.124). Tek dosya varken "Tüm
  //    dosyalar" seçilirse ad "Tam" demeli; aksi hâlde iki seçim aynı adı
  //    üretir ve hangisinin alındığı sonradan anlaşılmaz (canlı veride
  //    bildirildi: "tüm dosyaları seçtim ama tam paket diye gelmedi").
  const allOne = T.exportPlanFor([A], 'cA', 'all');
  eq('tek dosyada TÜM seçimi kapsamı taşır', allOne.scope, 'all');
  eq('tek dosyada TÜM adı "Tam" der',
    /^AKIS_Paket_Tam_1dosya_/.test(T.backupFileName(allOne, fixed)), true);
  const curOne = T.exportPlanFor([A], 'cA', 'current');
  eq('tek dosyada "yalnız bu" kapsamı taşır', curOne.scope, 'current');
  eq('tek dosyada "yalnız bu" adı dosya numarasını taşır',
    /^AKIS_Paket_2024-A_/.test(T.backupFileName(curOne, fixed)), true);
  eq('iki seçim FARKLI ad üretir',
    T.backupFileName(allOne, fixed) !== T.backupFileName(curOne, fixed), true);
}

// --- 39. Çözümleme profili: kayıt başına sabitlenir ve görünür (v2.111) ---
// CANLI VERİ. Bilirkişi: "tek çözümlemelerde bir bölüme gelip çözümle dediğimde
// hangi profili kullanıyor, en son seçtiğim profil mi, ondan emin olamadım."
// ÖLÇÜM (v2.110): `transcribeWindow()` HER PENCEREDE `savedProfilePref()`
// okuyordu. Uzun bir çözümleme sürerken kullanıcı profili değiştirirse aynı
// kaydın farklı bölümleri FARKLI profille çözümlenirdi. Ayrıca kayıtta hangi
// profilin kullanıldığı saklanmıyordu ve bölüm panelinde yazmıyordu.
console.log('\n[39] Çözümleme profili: kayıt başına sabit + görünür');
{
  eq('profileRunLabel tanımlı', typeof T.profileRunLabel, 'function');
  eq('profileById tanımlı', typeof T.profileById, 'function');

  // 1) Profil kimliği → kısa etiket (ekranda uzun metin olmaz).
  eq('standart profil etiketi', T.profileRunLabel('standard'), 'Standart');
  eq('şive profili etiketi', T.profileRunLabel('dialect'), 'Şive/aksan');
  eq('gürültü profili etiketi', T.profileRunLabel('noisy'), 'Gürültülü');
  eq('telefon profili etiketi', T.profileRunLabel('telephone'), 'Telefon');
  // 2) Bilinmeyen/boş profil güvenli davranır (uydurma etiket yok).
  eq('bilinmeyen profil → Standart', T.profileRunLabel('zzz'), 'Standart');
  eq('boş profil → Standart', T.profileRunLabel(''), 'Standart');
  eq('null → Standart', T.profileRunLabel(null), 'Standart');

  // 3) profileById: bilinmeyen kimlik standart profile düşer.
  eq('profileById standard', T.profileById('standard').id, 'standard');
  eq('profileById bilinmeyen → standard', T.profileById('yok').id, 'standard');

  // 4) DİL KİLİDİ: profil ne olursa olsun dil Türkçe, görev transcribe.
  eq('dil kilidi tanımlı', T.PROFILE_LOCK.language, 'turkish');
  eq('görev kilidi transcribe', T.PROFILE_LOCK.task, 'transcribe');
  for (const id of ['standard', 'dialect', 'noisy', 'telephone']) {
    const opts = T.asrProfileOptions(id);
    eq(`${id}: dil Türkçe kalır`, opts.every((o) => o.language === 'turkish'), true);
    eq(`${id}: görev transcribe kalır`, opts.every((o) => o.task === 'transcribe'), true);
  }

  // 5) Profil RAPORA yazılmaz. Sürüm notu (VERSION_NOTICES) kullanıcıya gösterilen
  // arayüz metnidir, rapor değil; bu yüzden yalnız RAPOR metinleri sınanır.
  const reportText = JSON.stringify(T.REPORT_TEXT || {});
  eq('rapor metinlerinde "Şive/aksan" etiketi yok', /Şive\/aksan/.test(reportText), false);
  eq('rapor metinlerinde "profil" kelimesi yok', /profil/i.test(reportText), false);
}

// --- 40. A–B döngüsü: oynatma yollarında korunur (v2.112) -----------------
// CANLI VERİ. Bilirkişi: "A–B aralığı dinleme diye bir özelliğimiz var ama onu
// tam kullanamadık, yada tuşlar yanlış, emin değilim."
// ÖLÇÜM (v2.111):
//   1) `playSegmentRange()` döngüyü HİÇ kontrol etmiyor (0 eşleşme); her
//      "▶ Dinle" çağrısında `stopAt = end` yazar → döngü ölür.
//   2) A–B için klavye kısayolu YOK; `B` tuşu bölmeye bağlı.
//   3) Döngü açıkken ana oynat `stopAt = null` yapar → döngü durur.
console.log('\n[40] A–B döngüsü: oynatma yollarında korunur');
{
  eq('loopStopTarget tanımlı', typeof T.loopStopTarget, 'function');
  eq('LOOP_KEYS tanımlı', typeof T.LOOP_KEYS, 'object');

  // 1) Döngü AÇIKSA durma noktası B'dir (bölüm sonu DEĞİL).
  const m = { __loop: { on: true, a: 10, b: 15 } };
  eq('döngü açık → durma noktası B', T.loopStopTarget(m, 30), 15);
  // 2) Döngü KAPALIYSA bölüm sonu kullanılır.
  eq('döngü kapalı → bölüm sonu', T.loopStopTarget({ __loop: { on: false, a: 10, b: 15 } }, 30), 30);
  // 3) Döngü hiç kurulmamışsa bölüm sonu.
  eq('döngü yok → bölüm sonu', T.loopStopTarget({}, 30), 30);
  eq('null → bölüm sonu', T.loopStopTarget(null, 30), 30);
  // 4) Geçersiz döngü (b <= a) dikkate alınmaz.
  eq('geçersiz döngü → bölüm sonu', T.loopStopTarget({ __loop: { on: true, a: 15, b: 10 } }, 30), 30);
  // 5) Bölüm sonu yoksa (ana oynat) döngü yine de sınır koyar.
  eq('bölüm sonu yok + döngü açık → B', T.loopStopTarget(m, null), 15);
  eq('bölüm sonu yok + döngü yok → null', T.loopStopTarget({}, null), null);

  // 6) KLAVYE: A–B tuşları tanımlı ve ÇAKIŞMIYOR.
  eq('A tuşu var', T.LOOP_KEYS.a, 'a');
  eq('B tuşu A–B bitişi (bölme değil)', T.LOOP_KEYS.b, 'b');
  eq('döngü aç/kapa tuşu var', T.LOOP_KEYS.toggle, 'k');
  eq('A ve B farklı tuşlar', T.LOOP_KEYS.a !== T.LOOP_KEYS.b, true);
}

// --- 41. Bölüm listesi kaydırma: son bölüm görünmeli (v2.113) -------------
// CANLI VERİ. Bilirkişi: "100 kayıt varsa scroll ile sona geldiğimizde yaklaşık
// 3 kayıt görünmüyor. Sanırım yükseklik hesaplama hatamız var."
// ÖLÇÜM (v2.112, gerçek Chromium, 100 bölüm): son öğeye tıklayınca
//   scrollTop = 3184 · maxScroll = 3227 · son öğe 28px GÖRÜNMÜYOR
// KÖK NEDEN: `scrollListToItem` artımlı ekleme yapıyor:
//   list.scrollTop += et.bottom - lt.bottom;
// `scrollTop` tam sayıya yuvarlanır; artımlı eklemede hata BİRİKİR ve son
// öğe görünür alana tam oturmaz.
console.log('\n== [41] Bölüm listesi kaydırma (son öğe görünmeli)');
{
  eq('nextScrollTop tanımlı', typeof T.nextScrollTop, 'function');

  // Geometri: liste 100..600 arası görünür, öğe 580..640 (altı taşıyor).
  const geo = { listTop: 100, listBottom: 600, itemTop: 580, itemBottom: 640, scrollTop: 0, maxScroll: 3227 };
  const next = T.nextScrollTop(geo);
  // Doğru davranış: öğenin altı görünür alana oturur → 40px kaydır.
  eq('altı taşan öğe için tam kaydırma', next, 40);

  // Öğe yukarıdaysa yukarı kaydır.
  eq('üstü taşan öğe', T.nextScrollTop({ listTop: 100, listBottom: 600, itemTop: 40, itemBottom: 90, scrollTop: 300, maxScroll: 3227 }), 240);
  // Öğe tamamen görünüyorsa DEĞİŞMEZ (gereksiz zıplama yok).
  eq('görünen öğe → değişmez', T.nextScrollTop({ listTop: 100, listBottom: 600, itemTop: 200, itemBottom: 260, scrollTop: 150, maxScroll: 3227 }), 150);
  // SON ÖĞE: hedef maxScroll'u AŞAMAZ (kırpılır, ama en azından dibe oturur).
  eq('son öğe → maxScroll sınırı', T.nextScrollTop({ listTop: 100, listBottom: 600, itemTop: 580, itemBottom: 640, scrollTop: 3200, maxScroll: 3227 }), 3227);
  // Negatif olamaz.
  eq('negatif olmaz', T.nextScrollTop({ listTop: 100, listBottom: 600, itemTop: 40, itemBottom: 90, scrollTop: 10, maxScroll: 3227 }), 0);
  // maxScroll yoksa (kaydırma gerekmiyorsa) güvenli.
  eq('maxScroll yok → güvenli', T.nextScrollTop({ listTop: 100, listBottom: 600, itemTop: 200, itemBottom: 260, scrollTop: 0 }), 0);

  // ARTIMLI HATA BİRİKMESİ: aynı öğeye üst üste 3 kez "kaydır" denirse
  // sonuç DEĞİŞMEMELİ (idempotent). Eski kod her çağrıda biraz daha ekliyordu.
  let st = 0;
  for (let i = 0; i < 3; i++) {
    // st kadar kayınca öğe de o kadar yukarı gider (gerçek DOM davranışı).
    st = T.nextScrollTop({ listTop: 100, listBottom: 600, itemTop: 580 - st, itemBottom: 640 - st, scrollTop: st, maxScroll: 3227 });
  }
  eq('kaydırma idempotent (birikmez)', st, 40);
}

// --- 42. "%100 olmuyor" — eksik bölümler görünür olmalı (v2.114) ----------
// CANLI VERİ. Bilirkişi: "tüm onaylarımızı yaptıktan sonra yine de bazıları
// %100 olmuyor. Acaba gözden kaçırdığımız bir şey mi var?"
// ÖLÇÜM (v2.113, 97 approved + 2 relisten + 1 machine): sayaç 97/100 = %97.
// Eksik 3 bölüm KASTEN sayılmıyor (relisten ve machine "kontrol edildi"
// değildir) — kural doğru. HATA: kullanıcı HANGİ 3 bölümün eksik olduğunu
// göremiyordu. Sayı doğru, açıklama yoktu.
console.log('\n== [42] %100 olmama sebebi görünür');
{
  eq('pendingBreakdown tanımlı', typeof T.pendingBreakdown, 'function');
  eq('pendingSummaryText tanımlı', typeof T.pendingSummaryText, 'function');

  const mk = (id, review) => ({ id, review, text: 'metin', start: '00:00:01.000', end: '00:00:03.000' });
  const segs = [
    mk('a', 'approved'), mk('b', 'approved'),
    mk('c', 'relisten'), mk('d', 'relisten'),
    mk('e', 'machine'),
    mk('f', 'pending')
  ];
  const b = T.pendingBreakdown(segs);
  // 4 bölüm "kontrol edilmedi": 2 relisten + 1 machine + 1 pending
  eq('eksik toplam', b.total, 4);
  eq('relisten sayısı', b.relisten, 2);
  eq('machine sayısı', b.machine, 1);
  eq('pending sayısı', b.pending, 1);
  eq('onaylı sayısı', b.approved, 2);
  // Hepsi onaylıysa eksik yok.
  eq('hepsi onaylı → eksik 0', T.pendingBreakdown([mk('x', 'approved')]).total, 0);
  // Boş liste güvenli.
  eq('boş liste → eksik 0', T.pendingBreakdown([]).total, 0);
  eq('null güvenli', T.pendingBreakdown(null).total, 0);

  // ÖZET METNİ: kullanıcı neyin eksik olduğunu TEK satırda görmeli.
  const txt = T.pendingSummaryText(segs);
  eq('özet toplamı söyler', /4/.test(txt), true);
  eq('özet "yeniden dinlenecek" der', /yeniden dinlenecek/i.test(txt), true);
  eq('özet "çözümlendi" der', /çözümlendi/i.test(txt), true);
  eq('özet "kontrol bekliyor" der', /kontrol bekliyor/i.test(txt), true);
  // Eksik yoksa metin boş (gürültü yapmaz).
  eq('eksik yoksa özet boş', T.pendingSummaryText([mk('x', 'approved')]), '');
  // Sayı 1 ise tekil dil ("1 bölüm"), çoğul değil.
  const one = T.pendingSummaryText([mk('y', 'relisten')]);
  eq('tekil: "1 bölüm"', /1 bölüm/.test(one), true);
  eq('tekil: "bölümler" DEĞİL', /1 bölümler/.test(one), false);
}

// --- 43. Belirsiz okuma: ses duyuldu ama iki okuma mümkün (v2.115) --------
// CANLI VERİ. Bilirkişi: "uzman aynı kelimeyi farklı olarak yorumluyor: onaylamalı
// mı, anlaşılmadı olarak mı etiketlemeli, yoksa farklı bir etiket mi? Mahkemeye
// sunarken burayı nasıl ele almalıyız?"
// ADLİ AYRIM: "Anlaşılmadı" = ses duyulmadı/anlaşılmadı (teknik yetersizlik).
// "Belirsiz okuma" = ses DUYULDU ama birden fazla okuma mümkün. İkisi AYRI
// şeylerdir; raporda ayrı görünmeli. Belirsizlik GİZLENMEZ: her iki okuma yazılır.
console.log('\n== [43] Belirsiz okuma (iki okuma mümkün)');
{
  eq('AMBIGUOUS_REVIEW tanımlı', T.AMBIGUOUS_REVIEW, 'ambiguous');
  eq('REVIEW_STATE ambiguous içeriyor', __schemaMod.REVIEW_STATE.includes('ambiguous'), true);
  eq('etiketi kısa', __schemaMod.REVIEW_LABEL.ambiguous, 'Belirsiz okuma');
  eq('ipucu iki okumadan söz eder', /BİRDEN FAZLA|iki okuma/i.test(__schemaMod.REVIEW_HINT.ambiguous), true);
  eq('rengi onaydan farklı', __schemaMod.REVIEW_TONE.ambiguous !== 'good', true);
  eq('normalize ambiguous korur', __schemaMod.normalizeReviewState('ambiguous'), 'ambiguous');
  eq('isReviewed(ambiguous) FALSE (kontrol edilmedi)', T.isReviewed({ review: 'ambiguous' }), false);
  eq('isHumanApproved(ambiguous) FALSE', T.isHumanApproved({ review: 'ambiguous' }), false);
  eq('pendingBreakdown ambiguous sayar', T.pendingBreakdown([{ review: 'ambiguous' }]).ambiguous, 1);
  eq('ambiguous toplamda eksik sayılır', T.pendingBreakdown([{ review: 'ambiguous' }]).total, 1);

  // İKİ OKUMA: saklanır, boş olan yazılmaz.
  const s1 = { review: 'ambiguous', reading1: 'geldi', reading2: 'kaldı', chosen: 'geldi' };
  eq('iki okuma okunur', T.ambiguousReadings(s1), ['geldi', 'kaldı']);
  eq('tek okuma varsa tek eleman', T.ambiguousReadings({ reading1: 'geldi' }), ['geldi']);
  eq('boş okuma atlanır', T.ambiguousReadings({ reading1: '  ', reading2: 'kaldı' }), ['kaldı']);
  eq('okuma yoksa boş dizi', T.ambiguousReadings({}), []);

  // RAPOR METNİ: iki okuma AÇIKÇA yazılır, seçim belirtilir.
  const t = T.ambiguousReportText(s1);
  eq('rapor iki okumayı yazar', /geldi/.test(t) && /kaldı/.test(t), true);
  eq('rapor seçimi belirtir', /seçilen|tercih/i.test(t), true);
  eq('rapor belirsizliği gizlemez', /belirsiz/i.test(t), true);
  // HÜCRE METNİ (v2.197): "Belirsiz okuma — Belirsiz:" tekrarı kaldırıldı.
  const cell = T.reviewCellText(s1);
  eq('hücrede "Belirsiz okuma" TEK kez', (cell.match(/Belirsiz okuma/g) || []).length, 1);
  eq('hücrede "—" tekrarı yok', /—/.test(cell), false);
  eq('hücre iki okumayı korur', /geldi/.test(cell) && /kaldı/.test(cell), true);
  // Seçim yoksa "seçilmedi" der (uydurma yok).
  eq('seçim yoksa açıkça söyler', /seçilmedi/i.test(T.ambiguousReportText({ reading1: 'a', reading2: 'b' })), true);
  // Tek okuma varsa da yazar.
  eq('tek okumada da metin var', T.ambiguousReportText({ reading1: 'geldi' }).length > 0, true);
}

// --- 44. Takip: karaoke yeniden yazılmaz, kelime vurgulanır (v2.116) -----
// CANLI VERİ. Bilirkişi: "sağ detay penceresinde de play butonu var o buton ayrı
// player. bir de detayda segmentin metnini karaoke dediğimiz bir bölüm var...
// o sırada metni işlem yaparken metin titriyor o hareket ederse takip edemeyiz
// ... yani orada neden iki tane alan koyduk bilemiyorum."
// ÖLÇÜM (v2.115): markTextFollow HER 120ms'de bar.innerHTML'i baştan yazıyordu
// → 3 saniyede 25 DOM değişikliği → titreme. Ayrıca karaoke + sd-follow +
// textarea aynı metni ÜÇ kez gösteriyordu.
console.log('\n== [44] Takip: karaoke titremesi');
{
  eq('karaokeSegments tanımlı', typeof T.karaokeSegments, 'function');
  eq('karaokeActiveIndex tanımlı', typeof T.karaokeActiveIndex, 'function');

  const words = [
    { w: 'Merhaba', s: '00:00:01.000', e: '00:00:01.500' },
    { w: 'dünya', s: '00:00:01.500', e: '00:00:02.000' },
    { w: 'nasılsın', s: '00:00:02.000', e: '00:00:02.800' }
  ];
  const segs = T.karaokeSegments({ words, text: 'Merhaba dünya nasılsın' });
  eq('kelime varsa kelime bölünür', segs.length, 3);
  eq('ilk kelime metni', segs[0].w, 'Merhaba');
  eq('kelime zamanı korunur', segs[1].s, 1.5);
  eq('kelime bitişi korunur', segs[2].e, 2.8);

  // Kelime yoksa METİN bölünür (oransal) — ama yine de SABİT parça sayısı.
  const noWords = T.karaokeSegments({ text: 'Merhaba dünya nasılsın', start: '00:00:01.000', end: '00:00:04.000' });
  eq('kelime yoksa metin bölünür', noWords.length > 0, true);
  eq('bölünen parçalar metni korur', noWords.map((x) => x.w).join(' ').replace(/\s+/g, ' ').trim(), 'Merhaba dünya nasılsın');

  // AKTİF indeks: zaman ilerledikçe DEĞİŞİR, DOM yeniden yazılmaz.
  eq('t=1.2 → 0. kelime', T.karaokeActiveIndex(segs, 1.2), 0);
  eq('t=1.6 → 1. kelime', T.karaokeActiveIndex(segs, 1.6), 1);
  eq('t=2.5 → 2. kelime', T.karaokeActiveIndex(segs, 2.5), 2);
  eq('t=0.5 (öncesi) → -1', T.karaokeActiveIndex(segs, 0.5), -1);
  eq('t=9.0 (sonrası) → -1', T.karaokeActiveIndex(segs, 9), -1);
  eq('boş dizi → -1', T.karaokeActiveIndex([], 1), -1);
  eq('null → -1', T.karaokeActiveIndex(null, 1), -1);

  // IDEMPOTENT: aynı zaman için aynı indeks (titreme yok).
  eq('aynı zaman → aynı indeks', T.karaokeActiveIndex(segs, 1.6), T.karaokeActiveIndex(segs, 1.6));
}

// --- 45. Takip: kullanıcı açmadıkça AÇILMAZ + iki kavram ayrı (v2.119) ----
// CANLI VERİ. Bilirkişi: "başlarken ana play'a bastığım otomatikmen takip modu
// çalışıyor ancak ben açmadıysam açılmamalı. Aynı şey sağ paneldeki player
// için de geçerli. Takip modu açıldığında iki durum olacak: ana player'a
// basmışsa otomatikmen bir sonraki segmente kendi geçmesi gerekiyor."
// ÖLÇÜM (v2.118): `if (!followState.on) setFollow(true)` İKİ yerde
// (ana oynat + bölüm dinle) → kullanıcı açmadığı hâlde takip açılıyordu.
console.log('\n== [45] Takip: kullanıcı açmadıkça açılmaz');
{
  eq('FOLLOW_MODES tanımlı', Array.isArray(T.FOLLOW_MODES), true);
  eq('iki kavram ayrı', T.FOLLOW_MODES.length, 2);
  eq('otomatik bölüm geçişi kodu', T.FOLLOW_MODES.includes('autoAdvance'), true);
  eq('canlı metin vurgusu kodu', T.FOLLOW_MODES.includes('liveHighlight'), true);

  eq('followShouldAutoStart tanımlı', typeof T.followShouldAutoStart, 'function');
  // KULLANICI AÇMADIYSA: hiçbir durumda otomatik başlamaz.
  eq('tercih yok → otomatik BAŞLAMAZ', T.followShouldAutoStart({}), false);
  eq('tercih false → BAŞLAMAZ', T.followShouldAutoStart({ autoFollow: false }), false);
  // Kullanıcı AÇIKÇA açtıysa hatırlanır.
  eq('tercih true → başlar', T.followShouldAutoStart({ autoFollow: true }), true);
  // Bilinmeyen değer → güvenli (başlamaz).
  eq('bilinmeyen değer → BAŞLAMAZ', T.followShouldAutoStart({ autoFollow: 'belki' }), false);
  eq('null → BAŞLAMAZ', T.followShouldAutoStart(null), false);
}

// --- 46. Onayın sahibi: birleştirmede onay aktarımı (v2.122) --------------
// CANLI VERİ. Bilirkişi: "bilirkişinin onayladığı şeyler bekliyor olarak
// görünüyor". Senaryo: bilgisayar A dışa aktar → bilgisayar B içe aktar →
// A'da düzenle+onayla → dışa aktar → B'de ⇄ Birleştir → onaylar "bekliyor".
// ÖLÇÜM (v2.121): onaylama yalnız `review` yazıyordu; birleştirme "kim
// onayladı" sorusunu `lastEditBy` (metin düzenleyen) ile tahmin ediyordu.
// Dinleyip onaylayan bilirkişi metne dokunmadığı için onay "kaynaksız"
// sayılıp `pending`e düşürülüyor, üstelik HİÇ bildirilmiyordu.
console.log('\n== [46] Onayın sahibi (birleştirmede onay aktarımı)');
{
  const team = () => [
    { id: 't1', name: 'Bilirkişi', role: 'expert' },
    { id: 't2', name: 'Yardımcı', role: 'assistant' }
  ];
  const mk = (segOver = {}, opts = {}) => {
    const c = T.emptyCaseForTest({ id: 'c1', fileNo: '2024/1' });
    c.team = opts.noTeam ? [] : team();
    c.updatedAt = '2026-11-20T10:00:00Z';
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    const s = T.emptySegmentForTest({ id: 'sg1', start: '00:00:00.000', end: '00:00:01.000', text: 'merhaba' });
    Object.assign(s, segOver);
    m.segments.push(s);
    c.materials.push(m);
    return c;
  };
  const newer = (segOver, opts) => {
    const c = mk(segOver, opts);
    c.updatedAt = '2026-11-20T11:00:00Z';
    return c;
  };
  const segOf = (r) => r.merged.materials[0].segments[0];

  // 1) Şema: atıf alanları tanımlı ve normalleştirmede korunur.
  const empty = T.emptySegmentForTest({});
  eq('emptySegment reviewedBy taşır', empty.reviewedBy, '');
  eq('emptySegment reviewedAt taşır', empty.reviewedAt, '');

  // 2) Tek yazma noktası: onay kimin verdiğini kaydeder, "bekliyor" temizler.
  eq('setSegReview tanımlı', typeof T.setSegReview, 'function');
  if (typeof T.setSegReview === 'function') {
    const c = mk();
    c.lastEditedBy = 't1';
    T.setAppState({ cases: [c], activeCaseId: 'c1' });
    const s = c.materials[0].segments[0];
    T.setSegReview(s, 'approved');
    eq('onay kodu yazıldı', T.segReview(s), 'approved');
    eq('onaylayan kişi yazıldı', s.reviewedBy, 't1');
    eq('onay zamanı yazıldı', typeof s.reviewedAt === 'string' && s.reviewedAt.length > 0, true);
    eq('checked uyumlu', s.checked, true);
    T.setSegReview(s, 'pending');
    eq('bekliyor atfı temizler', s.reviewedBy, '');
    eq('bekliyor checked kapatır', s.checked, false);
    // Eski Türkçe kod yazılmaz; koda çevrilir.
    T.setSegReview(s, 'yeniden');
    eq('eski kod normalize edilir', T.segReview(s), 'relisten');
    eq('saklanan değer kod', s.review, 'relisten');
  }

  // 3) A) Bilirkişi metne dokunmadan onayladı → onay AKTARILIR.
  {
    const r = T.mergeCasesForTest(mk(), newer({ review: 'approved', reviewedBy: 't1', reviewedAt: '2026-11-20T11:00:00Z' }));
    eq('A) düzenlemeden onay aktarılır', segOf(r).review, 'approved');
    eq('A) onaylayan taşınır', segOf(r).reviewedBy, 't1');
    eq('A) çakışma yok', r.conflicts.length, 0);
  }

  // 4) A2) Kaynağı belirsiz onay (eski kayıt) → kabul edilmez ama SESSİZ DEĞİL.
  {
    const r = T.mergeCasesForTest(mk(), newer({ review: 'approved' }));
    eq('A2) kaynaksız onay kabul edilmez', segOf(r).review, 'pending');
    eq('A2) sessiz değil: çakışma bildirilir', r.conflicts.length, 1);
    eq('A2) çakışma türü', (r.conflicts[0] || {}).kind || '', 'approval-not-attributed');
  }

  // 5) B) İkinci göz (yardımcı) onayı aktarılmaz ve bildirilir.
  {
    const r = T.mergeCasesForTest(mk(), newer({ review: 'approved', reviewedBy: 't2' }));
    eq('B) ikinci göz onayı aktarılmaz', segOf(r).review, 'pending');
    eq('B) çakışma bildirilir', r.conflicts.map((c) => c.kind).includes('approval-not-attributed'), true);
  }

  // 6) C) Tek kişilik dosya (ekip listesi boş): eski davranış korunur.
  {
    const r = T.mergeCasesForTest(mk({}, { noTeam: true }), newer({ review: 'approved' }, { noTeam: true }));
    eq('C) tek kişilik dosyada onay aktarılır', segOf(r).review, 'approved');
  }

  // 7) D) Gelen metin alınınca düzenleyen kimliği ve onay atfı birlikte taşınır.
  {
    const r = T.mergeCasesForTest(
      mk(),
      newer({ text: 'merhaba dünya', textRev: 1, lastEditBy: 't1', review: 'approved', reviewedBy: 't1', reviewedAt: '2026-11-20T11:00:00Z' })
    );
    eq('D) metin alındı', segOf(r).text, 'merhaba dünya');
    eq('D) düzenleyen kimliği taşındı', segOf(r).lastEditBy, 't1');
    eq('D) onay korundu', segOf(r).review, 'approved');
    eq('D) onaylayan taşındı', segOf(r).reviewedBy, 't1');
  }

  // 8) E) Önizleme birleştirmeyle AYNI kararı verir (yalan söylemez).
  {
    const mine = mk();
    const theirs = newer({ review: 'approved' });
    const cmp = T.compareCasesForTest(mine, theirs);
    eq('E) önizleme aktarılmayan onayı sayar', cmp.segments.approvalsRejected, 1);
    eq('E) önizleme çakışmayı listeler', cmp.conflicts.some((c) => c.kind === 'approval-not-attributed'), true);
    eq('E) önizleme ilerleme saymaz', cmp.segments.reviewAdvanced, 0);
  }

  // 9) F) Geçerli onayda önizleme ilerlemeyi gösterir.
  {
    const cmp = T.compareCasesForTest(mk(), newer({ review: 'approved', reviewedBy: 't1' }));
    eq('F) önizleme ilerlemeyi sayar', cmp.segments.reviewAdvanced, 1);
    eq('F) önizleme reddi saymaz', cmp.segments.approvalsRejected || 0, 0);
  }
}

// --- 47. Takip şeridi: sabit 2 satırlık cümle penceresi (v2.125) ----------
// CANLI VERİ. Bilirkişi: "sd-follow sürekli yüksekliği değiştiği için yazıyı
// düzgün takip edemiyorum". ÖLÇÜM (v2.124): kutu 120px tavanlıydı ama içerik
// 202–314px; kod 74px'lik (~5 satır) sıçramalarla kaydırıyordu. Ayrıca aktif
// kelime kalın+dolgu ile satır sonlarını kaydırabiliyordu (1100px'te 8 kelime).
// ÇÖZÜM: sabit 2 satırlık pencere + O ANKİ CÜMLE; vurgu yalnız arka plan.
console.log('\n== [47] Takip şeridi: cümle penceresi');
{
  eq('karaokeSentences tanımlı', typeof T.karaokeSentences, 'function');
  eq('activeSentenceIndex tanımlı', typeof T.activeSentenceIndex, 'function');
  if (typeof T.karaokeSentences === 'function') {
    const sp = { w: ' ', s: NaN, e: NaN };
    // Noktalama cümleyi böler; boşluk parçaları aralığa DAHİL kalır.
    const segs = [
      { w: 'Merhaba', s: 0, e: 0.4 }, sp, { w: 'dünya.', s: 0.5, e: 0.9 }, sp,
      { w: 'Nasılsın', s: 1.0, e: 1.4 }, sp, { w: 'İyiyim', s: 1.5, e: 1.9 }
    ];
    const r = T.karaokeSentences(segs);
    eq('noktalama cümle böler', r.length, 2);
    eq('1. cümle başlangıcı', r[0].from, 0);
    eq('1. cümle sonu', r[0].to, 2);
    eq('2. cümle başlangıcı', r[1].from, 4);
    eq('2. cümle sonu', r[1].to, 6);
    eq('kelime 0 → 1. cümle', T.activeSentenceIndex(r, 0), 0);
    eq('kelime 5 → 2. cümle', T.activeSentenceIndex(r, 5), 1);
    eq('aktif yoksa -1', T.activeSentenceIndex(r, -1), -1);

    // ≥0,4 sn sessizlik de cümle böler (noktalama olmasa bile).
    const gap = [
      { w: 'bir', s: 0, e: 0.3 }, sp, { w: 'iki', s: 0.35, e: 0.6 }, sp,
      { w: 'üç', s: 1.2, e: 1.5 }
    ];
    eq('boşluk (≥0,4 sn) cümle böler', T.karaokeSentences(gap).length, 2);
    // Kısa boşluk bölmez.
    const near = [
      { w: 'bir', s: 0, e: 0.3 }, sp, { w: 'iki', s: 0.5, e: 0.8 }
    ];
    eq('kısa boşluk bölmez', T.karaokeSentences(near).length, 1);
    // Noktalama yok, boşluk yok → tek cümle.
    eq('tek cümle', T.karaokeSentences([{ w: 'a', s: 0, e: 0.2 }, sp, { w: 'b', s: 0.25, e: 0.4 }]).length, 1);
    // Kapanış tırnağı noktalamayı bozmaz.
    eq('tırnaklı bitiş böler', T.karaokeSentences([
      { w: '“geldi.”', s: 0, e: 0.4 }, sp, { w: 'Sonra', s: 0.5, e: 0.9 }
    ]).length, 2);
    eq('boş girdi → []', T.karaokeSentences([]).length, 0);
  }
}

// --- 48. Spektrogram: zaman/frekans/sınır eşlemesi (v2.126) --------------
// CANLI VERİ. Bilirkişi: "spektrogram üzerinde herhangi bir işlem yapamıyorum;
// burası analiz için çok işlevsel olabilir." Tıklama/sürükleme için tuvâl
// koordinatını zamana ve frekansa çeviren saf fonksiyonlar gerekir.
console.log('\n== [48] Spektrogram: zaman/frekans/sınır');
{
  eq('sol kenar = bölüm başı', T.specTimeAt(0, 100, 10, 20), 10);
  eq('sağ kenar = bölüm sonu', T.specTimeAt(100, 100, 10, 20), 20);
  eq('orta = orta', T.specTimeAt(50, 100, 10, 20), 15);
  eq('dışı kırpılır (sol)', T.specTimeAt(-20, 100, 10, 20), 10);
  eq('dışı kırpılır (sağ)', T.specTimeAt(140, 100, 10, 20), 20);
  near('tepe = 8 kHz', T.specHzAt(0, 200, 48000), 8000, 1);
  near('taban = 20 Hz', T.specHzAt(200, 200, 48000), 20, 0.5);
  near('orta = 400 Hz (log ölçek)', T.specHzAt(100, 200, 48000), 400, 1);
  near('8k örneklemede tepe = 4k', T.specHzAt(0, 200, 8000), 4000, 1);
  eq('yakın sınır başlangıç', T.specNearestBoundary(9, 10, 20), 'start');
  eq('yakın sınır bitiş', T.specNearestBoundary(16, 10, 20), 'end');
  eq('tam orta → başlangıç', T.specNearestBoundary(15, 10, 20), 'start');
}

// --- 49. Görünen bölüm = oynatılan bölüm (v2.127) ------------------------
// CANLI VERİ (ölçüm): detay ilk bölümü gösterirken `activeSeg` tanımsızdı;
// "▶ Dinle" hiçbir şey yapmıyordu (paused:true, segStop:false). Kural: detay
// hangi bölümü gösteriyorsa oynatma/onay da onu kullanır.
console.log('\n== [49] Görünen bölüm = oynatılan bölüm');
{
  eq('activeSegIndex tanımlı', typeof T.activeSegIndex, 'function');
  const m = { segments: [{ id: 'a' }, { id: 'b' }] };
  eq('tanımsız activeSeg → 0', T.activeSegIndex(m), 0);
  eq('geçerli activeSeg korunur', T.activeSegIndex({ ...m, activeSeg: 1 }), 1);
  eq('aralık dışı → 0', T.activeSegIndex({ ...m, activeSeg: 9 }), 0);
  eq('negatif → 0', T.activeSegIndex({ ...m, activeSeg: -3 }), 0);
  eq('bölüm yok → 0', T.activeSegIndex({ segments: [] }), 0);
  eq('m null → 0', T.activeSegIndex(null), 0);
}

// --- 50. Analiz kutusu: mod düzeni ve ortak zaman ekseni (v2.128) --------
// KURAL: dalga ve spektrogram AYNI kutuda, AYNI zaman ekseninde katmanlanır;
// kutu yüksekliği SABİTTİR (mod değişince yerleşim zıplamaz).
console.log('\n== [50] Analiz kutusu: modlar ve ortak zaman ekseni');
{
  eq('ANALYSIS_MODES', T.ANALYSIS_MODES, ['wave', 'spec', 'both']);
  eq('kutu yüksekliği 160', T.ANALYSIS_PANE_H, 160);
  eq('bilinmeyen mod → both', T.normalizeAnalysisMode('x'), 'both');
  eq('null → both', T.normalizeAnalysisMode(null), 'both');
  eq('wave korunur', T.normalizeAnalysisMode('wave'), 'wave');
  eq('spec korunur', T.normalizeAnalysisMode('spec'), 'spec');

  const Lw = T.analysisLayout('wave');
  eq('wave: dalga 160', Lw.wave, 160);
  eq('wave: spek 0', Lw.spec, 0);
  eq('wave: kutu 160', Lw.pane, 160);
  const Ls = T.analysisLayout('spec');
  eq('spec: dalga 0', Ls.wave, 0);
  eq('spec: spek 160', Ls.spec, 160);
  const Lb = T.analysisLayout('both');
  eq('both: dalga 48', Lb.wave, 48);
  eq('both: spek 112', Lb.spec, 112);
  eq('both: spek üstü 48', Lb.specTop, 48);
  eq('both: toplam kutu 160', Lb.wave + Lb.spec, 160);

  // Ortak görünür pencere: bölüm ±0,5 sn, kayıt sınırına kırpılır.
  const m = { id: 'm1', duration: 10, segments: [{ start: '00:00:02.000', end: '00:00:04.000' }] };
  const v = T.analysisView(m, 0);
  near('görünür pencere başı', v.a, 1.5, 1e-9);
  near('görünür pencere sonu', v.b, 4.5, 1e-9);
  const m2 = { id: 'm2', duration: 3, segments: [{ start: '00:00:00.000', end: '00:00:02.900' }] };
  const v2 = T.analysisView(m2, 0);
  eq('başlangıç 0’a kırpılır', v2.a, 0);
  eq('bitiş kayıt sonuna kırpılır', v2.b, 3);
  m.__sdZoom = { materialId: 'm1', index: 0, a: 2, b: 3 };
  eq('zoom penceresi kullanılır', T.analysisView(m, 0).a, 2);
  eq('bölüm yoksa null', T.analysisView({ segments: [] }, 0), null);
}


console.log('\n== [51] Kurtarma kopyası: bozuk dosya sessizce atlanmaz');
{
  // Ana yükleme yolu bozuk dosyayı reportLoadFailures ile bildirir. Kurtarma
  // kopyası yolu ise `catch (e) {}` ile SESSİZCE atlıyordu (v2.131 ve öncesi):
  // kullanıcı "2 dosya geri yüklendi" görüyor, üçüncünün kaybolduğunu
  // bilmiyordu. İki yol aynı sözleşmeyi kullanmalı.
  const N = T.normalizeRescueCases;
  eq('normalizeRescueCases tanımlı', typeof N, 'function');
  if (typeof N === 'function') {
    const good = (id, no) => ({ id, fileNo: no, name: 'Dosya ' + no, materials: [] });
    const boom = new Proxy({}, {
      get() { throw new Error('bozuk kayıt'); },
      ownKeys() { throw new Error('bozuk kayıt'); }
    });
    const r = N([good('a', '2026/1'), boom, good('b', '2026/2')]);
    eq('sağlam dosyalar korunur', r.cases.length, 2);
    eq('bozuk dosya failed listesine girer', r.failed.length, 1);
    eq('bozuk dosyanın hatası saklanır', !!r.failed[0].error, true);

    const empty = N([]);
    eq('boş liste: dosya yok', empty.cases.length, 0);
    eq('boş liste: hata yok', empty.failed.length, 0);
    const none = N(null);
    eq('dizi olmayan girdi: dosya yok', none.cases.length, 0);
  }

  // Kaynak sözleşmesi: kurtarma dalı sessiz catch kullanmamalı ve bildirmeli.
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('kurtarma dalı normalizeRescueCases kullanıyor', /normalizeRescueCases\(rescue\.cases\)/.test(src), true);
  eq('kurtarma dalı reportLoadFailures çağırıyor', /normalizeRescueCases[\s\S]{0,400}reportLoadFailures\(failed/.test(src), true);
  const rescueBlock = (src.match(/const rescue = readLastSnapshot\(\);[\s\S]*?Gerçekten boş kurulum/) || [''])[0];
  eq('kurtarma dalında sessiz catch yok', rescueBlock.length > 0 && !/catch \(e\) \{\}/.test(rescueBlock), true);
}


console.log('\n== [52] Boş çalışma alanı kayda yazılmaz');
{
  // v2.109 "boş taslak kayda yazılmaz" diyordu ama persistNow yine de
  // {cases: []} kaydı yazıyordu: yeni tarayıcıda 1 kayıt görünüyordu. Ayrıca
  // tüm veri silinirse boş kayıt yazmak eski kaydı DİSKTE BIRAKIR → silinen
  // veri yeniden yüklenir. Doğru davranış: yazacak veri yoksa kaydı SİL.
  const P = T.persistPayloadFor;
  eq('persistPayloadFor tanımlı', typeof P, 'function');
  if (typeof P === 'function') {
    const empty = T.emptyCaseForTest ? T.emptyCaseForTest() : { id: 'e' };
    eq('boş taslak → null', P({ cases: [empty], activeCaseId: empty.id }), null);
    eq('hiç dosya yok → null', P({ cases: [] }), null);
    eq('null durum → null', P(null), null);
    const real = { ...empty, fileNo: '2026/999', court: 'Mahkeme' };
    const p = P({ cases: [empty, real], activeCaseId: real.id });
    eq('gerçek dosya yazılır', p && p.cases.length, 1);
    eq('boş taslak yazılmaz', p && p.cases[0].fileNo, '2026/999');
  }

  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('persistNow boşken kaydı SİLER', /persistPayloadFor\(appState\)[\s\S]{0,700}delete\(STORE_KEY\)/.test(src), true);
  eq(
    'flushPersist boşken anlık kopyayı siler',
    /casesForStorage\(appState\.cases\)[\s\S]{0,400}removeItem\('akis\.lastSnapshot'\)/.test(src),
    true
  );
}


console.log('\n== [53] Kritik uyarılar ekran okuyucuya duyurulur');
{
  // v2.134 ve öncesinde #toast ile "KAYDEDİLMİYOR" şeridinde role/aria-live
  // yoktu (sayfada aria-live bölgesi 0). Görsel uyarı vardı, işitme/ekran
  // okuyucu tarafı boştu. Kritik uyarı assertive, normal bilgi polite olmalı.
  const toast = T.showToast;
  eq('showToast tanımlı', typeof toast, 'function');
  if (typeof toast === 'function') {
    const el = T.el('#toast');
    toast('normal bilgi');
    eq('normal toast role=status', el.getAttribute('role'), 'status');
    eq('normal toast polite', el.getAttribute('aria-live'), 'polite');
    toast('kritik uyarı', true);
    eq('kritik toast role=alert', el.getAttribute('role'), 'alert');
    eq('kritik toast assertive', el.getAttribute('aria-live'), 'assertive');
  }

  eq('showSaveFailureBanner tanımlı', typeof T.showSaveFailureBanner, 'function');
  if (typeof T.showSaveFailureBanner === 'function') {
    T.showSaveFailureBanner(new Error('test'));
    const b = T.el('#saveFailureBanner');
    eq('kayıt hatası şeridi role=alert', b.getAttribute('role'), 'alert');
    eq('kayıt hatası şeridi assertive', b.getAttribute('aria-live'), 'assertive');
    eq('şerit metni kaybı söylüyor', /KAYDEDİLMİYOR/.test(b.innerHTML), true);
  }

  eq('showStorageBanner tanımlı', typeof T.showStorageBanner, 'function');
  if (typeof T.showStorageBanner === 'function') {
    T.showStorageBanner();
    const b = T.el('#storageBanner');
    eq('depolama şeridi role=alert', b.getAttribute('role'), 'alert');
    eq('depolama şeridi assertive', b.getAttribute('aria-live'), 'assertive');
  }

  // Yükleme hatası ve atlanan dosya bildirimi kritik: assertive olmalı.
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('yükleme hatası kritik toast kullanır', /showLoadFailure[\s\S]{0,400}showToast\([\s\S]{0,300}true\s*\)/.test(src), true);
  eq('atlanan dosya bildirimi kritik toast kullanır', /function reportLoadFailures[\s\S]{0,1200}showToast\([\s\S]{0,300}true\s*\)/.test(src), true);
}


console.log('\n== [54] Zaman bütünlüğü: çakışma/yinelenme/sıfır süre');
{
  // Kullanıcı: "82 bölüm var; yanlışlıkla aynı zamanı mı böldük, aralıklar
  // birbirine giriyor mu, listeden göremiyoruz." Ölçüt: aralıklar sıralı ve
  // örtüşmesiz olmalı. Bu fonksiyon yalnız GÖZLEMLENEBİLİR zaman hatasını
  // bildirir; düzeltmez.
  eq('segmentTimeIssues tanımlı', typeof T.segmentTimeIssues, 'function');
  if (typeof T.segmentTimeIssues === 'function') {
    const seg = (a, b) => ({ start: a, end: b });
    const clean = T.segmentTimeIssues([
      seg('00:00:00.000', '00:00:03.000'),
      seg('00:00:03.000', '00:00:06.000'),
      seg('00:00:06.000', '00:00:09.000')
    ]);
    eq('bitişik aralıklar sorunsuz', clean.length, 0);
    const overlap = T.segmentTimeIssues([
      seg('00:00:00.000', '00:00:05.000'),
      seg('00:00:03.000', '00:00:08.000')
    ]);
    eq('çakışma bulundu', overlap.filter((x) => x.kind === 'overlap').length, 1);
    eq('çakışmada iki bölüm işaretlenir', T.segmentTimeIssueIndexes([
      seg('00:00:00.000', '00:00:05.000'),
      seg('00:00:03.000', '00:00:08.000')
    ]).size, 2);
    const dup = T.segmentTimeIssues([
      seg('00:00:00.000', '00:00:03.000'),
      seg('00:00:00.000', '00:00:03.000')
    ]);
    eq('aynı aralık yinelenmesi bulundu', dup.filter((x) => x.kind === 'duplicate').length, 1);
    const zero = T.segmentTimeIssues([seg('00:00:03.000', '00:00:03.000')]);
    eq('sıfır süre bulundu', zero.some((x) => x.kind === 'zero'), true);
    const inv = T.segmentTimeIssues([seg('00:00:05.000', '00:00:02.000')]);
    eq('ters aralık bulundu', inv.some((x) => x.kind === 'inverted'), true);
    const bad = T.segmentTimeIssues([seg('abc', '00:00:02.000')]);
    eq('okunamayan zaman bulundu', bad.some((x) => x.kind === 'invalid'), true);
  }
}


console.log('\n== [55] Takip: çakışan aralıkta aktif bölüm korunur');
{
  // Kullanıcı: "otomatik geçiş + canlı vurgu açıkken bir önceki bölüm bir
  // sonrakiyle karışıyor gibi; vurgu sürekli değişiyor." Kök neden: çakışan
  // aralıkta `t`yi içeren İLK bölüm seçilince, oynatma sonraki bölüme geçince
  // zaman geriye atlıyor ve vurgu ÖNCEKİ bölüme dönüyordu.
  // KURAL: t hâlâ aktif bölümün aralığındaysa aktif kalır.
  eq('segmentIndexAtTime tanımlı', typeof T.segmentIndexAtTime, 'function');
  if (typeof T.segmentIndexAtTime === 'function') {
    const seg = (a, b) => ({ start: a, end: b });
    const clean = [seg('00:00:00.000', '00:00:03.000'), seg('00:00:03.000', '00:00:06.000')];
    eq('temiz veri: t=4 → 2. bölüm', T.segmentIndexAtTime(clean, 4), 1);
    eq('temiz veri: t=1 → 1. bölüm', T.segmentIndexAtTime(clean, 1), 0);
    const gap = [seg('00:00:00.000', '00:00:02.000'), seg('00:00:05.000', '00:00:08.000')];
    eq('boşlukta sonraki bölüm seçilir', T.segmentIndexAtTime(gap, 3), 1);
    const overlap = [seg('00:00:00.000', '00:00:05.000'), seg('00:00:03.000', '00:00:08.000')];
    eq('çakışmada tercih yoksa ilk bölüm', T.segmentIndexAtTime(overlap, 4), 0);
    eq('çakışmada AKTİF bölüm korunur', T.segmentIndexAtTime(overlap, 4, 1), 1);
    eq('aktif bölüm dışına çıkınca normal seçim', T.segmentIndexAtTime(overlap, 7, 0), 1);
    eq('kayıt sonunda -1', T.segmentIndexAtTime(clean, 99), -1);
  }
}


console.log('\n== [56] Zaman sorunu: iki taraf da işaretlenir (v2.146)');
{
  // Kullanıcı: "ilk segmentin sonunu uzattım ama zaman sorunu göstermedi,
  // sayfayı yenileyince söyledi." Satır güncellemesi ⚠'yı geçmiyordu ve
  // "Zaman sorunları" çipi hiç oluşturulmuyordu. Çakışmanın İKİ tarafı da
  // kendi satırında işaretlenmeli.
  eq('segmentTimeIssueAt tanımlı', typeof T.segmentTimeIssueAt, 'function');
  if (typeof T.segmentTimeIssueAt === 'function') {
    const seg = (a, b) => ({ start: a, end: b });
    const overlap = [seg('00:00:00.000', '00:00:04.000'), seg('00:00:03.000', '00:00:06.000')];
    const a = T.segmentTimeIssueAt(overlap, 0);
    const b = T.segmentTimeIssueAt(overlap, 1);
    eq('önceki bölüm de işaretli', !!a && a.kind === 'overlap', true);
    eq('sonraki bölüm de işaretli', !!b && b.kind === 'overlap', true);
    eq('iki taraf birbirini gösterir', a.j, 1);
    eq('temiz veride sorun yok', T.segmentTimeIssueAt([seg('00:00:00.000', '00:00:03.000')], 0), null);
  }
}


console.log('\n== [57] Takip şeridi eski bölüme dönmüyor (v2.147)');
{
  // GERÇEK SESLE ÖLÇÜM (sample_data/audio, 47 sn, 16 bölüm, F+G açık):
  // active=1 iken şerit anahtarı 1,3 sn içinde 5 kez `0|0|Bölüm 1:`e döndü.
  // Sebep: bölüm oynatıcısının timeupdate'i `renderKaraoke(mm, st.index)` ile
  // ESKİ indeksi kullanıyordu. KURAL: otomatik geçiş açıkken şerit AKTİF
  // bölümü gösterir; eski indeks şeridi geriye çekemez.
  eq('followStripIndex tanımlı', typeof T.followStripIndex, 'function');
  if (typeof T.followStripIndex === 'function') {
    eq('otomatik geçişte aktif bölüm kullanılır', T.followStripIndex({ activeSeg: 1 }, 0, true), 1);
    eq('otomatik geçiş kapalıyken verilen indeks', T.followStripIndex({ activeSeg: 1 }, 0, false), 0);
    eq('aktif bölüm yoksa verilen indeks', T.followStripIndex({}, 3, true), 3);
  }
}


console.log('\n== [58] Bölüm başlığı tek kaynak (v2.148)');
{
  // Kullanıcı: "Bölüm 1 yazıyor ama play'e basınca Bölüm 1 / 100 oluyor,
  // orada bir değişiklik oluyor." İlk çizim ile yerinde güncelleme AYRI
  // yazıyordu; yerinde güncelleme `.sd-idx`in içindeki ` / N` span'ını siliyordu.
  // KURAL: etiket ve toplam aynı saf fonksiyondan gelir.
  eq('segHeadParts tanımlı', typeof T.segHeadParts, 'function');
  if (typeof T.segHeadParts === 'function') {
    const p = T.segHeadParts(2, 100);
    eq('etiket', p.label, 'Bölüm 3');
    eq('toplam', p.of, ' / 100');
    const z = T.segHeadParts(0, 0);
    eq('toplam yoksa boş', z.of, '');
  }
}

console.log('\n== [59] Kapsama denetimi: bölümlenmemiş aralık (v2.149)');
{
  // Kullanıcı: "bölerken/çözümlerken parça kaçabiliyor mu, sesin hiç bölüme
  // girmemiş aralığı var mı, listeden göremiyoruz." Kapsama BİRLEŞİM
  // uzunluğudur (çakışma iki kez sayılmaz) ve boşluklar GÖRÜNÜR olur.
  // Dürüst sınır: boşluk "konuşma yok" demek değildir, yalnız "bölümlenmemiş".
  eq('segmentCoverage tanımlı', typeof T.segmentCoverage, 'function');
  if (typeof T.segmentCoverage === 'function') {
    const seg = (a, b) => ({ start: a, end: b });
    const full = T.segmentCoverage([seg('00:00:00.000', '00:00:03.000'), seg('00:00:03.000', '00:00:06.000')], 6);
    eq('tam kapsam ok', full.ok, true);
    eq('tam kapsam süresi', full.coveredSec, 6);
    eq('tam kapsam yüzdesi', Math.round(full.pct), 100);
    eq('tam kapsamda boşluk yok', full.gaps.length, 0);

    const gap = T.segmentCoverage([seg('00:00:00.000', '00:00:02.000'), seg('00:00:04.000', '00:00:06.000')], 6);
    eq('boşluk sayısı', gap.gaps.length, 1);
    eq('boşluk başlangıcı', gap.gaps[0].a, 2);
    eq('boşluk bitişi', gap.gaps[0].b, 4);
    eq('boşluklu kapsama', gap.coveredSec, 4);
    eq('boşluklu yüzde', Math.round(gap.pct), 67);

    const edges = T.segmentCoverage([seg('00:00:01.000', '00:00:02.000')], 4);
    eq('baş ve son boşluğu', edges.gaps.length, 2);
    eq('baştaki boşluk', edges.gaps[0].a, 0);
    eq('sondaki boşluk bitişi', edges.gaps[1].b, 4);

    const overlap = T.segmentCoverage([seg('00:00:00.000', '00:00:04.000'), seg('00:00:02.000', '00:00:06.000')], 6);
    eq('çakışma iki kez sayılmaz', overlap.coveredSec, 6);
    eq('çakışmada boşluk yok', overlap.gaps.length, 0);

    const unsorted = T.segmentCoverage([seg('00:00:04.000', '00:00:06.000'), seg('00:00:00.000', '00:00:02.000')], 6);
    eq('sırasız giriş doğru', unsorted.gaps.length, 1);

    const beyond = T.segmentCoverage([seg('00:00:00.000', '00:00:08.000')], 6);
    eq('kayıt dışı bölüm bildirilir', beyond.outside.length, 1);
    eq('kayıt dışı kırpılır', beyond.coveredSec, 6);
    eq('kayıt dışı yüzde 100', Math.round(beyond.pct), 100);

    const zero = T.segmentCoverage([seg('00:00:02.000', '00:00:02.000')], 6);
    eq('sıfır süre bildirilir', zero.zero.length, 1);
    eq('sıfır süre kapsamaz', zero.coveredSec, 0);

    const unknown = T.segmentCoverage([seg('00:00:00.000', '00:00:02.000')], 0);
    eq('süre yoksa ok değil', unknown.ok, false);
    eq('süre yoksa yüzde null', unknown.pct, null);
    eq('süre yoksa boşluk üretilmez', unknown.gaps.length, 0);

    // Zaman kodu milisaniye hassasiyetindedir; 1 ms'lik boşluk bitişik sayılır.
    const tiny = T.segmentCoverage([seg('00:00:00.000', '00:00:02.000'), seg('00:00:02.001', '00:00:06.000')], 6);
    eq('1 ms boşluk tolere edilir', tiny.gaps.length, 0);
    const twoMs = T.segmentCoverage([seg('00:00:00.000', '00:00:02.000'), seg('00:00:02.002', '00:00:06.000')], 6);
    eq('2 ms boşluk bildirilir', twoMs.gaps.length, 1);

    const invalid = T.segmentCoverage([seg('abc', '00:00:02.000'), seg('00:00:00.000', '00:00:06.000')], 6);
    eq('geçersiz zaman atlanır', invalid.coveredSec, 6);
    eq('geçersizde boşluk yok', invalid.gaps.length, 0);
  }
  eq('coveragePctText tanımlı', typeof T.coveragePctText, 'function');
  if (typeof T.coveragePctText === 'function') {
    eq('tam kapsam metni', T.coveragePctText({ ok: true, pct: 100, gaps: [] }), 'Kapsam %100');
    eq('boşluklu metin', T.coveragePctText({ ok: true, pct: 66.6, gaps: [{ a: 2, b: 4 }] }), 'Kapsam %66 · 1 boşluk');
    eq('iki boşluk metni', T.coveragePctText({ ok: true, pct: 98, gaps: [{ a: 1, b: 2 }, { a: 5, b: 6 }] }), 'Kapsam %98 · 2 boşluk');
    eq('yüzde 99 tavanı', T.coveragePctText({ ok: true, pct: 99.9, gaps: [{ a: 1, b: 2 }] }), 'Kapsam %99 · 1 boşluk');
    eq('süre yok metni', T.coveragePctText({ ok: false, pct: null, gaps: [] }), 'Kapsam hesaplanamadı');
  }
}

console.log('\n== [60] Rapor hazırlık denetimi (v2.150)');
{
  // Kullanıcı: "eksikle rapor üretmeyi engelle." KURAL: uydurma "hazırlık
  // yüzdesi" YOK; yalnız madde + sayı. Her madde nereye gidileceğini söyler.
  eq('reportReadiness tanımlı', typeof T.reportReadiness, 'function');
  if (typeof T.reportReadiness === 'function') {
    const sha = 'a'.repeat(64);
    const seg = (o) => Object.assign({ id: 's1', start: '00:00:00.000', end: '00:00:10.000', text: 'merhaba', review: 'approved', speaker: 'Tanık' }, o);
    const mat = (o) => Object.assign({
      id: 'm1', name: 'a.wav', duration: 10, sha256: sha,
      origin: { mediumType: 'usb', deliveredBy: 'X', deliveredAt: '2026-01-01' },
      speakers: [{ id: 'sp1', code: 'S1', label: 'Tanık' }],
      segments: [seg()], log: []
    }, o);
    const base = (o) => Object.assign({
      id: 'c1', fileNo: '2026/1', court: 'Ankara 1. Asliye Hukuk Mahkemesi', expertName: 'A. Bilirkişi',
      questions: [{ id: 'q1', question: 'Ne oldu?', answer: 'x' }],
      conclusionText: 'Kanaat metni.',
      materials: [mat()]
    }, o);
    const keys = (r) => r.items.map((x) => x.key);

    const full = T.reportReadiness(base({}));
    eq('tam dosya hazır', full.ok, true);
    eq('tam dosyada madde yok', full.items.length, 0);
    eq('uydurma yüzde yok', 'pct' in full, false);

    const noFile = T.reportReadiness(base({ fileNo: '   ' }));
    eq('dosya no boş yakalanır', keys(noFile).includes('fileNo'), true);
    eq('dosya no hedefi dosya bilgileri', noFile.items.find((x) => x.key === 'fileNo').target, 'case');

    const noCourt = T.reportReadiness(base({ court: '' }));
    eq('mahkeme boş yakalanır', keys(noCourt).includes('court'), true);

    const noExpert = T.reportReadiness(base({ expertName: '' }));
    eq('bilirkişi adı boş yakalanır', keys(noExpert).includes('expert'), true);

    const noMat = T.reportReadiness(base({ materials: [] }));
    eq('kayıt yok yakalanır', keys(noMat).includes('materials'), true);
    eq('kayıt yok hedefi ses görünümü', noMat.items.find((x) => x.key === 'materials').target, 'audio');

    const noSegs = T.reportReadiness(base({ materials: [mat({ segments: [] })] }));
    eq('bölümsüz kayıt yakalanır', keys(noSegs).includes('noSegments'), true);

    const pending = T.reportReadiness(base({ materials: [mat({ segments: [seg({ review: 'pending' })] })] }));
    const pItem = pending.items.find((x) => x.key === 'pending');
    eq('bekleyen bölüm yakalanır', !!pItem, true);
    eq('bekleyen sayısı', pItem.count, 1);
    eq('bekleyen hedefi ses görünümü', pItem.target, 'audio');
    eq('bekleyen filtresi', pItem.filter, 'pending');

    const ambNo = T.reportReadiness(base({ materials: [mat({ segments: [seg({ review: 'ambiguous', reading1: 'geldi', reading2: 'kaldı' })] })] }));
    eq('seçimsiz belirsiz okuma yakalanır', keys(ambNo).includes('ambiguous'), true);
    const ambYes = T.reportReadiness(base({ materials: [mat({ segments: [seg({ review: 'ambiguous', reading1: 'geldi', reading2: 'kaldı', chosen: 'geldi' })] })] }));
    eq('seçilmiş belirsiz okuma yakalanmaz', keys(ambYes).includes('ambiguous'), false);

    const noSpk = T.reportReadiness(base({ materials: [mat({ segments: [seg({ speaker: '' })] })] }));
    eq('konuşmacısız bölüm yakalanır', keys(noSpk).includes('speaker'), true);
    const defSpk = T.reportReadiness(base({ materials: [mat({ segments: [seg({ speaker: 'Belirtilmedi' })] })] }));
    eq('"Belirtilmedi" atanmamış sayılır', keys(defSpk).includes('speaker'), true);

    const timeBad = T.reportReadiness(base({ materials: [mat({ segments: [seg(), seg({ id: 's2', start: '00:00:05.000', end: '00:00:12.000' })] })] }));
    const tItem = timeBad.items.find((x) => x.key === 'time');
    eq('zaman sorunu yakalanır', !!tItem, true);
    eq('zaman sorunu iki tarafı sayar', tItem.count, 2);
    eq('zaman sorunu filtresi', tItem.filter, 'time');

    const noHash = T.reportReadiness(base({ materials: [mat({ sha256: '' })] }));
    eq('SHA-256 yok yakalanır', keys(noHash).includes('hash'), true);

    const noOrigin = T.reportReadiness(base({ materials: [mat({ origin: { mediumType: 'unspecified' } })] }));
    eq('teslim bilgisi yok yakalanır', keys(noOrigin).includes('origin'), true);
    const synthetic = T.reportReadiness(base({ materials: [mat({ synthetic: true, origin: { mediumType: 'unspecified' } })] }));
    eq('sentetik kayıtta teslim bilgisi istenmez', keys(synthetic).includes('origin'), false);

    const noQ = T.reportReadiness(base({ questions: [] }));
    eq('soru yok yakalanır', keys(noQ).includes('questions'), true);

    const broken = T.reportReadiness(base({ materials: [mat({ log: [{ at: '2026-01-01T00:00:00.000Z', event: 'x', prevHash: 'b', hash: 'c' }] })] }));
    eq('kırık delil zinciri yakalanır', keys(broken).includes('log'), true);

    // v2.228 — önem derecesi (engelleyen / uzman / iyileştirme)
    eq('dosya no engelleyici', noFile.items.find((x) => x.key === 'fileNo').severity, 'blocking');
    eq('konuşmacı uzman kontrolü', noSpk.items.find((x) => x.key === 'speaker').severity, 'expert');
    eq('bilinmeyen anahtar expert sayılır', T.readinessSeverity('bilinmeyen'), 'expert');
    const sumNoFile = T.readinessSummary(noFile);
    eq('özet engelleyen sayısı', sumNoFile.blocking, noFile.items.filter((x) => x.severity === 'blocking').length);
    eq('özet toplam = madde sayısı', sumNoFile.total, noFile.items.length);

    const targets = new Set(['case', 'audio', 'questions', 'report']);
    const all = T.reportReadiness(base({ fileNo: '', court: '', expertName: '', materials: [] }));
    eq('her maddenin geçerli hedefi var', all.items.every((x) => targets.has(x.target)), true);
    eq('her maddenin metni var', all.items.every((x) => typeof x.label === 'string' && x.label.length > 0), true);
  }
  eq('readinessRowsHtml tanımlı', typeof T.readinessRowsHtml, 'function');
  if (typeof T.readinessRowsHtml === 'function') {
    const empty = T.readinessRowsHtml({ ok: true, items: [] });
    eq('hazırsa bilgi satırı', empty.includes('Eksik görünmüyor'), true);
    const some = T.readinessRowsHtml({ ok: false, items: [{ key: 'pending', label: 'Kontrol edilmemiş bölüm', count: 3, target: 'audio', filter: 'pending' }] });
    eq('madde satırı sayı taşır', some.includes('>3<') || some.includes('3'), true);
    eq('madde satırı tıklanabilir', some.includes('data-ready-goto="audio"'), true);
    // v2.228 — gruplu gösterim: 'pending' uzman kontrolü grubuna düşer.
    eq('gruplu gösterim başlığı', some.includes('Uzman kontrolü gerekli'), true);
    eq('grup sınıfı taşınır', some.includes('ready-group ready-expert'), true);
  }
}

console.log('\n== [61] Onaydan sonra sonraki bekleyene geç (v2.151)');
{
  // İSTEĞE BAĞLI, VARSAYILAN KAPALI. KURAL: tek düğme iki iş yapmaz; bu ayrı
  // bir tercihtir. Bekleyen yoksa YERİNDE kalınır (başa dönülmez).
  eq('nextPendingIndex tanımlı', typeof T.nextPendingIndex, 'function');
  if (typeof T.nextPendingIndex === 'function') {
    const seg = (rev) => ({ id: 's' + Math.random(), start: '00:00:00.000', end: '00:00:01.000', review: rev });
    const segs = [seg('pending'), seg('approved'), seg('approved'), seg('relisten'), seg('approved'), seg('machine')];
    eq('aradaki onaylıları atlar', T.nextPendingIndex(segs, 0), 3);
    eq('makine işareti bekleyen sayılır', T.nextPendingIndex(segs, 3), 5);
    eq('son bekleyenden sonra yok', T.nextPendingIndex(segs, 5), -1);
    eq('hiç bekleyen yok', T.nextPendingIndex([seg('approved'), seg('inaudible')], 0), -1);
    eq('anlaşılmadı kontrol edilmiş sayılır', T.nextPendingIndex([seg('inaudible'), seg('pending')], 0), 1);
    eq('boş liste', T.nextPendingIndex([], 0), -1);
    eq('geçersiz from baştan arar', T.nextPendingIndex(segs, null), 0);
  }
  eq('nextPendingPref tanımlı', typeof T.nextPendingPref, 'function');
  if (typeof T.nextPendingPref === 'function') {
    T.store.removeItem('akis.nextPending');
    eq('varsayılan kapalı', T.nextPendingPref(), false);
    T.store.setItem('akis.nextPending', '1');
    eq('açıkken true', T.nextPendingPref(), true);
    T.store.setItem('akis.nextPending', '0');
    eq('kapalıyken false', T.nextPendingPref(), false);
    T.store.removeItem('akis.nextPending');
  }
}

console.log('\n== [62] Rapor hazırlığı kapsamayı da sayar (v2.156)');
{
  // DENETİM BULGUSU: 14 boşluklu dosyada kart "1 konu eksik" diyordu; kapsama
  // ile hazırlık iki ayrı gerçek söylüyordu. KURAL: boşluk = eksik maddedir.
  // Dürüst sınır korunur: süre bilinmiyorsa boşluk ÜRETİLMEZ (uydurma yok).
  const sha = 'a'.repeat(64);
  const seg = (a, b) => ({ id: 's' + a, start: a, end: b, text: 'x', review: 'approved', speaker: 'Tanık' });
  const mat = (o) => Object.assign({
    id: 'm1', name: 'a.wav', duration: 10, sha256: sha,
    origin: { mediumType: 'usb', deliveredBy: 'X', deliveredAt: '2026-01-01' },
    speakers: [{ id: 'sp1', code: 'S1', label: 'Tanık' }],
    segments: [seg('00:00:00.000', '00:00:10.000')], log: []
  }, o || {});
  const base = (o) => Object.assign({
    id: 'c1', fileNo: '2026/1', court: 'X', expertName: 'Y',
    questions: [{ id: 'q1', question: 'q', answer: 'a' }], materials: [mat()]
  }, o || {});

  const full = T.reportReadiness(base({}));
  eq('tam kapsamda madde yok', full.items.some((x) => x.key === 'coverage'), false);

  const gap = T.reportReadiness(base({
    materials: [mat({ segments: [seg('00:00:00.000', '00:00:04.000'), seg('00:00:06.000', '00:00:10.000')] })]
  }));
  const it = gap.items.find((x) => x.key === 'coverage');
  eq('boşluk maddesi var', !!it, true);
  eq('boşluk sayısı', it && it.count, 1);
  eq('boşluk hedefi ses görünümü', it && it.target, 'audio');
  eq('boşluk ayrıntısı saniye taşır', !!(it && /2,0 sn/.test(it.detail)), true);
  eq('boşluk maddesi kapsam panelini açar', it && it.action, 'coverage');

  const unknown = T.reportReadiness(base({
    materials: [mat({ duration: 0, segments: [seg('00:00:00.000', '00:00:04.000')] })]
  }));
  eq('süre yoksa kapsama maddesi yok', unknown.items.some((x) => x.key === 'coverage'), false);
}

console.log('\n== [63] Test verisi koruması (v2.157)');
{
  // DENETİM BULGUSU: "Hazır test dosyalarını yükle" onay sormadan 4 kurgusal
  // dosyayı GERÇEK çalışma alanına ekliyordu. KURAL: onay + tek tıkla kaldır.
  eq('sampleCases tanımlı', typeof T.sampleCases, 'function');
  if (typeof T.sampleCases === 'function') {
    const list = T.sampleCases([{ id: 'a', sampleKey: 'x' }, { id: 'b' }, { id: 'c', sampleKey: 'y' }]);
    eq('yalnız örnek dosyalar seçilir', list.length, 2);
    eq('örnek kimlikleri doğru', list.map((c) => c.id).join(','), 'a,c');
    eq('boş/null güvenli', T.sampleCases(null).length, 0);
    eq('örneksiz liste boş', T.sampleCases([{ id: 'b' }]).length, 0);
  }
  const jsSrc = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('yükleme ONAY ister', /async function loadSamples\(\)[\s\S]{0,900}askConfirm/.test(jsSrc), true);
  eq('kaldırma yolu var', /async function removeSamples\(\)/.test(jsSrc), true);
  eq('kaldırma da onay ister', /async function removeSamples\(\)[\s\S]{0,600}askConfirm/.test(jsSrc), true);
  // v2.275: silme tek yardımcıda; test yazımı değil DAVRANIŞI sınar.
  eq('kaldırma ses bloblarını siler (ortak yardımcı)', /async function removeSamples\(\)[\s\S]{0,1200}purgeCaseMedia\(/.test(jsSrc), true);
  eq('ortak yardımcı blobu siler', /async function discardMaterialMedia[\s\S]{0,900}deleteBlob\(/.test(jsSrc), true);
  eq('düğme iki modu bildirir (load/remove)', /dataset\.mode/.test(jsSrc), true);
}

console.log('\n== [64] Bildirim yerleşimi ve ses yok durumu (v2.158)');
{
  // DENETİM BULGULARI: (a) toast durum çubuğunun üstüne biniyordu (835–878 /
  // 876–900); (b) ses blob'u yokken analiz kutusu BOŞ kalıyordu ve yalnız
  // kaybolan toast sebebi söylüyordu. KURAL: kalıcı, metinli durum.
  eq('audioStateText tanımlı', typeof T.audioStateText, 'function');
  if (typeof T.audioStateText === 'function') {
    eq('ses varsa metin boş', T.audioStateText(true), '');
    const t = T.audioStateText(false);
    // v2.184: çip "Ses: " ön ekiyle basılır; tam sebep ipucundadır.
    eq('ses yoksa sebep yazar (ipucu)', /Ses dosyası/.test(T.audioStateHint(false)), true);
    // v2.182: satır KISALDI (tek satır), ayrıntı ipucunda.
    eq('ses yoksa çözümü söyler (kısa)', /paketten yükle/i.test(t), true);
    eq('kısa metin tek satıra sığar (<=40)', t.length <= 40, true);
    const hint = T.audioStateHint(false);
    eq('ipucu dalga/spek anıyor', /dalga|spektrogram/i.test(hint), true);
    eq('ipucu çözümü söylüyor', /Paketten yükle/.test(hint), true);
  }
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('toast durum çubuğunun üstünde', /calc\(var\(--status-h\)\s*\+\s*[0-9]+px\)/.test(css), true);
  // v2.184: tek durum satırı — her zaman görünür, yükseklik sabit.
  eq('durum satırı biçimli', /#view-audio \.sd-status\s*\{/.test(css), true);
  eq('durum satırı yüksekliği sabit (min-height)', /#view-audio \.sd-status\s*\{[^}]*min-height:\s*[0-9]+px/.test(css), true);
  const jsSrc = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('ses durumu çipe yazılıyor', /data-status-audio/.test(jsSrc), true);
}

console.log('\n== [65] Ses kaydını kaldırma: onay + kalıcılık (v2.166)');
{
  // ÖLÇÜM (v2.166, gerçek Chromium): "Kaldır" düğmesi HİÇ onay sormadan ses
  // blob'unu siliyordu. Ölçüm: önce anahtar [c::m] vardı, tıklamadan sonra
  // yoktu, açık diyalog 0. Ctrl+Z kaydı geri getirdi ama ses anahtarı BOŞ
  // kaldı → kullanıcı "geri alındı" bildirimi alıp sesi kaybediyordu.
  // KURAL: kalıcı silme ÖNCE sorulur ve sonucun geri alınamaz olduğu yazılır.
  eq('removeAudioWarning tanımlı', typeof T.removeAudioWarning, 'function');
  if (typeof T.removeAudioWarning === 'function') {
    const txt = T.removeAudioWarning({ name: 'kayit.wav', segments: [{}, {}, {}] });
    eq('uyarı kaydın adını taşır', /kayit\.wav/.test(txt), true);
    eq('uyarı KALICI olduğunu söyler', /KALICI/.test(txt), true);
    // Türkçe 'İ' ASCII 'i' ile eşleşmez (v2.100 dersi): yerel küçültme kullan.
    eq('uyarı sesin geri gelmeyeceğini söyler', /ses dosyası geri gelmez/.test(txt.toLocaleLowerCase('tr')), true);
    eq('uyarı bölüm sayısını söyler', /3 bölüm/.test(txt), true);
    const txt0 = T.removeAudioWarning({ name: 'x.wav', segments: [] });
    eq('bölüm yoksa sayı uydurulmaz', /bölüm/.test(txt0), false);
  }
  const jsSrc = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const branch = jsSrc.slice(jsSrc.indexOf('b.dataset.removeAudio'), jsSrc.indexOf("showToast('Ses kaydı kaldırıldı.')"));
  eq('kaldırma dalı bulundu', branch.length > 100, true);
  eq('silmeden ÖNCE onay istenir', /askConfirm\(/.test(branch) && branch.indexOf('askConfirm(') < branch.indexOf('discardMaterialMedia('), true);
  eq('kaldırma düğmesi uyarıyı kullanır', /removeAudioWarning\(/.test(branch), true);
}

console.log('\n== [66] Paket adı aynı dakikada ayırt edilir (v2.173)');
{
  // ÖLÇÜM (v2.172, gerçek Chromium): sahip ve yardımcı paketi AYNI DAKİKADA
  // üretildi → iki dosya da "AKIS_Paket_2026-777_E_2026-11-21_09-58.akis"
  // oldu; tarayıcı ikincisine " (1)" ekledi. Hangi paketin kimden geldiği
  // addan anlaşılmıyordu (adli kayıtta karışma riski).
  const A = { id: 'cA', fileNo: '2024/A', name: 'A dosyası', materials: [{ id: 'mA', segments: [] }] };
  const t1 = new Date('2026-11-20T16:45:10');
  const t2 = new Date('2026-11-20T16:45:40');
  const n1 = T.backupFileName({ kind: 'single', cases: [A] }, t1);
  const n2 = T.backupFileName({ kind: 'single', cases: [A] }, t2);
  eq('aynı dakikada iki paket FARKLI ad alır', n1 !== n2, true);
  eq('ad saniye taşır', /_\d{2}-\d{2}-\d{2}\.akis$/.test(n1), true);
  eq('saniye değeri doğru (10)', /_16-45-10\.akis$/.test(n1), true);
  eq('saniye değeri doğru (40)', /_16-45-40\.akis$/.test(n2), true);
  // Eski davranış korunur: dakika yine adda.
  eq('dakika korunur', /2026-11-20_16-45/.test(n1), true);
}

console.log('\n== [67] Birleştirme adli olarak eksiksiz (v2.176)');
{
  // ÖLÇÜM (v2.175, kod okuması + tarayıcı): `mergeSegmentWithNext` ikinci
  // bölümün asrText/words/model bilgisini sessizce siliyordu (splice) ve
  // delil günlüğüne YAZMIYORDU; konuşmacı farkı da denetlenmiyordu.
  const mk = () => {
    const c = T.emptyCaseForTest({ id: 'c1' });
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    m.segments.push(T.emptySegmentForTest({ id: 's1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'S1',
      text: 'bir iki', asrText: 'bir iki', asrModel: 'M1', asrAt: '2026-01-01T00:00:00Z',
      words: [{ w: 'bir', s: 0, e: 1 }], obs: { noise: true } }));
    m.segments.push(T.emptySegmentForTest({ id: 's2', start: '00:00:05.000', end: '00:00:09.000', speaker: 'S1',
      text: 'üç dört', asrText: 'üç dört', asrModel: 'M2', asrAt: '2026-01-01T00:00:05Z',
      words: [{ w: 'üç', s: 5, e: 6 }], obs: { overlap: true } }));
    c.materials.push(m);
    T.setAppState({ cases: [c], activeCaseId: 'c1' });
    return m;
  };

  const m1 = mk();
  const logBefore = (m1.log || []).length;
  T.mergeSegmentWithNext(m1, 0);
  eq('iki bölüm tek bölüme indi', m1.segments.length, 1);
  eq('metin birleşti', m1.segments[0].text, 'bir iki üç dört');
  eq('bitiş ikinci bölümden', m1.segments[0].end, '00:00:09.000');
  eq("ikinci bölümün asrText'i korundu", (m1.segments[0].mergedFrom || [])[0]?.asrText, 'üç dört');
  eq('ikinci bölümün modeli korundu', (m1.segments[0].mergedFrom || [])[0]?.asrModel, 'M2');
  eq('kelime zamanları birleşti', (m1.segments[0].words || []).length, 2);
  eq('gözlemler birleşti', !!(m1.segments[0].obs?.noise && m1.segments[0].obs?.overlap), true);
  eq('birleştirme günlüğe yazıldı', (m1.log || []).length, logBefore + 1);
  eq('onay durumu bekliyor', T.segReview(m1.segments[0]), 'pending');

  // Farklı konuşmacı: sessizce birleştirilmez.
  const m2 = mk();
  m2.segments[1].speaker = 'S2';
  const before2 = m2.segments.length;
  T.mergeSegmentWithNext(m2, 0);
  eq('farklı konuşmacı birleştirilmedi', m2.segments.length, before2);
  eq('farklı konuşmacıda metin değişmedi', m2.segments[0].text, 'bir iki');

  // İkinci göz (yardımcı) yapı değiştiremez.
  {
    const c6 = T.emptyCaseForTest({ id: 'c6' });
    c6.team = [{ id: 'tm1', name: 'Yardımcı B', role: 'assistant' }];
    c6.lastEditedBy = 'tm1';
    const m6 = T.emptyMaterialForTest({ id: 'm6', fileName: 'c.wav' });
    m6.segments.push(T.emptySegmentForTest({ id: 'x1', start: '00:00:00.000', end: '00:00:04.000', speaker: 'S1', text: 'a' }));
    m6.segments.push(T.emptySegmentForTest({ id: 'x2', start: '00:00:04.000', end: '00:00:08.000', speaker: 'S1', text: 'b' }));
    c6.materials.push(m6);
    T.setAppState({ cases: [c6], activeCaseId: 'c6' });
    T.mergeSegmentWithNext(m6, 0);
    eq('ikinci göz birleştiremez', m6.segments.length, 2);
  }

  // Bölme de günlüğe yazılır.
  const m3 = mk();
  const lb3 = (m3.log || []).length;
  T.splitSegmentAt(m3, 0, 2);
  eq('bölme günlüğe yazıldı', (m3.log || []).length, lb3 + 1);
}

console.log('\n== [68] Canlı vurgu metin içinde: kelime konumu (v2.188)');
{
  // KULLANICI: "vurguyu text box içinde yaptır." Vurgu katmanı, aktif kelimenin
  // METİN İÇİNDEKİ karakter aralığını bilmek zorunda. Yanlış aralık → yanlış
  // kelime vurgulanır. Saf fonksiyon, düzenlenmiş metinle ASR kelimeleri
  // birebir örtüşmediğinde bile uydurma konum yazmaz (null döner).
  const txt = 'Ali geldi mi? Ali gelmedi.';
  const segs = [
    { w: 'Ali', s: 0, e: 0.5 },
    { w: ' ', s: NaN, e: NaN },
    { w: 'geldi', s: 0.5, e: 1 },
    { w: ' ', s: NaN, e: NaN },
    { w: 'mi?', s: 1, e: 1.2 },
    { w: ' ', s: NaN, e: NaN },
    { w: 'Ali', s: 1.2, e: 1.4 },
    { w: ' ', s: NaN, e: NaN },
    { w: 'gelmedi.', s: 1.4, e: 2 }
  ];
  const spans = T.karaokeCharSpans(txt, segs);
  eq('ilk kelime konumu', JSON.stringify(spans[0]), JSON.stringify([0, 3]));
  eq('ikinci Ali SIRAYLA bulunur (baştan değil)', JSON.stringify(spans[6]), JSON.stringify([14, 17]));
  eq('son kelime konumu', JSON.stringify(spans[8]), JSON.stringify([18, 26]));
  // Boşluk parçası eşlenir ama `s` NaN olduğu için ASLA aktif olmaz.
  eq('boşluk parçası eşlenir', JSON.stringify(spans[1]), JSON.stringify([3, 4]));
  eq('boşluk aktif indeks üretmez (geldi seçilir)', T.karaokeActiveIndex(segs, 0.6), 2);
  // Düzenlenmiş metinde olmayan ASR kelimesi: konum uydurulmaz.
  const spans2 = T.karaokeCharSpans('farklı metin', [{ w: 'yok', s: 0, e: 1 }]);
  eq('bulunamayan kelime null', spans2[0], null);
  // Aynı kelime iki kez: ikinci arama ilk bulgunun İLERİSİNDEN başlar.
  const spans3 = T.karaokeCharSpans('ev ev', [{ w: 'ev', s: 0, e: 1 }, { w: ' ', s: NaN, e: NaN }, { w: 'ev', s: 1, e: 2 }]);
  eq('yinelenen kelime ikinci konumda', JSON.stringify(spans3[2]), JSON.stringify([3, 5]));
}

console.log('\n== [69] Konuşmacı silme ve rapor filtresi (v2.192)');
{
  // KULLANICI: "Bölümde konuşmacı seçilmedi yapıyorum ama raporda/ses
  // dosyasında yine görünüyor; silemiyor muyuz?" Kök: konuşmacı kaydı
  // silinmiyordu ve rapor TÜM kayıtları listeliyordu.
  const c = T.emptyCaseForTest({ id: 'c1' });
  const m = T.emptyMaterialForTest({ id: 'm1', name: '3.mp3', fileName: '3.mp3' });
  m.speakers = [
    { id: 'sp1', code: 'S1', name: 'S1', role: 'unspecified', gender: 'unspecified' },
    { id: 'sp2', code: 'S2', name: 'K', role: 'unspecified', gender: 'unspecified' },
    { id: 'sp3', code: 'S3', name: 'E', role: 'unspecified', gender: 'unspecified' }
  ];
  // seg1: ad ile; seg2: YALNIZ speakerId ile (v3 kaydı) bağlı.
  m.segments = [
    T.emptySegmentForTest({ id: 'g1', speaker: 'S1', text: 'a' }),
    T.emptySegmentForTest({ id: 'g2', speakerId: 'sp1', text: 'b' }),
    T.emptySegmentForTest({ id: 'g3', speaker: '', speakerId: '', text: 'c' })
  ];
  c.materials = [m];
  eq('ada göre eşleşir', T.speakerSegments(m, 'S1').length, 1);
  eq('kimliğe göre eşleşir (v3)', T.speakerSegments(m, m.speakers[0]).length, 2);
  eq('atanmamış konuşmacı 0 bölüm', T.speakerSegments(m, m.speakers[1]).length, 0);
  eq('kullanılmayanlar: K ve E', T.unusedSpeakers(m).map((s) => s.name).join(','), 'K,E');
  // Rapor yalnız ATANMIŞ konuşmacıyı listeler.
  const rows = T.speakerRows(c);
  eq('raporda tek satır (S1)', rows.length, 1);
  eq('satır kodu S1', rows[0][0], 'S1');
  eq('satır etiketi S1', rows[0][1], 'S1');
  eq('satır bölüm sayısı', /2 bölüm/.test(rows[0][7]), true);
  // Atanmamış K silinir: bölümlere dokunmaz.
  const clearedK = T.removeSpeaker(m, m.speakers[1]);
  eq('K silindi, bölüm ataması yok', clearedK, 0);
  eq('K listeden çıktı', m.speakers.some((s) => s.name === 'K'), false);
  eq('metinler korundu', m.segments.map((s) => s.text).join(''), 'abc');
  // Atanmış S1 silinir: iki bölümün ataması temizlenir.
  const sp1 = m.speakers.find((s) => s.name === 'S1');
  const cleared1 = T.removeSpeaker(m, sp1);
  eq('S1 iki bölümden temizlendi', cleared1, 2);
  eq('bölüm 1 ataması boş', m.segments[0].speaker, '');
  eq('bölüm 2 kimliği boş', m.segments[1].speakerId, '');
  eq('S1 listeden çıktı', m.speakers.some((s) => s.name === 'S1'), false);
  eq('rapor artık boş (atanmış konuşmacı yok)', T.speakerRows(c).length, 0);
  eq('metinler hâlâ korundu', m.segments.map((s) => s.text).join(''), 'abc');
}

console.log('\n== [70] Birleştirme adayı: deterministik ölçüt (v2.198)');
{
  // KULLANICI: "Birleştirilecek gibi bir şey koysak." Uydurma skor YOK;
  // ölçüt yalnız gözlemlenebilir işaretler. Aday İŞARETTİR, otomatik
  // birleştirme yapılmaz.
  const seg = (o) => T.emptySegmentForTest(o);
  const pair = (a = {}, b = {}) => [
    seg({ id: 'a', start: '00:00:01.000', end: '00:00:02.200', text: 've', speaker: 'S1', ...a }),
    seg({ id: 'b', start: '00:00:02.300', end: '00:00:04.000', text: 'sonra gitti.', speaker: 'S1', ...b })
  ];

  let segs = pair();
  eq('uygun aday (aynı konuşmacı, kısa, noktalamasız, boşluksuz)', T.mergeCandidateAt(segs, 0).ok, true);
  eq('uygun adayda neden yok', T.mergeCandidateAt(segs, 0).reasons, []);
  eq('son bölüm aday değil', T.mergeCandidateAt(segs, 1).ok, false);
  eq('son bölüm nedeni', T.mergeCandidateAt(segs, 1).reasons, ['sonraki bölüm yok']);
  eq('aralık dışı indeks', T.mergeCandidateAt(segs, 9).ok, false);

  // Ölçüt mutasyona yol açmamalı: aday hesabı veriyi DEĞİŞTİRMEZ.
  const before = JSON.stringify(segs);
  T.mergeCandidateAt(segs, 0);
  T.mergeCandidateIndexes(segs);
  eq('aday hesabı veriyi değiştirmez', JSON.stringify(segs), before);

  segs = pair({ speaker: 'S1' }, { speaker: 'S2' });
  eq('farklı konuşmacı aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('farklı konuşmacı nedeni', T.mergeCandidateAt(segs, 0).reasons.includes('farklı konuşmacı'), true);

  segs = pair({ text: 'sonra gitti.' });
  eq('cümle bitmiş (.) aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('cümle bitmiş nedeni', T.mergeCandidateAt(segs, 0).reasons.includes('cümle bitmiş'), true);
  segs = pair({ text: 'sonra gitti…' });
  eq('cümle bitmiş (…) aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  segs = pair({ text: 'geldi mi?' });
  eq('soru işareti aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  segs = pair({ text: 'gitti."' });
  eq('kapanış tırnağı sonrası nokta aday değil', T.mergeCandidateAt(segs, 0).ok, false);

  // Uzun VE çok kelimeli → aday değil. (İki ölçütten biri yeterli.)
  segs = pair({ end: '00:00:09.000', text: 'bu cümle çok uzun ve tamamlanmış bir cümle' });
  eq('uzun + çok kelime aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('uzun nedenli', T.mergeCandidateAt(segs, 0).reasons.includes('bölüm kısa değil'), true);
  // Yalnız KELİME ölçütü: 3 kelime ama 6 sn → aday (VEYA ölçütü).
  segs = pair({ end: '00:00:07.000', text: 'bir iki üç' }, { start: '00:00:07.200' });
  eq('kısa kelime sayısı yeter (süre uzun olsa da)', T.mergeCandidateAt(segs, 0).ok, true);
  // Yalnız SÜRE ölçütü: 1 sn ama 6 kelime → aday.
  segs = pair({ end: '00:00:02.000', text: 'bir iki üç dört beş altı' }, { start: '00:00:02.100' });
  eq('kısa süre yeter (kelime çok olsa da)', T.mergeCandidateAt(segs, 0).ok, true);

  // Boşluk ölçütü: ≤ 0,5 sn aday; daha fazlası değil.
  segs = pair({ end: '00:00:02.000' }, { start: '00:00:02.500' });
  eq('boşluk tam 0,5 sn → aday', T.mergeCandidateAt(segs, 0).ok, true);
  segs = pair({ end: '00:00:02.000' }, { start: '00:00:02.501' });
  eq('boşluk 0,501 sn → aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('uzun boşluk nedeni', T.mergeCandidateAt(segs, 0).reasons.includes('arada uzun boşluk'), true);
  segs = pair({ end: '00:00:03.000' }, { start: '00:00:02.000' });
  eq('zaman çakışması aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('çakışma nedeni', T.mergeCandidateAt(segs, 0).reasons.includes('zaman çakışıyor'), true);
  segs = pair({ end: 'bozuk' });
  eq('geçersiz zaman aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('geçersiz zaman nedeni', T.mergeCandidateAt(segs, 0).reasons.includes('zaman okunamadı'), true);

  // Denetlenmiş bölüm aday gösterilmez (birleştirme onayı düşürür).
  segs = pair({ review: 'approved' });
  eq('onaylı bölüm aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  eq('onaylı neden', T.mergeCandidateAt(segs, 0).reasons.includes('bölüm denetlenmiş'), true);
  segs = pair({ review: 'machine' });
  eq('makine işaretli bölüm aday (onay değil)', T.mergeCandidateAt(segs, 0).ok, true);

  // Anlamlı metin yok → aday değil.
  segs = pair({ text: '' });
  eq('boş metin aday değil', T.mergeCandidateAt(segs, 0).ok, false);
  segs = pair({ text: '[müzik]' });
  eq('dolgu etiketi aday değil', T.mergeCandidateAt(segs, 0).ok, false);

  // TEK KAYNAK: sayaç, filtre ve rozet aynı kümeyi kullanır.
  const many = [
    ...pair(), // 0 aday
    seg({ id: 'c', start: '00:00:04.000', end: '00:00:05.000', text: 'ama', speaker: 'S1' }), // 2 aday
    seg({ id: 'd', start: '00:00:05.100', end: '00:00:09.000', text: 'uzun bir cümle burada bitti.', speaker: 'S1' })
  ];
  const idx = T.mergeCandidateIndexes(many);
  eq('aday indeksleri', [...idx].sort(), [0, 2]);
  const m = T.emptyMaterialForTest({ id: 'm1', name: 'x.wav' });
  m.segments = many;
  eq('sayaç = aday sayısı', T.segCounts(m).merge, 2);
  eq('filtre adayı seçer', T.segMatchesFilter(many[0], 'merge', null, 0, null, idx), true);
  eq('filtre aday olmayanı dışlar', T.segMatchesFilter(many[1], 'merge', many[0], 1, null, idx), false);
  eq('filtre küme yoksa boş', T.segMatchesFilter(many[0], 'merge', null, 0, null, null), false);

  // Koşullu çip: sayı 0 iken çizilmez, >0 iken çizilir.
  const counts = (merge) => ({
    all: 4, pending: 4, quick: 0, approved: 0, inaudible: 0, relisten: 0, time: 0, merge
  });
  eq('aday çipi yok (0)', T.segFilterChipsHtml(counts(0), 'all').includes('data-seg-filter="merge"'), false);
  const chipHtml = T.segFilterChipsHtml(counts(2), 'merge');
  eq('aday çipi var (>0)', chipHtml.includes('data-seg-filter="merge"'), true);
  eq('çip etiketi "Birleştirme adayı"', /Birleştirme adayı/.test(chipHtml), true);
  eq('aktif çip işaretli', /filter-chip on" data-seg-filter="merge"/.test(chipHtml), true);
  eq('koşullu filtre kümesi', [...T.CONDITIONAL_FILTERS].sort(), [
    'ambiguous',
    'distance',
    'distortion',
    'foreignLanguage',
    'inaudibleObs',
    'long',
    'machine',
    'merge',
    'notAudible',
    'overlap',
    'time'
  ]);
  eq('eşikler: süre 2 sn', T.MERGE_CANDIDATE.maxDurSec, 2);
  eq('eşikler: 5 kelime', T.MERGE_CANDIDATE.maxWords, 5);
  eq('eşikler: 0,5 sn boşluk', T.MERGE_CANDIDATE.maxGapSec, 0.5);

  // 5 TUŞU: yalnız GÖRÜNÜM filtresi; veri değiştirmez. Aday yoksa filtre
  // değişmez (boş liste göstermek yanıltıcı olur).
  eq('5 tuşu: aday yoksa filtre değişmez', T.nextMergeFilter('all', 0), 'all');
  eq('5 tuşu: all → merge', T.nextMergeFilter('all', 2), 'merge');
  eq('5 tuşu: merge → all', T.nextMergeFilter('merge', 2), 'all');
  eq('5 tuşu: başka filtreden merge', T.nextMergeFilter('pending', 1), 'merge');
  eq('5 tuşu: aday yoksa mevcut merge kalır', T.nextMergeFilter('merge', 0), 'merge');
}

console.log('\n== [71] Dar ekran karar çubuğu: Kontrol seçenekleri (v2.199)');
{
  // KULLANICI: 900 px'te Dinle/Kontrol ekran dışında (y=1631); karar için
  // kaydırmak gerekiyordu. Dar çubuk artık Kontrol seçicisini taşır.
  // Seçenekler ayrıntı başlığıyla AYNI kaynaktan gelir; dar ekranda kısa etiket.
  const full = T.reviewSelectOptions('approved');
  eq('tam etiket: 6 seçenek', (full.match(/<option/g) || []).length, 6);
  eq('tam etiket: Onaylandı seçili', /value="approved" selected>Onaylandı</.test(full), true);
  eq('tam etiket: Kontrol bekliyor', /value="pending"[^>]*>Kontrol bekliyor</.test(full), true);
  eq('tam etiket: Yeniden dinlenecek', /value="relisten"[^>]*>Yeniden dinlenecek</.test(full), true);
  eq('tam etiket: Belirsiz okuma', /value="ambiguous"[^>]*>Belirsiz okuma</.test(full), true);
  const short = T.reviewSelectOptions('approved', true);
  eq('kısa etiket: 6 seçenek', (short.match(/<option/g) || []).length, 6);
  eq('kısa etiket: Bekliyor', /value="pending"[^>]*>Bekliyor</.test(short), true);
  eq('kısa etiket: Yeniden', /value="relisten"[^>]*>Yeniden</.test(short), true);
  eq('kısa etiket: Belirsiz', /value="ambiguous"[^>]*>Belirsiz</.test(short), true);
  eq('kısa etiket: Onaylandı seçili', /value="approved" selected>Onaylandı</.test(short), true);
  eq('seçili olmayan işaretlenmez', /value="pending" selected/.test(short), false);
  // Kısa etiketler TAM etiketlerden farklı olmalı (gerçekten kısa).
  eq('kısa etiket tam etiketten kısa', short.length < full.length, true);
}

console.log('\n== [72] Bölüm uzunluğu: 45 sn üstü uyarı (v2.200)');
{
  // Standart: 1–3 cümle veya ~15–30 sn; üst sınır 45 sn. Uyarı BİLDİRİR,
  // birleştirmeyi ENGELLEMEZ (karar bilirkişinin).
  eq('45 sn tam sınır: uyarı yok', T.segmentLengthInfo(45).level, 'ok');
  eq('45,1 sn: uzun', T.segmentLengthInfo(45.1).level, 'long');
  eq('72 sn: uzun', T.segmentLengthInfo(72).level, 'long');
  eq('72 sn kısa gösterim', T.segmentLengthInfo(72).short, '01:12');
  eq('uyarı metni 45 sn içeriyor', /45 sn/.test(T.segmentLengthInfo(72).text), true);
  eq('uyarı engelleme değil, bölme önerisi', /engellenmez/.test(T.segmentLengthInfo(72).text) && /bölün/.test(T.segmentLengthInfo(72).text), true);
  eq('30 sn: uyarı yok (hedef içinde)', T.segmentLengthInfo(30).level, 'ok');
  eq('geçersiz süre: uyarı yok', T.segmentLengthInfo(NaN).level, 'ok');
  eq('sıfır süre: uyarı yok', T.segmentLengthInfo(0).level, 'ok');
  eq('eşik 45 sn', T.SEG_LENGTH.hardMaxSec, 45);
  eq('hedef üst sınır 30 sn', T.SEG_LENGTH.targetMaxSec, 30);

  // RAPOR HAZIRLIĞI: 45 sn üstü bölüm denetim maddesi olarak görünür.
  const c = T.emptyCaseForTest({ id: 'c1' });
  const m = T.emptyMaterialForTest({ id: 'm1', name: 'x.wav' });
  m.segments = [
    T.emptySegmentForTest({ id: 'a', start: '00:00:00.000', end: '00:01:12.000', text: 'uzun bölüm', speaker: 'S1' }),
    T.emptySegmentForTest({ id: 'b', start: '00:01:12.000', end: '00:01:20.000', text: 'kısa bölüm', speaker: 'S1' })
  ];
  c.materials = [m];
  const r = T.reportReadiness(c);
  const item = r.items.find((x) => x.key === 'longSegments');
  eq('hazırlıkta 45 sn üstü maddesi var', !!item, true);
  eq('madde sayısı 1', item && item.count, 1);
  eq('madde ayrıntısı standardı içeriyor', item && /45 sn/.test(item.detail), true);
  eq('madde ses görünümüne götürür', item && item.target, 'audio');
  // 45 sn altındaki dosyada madde ÇIKMAZ.
  m.segments[0].end = '00:00:40.000';
  m.segments[1].start = '00:00:40.000';
  const r2 = T.reportReadiness(c);
  eq('45 sn altında madde yok', !!r2.items.find((x) => x.key === 'longSegments'), false);
}

console.log('\n== [73] Rapor hazırlığı: zaman sorunu kayıt başına (v2.201)');
{
  // BULUNAN HATA (v2.200 ölçümü): hazırlık sayacı tüm kayıtların bölümlerini
  // TEK zaman çizgisi gibi sayıyordu. İki kayıt da 0'dan başlayınca aralarında
  // olmayan "çakışma" üretiyordu; ses görünümündeki `time` filtresi ise kayıt
  // başına doğru sayıyordu (v2.156 dersi: iki araç ayrışmamalı).
  const seg = (o) => T.emptySegmentForTest(o);
  const mat = (id, segs) => {
    const m = T.emptyMaterialForTest({ id, name: id + '.wav' });
    m.segments = segs;
    return m;
  };
  const c = T.emptyCaseForTest({ id: 'c1' });
  c.materials = [
    mat('m1', [
      seg({ id: 'a1', start: '00:00:00.000', end: '00:00:10.000', text: 'a', speaker: 'S1' }),
      seg({ id: 'a2', start: '00:00:10.000', end: '00:00:20.000', text: 'b', speaker: 'S1' })
    ]),
    mat('m2', [
      seg({ id: 'b1', start: '00:00:00.000', end: '00:00:10.000', text: 'c', speaker: 'S1' }),
      seg({ id: 'b2', start: '00:00:10.000', end: '00:00:20.000', text: 'd', speaker: 'S1' })
    ])
  ];
  const r = T.reportReadiness(c);
  const timeItem = r.items.find((x) => x.key === 'time');
  eq('iki kayıt da 0’dan başlasa da zaman sorunu yok', timeItem ? timeItem.count : 0, 0);
  const perMaterial = c.materials.reduce((n, m) => n + T.segCounts(m).time, 0);
  eq('hazırlık sayacı = kayıt başına toplam', timeItem ? timeItem.count : 0, perMaterial);

  // GERÇEK çakışma aynı kayıt içinde: 0–10 ve 5–15 → iki taraf da sayılır.
  c.materials = [
    mat('m3', [
      seg({ id: 'c1', start: '00:00:00.000', end: '00:00:10.000', text: 'e', speaker: 'S1' }),
      seg({ id: 'c2', start: '00:00:05.000', end: '00:00:15.000', text: 'f', speaker: 'S1' })
    ])
  ];
  const r2 = T.reportReadiness(c);
  const t2 = r2.items.find((x) => x.key === 'time');
  eq('gerçek çakışma iki tarafı da sayar', t2 && t2.count, 2);
  eq('gerçek çakışma = kayıt başına toplam', t2 && t2.count, T.segCounts(c.materials[0]).time);

  // KARIŞIK: geçerli m1 + çakışan m3 → yalnız gerçek çakışma (2).
  c.materials = [
    mat('m1', [seg({ id: 'a1', start: '00:00:00.000', end: '00:00:10.000', text: 'a', speaker: 'S1' })]),
    mat('m3', [
      seg({ id: 'c1', start: '00:00:00.000', end: '00:00:10.000', text: 'e', speaker: 'S1' }),
      seg({ id: 'c2', start: '00:00:05.000', end: '00:00:15.000', text: 'f', speaker: 'S1' })
    ])
  ];
  const r3 = T.reportReadiness(c);
  const t3 = r3.items.find((x) => x.key === 'time');
  eq('karışık dosyada yalnız gerçek çakışma', t3 && t3.count, 2);
}

console.log('\n== [74] Raporda okuma metni (v2.202)');
{
  // Rapor "Okuma metni": paragraf görünümüyle AYNI gruplama; kanıt tablosu
  // DEĞİŞMEZ. Gruplama salt okunurdur; `m.segments`e dokunmaz.
  const m = T.emptyMaterialForTest({ id: 'm1', name: 'x.wav' });
  m.speakers = [{ id: 'sp1', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified' }];
  m.segments = [
    T.emptySegmentForTest({ id: 'a', start: '00:00:00.000', end: '00:00:05.000', text: 'merhaba', speaker: 'Kiracı', review: 'approved' }),
    T.emptySegmentForTest({ id: 'b', start: '00:00:05.000', end: '00:00:10.000', text: 'dünya', speaker: 'Kiracı', review: 'approved' }),
    T.emptySegmentForTest({ id: 'c', start: '00:00:10.000', end: '00:00:15.000', text: 'evet', speaker: 'Ev sahibi', review: 'pending' })
  ];
  const g = T.readingGroupsFor(m);
  eq('iki konuşmacı → iki grup', g.length, 2);
  eq('aynı konuşmacının metni birleşir', g[0].text, 'merhaba dünya');
  eq('grup 1 bölüm sayısı', /2 bölüm/.test(g[0].head), true);
  eq('grup 1 onaylı (kontrol bekliyor yok)', /kontrol bekliyor/.test(g[0].head), false);
  eq('grup 1 konuşmacı kodu (S1 · Kiracı)', /S1 · Kiracı/.test(g[0].head), true);
  eq('grup 2 metni', g[1].text, 'evet');
  eq('grup 2 kontrol bekliyor', /kontrol bekliyor/.test(g[1].head), true);
  const before = JSON.stringify(m.segments);
  T.readingGroupsFor(m);
  eq('okuma metni veriyi değiştirmez', JSON.stringify(m.segments), before);
  m.segments = [T.emptySegmentForTest({ id: 'd', start: '00:00:00.000', end: '00:00:02.000', text: '', speaker: 'Kiracı' })];
  const g2 = T.readingGroupsFor(m);
  eq('boş metin "(metin yok)"', g2[0].text, '(metin yok)');
  // Uydurma metin YOK: boş bölüm için metin üretilmez.
  eq('boş metin uydurulmaz', g2[0].text.includes('merhaba'), false);
}

console.log('\n== [75] Gözlem işaretleri: dosya birleştirme (v2.203)');
{
  // v2.203: gözlem bayrakları tek tanımdan (OBS_DEFS) gelir. Dosya
  // birleştirmede iki tarafın işaretleri OR'lanır; bilinmeyen (ileri sürüm)
  // anahtar da korunur. Önceden `ts.obs` hiç okunmuyordu → sessiz kayıp.
  const mk = (id, obs) => {
    const c = T.emptyCaseForTest({ id });
    c.updatedAt = '2026-11-20T10:00:00Z';
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    m.segments.push(
      T.emptySegmentForTest({ id: 'sg1', start: '00:00:00.000', end: '00:00:05.000', text: 'merhaba', obs })
    );
    c.materials.push(m);
    return c;
  };
  const mine = mk('c1', { noise: true });
  const theirs = mk('c2', { phone: true, noSpeech: true, futureFlag: true });
  theirs.updatedAt = '2026-11-20T11:00:00Z';
  const r = T.mergeCasesForTest(mine, theirs);
  const obs = r.merged.materials[0].segments[0].obs;
  eq('yerel gözlem korunur (OR)', obs.noise, true);
  eq('gelen telefon gözlemi alınır', obs.phone, true);
  eq('gelen sessizlik gözlemi alınır', obs.noSpeech, true);
  eq('ortak olmayan bilinen anahtar false kalır', obs.music, false);
  eq('bilinmeyen ileri anahtar korunur', obs.futureFlag, true);
  eq('gözlem birleşmesi günlüğe yazılır', r.applied.some((x) => /gözlem işaretleri birleşti/.test(x)), true);
  eq('çakışma üretmez (gözlemler eklenir)', r.conflicts.length, 0);
}

console.log('\n== [76] Dosyalar arası kişi: rapor satırları (v2.205)');
{
  // Aynı kişi iki kayıtta eşleştirilmişse rapor tablosunda TEK satır olmalı;
  // bağsız konuşmacılar ayrı satır kalır. Eşleştirme uzman kanaatidir.
  const mkMat = (id, name, speakers, segs) => {
    const m = T.emptyMaterialForTest({ id, name, fileName: name });
    m.speakers = speakers;
    m.segments = segs;
    return m;
  };
  const seg = (id, speaker) => T.emptySegmentForTest({ id, start: '00:00:00.000', end: '00:00:01.000', text: 'x', speaker });
  const c = T.emptyCaseForTest({ id: 'c1' });
  c.speakers = [
    { id: 'ps1', code: 'K1', label: 'Kiracı', role: 'complainant', gender: 'female', ageRange: '30-40', notes: '' }
  ];
  const spA = { id: 'spA', code: 'S1', name: 'Kiracı', role: 'complainant', gender: 'female', pitch: 120, pitchSamples: 10, personId: 'ps1' };
  const spB = { id: 'spB', code: 'S1', name: 'Kiracı', role: 'complainant', gender: 'female', pitch: 118, pitchSamples: 8, personId: 'ps1' };
  const spC = { id: 'spC', code: 'S2', name: 'Tanık', role: 'witness', gender: 'male', pitch: null, pitchSamples: 0, personId: '' };
  c.materials = [
    mkMat('m1', 'A.wav', [spA], [seg('a1', 'Kiracı'), seg('a2', 'Kiracı')]),
    mkMat('m2', 'B.wav', [spB, spC], [seg('b1', 'Kiracı'), seg('b2', 'Tanık')])
  ];
  const rows = T.speakerRows(c);
  eq('eşleşen kişi tek satır + bağsız = 2', rows.length, 2);
  eq('ilk satır kişi kodu', rows[0][0], 'K1');
  eq('ilk satır kişi etiketi', rows[0][1], 'Kiracı');
  eq('iki kayıt da BÖLÜM/NOT ta', /A\.wav: S1 · 2 bölüm/.test(rows[0][7]) && /B\.wav: S1 · 1 bölüm/.test(rows[0][7]), true);
  eq('uzman eşleştirmesi notu', /uzman eşleştirmesi/.test(rows[0][7]), true);
  eq('perde iki kayıt için listelenir', /A\.wav: 120/.test(rows[0][6]) && /B\.wav: 118/.test(rows[0][6]), true);
  eq('bağsız konuşmacı ayrı satır (kod)', rows[1][0], 'S2');
  eq('bağsız konuşmacı ayrı satır (etiket)', rows[1][1], 'Tanık');
  // Özet sayacı TABLO ile aynı: 2 (3 değil).
  const rs = T.reviewSummaryRows(c);
  const speakerRow = rs.find((r) => r[0] === __schemaMod.REPORT_TEXT?.rsSpeaker || r[0] === 'Konuşmacı etiketi (kayıt içi)');
  eq('özet konuşmacı sayısı = tablo satırı', speakerRow && speakerRow[1], 2);

  // Bağ yoksa eski davranış: her kayıt için ayrı satır (3).
  c.materials[0].speakers[0].personId = '';
  c.materials[1].speakers[0].personId = '';
  eq('bağ yoksa 3 satır', T.speakerRows(c).length, 3);

  // Bağ var ama kişi kaydı yok → bağsız sayılır (uydurma eşleştirme yok).
  c.materials[0].speakers[0].personId = 'ps-yok';
  eq('eksik kişi bağı bağsız sayılır', T.speakerRows(c).length, 3);
}

console.log('\n== [78] Delil paketi: şema, hash, rapor satırı (v2.208)');
{
  // KURAL: Tarayıcı cihazı görmez. delil.json'daki cihaz bilgisi edinme
  // aracının BEYANIDIR; uygulama yalnız dosya SHA-256'sını doğrular.
  const hasDelil = typeof T.validateDelilPack === 'function';
  eq('delil fonksiyonları tanımlı', hasDelil, true);
  if (hasDelil) {
    const hash = 'a'.repeat(64);
    const pack = {
      schema: 'akis.delil.v1',
      acquiredAt: '2026-11-22T10:15:00+03:00',
      operator: { name: 'Ahmet Yılmaz', registry: '1234', organization: 'Kurum' },
      device: { busType: 'USB', model: 'SanDisk', serial: 'SN123', sizeBytes: 16000000000, volumes: ['E:'] },
      method: {
        readOnly: 'diskpart attributes disk set readonly',
        hardwareWriteBlocker: false,
        copyType: 'logical-file-copy',
        image: null,
        tool: { name: 'AKIS Edinme', version: '1.0' }
      },
      files: [{ name: 'a.wav', relPath: 'ses/a.wav', sizeBytes: 10, sha256: hash }],
      notes: 'deneme'
    };
    eq('geçerli paket kabul edilir', T.validateDelilPack(pack), null);
    eq('yanlış şema reddedilir', /şema/i.test(T.validateDelilPack({ ...pack, schema: 'x' })), true);
    eq('boş dosya listesi reddedilir', /listesi/i.test(T.validateDelilPack({ ...pack, files: [] })), true);
    eq('cihaz bilgisi zorunlu', /Cihaz bilgisi/i.test(T.validateDelilPack({ ...pack, device: {} })), true);
    eq('yöntem zorunlu', /yöntem/i.test(T.validateDelilPack({ ...pack, method: {} })), true);
    eq('dosya yolu zorunlu', /yolu eksik/i.test(T.validateDelilPack({ ...pack, files: [{ name: 'a.wav' }] })), true);

    eq('kök delil.json bulunur', T.findDelilManifestPath(['delil.json', 'ses/a.wav']), 'delil.json');
    eq('nested delil.json bulunur', T.findDelilManifestPath(['pkg/ses/a.wav', 'pkg/delil.json']), 'pkg/delil.json');
    eq('backslash delil.json bulunur', T.findDelilManifestPath(['pkg\\delil.json', 'pkg\\ses\\a.wav']), 'pkg\\delil.json');
    eq('delil.json yoksa null', T.findDelilManifestPath(['a.wav']), null);

    eq('hash tutuyor → verified', T.delilFileState({ sha256: hash }, hash), 'verified');
    eq('hash farklı → mismatch', T.delilFileState({ sha256: 'b'.repeat(64) }, hash), 'mismatch');
    eq('beklenen hash yok → unavailable', T.delilFileState({}, hash), 'unavailable');
    eq('hesaplanan hash yok → unavailable', T.delilFileState({ sha256: hash }, null), 'unavailable');

    const origin = T.delilOriginFromPack(pack);
    eq('ortam türü USB', origin.mediumType, 'usb');
    eq('SCSI + removable → usb', T.delilOriginFromPack({ ...pack, device: { ...pack.device, busType: 'SCSI', removable: true } }).mediumType, 'usb');
    eq('SD → memory_card', T.delilOriginFromPack({ ...pack, device: { ...pack.device, busType: 'SD' } }).mediumType, 'memory_card');
    eq('Card Reader modeli → memory_card', T.delilOriginFromPack({ ...pack, device: { ...pack.device, busType: 'SCSI', model: 'Realtek PCIE Card Reader', removable: true } }).mediumType, 'memory_card');
    eq('cihaz etiketi model + seri', origin.mediumLabel, 'SanDisk · SN123');
    eq('teslim eden boş (operatör edinme tutanağında)', origin.deliveredBy, '');
    eq('teslim tarihi boş (alınma ayrı)', origin.deliveredAt, '');
    eq('operatör edinme tutanağında', origin.acquisition.operator.name, 'Ahmet Yılmaz');
    // v2.213: edinme yöntemi KAYIT CİHAZI alanına yazılmaz.
    eq('yöntem cihaz alanına yazılmaz', origin.deviceInfo, '');
    eq('kayıt cihazı bilinmiyor (uydurulmaz)', origin.recordingDevice, '');
    eq('kayıt tarihi bilinmiyor (uydurulmaz)', origin.recordingAt, '');
    eq('yöntem tutanakta korunur', origin.acquisition.method.copyType, 'logical-file-copy');
    eq('alet tutanakta korunur', origin.acquisition.method.tool.name, 'AKIS Edinme');
    eq('edinme tutanağı korunur', origin.acquisition.device.serial, 'SN123');

    eq('kopya türü etiketi', T.delilCopyTypeLabel('full-device-image'), 'Tam DD imajı');
    eq('bilinmeyen kopya türü kendini yazar', T.delilCopyTypeLabel('x'), 'x');
    eq('kopya türü yok → tire', T.delilCopyTypeLabel(), '—');
    eq('durum etiketi doğrulandı', T.delilStateLabel('verified'), 'Doğrulandı');
    eq('durum etiketi pakette yok', T.delilStateLabel('missing'), 'Pakette yok');
    eq('durum etiketi zaten var', T.delilStateLabel('duplicate'), 'Zaten var (atlandı)');
    eq('durum etiketi ses dışı', T.delilStateLabel('skipped'), 'Ses dışı (atlandı)');
    eq('bilinmeyen durum doğrulanamadı', T.delilStateLabel('x'), 'Doğrulanamadı');

    eq('ses dosyası tanınır', T.isAudioFileName('a.WAV') && T.isAudioFileName('b.m4a'), true);
    eq('ses dışı tanınmaz', T.isAudioFileName('bilgi.txt') || T.isAudioFileName('video.mp4'), false);
    eq('aynı hash mevcut kaydı bulur', T.delilDuplicateOf([{ id: 'm1', sha256: hash }], hash).id, 'm1');
    eq('farklı hash kayıt bulmaz', T.delilDuplicateOf([{ id: 'm1', sha256: 'b'.repeat(64) }], hash), null);
    eq('geçersiz hash kayıt bulmaz', T.delilDuplicateOf([{ id: 'm1', sha256: hash }], 'x'), null);

    const sum = T.delilSummary([
      { state: 'verified' },
      { state: 'mismatch' },
      { state: 'unavailable' },
      { state: 'missing' },
      { state: 'duplicate' },
      { state: 'skipped' }
    ]);
    eq('özet sayıları', [sum.total, sum.verified, sum.mismatch, sum.unavailable, sum.missing, sum.duplicate, sum.skipped].join(','), '6,1,1,1,1,1,1');

    // Rapor satırı: yalnız delil paketinden gelen kayıt girer.
    const c = T.emptyCaseForTest({ id: 'c1' });
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    m.origin.acquisition = {
      ...origin.acquisition,
      hashState: 'verified'
    };
    c.materials = [m];
    const rows = T.acquisitionRows(c);
    eq('delil kaydı tek satır', rows.length, 1);
    eq('edinme satırı 9 sütun', rows[0].length, 9);
    eq('satır dosya adı', rows[0][0], 'a.wav');
    // v2.212: sürücü harfi (D:) kanıt kimliği DEĞİLDİR; rapora yazılmaz.
    // v2.213: CİHAZ ve ETİKET ayrı sütun.
    eq('satır cihaz (sürücü harfi yok)', rows[0][1], 'SanDisk');
    eq('satır etiket ayrı sütun', rows[0][2], '—');
    eq('satır seri no', rows[0][3], 'SN123');
    eq('satır yöntem', rows[0][4], 'Mantıksal kopya');
    // Eski paketler alet adını kendi yazar; kanıt tahrif edilmez.
    eq('eski paket araç adı korunur', rows[0][5], 'AKIS Edinme v1.0');
    // v2.212: operatör hücresi sicili taşır (Ad Soyad · Sicil).
    eq('satır operatör + sicil', rows[0][6], 'Ahmet Yılmaz · 1234');
    eq('satır tarih yıl taşır', /2026/.test(rows[0][7]), true);
    eq('satır doğrulama durumu', rows[0][8], 'Doğrulandı');
    m.origin.acquisition.hashState = 'mismatch';
    eq('uyuşmuyor satırı', T.acquisitionRows(c)[0][8], 'Uyuşmuyor');
    // Paket yoksa bölüm çizilmez.
    const c2 = T.emptyCaseForTest({ id: 'c2' });
    const m2 = T.emptyMaterialForTest({ id: 'm2', fileName: 'b.wav' });
    c2.materials = [m2];
    eq('paket yoksa satır yok', T.acquisitionRows(c2).length, 0);

    // --- v2.212: alet adı ürün markası değil, aletin kendisidir ---------
    const hasV212 = typeof T.delilToolText === 'function' && typeof T.originRows === 'function';
    eq('v2.212 fonksiyonları tanımlı (alet metni, köken satırı)', hasV212, true);
    if (hasV212) {
    // v2.213: alet adı "Edinim v1.1" biçiminde; motor yalnız Rust ise eklenir.
    eq('alet metni ad + v sürüm', T.delilToolText({ name: 'Edinim', version: '1.1', engine: 'PowerShell' }), 'Edinim v1.1');
    eq('sürümdeki v tekrarlanmaz', T.delilToolText({ name: 'Edinim', version: 'v1.1' }), 'Edinim v1.1');
    eq('Rust motoru görünür', T.delilToolText({ name: 'Edinim', version: '2.0', engine: 'Rust' }), 'Edinim v2.0 · Rust');
    eq('alet yoksa tire', T.delilToolText(null), '—');

    // --- v2.212: teslim eden ≠ operatör; ikisi ayrı kaydedilir ----------
    const dPack = {
      ...pack,
      delivery: {
        deliveredBy: 'Mehmet Kaya',
        registry: 'K-77',
        deliveredAt: '2026-11-21T14:05:00+03:00',
        place: 'Ankara 3. Sulh Ceza Mahkemesi'
      }
    };
    const dOrigin = T.delilOriginFromPack(dPack);
    eq('teslim eden paketten gelir', dOrigin.deliveredBy, 'Mehmet Kaya');
    eq('teslim eden sicili paketten gelir', dOrigin.deliveredByRegistry, 'K-77');
    eq('teslim tarihi gün olarak saklanır', dOrigin.deliveredAt, '2026-11-21');
    eq('teslim yeri paketten gelir', dOrigin.deliveryPlace, 'Ankara 3. Sulh Ceza Mahkemesi');
    eq('ham teslim beyanı teknik izde kalır', dOrigin.acquisition.delivery.place, 'Ankara 3. Sulh Ceza Mahkemesi');
    eq('teslim bilgisi yoksa uydurulmaz', T.delilOriginFromPack(pack).deliveredByRegistry, '');
    eq('operatör teslim edenle karışmaz', T.delilOriginFromPack(pack).acquisition.operator.name, 'Ahmet Yılmaz');

    // --- v2.212: cihaz etiketi (varsa) ortam etiketine girer ------------
    eq(
      'etiket + model + seri',
      T.delilOriginFromPack({ ...pack, device: { ...pack.device, label: 'DELIL-7' } }).mediumLabel,
      'DELIL-7 · SanDisk · SN123'
    );
    eq(
      'etiket yoksa uydurulmaz',
      T.delilOriginFromPack({ ...pack, device: { ...pack.device, label: '' } }).mediumLabel,
      'SanDisk · SN123'
    );

    // --- v2.212: köken tablosu teslim yerini taşır ----------------------
    const oc = T.emptyCaseForTest({ id: 'c3' });
    const om = T.emptyMaterialForTest({ id: 'm3', fileName: 'a.wav' });
    om.origin.deliveredBy = 'Mehmet Kaya';
    om.origin.deliveredByRegistry = 'K-77';
    om.origin.deliveredAt = '2026-11-21';
    om.origin.deliveryPlace = 'Ankara 3. Sulh Ceza Mahkemesi';
    oc.materials = [om];
    const orow = T.originRows(oc)[0];
    eq('köken satırı 8 sütun', orow.length, 8);
    eq('teslim eden hücresi sicili taşır', orow[3], 'Mehmet Kaya · K-77');
    eq('teslim yeri sütunu', orow[5], 'Ankara 3. Sulh Ceza Mahkemesi');
    // v2.213: kayıt cihazı ve kayıt tarihi AYRI; bilinmiyorsa "bilinmiyor".
    eq('kayıt cihazı bilinmiyor', orow[6], 'bilinmiyor');
    eq('kayıt tarihi bilinmiyor', orow[7], 'bilinmiyor');
    om.origin.recordingDevice = 'Cep telefonu';
    om.origin.recordingAt = '2026-03-12';
    const orow2 = T.originRows(oc)[0];
    eq('kayıt cihazı ayrı sütun', orow2[6], 'Cep telefonu');
    eq('kayıt tarihi ayrı sütun', /2026/.test(orow2[7]), true);

    // --- v2.213: envanter tablosu 7 ayrı sütun --------------------------
    const ic = T.emptyCaseForTest({ id: 'c4' });
    const im = T.emptyMaterialForTest({ id: 'm4', fileName: '1.mp3' });
    im.name = '1.mp3';
    // Şema alan adları (sizeBytes/durationSec) da okunmalı.
    im.sizeBytes = 21270000;
    im.durationSec = 1063;
    im.sha256 = 'a'.repeat(64);
    im.tech = { channels: 1, sampleRate: 48000, codec: 'MPEG (MP3)', format: 'MP3' };
    ic.materials = [im];
    const irow = T.inventoryRows(ic)[0];
    eq('envanter 7 sütun', irow.length, 7);
    eq('dosya biçimi ayrı sütun', irow[1], 'MP3');
    eq('dosya boyutu ayrı sütun', /MB/.test(irow[2]), true);
    eq('süre ayrı sütun', irow[3], '00:17:43');
    eq('ses kanalı ayrı sütun', irow[4], 'Mono');
    eq('örnekleme hızı ayrı sütun', irow[5], '48.000 Hz');
    eq('hash sütunu', irow[6].length, 64);
    eq('biçim uzantıdan okunur', T.audioFormatLabel('a.M4A', ''), 'M4A');
    eq('uzantı yoksa codec', T.audioFormatLabel('', 'MPEG (MP3)'), 'MP3');
    eq('bilinmeyen biçim', T.audioFormatLabel('x.bin', ''), 'Bilinmiyor');

    // --- v2.212: rapor metinleri ürün kimliği taşımaz -------------------
    // v2.208'de acqIntro "Uygulama cihazı görmez" diyordu; bu, "rapor
    // bilirkişi adına yazılır" kuralını ihlal ediyordu ve Senaryo 10 bunu
    // delil verisi olmadan çalıştığı için yakalayamıyordu.
    const rtext = Object.values(T.REPORT_TEXT).map((v) => (Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : '')).join(' ');
    eq('rapor metninde "uygulama" yok', /uygulama/i.test(rtext), false);
    eq('rapor metninde "AKİS" yok', /ak[iİ]s/i.test(rtext), false);
    eq('rapor metninde "tarayıcı" yok', /tarayıcı/i.test(rtext), false);
    }
  }
}

console.log('\n== [79] Köken/teslim alanları korunur; birleştirme nesneyi okunur karşılaştırır (v2.212)');
{
  // F1 — normalizeMaterial `origin` alanını BEYAZ LİSTE ile yeniden kuruyordu;
  // yeni teslim alanları listede yoksa ilk kaydet/yenile'de sessizce silinirdi.
  const nm = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
  const norm = __schemaMod.normalizeMaterial({
    ...nm,
    origin: { mediumType: 'usb', deliveredBy: 'X', deliveredByRegistry: '42', deliveryPlace: 'Adliye' }
  });
  eq('normalize teslim eden sicilini korur', norm.origin.deliveredByRegistry, '42');
  eq('normalize teslim yerini korur', norm.origin.deliveryPlace, 'Adliye');
  eq('normalize mevcut alanı korur', norm.origin.deliveredBy, 'X');

  const acq = {
    schema: 'akis.delil.v1',
    acquiredAt: '2026-11-22T10:15:00+03:00',
    operator: { name: 'Ahmet Yılmaz', registry: '1234' },
    device: { busType: 'USB', model: 'SanDisk', serial: 'SN123', volumes: ['E:'] },
    method: { copyType: 'logical-file-copy', tool: { name: 'edinme.ps1', version: '1.0', engine: 'PowerShell' } },
    hashState: 'verified'
  };
  const mkCase = (acqObj) => {
    const c = T.emptyCaseForTest({ id: 'c1', fileNo: '1' });
    const m = T.emptyMaterialForTest({ id: 'm1', fileName: 'a.wav' });
    m.sha256 = 'a'.repeat(64);
    m.origin = { ...m.origin, mediumType: 'usb', acquisition: acqObj ? JSON.parse(JSON.stringify(acqObj)) : null };
    c.materials = [m];
    return c;
  };

  // F3 — Aynı içerikli tutanak, referans karşılaştırması yüzünden "farklı"
  // sayılıyordu: önizleme "alınacak alan", birleştirme "çakışma" diyor ve
  // ikisi de ekranda "[object Object]" basıyordu.
  const same = T.mergeCasesForTest(mkCase(acq), mkCase(acq));
  eq('aynı tutanak çakışma üretmez', (same.conflicts || []).filter((x) => x.field === 'origin.acquisition').length, 0);
  eq('aynı tutanak uygulanacak alan üretmez', (same.applied || []).filter((x) => /origin\.acquisition/.test(x)).length, 0);

  const cmpSame = T.compareCasesForTest(mkCase(acq), mkCase(acq));
  eq('önizleme de fark göstermez', (cmpSame.materials.fields || []).filter((x) => x.field === 'origin.acquisition').length, 0);

  const other = { ...acq, device: { ...acq.device, serial: 'SN999' } };
  const diff = T.mergeCasesForTest(mkCase(acq), mkCase(other));
  const cf = (diff.conflicts || []).find((x) => x.field === 'origin.acquisition');
  eq('farklı tutanak çakışma bildirir', !!cf, true);
  eq('çakışma değeri okunur metin', typeof cf.mine === 'string' && cf.mine.includes('SanDisk'), true);
  eq('çakışma metni [object Object] değil', /\[object Object\]/.test(String(cf.mine) + String(cf.theirs)), false);
  const cmpDiff = T.compareCasesForTest(mkCase(acq), mkCase(other));
  const pf = (cmpDiff.materials.fields || []).find((x) => x.field === 'origin.acquisition');
  eq('önizleme de okunur metin verir', typeof pf.mine === 'string' && !/\[object Object\]/.test(pf.mine), true);

  // Teslim alanları: yerel boşsa gelen doldurur (veri kaybı yok).
  const a = mkCase(acq);
  const b = mkCase(acq);
  b.materials[0].origin.deliveryPlace = 'Ankara 3. Sulh Ceza';
  b.materials[0].origin.deliveredByRegistry = 'K-9';
  const filled = T.mergeCasesForTest(a, b);
  eq('teslim yeri boşsa dolar', filled.merged.materials[0].origin.deliveryPlace, 'Ankara 3. Sulh Ceza');
  eq('teslim sicili boşsa dolar', filled.merged.materials[0].origin.deliveredByRegistry, 'K-9');

  // Yerel doluysa gelen sessizce EZMEZ; çakışma bildirir.
  const c3 = mkCase(acq);
  c3.materials[0].origin.deliveryPlace = 'Yerel Yer';
  const c4 = mkCase(acq);
  c4.materials[0].origin.deliveryPlace = 'Gelen Yer';
  const clash = T.mergeCasesForTest(c3, c4);
  eq('dolu teslim yeri korunur', clash.merged.materials[0].origin.deliveryPlace, 'Yerel Yer');
  eq('dolu teslim yeri çakışma bildirir', (clash.conflicts || []).some((x) => x.field === 'origin.deliveryPlace'), true);
}

console.log('\n== [80] Edinim aracı zip: BOM korunur (v2.214)');
{
  // KÖK NEDEN: fetch().text() UTF-8 BOM'u siler; JSZip BOM'suz yazar;
  // Windows PowerShell 5.1 dosyayı ANSI okur ve betik sözdizimi hatası verir.
  const has = typeof T.acquisitionToolFileContent === 'function';
  eq('BOM yardımcısı tanımlı', has, true);
  if (has) {
    const ps1 = T.acquisitionToolFileContent('edinme.ps1', 'Write-Host "İ"');
    eq('ps1 BOM ile başlar', ps1.charCodeAt(0), 0xfeff);
    eq('ps1 gövdesi korunur', ps1.slice(1), 'Write-Host "İ"');
    const twice = T.acquisitionToolFileContent('edinme.ps1', '\uFEFF' + 'x');
    eq('BOM iki kez eklenmez', twice, '\uFEFFx');
    eq('bat dosyasına BOM eklenmez', T.acquisitionToolFileContent('BASLAT.bat', 'echo x'), 'echo x');
    eq('md dosyasına BOM eklenmez', T.acquisitionToolFileContent('OKUBENI.md', '# x'), '# x');
    eq('boş içerik güvenli', T.acquisitionToolFileContent('edinme.ps1', null), '\uFEFF');
  }
}

console.log('\n== [81] Paket v2: kaynak yolu, disk.json, disk envanteri (v2.215)');
{
  const has = typeof T.findDelilDiskPath === 'function' && typeof T.validateDiskDoc === 'function' && typeof T.delilFilePath === 'function';
  eq('paket v2 fonksiyonları tanımlı', has, true);
  if (has) {
    // Dosya yolu: packagePath (paket içi) öncelikli, v1 relPath yedek.
    eq('packagePath öncelikli', T.delilFilePath({ relPath: 'Music/a.mp3', packagePath: 'icerik/SN123/Music/a.mp3' }), 'icerik/SN123/Music/a.mp3');
    eq('v1 relPath yedeği', T.delilFilePath({ relPath: 'ses/a.wav' }), 'ses/a.wav');
    eq('yol yoksa boş', T.delilFilePath({}), '');

    // disk.json bulma (kök / nested / ters bölü)
    eq('kök disk.json', T.findDelilDiskPath(['disk.json', 'delil.json']), 'disk.json');
    eq('nested disk.json', T.findDelilDiskPath(['p/ses/a.wav', 'p/disk.json']), 'p/disk.json');
    eq('backslash disk.json', T.findDelilDiskPath(['p\\disk.json']), 'p\\disk.json');
    eq('disk.json yoksa null', T.findDelilDiskPath(['delil.json']), null);

    // disk.json doğrulama
    const disk = {
      schema: 'akis.disk.v1',
      capturedAt: '2026-11-22T10:00:00+03:00',
      device: { serial: 'SN123', model: 'SanDisk' },
      content: { root: 'icerik/SN123', directories: ['Music'], fileCount: 2 }
    };
    eq('geçerli disk.json', T.validateDiskDoc(disk), null);
    eq('yanlış şema reddedilir', /şema/i.test(T.validateDiskDoc({ ...disk, schema: 'x' })), true);
    eq('içerik yok reddedilir', /içerik/i.test(T.validateDiskDoc({ ...disk, content: null })), true);
    eq('kök yok reddedilir', /kök/i.test(T.validateDiskDoc({ ...disk, content: { directories: [] } })), true);
    eq('dizin listesi yok reddedilir', /dizin/i.test(T.validateDiskDoc({ ...disk, content: { root: 'icerik/x' } })), true);

    // v2 paket: relPath kaynak yolu, packagePath paket içi
    const v2pack = {
      schema: 'akis.delil.v1',
      acquiredAt: '2026-11-22T10:15:00+03:00',
      operator: { name: 'A' },
      device: { model: 'M', serial: 'SN' },
      method: { copyType: 'logical-file-copy' },
      files: [{ name: 'a.mp3', relPath: 'Music/a.mp3', packagePath: 'icerik/SN/Music/a.mp3', sha256: 'a'.repeat(64) }]
    };
    eq('v2 paket kabul edilir', T.validateDelilPack(v2pack), null);
    eq('packagePath tek başına yeterli', T.validateDelilPack({ ...v2pack, files: [{ name: 'a.mp3', packagePath: 'icerik/SN/a.mp3' }] }), null);

    // Şema: disk envanteri korunur / kimlik verilir
    const cA = T.emptyCaseForTest({ id: 'cA' });
    cA.disks = [disk];
    const norm = __schemaMod.normalizeCase(cA);
    eq('disk envanteri normalize edilir', norm.disks.length, 1);
    eq('disk kimliği verilir', !!norm.disks[0].id, true);

    // Birleştirme: yeni disk eklenir
    const cB = T.emptyCaseForTest({ id: 'cB' });
    cB.disks = [{ ...disk, id: 'dk1' }];
    const m1 = T.mergeCasesForTest(T.emptyCaseForTest({ id: 'cA' }), cB);
    eq('disk envanteri birleşir', m1.merged.disks.length, 1);
    eq('disk envanteri günlüğe yazılır', (m1.applied || []).some((x) => /disk envanteri eklendi/.test(x)), true);

    // Birleştirme: aynı kimlik farklı içerik -> çakışma (sessiz ezme yok)
    const cC = T.emptyCaseForTest({ id: 'cC' });
    cC.disks = [{ ...disk, id: 'dk1', content: { ...disk.content, fileCount: 3 } }];
    const cD = T.emptyCaseForTest({ id: 'cD' });
    cD.disks = [{ ...disk, id: 'dk1', content: { ...disk.content, fileCount: 5 } }];
    const m2 = T.mergeCasesForTest(cC, cD);
    eq('aynı disk çakışması bildirilir', (m2.conflicts || []).some((x) => x.kind === 'case-disk'), true);

    // Önizleme: eklenecek disk sayısı
    const cmp = T.compareCasesForTest(T.emptyCaseForTest({ id: 'cE' }), cB);
    eq('önizleme disk sayısı', cmp.disks.added, 1);
  }
}

console.log('\n== [82] Envanter ağacı ve gözlenen dosya zamanları (v2.216)');
{
  const has = typeof T.inventoryTree === 'function' && typeof T.inventoryCounts === 'function' && typeof T.fileTimesFromEntry === 'function';
  eq('envanter fonksiyonları tanımlı', has, true);
  if (has) {
    const files = [
      { name: 'a.wav', relPath: 'DCIM/Voice/a.wav', sizeBytes: 1000, role: 'audio', materialId: 'm1' },
      { name: 'b.txt', relPath: 'Notes/b.txt', sizeBytes: 10, role: 'other' },
      { name: 'c.mp3', relPath: 'Music/c.mp3', sizeBytes: 2000, role: 'audio', materialId: 'm2' },
      { name: 'kok.txt', relPath: 'kok.txt', sizeBytes: 5, role: 'other' }
    ];
    const counts = T.inventoryCounts(files);
    eq('envanter sayıları', [counts.total, counts.audio, counts.other, counts.bytes].join(','), '4,2,2,3015');
    eq('boş liste sayıları', T.inventoryCounts([]).total, 0);

    const tree = T.inventoryTree(files);
    eq('kök dizinler sıralı', tree.dirs.map((d) => d.name).join(','), 'DCIM,Music,Notes');
    eq('alt dizin', tree.dirs[0].dirs.map((d) => d.name).join(','), 'Voice');
    eq('kök dosya', tree.files.map((f) => f.base).join(','), 'kok.txt');
    eq('dizin dosyası', tree.dirs[0].dirs[0].files.map((f) => f.base).join(','), 'a.wav');
    eq('dosya yolu korunur', tree.dirs[0].dirs[0].files[0].path, 'DCIM/Voice/a.wav');
    eq('ses kaydı bağı', tree.dirs[0].dirs[0].files[0].materialId, 'm1');

    // Yol yoksa packagePath, o da yoksa name kullanılır.
    const t2 = T.inventoryTree([{ name: 'x.wav', packagePath: 'icerik/SN/x.wav', role: 'audio' }]);
    eq('packagePath yedeği', t2.dirs[0].name, 'icerik');

    // Gözlenen dosya zamanları: eksik alan boş kalır (uydurulmaz).
    const ft = T.fileTimesFromEntry({ createdAt: '2026-11-21T10:00:00+03:00', modifiedAt: '2026-11-20T09:00:00+03:00' });
    eq('createdAt okunur', ft.createdAt, '2026-11-21T10:00:00+03:00');
    eq('accessedAt yoksa boş', ft.accessedAt, '');
    eq('boş girdi güvenli', T.fileTimesFromEntry(null).modifiedAt, '');

    // Şema: dosya zamanları korunur (beyaz liste tuzağı).
    const nm = T.emptyMaterialForTest({ id: 'm9', fileName: 'a.wav' });
    const norm = __schemaMod.normalizeMaterial({
      ...nm,
      origin: { mediumType: 'usb', fileTimes: { createdAt: 'C', modifiedAt: 'M', accessedAt: 'A' } }
    });
    eq('şema dosya zamanlarını korur', `${norm.origin.fileTimes.createdAt}/${norm.origin.fileTimes.modifiedAt}/${norm.origin.fileTimes.accessedAt}`, 'C/M/A');
  }
}

console.log('\n== [83] Gömülü metadata (cihaz beyanı) — ID3/MP4/WAV/FLAC (v2.217)');
{
  const has = typeof T.readEmbeddedMeta === 'function' && typeof T.parseId3v2 === 'function';
  eq('gömülü metadata fonksiyonları tanımlı', has, true);
  if (has) {
    const cat = (...arrs) => {
      const total = arrs.reduce((n, a) => n + a.length, 0);
      const out = new Uint8Array(total);
      let o = 0;
      for (const a of arrs) {
        out.set(a, o);
        o += a.length;
      }
      return out;
    };
    const ascii = (str) => Uint8Array.from([...String(str)].map((c) => c.charCodeAt(0) & 255));
    const syncsafe = (n) => Uint8Array.from([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);
    const be32 = (n) => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
    const le32 = (n) => Uint8Array.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);

    // --- ID3v2.4 (MP3)
    const id3frame = (id, text) => {
      const body = cat(Uint8Array.from([3]), ascii(text));
      return cat(ascii(id), syncsafe(body.length), Uint8Array.from([0, 0]), body);
    };
    const frames = cat(id3frame('TDRC', '2026-03-12T14:20'), id3frame('TSSE', 'PhoneRecorder 2.0'));
    const id3 = cat(ascii('ID3'), Uint8Array.from([4, 0, 0]), syncsafe(frames.length), frames);
    const rid3 = T.parseId3v2(id3);
    eq('ID3 kayıt zamanı', rid3.recordingAt, '2026-03-12T14:20');
    eq('ID3 yazılım', rid3.software, 'PhoneRecorder 2.0');
    eq('ID3 kaynak', rid3.source, 'ID3v2.4');
    eq('ID3 olmayan dosya boş', Object.keys(T.parseId3v2(ascii('RIFFxxxx'))).length, 0);

    // --- MP4/M4A (mvhd + ©day + ©too)
    const box = (type, payload) => cat(be32(8 + payload.length), ascii(type), payload);
    const dataBox = (text) => box('data', cat(be32(1), be32(0), ascii(text)));
    const epoch = Math.floor(Date.UTC(2026, 2, 12, 14, 20, 0) / 1000) + 2082844800;
    const mvhd = box('mvhd', cat(Uint8Array.from([0, 0, 0, 0]), be32(epoch), be32(epoch), be32(1000), be32(0)));
    const ilst = box('ilst', cat(box('\u00a9day', dataBox('2026-03-12')), box('\u00a9too', dataBox('PhoneRecorder 2.0'))));
    const meta = box('meta', cat(Uint8Array.from([0, 0, 0, 0]), ilst));
    const mp4 = cat(box('ftyp', ascii('M4A ')), box('moov', cat(mvhd, box('udta', meta))));
    const rmp4 = T.parseMp4Meta(mp4);
    eq('MP4 kayıt zamanı ISO', rmp4.recordingAt, '2026-03-12T14:20:00.000Z');
    eq('MP4 yazılım', rmp4.software, 'PhoneRecorder 2.0');
    eq('MP4 sürüm/tarih', rmp4.releaseAt, '2026-03-12');
    eq('MP4 kaynak', rmp4.source, 'MP4/M4A');
    eq('MP4 epoch dönüşümü', T.mp4EpochToIso(0), '');

    // --- WAV bext
    const bext = new Uint8Array(602);
    const put = (str, off) => {
      for (let i = 0; i < str.length; i++) bext[off + i] = str.charCodeAt(i) & 255;
    };
    put('PhoneRecorder', 256);
    put('2026-03-12', 320);
    put('14:20:00', 330);
    const wav = cat(ascii('RIFF'), le32(4 + 8 + bext.length), ascii('WAVE'), ascii('bext'), le32(bext.length), bext);
    const rwav = T.parseWavMeta(wav);
    eq('WAV kayıt zamanı', rwav.recordingAt, '2026-03-12 14:20:00');
    eq('WAV yazılım', rwav.software, 'PhoneRecorder');
    eq('WAV kaynak', rwav.source, 'WAV bext');

    // --- FLAC Vorbis yorumu
    const vendor = ascii('test');
    const c1 = ascii('DATE=2026-03-12');
    const c2 = ascii('ENCODER=flac 1.4');
    const vc = cat(le32(vendor.length), vendor, le32(2), le32(c1.length), c1, le32(c2.length), c2);
    const flac = cat(ascii('fLaC'), Uint8Array.from([0x84, (vc.length >> 16) & 255, (vc.length >> 8) & 255, vc.length & 255]), vc);
    const rflac = T.parseFlacMeta(flac);
    eq('FLAC kayıt zamanı', rflac.recordingAt, '2026-03-12');
    eq('FLAC yazılım', rflac.software, 'flac 1.4');
    eq('FLAC kaynak', rflac.source, 'FLAC');

    // --- Birleşik okuyucu + özet
    const r = T.readEmbeddedMeta(id3);
    eq('birleşik okuyucu ID3 bulur', r.recordingAt, '2026-03-12T14:20');
    eq('boş buffer güvenli', T.readEmbeddedMeta(new Uint8Array(0)).recordingAt, '');
    eq('özet metni', /kayıt: 2026-03-12T14:20/.test(T.embeddedSummary(r)), true);
    eq('boş özet', T.embeddedSummary({}), '');

    // --- Rapor satırları: yalnız gömülü verisi olan kayıt
    const rc = T.emptyCaseForTest({ id: 'cEmb' });
    const m1 = T.emptyMaterialForTest({ id: 'e1', fileName: 'a.m4a' });
    m1.origin.embedded = { source: 'MP4/M4A', recordingAt: '2026-03-12T14:20:00.000Z', software: 'PhoneRecorder 2.0', encodingAt: '', releaseAt: '', readAt: 'x' };
    const m2 = T.emptyMaterialForTest({ id: 'e2', fileName: 'b.wav' });
    rc.materials = [m1, m2];
    const erows = T.embeddedRows(rc);
    eq('gömülü satır sayısı', erows.length, 1);
    eq('gömülü satır dosyası', erows[0][0], 'a.m4a');
    eq('gömülü satır kaynak', erows[0][3], 'MP4/M4A');

    // --- Şema: gömülü alan ve rapor anahtarı korunur
    const normM = __schemaMod.normalizeMaterial({ ...T.emptyMaterialForTest({ id: 'e3' }), origin: { embedded: { recordingAt: 'R', software: 'S' } } });
    eq('şema gömülü metadata korur', normM.origin.embedded.recordingAt + '/' + normM.origin.embedded.software, 'R/S');
    eq('rapor anahtarı varsayılan kapalı', __schemaMod.emptyCase({}).report.includeEmbedded, false);
    const normC = __schemaMod.normalizeCase({ ...T.emptyCaseForTest({ id: 'e4' }), report: { includeEmbedded: true } });
    eq('rapor anahtarı korunur', normC.report.includeEmbedded, true);
  }
}

// --- 82. Rapor iskeleti: sıra, türetilmiş numara, ekler, revizyon (v2.227) --
// KURAL: numara AÇIK ve SIRALI ana bölümlere göre türetilir; kapatılan bölüm
// numarada boşluk bırakmaz. TOC gövde sırasını izler. Ekler ayrı kayıttır ve
// EK numarası bitişiktir. Revizyon yalnız düzen + rapor metinlerini saklar.
{
  console.log('\n[82] Rapor iskeleti: sıra, numara, ekler, revizyon (v2.227)');
  const c = T.emptyCaseForTest({ id: 'cRep' });
  eq('varsayılan sıra s1 ile başlar', T.reportBodyOrder(c)[0], 's1');
  eq('varsayılan numara s1=1', T.reportNumberMap(c).s1, 1);
  // v2.283: numara YALNIZ ÇİZİLEN bölüme verilir. Soru yoksa "Cevaplar"
  // çizilmez → numara almaz ve numarada boşluk kalmaz (eski hata: 5 → 7).
  eq('varsayılan numara annex=11 (EKLER)', T.reportNumberMap(c).annex, 11);
  eq('boş EK LİSTESİ (s7) varsayılan kapalı', T.reportNumberMap(c).s7, undefined);
  eq('soru yoksa answers numara almaz', T.reportNumberMap(c).answers, undefined);
  eq('varsayılan numara limits=8', T.reportNumberMap(c).limits, 8);
  // Soru VARSA cevaplar çizilir ve numara alır (s7 yeniden 9).
  const cq = T.emptyCaseForTest({ id: 'cRepQ', questions: [{ id: 'q1', question: 'x', answer: 'y' }] });
  eq('soru varsa answers=8', T.reportNumberMap(cq).answers, 8);
  eq('soru varsa annex=12', T.reportNumberMap(cq).annex, 12);
  eq('kapalı bütünlük numara almaz', T.reportNumberMap(c).integrity, undefined);
  eq('varsayılan başlık numaralı', T.reportHeadingText(c, 's1'), '1. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI');
  eq('yardımcı bölüm de numaralı', T.reportHeadingText(c, 'origin'), '4. KAYIT KÖKENİ VE TESLİM ZİNCİRİ');

  // s3 kapatılınca numara boşluğu OLMAZ: s4 → 3, s7 → 6.
  const c2 = T.emptyCaseForTest({ id: 'cRep2', report: { sections: { s3: false } } });
  eq('s3 kapalı: s4 numarası 5', T.reportNumberMap(c2).s4, 5);
  eq('s3 kapalı: annex numarası 10', T.reportNumberMap(c2).annex, 10);
  eq(
    's3 kapalı: s4 başlığı yeniden numaralandı',
    T.reportHeadingText(c2, 's4'),
    '5. İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR'
  );

  // Sıra değişince numara sıraya göre verilir.
  // Tam sıra üzerinde takas: kullanıcı s1/s2 yerini değiştirir.
  const swap = T.REPORT_BODY_ORDER.slice();
  const i1 = swap.indexOf('s1');
  const i2 = swap.indexOf('s2');
  swap[i1] = 's2';
  swap[i2] = 's1';
  const c3 = T.emptyCaseForTest({ id: 'cRep3', report: { layout: { order: swap } } });
  eq('sıra: s2 numarası 1', T.reportNumberMap(c3).s2, 1);
  eq('sıra: s1 numarası 2', T.reportNumberMap(c3).s1, 2);

  // TOC: ana bölümler + yardımcı bölümler, gövde sırasıyla.
  const toc = T.reportTocEntries(c);
  eq('TOC ana bölümü numaralı taşır', toc.includes('1. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI'), true);
  eq('TOC köken bölümünü taşır', toc.some((x) => x.includes('KAYIT KÖKENİ VE TESLİM ZİNCİRİ')), true);
  eq('TOC köken satırı numaralı', toc.includes('4. KAYIT KÖKENİ VE TESLİM ZİNCİRİ'), true);
  eq('TOC imzayı içermez', toc.includes('İmza ve alt bilgi'), false);

  // Düzen normalizasyonu: bilinmeyen atılır, yinelenen tekilleşir, eksik eklenir.
  const nl = T.normalizeReportLayout({ order: ['s2', 'yok', 's2'], annexes: { ek1: false } });
  eq('normalize: bilinmeyen anahtar atılır', nl.order.includes('yok'), false);
  eq('normalize: yinelenen tekilleşir', nl.order.filter((k) => k === 's2').length, 1);
  eq('normalize: eksik bölümler eklenir', nl.order.length, T.REPORT_BODY_ORDER.length);
  eq('normalize: kapatılan ek korunur', nl.annexes.ek1, false);
  eq('normalize: diğer ek açık', nl.annexes.ek2, true);

  // Ekler: sıra + aç/kapa; numara bitişik.
  const c4 = T.emptyCaseForTest({ id: 'cRep4', report: { layout: { annexOrder: ['ek2', 'ek1'], annexes: { ek1: false } } } });
  eq('ek listesi sırası ve kapalı ek', T.reportAnnexList(c4).map((a) => a.key).join(','), 'ek2,ek3,ek4,ek5,ek6');
  eq(
    'EK numaraları bitişik (EK-4 boşluğu yok)',
    T.reportAnnexList(c4).map((a) => a.heading.split('.')[0]).join(','),
    'EK-1,EK-2,EK-3,EK-4,EK-5'
  );
  // Özel ek: ekle → numara bitişik; başlık/içerik/not düzenlenir; kaldırılır.
  const c4b = T.emptyCaseForTest({ id: 'cRep4b' });
  T.setAppState({ cases: [c4b], activeCaseId: c4b.id, settings: {}, ui: {} });
  T.addReportAnnex();
  eq('özel ek eklendi (x1)', T.reportLayoutOf(c4b).annexOrder.includes('x1'), true);
  eq('özel ek numarası bitişik (EK-7)', T.reportAnnexList(c4b).slice(-1)[0].heading.split('.')[0], 'EK-7');
  T.patchReportAnnexMeta('x1', 'title', 'UZMAN NOTU');
  T.patchReportAnnexMeta('x1', 'content', 'Gözlenen teknik bulgu.');
  T.patchReportAnnexMeta('x1', 'note', 'Yalnız belgelenmiş bulgu.');
  const xb = T.reportAnnexBlocks(c4b).find((b) => b.key === 'x1');
  eq('özel ek başlığı', xb.heading, 'EK-7. UZMAN NOTU');
  eq('özel ek içeriği', xb.text, 'Gözlenen teknik bulgu.');
  eq('özel ek notu', xb.note, 'Yalnız belgelenmiş bulgu.');
  T.removeReportAnnex('x1');
  eq('özel ek kaldırıldı', T.reportLayoutOf(c4b).annexOrder.includes('x1'), false);
  const nlCustom = T.normalizeReportLayout({
    annexOrder: ['x2', 'bad key'],
    annexes: { x2: true },
    annexMeta: { x2: { title: 'T', content: 'C', note: 'N' } }
  });
  eq('normalize: özel ek korunur', nlCustom.annexOrder.includes('x2'), true);
  eq('normalize: özel ek üst verisi korunur', nlCustom.annexMeta.x2.title, 'T');
  eq('normalize: geçersiz ek anahtarı atılır', nlCustom.annexOrder.includes('bad key'), false);

  // Revizyon: anlık görüntü, fark, geri yükleme. Kanıt (ses/bölüm) dışıdır.
  const c5 = T.emptyCaseForTest({ id: 'cRep5' });
  const snap = T.reportSnapshot(c5);
  eq('anlık görüntü düzen taşır', Array.isArray(snap.layout.order), true);
  eq('anlık görüntü kanıt taşımaz', 'materials' in snap, false);
  c5.report.sections.s1 = false;
  c5.report.methodText = 'Yeni yöntem';
  const diff = T.reportSnapshotDiff(c5, snap);
  eq('fark: bölüm görünürlüğü', diff.includes('Bölüm görünürlüğü'), true);
  eq('fark: inceleme yöntemi', diff.includes('İnceleme yöntemi'), true);
  T.applyReportSnapshot(c5, snap);
  eq('geri yükleme s1 açar', c5.report.sections.s1, true);
  eq('geri yükleme yöntemi temizler', c5.report.methodText, '');
  eq('revizyon listesi varsayılan boş', Array.isArray(c5.report.revisions), true);
}

// [83] Rapor saf modeli (v2.227) — DOM'suz yardımcılar.
{
  const M = __reportModelMod;
  eq('moveInList: aşağı taşı', M.moveInList(['a', 'b', 'c'], 'a', 1).join(''), 'bac');
  eq('moveInList: sınır dışı değişmez', M.moveInList(['a', 'b'], 'a', -1).join(''), 'ab');
  eq('moveInList: nesne anahtarı', M.moveInList([{ key: 'a' }, { key: 'b' }], 'b', -1).map((x) => x.key).join(''), 'ba');
  eq(
    'mainSectionNumbers: kapalı atlanır',
    JSON.stringify(M.mainSectionNumbers(['s1', 's2', 's3'], (k) => k !== 's2', ['s1', 's2', 's3'])),
    JSON.stringify({ s1: 1, s3: 2 })
  );
  eq('revisionDigest: anahtar sırası bağımsız', M.revisionDigest({ a: 1, b: 2 }), M.revisionDigest({ b: 2, a: 1 }));
  const groups = M.compareRevisionGroups({ a: 1 }, { a: 2 }, { a: 'A', b: 'B' });
  eq('compareRevisionGroups: değişen', groups.find((g) => g.key === 'a').changed, true);
  eq('compareRevisionGroups: aynı', groups.find((g) => g.key === 'b').changed, false);
}

// [84] Rapor iskeleti kategori haritası (v2.229) — filtre yalnız görünürlük.
{
  eq('reportSectionCategory tanımlı', typeof T.reportSectionCategory, 'function');
  eq('kapak bölümü front', T.reportSectionCategory('cover'), 'front');
  eq('s3 main', T.reportSectionCategory('s3'), 'main');
  eq('reading main (5. içinde)', T.reportSectionCategory('reading'), 'main');
  eq('origin tech', T.reportSectionCategory('origin'), 'tech');
  eq('qc statement', T.reportSectionCategory('qc'), 'statement');
  eq('signature closing', T.reportSectionCategory('signature'), 'closing');
  eq('bilinmeyen bölüm tech', T.reportSectionCategory('bilinmeyen'), 'tech');
}

// [85] Tek kayıt durumu (v2.230) — engelleyen > kontrol > hazır.
{
  eq('reportRecordStatus tanımlı', typeof T.reportRecordStatus, 'function');
  const sha = 'a'.repeat(64);
  const seg = (o) => Object.assign({ id: 's1', start: '00:00:00.000', end: '00:00:10.000', text: 'merhaba', review: 'approved', speaker: 'Tanık' }, o);
  const mat = (o) => Object.assign({ id: 'm1', name: 'a.wav', duration: 10, sha256: sha, origin: { mediumType: 'usb', deliveredBy: 'X', deliveredAt: '2026-01-01' }, speakers: [{ id: 'sp1', code: 'S1', label: 'Tanık' }], segments: [seg()], log: [] }, o);
  const base = (o) => Object.assign({ id: 'c1', fileNo: '2026/1', court: 'A', expertName: 'B', conclusionText: 'Kanaat.', questions: [{ id: 'q1', question: 'x', answer: 'y' }], materials: [mat()] }, o);
  eq('tam dosya ready', T.reportRecordStatus(base({})).code, 'ready');
  const blocked = T.reportRecordStatus(base({ fileNo: '' }));
  eq('dosya no boş blocked', blocked.code, 'blocked');
  eq('engelleyen tonu', blocked.tone, 'blocked');
  const pend = T.reportRecordStatus(base({ materials: [mat({ segments: [seg({ review: 'pending' })] })] }));
  eq('bekleyen bölüm review', pend.code, 'review');
  const longSeg = seg({ start: '00:00:00.000', end: '00:00:50.000' });
  const adv = T.reportRecordStatus(base({ materials: [mat({ duration: 50, segments: [longSeg] })] }));
  eq('yalnız öneri ready', adv.code, 'ready');
  eq('öneri etiketi', /öneri/.test(adv.label), true);
  eq('hazır ipucu onay değil der', /onay değildir/.test(adv.detail), true);
}

// [86] Belge odaklı bölüm düzenleme (v2.231) — serbest metin ve yönlendirme.
{
  eq('reportSectionEditableFields tanımlı', typeof T.reportSectionEditableFields, 'function');
  eq('s4 methodText düzenlenir', T.reportSectionEditableFields('s4')[0].field, 'methodText');
  // v2.261: sınırlılıklar s5'ten ayrıldı; serbest metin artık `limits` bölümünde.
  eq('limits limitationsText düzenlenir', T.reportSectionEditableFields('limits')[0].field, 'limitationsText');
  eq('s5 serbest metin yok (veriden üretilir)', T.reportSectionEditableFields('s5'), null);
  eq('s6 conclusionText düzenlenir', T.reportSectionEditableFields('s6')[0].field, 'conclusionText');
  eq('s1 serbest metin yok', T.reportSectionEditableFields('s1'), null);
  eq('cover hedefi case', T.reportSectionDerivedTarget('cover'), 'case');
  eq('s2 hedefi questions', T.reportSectionDerivedTarget('s2'), 'questions');
  eq('answers hedefi questions', T.reportSectionDerivedTarget('answers'), 'questions');
  eq('integrity hedefi audio', T.reportSectionDerivedTarget('integrity'), 'audio');
  eq('origin hedefi audio', T.reportSectionDerivedTarget('origin'), 'audio');
  eq('bilinmeyen hedef yok', T.reportSectionDerivedTarget('bilinmeyen'), '');
  eq('tech kontrol panelinde', T.reportSectionInspectorKey('tech'), 'tech');
  eq('s4 kontrol paneli değil', T.reportSectionInspectorKey('s4'), '');
}

// [87] Sayfaya sığdır genişliği (v2.232) — A4 oranı + kırpma.
{
  eq('reportFitWidth tanımlı', typeof T.reportFitWidth, 'function');
  eq('900 yükseklik → ~631 (A4 oranı)', T.reportFitWidth(900), 631);
  eq('küçük yükseklik taban 320', T.reportFitWidth(200), 320);
  eq('büyük yükseklik tavan 900', T.reportFitWidth(2000), 900);
  eq('geçersiz yükseklik 900', T.reportFitWidth(0), 900);
}

// [88] Sayfa sayısı (v2.233) — A4 sayfa penceresi.
{
  eq('reportPageCountFor tanımlı', typeof T.reportPageCountFor, 'function');
  eq('3000/700 → 5', T.reportPageCountFor(3000, 700), 5);
  eq('2800/700 → 4', T.reportPageCountFor(2800, 700), 4);
  eq('boş içerik → 1', T.reportPageCountFor(0, 700), 1);
  eq('geçersiz pageH → 1', T.reportPageCountFor(3000, 0), 1);
}

// [89] Okuma metni bağımsız bölüm (v2.234).
{
  eq('reading gövde sırasında', T.REPORT_BODY_ORDER.includes('reading'), true);
  const nl = T.normalizeReportLayout({ order: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] });
  // v2.261: s5'ten sonra cevaplar ve sınırlılıklar gelir; okuma metni onların ardında.
  eq('eski kayıt: cevaplar s5 ardında', nl.order.indexOf('answers'), nl.order.indexOf('s5') + 1);
  eq('eski kayıt: okuma metni sınırlılıklar ardında', nl.order.indexOf('reading'), nl.order.indexOf('limits') + 1);
  eq('eski kayıt: okuma metni sonuçtan önce', nl.order.indexOf('reading') < nl.order.indexOf('s6'), true);
  const custom = T.normalizeReportLayout({ order: ['reading', 's1', 's2', 's3', 's4', 's5'] });
  eq('kullanıcı reading konumunu korur', custom.order.indexOf('reading'), 0);
  const c = T.emptyCaseForTest({ id: 'cReading' });
  c.materials = [{ id: 'm1', name: 'a.wav', segments: [{ id: 's1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'K', text: 'merhaba', review: 'approved' }] }];
  eq('okuma grubu varsa blok çizilir', T.reportBlockRenders(c, 'reading'), true);
  c.materials = [{ id: 'm1', name: 'a.wav', segments: [] }];
  eq('bölüm yoksa okuma bloğu çizilmez', T.reportBlockRenders(c, 'reading'), false);
}

// [90] Rapor alanları: tablo sütun görünürlüğü (v2.235).
{
  eq('reportColumnOn tanımlı', typeof T.reportColumnOn, 'function');
  eq('varsayılan açık', T.reportColumnOn({ report: {} }, 'inventory', 'sha256'), true);
  const c = T.emptyCaseForTest({ id: 'cCols' });
  c.report.columns = { inventory: { sha256: false } };
  eq('kapatılan sütun false', T.reportColumnOn(c, 'inventory', 'sha256'), false);
  const t = T.reportTableColumns(c, 'inventory', T.REPORT_TEXT.inventoryHeaders, [[1, 2, 3, 4, 5, 6, 7]], [10, 20, 30, 40, 50, 60, 70]);
  eq('SHA-256 başlığı süzüldü', t.headers.includes('SHA-256'), false);
  eq('sütun sayısı 6', t.headers.length, 6);
  eq('satır 6 hücre', t.rows[0].length, 6);
  eq('genişlik 6', t.widths.length, 6);
  eq('anahtarlar süzüldü', t.keys.join(','), 'name,format,size,duration,channels,sampleRate');
  const allOff = T.emptyReportColumns();
  for (const k of T.REPORT_COLUMN_TABLES.inventory) allOff.inventory[k] = false;
  c.report.columns = allOff;
  eq('hepsi kapalı → empty', T.reportTableColumns(c, 'inventory', T.REPORT_TEXT.inventoryHeaders, [], null).empty, true);
  const n = T.normalizeReportColumns({ inventory: { sha256: false } });
  eq('normalize: kapatma korunur', n.inventory.sha256, false);
  eq('normalize: eksik alan açık', n.inventory.name, true);
  eq('emptyReportColumns tümü açık', T.emptyReportColumns().inventory.sha256, true);
}

// [91] Kanıt tablosu sütunları (v2.236) — zaman + metin zorunlu.
{
  eq('reportColumnLocked tanımlı', typeof T.reportColumnLocked, 'function');
  eq('zaman kilitli', T.reportColumnLocked('segments', 'time'), true);
  eq('metin kilitli', T.reportColumnLocked('segments', 'text'), true);
  eq('konuşmacı kodu kilitli değil', T.reportColumnLocked('segments', 'speakerCode'), false);
  eq('konuşmacı etiketi kilitli değil', T.reportColumnLocked('segments', 'speakerLabel'), false);
  const c = T.emptyCaseForTest({ id: 'cSegCols' });
  c.report.columns = { segments: { time: false, text: false, speakerCode: false, speakerLabel: false, review: false, obs: false } };
  const t = T.reportTableColumns(c, 'segments', T.REPORT_TEXT.segmentHeadersObs, [[1, 2, 3, 4, 5, 6]], [5, 4, 5, 20, 6, 5]);
  eq('kullanıcı kapatsa da zaman+metin basılır', t.headers.length, 2);
  eq('anahtarlar time,text', t.keys.join(','), 'time,text');
  c.report.columns = { segments: { obs: false } };
  const t2 = T.reportTableColumns(c, 'segments', T.REPORT_TEXT.segmentHeadersObs, [[1, 2, 3, 4, 5, 6]], null);
  eq('gözlem kapalı → 5 sütun', t2.headers.length, 5);
  eq('gözlem başlığı yok', t2.headers.includes('GÖZLEM'), false);
}

// [92] v2.237 — Satır menüsü ekranda kalır + hız düğmesi listeyi yeniden çizmez.
{
  console.log('[92] Satır menüsü konumu ve hız düğmesi');
  eq('clampSegMenuPosition tanımlı', typeof T.clampSegMenuPosition, 'function');
  // Ekranın ortasında: menü bağlantının ALTINA, soluna hizalı açılır.
  let p = T.clampSegMenuPosition({ top: 100, bottom: 130, left: 50 }, 230, 200, 1000, 800);
  eq('orta satır: altına açılır', p, { top: 134, left: 50 });
  // Listenin SONUNDA (alt kenara yakın): menü YUKARI açılır, ekranda kalır.
  p = T.clampSegMenuPosition({ top: 740, bottom: 770, left: 50 }, 230, 200, 1000, 800);
  eq('alt satır: yukarı açılır', p.top, 740 - 200 - 4);
  eq('alt satır: alt kenarı aşmaz', p.top + 200 + 8 <= 800, true);
  // Menü ekrana sığmıyorsa (çok yüksek) üst kenara kırpılır, eksi olmaz.
  p = T.clampSegMenuPosition({ top: 790, bottom: 820, left: 50 }, 230, 900, 1000, 800);
  eq('aşırı yüksek menü: üst kenara kırpılır', p.top >= 8, true);
  // Sağ kenara yakın: yatayda ekran içine kırpılır.
  p = T.clampSegMenuPosition({ top: 100, bottom: 130, left: 900 }, 230, 100, 1000, 800);
  eq('sağ kenar: yatay kırpılır', p.left, 1000 - 230 - 8);
  // Sol kenara taşmaz.
  p = T.clampSegMenuPosition({ top: 100, bottom: 130, left: 2 }, 230, 100, 1000, 800);
  eq('sol kenar: en az 8px', p.left, 8);
  // Beklenen sınır: menü kutusu viewport içinde.
  const r = { top: 700, bottom: 730, left: 80 };
  const q = T.clampSegMenuPosition(r, 230, 240, 1000, 800);
  eq('sonuç viewport içinde', q.top >= 8 && q.top + 240 + 8 <= 800 && q.left >= 8 && q.left + 230 + 8 <= 1000, true);

  // KAYNAK SÖZLEŞMESİ: hız düğmesi dalında renderSegments ÇAĞRILMAMALI.
  // (Çağrılırsa liste yeniden kurulur, kaydırma başa döner — v2.237 hatası.)
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const speedBranch = (src.match(/b\.dataset\.segSpeed !== undefined\)\s*\{([\s\S]*?)\n\s*\}\s*else if/) || [])[1] || '';
  // Yorumları ayıkla: "renderSegments" yalnız açıklamada anılabilir; ölçüt
  // gerçek bir ÇAĞRI olup olmadığıdır.
  const speedCode = speedBranch.replace(/\/\/[^\n]*/g, '');
  eq('hız dalı bulundu', speedBranch.length > 0, true);
  eq('hız dalı renderSegments() ÇAĞIRMAZ', /renderSegments\s*\(/.test(speedCode), false);
  eq('hız dalı hız göstergesini günceller', /data-seg-speed/.test(speedCode), true);
}

// [93] v2.238 — Rapor biçimi şeması (font · punto · marj · yön).
{
  console.log('[93] Rapor biçimi şeması (v2.238)');
  const d = T.emptyReportFormat();
  eq('varsayılan punto 11', d.fontSizePt, 11);
  eq('varsayılan font times (resmî)', d.fontFamily, 'times');
  eq('varsayılan marj 15 mm (1,5 cm, UYAP boş)', d.marginsMm, { top: 15, right: 15, bottom: 15, left: 15 });
  eq('varsayılan dikey', d.orientation, 'portrait');
  const n = T.normalizeReportFormat({ fontFamily: 'times', fontSizePt: 13, orientation: 'landscape', marginsMm: { top: 30, right: 25, bottom: 30, left: 25 } });
  eq('font korunur', n.fontFamily, 'times');
  eq('punto 13', n.fontSizePt, 13);
  eq('yön landscape', n.orientation, 'landscape');
  eq('marj sağ 25', n.marginsMm.right, 25);
  const bad = T.normalizeReportFormat({ fontFamily: 'x', fontSizePt: 99, orientation: 'y', marginsMm: { top: 1, right: 999, bottom: 'a', left: 25 } });
  eq('geçersiz font → times (varsayılan)', bad.fontFamily, 'times');
  eq('punto üst sınır 14', bad.fontSizePt, 14);
  eq('yön geçersiz → portrait', bad.orientation, 'portrait');
  eq('marj alt sınır 10', bad.marginsMm.top, 10);
  eq('marj üst sınır 50', bad.marginsMm.right, 50);
  eq('marj bozuk → varsayılan 15', bad.marginsMm.bottom, 15);
  eq('punto yarım adıma yuvarlanır', T.normalizeReportFormat({ fontSizePt: 12.3 }).fontSizePt, 12.5);
  eq('reportFormat(c) varsayılan', T.reportFormat({ report: {} }).fontSizePt, 11);
  eq('reportFormat(null) güvenli', T.reportFormat(null).orientation, 'portrait');
  eq('font seçenekleri 3', T.REPORT_FONT_KEYS.length, 3);
  eq('docx font eşlemesi (times)', T.REPORT_FONT_DOCX.times, 'Times New Roman');
  eq('yön seçenekleri 2', T.REPORT_ORIENTATIONS.length, 2);
  // Yazdırma/PDF sayfa ayarı @page ile üretilmeli (önceden HİÇ yoktu).
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('yazdırma @page kuralı üretilir', /@page \{ size: A4/.test(src), true);
  // UDF font ailesi artık ayardan gelir (varsayılan Times); kaynakta `${udfFamily}`.
  eq('UDF font ailesi ayardan gelir', /family="\$\{udfFamily\}"/.test(src), true);
  eq('UDF font varsayılanı Times', /udfFamily = REPORT_FONT_DOCX\[fmt\.fontFamily\] \|\| 'Times New Roman'/.test(src), true);
}

// [94] v2.239 — Hızlı etiket imleç konumuna eklenir (sona değil).
{
  console.log('[94] insertTagAt — imleç konumuna etiket');
  eq('tanımlı', typeof T.insertTagAt, 'function');
  eq('sonda imleç → sona ekle + boşluk', T.insertTagAt('abc', '[x]', 3, 3), { text: 'abc [x]', caret: 7, mode: 'cursor' });
  eq('başta imleç → başa ekle', T.insertTagAt('abc', '[x]', 0, 0), { text: '[x] abc', caret: 4, mode: 'cursor' });
  eq('ortada (boşluk yok) iki yana boşluk', T.insertTagAt('ab cd', '[x]', 2, 2), { text: 'ab [x] cd', caret: 6, mode: 'cursor' });
  eq('seçim varsa yerine yaz', T.insertTagAt('hello world', '[x]', 6, 11), { text: 'hello [x]', caret: 9, mode: 'cursor' });
  eq('boş metne ekle', T.insertTagAt('', '[x]', 0, 0), { text: '[x]', caret: 3, mode: 'cursor' });
  eq('imleç yoksa sona ekle (eski davranış)', T.insertTagAt('  abc  ', '[x]', null, null), { text: 'abc [x]', caret: 7, mode: 'end' });
  eq('aralık dışı başlangıç → sona', T.insertTagAt('abc', '[x]', 99, null), { text: 'abc [x]', caret: 7, mode: 'end' });
  eq('bitiş < başlangıç → başlangıca indir', T.insertTagAt('abcd', '[x]', 2, 1), { text: 'ab [x] cd', caret: 7, mode: 'cursor' });
  eq('null metin güvenli', T.insertTagAt(null, '[x]', null, null), { text: '[x]', caret: 3, mode: 'end' });
}

// [95] v2.240 — Bölüm filtreleri: eksik durum/gözlem filtreleri + TEK KAYNAK.
{
  console.log('[95] Bölüm filtreleri tek kaynak (v2.240)');
  const mk = (o) => Object.assign(T.emptySegmentForTest({}), o);
  const segs = [
    mk({ id: 's1', start: '00:00:00.000', end: '00:00:05.000', review: 'approved', text: 'Bir cümle.' }),
    mk({ id: 's2', start: '00:00:05.000', end: '00:00:10.000', review: 'inaudible', text: '' }),
    mk({ id: 's3', start: '00:00:10.000', end: '00:00:15.000', review: 'relisten', text: 'tekrar' }),
    mk({ id: 's4', start: '00:00:15.000', end: '00:00:20.000', review: 'ambiguous', text: 'belki', reading1: 'geldi', reading2: 'kaldı', chosen: '' }),
    mk({ id: 's5', start: '00:00:20.000', end: '00:00:25.000', review: 'machine', text: 'makine metni' }),
    mk({ id: 's6', start: '00:00:25.000', end: '00:00:30.000', review: 'pending', text: 'yeni', obs: { overlap: true } }),
    mk({ id: 's7', start: '00:00:30.000', end: '00:01:20.000', review: 'pending', text: 'uzun bölüm', obs: { inaudible: true } })
  ];
  const m = { id: 'mF', segments: segs };
  const c = T.segCounts(m);
  eq('pending = onay/anlaşılmadı dışı (5)', c.pending, 5);
  eq('ambiguous 1', c.ambiguous, 1);
  eq('machine 1', c.machine, 1);
  eq('overlap gözlem 1', c.overlap, 1);
  eq('inaudible gözlem 1', c.inaudibleObs, 1);
  eq('long 1 (50 sn)', c.long, 1);
  // TEK KAYNAK: her SEG_FILTERS anahtarı için sayaç == eşleşen bölüm sayısı.
  // (Sayaç ile filtre ayrışırsa kullanıcı "sayı tutmuyor" görür — v2.99 dersi.)
  const issueSet = T.segmentTimeIssueIndexes(segs);
  const mergeSet = T.mergeCandidateIndexes(segs);
  for (const [key] of T.SEG_FILTERS) {
    const n = segs.filter((s, i) => T.segMatchesFilter(s, key, segs[i - 1], i, issueSet, mergeSet)).length;
    eq(`sayaç = filtre · ${key}`, c[key], n);
  }
}

// [96] v2.241 — Bölüm iş durumu: "bu bölüm ne istiyor?" tek satır.
{
  console.log('[96] segmentWorkSummary (v2.241)');
  const seg = (o) => Object.assign(T.emptySegmentForTest({}), o);
  const a = T.segmentWorkSummary(seg({ review: 'approved' }));
  eq('onaylı → tamam', a.done, true);
  eq('onaylı eylem', a.action, 'Tamam — onaylandı');
  eq('onaylı needsWork yok', a.needsWork, false);
  eq('anlaşılmadı → tamam', T.segmentWorkSummary(seg({ review: 'inaudible' })).done, true);
  const p = T.segmentWorkSummary(seg({ review: 'pending' }));
  eq('bekleyen needsWork', p.needsWork, true);
  eq('bekleyen eylem', p.action, 'Dinle ve kontrol et');
  eq('makine eylemi', T.segmentWorkSummary(seg({ review: 'machine' })).action, 'Dinleyip onayla (makine çözümledi)');
  eq('yeniden dinle eylemi', T.segmentWorkSummary(seg({ review: 'relisten' })).action, 'Yeniden dinle');
  eq('belirsiz eylemi', T.segmentWorkSummary(seg({ review: 'ambiguous' })).action, 'İki okumadan birini seç');
  eq('belirsiz seçilmedi bayrağı', T.segmentWorkSummary(seg({ review: 'ambiguous', chosen: '' })).flags.some((f) => f.key === 'ambiguous'), true);
  eq('belirsiz seçildi → bayrak yok', T.segmentWorkSummary(seg({ review: 'ambiguous', chosen: 'reading1' })).flags.some((f) => f.key === 'ambiguous'), false);
  eq('birleştir bayrağı', T.segmentWorkSummary(seg({ review: 'pending' }), { merge: { ok: true } }).flags.some((f) => f.key === 'merge'), true);
  eq('birleştir değilse yok', T.segmentWorkSummary(seg({ review: 'pending' }), { merge: { ok: false } }).flags.some((f) => f.key === 'merge'), false);
  eq('zaman bayrağı', T.segmentWorkSummary(seg({ review: 'pending' }), { timeIssue: { kind: 'overlap' } }).flags.some((f) => f.key === 'time'), true);
  const ob = T.segmentWorkSummary(seg({ review: 'pending', obs: { overlap: true, inaudible: true, noSpeech: true, phone: true } }));
  eq('gözlem bayrakları 4', ob.flags.filter((f) => ['overlap', 'inaudibleObs', 'noSpeech', 'phone'].includes(f.key)).length, 4);
  eq('onaylıda gözlem bile olsa done', T.segmentWorkSummary(seg({ review: 'approved', obs: { overlap: true } })).done, true);
}

// [97] v2.243 — İş yükü özeti: ÖLÇÜLEN sayılar (süre sa/dk/sn, dağılım, emek).
{
  console.log('[97] İş yükü özeti (v2.243)');
  eq('süre 0', T.formatWorkloadDuration(0), '0 sn');
  eq('süre 47 sn', T.formatWorkloadDuration(47), '47 sn');
  eq('süre 60 → 1 dk 0 sn', T.formatWorkloadDuration(60), '1 dk 0 sn');
  eq('süre 90 → 1 dk 30 sn', T.formatWorkloadDuration(90), '1 dk 30 sn');
  eq('süre 3599 → 59 dk 59 sn', T.formatWorkloadDuration(3599), '59 dk 59 sn');
  eq('süre 3600 → 1 sa 0 dk', T.formatWorkloadDuration(3600), '1 sa 0 dk');
  eq('süre 3660 → 1 sa 1 dk', T.formatWorkloadDuration(3660), '1 sa 1 dk');
  eq('süre 8100 → 2 sa 15 dk', T.formatWorkloadDuration(8100), '2 sa 15 dk');
  eq('süre null → 0 sn', T.formatWorkloadDuration(null), '0 sn');

  const mk = (o) => Object.assign(T.emptySegmentForTest({}), o);
  const m1segs = [
    mk({ id: 'a1', start: '00:00:00.000', end: '00:00:05.000', review: 'approved', speaker: 'S1', text: 'Bir cümle.' }),
    mk({ id: 'a2', start: '00:00:05.000', end: '00:00:10.000', review: 'pending', speaker: 'S1', text: 'düzeltildi', textRev: 2, obs: { overlap: true } }),
    mk({ id: 'a3', start: '00:00:10.000', end: '00:00:15.000', review: 'machine', speaker: 'S2', text: 'makine' }),
    mk({ id: 'a4', start: '00:00:15.000', end: '00:00:20.000', review: 'ambiguous', text: 'belki', reading1: 'geldi', reading2: 'kaldı', chosen: '' }),
    mk({ id: 'a5', start: '00:00:20.000', end: '00:00:25.000', review: 'relisten', text: 'tekrar' }),
    mk({ id: 'a6', start: '00:00:25.000', end: '00:00:30.000', review: 'inaudible', text: '' }),
    mk({ id: 'a7', start: '00:50:00.000', end: '00:50:50.000', review: 'pending', text: 'uzun bölüm' })
  ];
  const m2segs = [
    mk({ id: 'b1', start: '00:00:00.000', end: '00:00:30.000', review: 'approved', speaker: 'S1', text: 'Bir cümle.' }),
    mk({ id: 'b2', start: '00:00:30.000', end: '00:00:40.000', review: 'pending', text: 'yeni', obs: { phone: true } })
  ];
  const c = { id: 'cw', materials: [
    { id: 'm1', duration: 3600, segments: m1segs },
    { id: 'm2', segments: m2segs } // duration yok → bölüm zamanlarından (40 sn) toplanır
  ], questions: [{ answer: 'x' }, { answer: '' }] };
  const w = T.caseWorkload(c);
  eq('toplam süre 3600 + 40 = 3640', w.audioSeconds, 3640);
  eq('süre biliniyor', w.durKnown, true);
  eq('kayıt 2', w.materialCount, 2);
  eq('bölüm 9', w.segmentCount, 9);
  eq('onaylandı 2', w.review.approved, 2);
  eq('anlaşılmadı 1', w.review.inaudible, 1);
  eq('yeniden 1', w.review.relisten, 1);
  eq('belirsiz 1', w.review.ambiguous, 1);
  eq('makine 1', w.review.machine, 1);
  eq('hiç dokunulmadı = a2,a7,b2 = 3', w.review.pending, 3);
  eq('kontrol bekleyen TOPLAM 6', w.needsWork, 6);
  eq('dağılım toplamı = bölüm (2+1+1+1+1+3=9)', w.review.approved + w.review.inaudible + w.review.relisten + w.review.ambiguous + w.review.machine + w.review.pending, 9);
  eq('onay oranı %33', w.reviewPct, 33);
  eq('elle düzeltilen 1', w.editedSegments, 1);
  eq('düzeltme oranı %11', w.editPct, 11);
  eq('üst üste gözlem 1', w.flags.overlap, 1);
  eq('telefon gözlem 1', w.flags.phone, 1);
  eq('uzun bölüm 1', w.flags.long, 1);
  eq('konuşmacı etiketi 3 (S1,S2 + S1)', w.speakerLabels, 3);
  eq('sorular 1/2', `${w.questionsAnswered}/${w.questionsTotal}`, '1/2');
  eq('veri var', w.hasData, true);
  near('ortalama bölüm ≈ 404,4 sn', w.avgSegmentSec, 3640 / 9, 0.5);
  eq('kapsam %2 (m1 80/3600; m2 süre yok)', w.coveragePct, 2);
  eq('kapsam hesaplanamayan kayıt 1 (m2)', w.flags.coverageUnknown, 1);
  // Boş dosya güvenli
  const e = T.caseWorkload({ materials: [] });
  eq('boş: hasData false', e.hasData, false);
  eq('boş: süre 0', e.audioSeconds, 0);
}

// [98] v2.246 — Rapor varsayılanı SÜREKLİ; sığdırma tek-sayfa moduna özgü.
{
  console.log('[98] Rapor görünümü varsayılanı (v2.246)');
  eq('reportContinuousPref tanımlı', typeof T.reportContinuousPref, 'function');
  T.store.removeItem('akis.reportContinuous');
  eq('tercih yoksa sürekli (true)', T.reportContinuousPref(), true);
  T.store.setItem('akis.reportContinuous', '0');
  eq("'0' → tek-sayfa (false)", T.reportContinuousPref(), false);
  T.store.setItem('akis.reportContinuous', '1');
  eq("'1' → sürekli (true)", T.reportContinuousPref(), true);
  // Kaynak sözleşmesi: applyReportFit sürekli modda fit UYGULAMAZ (maxWidth temizlenir).
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('applyReportFit sürekli modu dikkate alır', /const fit = !continuous && reportFitPref\(\)/.test(src), true);
}

// [99] v2.247 — "Sayfaya sığdır" düğmesi gerçekten aç/kapa olmalı.
{
  console.log('[99] Sayfaya sığdır düğmesi (v2.247)');
  eq('reportFitPref tanımlı', typeof T.reportFitPref, 'function');
  T.store.removeItem('akis.reportFit');
  eq('sığdır varsayılan AÇIK', T.reportFitPref(), true);
  T.store.setItem('akis.reportFit', '0');
  eq("'0' → kapalı", T.reportFitPref(), false);
  T.store.setItem('akis.reportFit', '1');
  eq("'1' → açık", T.reportFitPref(), true);
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  // applyReportPageView artık her çizimde zorla sığdırma AÇMAZ (düğme ölüydü).
  eq('zorla setReportFit(true) kaldırıldı', /if \(!reportFitPref\(\)\) \{\s*setReportFit\(true\)/.test(src), false);
}

// [100] v2.248 — Video konteynerleri: yalnız ses çözülür (sınıflandırma).
{
  console.log('[100] Video dosyası sınıflandırma (v2.248)');
  eq('mp4 video', T.isVideoFileName('a.mp4'), true);
  eq('m4v video', T.isVideoFileName('a.m4v'), true);
  eq('mov video', T.isVideoFileName('a.mov'), true);
  eq('webm video', T.isVideoFileName('a.webm'), true);
  eq('m4a video DEĞİL (ses)', T.isVideoFileName('a.m4a'), false);
  eq('media mp4', T.isMediaFileName('a.mp4'), true);
  eq('media wav', T.isMediaFileName('a.wav'), true);
  eq('media txt değil', T.isMediaFileName('a.txt'), false);
  eq('dosya nesnesi video/mp4', T.isMediaFileObject({ type: 'video/mp4', name: 'x' }), true);
  eq('dosya nesnesi audio/wav', T.isMediaFileObject({ type: 'audio/wav', name: 'x' }), true);
  eq('dosya nesnesi text', T.isMediaFileObject({ type: 'text/plain', name: 'x.txt' }), false);
  eq('video materyal', T.isVideoMaterial({ type: 'video/mp4', name: 'a' }), true);
  eq('ses materyal video değil', T.isVideoMaterial({ type: 'audio/wav', name: 'a.wav' }), false);
  eq('biçim MP4 (video)', T.audioFormatLabel('a.mp4', ''), 'MP4 (video)');
  eq('biçim MOV (video)', T.audioFormatLabel('a.mov', ''), 'MOV (video)');
  eq('biçim WEBM (video)', T.audioFormatLabel('a.webm', ''), 'WEBM (video)');
  eq('biçim WAV', T.audioFormatLabel('a.wav', ''), 'WAV');
  eq('biçim M4A (ses)', T.audioFormatLabel('a.m4a', ''), 'M4A');
}

// [101] v2.249 — Analiz/Kayıt bilgileri sekmeleri kırpılmaz, kendi içinde kayar.
{
  console.log('[101] Analiz sekmesi kaydırma (v2.249)');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq(
    'Analiz/Kayıt sekmeleri overflow-y auto',
    /#view-audio \.card-pane\.on\[data-pane="listen"\][\s\S]{0,200}overflow-y:\s*auto/.test(css),
    true
  );
}

// [102] v2.250 — Raporda "yalnız ses" video notu (video varsa eklenir).
{
  console.log('[102] Rapor video "yalnız ses" notu (v2.250)');
  eq('reportVideoNote tanımlı', typeof T.reportVideoNote, 'function');
  const vid = { materials: [{ name: 'kamera.mp4', type: 'video/mp4' }] };
  const aud = { materials: [{ name: 'a.wav', type: 'audio/wav' }] };
  eq('video varsa not', T.reportVideoNote(vid), T.REPORT_TEXT.videoAudioNote);
  eq('video yoksa boş', T.reportVideoNote(aud), '');
  eq('suffix boşluklu', T.videoNoteSuffix(vid).startsWith(' '), true);
  eq('suffix video yoksa boş', T.videoNoteSuffix(aud), '');
}

// [103] v2.252 — ZWSP yalnız saf uzun hex (SHA-256) içinde; metin/saat/sözcük değişmez.
{
  console.log('[103] ZWSP yalnız hash içinde (v2.252)');
  const f = T.zwspWrapLongHex;
  eq('tanımlı', typeof f, 'function');
  const tRange = '00:59:48.000–01:01:33.000';
  eq('zaman aralığı değişmez', f(tRange), tRange);
  eq('zaman aralığında ZWSP yok', f(tRange).includes('\u200B'), false);
  const word = 'değerlendirilememektedir';
  eq('uzun sözcük değişmez', f(word), word);
  eq('kısa metin değişmez', f('Belirtilmemiş'), 'Belirtilmemiş');
  const hash = 'a'.repeat(64);
  const fh = f(hash);
  eq('hash ZWSP içerir', fh.includes('\u200B'), true);
  eq('hash ZWSP temizlenince orijinal', fh.replace(/\u200B/g, ''), hash);
  eq('boş güvenli', f(null), '');
}

// [104] v2.253 — Rapor kâğıdı biçimi (kapak bandı, bölüm vurgusu, tablo zebra, yazdırma).
{
  console.log('[104] Rapor kâğıdı biçimi (v2.253)');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('kapak bandı (4px üst çizgi)', /\.report-paper \.paper-title \{[\s\S]*?border-top:\s*4px solid/.test(css), true);
  eq('kapak zemini paper-band', /\.report-paper \.paper-title \{[\s\S]*?background:\s*var\(--paper-band\)/.test(css), true);
  eq('bölüm başlığı sol vurgu (4px)', /\.report-paper \.paper-section h3 \{[\s\S]*?border-left:\s*4px solid/.test(css), true);
  eq('tablo zebra (çift satır)', /\.report-paper \.paper-table tbody tr:nth-child\(even\)/.test(css), true);
  eq('yazdırma: tablo satırı bölünmez', css.includes('.report-paper .paper-table tr { break-inside: avoid'), true);
  eq('yazdırma: başlık yalnız kalmaz', css.includes('.report-paper .paper-section h3 { break-after: avoid'), true);
}

// [105] v2.261 — Rapor parçaları ayrı ayrı alınabilir: bulgular (s5) ·
// cevaplar (answers) · sınırlılıklar (limits) · bütünlük (integrity) ayrı
// bölümler; 56.12 profili SIRAYI da yazar (yalnız aç/kapa değil).
{
  console.log('[105] Rapor parçaları ayrı + 56.12 sıra profili (v2.261)');
  const keys = T.REPORT_SECTION_DEFS.map((d) => d.key);
  eq('cevaplar bölümü tanımlı', keys.includes('answers'), true);
  eq('sınırlılıklar bölümü tanımlı', keys.includes('limits'), true);
  eq('bütünlük bölümü tanımlı', keys.includes('integrity'), true);
  eq('cevaplar numaralı ana bölüm', T.REPORT_MAIN_KEYS.includes('answers'), true);
  eq('sınırlılıklar numaralı ana bölüm', T.REPORT_MAIN_KEYS.includes('limits'), true);
  eq('bütünlük numaralı ana bölüm', T.REPORT_MAIN_KEYS.includes('integrity'), true);
  const def = T.emptyReportSections();
  eq('cevaplar varsayılan AÇIK', def.answers, true);
  eq('sınırlılıklar varsayılan AÇIK', def.limits, true);
  eq('bütünlük varsayılan KAPALI', def.integrity, false);

  // Göç: eski kayıtta yeni anahtarlar yok. Kanonik komşusunun yanına girmeli;
  // sona eklenirse eklerden/imzadan SONRA çıkardı (sessiz sıra bozulması).
  const old = [
    's1', 's2', 's3', 'origin', 'embedded', 'acquisition', 'speakers', 's4', 'tech', 'enhance',
    'asr', 's5', 'reading', 'scopeNote', 's6', 's7', 'wer', 'levels', 'reviewSummary', 'qc',
    'privacy', 'annex'
  ];
  const mig = T.normalizeReportLayout({ order: old }).order;
  const iS5 = mig.indexOf('s5');
  const iAns = mig.indexOf('answers');
  const iLim = mig.indexOf('limits');
  const iRead = mig.indexOf('reading');
  eq('göç: cevaplar s5 sonrası, okuma metninden önce', iAns > iS5 && iAns < iRead, true);
  eq('göç: sınırlılıklar cevaplardan sonra', iLim > iAns, true);
  eq('göç: bütünlük teslim/edinme sonrası', mig.indexOf('integrity') > mig.indexOf('acquisition'), true);
  eq('göç: mevcut sıra korunur (s6 yeri)', mig.indexOf('s6') > mig.indexOf('reading'), true);

  // 56.12 profili: sıra + görünürlük birlikte yazılır.
  const p = T.reportPresetLayout('sablon');
  eq('profil: 56.12 tanımlı', T.REPORT_PRESET_DEFS.some((x) => x.key === 'sablon'), true);
  eq('profil: soru listesi kapalı (cevaplarda tekrar)', p.sections.s2, false);
  eq('profil: boş "EKLER" başlığı kapalı', p.sections.s7, false);
  eq('profil: ekler açık', p.sections.annex, true);
  eq('profil: bütünlük açık', p.sections.integrity, true);
  const ord = p.order;
  const at = (k) => ord.indexOf(k);
  eq(
    'profil sırası: bulgular → sınırlılıklar → QC → cevaplar',
    at('s5') < at('limits') && at('limits') < at('qc') && at('qc') < at('answers'),
    true
  );
  eq('profil sırası: sonuç en sonda (eklerden önce)', at('s6') > at('answers') && at('s6') < at('annex'), true);
  eq('profil sırası: bütünlük teslim sonrası, yöntem öncesi', at('integrity') > at('acquisition') && at('integrity') < at('s4'), true);
  const map = T.mainSectionNumbers(ord, (k) => p.sections[k] !== false, T.REPORT_MAIN_KEYS);
  const nums = Object.values(map).sort((a, b) => a - b);
  eq('profil numaraları bitişik (boşluksuz)', nums.every((n, i) => n === i + 1), true);
  eq('profil: kullanıcı sırası korunur (standart profil sıra yazmaz)', T.reportPresetLayout('standard').order, null);
}


// [106] v2.262 — Konuşmacı kodu KİMLİKTİR: çakışma bildirilir, sessizce
// yeniden numaralanmaz. Düzeltme kullanıcı isteğiyle ve günlüğe yazılarak.
{
  console.log('[106] Konuşmacı kodu çakışması (v2.262)');
  const mkCase = (speakers) => ({ id: 'c1', materials: [{ id: 'm1', name: 'a.wav', speakers, segments: [] }] });
  const sp = (id, code, name) => ({ id, code, name, label: name });

  eq('speakerCodeIssues tanımlı', typeof __schemaMod.speakerCodeIssues, 'function');
  eq('çakışma yok → boş', __schemaMod.speakerCodeIssues(mkCase([sp('a', 'S1', 'A'), sp('b', 'S2', 'B')])).length, 0);
  const dup = __schemaMod.speakerCodeIssues(mkCase([sp('a', 'S1', 'A'), sp('b', 'S1', 'B')]));
  eq('çift kod bildirilir', dup.length, 1);
  eq('çift kod adı', dup[0].code, 'S1');
  eq('çift kod kişileri', dup[0].speakerIds.length, 2);
  eq('çift kod kişi adları', dup[0].names.join(','), 'A,B');
  // Boş kod çakışma DEĞİLDİR: assignSpeakerCodes doldurur.
  eq('boş kod çakışma sayılmaz', __schemaMod.speakerCodeIssues(mkCase([sp('a', '', 'A'), sp('b', '', 'B')])).length, 0);
  // Kayıtlar arası aynı kod çakışma değildir (S1 kayıt başınadır).
  const twoMaterials = {
    id: 'c2',
    materials: [
      { id: 'm1', name: 'a.wav', speakers: [sp('a', 'S1', 'A')], segments: [] },
      { id: 'm2', name: 'b.wav', speakers: [sp('c', 'S1', 'C')], segments: [] }
    ]
  };
  eq('kayıtlar arası S1 çakışma değil', __schemaMod.speakerCodeIssues(twoMaterials).length, 0);

  // Düzeltme: ilk konuşmacı kodunu KORUR, sonraki sıradaki boş kodu alır.
  const c = mkCase([sp('a', 'S1', 'A'), sp('b', 'S1', 'B'), sp('c', 'S3', 'C')]);
  const changed = __schemaMod.fixSpeakerCodeConflicts(c);
  eq('düzeltme bir değişiklik bildirir', changed.length, 1);
  eq('düzeltme: değişen kişi', changed[0].speakerId, 'b');
  eq('düzeltme: eski kod', changed[0].from, 'S1');
  eq('düzeltme: yeni kod (boş olan S2)', changed[0].to, 'S2');
  eq('düzeltme sonrası çakışma yok', __schemaMod.speakerCodeIssues(c).length, 0);
  eq('düzeltme sonrası kodlar', c.materials[0].speakers.map((x) => x.code).join(','), 'S1,S2,S3');
  eq('düzeltme idempotent', __schemaMod.fixSpeakerCodeConflicts(c).length, 0);

  // Hazırlık: çakışma ENGELSEYEN maddedir (rapor iki kez S1 yazarsa yanıltır).
  const rc = T.reportReadiness({
    ...T.emptyCaseForTest({ id: 'cR' }),
    fileNo: '2026/1', court: 'Mahkeme', expertName: 'Uzman',
    materials: [{ id: 'm1', name: 'a.wav', duration: 5, sha256: 'a'.repeat(64), speakers: [sp('a', 'S1', 'A'), sp('b', 'S1', 'B')], segments: [{ id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'A', text: 'x', review: 'approved' }], log: [], origin: { mediumType: 'usb' } }]
  });
  const item = rc.items.find((x) => x.key === 'speakerCodes');
  eq('hazırlıkta konuşmacı kodu maddesi var', !!item, true);
  eq('konuşmacı kodu maddesi engelleyen', item && item.severity, 'blocking');
  eq('konuşmacı kodu sayısı', item && item.count, 1);
  eq('maddede eylem var', item && item.action, 'speakerCodes');

  // Çakışma yoksa madde ÇIKMAZ.
  const rc2 = T.reportReadiness({
    ...T.emptyCaseForTest({ id: 'cR2' }),
    fileNo: '2026/1', court: 'Mahkeme', expertName: 'Uzman',
    materials: [{ id: 'm1', name: 'a.wav', duration: 5, sha256: 'a'.repeat(64), speakers: [sp('a', 'S1', 'A'), sp('b', 'S2', 'B')], segments: [{ id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'A', text: 'x', review: 'approved' }], log: [], origin: { mediumType: 'usb' } }]
  });
  eq('çakışma yoksa madde yok', rc2.items.some((x) => x.key === 'speakerCodes'), false);
}

// [107] v2.262 — Kod alanı SALT-OKUNUR: kullanıcı kimliği yanlışlıkla bozamaz.
{
  console.log('[107] Konuşmacı kodu salt-okunur (v2.262)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('kod girişi kaldırıldı', /data-spk-key="code"/.test(js), false);
  eq('kod salt-okunur gösterim', /class="spk-code"/.test(js), true);
  eq('çakışma düzeltme düğmesi', /data-fix-spk-codes=/.test(js), true);
  eq('panelde çakışma uyarısı', /speakerCodeIssues\(c\)/.test(js), true);
}


// [108] v2.263 — Konuşmacı atama hızı: TEK KAPI + klavye sırası + istatistik.
// Atama hem ADI hem KİMLİĞİ yazar; kimlik olmadan birleştirme/eşleştirme
// ada bağlı kalır ve ad değişince bağ kopar.
{
  console.log('[108] Konuşmacı atama hızı (v2.263)');
  const mk = () => ({
    id: 'm1',
    name: 'a.wav',
    speakers: [
      { id: 'a', code: 'S1', name: 'A', label: 'A' },
      { id: 'b', code: 'S2', name: 'B', label: 'B' }
    ],
    segments: [
      { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: '', speakerId: '' },
      { id: 'g2', start: '00:00:05.000', end: '00:00:09.000', speaker: 'A', speakerId: 'a' },
      { id: 'g3', start: '00:00:09.000', end: '00:00:12.000', speaker: 'B', speakerId: 'b' }
    ]
  });
  const m = mk();
  eq('atanabilir liste (adı olanlar)', T.speakerIndexList(m).map((x) => x.code).join(','), 'S1,S2');
  const r = T.assignSpeakerByIndex(m, 0, 1);
  eq('atama ok', r.ok, true);
  eq('atanan kod', r.code, 'S2');
  eq('atama adı yazar', m.segments[0].speaker, 'B');
  eq('atama kimliği yazar', m.segments[0].speakerId, 'b');
  eq('aynı atama aynı=true', T.assignSpeakerByIndex(m, 0, 1).same, true);
  eq('konuşmacı aralık dışı → ok=false', T.assignSpeakerByIndex(m, 0, 5).ok, false);
  eq('bölüm aralık dışı → ok=false', T.assignSpeakerByIndex(m, 9, 0).ok, false);
  eq('adsız konuşmacı atanamaz', T.speakerIndexList({ speakers: [{ id: 'x', code: 'S1', name: '' }] }).length, 0);
  eq('atanabilir liste boşsa ok=false', T.assignSpeakerByIndex({ speakers: [], segments: [{ id: 'g' }] }, 0, 0).ok, false);

  // Kalabalıkta sıra: B kimliğine göre bölümler
  eq('kimliğe göre bölümler', T.speakerQueueIndexes(m, { id: 'b', name: 'B' }).join(','), '0,2');
  eq('ada göre bölümler', T.speakerQueueIndexes(m, { id: '', name: 'A' }).join(','), '1');
  eq('boş konuşmacı → boş', T.speakerQueueIndexes(m, { id: '', name: '' }).length, 0);

  const st = T.speakerStats(m, { id: 'b', name: 'B' });
  eq('istatistik: bölüm sayısı', st.count, 2);
  eq('istatistik: toplam süre', st.totalSec, 8);
  eq('istatistik: ilk duyulma', st.first, '00:00:00.000');
  eq('istatistik: son duyulma', st.last, '00:00:12.000');
  const none = T.speakerStats(m, { id: '', name: 'yok' });
  eq('atanmamış: sayı 0', none.count, 0);
  eq('atanmamış: süre 0', none.totalSec, 0);
  eq('atanmamış: ilk boş', none.first, '');

  // Ad ile yazma: bilinmeyen ad kimliği TEMİZLER (dangling referans bırakmaz)
  const m2 = mk();
  const sp = T.setSegmentSpeakerByName(m2, m2.segments[0], 'A');
  eq('ad ile atama kimliği bulur', m2.segments[0].speakerId, 'a');
  eq('ad ile atama kaydı döndürür', sp && sp.code, 'S1');
  T.setSegmentSpeakerByName(m2, m2.segments[0], 'KayıtlıDeğil');
  eq('bilinmeyen ad kimliği temizler', m2.segments[0].speakerId, '');
  eq('bilinmeyen ad metni korunur', m2.segments[0].speaker, 'KayıtlıDeğil');
  T.setSegmentSpeakerByName(m2, m2.segments[0], '');
  eq('boş ad → kimlik boş', m2.segments[0].speakerId, '');
}

// [109] v2.263 — Hız yolları kaynakta: Alt+sayı, dinle, örnek dinle, kuyruk.
{
  console.log('[109] Konuşmacı hız yolları (v2.263)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const schema = fs.readFileSync(path.join(ROOT, 'assets/schema.js'), 'utf8');
  eq(
    'Alt+sayı atama işleyicisi',
    /e\.altKey[\s\S]{0,200}assignSpeakerHotkey\(m, Number\(e\.key\) - 1\)/.test(js) &&
      /function assignSpeakerHotkey[\s\S]{0,300}assignSpeakerByIndex\(/.test(js),
    true
  );
  eq('konuşmacıyı dinle düğmesi', /data-listen-spk=/.test(js), true);
  eq('örnek dinle düğmesi', /data-sample-spk=/.test(js), true);
  eq('dinleme kuyruğu var', /function startSpeakerQueue\(/.test(js) && /function advanceSpeakerQueue\(/.test(js), true);
  eq('kuyruk oturumluk (şemada yok)', /spkQueue/.test(js) && !/spkQueue/.test(schema), true);
  eq('elle dinleme kuyruğu iptal eder', (js.match(/stopSpeakerQueue\(\)/g) || []).length >= 3, true);
}


// [110] v2.264 — Konuşmacı "doğrulandı" kilidi: şema, göç, birleştirme.
{
  console.log('[110] Konuşmacı doğrulandı kilidi (v2.264)');
  eq('isSpeakerVerified tanımlı', typeof __schemaMod.isSpeakerVerified, 'function');
  eq('boş kayıt doğrulanmadı', __schemaMod.isSpeakerVerified(__schemaMod.emptySpeaker()), false);
  eq('emptySpeaker verifiedAt boş', __schemaMod.emptySpeaker().verifiedAt, '');
  const nv = __schemaMod.normalizeSpeaker({ id: 's1', label: 'A', verifiedAt: '2026-01-01T10:00:00Z', verifiedBy: 'Uzman' });
  eq('normalize doğrulamayı korur', __schemaMod.isSpeakerVerified(nv), true);
  eq('normalize doğrulayanı korur', nv.verifiedBy, 'Uzman');
  eq('normalize boş alanı boş tutar', __schemaMod.normalizeSpeaker({ id: 's2' }).verifiedAt, '');

  // Birleştirme: gelen doğrulanmış → devralınır; ikisi de doğrulanmışsa YENİ tarih.
  const base = (verifiedAt, label) => ({
    id: 'c1',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        speakers: [{ id: 'sp1', code: 'S1', label, verifiedAt, verifiedBy: verifiedAt ? 'U' : '' }],
        segments: [],
        log: []
      }
    ]
  });
  const m1 = __schemaMod.mergeCases(base('', 'A'), base('2026-02-02T10:00:00Z', 'A'));
  eq('birleştirme: doğrulama devralınır', __schemaMod.isSpeakerVerified(m1.merged.materials[0].speakers[0]), true);
  const m2 = __schemaMod.mergeCases(base('2026-03-03T10:00:00Z', 'A'), base('2026-02-02T10:00:00Z', 'A'));
  eq('birleştirme: daha yeni doğrulama korunur', m2.merged.materials[0].speakers[0].verifiedAt, '2026-03-03T10:00:00Z');

  // Kilit anahtarı ve rapor notu kaynakta
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('kart doğrulama anahtarı', /data-spk-verify=/.test(js), true);
  eq('kilitli alanlar disabled', /const dis = ver \? ' disabled' : ''/.test(js), true);
  eq('kilitliyken silme devre dışı', /data-del-spk="\$\{esc\(m\.id\)\}\|\$\{esc\(s\.id\)\}"\$\{dis\}/.test(js), true);
  eq('günlüğe yazılır', /logEvent\(m, on \? 'Konuşmacı doğrulandı'/.test(js), true);
  eq('rapor notu var', /speakerVerifiedSuffix/.test(js), true);
}


// [111] v2.265 — Konuşmacı ses tutarlılığı: SAF karşılaştırma.
// KURAL: yalnız güvenilir profiller karşılaştırılır; oktav belirsiz ölçüm
// profile girmez; hiçbir atama otomatik değiştirilmez (yalnız işaret).
{
  console.log('[111] Konuşmacı ses tutarlılığı (v2.265)');
  eq('medianOf tek', __schemaMod.medianOf([5]), 5);
  eq('medianOf çift', __schemaMod.medianOf([2, 4]), 3);
  eq('medianOf boş', __schemaMod.medianOf([]), null);
  eq('medianOf geçersizleri atar', __schemaMod.medianOf([0, -1, NaN, 10]), 10);
  eq('VOICE_SCHEMA sürümlü', __schemaMod.VOICE_SCHEMA >= 1, true);

  const pts = [
    { index: 0, speakerId: 'a', hz: 120 },
    { index: 1, speakerId: 'a', hz: 122 },
    { index: 2, speakerId: 'a', hz: 118 },
    { index: 3, speakerId: 'b', hz: 210 },
    { index: 4, speakerId: 'b', hz: 208 },
    { index: 5, speakerId: 'b', hz: 212 },
    { index: 6, speakerId: 'a', hz: 200 }
  ];
  const prof = __schemaMod.speakerVoiceProfiles(pts);
  eq('iki profil', prof.length, 2);
  // Ortanca, TEK aykırı değerden (200 Hz) etkilenmez: [118,120,122,200] → 121.
  eq('A ortancası (aykırıya dayanıklı)', Math.round(prof.find((x) => x.speakerId === 'a').medianHz), 121);
  eq('B ortancası', Math.round(prof.find((x) => x.speakerId === 'b').medianHz), 210);
  eq('güvenilir profil', prof.every((x) => x.reliable), true);

  const out = __schemaMod.voiceOutliers(pts, prof);
  eq('tek aykırı bölüm', out.length, 1);
  eq('aykırı bölüm indeksi', out[0].index, 6);
  eq('en yakın konuşmacı B', out[0].nearestSpeakerId, 'b');
  eq('aykırı türü nearest-other', out[0].kind, 'nearest-other');

  // Oktav belirsiz ölçüm profile GİRMEZ (yanlış yönlendirme olmasın).
  const ambPts = [
    { index: 0, speakerId: 'a', hz: 120 },
    { index: 1, speakerId: 'a', hz: 122 },
    { index: 2, speakerId: 'a', hz: 118 },
    { index: 3, speakerId: 'a', hz: 240, ambiguous: true }
  ];
  eq('belirsiz ölçüm profile girmez', __schemaMod.speakerVoiceProfiles(ambPts)[0].count, 3);
  eq('belirsiz ölçüm aykırı sayılmaz', __schemaMod.voiceOutliers(ambPts, __schemaMod.speakerVoiceProfiles(ambPts)).length, 0);

  // Yetersiz örnek (2 bölüm) → profil güvenilir değil; karşılaştırma yapılmaz.
  const few = [
    { index: 0, speakerId: 'a', hz: 120 },
    { index: 1, speakerId: 'a', hz: 400 }
  ];
  const fewProf = __schemaMod.speakerVoiceProfiles(few);
  eq('az örnek güvenilir değil', fewProf[0].reliable, false);
  eq('güvenilmez profilde aykırı yok', __schemaMod.voiceOutliers(few, fewProf).length, 0);

  // Değişim şüphesi: aynı konuşmacıda ARDIŞIK ve büyük sıçrama.
  const chg = [
    { index: 0, speakerId: 'a', hz: 120 },
    { index: 1, speakerId: 'a', hz: 200 },
    { index: 2, speakerId: 'b', hz: 210 },
    { index: 3, speakerId: 'b', hz: 214 }
  ];
  const sus = __schemaMod.voiceChangeSuspects(chg);
  eq('değişim şüphesi sayısı', sus.length, 1);
  eq('değişim şüphesi indeksi', sus[0].index, 1);
  eq('farklı konuşmacıya geçiş şüphe değil', sus.some((x) => x.index === 2), false);

  // Eşik altındaki küçük fark işaretlenmez (gürültü yok).
  const near = [
    { index: 0, speakerId: 'a', hz: 120 },
    { index: 1, speakerId: 'a', hz: 130 },
    { index: 2, speakerId: 'a', hz: 125 }
  ];
  eq('küçük fark işaretlenmez', __schemaMod.voiceOutliers(near, __schemaMod.speakerVoiceProfiles(near)).length, 0);
}

// [112] v2.265 — Ölçüm ve işaret yolları kaynakta.
{
  console.log('[112] Ses tutarlılığı ölçüm yolu (v2.265)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('ölçüm düğmesi', /data-voice-check=/.test(js), true);
  eq('ölçüm fonksiyonu', /async function measureSpeakerConsistency\(/.test(js), true);
  eq('ölçüm kayda yazılır', /m\.voiceCheck = \{/.test(js), true);
  eq('ölçüm günlüğe yazılır', /Konuşmacı tutarlılığı ölçüldü/.test(js), true);
  eq('listedeki işaret', /⚠ ses/.test(js), true);
  eq('panele git düğmesi', /data-voice-goto=/.test(js), true);
  eq('otomatik atama YOK (yalnız işaret)', !/voiceCheck[\s\S]{0,200}setSegmentSpeakerByName/.test(js), true);
  eq('hazırlık maddesi', /'Ses tutarlılığı: şüpheli bölüm'/.test(js), true);
  eq('şema alanı', /voiceCheck: null/.test(fs.readFileSync(path.join(ROOT, 'assets/schema.js'), 'utf8')), true);
}


// [113] v2.267 — S/K ayrımı: kayıt içi konuşmacı açıklaması (TEK KAYNAK).
// S kodları kayıt başınadır; her kaydın kendi listesi gösterilir. K ayrıdır.
{
  console.log('[113] S/K ayrımı ve kayıt konuşmacı satırı (v2.267)');
  const m = {
    id: 'm1',
    name: 'a.wav',
    speakers: [
      { id: 'b', code: 'S2', name: 'Ev sahibi', label: 'Ev sahibi' },
      { id: 'a', code: 'S1', name: 'Kiracı', label: 'Kiracı' },
      { id: 'c', code: 'S3', name: 'Boş', label: 'Boş' }
    ],
    segments: [
      { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'a' },
      { id: 'g2', start: '00:00:05.000', end: '00:00:09.000', speaker: 'Ev sahibi', speakerId: 'b' },
      { id: 'g3', start: '00:00:09.000', end: '00:00:12.000', speaker: 'Kiracı', speakerId: 'a' }
    ]
  };
  eq('speakerLegendItems tanımlı', typeof T.speakerLegendItems, 'function');
  const items = T.speakerLegendItems(m);
  eq('yalnız atanmış konuşmacılar', items.length, 2);
  eq('koda göre sıralı', items.map((x) => x.code).join(','), 'S1,S2');
  eq('bölüm sayısı', items.map((x) => x.count).join(','), '2,1');
  eq('etiket taşınır', items[0].name, 'Kiracı');
  eq('boş kayıtta satır yok', T.materialSpeakerLine({ id: 'x', name: 'x', speakers: [], segments: [] }), '');
  const line = T.materialSpeakerLine(m);
  eq('satır S/K açıklamasını taşır', /Bu kaydın konuşmacıları/.test(line), true);
  eq('satır kodu ve etiketi yazar', /S1 · Kiracı \(2 bölüm\)/.test(line), true);
  eq('satır ikinci kişiyi yazar', /S2 · Ev sahibi \(1 bölüm\)/.test(line), true);

  // Rapor metni: S/K ayrımı AÇIKÇA yazılır (tek kaynak).
  // TÜRKÇE BÜYÜK İ tuzağı: `/i` bayrağı "İ" ile eşleşmez (v2.100 dersi).
  // Bu yüzden metin parçaları olduğu gibi (büyük harfle) aranır.
  const note = T.REPORT_TEXT.speakerCodeNote || '';
  eq('S/K notu var', /KAYIT İÇİ/.test(note), true);
  eq('K dosyalar arası denir', /dosyalar arası eşleştirme/.test(note), true);
  eq('S yeniden başlar denir', /her kayıtta S1'den başlar/.test(note), true);
  eq('kimlik tespiti değildir denir', /kimlik tespiti değildir/.test(note), true);
}

// [114] v2.267 — Arayüz terimleri ve ek açıklamaları (kaynakta).
{
  console.log('[114] S/K arayüz terimleri (v2.267)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('panel: kayıt içi kod etiketi', /Kayıt içi kod \(S\)/.test(js), true);
  eq('panel: dosyalar arası kişi (K)', /Dosyalar arası kişi \(K\)/.test(js), true);
  eq('liste açıklama satırı', /spk-legend/.test(js), true);
  eq('rozet ipucu kayda özgü der', /bu kayda özgü kod/i.test(js), true);
  eq('EK-5 S tanımı', /Kayıt içi konuşmacı kodu/.test(js), true);
  eq('EK-5 K tanımı', /Dosyalar arası kişi kodu/.test(js), true);
}


// [115] v2.268 — Rapor netliği: süre tablosu + EK-5 üç tablo (tek kaynak).
{
  console.log('[115] Süre tablosu ve gösterim anahtarı (v2.268)');
  const c = {
    id: 'c1',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        speakers: [
          { id: 'a', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'complainant', gender: 'unspecified' }
        ],
        segments: [
          { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'a' },
          { id: 'g2', start: '00:00:05.000', end: '00:00:10.000', speaker: 'Kiracı', speakerId: 'a' }
        ]
      }
    ]
  };
  eq('speakerDurationRows tanımlı', typeof T.speakerDurationRows, 'function');
  const rows = T.speakerDurationRows(c);
  eq('bir satır', rows.length, 1);
  eq('kod', rows[0][0], 'S1');
  eq('etiket', rows[0][1], 'Kiracı');
  eq('kayıt', rows[0][2], 'a.wav');
  eq('bölüm sayısı', rows[0][3], '2 bölüm');
  eq('süre', rows[0][4], '00:10');
  eq('ilk–son', rows[0][5], '00:00:00.000 – 00:00:10.000');
  // Bölümü olmayan konuşmacı süre tablosuna GİRMEZ.
  const c2 = JSON.parse(JSON.stringify(c));
  c2.materials[0].speakers.push({ id: 'z', code: 'S2', name: 'Boş', label: 'Boş' });
  eq('atanmamış kişi süre tablosunda yok', T.speakerDurationRows(c2).length, 1);

  // EK-5: ÜÇ tablo ve gözlem satırları OBS_DEFS'ten (tek kaynak).
  // Normalizasyon eksik ekleri sona ekler; bu yüzden EK-5'i BAŞLIĞINDAN bul.
  const blocks = T.reportAnnexBlocks({ ...c, report: { sections: { annex: true } } });
  const b = blocks.find((x) => /GÖSTERİM ANAHTARI/.test(x.heading));
  eq('EK-5 bulundu', !!b, true);
  eq('tables türü', b.kind, 'tables');
  eq('üç tablo', b.tables.length, 3);
  eq('tablo 1 başlığı', b.tables[0].title, 'Konuşmacı kodları');
  eq('tablo 2 başlığı', b.tables[1].title, 'Metin işaretleri');
  eq('tablo 3 başlığı', b.tables[2].title, 'Gözlem işaretleri');
  eq('gözlem satırı sayısı = OBS_DEFS', b.tables[2].rows.length, __schemaMod.OBS_DEFS.length);
  eq('gözlem satırı etiketi', b.tables[2].rows[0][0], __schemaMod.OBS_DEFS[0].label);
  eq('gözlem satırı ipucu', b.tables[2].rows[0][1], __schemaMod.OBS_DEFS[0].hint);
  eq('S/K satırları var', b.tables[0].rows.length, 2);
}


// [116] v2.269 — Ölçüm durumu: hangi ölçüm yapıldı, ne zaman (tek kaynak).
{
  console.log('[116] Ölçüm durumu ve toplu ölçüm (v2.269)');
  const base = { id: 'm1', name: 'a.wav', speakers: [], segments: [] };
  const empty = T.measurementStatus(base);
  eq('beş durum satırı (WER dâhil)', empty.length, 5);
  eq('anahtarlar', empty.map((x) => x.key).join(','), 'levels,pitch,voice,wer,spec');
  eq('hiçbiri yapılmadı', empty.every((x) => !x.done), true);
  eq('spektrogram MANUEL', empty.find((x) => x.key === 'spec').manual, true);
  eq('WER düğmeyle ölçülmez (referans varsa kendiliğinden)', empty.find((x) => x.key === 'wer').manual, true);
  eq('seviye manuel değil', empty.find((x) => x.key === 'levels').manual, false);
  eq('toplu ölçüm adımları', T.MEASURE_ALL_STEPS.join(','), 'levels,pitch,voice');
  eq('yapılmadı metni', T.measurementStatusText(empty[0]), 'yapılmadı');

  const done = {
    ...base,
    levels: { ok: true, schema: 3, at: '2026-01-01T10:00:00Z' },
    speakers: [
      { id: 'a', code: 'S1', name: 'A', pitchAt: '2026-01-01T10:01:00Z' },
      { id: 'b', code: 'S2', name: 'B', pitchAt: '' }
    ],
    segments: [{ id: 'g', start: '00:00:00.000', end: '00:00:05.000', speaker: 'A', speakerId: 'a' }],
    voiceCheck: { ok: true, at: '2026-01-01T10:02:00Z', outliers: [{ index: 0 }, { index: 1 }] },
    spectrogramReviewed: { at: '2026-01-01T10:03:00Z' }
  };
  const st = T.measurementStatus(done);
  eq('seviye yapıldı', st.find((x) => x.key === 'levels').done, true);
  eq('seviye saati taşınır', st.find((x) => x.key === 'levels').at, '2026-01-01T10:00:00Z');
  // Perde: konuşmacıların HEPSİ ölçülmüşse tamam sayılır.
  eq('perde eksik (1/2)', st.find((x) => x.key === 'pitch').done, false);
  eq('perde ayrıntısı', st.find((x) => x.key === 'pitch').detail, '1/2 konuşmacı');
  eq('tutarlılık yapıldı', st.find((x) => x.key === 'voice').done, true);
  eq('tutarlılık şüpheli sayısı', st.find((x) => x.key === 'voice').detail, '2 şüpheli');
  eq('spektrogram işaretlendi', st.find((x) => x.key === 'spec').done, true);

  // Eski/bozuk ölçüm "yapıldı" sayılmaz (şema uyuşmazlığı).
  const stale = { ...base, levels: { ok: true, schema: 1, at: '2026-01-01T10:00:00Z' } };
  eq('eski şema yapılmadı sayılır', T.measurementStatus(stale).find((x) => x.key === 'levels').done, false);

  // Konuşmacı yoksa perde satırı "konuşmacı yok" der (uydurma yüzde yok).
  eq('konuşmacı yok', empty.find((x) => x.key === 'pitch').detail, 'konuşmacı yok');

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('toplu ölçüm sıralı (await)', /for \(let i = 0; i < steps\.length; i\+\+\)[\s\S]{0,400}await fn\(m\)/.test(js), true);
  eq('çift çalışma koruması', /if \(measureAllRunning\)/.test(js), true);
  eq('panel kimliği', /id="measure-panel-/.test(js), true);
  // v2.269 — SESSİZ BEYAN DÜZELTMESİ: bölüm spektrogramı çizilince
  // "incelendi" işareti KONMAZ; beyan yalnız açık düğmeyle verilir.
  const autoMark = /refreshSegmentSpectrogram[\s\S]{0,1200}spectrogramReviewed = \{/.test(js);
  eq('spektrogram otomatik işaretlenmez', autoMark, false);
  eq('açık düğme işaretler', /Spektrogram incelendiği rapora yansıtılır/.test(js), true);
  eq('beyandan sonra çip tazelenir', /spectrogramReviewed = \{ at[\s\S]{0,400}refreshMeasurementPanel\(m\)/.test(js), true);
  eq('perde bulunamadı ayrımı', /perde ölçülemedi \(ölçüm yapıldı\)/.test(js), true);
}


// [117] v2.270 — WER: neden ölçülemediği yazılır, ölçülebiliyorsa hesaplanır.
{
  console.log('[117] WER referans durumu (v2.270)');
  const noRef = T.werStatus({ id: 'm', expectedText: '', segments: [{ id: 'g', asrText: 'bir iki' }] });
  eq('referans yok → hazır değil', noRef.ready, false);
  eq('referans yok nedeni', noRef.reason, 'no-reference');
  eq('referans yok metni', T.werStatusText(noRef), 'Referans metin yok — WER ölçülemez; raporda bu tablo çıkmaz.');

  const noAsr = T.werStatus({ id: 'm', expectedText: 'bir iki üç', segments: [{ id: 'g', text: 'elle yazıldı' }] });
  eq('model çıktısı yok → hazır değil', noAsr.ready, false);
  eq('model çıktısı yok nedeni', noAsr.reason, 'no-asr');
  eq('model çıktısı yok metni', T.werStatusText(noAsr), 'Model çıktısı yok — önce kaydı çözümleyin (WER modelin HAM çıktısını ölçer).');

  const ok = T.werStatus({
    id: 'm',
    expectedText: 'bir iki üç',
    segments: [{ id: 'g', asrText: 'bir iki' }]
  });
  eq('ölçülebilir', ok.ready, true);
  eq('referans kelime', ok.refWords, 3);
  eq('çıktı kelime', ok.asrWords, 2);
  eq('WER oranı', Math.round(ok.result.ratio * 100), 33);
  eq('durum metni WER içerir', /Ölçüldü: %33,3/.test(T.werStatusText(ok)), true);

  // referenceSegments yedeği (test kayıtları) referans sayılır.
  const segRef = T.werStatus({
    id: 'm',
    expectedText: '',
    referenceSegments: [{ text: 'a b' }, { text: 'c' }],
    segments: [{ id: 'g', asrText: 'a b c' }]
  });
  eq('referenceSegments referans sayılır', segRef.ready, true);
  eq('birleşik referans kelime', segRef.refWords, 3);
  eq('tam eşleşme WER 0', Math.round(segRef.result.ratio * 100), 0);

  // Hipotez MODEL çıktısıdır: bilirkişi metni referansa eşitse WER 0 olmamalı.
  const notExpert = T.werStatus({
    id: 'm',
    expectedText: 'bir iki üç',
    segments: [{ id: 'g', text: 'bir iki üç', asrText: 'bir' }]
  });
  eq('hipotez asrText ten gelir', Math.round(notExpert.result.ratio * 100), 67);

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('referans girişi var', /data-wer-ref=/.test(js), true);
  eq('expectedText e yazılır', /mm\.expectedText = String\(el\.value/.test(js), true);
  eq('durum satırı tek kaynak', /werStatusText\(werStatus\(m\)\)/.test(js), true);
}


// [118] v2.272 — Gözlem bayrakları: yankı ve kesinti (tek tanım noktası).
{
  console.log('[118] Yeni gözlem bayrakları: yankı / kesinti (v2.272)');
  eq('OBS_KEYS on iki bayrak', __schemaMod.OBS_KEYS.length, 12);
  eq('yankı anahtarı var', __schemaMod.OBS_KEYS.includes('echo'), true);
  eq('kesinti anahtarı var', __schemaMod.OBS_KEYS.includes('dropout'), true);
  eq('yankı etiketi', __schemaMod.OBS_LABEL.echo, 'yankı / oda akustiği');
  eq('kesinti etiketi', __schemaMod.OBS_LABEL.dropout, 'kesinti / kopukluk');
  eq('kısa etiket yankı', __schemaMod.OBS_SHORT.echo, 'yankı');
  eq('ipucu var (yankı)', __schemaMod.OBS_HINT.echo.length > 10, true);
  eq('ipucu var (kesinti)', __schemaMod.OBS_HINT.dropout.length > 10, true);

  const eo = __schemaMod.emptyObs();
  eq('emptyObs yeni anahtarları taşır', eo.echo === false && eo.dropout === false, true);
  const nseg = __schemaMod.normalizeSegment({ id: 'g', text: 'x' });
  eq('normalizeSegment yeni bayrakları tamamlar', nseg.obs.echo === false && nseg.obs.dropout === false, true);
  // Bilinmeyen (ileri sürüm) anahtar SİLİNMEZ.
  const fseg = __schemaMod.normalizeSegment({ id: 'g', obs: { futureFlag: true, echo: true } });
  eq('bilinmeyen anahtar korunur', fseg.obs.futureFlag, true);
  eq('bilinen yeni anahtar korunur', fseg.obs.echo, true);

  // Birleştirme gözlemleri OR'lar (hiçbiri kaybolmaz).
  const mk = (obs) => ({
    id: 'c1',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        speakers: [],
        segments: [{ id: 'g1', start: '00:00:00.000', end: '00:00:05.000', text: 'x', obs, review: 'approved' }],
        log: []
      }
    ]
  });
  const mm = __schemaMod.mergeCases(mk({ echo: true }), mk({ dropout: true })).merged;
  eq('birleştirme: yankı korunur', mm.materials[0].segments[0].obs.echo, true);
  eq('birleştirme: kesinti korunur', mm.materials[0].segments[0].obs.dropout, true);

  // Rapor gözlem metni ve EK-5 anahtarı yeni etiketleri taşır.
  const c = {
    id: 'c2',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        speakers: [],
        segments: [
          { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: '', text: 'x', obs: { echo: true, dropout: true }, review: 'approved' }
        ],
        log: []
      }
    ]
  };
  const obsText = T.segObsText(c.materials[0].segments[0]);
  eq('gözlem metni yankıyı yazar', /yankı/.test(obsText), true);
  eq('gözlem metni kesintiyi yazar', /kesinti/.test(obsText), true);
  const blocks = T.reportAnnexBlocks({ ...c, report: { sections: { annex: true } } });
  const ek5 = blocks.find((x) => /GÖSTERİM ANAHTARI/.test(x.heading));
  const labels = ek5.tables[2].rows.map((r) => r[0]);
  eq('EK-5 yankı satırı', labels.includes('yankı / oda akustiği'), true);
  eq('EK-5 kesinti satırı', labels.includes('kesinti / kopukluk'), true);
  eq('EK-5 satır sayısı = OBS_DEFS', ek5.tables[2].rows.length, __schemaMod.OBS_DEFS.length);

  // Arayüzde etiket KOPYASI yok: bayrak metinleri yalnız şemada.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('app.js te yankı etiketi kopyası yok', /yankı \/ oda akustiği/.test(js), false);
}


// [119] v2.273 — Kayıt bazında konuşmacı TABLOSU (mahkeme için tek bakış).
{
  console.log('[119] Kayıt konuşmacı tablosu (v2.273)');
  const m = {
    id: 'm1',
    name: 'a.wav',
    speakers: [
      { id: 'b', code: 'S2', name: 'Ev sahibi', label: 'Ev sahibi' },
      { id: 'a', code: 'S1', name: 'Kiracı', label: 'Kiracı' }
    ],
    segments: [
      { id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'a' },
      { id: 'g2', start: '00:00:09.000', end: '00:00:12.000', speaker: 'Ev sahibi', speakerId: 'b' },
      { id: 'g3', start: '00:00:20.000', end: '00:00:24.000', speaker: 'Kiracı', speakerId: 'a' }
    ]
  };
  const c = { id: 'c1', materials: [m], speakers: [] };
  const t = T.materialSpeakerRows(c, m);
  eq('beş sütun (kişi bağı yok)', t.headers.join('|'), 'KOD|ETİKET|BÖLÜM|SÜRE|İLK – SON');
  eq('kişi bayrağı yok', t.hasPerson, false);
  eq('iki satır', t.rows.length, 2);
  eq('koda göre sıralı', t.rows.map((r) => r[0]).join(','), 'S1,S2');
  eq('S1 bölüm sayısı', t.rows[0][2], '2 bölüm');
  eq('S1 toplam süre', t.rows[0][3], '00:09');
  eq('S1 ilk–son', t.rows[0][4], '00:00:00.000 – 00:00:24.000');
  eq('S2 süre', t.rows[1][3], '00:03');

  // Kişi bağı varsa ALTINCI sütun eklenir ve kişi kodu yazılır.
  const m2 = JSON.parse(JSON.stringify(m));
  m2.speakers[0].personId = 'p1';
  const c2 = { id: 'c2', materials: [m2], speakers: [{ id: 'p1', code: 'K1', label: 'Kiracı' }] };
  const t2 = T.materialSpeakerRows(c2, m2);
  eq('altı sütun (bağ var)', t2.headers.length, 6);
  eq('kişi sütunu adı', t2.headers[5], 'DOSYALAR ARASI KİŞİ');
  eq('kişi hücresi', t2.rows.find((r) => r[0] === 'S2')[5], 'K1 · Kiracı');
  eq('bağsız satır tire', t2.rows.find((r) => r[0] === 'S1')[5], '—');

  // Konuşmacı yoksa tablo çizilmez (boş başlık yok).
  const empty = T.materialSpeakerRows({ id: 'c', speakers: [] }, { id: 'm', speakers: [], segments: [] });
  eq('konuşmacı yok → satır yok', empty.rows.length, 0);

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('üç çıktı tabloyu kullanır', (js.match(/materialSpeakerRows\(c, m\)/g) || []).length >= 3, true);
}


// [120] v2.274 — Konuşmacı kimliği tutarlılığı.
// Ölçülen hata: "＋ Yeni konuşmacı" bölümün ADINI yazıyor, `speakerId` eski
// kişide kalıyordu; `speakerSegments` ad VEYA kimlikle eşleştiği için aynı
// bölüm raporda İKİ konuşmacıda görünüyordu (yenilemeden sonra da).
{
  console.log('[120] Konuşmacı kimliği tutarlılığı (v2.274)');
  const reconcile = T.reconcileSpeakerRefsForTest;
  eq('reconcileSpeakerRefs tanımlı', typeof reconcile, 'function');
  if (typeof reconcile === 'function') {
    const speakers = [
      { id: 'a', code: 'S1', label: 'Konuşmacı 1', name: 'Konuşmacı 1' },
      { id: 'b', code: 'S2', label: 'Konuşmacı 2', name: 'Konuşmacı 2' }
    ];
    const out = reconcile(speakers, [
      { id: 'g1', speaker: 'Konuşmacı 2', speakerId: 'a' },
      { id: 'g2', speaker: 'Konuşmacı 9', speakerId: 'zzz' },
      { id: 'g3', speaker: 'Konuşmacı 1', speakerId: '' }
    ]);
    eq('bayat kimlik ada göre düzeltilir', out[0].speakerId, 'b');
    eq('tanınmayan kimlik temizlenir', out[1].speakerId, '');
    eq('boş kimlik addan doldurulur', out[2].speakerId, 'a');

    const out2 = reconcile(speakers, [{ id: 'g', speaker: 'Yanlış ad', speakerId: 'b' }]);
    eq('ad listede yoksa kimliğin adı yazılır', out2[0].speaker, 'Konuşmacı 2');

    const out3 = reconcile(speakers, [{ id: 'g', speaker: 'Konuşmacı 1', _legacySpeaker: 'Konuşmacı 1' }]);
    eq('eski kayıt göçü korunur', [out3[0].speakerId, out3[0].speaker, out3[0]._legacySpeaker], ['a', 'Konuşmacı 1', undefined]);

    // normalizeMaterial aynı uzlaştırmayı uygular (dosya açılışında onarım).
    const nm = __schemaMod.normalizeMaterial({
      id: 'm1',
      speakers,
      segments: [{ id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Konuşmacı 2', speakerId: 'a' }]
    });
    const s2 = nm.speakers.find((x) => x.code === 'S2');
    const s1 = nm.speakers.find((x) => x.code === 'S1');
    eq('normalizeMaterial bayat kimliği onarır', nm.segments[0].speakerId, s2.id);
    eq('S1 bölüm sayısı 0 (çift sayım yok)', T.speakerSegments(nm, s1).length, 0);
    eq('S2 bölüm sayısı 1', T.speakerSegments(nm, s2).length, 1);
  }

  // "＋ Bölüm" mevcut konuşmacıyı kullanır ve kimliği yazar.
  eq('addManualSegment tanımlı', typeof T.addManualSegment, 'function');
  if (typeof T.addManualSegment === 'function') {
    const m = {
      id: 'mm', name: 'a.wav', durationSec: 30,
      speakers: [{ id: 'a', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'unspecified', gender: 'unspecified' }],
      segments: [], log: [], tech: {}
    };
    T.setAppState({ cases: [{ id: 'cc', materials: [m], report: {}, questions: [] }], activeCaseId: 'cc' });
    T.addManualSegment('mm');
    eq('yeni konuşmacı uydurulmaz', m.speakers.length, 1);
    eq('bölüm kimliği yazılır', m.segments[0].speakerId, 'a');
    eq('bölüm adı mevcut konuşmacı', m.segments[0].speaker, 'Kiracı');
    eq('ardışık eklemede de aynı konuşmacı', (T.addManualSegment('mm'), m.segments[1].speakerId), 'a');
    eq('konuşmacı sayısı değişmedi', m.speakers.length, 1);
  }

  // "＋ Yeni konuşmacı" aktif bölüme TEK KAPIDAN atar (ad + kimlik).
  eq('addSpeakerAndAssign tanımlı', typeof T.addSpeakerAndAssign, 'function');
  if (typeof T.addSpeakerAndAssign === 'function') {
    const m2 = {
      id: 'm2', name: 'b.wav',
      speakers: [{ id: 'a', code: 'S1', name: 'Konuşmacı 1', label: 'Konuşmacı 1', role: 'unspecified', gender: 'unspecified' }],
      segments: [{ id: 'g', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Konuşmacı 1', speakerId: 'a', review: 'pending' }],
      activeSeg: 0, log: []
    };
    const res = T.addSpeakerAndAssign(m2);
    eq('yeni konuşmacı eklendi', m2.speakers.length, 2);
    eq('aktif bölüm yeni kimliğe geçti', m2.segments[0].speakerId, res.rec.id);
    eq('eski konuşmacıda bölüm kalmadı', T.speakerSegments(m2, m2.speakers[0]).length, 0);
    eq('yeni konuşmacıda 1 bölüm', T.speakerSegments(m2, m2.speakers[1]).length, 1);
  }

  // Kaynak sözleşmesi: iki yazma noktası tek kapıyı kullanmalı.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('＋ konuşmacı doğrudan ad yazmaz', /segments\[idx\]\.speaker = rec\.name/.test(js), false);
  eq('tekil paket de normalize edilir (arşivle aynı sözleşme)', /const c = normalizeCase\(pack\.case\)/.test(js), true);
}


// [121] v2.275 — Silmede bellekteki medya kaynakları bırakılır.
// Ölçülen risk: kalıcı silmede ses blob'u IndexedDB'den gidiyor ama object URL
// iptal edilmiyordu; ses sayfa yenilenene kadar çalınabiliyor, kullanıcı
// "silinen kayıt geri geldi" sanıyordu. Aynı eksik "test dosyalarını kaldır"da
// da vardı. Üç silme yolu tek yardımcıyı kullanmalı.
{
  console.log('[121] Silmede medya temizliği (v2.275)');
  if (typeof T.resetDb === 'function') T.resetDb();
  eq('discardMaterialMedia tanımlı', typeof T.discardMaterialMedia, 'function');
  eq('purgeCaseMedia tanımlı', typeof T.purgeCaseMedia, 'function');

  if (typeof T.discardMaterialMedia === 'function') {
    const c = { id: 'cX', materials: [] };
    const m = { id: 'mX', name: 'a.wav' };
    c.materials.push(m);
    const key = T.blobKey(c, m);
    T.objectUrls.set(key, 'blob:fake-url');
    T.revoked.length = 0;
    let closed = false;
    T.audioGraphs.set(m.id, { ctx: { close() { closed = true; } }, gateTimer: null });
    await T.discardMaterialMedia(c, m);
    eq('object URL iptal edildi', T.revoked, ['blob:fake-url']);
    eq('objectUrls kaydı temizlendi', T.objectUrls.has(key), false);
    eq('AudioContext kapatıldı', closed, true);
    eq('audioGraphs kaydı temizlendi', T.audioGraphs.has(m.id), false);

    // Kayıt yoksa da patlamaz (idempotent).
    T.revoked.length = 0;
    await T.discardMaterialMedia(c, m);
    eq('ikinci çağrı güvenli', T.revoked, []);
  }

  if (typeof T.purgeCaseMedia === 'function') {
    const c = { id: 'cY', materials: [{ id: 'm1', name: 'a.wav' }, { id: 'm2', name: 'b.wav' }] };
    ['m1', 'm2'].forEach((id) => T.objectUrls.set(T.blobKey(c, { id }), 'blob:' + id));
    T.revoked.length = 0;
    await T.purgeCaseMedia(c);
    eq('dosyadaki tüm URL ler iptal edildi', T.revoked.sort(), ['blob:m1', 'blob:m2']);
    eq('objectUrls boş', T.objectUrls.has('cY::m1') || T.objectUrls.has('cY::m2'), false);
  }

  // Üç silme yolu aynı yardımcıyı kullanmalı (kopya temizlik kodu yasak).
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('kayıt kaldırma ortak yardımcıyı kullanır', /dataset\.removeAudio[\s\S]{0,600}discardMaterialMedia\(c, m\)/.test(js), true);
  eq('kalıcı silme ortak yardımcıyı kullanır', /async function purgeCaseById[\s\S]{0,2500}purgeCaseMedia\(c\)/.test(js), true);
  eq('test dosyası kaldırma ortak yardımcıyı kullanır', /async function removeSamples[\s\S]{0,1500}purgeCaseMedia\(c\)/.test(js), true);
}


// [122] v2.276 — Ölü kod temizliği.
// Ölçüm: v2.184'te birleşik durum satırına geçilince iki eski not üreticisi ve
// bir sayaç yardımcısı hiç çağrılmaz oldu (biri ham hex renk taşıyordu).
{
  console.log('[122] Ölü kod temizliği (v2.276)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('ölü tekrar notu kaldırıldı', /function repetitionNoteHtml/.test(js), false);
  eq('ölü sessizlik notu kaldırıldı', /function silenceNoteHtml/.test(js), false);
  eq('ölü undoDepth kaldırıldı', /function undoDepth/.test(js), false);
  // Yerine geçen tek kaynak duruyor olmalı (yanlışlıkla onu da silmeyelim).
  eq('durum satırı tek kaynağı yerinde', /function workChipsHtml|function segmentWorkSummary/.test(js), true);
}


// [123] v2.279 — Konuşmacı GÖMME (embedding) benzerliği.
// Ölçülen gerçek model: Xenova/wavlm-base-plus-sv (q8). Aynı konuşmacı
// çiftleri 0.963/0.917, farklı konuşmacılar 0.786/0.678/0.764/0.664.
// Eşikler bu ölçümden: SAME=0.88, DIFF=0.72; arası BELİRSİZ (işaretlenmez).
// Bu blok SAF matematiği sınar; model indirme/ağ gerektirmez.
{
  console.log('[123] Konuşmacı gömme benzerliği (v2.279)');
  for (const f of ['l2Normalize', 'cosineSimilarity', 'embeddingCentroid', 'speakerEmbeddingProfiles',
    'embeddingOutliers', 'embeddingChangeSuspects', 'embeddingSuggestions']) {
    eq(`${f} tanımlı`, typeof T[f], 'function');
  }
  if (typeof T.l2Normalize === 'function') {
    eq('birim vektör', T.l2Normalize([3, 4]).map((x) => +x.toFixed(3)), [0.6, 0.8]);
    eq('sıfIR vektör güvenli', T.l2Normalize([0, 0]), [0, 0]);
    eq('boş girdi güvenli', T.l2Normalize(null), []);
    near('aynı vektör kosinüs 1', T.cosineSimilarity([1, 2, 3], [1, 2, 3]), 1, 1e-9);
    near('dik vektör kosinüs 0', T.cosineSimilarity([1, 0], [0, 1]), 0, 1e-9);
    eq('boş kosinüs 0', T.cosineSimilarity([], [1]), 0);
    eq('sıfır vektör kosinüs 0', T.cosineSimilarity([0, 0], [1, 0]), 0);
    eq('merkez iki vektörün ortalaması (birim)', T.embeddingCentroid([[1, 0], [0, 1]]).map((x) => +x.toFixed(3)), [0.707, 0.707]);
    eq('boş merkez boş', T.embeddingCentroid([]), []);
  }
  eq('eşikler ölçümle tutarlı', T.VOICE_EMBED_SAME > T.VOICE_EMBED_DIFF, true);
  eq('model kimliği wavlm-sv', /wavlm-base-plus-sv/.test(T.VOICE_EMBED_MODEL), true);
  eq('model boyutu ~97 MB', T.VOICE_EMBED_BYTES > 90e6 && T.VOICE_EMBED_BYTES < 120e6, true);
  eq('gömme boyutu 512', T.VOICE_EMBED_DIM, 512);
  eq('örnekleme 16 kHz', T.VOICE_EMBED_SR, 16000);
  eq('pencere 5 sn', T.VOICE_EMBED_WINDOW_SEC, 5);
  eq('en kısa bölüm 1,2 sn', T.VOICE_EMBED_MIN_SEC, 1.2);

  if (typeof T.embeddingOutliers === 'function') {
    // 2B oyunca vektörler: A yönü [1,0], B yönü [0,1].
    const points = [
      { index: 0, speakerId: 'a', vec: [1, 0] },
      { index: 1, speakerId: 'a', vec: [0.97, 0.24] },
      { index: 2, speakerId: 'a', vec: [0.25, 0.97] }, // YANLIŞ atanmış (B gibi)
      { index: 3, speakerId: 'b', vec: [0.1, 0.995] },
      { index: 4, speakerId: 'b', vec: [0, 1] },
      { index: 5, speakerId: '', vec: [0.05, 0.999] } // atanmamış
    ];
    const profiles = T.speakerEmbeddingProfiles(points);
    eq('iki profil', profiles.length, 2);
    eq('profil sayıları', profiles.map((p) => p.speakerId + p.count).sort(), ['a3', 'b2']);
    const out = T.embeddingOutliers(points, profiles);
    eq('tek şüpheli', out.length, 1);
    eq('şüpheli bölüm indeksi', out[0].index, 2);
    eq('en yakın konuşmacı B', out[0].nearestSpeakerId, 'b');
    eq('kendi benzerliği düşük', out[0].ownSim < T.VOICE_EMBED_DIFF, true);
    eq('en yakın benzerliği yüksek', out[0].nearestSim >= T.VOICE_EMBED_SAME, true);

    // BELİRSİZ bölge işaretlenmez: kendi 0.80, en yakın diğer 0.80.
    const amb = [
      { index: 0, speakerId: 'a', vec: [1, 0] },
      { index: 1, speakerId: 'a', vec: [0.8, 0.6] },
      { index: 2, speakerId: 'a', vec: [0.8, 0.6] },
      { index: 3, speakerId: 'a', vec: [0.6, 0.8] },
      { index: 4, speakerId: 'b', vec: [0.8, 0.6] },
      { index: 5, speakerId: 'b', vec: [0.8, 0.6] }
    ];
    eq('belirsiz bölge işaretlenmez', T.embeddingOutliers(amb, T.speakerEmbeddingProfiles(amb)).length, 0);

    // Tek örnekli konuşmacı değerlendirilemez (leave-one-out yok).
    const single = [
      { index: 0, speakerId: 'a', vec: [1, 0] },
      { index: 1, speakerId: 'a', vec: [0.9, 0.1] },
      { index: 2, speakerId: 'b', vec: [0, 1] }
    ];
    eq('tek örneklite değerlendirme yok', T.embeddingOutliers(single, T.speakerEmbeddingProfiles(single)).length, 0);

    // Ardışık aynı konuşmacıda büyük sıçrama → değişim şüphesi.
    const seq = [
      { index: 0, speakerId: 'a', vec: [1, 0] },
      { index: 1, speakerId: 'a', vec: [0.2, 0.98] },
      { index: 2, speakerId: 'b', vec: [0.2, 0.98] }
    ];
    const ch = T.embeddingChangeSuspects(seq);
    eq('değişim şüphesi 1', ch.length, 1);
    eq('değişim komşu indeksleri', [ch[0].prevIndex, ch[0].index], [0, 1]);
    eq('farklı konuşmacı komşuluğu şüphe değil', T.embeddingChangeSuspects([
      { index: 0, speakerId: 'a', vec: [1, 0] },
      { index: 1, speakerId: 'b', vec: [0.2, 0.98] }
    ]).length, 0);

    // Atanmamış bölüm için ÖNERİ (işaret değil).
    const sug = T.embeddingSuggestions(points, profiles);
    eq('atanmamış için öneri', sug.length, 1);
    eq('öneri indeksi', sug[0].index, 5);
    eq('öneri konuşmacı B', sug[0].speakerId, 'b');
  }

  // Kaynak sözleşmesi: gömme ölçümü ATAMA YAPMAZ; düğme kullanıcıya açıktır.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const embStart = js.indexOf('async function measureSpeakerEmbeddings');
  eq('gömme ölçümü fonksiyonu var', embStart >= 0, true);
  const block = embStart >= 0 ? js.slice(embStart, embStart + 6000) : '';
  eq('gömme ölçümü bloğu okunur', block.length > 1000, true);
  eq('gömme ölçümü atama YAPMAZ', block.length > 1000 && !/setSegmentSpeakerByName\s*\(/.test(block), true);
  eq('gömme düğmesi var', /data-voice-embed/.test(js), true);
  eq('model indirme onayı sorulur', /askConfirm\(/.test(block), true);
  eq('konuşmacı yokken de gömme paneli çizilir', /Konuşmacı etiketi girilmedi[\s\S]{0,200}voiceEmbedPanelHtml\(m\)|voiceEmbedPanelHtml\(m\)[\s\S]{0,200}Konuşmacı etiketi girilmedi/.test(js), true);
}


// [124] v2.281 — Rapor sütunları: konuşmacı KOD ve ETİKET ayrı.
// Kullanıcı: "konuşmacı diye sütun belirlemişiz ama id/etiket diye
// ayrıştırmamışız; rapor alanlarında da sütunlarını eklememişiz."
{
  console.log('[124] Konuşmacı kodu/etiketi ayrı sütunlar (v2.281)');
  const S = __schemaMod;
  eq('kanıt sütunları kod+etiket ayrı', S.REPORT_COLUMN_TABLES.segments.join(','), 'time,speakerCode,speakerLabel,text,review,obs');
  eq('eski birleşik sütun etiketi yok', 'speaker' in S.REPORT_COLUMN_LABELS.segments, false);
  eq('konuşmacı tablosu sütunları', S.REPORT_COLUMN_TABLES.speakers.join(','), 'code,label,material,role,gender,age,pitch,parts');
  eq('süre tablosu sütunları', S.REPORT_COLUMN_TABLES.speakerDurations.join(','), 'code,label,material,chapters,duration,span');
  eq('kayıt tablosu sütunları', S.REPORT_COLUMN_TABLES.materialSpeakers.join(','), 'code,label,chapters,duration,span,person');
  eq('her tablonun görünen adı var', Object.keys(S.REPORT_COLUMN_TABLE_LABELS).length, Object.keys(S.REPORT_COLUMN_TABLES).length);

  // GÖÇ: eski "speaker" tercihi iki yeni sütuna taşınır (kapalı kalır).
  const mig = S.normalizeReportColumns({ segments: { speaker: false } });
  eq('göç: kod kapalı', mig.segments.speakerCode, false);
  eq('göç: etiket kapalı', mig.segments.speakerLabel, false);
  eq('göç: eski anahtar kalmadı', 'speaker' in mig.segments, false);
  const mig2 = S.normalizeReportColumns({ segments: { speakerCode: false } });
  eq('yalnız kod kapalıysa etiket açık', mig2.segments.speakerLabel, true);

  // Uygulama: üç tablo da kodu ve etiketi AYRI üretir.
  const m = {
    id: 'm1', name: 'a.wav',
    speakers: [{ id: 'a', code: 'S1', name: 'Kiracı', label: 'Kiracı', role: 'unspecified', gender: 'unspecified' }],
    segments: [{ id: 'g1', start: '00:00:00.000', end: '00:00:05.000', speaker: 'Kiracı', speakerId: 'a' }]
  };
  const c = { id: 'c1', materials: [m], speakers: [] };
  const cell = T.segSpeakerCells(m, m.segments[0]);
  eq('kanıt hücreleri ayrı', [cell.code, cell.label].join('|'), 'S1|Kiracı');
  eq('konuşmacı satırı kod+etiket', T.speakerRows(c)[0].slice(0, 2).join('|'), 'S1|Kiracı');
  eq('süre satırı kod+etiket', T.speakerDurationRows(c)[0].slice(0, 2).join('|'), 'S1|Kiracı');
  const mt = T.materialSpeakerRows(c, m);
  eq('kayıt tablosu başlıkları', mt.headers.slice(0, 2).join('|'), 'KOD|ETİKET');
  eq('kayıt tablosu anahtarları', mt.keys.join(','), 'code,label,chapters,duration,span');

  // Kişi bağı olmayan kayıtta "DOSYALAR ARASI KİŞİ" sütunu istenmez.
  eq('kişi sütunu anahtarı koşullu', mt.keys.includes('person'), false);
}


// [125] v2.283 — Rapor bütünlüğü: numara boşluğu, atanmamış bölüm, KAYIT sütunu.
// Kullanıcının gerçek raporunda ölçüldü: numaralar 1,2,3,4,5,**7** (6 yok),
// 68 bölümlük kayıtta konuşmacı tablosu yalnız 13 bölüm gösteriyordu.
{
  console.log('[125] Rapor bütünlüğü (v2.283)');
  const base = T.emptyCaseForTest({ id: 'c1' });
  const map = T.reportNumberMap(base);
  eq('soru yok: answers numara almaz', map.answers, undefined);
  eq('soru yok: annex son numara', map.annex, Math.max(...Object.values(map)));
  const nums = Object.values(map).sort((a, b) => a - b);
  eq('numaralar bitişik (1..N)', nums.every((n, i) => n === i + 1), true);

  const seg = (o) => Object.assign({ id: 'g1', start: '00:00:00.000', end: '00:00:05.000', text: 'x', review: 'pending' }, o);
  const m = {
    id: 'm1', name: 'a.wav', duration: 20, sha256: 'a'.repeat(64),
    speakers: [{ id: 'a', code: 'S1', name: 'Kiracı', label: 'Kiracı' }],
    segments: [seg({ id: 'g1', speaker: 'Kiracı', speakerId: 'a' }), seg({ id: 'g2', speaker: '', speakerId: '' })],
    log: []
  };
  const c = { id: 'c', materials: [m], speakers: [] };
  const t = T.materialSpeakerRows(c, m);
  eq('atanmamış satırı var', t.rows.some((r) => r[1] === 'Konuşmacı belirtilmedi'), true);
  eq('atanmamış bölüm sayısı', t.rows.find((r) => r[1] === 'Konuşmacı belirtilmedi')[2], '1 bölüm');
  eq('konuşmacı satırı KAYIT taşır', T.speakerRows(c)[0][2], 'a.wav');
  eq('süre satırı KAYIT taşır', T.speakerDurationRows(c)[0][2], 'a.wav');
  const rs = T.reviewSummaryRows(c);
  eq('özet: atanmamış bölüm satırı', rs.find((r) => r[0] === T.REPORT_TEXT.rsUnassignedSegs)[1], 1);
  eq('özet: etiket (kayıt içi)', T.REPORT_TEXT.rsSpeaker, 'Konuşmacı etiketi (kayıt içi)');

  eq('decodeErrorText tanımlı', typeof T.decodeErrorText, 'function');
  if (typeof T.decodeErrorText === 'function') {
    eq('İngilizce çözme hatası Türkçeleşir', /Ses verisi çözümlenemedi/.test(T.decodeErrorText({ message: 'Unable to decode audio data' })), true);
    eq('bilinmeyen hata metni korunur', T.decodeErrorText({ message: 'başka' }), 'başka');
  }
  eq('unassignedSegments tanımlı', typeof T.unassignedSegments, 'function');
  if (typeof T.unassignedSegments === 'function') eq('unassigned sayısı', T.unassignedSegments(m).length, 1);

  // Üç çıktıda "bilinmiyor" süre dili TEK: en az 3 yerde matDuration koşulu.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('üç çıktıda süre "Bilinmiyor" koşulu', (js.match(/matDuration\(m\) \? fmtTime\(matDuration\(m\)\) : 'Bilinmiyor'/g) || []).length >= 3, true);
}


// [126] v2.284 — Numaralandırma aç/kapa + Git sekme geçişi + kayıt altı etiketleri.
{
  console.log('[126] Numaralandırma kipi ve Git (v2.284)');
  const S = __schemaMod;
  const c0 = T.emptyCaseForTest({ id: 'cN0' });
  eq('varsayılan numaralandırma auto', c0.report.numbering, 'auto');
  eq('numaralandırma none korunur', S.normalizeCase({ report: { numbering: 'none' } }).report.numbering, 'none');
  eq('bilinmeyen kip auto olur', S.normalizeCase({ report: { numbering: 'x' } }).report.numbering, 'auto');
  eq('reportNumbering tanımlı', typeof T.reportNumbering, 'function');

  const auto = T.emptyCaseForTest({ id: 'cN1' });
  eq('auto: başlık numaralı', T.reportHeadingText(auto, 's1'), '1. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI');
  eq('auto: TOC köken numaralı', T.reportTocEntries(auto).some((x) => x.startsWith('4. KAYIT KÖKENİ')), true);
  const none = T.emptyCaseForTest({ id: 'cN2', report: { numbering: 'none' } });
  eq('none: başlık numarasız', T.reportHeadingText(none, 's1'), 'İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI');
  eq('none: TOC numarasız ve işaretsiz', T.reportTocEntries(none).some((x) => x.startsWith('1.') || x.startsWith('–')), false);

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('numaralandırma anahtarı arayüzde', /reportNumberingToggle/.test(js), true);
  eq('Git sekme geçişi tek kapı', /function goToSegment\(/.test(js) && (js.match(/goToSegment\(/g) || []).length >= 3, true);
  eq('Git önce Deşifre sekmesine geçer', /function goToSegment[\s\S]{0,600}\|transcript/.test(js), true);
  eq('kayıt altı konuşmacı etiketi var', /recordSpeakersHeading/.test(js), true);
  eq('kayıt altı deşifre etiketi var', /recordTranscriptHeading/.test(js), true);
  eq('s5 girişi bir kez (üç çıktı)', (js.match(/REPORT_TEXT\.s5Intro/g) || []).length >= 3, true);
}

// [127] v2.285 — Başlık düzenleme + numara biçimi (auto/letters/none) +
// alt başlık tutarlılığı. Ölçülen hata: numaralar kapalıyken h3 numarasız
// kalıyor ama h4 hâlâ "5.1." yazıyordu (gerçek tarayıcıda ölçüldü).
{
  console.log('[127] Başlık düzenleme ve numara biçimi (v2.285)');
  const S = __schemaMod;
  eq('letters kipi şemada', S.REPORT_NUMBERING.includes('letters'), true);
  eq('letters normalize korunur', S.normalizeCase({ report: { numbering: 'letters' } }).report.numbering, 'letters');
  eq('bilinmeyen kip auto olur', S.normalizeCase({ report: { numbering: 'zzz' } }).report.numbering, 'auto');

  const t = S.normalizeReportTitles({ s1: '  Özel Başlık  ', yok: 'x', s2: '   ', s3: 'a'.repeat(200) });
  eq('başlık kırpılır', t.s1, 'Özel Başlık');
  eq('bilinmeyen başlık atılır', 'yok' in t, false);
  eq('boş başlık atılır', 's2' in t, false);
  eq('başlık uzunluğu sınırlı', t.s3.length, 160);
  eq('emptyCase.titles boş', Object.keys(T.emptyCaseForTest({ id: 'cT0' }).report.titles).length, 0);

  const c = T.emptyCaseForTest({ id: 'cT1', report: { numbering: 'letters', titles: { s1: 'ÖZEL KONU' } } });
  eq('özel başlık okunur', T.reportSectionTitle(c, 's1'), 'ÖZEL KONU');
  eq('harf numarası A', T.reportHeadingText(c, 's1'), 'A. ÖZEL KONU');
  eq('ikinci ana bölüm B', T.reportHeadingText(c, 's2'), 'B. BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR');
  eq('iskelet etiketi özel başlık', T.reportUiLabel(c, 's1'), 'A · ÖZEL KONU');
  eq('TOC harf numarası taşır', T.reportTocEntries(c).some((x) => x.startsWith('A. ÖZEL KONU')), true);
  eq('alt başlık harf kipinde', T.reportSubHeadings(c).s51, 'G.1. Ses kayıtlarının çözümlenmesi');
  eq('kayıt öneki harf kipinde', T.reportSubHeadings(c).recordPrefix(0), 'G.1.1.');

  const cn = T.emptyCaseForTest({ id: 'cT2', report: { numbering: 'none' } });
  eq('numarasız başlık', T.reportHeadingText(cn, 's1'), 'İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI');
  eq('numarasız alt başlık', T.reportSubHeadings(cn).s51, 'Ses kayıtlarının çözümlenmesi');
  eq('numarasız kayıt öneki', T.reportSubHeadings(cn).recordPrefix(0), '1.');
  eq('iskelet numarasız', T.reportUiLabel(cn, 's1'), 'Konu, kapsam ve sınırlar');

  // s5 kapalıysa alt başlık numara UYDURMAZ (eski kod "5.1" yazıyordu).
  const cc = T.emptyCaseForTest({ id: 'cT3', report: { sections: { s5: false } } });
  eq('s5 kapalı: alt başlık numarasız', T.reportSubHeadings(cc).s51, 'Ses kayıtlarının çözümlenmesi');

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const schemaSrc = fs.readFileSync(path.join(ROOT, 'assets/schema.js'), 'utf8');
  eq('numara seçici select', /<select id="reportNumberingToggle"/.test(html), true);
  eq('üç numara kipi seçenekte', /value="auto"/.test(html) && /value="letters"/.test(html) && /value="none"/.test(html), true);
  eq('iskelette başlık kalemi', /data-report-title="\$\{esc\(key\)\}"/.test(js), true);
  eq('başlık düzenleme tek kapı', /function setReportSectionTitle\(/.test(js), true);
  eq('titles normalize edilir', /titles: normalizeReportTitles\(report\.titles\)/.test(schemaSrc), true);
}

// [128] v2.286 — Hazır profil düğmeleri kaldırıldı; tanımlar geri uyum için
// şemada kalır. Varsayılan bölüm kümesi DEĞİŞMEZ (mevcut raporlar bozulmaz).
{
  console.log('[128] Hazır profil düğmeleri kaldırıldı (v2.286)');
  const S = __schemaMod;
  eq('profil tanımları korunur', S.REPORT_PRESET_DEFS.length, 4);
  eq(
    'standart = varsayılan bölüm kümesi',
    JSON.stringify(S.reportSectionsForPreset('standard')),
    JSON.stringify(S.emptyReportSections())
  );
  eq('56.12 profili sıra yazar (şemada)', Array.isArray(S.reportPresetLayout('sablon').order), true);
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const layer = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('arayüzde hazır profil düğmesi yok', /data-report-preset/.test(js), false);
  eq('profil tıklama işleyicisi yok', /reportPresetLayout\(preset/.test(js), false);
  eq('profil satırı stili yok', /\.rsec-presets\s*\{/.test(layer), false);
}

// [129] v2.287 — Serbest rapor blokları: başlık + metin, `free:<id>` sırası,
// boş blok rapora girmez, birleştirme sessizce ezmez.
{
  console.log('[129] Serbest rapor blokları (v2.287)');
  const S = __schemaMod;
  eq('free anahtarı tanınır', S.isFreeBlockKey('free:fb_1'), true);
  eq('normal anahtar free değil', S.isFreeBlockKey('s1'), false);
  const nb = S.normalizeReportBlocks([
    { id: 'b1', title: '  Ek not  ', text: 'satır1\nsatır2', on: false },
    { id: 'b1', title: 'yinelenen' },
    { id: '', title: 'kimliksiz' },
    null
  ]);
  eq('blok normalize: tek kayıt', nb.length, 1);
  eq('başlık kırpılır', nb[0].title, 'Ek not');
  eq('metin korunur', nb[0].text, 'satır1\nsatır2');
  eq('on korunur', nb[0].on, false);
  const order = S.ensureFreeBlockOrder(['s1', 's5', 'free:old', 's6', 'annex'], nb);
  eq('yetim free anahtarı düşer', order.includes('free:old'), false);
  eq('blok s6 (sonuç) öncesine girer', order.indexOf('free:b1') < order.indexOf('s6'), true);

  const c = T.emptyCaseForTest({
    id: 'cB1',
    report: {
      blocks: [{ id: 'b1', title: 'UZMAN NOTU', text: 'gözlem metni' }],
      layout: { order: ['s1', 's5', 'free:b1', 's6', 'annex'] }
    }
  });
  eq('blok gövde sırasında', T.reportBodyOrder(c).includes('free:b1'), true);
  eq('blok başlığı numaralı', T.reportHeadingText(c, 'free:b1'), '10. UZMAN NOTU');
  eq('blok TOC numaralı', T.reportTocEntries(c).includes('10. UZMAN NOTU'), true);
  eq('blok çizilir', T.reportBlockRenders(c, 'free:b1'), true);
  eq('revizyon blok taşır', T.reportSnapshot(c).blocks.length, 1);

  const cEmpty = T.emptyCaseForTest({ id: 'cB2', report: { blocks: [{ id: 'b1', title: 'BOŞ', text: '' }] } });
  eq('boş blok rapora girmez', T.reportBlockRenders(cEmpty, 'free:b1'), false);

  const m = T.mergeCasesForTest(
    S.normalizeCase({ id: 'm', report: { blocks: [{ id: 'b1', title: 'A', text: 'bir' }] } }),
    S.normalizeCase({ id: 'm', report: { blocks: [{ id: 'b1', title: 'B', text: 'iki' }, { id: 'b2', title: 'Yeni', text: 'üç' }] } })
  );
  eq('birleştirme yeni bloğu ekler', m.merged.report.blocks.length, 2);
  eq('birleştirme farklı bloğu ezmez', m.merged.report.blocks.find((b) => b.id === 'b1').title, 'A');
  eq('birleştirme çakışma bildirir', m.conflicts.some((x) => x.kind === 'report-block'), true);
}

// [130] v2.288 — Kullanıcı rapor profilleri: yalnız düzen, kanıt/metin yok;
// ad zorunlu, kimlik tekil, en çok 20; birleştirme profili ekler.
{
  console.log('[130] Kullanıcı rapor profilleri (v2.288)');
  const S = __schemaMod;
  const p = S.normalizeReportProfiles([
    {
      id: 'p1',
      name: '  Kısa  ',
      sections: { s1: false },
      order: ['s2', 's1'],
      titles: { s1: 'X' },
      numbering: 'letters',
      columns: { segments: { text: false } },
      blocks: [{ id: 'b1', title: 'SIZAN', text: 'metin' }]
    },
    { id: 'p1', name: 'yinelenen' },
    { id: '', name: 'kimliksiz' },
    { id: 'p2', name: '   ' },
    null
  ]);
  eq('profil normalize: tek kayıt', p.length, 1);
  eq('profil adı kırpılır', p[0].name, 'Kısa');
  eq('bölüm görünürlüğü korunur', p[0].sections.s1, false);
  eq('sıra normalize edilir (s1 sonda)', p[0].order.indexOf('s1') > p[0].order.indexOf('s2'), true);
  eq('başlık korunur', p[0].titles.s1, 'X');
  eq('numara biçimi korunur', p[0].numbering, 'letters');
  eq('tablo alanı tercihi korunur', p[0].columns.segments.text, false);
  eq('profil blok/metin taşımaz', 'blocks' in p[0], false);
  eq('emptyCase profilsiz', S.emptyCase().report.userProfiles.length, 0);
  eq(
    'profil sayısı 20 ile sınırlı',
    S.normalizeReportProfiles(Array.from({ length: 25 }, (_, i) => ({ id: 'p' + i, name: 'P' + i }))).length,
    20
  );

  const m = T.mergeCasesForTest(
    S.normalizeCase({ id: 'm', report: { userProfiles: [{ id: 'p1', name: 'A' }] } }),
    S.normalizeCase({ id: 'm', report: { userProfiles: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] } })
  );
  eq('birleştirme yeni profili ekler', m.merged.report.userProfiles.length, 2);

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  eq('profil kaydet düğmesi var', /data-report-profile-save/.test(js), true);
  eq('profil uygula/sil düğmeleri var', /data-report-profile-apply/.test(js) && /data-report-profile-del/.test(js), true);
  eq('profil adı diyaloğu var', /id="profileDialog"/.test(html) && /id="profileName"/.test(html), true);
  eq('profil adı sorulur', /function askProfileName\(/.test(js), true);
}


// [131] v2.289 — Tüm çizilen bölümler numaralı; veri yoksa NEDENİ söylenir.
{
  console.log('[131] Tüm bölümler numaralı + veri yok nedeni (v2.289)');
  const c = T.emptyCaseForTest({ id: 'cE1' });
  eq('WER açık ama veri yok', T.reportBlockRenders(c, 'wer'), false);
  eq('WER nedeni referans ister', /referans/.test(T.reportBlockEmptyReason(c, 'wer')), true);
  const cOff = T.emptyCaseForTest({ id: 'cE2', report: { sections: { wer: false } } });
  eq('kapalı bölümün nedeni boş', T.reportBlockEmptyReason(cOff, 'wer'), '');
  const map = T.reportNumberMap(c);
  const nums = Object.values(map).sort((a, b) => a - b);
  eq('tüm çizilen bölümler bitişik numaralı', nums.every((n, i) => n === i + 1), true);
  eq('köken bölümü de numaralı', typeof map.origin, 'number');
  eq('TOC "–" alt blok işareti taşımaz', T.reportTocEntries(c).some((x) => x.startsWith('–')), false);
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('iskelette "veri yok" rozeti var', /rsec-nodata/.test(js), true);
  eq('açma anında neden söylenir', /reportBlockEmptyReason\(c, key\)/.test(js), true);
}


// [132] v2.290 — Tek EKLER bölümü: boş "EK LİSTESİ" varsayılan kapalı,
// asıl EKLER (annex) açık; eski s7 tercihi annex'e taşınır.
{
  console.log('[132] Tek EKLER bölümü (v2.290)');
  const S = __schemaMod;
  eq('varsayılan EKLER açık', S.emptyReportSections().annex, true);
  eq('boş EK LİSTESİ kapalı', S.emptyReportSections().s7, false);
  const c = T.emptyCaseForTest({ id: 'cA1' });
  eq('EKLER numara alır', typeof T.reportNumberMap(c).annex, 'number');
  eq('EK LİSTESİ numara almaz', T.reportNumberMap(c).s7, undefined);
  const mig = S.normalizeCase({ id: 'm1', report: { sections: { s7: true } } });
  eq('göç: s7 açık → annex açık', mig.report.sections.annex, true);
  eq('göç: s7 kapanır', mig.report.sections.s7, false);
  const mig2 = S.normalizeCase({ id: 'm2', report: { sections: { s7: false } } });
  eq('göç: s7 kapalı annex’i kapatmaz', mig2.report.sections.annex, true);
  eq('ek listesi başlıkları', T.reportAttachmentLines(c).length > 0, true);
}


// [133] v2.291 — Bölümü EKLER altına taşıma: gövdeden çıkar, EK-N olarak basılır.
{
  console.log('[133] Bölümü EK altına taşıma (v2.291)');
  const S = __schemaMod;
  eq('s5 taşınabilir', S.isAnnexPlaceable('s5'), true);
  eq('annex taşınamaz', S.isAnnexPlaceable('annex'), false);
  const ap = S.normalizeAnnexPlacement({ s5: true, annex: true, yok: true, s1: false });
  eq('yalnız geçerli taşıma kalır', Object.keys(ap).join(','), 's5');
  const c = T.emptyCaseForTest({ id: 'cP1', report: { annexPlacement: { s5: true } } });
  eq('gövde sırası s5 içermez', T.reportBodyOrder(c).includes('s5'), false);
  eq('taşınan s5 listelenir', T.reportMovedSections(c).includes('s5'), true);
  const moved = T.reportAnnexList(c).find((a) => a.movedKey === 's5');
  eq('taşınan EK başlığı', moved && moved.heading.startsWith('EK-7. '), true);
  eq('annex blok türü moved', T.reportAnnexBlocks(c).find((b) => b.kind === 'moved')?.sectionKey, 's5');
  eq('revizyon yerleşimi taşır', T.reportSnapshot(c).annexPlacement.s5, true);
}


// [134] v2.292 — Atanmamış bölüm kümeleme: eşik üstü gruplar; atama yapmaz.
{
  console.log('[134] Konuşmacı gömme kümeleme (v2.292)');
  const S = __schemaMod;
  const pts = [
    { index: 0, vec: [1, 0, 0] },
    { index: 1, vec: [0.99, 0.1, 0] },
    { index: 2, vec: [0, 1, 0] },
    { index: 3, vec: [0.1, 0.99, 0] },
    { index: 4, vec: [0, 0, 1] }
  ];
  const cl = S.embeddingClusters(pts, { threshold: 0.9, minSize: 2 });
  eq('iki benzer grup', cl.length, 2);
  eq('grup A indeksleri', cl[0].indexes.join(','), '0,1');
  eq('grup B indeksleri', cl[1].indexes.join(','), '2,3');
  eq('tek bölüm grup olmaz', cl.some((c) => c.indexes.includes(4)), false);
  eq('minSize 3 → grup yok', S.embeddingClusters(pts, { threshold: 0.9, minSize: 3 }).length, 0);
  eq('eşik düşük → tek grup', S.embeddingClusters(pts, { threshold: 0.1, minSize: 2 }).length, 1);
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('grup Git düğmesi var', /data-voice-cluster-goto/.test(js), true);
  eq('grup Ata düğmesi var', /data-voice-cluster-assign/.test(js), true);
  eq('atama tek kapıdan', /assignEmbeddingCluster[\s\S]{0,1200}setSegmentSpeakerByName\(m, sg, sp\.name\)/.test(js), true);
  eq('atama günlüğe yazılır', /speaker-cluster-assign/.test(js), true);
}


// [135] v2.293 — Dosyalar arası kişiler Dosya bilgileri çekmecesinde.
{
  console.log('[135] Kişiler paneli dosya çekmecesinde (v2.293)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  eq('çekmecede kişi paneli', /id="casePersonsPanel"/.test(html), true);
  eq('kişi ekleme düğmesi yeni panelde', /data-add-case-person/.test(js), true);
  eq('kişi alanı güncellenir', /function updateCasePerson\(/.test(js), true);
  eq('kişi silme onay ister', /async function deleteCasePerson[\s\S]{0,800}askConfirm/.test(js), true);
  eq('çekmece paneli çizilir', /function renderCasePersons\(/.test(js) && /renderCasePersons\(\);/.test(js), true);
  eq('eski analiz paneli kaldırıldı', /personBlock\}\$\{voiceEmbedPanelHtml/.test(js), false);
}


// [136] v2.295 — Tablo sütun başlığı düzenleme; veri değişmez, üç çıktı ortak.
{
  console.log('[136] Sütun başlığı düzenleme (v2.295)');
  const S = __schemaMod;
  const lab = S.normalizeReportLabels({ segments: { text: '  KONUŞMA METNİ  ', yok: 'X' }, bilinmeyen: { a: 'b' } });
  eq('bilinen tablo korunur', lab.segments.text, 'KONUŞMA METNİ');
  eq('bilinmeyen sütun atılır', 'yok' in lab.segments, false);
  eq('bilinmeyen tablo atılır', 'bilinmeyen' in lab, false);
  const c = T.emptyCaseForTest({ id: 'cL1', report: { labels: { segments: { text: 'KONUŞMA METNİ' } } } });
  const t = T.reportTableColumns(
    c,
    'segments',
    ['ZAMAN ARALIĞI', 'KONUŞMACI KODU', 'KONUŞMACI ETİKETİ', 'ÇÖZÜMLENEN KONUŞMA', 'KONTROL DURUMU', 'GÖZLEM'],
    [['a', 'b', 'c', 'd', 'e', 'f']]
  );
  eq('başlık geçersiz kılınır', t.headers[3], 'KONUŞMA METNİ');
  eq('diğer başlık varsayılan', t.headers[0], 'ZAMAN ARALIĞI');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('panelde başlık girişi var', /data-rcol-label-key/.test(js), true);
  eq('başlık normalize edilir', /normalizeReportLabels\(c\.report\.labels\)/.test(js), true);
}


// [137] v2.296 — Sürükle-bırak: anahtar hedef konuma taşınır; ↑↓ korunur.
{
  console.log('[137] Sürükle-bırak sıralama (v2.296)');
  const M = __reportModelMod;
  eq('aşağı taşı', M.moveKeyTo(['a', 'b', 'c', 'd'], 'a', 'c').join(','), 'b,c,a,d');
  eq('yukarı taşı', M.moveKeyTo(['a', 'b', 'c', 'd'], 'd', 'b').join(','), 'a,d,b,c');
  eq('aynı anahtar değişmez', M.moveKeyTo(['a', 'b'], 'a', 'a').join(','), 'a,b');
  eq('bilinmeyen anahtar değişmez', M.moveKeyTo(['a', 'b'], 'x', 'a').join(','), 'a,b');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('sürükleme tutamacı verisi', /data-drag-kind/.test(js) && /data-drag-key/.test(js), true);
  eq('sürükleme hedefi vurgulanır', /drag-over/.test(js), true);
  eq('↑↓ düğmeleri korunur', /data-report-move=/.test(js), true);
  eq('filtreli listede sürükleme kapalı', /const canDrag = !reportOutlineState\.q/.test(js), true);
}


// [138] v2.297 — Bölüm ağacı: sınırsız alt bölüm, 1.1 / A.1 numara, DFS sıra.
{
  console.log('[138] Bölüm ağacı ve alt numaralar (v2.297)');
  const S = __schemaMod;
  const c = T.emptyCaseForTest({
    id: 'cTree',
    report: { layout: { order: ['s1', 's2', 's3'], parent: { s2: 's1' } } }
  });
  const nl = S.normalizeReportLayout({ order: ['s1', 's2', 's3'], parent: { s2: 's1' } });
  eq('parent korunur', nl.parent.s2, 's1');
  eq('DFS sıra (ilk üç)', nl.order.slice(0, 3).join(','), 's1,s2,s3');
  eq('alt bölüm numarası 1.1', T.reportHeadingText(c, 's2'), '1.1. BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR');
  eq('sonraki kök 2', T.reportHeadingText(c, 's3'), '2. BİLİRKİŞİDEN GÖZLEMLENMESİ VE İNCELENMESİ İSTENEN MADDİ UNSURLAR');
  eq('TOC alt numarayı taşır', T.reportTocEntries(c).some((x) => x.startsWith('1.1. ')), true);
  const cyc = S.normalizeReportLayout({ order: ['s1', 's2'], parent: { s1: 's2', s2: 's1' } });
  eq('döngü temizlenir', !cyc.parent.s1 || !cyc.parent.s2, true);
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('altına bırakma bölgesi', /drop-under/.test(js), true);
  eq('göreli taşıma var', /function moveSectionRelative\(/.test(js), true);
  eq('girinti derinliğe bağlı', /--depth:/.test(js), true);
}


// [139] v2.298 — EKLER de bir grup olarak başka bölümün altına taşınabilir.
{
  console.log('[139] EKLER grubu alt bölüm olabilir (v2.298)');
  const c = T.emptyCaseForTest({
    id: 'cAnnexTree',
    report: { layout: { order: ['s1', 's2', 'annex'], parent: { annex: 's1' } } }
  });
  eq('EKLER gövde sırasında', T.reportBodyOrder(c).includes('annex'), true);
  eq('EKLER alt bölüm numarası', T.reportHeadingText(c, 'annex'), '1.1. EKLER');
  eq('TOC alt bölümü taşır', T.reportTocEntries(c).some((x) => x.startsWith('1.1. EKLER')), true);
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('EKLER hedefi yalnız sıra alır', /isAnnexTarget/.test(js), true);
  eq('iç EKLER sayfa sonu zorlamaz', /key === 'annex' && reportSectionDepth\(c, key\) === 0/.test(js), true);
}


// [140] v2.299 — ↑↓ ağaçta düğümü ALT AĞACIYLA kardeşleri arasında taşır.
// Eski düz `moveInList` yalnız tek anahtarı kaydırıyordu; normalize DFS sırasını
// yeniden kurduğu için ebeveyn/ilk-çocuk taşımaları SESSİZCE geri alınıyordu.
{
  console.log('[140] ↑↓ ağaç sıralaması (v2.299)');
  const M = __reportModelMod;
  const order = ['s1', 's2', 's4', 's3'];
  const parent = { s2: 's1', s4: 's1' };
  eq('↓ ebeveyn kardeşinin altına iner', M.moveTreeBlock(order, parent, 's1', 1).join(','), 's3,s1,s2,s4');
  eq('↑ kök kardeşinin üstüne çıkar', M.moveTreeBlock(order, parent, 's3', -1).join(','), 's3,s1,s2,s4');
  eq('↓ alt bölüm kardeşiyle yer değiştirir', M.moveTreeBlock(order, parent, 's2', 1).join(','), 's1,s4,s2,s3');
  eq('↑ ilk alt bölüm değişmez (üst komşu yok)', M.moveTreeBlock(order, parent, 's2', -1).join(','), 's1,s2,s4,s3');
  eq('↓ son alt bölüm değişmez (alt komşu yok)', M.moveTreeBlock(order, parent, 's4', 1).join(','), 's1,s2,s4,s3');
  eq('bilinmeyen anahtar değişmez', M.moveTreeBlock(order, parent, 'zz', 1).join(','), 's1,s2,s4,s3');
  eq('dir=0 değişmez', M.moveTreeBlock(order, parent, 's1', 0).join(','), 's1,s2,s4,s3');
  // Alt ağaç birlikte taşınır: s4, s2'nin çocuğu iken s1 aşağı inince s2+s4 birlikte.
  eq('alt ağaç birlikte taşınır', M.moveTreeBlock(['s1', 's2', 's4', 's3'], { s2: 's1', s4: 's2' }, 's1', 1).join(','), 's3,s1,s2,s4');
  // Düz liste davranışı eskisiyle aynı (geriye uyum).
  eq('düz liste ↓', M.moveTreeBlock(['a', 'b', 'c'], {}, 'a', 1).join(','), 'b,a,c');
  eq('düz liste ↑', M.moveTreeBlock(['a', 'b', 'c'], {}, 'c', -1).join(','), 'a,c,b');
  // DFS korunur: `moveTreeBlock` çıktısı GEÇERLİ bir DFS sırasıdır (ebeveyn
  // çocuğundan önce, alt ağaç bitişik). `normalizeReportLayout` yalnız DFS'e
  // göre yeniden sıraladığı için bu sırayı ARTIK geri almaz — eski düz taşımanın
  // sessizce yok olmasının nedeni buydu.
  const posOf = (arr) => Object.fromEntries(arr.map((k, i) => [k, i]));
  const validDfs = (arr) => {
    const pos = posOf(arr);
    const par = parent;
    for (const k of arr) {
      const p = par[k];
      if (p && !(p in pos && pos[p] < pos[k])) return false;
    }
    const subtree = (root) => {
      const set = new Set();
      const st = [root];
      while (st.length) {
        const x = st.pop();
        if (set.has(x)) continue;
        set.add(x);
        for (const y of arr) if (par[y] === x) st.push(y);
      }
      return [...set].map((k) => pos[k]).sort((a, b) => a - b);
    };
    for (const k of arr) {
      const idx = subtree(k);
      if (idx[idx.length - 1] - idx[0] !== idx.length - 1) return false;
    }
    return true;
  };
  const moved = M.moveTreeBlock(order, parent, 's1', 1);
  eq('taşıma sonrası geçerli DFS', validDfs(moved), true);
  eq('taşıma gerçekten değişti (eski hata: değişmezdi)', moved.join(',') !== order.join(','), true);
  // Uygulama yolu gerçekten yeni fonksiyonu kullanır (sessiz geri dönüş yok).
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('↑↓ ağaç taşıma kullanır', /moveTreeBlock\(l\.order/.test(js), true);
  eq('komşu yoksa sessiz kalmaz (toast)', /taşınacağı komşusu yok/.test(js), true);
}

// [141] v2.300 — Soru dayanağı: bölümlere bağlama + zaman damgalı rapor metni.
// Şema `question.evidence` alanı tanımlıydı ama HİÇBİR yerde okunmuyordu (ölü
// alan); rapor eski serbest `q.basis` alanını kullanıyordu. Artık ikisi tek
// kaynakta birleşir ve üç çıktı aynı "Dayanak" metnini üretir.
{
  console.log('[141] Soru dayanağı (v2.300)');
  const S = __schemaMod;
  const c = T.emptyCaseForTest({
    id: 'cEv',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        segments: [
          { id: 'sg1', start: '00:00:00.000', end: '00:00:05.000', text: 'merhaba dünya nasılsın' },
          { id: 'sg2', start: '00:00:05.000', end: '00:00:09.000', text: 'ikinci bölüm metni' }
        ]
      }
    ]
  });
  const q = {
    evidence: [
      { materialId: 'm1', segmentId: 'sg1', note: '' },
      { materialId: 'm1', segmentId: 'yok', note: '' }, // segment yok → atlanır
      { materialId: 'zzz', segmentId: 'sg2', note: '' } // kayıt yok → atlanır
    ]
  };
  const rows = S.questionEvidenceRows(c, q);
  eq('çözülen dayanak sayısı (dangling atlanır)', rows.length, 1);
  eq('dayanak kayıt adı', rows[0].material, 'a.wav');
  eq('dayanak zaman aralığı', rows[0].range, '00:00:00.000 – 00:00:05.000');
  eq('dayanak metni', rows[0].text, 'merhaba dünya nasılsın');
  eq('dayanak yoksa boş', S.questionEvidenceRows(c, { evidence: [] }).length, 0);
  eq('evidence yoksa boş', S.questionEvidenceRows(c, {}).length, 0);

  // Rapor metni: serbest not + zaman damgalı alıntı TEK kaynak (questionBasisText).
  const txt = T.questionBasisText(c, { basisNote: 'Kayıt a.wav', evidence: q.evidence });
  eq('rapor dayanağı notu içerir', txt.includes('Kayıt a.wav'), true);
  eq('rapor dayanağı kayıt+zaman içerir', txt.includes('a.wav · 00:00:00.000 – 00:00:05.000'), true);
  eq('rapor dayanağı alıntı içerir', txt.includes('“merhaba dünya nasılsın”'), true);
  eq('boş dayanak varsayılana düşer', T.questionBasisText(c, { evidence: [] }), 'Belirtilmemiş');

  // Tek kaynak: eski serbest `basis` alanı `basisNote`a göçer, kaybolmaz.
  eq('basis → basisNote göçü', S.normalizeQuestion({ basis: 'eski metin' }).basisNote, 'eski metin');

  // Üç çıktı (HTML/DOCX/UDF) AYNI yardımcıyı kullanır; eski q.basis okuması kalmadı.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('üç çıktı questionBasisText kullanır', (js.match(/questionBasisText\(c, q\)/g) || []).length >= 3, true);
  eq('eski q.basis rapor okuması kalmadı', /q\.basis \|\| REPORT_TEXT\.defaultBasis/.test(js), false);
  eq('soru kartı basisNote yazar', /data-k="basisNote"/.test(js), true);
  eq('evidence UI (ekle/kaldır) var', /data-q-ev-add/.test(js) && /data-q-ev-del/.test(js), true);
}

// [142] v2.301 — Konuşmacı ön-atama: anonim kümeleme planı + boş bölüm hedefi.
{
  console.log('[142] Konuşmacı ön-atama planı (v2.301)');
  const S = __schemaMod;
  const pts = [
    { index: 0, vec: [1, 0] },
    { index: 1, vec: [0, 1] },
    { index: 2, vec: [1, 0] },
    { index: 3, vec: [0, 1] }
  ];
  const plan = S.autoSpeakerPlan(pts, { threshold: 0.88, minSize: 1 });
  eq('iki konuşmacı kümesi', plan.length, 2);
  eq('S1 ilk görülene verilir', plan[0].code, 'S1');
  eq('S1 bölümleri', plan[0].indexes.join(','), '0,2');
  eq('S2 bölümleri', plan[1].indexes.join(','), '1,3');
  const all = plan.flatMap((g) => g.indexes).sort((a, b) => a - b);
  eq('her bölüm tam bir kez atanır', all.join(','), '0,1,2,3');
  // Benzemeyen (tekil) bölüm de kendi kümesini alır (minSize=1).
  const p2 = S.autoSpeakerPlan(
    [
      { index: 0, vec: [1, 0] },
      { index: 1, vec: [0, 1] },
      { index: 2, vec: [-1, 0] }
    ],
    { threshold: 0.88, minSize: 1 }
  );
  eq('benzemeyen bölüm de atanır', p2.flatMap((g) => g.indexes).sort((a, b) => a - b).join(','), '0,1,2');

  // Şema: speakerAuto varsayılan false; normalize korur.
  eq('emptySegment.speakerAuto false', S.emptySegment().speakerAuto, false);
  eq('normalizeSegment speakerAuto korunur', S.normalizeSegment({ speakerAuto: true }).speakerAuto, true);

  // Uygulama yolu: yalnız BOŞ bölüm hedeflenir; onay + snapshot + log + tek kapı.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('ön-atama düğmesi var', /data-auto-speakers/.test(js), true);
  eq('yalnız boş bölüm hedeflenir', /if \(s\.speakerId \|\| String\(s\.speaker \|\| ''\)\.trim\(\)\) continue;/.test(js), true);
  eq('onay ister', /Konuşmacıları önceden belirle/.test(js), true);
  eq('geri alma kaydı alınır', /snapshotForUndo\(\);\s*\n\s*ensureSpeakers\(m\);/.test(js), true);
  eq('delil günlüğüne yazılır', /Konuşmacılar ön-atandı/.test(js), true);
  eq('tek kapı setSegmentSpeakerByName', /setSegmentSpeakerByName\(m, sg, name\)/.test(js), true);
  eq('elle değişince otomatik işareti kalkar', /s\.speakerAuto = false;/.test(js), true);
  eq('otomatik işareti gösterilir', /≈ otomatik/.test(js), true);
}

// [143] v2.302 — Bölüm bazında konuşmacı tahmini (öneri) + belirsiz işareti.
{
  console.log('[143] Konuşmacı tahmini (v2.302)');
  const S = __schemaMod;
  const cand = [
    { code: 'S1', vec: [1, 0] },
    { code: 'S2', vec: [0, 1] }
  ];
  const c1 = S.bestSpeakerMatch([1, 0], cand);
  eq('aynı sese → S1', c1.code, 'S1');
  eq('kesin eşleşme', c1.match, 'certain');
  const c2 = S.bestSpeakerMatch([0.8, 0.6], cand);
  eq('yakın ama kesin değil → belirsiz', c2.match, 'uncertain');
  eq('belirsizde en yakın S1', c2.code, 'S1');
  const c3 = S.bestSpeakerMatch([0.5, 0.5], cand);
  eq('uzak → eşleşme yok', c3.match, 'none');
  eq('aday yoksa kod boş', S.bestSpeakerMatch([1, 0], []).code, '');
  eq('aday yoksa match none', S.bestSpeakerMatch([1, 0], []).match, 'none');

  // Uygulama yolu: öneri atama YAPMAZ; "Uygula" tek kapıdan atar; işaretler.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('bölüm tahmin düğmesi var', /data-suggest-speaker/.test(js), true);
  eq('uygula düğmesi var', /data-apply-suggest/.test(js), true);
  eq('tahmin saf fonksiyonu kullanır', /bestSpeakerMatch\(targetVec, candidates\)/.test(js), true);
  eq('konuşmacı profili centroid ile', /embeddingCentroid\(vecs\)/.test(js), true);
  eq('öneri atama yapmaz (yalnız __spkSuggest yazar)', /m\.__spkSuggest = \{ idx/.test(js), true);
  eq('uygula tek kapıdan atar', /setSegmentSpeakerByName\(mm, seg, sp\.name\)/.test(js), true);
  eq('uygula otomatik işareti temizler', /seg\.speakerAuto = false;/.test(js), true);
  eq('uygula günlüğe yazılır', /Konuşmacı tahmini uygulandı/.test(js), true);
  eq('belirsiz işareti gösterilir', /is-uncertain/.test(js), true);
}

// [144] v2.303 — Konuşmacı yöntem notu: opt-in, yalnız ön-atama kullanıldıysa.
{
  console.log('[144] Konuşmacı yöntem notu (v2.303)');
  const S = __schemaMod;
  eq('varsayılan kapalı', S.emptyCase().report.speakerMethod, false);
  eq('normalize korur', S.normalizeCase({ report: { speakerMethod: true } }).report.speakerMethod, true);
  const cAuto = T.emptyCaseForTest({
    id: 'cM',
    report: { speakerMethod: true },
    materials: [{ id: 'm1', name: 'a.wav', speakerAutoAt: '2026-01-01T00:00:00.000Z', segments: [] }]
  });
  const note = T.speakerMethodNoteText(cAuto);
  eq('otomatik kullanıldıysa not döner', !!note, true);
  eq('not anonim kümeleme der', /anonim kümeleme/.test(note), true);
  eq('not kimlik değil der', /kimlik tespiti değildir/.test(note), true);
  const cOff = T.emptyCaseForTest({
    id: 'cM2',
    report: { speakerMethod: false },
    materials: [{ id: 'm1', name: 'a.wav', speakerAutoAt: 'x', segments: [] }]
  });
  eq('kapalıysa not yok', T.speakerMethodNoteText(cOff), '');
  const cNoAuto = T.emptyCaseForTest({
    id: 'cM3',
    report: { speakerMethod: true },
    materials: [{ id: 'm1', name: 'a.wav', segments: [] }]
  });
  eq('otomatik kullanılmadıysa not yok', T.speakerMethodNoteText(cNoAuto), '');

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  eq('üç çıktı yöntem notunu kullanır', (js.match(/speakerMethodNoteText\(c\)/g) || []).length >= 3, true);
  eq('ön-atama speakerAutoAt yazar', /m\.speakerAutoAt = new Date\(\)\.toISOString\(\)/.test(js), true);
  eq('rapor anahtarı (app + html)', /reportSpeakerMethodToggle/.test(js) && /reportSpeakerMethodToggle/.test(html), true);
  eq('revizyona girer', /speakerMethod: !!r\.speakerMethod/.test(js), true);
}

// [145] v2.304 — IA: ayrı "Konuşmacılar" sekmesi; "Analiz" → "Ölçümler".
{
  console.log('[145] Konuşmacılar sekmesi (v2.304)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('Konuşmacılar sekmesi var', /tabBtn\('speakers', 'Konuşmacılar'/.test(js), true);
  eq('Analiz adı Ölçümler oldu', /tabBtn\('listen', 'Ölçümler'\)/.test(js), true);
  eq('eski Analiz sekme etiketi kalmadı', /tabBtn\('listen', 'Analiz'\)/.test(js), false);
  eq('speakers paneli var', /data-pane="speakers"/.test(js), true);
  const spkIdx = js.indexOf('data-pane="speakers"');
  const listenIdx = js.indexOf('data-pane="listen"');
  eq('Konuşmacılar paneli Ölçümlerden önce', spkIdx > 0 && spkIdx < listenIdx, true);
  const spkTitle = js.indexOf('pane-title">Konuşmacılar ve ses özellikleri');
  eq('konuşmacı bölümü Konuşmacılar panelinde', spkTitle > spkIdx && spkTitle < listenIdx, true);
  eq('uiTab speakers kabul edilir', /\[[^\]]*'speakers'[^\]]*\]\.includes\(m\.uiTab\)/.test(js), true);
  eq('kod çakışması → Konuşmacılar sekmesi', /uiTab = 'speakers'/.test(js), true);
}

// [146] v2.305 — Bölüm ↔ konuşmacı tablosu (Konuşmacılar sekmesi).
{
  console.log('[146] Bölüm ↔ konuşmacı tablosu (v2.305)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('tablo çizici var', /function renderSpeakerSegmentTable\(m\)/.test(js), true);
  eq('tablo kapsayıcısı', /id="spk-seg-table-\$\{esc\(m\.id\)\}"/.test(js), true);
  eq('filtre (tümü/atanmamış/otomatik)', /data-spk-seg-filter/.test(js), true);
  eq('satırda konuşmacı seçici (tek kapı)', /data-seg="\$\{i\}" data-key="speaker"/.test(js), true);
  eq('satırda ≈ öneri + Uygula', /data-apply-suggest="\$\{i\}"/.test(js), true);
  eq('otomatik rozeti', /sst-auto/.test(js), true);
  eq('sekmede tablo bölümü başlığı', /Bölüm ↔ konuşmacı/.test(js), true);
  eq('filtre oturumluk', /__spkSegFilter/.test(js), true);
  eq('panel çiziminde tablo tazelenir', /renderSpeakersPanel\(m\);\s*\n\s*renderSpeakerSegmentTable\(m\);/.test(js), true);
}

// [147] v2.306 — Satır ⋮ menüsünde konuşmacı işlemleri (ASR ile aynı yerde).
{
  console.log('[147] Satır menüsünde konuşmacı işlemleri (v2.306)');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('menüde ≈ Konuşmacıyı tahmin et', /data-suggest-speaker="\$\{index\}">≈ Konuşmacıyı tahmin et/.test(js), true);
  eq('menüde Konuşmacı ata (seçici)', /seg-menu-spk[\s\S]{0,160}data-key="speaker"/.test(js), true);
  eq('menü seçicisi tek kapıyı kullanır', /data-seg="\$\{index\}" data-key="speaker"/.test(js), true);
  eq('menü seçici CSS', /\.seg-menu-spk/.test(css), true);
}

// [148] v2.307 — Soru ↔ bölüm önerisi (deterministik kelime örtüşmesi).
{
  console.log('[148] Soru ↔ bölüm önerisi (v2.307)');
  const c = T.emptyCaseForTest({
    id: 'cSug',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        segments: [
          { id: 'sg1', start: '00:00:00.000', end: '00:00:05.000', text: 'depozito ödemesi yapıldı' },
          { id: 'sg2', start: '00:00:05.000', end: '00:00:10.000', text: 'kira artışı konuşuldu' },
          { id: 'sg3', start: '00:00:10.000', end: '00:00:15.000', text: 'depozito iadesi tartışıldı' }
        ]
      }
    ]
  });
  const s = T.questionSegmentSuggestions(c, { question: 'depozito ödemesi ne oldu', evidence: [] });
  eq('öneri var', s.length >= 1, true);
  eq('en iyi öneri sg1', s[0].segmentId, 'sg1');
  eq('örtüşme sayısı görünür', s[0].overlap >= 2, true);
  eq('ilgisiz sg2 yok', s.some((x) => x.segmentId === 'sg2'), false);
  eq('zayıf sg3 yok (örtüşme < 2)', s.some((x) => x.segmentId === 'sg3'), false);
  // Bağlı olan bölüm önerilmez.
  const s2 = T.questionSegmentSuggestions(c, {
    question: 'depozito ödemesi ne oldu',
    evidence: [{ materialId: 'm1', segmentId: 'sg1', note: '' }]
  });
  eq('bağlı bölüm önerilmez', s2.some((x) => x.segmentId === 'sg1'), false);
  // Boş soru → öneri yok.
  eq('boş soru öneri yok', T.questionSegmentSuggestions(c, { question: '', evidence: [] }).length, 0);

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('öneri düğmesi var', /data-q-suggest=/.test(js), true);
  eq('öneriyi ekle düğmesi var', /data-q-sug-add=/.test(js), true);
  eq('otomatik bağlama yok (öneri yalnız __suggest)', /q\.__suggest = questionSegmentSuggestions/.test(js), true);
}

// [149] v2.308 — Kanıt zaman çelişkisi (gömülü metadata ↔ dosya zamanı).
{
  console.log('[149] Kanıt zaman çelişkisi (v2.308)');
  const S = __schemaMod;
  const a = S.evidenceTimeConflict({
    embedded: { recordingAt: '2026-03-10T10:00:00Z' },
    fileTimes: { modifiedAt: '2026-03-08T10:00:00Z' }
  });
  eq('beyan dosyadan sonra → çelişki', a.conflict, true);
  eq(
    'dosya sonra → çelişki yok',
    S.evidenceTimeConflict({
      embedded: { recordingAt: '2026-03-08T10:00:00Z' },
      fileTimes: { modifiedAt: '2026-03-10T10:00:00Z' }
    }).conflict,
    false
  );
  eq(
    '1 gün tolerans içinde yok',
    S.evidenceTimeConflict({
      embedded: { recordingAt: '2026-03-08T12:00:00Z' },
      fileTimes: { modifiedAt: '2026-03-08T00:00:00Z' }
    }).conflict,
    false
  );
  eq(
    'çözülemeyen tarih → yok (uydurma yok)',
    S.evidenceTimeConflict({
      embedded: { recordingAt: 'bilinmiyor' },
      fileTimes: { modifiedAt: '2026-03-08T00:00:00Z' }
    }).conflict,
    false
  );
  eq('metadata yok → yok', S.evidenceTimeConflict({}).conflict, false);
  eq(
    'createdAt yedeği kullanılır',
    S.evidenceTimeConflict({
      embedded: { recordingAt: '2026-03-10T00:00:00Z' },
      fileTimes: { createdAt: '2026-03-01T00:00:00Z' }
    }).conflict,
    true
  );

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('hazırlık maddesi var', /'timeConflict'/.test(js), true);
  eq('köken panelinde uyarı', /Zaman çelişkisi/.test(js), true);
  eq('severity advisory', /timeConflict: 'advisory'/.test(js), true);
}

// [150] v2.309 — Dosya sonu metadata (ID3v1 + sonda moov); A3.
{
  console.log('[150] Dosya sonu metadata (v2.309)');
  // ID3v1: son 128 bayt "TAG" + yıl (releaseAt).
  const b = new Uint8Array(200);
  const base = 200 - 128;
  b[base] = 0x54;
  b[base + 1] = 0x41;
  b[base + 2] = 0x47; // 'TAG'
  const yr = '2021';
  for (let i = 0; i < 4; i++) b[base + 93 + i] = yr.charCodeAt(i);
  eq('ID3v1 yıl (releaseAt)', T.parseId3v1(b).releaseAt, '2021');
  eq('TAG yok → boş', Object.keys(T.parseId3v1(new Uint8Array(200))).length, 0);

  // MP4: sonda moov + mvhd (mac epoch = unix + 2082844800).
  const mvhdSize = 108;
  const moovSize = 8 + mvhdSize;
  const prefix = 20;
  const buf = new Uint8Array(prefix + moovSize);
  const w32 = (o, v) => {
    buf[o] = (v >>> 24) & 255;
    buf[o + 1] = (v >>> 16) & 255;
    buf[o + 2] = (v >>> 8) & 255;
    buf[o + 3] = v & 255;
  };
  w32(prefix, moovSize);
  buf[prefix + 4] = 0x6d;
  buf[prefix + 5] = 0x6f;
  buf[prefix + 6] = 0x6f;
  buf[prefix + 7] = 0x76; // 'moov'
  const mv = prefix + 8;
  w32(mv, mvhdSize);
  buf[mv + 4] = 0x6d;
  buf[mv + 5] = 0x76;
  buf[mv + 6] = 0x68;
  buf[mv + 7] = 0x64; // 'mvhd'
  buf[mv + 8] = 0; // version 0
  const t = Math.floor(Date.UTC(2021, 5, 1) / 1000) + 2082844800;
  w32(mv + 12, t); // creation time (mac epoch)
  eq('sonda moov → kayıt tarihi', (T.parseMp4MetaTail(buf).recordingAt || '').startsWith('2021-06-01'), true);
  eq('moov yok → boş', Object.keys(T.parseMp4MetaTail(new Uint8Array(50))).length, 0);

  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('audioEmbedded kuyruğu okur', /readEmbeddedMetaTail\(tail\)/.test(js), true);
  eq('kuyruk sınırı var (4 MB)', /const TAIL = 4 \* 1024 \* 1024/.test(js), true);
}

// [151] v2.310 — Kurumsal kâğıt biçimi (B2): görsel çerçeve, token, metin değişmez.
{
  console.log('[151] Kurumsal kâğıt biçimi (v2.310)');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq(
    'bölüm alt kuralı',
    /\.report-paper \.paper-section h3 \{ border-bottom: 1px solid var\(--paper-line\)/.test(css),
    true
  );
  eq(
    'tablo çerçevesi',
    /\.report-paper \.paper-table \{ border-top: 2px solid var\(--paper-head\)/.test(css),
    true
  );
  eq(
    'tablo başlık ayırıcı',
    /\.report-paper \.paper-table th \{ border-bottom: 1\.5px solid var\(--paper-head\)/.test(css),
    true
  );
  eq(
    'imza bloğu kutusu',
    /\.report-paper \.paper-signature \{ border: 1px solid var\(--paper-line\)/.test(css),
    true
  );
  eq(
    'alt bilgi çift kural',
    /\.report-paper \.paper-footer \{ border-top: 3px double var\(--paper-line\)/.test(css),
    true
  );
  const block = css.slice(css.indexOf('v2.310'));
  eq('B2 bloğunda ham hex yok (token)', !/#[0-9a-f]{3,8}/i.test(block), true);
}

// [152] v2.311 — Terim/konu listesi (opt-in, deterministik).
{
  console.log('[152] Terim/konu listesi (v2.311)');
  const c = T.emptyCaseForTest({
    id: 'cTerms',
    materials: [
      {
        id: 'm1',
        name: 'a.wav',
        segments: [
          { id: 'sg1', start: '00:00:00.000', end: '00:00:05.000', text: 'depozito depozito ödeme' },
          { id: 'sg2', start: '00:00:05.000', end: '00:00:10.000', text: 'kira depozito' }
        ]
      }
    ]
  });
  const t = T.frequentTerms(c);
  eq('sık terim (min 2)', t.map((x) => x.term + ':' + x.count).join(','), 'depozito:3');
  eq('tek geçen elenir', t.some((x) => x.term === 'kira'), false);
  eq('termsText biçimi', T.termsText(c), 'depozito (3)');
  const S = __schemaMod;
  eq('terms bölümü tanımlı', S.REPORT_SECTION_DEFS.some((d) => d.key === 'terms'), true);
  eq('terms gövde sırasında', S.REPORT_BODY_ORDER.includes('terms'), true);
  eq('terms varsayılan kapalı', S.emptyCase().report.sections.terms, false);
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('üç çıktı terms üretir', (js.match(/terms: \(\) =>/g) || []).length >= 3, true);
}

// [153] v2.312 — Teslim tarihi zekâsı: otomatik son teslim, kalan gün, gecikme.
{
  console.log('[153] Teslim tarihi zekâsı (v2.312)');
  const S = __schemaMod;
  // Tarih ayrıştırma / gün farkı
  eq('geçerli tarih okunur', T.dateOnlyStr(T.parseDateOnly('2026-01-31')), '2026-01-31');
  eq('geçersiz gün reddedilir (30 Şubat)', T.parseDateOnly('2026-02-30'), null);
  eq('boş tarih null', T.parseDateOnly(''), null);
  eq('gün ekleme', T.addDaysToDate('2026-01-01', 30), '2026-01-31');
  eq('gün ekleme (ay sonu)', T.addDaysToDate('2026-01-31', 1), '2026-02-01');
  eq('takvim günü farkı', T.calendarDaysBetween('2026-01-01', '2026-01-31'), 30);
  eq('negatif fark', T.calendarDaysBetween('2026-01-31', '2026-01-01'), -30);
  eq('kalan gün', T.daysRemaining('2026-01-31', '2026-01-01'), 30);
  eq('geçen gün (ISO yerel)', T.elapsedDays('2026-01-01T09:00:00', '2026-01-11'), 10);

  // deliveryInfo: normal / gecikme / bugün / yakın / tarih yok / rapor geç
  const mk = (a, r, created) => ({ assignment: a || {}, report: r || {}, createdAt: created || '' });
  const ok = T.deliveryInfo(mk({ date: '2026-01-01', durationDays: '30', dueDate: '2026-01-31' }, { date: '2026-01-20' }, '2026-01-01T09:00:00'), { today: '2026-01-10' });
  eq('kalan gün 21', ok.daysLeft, 21);
  eq('seviye ok', ok.level, 'ok');
  eq('rapor geç değil', ok.reportLate, false);
  eq('dosya açılışından gün', ok.elapsedDays, 9);
  eq('özet metni', T.deliverySummaryText(ok), 'Teslim: 21 gün');
  eq('ayrıntı metni tarih içerir', /31\.01\.2026/.test(T.deliveryDetailText(ok)), true);

  const late = T.deliveryInfo(mk({ dueDate: '2026-01-05' }, { date: '2026-01-10' }), { today: '2026-01-10' });
  eq('gecikme günü negatif', late.daysLeft, -5);
  eq('seviye late', late.level, 'late');
  eq('gecikme etiketi', late.label, '5 gün gecikti');
  eq('gecikme özeti', T.deliverySummaryText(late), 'Teslim: 5 gün gecikti');
  eq('rapor son teslimden sonra', late.reportLate, true);
  eq('rapor farkı -5', late.reportLeft, -5);
  eq('gecikme sınıfı', T.deliveryToneClass(late), 'is-late');

  const today = T.deliveryInfo(mk({ dueDate: '2026-01-10' }), { today: '2026-01-10' });
  eq('bugün son gün', today.label, 'Bugün son gün');
  eq('bugün özeti', T.deliverySummaryText(today), 'Teslim: bugün');
  eq('bugün sınıfı', T.deliveryToneClass(today), 'is-soon');

  const soon = T.deliveryInfo(mk({ dueDate: '2026-01-13' }), { today: '2026-01-10' });
  eq('yakın seviye', soon.level, 'soon');

  const none = T.deliveryInfo(mk({}), { today: '2026-01-10' });
  eq('tarih yok seviyesi', none.level, 'none');
  eq('tarih yok özeti', T.deliverySummaryText(none), 'Teslim: —');
  eq('tarih yoksa uydurma yok', none.daysLeft, null);

  // v2 düz alan yedeği (göç/uyum)
  const flat = T.deliveryInfo({ assignmentDate: '2026-01-01', assignmentDurationDays: '10', dueDate: '2026-01-11', reportDate: '2026-01-11' }, { today: '2026-01-05' });
  eq('düz alanlardan son teslim', flat.dueDate, '2026-01-11');
  eq('düz alanlardan kalan', flat.daysLeft, 6);

  // Otomatik hesap: süre yoksa dueDate ÜRETİLMEZ; süre varsa hesaplanır.
  const elDate = T.el('#assignmentDate');
  const elDur = T.el('#assignmentDurationDays');
  const elDue = T.el('#dueDate');
  const c1 = { assignment: { date: '2026-01-01', durationDays: '', dueDateManual: false }, dueDate: '' };
  elDate.value = '2026-01-01';
  elDur.value = '';
  eq('süre yoksa otomatik tarih yok', T.applyAutoDueDate(c1), '');
  elDur.value = '30';
  eq('süre varsa otomatik tarih', T.applyAutoDueDate(c1), '2026-01-31');
  eq('model dueDate yazıldı', c1.dueDate, '2026-01-31');
  eq('girdi kutusu tazelendi', elDue.value, '2026-01-31');
  // Elle yazılmış tarih otomatik hesapta EZİLMEZ; force ile ezilir.
  const c2 = { assignment: { date: '2026-01-01', durationDays: '30', dueDate: '2026-03-01', dueDateManual: true }, dueDate: '2026-03-01' };
  elDate.value = '2026-01-01';
  elDur.value = '30';
  eq('elle yazılan korunur', T.applyAutoDueDate(c2), '');
  eq('force ile yeniden hesaplanır', T.applyAutoDueDate(c2, { force: true }), '2026-01-31');
  eq('force sonrası işaret kalkar', c2.assignment.dueDateManual, false);
  elDate.value = '';
  elDur.value = '';

  // Şema: dueDateManual korunur; boş taslak hâlâ boş sayılır (v2.109 korunur).
  eq('emptyCase dueDateManual false', S.emptyCase().assignment.dueDateManual, false);
  const norm = S.normalizeCase({ id: 'x', assignment: { date: '2026-01-01', dueDate: '2026-03-01', dueDateManual: true } });
  eq('normalizeCase dueDateManual korunur', norm.assignment.dueDateManual, true);
  eq('boş taslak boş sayılır', T.isEmptyCase(T.freshCase()), true);

  // Arayüz kancaları: panel, durum çubuğu, düğme, ray girişi.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('dashboard teslim paneli var', /id="deliveryPanel"/.test(html), true);
  eq('durum çubuğu teslim göstergesi var', /id="sbDue"/.test(html), true);
  eq('son teslim hesapla düğmesi var', /id="dueDateAutoBtn"/.test(html), true);
  eq('rayda Dosya girişi var', /id="navCase"/.test(html), true);
  eq('durum çubuğu deliveryInfo kullanır', /#sbDue[\s\S]{0,200}deliveryInfo\(c\)/.test(js), true);
  eq('rapor ekranı teslim satırı taşır', /report-due/.test(js) && /\.report-due\s*\{/.test(css), true);
  eq('teslim CSS ham hex taşımaz', !/\.dl-chip[^{]*\{[^}]*#[0-9a-f]{3,8}/i.test(css), true);
}

// [154] v2.313 — Hızlı etiket sözlüğü: kapsam, tek biçim, arama, son kullanılan.
{
  console.log('[154] Hızlı etiket sözlüğü (v2.313)');
  const tags = T.QUICK_TAGS || [];
  const texts = tags.map((t) => t.text);
  eq('en az 30 etiket', tags.length >= 30, true);
  eq('etiketler benzersiz', new Set(texts).size, texts.length);
  eq('hepsi köşeli parantezli', texts.every((t) => /^\[.+\]$/.test(t)), true);
  eq('label = text (tek biçim)', tags.every((t) => t.label === t.text), true);
  const groups = new Set((T.QUICK_TAG_GROUPS || []).map((g) => g.key));
  eq('her etiketin grubu tanımlı', tags.every((t) => groups.has(t.group)), true);
  const obsKeys = new Set(__schemaMod.OBS_KEYS);
  eq('obsKey geçerli (OBS_KEYS)', tags.filter((t) => t.obsKey).every((t) => obsKeys.has(t.obsKey)), true);
  const core = [
    '[duyulmuyor]', '[anlaşılmaz]', '[şüpheli]', '[tahmin]', '[kesik]', '[bozuk ses]',
    '[gürültü]', '[üst üste]', '[yankı]', '[kesinti]', '[sessizlik]', '[müzik/ses]',
    '[telefon]', '[uzaktan konuşma]', '[fısıltı]', '[bağırma]'
  ];
  for (const need of core) eq('çekirdek etiket: ' + need, texts.includes(need), true);
  const extra = [
    '[gülüşme]', '[öksürük]', '[alkış]', '[ağlama]', '[mikrofon teması]', '[rüzgar]',
    '[trafik/araç]', '[dil değişimi]', '[karşı taraf]', '[isim belirsiz]', '[yer belirsiz]',
    '[rakam belirsiz]', '[tarih belirsiz]', '[küfür]'
  ];
  for (const need of extra) eq('geniş etiket: ' + need, texts.includes(need), true);
  // Standart §12.2: "belirsiz" bir etiket DEĞİL, kontrol durumudur.
  eq('[belirsiz] etiketi YOK', texts.includes('[belirsiz]'), false);
  // Son kullanılan: tekil, sıralı, en çok 5, bilinmeyen süzülür.
  T.store.removeItem('akis.quickTagRecent');
  T.rememberQuickTag('[duyulmuyor]');
  T.rememberQuickTag('[gürültü]');
  T.rememberQuickTag('[duyulmuyor]');
  eq('son kullanılan tekil ve sıralı', T.quickTagRecent().join(','), '[duyulmuyor],[gürültü]');
  for (const t of ['[fısıltı]', '[bağırma]', '[gülüşme]', '[öksürük]', '[alkış]', '[küfür]']) T.rememberQuickTag(t);
  eq('son kullanılan en çok 5', T.quickTagRecent().length, 5);
  T.store.setItem('akis.quickTagRecent', JSON.stringify(['[eski-etiket]', '[duyulmuyor]']));
  eq('bilinmeyen etiket süzülür', T.quickTagRecent().join(','), '[duyulmuyor]');
  // Menü HTML'i: arama + gruplar + etiket + kapalı başlar.
  const menu = T.quickMenuHtml(2);
  eq('menüde arama var', /class="qt-search"/.test(menu), true);
  eq('menüde gruplar var', /data-qt-group="clarity"/.test(menu) && /data-qt-group="content"/.test(menu), true);
  eq('menüde data-quick-tag var', /data-quick-tag="2\|\[duyulmuyor\]"/.test(menu), true);
  eq('menü kapalı başlar', /hidden>/.test(menu), true);
  // Kaynak kancaları: segDetail menüsü, tıklama, arama, CSS kaydırma.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('segDetail menüsü quickMenuHtml kullanır', /\$\{quickMenuHtml\(i\)\}/.test(js), true);
  eq('etiket tıklaması son kullanılana yazar', /rememberQuickTag\(text\)/.test(js), true);
  eq('arama filtresi bağlı', /filterQuickMenu\(search\.closest/.test(js), true);
  eq('menü kaydırılır (kırpma yok)', /#view-audio \.sd-quick-menu \{[^}]*overflow-y:\s*auto/.test(css), true);
  eq('gizli etiket display:none', /\.sd-quick-menu \.quick-tag\[hidden\]\s*\{\s*display:\s*none/.test(css), true);
  // Standart belgesi yeni ayrımı anar.
  const std = fs.readFileSync(path.join(ROOT, 'docs/STANDARTLAR.md'), 'utf8');
  eq('standart duyulmuyor/anlaşılmaz ayrımını anar', /duyulmuyor/.test(std) && /anlaşılmaz/.test(std), true);
}

// [155] v2.314 — Yeni gözlem işaretleri: duyulmuyor, uzaktan, bozuk ses, dil.
{
  console.log('[155] Yeni gözlem işaretleri (v2.314)');
  const S = __schemaMod;
  const keys = ['notAudible', 'distance', 'distortion', 'foreignLanguage'];
  for (const k of keys) eq('OBS_KEYS: ' + k, S.OBS_KEYS.includes(k), true);
  eq('etiket notAudible', S.OBS_LABEL.notAudible, 'duyulmuyor (ses yok/kısık)');
  eq('etiket distance', S.OBS_LABEL.distance, 'uzaktan/zayıf konuşma');
  eq('etiket distortion', S.OBS_LABEL.distortion, 'bozuk ses / artefakt');
  eq('etiket foreignLanguage', S.OBS_LABEL.foreignLanguage, 'dil değişimi (farklı dil/lehçe)');
  const eo = S.emptyObs();
  eq('emptyObs 12 anahtar', Object.keys(eo).length, 12);
  eq('emptyObs yeni anahtarlar false', keys.every((k) => eo[k] === false), true);
  // Normalize: yeni bayrak korunur, bilinmeyen silinmez, eksik false olur.
  const seg = S.normalizeSegment({ obs: { notAudible: true, future: true } });
  eq('normalize yeni bayrağı korur', seg.obs.notAudible, true);
  eq('normalize bilinmeyeni silmez', seg.obs.future, true);
  eq('normalize eksik bayrağı false yapar', seg.obs.distortion, false);
  // Sayaç + filtre TEK KAYNAK.
  const m = {
    id: 'm',
    segments: [
      { id: 'a', start: '00:00:00.000', end: '00:00:05.000', text: 'x', obs: { notAudible: true } },
      { id: 'b', start: '00:00:05.000', end: '00:00:10.000', text: 'y', obs: { distance: true, distortion: true } },
      { id: 'c', start: '00:00:10.000', end: '00:00:15.000', text: 'z', obs: { foreignLanguage: true } }
    ]
  };
  const c = T.segCounts(m);
  eq('notAudible sayısı', c.notAudible, 1);
  eq('distance sayısı', c.distance, 1);
  eq('distortion sayısı', c.distortion, 1);
  eq('foreignLanguage sayısı', c.foreignLanguage, 1);
  eq('filtre notAudible', T.segMatchesFilter(m.segments[0], 'notAudible'), true);
  eq('filtre distance', T.segMatchesFilter(m.segments[1], 'distance'), true);
  eq('filtre distortion', T.segMatchesFilter(m.segments[1], 'distortion'), true);
  eq('filtre foreignLanguage', T.segMatchesFilter(m.segments[2], 'foreignLanguage'), true);
  eq('filtre eşleşmeyen', T.segMatchesFilter(m.segments[0], 'distance'), false);
  // Rapor GÖZLEM metni yeni etiketleri basar (tek kaynak OBS_LABEL).
  eq(
    'GÖZLEM metni yeni etiketler',
    T.segObsText({ obs: { notAudible: true, distortion: true } }),
    'duyulmuyor (ses yok/kısık), bozuk ses / artefakt'
  );
  eq('REPORT_TEXT.obsLabels yeni', T.REPORT_TEXT.obsLabels.notAudible, S.OBS_LABEL.notAudible);
  // İş özeti yeni bayrakları gösterir.
  const w = T.segmentWorkSummary({ review: 'pending', obs: { notAudible: true, distance: true, distortion: true, foreignLanguage: true } });
  eq(
    'iş özeti yeni bayraklar',
    keys.every((k) => w.flags.some((f) => f.key === k)),
    true
  );
  // Birleştirme yeni bayrakları OR'lar.
  const mk = (flag) =>
    S.normalizeCase({
      id: 'c1',
      materials: [{ id: 'm1', segments: [{ id: 's1', start: '00:00:00.000', end: '00:00:05.000', text: 'a', obs: { [flag]: true } }] }]
    });
  const merged = S.mergeCases(mk('notAudible'), mk('distortion'));
  const o = merged.merged.materials[0].segments[0].obs;
  eq('birleştirme yeni bayrakları OR lar', !!(o.notAudible && o.distortion), true);
  // Hızlı etiket bağları: yeni obsKey'ler geçerli.
  const tagKeys = (T.QUICK_TAGS || []).filter((t) => t.obsKey).map((t) => t.obsKey);
  for (const k of keys) eq('hızlı etiket obsKey bağı: ' + k, tagKeys.includes(k), true);
  // Gözlem tıklaması "İş" durum satırını yerinde tazeler (sessiz eski durum yok).
  const appJs = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  eq('gözlem tıklaması durum satırını tazeler', /statusEl\.outerHTML = statusRowHtml\(m, sg/.test(appJs), true);
}


// [156] v2.315 — Dosya görünümü: künye, eksikler, teslim paneli tek kaynak.
{
  console.log('[156] Dosya görünümü (v2.315)');
  const c = T.emptyCaseForTest({
    id: 'cCasePage',
    court: 'Antalya 4. Asliye Hukuk Mahkemesi',
    fileNo: '2026/315 E.',
    subject: 'Depozito uyuşmazlığı',
    expertName: 'Örnek Bilirkişi',
    materials: [{ id: 'm1', name: 'a.wav', segments: [] }],
    questions: [{ id: 'q1', question: 'Soru?' }]
  });
  const rows = T.caseIdentityRows(c);
  const rowText = rows.map(([k, v]) => k + '=' + v).join(' | ');
  eq('künye: dosya no', rows.some(([k, v]) => k === 'DOSYA NO' && v === '2026/315 E.'), true);
  eq('künye: mahkeme', rows.some(([k, v]) => /Mahkeme/.test(k) && /Antalya/.test(v)), true);
  eq('künye: bilirkişi', rows.some(([k, v]) => k === 'Bilirkişi' && v === 'Örnek Bilirkişi'), true);
  eq('künye boş alan yazmaz', rows.every(([, v]) => String(v).trim()), true);
  const missFull = T.caseMissingItems(c);
  eq('tam dosyada eksik yok', missFull.length, 0);
  const empty = T.emptyCaseForTest({ id: 'cEmpty' });
  const missEmpty = T.caseMissingItems(empty);
  eq('boş dosyada 6 eksik', missEmpty.length, 6);
  eq('eksikler hedefli', missEmpty.every((x) => x.target === 'case' || x.target === 'audio' || x.target === 'questions'), true);
  const dp = T.deliveryPanelHtml(c);
  eq('teslim paneli tek kaynak (TESLİM)', /TESLİM/.test(dp) && /Son teslim/.test(dp), true);
  // Kaynak kancaları: Dosya artık sayfa; form kimliği çoğaltılmaz.
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/reading-layer.css'), 'utf8');
  eq('switchView case sayfayı açar (çekmece değil)', /if \(name === 'case'\) renderCasePage\(currentCase\(\)\)/.test(js), true);
  eq('eski erken çekmece dalı kaldırıldı', !/if \(name === 'case'\) \{\s*populateCaseForm\(\);\s*setCaseDrawer\(true\);\s*return;/.test(js), true);
  eq('case sayfası renderCasePage kullanır', /function renderCasePage\(c\)/.test(js), true);
  eq('düzenle düğmesi çekmeceyi açar', /data-case-edit/.test(js) && /\[data-case-edit\]/.test(js), true);
  eq('sayfa teslim panelini tek kaynaktan alır', /deliveryPanelHtml\(c\)/.test(js) && /renderDeliveryPanel\(c\)/.test(js), true);
  eq('view-case HTML var', /id="view-case"/.test(html) && /id="casePageBody"/.test(html), true);
  eq('form kimliği çoğaltılmadı (court)', (html.match(/id="court"/g) || []).length, 1);
  eq('dosya sayfası CSS ızgara', /#view-case \.case-page-grid/.test(css) && /#view-case \.case-page-list/.test(css), true);
}

console.log(`\n== Sonuç: ${passed} geçti, ${failures} kaldı ==`);
process.exit(failures === 0 ? 0 : 1);
