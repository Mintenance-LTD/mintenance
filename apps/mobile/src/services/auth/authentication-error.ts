/** Authentication failures are not PostgreSQL failures. Keep actionable codes. */
export function authenticationError(error: {
  code?: string;
  message?: string;
  status?: number;
}): Error & { code?: string } {
  const code = error.code;
  let message = 'Unable to sign in right now. Please try again.';
  if (
    code === 'email_not_confirmed' ||
    /email not confirmed/i.test(error.message ?? '')
  )
    message =
      'Please confirm your email before signing in. Check your inbox for the confirmation email.';
  else if (
    code === 'invalid_credentials' ||
    /invalid login credentials/i.test(error.message ?? '')
  )
    message =
      'Invalid email or password. Check your details or reset your password.';
  else if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    error.status === 429
  )
    message = 'Too many attempts. Please wait a minute before trying again.';
  else if (code === 'user_already_exists')
    message =
      'An account already exists for this email. Sign in or reset your password.';
  return Object.assign(new Error(message), { code });
}
