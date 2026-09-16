import type { AgentResult, AgentContext } from './types';

/** Dispute outcomes require the authorized, provider-backed resolution workflow. */
export class DisputeResolutionAgent {
  static async attemptAutoResolution(
    _escrowId: string,
    _jobId?: string,
    _context?: AgentContext
  ): Promise<AgentResult | null> {
    // A rating and amount are not authority to declare a refund. Pending disputes
    // remain in the durable administrator queue until an explicit resolution.
    return null;
  }
}
