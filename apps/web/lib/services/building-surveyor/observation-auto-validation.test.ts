import { expect, it, vi } from 'vitest';
const db = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: db } }));
vi.mock('@/lib/services/monitoring/MonitoringService', () => ({
  MonitoringService: { record: vi.fn() },
}));
import { autoValidateIfHighConfidence } from './DataCollectionAutoValidateService';
import type { Phase1BuildingAssessment } from './types';
it('never approves unverified observations even when legacy scores appear confident', async () => {
  const assessment = {
    visualEvidence: {
      version: 'visible-evidence-v1',
      diagnosisStatus: 'not_established',
      photos: [],
    },
    damageAssessment: { confidence: 100 },
    safetyHazards: { overallSafetyScore: 100 },
    insuranceRisk: { riskScore: 0 },
  } as unknown as Phase1BuildingAssessment;
  const result = await autoValidateIfHighConfidence(assessment, 'test-id');
  expect(result).toMatchObject({
    autoValidated: false,
    reason: expect.stringContaining('not established'),
  });
  expect(db).not.toHaveBeenCalled();
});
