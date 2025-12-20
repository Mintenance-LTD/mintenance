import { logger } from '@mintenance/shared';
import { ImageAnalysisService, ImageAnalysisResult } from './ImageAnalysisService';

export interface JobAnalysisResult {
  suggestedCategory: string;
  suggestedBudget: {
    min: number;
    max: number;
    recommended: number;
  };
  suggestedTimeline: {
    minDays: number;
    maxDays: number;
    urgency: 'low' | 'medium' | 'high';
  };
  confidence: number;
  reasoning: string[];
  detectedKeywords: string[];
  imageAnalysis?: {
    detectedFeatures: string[];
    propertyType?: string;
    condition?: string;
    complexity?: string;
    confidence: number;
  };
}

/**
 * Service to analyze job descriptions and suggest category, budget, and timeline
 */
export class JobAnalysisService {
  /**
   * Analyze job with both text and images
   */
  static async analyzeJobWithImages(
    title: string,
    description: string,
    imageUrls?: string[],
    location?: string
  ): Promise<JobAnalysisResult> {
    // Perform text analysis
    const textAnalysis = await this.analyzeJobDescription(title, description, location);

    // Perform image analysis if images are provided
    let imageAnalysis: ImageAnalysisResult | null = null;
    if (imageUrls && imageUrls.length > 0) {
      try {
        imageAnalysis = await ImageAnalysisService.analyzePropertyImages(imageUrls);
      } catch (error) {
        logger.warn('Image analysis failed, falling back to text-only', { error });
      }
    }

    // Combine results if image analysis is available
    if (imageAnalysis) {
      return this.combineAnalyses(textAnalysis, imageAnalysis);
    }

    return textAnalysis;
  }

  /**
   * Combine text and image analysis results
   */
  private static combineAnalyses(
    textAnalysis: JobAnalysisResult,
    imageAnalysis: ImageAnalysisResult
  ): JobAnalysisResult {
    // Merge category suggestions with weighted scoring
    const categoryScores: Record<string, number> = {};

    // Text analysis contributes 60% weight
    categoryScores[textAnalysis.suggestedCategory] = (textAnalysis.confidence / 100) * 0.6;

    // Image analysis contributes 40% weight
    imageAnalysis.suggestedCategories.forEach(imgCat => {
      const currentScore = categoryScores[imgCat.category] || 0;
      categoryScores[imgCat.category] = currentScore + (imgCat.confidence / 100) * 0.4;
    });

    // Find best category
    const sortedCategories = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    const combinedCategory = sortedCategories[0][0];

    // Adjust budget based on image analysis factors
    const imageMultipliers = imageAnalysis.estimatedCostFactors;
    const combinedMultiplier =
      imageMultipliers.complexityMultiplier *
      imageMultipliers.conditionMultiplier *
      imageMultipliers.sizeMultiplier;

    const adjustedBudget = {
      min: Math.round(textAnalysis.suggestedBudget.min * combinedMultiplier),
      max: Math.round(textAnalysis.suggestedBudget.max * combinedMultiplier),
      recommended: Math.round(textAnalysis.suggestedBudget.recommended * combinedMultiplier),
    };

    // Adjust timeline based on image complexity
    let adjustedTimeline = { ...textAnalysis.suggestedTimeline };
    if (imageAnalysis.complexity === 'complex') {
      adjustedTimeline = {
        ...adjustedTimeline,
        minDays: Math.ceil(adjustedTimeline.minDays * 1.3),
        maxDays: Math.ceil(adjustedTimeline.maxDays * 1.5),
      };
    } else if (imageAnalysis.complexity === 'simple') {
      adjustedTimeline = {
        ...adjustedTimeline,
        minDays: Math.max(1, Math.floor(adjustedTimeline.minDays * 0.8)),
        maxDays: Math.ceil(adjustedTimeline.maxDays * 0.9),
      };
    }

    // Calculate combined confidence (weighted average)
    const combinedConfidence = Math.round(
      textAnalysis.confidence * 0.6 + imageAnalysis.confidence * 0.4
    );

    // Merge reasoning
    const combinedReasoning = [...textAnalysis.reasoning];
    if (imageAnalysis.detectedFeatures.length > 0) {
      combinedReasoning.push(
        `Image analysis detected: ${imageAnalysis.detectedFeatures.slice(0, 5).join(', ')}`
      );
    }
    if (imageAnalysis.condition) {
      combinedReasoning.push(`Property condition: ${imageAnalysis.condition}`);
    }
    if (imageAnalysis.complexity) {
      combinedReasoning.push(`Job complexity: ${imageAnalysis.complexity}`);
    }

    // Merge keywords
    const combinedKeywords = [
      ...textAnalysis.detectedKeywords,
      ...imageAnalysis.detectedFeatures.map(f => `image_${f}`),
    ];

    return {
      suggestedCategory: combinedCategory,
      suggestedBudget: adjustedBudget,
      suggestedTimeline: adjustedTimeline,
      confidence: combinedConfidence,
      reasoning: combinedReasoning,
      detectedKeywords: Array.from(new Set(combinedKeywords)),
      imageAnalysis: {
        detectedFeatures: imageAnalysis.detectedFeatures,
        propertyType: imageAnalysis.propertyType,
        condition: imageAnalysis.condition,
        complexity: imageAnalysis.complexity,
        confidence: imageAnalysis.confidence,
      },
    };
  }

