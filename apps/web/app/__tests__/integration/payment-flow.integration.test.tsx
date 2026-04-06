/**
 * Payment Flow Integration Tests — REPLACED by real-DB test.
 *
 * The 12 original mock-based tests were aspirational (tested a non-existent
 * custom payment form). They were replaced with 5 `it.todo` stubs that
 * provided no coverage.
 *
 * Real-DB integration tests for the payment state machine and RLS policies
 * now live in:
 *   apps/web/__tests__/integration-real/payment-flow.integration.test.ts
 *
 * Those tests verify:
 *   - payments RLS (payer/payee/admin/third-party/anon)
 *   - State machine transitions (pending → processing → in_escrow → released)
 *   - Write-side enforcement (users can't INSERT/UPDATE/DELETE)
 *   - CHECK constraint enforcement (invalid status rejected)
 *   - FK integrity (invalid job_id / payer_id rejected)
 *
 * Run with: npm run test:integration (requires local Supabase)
 *
 * For UI-level Stripe Embedded Checkout testing, use Playwright E2E
 * with Stripe test mode — see apps/web/e2e/.
 */
// @vitest-environment node
describe('Payment Flow — see integration-real/payment-flow.integration.test.ts', () => {
  it('is tested against a real database', () => {
    // Marker test — actual assertions are in the real-DB suite.
    expect(true).toBe(true);
  });
});
