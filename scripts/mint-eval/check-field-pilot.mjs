/** Documentary readiness checks only: no database access, labels or model calls. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/i;
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const CHECKS = [
  'requiredCI', 'photoUploadReload', 'photoLinkedActivityReload',
  'crossAccountIsolation', 'originalAssessmentPreserved', 'reviewerAccessAndMfa',
  'trainingAndRetrievalIsolation', 'humanEscalationProcedure',
];

export function checkFieldPilot(manifest) {
  const blockers = [];
  const require = (condition, message) => { if (!condition) blockers.push(message); };
  if (!object(manifest)) throw new Error('Manifest must be a JSON object');
  require(manifest.protocolVersion === 'mint-building-pilot-v1', 'Unsupported protocol version');
  require(text(manifest.pilotId), 'Pilot ID is missing');
  require(manifest.purpose === 'supervised_workflow_pilot', 'Purpose must remain supervised_workflow_pilot');
  require(text(manifest.coordinator), 'Coordinator is unassigned');
  const reviewer = manifest.reviewer ?? {};
  require(UUID.test(reviewer.userId ?? ''), 'Independent reviewer account is unassigned');
  require(text(reviewer.expertise), 'Reviewer expertise is missing');
  require(text(reviewer.appointmentReference), 'Reviewer appointment evidence is missing');
  require(reviewer.independenceConfirmed === true, 'Reviewer independence is unconfirmed');

  const scope = manifest.scope ?? {};
  for (const field of ['targetProperties', 'targetAssessments']) {
    require(Number.isInteger(scope[field]) && scope[field] > 0, `${field} must be a positive integer`);
  }
  require(scope.targetAssessments >= scope.targetProperties, 'Assessment target must cover the property target');
  require(text(scope.approvedBy) && text(scope.approvalReference), 'Pilot scope needs documented approval');
  const release = manifest.release ?? {};
  require(text(release.deploymentId), 'Verified release deployment is missing');
  require(/^[0-9a-f]{40}$/i.test(release.commitSha ?? ''), 'Verified release commit SHA is missing');
  for (const key of CHECKS) {
    const receipt = release.checks?.[key];
    require(object(receipt) && text(receipt.verifiedBy) && text(receipt.evidenceReference) &&
      /^\d{4}-\d{2}-\d{2}T/.test(receipt.checkedAt ?? '') && Number.isFinite(Date.parse(receipt.checkedAt)),
    `Release check pending: ${key}`);
  }

  const cases = Array.isArray(manifest.cases) ? manifest.cases : [];
  require(Array.isArray(manifest.cases), 'cases must be an array');
  require(cases.length > 0, 'No permissioned cases enrolled');
  const assessmentIds = new Set();
  const properties = new Set();
  const photoIds = new Set();
  const imageHashes = new Map();
  const groups = new Map();
  for (const [index, entry] of cases.entries()) {
    const row = object(entry) ? entry : {};
    const label = `Case ${index + 1}`;
    const assessmentId = typeof row.assessmentId === 'string' ? row.assessmentId.toLowerCase() : row.assessmentId;
    const propertyId = typeof row.propertyId === 'string' ? row.propertyId.toLowerCase() : row.propertyId;
    require(UUID.test(row.assessmentId ?? ''), `${label}: assessment ID is missing or invalid`);
    require(!assessmentIds.has(assessmentId), `${label}: duplicate assessment`);
    assessmentIds.add(assessmentId);
    require(UUID.test(row.propertyId ?? ''), `${label}: property ID is missing or invalid`);
    if (UUID.test(row.propertyId ?? '')) properties.add(propertyId);
    require(text(row.captureGroup), `${label}: capture group is missing`);
    if (text(row.captureGroup)) {
      require(!groups.has(row.captureGroup) || groups.get(row.captureGroup) === propertyId,
        `${label}: capture group spans different properties; reconcile grouping`);
      groups.set(row.captureGroup, propertyId);
    }
    require(row.sourceType === 'permissioned_field_capture', `${label}: synthetic/public/unknown source is excluded`);
    require(object(row.permission) && text(row.permission.reference) && text(row.permission.recordedBy) &&
      row.permission.captureAndReview === true, `${label}: capture/review permission is missing`);
    require(row.trainingAllowed === false, `${label}: pilot case must remain excluded from training`);
    require(HASH.test(row.sourceFingerprint ?? ''), `${label}: source fingerprint is missing`);
    const photos = Array.isArray(row.photos) ? row.photos : [];
    require(photos.length > 0, `${label}: no photo evidence`);
    for (const photo of photos) {
      require(object(photo) && UUID.test(photo.id ?? '') && HASH.test(photo.sha256 ?? ''), `${label}: invalid photo ID/hash`);
      if (!object(photo)) continue;
      const photoId = typeof photo.id === 'string' ? photo.id.toLowerCase() : photo.id;
      const hash = typeof photo.sha256 === 'string' ? photo.sha256.toLowerCase() : photo.sha256;
      require(!photoIds.has(photoId), `${label}: photo ID reused`);
      photoIds.add(photoId);
      // Repeated bytes are not independent captures, even on the same property.
      require(!imageHashes.has(hash), `${label}: duplicate image bytes; reconcile before enrolling`);
      imageHashes.set(hash, row.assessmentId);
      require(['overview', 'detail', 'context'].includes(photo.view), `${label}: photo view must be overview, detail or context`);
    }
    require(photos.some((photo) => photo?.view === 'overview') && photos.some((photo) => photo?.view === 'detail'),
      `${label}: overview and detail photos are required`);
  }
  return {
    protocolVersion: 'mint-building-pilot-v1',
    pilotId: manifest.pilotId ?? null,
    status: blockers.length ? 'preparation_incomplete' : 'documentary_checks_complete',
    counts: { assessments: cases.length, properties: properties.size, photos: photoIds.size },
    planned: { properties: scope.targetProperties ?? null, assessments: scope.targetAssessments ?? null },
    blockers,
    limitations: [
      'Checks recorded declarations only; does not verify Supabase, permissions, qualifications or image bytes.',
      'Does not disable app training capture or retrieval. Isolation must be implemented and verified separately.',
      'Not a held-out benchmark, accuracy result, training approval or model release authorization.',
      'Related crops and frames require manual grouping; byte hashes cannot find all related captures.',
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [flag, file, ...extra] = process.argv.slice(2);
    if (flag !== '--manifest' || !file || extra.length) throw new Error('Usage: node scripts/mint-eval/check-field-pilot.mjs --manifest PATH');
    const report = checkFieldPilot(JSON.parse(await readFile(file, 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.blockers.length ? 2 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
