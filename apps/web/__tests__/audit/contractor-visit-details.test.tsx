import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { ContractorVisitDetails } from '@/app/contractor/(dashboard)/appointments/[id]/ContractorVisitDetails';

vi.unmock('@tanstack/react-query');
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('opens the selected past visit and offers a separate proposal linked to the same job', async () => {
  const fetchVisit = vi.fn(async () =>
    Response.json({
      appointment: {
        id: 'visit-17',
        title: 'Boiler inspection',
        appointment_date: '2025-11-17',
        start_time: '09:00:00',
        end_time: '17:00:00',
        status: 'confirmed',
        client_response: 'confirmed',
        client_response_at: '2025-11-15T11:30:00Z',
        client_name: 'Test client',
        job: { id: 'boiler-job', title: 'Heating repair' },
      },
    })
  );
  vi.stubGlobal('fetch', fetchVisit);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ContractorVisitDetails id='visit-17' />
    </QueryClientProvider>
  );
  expect(await screen.findByText('Confirmed · Past visit')).toBeInTheDocument();
  expect(
    screen.getByText('Test client confirmed on 15 November 2025.')
  ).toBeInTheDocument();
  expect(fetchVisit).toHaveBeenCalledWith(
    '/api/contractor/appointments/visit-17',
    expect.anything()
  );
  expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute(
    'href',
    '/contractor/jobs/boiler-job'
  );
  expect(
    screen
      .getByRole('link', { name: 'Propose a new visit' })
      .getAttribute('href')
  ).toContain('jobId=boiler-job');
  expect(screen.queryByRole('button', { name: 'Reschedule visit' })).toBeNull();
});
