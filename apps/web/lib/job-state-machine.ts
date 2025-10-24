/**
 * Job Status State Machine
 * Validates job status transitions to prevent invalid state changes
 */

export type JobStatus = 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Defines valid state transitions for job statuses
 * Key: current status
 * Value: array of allowed next statuses
 */
const JOB_STATE_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  posted: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state - no transitions allowed
  cancelled: [], // Terminal state - no transitions allowed
};

/**
 * Validates if a status transition is allowed
 * @param currentStatus - The current job status
 * @param newStatus - The desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidStatusTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus
): boolean {
  // Same status is always allowed (no-op)
  if (currentStatus === newStatus) {
    return true;
  }

  const allowedTransitions = JOB_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Gets all valid next statuses for a given current status
 * @param currentStatus - The current job status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: JobStatus): JobStatus[] {
  return JOB_STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates status transition and throws error if invalid
 * @param currentStatus - The current job status
 * @param newStatus - The desired new status
 * @throws Error if transition is not allowed
 */
export function validateStatusTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus
): void {
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    const validNextStatuses = getValidNextStatuses(currentStatus);
    throw new Error(
      `Invalid job status transition: cannot change from '${currentStatus}' to '${newStatus}'. ` +
      `Valid transitions: ${validNextStatuses.length > 0 ? validNextStatuses.join(', ') : 'none (terminal state)'}`
    );
  }
}

/**
 * Checks if a status is a terminal state (no further transitions allowed)
 * @param status - The job status to check
 * @returns true if status is terminal
 */
export function isTerminalStatus(status: JobStatus): boolean {
  return JOB_STATE_TRANSITIONS[status].length === 0;
}
