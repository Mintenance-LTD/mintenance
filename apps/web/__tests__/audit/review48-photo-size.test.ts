import {
  photoUploadBatches,
  preparePhotoUpload,
  PHOTO_BATCH_BYTES,
} from '@/app/jobs/create/utils/prepare-photo-upload';
const file = (size: number) =>
  new File([new Uint8Array(size)], 'camera.png', { type: 'image/png' });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('keeps every multipart batch below the host limit without dropping or reordering photos', () => {
  const files = [
    file(2_500_000),
    file(2_000_000),
    file(1_500_000),
    file(3_000_000),
  ];
  const batches = photoUploadBatches(files);
  expect(batches).toHaveLength(3);
  expect(batches.flat()).toEqual(files);
  expect(
    batches.every(
      (batch) =>
        batch.reduce((sum, item) => sum + item.size, 0) <= PHOTO_BATCH_BYTES
    )
  ).toBe(true);
});
it('preserves small originals and rejects sources over the advertised maximum', async () => {
  const small = file(1000);
  expect(await preparePhotoUpload(small)).toBe(small);
  await expect(preparePhotoUpload(file(11 * 1024 * 1024))).rejects.toThrow(
    'exceeds 10 MB'
  );
});
it('resizes large decoded photos and releases bitmap memory', async () => {
  const close = vi.fn(),
    draw = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 6000, height: 4000, close })
  );
  vi.spyOn(document, 'createElement').mockReturnValue({
    width: 0,
    height: 0,
    getContext: () => ({ fillRect: vi.fn(), drawImage: draw }),
    toBlob: (callback: (blob: Blob) => void) =>
      callback(new Blob(['resized'], { type: 'image/jpeg' })),
  } as unknown as HTMLCanvasElement);
  const resized = await preparePhotoUpload(file(5_000_000));
  expect(resized.type).toBe('image/jpeg');
  expect(resized.size).toBeLessThan(PHOTO_BATCH_BYTES);
  expect(draw).toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
});
it('offers a recovery instruction when the browser cannot decode a large photo', async () => {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockRejectedValue(new Error('unsupported'))
  );
  await expect(preparePhotoUpload(file(5_000_000))).rejects.toThrow(
    'save it as JPEG or PNG'
  );
});
