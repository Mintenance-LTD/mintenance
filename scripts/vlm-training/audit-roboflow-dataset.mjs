#!/usr/bin/env node
/** Read-only COCO inventory. Never creates labels, approves reviews or trains a model. */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const policyPath = new URL(
  '../../apps/web/lib/services/building-surveyor/taxonomy/roboflow-label-policy.json',
  import.meta.url
);
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const normalize = (value) =>
  value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const aliases = new Map(Object.entries(policy.defectAliases));
for (const name of policy.canonicalDamageTypes)
  aliases.set(normalize(name), name);
const digest = (value) => createHash('sha256').update(value).digest('hex');

export function interpretLabel(name) {
  const normalized = normalize(name);
  if (aliases.has(normalized))
    return { kind: 'defect', damageType: aliases.get(normalized) };
  return {
    kind: policy.contextLabels.includes(normalized)
      ? 'context'
      : policy.reviewLabels.includes(normalized)
        ? 'review'
        : 'unknown',
    damageType: null,
  };
}

/** Splits contain COCO plus content hashes read locally by loadDataset. */
export function auditDataset(splits, reviews = {}) {
  const rows = [];
  const categories = new Map();
  for (const { split, coco, imageHashes = {} } of splits) {
    for (const key of ['images', 'annotations', 'categories']) {
      if (!Array.isArray(coco[key]))
        throw new Error(`${split}: COCO ${key} must be an array`);
    }
    const names = new Map();
    for (const category of coco.categories) {
      if (
        !Number.isInteger(category.id) ||
        typeof category.name !== 'string' ||
        !category.name.trim() ||
        names.has(category.id)
      ) {
        throw new Error(`${split}: invalid or duplicate category`);
      }
      names.set(category.id, category.name);
      categories.set(category.name, interpretLabel(category.name));
    }
    const images = new Map();
    for (const image of coco.images) {
      if (
        !Number.isInteger(image.id) ||
        images.has(image.id) ||
        typeof image.file_name !== 'string' ||
        !image.file_name
      )
        throw new Error(`${split}: invalid or duplicate image`);
      images.set(image.id, image);
    }
    const annotations = new Map();
    const annotationIds = new Set();
    for (const annotation of coco.annotations) {
      if (!Number.isInteger(annotation.id) || annotationIds.has(annotation.id))
        throw new Error(`${split}: invalid or duplicate annotation ID`);
      annotationIds.add(annotation.id);
      if (!images.has(annotation.image_id))
        throw new Error(`${split}: orphan annotation ${annotation.id}`);
      const list = annotations.get(annotation.image_id) ?? [];
      list.push(annotation);
      annotations.set(annotation.image_id, list);
    }
    for (const image of images.values()) {
      const key = `${split}/${image.id}`;
      const boxes = annotations.get(image.id) ?? [];
      const issues = [];
      const labels = boxes.map((box) => {
        const name = names.get(box.category_id);
        if (!name) issues.push('unknown_category_id');
        const meaning = name
          ? interpretLabel(name)
          : { kind: 'unknown', damageType: null };
        if (meaning.kind === 'unknown' || meaning.kind === 'review')
          issues.push('unresolved_label');
        const [x, y, w, h] = box.bbox ?? [];
        if (
          !Array.isArray(box.bbox) ||
          box.bbox.length !== 4 ||
          ![x, y, w, h].every(Number.isFinite) ||
          x < 0 ||
          y < 0 ||
          w <= 0 ||
          h <= 0 ||
          x + w > image.width ||
          y + h > image.height
        )
          issues.push('invalid_box');
        return {
          annotationId: box.id,
          sourceLabel: name ?? null,
          bbox: box.bbox,
          ...meaning,
        };
      });
      if (
        !Number.isFinite(image.width) ||
        image.width <= 0 ||
        !Number.isFinite(image.height) ||
        image.height <= 0
      )
        issues.push('invalid_dimensions');
      const imageSha256 = imageHashes[image.id] ?? null;
      if (!imageSha256) issues.push('missing_image');
      // Includes dimensions, category names and full annotation data: stale reviews must be repeated.
      const annotationSha256 = digest(
        JSON.stringify({
          width: image.width,
          height: image.height,
          boxes: [...boxes].sort((a, b) => a.id - b.id),
          labels: [...names].sort((a, b) => a[0] - b[0]),
        })
      );
      const review = reviews[key];
      const approved =
        review?.status === 'approved_defect' ||
        review?.status === 'approved_negative';
      if (!approved)
        issues.push(
          boxes.length
            ? 'needs_human_review'
            : 'unannotated_or_unreviewed_negative'
        );
      if (!review?.groupId?.trim()) issues.push('missing_site_group');
      if (approved) {
        if (
          !review.reviewer?.trim() ||
          !Number.isFinite(Date.parse(review.reviewedAt)) ||
          Date.parse(review.reviewedAt) > Date.now()
        )
          issues.push('missing_review_provenance');
        if (review.permissionConfirmed !== true)
          issues.push('training_permission_unconfirmed');
        if (
          review.imageSha256 !== imageSha256 ||
          review.annotationSha256 !== annotationSha256 ||
          review.policyVersion !== policy.version
        )
          issues.push('stale_review');
        const defectCount = labels.filter(
          (label) => label.kind === 'defect'
        ).length;
        if (review.status === 'approved_negative' && defectCount > 0)
          issues.push('negative_has_defect_labels');
        if (review.status === 'approved_defect' && defectCount === 0)
          issues.push('positive_missing_defect_labels');
      }
      rows.push({
        key,
        split,
        fileName: image.file_name,
        imageSha256,
        annotationSha256,
        policyVersion: policy.version,
        groupId: review?.groupId ?? null,
        labels,
        issues: [...new Set(issues)],
      });
    }
  }
  const clusters = new Map();
  for (const row of rows) {
    for (const [kind, identity] of [
      ['image', row.imageSha256],
      ['site', row.groupId],
    ]) {
      if (!identity) continue;
      const key = `${kind}:${identity}`;
      const group = clusters.get(key) ?? [];
      group.push(row);
      clusters.set(key, group);
    }
  }
  for (const [key, group] of clusters) {
    if (new Set(group.map((row) => row.split)).size > 1) {
      for (const row of group)
        row.issues.push(
          key.startsWith('image:')
            ? 'duplicate_image_across_splits'
            : 'site_leakage_across_splits'
        );
    } else if (key.startsWith('image:') && group.length > 1) {
      for (const row of group) row.issues.push('duplicate_image_within_split');
    }
  }
  const counts = {};
  for (const row of rows) {
    row.issues = [...new Set(row.issues)].sort();
    row.eligibleForDetectorExport = row.issues.length === 0;
    for (const issue of row.issues) counts[issue] = (counts[issue] ?? 0) + 1;
  }
  return {
    report: {
      policyVersion: policy.version,
      images: rows.length,
      withAnnotations: rows.filter((row) => row.labels.length).length,
      withoutAnnotations: rows.filter((row) => !row.labels.length).length,
      eligibleForDetectorExport: rows.filter(
        (row) => row.eligibleForDetectorExport
      ).length,
      blocked: rows.filter((row) => !row.eligibleForDetectorExport).length,
      issues: counts,
      categories: Object.fromEntries(categories),
      limitations: [
        'Only images listed in these COCO files are counted; private unexported uploads are not included.',
        'Exact byte duplicates only; crops, resized images and related video frames need manual grouping.',
        'Eligibility is for reviewed detector export, not model promotion or full VLM assessment targets.',
        'Minimum per-class coverage, a frozen test set and expert evaluation are still required.',
      ],
    },
    rows,
  };
}

