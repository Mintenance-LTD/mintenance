/**
 * CredentialRegisterService — the R4 credential-moat facade.
 *
 * Today: no upstream register APIs are wired. `verify()` always returns
 * `{ status: 'manual_review' }` and admin ops clears it via the admin
 * queue. When Gas Safe / NICEIC / TrustMark API contracts land, each
 * provider swaps its stub for the real HTTP call — no callers change.
 *
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import { logger } from '@mintenance/shared';
import {
  GasSafeProvider,
  NICEICProvider,
  TrustMarkProvider,
  type RegisterProvider,
  type RegisterVerifyResult,
} from './providers';

export type RegisterId = 'gas_safe' | 'niceic' | 'trustmark' | 'other';

const PROVIDERS: Record<Exclude<RegisterId, 'other'>, RegisterProvider> = {
  gas_safe: new GasSafeProvider(),
  niceic: new NICEICProvider(),
  trustmark: new TrustMarkProvider(),
};

export class CredentialRegisterService {
  /**
   * Attempt to auto-verify a registration number against the upstream
   * register. Today every provider returns `manual_review`; the admin
   * queue is the authoritative signal. When APIs go live, `verified`
   * and `rejected` become the dominant returns.
   */
  static async verify(
    register: RegisterId,
    registrationNumber: string
  ): Promise<RegisterVerifyResult> {
    if (register === 'other') {
      return { status: 'manual_review', reason: 'no_provider_for_other' };
    }
    try {
      const provider = PROVIDERS[register];
      return await provider.verify(registrationNumber.trim());
    } catch (err) {
      logger.warn('credential register provider threw', {
        service: 'CredentialRegisterService',
        register,
        err: err instanceof Error ? err.message : String(err),
      });
      return { status: 'manual_review', reason: 'provider_error' };
    }
  }

  /**
   * Human-friendly label for a register (UI + emails).
   */
  static label(register: RegisterId): string {
    switch (register) {
      case 'gas_safe':
        return 'Gas Safe Register';
      case 'niceic':
        return 'NICEIC / ELECSA';
      case 'trustmark':
        return 'TrustMark';
      default:
        return 'Other registration';
    }
  }
}
