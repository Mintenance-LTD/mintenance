import sharp from 'sharp';
import { PhotoVerificationService } from '../PhotoVerificationService';
import { syntheticWorkPhoto } from '@/test/integration/synthetic-work-photo';

describe('uploaded image quality from actual bytes', () => {
  it('accepts a sharp, bright 800x600 pattern without a network download', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const result = await PhotoVerificationService.validatePhotoQuality(
        await syntheticWorkPhoto()
      );
      expect(result.passed).toBe(true);
      expect(result.resolution).toEqual({ width: 800, height: 600 });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects a dark, blurry, low-resolution image', async () => {
    const bytes = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#000000' },
    })
      .png()
      .toBuffer();
    const result = await PhotoVerificationService.validatePhotoQuality(bytes);
    expect(result.passed).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/dark/),
        expect.stringMatching(/blurry/),
        expect.stringMatching(/resolution/),
      ])
    );
  });

  it.each([
    Buffer.from('not an image'),
    Buffer.alloc(0),
    Buffer.alloc(10 * 1024 * 1024 + 1),
  ])('fails closed for invalid or oversized bytes', async (bytes) => {
    const result = await PhotoVerificationService.validatePhotoQuality(bytes);
    expect(result.passed).toBe(false);
    expect(result.qualityScore).toBe(0);
  });
});
