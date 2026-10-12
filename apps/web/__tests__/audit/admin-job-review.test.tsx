import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: mocks.auth }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: mocks.from } }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error('not-found'); } }));
vi.mock('@/components/ui/Card', () => ({ Card: ({ children, id }: { children: React.ReactNode; id?: string }) => <div id={id}>{children}</div> }));
import Page from '@/app/admin/jobs/[id]/page';
const id = '3b097183-f3ef-4e63-8e63-a66632e5f61e';
const props = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: 'admin', role: 'admin' });
  mocks.from.mockImplementation((table: string) => {
    const result = table === 'jobs'
      ? { data: { id, title: 'Painting', status: 'posted', budget: 100, created_at: '2026-10-10', homeowner_id: 'owner' }, error: null }
      : { data: [{ id: 'bid', contractor_id: 'bidder', amount: 80, status: 'pending', description: 'Proposal' }], error: null };
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'is']) chain[method] = vi.fn(() => chain);
    chain.maybeSingle = vi.fn().mockResolvedValue(result);
    chain.order = vi.fn().mockResolvedValue(result);
    return chain;
  });
});
afterEach(cleanup);
describe('admin job review boundary', () => {
  it.each([null, { role: 'homeowner' }, { role: 'contractor' }])('denies non-admin access before database reads (%j)', async user => {
    mocks.auth.mockResolvedValue(user);
    await expect(Page(props)).rejects.toThrow('redirect:/admin/login');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('renders job and bid review without participant action controls or links', async () => {
    render(await Page(props));
    expect(screen.getByText('Painting')).toBeTruthy();
    expect(screen.getByText('£80.00')).toBeTruthy();
    expect(screen.getByText('Admin review · Read only')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).toMatch(/^(\/admin\/|#)/);
    expect(document.getElementById('bids')).toBeTruthy();
  });
  it('rejects malformed IDs before querying', async () => {
    await expect(Page({ params: Promise.resolve({ id: 'invalid' }) })).rejects.toThrow('not-found');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
