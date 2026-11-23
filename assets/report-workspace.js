import { currentCase, renderReport, persist } from './app.js?v=2.227';
import { REPORT_SECTION_DEFS, REPORT_PRESET_DEFS } from './schema.js?v=2.227';
import {
  DEFAULT_REPORT_ORDER, DEFAULT_ANNEXES, normalizeReportLayout, moveItem,
  enabledMainSectionNumbers, sortMarkedParts, createRevisionSnapshot,
  compareRevisionSnapshots, revisionDigest
} from './report-model.js?v=2.227';

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
const SECTION_LABELS = {
  cover: 'Kapak başlığı',
  coverFields: 'Dosya künyesi',
  toc: 'İçindekiler',
  s1: 'İncelemenin konusu, kapsamı ve sınırları',
  s2: 'Cevaplanması gereken sorular',
  s3: 'Maddi unsurlar ve dosya envanteri',
  origin: 'Kayıt kökeni ve teslim zinciri',
  embedded: 'Gömülü metadata (cihaz beyanı)',
  acquisition: 'Delil edinme ve doğrulama',
  speakers: 'Konuşmacılar',
  s4: 'İnceleme yöntemi',
  tech: 'Teknik özellikler ve inceleme ortamı',
  enhance: 'Ses iyileştirme / filtreleme',
  asr: 'Otomatik konuşma tanıma',
  s5: 'Analiz, tespit ve değerlendirme',
  reading: 'Okuma metni (5.1 alt bölümü)',
  scopeNote: 'Görev alanı dışı / sınırlılık beyanı',
  s6: 'Gerekçeli sonuç',
  s7: 'Ekler bölümü',
  wer: 'Çözümleme doğruluğu (WER)',
  levels: 'Ses seviyesi ölçümü',
  reviewSummary: 'İnceleme özeti ve denetim kaydı',
  qc: 'Kalite kontrolü ve ikinci göz',
  privacy: 'Kişisel veri ve gizlilik',
  annex: 'Ekler (EK-1…EK-N)',
  signature: 'İmza ve alt bilgi'
};
const GROUPS = [
  { title: 'Kapak ve başlangıç', keys: ['cover', 'coverFields', 'kunye', 'summary', 'toc'] },
  { title: 'Ana rapor', keys: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] },
  { title: 'Teknik bulgular', keys: ['origin', 'embedded', 'acquisition', 'speakers', 'tech', 'enhance', 'asr', 'reading', 'wer', 'levels', 'reviewSummary'] },
  { title: 'Beyan ve denetim', keys: ['scopeNote', 'qc', 'privacy'] },
  { title: 'Kapanış', keys: ['annex', 'signature'] }
];

function ensureLayout(c) {
  c.report = c.report && typeof c.report === 'object' ? c.report : {};
  const normalized = normalizeReportLayout(c.report, REPORT_SECTION_DEFS.map((x) => x.key));
  const current = c.report.layout;
  const changed = !current ||
    JSON.stringify(current.order || []) !== JSON.stringify(normalized.order) ||
    JSON.stringify(current.annexes || []) !== JSON.stringify(normalized.annexes);
  if (changed) {
    c.report.layout = normalized;
    persist();
  }
  return c.report.layout;
}

function sectionEnabled(c, key) {
  const state = c.report?.sections || {};
  if (typeof state[key] === 'boolean') return state[key];
  const def = REPORT_SECTION_DEFS.find((item) => item.key === key);
  return def ? def.def : true;
}

