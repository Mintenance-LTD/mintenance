import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), refresh: vi.fn(), prepare: vi.fn(), filter: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('@/lib/messages/attachments', () => ({ refreshMessageAttachment: mocks.refresh, prepareMessageAttachment: mocks.prepare }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
vi.mock('@/lib/services/agents/JobStatusAgent', () => ({ JobStatusAgent: {} }));
vi.mock('@/lib/email-service', () => ({ EmailService: {} }));
vi.mock('@/lib/services/notifications/NotificationService', () => ({ NotificationService: {} }));
import { GET as thread } from '@/app/api/messages/threads/[id]/route';
import { GET as messages } from '@/app/api/messages/threads/[id]/messages/route';

beforeEach(() => {
  vi.clearAllMocks();
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) chain[method] = () => chain;
  mocks.filter.mockReturnValue(chain);
  chain.or = mocks.filter;
  chain.single = async () => ({ data: null, error: null });
  mocks.from.mockReturnValue(chain);
});
it.each([['thread', thread], ['messages', messages]] as const)(
  '%s denies unrelated users before renewing any attachment', async (_, handler) => {
    await expect(handler({ url: 'https://app.test/api/messages?limit=10' } as never, {
      user: { id: '00000000-0000-4000-8000-000000000001' },
      params: { id: '00000000-0000-4000-8000-000000000002' },
    } as never)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.filter).toHaveBeenCalledWith(expect.stringContaining('homeowner_id.eq.00000000-0000-4000-8000-000000000001'));
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  },
);
