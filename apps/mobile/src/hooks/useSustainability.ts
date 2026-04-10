import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sustainabilityEngine,
  ESGScore,
  JobSustainabilityAnalysis,
} from '../services/SustainabilityEngine';
import { logger } from '../utils/logger';
import {
  SUSTAINABILITY_KEYS,
  SUSTAINABILITY_ACHIEVEMENTS,
  SUSTAINABILITY_BADGES,
} from './useSustainability/config';
import {
  formatCarbonFootprint,
  formatESGScore,
  formatSustainabilityMetrics,
  formatMaterialSwap,
  getSustainabilityInsights,
  getProgressInsights,
} from './useSustainability/calculations';

// Re-exports for backward compatibility
// Hook for contractor ESG score calculation and retrieval
const useContractorESGScore = (
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
      return await sustainabilityEngine.calculateContractorESGScore(
        contractorId
      );
    },
    enabled: Boolean(contractorId),
    staleTime: 24 * 60 * 60 * 1000,
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
const useJobSustainabilityAnalysis = (
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
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for sustainable material alternatives
const useSustainableMaterials = (originalMaterials: string[]) => {
  return useQuery({
    queryKey: SUSTAINABILITY_KEYS.materialAlternatives(originalMaterials),
    queryFn: async () => {
      return await sustainabilityEngine.getSustainableMaterialAlternatives(
        originalMaterials
      );
    },
    enabled: originalMaterials.length > 0,
    staleTime: 30 * 60 * 1000,
  });
};

// Hook for carbon footprint calculation
const useCarbonFootprintCalculator = () => {
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
const useSustainabilityRanking = (location: string, category?: string) => {
  return useQuery({
    queryKey: SUSTAINABILITY_KEYS.ranking(location, category),
    queryFn: async () => {
      return await sustainabilityEngine.getContractorSustainabilityRanking(
        location,
        category
      );
    },
    enabled: Boolean(location),
    staleTime: 15 * 60 * 1000,
  });
};

// Hook for tracking sustainability progress
const useSustainabilityProgress = (
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
    staleTime: 60 * 60 * 1000,
  });
};

// Hook for sustainability insights and formatting
const useSustainabilityFormatters = () => {
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
const useSustainabilityGamification = (_contractorId: string) => {
  const achievements = SUSTAINABILITY_ACHIEVEMENTS;
  const badges = SUSTAINABILITY_BADGES;

  const calculateLevel = (esgScore: number) => {
    const badge = [...badges].reverse().find((b) => esgScore >= b.threshold);
    return badge || badges[0];
  };

  const getNextMilestone = (currentScore: number) => {
    const nextBadge = badges.find((b) => currentScore < b.threshold);
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
const sustainabilityUtils = {
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
