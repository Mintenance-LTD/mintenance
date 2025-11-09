import { ImageAnnotatorClient } from '@google-cloud/vision';
import { logger } from '@mintenance/shared';
import { getGoogleVisionConfig, validateGoogleVisionConfig } from '@/lib/config/google-vision.config';

export interface ImageAnalysisResult {
  labels: Array<{ description: string; score: number }>;
  objects: Array<{ name: string; score: number }>;
  text: string[];
  detectedFeatures: string[];
  propertyType?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  complexity?: 'simple' | 'moderate' | 'complex';
  suggestedCategories: Array<{ category: string; confidence: number; reason: string }>;
  estimatedCostFactors: {
    sizeMultiplier: number;
    complexityMultiplier: number;
    conditionMultiplier: number;
  };
  confidence: number;
}

/**
 * Cache entry for image analysis results
 */
interface CacheEntry {
  result: ImageAnalysisResult;
  timestamp: number;
  expiresAt: number;
}

/**
 * Service for analyzing property images using Google Cloud Vision API
 */
export class ImageAnalysisService {
  private static client: ImageAnnotatorClient | null = null;
  
  // Simple in-memory cache with TTL (24 hours)
  private static cache: Map<string, CacheEntry> = new Map();
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly MAX_CACHE_SIZE = 100; // Maximum number of cached entries

  /**
   * Initialize the Vision API client
   */
  private static getClient(): ImageAnnotatorClient | null {
    if (this.client) {
      return this.client;
    }

    const config = getGoogleVisionConfig();
    const validation = validateGoogleVisionConfig();

    if (!validation.valid) {
      logger.warn('Google Vision API not configured', { error: validation.error });
      return null;
    }

    try {
      if (config.credentialsPath) {
        // Use service account credentials file
        this.client = new ImageAnnotatorClient({
          keyFilename: config.credentialsPath,
        });
      } else if (config.apiKey) {
        // Note: @google-cloud/vision client doesn't support API key directly
        // For API key usage, we would need to use REST API
        // For now, we'll use Application Default Credentials if available
        // Set GOOGLE_APPLICATION_CREDENTIALS environment variable or use ADC
        this.client = new ImageAnnotatorClient();
        logger.warn('Using Application Default Credentials. For API key, use REST API or set GOOGLE_APPLICATION_CREDENTIALS');
      } else {
        // Try Application Default Credentials (ADC)
        this.client = new ImageAnnotatorClient();
      }

      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Google Vision client', { error });
      return null;
    }
  }

  /**
   * Generate cache key from image URLs
   */
  private static getCacheKey(imageUrls: string[]): string {
    // Create a hash-like key from sorted URLs
    const sortedUrls = [...imageUrls].sort().join('|');
    return `image_analysis:${sortedUrls.substring(0, 200)}`; // Limit key length
  }

