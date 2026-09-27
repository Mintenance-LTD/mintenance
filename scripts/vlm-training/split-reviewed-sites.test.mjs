import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitReviewedSites } from './split-reviewed-sites.mjs';
const row = (id, propertyId, image = id) => ({ id, propertyId, imageUrls: [`https://example.test/${image}.jpg`] });
test('keeps repeated property observations together and both partitions nonempty', () => {
  const result = splitReviewedSites([row('a','site1'),row('b','site1'),row('c','site2')],0.9);
  const assignments = result.manifest.assignments;
  assert.equal(assignments[0].split,assignments[1].split);
  assert.notEqual(assignments[0].split,assignments[2].split);
});
test('shared images merge properties even when signing tokens rotate', () => {
  const a = row('a','site1'), b = row('b','site2');
  a.imageUrls = ['https://test.supabase.co/storage/v1/object/sign/photos/a.jpg?token=old'];
  b.imageUrls = ['https://test.supabase.co/storage/v1/object/sign/photos/a.jpg?token=new'];
  const result = splitReviewedSites([a,b,row('c','site3')],0.9);
  assert.equal(result.manifest.assignments[0].split,result.manifest.assignments[1].split);
  assert.equal(result.manifest.groupCount,2);
});
test('split is reproducible when input ordering changes', () => {
  const rows = [row('a','site1'),row('b','site2'),row('c','site3')];
  assert.deepEqual(splitReviewedSites(rows,0.7).manifest,splitReviewedSites([...rows].reverse(),0.7).manifest);
});
test('fails closed for ungrouped rows or insufficient independent sites', () => {
  assert.throws(()=>splitReviewedSites([row('a',null),row('b','site2')],0.9),/site ID/);
  assert.throws(()=>splitReviewedSites([row('a','site1'),row('b','site1')],0.9),/two independent/);
  assert.throws(()=>splitReviewedSites([row('a','site1'),row('a','site2')],0.9),/duplicate/);
});
