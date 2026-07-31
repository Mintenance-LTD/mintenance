/**
 * Unit tests for the discover feed's map-card thumbnail resolver
 * (`resolveJobThumbnails` in app/api/jobs/discover/helpers.ts).
 *
 * Contract (2026-07-26, explore-map photo-first card):
 *   - `jobs.photos` (legacy array column) wins over job_attachments,
 *     mirroring the web discover page's preference order.
 *   - Only image-typed attachments count; only the FIRST photo is signed.
 *   - photoCount reflects ALL posting photos so the card can chip "1/N".
 *   - Photo-less jobs resolve to { photoUrl: null, photoCount: 0 }.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  resignJobStorageUrls: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: {} }));
vi.mock('@/lib/api/job-storage', () => ({
  resignJobStorageUrls: mocks.resignJobStorageUrls,
}));

import { resolveJobThumbnails } from '../../app/api/jobs/discover/helpers';

beforeEach(() => {
  mocks.resignJobStorageUrls.mockReset();
  // Default: echo the input back "signed".
  mocks.resignJobStorageUrls.mockImplementation(async (urls: string[]) =>
    urls.map((u) => `signed:${u}`)
  );
});

describe('resolveJobThumbnails', () => {
  it('prefers jobs.photos over attachments and signs only the first', async () => {
    const result = await resolveJobThumbnails([
      {
        id: 'job-1',
        photos: ['legacy-a.jpg', 'legacy-b.jpg'],
        job_attachments: [{ file_url: 'att.jpg', file_type: 'image' }],
      },
    ]);
    expect(result.get('job-1')).toEqual({
      photoUrl: 'signed:legacy-a.jpg',
      photoCount: 2,
    });
    expect(mocks.resignJobStorageUrls).toHaveBeenCalledTimes(1);
    expect(mocks.resignJobStorageUrls).toHaveBeenCalledWith(['legacy-a.jpg']);
  });

  it('falls back to image attachments and skips non-image file types', async () => {
    const result = await resolveJobThumbnails([
      {
        id: 'job-2',
        photos: null,
        job_attachments: [
          { file_url: 'quote.pdf', file_type: 'document' },
          { file_url: 'kitchen.jpg', file_type: 'image' },
          { file_url: 'sink.jpg', file_type: 'image' },
        ],
      },
    ]);
    expect(result.get('job-2')).toEqual({
      photoUrl: 'signed:kitchen.jpg',
      photoCount: 2,
    });
  });

  it('resolves photo-less jobs to null/0 without a signing round-trip', async () => {
    const result = await resolveJobThumbnails([
      { id: 'job-3', photos: [], job_attachments: null },
    ]);
    expect(result.get('job-3')).toEqual({ photoUrl: null, photoCount: 0 });
    expect(mocks.resignJobStorageUrls).not.toHaveBeenCalled();
  });

  it('nulls the thumbnail when signing drops the URL entirely', async () => {
    // resignJobStorageUrls filters falsy results; an orphaned attachment
    // row whose object was never uploaded can yield an empty array.
    mocks.resignJobStorageUrls.mockResolvedValue([]);
    const result = await resolveJobThumbnails([
      { id: 'job-4', photos: ['gone.jpg'], job_attachments: null },
    ]);
    expect(result.get('job-4')).toEqual({ photoUrl: null, photoCount: 1 });
  });

  it('handles attachment rows with null file_url and mixed jobs in one call', async () => {
    const result = await resolveJobThumbnails([
      {
        id: 'job-5',
        photos: null,
        job_attachments: [{ file_url: null, file_type: 'image' }],
      },
      { id: 'job-6', photos: ['p.jpg'], job_attachments: null },
    ]);
    expect(result.get('job-5')).toEqual({ photoUrl: null, photoCount: 0 });
    expect(result.get('job-6')).toEqual({
      photoUrl: 'signed:p.jpg',
      photoCount: 1,
    });
  });
});
