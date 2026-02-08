import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BuildingAssessmentsClient } from './components/BuildingAssessmentsClient';

export const metadata = {
  title: 'Building Assessments | Admin | Mintenance',
};

export default async function AdminBuildingAssessmentsPage() {
  const supabase = await createServerSupabaseClient();

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
    bySeverity: {
      early: safeAssessments.filter((a) => a.severity === 'early').length,
      midway: safeAssessments.filter((a) => a.severity === 'midway').length,
      full: safeAssessments.filter((a) => a.severity === 'full').length,
    },
    byDamageType: safeAssessments.reduce<Record<string, number>>((acc, a) => {
      const type = a.damage_type ?? 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
  };

  return (
    <BuildingAssessmentsClient
      initialAssessments={safeAssessments}
      initialStatistics={statistics}
    />
  );
}
