// @vitest-environment node
const m = vi.hoisted(() => ({
  insert: vi.fn(),
  detect: vi.fn(),
  cache: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: () => ({ insert: m.insert }) },
}));
vi.mock('@/lib/services/maintenance/MaintenanceDetectionService', () => ({
  MaintenanceDetectionService: { detectMaintenanceIssues: m.detect },
}));
vi.mock('@/lib/services/maintenance/MaintenanceKnowledgeBase', () => ({
  MaintenanceKnowledgeBase: {},
}));
vi.mock('@/lib/openai-client', () => ({ openai: {} }));
vi.mock('@/lib/services/cache/AIResponseCache', () => ({
  AIResponseCache: { get: m.cache },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
import { MaintenanceAssessmentService } from '@/lib/services/maintenance/MaintenanceAssessmentService';

beforeEach(() => {
  vi.clearAllMocks();
  m.detect.mockResolvedValue([]);
  m.insert.mockResolvedValue({ error: null });
});

it('persists a no-detection result when saving is requested', async () => {
  const result = await MaintenanceAssessmentService.assessMaintenanceIssue(
    ['https://example.test/photo.jpg'],
    { saveAssessment: true, userId: 'owner', useGPTFallback: false }
  );
  expect(m.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      id: result.id,
      user_id: 'owner',
      assessment_data: result,
    })
  );
});

it('propagates a database error without invoking paid fallback', async () => {
  m.insert.mockResolvedValue({ error: { message: 'write failed' } });
  await expect(
    MaintenanceAssessmentService.assessMaintenanceIssue(
      ['https://example.test/photo.jpg'],
      { saveAssessment: true, userId: 'owner', useGPTFallback: true }
    )
  ).rejects.toThrow('maintenance_assessment_save_failed');
  expect(m.cache).not.toHaveBeenCalled();
});

it('keeps an explicitly unsaved assessment in memory only', async () => {
  await MaintenanceAssessmentService.assessMaintenanceIssue(
    ['https://example.test/photo.jpg'],
    { saveAssessment: false, useGPTFallback: false }
  );
  expect(m.insert).not.toHaveBeenCalled();
});

it('does not recurse into GPT again when description fallback fails', async () => {
  m.cache.mockRejectedValue(new Error('provider unavailable'));
  const result = await MaintenanceAssessmentService.assessMaintenanceIssue(
    ['https://example.test/photo.jpg'],
    {
      saveAssessment: false,
      useGPTFallback: true,
      userDescription: 'Something strange is happening',
    }
  );
  expect(m.cache).toHaveBeenCalledTimes(1);
  expect(result.status).toBe('need_more_info');
  expect(result.message).toContain('temporarily unavailable');
});
