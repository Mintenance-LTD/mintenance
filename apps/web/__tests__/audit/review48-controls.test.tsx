import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';
import { HomeownerPageFinder } from '@/app/dashboard/components/mint-editorial/HomeownerPageFinder';
import { LandingNavigation } from '@/components/landing/landing-navigation';
import { DocumentCard } from '@/app/documents/components/DocumentCard';
import { HowPaymentWorksCard } from '@/app/jobs/[id]/components/mint-editorial/MintEditorialJobRightRail';
const m = vi.hoisted(() => ({ role: 'homeowner' }));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'actor', role: m.role },
    loading: false,
  }),
}));
beforeEach(() => {
  m.role = 'homeowner';
});
afterEach(() => vi.unstubAllGlobals());
it('exposes automation switch state and selected level to assistive technology', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          enableAutomation: false,
          automationLevel: 'none',
          agents: {},
        }),
      })
  );
  render(<AgentAutomationPanel />);
  const master = await screen.findByRole('switch', {
    name: 'Enable AI automation',
  });
  expect(master).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(master);
  expect(master).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('button', { name: /Standard/ }));
  expect(screen.getByRole('button', { name: /Standard/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  const agent = screen.getByRole('switch', { name: 'Smart Pricing' });
  fireEvent.click(agent);
  expect(agent).toHaveAttribute('aria-checked', 'true');
});
it('lets the homeowner find a page and recover from no matching result', () => {
  render(<HomeownerPageFinder />);
  fireEvent.click(screen.getByText('Find a page'));
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value: 'payments' } });
  expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute(
    'href',
    '/payments'
  );
  fireEvent.change(input, { target: { value: 'does-not-exist' } });
  expect(screen.getByRole('status')).toHaveTextContent('No matching pages');
  fireEvent.change(input, { target: { value: 'properties' } });
  expect(screen.getByRole('link', { name: 'Properties' })).toHaveAttribute(
    'href',
    '/properties'
  );
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input.closest('details')).not.toHaveAttribute('open');
});
it.each(['homeowner', 'contractor'])(
  'keeps the %s dashboard entry on public help navigation',
  (role) => {
    m.role = role;
    render(<LandingNavigation />);
    expect(
      screen.getByRole('link', { name: 'Dashboard', exact: true })
    ).toHaveAttribute(
      'href',
      role === 'homeowner' ? '/dashboard' : '/contractor/dashboard-enhanced'
    );
    expect(
      screen.queryByRole('link', { name: 'Sign in' })
    ).not.toBeInTheDocument();
  }
);
it('shows a payment document with pennies, actual date and a scoped destination', () => {
  render(
    <DocumentCard
      doc={{
        id: 'payment-p',
        type: 'payment',
        name: 'Payment for Boiler',
        status: 'held',
        amount: 2.4,
        job_id: 'job',
        contractor_name: 'Alex Smith',
        created_at: '2026-11-14T19:00:00Z',
        updated_at: '2026-11-14T19:00:00Z',
        href: '/payments?jobId=job&paymentId=p',
      }}
    />
  );
  expect(screen.getByText('£2.40')).toBeInTheDocument();
  expect(document.body.textContent).toContain('14 Nov 2026');
  expect(document.body.textContent).toContain('Alex Smith');
  expect(
    screen
      .getAllByRole('link')
      .some(
        (link) =>
          link.getAttribute('href') === '/payments?jobId=job&paymentId=p'
      )
  ).toBe(true);
});
it('does not present a completed release as still waiting for release checks', async () => {
  render(
    <HowPaymentWorksCard
      escrowDisplay='£2.40'
      contractorFirstName='Alex'
      escrowStatus='released'
    />
  );
  await waitFor(() =>
    expect(screen.getByText(/Payment has been released/)).toBeVisible()
  );
  expect(document.body.textContent).not.toContain(
    'after the cooling-off period'
  );
  expect(document.body.textContent).toContain(
    'Bank arrival is tracked separately'
  );
});
