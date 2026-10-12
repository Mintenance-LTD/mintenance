import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { signaturePreview } from '../signaturePreview';
describe('signaturePreview', () => {
  it('renders a mobile stroke and produces a bounded PNG', async () => {
    const result = await signaturePreview(
      '<svg viewBox="0 0 300 200"><path d="M10 10 L20 20 L40 10 L60 40"/></svg>',
      'svg'
    );
    expect(await sharp(result).metadata()).toMatchObject({
      format: 'png',
      width: 600,
      height: 180,
    });
  });
  it('ignores external images and scripts instead of rendering arbitrary SVG content', async () => {
    const plain = '<svg viewBox="0 0 300 200"><path d="M10 10 L20 20"/></svg>';
    const unsafe = plain.replace(
      '</svg>',
      '<image href="file:///etc/passwd"/><script>alert(1)</script></svg>'
    );
    expect(await signaturePreview(unsafe, 'svg')).toEqual(
      await signaturePreview(plain, 'svg')
    );
  });
  it('rejects missing strokes and excessive dimensions', async () => {
    await expect(
      signaturePreview('<svg viewBox="0 0 300 200"/>', 'svg')
    ).rejects.toThrow();
    await expect(
      signaturePreview(
        '<svg viewBox="0 0 999999 200"><path d="M0 0 L1 1"/></svg>',
        'svg'
      )
    ).rejects.toThrow();
  });
});
