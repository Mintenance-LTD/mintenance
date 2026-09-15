import { readAccountDeletionOutcome } from '../../utils/accountDeletionOutcome';
const base = {
  requestId: 'fa360906-0000-4000-8000-000000000003',
  message: 'Cleanup processing',
};
describe('account deletion response', () => {
  it('reports pending without claiming completion and retains the reference', () => {
    const result = readAccountDeletionOutcome({
      ...base,
      status: 'pending',
      success: false,
    });
    expect(result.completed).toBe(false);
    expect(result.notice).toContain(base.requestId);
  });
  it('accepts only confirmed completion', () => {
    expect(
      readAccountDeletionOutcome({
        ...base,
        status: 'completed',
        success: true,
      }).completed
    ).toBe(true);
  });
  it.each([
    null,
    {},
    { ...base, status: 'pending', success: true },
    { ...base, status: 'completed', success: false },
  ])('rejects malformed or contradictory results %j', (body) => {
    expect(() => readAccountDeletionOutcome(body)).toThrow();
  });
});
