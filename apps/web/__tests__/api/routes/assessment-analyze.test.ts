// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  runAgent: vi.fn(),
  budget: vi.fn(),
  sign: vi.fn(),
  after: vi.fn(),
  anchors: vi.fn(),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: mocks.after,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => async (request: NextRequest) => {
      try {
        return await handler(request, {
          user: { id: 'owner' },
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
  resignAssessmentUrls: mocks.sign,
}));
vi.mock('@/lib/ai/cost-budget', () => ({ checkAICostBudget: mocks.budget }));
vi.mock('@/app/api/building-surveyor/assess/_anchor-authorization', () => ({
  authorizeAssessmentAnchors: mocks.anchors,
}));
vi.mock('@/lib/services/building-surveyor/agent/AgentRunner', () => ({
  runAgent: mocks.runAgent,
}));
vi.mock('@/app/api/assessments/walkthrough/property-age', () => ({
  withPropertyAge: vi.fn(async () => ({ ageOfProperty: 0 })),
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from '@/app/api/assessments/[id]/analyze/route';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const assessment = {
  damageAssessment: {
    damageType: 'electrical_fault',
    severity: 'dangerous',
    confidence: 87,
  },
  safetyHazards: { overallSafetyScore: 0 },
  compliance: { complianceScore: 20 },
  insuranceRisk: { riskScore: 90 },
  urgency: { urgency: 'immediate' },
  contractorAdvice: { recommendedTrades: ['electrician'] },
  modelMetadata: {
    provider: 'openai',
    model: 'test-model',
    promptVersion: 'test-v1',
  },
};
let row: Record<string, any>;
let images: Array<{ id: string; image_url: string; image_index: number }>;
let writes: Record<string, any>[];
let failSave: boolean;
let loseClaim: boolean;

beforeEach(() => {
  vi.clearAllMocks();
  row = {
    id,
    user_id: 'owner',
    property_id: null,
    job_id: null,
    domain: 'building',
    assessment_data: { manual_notes: 'keep these notes' },
    validation_status: 'pending',
    updated_at: '2026-01-01T00:00:00Z',
  };
  images = [
    {
      id: 'photo-1',
      image_url: 'https://example.com/photo.jpg',
      image_index: 0,
    },
  ];
  writes = [];
  failSave = false;
  loseClaim = false;
  mocks.budget.mockResolvedValue({ allowed: true });
  mocks.anchors.mockResolvedValue(undefined);
  mocks.sign.mockImplementation(async (urls) => urls);
  mocks.runAgent.mockResolvedValue({ assessment });
  mocks.from.mockImplementation((table: string) => {
    let patch: Record<string, any> | undefined;
    const filters: Record<string, unknown> = {};
    const resolve = () => {
      if (table === 'assessment_images') return { data: images, error: null };
      if (!patch) return { data: structuredClone(row), error: null };
      if (loseClaim && patch.validation_status === 'processing')
        return { data: null, error: null };
      if (
        filters['assessment_data->analysis->>runId'] &&
        filters['assessment_data->analysis->>runId'] !==
          row.assessment_data.analysis?.runId
      )
        return { data: null, error: null };
      if (failSave && patch.validation_status === 'needs_review')
        return { data: null, error: { message: 'DB failure' } };
      writes.push(patch);
      row = { ...row, ...patch };
      return { data: { id }, error: null };
    };
    const query: any = {
      select: () => query,
      update: (value: Record<string, any>) => {
        patch = value;
        return query;
      },
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return query;
      },
      is: (key: string, value: unknown) => {
        filters[key] = value;
        return query;
      },
      maybeSingle: async () => resolve(),
      order: async () => resolve(),
      then: (done: Function, reject: Function) =>
        Promise.resolve(resolve()).then(done as any, reject as any),
    };
    return query;
  });
});

const request = () =>
  (POST as any)(
    new NextRequest(`https://example.com/api/assessments/${id}/analyze`, {
      method: 'POST',
    })
  );

describe('saved assessment analysis', () => {
  it('checks current access to the saved property before invoking AI', async () => {
    mocks.anchors.mockRejectedValue(
      Object.assign(new Error('Access revoked'), { statusCode: 403 })
    );
    expect((await request()).status).toBe(403);
    expect(mocks.runAgent).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
  it('updates the original record with canonical scores, metadata and preserved wizard notes', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect((await response.json()).assessmentId).toBe(id);
    expect(row).toMatchObject({
      confidence: 87,
      urgency: 'immediate',
      safety_score: 0,
      insurance_risk_score: 90,
      validation_status: 'needs_review',
    });
    expect(row.assessment_data).toMatchObject({
      ...assessment,
      manual_notes: 'keep these notes',
      analysis: { state: 'ready', imageIds: ['photo-1'] },
    });
    expect(mocks.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: id,
        context: { ageOfProperty: 0 },
      })
    );
    expect(mocks.after).toHaveBeenCalledOnce();
  });
  it('returns the saved result on retry without another model call', async () => {
    await request();
    await request();
    expect(mocks.runAgent).toHaveBeenCalledOnce();
    expect(writes).toHaveLength(2);
  });
  it('rejects an assessment owned by someone else before reading photos or invoking AI', async () => {
    row.user_id = 'someone-else';
    expect((await request()).status).toBe(404);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.runAgent).not.toHaveBeenCalled();
  });
  it('rejects missing photos without leaving a processing placeholder', async () => {
    images = [];
    expect((await request()).status).toBe(400);
    expect(writes).toHaveLength(0);
  });
  it('does not start a second worker while an attempt is active', async () => {
    row.validation_status = 'processing';
    row.updated_at = new Date().toISOString();
    expect((await request()).status).toBe(202);
    expect(mocks.runAgent).not.toHaveBeenCalled();
  });
  it('does not invoke AI after losing a concurrent claim', async () => {
    loseClaim = true;
    expect((await request()).status).toBe(202);
    expect(mocks.runAgent).not.toHaveBeenCalled();
  });
  it('allows retry of a stale worker and records the new result', async () => {
    row.validation_status = 'processing';
    expect((await request()).status).toBe(200);
    expect(row.assessment_data.analysis.state).toBe('ready');
  });
  it('records a failed model call while retaining photos and notes', async () => {
    mocks.runAgent.mockRejectedValue(new Error('provider failed'));
    expect((await request()).status).toBe(500);
    expect(row.assessment_data).toMatchObject({
      manual_notes: 'keep these notes',
      analysis: { state: 'failed', retryable: true },
    });
    expect(row.validation_status).toBe('ai_analysis_failed');
    expect(images).toHaveLength(1);
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it('does not report success or capture training data if saving fails', async () => {
    failSave = true;
    expect((await request()).status).toBe(500);
    expect(row.validation_status).toBe('ai_analysis_failed');
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it('enforces the AI budget before claiming work', async () => {
    mocks.budget.mockResolvedValue({
      allowed: false,
      reason: 'daily_cap_exceeded',
    });
    expect((await request()).status).toBe(429);
    expect(writes).toHaveLength(0);
  });
});
