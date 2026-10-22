/** Accept browser navigation URLs without allowing executable URL schemes. */
export function safeNavigationUrl(value: string | null | undefined): string | null {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  // Internal links must remain on this origin, including when parsed by browsers.
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#') || value.startsWith('?')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
