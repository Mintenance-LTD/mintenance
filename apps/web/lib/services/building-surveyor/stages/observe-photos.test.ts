import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  stopped: vi.fn(),
  budget: vi.fn(),
  usage: vi.fn(),
}));
vi.mock('@/lib/utils/openai-rate-limit', () => ({
  fetchWithOpenAIRetry: mocks.fetch,
}));
vi.mock('../../ai/CostControlService', () => ({
  CostControlService: {
    isEmergencyStopped: mocks.stopped,
    checkBudget: mocks.budget,
    recordUsage: mocks.usage,
    estimateCost: () => 0.01,
  },
}));
import { observePhotos } from './observe-photos';
const healthy = {
  scope: 'visible_region',
  outcome: 'no_visible_defect',
  crackPresent: false,
  observations: [],
  limitations: ['Visible surface only'],
};
const unreadable = {
  ...healthy,
  outcome: 'insufficient_evidence',
  crackPresent: null,
  limitations: ['No detail visible'],
};
function reply(value: unknown, finish = 'stop') {
  return {
    ok: true,
    json: async () => ({
      model: 'gpt-4o',
      choices: [
        { message: { content: JSON.stringify(value) }, finish_reason: finish },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 },
    }),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('MINT_OBSERVATION_GATE_ENABLED', 'true');
  mocks.stopped.mockResolvedValue(false);
  mocks.budget.mockResolvedValue({ allowed: true });
});
afterEach(() => vi.unstubAllEnvs());
describe('visible evidence gate', () => {
  it('makes no provider calls when disabled', async () => {
    vi.stubEnv('MINT_OBSERVATION_GATE_ENABLED', 'false');
    expect(
      await observePhotos(['https://example.test/1'], 'key', [])
    ).toBeUndefined();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('retains readable smooth surfaces despite low-detail warnings', async () => {
    mocks.fetch.mockResolvedValue(reply(healthy));
    const result = await observePhotos(['https://example.test/1'], 'key', [
      { photoIndex: 0, reason: 'low_detail' },
    ]);
    expect(result?.photos[0].observation.outcome).toBe('no_visible_defect');
    expect(result?.diagnosisStatus).toBe('not_established');
    expect(mocks.usage).toHaveBeenCalled();
  });
  it('requests the correct retake when only the second photo is unreadable', async () => {
    mocks.fetch
      .mockResolvedValueOnce(reply(healthy))
      .mockResolvedValueOnce(reply(unreadable));
    await expect(
      observePhotos(
        ['https://example.test/1', 'https://example.test/2'],
        'key',
        []
      )
    ).rejects.toMatchObject({
      captureIssue: { photoIndex: 1, issue: 'insufficient_detail' },
    });
  });
  it('does not convert truncated replies into a healthy result', async () => {
    mocks.fetch.mockResolvedValue(reply(healthy, 'length'));
    await expect(
      observePhotos(['https://example.test/1'], 'key', [])
    ).rejects.toThrow('Incomplete visual response');
  });
  it('stops provider calls when budget is denied', async () => {
    mocks.budget.mockResolvedValue({ allowed: false });
    await expect(
      observePhotos(['https://example.test/1'], 'key', [])
    ).rejects.toThrow('budget');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('preserves provider failures as technical errors', async () => {
    mocks.fetch.mockRejectedValue(new Error('upstream unavailable'));
    await expect(
      observePhotos(['https://example.test/1'], 'key', [])
    ).rejects.toThrow('upstream unavailable');
  });
});
