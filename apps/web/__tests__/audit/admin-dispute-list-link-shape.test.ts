import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ links: {} as unknown, resolutionError: false, ops: [] as unknown[][] }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, fn: Function) => fn }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: (table: string) => {
  let selection = '';
  const q: Record<string, any> = {};
  q.select = (s: string) => { selection = s; return q; };
  for (const method of ['not', 'neq', 'order', 'eq', 'range', 'in', 'lt']) q[method] = (...args: unknown[]) => {
    if (table === 'escrow_transactions') state.ops.push([method, ...args]);
    return q;
  };
  q.then = (resolve: Function) => {
    const data = table === 'escrow_transactions' ? [{ id: 'escrow', amount: 1.9, admin_hold_status: 'pending_review', sla_deadline: '2026-11-24T12:00:00Z', jobs: { title: 'Emergency Repair' } }]
      : table === 'disputes' ? [{ id: 'dispute', reason: 'incomplete', dispute_escrow_links: state.links }]
      : table === 'admin_dispute_tasks' ? [{ dispute_id: 'dispute', admin_id: 'admin' }]
      : table === 'profiles' ? [{ id: 'admin', first_name: 'Assigned', last_name: 'Admin' }]
      : [{ id: 'decision', escrow_id: 'escrow', state: 'pending' }];
    return Promise.resolve({ data, count: 1, error: table === 'escrow_dispute_resolutions' && state.resolutionError ? { message: 'unavailable' } : null }).then(resolve);
  };
  return q;
} } }));
import { GET } from '@/app/api/admin/disputes/route';
beforeEach(() => { state.links = { escrow_id: 'escrow' }; state.resolutionError = false; state.ops = []; });
it.each(['object', 'array'])('loads the assigned dispute with a %s relationship', async shape => {
  if (shape === 'array') state.links = [state.links];
  const response = await GET(new NextRequest('https://example.test/api/admin/disputes'), {} as never);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ data: [{ id: 'escrow', holdReason: 'incomplete', assignedAdmin: 'Assigned Admin', resolution: { id: 'decision' } }], stats: { open: 1, totalAmountAtRisk: 1.9 } });
});
it('does not hide a failed settlement lookup behind an editable dispute', async () => {
  state.resolutionError = true;
  await expect(GET(new NextRequest('https://example.test/api/admin/disputes'), {} as never)).rejects.toMatchObject({ statusCode: 500 });
});

it('filters active overdue cases and uses the decision deadline before taking a page', async () => {
  const response = await GET(new NextRequest('https://example.test/api/admin/disputes?status=overdue&page=2'), {} as never);
  expect(await response.json()).toMatchObject({ data: [{ slaDeadline: '2026-11-24T12:00:00Z' }] });
  expect(state.ops).toContainEqual(['in', 'active_case.disputes.status', ['open', 'under_review', 'escalated', 'pending']]);
  expect(state.ops).toContainEqual(['lt', 'sla_deadline', expect.any(String)]);
  expect(state.ops.indexOf(state.ops.find(op => op[0] === 'order')!)).toBeLessThan(state.ops.findIndex(op => op[0] === 'range'));
  expect(state.ops.find(op => op[0] === 'order')).toEqual(['order', 'sla_deadline', { ascending: true, nullsFirst: false }]);
  expect(state.ops).toContainEqual(['range', 20, 39]);
});
