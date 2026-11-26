import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
const property = '00000000-0000-4000-8000-000000000010',
  folder = '00000000-0000-4000-8000-000000000020',
  report = '00000000-0000-4000-8000-000000000030';
const correction = '00000000-0000-4000-8000-000000000040';
const latestCorrection = '00000000-0000-4000-8000-000000000050';
const m = vi.hoisted(() => ({
  role: 'owner' as string | null,
  membershipStatus: 'accepted',
  entitled: true,
  error: null as { code: string } | null,
  rpcError: null as { code: string; details?: string } | null,
  folderResult: null as unknown,
  filters: vi.fn(),
  rpc: vi.fn(),
  download: vi.fn(),
  tier: vi.fn(),
  photo: true,
  photoPath: '',
  pdfFixture: false,
  documentBranding: null as {
    displayName: string;
    accentColour: string;
    logoBase64: string;
  } | null,
  reportKind: 'check_in',
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
      const data =
        args[0] === 'read_property_tenancy_checkout_folders'
          ? [{ folder_id: folder }]
          : args[0] === 'save_property_tenancy_folder_with_overlap'
            ? (m.folderResult ?? { id: folder })
            : report;
      return Promise.resolve({ data, error: m.rpcError ?? m.error });
    },
    storage: { from: () => ({ download: m.download }) },
    from: (table: string) => {
      let earlierVersionId: unknown;
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          m.filters(table, key, value);
          if (key === 'corrects_report_id') earlierVersionId = value;
          return q;
        },
        order: () => q,
        in: (key: string, values: unknown[]) => {
          m.filters(table, key, values);
          return Promise.resolve({
            data:
              m.pdfFixture && table === 'property_inspection_reports'
                ? [
                    {
                      id: correction,
                      title: 'Corrected draft',
                      inspected_on: '2026-11-01',
                      created_at: '2026-11-25T10:00:00Z',
                      corrects_report_id: report,
                    },
                  ]
                : [],
            error: m.error,
          });
        },
        range: () =>
          Promise.resolve({
            data: [{ id: folder, label: 'Tenancy' }],
            error: m.error,
          }),
        limit: () =>
          Promise.resolve({
            data:
              m.pdfFixture && table === 'property_inspection_photos'
                ? [
                    {
                      id: folder,
                      source_photo_id: folder,
                      file_name: 'Sample kitchen.jpg',
                      room_type: 'kitchen',
                      uploaded_at: '2026-11-24T10:00:00Z',
                    },
                  ]
                : [],
            error: m.error,
          }),
        single: () => q.maybeSingle(),
        maybeSingle: () => {
          if (table === 'property_inspection_reports' && earlierVersionId) {
            const id =
              earlierVersionId === report
                ? correction
                : earlierVersionId === correction
                  ? latestCorrection
                  : null;
            return Promise.resolve({
              data: id
                ? {
                    id,
                    title: 'Corrected version',
                    inspected_on: '2026-11-01',
                    created_at: '2026-11-25T10:00:00Z',
                    corrects_report_id: earlierVersionId,
                  }
                : null,
              error: m.error,
            });
          }
          return Promise.resolve({
            data:
              table === 'properties'
                ? {
                    owner_id: m.role === 'owner' ? 'actor' : 'property-owner',
                    property_name: 'TEST ONLY - Pilot',
                    address: 'Synthetic property',
                  }
                : table === 'property_team_members'
                  ? m.role && m.membershipStatus === 'accepted'
                    ? { role: m.role }
                    : null
                  : table === 'property_inspection_reports'
                    ? {
                        id: report,
                        folder_id: folder,
                        kind: m.reportKind,
                        document_branding: m.documentBranding,
                        title: 'Pilot inspection',
                        inspected_on: '2026-11-24',
                        created_at: '2026-11-25T09:00:00Z',
                        notes: 'Test observations',
                        tenancy_starts_on: '2026-11-01',
                        tenancy_ends_on: '2026-11-24',
                        corrects_report_id: null,
                      }
                    : table === 'property_inspection_photos'
                      ? { source_photo_id: m.photo ? folder : null }
                      : table === 'property_room_photos'
                        ? {
                            storage_path: m.photoPath,
                            mime_type: 'image/jpeg',
                          }
                        : {
                            id: folder,
                            label: 'November tenancy',
                            starts_on: '2026-11-01',
                            ends_on: '2026-11-24',
                          },
            error:
              table === 'properties' || table === 'property_team_members'
                ? null
                : m.error,
          });
        },
      };
      return q;
    },
  },
}));
import {
  GET as folders,
  POST as createFolder,
  PATCH as updateFolder,
} from '@/app/api/properties/[id]/tenancies/route';
import {
  GET as reports,
  POST as createReport,
} from '@/app/api/properties/[id]/inspections/route';
import { GET as detail } from '@/app/api/properties/[id]/inspections/[reportId]/route';
import { GET as photo } from '@/app/api/properties/[id]/inspections/[reportId]/photos/[photoId]/route';
import { GET as pdf } from '@/app/api/properties/[id]/inspections/[reportId]/pdf/route';
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
  m.membershipStatus = 'accepted';
  m.entitled = true;
  m.error = null;
  m.rpcError = null;
  m.folderResult = null;
  m.photo = true;
  m.pdfFixture = false;
  m.documentBranding = null;
  m.reportKind = 'check_in';
  m.photoPath = `property-room-photos/uploader/${property}/kitchen/photo.jpg`;
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
  await expect(pdf(request())).rejects.toMatchObject({ statusCode: 404 });
  expect(
    m.filters.mock.calls.every(([table]) =>
      ['properties', 'property_team_members'].includes(table)
    )
  ).toBe(true);
  expect(m.download).not.toHaveBeenCalled();
});

