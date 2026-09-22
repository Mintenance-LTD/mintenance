import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  error: null as unknown,
  filters: vi.fn(),
  refresh: vi.fn(),
  data: [
    {
      property_id: 'shared',
      role: 'viewer',
      properties: { id: 'shared', property_name: 'Synthetic share' },
    },
  ],
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: (key: string, value: string) => {
          m.filters(key, value);
          return q;
        },
        in: async () => ({ data: m.data, error: m.error }),
      };
      return q;
    },
  },
}));
import { SharedPropertyLinks } from '@/app/properties/components/SharedPropertyLinks';
beforeEach(() => {
  m.error = null;
  m.filters.mockClear();
});
it('shows accepted shares separately from the owned-property quota', async () => {
  render(await SharedPropertyLinks({ userId: 'member' }));
  expect(
    screen.getByRole('link', { name: 'Synthetic share' }).getAttribute('href')
  ).toBe('/properties/shared');
  expect(m.filters).toHaveBeenCalledWith('user_id', 'member');
  expect(m.filters).toHaveBeenCalledWith('status', 'accepted');
});
it('does not conceal a membership lookup failure as no shared properties', async () => {
  m.error = { code: '08006' };
  render(await SharedPropertyLinks({ userId: 'member' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Synthetic share' })).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry shared properties' })
  );
  expect(m.refresh).toHaveBeenCalledTimes(1);
});
