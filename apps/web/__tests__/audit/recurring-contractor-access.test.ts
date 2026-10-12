import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ access: vi.fn(), from: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: any, handler: Function) => (request: any) =>
    handler(request, {
      user: { id: 'manager', role: 'homeowner' },
      params: { id: 'property' },
    }),
}));
vi.mock('@/lib/services/property-team/property-management-access', () => ({
  getPropertyForManagement: m.access,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
import { GET } from '@/app/api/properties/[id]/recurring-contractors/route';
beforeEach(() => {
  vi.clearAllMocks();
  m.access.mockResolvedValue({ owner_id: 'property-owner' });
  m.from.mockImplementation((table: string) => {
    const q: any = {
      select: () => q,
      eq: (...args: any[]) => {
        m.eq(...args);
        return q;
      },
      not: () => q,
      in: () => q,
    };
    q.then = (f: Function) =>
      Promise.resolve({
        data:
          table === 'jobs'
            ? [{ contractor_id: 'contractor' }]
            : [
                {
                  id: 'contractor',
                  first_name: 'Test',
                  last_name: 'Contractor',
                  email: 'private@example.test',
                },
              ],
        error: null,
      }).then(f as any);
    return q;
  });
});
it('authorizes the property before reading contractors', async () => {
  m.access.mockRejectedValue(new Error('denied'));
  await expect(GET({} as any, {} as any)).rejects.toThrow('denied');
  expect(m.from).not.toHaveBeenCalled();
});
it('uses the property owner history and exposes names only', async () => {
  const response = await GET({} as any, {} as any);
  expect(m.access).toHaveBeenCalledWith(
    { id: 'manager', role: 'homeowner' },
    'property',
    'manage_maintenance'
  );
  expect(m.eq).toHaveBeenCalledWith('homeowner_id', 'property-owner');
  expect(m.eq).toHaveBeenCalledWith('status', 'completed');
  expect(await response.json()).toEqual({
    contractors: [{ id: 'contractor', name: 'Test Contractor' }],
  });
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
