import { isActiveJob } from '../jobActivity';

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
