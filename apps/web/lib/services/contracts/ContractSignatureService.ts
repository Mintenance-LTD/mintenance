import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Writes an immutable signature audit row to public.contract_signatures
 * when the client uploaded one as part of /api/contracts/[id]/accept.
 *
 * 2026-05-27 audit-P0-4. Both web and mobile previously click-signed
 * with no captured artifact; this service is the persistence half of
 * the fix. The accept route call is fail-soft — a failed insert here
 * does not block the signing itself, but it does log loudly so any
 * audit gap is visible.
 *
 * Idempotency: a unique index on (contract_id, signer_role) means a
 * second call for the same party returns 23505 — caller treats that as
 * "already captured" and continues silently.
 */

export interface SignaturePayload {
  /** Raw signature artifact. SVG inline string OR base64 data URL. */
  signatureImage: string;
  /** 'svg' for inline SVG, 'png' for base64 data URL. */
  signatureFormat: 'svg' | 'png';
  /** Client surface so we can correlate evidence to the build. */
  platform: 'web' | 'mobile';
}

export interface SignatureContext {
  contractId: string;
  signerId: string;
  signerRole: 'homeowner' | 'contractor';
  signerIp: string | null;
  signerUserAgent: string | null;
}

const UNIQUE_VIOLATION = '23505';

/**
 * Validates a signature payload shape. Throws on shape errors; returns
 * a normalised payload on success. Kept inline rather than Zod-style so
 * the accept route can keep its body schema slim and tolerate the
 * payload being entirely absent.
 */
export function validateSignaturePayload(
  raw: unknown
): SignaturePayload | null {
  if (raw == null || typeof raw !== 'object') return null;

  const body = raw as Record<string, unknown>;
  const image = body.signatureImage;
  const format = body.signatureFormat;
  const platform = body.platform;

  if (typeof image !== 'string') return null;
  if (image.length < 1 || image.length > 524288) return null;

  if (format !== 'svg' && format !== 'png') return null;
  if (platform !== 'web' && platform !== 'mobile') return null;

  // Cheap sanity guard against an obvious mismatch.
  if (format === 'svg' && !image.trimStart().startsWith('<svg')) return null;
  if (format === 'png' && !image.startsWith('data:image/png')) return null;

  return {
    signatureImage: image,
    signatureFormat: format,
    platform,
  };
}

export async function persistContractSignature(
  payload: SignaturePayload,
  ctx: SignatureContext
): Promise<void> {
  const { error } = await serverSupabase.from('contract_signatures').insert({
    contract_id: ctx.contractId,
    signer_id: ctx.signerId,
    signer_role: ctx.signerRole,
    signature_image: payload.signatureImage,
    signature_format: payload.signatureFormat,
    platform: payload.platform,
    signer_ip: ctx.signerIp,
    signer_user_agent: ctx.signerUserAgent,
  });

  if (error) {
    // Duplicate is benign — caller already captured the signature on a
    // prior request (idempotency retry, double-tap). Don't bubble.
    if (error.code === UNIQUE_VIOLATION) {
      logger.info('Contract signature already captured — skipping insert', {
        service: 'contract-signature',
        contractId: ctx.contractId,
        signerRole: ctx.signerRole,
      });
      return;
    }
    logger.error('Failed to persist contract signature audit row', error, {
      service: 'contract-signature',
      contractId: ctx.contractId,
      signerRole: ctx.signerRole,
    });
    // Don't throw — see file header. The signing UPDATE already
    // succeeded; missing audit row is a soft failure we surface via
    // logs, not by reverting the user-facing action.
    return;
  }

  logger.info('Contract signature audit row persisted', {
    service: 'contract-signature',
    contractId: ctx.contractId,
    signerRole: ctx.signerRole,
    platform: payload.platform,
    format: payload.signatureFormat,
  });
}
