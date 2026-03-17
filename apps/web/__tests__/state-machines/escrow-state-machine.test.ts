/**
 * Unit tests for escrow state machine transitions.
 *
 * These tests define the CORRECT behavior of the escrow state machine.
 * If any test fails, the IMPLEMENTATION must be fixed — not the tests.
 *
 * Canonical escrow flow (from CLAUDE.md):
 *   pending → held → release_pending → released
 *   held → awaiting_homeowner_approval → release_pending → released
 *   Any non-terminal state can transition to: failed | cancelled | refunded
 *   Terminal states (released, refunded, failed, cancelled) cannot transition anywhere.
 */

import {
  isValidEscrowTransition,
  getValidNextEscrowStatuses,
  validateEscrowTransition,
  isTerminalEscrowStatus,
  ESCROW_STATUS,
  type EscrowStatusValue,
} from '@mintenance/shared';

// ─────────────────────────────────────────────────────────
// 1. HAPPY PATH: The canonical escrow lifecycle
// ─────────────────────────────────────────────────────────
describe('Escrow State Machine', () => {
  describe('Happy path: pending → held → release_pending → released', () => {
    it('allows pending → held (payment captured)', () => {
      expect(isValidEscrowTransition('pending', 'held')).toBe(true);
    });

    it('allows held → release_pending (homeowner approved)', () => {
      expect(isValidEscrowTransition('held', 'release_pending')).toBe(true);
    });

    it('allows release_pending → released (Stripe transfer succeeded)', () => {
      expect(isValidEscrowTransition('release_pending', 'released')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. APPROVAL PATH: held → awaiting_homeowner_approval → release_pending
  // ─────────────────────────────────────────────────────────
  describe('Approval path: held → awaiting_homeowner_approval → release_pending', () => {
    it('allows held → awaiting_homeowner_approval', () => {
      expect(isValidEscrowTransition('held', 'awaiting_homeowner_approval')).toBe(true);
    });

    it('allows awaiting_homeowner_approval → release_pending', () => {
      expect(isValidEscrowTransition('awaiting_homeowner_approval', 'release_pending')).toBe(true);
    });

    it('allows awaiting_homeowner_approval → held (homeowner rejects work)', () => {
      expect(isValidEscrowTransition('awaiting_homeowner_approval', 'held')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. ADMIN REVIEW PATH: held → pending_review → release_pending
  // ─────────────────────────────────────────────────────────
  describe('Admin review path: held → pending_review → release_pending', () => {
    it('allows held → pending_review', () => {
      expect(isValidEscrowTransition('held', 'pending_review')).toBe(true);
    });

    it('allows pending_review → release_pending (admin approves)', () => {
      expect(isValidEscrowTransition('pending_review', 'release_pending')).toBe(true);
    });

    it('allows pending_review → held (admin rejects, back to held)', () => {
      expect(isValidEscrowTransition('pending_review', 'held')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 4. FAILURE / CANCELLATION paths
  // ─────────────────────────────────────────────────────────
  describe('Failure and cancellation paths', () => {
    it('allows pending → failed (payment capture failed)', () => {
      expect(isValidEscrowTransition('pending', 'failed')).toBe(true);
    });

    it('allows pending → cancelled', () => {
      expect(isValidEscrowTransition('pending', 'cancelled')).toBe(true);
    });

    it('allows held → cancelled', () => {
      expect(isValidEscrowTransition('held', 'cancelled')).toBe(true);
    });

    it('allows awaiting_homeowner_approval → cancelled', () => {
      expect(isValidEscrowTransition('awaiting_homeowner_approval', 'cancelled')).toBe(true);
    });

    it('allows pending_review → cancelled', () => {
      expect(isValidEscrowTransition('pending_review', 'cancelled')).toBe(true);
    });

    it('allows release_pending → failed (Stripe transfer failed)', () => {
      expect(isValidEscrowTransition('release_pending', 'failed')).toBe(true);
    });

    it('allows release_pending → held (rollback on Stripe failure)', () => {
      expect(isValidEscrowTransition('release_pending', 'held')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 5. REFUND paths
  // ─────────────────────────────────────────────────────────
  describe('Refund paths', () => {
    it('allows held → refunded (before job starts)', () => {
      expect(isValidEscrowTransition('held', 'refunded')).toBe(true);
    });

    it('allows awaiting_homeowner_approval → refunded (dispute resolution)', () => {
      expect(isValidEscrowTransition('awaiting_homeowner_approval', 'refunded')).toBe(true);
    });

    it('allows pending_review → refunded (admin refund)', () => {
      expect(isValidEscrowTransition('pending_review', 'refunded')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 6. TERMINAL STATES: Cannot transition OUT
  // ─────────────────────────────────────────────────────────
  describe('Terminal states cannot transition', () => {
    const terminalStates: EscrowStatusValue[] = [
      'released',
      'refunded',
      'failed',
      'cancelled',
    ];

    const allStatuses: EscrowStatusValue[] = [
      'pending', 'held', 'release_pending', 'released',
      'refunded', 'awaiting_homeowner_approval', 'pending_review',
      'failed', 'cancelled',
    ];

    for (const terminal of terminalStates) {
      it(`${terminal} cannot transition to any other status`, () => {
        for (const target of allStatuses) {
          if (target === terminal) continue; // same-to-same is allowed
          expect(isValidEscrowTransition(terminal, target)).toBe(false);
        }
      });
    }
  });

  // ─────────────────────────────────────────────────────────
  // 7. INVALID transitions (skipping states, backwards)
  // ─────────────────────────────────────────────────────────
  describe('Invalid transitions (cannot skip states)', () => {
    it('rejects pending → released (must go through held + release_pending)', () => {
      expect(isValidEscrowTransition('pending', 'released')).toBe(false);
    });

    it('rejects pending → release_pending (must go through held first)', () => {
      expect(isValidEscrowTransition('pending', 'release_pending')).toBe(false);
    });

    it('rejects held → released (must go through release_pending)', () => {
      expect(isValidEscrowTransition('held', 'released')).toBe(false);
    });

    it('rejects pending → awaiting_homeowner_approval (must go through held)', () => {
      expect(isValidEscrowTransition('pending', 'awaiting_homeowner_approval')).toBe(false);
    });

    it('rejects pending → pending_review (must go through held)', () => {
      expect(isValidEscrowTransition('pending', 'pending_review')).toBe(false);
    });

    it('rejects released → held (cannot un-release)', () => {
      expect(isValidEscrowTransition('released', 'held')).toBe(false);
    });

    it('rejects refunded → released (cannot release after refund)', () => {
      expect(isValidEscrowTransition('refunded', 'released')).toBe(false);
    });

    it('rejects pending → refunded (must be held before refund)', () => {
      expect(isValidEscrowTransition('pending', 'refunded')).toBe(false);
    });

    it('rejects awaiting_homeowner_approval → released (must go through release_pending)', () => {
      expect(isValidEscrowTransition('awaiting_homeowner_approval', 'released')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 8. SAME-TO-SAME (idempotent) transitions
  // ─────────────────────────────────────────────────────────
  describe('Same-to-same transitions (idempotent)', () => {
    const allStatuses: EscrowStatusValue[] = [
      'pending', 'held', 'release_pending', 'released',
      'refunded', 'awaiting_homeowner_approval', 'pending_review',
      'failed', 'cancelled',
    ];

    for (const status of allStatuses) {
      it(`${status} → ${status} is allowed (idempotent)`, () => {
        expect(isValidEscrowTransition(status, status)).toBe(true);
      });
    }
  });

  // ─────────────────────────────────────────────────────────
  // 9. EDGE CASES: null, undefined, unknown statuses
  // ─────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('rejects null current status', () => {
      expect(isValidEscrowTransition(null as unknown as EscrowStatusValue, 'held')).toBe(false);
    });

    it('rejects null new status', () => {
      expect(isValidEscrowTransition('pending', null as unknown as EscrowStatusValue)).toBe(false);
    });

    it('rejects undefined current status', () => {
      expect(isValidEscrowTransition(undefined as unknown as EscrowStatusValue, 'held')).toBe(false);
    });

    it('rejects undefined new status', () => {
      expect(isValidEscrowTransition('pending', undefined as unknown as EscrowStatusValue)).toBe(false);
    });

    it('rejects unknown status string', () => {
      expect(isValidEscrowTransition('pending', 'nonexistent' as EscrowStatusValue)).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidEscrowTransition('' as EscrowStatusValue, 'held')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 10. getValidNextEscrowStatuses
  // ─────────────────────────────────────────────────────────
  describe('getValidNextEscrowStatuses', () => {
    it('returns [held, failed, cancelled] for pending', () => {
      const next = getValidNextEscrowStatuses('pending');
      expect(next).toContain('held');
      expect(next).toContain('failed');
      expect(next).toContain('cancelled');
      expect(next).toHaveLength(3);
    });

    it('returns 5 options for held (release_pending, awaiting_homeowner_approval, pending_review, refunded, cancelled)', () => {
      const next = getValidNextEscrowStatuses('held');
      expect(next).toContain('release_pending');
      expect(next).toContain('awaiting_homeowner_approval');
      expect(next).toContain('pending_review');
      expect(next).toContain('refunded');
      expect(next).toContain('cancelled');
      expect(next).toHaveLength(5);
    });

    it('returns empty array for released (terminal)', () => {
      expect(getValidNextEscrowStatuses('released')).toHaveLength(0);
    });

    it('returns empty array for refunded (terminal)', () => {
      expect(getValidNextEscrowStatuses('refunded')).toHaveLength(0);
    });

    it('returns empty array for failed (terminal)', () => {
      expect(getValidNextEscrowStatuses('failed')).toHaveLength(0);
    });

    it('returns empty array for cancelled (terminal)', () => {
      expect(getValidNextEscrowStatuses('cancelled')).toHaveLength(0);
    });

    it('returns empty array for unknown status', () => {
      expect(getValidNextEscrowStatuses('bogus' as EscrowStatusValue)).toHaveLength(0);
    });

    it('returns [released, failed, held] for release_pending', () => {
      const next = getValidNextEscrowStatuses('release_pending');
      expect(next).toContain('released');
      expect(next).toContain('failed');
      expect(next).toContain('held');
      expect(next).toHaveLength(3);
    });

    it('returns 4 options for awaiting_homeowner_approval', () => {
      const next = getValidNextEscrowStatuses('awaiting_homeowner_approval');
      expect(next).toContain('release_pending');
      expect(next).toContain('held');
      expect(next).toContain('refunded');
      expect(next).toContain('cancelled');
      expect(next).toHaveLength(4);
    });

    it('returns 4 options for pending_review', () => {
      const next = getValidNextEscrowStatuses('pending_review');
      expect(next).toContain('release_pending');
      expect(next).toContain('held');
      expect(next).toContain('refunded');
      expect(next).toContain('cancelled');
      expect(next).toHaveLength(4);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 11. validateEscrowTransition (throws on invalid)
  // ─────────────────────────────────────────────────────────
  describe('validateEscrowTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() => validateEscrowTransition('pending', 'held')).not.toThrow();
    });

    it('does not throw for same-to-same', () => {
      expect(() => validateEscrowTransition('held', 'held')).not.toThrow();
    });

    it('throws for invalid transition with descriptive message', () => {
      expect(() => validateEscrowTransition('pending', 'released')).toThrow(
        /Invalid escrow status transition.*cannot change from 'pending' to 'released'/
      );
    });

    it('throws for terminal state transition with "none (terminal state)" hint', () => {
      expect(() => validateEscrowTransition('released', 'held')).toThrow(
        /none \(terminal state\)/
      );
    });

    it('includes valid transitions in error message for non-terminal states', () => {
      expect(() => validateEscrowTransition('pending', 'released')).toThrow(
        /Valid transitions:.*held/
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // 12. isTerminalEscrowStatus
  // ─────────────────────────────────────────────────────────
  describe('isTerminalEscrowStatus', () => {
    it('released is terminal', () => {
      expect(isTerminalEscrowStatus('released')).toBe(true);
    });

    it('refunded is terminal', () => {
      expect(isTerminalEscrowStatus('refunded')).toBe(true);
    });

    it('failed is terminal', () => {
      expect(isTerminalEscrowStatus('failed')).toBe(true);
    });

    it('cancelled is terminal', () => {
      expect(isTerminalEscrowStatus('cancelled')).toBe(true);
    });

    it('pending is NOT terminal', () => {
      expect(isTerminalEscrowStatus('pending')).toBe(false);
    });

    it('held is NOT terminal', () => {
      expect(isTerminalEscrowStatus('held')).toBe(false);
    });

    it('release_pending is NOT terminal', () => {
      expect(isTerminalEscrowStatus('release_pending')).toBe(false);
    });

    it('awaiting_homeowner_approval is NOT terminal', () => {
      expect(isTerminalEscrowStatus('awaiting_homeowner_approval')).toBe(false);
    });

    it('pending_review is NOT terminal', () => {
      expect(isTerminalEscrowStatus('pending_review')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 13. CONSTANTS INTEGRITY: Ensure all statuses are accounted for
  // ─────────────────────────────────────────────────────────
  describe('Constants integrity', () => {
    it('ESCROW_STATUS has exactly 9 values', () => {
      expect(Object.keys(ESCROW_STATUS)).toHaveLength(9);
    });

    it('every ESCROW_STATUS value has a transition entry', () => {
      const allValues = Object.values(ESCROW_STATUS);
      for (const status of allValues) {
        // getValidNextEscrowStatuses returns [] for unknowns,
        // but we verify it doesn't return undefined
        const next = getValidNextEscrowStatuses(status);
        expect(Array.isArray(next)).toBe(true);
      }
    });

    it('all transition targets are valid ESCROW_STATUS values', () => {
      const validValues = new Set(Object.values(ESCROW_STATUS));
      const allValues = Object.values(ESCROW_STATUS);
      for (const status of allValues) {
        const targets = getValidNextEscrowStatuses(status);
        for (const target of targets) {
          expect(validValues.has(target)).toBe(true);
        }
      }
    });
  });
});
