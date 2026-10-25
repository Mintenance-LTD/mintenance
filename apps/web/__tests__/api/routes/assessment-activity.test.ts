// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  source: vi.fn(),
  anchors: vi.fn(),
  user: { id: 'owner', role: 'homeowner' },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _config: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    async (request: NextRequest) => {
      try {
        return await handler(request, {
          user: mocks.user,
          params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        });
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: (error as { statusCode?: number }).statusCode ?? 500 }
        );
      }
    },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/assessment-storage', () => ({
  resignAssessmentUrls: vi.fn(async (urls) => urls),
}));
vi.mock('@/app/api/building-surveyor/assess/_anchor-authorization', () => ({
  authorizeAssessmentAnchors: mocks.anchors,
}));
vi.mock('@/lib/services/building-surveyor/evaluation/review-source', () => ({
  loadReviewSource: mocks.source,
}));
import { GET, POST } from '@/app/api/assessments/[id]/activity/route';
const photo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const payload = () => ({
  requestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  sourceFingerprint: 'a'.repeat(64),
  kind: 'correction',
  occurredOn: '2026-01-01',
  notes: 'This is visible surface staining.',
  evidenceImageIds: [photo],
  outcome: 'visible_defect',
});
let existing: Record<string, unknown> | null;
let insert: ReturnType<typeof vi.fn>;
let dbError: unknown;
beforeEach(() => {
  existing = null;
  dbError = null;
  mocks.user.id = 'owner';
  mocks.user.role = 'homeowner';
  mocks.anchors.mockReset().mockResolvedValue(undefined);
  mocks.source
    .mockReset()
    .mockResolvedValue({
      fingerprint: 'a'.repeat(64),
      snapshot: { damageAssessment: { damageType: 'stain' } },
      images: [{ id: photo, image_index: 0, image_url: 'https://test/photo' }],
    });
  insert = vi.fn();
  mocks.from.mockReset().mockImplementation((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order']) query[method] = () => query;
    query.limit = async () => ({ data: [], error: dbError });
    query.maybeSingle = async () => ({
      data:
        table === 'building_assessments'
          ? { user_id: 'owner', property_id: 'property', job_id: null }
          : existing,
      error: dbError,
    });
    query.insert = (value: Record<string, unknown>) => {
      insert(value);
      return query;
    };
    query.single = async () => ({ data: { id: 'event' }, error: dbError });
    return query;
  });
});
const call = (method: 'GET' | 'POST', body?: unknown) =>
  (method === 'GET' ? GET : POST)(
    new NextRequest(
      'https://test/api/assessments/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/activity',
      { method, ...(body ? { body: JSON.stringify(body) } : {}) }
    ),
    { params: Promise.resolve({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }) }
  );
it('records the server actor and original source, without modifying an AI or training table', async () => {
  expect((await call('POST', payload())).status).toBe(201);
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      actor_id: 'owner',
      actor_role: 'owner',
      source_snapshot: { damageAssessment: { damageType: 'stain' } },
    })
  );
  expect(mocks.anchors).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'owner', propertyId: 'property' })
  );
  expect(
    mocks.from.mock.calls.every(([table]) =>
      ['building_assessments', 'assessment_inspection_events'].includes(table)
    )
  ).toBe(true);
});
it.each(['GET', 'POST'] as const)(
  'hides another owner’s activity on %s',
  async (method) => {
    mocks.user.id = 'outsider';
    expect(
      (await call(method, method === 'POST' ? payload() : undefined)).status
    ).toBe(404);
    expect(mocks.source).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  }
);
it('rechecks current property access', async () => {
  mocks.anchors.mockRejectedValue(
    Object.assign(new Error('Access removed'), { statusCode: 403 })
  );
  expect((await call('POST', payload())).status).toBe(403);
  expect(insert).not.toHaveBeenCalled();
});
it('allows an admin with separate attribution', async () => {
  mocks.user.id = 'admin';
  mocks.user.role = 'admin';
  expect((await call('POST', payload())).status).toBe(201);
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({ actor_role: 'admin', actor_id: 'admin' })
  );
});
it('rejects stale evidence and cross-assessment photos', async () => {
  expect(
    (await call('POST', { ...payload(), sourceFingerprint: 'b'.repeat(64) }))
      .status
  ).toBe(409);
  expect(
    (
      await call('POST', {
        ...payload(),
        evidenceImageIds: ['dddddddd-dddd-4ddd-8ddd-dddddddddddd'],
      })
    ).status
  ).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});
it.each([
  { kind: 'repair', outcome: 'resolved' },
  { kind: 'follow_up', outcome: 'visible_defect' },
  { evidenceImageIds: [] },
  { evidenceImageIds: [photo, photo] },
  { actor_id: 'forged' },
  { occurredOn: '2999-01-01' },
])('rejects invalid event fields: %j', async (changes) => {
  expect((await call('POST', { ...payload(), ...changes })).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});
it('accepts repair reports without inventing a verified outcome', async () => {
  expect(
    (
      await call('POST', {
        ...payload(),
        kind: 'repair',
        outcome: null,
        evidenceImageIds: [],
      })
    ).status
  ).toBe(201);
});
it('replays an identical request without a duplicate and rejects changed content', async () => {
  existing = {
    id: 'saved',
    kind: 'correction',
    occurred_on: '2026-01-01',
    notes: payload().notes,
    outcome: 'visible_defect',
    evidence_image_ids: [photo],
    source_fingerprint: 'a'.repeat(64),
  };
  expect((await call('POST', payload())).status).toBe(200);
  expect(
    (
      await call('POST', {
        ...payload(),
        notes: 'This was a different observation.',
      })
    ).status
  ).toBe(409);
  expect(insert).not.toHaveBeenCalled();
  expect(mocks.source).not.toHaveBeenCalled();
});
it('returns private signed evidence with no cache', async () => {
  const response = await call('GET');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect((await response.json()).images[0].id).toBe(photo);
});
it('does not disguise a database failure as empty history', async () => {
  dbError = { message: 'database unavailable' };
  expect((await call('GET')).status).toBe(500);
});
