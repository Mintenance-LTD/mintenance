import { render, screen } from '@testing-library/react';
import { computeNextStep } from '@/app/jobs/[id]/components/mint-editorial/jobDetailHelpers';
import { QuickActionsList } from '@/app/jobs/[id]/components/mint-editorial/MintEditorialJobRightRail';
import {
  transformAppointmentsToEvents,
  transformJobsToEvents,
} from '@/app/scheduling/lib/event-transformer';
import { formatGBP } from '@/app/dashboard/components/mint-editorial/dashboardHelpers';
import { fetchCalendarAppointments } from '@/lib/queries/calendar-appointments';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: db }));
const inputs = {
  jobStatus: 'assigned',
  bidCount: 1,
  contractorAssigned: true,
  contractStatus: 'accepted',
  escrowStatus: 'held',
  completionConfirmed: false,
};
const visit = {
  id: 'visit',
  title: 'Repair',
  job_id: 'job',
  appointment_date: '2026-11-16',
  start_time: '09:00:00',
  end_time: '17:00:00',
  status: 'scheduled',
};

it('does not call a signed and funded assigned job in progress', () => {
  expect(computeNextStep(inputs, 'job').title).toBe(
    'Assigned — work not started'
  );
  expect(
    computeNextStep({ ...inputs, jobStatus: 'in_progress' }, 'job').title
  ).toBe('Work in progress');
  expect(
    computeNextStep({ ...inputs, jobStatus: 'cancelled' }, 'job').title
  ).toBe('Job cancelled');
});
it.each(['completed', 'cancelled'])(
  'hides the reschedule action for %s jobs',
  (status) => {
    render(<QuickActionsList jobId='job' status={status} />);
    expect(
      screen.queryByRole('link', { name: 'Change scheduled date' })
    ).not.toBeInTheDocument();
  }
);
it('preserves held pennies', () => expect(formatGBP(2.32)).toBe('£2.32'));
it.each(['homeowner', 'contractor'] as const)(
  'shows the visit and separate job dates for %s',
  (role) => {
    const visits = transformAppointmentsToEvents([visit], role);
    expect(visits[0]).toMatchObject({
      date: '2026-11-16T09:00:00.000Z',
      title: 'Repair (Visit 09:00–17:00 UK)',
      href: `${role === 'contractor' ? '/contractor' : ''}/jobs/job`,
    });
    const jobs = transformJobsToEvents(
      [
        {
          id: 'job',
          contractor_id: 'contractor',
          title: 'Repair',
          status: 'assigned',
          created_at: '2026-11-14',
          scheduled_start_date: '2026-11-16T09:00:00Z',
          scheduled_end_date: '2026-11-17T09:00:00Z',
        },
      ],
      {
        userRole: role,
        userId: role,
        viewedJobIds: new Set(),
        bidJobIds: new Set(),
      }
    );
    expect(jobs.map((j) => [j.title, j.date])).toEqual([
      ['Repair (Job start)', '2026-11-16T09:00:00.000Z'],
      ['Repair (Job end)', '2026-11-17T09:00:00.000Z'],
    ]);
  }
);
it('uses UK daylight saving for visit slots and excludes cancelled visits', () => {
  expect(
    transformAppointmentsToEvents(
      [{ ...visit, appointment_date: '2027-07-15' }],
      'homeowner'
    )[0].date
  ).toBe('2027-07-15T08:00:00.000Z');
  expect(
    transformAppointmentsToEvents(
      [{ ...visit, status: 'cancelled' }],
      'homeowner'
    )
  ).toEqual([]);
});
it.each(['homeowner', 'contractor'] as const)(
  'scopes visit reads for %s and excludes closed jobs',
  async (role) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { ...visit, job: [{ status: 'assigned' }] },
          { ...visit, id: 'closed', job: [{ status: 'completed' }] },
        ],
        error: null,
      }),
    };
    const ownership = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [{ id: 'owned' }], error: null }),
    };
    db.from.mockImplementation((table) =>
      table === 'jobs' ? ownership : query
    );
    expect(await fetchCalendarAppointments('actor', role)).toHaveLength(1);
    if (role === 'contractor')
      expect(query.eq).toHaveBeenCalledWith('contractor_id', 'actor');
    else {
      expect(ownership.or).toHaveBeenCalledWith(
        'homeowner_id.eq.actor,payer_user_id.eq.actor'
      );
      expect(query.or).toHaveBeenCalledWith(
        'client_id.eq.actor,job_id.in.(owned)'
      );
    }
  }
);
