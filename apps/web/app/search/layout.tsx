import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Search | Mintenance',
  description:
    'Search for maintenance jobs and verified contractors with advanced filters.',
};

/**
 * /search inherits the universal Mint Editorial / legacy shell so the
 * topbar search bar in the sidebar leads users to a page that still
 * has the persistent chrome. The page renders its own inline
 * background container which becomes harmless inside the shell
 * content area.
 *
 * Suspense is preserved here because the inner page uses
 * useSearchParams() at module scope — Next.js requires the boundary
 * to be above any consumer of the hook.
 */
export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      <Suspense
        fallback={
          <div className='min-h-[50vh] flex items-center justify-center'>
            <div className='animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full' />
          </div>
        }
      >
        {children}
      </Suspense>
    </HomeownerPageWrapper>
  );
}