  /**
   * Analyze job description and return suggestions
   */
  static async analyzeJobDescription(
    title: string,
    description: string,
    location?: string
  ): Promise<JobAnalysisResult> {
    try {
      const text = `${title} ${description}`.toLowerCase();
      
      // Extract keywords
      const detectedKeywords = this.extractKeywords(text);
      
      // Suggest category based on keywords
      const suggestedCategory = this.suggestCategory(text, detectedKeywords);
      
      // Estimate budget based on category and description
      const suggestedBudget = this.estimateBudget(suggestedCategory, text, detectedKeywords);
      
      // Estimate timeline based on complexity and urgency
      const suggestedTimeline = this.estimateTimeline(text, detectedKeywords, suggestedCategory);
      
      // Calculate confidence based on keyword matches
      const confidence = this.calculateConfidence(detectedKeywords, suggestedCategory);
      
      // Generate reasoning
      const reasoning = this.generateReasoning(
        suggestedCategory,
        suggestedBudget,
        suggestedTimeline,
        detectedKeywords
      );

      return {
        suggestedCategory,
        suggestedBudget,
        suggestedTimeline,
        confidence,
        reasoning,
        detectedKeywords: Array.from(new Set(detectedKeywords)), // Remove duplicates
      };
    } catch (error) {
      logger.error('Job analysis failed', { error, service: 'job-analysis' });
      
      // Return safe defaults
      return {
        suggestedCategory: 'general',
        suggestedBudget: {
          min: 100,
          max: 500,
          recommended: 300,
        },
        suggestedTimeline: {
          minDays: 1,
          maxDays: 7,
          urgency: 'medium',
        },
        confidence: 0,
        reasoning: ['Unable to analyze job description'],
        detectedKeywords: [],
      };
    }
  }