function renderOutline(c) {
  const host = $('#reportSections');
  if (!host) return;
  const layout = ensureLayout(c);
  const profiles = REPORT_PRESET_DEFS.map((preset) =>
    `<button type="button" class="report-profile-btn" data-report-preset="${escapeHtml(preset.key)}">${escapeHtml(preset.label)}</button>`
  ).join('');
  const rows = layout.order.map((key, index) => {
    const pinned = ['cover', 'coverFields', 'kunye', 'summary', 'toc', 'reading', 'signature'].includes(key);
    const sub = key === 'reading';
    return `<div class="report-outline-item ${sub ? 'is-subitem' : ''}" data-report-outline-key="${escapeHtml(key)}">
      <span class="report-outline-number">${index + 1}</span>
      <label class="report-outline-label">
        <input type="checkbox" data-report-section="${escapeHtml(key)}" ${sectionEnabled(c, key) ? 'checked' : ''}>
        <span>${escapeHtml(SECTION_LABELS[key] || key)}</span>
      </label>
      <span class="report-outline-tools">
        <button type="button" data-report-move="${escapeHtml(key)}" data-direction="-1" ${pinned || index <= 0 ? 'disabled' : ''} aria-label="${escapeHtml(SECTION_LABELS[key] || key)} bölümünü yukarı taşı" title="Yukarı taşı">↑</button>
        <button type="button" data-report-move="${escapeHtml(key)}" data-direction="1" ${pinned || index >= layout.order.length - 1 ? 'disabled' : ''} aria-label="${escapeHtml(SECTION_LABELS[key] || key)} bölümünü aşağı taşı" title="Aşağı taşı">↓</button>
      </span>
    </div>`;
  }).join('');
  host.innerHTML = `<div class="report-profile-switch"><span>Hazır profil</span>${profiles}</div>
    <p class="report-outline-hint">Bölüm sırasını oklarla değiştirin. Kapalı bölümler rapora ve dışa aktarılan belgeye alınmaz.</p>
    <div class="report-outline-items">${rows}</div>
    <div class="report-outline-foot"><button type="button" data-report-sections-all="on">Tümünü aç</button><button type="button" data-report-sections-all="off">Tümünü kapat</button></div>`;
}
function renderAnnexes(c) {
  const host = $('#reportAnnexList');
  if (!host) return;
  const layout = ensureLayout(c);
  host.innerHTML = `
    <div class="report-side-heading"><div><b>Eklerin düzeni</b><small>Her eki ayrı açın, adlandırın ve sıralayın.</small></div><button type="button" class="report-small-btn" id="reportAddAnnex">+ Yeni ek</button></div>
    <div class="report-annex-items">${layout.annexes.map((annex, i) => {
      const custom = !DEFAULT_ANNEXES.some((item) => item.key === annex.key);
      return `<article class="report-annex-item" data-annex-key="${escapeHtml(annex.key)}">
        <div class="report-annex-top">
          <label><input type="checkbox" data-annex-enabled="${escapeHtml(annex.key)}" ${annex.enabled ? 'checked' : ''}><b>${custom ? 'Özel ek' : 'EK-' + (i + 1)}</b></label>
          <span><button type="button" data-annex-move="${escapeHtml(annex.key)}" data-direction="-1" ${i === 0 ? 'disabled' : ''} aria-label="Eki yukarı taşı">↑</button><button type="button" data-annex-move="${escapeHtml(annex.key)}" data-direction="1" ${i === layout.annexes.length - 1 ? 'disabled' : ''} aria-label="Eki aşağı taşı">↓</button>${custom ? `<button type="button" data-annex-remove="${escapeHtml(annex.key)}" aria-label="Eki kaldır">×</button>` : ''}</span>
        </div>
        <label class="report-annex-field"><span>Ek başlığı</span><input type="text" maxlength="120" data-annex-title="${escapeHtml(annex.key)}" value="${escapeHtml(annex.title)}"></label>
        ${custom || annex.key === 'ek4' ? `<label class="report-annex-field"><span>Ek içeriği</span><textarea rows="3" data-annex-content="${escapeHtml(annex.key)}" placeholder="Yalnızca belgelenmiş teknik bulguları yazın.">${escapeHtml(annex.content || '')}</textarea></label>` : ''}
        <label class="report-annex-field"><span>Ek notu (isteğe bağlı)</span><input type="text" maxlength="300" data-annex-note="${escapeHtml(annex.key)}" value="${escapeHtml(annex.note || '')}" placeholder="Boş bırakılabilir"></label>
      </article>`;
    }).join('')}</div>`;
}

function renderRevisions(c) {
  const host = $('#reportRevisionPanel');
  if (!host) return;
  const revisions = Array.isArray(c.report?.revisions) ? c.report.revisions : [];
  const options = revisions.map((rev) => `<option value="${escapeHtml(rev.id)}">${escapeHtml(rev.label || 'Revizyon')} · ${escapeHtml(new Date(rev.createdAt).toLocaleString('tr-TR'))}</option>`).join('');
  host.innerHTML = `
    <div class="report-side-heading"><div><b>Revizyon geçmişi</b><small>${revisions.length}/10 kayıt · son hâller saklanır</small></div></div>
    <p class="report-empty-note">Revizyonlar rapor metinlerini ve düzenini saklar; ses dosyalarının kendisini yedeklemez. Sesler için “Paket oluştur” kullanın.</p>
    <label class="report-annex-field"><span>Revizyon açıklaması</span><input id="reportRevisionLabel" maxlength="100" placeholder="Örn. İlk kontrol sonrası"></label>
    <button type="button" class="button button-primary report-revision-save" id="reportRevisionSave">Bu rapor hâlini kaydet</button>
    ${revisions.length ? `
      <div class="report-revision-selects">
        <label class="report-annex-field"><span>Karşılaştırılacak eski sürüm</span><select id="reportRevisionA"><option value="">Seçin</option>${options}</select></label>
        <label class="report-annex-field"><span>Karşılaştırılacak yeni sürüm</span><select id="reportRevisionB"><option value="">Seçin</option>${options}</select></label>
        <button type="button" class="report-small-btn" id="reportRevisionCompare">Farkları karşılaştır</button>
      </div>
      <div id="reportRevisionDiff" class="report-revision-diff" aria-live="polite">İki revizyon seçip karşılaştırın.</div>
      <div class="report-revision-list">${revisions.slice().reverse().map((rev) => `
        <div class="report-revision-row"><div><b>${escapeHtml(rev.label || 'Revizyon')}</b><small>${escapeHtml(new Date(rev.createdAt).toLocaleString('tr-TR'))}</small></div><button type="button" class="report-small-btn" data-revision-restore="${escapeHtml(rev.id)}">Geri yükle</button></div>
      `).join('')}</div>`
    : '<p class="report-empty-note">Henüz rapor revizyonu kaydedilmedi.</p>'}`;
}

