import type { Metadata } from 'next';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Documents | Mintenance',
};

/**
 * /documents inherits the universal Mint Editorial / legacy shell at
 * the layout level so the existing 503-line client page stays
 * unchanged. Adding the wrapper here avoids inflating the page file
 * past the 500-line MDC cap.
 */
export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      {children}
    </HomeownerPageWrapper>
  );
}
