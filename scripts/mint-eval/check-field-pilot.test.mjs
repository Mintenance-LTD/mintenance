import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkFieldPilot } from './check-field-pilot.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const receipt = { verifiedBy: 'test operator', checkedAt: '2026-10-25T12:00:00Z', evidenceReference: 'fixture-only' };
function complete() {
  return {
    protocolVersion: 'mint-building-pilot-v1', pilotId: 'fixture', purpose: 'supervised_workflow_pilot',
    coordinator: 'test coordinator',
    reviewer: { userId: id(1), expertise: 'fixture', appointmentReference: 'fixture', independenceConfirmed: true },
    scope: { targetProperties: 10, targetAssessments: 30, approvedBy: 'fixture', approvalReference: 'fixture' },
    release: { deploymentId: 'fixture', commitSha: 'a'.repeat(40), checks: Object.fromEntries([
      'requiredCI', 'photoUploadReload', 'photoLinkedActivityReload', 'crossAccountIsolation',
      'originalAssessmentPreserved', 'reviewerAccessAndMfa', 'trainingAndRetrievalIsolation', 'humanEscalationProcedure',
    ].map((key) => [key, receipt])) },
    cases: [{ assessmentId: id(2), propertyId: id(3), captureGroup: 'site-1-visit-1',
      sourceType: 'permissioned_field_capture', trainingAllowed: false,
      permission: { reference: 'fixture', recordedBy: 'fixture', captureAndReview: true },
      sourceFingerprint: 'b'.repeat(64),
      photos: [{ id: id(4), sha256: 'c'.repeat(64), view: 'overview' }, { id: id(5), sha256: 'd'.repeat(64), view: 'detail' }],
    }],
  };
}
test('template remains pending with no invented reviewers or properties', async () => {
  const template = JSON.parse(await readFile(new URL('../../docs/pilot/pilot-manifest.template.json', import.meta.url)));
  const report = checkFieldPilot(template);
  assert.equal(report.status, 'preparation_incomplete');
  assert.equal(report.counts.assessments, 0);
  assert.ok(report.blockers.includes('Independent reviewer account is unassigned'));
});
test('complete declarations are not labelled accuracy or launch approval', () => {
  const report = checkFieldPilot(complete());
  assert.equal(report.status, 'documentary_checks_complete');
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.counts, { assessments: 1, properties: 1, photos: 2 });
  assert.ok(report.limitations.some((line) => line.includes('Not a held-out benchmark')));
});
for (const [name, change, message] of [
  ['reviewer pending', (m) => { m.reviewer = null; }, 'reviewer account'],
  ['missing permissions', (m) => { m.cases[0].permission.captureAndReview = false; }, 'permission is missing'],
  ['synthetic source', (m) => { m.cases[0].sourceType = 'synthetic'; }, 'source is excluded'],
  ['training enabled', (m) => { m.cases[0].trainingAllowed = true; }, 'excluded from training'],
  ['boolean release signoff', (m) => { m.release.checks.requiredCI = true; }, 'requiredCI'],
  ['changed source without fingerprint', (m) => { delete m.cases[0].sourceFingerprint; }, 'fingerprint is missing'],
  ['missing wide view', (m) => { m.cases[0].photos[0].view = 'detail'; }, 'overview and detail'],
  ['duplicate image bytes', (m) => { m.cases[0].photos[1].sha256 = m.cases[0].photos[0].sha256.toUpperCase(); }, 'duplicate image bytes'],
  ['duplicate assessment', (m) => { m.cases.push(structuredClone(m.cases[0])); }, 'duplicate assessment'],
  ['invalid row', (m) => { m.cases = [null]; }, 'assessment ID'],
]) {
  test(`blocks ${name}`, () => {
    const manifest = complete(); change(manifest);
    assert.ok(checkFieldPilot(manifest).blockers.some((line) => line.includes(message)));
  });
}
test('groups cannot silently span properties', () => {
  const manifest = complete();
  const second = structuredClone(manifest.cases[0]);
  second.assessmentId = id(8); second.propertyId = id(9);
  manifest.cases.push(second);
  assert.ok(checkFieldPilot(manifest).blockers.some((line) => line.includes('spans different properties')));
});
test('invalid top-level input fails explicitly', () => {
  for (const value of [null, [], 'invalid']) assert.throws(() => checkFieldPilot(value), /JSON object/);
});
