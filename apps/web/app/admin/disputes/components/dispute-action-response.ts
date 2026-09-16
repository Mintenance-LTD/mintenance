/** A 2xx transport response alone does not establish completed settlement. */
export async function requireConfirmedDisputeAction(
  response: Response
): Promise<void> {
  const body: unknown = await response.json().catch(() => null);
  const data =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  if (
    response.ok &&
    response.status !== 202 &&
    data?.success === true &&
    (data.status === 'succeeded' || data.status === 'completed')
  )
    return;
  const error = data?.error;
  const message =
    typeof error === 'string'
      ? error
      : error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : typeof data?.message === 'string'
          ? data.message
          : 'Resolution is not confirmed. Keep this request and retry to check its status.';
  throw new Error(message);
}
