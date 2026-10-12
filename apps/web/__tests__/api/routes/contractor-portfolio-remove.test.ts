// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  postUpdate: vi.fn(),
  profileUpdate: vi.fn(),
  filters: [] as unknown[][],
  readError: false,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: Request) =>
    handler(request, { user: { id: 'owner' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
import { DELETE } from '@/app/api/contractor/portfolio-image/route';
const url =
  'https://project.supabase.co/storage/v1/object/public/contractor-portfolio/portfolio/photo.jpg';
function chain(result: unknown) {
  const query = {
    eq: (...args: unknown[]) => {
      mocks.filters.push(args);
      return query;
    },
    contains: () => query,
    single: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return query;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.filters = [];
  mocks.readError = false;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
  mocks.postUpdate.mockImplementation(() => chain({ error: null }));
  mocks.profileUpdate.mockImplementation(() => chain({ error: null }));
  mocks.from.mockImplementation((table: string) => ({
    select: () =>
      chain({
        data:
          table === 'contractor_posts'
            ? [{ id: 'post', media_urls: [url], is_active: true }]
            : { portfolio_images: [url] },
        error: mocks.readError ? { message: 'unavailable' } : null,
      }),
    update:
      table === 'contractor_posts' ? mocks.postUpdate : mocks.profileUpdate,
  }));
});
function request(image = url) {
  return { json: async () => ({ url: image }) } as Request;
}
it('unlists the last image and scopes every post and profile mutation to the owner', async () => {
  const response = await DELETE(request(), {} as never);
  expect(response.status).toBe(200);
  expect(mocks.postUpdate).toHaveBeenCalledWith({ is_active: false });
  expect(mocks.profileUpdate).toHaveBeenCalledWith({ portfolio_images: [] });
  expect(
    mocks.filters.filter(
      ([key, value]) => key === 'contractor_id' && value === 'owner'
    )
  ).toHaveLength(2);
  expect(
    mocks.filters.filter(([key, value]) => key === 'id' && value === 'owner')
  ).toHaveLength(2);
});
it('rejects private evidence and foreign storage URLs before accessing data', async () => {
  await expect(
    DELETE(request('https://other.test/private.jpg'), {} as never)
  ).rejects.toThrow('Invalid portfolio image');
  expect(mocks.from).not.toHaveBeenCalled();
});
it('does not report removal or mutate anything when the saved portfolio cannot be read', async () => {
  mocks.readError = true;
  await expect(DELETE(request(), {} as never)).rejects.toThrow(
    'Could not load portfolio'
  );
  expect(mocks.postUpdate).not.toHaveBeenCalled();
  expect(mocks.profileUpdate).not.toHaveBeenCalled();
});
