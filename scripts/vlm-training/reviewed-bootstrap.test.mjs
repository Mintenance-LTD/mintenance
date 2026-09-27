import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewedBootstrapTarget } from './reviewed-bootstrap.mjs';
const teacher = { damageAssessment: { damageType: 'crack', confidence: 99 } };
const review = { human_verified: true, image_urls: ['https://example.org/a.jpg'], teacher_response: teacher };
test('confidence cannot substitute for reviewed labels', () => {
  assert.equal(reviewedBootstrapTarget({ ...review, human_verified: false }, review.image_urls), null);
});
test('reviewed correction wins over teacher output', () => {
  const corrected = { damageAssessment: { damageType: 'none' } };
  assert.equal(reviewedBootstrapTarget({ ...review, human_corrected_response: corrected }, review.image_urls), corrected);
});
test('rejects labels for different or reordered images', () => {
  assert.equal(reviewedBootstrapTarget(review, ['https://example.org/b.jpg']), null);
  assert.equal(reviewedBootstrapTarget({ ...review, image_urls: ['https://example.org/a.jpg','https://example.org/b.jpg'] }, ['https://example.org/b.jpg','https://example.org/a.jpg']), null);
});
test('permits rotated Supabase signing tokens without weakening other URL identity', () => {
  const url = 'https://test.supabase.co/storage/v1/object/sign/photos/a.jpg';
  assert.equal(reviewedBootstrapTarget({ ...review, image_urls: [url+'?token=old'] }, [url+'?token=new']), teacher);
  assert.equal(reviewedBootstrapTarget({ ...review, image_urls: ['https://example.org/image?id=a'] }, ['https://example.org/image?id=b']), null);
});
