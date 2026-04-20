/**
 * Route-segment config for /jobs/quick-create.
 *
 * The page uses `useSearchParams()` to read pre-fill params from the
 * AirbnbSearchBar (category / urgency / property_id). Under Next.js 16
 * + Turbopack, that forces a CSR bailout which fails static generation
 * without a Suspense boundary. The page file is already over the
 * repo's 500-line pre-commit gate so we cannot add the directive
 * inline; route-segment config on a layout applies to the page below
 * and keeps the page file untouched.
 */
export const dynamic = 'force-dynamic';

export default function QuickCreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
