/**
 * Escrow Status State Machine
 * Validates escrow status transitions per the canonical payment flow.
 *
 * Flow: pending → held → release_pending → released
 *       held → awaiting_homeowner_approval → release_pending → released
 *       Any non-terminal state → failed | cancelled | refunded
 */
import { ESCROW_STATUS, EscrowStatusValue } from './status-constants';

const ESCROW_STATE_TRANSITIONS: Record<EscrowStatusValue, EscrowStatusValue[]> = {
  [ESCROW_STATUS.PENDING]: [
    ESCROW_STATUS.HELD,
    ESCROW_STATUS.FAILED,
    ESCROW_STATUS.CANCELLED,
  ],
  [ESCROW_STATUS.HELD]: [
    ESCROW_STATUS.RELEASE_PENDING,
    ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL,
    ESCROW_STATUS.PENDING_REVIEW,
    ESCROW_STATUS.REFUNDED,
    ESCROW_STATUS.CANCELLED,
  ],
  [ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL]: [
    ESCROW_STATUS.RELEASE_PENDING,
    ESCROW_STATUS.HELD,       // Homeowner rejects, back to held
    ESCROW_STATUS.REFUNDED,
    ESCROW_STATUS.CANCELLED,
  ],
  [ESCROW_STATUS.PENDING_REVIEW]: [
    ESCROW_STATUS.RELEASE_PENDING,
    ESCROW_STATUS.HELD,       // Admin rejects, back to held
    ESCROW_STATUS.REFUNDED,
    ESCROW_STATUS.CANCELLED,
  ],
  [ESCROW_STATUS.RELEASE_PENDING]: [
    ESCROW_STATUS.RELEASED,
    ESCROW_STATUS.FAILED,     // Stripe transfer failed
    ESCROW_STATUS.HELD,       // Rollback on failure
  ],
  [ESCROW_STATUS.RELEASED]: [],    // Terminal
  [ESCROW_STATUS.REFUNDED]: [],    // Terminal
  [ESCROW_STATUS.FAILED]: [],      // Terminal
  [ESCROW_STATUS.CANCELLED]: [],   // Terminal
};

export function isValidEscrowTransition(
  currentStatus: EscrowStatusValue,
  newStatus: EscrowStatusValue
): boolean {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return true;
  const allowed = ESCROW_STATE_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

export function getValidNextEscrowStatuses(
  currentStatus: EscrowStatusValue
): EscrowStatusValue[] {
  return ESCROW_STATE_TRANSITIONS[currentStatus] || [];
}

export function validateEscrowTransition(
  currentStatus: EscrowStatusValue,
  newStatus: EscrowStatusValue
): void {
  if (!isValidEscrowTransition(currentStatus, newStatus)) {
    const valid = getValidNextEscrowStatuses(currentStatus);
    throw new Error(
      `Invalid escrow status transition: cannot change from '${currentStatus}' to '${newStatus}'. ` +
      `Valid transitions: ${valid.length > 0 ? valid.join(', ') : 'none (terminal state)'}`
    );
  }
}

export function isTerminalEscrowStatus(status: EscrowStatusValue): boolean {
  return ESCROW_STATE_TRANSITIONS[status]?.length === 0;
}