export function loadDataset(datasetDirectory) {
  const root = realpathSync(datasetDirectory);
  const splits = [];
  for (const split of ['train', 'valid', 'test', 'unsplit']) {
    const directory = split === 'unsplit' ? root : resolve(root, split);
    const annotationsPath = resolve(directory, '_annotations.coco.json');
    if (!existsSync(annotationsPath)) continue;
    const coco = JSON.parse(readFileSync(annotationsPath, 'utf8'));
    const imageHashes = {};
    for (const image of coco.images ?? []) {
      if (typeof image.file_name !== 'string')
        throw new Error('Invalid COCO image filename');
      const path = resolve(directory, image.file_name);
      const inside = (candidate) => {
        const rel = relative(root, candidate);
        return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
      };
      if (!inside(path))
        throw new Error('COCO image path escapes dataset directory');
      if (!existsSync(path)) continue;
      if (!inside(realpathSync(path)))
        throw new Error('COCO image link escapes dataset directory');
      imageHashes[image.id] = digest(readFileSync(path));
    }
    splits.push({ split, coco, imageHashes });
  }
  if (!splits.length)
    throw new Error(
      'No _annotations.coco.json found in root, train, valid or test'
    );
  return splits;
}

function main() {
  const { values } = parseArgs({
    options: {
      dataset: { type: 'string' },
      reviews: { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(
      'node scripts/vlm-training/audit-roboflow-dataset.mjs --dataset <COCO export directory> --output <new report directory> [--reviews <reviews.json>]'
    );
    return;
  }
  if (!values.dataset || !values.output)
    throw new Error('--dataset and --output are required');
  const output = resolve(values.output);
  if (existsSync(output))
    throw new Error(
      'Output directory already exists; choose a new directory to preserve earlier audits'
    );
  const reviews = values.reviews
    ? JSON.parse(readFileSync(values.reviews, 'utf8'))
    : {};
  const { report, rows } = auditDataset(loadDataset(values.dataset), reviews);
  mkdirSync(dirname(output), { recursive: true });
  mkdirSync(output);
  writeFileSync(
    resolve(output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  writeFileSync(
    resolve(output, 'inventory.jsonl'),
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n'
  );
  writeFileSync(
    resolve(output, 'review-queue.jsonl'),
    rows
      .filter((row) => row.issues.length)
      .map((row) => JSON.stringify(row))
      .join('\n') + '\n'
  );
  writeFileSync(
    resolve(output, 'review-template.json'),
    JSON.stringify(
      Object.fromEntries(
        rows.map((row) => [
          row.key,
          {
            status: 'pending',
            groupId: '',
            reviewer: '',
            reviewedAt: '',
            permissionConfirmed: false,
            imageSha256: row.imageSha256,
            annotationSha256: row.annotationSha256,
            policyVersion: row.policyVersion,
          },
        ])
      ),
      null,
      2
    ) + '\n'
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.blocked || !report.images) process.exitCode = 2;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
