/**
 * Contractor-side discover match badge (extracted 2026-07-17 from
 * apps/web/app/contractor/discover/page.tsx).
 *
 * This is deliberately NOT ScoringService: that engine ranks
 * contractors FOR a homeowner (fairness, tiers, engagement stats);
 * this heuristic ranks jobs FOR a contractor browsing the discover
 * feed. Extracting it gives the platform exactly one implementation
 * of the contractor-side badge (previously the third parallel scoring
 * codepath), unit-tested and importable by a future mobile pin badge.
 */

export interface DiscoverMatchJob {
  category?: string | null;
  property?: { address?: string } | null;
  budget?: number;
  priority?: string | null;
  created_at: string;
}

/** Score a job for a browsing contractor. Clamped 0–100. */
export function calculateDiscoverMatchScore(
  job: DiscoverMatchJob,
  contractorSkills: string[],
  contractorCity: string | null,
  now: number = Date.now()
): number {
  let score = 50; // Base score

  // Category/skill match (40 points max)
  if (job.category && contractorSkills.length > 0) {
    const categoryLower = job.category.toLowerCase();
    const hasMatchingSkill = contractorSkills.some(
      (skill) =>
        categoryLower.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(categoryLower)
    );
    if (hasMatchingSkill) {
      score += 40;
    } else {
      score += 10; // Partial credit for having skills
    }
  }

  // Location match (20 points max)
  if (contractorCity && job.property?.address) {
    const addressLower = job.property.address.toLowerCase();
    const cityLower = contractorCity.toLowerCase();
    if (addressLower.includes(cityLower)) {
      score += 20;
    } else {
      score += 5; // Partial credit
    }
  }

  // Budget alignment (15 points max)
  if (job.budget) {
    if (job.budget >= 5000)
      score += 15; // High value jobs
    else if (job.budget >= 1000)
      score += 10; // Medium value
    else score += 5; // Lower value
  }

  // Priority/urgency (10 points max)
  if (job.priority === 'high') score += 10;
  else if (job.priority === 'medium') score += 5;

  // Recent posting bonus (5 points max)
  const daysSincePosted = Math.floor(
    (now - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSincePosted <= 1) score += 5;
  else if (daysSincePosted <= 3) score += 3;

  return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
}
