/**
 * EscrowReleaseAgent — facade over the ./escrow/ modules.
 *
 * This file used to be 905 lines. It was split into focused modules:
 *   - escrow/types.ts              : shared interfaces
 *   - escrow/photo-verification.ts : AI-based completion photo analysis
 *   - escrow/auto-release-rules.ts : rule matching + hold period calculation
 *   - escrow/evaluate.ts           : orchestration of all release gates
 *
 * The static class interface is preserved for backward compatibility with
 * existing callers (see grep for EscrowReleaseAgent.verifyCompletionPhotos etc.).
 * New code should import the functions directly from the submodules.
 */
import type { AgentResult } from './types';
import type { PhotoVerificationResult } from './escrow/types';
import { verifyCompletionPhotos as _verifyCompletionPhotos } from './escrow/photo-verification';
import { calculateAutoReleaseDate as _calculateAutoReleaseDate } from './escrow/auto-release-rules';
import { evaluateAutoRelease as _evaluateAutoRelease } from './escrow/evaluate';

// Re-export types for external consumers
export type {
  AIAnalysisResult,
  PhotoVerificationResult,
  AutoReleaseRule,
  EscrowJobInfo,
  RiskPrediction,
} from './escrow/types';

/**
 * Agent for automated and secure escrow release.
 * Combines photo/video AI verification, timeline-based auto-release,
 * risk-based holds, and dispute prediction.
 */
export class EscrowReleaseAgent {
  /**
   * Verify completion photos against job description using AI,
   * persist verification rows, and update escrow status.
   */
  static async verifyCompletionPhotos(
    escrowId: string,
    jobId: string,
    photoUrls: string[],
  ): Promise<PhotoVerificationResult | null> {
    return _verifyCompletionPhotos(escrowId, jobId, photoUrls);
  }

  /**
   * Calculate auto-release date based on contractor trust score + risk assessment.
   */
  static async calculateAutoReleaseDate(
    escrowId: string,
    jobId: string,
    contractorId: string,
  ): Promise<Date | null> {
    return _calculateAutoReleaseDate(escrowId, jobId, contractorId);
  }

  /**
   * Evaluate whether an escrow can be auto-released.
   * Applies admin, homeowner, photo, cooling-off, dispute, and trust gates.
   */
  static async evaluateAutoRelease(
    escrowId: string,
  ): Promise<AgentResult | null> {
    return _evaluateAutoRelease(escrowId);
  }
}
