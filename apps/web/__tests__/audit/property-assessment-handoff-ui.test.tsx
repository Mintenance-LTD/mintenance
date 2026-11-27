import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PropertyAssessments from '@/app/properties/[id]/components/PropertyAssessments';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'X-CSRF-Token': 'synthetic' }),
}));
vi.mock('@mintenance/shared', () => ({ logger: { error: vi.fn() } }));

const fetcher = vi.fn();
const path = '/api/properties/property/assessments/assessment/portfolio-ticket';
const response = (data: unknown) => ({ ok: true, json: async () => data });
const assessment = {
  id: 'assessment',
  damageType: 'water_mark',
  validationStatus: 'validated',
  needsOnsiteInspection: true,
};
beforeEach(() => {
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('creates an internal task only after a reviewed eligibility result and explicit authored summary', async () => {
  fetcher.mockImplementation((url: string, options?: RequestInit) =>
    Promise.resolve(
      response(
        url !== path
          ? { assessments: [assessment] }
          : options?.method === 'POST'
            ? { ticket: { id: 'ticket', org_id: 'workspace' } }
            : { canCreate: true, ticket: null }
      )
    )
  );
  render(<PropertyAssessments propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Create internal Portfolio task',
    })
  );
  expect(
    screen.getByRole('link', { name: /marketplace inspection job/i })
  ).toHaveAttribute('href', '/jobs/create?property_id=property');
  const summary = 'Kitchen: check staining near pipe and confirm next visit.';
  fireEvent.change(screen.getByLabelText('Team summary'), {
    target: { value: summary },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save internal task' }));
  expect(
    await screen.findByRole('link', { name: 'Open linked Portfolio task' })
  ).toHaveAttribute('href', '/portfolio?orgId=workspace&ticketId=ticket');
  expect(fetcher).toHaveBeenCalledWith(
    path,
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        title: 'Assessment follow-up',
        description: summary,
        priority: 'medium',
      }),
    })
  );
});

it('shows unavailable without offering an alternative write and opens a persisted exact task after reload', async () => {
  fetcher.mockImplementation((url: string) =>
    Promise.resolve(
      response(
        url !== path
          ? { assessments: [assessment] }
          : {
              canCreate: false,
              ticket: null,
              reason:
                'Assessment handoff is not available in this environment yet',
            }
      )
    )
  );
  const view = render(<PropertyAssessments propertyId='property' />);
  await screen.findByText(
    'Assessment handoff is not available in this environment yet'
  );
  expect(
    screen.queryByRole('button', { name: 'Create internal Portfolio task' })
  ).not.toBeInTheDocument();
  view.unmount();
  fetcher.mockImplementation((url: string) =>
    Promise.resolve(
      response(
        url !== path
          ? { assessments: [assessment] }
          : {
              canCreate: false,
              ticket: { id: 'existing', org_id: 'workspace' },
            }
      )
    )
  );
  render(<PropertyAssessments propertyId='property' />);
  expect(
    await screen.findByRole('link', { name: 'Open linked Portfolio task' })
  ).toHaveAttribute('href', '/portfolio?orgId=workspace&ticketId=existing');
});
