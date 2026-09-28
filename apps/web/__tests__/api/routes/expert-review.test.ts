// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({
  source: vi.fn(),
  from: vi.fn(),
  config: [] as Array<Record<string, unknown>>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (
    config: Record<string, unknown>,
    handler: (request: NextRequest, context: unknown) => Promise<Response>
  ) => {
    mocks.config.push(config);
    return async (request: NextRequest) => {
      try {
        return await handler(request, {
          user: { id: 'server-admin' },
          params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        });
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: (error as { statusCode?: number }).statusCode ?? 500 }
        );
      }
    };
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/assessment-storage', () => ({
  resignAssessmentUrls: vi.fn(async (urls) => urls),
}));
vi.mock('@/lib/services/building-surveyor/evaluation/review-source', () => ({
  loadReviewSource: mocks.source,
}));
import { POST } from '@/app/api/admin/building-assessments/[id]/expert-review/route';

const photo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const payload = () => ({
  sourceFingerprint: 'a'.repeat(64),
  labels: {
    evidence: 'sufficient',
    damageType: 'water_damage',
    severity: 'developing',
    urgency: 'soon',
    criticalHazard: false,
  },
  notes: 'Water staining is visible above the window.',
  expertise: 'Building surveyor',
  evidenceImageIds: [photo],
  confirmedIndependentReview: true,
});
let insert: ReturnType<typeof vi.fn>;
let result: { data: unknown; error: unknown };
beforeEach(() => {
  result = { data: { id: 'review' }, error: null };
  insert = vi.fn(() => ({ select: () => ({ single: async () => result }) }));
  mocks.from.mockReset().mockReturnValue({ insert });
  mocks.source.mockReset().mockResolvedValue({
    row: { property_id: 'site', domain: 'building' },
    snapshot: { damageAssessment: { confidence: 80 } },
    images: [{ id: photo }],
    fingerprint: 'a'.repeat(64),
  });
});
const post = (body: unknown) =>
  (POST as (request: NextRequest) => Promise<Response>)(
    new NextRequest(
      'https://example.com/api/admin/building-assessments/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/expert-review',
      { method: 'POST', body: JSON.stringify(body) }
    )
  );
describe('expert review persistence', () => {
  it('requires admin authorization and MFA at the wrapper', () => {
    expect(mocks.config).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roles: ['admin'],
          requireMfaVerifiedWithinMinutes: 15,
        }),
      ])
    );
  });
  it('stores the server identity and source snapshot without altering the AI result or training labels', async () => {
    expect((await post(payload())).status).toBe(201);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith(
      'assessment_expert_reviews'
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewer_id: 'server-admin',
        source_snapshot: { damageAssessment: { confidence: 80 } },
        protocol_version: 'primary-defect-v1',
      })
    );
  });
  it('rejects stale evidence before inserting a review', async () => {
    expect(
      (await post({ ...payload(), sourceFingerprint: 'b'.repeat(64) })).status
    ).toBe(409);
    expect(insert).not.toHaveBeenCalled();
  });
  it('rejects photos from another assessment', async () => {
    expect(
      (
        await post({
          ...payload(),
          evidenceImageIds: ['cccccccc-cccc-4ccc-8ccc-cccccccccccc'],
        })
      ).status
    ).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
  it('rejects incomplete evidence labels', async () => {
    expect((await post({ ...payload(), labels: {} })).status).toBe(400);
    expect(mocks.source).not.toHaveBeenCalled();
  });
  it('reports database failures rather than a successful review', async () => {
    result = { data: null, error: { message: 'failed' } };
    expect((await post(payload())).status).toBe(500);
  });
});
