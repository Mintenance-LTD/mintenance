import { createHash } from 'node:crypto';
import { imageIdentity } from './reviewed-bootstrap.mjs';

/** Keep each property and any shared-image properties in one partition. */
export function splitReviewedSites(rows, trainFraction, seed = 'mint-sites-v1') {
  if (!(trainFraction > 0 && trainFraction < 1)) throw new Error('Split must be between zero and one');
  const parents = new Map();
  const root = key => { let current = key; while (parents.get(current) !== current) current = parents.get(current); return current; };
  const seenIds = new Set(), imageOwners = new Map();
  for (const row of rows) {
    if (typeof row.propertyId !== 'string' || !row.propertyId.trim()) throw new Error('Every training row requires a property/site ID');
    if (!row.id || seenIds.has(row.id)) throw new Error('Missing or duplicate assessment ID');
    seenIds.add(row.id);
    if (!Array.isArray(row.imageUrls) || !row.imageUrls.length) throw new Error('Missing source images');
    if (!parents.has(row.propertyId)) parents.set(row.propertyId, row.propertyId);
    for (const url of row.imageUrls) {
      const image = imageIdentity(url);
      if (!image) throw new Error('Invalid source image URL');
      const previous = imageOwners.get(image);
      if (previous) {
        const a = root(row.propertyId), b = root(previous);
        // Stable representative regardless of row order.
        parents.set(a < b ? b : a, a < b ? a : b);
      }
      imageOwners.set(image, row.propertyId);
    }
  }
  const groups = [...new Set(rows.map(r => root(r.propertyId)))];
  if (groups.length < 2) throw new Error('At least two independent property/image groups are required');
  const hash = key => createHash('sha256').update(`${seed}:${key}`).digest('hex');
  groups.sort((a, b) => hash(a).localeCompare(hash(b)));
  const cutoff = Math.max(1, Math.min(groups.length - 1, Math.floor(groups.length * trainFraction)));
  const trainingGroups = new Set(groups.slice(0, cutoff));
  const trainRows = [], valRows = [], assignments = [];
  for (const row of [...rows].sort((a,b) => a.id.localeCompare(b.id))) {
    const group = root(row.propertyId);
    const split = trainingGroups.has(group) ? 'train' : 'validation';
    (split === 'train' ? trainRows : valRows).push(row);
    assignments.push({ assessmentId: row.id, propertyId: row.propertyId, group, split });
  }
  return { trainRows, valRows, manifest: { version: 1, seed, trainFraction, groupCount: groups.length, assignments } };
}
