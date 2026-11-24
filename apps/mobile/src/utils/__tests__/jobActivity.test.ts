import { isActiveContractorJob, isActiveJob } from '../jobActivity';

it('counts assigned and underway work, excluding posted, completed, cancelled and archived jobs', () => {
  expect(
    ['posted', 'assigned', 'in_progress', 'completed', 'cancelled'].map(
      (status) => isActiveJob({ status })
    )
  ).toEqual([false, true, true, false, false]);
  expect(isActiveJob({ status: 'assigned', archived_at: '2026-11-05' })).toBe(
    false
  );
  expect(isActiveJob(null)).toBe(false);
});

it('keeps an open dispute in the contractor active list while excluding archived cases', () => {
  const disputed = { status: 'disputed' };
  expect(isActiveContractorJob(disputed)).toBe(true);
  expect(isActiveJob(disputed)).toBe(false);
  expect(isActiveContractorJob({ ...disputed, archived_at: '2026-11-05' })).toBe(false);
});
