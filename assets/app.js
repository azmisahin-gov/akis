const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
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
const ASR_MODELS = {
  'onnx-community/whisper-base':  { label: 'Temel model – hızlı, en düşük doğruluk (~146 MB)', dtype: 'fp32', warn: true },
  'onnx-community/whisper-small': { label: 'Küçük model – orta doğruluk (~485 MB)', dtype: 'fp16', warn: false },
  'onnx-community/whisper-medium-ONNX': { label: 'Orta model – ölçülen en yüksek doğruluk (~1,5 GB)', dtype: 'fp16', warn: false },
  'onnx-community/whisper-large-v3-turbo': { label: 'Large-v3-turbo – ölçülmedi, çok ağır (~1,6 GB)', dtype: 'fp16', warn: false },
};
const DEFAULT_ASR_MODEL = 'onnx-community/whisper-small';
// WebGPU is much faster but not universally available; fall back to WASM when absent.
let asrDevice = 'wasm';
async function detectDevice(){try{if(navigator.gpu&&await navigator.gpu.requestAdapter()){asrDevice='webgpu';return true;}}catch(e){}asrDevice='wasm';return false;}
// Single source of truth for every report text: section headings, default
// fallbacks, table headers and notes. The three renderers (HTML preview, DOCX,
// UDF) previously repeated these strings, which let them drift apart. They now
// read from here; only formatting (fonts, colours, XML/HTML shape) stays local.
// Where the renderers disagreed, the 2-of-3 majority wording is kept.
const REPORT_TEXT = {
  subtitle:'SES KAYITLARININ TEKNİK İNCELEMESİ VE KONUŞMA İÇERİĞİNİN ÇÖZÜMLENMESİ',
  synthetic:'KURGUSAL TEST MATERYALİDİR · RESMÎ BELGE DEĞİLDİR',
  tocHeading:'İÇİNDEKİLER',
  sections:[
    '1. İNCELEMENİN KONUSU, KAPSAM VE SINIRLARI',
    '2. BİLİRKİŞİNİN CEVAPLAMASI GEREKEN SORULAR',
    '3. BİLİRKİŞİDEN GÖZLEMLENMESİ VE İNCELENMESİ İSTENEN MADDİ UNSURLAR',
    '4. İNCELEME YÖNTEMİ, BİLİMSEL VE TEKNİK DAYANAKLAR',
    '5. ANALİZ, TESPİT VE DEĞERLENDİRME',
    '6. GEREKÇELİ SONUÇ',
    '7. EKLER'
  ],
  sub51:'5.1. Ses kayıtlarının çözümlenmesi',
  sub52:'5.2. Görevlendiren merci sorularına ilişkin teknik değerlendirme',
  sub53:'5.3. Teknik sınırlılıklar',
  emptyCourt:'……………………………… MAHKEMESİ',
  emptyFileNo:'—',
  defaultScope:'Görevlendirme yazısında belirtilen inceleme konusu, kapsamı ve sınırları burada açıklanır.',
  defaultQuestions:'Görevlendirme yazısında bilirkişiye yöneltilen sorular, yazıdaki sırasıyla bu bölümde gösterilir.',
  defaultQuestion:'Soru metni girilmemiştir.',
  defaultAnswer:'Bu soruya ilişkin teknik cevap henüz girilmemiştir.',
  defaultBasis:'Belirtilmemiş',
  defaultLimitations:'İncelemede karşılaşılan teknik sınırlılıklar varsa, somut kayıt ve zaman aralıklarıyla açıklanır.',
  defaultConclusion:'Sonuç, yalnızca inceleme kapsamında tespit edilen ve gerekçelendirilen teknik bulgulara dayanılarak bilirkişi tarafından yazılır.',
  defaultExpert:'BİLİRKİŞİ',
  defaultField:'56.12',
  defaultInventoryIntro:'İncelemeye sunulan dijital ses materyalleri aşağıda envanter bilgileriyle gösterilmiştir.',
  noMaterials:'İncelemeye sunulan ses kaydı bulunmamaktadır.',
  codecFallback:'Ses dosyası',
  segmentCountLabel:'Deşifre bölümü',
  defaultEvaluation:'Teknik sorulara ilişkin değerlendirme, görevlendirme yazısında yer alan sorular doğrultusunda eklenir.',
  noTranscript:'Bu kayıt için henüz deşifre metni oluşturulmamıştır.',
  inventoryNote:'Envanterdeki codec, kanal, örnekleme ve bit derinliği bilgileri dosya konteynerinden okunmuştur; SHA-256 özeti ise dosyanın hesaplama anındaki dijital özetidir. Bu bilgiler tek başına kaydın gerçekliğini, kayıt tarihini, kayıt tarihçesini veya montaj yapılıp yapılmadığını doğrulamaz.',
  attachmentsText:'Raporla birlikte sunulan ekler, gerçekten eklenen materyallere göre numaralandırılarak bu bölümde gösterilir.',
  inventoryHeaders:['DOSYA ADI','BİÇİM / BOYUT','SÜRE','KANAL / ÖRNEKLEME','SHA-256 ÖZETİ'],
  segmentHeaders:['ZAMAN ARALIĞI','KONUŞMACI','ÇÖZÜMLENEN KONUŞMA','KONTROL DURUMU'],
  emptySpeaker:'Belirtilmemiş',
  timeDash:'—',
  signatureLabel:'İmza',
  signatureRegistry:'Sicil No',
  evidenceWarningPrefix:'Çözümleme uyarısı:',
  languageWarningPrefix:'Kontrol uyarısı:',
  fileMissing:'Dosya numarası girilmemiştir',
  warnMissingFields:'Mahkeme/merci, dosya numarası veya bilirkişi adı eksik.',
  warnNoMaterials:'Rapora eklenecek ses kaydı bulunmuyor.',
  warnLanguage:'En az bir kaydın transkriptinde dil tutarsızlığı olasılığı bulundu.',
  warnHallucination:'En az bir kayıtta model anlamlı konuşma üretemedi veya dolgu ifadesi üretti; bu bölümler rapora aktarılmadan önce elle doldurulmalıdır.',
  warnPreReport:'Rapor öncesi kontrol:'
};
// Envanter tablosundaki boş satır, tek 'materyal yok' metninden türetilir;
// böylece iki metin birbirinden ayrı düşemez.
REPORT_TEXT.noInventoryRow=[REPORT_TEXT.noMaterials,'','','',''];
const DEFAULT_METHOD = `İnceleme kapsamında tarafıma sunulan dijital ses dosyalarının dosya adları, biçimleri, boyutları, süreleri ve teknik özellikleri kaydedilir. Orijinal dosyanın içerik baytları değiştirilmeden uygulama depolamasında tutulur. Otomatik çözümleme için ses verisi tarayıcı belleğine alınarak işlenir; kaynak ses dosyası üzerinde düzenleme yapılmaz.

Otomatik konuşma çözümleme çıktısı, dinlemeyi destekleyen bir taslak olarak değerlendirilir ve rapora aktarılmadan önce ilgili ses bölümleriyle karşılaştırılarak uzman tarafından kontrol edilir. Kontrol edilmeyen bölümler ayrıca işaretlenir. Konuşma bölümleri, elde edilen zaman bilgileriyle gösterilir. Konuşmacı etiketleri otomatik kimlik tespiti anlamına gelmez; kayıt içindeki kişileri ayırt etmek amacıyla uzman tarafından girilir. Anlaşılmayan veya üst üste gelen konuşmalar tahmin edilmez; kontrol sırasında uygun biçimde işaretlenir. Kayıt niteliğinin değerlendirmeyi sınırladığı durumlar ayrıca belirtilir.`
let appState = { cases: [], activeCaseId: null };
let asrPipeline = null;
let modelLoading = false;
const objectUrls = new Map();
let dbPromise;

