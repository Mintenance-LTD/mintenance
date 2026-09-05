/** Keep destructive integration fixtures restricted to a local Supabase API. */
export function localTestUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('SUPABASE_TEST_URL must be a loopback HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('SUPABASE_TEST_URL must be a loopback HTTP(S) origin');
  }
  return url.origin;
}
