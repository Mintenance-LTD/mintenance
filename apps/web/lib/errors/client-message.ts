/** Extract only a human-readable API message; never coerce an object to text. */
export function clientErrorMessage(value: unknown, fallback: string): string {
  const clean = (text: unknown) =>
    typeof text === 'string' && text.trim() && text !== '[object Object]'
      ? text.trim()
      : null;
  if (value instanceof Error) return clean(value.message) ?? fallback;
  const direct = clean(value);
  if (direct) return direct;
  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    const message = clean(data.message) ?? clean(data.error);
    if (message) return message;
    if (data.error && typeof data.error === 'object') {
      return clean((data.error as Record<string, unknown>).message) ?? fallback;
    }
  }
  return fallback;
}
