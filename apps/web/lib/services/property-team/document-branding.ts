import sharp from 'sharp';
import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+$/u);
const colour = z
  .string()
  .regex(/^#[\da-f]{6}$/i)
  .transform((value) => value.toUpperCase());
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
const dataUrl = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;
const snapshot = z
  .object({
    displayName: name,
    accentColour: colour,
    logoBase64: z.string().max(64000).regex(base64).nullable(),
  })
  .strict();

export const documentBrandingInput = z
  .object({
    displayName: name,
    accentColour: colour,
    // Omitted = retain saved logo; explicit null = remove.
    logoDataUrl: z.string().max(279650).regex(dataUrl).nullable().optional(),
  })
  .strict();
export type DocumentBranding = z.infer<typeof snapshot>;

export function readDocumentBranding(value: unknown): DocumentBranding | null {
  return snapshot.safeParse(value).data ?? null;
}

export function brandHeaderTextColour(hex: string): '#ffffff' | '#000000' {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > Math.sqrt(0.0525) - 0.05 ? '#000000' : '#ffffff';
}

export async function normalizeDocumentLogo(input: string): Promise<string> {
  const match = input.length <= 279650 && dataUrl.exec(input);
  if (!match) throw new Error('Expected a PNG or JPEG data URL');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.toString('base64') !== match[2] || bytes.length > 200 * 1024)
    throw new Error('Invalid logo encoding or size');
  const processor = sharp(bytes, { limitInputPixels: 4_000_000 });
  const metadata = await processor.metadata();
  if (metadata.format !== match[1] || (metadata.pages ?? 1) !== 1)
    throw new Error('Invalid logo format');
  const jpeg = await processor
    .rotate()
    .resize(240, 120, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 80 })
    .toBuffer();
  const output = jpeg.toString('base64');
  if (output.length > 64000)
    throw new Error('Normalized logo exceeds size limit');
  return output;
}
