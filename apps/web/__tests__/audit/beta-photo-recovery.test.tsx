import { act, cleanup, renderHook } from '@testing-library/react';
import { useImageUpload } from '@/app/jobs/create/hooks/useImageUpload';
import { useBuildingAssessment } from '@/app/jobs/create/hooks/useBuildingAssessment';
const m = vi.hoisted(() => ({ fetch: vi.fn(), revoke: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'fresh' }),
}));
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', m.fetch);
  vi.spyOn(URL, 'createObjectURL').mockImplementation(
    (file) => `blob:${(file as File).name}`
  );
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(m.revoke);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const select = (
  hook: ReturnType<typeof useImageUpload>,
  name = 'garden.jpg'
) => {
  hook.handleImageSelect({
    target: {
      files: [new File(['photo'], name, { type: 'image/jpeg' })],
      value: name,
    },
  } as unknown as React.ChangeEvent<HTMLInputElement>);
};
it('rejects failed upload without losing selected photos, then permits a retry', async () => {
  const { result } = renderHook(() => useImageUpload());
  act(() => select(result.current));
  m.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await act(async () => {
    await expect(result.current.uploadImages()).rejects.toThrow(
      'Failed to fetch'
    );
  });
  expect(result.current.imagePreviews).toHaveLength(1);
  expect(result.current.uploadedImages).toEqual([]);
  m.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ urls: ['https://example.invalid/photo.jpg'] }),
  });
  await act(async () => {
    await result.current.uploadImages();
  });
  expect(result.current.uploadedImages).toHaveLength(1);
  act(() => select(result.current, 'second.jpg'));
  expect(result.current.uploadedImages).toEqual([]);
  expect(m.revoke).not.toHaveBeenCalled();
});
it('does not accept a partial upload as a complete photo selection', async () => {
  const { result } = renderHook(() => useImageUpload());
  act(() => select(result.current));
  act(() => select(result.current, 'second.jpg'));
  m.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      urls: ['https://example.invalid/one.jpg'],
      warning: 'One failed',
    }),
  });
  await act(async () => {
    await expect(result.current.uploadImages()).rejects.toThrow(
      'Some photos did not upload'
    );
  });
  expect(result.current.imagePreviews).toHaveLength(2);
  expect(result.current.uploadedImages).toEqual([]);
});
it('shows a nested API error as readable text and preserves an AI recovery path', async () => {
  const { result } = renderHook(() => useBuildingAssessment());
  m.fetch.mockResolvedValue({
    ok: false,
    status: 422,
    json: async () => ({
      error: { message: 'Not enough visible detail. Try a clearer photo.' },
    }),
  });
  await act(async () => {
    await result.current.assessBuilding(['https://example.invalid/photo.jpg']);
  });
  expect(result.current.assessmentError).toBe(
    'Not enough visible detail. Try a clearer photo.'
  );
  expect(result.current.isAssessing).toBe(false);
});
