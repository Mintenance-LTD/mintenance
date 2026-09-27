import { expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: db }));
vi.mock('./BuildingSurveyorService', () => ({ BuildingSurveyorService: {} }));
vi.mock('./ABTestFeedbackService', () => ({ ABTestFeedbackService: {} }));
import { validateAssessment } from './DataCollectionValidationService';
it('blocks legacy validation before any observation row can be approved', async () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({
        data: { assessment_data: { protocol: 'observation-only-v1' } },
        error: null,
      }),
    update: db.update,
  };
  db.from.mockReturnValue(query);
  await expect(validateAssessment('test', 'reviewer')).rejects.toThrow(
    'photo review workflow'
  );
  expect(db.update).not.toHaveBeenCalled();
});
