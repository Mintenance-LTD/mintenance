import { describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ quality: vi.fn(), validate: vi.fn() }));
vi.mock('../config/BuildingSurveyorConfig', () => ({
  getConfig: () => ({ openaiApiKey: 'test' }),
}));
vi.mock('./check-photo-quality', () => ({ checkPhotoQuality: mocks.quality }));
vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: mocks.validate,
}));
import { validateInput } from './validate-input';

describe('photo validation ordering', () => {
  it('retains indices when data and remote images are mixed', async () => {
    const urls = [
      'data:image/png;base64,AAAA',
      'https://example.test/photo.png',
    ];
    mocks.validate.mockResolvedValue({ valid: [urls[1]], invalid: [] });
    mocks.quality.mockResolvedValue(undefined);
    expect((await validateInput(urls)).validatedImageUrls).toEqual(urls);
    expect(mocks.quality).toHaveBeenCalledWith(urls);
  });
  it('does not silently discard unsupported data URLs', async () => {
    await expect(
      validateInput(['data:text/plain;base64,AAAA'])
    ).rejects.toThrow('Unsupported image URL');
  });
});
