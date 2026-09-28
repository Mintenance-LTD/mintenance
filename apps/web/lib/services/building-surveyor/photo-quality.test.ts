import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { inspectPhotoQuality } from './photo-quality';

const solid = (value: number, width = 256) =>
  sharp({
    create: {
      width,
      height: width,
      channels: 3,
      background: { r: value, g: value, b: value },
    },
  })
    .png()
    .toBuffer();

describe('capture quality checks', () => {
  it('rejects near black and washed-out images', async () => {
    expect((await inspectPhotoQuality(await solid(3))).issue).toBe('too_dark');
    expect((await inspectPhotoQuality(await solid(252))).issue).toBe(
      'overexposed'
    );
  });
  it('does not mistake a smooth surface for an unreadable image', async () => {
    expect(await inspectPhotoQuality(await solid(160))).toMatchObject({
      issue: null,
      lowDetailWarning: true,
    });
  });
  it('rejects thumbnails', async () => {
    expect((await inspectPhotoQuality(await solid(160, 32))).issue).toBe(
      'too_small'
    );
  });
  it('keeps decoding failures as errors', async () => {
    await expect(inspectPhotoQuality(Buffer.from('broken'))).rejects.toThrow();
  });
  it('warns about soft structure without rejecting smooth intact surfaces', async () => {
    const pixels = Buffer.alloc(256 * 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) pixels[y * 256 + x] = x < 128 ? 70 : 180;
    const sharpImage = await sharp(pixels, {
      raw: { width: 256, height: 256, channels: 1 },
    })
      .png()
      .toBuffer();
    const blurred = await sharp(sharpImage).blur(12).png().toBuffer();
    expect((await inspectPhotoQuality(sharpImage)).softFocusWarning).toBe(
      false
    );
    expect(await inspectPhotoQuality(blurred)).toMatchObject({
      softFocusWarning: true,
      issue: null,
    });
    expect((await inspectPhotoQuality(await solid(160))).softFocusWarning).toBe(
      false
    );
  });
});
