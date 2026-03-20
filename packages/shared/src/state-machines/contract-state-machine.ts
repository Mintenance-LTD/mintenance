/**
 * Contract Status State Machine
 * Validates contract status transitions per the canonical job lifecycle.
 *
 * Flow: draft → pending_homeowner/pending_contractor → accepted
 *       Any non-terminal state → rejected | cancelled
 */
import { CONTRACT_STATUS, ContractStatusValue } from './status-constants';

const CONTRACT_STATE_TRANSITIONS: Record<ContractStatusValue, ContractStatusValue[]> = {
  [CONTRACT_STATUS.DRAFT]: [
    CONTRACT_STATUS.PENDING_HOMEOWNER,
    CONTRACT_STATUS.PENDING_CONTRACTOR,
    CONTRACT_STATUS.CANCELLED,
  ],
  [CONTRACT_STATUS.PENDING_HOMEOWNER]: [
    CONTRACT_STATUS.ACCEPTED,
    CONTRACT_STATUS.REJECTED,
    CONTRACT_STATUS.CANCELLED,
  ],
  [CONTRACT_STATUS.PENDING_CONTRACTOR]: [
    CONTRACT_STATUS.ACCEPTED,
    CONTRACT_STATUS.REJECTED,
    CONTRACT_STATUS.CANCELLED,
  ],
  [CONTRACT_STATUS.ACCEPTED]: [],     // Terminal
  [CONTRACT_STATUS.REJECTED]: [],     // Terminal
  [CONTRACT_STATUS.CANCELLED]: [],    // Terminal
};

export function isValidContractTransition(
  currentStatus: ContractStatusValue,
  newStatus: ContractStatusValue
): boolean {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return true;
  const allowed = CONTRACT_STATE_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

export function getValidNextContractStatuses(
  currentStatus: ContractStatusValue
): ContractStatusValue[] {
  return CONTRACT_STATE_TRANSITIONS[currentStatus] || [];
}

export function validateContractTransition(
  currentStatus: ContractStatusValue,
  newStatus: ContractStatusValue
): void {
  if (!isValidContractTransition(currentStatus, newStatus)) {
    const valid = getValidNextContractStatuses(currentStatus);
    throw new Error(
      `Invalid contract status transition: cannot change from '${currentStatus}' to '${newStatus}'. ` +
      `Valid transitions: ${valid.length > 0 ? valid.join(', ') : 'none (terminal state)'}`
    );
  }
}

export function isTerminalContractStatus(status: ContractStatusValue): boolean {
  return CONTRACT_STATE_TRANSITIONS[status]?.length === 0;
}
