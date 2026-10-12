// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn(), remove: vi.fn(), validate: vi.fn(), insert: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => (request: Request) => handler(request, { user: { id: 'owner' } }) }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from, storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove,
  getPublicUrl: (path: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/contractor-portfolio/${path}` } }) }) } } }));
vi.mock('@/lib/utils/fileValidation', () => ({ validateImageUpload: mocks.validate, MAX_FILE_SIZES: { profileImage: 5242880 } }));
import { POST } from '@/app/api/contractor/upload-photos/route';
function request(count = 1) {
  const form = new FormData(); form.set('title', 'Published project'); form.set('category', 'General'); form.set('description', 'Chosen public description');
  for (let i = 0; i < count; i++) form.append('photos', new File(['photo'], `${i}.jpg`, { type: 'image/jpeg' }));
  return { formData: async () => form } as unknown as Request;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null });
  mocks.validate.mockResolvedValue({ valid: true, detectedType: 'image/jpeg' });
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'post' }, error: null }) }) });
  mocks.from.mockImplementation((table: string) => table === 'contractor_posts' ? { insert: mocks.insert } : {
    select: () => ({ eq: () => ({ single: async () => ({ data: { portfolio_images: [] } }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }),
  });
});
it('saves only supported database fields and permanent uploaded copies', async () => {
  const response = await POST(request(), {} as never);
  expect(response.status).toBe(200);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ contractor_id: 'owner', post_type: 'portfolio', title: 'Published project', content: 'Chosen public description', is_active: true }));
  const row = mocks.insert.mock.calls[0][0];
  for (const unsupported of ['is_public', 'is_featured', 'thumbnail_url', 'project_category']) expect(row).not.toHaveProperty(unsupported);
  expect(row.media_urls[0]).toContain('/object/public/contractor-portfolio/');
});
it('validates the entire selection before creating any public objects', async () => {
  mocks.validate.mockResolvedValueOnce({ valid: true, detectedType: 'image/jpeg' }).mockResolvedValueOnce({ valid: false, error: 'Invalid image' });
  const response = await POST(request(2), {} as never);
  expect(response.status).toBe(400); expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.insert).not.toHaveBeenCalled();
});
it('removes public copies if saving the project fails', async () => {
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { message: 'database failure' } }) }) });
  const response = await POST(request(), {} as never);
  expect(response.status).toBe(500); expect(mocks.remove).toHaveBeenCalledWith([expect.stringMatching(/^portfolio\//)]);
});
