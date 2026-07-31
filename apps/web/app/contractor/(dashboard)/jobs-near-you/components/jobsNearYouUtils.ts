/**
 * Utility functions for the Jobs Near You feature.
 *
 * calculateDistance uses the Haversine formula to compute great-circle
 * distance between two lat/lng points in kilometers.
 *
 * calculateRecommendationScore produces a composite score (0-100) based
 * on skill match, distance, budget, and posting recency.
 */

interface JobWithDistanceForScoring {
  skillMatchCount?: number;
  distance?: number;
  created_at: string;
}

/**
 * Calculate the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @returns distance in kilometers (not rounded)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate a composite recommendation score for a job.
 *
 * Weights (2026-05-22, after homeowner-set budget removal):
 *  - Skill match: up to 40 points (40 per matched skill)
 *  - Distance: up to 40 points (inversely proportional, 500 km baseline)
 *  - Recency: up to 20 points (inversely proportional, 30-day baseline)
 *
 * The 20-point budget component was removed when homeowners stopped
 * setting budgets — using it would have biased the recommendation
 * against every new job (which has budget = 0).
 */
export function calculateRecommendationScore(
  job: JobWithDistanceForScoring
): number {
  const skillMatchScore = (job.skillMatchCount || 0) * 40;
  const distanceScore = job.distance
    ? Math.max(0, 40 * (1 - job.distance / 500))
    : 0;
  const daysSincePosted = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyScore = Math.max(0, 20 * (1 - daysSincePosted / 30));
  return skillMatchScore + distanceScore + recencyScore;
}