it('requires an accepted team invitation to read a copied report link', async () => {
  m.role = 'viewer';
  m.membershipStatus = 'pending';
  await expect(detail(request())).rejects.toMatchObject({ statusCode: 404 });
  await expect(pdf(request())).rejects.toMatchObject({ statusCode: 404 });
  m.membershipStatus = 'accepted';
  expect((await detail(request())).status).toBe(200);
  expect((await photo(request())).status).toBe(200);
  expect(m.filters).toHaveBeenCalledWith(
    'property_team_members',
    'status',
    'accepted'
  );
  await expect(createReport(request('POST', {}))).rejects.toMatchObject({
    statusCode: 404,
  });
});
it.each([
  ['owner', 'check_in'],
  ['viewer', 'check_out'],
])(
  'downloads a photo-bearing A4 %s %s PDF with private headers',
  async (role, kind) => {
    m.role = role;
    m.reportKind = kind;
    m.pdfFixture = true;
    const sample = await sharp({
      create: { width: 320, height: 200, channels: 3, background: '#738a79' },
    })
      .jpeg()
      .toBuffer();
    m.download.mockResolvedValue({
      data: new Blob([new Uint8Array(sample)]),
      error: null,
    });
    const response = await pdf(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toContain(
      'attachment; filename="inspection-2026-11-24-'
    );
    const bytes = Buffer.from(await response.arrayBuffer()).toString('latin1');
    expect(bytes).toMatch(/^%PDF-/);
    const mediaBox = bytes.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    expect(Number(mediaBox?.[1])).toBeCloseTo(595.28, 2);
    expect(Number(mediaBox?.[2])).toBeCloseTo(841.89, 2);
    expect(bytes).toContain('/Subtype /Image');
    expect(m.filters).toHaveBeenCalledWith(
      'property_inspection_reports',
      'id',
      report
    );
    expect(m.filters).toHaveBeenCalledWith(
      'property_inspection_reports',
      'corrects_report_id',
      latestCorrection
    );
    expect(m.download).toHaveBeenCalledExactlyOnceWith(m.photoPath);
  }
);
it('exports the saved agency logo with the shared inspection PDF renderer', async () => {
  m.role = 'viewer';
  const logo = await sharp({
    create: { width: 240, height: 120, channels: 3, background: '#3a67b8' },
  })
    .jpeg()
    .toBuffer();
  m.documentBranding = {
    displayName: 'QA Agency',
    accentColour: '#E9F2FC',
    logoBase64: logo.toString('base64'),
  };
  const response = await pdf(request());
  expect(response.status).toBe(200);
  const bytes = Buffer.from(await response.arrayBuffer()).toString('latin1');
  expect(bytes).toMatch(/\/Subtype \/Image\s+\/Width 240\s+\/Height 120/);
  expect(m.filters).toHaveBeenCalledWith(
    'property_inspection_reports',
    'property_id',
    property
  );
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
it.each(['owner', 'admin', 'manager', 'viewer'])(
  'allows the exact report and photo for a current %s',
  async (role) => {
    m.role = role;
    const response = await detail(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      report: { id: report },
      canCreate: role !== 'viewer',
    });
    expect((await photo(request())).status).toBe(200);
    expect(m.filters).toHaveBeenCalledWith(
      'property_inspection_reports',
      'id',
      report
    );
  }
);
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
it('passes the verified actor, property and save request to the atomic report RPC', async () => {
  await createReport(
    request('POST', {
      folder_id: folder,
      title: 'Check-in',
      inspected_on: '2026-10-30',
      kind: 'check_in',
      notes: 'Observed',
      photo_ids: [],
      request_id: report,
    })
  );
  expect(m.rpc).toHaveBeenCalledWith(
    'save_property_inspection_report',
    expect.objectContaining({
      p_actor: 'actor',
      p_property: property,
      p_folder: folder,
      p_photos: [],
      p_corrects: null,
      p_exception: null,
      p_outcome: null,
      p_request_id: report,
    })
  );
});
it('requires an explicit confirmation if a date edit excludes saved inspections', async () => {
  const details = {
    count: 1,
    reports: [
      { id: report, title: 'Move-in report', inspected_on: '2026-11-01' },
    ],
  };
  m.rpcError = { code: 'PT422', details: JSON.stringify(details) };
  await expect(
    updateFolder(
      request('PATCH', {
        id: folder,
        revision: 0,
        label: 'Edited',
        starts_on: '2026-11-02',
        ends_on: null,
      })
    )
  ).rejects.toMatchObject({
    code: 'TENANCY_DATE_CHANGE_EXCLUDES_INSPECTIONS',
    statusCode: 422,
    details,
  });
  expect(m.rpc).toHaveBeenLastCalledWith(
    'save_property_tenancy_folder_with_overlap',
    expect.objectContaining({ p_confirm_dates: false })
  );
  m.rpcError = null;
  await updateFolder(
    request('PATCH', {
      id: folder,
      revision: 0,
      label: 'Edited',
      starts_on: '2026-11-02',
      ends_on: null,
      confirm_inspection_date_change: true,
    })
  );
  expect(m.rpc).toHaveBeenLastCalledWith(
    'save_property_tenancy_folder_with_overlap',
    expect.objectContaining({ p_confirm_dates: true })
  );
});
it('returns the conflicting tenancy dates and accepts its confirmation token', async () => {
  const overlap = {
    token: 'a'.repeat(32),
    count: 1,
    folders: [
      {
        id: folder,
        label: 'November',
        starts_on: '2026-11-01',
        ends_on: '2026-11-24',
      },
    ],
  };
  const value = { label: 'December', starts_on: '2026-11-20', ends_on: null };
  m.folderResult = { overlap };
  await expect(createFolder(request('POST', value))).rejects.toMatchObject({
    statusCode: 409,
    code: 'TENANCY_PERIOD_OVERLAP',
    details: overlap,
  });
  expect(m.rpc).toHaveBeenLastCalledWith(
    'save_property_tenancy_folder_with_overlap',
    expect.objectContaining({ p_overlap_token: null })
  );
  m.folderResult = { id: folder };
  expect(
    (
      await createFolder(
        request('POST', { ...value, overlap_token: overlap.token })
      )
    ).status
  ).toBe(201);
  expect(m.rpc).toHaveBeenLastCalledWith(
    'save_property_tenancy_folder_with_overlap',
    expect.objectContaining({ p_overlap_token: overlap.token })
  );
});

it('requires an explicit outcome before saving an empty check-out', async () => {
  const value = {
    folder_id: folder,
    title: 'Check-out',
    inspected_on: '2026-11-24',
    kind: 'check_out',
    notes: '',
    photo_ids: [],
  };
  await expect(createReport(request('POST', value))).rejects.toMatchObject({
    statusCode: 422,
    code: 'INSPECTION_EVIDENCE_REVIEW_REQUIRED',
  });
  expect(m.rpc).not.toHaveBeenCalled();
  for (const outcome of ['no_issues_found', 'evidence_free']) {
    expect(
      (await createReport(request('POST', { ...value, outcome }))).status
    ).toBe(201);
    expect(m.rpc).toHaveBeenLastCalledWith(
      'save_property_inspection_report',
      expect.objectContaining({ p_outcome: outcome, p_request_id: null })
    );
  }
});
it('links a modified retry to the original saved record', async () => {
  m.rpcError = { code: 'PT409', details: report };
  await expect(
    createReport(
      request('POST', {
        folder_id: folder,
        title: 'Changed report',
        inspected_on: '2026-11-24',
        kind: 'check_out',
        notes: 'Observed',
        photo_ids: [],
        request_id: report,
      })
    )
  ).rejects.toMatchObject({
    code: 'INSPECTION_SAVE_ALREADY_RECORDED',
    statusCode: 409,
    details: { reportId: report },
  });
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
it.each([
  'property-room-photos/uploader/foreign/kitchen/photo.jpg',
  `property-room-photos/uploader/${property}/../../../victim.jpg`,
  `property-room-photos/uploader/${property}/%2e%2e/victim.jpg`,
  `property-room-photos/uploader/${property}/kitchen/photo.jpg?x=y`,
  'job-photos/victim/private.jpg',
])('does not download a forged room-photo reference %s', async (path) => {
  m.photoPath = path;
  await expect(photo(request())).rejects.toMatchObject({ statusCode: 404 });
  expect(m.download).not.toHaveBeenCalled();
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

it.each(['40001', 'PT409'])(
  'returns refresh-required conflict for stale folder (%s)',
  async (code) => {
    m.rpcError = { code };
    await expect(
      updateFolder(
        request('PATCH', {
          id: folder,
          revision: 0,
          label: 'Tenancy',
          starts_on: '2026-01-01',
          ends_on: null,
        })
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(m.rpc).toHaveBeenCalledTimes(1);
  }
);
