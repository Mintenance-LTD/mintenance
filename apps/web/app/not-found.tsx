import { cookies } from 'next/headers';
import Link from 'next/link';
import { MintEditorialErrorView } from '@/components/mint-editorial/MintEditorialErrorView';

/**
 * Root 404 — splits on the `mintenance-theme` cookie so Mint Editorial
 * users see the canonical 404 (huge serif `404` brand-color code +
 * .t-h2 + .t-body + two CTAs) and legacy users see the existing
 * teal-button layout.
 *
 * Server component — uses `cookies()` directly; no client-side flash.
 */
export default async function NotFound() {
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <div className='me-root' style={{ minHeight: '100vh' }}>
        <MintEditorialErrorView
          code='404'
          title="Can't find that."
          body="The job, page, or contractor you're after isn't here. Maybe it moved, or maybe we never had it."
          primary={{ label: 'Back to dashboard', href: '/dashboard' }}
          secondary={{ label: 'Get help', href: '/help' }}
        />
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-gray-900'>404</h1>
        <p className='mt-4 text-xl text-gray-600'>Page not found</p>
        <p className='mt-2 text-gray-500'>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center'>
          <Link
            href='/'
            className='rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors'
          >
            Go Home
          </Link>
          <Link
            href='/search'
            className='rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            Search Contractors
          </Link>
          <Link
            href='/help'
            className='rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            Help Centre
          </Link>
        </div>
      </div>
    </div>
  );
}
