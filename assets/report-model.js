/**
 * Rapor çalışma alanı için saf veri yardımcıları.
 * Tarayıcı/DOM bağımlılığı yoktur; birim testleri Node.js üzerinde çalışır.
 */
export const DEFAULT_REPORT_ORDER = [
  'cover', 'coverFields', 'kunye', 'summary', 'toc',
  's1', 's2', 's3', 'origin', 'embedded', 'acquisition', 'speakers',
  's4', 'tech', 'enhance', 'asr', 's5', 'reading', 'scopeNote',
  's6', 's7', 'wer', 'levels', 'reviewSummary', 'qc', 'privacy', 'annex', 'signature'
];

export const DEFAULT_ANNEXES = [
  { key: 'ek1', title: 'Materyal teslim ve iade tutanağı', enabled: true, content: '', note: '' },
  { key: 'ek2', title: 'Dosya teknik envanteri', enabled: true, content: '', note: '' },
  { key: 'ek3', title: 'Zincirleme muhafaza / işlem günlüğü', enabled: true, content: '', note: '' },
  { key: 'ek4', title: 'Bilirkişi teknik gözlem notu', enabled: false, content: '', note: '' },
  { key: 'ek5', title: 'Transkript gösterim anahtarı', enabled: true, content: '', note: '' },
  { key: 'ek6', title: 'Son kontrol listesi', enabled: true, content: '', note: '' },
  { key: 'ek7', title: 'Hukuki ve yöntemsel dayanaklar', enabled: true, content: '', note: '' }
];

const clone = (value) => JSON.parse(JSON.stringify(value));

export function normalizeReportLayout(report, sectionKeys = DEFAULT_REPORT_ORDER) {
  const source = report && typeof report === 'object' ? report : {};
  const layout = source.layout && typeof source.layout === 'object' ? source.layout : {};
  const allowed = new Set(sectionKeys);
  const seen = new Set();
  const order = [];
  for (const key of Array.isArray(layout.order) ? layout.order : []) {
    if (typeof key === 'string' && allowed.has(key) && !seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }
  for (const key of sectionKeys) {
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }

  const defaults = DEFAULT_ANNEXES.map((item) => ({ ...item }));
  const byKey = new Map(defaults.map((item) => [item.key, item]));
  const input = Array.isArray(layout.annexes) ? layout.annexes : defaults;
  const annexes = [];
  const annexSeen = new Set();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const key = typeof raw.key === 'string' && raw.key.trim() ? raw.key.trim() : '';
    if (!key || annexSeen.has(key)) continue;
    annexSeen.add(key);
    const base = byKey.get(key) || { key, title: 'Yeni ek', enabled: true, content: '', note: '' };
    annexes.push({
      key,
      title: typeof raw.title === 'string' ? raw.title : base.title,
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled,
      content: typeof raw.content === 'string' ? raw.content : '',
      note: typeof raw.note === 'string' ? raw.note : ''
    });
  }
  for (const item of defaults) {
    if (!annexSeen.has(item.key)) annexes.push({ ...item });
  }
  return { order, annexes };
}

export function moveItem(items, key, direction) {
  const list = Array.isArray(items) ? items.slice() : [];
  const index = list.findIndex((item) => (typeof item === 'string' ? item : item && item.key) === key);
  if (index < 0 || !Number.isInteger(direction) || direction === 0) return list;
  const target = Math.max(0, Math.min(list.length - 1, index + Math.sign(direction)));
  if (target === index) return list;
  [list[index], list[target]] = [list[target], list[index]];
  return list;
}

export function enabledMainSectionNumbers(order, sections) {
  const enabled = (Array.isArray(order) ? order : DEFAULT_REPORT_ORDER)
    .filter((key) => /^s[1-7]$/.test(key) && (!sections || sections[key] !== false));
  return Object.fromEntries(enabled.map((key, index) => [key, index + 1]));
}

export function sortMarkedParts(source, order) {
  const text = String(source ?? '');
  const re = /<!--AKIS_REPORT_BLOCK:([a-zA-Z0-9_-]+)-->/g;
  const matches = [...text.matchAll(re)];
  if (!matches.length) return text;
  const prefix = text.slice(0, matches[0].index);
  const chunks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    chunks.push({ key: matches[i][1], value: text.slice(start, end), index: i });
  }
  const rank = new Map((Array.isArray(order) ? order : DEFAULT_REPORT_ORDER).map((key, i) => [key, i]));
  chunks.sort((a, b) => {
    const ar = rank.has(a.key) ? rank.get(a.key) : Number.MAX_SAFE_INTEGER;
    const br = rank.has(b.key) ? rank.get(b.key) : Number.MAX_SAFE_INTEGER;
    return ar - br || a.index - b.index;
  });
  return prefix + chunks.map((chunk) => chunk.value).join('');
}

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function createRevisionSnapshot(caseData) {
  const c = caseData && typeof caseData === 'object' ? caseData : {};
  const report = clone(c.report || {});
  delete report.revisions;
  const materials = (Array.isArray(c.materials) ? c.materials : []).map((m) => ({
    id: m.id,
    name: m.name || m.fileName || '',
    sha256: m.sha256 || '',
    duration: Number(m.duration) || 0,
    segments: (Array.isArray(m.segments) ? m.segments : []).map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      speakerId: s.speakerId || s.speaker || '',
      text: s.text || '',
      review: s.review || s.status || '',
      obs: s.obs || []
    }))
  }));
  return {
    case: {
      reportType: c.reportType || 'hukuk',
      court: c.court || '',
      fileNo: c.fileNo || '',
      subject: c.subject || '',
      caseDate: c.caseDate || '',
      inspectionDate: c.inspectionDate || '',
      reportDate: c.reportDate || '',
      assignmentScope: c.assignmentScope || '',
      methodText: c.methodText || '',
      limitationsText: c.limitationsText || '',
      conclusionText: c.conclusionText || '',
      parties: clone(c.parties || {}),
      assignment: clone(c.assignment || {}),
      expert: clone(c.expert || {}),
      expertName: c.expertName || '',
      registryNo: c.registryNo || '',
      expertField: c.expertField || ''
    },
    report,
    questions: clone(Array.isArray(c.questions) ? c.questions : []),
    materials
  };
}

export function revisionDigest(snapshot) {
  return stableJson(snapshot);
}

export function compareRevisionSnapshots(left, right) {
  const a = left && typeof left === 'object' ? left : {};
  const b = right && typeof right === 'object' ? right : {};
  const labels = [
    ['Künye ve görevlendirme', 'case'],
    ['Rapor bölümleri ve metinler', 'report'],
    ['Mahkeme soruları ve yanıtları', 'questions'],
    ['Ses kayıtları ve doğrulanmış deşifre', 'materials']
  ];
  return labels.map(([label, key]) => ({
    key,
    label,
    changed: revisionDigest(a[key]) !== revisionDigest(b[key])
  }));
}
