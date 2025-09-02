import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiPricingEngine, JobPricingInput, PricingAnalysis } from '../services/AIPricingEngine';
import { logger } from '../utils/logger';

export interface PricingState {
  analysis: PricingAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

export const useAIPricing = () => {
  const [pricingState, setPricingState] = useState<PricingState>({
    analysis: null,
    isLoading: false,
    error: null
  });

  const queryClient = useQueryClient();

  // Mutation for analyzing pricing
  const analyzeJobPricing = useMutation({
    mutationFn: async (input: JobPricingInput) => {
      logger.info('Analyzing job pricing with AI', { category: input.category });
      return aiPricingEngine.analyzePricing(input);
    },
    onMutate: () => {
      setPricingState(prev => ({ ...prev, isLoading: true, error: null }));
    },
    onSuccess: (analysis) => {
      setPricingState({
        analysis,
        isLoading: false,
        error: null
      });
      logger.info('AI pricing analysis successful', { 
        optimal: analysis.suggestedPrice.optimal,
        confidence: analysis.confidence 
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Pricing analysis failed';
      setPricingState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      logger.error('AI pricing analysis failed', error);
    }
  });

  // Get pricing suggestions for a job
  const getPricingSuggestions = useCallback(async (input: JobPricingInput): Promise<PricingAnalysis> => {
    try {
      const result = await analyzeJobPricing.mutateAsync(input);
      return result;
    } catch (error) {
      logger.error('Failed to get pricing suggestions', error);
      throw error;
    }
  }, [analyzeJobPricing]);

  // Cache pricing analysis for quick access
  const useCachedPricing = (jobId: string) => {
    return useQuery({
      queryKey: ['pricing', jobId],
      queryFn: async () => {
        // This would typically fetch from your API
        return pricingState.analysis;
      },
      enabled: !!pricingState.analysis,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Invalidate pricing cache when job details change
  const invalidatePricing = useCallback((jobId: string) => {
    queryClient.invalidateQueries({ queryKey: ['pricing', jobId] });
  }, [queryClient]);

  // Get quick price estimate (simplified version)
  const getQuickEstimate = useCallback(async (category: string, location: string, urgency?: 'low' | 'medium' | 'high') => {
    const quickInput: JobPricingInput = {
      title: `${category} service`,
      description: `Basic ${category} work`,
      category,
      location,
      urgency
    };

    try {
      const analysis = await aiPricingEngine.analyzePricing(quickInput);
      return {
        priceRange: `£${analysis.suggestedPrice.min} - £${analysis.suggestedPrice.max}`,
        optimal: analysis.suggestedPrice.optimal,
        confidence: analysis.confidence
      };
    } catch (error) {
      logger.warn('Quick estimate fallback', error);
      // Fallback to basic pricing
      const baseRates: Record<string, number> = {
        'plumbing': 180,
        'electrical': 200,
        'painting': 150,
        'carpentry': 160,
        'cleaning': 80,
        'gardening': 120,
        'handyman': 140,
        'roofing': 220,
        'heating': 240,
        'flooring': 200
      };
      
      const basePrice = baseRates[category] || 140;
      return {
        priceRange: `£${Math.round(basePrice * 0.8)} - £${Math.round(basePrice * 1.3)}`,
        optimal: basePrice,
        confidence: 0.6
      };
    }
  }, []);

  // Format pricing for display
  const formatPricing = useCallback((analysis: PricingAnalysis) => {
    return {
      priceRange: `£${analysis.suggestedPrice.min} - £${analysis.suggestedPrice.max}`,
      optimal: `£${analysis.suggestedPrice.optimal}`,
      confidence: `${Math.round(analysis.confidence * 100)}%`,
      complexityLabel: analysis.complexity.charAt(0).toUpperCase() + analysis.complexity.slice(1),
      topFactors: analysis.factors
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        .slice(0, 3)
        .map(factor => ({
          name: factor.name,
          impact: factor.impact > 0 ? 'increases' : 'decreases',
          description: factor.description
        }))
    };
  }, []);

  // Get pricing recommendations for contractors
  const getContractorRecommendations = useCallback((analysis: PricingAnalysis, contractorProfile?: any) => {
    const recommendations = [...analysis.recommendations];

    // Add contractor-specific recommendations
    if (contractorProfile?.rating && contractorProfile.rating > 4.5) {
      recommendations.push('Your high rating justifies premium pricing');
    }

    if (contractorProfile?.completedJobs && contractorProfile.completedJobs < 10) {
      recommendations.push('Consider competitive pricing to build your reputation');
    }

    if (analysis.confidence < 0.6) {
      recommendations.push('Request more job details for accurate pricing');
    }

    return recommendations;
  }, []);

  // Get homeowner pricing insights
  const getHomeownerInsights = useCallback((analysis: PricingAnalysis, userBudget?: number) => {
    const insights = [];

    if (userBudget && userBudget < analysis.suggestedPrice.min) {
      insights.push({
        type: 'warning',
        message: `Your budget may be below market rate. Consider £${analysis.suggestedPrice.min}+`
      });
    } else if (userBudget && userBudget > analysis.suggestedPrice.max) {
      insights.push({
        type: 'success',
        message: 'Your budget is generous and should attract quality contractors'
      });
    } else {
      insights.push({
        type: 'info',
        message: 'Your budget is within the expected market range'
      });
    }

    if (analysis.complexity === 'complex' || analysis.complexity === 'specialist') {
      insights.push({
        type: 'info',
        message: 'This job requires specialized skills - expect premium pricing'
      });
    }

    if (analysis.marketData.demandLevel === 'high') {
      insights.push({
        type: 'warning',
        message: 'High demand for this service may result in higher quotes'
      });
    }

    return insights;
  }, []);

  return {
    // State
    analysis: pricingState.analysis,
    isLoading: pricingState.isLoading || analyzeJobPricing.isPending,
    error: pricingState.error,

    // Actions
    analyzePricing: analyzeJobPricing.mutate,
    getPricingSuggestions,
    getQuickEstimate,
    invalidatePricing,

    // Utilities
    formatPricing,
    getContractorRecommendations,
    getHomeownerInsights,

    // Query hooks
    useCachedPricing,
  };
};