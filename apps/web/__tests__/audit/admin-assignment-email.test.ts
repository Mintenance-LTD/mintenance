import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/cron-handler', () => ({ withCronHandler: (_: string, handler: unknown) => handler }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: mocks }));
vi.mock('@/lib/email-service', () => ({ EmailService: { sendEmail: mocks.send } }));
import { GET } from '@/app/api/cron/admin-verification-assignments/route';
function query(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select','eq','limit','update','is','maybeSingle']) builder[method] = vi.fn(() => builder);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('ADMIN_VERIFICATION_ASSIGNMENTS_ENABLED', 'true'); });
it('does not send when another worker already claimed the task', async () => {
  mocks.rpc.mockResolvedValue({data: 1});
  mocks.from.mockReturnValueOnce(query({data:[{id:'task',admin_id:'admin',contractor_id:'contractor'}]}))
    .mockReturnValueOnce(query({data:null}));
  await (GET as unknown as () => Promise<unknown>)();
  expect(mocks.send).not.toHaveBeenCalled();
});
it('records unsuccessful delivery for review instead of claiming it was sent', async () => {
  mocks.rpc.mockResolvedValue({data: 1});
  const save = query({error:null});
  mocks.from.mockReturnValueOnce(query({data:[{id:'task',admin_id:'admin',contractor_id:'contractor'}]}))
    .mockReturnValueOnce(query({data:{id:'task'}}))
    .mockReturnValueOnce(query({data:{email:'admin@example.com'}})).mockReturnValueOnce(save);
  mocks.send.mockResolvedValue(false);
  await (GET as unknown as () => Promise<unknown>)();
  expect(save.update).toHaveBeenCalledWith({email_status:'needs_review'});
});
it('fails visibly if assignment storage is unavailable', async () => {
  mocks.rpc.mockResolvedValue({error:{message:'missing migration'}});
  await expect((GET as unknown as () => Promise<unknown>)()).rejects.toThrow('Admin assignment failed');
  expect(mocks.send).not.toHaveBeenCalled();
});
