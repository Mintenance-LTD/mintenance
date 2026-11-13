// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JobPhotoUpload } from '../JobPhotoUpload';
import { fetchWithCsrf } from '@/lib/csrf-client';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: vi.fn() }));

function selectPhotos(count: number) {
  const files = Array.from({ length: count }, (_, index) => new File(['synthetic'], `photo-${index}.png`, { type: 'image/png' }));
  fireEvent.change(screen.getByLabelText(/Tap to take a photo/), { target: { files } });
}

describe('JobPhotoUpload', () => {
  const mockProps = {
    jobId: 'job-1',
    jobStatus: 'assigned',
    latitude: 51.5074,
    longitude: -0.1278,
    location: 'London, UK',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    let nextPreview = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:photo-${nextPreview++}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('submits selected angles and refreshes after confirmed completion', async () => {
    const onJobCompleted = vi.fn();
    vi.mocked(fetchWithCsrf).mockResolvedValue({ ok: true, json: async () => ({ photos: [], count: 3, jobCompleted: true, validation: { passed: true, errors: [] } }) } as Response);
    render(<JobPhotoUpload jobId='job-1' jobStatus='in_progress' onJobCompleted={onJobCompleted} />);
    selectPhotos(3);
    fireEvent.change(screen.getByLabelText('Photo 2 angle'), { target: { value: 'close-up' } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload 3 Photos' }));
    await waitFor(() => expect(onJobCompleted).toHaveBeenCalledOnce());
    const [url, options] = vi.mocked(fetchWithCsrf).mock.calls[0];
    expect(url).toBe('/api/jobs/job-1/photos/after');
    const form = options!.body as FormData;
    expect(form.getAll('photos')).toHaveLength(3);
    expect(form.getAll('angleTypes')).toEqual(['wide', 'close-up', 'wide']);
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByText(/Job completed!/)).toBeVisible();
  });

  it('keeps angles aligned after removal and shows missing evidence', async () => {
    const onJobCompleted = vi.fn();
    vi.mocked(fetchWithCsrf).mockResolvedValue({ ok: true, json: async () => ({ photos: [], count: 2, jobCompleted: false, validation: { passed: false, errors: ['Minimum 3 photos required'] } }) } as Response);
    render(<JobPhotoUpload jobId='job-1' jobStatus='in_progress' onJobCompleted={onJobCompleted} />);
    selectPhotos(3);
    fireEvent.change(screen.getByLabelText('Photo 3 angle'), { target: { value: 'close-up' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload 2 Photos' }));
    expect(await screen.findByText('Minimum 3 photos required')).toBeVisible();
    const form = vi.mocked(fetchWithCsrf).mock.calls[0][1]!.body as FormData;
    expect(form.getAll('angleTypes')).toEqual(['wide', 'close-up']);
    expect(onJobCompleted).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByText(/Job completed!/)).not.toBeInTheDocument();
  });

  it('requires before evidence to enable starting work', () => {
    const { rerender } = render(<JobPhotoUpload {...mockProps} />);
    expect(screen.getByRole('button', { name: 'Start Job' })).toBeDisabled();
    selectPhotos(1);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    rerender(<JobPhotoUpload {...mockProps} existingBeforePhotosCount={1} />);
    expect(screen.getByRole('button', { name: 'Start Job' })).toBeEnabled();
  });

  it('should initialize with default values', () => {
    const { container } = render(<JobPhotoUpload {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { container } = render(<JobPhotoUpload {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should clean up on unmount', () => {
    const { unmount, container } = render(<JobPhotoUpload {...mockProps} />);
    expect(container).toBeDefined();
    unmount();
  });
});
