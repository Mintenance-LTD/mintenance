/** Validate the JSON contract; HTTP errors are rejected by mobileApiClient. */
export function readAccountDeletionOutcome(body: unknown) {
  if (!body || typeof body !== 'object')
    throw new Error('Account deletion outcome could not be confirmed');
  const value = body as Record<string, unknown>;
  const completed = value.status === 'completed';
  if (
    !['completed', 'pending', 'needs_review'].includes(String(value.status)) ||
    value.success !== completed ||
    typeof value.requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.requestId
    ) ||
    typeof value.message !== 'string' ||
    !value.message.length ||
    value.message.length > 1000
  )
    throw new Error('Account deletion outcome could not be confirmed');
  return {
    completed,
    notice: `${value.message}\nReference: ${value.requestId}`,
  };
}
