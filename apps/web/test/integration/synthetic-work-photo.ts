import sharp from 'sharp';

/** An artificial calibration pattern, never evidence of real completed work. */
export async function syntheticWorkPhoto(): Promise<Buffer> {
  const width = 800;
  const height = 600;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 240 : 40;
      pixels.fill(value, (y * width + x) * 3, (y * width + x + 1) * 3);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}