  /**
   * Extract relevant keywords from text
   */
  private static extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // Category keywords
    const categoryKeywords: Record<string, string[]> = {
      plumbing: ['plumber', 'plumbing', 'pipe', 'leak', 'water', 'drain', 'toilet', 'sink', 'faucet', 'shower', 'bath', 'tap', 'sewer', 'blocked'],
      electrical: ['electrician', 'electrical', 'wiring', 'circuit', 'outlet', 'light', 'power', 'switch', 'fuse', 'breaker', 'socket', 'lamp', 'bulb'],
      hvac: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac', 'boiler', 'radiator', 'thermostat', 'ventilation'],
      roofing: ['roof', 'roofing', 'gutter', 'shingle', 'tile', 'chimney', 'skylight', 'eaves', 'flashing'],
      painting: ['paint', 'painting', 'wall', 'ceiling', 'decorating', 'brush', 'roller', 'primer', 'coat'],
      carpentry: ['carpenter', 'carpentry', 'wood', 'cabinet', 'door', 'frame', 'shelf', 'furniture', 'joinery'],
      gardening: ['garden', 'gardening', 'lawn', 'hedge', 'tree', 'plant', 'mowing', 'landscaping', 'fence'],
      cleaning: ['clean', 'cleaning', 'window', 'carpet', 'deep clean', 'spring clean', 'vacuum'],
      flooring: ['floor', 'flooring', 'carpet', 'tile', 'laminate', 'wooden floor', 'parquet'],
      heating: ['heating', 'boiler', 'radiator', 'heater', 'gas', 'central heating', 'thermostat'],
    };

    // Check for category keywords
    Object.entries(categoryKeywords).forEach(([category, terms]) => {
      if (terms.some(term => text.includes(term))) {
        keywords.push(category);
        keywords.push(...terms.filter(term => text.includes(term)).slice(0, 3));
      }
    });

    // Urgency keywords
    const urgencyKeywords = {
      emergency: ['emergency', 'urgent', 'immediate', 'asap', 'as soon as possible', 'broken', 'flooding', 'no power', 'no heat', 'dangerous'],
      high: ['urgent', 'soon', 'quickly', 'need help', 'broken', 'not working', 'urgently'],
      medium: ['when possible', 'next week', 'sometime'],
      low: ['whenever', 'no rush', 'flexible', 'eventually'],
    };

    Object.entries(urgencyKeywords).forEach(([urgency, terms]) => {
      if (terms.some(term => text.includes(term))) {
        keywords.push(`urgency_${urgency}`);
      }
    });

    // Complexity keywords
    const complexityKeywords = {
      complex: ['complex', 'difficult', 'extensive', 'major', 'renovation', 'replace', 'install', 'new'],
      simple: ['simple', 'quick', 'easy', 'minor', 'small', 'fix', 'repair', 'replace'],
    };

    Object.entries(complexityKeywords).forEach(([complexity, terms]) => {
      if (terms.some(term => text.includes(term))) {
        keywords.push(`complexity_${complexity}`);
      }
    });

    // Size/scale keywords
    const sizeKeywords = {
      large: ['large', 'big', 'entire', 'whole', 'all', 'multiple', 'several'],
      small: ['small', 'one', 'single', 'little'],
    };

    Object.entries(sizeKeywords).forEach(([size, terms]) => {
      if (terms.some(term => text.includes(term))) {
        keywords.push(`size_${size}`);
      }
    });

