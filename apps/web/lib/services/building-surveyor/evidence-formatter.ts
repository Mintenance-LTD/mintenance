/**
 * Evidence Formatter for Building Surveyor Service
 * Formats evidence from various sources for Bayesian Fusion
 */

/**
 * Format SAM 3 segmentation evidence for Bayesian Fusion
 */
export function formatSAM3EvidenceForFusion(
  sam3Segmentation?: import('./SAM3Service').DamageTypeSegmentation | null
): {
  damageTypes: Record<string, { confidence: number; numInstances: number }>;
  overallConfidence: number;
} | null {
  if (!sam3Segmentation || !('damage_types' in sam3Segmentation)) {
    return null;
  }

  const damageTypes: Record<string, { confidence: number; numInstances: number }> = {};
  let totalConfidence = 0;
  let totalInstances = 0;

  for (const [damageType, data] of Object.entries(sam3Segmentation.damage_types)) {
    const avgScore = data.scores && data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0.5;
    damageTypes[damageType] = {
      confidence: avgScore,
      numInstances: data.num_instances || 0,
    };
    totalConfidence += avgScore * (data.num_instances || 0);
    totalInstances += data.num_instances || 0;
  }

  return {
    damageTypes,
    overallConfidence: totalInstances > 0 ? totalConfidence / totalInstances : 0.5,
  };
}

