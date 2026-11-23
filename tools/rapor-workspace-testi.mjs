import assert from 'node:assert/strict';
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
const snapshot = createRevisionSnapshot(base);
assert.equal(snapshot.report.revisions, undefined);
assert.equal(compareRevisionSnapshots(snapshot, snapshot).some(x => x.changed), false);
const altered = structuredClone(snapshot);
altered.report.conclusionText = 'B';
assert.equal(compareRevisionSnapshots(snapshot, altered).find(x => x.key === 'report').changed, true);
assert.notEqual(revisionDigest(snapshot), revisionDigest(altered));
console.log('Rapor çalışma alanı model testleri: tüm kontroller geçti.');
