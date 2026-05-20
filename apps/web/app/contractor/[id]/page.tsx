import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { theme } from '@/lib/theme';
import { fetchContractorProfileData } from './utils/fetchProfileData';
import { ContractorPageHeader } from './components/ContractorPageHeader';
import { ProfileHeader } from './components/ProfileHeader';
import { StatsGrid } from './components/StatsGrid';
import { SkillsSection } from './components/SkillsSection';
import { ReviewsSection } from './components/ReviewsSection';
import { PortfolioSection } from './components/PortfolioSection';

export const metadata: Metadata = {
  title: 'Contractor Profile | Mintenance',
  description:
    'View contractor profile, reviews, portfolio, and completed jobs on Mintenance.',
};

export const dynamic = 'force-dynamic';

/**
 * Public contractor profile page. Was a 671-line monolith with 4
 * sequential server queries + inline JSX for every section. Split
 * 2026-05-09 (AUDIT_PUNCH_LIST P2 #43) into a slim orchestrator that
 * delegates to typed section components and runs the 4 fetches in
 * parallel via `fetchContractorProfileData`.
 */
export default async function ContractorPublicProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const data = await fetchContractorProfileData(id);
  if (!data) {
    notFound();
  }

  const { contractor, reviews, completedJobs, posts, avgRating } = data;

  // 2026-05-13: server-side theme detection — same pattern as other
  // contractor server pages. Editorial swaps the page background from
  // theme.colors.backgroundSecondary to the canonical var(--me-bg).
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: isMintEditorial
          ? 'var(--me-bg)'
          : theme.colors.backgroundSecondary,
      }}
    >
      <ContractorPageHeader />

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: theme.spacing[8],
        }}
      >
        <ProfileHeader contractor={contractor} contractorId={id} />

        <StatsGrid
          totalJobsCompleted={contractor.total_jobs_completed ?? 0}
          avgRating={avgRating}
          reviewCount={reviews.length}
        />

        <SkillsSection skills={contractor.contractor_skills} />

        <ReviewsSection reviews={reviews} />

        <PortfolioSection posts={posts} completedJobs={completedJobs} />
      </div>
    </main>
  );
}
