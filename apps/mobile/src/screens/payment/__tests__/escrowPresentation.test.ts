import {
  getEscrowPresentation,
  groupEscrowRecords,
} from '../escrowPresentation';

it.each(['refunded', 'cancelled', 'failed', 'unknown'])(
  'never presents %s as held or working',
  (status) => {
    expect(getEscrowPresentation({ status }).stage).toBeNull();
    expect(getEscrowPresentation({ status }).group).not.toBe('Held in escrow');
  }
);
it('does not let an old blocked reason override a terminal refund or release', () => {
  const release_blocked_reason = 'Old reconciliation error';
  expect(
    getEscrowPresentation({ status: 'refunded', release_blocked_reason }).label
  ).toBe('Refunded');
  expect(
    getEscrowPresentation({ status: 'completed', release_blocked_reason }).label
  ).toBe('Escrow released');
  expect(
    getEscrowPresentation({ status: 'held', release_blocked_reason }).group
  ).toBe('Needs attention');
});
it('separates pending, held, release checks and history without dropping or duplicating records', () => {
  const records = [
    'pending',
    'held',
    'release_pending',
    'released',
    'completed',
    'refunded',
    'failed',
  ].map((status) => ({ status }));
  const sections = groupEscrowRecords(records);
  expect(sections.map((s) => [s.title, s.data.length])).toEqual([
    ['Needs attention', 1],
    ['Held in escrow', 2],
    ['Pending payment', 1],
    ['Released', 2],
    ['Refunded or cancelled', 1],
  ]);
  expect(sections.flatMap((s) => s.data)).toHaveLength(records.length);
  expect(getEscrowPresentation({ status: 'pending' }).stage).toBe(0);
  expect(getEscrowPresentation({ status: 'held' }).stage).toBe(1);
  expect(getEscrowPresentation({ status: 'release_pending' }).stage).toBe(2);
});
