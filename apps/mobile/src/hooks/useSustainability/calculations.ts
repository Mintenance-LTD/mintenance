import { theme } from '../../theme';
import type {
  ESGScore,
  JobSustainabilityAnalysis,
  MaterialSwapSuggestion,
  SustainabilityMetrics,
} from '../../services/SustainabilityEngine';

// ============================================================================
// Pure formatter / calculation helpers (extracted from useSustainability hook)
// ============================================================================

export const formatCarbonFootprint = (kg: number) => {
  if (kg < 1) return `${Math.round(kg * 1000)}g CO₂`;
  if (kg < 1000) return `${Math.round(kg * 10) / 10}kg CO₂`;
  return `${Math.round(kg / 100) / 10}t CO₂`;
};

const getScoreColor = (value: number) => {
  if (value >= 90) return theme.colors.primary;
  if (value >= 80) return theme.colors.success;
  if (value >= 70) return theme.colors.warning;
  if (value >= 60) return theme.colors.error;
  return theme.colors.textSecondary;
};

const getScoreGrade = (value: number) => {
  if (value >= 90) return 'A+';
  if (value >= 85) return 'A';
  if (value >= 80) return 'A-';
  if (value >= 75) return 'B+';
  if (value >= 70) return 'B';
  if (value >= 65) return 'B-';
  if (value >= 60) return 'C+';
  if (value >= 55) return 'C';
  return 'D';
};

const getCertificationIcon = (level: string) => {
  switch (level) {
    case 'platinum':
      return '🏆';
    case 'gold':
      return '🥇';
    case 'silver':
      return '🥈';
    case 'bronze':
      return '🥉';
    default:
      return '📊';
  }
};

export const formatESGScore = (score: ESGScore) => ({
  overallGrade: getScoreGrade(score.overall_score),
  overallColor: getScoreColor(score.overall_score),
  environmentalGrade: getScoreGrade(score.environmental_score),
  socialGrade: getScoreGrade(score.social_score),
  governanceGrade: getScoreGrade(score.governance_score),
  certificationIcon: getCertificationIcon(score.certification_level),
  certificationLabel:
    score.certification_level.charAt(0).toUpperCase() +
    score.certification_level.slice(1),
});

export const formatSustainabilityMetrics = (
  metrics: SustainabilityMetrics
) => ({
  carbonFootprint: formatCarbonFootprint(metrics.carbon_footprint_kg),
  waterUsage: `${Math.round(metrics.water_usage_liters)}L`,
  wasteGenerated: `${Math.round(metrics.waste_generated_kg * 10) / 10}kg`,
  energyUsage: `${Math.round(metrics.energy_usage_kwh * 10) / 10}kWh`,
  renewablePercentage: `${Math.round(metrics.renewable_energy_percentage)}%`,
  localSourcing: `${Math.round(metrics.local_sourcing_percentage)}%`,
  recycledMaterials: `${Math.round(metrics.recycled_materials_percentage)}%`,
});

export const formatMaterialSwap = (swap: MaterialSwapSuggestion) => {
  const savingsColor =
    swap.carbon_reduction > 5
      ? theme.colors.primary
      : swap.carbon_reduction > 2
        ? theme.colors.warning
        : theme.colors.textSecondary;

  const availabilityIcon =
    swap.availability === 'readily_available'
      ? '✅'
      : swap.availability === 'order_required'
        ? '📦'
        : '⏳';

  return {
    carbonSavings: formatCarbonFootprint(swap.carbon_reduction),
    savingsColor,
    costImpact:
      swap.cost_difference > 0
        ? `+${swap.cost_difference}%`
        : `${swap.cost_difference}%`,
    costColor:
      swap.cost_difference > 20
        ? theme.colors.error
        : swap.cost_difference > 10
          ? theme.colors.warning
          : theme.colors.primary,
    availabilityIcon,
    availabilityText: swap.availability
      .replace('_', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  };
};

export const getSustainabilityInsights = (
  analysis: JobSustainabilityAnalysis
) => {
  const insights = [];

  if (analysis.sustainability_score >= 80) {
    insights.push({
      type: 'success' as const,
      message:
        'Excellent sustainability score! This job has minimal environmental impact.',
      icon: '🌱',
    });
  } else if (analysis.sustainability_score >= 60) {
    insights.push({
      type: 'info' as const,
      message: 'Good sustainability potential with room for improvement.',
      icon: '🌿',
    });
  } else {
    insights.push({
      type: 'warning' as const,
      message:
        'Consider sustainable alternatives to reduce environmental impact.',
      icon: '⚠️',
    });
  }

  if (analysis.certification_eligible) {
    insights.push({
      type: 'success' as const,
      message: 'This job qualifies for green certification upon completion!',
      icon: '🏅',
    });
  }

  if (analysis.improvement_suggestions.potential_carbon_reduction > 10) {
    insights.push({
      type: 'info' as const,
      message: `Potential to reduce carbon footprint by ${formatCarbonFootprint(analysis.improvement_suggestions.potential_carbon_reduction)}`,
      icon: '🌍',
    });
  }

  return insights;
};

export const getProgressInsights = (progress: {
  trend: string;
  carbon_reduction_kg: number;
  renewable_increase_percent: number;
}) => {
  const insights = [];

  if (progress.trend === 'improving') {
    insights.push({
      type: 'success' as const,
      message: 'Great progress! Your sustainability metrics are improving.',
      details: `Reduced carbon footprint by ${formatCarbonFootprint(progress.carbon_reduction_kg)}`,
    });
  } else if (progress.trend === 'declining') {
    insights.push({
      type: 'warning' as const,
      message: 'Your sustainability metrics need attention.',
      details: 'Consider implementing green practices in upcoming jobs',
    });
  } else if (progress.trend === 'stable') {
    insights.push({
      type: 'info' as const,
      message: 'Stable performance. Look for opportunities to improve further.',
      details: 'Small changes can make a big environmental impact',
    });
  }

  if (progress.renewable_increase_percent > 5) {
    insights.push({
      type: 'success' as const,
      message: `Increased renewable energy usage by ${progress.renewable_increase_percent}%`,
      details: 'Excellent progress towards clean energy goals',
    });
  }

  return insights;
};
