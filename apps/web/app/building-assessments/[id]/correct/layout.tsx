import type { Metadata } from 'next';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Correct Assessment Detections | Mintenance',
  description:
    'Help improve AI accuracy by correcting building assessment detections for continuous learning.',
};

/**
 * The YOLO correction page is an authenticated homeowner / contractor
 * tool, not a marketing surface (unlike /try-mint-ai which keeps its
 * own LandingNavigation chrome on purpose). Wrap in the universal
 * shell at the layout level so the persistent sidebar + topbar
 * render consistently with the rest of the homeowner app.
 */
export default function CorrectAssessmentLayout({
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
