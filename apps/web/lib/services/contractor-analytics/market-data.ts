import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  ContractorSkillRow,
  SkillJobRow,
  SkillPerformance,
  MarketPosition,
} from './types';

export async function getMarketData(contractorId: string) {
  const { data: contractorSkills } = await serverSupabase
    .from('contractor_skills')
    .select('skill_name')
    .eq('contractor_id', contractorId)
    .returns<ContractorSkillRow[]>();

  const skills = (contractorSkills ?? []).map(
    (skill: ContractorSkillRow) => skill.skill_name
  );

  const topSkills: SkillPerformance[] = [];
  for (const skill of skills.slice(0, 5)) {
    const { data: skillJobs } = await serverSupabase
      .from('jobs')
      .select(
        `
        id, budget,
        reviews!inner(rating)
      `
      )
      .eq('contractor_id', contractorId)
      .ilike('description', `%${skill}%`)
      .returns<SkillJobRow[]>();

    const skillJobRows = skillJobs ?? [];
    const jobCount = skillJobRows.length;
    const averageRating =
      jobCount > 0
        ? skillJobRows.reduce((sum: number, job: SkillJobRow) => {
            const ratings = job.reviews ?? [];
            if (ratings.length === 0) {
              return sum;
            }
            const totalRatings = ratings.reduce(
              (ratingSum: number, rating: { rating: number }) =>
                ratingSum + rating.rating,
              0
            );
            return sum + totalRatings / ratings.length;
          }, 0) / jobCount
        : 0;
    const averageEarnings =
      jobCount > 0
        ? skillJobRows.reduce(
            (sum: number, job: SkillJobRow) => sum + (job.budget ?? 0),
            0
          ) / jobCount
        : 0;

    topSkills.push({
      skillName: skill,
      jobCount,
      averageRating,
      averageEarnings,
      demandLevel: jobCount > 10 ? 'high' : jobCount > 5 ? 'medium' : 'low',
      proficiencyScore: Math.min(100, averageRating * 15 + jobCount * 2),
    });
  }

  // Market positioning not yet implemented — return zeros as placeholder
  const marketPositioning: MarketPosition = {
    localRanking: 0,
    localTotal: 0,
    categoryRanking: 0,
    categoryTotal: 0,
    competitorComparison: {
      betterThan: 0,
      similarTo: 0,
    },
  };

  const industryRankPercentile =
    marketPositioning.categoryTotal && marketPositioning.categoryRanking
      ? ((marketPositioning.categoryTotal - marketPositioning.categoryRanking) /
          marketPositioning.categoryTotal) *
        100
      : 0;

  return {
    topSkills,
    marketPositioning,
    industryRankPercentile,
  };
}
