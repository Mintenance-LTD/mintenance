import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sustainabilityEngine,
  ESGScore,
  JobSustainabilityAnalysis,
  MaterialSwapSuggestion,
  ContractorESGProfile,
  SustainabilityMetrics,
} from '../services/SustainabilityEngine';
import { logger } from '../utils/logger';

// Query Keys for React Query
export const SUSTAINABILITY_KEYS = {
  all: ['sustainability'] as const,
  esgScore: (contractorId: string) =>
    ['sustainability', 'esg', contractorId] as const,
  jobAnalysis: (jobId: string) => ['sustainability', 'job', jobId] as const,
  materialAlternatives: (materials: string[]) =>
    ['sustainability', 'materials', materials] as const,
  carbonFootprint: (jobDetails: any) =>
    ['sustainability', 'carbon', jobDetails] as const,
  ranking: (location: string, category?: string) =>
    ['sustainability', 'ranking', location, category] as const,
  progress: (contractorId: string, timeframe: string) =>
    ['sustainability', 'progress', contractorId, timeframe] as const,
};

// Hook for contractor ESG score calculation and retrieval
export const useContractorESGScore = (
  contractorId: string,
  autoCalculate: boolean = false
) => {
  const queryClient = useQueryClient();

  const esgQuery = useQuery({
    queryKey: SUSTAINABILITY_KEYS.esgScore(contractorId),
    queryFn: async () => {
      if (autoCalculate) {
        return await sustainabilityEngine.calculateContractorESGScore(
          contractorId
        );
      }
      // Try to get existing score first
      // In real implementation, would query database for existing score
      return await sustainabilityEngine.calculateContractorESGScore(
        contractorId
      );
    },
    enabled: Boolean(contractorId),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - ESG scores don't change frequently
  });

  const recalculateESG = useMutation({
    mutationFn: async () => {
      return await sustainabilityEngine.calculateContractorESGScore(
        contractorId
      );
    },
    onSuccess: (newScore) => {
      queryClient.setQueryData(
        SUSTAINABILITY_KEYS.esgScore(contractorId),
        newScore
      );
      logger.info('ESG score recalculated', {
        contractorId,
        score: newScore.overall_score,
      });
    },
    onError: (error) => {
      logger.error('Failed to recalculate ESG score', error);
    },
  });

  return {
    esgScore: esgQuery.data,
    isLoading: esgQuery.isLoading,
    error: esgQuery.error,
    refetch: esgQuery.refetch,
    recalculate: recalculateESG.mutate,
    isRecalculating: recalculateESG.isPending,
  };
};

// Hook for job sustainability analysis
export const useJobSustainabilityAnalysis = (
  jobTitle: string,
  jobDescription: string,
  location: string,
  category: string
) => {
  return useQuery({
    queryKey: SUSTAINABILITY_KEYS.jobAnalysis(
      `${jobTitle}-${category}-${location}`
    ),
    queryFn: async () => {
      return await sustainabilityEngine.analyzeJobSustainability(
        jobTitle,
        jobDescription,
        location,
        category
      );
    },
    enabled: Boolean(jobTitle && jobDescription && location && category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for sustainable material alternatives
export const useSustainableMaterials = (originalMaterials: string[]) => {
  return useQuery({
    queryKey: SUSTAINABILITY_KEYS.materialAlternatives(originalMaterials),
    queryFn: async () => {
      return await sustainabilityEngine.getSustainableMaterialAlternatives(
        originalMaterials
      );
    },
    enabled: originalMaterials.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes - material data changes infrequently
  });
};

// Hook for carbon footprint calculation
export const useCarbonFootprintCalculator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobDetails: {
      materials: string[];
      transportation_distance: number;
      energy_usage_hours: number;
      waste_generated: number;
    }) => {
      return await sustainabilityEngine.calculateJobCarbonFootprint(jobDetails);
    },
    onSuccess: (carbonFootprint, jobDetails) => {
      queryClient.setQueryData(
        SUSTAINABILITY_KEYS.carbonFootprint(jobDetails),
        carbonFootprint
      );
    },
  });
};

