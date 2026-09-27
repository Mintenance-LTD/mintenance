import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/security/safe-fetch', () => ({ safeFetch: fetchMock }));
import { checkPhotoQuality } from './check-photo-quality';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe('staging photo gate', () => {
  it('does not download anything when disabled', async () => {
    vi.stubEnv('MINT_PHOTO_QUALITY_GATE_ENABLED', 'false');
    await checkPhotoQuality(['https://example.test/image.png']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('requests recapture with a photo number for dark input', async () => {
    vi.stubEnv('MINT_PHOTO_QUALITY_GATE_ENABLED', 'true');
    const bytes = await sharp({
      create: { width: 256, height: 256, channels: 3, background: '#000000' },
    })
      .png()
      .toBuffer();
    await expect(
      checkPhotoQuality([`data:image/png;base64,${bytes.toString('base64')}`])
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_EVIDENCE',
      message: expect.stringContaining('Photo 1:'),
    });
  });
  it('preserves download failures as technical errors', async () => {
    vi.stubEnv('MINT_PHOTO_QUALITY_GATE_ENABLED', 'true');
    fetchMock.mockRejectedValue(new Error('Fetch timeout'));
    await expect(
      checkPhotoQuality(['https://example.test/image.png'])
    ).rejects.toThrow('Fetch timeout');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxBytes: 10 * 1024 * 1024, timeoutMs: 8000 })
    );
  });
});