function uid(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; }
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtTime(s){if(!Number.isFinite(s))return '—';const n=Math.max(0,Math.floor(s));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function fmtShort(s){if(!Number.isFinite(s))return '—';const n=Math.max(0,Math.floor(s));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function fmtSize(n){if(!Number.isFinite(n))return '—';return n<1024*1024?`${(n/1024).toFixed(0)} KB`:`${(n/1024/1024).toFixed(2)} MB`;}
function dateToday(){return new Date().toISOString().slice(0,10);}
function currentCase(){return appState.cases.find(c=>c.id===appState.activeCaseId)||null;}
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(appState));$('#saveState').textContent='● Yerel kayıt güncellendi';}catch(e){$('#saveState').textContent='● Kayıt alanı dolu';console.warn(e);}}
function freshCase(){return {id:uid(),name:'Yeni inceleme dosyası',reportType:'hukuk',court:'',fileNo:'',assignmentDate:'',dueDate:'',assignmentDurationDays:'',plaintiff:'',plaintiffCounsel:'',defendant:'',defendantCounsel:'',subject:'',caseDate:'',inspectionDate:'',expertName:'',registryNo:'',expertField:'56.12 – Ses kayıtlarının metin hâline dönüştürülmesi',reportDate:dateToday(),assignmentScope:'',questions:[],methodText:DEFAULT_METHOD,limitationsText:'',conclusionText:'',materials:[],synthetic:false,createdAt:new Date().toISOString()};}
// Older builds persisted derived waveform peaks inside each material, which
// inflated localStorage by ~32 KB per recording. Drop them on load so existing
// records shrink back to their real size.
function stripDerivedFields(state){let cleaned=false;for(const c of state.cases||[]){for(const m of c.materials||[]){if('__peaks' in m){delete m.__peaks;cleaned=true;}}}return cleaned;}
// Eski sürümler metin geçmişini her tuş vuruşunda kaydettiği için kayıtlar aynı
// metnin onlarca ara hâlini taşır ("" -> "M" -> "Me" -> ...). Ardışık iki kayıt
// birbirinin öneki ise (yazma veya silme adımı) aynı düzenleme oturumudur;
// oturumun başlangıç hâli korunur, ara adımlar atılır. Önek ilişkisi kırıldığında
// yeni oturum başlar ve o hâl ayrıca korunur. Boş sürümler geçmişe girmez.
function compactHistory(hist){
  if(!Array.isArray(hist)||hist.length<2)return hist||[];
  const out=[];
  for(const h of hist){
    const t=h.text||'';
    const prev=out[out.length-1];
    const isPrefix=prev&&(t.startsWith(prev.text)||prev.text.startsWith(t));
    if(isPrefix)continue; // aynı oturumun ara adımı; oturum başı korunur
    out.push({text:t,at:h.at});
  }
  return out.length?out:[{text:'',at:hist[hist.length-1].at}];
}
function compactAllHistories(state){let changed=false;for(const c of state.cases||[]){for(const m of c.materials||[]){for(const sg of m.segments||[]){if(Array.isArray(sg.history)&&sg.history.length>1){const c2=compactHistory(sg.history);if(c2.length!==sg.history.length){sg.history=c2;changed=true;}}}}}return changed;}
function loadState(){try{const raw=localStorage.getItem(STORE_KEY);if(raw){appState=JSON.parse(raw);if(!Array.isArray(appState.cases))throw 0;stripDerivedFields(appState);if(compactAllHistories(appState))persist();}}catch(e){appState={cases:[],activeCaseId:null};}if(!appState.cases.length){const c=freshCase();appState.cases.push(c);appState.activeCaseId=c.id;}if(!currentCase())appState.activeCaseId=appState.cases[0].id;persist();}
function dbOpen(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE,{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return dbPromise;}
async function storeBlob(key,blob){try{const db=await dbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({key,blob});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){console.warn('Ses dosyası kalıcı depoya yazılamadı',e);}}
async function readBlob(key){try{const db=await dbOpen();return await new Promise((resolve,reject)=>{const r=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(key);r.onsuccess=()=>resolve(r.result?.blob||null);r.onerror=()=>reject(r.error);});}catch(e){return null;}}
async function deleteBlob(key){try{const db=await dbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){}}
function blobKey(c,m){return `${c.id}::${m.id}`;}
function showToast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),3400);}
function switchView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));$$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const labels={overview:'Genel görünüm',case:'Dosya bilgileri',audio:'Ses kayıtları',questions:'İnceleme ve sorular',report:'Rapor oluştur'};$('#pageTitle').textContent=labels[name]||'AKİS';$('#topEyebrow').textContent=name==='overview'?'ÇALIŞMA ALANI':`0${['overview','case','audio','questions','report'].indexOf(name)} / AKİS`;if(name==='report')renderReport();if(name==='case')populateCaseForm();if(name==='questions')populateQuestionsForm();if(name==='audio')renderAudioList();}
function renderCaseSelect(){const sel=$('#caseSelect');sel.innerHTML=appState.cases.map(c=>`<option value="${esc(c.id)}" ${c.id===appState.activeCaseId?'selected':''}>${esc(c.name||c.fileNo||'Yeni inceleme')}</option>`).join('');}
const CASE_FIELDS=['reportType','court','fileNo','assignmentDate','dueDate','assignmentDurationDays','plaintiff','plaintiffCounsel','defendant','defendantCounsel','subject','caseDate','inspectionDate','expertName','registryNo','expertField','reportDate'];
function populateCaseForm(){const c=currentCase();if(!c)return;for(const k of CASE_FIELDS){const el=$(`#${k}`);if(el)el.value=c[k]??'';}applyRoleLabels(c.reportType);}
function applyRoleLabels(type){const spec=reportTypeSpec(type);const map={labelFileNo:spec.fileNo+' *',labelPlaintiff:spec.roles.plaintiff,labelPlaintiffCounsel:spec.roles.plaintiffCounsel,labelDefendant:spec.roles.defendant,labelDefendantCounsel:spec.roles.defendantCounsel,labelSubject:spec.subject+' *',labelCaseDate:spec.date};for(const id in map){const el=$(`#${id}`);if(el)el.textContent=map[id];}}
function updateCaseName(c){c.name=c.fileNo?`${c.fileNo} · ${c.court||'İnceleme dosyası'}`:(c.court||'Yeni inceleme dosyası');renderCaseSelect();}
function readCaseForm(){const c=currentCase();if(!c)return;for(const k of CASE_FIELDS){const el=$(`#${k}`);if(el)c[k]=el.value;}applyRoleLabels(c.reportType);updateCaseName(c);persist();renderOverview();}
function populateQuestionsForm(){const c=currentCase();if(!c)return;$('#assignmentScope').value=c.assignmentScope||'';$('#methodText').value=c.methodText||DEFAULT_METHOD;$('#limitationsText').value=c.limitationsText||'';$('#conclusionText').value=c.conclusionText||'';renderQuestions();}
function readQuestionsForm(){const c=currentCase();if(!c)return;c.assignmentScope=$('#assignmentScope').value;c.methodText=$('#methodText').value;c.limitationsText=$('#limitationsText').value;c.conclusionText=$('#conclusionText').value;persist();}
function renderOverview(){const c=currentCase();if(!c)return;$('#welcomeTitle').textContent=c.court||'Çalışmaya başlayın';$('#welcomeSub').textContent=c.fileNo?`Dosya: ${c.fileNo} · ${c.subject||'İnceleme konusu henüz girilmedi.'}`:'Dosya bilgilerini girin, ses kayıtlarını ekleyin ve inceleme raporunuzu hazırlayın.';const mats=c.materials||[];const total=mats.reduce((n,m)=>n+(m.duration||0),0);const segments=mats.flatMap(m=>m.segments||[]);const checked=segments.filter(s=>isReviewed(s)).length;$('#statAudio').textContent=mats.length;$('#statDuration').textContent=fmtShort(total);$('#statSegments').textContent=segments.length;$('#statChecked').textContent=segments.length?`${Math.round(checked/segments.length*100)}%`:'0%';$('#audioCount').textContent=mats.length;$('#stepCase').textContent=c.court&&c.fileNo&&c.expertName?'Tamamlandı':'Bilgi bekliyor';$('#stepAudio').textContent=`${mats.length} kayıt`;$('#stepQuestions').textContent=c.questions.length?'Düzenlendi':'Bekliyor';$('#stepReport').textContent=mats.length&&c.court&&c.fileNo?'Önizlenebilir':'Bilgi bekliyor';$('#overviewCase').innerHTML=[['MER Cİ','Mahkeme / merci',c.court],['DOSYA NO','Dosya numarası',c.fileNo],['KONU','İnceleme konusu',c.subject],['BİLİRKİŞİ','Bilirkişi',c.expertName]].map(x=>`<div class="overview-item"><small>${x[1].toUpperCase()}</small><b>${esc(x[2]||'—')}</b></div>`).join('');}
function renderQuestions(){const c=currentCase();if(!c)return;const root=$('#questionsList');root.innerHTML='';if(!c.questions.length){root.innerHTML='<div class="empty-state" style="padding:14px"><b>Henüz soru eklenmedi</b><span>Mahkemece cevaplanması istenen soruları ekleyin.</span></div>';return;}c.questions.forEach((q,i)=>{const div=document.createElement('div');div.className='question-card';div.innerHTML=`<label class="field"><span>${i+1}. Soru</span><textarea rows="2" data-q="${i}" data-k="question" placeholder="Mahkemenin sorusu">${esc(q.question||'')}</textarea></label><label class="field"><span>Teknik cevap</span><textarea rows="3" data-q="${i}" data-k="answer" placeholder="Doğrulanmış teknik bulgulara dayalı cevap">${esc(q.answer||'')}</textarea></label><label class="field"><span>Dayanak (kayıt / zaman aralığı)</span><input data-q="${i}" data-k="basis" value="${esc(q.basis||'')}" placeholder="Kayıt adı, 00:00–00:15"></label><button class="mini-button remove-question" data-remove-q="${i}">Soruyu kaldır</button>`;root.appendChild(div);});}
function addQuestion(){const c=currentCase();c.questions.push({question:'',answer:'',basis:''});persist();renderQuestions();}
async function attachObjectUrl(c,m){const key=blobKey(c,m);if(objectUrls.has(key))return objectUrls.get(key);const blob=await readBlob(key);if(!blob)return '';const u=URL.createObjectURL(blob);objectUrls.set(key,u);return u;}
async function getAudioBlob(c,m){const key=blobKey(c,m);let blob=await readBlob(key);return blob;}
async function renderAudioList(){const c=currentCase();if(!c)return;$('#audioListLabel').textContent=`${c.materials.length} kayıt`;renderQueue();const root=$('#audioList');root.innerHTML='';root.classList.toggle('empty-list',!c.materials.length);if(!c.materials.length){root.innerHTML='<div class="empty-state"><div class="empty-symbol">♫</div><b>Henüz ses kaydı eklenmedi</b><span>İncelemeye sunulan ses dosyalarını ekleyin.</span></div>';return;}for(const m of c.materials){const card=document.createElement('div');card.className='audio-card';const segs=m.segments||[];const checked=segs.filter(s=>isReviewed(s)).length;const status=m.status||'Bekliyor';card.innerHTML=`<div class="audio-card-top"><div class="audio-file-icon">♫</div><div class="audio-file-main"><b title="${esc(m.name)}">${esc(m.name)}</b><small>${esc(m.type||'Ses dosyası')} · ${fmtSize(m.size)} · ${fmtShort(m.duration||0)}</small></div><div class="audio-actions">${m.status==='Çözümleme sürüyor'?`<button class="mini-button danger" data-cancel="${esc(m.id)}">İptal et</button>`:`<button class="mini-button primary" data-transcribe="${esc(m.id)}">${segs.length?'Yeniden çözümle':'Çözümle'}</button>`}<button class="mini-button" data-manual="${esc(m.id)}">＋ Bölüm</button><button class="mini-button" data-remove-audio="${esc(m.id)}">Kaldır</button></div></div><div class="audio-meta"><span>SHA-256: <b>${esc(m.sha256||'Hesaplanmadı')}</b></span><span>Durum: <b>${esc(status)}</b></span><span>Kontrol: <b>${checked}/${segs.length}</b></span>${m.synthetic?'<span><b>Kurgusal sentetik kayıt</b></span>':''}</div><div class="audio-meta tech-meta"><span>Codec: <b>${esc(m.tech?.codec||'—')}</b></span><span>Kanal: <b>${esc(fmtChannels(m.tech?.channels))}</b></span><span>Örnekleme: <b>${m.tech?.sampleRate?esc(m.tech.sampleRate+' Hz'):'—'}</b></span><span>Bit derinliği: <b>${m.tech?.bitDepth?esc(m.tech.bitDepth+' bit'):'—'}</b></span><span>Eklenme: <b>${esc(m.addedAt?new Date(m.addedAt).toLocaleString('tr-TR'):'—')}</b></span></div>${m.lastVerify?`<div class="warn-box ${m.lastVerify.ok?'verify-ok':''}">Son SHA-256 doğrulaması: ${esc(new Date(m.lastVerify.at).toLocaleString('tr-TR'))} · ${m.lastVerify.ok?'özet eşleşti (dosya değişmemiş)':'özet farklı (dosya değişmiş olabilir)'}</div>`:''}<div class="evidence-actions"><button class="mini-button" data-verify="${esc(m.id)}">SHA-256 doğrula</button><button class="mini-button" data-log="${esc(m.id)}">İşlem günlüğü</button></div>${typeof m.progress==='number'?`<div class="progress-wrap"><div class="progress-bar"><span style="width:${m.progress}%"></span></div><small>Çözümleme ilerlemesi: %${m.progress}</small></div>`:''}${m.hallucinationWarning?`<div class="warn-box">${esc(m.hallucinationWarning)}</div>`:''}${m.languageWarning?`<div class="warn-box">${esc(m.languageWarning)}</div>`:''}<div class="wave-wrap"><canvas class="wave-canvas" id="wave-${esc(m.id)}" width="1200" height="96" aria-label="Ses dalga formu"></canvas><div class="wave-hint">Dalga formuna tıklayarak kaydın istediğiniz yerine gidin.</div></div><audio class="audio-player" controls preload="none" id="player-${esc(m.id)}"></audio><div class="transcript-editor"><div class="transcript-head"><b>Deşifre ve kontrol</b><small>${segs.length} zamanlı bölüm · "Onaylandı" ve "Anlaşılmadı" uzman dinlemesini ifade eder; "Yeniden dinlenecek" doğrulanmış sayılmaz</small></div><div class="segments-root" id="segments-${esc(m.id)}"></div>${m.referenceSegments?.length?`<details class="reference-box"><summary>Bu test kaydı için referans metni görüntüle</summary><div>${m.referenceSegments.map(s=>`<p><b>${timecode(s.start)}–${timecode(s.end)} · ${esc(s.speaker)}</b><br>${esc(s.text)}</p>`).join('')}</div></details>`:''}</div>`;root.appendChild(card);const url=await attachObjectUrl(c,m);const player=$(`#player-${CSS.escape(m.id)}`,card);if(player&&url){player.src=url;if(m.playbackRate)player.playbackRate=m.playbackRate;}attachWave(card,m,url);renderSegments(m,card);}}
// Waveform rendering. Peaks are computed once per material and cached on the
// material object, so re-rendering the list does not re-decode the audio.
// Segment boundaries are drawn on top so the expert can see which part of the
// recording each transcript row refers to.
async function computePeaks(blob,buckets){const AC=window.AudioContext||window.webkitAudioContext;const ctx=new AC();let buf;try{buf=await ctx.decodeAudioData(await blob.arrayBuffer());}catch(e){await ctx.close();return null;}const ch=buf.numberOfChannels;const len=buf.length;const data=new Float32Array(len);for(let c=0;c<ch;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)data[i]+=d[i]/ch;}const step=Math.max(1,Math.floor(len/buckets));const peaks=new Float32Array(buckets);for(let b=0;b<buckets;b++){let max=0;const s0=b*step;const s1=Math.min(len,s0+step);for(let i=s0;i<s1;i++){const v=Math.abs(data[i]);if(v>max)max=v;}peaks[b]=max;}await ctx.close();return peaks;}
function drawWave(canvas,peaks,m){if(!canvas)return;const ctx=canvas.getContext('2d');const w=canvas.width;const h=canvas.height;ctx.clearRect(0,0,w,h);if(!peaks||!peaks.length){ctx.fillStyle='#eef2f6';ctx.fillRect(0,h/2-1,w,2);return;}const dur=Number(m.duration)||0;ctx.fillStyle='#c9d6e4';ctx.fillRect(0,0,w,h);const mid=h/2;for(let x=0;x<w;x++){const p=peaks[Math.floor(x/w*peaks.length)]||0;const bar=Math.max(1,p*mid*0.92);ctx.fillStyle='#4a7bab';ctx.fillRect(x,mid-bar,1,bar*2);}const segs=m.segments||[];if(dur>0){for(const sg of segs){const st=secondsFromTimecode(sg.start);const en=secondsFromTimecode(sg.end);if(!(en>st))continue;const x0=Math.floor(st/dur*w);const x1=Math.ceil(en/dur*w);ctx.fillStyle='rgba(49,95,145,0.10)';ctx.fillRect(x0,0,Math.max(1,x1-x0),h);ctx.strokeStyle='#315f91';ctx.beginPath();ctx.moveTo(x0,0);ctx.lineTo(x0,h);ctx.moveTo(x1,0);ctx.lineTo(x1,h);ctx.stroke();}}}
const peakCache=new Map();
function attachWave(card,m,url){const canvas=card.querySelector('canvas.wave-canvas');if(!canvas)return;const player=card.querySelector('audio');if(!player)return;const paint=()=>drawWave(canvas,peakCache.get(m.id),m);if(peakCache.has(m.id)){paint();}else if(url){getAudioBlob(currentCase(),m).then(blob=>{if(!blob)return;return computePeaks(blob,1200).then(pk=>{if(pk)peakCache.set(m.id,pk);paint();});});}canvas.addEventListener('click',e=>{const rect=canvas.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));const dur=Number(m.duration)||player.duration||0;if(dur>0){player.currentTime=ratio*dur;player.play().catch(()=>{});}});const ph=()=>{const dur=Number(m.duration)||player.duration||0;if(!(dur>0))return;paint();const x=Math.floor(player.currentTime/dur*canvas.width);const ctx=canvas.getContext('2d');ctx.strokeStyle='#b88645';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();};player.addEventListener('timeupdate',ph);player.addEventListener('seeked',ph);}
// Deşifre ve kontrol çalışma alanı. Uzmanın en çok zaman geçirdiği yer olduğu
// için tasarım üç hedefe göre kurulmuştur:
//   1) Hızlı gezinme: klavye kısayolları, oynatma hızı, bölüm filtresi.
//   2) Doğru kontrol: aktif bölüm belirgin, onaylayınca sonraki bölüme geçiş.
//   3) Denetlenebilirlik: durumlar renkle ayrılır, dolgu metni ayrıca işaretlenir.
// Filtre ve aktif bölüm materyal nesnesinde tutulur (m.uiFilter, m.activeSeg).
const SEG_FILTERS=[
  ['all','Tümü'],
  ['pending','Bekleyen'],
  ['onaylandi','Onaylandı'],
  ['anlasilmadi','Anlaşılmadı'],
  ['yeniden','Yeniden dinlenecek'],
];
const PLAYBACK_SPEEDS=[0.75,1,1.25,1.5,2];
function segFilter(m){return m.uiFilter||'all';}
function segMatchesFilter(s,filter){const r=segReview(s);if(filter==='all')return true;if(filter==='pending')return !isReviewed(s);return r===filter;}
function segCounts(m){const segs=m.segments||[];const c={all:segs.length,pending:0,onaylandi:0,anlasilmadi:0,yeniden:0};for(const s of segs){const r=segReview(s);if(r==='onaylandi')c.onaylandi++;else if(r==='anlasilmadi')c.anlasilmadi++;else if(r==='yeniden')c.yeniden++;if(!isReviewed(s))c.pending++;}return c;}
function renderSegments(m,card){
  const root=$(`#segments-${CSS.escape(m.id)}`,card);if(!root)return;
  const segs=m.segments||[];
  if(!segs.length){root.innerHTML='<div class="empty-state" style="padding:12px"><span>Henüz deşifre bölümü yok. Ses çözümlemesini başlatabilir veya elle bölüm ekleyebilirsiniz.</span></div>';return;}
  const filter=segFilter(m);const counts=segCounts(m);
  const reviewed=counts.onaylandi+counts.anlasilmadi;
  const pct=segs.length?Math.round(reviewed/segs.length*100):0;
  const active=Number.isInteger(m.activeSeg)?m.activeSeg:-1;
  // Filtre çubuğu: her durumun sayısı görünür; sıfır olanlar pasif.
  const chips=SEG_FILTERS.map(([k,label])=>`<button class="filter-chip ${filter===k?'on':''}" data-seg-filter="${k}">${label} <span class="n">${counts[k]}</span></button>`).join('');
  const shown=segs.map((s,i)=>({s,i})).filter(x=>segMatchesFilter(x.s,filter));
  const rows=shown.map(({s,i})=>{
    const rev=segReview(s);const opts=Object.keys(REVIEW_STATES).map(k=>`<option value="${k}" ${rev===k?'selected':''}>${REVIEW_STATES[k].label}</option>`).join('');
    const hist=(s.history||[]).length;
    const halluc=isHallucination(s.text);
    const cls=['seg-row',`st-${rev}`,i===active?'is-active':'',halluc?'is-halluc':''].filter(Boolean).join(' ');
    return `<tr class="${cls}" data-seg-row="${i}" tabindex="0">
      <td class="seg-no">${i+1}</td>
      <td><input class="time-input" data-seg="${i}" data-key="start" value="${esc(s.start??'')}" aria-label="Bölüm ${i+1} başlangıç"></td>
      <td><input class="time-input" data-seg="${i}" data-key="end" value="${esc(s.end??'')}" aria-label="Bölüm ${i+1} bitiş"></td>
      <td><input class="speaker-input" data-seg="${i}" data-key="speaker" value="${esc(s.speaker||'Belirtilmedi')}" aria-label="Bölüm ${i+1} konuşmacı"></td>
      <td><textarea data-seg="${i}" data-key="text" aria-label="Bölüm ${i+1} konuşma metni">${esc(s.text||'')}</textarea>${halluc?'<span class="halluc-flag">Anlamlı metin yok — dinleyip doldurun</span>':''}</td>
      <td><select class="review-select" data-seg="${i}" data-key="review" data-state="${rev}" aria-label="Bölüm ${i+1} kontrol durumu">${opts}</select>${hist?`<button class="mini-button history-button" data-history="${i}" title="Önceki metinleri görüntüle">Geçmiş (${hist})</button>`:''}</td>
      <td><div class="row-actions"><button class="icon-mini play" data-play-seg="${i}" title="Bu bölümü dinle (Boşluk)" aria-label="Bölüm ${i+1} dinle">▶</button><button class="icon-mini" data-delete-seg="${i}" title="Bölümü kaldır" aria-label="Bölüm ${i+1} kaldır">×</button></div></td>
    </tr>`;
  }).join('');
  const table=shown.length
    ? `<table class="segments-table"><thead><tr><th class="seg-no">#</th><th class="time-col">Başlangıç</th><th class="time-col">Bitiş</th><th class="speaker-col">Konuşmacı</th><th>Metin</th><th class="status-col">Kontrol durumu</th><th class="act-col"></th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="seg-hidden-note">Bu filtreye uyan bölüm yok. "Tümü" seçeneğine dönün.</div>`;
  root.innerHTML=`<div class="transcript-toolbar">
      <div class="group" role="group" aria-label="Gezinme">
        <button class="seg-tool" data-seg-nav="prev" title="Önceki bölüm (↑)">↑ Önceki</button>
        <button class="seg-tool" data-seg-nav="next" title="Sonraki bölüm (↓)">↓ Sonraki</button>
      </div>
      <div class="group" role="group" aria-label="Oynatma hızı"><span>Hız</span>${PLAYBACK_SPEEDS.map(sp=>`<button class="seg-tool speed-tool ${(m.playbackRate||1)===sp?'on':''}" data-seg-speed="${sp}" title="${sp}x hızında dinle">${sp}×</button>`).join('')}</div>
      <button class="seg-tool" data-seg-approve="1" title="Aktif bölümü onayla ve sonrakine geç (Enter)">✓ Onayla</button>
    </div>
    <div class="transcript-toolbar">${chips}</div>
    <div class="seg-progress"><div class="bar"><span style="width:${pct}%"></span></div><small>${reviewed}/${segs.length} denetlendi · %${pct}</small></div>
    ${table}
    <div class="kbd-hint"><b>Klavye:</b> <kbd>Boşluk</kbd> oynat/durdur · <kbd>↑</kbd><kbd>↓</kbd> bölüm değiştir · <kbd>Enter</kbd> aktif bölümü onayla · <kbd>Y</kbd> aktif bölümü dinle · <kbd>[</kbd><kbd>]</kbd> hız düşür/artır · <kbd>←</kbd><kbd>→</kbd> 5 sn geri/ileri · Metin alanındayken <kbd>Esc</kbd> ile çık</div>`;
}
// Aktif bölümü ayarlar ve görünür hâle getirir. Uzun kayıtta uzmanın nerede
// olduğunu kaybetmemesi için satır kaydırılır.
function setActiveSegment(m,index,{scroll=true,render=true}={}){
  const segs=m.segments||[];if(!segs.length)return;
  m.activeSeg=Math.max(0,Math.min(segs.length-1,index));
  if(render){const card=$(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');if(card)renderSegments(m,card);}
  if(scroll){const row=$(`[data-seg-row="${m.activeSeg}"]`);if(row&&row.scrollIntoView)row.scrollIntoView({block:'nearest'});}
}
// Klavye ile gezinme aktif bölümü değiştirir; filtreden bağımsız olarak
// görünür bir satır seçilir ki odak kaybolmasın.
function navSegment(m,dir){
  const segs=m.segments||[];if(!segs.length)return;
  const filter=segFilter(m);
  const order=segs.map((s,i)=>i).filter(i=>segMatchesFilter(segs[i],filter));
  const list=order.length?order:segs.map((s,i)=>i);
  const cur=Number.isInteger(m.activeSeg)?m.activeSeg:list[0];
  let pos=list.indexOf(cur);
  if(pos<0){setActiveSegment(m,list[0]);return;}
  pos=Math.max(0,Math.min(list.length-1,pos+dir));
  setActiveSegment(m,list[pos]);
}
// Aktif bölümü oynatıcıya yükleyip çalar. Uzun kayıtta tek tuşla dinleme.
function playActiveSegment(m){
  const s=m.segments?.[m.activeSeg];if(!s)return;
  const card=$(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');if(!card)return;
  playSegmentRange(card,m,s,m.activeSeg);
}
function cycleSpeed(m,delta){
  const cur=m.playbackRate||1;let i=PLAYBACK_SPEEDS.indexOf(cur);if(i<0)i=PLAYBACK_SPEEDS.indexOf(1);
  i=Math.max(0,Math.min(PLAYBACK_SPEEDS.length-1,i+delta));
  m.playbackRate=PLAYBACK_SPEEDS[i];
  const card=$(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  const player=card?.querySelector('audio');if(player)player.playbackRate=m.playbackRate;
  if(card)renderSegments(m,card);persist();
  showToast(`Oynatma hızı: ${m.playbackRate}×`);
}

// Aktif bölümü onaylar ve bir sonrakine geçer. Uzmanın dinle-düzelt-onayla
// döngüsünü tek tuşla sürdürmesi için tasarlandı; uzun kayıtta elle satır
// seçmek gerekmez. Filtre "Bekleyen" iken onaylanan satır listeden düşer.
function approveActiveSegment(m){
  const segs=m.segments||[];if(!segs.length)return;
  if(!Number.isInteger(m.activeSeg))m.activeSeg=0;
  const s=segs[m.activeSeg];if(!s)return;
  s.review='onaylandi';s.checked=true;
  const card=$(`#segments-${CSS.escape(m.id)}`)?.closest('.audio-card');
  persist();renderOverview();
  const next=m.activeSeg+1;
  if(next<segs.length){m.activeSeg=next;} // sonraki bölüme geç
  if(card)renderSegments(m,card);
  const row=$(`[data-seg-row="${m.activeSeg}"]`);if(row&&row.scrollIntoView)row.scrollIntoView({block:'nearest'});
  if($('#view-report').classList.contains('active'))renderReport();
  showToast(`Bölüm ${m.activeSeg+1}/${segs.length} — onaylandı.`);
}
// Satıra tıklanınca o satır aktif bölüm olur; uzman fareyle de bağlam kurabilir.
function focusSegmentRow(row){
  const card=row.closest('.audio-card');if(!card)return;
  const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;
  const m=currentCase().materials.find(x=>x.id===id);if(!m)return;
  m.activeSeg=Number(row.dataset.segRow);
  card.querySelectorAll('tr.seg-row.is-active').forEach(r=>r.classList.remove('is-active'));
  row.classList.add('is-active');
  // Klavye kısayollarının çalışması için satır odaklanır; böylece uzman fareyle
  // bir bölüme geçip ardından klavyeyle devam edebilir.
  if(row.focus)row.focus({preventScroll:true});
}
// Klavye kısayolları: metin alanlarına yazarken devreye girmez (bkz. keydown
// yöneticisi). Burada yalnızca hangi tuşun ne yaptığı tanımlıdır.
function handleSegKey(e,card,m){
  const tag=(e.target.tagName||'').toLowerCase();
  const typing=tag==='textarea'||tag==='input'||tag==='select';
  if(e.ctrlKey||e.metaKey||e.altKey)return false;
  // Metin alanında yazarken kısayollar devre dışıdır (yoksa yazılamaz). Esc ile
  // alandan çıkılır ve satır odaklanır; uzman yazmayı bitirip klavyeyle sürdürür.
  if(e.key==='Escape'&&typing){e.preventDefault();e.target.blur();const row=e.target.closest('tr.seg-row');if(row&&row.focus)row.focus({preventScroll:true});return true;}
  if(e.key==='ArrowUp'&&!typing){navSegment(m,-1);e.preventDefault();return true;}
  if(e.key==='ArrowDown'&&!typing){navSegment(m,1);e.preventDefault();return true;}
  if(e.key===' '&&!typing){const player=card.querySelector('audio');if(player){player.paused?player.play().catch(()=>{}):player.pause();}e.preventDefault();return true;}
  if(e.key==='Enter'&&!typing){approveActiveSegment(m);e.preventDefault();return true;}
  if(e.key==='Enter'&&tag==='input'){e.preventDefault();e.target.blur();return true;}
  if((e.key==='y'||e.key==='Y')&&!typing){playActiveSegment(m);e.preventDefault();return true;}
  if(e.key==='['&&!typing){cycleSpeed(m,-1);e.preventDefault();return true;}
  if(e.key===']'&&!typing){cycleSpeed(m,1);e.preventDefault();return true;}
  if(e.key==='ArrowLeft'&&!typing){const player=card.querySelector('audio');if(player)player.currentTime=Math.max(0,player.currentTime-5);e.preventDefault();return true;}
  if(e.key==='ArrowRight'&&!typing){const player=card.querySelector('audio');if(player)player.currentTime=player.currentTime+5;e.preventDefault();return true;}
  return false;
}
// Seek the card's player to the segment start and play, so the expert can
// verify the transcript against the actual audio without hunting for the time.
function secondsFromTimecode(t){const p=String(t||'').split(':').map(Number);if(p.some(Number.isNaN))return 0;if(p.length===3)return p[0]*3600+p[1]*60+p[2];if(p.length===2)return p[0]*60+p[1];return p[0]||0;}
// Bir bölümün zaman aralığını çalar ve bitişte durur. Oynatma hızı uygulanır,
// böylece uzman uzun kayıtları hızlandırarak dinleyebilir. Aktif bölüm işaretlenir.
function playSegmentRange(card,m,s,index){
  const player=card.querySelector('audio');if(!player)return;
  const start=secondsFromTimecode(s.start);const end=secondsFromTimecode(s.end);
  player.playbackRate=m.playbackRate||1;
  player.currentTime=start;player.play().catch(()=>{});
  if(Number.isInteger(index)){m.activeSeg=index;const root=$(`#segments-${CSS.escape(m.id)}`,card);if(root)renderSegments(m,card);}
  if(end>start){const stop=()=>{if(player.currentTime>=end){player.pause();player.removeEventListener('timeupdate',stop);}};player.removeEventListener('timeupdate',stop);player.addEventListener('timeupdate',stop);}
  showToast(`Bölüm ${(index??0)+1} dinleniyor: ${s.start||'—'}–${s.end||'—'}`);
}
function playSegment(btn){const card=btn.closest('.audio-card');if(!card)return;const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=currentCase().materials.find(x=>x.id===id);const i=Number(btn.dataset.playSeg);const s=m?.segments?.[i];if(!s)return;playSegmentRange(card,m,s,i);}
function showSegmentHistory(m,index,anchor){const s=m.segments[index];if(!s)return;const existing=document.querySelector('.history-dialog');if(existing)existing.remove();const items=(s.history||[]).slice().reverse();const dlg=document.createElement('div');dlg.className='history-dialog';dlg.innerHTML=`<div class="history-inner"><div class="history-head"><b>${esc(m.name)} · bölüm ${index+1} metin geçmişi</b><button class="mini-button" data-close-history>Kapat</button></div><div class="history-body">${items.length?items.map(h=>`<div class="history-item"><small>${esc(new Date(h.at).toLocaleString('tr-TR'))}</small><p>${esc(h.text||'(boş)')}</p></div>`).join(''):'<p class="paper-muted">Bu bölüm için kayıtlı önceki metin yok.</p>'}</div></div>`;document.body.appendChild(dlg);dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.dataset.closeHistory!==undefined)dlg.remove();});}
async function sha256(blob){try{const buf=await blob.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}catch(e){return 'Hesaplanamadı (tarayıcı güvenlik kısıtı)';}}
// Technical inventory for the evidence record. The browser can only expose
// container-level facts (codec, channel count, sample rate, bit depth); these are
// read straight from the decoded buffer or the WAV header, never guessed.
async function audioTech(blob){const info={channels:null,sampleRate:null,bitDepth:null,codec:null};try{const buf=await blob.arrayBuffer();const dv=new DataView(buf);if(buf.byteLength>12&&dv.getUint32(0,false)===0x52494646&&dv.getUint32(8,false)===0x57415645){let off=12;while(off+8<=buf.byteLength){const id=dv.getUint32(off,false);const size=dv.getUint32(off+4,true);if(id===0x666d7420&&off+24<=buf.byteLength){info.codec='PCM (WAV)';info.channels=dv.getUint16(off+10,true);info.sampleRate=dv.getUint32(off+12,true);info.bitDepth=dv.getUint16(off+22,true);break;}off+=8+size+(size%2);}if(info.codec)return info;}}catch(e){}try{const AC=window.AudioContext||window.webkitAudioContext;const ctx=new AC();const audio=await ctx.decodeAudioData(await blob.arrayBuffer());info.channels=audio.numberOfChannels;info.sampleRate=audio.sampleRate;await ctx.close();}catch(e){}const t=(blob.type||'').toLowerCase();info.codec=t.includes('mpeg')?'MPEG (MP3)':t.includes('mp4')||t.includes('m4a')?'AAC (M4A/MP4)':t.includes('ogg')?'Vorbis (OGG)':t.includes('flac')?'FLAC':'Bilinmiyor';return info;}
function fmtChannels(n){if(!n)return '—';return n===1?'Mono (1 kanal)':n===2?'Stereo (2 kanal)':`${n} kanal`;}
async function audioDuration(blob){try{const AC=window.AudioContext||window.webkitAudioContext;const ctx=new AC();const buf=await ctx.decodeAudioData(await blob.arrayBuffer());const dur=buf.duration;await ctx.close();return dur;}catch(e){return 0;}}
async function addAudioFiles(files,opts={}){const c=currentCase();if(!c)return;for(const file of files){if(!file.type.startsWith('audio/')&&!/\.(wav|mp3|m4a|ogg|flac|aac)$/i.test(file.name)){showToast(`${file.name}: ses dosyası değil, atlandı.`);continue;}const id=uid();const tech=await audioTech(file);const m={id,name:file.name,type:file.type||'audio',size:file.size,duration:await audioDuration(file),sha256:await sha256(file),tech,segments:[],status:'İnceleme bekliyor',synthetic:!!opts.synthetic,addedAt:new Date().toISOString(),log:[]};c.materials.push(m);m.log.push({at:m.addedAt,event:'Kayıt eklendi',detail:`${file.name} · ${file.size} bayt · SHA-256 hesaplandı`});await storeBlob(blobKey(c,m),file);const url=URL.createObjectURL(file);objectUrls.set(blobKey(c,m),url);}persist();renderOverview();renderAudioList();showToast(`${files.length} ses dosyası eklendi.`);}
async function ensureModel(){const modelId=$('#modelSelect').value;if(asrPipeline&&asrPipeline.__modelId===modelId)return asrPipeline;if(modelLoading)throw new Error('Model yükleniyor. Lütfen bekleyin.');modelLoading=true;const spec=ASR_MODELS[modelId]||ASR_MODELS[DEFAULT_ASR_MODEL];$('#modelStatus').textContent='Konuşma modeli ve gerekli çalışma dosyaları indiriliyor… İlk kullanımda dosya boyutu yüksek olabilir.';$('#loadModelBtn').disabled=true;try{const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2');env.allowLocalModels=false;env.useBrowserCache=true;if(asrPipeline&&asrPipeline.dispose){try{await asrPipeline.dispose();}catch(e){}}asrPipeline=await pipeline('automatic-speech-recognition',modelId,{device:asrDevice,dtype:spec.dtype,progress_callback:(p)=>{if(p.status==='progress')$('#modelStatus').textContent=`Model indiriliyor: ${p.file||''} ${Number(p.progress||0).toFixed(0)}%`;else if(p.status==='ready')$('#modelStatus').textContent='Model hazır.';}});asrPipeline.__spec=spec;asrPipeline.__modelId=modelId;$('#modelStatus').textContent=(spec.warn?'Model hazır. Bu model hızlıdır ancak doğruluğu düşüktür; metni mutlaka kayıttan doğrulayın.':'Model hazır. Türkçe kaynak dili ve transkripsiyon görevi zorunlu olarak kullanılacak.')+` Çalışma birimi: ${asrDevice==='webgpu'?'WebGPU':'WASM (CPU)'}.`;showToast('Konuşma modeli hazır.');refreshStorage();return asrPipeline;}catch(e){asrPipeline=null;$('#modelStatus').textContent=`Model yüklenemedi: ${e.message}. İnternet bağlantısını ve tarayıcı izinlerini kontrol edin.`;throw e;}finally{modelLoading=false;$('#loadModelBtn').disabled=false;}}
async function decodeForAsr(blob){const AC=window.AudioContext||window.webkitAudioContext;const ctx=new AC({sampleRate:16000});let buffer=await ctx.decodeAudioData(await blob.arrayBuffer());if(buffer.sampleRate!==16000){const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;const offline=new Offline(1,Math.ceil(buffer.duration*16000),16000);const source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start(0);buffer=await offline.startRendering();}const out=new Float32Array(buffer.length);if(buffer.numberOfChannels===1)out.set(buffer.getChannelData(0));else{for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)out[i]+=data[i]/buffer.numberOfChannels;}}await ctx.close();return out;}
// Long recordings are decoded and transcribed window by window. Keeping one
// window in memory at a time avoids holding a second full-length Float32Array,
// and persisting after every window means an interrupted run resumes instead of
// restarting. 30 s matches Whisper's own receptive window.
const ASR_WINDOW_SECONDS = 30;
// Segment review states. "checked" from earlier versions maps to "onaylandi" so
// existing MİHENK/AKİS records keep their meaning. Only onaylandi and anlasilmadi
// count as reviewed: "yeniden" means the expert still has to listen again, and
// must never be reported as verified.
const REVIEW_STATES={onaylandi:{label:'Onaylandı',cls:'good'},bekliyor:{label:'Kontrol bekliyor',cls:''},anlasilmadi:{label:'Anlaşılmadı',cls:'warn'},yeniden:{label:'Yeniden dinlenecek',cls:'warn'}};
function segReview(s){if(s.review&&REVIEW_STATES[s.review])return s.review;return s.checked?'onaylandi':'bekliyor';}
function isReviewed(s){const r=segReview(s);return r==='onaylandi'||r==='anlasilmadi';}
function reviewLabel(s){return REVIEW_STATES[segReview(s)].label;}
// Metin geçmişi, her tuş vuruşunda değil düzenleme oturumu başına bir kez tutulur.
// Focus anında metnin anlık görüntüsü saklanır, blur anında gerçekten değiştiyse
// geçmişe eklenir. Böylece geçmiş gerçek önceki sürümleri gösterir, tuş tuş dolmaz.
function snapshotSegmentText(s){s.__editSnapshot=s.text||'';}
function pushSegmentHistory(s,prevText){if(!s.history)s.history=[];const prev=prevText??s.__editSnapshot??'';if(prev===(s.text||''))return false;s.history.push({text:prev,at:new Date().toISOString()});if(s.history.length>20)s.history.shift();return true;}
function timecode(seconds){if(seconds==null||!Number.isFinite(seconds))return '00:00:00';const s=Math.max(0,Math.floor(seconds));return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
// Filler-only output ("(Konuşma)", "(Müzik - Jenerik)" and similar bracketed tokens)
// is how Whisper reports hallucinated silence. Such a segment carries no transcript,
// so it must never be presented as analysed speech.
const HALLUCINATION_RE=/^[\s(]*[(\[]?\s*(konuşma|müzik|jenerik|kalabalık|nefes|alkış|sessizlik|tutaklar|beep|music|applause|silence|blank|no speech)[\s\S]*?[)\]]?\s*$/i;
function isHallucination(text){const t=String(text||'').trim();if(!t)return true;const stripped=t.replace(/[()\[\]\s.]/g,'');if(!stripped)return true;return HALLUCINATION_RE.test(t)&&t.length<60;}
// Transcribe one decoded window. chunk_length_s is omitted because the caller
// already sliced the audio, so the pipeline must not chunk it a second time.
// Re-hash the stored blob and compare with the value captured on import. A
// mismatch means the stored copy no longer matches what was recorded, which is
// exactly the kind of change the evidence chain has to surface.
async function verifyIntegrity(id){const c=currentCase(),m=c.materials.find(x=>x.id===id);if(!m)return;const blob=await getAudioBlob(c,m);if(!blob){showToast('Kayıt yerel depoda bulunamadı; doğrulanamadı.');return;}const now=await sha256(blob);const ok=now===m.sha256;m.lastVerify={at:new Date().toISOString(),ok,hash:now};(m.log=m.log||[]).push({at:m.lastVerify.at,event:'SHA-256 doğrulama',detail:ok?'Özet eşleşti; dosya değişmemiş.':`Özet farklı! Beklenen ${m.sha256}, bulunan ${now}`});persist();renderAudioList();showToast(ok?'SHA-256 doğrulandı; dosya değişmemiş.':'Uyarı: dosya özeti değişmiş görünüyor!');}
function showEvidenceLog(m){const existing=document.querySelector('.history-dialog');if(existing)existing.remove();const items=(m.log||[]).slice().reverse();const dlg=document.createElement('div');dlg.className='history-dialog';dlg.innerHTML=`<div class="history-inner"><div class="history-head"><b>${esc(m.name)} · delil işlem günlüğü</b><button class="mini-button" data-close-history>Kapat</button></div><div class="history-body">${items.length?items.map(h=>`<div class="history-item"><small>${esc(new Date(h.at).toLocaleString('tr-TR'))} · ${esc(h.event)}</small><p>${esc(h.detail||'')}</p></div>`).join(''):'<p class="paper-muted">Bu kayıt için işlem günlüğü boş.</p>'}</div></div>`;document.body.appendChild(dlg);dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.dataset.closeHistory!==undefined)dlg.remove();});}
async function transcribeWindow(pipe,window,offsetSeconds){const result=await pipe(window,{language:'turkish',task:'transcribe',return_timestamps:true});const chunks=(result.chunks||[]).filter(x=>String(x.text||'').trim());const out=[];if(chunks.length){for(const x of chunks){const st=(x.timestamp?.[0]??0);const en=(x.timestamp?.[1]??x.timestamp?.[0]??0);out.push({start:timecode(offsetSeconds+st),end:timecode(offsetSeconds+en),text:String(x.text||'').trim()});}}else if(String(result.text||'').trim()){out.push({start:timecode(offsetSeconds),end:timecode(offsetSeconds+window.length/16000),text:String(result.text||'').trim()});}return out;}
async function transcribe(id){const c=currentCase(),m=c.materials.find(x=>x.id===id);if(!m)return;const blob=await getAudioBlob(c,m);if(!blob){showToast('Ses dosyası yerel depoda bulunamadı. Yeniden ekleyin.');return;}try{const pipe=await ensureModel();m.status='Çözümleme sürüyor';m.hallucinationWarning=null;m.progress=0;persist();renderAudioList();const audio=await decodeForAsr(blob);const total=audio.length;const step=ASR_WINDOW_SECONDS*16000;const collected=[];for(let offset=0;offset<total;offset+=step){if(m.cancelRequested){m.cancelRequested=false;m.status=collected.length?'Kısmen çözümlendi (iptal edildi)':'İptal edildi';delete m.progress;persist();renderAudioList();renderOverview();showToast(`${m.name} için çözümleme iptal edildi.`);return;}const window=audio.subarray(offset,Math.min(total,offset+step));let found=[];let windowError=null;try{found=await transcribeWindow(pipe,window,offset/16000);}catch(err){windowError=err;console.warn('Pencere çözümlenemedi',offset,err);}if(windowError){m.failedWindows=(m.failedWindows||0)+1;}else{for(const f of found)collected.push({...f,speaker:'Belirtilmedi',checked:false});}m.progress=Math.min(100,Math.round((offset+window.length)/total*100));persist();renderAudioList();}const meaningful=collected.filter(s=>!isHallucination(s.text));m.segments=collected;const fillerCount=collected.length-meaningful.length;if(m.failedWindows){m.hallucinationWarning=(m.hallucinationWarning?m.hallucinationWarning+' ':'')+`${m.failedWindows} pencere çözümlenemedi; bu bölümler kayıttan elle dinlenip doldurulmalıdır.`;}delete m.failedWindows;if(!collected.length){m.status='Çözümleme sonucu boş';m.hallucinationWarning='Model bu kayıtta konuşma tespit edemedi. Kaydı elle dinleyip bölümleri kendiniz girin.';}else if(!meaningful.length){m.status='Çözümleme sonucu boş';m.hallucinationWarning='Model bu kayıtta anlamlı konuşma metni üretemedi. Sonuç rapora aktarılmamalıdır; kaydı elle dinleyip bölümleri kendiniz girin.';}else{if(fillerCount){m.hallucinationWarning=`${fillerCount} bölümde anlamlı metin yerine dolgu ifadesi üretildi; bu bölümler uzman tarafından dinlenerek doldurulmalıdır.`;}m.status='Kontrol bekliyor';}delete m.progress;m.transcribedAt=new Date().toISOString();(m.log=m.log||[]).push({at:m.transcribedAt,event:'Çözümleme tamamlandı',detail:`${meaningful.length} anlamlı bölüm, ${fillerCount||0} dolgu bölümü`});const text=meaningful.map(s=>s.text).join(' ');const latinEnglish=(/\b(the|and|you|are|this|that|with|have|for)\b/i.test(text)&&!/[çğıöşüÇĞİÖŞÜ]/.test(text));if(latinEnglish){m.languageWarning='Çıktı Türkçe dışı görünebilir; kaydı dinleyerek kontrol edin.';}else{delete m.languageWarning;}persist();renderAudioList();renderOverview();showToast(`${m.name} için çözümleme tamamlandı. Metin kontrol bekliyor.`);}catch(e){m.status='Çözümleme hatası';delete m.progress;persist();renderAudioList();showToast(`Çözümleme başarısız: ${e.message}`);}}
// A new manual segment starts where the previous one ended, or at the player's
// current position, so the expert does not have to type timecodes by hand while
// listening. Both fall back to 00:00:00 when neither is available.
function addManualSegment(id){const c=currentCase(),m=c.materials.find(x=>x.id===id);if(!m)return;m.segments=m.segments||[];const last=m.segments[m.segments.length-1];let start=last?last.end:null;if(!start){const card0=$(`[data-transcribe="${CSS.escape(id)}"]`)?.closest('.audio-card');const pl=card0?.querySelector('audio');if(pl&&Number.isFinite(pl.currentTime)&&pl.currentTime>0)start=timecode(pl.currentTime);}start=start||'00:00:00';m.segments.push({start,end:start,speaker:'Konuşmacı 1',text:'',checked:false});persist();const card=$(`[data-transcribe="${CSS.escape(id)}"]`)?.closest('.audio-card');if(card)renderSegments(m,card);renderOverview();}
function niceDate(d){if(!d)return '—';try{return new Date(`${d}T00:00:00`).toLocaleDateString('tr-TR');}catch(e){return d;}}
// Court type drives the cover-field terminology and the report heading. The
// Ministry publishes a separate template per jurisdiction, so a criminal file
// must not be labelled with civil "davacı/davalı" roles.
// Cover-field terminology per jurisdiction, taken from the Ministry's published
// templates. Measured fact: all four templates use the *same* seven report
// sections; only the cover labels differ. So jurisdiction handling lives here,
// not in the section structure.
const REPORT_TYPES = {
  hukuk: { label:'HUKUK MAHKEMELERİ – İDARE / VERGİ MAHKEMELERİ', heading:'BİLİRKİŞİ RAPORU', merci:'Mahkeme',
    fileNo:'DOSYA NO',
    roles:{ plaintiff:'DAVACI', plaintiffCounsel:'DAVACI VEKİLİ', defendant:'DAVALI', defendantCounsel:'DAVALI VEKİLİ' },
    subject:'DAVA KONUSU', date:'DAVA TARİHİ' },
  ceza: { label:'CEZA MAHKEMELERİ', heading:'BİLİRKİŞİ RAPORU', merci:'Mahkeme',
    fileNo:'DOSYA NO',
    roles:{ plaintiff:'MÜŞTEKİ/MAĞDUR /KATILAN', plaintiffCounsel:'VEKİLİ', defendant:'SANIK', defendantCounsel:'SANIK VEKİLİ' },
    subject:'İNCELEME KONUSU', date:'SUÇ TARİHİ' },
  savcilik: { label:'CUMHURİYET BAŞSAVCILIĞI', heading:'BİLİRKİŞİ RAPORU', merci:'Cumhuriyet Başsavcılığı',
    fileNo:'SORUŞTURMA NO',
    roles:{ plaintiff:'MÜŞTEKİ/MAĞDUR', plaintiffCounsel:'VEKİLİ', defendant:'ŞÜPHELİ', defendantCounsel:'ŞÜPHELİ VEKİLİ' },
    subject:'SORUŞTURMA KONUSU', date:'SUÇ TARİHİ' },
  icra: { label:'İCRA MÜDÜRLÜĞÜ', heading:'BİLİRKİŞİ RAPORU', merci:'İcra Müdürlüğü',
    fileNo:'DOSYA NO',
    roles:{ plaintiff:'ALACAKLI', plaintiffCounsel:'ALACAKLI VEKİLİ', defendant:'BORÇLU', defendantCounsel:'BORÇLU VEKİLİ' },
    subject:'TAKİP KONUSU', date:'TAKİP TARİHİ' },
};
// Turkish dative suffix for institution names, so the report heading reads
// "…MAHKEMESİ'NE", "…BAŞSAVCILIĞI'NA", "…MÜDÜRLÜĞÜ'NE" instead of a fixed "NE".
// Buffer is 'n' after a 3rd-person possessive, otherwise 'y'; the vowel follows
// the last vowel of the name (back -> a, front -> e).
const TR_VOWELS='aeıioöuü';
const TR_POSSESSIVE=/(sı|si|su|sü|ğı|ği|ğu|ğü)$/;
function trDative(name){const s=String(name||'').trim();if(!s)return 'NE';const lower=s.toLocaleLowerCase('tr-TR');let last='e';for(let i=lower.length-1;i>=0;i--){if(TR_VOWELS.includes(lower[i])){last=lower[i];break;}}const back='aıou'.includes(last);const v=back?'a':'e';const endsVowel=TR_VOWELS.includes(lower[lower.length-1]);const suf=endsVowel?(TR_POSSESSIVE.test(lower)?'n':'y')+v:v;return suf.toLocaleUpperCase('tr-TR');}
function reportTypeSpec(t){return REPORT_TYPES[t]||REPORT_TYPES.hukuk;}
function reportTypeLabel(t){return reportTypeSpec(t).label;}
function reportRows(c){const spec=reportTypeSpec(c.reportType);const r=spec.roles;return [[spec.fileNo,c.fileNo],[r.plaintiff,c.plaintiff],[r.plaintiffCounsel,c.plaintiffCounsel],[r.defendant,c.defendant],[r.defendantCounsel,c.defendantCounsel],[spec.subject,c.subject],[spec.date,niceDate(c.caseDate)],['GÖREVLENDİRME TARİHİ',niceDate(c.assignmentDate)],['VERİLEN SÜRE',c.assignmentDurationDays?`${c.assignmentDurationDays} GÜN`:'' ],['SON TESLİM TARİHİ',niceDate(c.dueDate)],['KEŞİF / İNCELEME TARİHİ',niceDate(c.inspectionDate)],['RAPOR TARİHİ',niceDate(c.reportDate)],['BİLİRKİŞİ ADI SOYADI',c.expertName],['UZMANLIK ALANI',c.expertField],['BİLİRKİŞİ SİCİL NO',c.registryNo]].filter(x=>x[1]&&x[1]!=='—');}
function renderReport(){
  const c=currentCase();if(!c)return;
  const materials=c.materials||[];const allSegs=materials.flatMap(m=>m.segments||[]);const checked=allSegs.filter(s=>isReviewed(s)).length;const warnings=[];
  if(!c.court||!c.fileNo||!c.expertName)warnings.push(REPORT_TEXT.warnMissingFields);
  if(!materials.length)warnings.push(REPORT_TEXT.warnNoMaterials);
  if(allSegs.length&&checked<allSegs.length)warnings.push(`${allSegs.length-checked} deşifre bölümü henüz uzman tarafından kontrol edilmedi.`);
  const anlasilmadi=allSegs.filter(s=>segReview(s)==='anlasilmadi').length;
  if(anlasilmadi)warnings.push(`${anlasilmadi} bölüm "anlaşılmadı" olarak işaretlendi; bu bölümler için metin iddia edilmemelidir.`);
  if(materials.some(m=>m.languageWarning))warnings.push(REPORT_TEXT.warnLanguage);
  if(materials.some(m=>m.hallucinationWarning))warnings.push(REPORT_TEXT.warnHallucination);
  const blankSegs=allSegs.filter(s=>isHallucination(s.text)).length;
  if(blankSegs)warnings.push(`${blankSegs} deşifre bölümünde anlamlı metin yok (dolgu/boş).`);
  const warning=$('#reportWarning');if(warnings.length){warning.classList.add('show');warning.innerHTML=`<b>${esc(REPORT_TEXT.warnPreReport)}</b> `+warnings.map(esc).join(' ');}else{warning.classList.remove('show');warning.innerHTML='';}
  const toc=REPORT_TEXT.sections;
  let html=`<div class="paper-topline"><span>${esc(reportTypeLabel(c.reportType))}</span><span>UZMANLIK ALANI · 56.12</span></div><div class="paper-title"><div class="republic">T.C.</div><h2>${esc((c.court||REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR'))}’${esc(trDative(c.court||'Mahkemesi'))}</h2><h2>${esc(reportTypeSpec(c.reportType).heading)}</h2><p>${esc(REPORT_TEXT.subtitle)}</p></div>`;
  if(c.synthetic)html+=`<div class="paper-synthetic">${esc(REPORT_TEXT.synthetic)}</div>`;
  html+=`<table class="paper-table cover-fields"><tbody>${reportRows(c).map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>`;
  html+=`<div class="paper-section toc-section"><h3>${esc(REPORT_TEXT.tocHeading)}</h3><ol>${toc.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`;
  html+=`<div class="paper-page-break"><div class="paper-section"><h3>${esc(REPORT_TEXT.sections[0])}</h3><p>${esc(c.assignmentScope||REPORT_TEXT.defaultScope)}</p><p><b>İnceleme konusu:</b> ${esc(c.subject||'—')}</p></div>`;
  html+=`<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[1])}</h3>`;
  if(c.questions?.length){html+=`<ol class="question-list">${c.questions.map(q=>`<li>${esc(q.question||REPORT_TEXT.defaultQuestion)}</li>`).join('')}</ol>`;}else html+=`<p>${esc(REPORT_TEXT.defaultQuestions)}</p>`;
  html+=`</div>`;
  html+=`<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[2])}</h3><p>${esc(REPORT_TEXT.defaultInventoryIntro)}</p><table class="paper-table"><thead><tr>${REPORT_TEXT.inventoryHeaders.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${materials.length?materials.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.tech?.codec||m.type||REPORT_TEXT.codecFallback)} / ${fmtSize(m.size)}</td><td>${fmtTime(m.duration||0)}</td><td>${esc(fmtChannels(m.tech?.channels))}${m.tech?.sampleRate?' · '+esc(m.tech.sampleRate)+' Hz':''}${m.tech?.bitDepth?' · '+esc(m.tech.bitDepth)+' bit':''}</td><td style="font-size:8px;word-break:break-all">${esc(m.sha256||'Hesaplanamadı')}</td></tr>`).join(''):`<tr><td colspan="5">${esc(REPORT_TEXT.noInventoryRow[0])}</td></tr>`}</tbody></table><p class="paper-muted">${esc(REPORT_TEXT.inventoryNote)}</p></div>`;
  html+=`<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[3])}</h3><p>${esc(c.methodText||DEFAULT_METHOD).replace(/\n/g,'<br>')}</p></div>`;
  html+=`<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[4])}</h3><h4>${esc(REPORT_TEXT.sub51)}</h4>`;
  if(materials.length){for(let i=0;i<materials.length;i++){const m=materials[i];html+=`<h4>5.1.${i+1}. ${esc(m.name)}</h4><p class="paper-muted">Süre: ${fmtTime(m.duration||0)} · Biçim: ${esc(m.type||REPORT_TEXT.codecFallback)} · ${esc(REPORT_TEXT.segmentCountLabel)}: ${(m.segments||[]).length}</p>`;if(m.hallucinationWarning)html+=`<p class="paper-muted">${esc(REPORT_TEXT.evidenceWarningPrefix)} ${esc(m.hallucinationWarning)}</p>`;if(m.languageWarning)html+=`<p class="paper-muted">${esc(REPORT_TEXT.languageWarningPrefix)} ${esc(m.languageWarning)}</p>`;if(m.segments?.length){html+=`<table class="paper-table"><thead><tr>${REPORT_TEXT.segmentHeaders.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${m.segments.map(s=>`<tr><td>${esc(s.start||REPORT_TEXT.timeDash)} – ${esc(s.end||REPORT_TEXT.timeDash)}</td><td>${esc(s.speaker||REPORT_TEXT.emptySpeaker)}</td><td>${esc(s.text||'')}</td><td>${reviewLabel(s)}</td></tr>`).join('')}</tbody></table>`;}else html+=`<p>${esc(REPORT_TEXT.noTranscript)}</p>`;}}else html+=`<p>${esc(REPORT_TEXT.noMaterials)}</p>`;
  html+=`<h4>${esc(REPORT_TEXT.sub52)}</h4>`;
  if(c.questions?.length){for(let i=0;i<c.questions.length;i++){const q=c.questions[i];html+=`<h4>5.2.${i+1}. ${esc(q.question||REPORT_TEXT.defaultQuestion)}</h4><p>${esc(q.answer||REPORT_TEXT.defaultAnswer)}</p><p class="paper-muted"><b>Dayanak:</b> ${esc(q.basis||REPORT_TEXT.defaultBasis)}</p>`;}}else html+=`<p>${esc(REPORT_TEXT.defaultEvaluation)}</p>`;
  html+=`<h4>${esc(REPORT_TEXT.sub53)}</h4><p>${esc(c.limitationsText||REPORT_TEXT.defaultLimitations)}</p></div>`;
  html+=`<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[5])}</h3><p>${esc(c.conclusionText||REPORT_TEXT.defaultConclusion)}</p></div>`;
  html+=`<div class="paper-section"><h3>${esc(REPORT_TEXT.sections[6])}</h3><p>${esc(REPORT_TEXT.attachmentsText)}</p></div><div class="paper-signature"><div><b>${esc(c.expertName||REPORT_TEXT.defaultExpert)}</b><br>${esc(c.expertField||REPORT_TEXT.defaultField)}<br>${esc(REPORT_TEXT.signatureRegistry)}: ${esc(c.registryNo||REPORT_TEXT.emptyFileNo)}<br><span class="paper-muted">${esc(REPORT_TEXT.signatureLabel)}</span></div></div><div class="paper-footer"><span>AKİS çalışma çıktısı · ${esc(c.fileNo||REPORT_TEXT.fileMissing)}</span><span>Rapor tarihi: ${esc(niceDate(c.reportDate))}</span></div></div>`;
  $('#reportPreview').innerHTML=html;$('#reportStatus').innerHTML=`<span class="status-dot"></span>${materials.length} kayıt · ${allSegs.length} deşifre bölümü · ${checked} kontrol edildi`;
}
function xesc(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function wRun(text,{bold=false,color=null,size=20,italic=false}={}){return `<w:r><w:rPr>${bold?'<w:b/>':''}${italic?'<w:i/>':''}${color?`<w:color w:val="${color}"/>`:''}<w:sz w:val="${size}"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/></w:rPr><w:t xml:space="preserve">${xesc(text)}</w:t></w:r>`;}
function wP(text='',{style=null,bold=false,color=null,size=22,align=null,before=0,after=80,keep=false,italic=false}={}){const ppr=`<w:pPr>${style?`<w:pStyle w:val="${style}"/>`:''}${align?`<w:jc w:val="${align}"/>`:''}<w:spacing w:before="${before}" w:after="${after}" w:line="300" w:lineRule="auto"/>${keep?'<w:keepNext/>':''}</w:pPr>`;const runs=String(text).split('\n').map((line,i)=>(i?'<w:r><w:br/></w:r>':'')+wRun(line,{bold,color,size,italic})).join('');return `<w:p>${ppr}${runs}</w:p>`;}
function cell(text,{header=false,shade=null,bold=false,width=2200,size=18,color=null}={}){const sh=shade?`<w:shd w:fill="${shade}"/>`:'';const col=header?'FFFFFF':(color||'24384D');const p=`<w:p><w:pPr><w:spacing w:after="50" w:line="240"/></w:pPr>${wRun(text,{bold:bold||header,color:col,size})}</w:p>`;return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${sh}<w:vAlign w:val="center"/></w:tcPr>${p}</w:tc>`;}
function wTable(rows,{widths=null,header=true,shadeFirstCol=false}={}){const n=rows[0]?.length||1;const ws=widths||Array(n).fill(Math.floor(9000/n));const borders='<w:tblBorders><w:top w:val="single" w:sz="5" w:color="C9D5E1"/><w:left w:val="single" w:sz="5" w:color="C9D5E1"/><w:bottom w:val="single" w:sz="5" w:color="C9D5E1"/><w:right w:val="single" w:sz="5" w:color="C9D5E1"/><w:insideH w:val="single" w:sz="4" w:color="E1E8EF"/><w:insideV w:val="single" w:sz="4" w:color="E1E8EF"/></w:tblBorders>';const r=rows.map((row,ri)=>`<w:tr>${header&&ri===0?'<w:trPr><w:tblHeader w:val="true"/></w:trPr>':''}${row.map((t,ci)=>{const isHead=header&&ri===0;const shade=isHead?'1C426B':(shadeFirstCol&&ci===0?'EAF0F6':(ri%2===0?'F8FAFC':null));return cell(String(t??''),{header:isHead,shade,bold:isHead||(shadeFirstCol&&ci===0),width:ws[ci]||2200,size:isHead?17:18,color:shadeFirstCol&&ci===0?'1C426B':null});}).join('')}</w:tr>`).join('');return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="95" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="95" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${r}</w:tbl>`;}
function headingXml(text,level=1){return wP(text,{style:`Heading${level}`,color:level===1?'1C426B':'385873',bold:true,size:level===1?24:20,before:level===1?220:140,after:90,keep:true});}
function docxXml(c){
  let body='';
  body+=wP('T.C.',{bold:true,color:'1C426B',size:24,align:'center',before:120,after:90});
  body+=wP((c.court||REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR')+'’'+trDative(c.court||'Mahkemesi'),{bold:true,color:'1C426B',size:26,align:'center',after:180,keep:true});
  body+=wP(reportTypeSpec(c.reportType).heading,{bold:true,color:'1C426B',size:34,align:'center',before:170,after:100,keep:true});
  body+=wP(REPORT_TEXT.subtitle,{color:'58718A',size:18,align:'center',after:240});
  if(c.synthetic){body+=`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="90" w:after="170"/></w:pPr>${wRun(REPORT_TEXT.synthetic,{bold:true,color:'9A6B2D',size:18})}</w:p>`;}
  const coverSpec=reportTypeSpec(c.reportType);body+=wTable([[coverSpec.fileNo,c.fileNo||REPORT_TEXT.emptyFileNo],...reportRows(c).filter(r=>r[0]!==coverSpec.fileNo)],{widths:[3000,6000],header:false,shadeFirstCol:true});
  body+=headingXml(REPORT_TEXT.tocHeading);
  const toc=REPORT_TEXT.sections;
  toc.forEach(t=>{body+=wP(t,{size:20,bold:true,color:'385873',before:60,after:120,keep:true});});
  body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  body+=headingXml(REPORT_TEXT.sections[0]);
  body+=wP(c.assignmentScope||REPORT_TEXT.defaultScope);
  body+=wP(`İnceleme konusu: ${c.subject||'—'}`,{bold:true});
  body+=headingXml(REPORT_TEXT.sections[1]);
  if(c.questions?.length){c.questions.forEach((q,i)=>{body+=wP(`${i+1}. ${q.question||REPORT_TEXT.defaultQuestion}`,{size:21,bold:true,color:'385873',before:70,after:80,keep:true});});}else body+=wP(REPORT_TEXT.defaultQuestions);
  body+=headingXml(REPORT_TEXT.sections[2]);
  body+=wP(REPORT_TEXT.defaultInventoryIntro);
  body+=wTable([[...REPORT_TEXT.inventoryHeaders],...(c.materials.length?c.materials.map(m=>[m.name,`${m.tech?.codec||m.type||REPORT_TEXT.codecFallback} / ${fmtSize(m.size)}`,fmtTime(m.duration||0),`${fmtChannels(m.tech?.channels)}${m.tech?.sampleRate?' · '+m.tech.sampleRate+' Hz':''}${m.tech?.bitDepth?' · '+m.tech.bitDepth+' bit':''}`,m.sha256||'Hesaplanamadı']):[REPORT_TEXT.noInventoryRow])],{widths:[2200,1500,900,1700,2700],header:true});
  body+=wP(REPORT_TEXT.inventoryNote,{color:'74869A',size:17,italic:true});
  body+=headingXml(REPORT_TEXT.sections[3]);
  body+=wP(c.methodText||DEFAULT_METHOD);
  body+=headingXml(REPORT_TEXT.sections[4]);
  body+=headingXml(REPORT_TEXT.sub51,2);
  for(let i=0;i<c.materials.length;i++){
    const m=c.materials[i];body+=headingXml(`5.1.${i+1}. ${m.name}`,2);
    body+=wP(`Süre: ${fmtTime(m.duration||0)}  |  Biçim: ${m.type||REPORT_TEXT.codecFallback}  |  ${REPORT_TEXT.segmentCountLabel}: ${(m.segments||[]).length}`,{color:'6F8295',size:17});
    if(m.hallucinationWarning)body+=wP(`${REPORT_TEXT.evidenceWarningPrefix} ${m.hallucinationWarning}`,{color:'9A6B2D',size:17});
    if(m.languageWarning)body+=wP(`${REPORT_TEXT.languageWarningPrefix} ${m.languageWarning}`,{color:'9A6B2D',size:17});
    if(m.segments?.length){body+=wTable([[...REPORT_TEXT.segmentHeaders],...m.segments.map(s=>[`${s.start||REPORT_TEXT.timeDash} – ${s.end||REPORT_TEXT.timeDash}`,s.speaker||REPORT_TEXT.emptySpeaker,s.text||'',reviewLabel(s)])],{widths:[1600,1500,4600,1300],header:true});}
    else body+=wP(REPORT_TEXT.noTranscript);
  }
  body+=headingXml(REPORT_TEXT.sub52,2);
  if(c.questions?.length){c.questions.forEach((q,i)=>{body+=wP(`5.2.${i+1}. ${q.question||REPORT_TEXT.defaultQuestion}`,{bold:true,color:'385873',size:20,before:80,after:60,keep:true});body+=wP(q.answer||REPORT_TEXT.defaultAnswer);body+=wP(`Dayanak: ${q.basis||REPORT_TEXT.defaultBasis}`,{color:'657D92',size:17,italic:true});});}
  else body+=wP(REPORT_TEXT.defaultEvaluation);
  body+=headingXml(REPORT_TEXT.sub53,2);
  body+=wP(c.limitationsText||REPORT_TEXT.defaultLimitations);
  body+=headingXml(REPORT_TEXT.sections[5]);
  body+=wP(c.conclusionText||REPORT_TEXT.defaultConclusion);
  body+=headingXml(REPORT_TEXT.sections[6]);
  body+=wP(REPORT_TEXT.attachmentsText);
  body+=`<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="260" w:after="0"/><w:keepLines/></w:pPr>${wRun(c.expertName||'BİLİRKİŞİ',{bold:true,size:22,color:'1C426B'})}<w:r><w:br/></w:r>${wRun(c.expertField||'56.12',{size:20})}<w:r><w:br/></w:r>${wRun(`${REPORT_TEXT.signatureRegistry}: ${c.registryNo||REPORT_TEXT.emptyFileNo}`,{size:20})}<w:r><w:br/></w:r>${wRun(REPORT_TEXT.signatureLabel,{size:18,color:'718399'})}</w:p>`;
  const sect=`<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1276" w:bottom="1134" w:left="1276" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}
async function makeDocx(){const c=currentCase();if(!window.JSZip){throw new Error('DOCX oluşturma bileşeni yüklenemedi. İnternet bağlantısını kontrol edin.');}const zip=new JSZip();zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);zip.folder('_rels').file('.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);const w=zip.folder('word');w.file('document.xml',docxXml(c));w.file('_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);w.file('styles.xml',`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="90" w:line="276"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1C426B"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="70"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="385873"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>`);w.file('header1.xml',`<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="1C426B"/></w:pBdr></w:pPr>${wRun('BİLİRKİŞİ RAPORU  |  UZMANLIK ALANI 56.12',{bold:true,color:'70869C',size:15})}</w:p></w:hdr>`);w.file('footer1.xml',`<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${wRun(`Dosya: ${c.fileNo||'—'}  •  Sayfa `,{color:'8293A3',size:15})}<w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`);const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});downloadBlob(blob,`${safeName(c.fileNo||'Bilirkisi_Raporu')}.docx`);showToast('Word raporu indirildi.');}
function safeName(s){return String(s).replace(/[^\w\-\.ğüşöçıİĞÜŞÖÇ]+/gi,'_').replace(/^[_\-.]+|[_\-.]+$/g,'').slice(0,70)||'AKIS_Raporu';}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function udfAttr(v=''){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&apos;');}
function udfCdata(v=''){return String(v).replace(/]]>/g,']]]]><![CDATA[>');}
function udfSignedColor(hex){const n=(0xff000000|parseInt(hex.replace('#',''),16))>>>0;return n>0x7fffffff?n-0x100000000:n;}
async function makeUdf(){
  const c=currentCase();
  if(!window.JSZip)throw new Error('UDF oluşturma bileşeni yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
  const templateResponse=await fetch('templates/BOS.udf');
  if(!templateResponse.ok)throw new Error('Boş UYAP UDF şablonu bulunamadı. templates/BOS.udf dosyasını kontrol edin.');
  const templateZip=await JSZip.loadAsync(await templateResponse.blob());
  const templateXml=await templateZip.file('content.xml').async('string');
  let properties=(templateXml.match(/<properties>[\s\S]*?<\/properties>/i)||[])[0];
  const styles=(templateXml.match(/<styles>[\s\S]*?<\/styles>/i)||[])[0];
  const formatId=(templateXml.match(/<template\s+format_id="([^"]+)"/i)||[])[1]||'1.8';
  const resolver=(templateXml.match(/<elements\s+resolver="([^"]+)"/i)||[])[1]||'hvl-default';
  if(!properties||!styles)throw new Error('Boş UYAP UDF şablonunun sayfa veya stil tanımları okunamadı.');
  // Match the DOCX page geometry: balanced A4 margins, no horizontal drift.
  properties=properties.replace(/leftMargin="[^"]+"/,'leftMargin="60.0"').replace(/rightMargin="[^"]+"/,'rightMargin="60.0"').replace(/topMargin="[^"]+"/,'topMargin="56.7"').replace(/bottomMargin="[^"]+"/,'bottomMargin="56.7"');
  const textParts=[];let codePointOffset=0;let serial=0;
  const colors={navy:udfSignedColor('1C426B'),mid:udfSignedColor('385873'),muted:udfSignedColor('58718A'),body:udfSignedColor('24384D'),white:-1,pale:udfSignedColor('EAF0F6'),line:udfSignedColor('D9E2EB')};
  function addText(value){let text=String(value??'').replace(/\r\n?/g,' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');if(!text)text='\u200B';const length=Array.from(text).length,start=codePointOffset;textParts.push(text,'\n');codePointOffset+=length+1;return `<content startOffset="${start}" length="${length}" family="Times New Roman" size="11" bold="false" italic="false" underline="false" foreground="${colors.body}" background="-1" />`;}
  function paragraph(text,{size=11,bold=false,italic=false,color='body',align=0,before=0,after=5,justify=false}={}){const ref=addText(text);const fg=colors[color]??colors.body;const formatted=ref.replace('size="11"',`size="${size}"`).replace('bold="false"',`bold="${bold?'true':'false'}"`).replace('italic="false"',`italic="${italic?'true':'false'}"`).replace('underline="false"','underline="false"').replace(`foreground="${colors.body}"`,`foreground="${fg}"`);return `<paragraph Alignment="${align}" SpaceBefore="${before}" SpaceAfter="${after}" LineSpacing="1.15">${formatted}</paragraph>`;}
  function paragraphLines(text,opts={}){return String(text??'').split(/\r?\n/).filter((line,i,a)=>line.length||i<a.length-1).map(line=>paragraph(line,opts)).join('');}
  function pageBreak(){return `<page-break><paragraph><content startOffset="${codePointOffset}" length="0" family="Times New Roman" size="11" underline="false" /></paragraph></page-break>`;}
  function table(rows,widths,{header=true,shadeFirstCol=false}={}){if(!rows?.length)return '';const colCount=rows[0].length;const safeWidths=widths?.length===colCount?widths:Array(colCount).fill(Math.floor(510/colCount));const rowXml=rows.map((row,ri)=>{const isHeader=header&&ri===0;const cells=row.map((value,ci)=>{let cellText=String(value??'');if(!isHeader)cellText=cellText.replace(/(\S{8})(?=\S)/g,'$1\u200B');const fill=isHeader?colors.pale:(shadeFirstCol&&ci===0?colors.pale:(ri%2===0?'16777215':udfSignedColor('F8FAFC')));const fg=isHeader?colors.navy:(shadeFirstCol&&ci===0?colors.navy:colors.body);const bold=isHeader||(shadeFirstCol&&ci===0);const ref=addText(cellText);const formatted=ref.replace('bold="false"',`bold="${bold?'true':'false'}"`).replace(`foreground="${colors.body}"`,`foreground="${fg}"`).replace('size="11"',`size="${isHeader?9.5:9.5}"`);return `<cell colspan="1" align="top" fillColor="${fill}" border="borderCell" borderSpec="3" paddingTop="3" paddingBottom="3" paddingLeft="4" paddingRight="4"><paragraph Alignment="0" SpaceBefore="1" SpaceAfter="1" LineSpacing="1.05">${formatted}</paragraph></cell>`;}).join('');return `<row rowName="r${++serial}" rowType="dataRow">${cells}</row>`;}).join('');return `<table tableName="AkisTable${serial}" columnCount="${colCount}" columnSpans="${safeWidths.join(',')}" border="borderCell" borderColor="${colors.line}" borderWidth="0.3">${rowXml}</table>`;}
  const el=[];
  el.push(paragraph('T.C.',{size:16,bold:true,color:'navy',align:1,after:4}));
  el.push(paragraph(`${(c.court||REPORT_TEXT.emptyCourt).toLocaleUpperCase('tr-TR')}’${trDative(c.court||'Mahkemesi')}`,{size:15,bold:true,color:'navy',align:1,after:16}));
  el.push(paragraph(reportTypeSpec(c.reportType).heading,{size:22,bold:true,color:'navy',align:1,before:8,after:7}));
  el.push(paragraph(REPORT_TEXT.subtitle,{size:10,bold:true,color:'muted',align:1,after:15}));
  if(c.synthetic)el.push(paragraph(REPORT_TEXT.synthetic,{size:10,bold:true,color:'mid',align:1,after:10}));
  const coverSpec=reportTypeSpec(c.reportType);el.push(table([[coverSpec.fileNo,c.fileNo||REPORT_TEXT.emptyFileNo],...reportRows(c).filter(r=>r[0]!==coverSpec.fileNo)],[170,340],{header:false,shadeFirstCol:true}));
  el.push(paragraph(REPORT_TEXT.tocHeading,{size:16,bold:true,color:'navy',before:8,after:12}));
  const toc=REPORT_TEXT.sections;
  toc.forEach(t=>el.push(paragraph(t,{size:11,bold:true,color:'mid',before:5,after:8})));
  el.push(pageBreak());
  const h=(t)=>paragraph(t,{size:14,bold:true,color:'navy',before:9,after:5});
  el.push(h(REPORT_TEXT.sections[0]));
  el.push(paragraphLines(c.assignmentScope||REPORT_TEXT.defaultScope,{justify:true}));
  el.push(paragraph(`İnceleme konusu: ${c.subject||'—'}`,{bold:true,after:7}));
  el.push(h(REPORT_TEXT.sections[1]));
  if(c.questions?.length)c.questions.forEach((q,i)=>el.push(paragraph(`${i+1}. ${q.question||REPORT_TEXT.defaultQuestion}`,{size:11,bold:true,color:'mid',before:4,after:6})));
  else el.push(paragraph(REPORT_TEXT.defaultQuestions));
  el.push(h(REPORT_TEXT.sections[2]));
  el.push(paragraph(REPORT_TEXT.defaultInventoryIntro));
  const inventory=(c.materials||[]).map(m=>[m.name,`${m.tech?.codec||m.type||REPORT_TEXT.codecFallback} / ${fmtSize(m.size)}`,fmtTime(m.duration||0),`${fmtChannels(m.tech?.channels)}${m.tech?.sampleRate?' · '+m.tech.sampleRate+' Hz':''}${m.tech?.bitDepth?' · '+m.tech.bitDepth+' bit':''}`,m.sha256||'Hesaplanamadı']);
  el.push(table([[...REPORT_TEXT.inventoryHeaders],...(inventory.length?inventory:[[REPORT_TEXT.noInventoryRow[0],'—','—','—','—']])],[125,95,45,120,155],{header:true}));
  el.push(paragraph(REPORT_TEXT.inventoryNote,{size:9,italic:true,color:'muted',after:7}));
  el.push(h(REPORT_TEXT.sections[3]));
  el.push(paragraphLines(c.methodText||DEFAULT_METHOD,{justify:true}));
  el.push(h(REPORT_TEXT.sections[4]));
  el.push(paragraph(REPORT_TEXT.sub51,{size:12,bold:true,color:'mid',before:5,after:4}));
  if(c.materials?.length){c.materials.forEach((m,i)=>{el.push(paragraph(`5.1.${i+1}. ${m.name}`,{size:11,bold:true,color:'mid',before:6,after:3}));el.push(paragraph(`Süre: ${fmtTime(m.duration||0)}   |   Biçim: ${m.type||REPORT_TEXT.codecFallback}   |   ${REPORT_TEXT.segmentCountLabel}: ${(m.segments||[]).length}`,{size:9,color:'muted',after:3}));if(m.hallucinationWarning)el.push(paragraph(`${REPORT_TEXT.evidenceWarningPrefix} ${m.hallucinationWarning}`,{size:9,italic:true,color:'muted'}));if(m.languageWarning)el.push(paragraph(`${REPORT_TEXT.languageWarningPrefix} ${m.languageWarning}`,{size:9,italic:true,color:'muted'}));if(m.segments?.length){const segments=m.segments.map(seg=>[`${seg.start||REPORT_TEXT.timeDash} – ${seg.end||REPORT_TEXT.timeDash}`,seg.speaker||REPORT_TEXT.emptySpeaker,seg.text||'',reviewLabel(seg)]);el.push(table([[...REPORT_TEXT.segmentHeaders],...segments],[78,75,275,82],{header:true}));}else el.push(paragraph(REPORT_TEXT.noTranscript,{italic:true,color:'muted'}));});}else el.push(paragraph(REPORT_TEXT.noMaterials));
  el.push(paragraph(REPORT_TEXT.sub52,{size:12,bold:true,color:'mid',before:7,after:4}));
  if(c.questions?.length)c.questions.forEach((q,i)=>{el.push(paragraph(`5.2.${i+1}. ${q.question||REPORT_TEXT.defaultQuestion}`,{size:11,bold:true,color:'mid',before:5,after:3}));el.push(paragraphLines(q.answer||REPORT_TEXT.defaultAnswer,{justify:true}));el.push(paragraph(`Dayanak: ${q.basis||REPORT_TEXT.defaultBasis}`,{size:9,italic:true,color:'muted',after:5}));});
  else el.push(paragraph(REPORT_TEXT.defaultEvaluation));
  el.push(paragraph(REPORT_TEXT.sub53,{size:12,bold:true,color:'mid',before:7,after:4}));
  el.push(paragraphLines(c.limitationsText||REPORT_TEXT.defaultLimitations,{justify:true}));
  el.push(h(REPORT_TEXT.sections[5]));
  el.push(paragraphLines(c.conclusionText||REPORT_TEXT.defaultConclusion,{justify:true}));
  el.push(h(REPORT_TEXT.sections[6]));
  el.push(paragraph(REPORT_TEXT.attachmentsText));
  el.push(paragraph(c.expertName||REPORT_TEXT.defaultExpert,{size:13,bold:true,color:'navy',align:2,before:18,after:2}));
  el.push(paragraph(c.expertField||REPORT_TEXT.defaultField,{size:10,align:2,after:2}));
  el.push(paragraph(`${REPORT_TEXT.signatureRegistry}: ${c.registryNo||REPORT_TEXT.emptyFileNo}`,{size:10,align:2,after:2}));
  el.push(paragraph(REPORT_TEXT.signatureLabel,{size:10,color:'muted',align:2,after:0}));
  const bodyText=textParts.join('');
  const udfXml=`<?xml version="1.0" encoding="UTF-8" ?>\n<template format_id="${udfAttr(formatId)}">\n<content><![CDATA[${udfCdata(bodyText)}]]></content>${properties}\n<elements resolver="${udfAttr(resolver)}">${el.join('')}</elements>${styles}\n</template>`;
  const parsed=new DOMParser().parseFromString(udfXml,'application/xml');if(parsed.querySelector('parsererror'))throw new Error('UDF XML yapısı doğrulanamadı; çıktı oluşturulmadı.');
  const outZip=new JSZip();outZip.file('content.xml',udfXml);const blob=await outZip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  downloadBlob(blob,`${safeName(c.fileNo||'Bilirkisi_Raporu')}.udf`);showToast('UDF raporu oluşturuldu. UYAP Editöründe son görünümü kontrol edin.');
}
async function exportProject(){const c=currentCase();const zip=new JSZip();const pack={schema:'mihenk.project.v1',exportedAt:new Date().toISOString(),case:c};zip.file('case.json',JSON.stringify(pack,null,2));const assets=zip.folder('audio');for(const m of c.materials){const blob=await getAudioBlob(c,m);if(blob)assets.file(`${m.id}_${safeName(m.name)}`,blob);}const out=await zip.generateAsync({type:'blob'});downloadBlob(out,`${safeName(c.fileNo||'AKIS_Calisma_Dosyasi')}.akis`);showToast('AKİS çalışma dosyası dışa aktarıldı (.akis).');}
async function importProject(file){if(!window.JSZip)throw new Error('Çalışma paketi açma bileşeni yüklenemedi. İnternet bağlantısını kontrol edin.');const zip=await JSZip.loadAsync(file);const meta=zip.file('case.json');if(!meta)throw new Error('Dosya geçerli bir AKİS veya önceki MİHENK çalışma paketi değil.');const pack=JSON.parse(await meta.async('string'));if(pack.schema!=='mihenk.project.v1'||!pack.case)throw new Error('Çalışma paketi sürümü tanınmadı.');const c=pack.case;c.id=uid();c.materials=c.materials||[];for(const m of c.materials){const entry=Object.keys(zip.files).find(path=>path.startsWith(`audio/${m.id}_`)&&!zip.files[path].dir);if(entry){const blob=await zip.file(entry).async('blob');const mime=m.type||'audio/wav';await storeBlob(`${c.id}::${m.id}`,new Blob([blob],{type:mime}));}}c.name=c.name||c.fileNo||'İçe aktarılan dosya';appState.cases.push(c);appState.activeCaseId=c.id;persist();renderCaseSelect();populateCaseForm();populateQuestionsForm();renderOverview();await renderAudioList();switchView('overview');showToast('Çalışma dosyası içe aktarıldı.');}
async function loadSamples(){if(appState.cases.some(c=>c.sampleKey)){showToast('Hazır test dosyaları daha önce yüklenmiş.');return;}const btn=$('#loadSamplesBtn');btn.disabled=true;btn.querySelector('b').textContent='Test dosyaları yükleniyor…';try{const res=await fetch('sample_data/cases.json');if(!res.ok)throw new Error('Test dosyaları bulunamadı.');const pack=await res.json();let first=null;for(const sc of pack.cases){const c={...freshCase(),...sc,id:uid(),materials:[],synthetic:true,sampleKey:sc.sampleKey};for(const sm of sc.materials){const fr=await fetch(sm.path);if(!fr.ok)throw new Error(`${sm.name} yüklenemedi.`);const blob=await fr.blob();const tech=await audioTech(blob);const m={id:uid(),name:sm.name,type:'audio/wav',size:blob.size,duration:sm.duration||await audioDuration(blob),sha256:await sha256(blob),tech,segments:[],status:'İnceleme bekliyor',synthetic:true,referenceSegments:sm.referenceSegments||[],addedAt:new Date().toISOString(),log:[]};c.materials.push(m);m.log.push({at:m.addedAt,event:'Kayıt eklendi',detail:`${sm.name} · ${blob.size} bayt · SHA-256 hesaplandı (test paketi)`});await storeBlob(blobKey(c,m),blob);}appState.cases.push(c);if(!first)first=c;}appState.activeCaseId=first.id;persist();renderCaseSelect();populateCaseForm();populateQuestionsForm();renderOverview();showToast('4 kurgusal dosya ve 10 sentetik ses kaydı yüklendi.');}catch(e){showToast(`Test paketi yüklenemedi: ${e.message}`);}finally{btn.disabled=false;btn.querySelector('b').textContent='Hazır test dosyalarını yükle';}}
function setupEvents(){
$$('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));$$('[data-view]');$$('.workflow-step').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));$$('.quick-action[data-goto]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));
$('#caseSelect').addEventListener('change',async e=>{appState.activeCaseId=e.target.value;persist();populateCaseForm();populateQuestionsForm();renderOverview();await renderAudioList();renderQueue();});$('#newCaseBtn').addEventListener('click',()=>{const c=freshCase();appState.cases.push(c);appState.activeCaseId=c.id;persist();renderCaseSelect();populateCaseForm();populateQuestionsForm();renderOverview();renderAudioList();switchView('case');});
$('#view-case').addEventListener('input',readCaseForm);$('#view-case').addEventListener('change',readCaseForm);$('#view-questions').addEventListener('input',e=>{const t=e.target;if(t.dataset.q!==undefined){const c=currentCase(),q=c.questions[Number(t.dataset.q)];if(q)q[t.dataset.k]=t.value;persist();}else readQuestionsForm();});$('#view-questions').addEventListener('change',e=>{if(e.target.dataset.q===undefined)readQuestionsForm();});$('#addQuestionBtn').addEventListener('click',addQuestion);$('#questionsList').addEventListener('click',e=>{const b=e.target.closest('[data-remove-q]');if(!b)return;const c=currentCase();c.questions.splice(Number(b.dataset.removeQ),1);persist();renderQuestions();});
$('#audioInput').addEventListener('change',async e=>{const files=[...e.target.files];if(files.length)await addAudioFiles(files);e.target.value='';});const dz=$('#dropZone');['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));dz.addEventListener('drop',async e=>{const files=[...e.dataTransfer.files];if(files.length)await addAudioFiles(files);});
$('#audioList').addEventListener('click',async e=>{const row=e.target.closest('tr.seg-row');if(row&&!e.target.closest('button')&&!e.target.closest('input')&&!e.target.closest('textarea')&&!e.target.closest('select')){focusSegmentRow(row);}const b=e.target.closest('button');if(!b)return;const c=currentCase();if(b.dataset.transcribe){await transcribe(b.dataset.transcribe);}else if(b.dataset.cancel){const mm=c.materials.find(x=>x.id===b.dataset.cancel);if(mm){mm.cancelRequested=true;showToast('İptal istendi; geçerli pencere bitince duracak.');}}else if(b.dataset.manual){addManualSegment(b.dataset.manual);}else if(b.dataset.removeAudio){const m=c.materials.find(x=>x.id===b.dataset.removeAudio);if(!m)return;await deleteBlob(blobKey(c,m));const url=objectUrls.get(blobKey(c,m));if(url)URL.revokeObjectURL(url);objectUrls.delete(blobKey(c,m));c.materials=c.materials.filter(x=>x.id!==m.id);persist();renderAudioList();renderOverview();showToast('Ses kaydı kaldırıldı.');}else if(b.dataset.verify){await verifyIntegrity(b.dataset.verify);}else if(b.dataset.log){const lm=c.materials.find(x=>x.id===b.dataset.log);if(lm)showEvidenceLog(lm);}else if(b.dataset.history!==undefined){const card=b.closest('.audio-card');const hid=card?.querySelector('[data-transcribe]')?.dataset.transcribe;const hm=c.materials.find(x=>x.id===hid);if(hm)showSegmentHistory(hm,Number(b.dataset.history));}else if(b.dataset.playSeg!==undefined){playSegment(b);}else if(b.dataset.segFilter!==undefined){const card=b.closest('.audio-card');const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=c.materials.find(x=>x.id===id);if(m){m.uiFilter=b.dataset.segFilter;renderSegments(m,card);}}else if(b.dataset.segNav!==undefined){const card=b.closest('.audio-card');const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=c.materials.find(x=>x.id===id);if(m)navSegment(m,b.dataset.segNav==='next'?1:-1);}else if(b.dataset.segSpeed!==undefined){const card=b.closest('.audio-card');const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=c.materials.find(x=>x.id===id);if(m){m.playbackRate=Number(b.dataset.segSpeed);const pl=card.querySelector('audio');if(pl)pl.playbackRate=m.playbackRate;renderSegments(m,card);persist();}}else if(b.dataset.segApprove!==undefined){const card=b.closest('.audio-card');const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=c.materials.find(x=>x.id===id);approveActiveSegment(m);}else if(b.dataset.deleteSeg!==undefined){const card=b.closest('.audio-card');const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=c.materials.find(x=>x.id===id);m.segments.splice(Number(b.dataset.deleteSeg),1);persist();renderAudioList();renderOverview();}});
$('#audioList').addEventListener('focusin',e=>{const el=e.target;if(el.dataset&&el.dataset.key==='text'){const card=el.closest('.audio-card');const id=card?.querySelector('[data-transcribe]')?.dataset.transcribe;const m=currentCase().materials.find(x=>x.id===id);const s=m?.segments[Number(el.dataset.seg)];if(s)snapshotSegmentText(s);}});
$('#audioList').addEventListener('focusout',e=>{const el=e.target;if(!el.dataset||el.dataset.key!=='text')return;const card=el.closest('.audio-card');const id=card?.querySelector('[data-transcribe]')?.dataset.transcribe;const m=currentCase().materials.find(x=>x.id===id);const s=m?.segments[Number(el.dataset.seg)];if(!s)return;if(pushSegmentHistory(s))persist();// Odak aynı tabloda başka bir alana geçtiyse tabloyu yeniden çizmeyiz; yoksa
// kullanıcının tıkladığı hedef DOM'dan silinir ve odak kaybolur.
const rt=e.relatedTarget;const sameTable=rt&&rt.dataset&&(rt.dataset.seg!==undefined||rt.dataset.segFilter!==undefined);if(!sameTable&&card){renderSegments(m,card);if($('#view-report').classList.contains('active'))renderReport();}});
$('#audioList').addEventListener('input',e=>{const el=e.target;if(el.dataset.seg===undefined)return;const card=el.closest('.audio-card');const id=card?.querySelector('[data-transcribe]')?.dataset.transcribe;const m=currentCase().materials.find(x=>x.id===id);const s=m?.segments[Number(el.dataset.seg)];if(!s)return;if(el.dataset.key==='text'){s.text=el.value;// Yazarken yalnızca bu satırın 'anlamlı metin yok' işareti güncellenir;
// tüm tabloyu yeniden çizmek odak ve imleç konumunu bozardı.
const row=el.closest('tr.seg-row');if(row){const flag=row.querySelector('.halluc-flag');const bad=isHallucination(s.text);if(bad&&!flag){const span=document.createElement('span');span.className='halluc-flag';span.textContent='Anlamlı metin yok — dinleyip doldurun';el.parentElement.appendChild(span);row.classList.add('is-halluc');}else if(!bad&&flag){flag.remove();row.classList.remove('is-halluc');}}}else if(el.dataset.key==='checked'){s.checked=el.checked;s.review=el.checked?'onaylandi':'bekliyor';}else s[el.dataset.key]=el.value;persist();renderOverview();if($('#view-report').classList.contains('active'))renderReport();});$('#audioList').addEventListener('change',e=>{const el=e.target;if(el.dataset.key!=='review')return;const card=el.closest('.audio-card');const id=card?.querySelector('[data-transcribe]')?.dataset.transcribe;const m=currentCase().materials.find(x=>x.id===id);const s=m?.segments[Number(el.dataset.seg)];if(!s)return;s.review=el.value;s.checked=(el.value==='onaylandi');el.dataset.state=el.value;persist();renderAudioList();renderOverview();if($('#view-report').classList.contains('active'))renderReport();});
$('#loadModelBtn').addEventListener('click',()=>ensureModel().catch(e=>showToast(e.message)));$('#refreshStorageBtn').addEventListener('click',()=>refreshStorage());$('#clearAllModelsBtn').addEventListener('click',()=>clearModelCache());$('#storageList').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.deleteModel){await deleteModelCache(b.dataset.deleteModel);}else if(b.dataset.verifyModel){await verifyModelCache(b.dataset.verifyModel);}else if(b.dataset.useModel){const sel=$('#modelSelect');if(sel){sel.value=b.dataset.useModel;showToast('Model seçildi: '+b.dataset.useModel);}}});$('#startQueueBtn').addEventListener('click',()=>runQueue());$('#cancelQueueBtn').addEventListener('click',()=>{const c=currentCase();if(c)c.queueCancel=true;showToast('Kuyruk durdurulacak; geçerli kayıt bitince duracak.');});$('#retryFailedBtn').addEventListener('click',()=>{const c=currentCase();if(!c)return;for(const m of c.materials||[]){if(m.status==='Çözümleme hatası')m.status='İnceleme bekliyor';}persist();renderQueue();renderAudioList();showToast('Hatalı kayıtlar kuyruğa alındı.');});$('#loadSamplesBtn').addEventListener('click',loadSamples);$('#downloadDocxBtn').addEventListener('click',()=>makeDocx().catch(e=>showToast(e.message)));$('#downloadUdfBtn').addEventListener('click',()=>makeUdf().catch(e=>showToast(e.message)));$('#exportProjectBtn').addEventListener('click',()=>exportProject().catch(e=>showToast(e.message)));$('#importProjectBtn').addEventListener('click',()=>$('#importProjectInput').click());$('#importProjectInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(f){try{await importProject(f);}catch(err){showToast(`İçe aktarma başarısız: ${err.message}`);}e.target.value='';}});
$('#audioList').addEventListener('keydown',e=>{const card=e.target.closest('.audio-card');if(!card)return;const id=card.querySelector('[data-transcribe]')?.dataset.transcribe;const m=currentCase().materials.find(x=>x.id===id);if(!m)return;handleSegKey(e,card,m);});
$('#helpBtn').addEventListener('click',()=>$('#helpDialog').showModal());$('#closeHelp').addEventListener('click',()=>$('#helpDialog').close());$('#confirmCancel').addEventListener('click',()=>$('#confirmDialog').close());$('#closeConfirm').addEventListener('click',()=>$('#confirmDialog').close());$('#confirmOk').addEventListener('click',()=>$('#confirmDialog').close());
}
// Sequential batch transcription. Running one file at a time keeps memory flat
// and lets the user stop between files; per-file state is derived from the
// material itself so a reload shows the same queue.
let queueRunning=false;
function queuePending(){return (currentCase()?.materials||[]).filter(m=>m.status!=='Kontrol bekliyor'&&m.status!=='Çözümleme sonucu boş'&&m.status!=='Kısmen çözümlendi (iptal edildi)');}
function renderQueue(){const c=currentCase();if(!c)return;const mats=c.materials||[];const root=$('#queueList');if(!root)return;const done=mats.filter(m=>m.status==='Kontrol bekliyor').length;const failed=mats.filter(m=>m.status==='Çözümleme hatası').length;$('#queueLabel').textContent=mats.length?`${done}/${mats.length} tamamlandı`:'Kuyruk boş';$('#retryFailedBtn').hidden=failed===0;root.innerHTML=mats.length?mats.map((m,i)=>`<div class="queue-item"><span class="queue-index">${i+1}</span><span class="queue-name">${esc(m.name)}</span><span class="queue-state ${m.status==='Çözümleme hatası'?'bad':(m.status==='Kontrol bekliyor'?'good':'')}">${esc(m.status||'Bekliyor')}</span>${typeof m.progress==='number'?`<span class="queue-pct">%${m.progress}</span>`:''}</div>`).join(''):'<div class="empty-state" style="padding:14px"><span>Ses kaydı eklenince kuyruk burada görünür.</span></div>';}
function queueUpdateProgress(doneCount,totalCount,elapsedMs){const wrap=$('#queueProgressWrap');if(!wrap)return;wrap.hidden=false;const pct=totalCount?Math.round(doneCount/totalCount*100):0;$('#queueProgressBar').style.width=pct+'%';$('#queueProgressText').textContent=`${doneCount}/${totalCount} kayıt · %${pct}`;if(doneCount>0&&doneCount<totalCount){const eta=elapsedMs/doneCount*(totalCount-doneCount);$('#queueEtaText').textContent=`Tahmini kalan süre: ${fmtShort(eta/1000)}`;}else{$('#queueEtaText').textContent='';}}
async function runQueue(){const c=currentCase();if(!c||queueRunning)return;const pending=queuePending();if(!pending.length){showToast('Çözümlenecek kayıt yok.');return;}queueRunning=true;c.queueCancel=false;$('#startQueueBtn').disabled=true;$('#cancelQueueBtn').disabled=false;const t0=Date.now();let done=0;for(const m of pending){if(c.queueCancel)break;try{await transcribe(m.id);}catch(e){}done++;queueUpdateProgress(done,pending.length,Date.now()-t0);renderQueue();}
queueRunning=false;$('#startQueueBtn').disabled=false;$('#cancelQueueBtn').disabled=true;renderQueue();renderOverview();showToast(c.queueCancel?'Kuyruk durduruldu.':'Toplu çözümleme tamamlandı.');}
// Model manager. transformers.js stores every downloaded file in the browser
// Cache Storage under a fixed name, so the same cache can be enumerated,
// measured and pruned here. File URLs contain the repo id, which is how an
// entry is attributed back to a model.
// Promise wrapper around the existing confirm dialog so callers can await a
// decision instead of juggling the dialog's own event handlers.
function askConfirm(title,text){return new Promise(resolve=>{const dlg=$('#confirmDialog');$('#confirmTitle').textContent=title;$('#confirmText').textContent=text;let done=false;const finish=v=>{if(done)return;done=true;$('#confirmOk').removeEventListener('click',onOk);$('#confirmCancel').removeEventListener('click',onCancel);$('#closeConfirm').removeEventListener('click',onCancel);if(dlg.open)dlg.close();resolve(v);};const onOk=()=>finish(true);const onCancel=()=>finish(false);$('#confirmOk').addEventListener('click',onOk);$('#confirmCancel').addEventListener('click',onCancel);$('#closeConfirm').addEventListener('click',onCancel);dlg.addEventListener('close',()=>finish(false),{once:true});dlg.showModal();});}
const MODEL_CACHE='transformers-cache';
function modelIdFromUrl(u){const m=String(u).match(/huggingface\.co\/([^/]+\/[^/]+)\//);return m?m[1]:null;}
function fmtBytes(n){if(!Number.isFinite(n))return '—';if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(0)+' KB';if(n<1024*1024*1024)return (n/1024/1024).toFixed(1)+' MB';return (n/1024/1024/1024).toFixed(2)+' GB';}
async function scanModelCache(){const out={supported:typeof caches!=='undefined',models:{},total:0,entries:0};if(!out.supported)return out;let cache;try{cache=await caches.open(MODEL_CACHE);}catch(e){out.supported=false;return out;}const keys=await cache.keys();for(const req of keys){const url=req.url;const id=modelIdFromUrl(url)||'Diğer dosyalar';let size=0;try{const res=await cache.match(req);if(res){const buf=await res.clone().arrayBuffer();size=buf.byteLength;}}catch(e){}if(!out.models[id])out.models[id]={files:0,bytes:0};out.models[id].files++;out.models[id].bytes+=size;out.total+=size;out.entries++;}return out;}
function renderStorage(scan){const summary=$('#storageSummary');const list=$('#storageList');if(!summary||!list)return;if(!scan.supported){summary.textContent='Bu tarayıcı model önbelleğini listeleme (Cache Storage) izni vermiyor.';list.innerHTML='';return;}const ids=Object.keys(scan.models).sort((a,b)=>scan.models[b].bytes-scan.models[a].bytes);summary.innerHTML=`<b>${scan.entries}</b> dosya · toplam <b>${fmtBytes(scan.total)}</b> · ${ids.length} model/klasör`;if(!ids.length){list.innerHTML='<div class="empty-state" style="padding:14px"><span>Önbellekte indirilmiş model yok.</span></div>';return;}list.innerHTML=ids.map(id=>{const info=scan.models[id];const known=!!ASR_MODELS[id];return `<div class="storage-item"><div class="storage-main"><b>${esc(known?ASR_MODELS[id].label.split('–')[0].trim():id)}</b><small>${esc(id)} · ${info.files} dosya · ${fmtBytes(info.bytes)}</small></div><div class="storage-item-actions">${known?`<button class="mini-button" data-use-model="${esc(id)}">Bu modeli seç</button>`:''}<button class="mini-button" data-verify-model="${esc(id)}">Doğrula</button><button class="mini-button danger" data-delete-model="${esc(id)}">Sil</button></div></div>`;}).join('');}
async function refreshStorage(){try{const scan=await scanModelCache();renderStorage(scan);}catch(e){$('#storageSummary').textContent='Önbellek okunamadı: '+e.message;}}
// Integrity check. The library publishes no checksums, so the honest check is
// structural: the files a Whisper ASR pipeline actually needs must all be
// present and non-empty. A partial download (interrupted transfer) fails this.
const REQUIRED_MODEL_FILES=[/config\.json$/,/preprocessor_config\.json$/,/tokenizer\.json$/,/tokenizer_config\.json$/,/encoder_model.*\.onnx$/,/decoder_model_merged.*\.onnx$/];
async function verifyModelCache(id){try{const cache=await caches.open(MODEL_CACHE);const keys=await cache.keys();const mine=[];for(const req of keys){if((modelIdFromUrl(req.url)||'Diğer dosyalar')===id)mine.push(req);}if(!mine.length){showToast('Bu model için önbellekte dosya yok.');return;}const present=[];let empty=0;for(const req of mine){let size=0;try{const res=await cache.match(req);if(res)size=(await res.clone().arrayBuffer()).byteLength;}catch(e){}if(size===0)empty++;present.push(req.url);}const missing=REQUIRED_MODEL_FILES.filter(rx=>!present.some(u=>rx.test(u)));const ok=!missing.length&&empty===0;const detail=ok?`${mine.length} dosya eksiksiz ve boş olmayan boyutta.`:`Eksik dosya: ${missing.length}, boş dosya: ${empty}. İndirme tamamlanmamış olabilir; modeli yeniden yükleyin.`;const st=$('#modelStatus');if(st)st.textContent=`${id} bütünlük kontrolü: ${ok?'geçti':'başarısız'} — ${detail}`;showToast(ok?`${id} bütünlük kontrolü geçti.`:`${id} bütünlük kontrolü başarısız. Ayrıntı model durumunda.`);}catch(e){showToast('Doğrulama başarısız: '+e.message);}}
async function deleteModelCache(id){if(!(await askConfirm('Model önbelleğini sil',`"${id}" için indirilmiş dosyalar silinsin mi? Gerekirse yeniden indirilir.`)))return;try{const cache=await caches.open(MODEL_CACHE);const keys=await cache.keys();let n=0;for(const req of keys){const mid=modelIdFromUrl(req.url)||'Diğer dosyalar';if(mid===id){await cache.delete(req);n++;}}if(asrPipeline&&asrPipeline.__modelId===id){try{await asrPipeline.dispose();}catch(e){}asrPipeline=null;const st=$('#modelStatus');if(st)st.textContent='Seçili modelin önbelleği silindi. Yeniden kullanmak için modeli yükleyin.';}showToast(`${n} dosya silindi.`);refreshStorage();}catch(e){showToast('Silme başarısız: '+e.message);}}
async function clearModelCache(){if(!(await askConfirm('Tüm model önbelleğini temizle','İndirilmiş tüm konuşma modelleri silinecek. Gerekirse yeniden indirilir. Devam edilsin mi?')))return;try{await caches.delete(MODEL_CACHE);if(asrPipeline){try{await asrPipeline.dispose();}catch(e){}asrPipeline=null;const st=$('#modelStatus');if(st)st.textContent='Model önbelleği temizlendi. Yeniden kullanmak için modeli yükleyin.';}showToast('Model önbelleği temizlendi.');refreshStorage();}catch(e){showToast('Temizleme başarısız: '+e.message);}}
// Recommendation from observed hardware: WebGPU can carry the heavy models,
// WASM (CPU) is realistic only for the smaller ones.
function recommendModel(){if(asrDevice==='webgpu')return {id:'onnx-community/whisper-medium-ONNX',why:'WebGPU kullanılabilir; ölçülen en yüksek doğruluğu veren orta model önerilir (WER ~0,38).'};return {id:'onnx-community/whisper-small',why:'WebGPU yok; CPU üzerinde hız/doğruluk dengesi için küçük model önerilir (WER ~0,65). Doğruluk öncelikliyse orta modeli seçin (WER ~0,38), ancak CPU üzerinde belirgin şekilde yavaştır.'};}
function applyRecommendation(){const rec=recommendModel();const sel=$('#modelSelect');if(sel)sel.value=rec.id;const el=$('#modelRecommendation');if(el)el.textContent='Öneri: '+rec.why;}
async function restoreAudioUrls(){const cList=appState.cases;let changed=false;for(const c of cList){for(const m of c.materials||[]){const url=await attachObjectUrl(c,m);if(!m.tech||!m.log){const blob=await getAudioBlob(c,m);if(blob){if(!m.tech)m.tech=await audioTech(blob);if(!m.log)m.log=[{at:m.addedAt||new Date().toISOString(),event:'Kayıt eklendi',detail:`${m.name} · ${m.size} bayt · SHA-256 hesaplandı`}];changed=true;}}}}if(changed)persist();}
function init(){loadState();renderCaseSelect();populateCaseForm();populateQuestionsForm();renderOverview();setupEvents();renderQueue();$('#reportDate').value=currentCase().reportDate||dateToday();detectDevice().then(ok=>{const b=$('#deviceBadge');if(b)b.textContent=ok?'● WebGPU hızlandırma kullanılabilir':'● WebGPU yok · WASM (CPU) kullanılacak';applyRecommendation();});refreshStorage();restoreAudioUrls().then(()=>renderAudioList());}
init();