// Hook for contractor sustainability ranking
export const useSustainabilityRanking = (
  location: string,
  category?: string
) => {
  return useQuery({
    queryKey: SUSTAINABILITY_KEYS.ranking(location, category),
    queryFn: async () => {
      return await sustainabilityEngine.getContractorSustainabilityRanking(
        location,
        category
      );
    },
    enabled: Boolean(location),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Hook for tracking sustainability progress
export const useSustainabilityProgress = (
  contractorId: string,
  timeframe: 'month' | 'quarter' | 'year'
) => {
  return useQuery({
    queryKey: SUSTAINABILITY_KEYS.progress(contractorId, timeframe),
    queryFn: async () => {
      return await sustainabilityEngine.trackSustainabilityProgress(
        contractorId,
        timeframe
      );
    },
    enabled: Boolean(contractorId),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook for sustainability insights and formatting
export const useSustainabilityFormatters = () => {
  const formatESGScore = (score: ESGScore) => {
    const getScoreColor = (value: number) => {
      if (value >= 90) return '#10B981'; // Green-500
      if (value >= 80) return '#84CC16'; // Lime-500
      if (value >= 70) return '#F59E0B'; // Amber-500
      if (value >= 60) return '#EF4444'; // Red-500
      return '#6B7280'; // Gray-500
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

    return {
      overallGrade: getScoreGrade(score.overall_score),
      overallColor: getScoreColor(score.overall_score),
      environmentalGrade: getScoreGrade(score.environmental_score),
      socialGrade: getScoreGrade(score.social_score),
      governanceGrade: getScoreGrade(score.governance_score),
      certificationIcon: getCertificationIcon(score.certification_level),
      certificationLabel:
        score.certification_level.charAt(0).toUpperCase() +
        score.certification_level.slice(1),
    };
  };

  const formatCarbonFootprint = (kg: number) => {
    if (kg < 1) return `${Math.round(kg * 1000)}g CO₂`;
    if (kg < 1000) return `${Math.round(kg * 10) / 10}kg CO₂`;
    return `${Math.round(kg / 100) / 10}t CO₂`;
  };

  const formatSustainabilityMetrics = (metrics: SustainabilityMetrics) => {
    return {
      carbonFootprint: formatCarbonFootprint(metrics.carbon_footprint_kg),
      waterUsage: `${Math.round(metrics.water_usage_liters)}L`,
      wasteGenerated: `${Math.round(metrics.waste_generated_kg * 10) / 10}kg`,
      energyUsage: `${Math.round(metrics.energy_usage_kwh * 10) / 10}kWh`,
      renewablePercentage: `${Math.round(metrics.renewable_energy_percentage)}%`,
      localSourcing: `${Math.round(metrics.local_sourcing_percentage)}%`,
      recycledMaterials: `${Math.round(metrics.recycled_materials_percentage)}%`,
    };
  };

  const formatMaterialSwap = (swap: MaterialSwapSuggestion) => {
    const savingsColor =
      swap.carbon_reduction > 5
        ? '#10B981'
        : swap.carbon_reduction > 2
          ? '#F59E0B'
          : '#6B7280';

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
          ? '#EF4444'
          : swap.cost_difference > 10
            ? '#F59E0B'
            : '#10B981',
      availabilityIcon,
      availabilityText: swap.availability
        .replace('_', ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    };
  };

  const getSustainabilityInsights = (analysis: JobSustainabilityAnalysis) => {
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

  const getProgressInsights = (progress: any) => {
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
        message:
          'Stable performance. Look for opportunities to improve further.',
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

  return {
    formatESGScore,
    formatCarbonFootprint,
    formatSustainabilityMetrics,
    formatMaterialSwap,
    getSustainabilityInsights,
    getProgressInsights,
  };
};

// Hook for sustainability gamification
export const useSustainabilityGamification = (contractorId: string) => {
  const achievements = [
    {
      id: 'carbon_reducer',
      title: 'Carbon Reducer',
      description: 'Reduce carbon footprint by 50kg in a month',
      icon: '🌱',
      progress: 0,
      target: 50,
      unlocked: false,
    },
    {
      id: 'waste_warrior',
      title: 'Waste Warrior',
      description: 'Achieve 80% waste diversion rate',
      icon: '♻️',
      progress: 0,
      target: 80,
      unlocked: false,
    },
    {
      id: 'green_champion',
      title: 'Green Champion',
      description: 'Complete 10 jobs with ESG score above 80',
      icon: '🏆',
      progress: 0,
      target: 10,
      unlocked: false,
    },
    {
      id: 'renewable_advocate',
      title: 'Renewable Advocate',
      description: 'Use 100% renewable energy sources',
      icon: '⚡',
      progress: 0,
      target: 100,
      unlocked: false,
    },
  ];

  const badges = [
    { level: 'bronze', threshold: 60, color: '#CD7F32', icon: '🥉' },
    { level: 'silver', threshold: 70, color: '#C0C0C0', icon: '🥈' },
    { level: 'gold', threshold: 80, color: '#FFD700', icon: '🥇' },
    { level: 'platinum', threshold: 90, color: '#E5E4E2', icon: '🏆' },
  ];

  const calculateLevel = (esgScore: number) => {
    const badge = badges.reverse().find((badge) => esgScore >= badge.threshold);
    return badge || badges[0];
  };

  const getNextMilestone = (currentScore: number) => {
    const nextBadge = badges.find((badge) => currentScore < badge.threshold);
    if (!nextBadge) return null;

    return {
      ...nextBadge,
      pointsNeeded: nextBadge.threshold - currentScore,
      progress: (currentScore / nextBadge.threshold) * 100,
    };
  };

  return {
    achievements,
    badges,
    calculateLevel,
    getNextMilestone,
  };
};

// Utility functions
export const sustainabilityUtils = {
  isHighImpactJob: (analysis: JobSustainabilityAnalysis) => {
    return (
      analysis.predicted_impact.carbon_footprint_kg > 30 ||
      analysis.predicted_impact.waste_generated_kg > 20
    );
  },

  isPremiumGreenContractor: (esgScore: ESGScore) => {
    return (
      (esgScore.overall_score >= 80 &&
        esgScore.certification_level === 'gold') ||
      esgScore.certification_level === 'platinum'
    );
  },

  calculateEnvironmentalROI: (
    carbonReduction: number,
    costIncrease: number,
    carbonPricePerKg: number = 0.05
  ) => {
    const environmentalValue = carbonReduction * carbonPricePerKg;
    const roi = ((environmentalValue - costIncrease) / costIncrease) * 100;
    return {
      environmentalValue,
      roi: Math.round(roi * 100) / 100,
      paybackMonths:
        costIncrease > 0
          ? Math.ceil((costIncrease / environmentalValue) * 12)
          : 0,
    };
  },

  getComplianceStatus: (certificationLevel: string, location: string) => {
    // UK sustainability compliance requirements
    const requirements = {
      london: { minScore: 70, required: true },
      manchester: { minScore: 65, required: false },
      birmingham: { minScore: 65, required: false },
      default: { minScore: 60, required: false },
    };

    const locationKey = location.toLowerCase();
    const requirement =
      requirements[locationKey as keyof typeof requirements] ||
      requirements.default;

    const scoreMap = { bronze: 50, silver: 65, gold: 80, platinum: 90 };
    const currentScore =
      scoreMap[certificationLevel as keyof typeof scoreMap] || 0;

    return {
      compliant: currentScore >= requirement.minScore,
      required: requirement.required,
      minScore: requirement.minScore,
      currentScore,
      gap: Math.max(0, requirement.minScore - currentScore),
    };
  },
};
