import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EmergencyReportsClient } from '@/app/maintenance/emergencies/EmergencyReportsClient';

vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: { children: React.ReactNode }) =>
    children,
}));
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({
    csrfToken: 'synthetic-csrf',
    getCsrfHeaders: () => ({ 'x-csrf-token': 'synthetic-csrf' }),
  }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const coveredProperty = {
  property_id: 'flat',
  property_name: 'Covered flat',
  initial_responder: 'Property owner',
  fallback_responder: 'Property manager',
  emergency_phone: '+442079460958',
  has_active_link: true,
};

it('shows alert routing and resident contact coverage even with an empty inbox', () => {
  render(
    <EmergencyReportsClient
      initialReports={[]}
      coverage={[
        coveredProperty,
        {
          ...coveredProperty,
          property_id: 'house',
          property_name: 'House without coverage',
          fallback_responder: null,
          emergency_phone: null,
          has_active_link: false,
        },
      ]}
    />
  );
  expect(screen.getByText('No open emergency reports')).toBeVisible();
  const coverage = within(
    screen.getByRole('region', { name: 'Property coverage' })
  );
  expect(coverage.getByText('Property manager')).toBeVisible();
  expect(coverage.getByText('Mintenance operations')).toBeVisible();
  expect(coverage.getByText('No eligible team fallback')).toBeVisible();
  expect(coverage.getByText('No number configured')).toBeVisible();
  expect(coverage.getByRole('link', { name: '+442079460958' })).toHaveAttribute(
    'href',
    'tel:+442079460958'
  );
});

it('distinguishes an unavailable inbox and coverage from a confirmed empty result', () => {
  render(<EmergencyReportsClient initialReports={null} coverage={null} />);
  expect(screen.getByText(/emergency inbox could not be loaded/)).toBeVisible();
  expect(
    screen.getByText(/Property coverage could not be confirmed/)
  ).toBeVisible();
  expect(screen.queryByText('No open emergency reports')).toBeNull();
});

it('keeps escalation and acknowledgment visible and links back from the shared case', async () => {
  const report = {
    report_id: 'case',
    property_id: 'flat',
    property_name: 'Covered flat',
    description: 'Synthetic emergency',
    assignee_name: 'Property manager',
    due_at: '2026-11-23T20:00:00Z',
    escalated_at: '2026-11-23T19:45:00Z',
    needs_attention: true,
    acknowledged_at: null,
  };
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      incident: { report_id: 'case', acknowledged_at: '2026-11-23T19:50:00Z' },
    }),
  });
  vi.stubGlobal('fetch', fetcher);
  render(<EmergencyReportsClient initialReports={[report]} coverage={[]} />);
  const inbox = within(screen.getByRole('region', { name: 'Inbox' }));
  expect(inbox.getByText('Escalated · awaiting acknowledgment')).toBeVisible();
  expect(inbox.getByText(/An operator alert was queued/)).toBeVisible();
  expect(
    inbox.getByRole('link', { name: 'View report and reply' })
  ).toHaveAttribute('href', '/maintenance/reports/case?from=emergencies');
  fireEvent.click(
    inbox.getByRole('button', { name: 'Acknowledge responsibility' })
  );
  expect(await inbox.findByRole('status')).toHaveTextContent(
    'Acknowledged. Arrange the next action.'
  );
  expect(inbox.queryByRole('alert')).toBeNull();
  expect(fetcher).toHaveBeenCalledWith(
    '/api/landlord/emergency-reports',
    expect.objectContaining({ method: 'PATCH', body: '{"report_id":"case"}' })
  );
});
