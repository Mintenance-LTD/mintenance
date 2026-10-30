import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const property = '00000000-0000-4000-8000-000000000010',
  folder = '00000000-0000-4000-8000-000000000020',
  report = '00000000-0000-4000-8000-000000000030';
const m = vi.hoisted(() => ({
  role: 'owner' as string | null,
  entitled: true,
  error: null as { code: string } | null,
  filters: vi.fn(),
  rpc: vi.fn(),
  download: vi.fn(),
  tier: vi.fn(),
  authorize: vi.fn(),
  photo: true,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_: unknown, fn: (r: NextRequest, c: unknown) => unknown) =>
    (r: NextRequest) =>
      fn(r, {
        user: { id: 'actor', role: 'admin' },
        params: { id: property, reportId: report, photoId: folder },
      }),
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: {
    authorize: async (...args: unknown[]) => {
      m.authorize(...args);
      return {
        authorized: !!m.role && (args[2] === 'view' || m.role !== 'viewer'),
        role: m.role,
      };
    },
    canPerform: (role: string) => ['owner', 'admin', 'manager'].includes(role),
  },
}));
vi.mock('@/lib/subscription/early-access', () => ({
  getEffectiveHomeownerTier: (id: string) => {
    m.tier(id);
    return 'landlord';
  },
}));
vi.mock('@/lib/feature-access-config', () => ({
  hasFeatureAccess: () => m.entitled,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: (...args: unknown[]) => {
      m.rpc(...args);
      return Promise.resolve({ data: report, error: m.error });
    },
    storage: { from: () => ({ download: m.download }) },
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          m.filters(table, key, value);
          return q;
        },
        order: () => q,
        range: () =>
          Promise.resolve({
            data: [{ id: folder, label: 'Tenancy' }],
            error: m.error,
          }),
        limit: () => Promise.resolve({ data: [], error: m.error }),
        single: () => q.maybeSingle(),
        maybeSingle: () =>
          Promise.resolve({
            data:
              table === 'properties'
                ? { owner_id: 'property-owner' }
                : table === 'property_inspection_reports'
                  ? { id: report, folder_id: folder }
                  : table === 'property_inspection_photos'
                    ? { source_photo_id: m.photo ? folder : null }
                    : table === 'property_room_photos'
                      ? {
                          storage_path: 'safe/path.jpg',
                          mime_type: 'image/jpeg',
                        }
                      : { id: folder },
            error: m.error,
          }),
      };
      return q;
    },
  },
}));
import {
  GET as folders,
  POST as createFolder,
} from '@/app/api/properties/[id]/tenancies/route';
import {
  GET as reports,
  POST as createReport,
} from '@/app/api/properties/[id]/inspections/route';
import { GET as detail } from '@/app/api/properties/[id]/inspections/[reportId]/route';
import { GET as photo } from '@/app/api/properties/[id]/inspections/[reportId]/photos/[photoId]/route';
import {
  folderInput,
  reportInput,
} from '@/lib/services/property-team/property-inspections';
const request = (method = 'GET', body?: unknown, query = '') =>
  new NextRequest(
    'https://example.test/api/properties/' + property + '/tenancies' + query,
    {
      method,
      ...(body
        ? {
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          }
        : {}),
    }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.role = 'owner';
  m.entitled = true;
  m.error = null;
  m.photo = true;
  m.download.mockResolvedValue({
    data: new Blob(['image'], { type: 'image/jpeg' }),
    error: null,
  });
});
it.each([null, 'viewer'])(
  'rejects writes by non-editors even with global admin identity (%s)',
  async (role) => {
    m.role = role;
    await expect(
      createFolder(
        request('POST', {
          label: 'Tenancy',
          starts_on: '2026-01-01',
          ends_on: null,
        })
      )
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(m.rpc).not.toHaveBeenCalled();
  }
);
it('rejects removed members before reading reports or photos', async () => {
  m.role = null;
  await expect(detail(request())).rejects.toMatchObject({ statusCode: 404 });
  await expect(photo(request())).rejects.toMatchObject({ statusCode: 404 });
  expect(m.filters).not.toHaveBeenCalled();
  expect(m.download).not.toHaveBeenCalled();
});
it('keeps viewer reads available without creation', async () => {
  m.role = 'viewer';
  const res = await folders(request());
  expect((await res.json()).canCreate).toBe(false);
  expect(res.headers.get('cache-control')).toBe('private, no-store');
  expect(m.filters).toHaveBeenCalledWith(
    'property_tenancy_folders',
    'property_id',
    property
  );
});
it('uses the property owner plan and denies creation after downgrade', async () => {
  m.role = 'manager';
  m.entitled = false;
  await expect(
    createFolder(
      request('POST', {
        label: 'Tenancy',
        starts_on: '2026-01-01',
        ends_on: null,
      })
    )
  ).rejects.toMatchObject({ statusCode: 402 });
  expect(m.tier).toHaveBeenCalledWith('property-owner');
  expect(m.rpc).not.toHaveBeenCalled();
});
it('keeps existing report history after downgrade', async () => {
  m.entitled = false;
  expect((await detail(request())).status).toBe(200);
  expect(m.filters).toHaveBeenCalledWith(
    'property_inspection_reports',
    'property_id',
    property
  );
  expect(m.filters).toHaveBeenCalledWith(
    'property_inspection_reports',
    'id',
    report
  );
});
it('passes verified actor/property to atomic report RPC', async () => {
  await createReport(
    request('POST', {
      folder_id: folder,
      title: 'Check-in',
      inspected_on: '2026-10-30',
      kind: 'check_in',
      notes: 'Observed',
      photo_ids: [],
    })
  );
  expect(m.rpc).toHaveBeenCalledWith(
    'create_property_inspection_report',
    expect.objectContaining({
      p_actor: 'actor',
      p_property: property,
      p_folder: folder,
      p_photos: [],
    })
  );
});
it('never turns missing migration into empty success', async () => {
  m.error = { code: '42P01' };
  await expect(folders(request())).rejects.toMatchObject({ statusCode: 503 });
});
it('binds listings to both folder and property', async () => {
  await reports(request('GET', undefined, '?folder=' + folder));
  expect(m.filters).toHaveBeenCalledWith(
    'property_tenancy_folders',
    'property_id',
    property
  );
  expect(m.filters).toHaveBeenCalledWith(
    'property_inspection_reports',
    'folder_id',
    folder
  );
});
it('does not download removed photos', async () => {
  m.photo = false;
  await expect(photo(request())).rejects.toMatchObject({ statusCode: 404 });
  expect(m.download).not.toHaveBeenCalled();
});
it('serves authenticated image bytes without public links', async () => {
  const result = await photo(request());
  expect(result.headers.get('cache-control')).toBe('private, no-store');
  expect(result.headers.get('content-type')).toBe('image/jpeg');
  expect(await result.text()).toBe('image');
  expect(m.filters).toHaveBeenCalledWith(
    'property_room_photos',
    'property_id',
    property
  );
  expect(m.filters).toHaveBeenCalledWith(
    'property_inspection_photos',
    'report_id',
    report
  );
});
it('supports authenticated native images', async () => {
  expect(
    await (await photo(request('GET', undefined, '?format=base64'))).json()
  ).toEqual({ dataUrl: 'data:image/jpeg;base64,aW1hZ2U=' });
});
it('rejects invalid calendar dates and unbounded inputs', () => {
  for (const date of [
    '2026-02-30',
    '2026-13-01',
    '2026-1-01',
    'x'.repeat(100000),
  ])
    expect(
      folderInput.safeParse({ label: 'A', starts_on: date, ends_on: null })
        .success
    ).toBe(false);
});
it('rejects reversed dates, duplicate attachments and injected fields', () => {
  expect(
    folderInput.safeParse({
      label: 'A',
      starts_on: '2026-10-30',
      ends_on: '2026-10-01',
    }).success
  ).toBe(false);
  expect(
    reportInput.safeParse({
      folder_id: folder,
      title: 'A',
      kind: 'routine',
      inspected_on: '2026-10-30',
      notes: '',
      photo_ids: [folder, folder],
    }).success
  ).toBe(false);
  expect(
    folderInput.safeParse({
      label: 'A',
      starts_on: '2026-10-30',
      ends_on: null,
      owner_id: 'intruder',
    }).success
  ).toBe(false);
});

it('rejects malformed and oversized request bodies without writing', async () => {
  for (const body of ['{', JSON.stringify({ notes: 'x'.repeat(70000) })]) {
    await expect(
      createFolder(
        new NextRequest(
          'https://example.test/api/properties/' + property + '/tenancies',
          { method: 'POST', body }
        )
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  }
  expect(m.rpc).not.toHaveBeenCalled();
});
