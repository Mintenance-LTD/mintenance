import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
import { loadReviewSource } from './review-source';

const row = {
  id: 'test',
  property_id: null,
  domain: 'building',
  validation_status: 'ai_analysis_failed',
  assessment_data: {
    outcome: 'insufficient_evidence',
    evidenceSufficient: false,
    analysis: {
      captureIssue: { photoIndex: 0, issue: 'too_dark' },
      errorCode: 'INSUFFICIENT_EVIDENCE',
    },
  },
};
let source: Record<string, unknown>;
beforeEach(() => {
  source = structuredClone(row);
  mocks.from.mockImplementation((table: string) => {
    const query: Record<string, unknown> = {};
    query.select = () => query;
    query.eq = () => query;
    if (table === 'building_assessments')
      query.maybeSingle = async () => ({ data: source, error: null });
    else {
      let orders = 0;
      query.order = () =>
        ++orders === 1
          ? query
          : Promise.resolve({
              data: [
                {
                  id: 'photo',
                  image_index: 0,
                  storage_path: 'private/a.jpg',
                  image_url: 'https://test.supabase.co/a.jpg?token=one',
                },
              ],
              error: null,
            });
    }
    return query;
  });
});
describe('review evidence for recapture outcomes', () => {
  it('allows rejected evidence to be reviewed without inventing a diagnosis', async () => {
    const result = await loadReviewSource('test');
    expect(result.snapshot).toMatchObject({
      outcome: 'insufficient_evidence',
      evidenceSufficient: false,
    });
    expect(result.snapshot).not.toHaveProperty('damageAssessment');
    expect(result.images).toHaveLength(1);
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
  it('still blocks active workers and technical failures', async () => {
    source.validation_status = 'processing';
    await expect(loadReviewSource('test')).rejects.toThrow(
      'completed assessment'
    );
    source.validation_status = 'ai_analysis_failed';
    source.assessment_data = { analysis: { state: 'failed' } };
    await expect(loadReviewSource('test')).rejects.toThrow(
      'completed assessment'
    );
  });
});
