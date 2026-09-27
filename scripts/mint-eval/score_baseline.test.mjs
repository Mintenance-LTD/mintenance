import test from 'node:test';
import assert from 'node:assert/strict';
import { crackPrediction, summarize } from './score_baseline.mjs';

test('detects structured crack labels and ignores negation and incidental advice', () => {
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'concrete', findings: [{ taxonomyClassId: 'crack_settlement' }] } }), true);
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'no_visible_cracks', description: 'Monitor for cracks' } }), false);
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'spalling', description: 'No cracks visible' } }), false);
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'unknown' } }), null);
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'non-structural crack' } }), true);
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'non-cracked concrete' } }), false);
  assert.equal(crackPrediction({ status: 'assessed', parsed: { damageType: 'crack-free surface' } }), false);
});
test('does not count abstentions or errors as correct negatives and separates derivatives', () => {
  const rows = [
    { id: 'p', cohort: 'original', crack_present: true },
    { id: 'n1', cohort: 'original', crack_present: false },
    { id: 'n2', cohort: 'original', crack_present: false },
    { id: 'missing', cohort: 'original', crack_present: true },
    { id: 'stress', cohort: 'degraded', transformation: 'dark' },
  ];
  const results = new Map([
    ['p', { status: 'assessed', parsed: { damageType: 'crack' } }],
    ['n1', { status: 'abstained' }], ['n2', { status: 'request_error' }], ['stress', { status: 'abstained' }],
  ]);
  const s = summarize(rows, results);
  assert.equal(s.counts.tn, 0);
  assert.equal(s.counts.abstainedNegative, 1);
  assert.equal(s.counts.errorsNegative, 1);
  assert.equal(s.counts.pending, 1);
  assert.equal(s.metrics.positiveDetectionRate, .5);
  assert.equal(s.metrics.classificationCoverage, .25);
  assert.equal(s.metrics.accuracyAmongClassified, 1);
  assert.equal(s.stress.abstained, 1);
});
