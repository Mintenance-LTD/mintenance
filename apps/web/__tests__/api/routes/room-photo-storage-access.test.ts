import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  remove: vi.fn(),
  del: vi.fn(),
  path: '',
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: async () => ({ authorized: true }) },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: m.from,
    storage: { from: () => ({ remove: m.remove }) },
  },
}));
import { DELETE } from '@/app/api/properties/[id]/room-photos/route';
beforeEach(() => {
  vi.clearAllMocks();
  m.path = 'property-room-photos/uploader/property/kitchen/file.jpg';
  m.remove.mockResolvedValue({ error: null });
  m.from.mockImplementation((table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'eq']) q[method] = () => q;
    q.delete = () => {
      m.del();
      return q;
    };
    q.single = async () => ({
      data:
        table === 'properties'
          ? { id: 'property', owner_id: 'actor' }
          : { id: 'photo', storage_path: m.path },
      error: null,
    });
    q.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(resolve);
    return q;
  });
});
const remove = () =>
  DELETE(
    {
      url: 'https://app.test/api/properties/property/room-photos?photoId=photo',
    } as never,
    {
      user: { id: 'actor', role: 'homeowner' },
      params: { id: 'property' },
    } as never
  );
it('allows an authorized property editor to delete a different team member upload', async () => {
  expect((await remove()).status).toBe(200);
  expect(m.remove).toHaveBeenCalledWith([m.path]);
  expect(m.del).toHaveBeenCalledOnce();
});
it.each([
  'property-room-photos/uploader/foreign/kitchen/file.jpg',
  'property-room-photos/uploader/property/../../../victim.jpg',
  'property-room-photos/uploader/property/%2e%2e/victim.jpg',
  'property-room-photos/uploader/property/kitchen%2ffile.jpg',
  'property-room-photos/uploader/property/kitchen/file.jpg?x=y',
  'property-room-photos/uploader/property/kitchen/file.jpg#x',
  'property-room-photos/uploader/property/kitchen\\file.jpg',
  'property-room-photos/uploader/property//file.jpg',
  'job-photos/victim/private.jpg',
])('does not delete a forged stored path %s', async (path) => {
  m.path = path;
  expect((await remove()).status).toBe(404);
  expect(m.remove).not.toHaveBeenCalled();
  expect(m.del).not.toHaveBeenCalled();
});
