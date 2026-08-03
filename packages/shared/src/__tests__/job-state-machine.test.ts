import { describe, it, expect } from 'vitest';
import {
  isTerminalStatus,
  isValidStatusTransition,
  getValidNextStatuses,
  type JobStatus,
} from '../state-machines/job-state-machine';

describe('isTerminalStatus', () => {
  it('returns true for the terminal cancelled state', () => {
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('returns false for states that still have transitions', () => {
    const nonTerminal: JobStatus[] = [
      'posted',
      'assigned',
      'in_progress',
      'completed',
      'disputed',
    ];
    for (const s of nonTerminal) {
      expect(isTerminalStatus(s)).toBe(false);
    }
  });

  // Regression (2026-08-03): the body was `JOB_STATE_TRANSITIONS[status].length`
  // with no optional chain, so an unknown status threw `Cannot read properties
  // of undefined (reading 'length')` instead of returning false. Its escrow
  // twin (isTerminalEscrowStatus) already used `?.length`.
  it('returns false (does not throw) for an unknown status string', () => {
    const unknown = 'not_a_real_status' as unknown as JobStatus;
    expect(() => isTerminalStatus(unknown)).not.toThrow();
    expect(isTerminalStatus(unknown)).toBe(false);
  });

  it('returns false (does not throw) for undefined / null', () => {
    const asUndefined = undefined as unknown as JobStatus;
    const asNull = null as unknown as JobStatus;
    expect(() => isTerminalStatus(asUndefined)).not.toThrow();
    expect(isTerminalStatus(asUndefined)).toBe(false);
    expect(() => isTerminalStatus(asNull)).not.toThrow();
    expect(isTerminalStatus(asNull)).toBe(false);
  });
});

// Light sanity coverage for the module the fix lives in (previously untested).
describe('job status transitions (sanity)', () => {
  it('permits posted -> assigned and blocks posted -> completed', () => {
    expect(isValidStatusTransition('posted', 'assigned')).toBe(true);
    expect(isValidStatusTransition('posted', 'completed')).toBe(false);
  });

  it('treats cancelled as a dead end', () => {
    expect(getValidNextStatuses('cancelled')).toEqual([]);
  });
});
