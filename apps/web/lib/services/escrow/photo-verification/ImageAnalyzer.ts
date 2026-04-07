import { logger } from '@mintenance/shared';
import { validateURL } from '@/lib/security/url-validation';
import sharp from 'sharp';
import type { ImageInfo, Location, ChatMessage } from './types';

export class ImageAnalyzer {
  static async getImageInfo(photoUrl: string): Promise<ImageInfo> {
    // SECURITY: Validate URL to prevent SSRF attacks
    const urlValidation = await validateURL(photoUrl, true);
    if (!urlValidation.isValid) {
      logger.warn('Invalid photo URL rejected', {
        service: 'PhotoVerificationService',
        photoUrl,
        error: urlValidation.error,
      });
      throw new Error(`Invalid photo URL: ${urlValidation.error}`);
    }

    const validatedUrl = urlValidation.normalizedUrl || photoUrl;

    try {
      // SECURITY: Use validated URL and set timeout to prevent slowloris attacks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s for full download

      const response = await fetch(validatedUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error('URL does not point to a valid image');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileSize = buffer.byteLength;

      // Get metadata (resolution)
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Calculate brightness: mean of grayscale pixel values, normalised to 0-1
      const { channels } = await image.greyscale().stats();
      const meanBrightness = channels[0]?.mean ?? 128;
      const brightness = meanBrightness / 255;

      // Calculate sharpness via Laplacian variance:
      // Apply a Laplacian-like edge detection kernel, then measure the variance
      // of the output. Higher variance = sharper image.
      const laplacianStats = await sharp(buffer)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
        })
        .stats();

      // Standard deviation of edge response; normalise to 0-1 range.
      // Empirically, stdev > 30 is sharp, < 10 is blurry.
      const edgeStdev = laplacianStats.channels[0]?.stdev ?? 0;
      const sharpness = Math.min(1, edgeStdev / 50);

      return { brightness, sharpness, resolution: { width, height }, fileSize };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Image fetch timeout', {
          service: 'PhotoVerificationService',
          photoUrl: validatedUrl,
        });
      } else {
        logger.warn('Image analysis failed, using conservative defaults', {
          service: 'PhotoVerificationService',
          photoUrl: validatedUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      // Conservative fallback: assume low quality so it gets flagged
      return {
        brightness: 0.4,
        sharpness: 0.4,
        resolution: { width: 0, height: 0 },
      };
    }
  }

  static async compareWithAI(
    beforeUrls: string[],
    afterUrls: string[],
    jobLocation: Location
  ): Promise<{ score: number; differences: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured, using fallback comparison');
      return { score: 0.5, differences: ['AI comparison unavailable'] };
    }

    try {
      // SECURITY: Validate all URLs before sending to OpenAI
      const { validateURLs } = await import('@/lib/security/url-validation');
      const allUrls = [...beforeUrls, ...afterUrls];
      const validation = await validateURLs(allUrls, true);

      if (validation.invalid.length > 0) {
        logger.warn('Invalid URLs rejected for AI comparison', {
          service: 'PhotoVerificationService',
          invalidUrls: validation.invalid,
        });
        return {
          score: 0,
          differences: [
            `Invalid URLs detected: ${validation.invalid.map((i) => i.error).join(', ')}`,
          ],
        };
      }

      // Use only validated URLs
      const validatedBeforeUrls = validation.valid.slice(0, beforeUrls.length);
      const validatedAfterUrls = validation.valid.slice(beforeUrls.length);

      const systemPrompt = `You are an expert at comparing before and after photos to detect if they are from the same location.
      Analyze the photos and determine:
      1. If they show the same location/property
      2. If the work appears to be completed
      3. Any inconsistencies that suggest staged or fake photos

      Respond in JSON format:
      {
        "score": number (0-1, 1 = same location, 0 = different location),
        "differences": string[],
        "matches": boolean
      }`;

      const userPrompt = `Compare these before and after photos. Are they from the same location?
      Job location: ${jobLocation.lat}, ${jobLocation.lng}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...validatedBeforeUrls.slice(0, 3).map((url) => ({
              type: 'image_url',
              // Use 'high' detail for photo verification (critical for accuracy)
              image_url: { url, detail: 'high' },
            })),
            ...validatedAfterUrls.slice(0, 3).map((url) => ({
              type: 'image_url',
              // Use 'high' detail for photo verification (critical for accuracy)
              image_url: { url, detail: 'high' },
            })),
          ],
        },
      ];

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-vision-preview',
            messages,
            max_tokens: 500,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        score: result.score || 0.5,
        differences: result.differences || [],
      };
    } catch (error) {
      logger.error('Error in AI comparison', error, {
        service: 'PhotoVerificationService',
      });
      return { score: 0.5, differences: ['AI comparison failed'] };
    }
  }
}
