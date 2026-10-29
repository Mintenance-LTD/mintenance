import { ApiError, ErrorType } from './ErrorHandler';

/** Hosting access is independent of the user's application session. */
export function responseAccessError(
  response: Response,
  body?: unknown
): ApiError | null {
  const record =
    body && typeof body === 'object'
      ? (body as { message?: unknown; error?: unknown })
      : undefined;
  const nested =
    record?.error && typeof record.error === 'object'
      ? (record.error as { message?: unknown })
      : undefined;
  const protectedDeployment =
    record?.message === 'Protected by Vercel Authentication' ||
    nested?.message === 'Protected deployment';
  const redirect =
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400);
  const html = response.headers.get('content-type')?.includes('text/html');
  if (!protectedDeployment && !redirect && !html) return null;
  // Never include the response body or Location: these can contain login tokens.
  return new ApiError(
    'The beta API is currently unavailable. Your sign-in has been kept. Please try again later.',
    ErrorType.API,
    protectedDeployment ? 'DEPLOYMENT_PROTECTED' : 'API_ACCESS_BLOCKED',
    403
  );
}
