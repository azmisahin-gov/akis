import assert from 'node:assert/strict';
import { emptyCase, normalizeCase } from '../assets/schema.js';
import {
  DEFAULT_REPORT_ORDER, DEFAULT_ANNEXES, normalizeReportLayout, moveItem,
  enabledMainSectionNumbers, sortMarkedParts, createRevisionSnapshot,
  compareRevisionSnapshots, revisionDigest
} from '../assets/report-model.js';

const layout = normalizeReportLayout({ layout: { order: ['s2', 's1', 's2', 'unknown'], annexes: [{ key: 'ek2', enabled: false, title: 'Envanter' }] } });
assert.deepEqual(layout.order.slice(0, 3), ['s2', 's1', 'cover']);
assert.equal(layout.order.length, DEFAULT_REPORT_ORDER.length);
assert.equal(new Set(layout.order).size, layout.order.length);
assert.equal(layout.annexes.find(x => x.key === 'ek2').enabled, false);
assert.equal(layout.annexes.some(x => x.key === 'ek4'), true);
assert.equal(layout.annexes.length, DEFAULT_ANNEXES.length);

assert.deepEqual(moveItem(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
assert.deepEqual(moveItem(['a', 'b'], 'a', -1), ['a', 'b']);
assert.deepEqual(enabledMainSectionNumbers(['s3', 's1', 's2'], { s1: true, s2: false, s3: true }), { s3: 1, s1: 2 });

const marked = '<cover><!--AKIS_REPORT_BLOCK:s1-->one<!--AKIS_REPORT_BLOCK:s2-->two<!--AKIS_REPORT_BLOCK:s3-->three';
assert.equal(sortMarkedParts(marked, ['s3', 's1', 's2']), '<cover>threeonetwo');

const base = { fileNo: '2026/1', court: 'Mahkeme', report: { conclusionText: 'A', revisions: [{ id: 'x' }] }, questions: [], materials: [] };
const richCase = {
  ...base,
  materials: [{
    id: 'm1', name: 'kayit.wav', sha256: 'abc', duration: 12,
    tech: { channels: 2 }, origin: { deliveredBy: 'Kurum' },
    segments: [{ id: 's1', start: '00:00:01.000', end: '00:00:02.000', text: 'Merhaba', review: 'approved', asrText: 'Meraba', asrModel: 'whisper-small', history: [{ text: 'Meraba' }], obs: { noise: true } }]
  }]
};
const snapshot = createRevisionSnapshot(richCase);
assert.equal(snapshot.report.revisions, undefined);
assert.equal(snapshot.materials[0].segments[0].asrText, 'Meraba');
assert.equal(snapshot.materials[0].segments[0].history[0].text, 'Meraba');
assert.equal(snapshot.materials[0].origin.deliveredBy, 'Kurum');
assert.equal(compareRevisionSnapshots(snapshot, snapshot).some(x => x.changed), false);
const altered = structuredClone(snapshot);
altered.report.conclusionText = 'B';
assert.equal(compareRevisionSnapshots(snapshot, altered).find(x => x.key === 'report').changed, true);
assert.notEqual(revisionDigest(snapshot), revisionDigest(altered));
console.log('Rapor çalışma alanı model testleri: tüm kontroller geçti.');

const legacyCase = emptyCase();
legacyCase.report.layout = { order: ['s2', 's1'], annexes: [{ key: 'custom-a', title: 'Özel delil', enabled: true, content: 'Metin', note: '' }] };
legacyCase.report.revisions = Array.from({ length: 12 }, (_, i) => ({ id: 'rev-' + i, createdAt: '2026-11-23T00:00:00.000Z' }));
const normalized = normalizeCase(legacyCase);
assert.deepEqual(normalized.report.layout.order.slice(0, 2), ['s2', 's1']);
assert.equal(normalized.report.layout.annexes[0].key, 'custom-a');
assert.equal(normalized.report.revisions.length, 10);
assert.equal(normalized.report.revisions[0].id, 'rev-2');
console.log('Rapor düzeni şema kalıcılığı: tüm kontroller geçti.');
