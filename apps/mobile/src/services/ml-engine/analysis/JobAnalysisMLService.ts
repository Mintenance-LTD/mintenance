/**
 * Job Analysis ML Service
 *
 * Handles job complexity analysis, text/NLP processing, and image analysis.
 * Part of the domain-separated ML engine architecture.
 *
 * @filesize Target: <500 lines
 * @compliance Architecture principles - Domain separation, single responsibility
 */

import { mlCoreService } from '../core/MLCoreService';
import { circuitBreakerManager } from '../../../utils/circuitBreaker';

export interface JobComplexityResult {
  overallComplexity: number;
  factors: {
    textComplexity: number;
    skillRequirements: number;
    timeEstimate: number;
    materialComplexity: number;
    riskLevel: number;
  };
  recommendations: string[];
  confidenceScore: number;
}

export interface NLPAnalysisResult {
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  skillsDetected: string[];
  materialsMentioned: string[];
  estimatedDuration: {
    hours: number;
    confidence: number;
  };
}

export interface ImageAnalysisResult {
  damageAssessment: {
    severity: 'minor' | 'moderate' | 'severe';
    type: string[];
    confidence: number;
  };
  materialIdentification: string[];
  toolsRequired: string[];
  safetyRequirements: string[];
}

interface JobAnalysisInput {
  title: string;
  description: string;
  category: string;
  budget?: number;
  images?: string[];
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Job Analysis ML Service
 *
 * Provides ML-powered job analysis including complexity scoring,
 * NLP text analysis, and image-based damage assessment.
 */
export class JobAnalysisMLService {
  private static instance: JobAnalysisMLService;

  /**
   * Get singleton instance
   */
  public static getInstance(): JobAnalysisMLService {
    if (!JobAnalysisMLService.instance) {
      JobAnalysisMLService.instance = new JobAnalysisMLService();
    }
    return JobAnalysisMLService.instance;
  }

  /**
   * Analyze job complexity using ML models
   */
  public async analyzeJobComplexity(input: JobAnalysisInput): Promise<JobComplexityResult> {
    await mlCoreService.initialize();

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('job_complexity_analysis');

    return circuitBreaker.execute(async () => {
      // Prepare input features for ML model
      const features = await this._extractComplexityFeatures(input);
      const inputData = [features];

      // Execute ML prediction
      const result = await mlCoreService.executePrediction(
        'complexity',
        inputData,
        (results: number[]) => this._processComplexityResults(results, input)
      );

      return result;
    });
  }

  /**
   * Perform NLP analysis on job text
   */
  public async analyzeJobText(title: string, description: string): Promise<NLPAnalysisResult> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('nlp_text_analysis');

    return circuitBreaker.execute(async () => {
      // Text preprocessing
      const processedText = this._preprocessText(title + ' ' + description);

      // Extract features
      const features = await this._extractTextFeatures(processedText);

      // Perform analysis
      const keywords = this._extractKeywords(processedText);
      const sentiment = this._analyzeSentiment(processedText);
      const urgency = this._detectUrgency(processedText);
      const skillsDetected = this._detectSkills(processedText);
      const materialsMentioned = this._detectMaterials(processedText);
      const estimatedDuration = this._estimateDuration(processedText, features);

      return {
        keywords,
        sentiment,
        urgency,
        skillsDetected,
        materialsMentioned,
        estimatedDuration,
      };
    });
  }

  /**
   * Analyze job images for damage assessment
   */
  public async analyzeJobImages(imageUrls: string[]): Promise<ImageAnalysisResult> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('image_analysis');

