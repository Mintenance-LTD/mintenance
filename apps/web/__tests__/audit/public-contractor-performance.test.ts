import { expect, it } from 'vitest';
import { publicContractorPerformance } from '@/lib/contractor/public-performance';

const job = {
  id: 'a',
  homeowner_id: 'one',
  scheduled_end_date: '2026-11-08T16:00:00Z',
  completed_at: '2026-11-08T15:00:00Z',
  created_at: '2026-11-01T10:00:00Z',
};

it('withholds each public figure when fewer than three records qualify', () => {
  const metrics = publicContractorPerformance(
    [job],
    [],
    [{ job_id: 'a', created_at: '2026-11-09T10:00:00Z' }]
  );
  expect(metrics).toMatchObject({
    onTimeCompletion: null,
    repeatCustomers: null,
    responseTime: null,
    basis: {
      onTime: { count: 1, total: 1 },
      repeat: { count: 0, total: 1 },
      responses: 0,
    },
  });
});

it('counts jobs with a recorded end, distinct customers and the first qualifying reply', () => {
  const metrics = publicContractorPerformance(
    [
      job,
      { ...job, id: 'b' },
      {
        ...job,
        id: 'c',
        homeowner_id: 'two',
        completed_at: '2026-11-08T18:00:00Z',
      },
      { ...job, id: 'd', homeowner_id: 'three', scheduled_end_date: null },
    ],
    ['a', 'b', 'c'].map((id) => ({
      job_id: id,
      created_at: '2026-11-01T13:00:00Z',
    })),
    [{ job_id: 'a', created_at: '2026-11-01T10:00:00Z' }]
  );
  expect(metrics).toMatchObject({
    onTimeCompletion: 67,
    repeatCustomers: 33,
    responseTime: 'About 2 hours',
    basis: {
      onTime: { count: 2, total: 3 },
      repeat: { count: 1, total: 3 },
      responses: 3,
    },
  });
});