function renderWorkspace(c) {
  if (!c || !$('#view-report')) return;
  ensureLayout(c);
  renderOutline(c);
  renderAnnexes(c);
  renderRevisions(c);
  const preview = $('#reportPreview');
  if (preview) preview.classList.toggle('has-a4-guides', !!c.report?.pageView);
  const pageToggle = $('#reportPageViewToggle');
  if (pageToggle) pageToggle.checked = !!c.report?.pageView;
  const embeddedToggle = $('#reportEmbeddedToggle');
  if (embeddedToggle) embeddedToggle.checked = !!c.report?.includeEmbedded;
}

function orderedMarkedParts(source, c) {
  const layout = c ? ensureLayout(c) : null;
  return sortMarkedParts(source, layout?.order || DEFAULT_REPORT_ORDER);
}

window.__akisReportWorkspace = {
  render: renderWorkspace,
  sortMarkedParts: orderedMarkedParts
};

function redraw(c) {
  renderReport();
  renderWorkspace(c || currentCase());
}

function updateLayout(c, updater) {
  if (!c) return;
  const layout = ensureLayout(c);
  updater(layout);
  persist();
  redraw(c);
}

$('#reportSections')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-report-move]');
  if (!button || button.disabled) return;
  event.preventDefault();
  const c = currentCase();
  if (!c) return;
  const key = button.dataset.reportMove;
  const direction = Number(button.dataset.direction);
  updateLayout(c, (layout) => {
    const fixedPrefix = ['cover', 'coverFields', 'kunye', 'summary', 'toc'];
    const fixedSuffix = ['signature'];
    const body = layout.order.filter((item) => !fixedPrefix.includes(item) && !fixedSuffix.includes(item) && item !== 'reading');
    const moved = moveItem(body, key, direction);
    const ordered = [];
    for (const item of fixedPrefix) if (layout.order.includes(item)) ordered.push(item);
    for (const item of moved) {
      ordered.push(item);
      if (item === 's5' && layout.order.includes('reading')) ordered.push('reading');
    }
    if (layout.order.includes('reading') && !ordered.includes('reading')) ordered.push('reading');
    for (const item of fixedSuffix) if (layout.order.includes(item)) ordered.push(item);
    layout.order = ordered;
  });
});

$('#reportAnnexList')?.addEventListener('click', (event) => {
  const add = event.target.closest('#reportAddAnnex');
  if (add) {
    const c = currentCase();
    if (!c) return;
    updateLayout(c, (layout) => {
      let n = 1;
      while (layout.annexes.some((item) => item.key === 'custom-' + n)) n++;
      layout.annexes.push({ key: 'custom-' + n, title: 'Yeni ek', enabled: true, content: '', note: '' });
    });
    return;
  }
  const move = event.target.closest('[data-annex-move]');
  if (move && !move.disabled) {
    const c = currentCase();
    if (!c) return;
    updateLayout(c, (layout) => { layout.annexes = moveItem(layout.annexes, move.dataset.annexMove, Number(move.dataset.direction)); });
    return;
  }
  const remove = event.target.closest('[data-annex-remove]');
  if (remove) {
    const c = currentCase();
    if (!c) return;
    updateLayout(c, (layout) => { layout.annexes = layout.annexes.filter((item) => item.key !== remove.dataset.annexRemove); });
  }
});

$('#reportAnnexList')?.addEventListener('change', (event) => {
  const input = event.target.closest('[data-annex-enabled]');
  if (!input) return;
  const c = currentCase();
  if (!c) return;
  updateLayout(c, (layout) => {
    const item = layout.annexes.find((entry) => entry.key === input.dataset.annexEnabled);
    if (item) item.enabled = input.checked;
  });
});

