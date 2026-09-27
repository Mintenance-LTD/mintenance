import { InsufficientEvidenceError } from '@mintenance/shared';
import { handleAPIError } from './api-error';

describe('insufficient assessment evidence response', () => {
  it('returns an actionable recapture outcome without an assessment or ratings', async () => {
    const response = handleAPIError(new InsufficientEvidenceError());
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body).toEqual({
      outcome: 'insufficient_evidence',
      code: 'INSUFFICIENT_EVIDENCE',
      message: expect.stringContaining('Retake'),
      error: {
        code: 'INSUFFICIENT_EVIDENCE',
        message: expect.stringContaining('not been assessed'),
      },
      requiresRecapture: true,
      assessment: null,
    });
  });
});
