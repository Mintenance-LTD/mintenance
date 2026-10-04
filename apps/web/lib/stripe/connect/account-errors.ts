import { ConflictError } from '@/lib/errors/api-error';

/** Translate a provider configuration error without exposing account IDs. */
export function throwConnectAccountError(error: unknown): never {
  const provider = error as { type?: string; message?: string } | null;
  if (
    provider?.type === 'StripeInvalidRequestError' &&
    /can only be used with (?:testmode|livemode) keys/i.test(
      provider.message ?? ''
    )
  ) {
    throw new ConflictError(
      'Your payout account belongs to a different payment environment. Contact support to align the account and payment configuration.'
    );
  }
  throw error;
}