    return keywords;
  }

  /**
   * Suggest category based on text analysis
   */
  private static suggestCategory(text: string, keywords: string[]): string {
    // Category scoring
    const categoryScores: Record<string, number> = {
      plumbing: 0,
      electrical: 0,
      hvac: 0,
      roofing: 0,
      painting: 0,
      carpentry: 0,
      gardening: 0,
      cleaning: 0,
      flooring: 0,
      heating: 0,
      handyman: 0,
    };

    // Score based on keyword matches
    keywords.forEach(keyword => {
      if (categoryScores.hasOwnProperty(keyword)) {
        categoryScores[keyword] += 2;
      }
    });

    // Additional scoring based on text patterns
    const categoryPatterns: Record<string, RegExp[]> = {
      plumbing: [/leak/i, /water/i, /pipe/i, /drain/i, /toilet/i, /sink/i, /faucet/i],
      electrical: [/power/i, /wiring/i, /light/i, /outlet/i, /switch/i, /fuse/i, /circuit/i],
      hvac: [/heating/i, /cooling/i, /air/i, /temperature/i, /boiler/i, /furnace/i],
      roofing: [/roof/i, /gutter/i, /shingle/i, /chimney/i],
      painting: [/paint/i, /wall/i, /ceiling/i, /decorat/i],
      carpentry: [/wood/i, /cabinet/i, /door/i, /shelf/i, /furniture/i],
      gardening: [/garden/i, /lawn/i, /hedge/i, /tree/i, /plant/i],
      cleaning: [/clean/i, /window/i, /carpet/i],
      flooring: [/floor/i, /carpet/i, /tile/i, /laminate/i],
      heating: [/boiler/i, /radiator/i, /heater/i, /gas/i],
    };

    Object.entries(categoryPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(text)) {
          categoryScores[category] += 1;
        }
      });
    });

    // Find highest scoring category
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1]);

    const topCategory = sortedCategories[0];
    
    // Return top category if score > 0, otherwise 'handyman' as default
    return topCategory[1] > 0 ? topCategory[0] : 'handyman';
  }

  /**
   * Estimate budget based on category and complexity
   */
  private static estimateBudget(
    category: string,
    text: string,
    keywords: string[]
  ): { min: number; max: number; recommended: number } {
    // Base budgets by category (in GBP)
    const baseBudgets: Record<string, { min: number; max: number }> = {
      plumbing: { min: 80, max: 500 },
      electrical: { min: 100, max: 800 },
      hvac: { min: 150, max: 1200 },
      roofing: { min: 200, max: 2000 },
      painting: { min: 150, max: 1000 },
      carpentry: { min: 100, max: 1500 },
      gardening: { min: 50, max: 400 },
      cleaning: { min: 60, max: 300 },
      flooring: { min: 200, max: 2500 },
      heating: { min: 150, max: 1500 },
      handyman: { min: 80, max: 500 },
    };

    const base = baseBudgets[category] || baseBudgets.handyman;
    
    // Adjust for complexity
    const isComplex = keywords.some(k => k.includes('complex') || k.includes('major') || k.includes('extensive'));
    const isSimple = keywords.some(k => k.includes('simple') || k.includes('quick') || k.includes('minor'));
    const isLarge = keywords.some(k => k.includes('size_large') || k.includes('entire') || k.includes('whole'));
    const isSmall = keywords.some(k => k.includes('size_small') || k.includes('one') || k.includes('single'));

    let multiplier = 1.0;
    
    if (isComplex || isLarge) {
      multiplier = 2.0;
    } else if (isSimple || isSmall) {
      multiplier = 0.6;
    }

    // Adjust for emergency/urgent (premium pricing)
    const isEmergency = keywords.some(k => k.includes('urgency_emergency') || k.includes('urgency_high'));
    if (isEmergency) {
      multiplier *= 1.5;
    }

    const min = Math.round(base.min * multiplier);
    const max = Math.round(base.max * multiplier);
    const recommended = Math.round((min + max) / 2);

    return {
      min: Math.max(50, min), // Minimum £50
      max: Math.min(5000, max), // Maximum £5000 for suggestions
      recommended: Math.max(100, Math.min(3000, recommended)),
    };
  }

  /**
   * Estimate timeline based on complexity and urgency
   */
  private static estimateTimeline(
    text: string,
    keywords: string[],
    category: string
  ): { minDays: number; maxDays: number; urgency: 'low' | 'medium' | 'high' } {
    // Base timelines by category (in days)
    const baseTimelines: Record<string, { min: number; max: number }> = {
      plumbing: { min: 1, max: 3 },
      electrical: { min: 1, max: 5 },
      hvac: { min: 2, max: 7 },
      roofing: { min: 3, max: 14 },
      painting: { min: 2, max: 7 },
      carpentry: { min: 2, max: 10 },
      gardening: { min: 1, max: 3 },
      cleaning: { min: 1, max: 2 },
      flooring: { min: 3, max: 10 },
      heating: { min: 2, max: 7 },
      handyman: { min: 1, max: 5 },
    };

    const base = baseTimelines[category] || baseTimelines.handyman;

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (keywords.some(k => k.includes('urgency_emergency'))) {
      urgency = 'high';
    } else if (keywords.some(k => k.includes('urgency_high'))) {
      urgency = 'high';
    } else if (keywords.some(k => k.includes('urgency_low'))) {
      urgency = 'low';
    }

    // Adjust timeline based on complexity
    const isComplex = keywords.some(k => k.includes('complex') || k.includes('major') || k.includes('extensive'));
    const isSimple = keywords.some(k => k.includes('simple') || k.includes('quick') || k.includes('minor'));

    let minDays = base.min;
    let maxDays = base.max;

    if (isComplex) {
      minDays = Math.ceil(base.min * 1.5);
      maxDays = Math.ceil(base.max * 2);
    } else if (isSimple) {
      minDays = Math.max(1, Math.floor(base.min * 0.5));
      maxDays = Math.ceil(base.max * 0.7);
    }

    // Emergency jobs should be faster
    if (urgency === 'high') {
      minDays = Math.max(1, Math.floor(minDays * 0.5));
      maxDays = Math.ceil(maxDays * 0.7);
    }

    return {
      minDays: Math.max(1, minDays),
      maxDays: Math.max(minDays, maxDays),
      urgency,
    };
  }

  /**
   * Calculate confidence score (0-100)
   */
  private static calculateConfidence(keywords: string[], category: string): number {
    if (keywords.length === 0) {
      return 30; // Low confidence if no keywords
    }

    // Base confidence
    let confidence = 50;

    // Increase confidence for category-specific keywords
    const categoryKeywords = keywords.filter(k => k === category);
    confidence += categoryKeywords.length * 15;

    // Increase confidence for multiple keyword matches
    confidence += Math.min(30, keywords.length * 5);

    // Increase confidence if urgency/complexity detected
    if (keywords.some(k => k.includes('urgency_') || k.includes('complexity_'))) {
      confidence += 10;
    }

    return Math.min(95, Math.max(30, confidence));
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(
    category: string,
    budget: { min: number; max: number; recommended: number },
    timeline: { minDays: number; maxDays: number; urgency: string },
    keywords: string[]
  ): string[] {
    const reasons: string[] = [];

    // Category reasoning
    const categoryNames: Record<string, string> = {
      plumbing: 'Plumbing',
      electrical: 'Electrical',
      hvac: 'HVAC',
      roofing: 'Roofing',
      painting: 'Painting & Decorating',
      carpentry: 'Carpentry',
      gardening: 'Gardening',
      cleaning: 'Cleaning',
      flooring: 'Flooring',
      heating: 'Heating & Gas',
      handyman: 'Handyman',
    };

    reasons.push(`Detected ${categoryNames[category] || category} work based on keywords in your description`);

    // Budget reasoning
    if (budget.recommended >= 1000) {
      reasons.push(`Estimated budget: £${budget.min.toLocaleString()}-£${budget.max.toLocaleString()} (recommended: £${budget.recommended.toLocaleString()}) - Complex or extensive work detected`);
    } else {
      reasons.push(`Estimated budget: £${budget.min.toLocaleString()}-£${budget.max.toLocaleString()} (recommended: £${budget.recommended.toLocaleString()})`);
    }

    // Timeline reasoning
    if (timeline.urgency === 'high') {
      reasons.push(`Urgent timeline: ${timeline.minDays}-${timeline.maxDays} days - Emergency indicators detected`);
    } else if (timeline.minDays === timeline.maxDays) {
      reasons.push(`Estimated timeline: ${timeline.minDays} day${timeline.minDays > 1 ? 's' : ''}`);
    } else {
      reasons.push(`Estimated timeline: ${timeline.minDays}-${timeline.maxDays} days`);
    }

    // Additional insights
    if (keywords.some(k => k.includes('complex'))) {
      reasons.push('Complexity: High - May require specialist skills or materials');
    }

    return reasons;
  }
}

