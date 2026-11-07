import {
  getJobTimelineStep,
  getJobTimelineMilestones,
} from '../jobTimelineProgress';
it('shows the signed contract and confirmed funding before work starts', () => {
  expect(getJobTimelineStep('assigned', false, null, 'accepted')).toBe(3);
  expect(getJobTimelineStep('assigned', false, 'pending', 'accepted')).toBe(3);
  expect(getJobTimelineStep('assigned', false, 'held', 'accepted')).toBe(4);
  expect(getJobTimelineStep('assigned', false, null, 'pending')).toBe(2);
  expect(getJobTimelineStep('assigned', false, 'refunded', 'accepted')).toBe(3);
  expect(getJobTimelineStep('cancelled', false, 'held', 'accepted')).toBe(-1);
});
it('does not infer a signed contract, funding, bids or approval from completed work', () => {
  expect(
    getJobTimelineMilestones('completed', false, 'pending', null, false)
  ).toEqual([true, false, true, false, false, true, true, false, false]);
});
it('shows accepted contracts independently and does not mark refunded funds as held', () => {
  expect(
    getJobTimelineMilestones('assigned', false, 'refunded', 'accepted', true)
  ).toEqual([true, true, true, true, false, false, false, false, false]);
  expect(getJobTimelineStep('assigned', false, null, 'signed')).toBe(2);
});
it('keeps approval separate from escrow release and recognises legacy completed escrow', () => {
  expect(
    getJobTimelineMilestones(
      'completed',
      true,
      'release_pending',
      'accepted',
      true
    )[8]
  ).toBe(false);
  expect(
    getJobTimelineMilestones(
      'completed',
      true,
      'completed',
      'accepted',
      true
    )[8]
  ).toBe(true);
});
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