$('#reportAnnexList')?.addEventListener('input', (event) => {
  const field = event.target;
  const key = field.dataset.annexTitle || field.dataset.annexContent || field.dataset.annexNote;
  if (!key) return;
  const c = currentCase();
  if (!c) return;
  const layout = ensureLayout(c);
  const item = layout.annexes.find((entry) => entry.key === key);
  if (!item) return;
  if (field.dataset.annexTitle) item.title = field.value;
  else if (field.dataset.annexContent) item.content = field.value;
  else item.note = field.value;
  persist();
});
$('#reportAnnexList')?.addEventListener('change', (event) => {
  if (event.target.matches('[data-annex-title], [data-annex-content], [data-annex-note]')) redraw();
});

function saveRevision(c, label) {
  c.report = c.report || {};
  c.report.revisions = Array.isArray(c.report.revisions) ? c.report.revisions : [];
  const snapshot = createRevisionSnapshot(c);
  const digest = revisionDigest(snapshot);
  const latest = c.report.revisions[c.report.revisions.length - 1];
  if (latest && latest.digest === digest) {
    const status = $('#reportRevisionDiff');
    if (status) status.textContent = 'Son kaydedilen revizyonla içerik aynı; yeni kayıt oluşturulmadı.';
    return;
  }
  const revision = {
    id: 'rev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    label: String(label || '').trim() || 'Revizyon ' + (c.report.revisions.length + 1),
    createdAt: new Date().toISOString(),
    digest,
    snapshot
  };
  c.report.revisions.push(revision);
  if (c.report.revisions.length > 10) c.report.revisions.splice(0, c.report.revisions.length - 10);
  persist();
  renderRevisions(c);
  const status = $('#reportRevisionDiff');
  if (status) status.textContent = 'Revizyon kaydedildi.';
}

$('#reportRevisionPanel')?.addEventListener('click', (event) => {
  const save = event.target.closest('#reportRevisionSave');
  if (save) {
    const c = currentCase();
    if (!c) return;
    saveRevision(c, $('#reportRevisionLabel')?.value);
    return;
  }
  const compare = event.target.closest('#reportRevisionCompare');
  if (compare) {
    const c = currentCase();
    if (!c) return;
    const revisions = c.report?.revisions || [];
    const a = revisions.find((rev) => rev.id === $('#reportRevisionA')?.value);
    const b = revisions.find((rev) => rev.id === $('#reportRevisionB')?.value);
    const host = $('#reportRevisionDiff');
    if (!host) return;
    if (!a || !b) { host.textContent = 'Karşılaştırma için iki revizyon seçin.'; return; }
    if (a.id === b.id) { host.textContent = 'Fark görmek için iki farklı revizyon seçin.'; return; }
    const diffs = compareRevisionSnapshots(a.snapshot, b.snapshot);
    host.innerHTML = diffs.map((item) => `<div class="report-diff-row"><span>${escapeHtml(item.label)}</span><b class="${item.changed ? 'is-changed' : ''}">${item.changed ? 'Değişti' : 'Aynı'}</b></div>`).join('');
    return;
  }
  const restore = event.target.closest('[data-revision-restore]');
  if (restore) {
    const c = currentCase();
    if (!c) return;
    const revision = (c.report?.revisions || []).find((item) => item.id === restore.dataset.revisionRestore);
    if (!revision) return;
    if (!window.confirm(`"${revision.label}" revizyonu geri yüklensin mi? Mevcut rapor bilgileri bir sonraki revizyon olarak kaydedilecek.`)) return;
    saveRevision(c, 'Geri yükleme öncesi');
    const snapshot = revision.snapshot;
    const revisions = c.report.revisions;
    c.report = { ...snapshot.report, revisions };
    Object.assign(c, snapshot.case);
    c.questions = snapshot.questions;
    c.materials = (c.materials || []).map((m) => {
      const found = snapshot.materials.find((item) => item.id === m.id);
      return found ? { ...m, ...found } : m;
    });
    persist();
    redraw(c);
  }
});

$('#downloadDocxBtn')?.addEventListener('click', () => {
  const c = currentCase();
  if (c) saveRevision(c, 'DOCX çıktısı öncesi');
});
$('#downloadUdfBtn')?.addEventListener('click', () => {
  const c = currentCase();
  if (c) saveRevision(c, 'UDF çıktısı öncesi');
});
$('#reportUdfBtn2')?.addEventListener('click', () => {
  const c = currentCase();
  if (c) saveRevision(c, 'UDF çıktısı öncesi');
});

renderWorkspace(currentCase());
