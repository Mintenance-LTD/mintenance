/** Parse action responses without exposing proxy HTML or object coercion to users. */
export async function readActionResponse<T>(
  response: Response,
  fallback: string
): Promise<T> {
  if (response.status === 413) {
    throw new Error(
      'This upload is too large. Choose fewer photos or smaller files and try again.'
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      `${fallback} The server returned an unreadable response. Please retry.`
    );
  }
  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'error' in body ? body.error : null;
    const message =
      typeof error === 'string'
        ? error
        : error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : fallback;
    throw new Error(message || fallback);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Error(fallback);
  return body as T;
}
