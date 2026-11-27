// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  authorize: vi.fn(),
  review: vi.fn(),
  gate: vi.fn(),
  eq: vi.fn(),
  errors: {} as Record<string, { code: string }>,
  records: {} as Record<string, unknown>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from, rpc: m.rpc },
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  requirePortfolioModeSubscription: m.gate,
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: m.authorize },
}));
vi.mock('@/lib/services/building-surveyor/evaluation/review-source', () => ({
  loadReviewSource: m.review,
}));

import {
  GET,
  POST,
} from '@/app/api/properties/[id]/assessments/[assessmentId]/portfolio-ticket/route';
const id = '00000000-0000-4000-8000-000000000001';
const assessmentId = '00000000-0000-4000-8000-000000000002';
const writing = {
  title: 'Check internal leak',
  description: 'Kitchen: inspect the visible staining and record the cause.',
  priority: 'high',
};
const call = (handler: unknown, body?: object) =>
  (handler as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest(
      'http://localhost/api/test',
      body ? { method: 'POST', body: JSON.stringify(body) } : undefined
    ),
    { params: { id, assessmentId }, user: { id: 'owner' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.gate.mockResolvedValue(null);
  m.errors = {};
  m.authorize.mockResolvedValue({ authorized: true });
  m.records = {
    properties: { org_id: 'org' },
    organization_memberships: { org_role: 'manager' },
    building_assessments: {
      updated_at: 'revision',
      validation_status: 'validated',
      validated_by: 'reviewer',
    },
    portfolio_assessment_sources: null,
    assessment_expert_reviews: null,
  };
  m.from.mockImplementation((table: string) => {
    const q = {
      select: () => q,
      limit: () => q,
      eq: (key: string, value: unknown) => {
        m.eq(table, key, value);
        return q;
      },
      maybeSingle: async () => ({
        data: m.records[table] ?? null,
        error: m.errors[table] ?? null,
      }),
    };
    return q;
  });
  m.rpc.mockResolvedValue({
    data: { ticket: { id: 'task', org_id: 'org' }, created: true },
    error: null,
  });
  m.review.mockResolvedValue({
    row: { property_id: id },
    fingerprint: 'current',
    images: [{ id: 'selected-image', image_url: 'private-photo' }],
  });
});
it('publishes only authored summary from a human-reviewed, scoped assessment', async () => {
  expect((await call(POST, writing)).status).toBe(201);
  expect(m.gate).toHaveBeenCalledWith(expect.anything(), 'owner');
  expect(m.eq).toHaveBeenCalledWith('building_assessments', 'user_id', 'owner');
  expect(m.eq).toHaveBeenCalledWith('building_assessments', 'property_id', id);
  expect(m.rpc).toHaveBeenCalledWith('create_assessment_portfolio_ticket', {
    p_actor: 'owner',
    p_property: id,
    p_assessment: assessmentId,
    p_revision: 'revision',
    p_review: null,
    p_image_ids: null,
    p_title: writing.title,
    p_description: writing.description,
    p_priority: writing.priority,
  });
});
it('rejects extra private fields and denied property or workspace roles', async () => {
  await expect(call(POST, { ...writing, photos: ['private'] })).rejects.toThrow(
    /valid task/
  );
  m.authorize.mockResolvedValueOnce({ authorized: false });
  await expect(call(POST, writing)).rejects.toThrow('Assessment not found');
  m.records.organization_memberships = { org_role: 'tenant' };
  await expect(call(POST, writing)).rejects.toThrow(
    'Workspace staff access required'
  );
  expect(m.rpc).not.toHaveBeenCalled();
});
it('requires a matching current expert review on the observation path', async () => {
  m.records.building_assessments = {
    validation_status: 'needs_review',
    updated_at: 'revision',
  };
  expect(await (await call(GET)).json()).toMatchObject({
    canCreate: false,
    ticket: null,
  });
  await expect(call(POST, writing)).rejects.toThrow(
    'Review the current assessment'
  );
  expect(m.rpc).not.toHaveBeenCalled();
  m.records.assessment_expert_reviews = { id: 'expert-review' };
  expect((await call(POST, writing)).status).toBe(201);
  expect(m.eq).toHaveBeenCalledWith(
    'assessment_expert_reviews',
    'source_fingerprint',
    'current'
  );
  expect(m.rpc).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      p_review: 'expert-review',
      p_image_ids: ['selected-image'],
    })
  );
});
it('resolves an existing task consistently on GET and replayed POST', async () => {
  m.records.portfolio_assessment_sources = { ticket_id: 'task' };
  m.records.maintenance_tickets = { id: 'task', org_id: 'org' };
  m.rpc.mockResolvedValue({
    data: { ticket: { id: 'task', org_id: 'org' }, created: false },
    error: null,
  });
  expect(await (await call(GET)).json()).toEqual({
    canCreate: false,
    ticket: { id: 'task', org_id: 'org' },
  });
  expect((await call(POST, writing)).status).toBe(200);
  expect(m.review).not.toHaveBeenCalled();
});
it('reports pending migration cleanly and never writes a fallback ticket', async () => {
  m.errors.portfolio_assessment_sources = { code: 'PGRST205' };
  expect(await (await call(GET)).json()).toEqual({
    canCreate: false,
    ticket: null,
    reason: 'Assessment handoff is not available in this environment yet',
  });
  await expect(call(POST, writing)).rejects.toThrow(/Assessment handoff/);
  expect(m.rpc).not.toHaveBeenCalled();
});
