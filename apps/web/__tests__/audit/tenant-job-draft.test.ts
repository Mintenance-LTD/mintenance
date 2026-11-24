// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  reportPhotos: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: db }));
vi.mock('@/lib/reports/followup', () => ({ reportPhotos: db.reportPhotos }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, { user: { id: 'owner' } }),
}));
import { GET } from '@/app/api/landlord/reports/job-draft/route';

const id = '00000000-0000-4000-8000-000000008005';
const report = {
  category: 'garden_exterior',
  description: 'Private garden report',
  urgency: 'high',
  property_id: 'property',
  properties: { owner_id: 'owner', address: 'Property address' },
  status: 'new',
};
const request = () =>
  new NextRequest(
    `http://localhost/api/landlord/reports/job-draft?reportId=${id}`
  );

beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db);
  db.select.mockReturnValue(db);
  db.eq.mockReturnValue(db);
  db.reportPhotos.mockResolvedValue([
    { slot: 2, url: 'https://storage.example/private' },
  ]);
});

it('loads the description and photo choices only inside the private authorized response', async () => {
  db.maybeSingle.mockResolvedValue({ data: report, error: null });
  const response = await GET(request(), {} as never);
  expect(db.eq).toHaveBeenCalledWith('properties.owner_id', 'owner');
  expect(db.eq).toHaveBeenCalledWith(
    'anonymous_report_tokens.owner_id',
    'owner'
  );
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(await response.json()).toMatchObject({
    description: report.description,
    photos: [{ slot: 2 }],
  });
});

it('denies other owners without issuing photo links and keeps already linked jobs out of the draft', async () => {
  db.maybeSingle
    .mockResolvedValueOnce({
      data: { ...report, properties: { owner_id: 'other' } },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { ...report, job_id: 'existing-job' },
      error: null,
    });
  await expect(GET(request(), {} as never)).rejects.toThrow(
    'Report unavailable'
  );
  const existing = await GET(request(), {} as never);
  expect(await existing.json()).toEqual({ jobId: 'existing-job' });
  expect(db.reportPhotos).not.toHaveBeenCalled();
});
