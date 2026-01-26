import { getCsrfToken } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import toast from 'react-hot-toast';
export interface AIAnalysisResult {
  suggestedPrice?: {
    min: number;
    max: number;
    confidence: number;
  };
  estimatedDuration?: string;
  skillsRequired?: string[];
  similarJobs?: Array<{
    id: string;
    title: string;
    price: number;
  }>;
  riskFactors?: string[];
  recommendations?: string[];
}
export interface BuildingSurveyResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  defectsFound?: number;
  defects?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    location?: string;
  }>;
  estimatedCost?: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: string[];
  reportUrl?: string;
}
export class AIAnalysisService {
  private static instance: AIAnalysisService;
  private constructor() {}
  static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }
  async analyzeJob(
    jobData: {
      title: string;
      description: string;
      category: string;
      urgency: string;
      images?: string[];
    }
  ): Promise<AIAnalysisResult | null> {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          title: jobData.title,
          description: jobData.description,
          category: jobData.category,
          urgency: jobData.urgency,
          hasImages: (jobData.images?.length || 0) > 0,
        }),
      });
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      const result = await response.json();
      logger.info('Job AI analysis completed', {
        hasSuggestedPrice: !!result.suggestedPrice,
        hasEstimatedDuration: !!result.estimatedDuration,
        skillsCount: result.skillsRequired?.length || 0,
      });
      return result;
    } catch (error) {
      logger.error('Failed to analyze job with AI', { error });
      toast.error('AI analysis failed. You can still continue without it.');
      return null;
    }
  }
  async runBuildingSurvey(
    images: string[],
    propertyType: string,
    description: string
  ): Promise<BuildingSurveyResult | null> {
    if (!images || images.length === 0) {
      toast.error('Please upload images for building survey');
      return null;
    }
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/maintenance/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          images: images.slice(0, 5), // Limit to first 5 images
          propertyType,
          description,
        }),
      });
      if (!response.ok) {
        throw new Error(`Building survey failed: ${response.statusText}`);
      }
      const result = await response.json();
      logger.info('Building survey completed', {
        defectsFound: result.defectsFound || 0,
        status: result.status,
        hasEstimate: !!result.estimatedCost,
      });
      if (result.defectsFound > 0) {
        toast.warning(
          `${result.defectsFound} potential issue${result.defectsFound !== 1 ? 's' : ''} detected`
        );
      } else {
        toast.success('Building survey completed - no major issues found');
      }
      return result;
    } catch (error) {
      logger.error('Failed to run building survey', { error });
      toast.error('Building survey failed. You can still continue without it.');
      return null;
    }
  }
  async geocodeLocation(
    address: string,
    city: string,
    postcode: string
  ): Promise<{
    verified: boolean;
    formattedAddress?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    confidence?: number;
  } | null> {
    try {
      const fullAddress = `${address}, ${city}, ${postcode}`;
      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ address: fullAddress }),
      });
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }
      const result = await response.json();
      logger.info('Location geocoded successfully', {
        verified: result.verified,
        hasCoordinates: !!result.coordinates,
      });
      return result;
    } catch (error) {
      logger.error('Failed to geocode location', { error });
      // Silent fail - geocoding is not critical
      return null;
    }
  }
  async validateJobData(jobData: unknown): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    // Required fields validation
    if (!jobData.title || jobData.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }
    if (!jobData.description || jobData.description.length < 20) {
      errors.push('Description must be at least 20 characters');
    }
    if (!jobData.category) {
      errors.push('Please select a category');
    }
    if (!jobData.location.postcode) {
      errors.push('Postcode is required');
    }
    // Budget validation
    const minBudget = parseFloat(jobData.budget.min);
    const maxBudget = parseFloat(jobData.budget.max);
    if (minBudget && maxBudget && minBudget > maxBudget) {
      errors.push('Minimum budget cannot exceed maximum budget');
    }
    if (minBudget && minBudget < 50) {
      warnings.push('Very low budget may limit contractor interest');
    }
    // Timeline validation
    if (jobData.timeline.startDate && jobData.timeline.endDate) {
      const start = new Date(jobData.timeline.startDate);
      const end = new Date(jobData.timeline.endDate);
      if (start > end) {
        errors.push('End date must be after start date');
      }
      if (start < new Date()) {
        warnings.push('Start date is in the past');
      }
    }
    // Image recommendations
    if (jobData.images.length === 0) {
      warnings.push('Adding images significantly increases contractor engagement');
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}