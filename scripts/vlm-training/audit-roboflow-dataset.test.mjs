import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditDataset,
  interpretLabel,
  loadDataset,
} from './audit-roboflow-dataset.mjs';

function fixture({
  split = 'train',
  name = 'Broken Window',
  boxes = true,
  hash = 'image-a',
} = {}) {
  return {
    split,
    imageHashes: { 1: hash },
    coco: {
      images: [{ id: 1, file_name: 'image.jpg', width: 100, height: 100 }],
      categories: [{ id: 98, name }],
      annotations: boxes
        ? [{ id: 1, image_id: 1, category_id: 98, bbox: [5, 5, 20, 30] }]
        : [],
    },
  };
}
function review(splits, overrides = {}) {
  return Object.fromEntries(
    auditDataset(splits).rows.map((row) => [
      row.key,
      {
        status: row.labels.some((label) => label.kind === 'defect')
          ? 'approved_defect'
          : 'approved_negative',
        reviewer: 'test-reviewer',
        reviewedAt: '2026-10-01T12:00:00Z',
        groupId: `site-${row.split}`,
        permissionConfirmed: true,
        imageSha256: row.imageSha256,
        annotationSha256: row.annotationSha256,
        policyVersion: row.policyVersion,
        ...overrides,
      },
    ])
  );
}

test('canonical and case/spacing variants work without relying on category IDs', () => {
  assert.equal(interpretLabel('  Damaged_Roof ').damageType, 'roof_damage');
  assert.equal(interpretLabel('pipe_leak').damageType, 'pipe_leak');
  assert.equal(
    auditDataset([fixture()]).rows[0].labels[0].damageType,
    'window_broken'
  );
});
test('objects and healthy region labels do not become defects', () => {
  for (const name of ['window', 'ROOF', 'pipe', 'normal wall', 'good_bolt']) {
    assert.deepEqual(interpretLabel(name), {
      kind: 'context',
      damageType: null,
    });
  }
});
test('ambiguous or unfamiliar categories stay unresolved', () => {
  assert.equal(interpretLabel('crack-mold-damp-spalling-cor').kind, 'review');
  assert.equal(interpretLabel('brand-new-label').kind, 'unknown');
  const splits = [fixture({ name: 'Other' })];
  assert.ok(
    auditDataset(splits, review(splits)).rows[0].issues.includes(
      'unresolved_label'
    )
  );
});
test('empty annotations require explicit reviewed negatives, site and permission', () => {
  const splits = [fixture({ boxes: false })];
  assert.equal(auditDataset(splits).report.eligibleForDetectorExport, 0);
  assert.ok(
    auditDataset(splits).rows[0].issues.includes(
      'unannotated_or_unreviewed_negative'
    )
  );
  assert.equal(
    auditDataset(splits, review(splits)).report.eligibleForDetectorExport,
    1
  );
  for (const overrides of [
    { permissionConfirmed: false },
    { groupId: '' },
    { reviewer: '' },
    { reviewedAt: 'invalid' },
  ]) {
    assert.equal(
      auditDataset(splits, review(splits, overrides)).report
        .eligibleForDetectorExport,
      0
    );
  }
});
test('image, annotations and policy changes invalidate a previous review', () => {
  const splits = [fixture()];
  const reviews = review(splits);
  splits[0].coco.annotations[0].bbox[0] = 6;
  assert.ok(
    auditDataset(splits, reviews).rows[0].issues.includes('stale_review')
  );
  for (const overrides of [{ imageSha256: 'old' }, { policyVersion: 'old' }]) {
    assert.ok(
      auditDataset(splits, review(splits, overrides)).rows[0].issues.includes(
        'stale_review'
      )
    );
  }
});
test('contradictory positive and negative reviews fail closed', () => {
  let splits = [fixture()];
  assert.ok(
    auditDataset(
      splits,
      review(splits, { status: 'approved_negative' })
    ).rows[0].issues.includes('negative_has_defect_labels')
  );
  splits = [fixture({ name: 'window' })];
  assert.ok(
    auditDataset(
      splits,
      review(splits, { status: 'approved_defect' })
    ).rows[0].issues.includes('positive_missing_defect_labels')
  );
});
test('invalid boxes and missing images cannot pass review', () => {
  const splits = [fixture()];
  splits[0].coco.annotations[0].bbox = [90, 10, 20, 30];
  splits[0].imageHashes = {};
  const row = auditDataset(splits, review(splits)).rows[0];
  assert.ok(row.issues.includes('invalid_box'));
  assert.ok(row.issues.includes('missing_image'));
});
test('content duplicates and site leakage across partitions block both sides', () => {
  const splits = [fixture(), fixture({ split: 'test' })];
  let result = auditDataset(splits, review(splits));
  assert.equal(result.report.eligibleForDetectorExport, 0);
  assert.ok(
    result.rows.every((row) =>
      row.issues.includes('duplicate_image_across_splits')
    )
  );
  splits[1].imageHashes[1] = 'different-image';
  result = auditDataset(splits, review(splits, { groupId: 'same-property' }));
  assert.ok(
    result.rows.every((row) =>
      row.issues.includes('site_leakage_across_splits')
    )
  );
});
test('orphan and duplicate annotations abort the audit', () => {
  const data = fixture();
  data.coco.annotations.push({ ...data.coco.annotations[0] });
  assert.throws(() => auditDataset([data]), /duplicate annotation/);
  data.coco.annotations.pop();
  data.coco.annotations[0].image_id = 999;
  assert.throws(() => auditDataset([data]), /orphan annotation/);
});
test('loader hashes actual bytes, reports absent images and rejects path traversal', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mint-coco-test-'));
  try {
    mkdirSync(join(directory, 'train'));
    const data = fixture().coco;
    const annotationsPath = join(directory, 'train', '_annotations.coco.json');
    writeFileSync(annotationsPath, JSON.stringify(data));
    assert.ok(
      auditDataset(loadDataset(directory)).rows[0].issues.includes(
        'missing_image'
      )
    );
    writeFileSync(join(directory, 'train', 'image.jpg'), 'fixture-bytes');
    assert.match(loadDataset(directory)[0].imageHashes[1], /^[0-9a-f]{64}$/);
    data.images[0].file_name = '../../escape.jpg';
    writeFileSync(annotationsPath, JSON.stringify(data));
    assert.throws(() => loadDataset(directory), /escapes dataset/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
