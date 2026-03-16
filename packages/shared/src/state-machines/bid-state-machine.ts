/**
 * Bid Status State Machine
 * Validates bid status transitions to prevent invalid state changes.
 */
import { BID_STATUS, BidStatusValue } from './status-constants';

const BID_STATE_TRANSITIONS: Record<BidStatusValue, BidStatusValue[]> = {
  [BID_STATUS.PENDING]: [BID_STATUS.ACCEPTED, BID_STATUS.REJECTED, BID_STATUS.WITHDRAWN],
  [BID_STATUS.ACCEPTED]: [],    // Terminal — once accepted, bid cannot change
  [BID_STATUS.REJECTED]: [],    // Terminal
  [BID_STATUS.WITHDRAWN]: [],   // Terminal
};

export function isValidBidTransition(
  currentStatus: BidStatusValue,
  newStatus: BidStatusValue
): boolean {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return true;
  const allowed = BID_STATE_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

export function getValidNextBidStatuses(currentStatus: BidStatusValue): BidStatusValue[] {
  return BID_STATE_TRANSITIONS[currentStatus] || [];
}

export function validateBidTransition(
  currentStatus: BidStatusValue,
  newStatus: BidStatusValue
): void {
  if (!isValidBidTransition(currentStatus, newStatus)) {
    const valid = getValidNextBidStatuses(currentStatus);
    throw new Error(
      `Invalid bid status transition: cannot change from '${currentStatus}' to '${newStatus}'. ` +
      `Valid transitions: ${valid.length > 0 ? valid.join(', ') : 'none (terminal state)'}`
    );
  }
}

export function isTerminalBidStatus(status: BidStatusValue): boolean {
  return BID_STATE_TRANSITIONS[status]?.length === 0;
}
