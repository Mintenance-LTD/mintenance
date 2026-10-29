import type { Metadata } from 'next';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Building Survey | Mintenance',
  description: 'View your saved survey, evidence photos and reported activity.',
};

export default function AssessmentLayout({
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