  /**
   * Get cached result if available and not expired
   */
  private static getCachedResult(cacheKey: string): ImageAnalysisResult | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Store result in cache
   */
  private static setCachedResult(cacheKey: string, result: ImageAnalysisResult): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * Analyze property images and extract relevant information
   */
  static async analyzePropertyImages(
    imageUrls: string[],
    limit: number = 5
  ): Promise<ImageAnalysisResult | null> {
    if (!imageUrls || imageUrls.length === 0) {
      return null;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(imageUrls);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      logger.debug('Image analysis cache hit', { imageCount: imageUrls.length });
      return cachedResult;
    }

    const client = this.getClient();
    if (!client) {
      logger.warn('Google Vision API not configured, skipping image analysis');
      return null;
    }

    // Limit number of images to analyze (cost optimization)
    const imagesToAnalyze = imageUrls.slice(0, limit);

    try {
      const allLabels: Map<string, number> = new Map();
      const allObjects: Map<string, number> = new Map();
      const allText: string[] = [];
      const detectedFeatures: string[] = [];

      // Analyze each image
      for (const imageUrl of imagesToAnalyze) {
        try {
          const [labelResult] = await client.labelDetection({ image: { source: { imageUri: imageUrl } } });
          const objectLocalizationResult = client.objectLocalization
            ? await client.objectLocalization({ image: { source: { imageUri: imageUrl } } })
            : null;
          const objectResult = objectLocalizationResult ? objectLocalizationResult[0] : null;
          const [textResult] = await client.textDetection({ image: { source: { imageUri: imageUrl } } });

          // Process labels
          if (labelResult.labelAnnotations) {
            labelResult.labelAnnotations.forEach(label => {
              if (label.description && label.score) {
                const existingScore = allLabels.get(label.description) || 0;
                allLabels.set(label.description, Math.max(existingScore, label.score));
              }
            });
          }

          // Process objects
          if (objectResult?.localizedObjectAnnotations) {
            objectResult.localizedObjectAnnotations.forEach((obj: any) => {
              if (obj.name && obj.score) {
                const existingScore = allObjects.get(obj.name) || 0;
                allObjects.set(obj.name, Math.max(existingScore, obj.score));
              }
            });
          }

          // Process text (OCR)
          if (textResult.textAnnotations && textResult.textAnnotations.length > 0) {
            // Skip the first annotation (full text block)
            const textLines = textResult.textAnnotations.slice(1).map(ann => ann.description || '').filter(Boolean);
            allText.push(...textLines);
          }
        } catch (error) {
          logger.warn('Failed to analyze image', { imageUrl, error });
          // Continue with other images
        }
      }

      // Convert maps to arrays and sort by score
      const labels = Array.from(allLabels.entries())
        .map(([description, score]) => ({ description, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Top 20 labels

      const objects = Array.from(allObjects.entries())
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 15); // Top 15 objects

      // Extract detected features relevant to maintenance/repair
      const maintenanceKeywords = this.extractMaintenanceFeatures(labels, objects, allText);

      // Determine property type, condition, and complexity
      const propertyType = this.detectPropertyType(labels, objects);
      const condition = this.assessCondition(labels, objects, allText);
      const complexity = this.assessComplexity(labels, objects, allText);

      // Suggest categories based on visual evidence
      const suggestedCategories = this.suggestCategoriesFromImages(labels, objects, allText);

      // Estimate cost factors
      const estimatedCostFactors = this.estimateCostFactors(condition, complexity, propertyType);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(labels, objects);

      const result: ImageAnalysisResult = {
        labels,
        objects,
        text: allText,
        detectedFeatures: maintenanceKeywords,
        propertyType,
        condition,
        complexity,
        suggestedCategories,
        estimatedCostFactors,
        confidence,
      };

      // Cache the result
      this.setCachedResult(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('Image analysis failed', { 
        error, 
        imageUrls: imagesToAnalyze.length,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return null on error (graceful degradation)
      // The caller will fall back to text-only analysis
      return null;
    }
  }

  /**
   * Clear the cache (useful for testing or manual cache invalidation)
   */
  static clearCache(): void {
    this.cache.clear();
    logger.info('Image analysis cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  /**
   * Extract maintenance-related features from analysis results
   */
  private static extractMaintenanceFeatures(
    labels: Array<{ description: string; score: number }>,
    objects: Array<{ name: string; score: number }>,
    text: string[]
  ): string[] {
    const features: string[] = [];
    const allTerms = [
      ...labels.map(l => l.description.toLowerCase()),
      ...objects.map(o => o.name.toLowerCase()),
      ...text.map(t => t.toLowerCase()),
    ].join(' ');

    // Damage indicators
    const damageKeywords = [
      'broken', 'cracked', 'damaged', 'leak', 'leaking', 'rust', 'rusty',
      'stain', 'stained', 'mold', 'mildew', 'water damage', 'hole', 'holes',
      'worn', 'faded', 'peeling', 'chipped', 'missing', 'loose',
    ];

    damageKeywords.forEach(keyword => {
      if (allTerms.includes(keyword)) {
        features.push(keyword);
      }
    });

    // Property features
    const propertyFeatures = [
      'window', 'door', 'roof', 'wall', 'floor', 'ceiling', 'pipe', 'pipe',
      'faucet', 'sink', 'toilet', 'bathroom', 'kitchen', 'electrical outlet',
      'light fixture', 'heating', 'cooling', 'ventilation',
    ];

    propertyFeatures.forEach(feature => {
      if (allTerms.includes(feature)) {
        features.push(feature);
      }
    });

    return Array.from(new Set(features)).slice(0, 15); // Limit to 15 features
  }

  /**
   * Detect property type from images
   */
  private static detectPropertyType(
    labels: Array<{ description: string; score: number }>,
    objects: Array<{ name: string; score: number }>
  ): string | undefined {
    const allTerms = [
      ...labels.map(l => l.description.toLowerCase()),
      ...objects.map(o => o.name.toLowerCase()),
    ].join(' ');

    if (allTerms.includes('apartment') || allTerms.includes('flat')) {
      return 'apartment';
    }
    if (allTerms.includes('house') || allTerms.includes('home')) {
      return 'house';
    }
    if (allTerms.includes('commercial') || allTerms.includes('office')) {
      return 'commercial';
    }

    return undefined;
  }

  /**
   * Assess property condition from visual evidence
   */
  private static assessCondition(
    labels: Array<{ description: string; score: number }>,
    objects: Array<{ name: string; score: number }>,
    text: string[]
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const allTerms = [
      ...labels.map(l => l.description.toLowerCase()),
      ...objects.map(o => o.name.toLowerCase()),
      ...text.map(t => t.toLowerCase()),
    ].join(' ');

    const poorIndicators = ['broken', 'damaged', 'cracked', 'rust', 'mold', 'water damage', 'hole'];
    const fairIndicators = ['worn', 'faded', 'stain', 'old', 'dated'];
    const goodIndicators = ['clean', 'well-maintained', 'modern', 'new'];

    const poorCount = poorIndicators.filter(indicator => allTerms.includes(indicator)).length;
    const fairCount = fairIndicators.filter(indicator => allTerms.includes(indicator)).length;
    const goodCount = goodIndicators.filter(indicator => allTerms.includes(indicator)).length;

    if (poorCount >= 3) return 'poor';
    if (poorCount >= 1 || fairCount >= 2) return 'fair';
    if (goodCount >= 2) return 'good';
    return 'excellent';
  }

  /**
   * Assess job complexity from visual evidence
   */
  private static assessComplexity(
    labels: Array<{ description: string; score: number }>,
    objects: Array<{ name: string; score: number }>,
    text: string[]
  ): 'simple' | 'moderate' | 'complex' {
    const allTerms = [
      ...labels.map(l => l.description.toLowerCase()),
      ...objects.map(o => o.name.toLowerCase()),
      ...text.map(t => t.toLowerCase()),
    ].join(' ');

    const complexIndicators = [
      'multiple', 'extensive', 'major', 'renovation', 'installation',
      'replacement', 'structural', 'electrical system', 'plumbing system',
    ];
    const simpleIndicators = ['simple', 'quick', 'minor', 'small', 'single'];

    const complexCount = complexIndicators.filter(indicator => allTerms.includes(indicator)).length;
    const simpleCount = simpleIndicators.filter(indicator => allTerms.includes(indicator)).length;

    if (complexCount >= 2) return 'complex';
    if (simpleCount >= 2) return 'simple';
    return 'moderate';
  }

  /**
   * Suggest job categories based on visual analysis
   */
  private static suggestCategoriesFromImages(
    labels: Array<{ description: string; score: number }>,
    objects: Array<{ name: string; score: number }>,
    text: string[]
  ): Array<{ category: string; confidence: number; reason: string }> {
    const allTerms = [
      ...labels.map(l => l.description.toLowerCase()),
      ...objects.map(o => o.name.toLowerCase()),
      ...text.map(t => t.toLowerCase()),
    ].join(' ');

    const categoryMappings: Record<string, { keywords: string[]; weight: number }> = {
      plumbing: {
        keywords: ['pipe', 'faucet', 'sink', 'toilet', 'bathroom', 'water', 'leak', 'drain', 'plumber'],
        weight: 1.0,
      },
      electrical: {
        keywords: ['outlet', 'switch', 'light', 'wiring', 'electrical', 'circuit', 'breaker', 'socket'],
        weight: 1.0,
      },
      roofing: {
        keywords: ['roof', 'gutter', 'shingle', 'tile', 'chimney', 'eaves', 'flashing'],
        weight: 1.0,
      },
      painting: {
        keywords: ['wall', 'paint', 'ceiling', 'brush', 'roller', 'decorating'],
        weight: 0.8,
      },
      carpentry: {
        keywords: ['door', 'window', 'cabinet', 'shelf', 'wood', 'frame', 'furniture'],
        weight: 0.9,
      },
      hvac: {
        keywords: ['heating', 'cooling', 'ventilation', 'air conditioning', 'thermostat', 'boiler'],
        weight: 1.0,
      },
      flooring: {
        keywords: ['floor', 'carpet', 'tile', 'laminate', 'wooden floor'],
        weight: 0.9,
      },
      cleaning: {
        keywords: ['clean', 'window', 'carpet', 'vacuum', 'dust'],
        weight: 0.7,
      },
      gardening: {
        keywords: ['garden', 'lawn', 'tree', 'plant', 'hedge', 'fence', 'landscaping'],
        weight: 0.8,
      },
    };

    const categoryScores: Record<string, { score: number; matchedKeywords: string[] }> = {};

    Object.entries(categoryMappings).forEach(([category, config]) => {
      const matchedKeywords = config.keywords.filter(keyword => allTerms.includes(keyword));
      if (matchedKeywords.length > 0) {
        categoryScores[category] = {
          score: matchedKeywords.length * config.weight,
          matchedKeywords,
        };
      }
    });

    // Sort by score and return top categories
    return Object.entries(categoryScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([category, data]) => ({
        category,
        confidence: Math.min(95, Math.round((data.score / 5) * 100)), // Normalize to 0-95%
        reason: `Detected ${data.matchedKeywords.slice(0, 3).join(', ')}`,
      }));
  }

  /**
   * Estimate cost factors based on condition and complexity
   */
  private static estimateCostFactors(
    condition: 'excellent' | 'good' | 'fair' | 'poor',
    complexity: 'simple' | 'moderate' | 'complex',
    propertyType?: string
  ): {
    sizeMultiplier: number;
    complexityMultiplier: number;
    conditionMultiplier: number;
  } {
    const conditionMultipliers = {
      excellent: 1.0,
      good: 1.1,
      fair: 1.3,
      poor: 1.6,
    };

    const complexityMultipliers = {
      simple: 0.8,
      moderate: 1.0,
      complex: 1.5,
    };

    const sizeMultipliers = {
      apartment: 0.9,
      house: 1.0,
      commercial: 1.2,
    };

    return {
      sizeMultiplier: propertyType ? sizeMultipliers[propertyType as keyof typeof sizeMultipliers] || 1.0 : 1.0,
      complexityMultiplier: complexityMultipliers[complexity],
      conditionMultiplier: conditionMultipliers[condition],
    };
  }

  /**
   * Calculate overall confidence in image analysis
   */
  private static calculateConfidence(
    labels: Array<{ description: string; score: number }>,
    objects: Array<{ name: string; score: number }>
  ): number {
    if (labels.length === 0 && objects.length === 0) {
      return 0;
    }

    // Average confidence from top labels and objects
    const topLabels = labels.slice(0, 5);
    const topObjects = objects.slice(0, 5);

    const avgLabelScore = topLabels.length > 0
      ? topLabels.reduce((sum, l) => sum + l.score, 0) / topLabels.length
      : 0;

    const avgObjectScore = topObjects.length > 0
      ? topObjects.reduce((sum, o) => sum + o.score, 0) / topObjects.length
      : 0;

    // Weighted average (labels are more reliable)
    const confidence = (avgLabelScore * 0.6 + avgObjectScore * 0.4) * 100;

    return Math.min(95, Math.max(30, Math.round(confidence)));
  }
}

