import { mobileApiClient } from '../../utils/mobileApiClient';

/** Require a completed lookup before signup or changing a password. */
export async function assertPasswordNotBreached(
  password: string
): Promise<void> {
  let result: { checked: boolean; isBreached: boolean };
  try {
    result = await mobileApiClient.post('/api/auth/check-password-breach', {
      password,
    });
  } catch {
    throw new Error(
      'Password security check is unavailable. Please try again shortly.'
    );
  }
  if (result?.checked !== true || typeof result.isBreached !== 'boolean') {
    throw new Error(
      'Password security check is unavailable. Please try again shortly.'
    );
  }
  if (result.isBreached) {
    throw new Error(
      'This password has appeared in a data breach. Please choose a different password.'
    );
  }
}
