import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CompletedJobPortfolio } from '../CompletedJobPortfolio';

it('publishes only the chosen photo and user-entered text after explicit consent', async () => {
  const upload = vi.fn().mockResolvedValue(undefined);
  const fetchPhoto = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['photo'], { type: 'image/jpeg' }) });
  vi.stubGlobal('fetch', fetchPhoto);
  try {
    render(<CompletedJobPortfolio contractorId="contractor" jobs={[{ id: 'job', title: 'Private job address', category: 'painting', photos: [{ url: 'https://example.test/one' }, { url: 'https://example.test/two' }] }]} onUpload={upload} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to portfolio' }));
    expect(screen.getByRole('button', { name: 'Publish project' })).toBeDisabled();
    expect(screen.getByLabelText('Public project title')).toHaveValue('');
    fireEvent.click(screen.getByLabelText('Photo 2'));
    fireEvent.change(screen.getByLabelText('Public project title'), { target: { value: 'Painted living room' } });
    expect(screen.getByRole('button', { name: 'Publish project' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I have permission/));
    fireEvent.click(screen.getByRole('button', { name: 'Publish project' }));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(fetchPhoto).toHaveBeenCalledTimes(1);
    expect(fetchPhoto).toHaveBeenCalledWith('https://example.test/two');
    expect(upload.mock.calls[0][0]).toMatchObject({ title: 'Painted living room', description: '' });
    expect(upload.mock.calls[0][0].files).toHaveLength(1);
  } finally { vi.unstubAllGlobals(); }
});
