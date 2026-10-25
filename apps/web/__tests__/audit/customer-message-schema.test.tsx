import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const s = vi.hoisted(() => ({
  theme: 'default',
  role: 'contractor',
  empty: false,
  fail: '',
  transport: false,
  queries: [] as Array<{ projection: string; filter: string; limit?: number }>,
  warn: vi.fn(),
  conversation: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () =>
    s.role ? { id: 'contractor', role: s.role } : null,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: s.theme }) }),
}));
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('redirect');
  },
}));
vi.mock('@mintenance/shared', () => ({ logger: { warn: s.warn } }));
vi.mock('@/components/ui/StandardCard', () => ({
  StandardCard: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock(
  '@/app/contractor/(dashboard)/customers/components/CustomersTable',
  () => ({ CustomersTable: () => <div>Customer list</div> })
);
vi.mock('@/components/messaging/ConversationCard', () => ({
  ConversationCard: ({ conversation }: { conversation: unknown }) => {
    s.conversation(conversation);
    return <div>Conversation preview</div>;
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const entry = {
        projection: '',
        filter: '',
        limit: undefined as number | undefined,
      };
      if (table === 'messages') s.queries.push(entry);
      const customer = {
        id: 'customer',
        first_name: 'Test',
        last_name: 'Customer',
      };
      const message = (
        id: string,
        sender_id: string,
        receiver_id: string,
        read: boolean
      ) => ({
        id,
        sender_id,
        receiver_id,
        read,
        content: id,
        created_at: '2026-10-25T08:00:00Z',
      });
      const result = () => {
        const kind = entry.projection.startsWith('sender_id')
          ? 'discovery'
          : 'recent';
        if (table === 'messages' && s.fail === kind) {
          if (s.transport) throw new Error('sensitive transport details');
          return {
            data: null,
            error: { code: '42703', message: 'sensitive database details' },
          };
        }
        return {
          error: null,
          data: s.empty
            ? []
            : table === 'jobs'
              ? [
                  {
                    id: 'job',
                    homeowner_id: customer.id,
                    homeowner: customer,
                    status: 'posted',
                  },
                ]
              : table === 'messages'
                ? kind === 'discovery'
                  ? [
                      {
                        sender_id: 'customer',
                        receiver_id: 'contractor',
                        sender: customer,
                      },
                      {
                        sender_id: 'stranger',
                        receiver_id: 'other-contractor',
                        sender: { id: 'stranger' },
                      },
                    ]
                  : [
                      message(
                        'inbound-unread',
                        'customer',
                        'contractor',
                        false
                      ),
                      message('inbound-read', 'customer', 'contractor', true),
                      message('outbound', 'contractor', 'customer', false),
                      message(
                        'private-other-conversation',
                        'customer',
                        'other-contractor',
                        false
                      ),
                      message(
                        'unknown-customer',
                        'stranger',
                        'contractor',
                        false
                      ),
                    ]
                : [],
        };
      };
      const q = {
        select: (projection: string) => {
          entry.projection = projection;
          return q;
        },
        eq: () => q,
        not: () => q,
        or: (filter: string) => {
          entry.filter = filter;
          return q;
        },
        order: () => q,
        limit: (limit: number) => {
          entry.limit = limit;
          return q;
        },
        then: (
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown
        ) => Promise.resolve().then(result).then(resolve, reject),
      };
      return q;
    },
  },
}));
import Page from '@/app/contractor/(dashboard)/customers/page';

beforeEach(() => {
  s.theme = 'default';
  s.role = 'contractor';
  s.empty = false;
  s.fail = '';
  s.transport = false;
  s.queries = [];
  s.warn.mockClear();
  s.conversation.mockClear();
});

it('queries canonical read state with bilateral contractor scope and bounded previews', async () => {
  const page = await Page();
  expect(s.queries).toEqual([
    expect.objectContaining({
      filter: 'sender_id.eq.contractor,receiver_id.eq.contractor',
    }),
    {
      projection: 'id, sender_id, receiver_id, content, created_at, read',
      filter:
        'and(sender_id.eq.contractor,receiver_id.in.(customer)),and(receiver_id.eq.contractor,sender_id.in.(customer))',
      limit: 100,
    },
  ]);
  expect(JSON.stringify(page)).not.toContain('private-other-conversation');
  expect(JSON.stringify(page)).not.toContain('unknown-customer');
  render(page);
  expect(s.conversation).toHaveBeenCalledWith(
    expect.objectContaining({
      unreadCount: 1,
      lastMessage: expect.objectContaining({ content: 'inbound-unread' }),
    })
  );
  expect(s.conversation.mock.calls[0][0].lastMessage).not.toHaveProperty(
    'readAt'
  );
});

it('counts only leads with unread inbound messages in the editorial view', async () => {
  s.theme = 'mint-editorial';
  render(await Page());
  expect(screen.getByText(/1 lead waiting on you/)).toBeInTheDocument();
});

it.each(['default', 'mint-editorial'])(
  'skips the recent query for no customers (%s)',
  async (theme) => {
    s.theme = theme;
    s.empty = true;
    render(await Page());
    expect(s.queries).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  }
);

it.each([
  ['default', 'recent', false],
  ['default', 'discovery', false],
  ['mint-editorial', 'recent', false],
  ['mint-editorial', 'discovery', false],
  ['default', 'recent', true],
  ['mint-editorial', 'discovery', true],
] as const)(
  'shows unavailable instead of zero/empty success (%s, %s, transport=%s)',
  async (theme, fail, transport) => {
    s.theme = theme;
    s.fail = fail;
    s.transport = transport;
    render(await Page());
    expect(screen.getByRole('status')).toHaveTextContent(
      /temporarily unavailable.*Refresh/
    );
    expect(
      screen.queryByText(/No messages yet|lead waiting on you/)
    ).not.toBeInTheDocument();
    expect(s.conversation).not.toHaveBeenCalled();
    expect(s.warn).toHaveBeenCalledWith('Customer messages unavailable', {
      code: transport ? 'TRANSPORT_ERROR' : '42703',
    });
    expect(JSON.stringify(s.warn.mock.calls)).not.toContain('sensitive');
  }
);

it('does not treat failed discovery with no customers as a successful empty inbox', async () => {
  s.empty = true;
  s.fail = 'discovery';
  render(await Page());
  expect(s.queries).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent(
    'temporarily unavailable'
  );
});

it.each(['', 'homeowner', 'admin'])(
  'rejects unauthenticated/non-contractor reads (%s)',
  async (role) => {
    s.role = role;
    await expect(Page()).rejects.toThrow('redirect');
    expect(s.queries).toHaveLength(0);
  }
);
