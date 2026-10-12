import { ConflictError } from '@/lib/errors/api-error';

/** Translate a provider configuration error without exposing account IDs. */
export function throwConnectAccountError(error: unknown): never {
  const provider = error as {
    type?: string;
    code?: string;
    message?: string;
  } | null;
  if (
    (provider?.type === 'StripeInvalidRequestError' ||
      provider?.type === 'StripePermissionError') &&
    (provider.code === 'account_invalid' ||
      /can only be used with (?:testmode|livemode) keys|no such account|does not have access to account/i.test(
        provider.message ?? ''
      ))
  ) {
    throw new ConflictError(
      'We could not access your connected payout account. Contact support to check its connection and payment environment. Your saved bank details may not be the cause.'
    );
  }
  throw error;
}
