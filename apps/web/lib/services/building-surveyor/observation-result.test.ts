import { expect, it } from 'vitest';
import { getAssessmentResult } from './assessment-result';
const make = () => ({
  protocol: 'observation-only-v1',
  visualEvidence: {
    version: 'visible-evidence-v1',
    diagnosisStatus: 'not_established',
    photos: [
      {
        photoIndex: 0,
        observation: {
          scope: 'visible_region',
          outcome: 'no_visible_defect',
          crackPresent: false,
          observations: [],
          limitations: [],
        },
      },
    ],
  },
});
it('accepts a readable no-defect observation without manufactured scores', () =>
  expect(getAssessmentResult(make())).not.toBeNull());
it('rejects incomplete and incorrectly indexed evidence', () => {
  const value = make();
  value.visualEvidence.photos[0].photoIndex = 2;
  expect(getAssessmentResult(value)).toBeNull();
  value.visualEvidence.photos = [];
  expect(getAssessmentResult(value)).toBeNull();
});
it('does not accept a contradictory no-defect result', () => {
  const value = make();
  value.visualEvidence.photos[0].observation.crackPresent = true;
  expect(getAssessmentResult(value)).toBeNull();
});
