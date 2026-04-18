/**
 * Credential-register providers. Each concrete class swaps its stub
 * for the real upstream HTTP call once API contracts land (R4
 * procurement track). The facade in CredentialRegisterService selects
 * the right provider by register id.
 */

export interface RegisterVerifyResult {
  status: 'verified' | 'rejected' | 'manual_review';
  reason?: string;
  expiresAt?: string | null;
  raw?: Record<string, unknown> | null;
}

export interface RegisterProvider {
  verify(registrationNumber: string): Promise<RegisterVerifyResult>;
}

function manualReview(reason: string): RegisterVerifyResult {
  return { status: 'manual_review', reason, raw: null };
}

/**
 * Gas Safe Register — UK gas engineers.
 * Target: https://www.gassaferegister.co.uk/ business API.
 */
export class GasSafeProvider implements RegisterProvider {
  async verify(_registrationNumber: string): Promise<RegisterVerifyResult> {
    // TODO(R4-procurement): replace with real API call when agreement signed.
    return manualReview('gas_safe_api_not_wired');
  }
}

/**
 * NICEIC / ELECSA — UK electrical certification.
 */
export class NICEICProvider implements RegisterProvider {
  async verify(_registrationNumber: string): Promise<RegisterVerifyResult> {
    // TODO(R4-procurement): swap for NICEIC contractor-search API.
    return manualReview('niceic_api_not_wired');
  }
}

/**
 * TrustMark — UK government-endorsed tradespeople scheme.
 */
export class TrustMarkProvider implements RegisterProvider {
  async verify(_registrationNumber: string): Promise<RegisterVerifyResult> {
    // TODO(R4-procurement): swap for TrustMark public search API.
    return manualReview('trustmark_api_not_wired');
  }
}
