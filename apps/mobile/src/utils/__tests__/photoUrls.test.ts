import { firstPhotoUrls } from '../photoUrls';
describe('legacy job image fallback', () => {
  it('uses images when photos is empty', () => {
    expect(
      firstPhotoUrls([], [{ photo_url: 'https://example.com/image.jpg' }])
    ).toEqual(['https://example.com/image.jpg']);
  });
  it('prefers refreshed photos over legacy images', () => {
    expect(
      firstPhotoUrls(['https://example.com/fresh'], ['https://example.com/old'])
    ).toEqual(['https://example.com/fresh']);
  });
  it('skips malformed image fields', () => {
    expect(
      firstPhotoUrls([null, {}, ' '], ['https://example.com/valid'])
    ).toEqual(['https://example.com/valid']);
  });
});
