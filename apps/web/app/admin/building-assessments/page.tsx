import { serverSupabase } from '@/lib/api/supabaseServer';
import { BuildingAssessmentsClient } from './components/BuildingAssessmentsClient';

export const metadata = {
  title: 'Building Assessments | Admin | Mintenance',
};

export default async function AdminBuildingAssessmentsPage() {
  const supabase = serverSupabase;

  const { data: assessments } = await supabase
    .from('building_assessments')
    // building_assessments has two FKs to profiles (user_id + validated_by) —
    // the embed must name the FK or PostgREST rejects the query with HTTP 300.
    .select(
      '*, user:profiles!building_assessments_user_id_fkey(id, first_name, last_name, email)'
    )
    .order('created_at', { ascending: false });

  const safeAssessments = assessments ?? [];

  const statistics = {
    total: safeAssessments.length,
    pending: safeAssessments.filter((a) => a.validation_status === 'pending')
      .length,
    validated: safeAssessments.filter(
      (a) => a.validation_status === 'validated'
    ).length,
    rejected: safeAssessments.filter((a) => a.validation_status === 'rejected')
      .length,
    needsReview: safeAssessments.filter(
      (a) => a.validation_status === 'needs_review'
    ).length,
    averageConfidence:
      safeAssessments.length > 0
        ? safeAssessments.reduce((sum, a) => sum + (a.confidence ?? 0), 0) /
          safeAssessments.length
        : 0,
    averageSafetyScore:
      safeAssessments.length > 0
        ? safeAssessments.reduce((sum, a) => sum + (a.safety_score ?? 0), 0) /
          safeAssessments.length
        : 0,
    bySeverity: {
      early: safeAssessments.filter((a) => a.severity === 'early').length,
      developing: safeAssessments.filter((a) => a.severity === 'developing')
        .length,
      significant: safeAssessments.filter((a) => a.severity === 'significant')
        .length,
      dangerous: safeAssessments.filter((a) => a.severity === 'dangerous')
        .length,
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
