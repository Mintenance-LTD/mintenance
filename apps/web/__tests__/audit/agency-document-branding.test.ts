import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  brandHeaderTextColour,
  documentBrandingInput,
  normalizeDocumentLogo,
  readDocumentBranding,
} from '@/lib/services/property-team/document-branding';

const plain = { displayName: ' Northfield Lettings ', accentColour: '#ffffff' };

describe('agency document branding', () => {
  it('normalises safe brand settings while preserving the retain/remove distinction', () => {
    expect(documentBrandingInput.parse(plain)).toEqual({
      displayName: 'Northfield Lettings',
      accentColour: '#FFFFFF',
    });
    expect(
      documentBrandingInput.parse({ ...plain, logoDataUrl: null }).logoDataUrl
    ).toBeNull();
  });

  it('rejects URLs, SVG, unsafe names and invalid colours', () => {
    for (const input of [
      { ...plain, logoDataUrl: 'https://example.test/logo.jpg' },
      { ...plain, logoDataUrl: 'data:image/svg+xml;base64,SGVsbG8=' },
      { ...plain, accentColour: 'url(https://example.test)' },
      { ...plain, displayName: 'Other\nLine' },
    ])
      expect(documentBrandingInput.safeParse(input).success).toBe(false);
  });

  it('converts uploaded PNG bytes to a bounded JPEG and rejects mismatched formats', async () => {
    const png = await sharp({
      create: { width: 120, height: 70, channels: 3, background: '#267417' },
    })
      .png()
      .toBuffer();
    const logoBase64 = await normalizeDocumentLogo(
      `data:image/png;base64,${png.toString('base64')}`
    );
    const metadata = await sharp(Buffer.from(logoBase64, 'base64')).metadata();
    expect(metadata).toMatchObject({ width: 240, height: 120, format: 'jpeg' });
    await expect(
      normalizeDocumentLogo(`data:image/jpeg;base64,${png.toString('base64')}`)
    ).rejects.toThrow();
    await expect(
      normalizeDocumentLogo('https://example.test/logo.jpg')
    ).rejects.toThrow();
  });

  it('keeps readable PDF headers and handles old or invalid snapshots', () => {
    expect(brandHeaderTextColour('#FFFFFF')).toBe('#000000');
    expect(brandHeaderTextColour('#0e5545')).toBe('#ffffff');
    expect(brandHeaderTextColour('#808080')).toBe('#000000');
    expect(readDocumentBranding(null)).toBeNull();
    expect(
      readDocumentBranding({ ...plain, logoBase64: 'https://example.test' })
    ).toBeNull();
    expect(readDocumentBranding({ ...plain, logoBase64: null })).toMatchObject({
      displayName: 'Northfield Lettings',
      accentColour: '#FFFFFF',
    });
  });
});