    return circuitBreaker.execute(async () => {
      // For now, return mock analysis - real implementation would use computer vision
      return {
        damageAssessment: {
          severity: 'moderate',
          type: ['water_damage', 'structural'],
          confidence: 0.85,
        },
        materialIdentification: ['drywall', 'insulation', 'wood_framing'],
        toolsRequired: ['moisture_meter', 'saw', 'drill'],
        safetyRequirements: ['safety_glasses', 'dust_mask'],
      };
    });
  }

  /**
   * Get job recommendations based on analysis
   */
  public async getJobRecommendations(
    complexityResult: JobComplexityResult,
    nlpResult: NLPAnalysisResult
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Complexity-based recommendations
    if (complexityResult.overallComplexity > 0.8) {
      recommendations.push('Consider hiring a licensed professional for this complex job');
      recommendations.push('Multiple site visits may be required');
    }

    if (complexityResult.factors.riskLevel > 0.7) {
      recommendations.push('Ensure proper safety equipment and procedures');
    }

    // Urgency-based recommendations
    if (nlpResult.urgency === 'high') {
      recommendations.push('This appears to be an urgent repair - prioritize quick response');
    }

    // Skills-based recommendations
    if (nlpResult.skillsDetected.includes('electrical')) {
      recommendations.push('Electrical work detected - ensure contractor is licensed');
    }

    if (nlpResult.skillsDetected.includes('plumbing')) {
      recommendations.push('Plumbing work detected - check local permit requirements');
    }

    return recommendations;
  }

  /**
   * Extract complexity features from job input
   */
  private async _extractComplexityFeatures(input: JobAnalysisInput): Promise<number[]> {
    const features: number[] = [];

    // Text complexity features
    const textLength = (input.title + ' ' + input.description).length;
    features.push(Math.min(textLength / 1000, 1)); // Normalized text length

    // Category complexity mapping
    const categoryComplexity = this._getCategoryComplexity(input.category);
    features.push(categoryComplexity);

    // Budget indicator
    const budgetIndicator = input.budget ? Math.min(input.budget / 10000, 1) : 0.5;
    features.push(budgetIndicator);

    // Skill requirements (detected from text)
    const skillComplexity = this._calculateSkillComplexity(input.description);
    features.push(skillComplexity);

    // Image count indicator
    const imageCount = input.images?.length || 0;
    features.push(Math.min(imageCount / 10, 1));

    // Pad to expected input size (24 features)
    while (features.length < 24) {
      features.push(0);
    }

    return features.slice(0, 24);
  }

  /**
   * Process ML complexity results
   */
  private _processComplexityResults(
    results: number[],
    input: JobAnalysisInput
  ): JobComplexityResult {
    // ML model returns 5 outputs: overall, text, skills, time, materials, risk
    const [overall, textComplexity, skillRequirements, timeEstimate, materialComplexity, riskLevel] = results;

    const factors = {
      textComplexity: textComplexity || 0.5,
      skillRequirements: skillRequirements || 0.5,
      timeEstimate: timeEstimate || 0.5,
      materialComplexity: materialComplexity || 0.5,
      riskLevel: riskLevel || 0.3,
    };

    const recommendations = this._generateComplexityRecommendations(factors);
    const confidenceScore = this._calculateConfidenceScore(results);

    return {
      overallComplexity: overall || 0.5,
      factors,
      recommendations,
      confidenceScore,
    };
  }

  /**
   * Preprocess text for analysis
   */
  private _preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract text features for ML processing
   */
  private async _extractTextFeatures(text: string): Promise<number[]> {
    const words = text.split(' ');
    const features: number[] = [];

    // Basic text statistics
    features.push(words.length); // Word count
    features.push(text.length); // Character count
    features.push(words.filter(w => w.length > 6).length); // Complex words

    // Keyword presence indicators
    const skillKeywords = ['electrical', 'plumbing', 'hvac', 'roofing', 'flooring'];
    const urgencyKeywords = ['urgent', 'emergency', 'asap', 'immediately'];
    const materialKeywords = ['wood', 'metal', 'concrete', 'drywall', 'tile'];

    features.push(this._countKeywordMatches(text, skillKeywords));
    features.push(this._countKeywordMatches(text, urgencyKeywords));
    features.push(this._countKeywordMatches(text, materialKeywords));

    return features;
  }

  /**
   * Extract keywords from text
   */
  private _extractKeywords(text: string): string[] {
    const words = text.split(' ');
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Analyze text sentiment
   */
  private _analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'beautiful'];
    const negativeWords = ['broken', 'damaged', 'urgent', 'emergency', 'bad', 'terrible'];

    const positiveCount = this._countKeywordMatches(text, positiveWords);
    const negativeCount = this._countKeywordMatches(text, negativeWords);

    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  }

  /**
   * Detect urgency level
   */
  private _detectUrgency(text: string): 'low' | 'medium' | 'high' {
    const highUrgencyKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'broken'];
    const mediumUrgencyKeywords = ['soon', 'quick', 'fast', 'repair'];

    const highCount = this._countKeywordMatches(text, highUrgencyKeywords);
    const mediumCount = this._countKeywordMatches(text, mediumUrgencyKeywords);

    if (highCount > 0) return 'high';
    if (mediumCount > 0) return 'medium';
    return 'low';
  }

  /**
   * Detect skills mentioned in text
   */
  private _detectSkills(text: string): string[] {
    const skillKeywords = {
      electrical: ['electrical', 'electric', 'wiring', 'outlet', 'switch'],
      plumbing: ['plumbing', 'pipe', 'leak', 'faucet', 'toilet', 'drain'],
      hvac: ['heating', 'cooling', 'hvac', 'furnace', 'air conditioning'],
      roofing: ['roof', 'roofing', 'shingle', 'gutter'],
      flooring: ['floor', 'flooring', 'tile', 'carpet', 'hardwood'],
      painting: ['paint', 'painting', 'wall', 'ceiling'],
      carpentry: ['wood', 'cabinet', 'door', 'window', 'frame'],
    };

    const detectedSkills: string[] = [];

    for (const [skill, keywords] of Object.entries(skillKeywords)) {
      if (this._countKeywordMatches(text, keywords) > 0) {
        detectedSkills.push(skill);
      }
    }

    return detectedSkills;
  }

  /**
   * Detect materials mentioned in text
   */
  private _detectMaterials(text: string): string[] {
    const materials = ['wood', 'metal', 'concrete', 'drywall', 'tile', 'carpet', 'vinyl', 'stone', 'brick'];

    return materials.filter(material => text.includes(material));
  }

  /**
   * Estimate job duration
   */
  private _estimateDuration(text: string, features: number[]): { hours: number; confidence: number } {
    // Simple heuristic-based estimation
    const wordCount = features[0] || 0;
    const complexityIndicators = features[3] || 0; // skill keywords

    let baseHours = 2; // Minimum job duration

    // Adjust based on text complexity
    baseHours += Math.min(wordCount / 50, 8);

    // Adjust based on skill complexity
    baseHours += complexityIndicators * 4;

    // Urgency detection might indicate simpler jobs
    if (text.includes('quick') || text.includes('simple')) {
      baseHours *= 0.7;
    }

    return {
      hours: Math.round(baseHours),
      confidence: 0.7, // Medium confidence for heuristic-based estimation
    };
  }

  /**
   * Get category complexity score
   */
  private _getCategoryComplexity(category: string): number {
    const complexityMap: Record<string, number> = {
      electrical: 0.9,
      plumbing: 0.8,
      hvac: 0.9,
      roofing: 0.8,
      flooring: 0.6,
      painting: 0.4,
      carpentry: 0.7,
      general: 0.5,
    };

    return complexityMap[category.toLowerCase()] || 0.5;
  }

  /**
   * Calculate skill complexity from description
   */
  private _calculateSkillComplexity(description: string): number {
    const complexSkills = ['electrical', 'plumbing', 'hvac', 'structural'];
    const matches = this._countKeywordMatches(description.toLowerCase(), complexSkills);

    return Math.min(matches / 4, 1); // Normalize to 0-1
  }

  /**
   * Count keyword matches in text
   */
  private _countKeywordMatches(text: string, keywords: string[]): number {
    return keywords.reduce((count, keyword) => {
      return count + (text.includes(keyword) ? 1 : 0);
    }, 0);
  }

  /**
   * Generate complexity-based recommendations
   */
  private _generateComplexityRecommendations(factors: JobComplexityResult['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.skillRequirements > 0.8) {
      recommendations.push('High skill requirements - ensure contractor has relevant experience');
    }

    if (factors.timeEstimate > 0.8) {
      recommendations.push('Extended project timeline - plan for multiple visits');
    }

    if (factors.materialComplexity > 0.7) {
      recommendations.push('Complex materials required - verify contractor has access to supplies');
    }

    if (factors.riskLevel > 0.7) {
      recommendations.push('High risk project - ensure proper insurance and safety measures');
    }

    return recommendations;
  }

  /**
   * Calculate confidence score from ML results
   */
  private _calculateConfidenceScore(results: number[]): number {
    // Simple confidence calculation based on result variance
    const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
    const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;

    // Lower variance = higher confidence
    return Math.max(0.5, 1 - variance);
  }
}

// Export singleton instance
export const jobAnalysisMLService = JobAnalysisMLService.getInstance();