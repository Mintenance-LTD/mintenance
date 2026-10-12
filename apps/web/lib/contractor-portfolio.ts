/** Public portfolio media must be a permanent copy in the portfolio bucket. */
export function isPublishedPortfolioImage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!projectUrl && url.origin === new URL(projectUrl).origin &&
      url.pathname.startsWith('/storage/v1/object/public/contractor-portfolio/') &&
      !url.search && !url.hash;
  } catch { return false; }
}
