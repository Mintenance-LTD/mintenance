import sharp from 'sharp';
import { PhotoVerificationService } from '@/lib/services/escrow/PhotoVerificationService';

vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: {} }));
vi.mock('@/lib/security/url-validation', () => ({
  validateURL: vi.fn(async (url: string) => ({
    isValid: true,
    normalizedUrl: url,
  })),
}));

afterEach(() => vi.unstubAllGlobals());

describe('photo quality measured from actual image bytes', () => {
  it.each([
    ['black', 0],
    ['white', 255],
  ])(
    'rejects a uniform %s image instead of replacing zero measurements',
    async (_name, level) => {
      const bytes = await sharp({
        create: {
          width: 1200,
          height: 1200,
          channels: 3,
          background: { r: Number(level), g: Number(level), b: Number(level) },
        },
      })
        .png()
        .toBuffer();
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(bytes, {
              headers: { 'content-type': 'image/png' },
            })
        )
      );

      const result = await PhotoVerificationService.validatePhotoQuality(
        'https://audit.example/image.png'
      );

      expect(result.resolution).toEqual({ width: 1200, height: 1200 });
      expect(result.sharpness).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.stringMatching(/blurry/i));
      if (level === 0) {
        expect(result.brightness).toBe(0);
        expect(result.issues).toContainEqual(expect.stringMatching(/dark/i));
      }
    }
  );
});
