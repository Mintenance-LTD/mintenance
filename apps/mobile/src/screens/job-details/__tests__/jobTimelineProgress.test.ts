import { getJobTimelineStep } from '../jobTimelineProgress';
it('shows approval while payment is still held', () => {
  expect(getJobTimelineStep('completed', true, 'held')).toBe(7);
  expect(getJobTimelineStep('completed', false, 'held')).toBe(6);
});
it('requires actual release before showing paid', () => {
  expect(getJobTimelineStep('completed', true, 'release_pending')).toBe(7);
  expect(getJobTimelineStep('completed', true, 'completed')).toBe(8);
  expect(getJobTimelineStep('completed', true, 'released')).toBe(8);
});
it('does not treat a review or stale approval as work completion', () => {
  expect(getJobTimelineStep('in_progress', true, 'held')).toBe(5);
  expect(getJobTimelineStep('cancelled', true, 'held')).toBe(-1);
});
