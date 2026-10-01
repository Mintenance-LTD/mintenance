import sharp from 'sharp';

/** Render stored drawing evidence without loading SVG links, scripts or other content. */
export async function signaturePreview(
  image: string,
  format: string
): Promise<Buffer> {
  if (image.length > 524288) throw new Error('Signature exceeds size limit');
  let input: Buffer;
  if (
    format === 'png' &&
    /^data:image\/png;base64,[A-Za-z0-9+/=\r\n]+$/.test(image)
  ) {
    input = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64');
  } else if (format === 'svg') {
    const box = image.match(/viewBox=["']([\d.\s,-]+)["']/)?.[1];
    const values = box
      ?.trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      !values ||
      values.length !== 4 ||
      !values.every(Number.isFinite) ||
      values[2] <= 0 ||
      values[3] <= 0 ||
      values[2] > 10000 ||
      values[3] > 10000
    )
      throw new Error('Invalid signature dimensions');
    const paths = [
      ...image.matchAll(/<path\b[^>]*\bd=["']([^"']+)["'][^>]*>/g),
    ].map((match) => match[1]);
    if (
      !paths.length ||
      paths.some((path) => !/^[MmLlHhVvCcSsQqTtAaZz0-9.,+\-\seE]+$/.test(path))
    )
      throw new Error('Invalid signature drawing');
    input = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${values.join(' ')}">${paths.map((path) => `<path d="${path}" fill="none" stroke="#172923" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`
    );
  } else {
    throw new Error('Unsupported signature format');
  }
  return sharp(input, { limitInputPixels: 10000000 })
    .resize(600, 180, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();
}
