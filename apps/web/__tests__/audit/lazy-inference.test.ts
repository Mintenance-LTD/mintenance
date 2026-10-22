import { beforeEach, expect, it, vi } from 'vitest';
import { RoboflowDetectionService } from '@/lib/services/building-surveyor/RoboflowDetectionService';
const local = vi.hoisted(() => ({ initialize: vi.fn(), detect: vi.fn(), isAvailable: vi.fn(() => true) }));
vi.mock('@mintenance/shared', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: (_message: string, context: { error?: unknown }) => { if (context.error) throw context.error; } } }));
vi.mock('@/lib/config/roboflow.config', () => ({
  getRoboflowConfig: () => ({ useLocalYOLO: true, yoloModelPath: '/synthetic/model.onnx' }),
  validateRoboflowConfig: () => ({ valid: false }),
}));
vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: async (urls: string[]) => ({ valid: urls, invalid: [] }),
}));
vi.mock('@/lib/services/building-surveyor/LocalYOLOInferenceService', () => ({ LocalYOLOInferenceService: local }));
beforeEach(() => {
vi.clearAllMocks();
  local.isAvailable.mockReturnValue(true);
  local.initialize.mockResolvedValue(undefined);
  local.detect.mockResolvedValue([]);
});
it('loads local inference once for concurrent assessments, only when images are supplied', async () => {

  await RoboflowDetectionService.detect([]);
  expect(local.initialize).not.toHaveBeenCalled();
  await Promise.all([
    RoboflowDetectionService.detect(['https://example.invalid/one.jpg']),
    RoboflowDetectionService.detect(['https://example.invalid/two.jpg']),
  ]);
  expect(local.initialize).toHaveBeenCalledOnce();
  expect(local.detect).toHaveBeenCalledTimes(2);
});
