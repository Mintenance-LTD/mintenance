import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { BuildingAssessmentsClient } from './components/BuildingAssessmentsClient';

export const metadata = {
  title: 'Building Assessments | Admin | Mintenance',
};

export default async function AdminBuildingAssessmentsPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: assessments } = await supabase
    .from('building_assessments')
    .select('*, user:profiles(id, first_name, last_name, email)')
    .order('created_at', { ascending: false });

  const safeAssessments = assessments ?? [];

  const statistics = {
    total: safeAssessments.length,
    pending: safeAssessments.filter((a) => a.validation_status === 'pending').length,
    validated: safeAssessments.filter((a) => a.validation_status === 'validated').length,
    rejected: safeAssessments.filter((a) => a.validation_status === 'rejected').length,
    needsReview: safeAssessments.filter((a) => a.validation_status === 'needs_review').length,
    averageConfidence:
      safeAssessments.length > 0
        ? safeAssessments.reduce((sum, a) => sum + (a.confidence ?? 0), 0) / safeAssessments.length
        : 0,
    averageSafetyScore:
      safeAssessments.length > 0
        ? safeAssessments.reduce((sum, a) => sum + (a.safety_score ?? 0), 0) / safeAssessments.length
        : 0,
  };

  return (
    <BuildingAssessmentsClient
      initialAssessments={safeAssessments}
      initialStatistics={statistics}
    />
  );
}
