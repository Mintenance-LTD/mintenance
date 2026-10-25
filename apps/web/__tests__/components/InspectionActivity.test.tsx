import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { InspectionActivity } from '@/components/building-surveyor/InspectionActivity';
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: vi.fn(async () => ({ 'x-csrf-token': 'test' })),
}));
const photo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const source = {
  sourceFingerprint: 'a'.repeat(64),
  images: [{ id: photo, imageIndex: 2, url: 'https://test/photo.jpg' }],
  events: [],
  hasMore: false,
};
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  });
  fetchMock = vi.fn(async () => response(source));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function fill() {
  await screen.findByLabelText('Photo 3');
  fireEvent.click(screen.getByLabelText('Photo 3'));
  fireEvent.change(screen.getByLabelText('Reported outcome'), {
    target: { value: 'visible_defect' },
  });
  fireEvent.change(screen.getByLabelText('Details'), {
    target: { value: 'A surface crack is visible beside the door.' },
  });
}
it('saves a photo-linked reported correction with CSRF and shows history', async () => {
  render(<InspectionActivity assessmentId='test' />);
  await fill();
  fetchMock.mockImplementationOnce(async (_url, options) => {
    const body = JSON.parse(options.body);
    expect(options.headers['x-csrf-token']).toBe('test');
    expect(body).toMatchObject({
      kind: 'correction',
      sourceFingerprint: 'a'.repeat(64),
      evidenceImageIds: [photo],
      outcome: 'visible_defect',
    });
    expect(body).not.toHaveProperty('actor_id');
    return response({
      event: {
        id: 'event',
        actor_role: 'owner',
        created_at: '2026-01-01T10:00:00Z',
        occurred_on: body.occurredOn,
        kind: body.kind,
        notes: body.notes,
        outcome: body.outcome,
        evidence_image_ids: body.evidenceImageIds,
        source_fingerprint: body.sourceFingerprint,
      },
    });
  });
  fireEvent.click(screen.getByText('Save reported activity'));
  await screen.findByText(
    'Activity saved as a reported observation. Expert verification is separate.'
  );
  expect(
    screen.getByText('A surface crack is visible beside the door.')
  ).toBeInTheDocument();
  expect(screen.getByText('Evidence: Photo 3')).toBeInTheDocument();
});
it('preserves draft and request ID after an ambiguous save failure', async () => {
  render(<InspectionActivity assessmentId='test' />);
  await fill();
  fetchMock.mockRejectedValueOnce(new Error('Connection interrupted'));
  fireEvent.click(screen.getByText('Save reported activity'));
  await screen.findByText('Connection interrupted');
  const first = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(screen.getByLabelText('Details')).toHaveValue(
    'A surface crack is visible beside the door.'
  );
  fetchMock.mockResolvedValueOnce(
    response(
      {
        error:
          'The assessment or photos changed. Reload the photos before saving.',
      },
      false
    )
  );
  fireEvent.click(screen.getByText('Save reported activity'));
  await screen.findByText(
    'The assessment or photos changed. Reload the photos before saving.'
  );
  expect(JSON.parse(fetchMock.mock.calls[2][1].body).requestId).toBe(
    first.requestId
  );
});
it('refreshes a stale source without erasing the draft', async () => {
  render(<InspectionActivity assessmentId='test' />);
  await fill();
  fetchMock.mockResolvedValueOnce(
    response({ ...source, sourceFingerprint: 'b'.repeat(64) })
  );
  fireEvent.click(screen.getByText('Reload photos and activity'));
  await screen.findByText(
    'Photos refreshed. Check your selection before saving.'
  );
  expect(screen.getByLabelText('Details')).toHaveValue(
    'A surface crack is visible beside the door.'
  );
});
it('uploads follow-up photos, attaches them, then refreshes the evidence', async () => {
  const changed = vi.fn();
  render(<InspectionActivity assessmentId='test' onPhotosChanged={changed} />);
  await screen.findByLabelText('Photo 3');
  fetchMock
    .mockResolvedValueOnce(
      response({ urls: ['https://test/new.jpg'], skipped: [] })
    )
    .mockResolvedValueOnce(response({ attached: 1 }))
    .mockResolvedValueOnce(
      response({
        ...source,
        images: [
          ...source.images,
          { id: 'new', imageIndex: 3, url: 'https://test/new.jpg' },
        ],
      })
    );
  fireEvent.change(screen.getByLabelText('Add follow-up photos'), {
    target: {
      files: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })],
    },
  });
  await screen.findByLabelText('Photo 4');
  expect(fetchMock.mock.calls[1][0]).toBe('/api/assessments/photo-upload');
  expect(fetchMock.mock.calls[2][0]).toBe('/api/assessments/test/images');
  expect(changed).toHaveBeenLastCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: 'new' })])
  );
});
it('does not show a successful attachment when metadata save fails', async () => {
  render(<InspectionActivity assessmentId='test' />);
  await screen.findByLabelText('Photo 3');
  fetchMock
    .mockResolvedValueOnce(response({ urls: ['https://test/new.jpg'] }))
    .mockResolvedValueOnce(response({}, false));
  fireEvent.change(screen.getByLabelText('Add follow-up photos'), {
    target: {
      files: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })],
    },
  });
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('could not be attached')
  );
});
