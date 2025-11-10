import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { AdaptiveUpdateEngine } from '../agents/AdaptiveUpdateEngine';
import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  DamageSeverity,
  UrgencyLevel,
  SafetyHazardSeverity,
  ComplianceSeverity,
  PremiumImpact,
} from './types';
import type { ContinuumMemoryConfig, MemoryQueryResult } from '../ml-engine/memory/types';

/**
 * Building Surveyor Service
 * 
 * Uses GPT-4 Vision to analyze building damage photos and provide
 * comprehensive assessments including:
 * - Damage detection (early/midway/full)
 * - Safety hazard identification
 * - Compliance flags
 * - Insurance risk scoring
 * - Urgency classification
 * - Homeowner-friendly explanations
 * - Contractor technical advice
 */
export class BuildingSurveyorService {
  private static memorySystemInitialized = false;
  private static readonly AGENT_NAME = 'building-surveyor';
  private static adaptiveEngine: AdaptiveUpdateEngine | null = null;

  /**
   * Initialize adaptive update engine
   */
  private static async initializeAdaptiveEngine(): Promise<void> {
    if (!this.adaptiveEngine) {
      this.adaptiveEngine = new AdaptiveUpdateEngine({
        agentName: this.AGENT_NAME,
      });
    }
  }

  /**
   * Trigger self-modification when accuracy drops
   */
  private static async triggerSelfModification(accuracyDrop: number): Promise<void> {
    await this.initializeAdaptiveEngine();

    logger.info('BuildingSurveyorService self-modification triggered', {
      agentName: this.AGENT_NAME,
      accuracyDrop,
    });

    if (this.adaptiveEngine) {
      await this.adaptiveEngine.recordPerformance(1 - accuracyDrop);
    }
  }

  /**
   * Initialize continuum memory system for building surveyor
   */
  private static async initializeMemorySystem(): Promise<void> {
    if (this.memorySystemInitialized) return;

    await this.initializeAdaptiveEngine();

    try {
      const config: ContinuumMemoryConfig = {
        agentName: this.AGENT_NAME,
        defaultChunkSize: 10,
        defaultLearningRate: 0.001,
        levels: [
          {
            level: 0,
            frequency: 1, // Updates every assessment
            chunkSize: 10,
            learningRate: 0.01,
            mlpConfig: {
              inputSize: 40,
              hiddenSizes: [64, 32],
              outputSize: 5, // [damage_type_adjustment, severity_adjustment, cost_adjustment, urgency_adjustment, confidence_calibration]
              activation: 'relu',
            },
          },
          {
            level: 1,
            frequency: 16, // Updates daily (assuming ~16 assessments/day)
            chunkSize: 100,
            learningRate: 0.005,
            mlpConfig: {
              inputSize: 40,
              hiddenSizes: [128, 64],
              outputSize: 5,
              activation: 'relu',
            },
          },
          {
            level: 2,
            frequency: 1000000, // Updates weekly (low frequency)
            chunkSize: 1000,
            learningRate: 0.001,
            mlpConfig: {
              inputSize: 40,
              hiddenSizes: [256, 128, 64],
              outputSize: 5,
              activation: 'relu',
            },
          },
        ],
      };

      await memoryManager.getOrCreateMemorySystem(config);
      this.memorySystemInitialized = true;

      logger.info('BuildingSurveyorService memory system initialized', {
        agentName: this.AGENT_NAME,
        levels: config.levels.length,
      });
    } catch (error) {
      logger.error('Failed to initialize memory system', error, {
        service: 'BuildingSurveyorService',
      });
      // Continue with fallback behavior
    }
  }

  /**
   * Extract detection features from images and context
   * Returns 40-dimension feature vector normalized to 0-1 range
   */
  private static async extractDetectionFeatures(
    imageUrls: string[],
    context?: AssessmentContext,
    assessment?: Phase1BuildingAssessment
  ): Promise<number[]> {
    const features: number[] = [];

    // 1. Property context (5 features)
    const propertyType = context?.propertyType || 'residential';
    features.push(propertyType === 'residential' ? 1.0 : propertyType === 'commercial' ? 0.5 : 0.0);
    features.push(Math.min(1.0, (context?.ageOfProperty || 50) / 200)); // Normalized age
    features.push(this.encodeLocation(context?.location || '')); // Encoded location
    features.push(this.encodeBuildingStyle(context?.propertyDetails || '')); // Encoded style
    features.push(0.5); // Property value tier (placeholder, can be enhanced)

    // 2. Image features (5 features)
    features.push(Math.min(1.0, imageUrls.length / 4)); // Image count normalized
    features.push(0.7); // Image quality (placeholder)
    features.push(0.6); // Lighting conditions (placeholder)
    features.push(0.5); // Photo angle diversity (placeholder)
    features.push(0.8); // Damage visibility (placeholder)

    // 3. Damage characteristics (10 features)
    if (assessment) {
      features.push(this.encodeDamageType(assessment.damageAssessment.damageType));
      const severityValue = assessment.damageAssessment.severity === 'early' ? 0.33 : 
                           assessment.damageAssessment.severity === 'midway' ? 0.66 : 1.0;
      features.push(severityValue);
      features.push(assessment.damageAssessment.confidence / 100);
      features.push(this.encodeDamageLocation(assessment.damageAssessment.location));
      features.push(0.5); // Size indicators (placeholder)
      features.push(0.5); // Age indicators (placeholder)
      features.push(0.5); // Progression indicators (placeholder)
      features.push(Math.min(1.0, assessment.safetyHazards.hazards.length / 10));
      features.push(Math.min(1.0, assessment.compliance.complianceIssues.length / 10));
      features.push(assessment.insuranceRisk.riskScore / 100);
    } else {
      // Default values when assessment not yet available
      features.push(0.1); // Damage type (unknown)
      features.push(0.5); // Severity (midway)
      features.push(0.5); // Confidence
      features.push(0.5); // Location
      features.push(0.5, 0.5, 0.5, 0.0, 0.0, 0.5); // Placeholders
    }

    // 4. Assessment scores (5 features)
    if (assessment) {
      features.push(assessment.safetyHazards.overallSafetyScore / 100);
      features.push(assessment.compliance.complianceScore / 100);
      features.push(assessment.insuranceRisk.riskScore / 100);
      features.push(this.encodeUrgency(assessment.urgency.urgency));
      features.push(assessment.urgency.priorityScore / 100);
    } else {
      features.push(0.8, 0.8, 0.5, 0.5, 0.5); // Default scores
    }

    // 5. Cost features (5 features)
    if (assessment?.contractorAdvice?.estimatedCost) {
      const cost = assessment.contractorAdvice.estimatedCost;
      features.push(Math.min(1.0, cost.min / 10000));
      features.push(Math.min(1.0, cost.max / 10000));
      features.push(Math.min(1.0, cost.recommended / 10000));
      features.push(Math.min(1.0, (cost.max - cost.min) / 10000));
      const complexityValue = assessment.contractorAdvice.complexity === 'low' ? 0.33 :
                            assessment.contractorAdvice.complexity === 'medium' ? 0.66 : 1.0;
      features.push(complexityValue);
    } else {
      features.push(0.3, 0.5, 0.4, 0.2, 0.5); // Default cost features
    }

    // 6. Temporal features (5 features)
    const now = new Date();
    features.push((now.getMonth() / 11) * 0.25 + (now.getDate() / 30) * 0.25); // Time of year
    features.push(0.5); // Weather context (placeholder)
    features.push(0.0); // Assessment frequency (placeholder)
    features.push(0.0); // Days since first detection (placeholder)
    features.push(0.0); // Follow-up indicator (0 = initial)

    // 7. Historical patterns (5 features)
    features.push(0.0); // User's past assessment count (placeholder)
    features.push(0.0); // User's past damage types (placeholder)
    features.push(0.0); // Regional damage patterns (placeholder)
    features.push(0.0); // Property-specific patterns (placeholder)
    features.push(0.0); // Contractor feedback patterns (placeholder)

    // Ensure exactly 40 features
    while (features.length < 40) {
      features.push(0.0);
    }

    return features.slice(0, 40);
  }

  /**
   * Encode location string to 0-1 value
   */
  private static encodeLocation(location: string): number {
    if (!location) return 0.5;
    // Simple hash-based encoding
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = ((hash << 5) - hash) + location.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  }

  /**
   * Encode building style from property details
   */
  private static encodeBuildingStyle(propertyDetails: string): number {
    if (!propertyDetails) return 0.5;
    const details = propertyDetails.toLowerCase();
    if (details.includes('victorian') || details.includes('period')) return 0.2;
    if (details.includes('modern') || details.includes('contemporary')) return 0.8;
    if (details.includes('new build')) return 0.9;
    return 0.5;
  }

  /**
   * Encode damage type to 0-1 value
   */
  private static encodeDamageType(damageType: string): number {
    const types: Record<string, number> = {
      'water_damage': 0.1,
      'structural_crack': 0.2,
      'damp': 0.3,
      'roof_damage': 0.4,
      'electrical_issue': 0.5,
      'plumbing_issue': 0.6,
      'foundation_issue': 0.7,
      'mold': 0.8,
      'fire_damage': 0.9,
      'unknown_damage': 0.0,
    };
    return types[damageType] || 0.0;
  }

  /**
   * Encode damage location to 0-1 value
   */
  private static encodeDamageLocation(location: string): number {
    const loc = location.toLowerCase();
    if (loc.includes('ceiling')) return 0.1;
    if (loc.includes('wall')) return 0.2;
    if (loc.includes('floor')) return 0.3;
    if (loc.includes('roof')) return 0.4;
    if (loc.includes('basement')) return 0.5;
    if (loc.includes('foundation')) return 0.6;
    return 0.5;
  }

  /**
   * Encode urgency level to 0-1 value
   */
  private static encodeUrgency(urgency: UrgencyLevel): number {
    const values: Record<UrgencyLevel, number> = {
      'immediate': 1.0,
      'urgent': 0.8,
      'soon': 0.6,
      'planned': 0.4,
      'monitor': 0.2,
    };
    return values[urgency] || 0.5;
  }

  /**
   * Assess building damage from photos using GPT-4 Vision
   * Enhanced with nested learning memory adjustments
   */
  static async assessDamage(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<Phase1BuildingAssessment> {
    try {
      // Initialize memory system
      await this.initializeMemorySystem();

      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured', {
          service: 'BuildingSurveyorService',
        });
        throw new Error('AI assessment service is not configured');
      }

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('At least one image is required for assessment');
      }

      // Extract features before GPT-4 call (without assessment data)
      const features = await this.extractDetectionFeatures(imageUrls, context);

      // Query memory for learned adjustments
      let memoryAdjustments: number[] = [0, 0, 0, 0, 0]; // Default: no adjustments
      try {
        const memoryResults: MemoryQueryResult[] = [];
        for (let level = 0; level < 3; level++) {
          const result = await memoryManager.query(this.AGENT_NAME, features, level);
          if (result.values && result.values.length === 5) {
            memoryResults.push(result);
          }
        }

        // Combine adjustments from all levels (weighted by confidence)
        if (memoryResults.length > 0) {
          let totalWeight = 0;
          const combined = [0, 0, 0, 0, 0];
          for (const result of memoryResults) {
            const weight = result.confidence;
            totalWeight += weight;
            for (let i = 0; i < 5; i++) {
              combined[i] += result.values[i] * weight;
            }
          }
          if (totalWeight > 0) {
            for (let i = 0; i < 5; i++) {
              memoryAdjustments[i] = combined[i] / totalWeight;
            }
          }
        }
      } catch (memoryError) {
        logger.warn('Memory query failed, continuing without adjustments', {
          service: 'BuildingSurveyorService',
          error: memoryError,
        });
      }

      // Limit to 4 images (GPT-4 Vision limit)
      const imagesToAnalyze = imageUrls.slice(0, 4);

      // Prepare GPT-4 Vision request
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(context);

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imagesToAnalyze.map((url) => ({
              type: 'image_url',
              image_url: { url, detail: 'high' },
            })),
          ],
        },
      ];

      // Call GPT-4 Vision API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Using gpt-4o for vision
          messages,
          max_tokens: 2000,
          temperature: 0.1, // Low temperature for factual analysis
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI API error', {
          service: 'BuildingSurveyorService',
          status: response.status,
          error: errorText,
        });
        throw new Error(`AI assessment failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';

      // Parse JSON response
      let aiResponse: any;
      try {
        aiResponse = JSON.parse(content);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response', {
          service: 'BuildingSurveyorService',
          content: content.substring(0, 500),
        });
        throw new Error('Failed to parse AI assessment response');
      }

      // Structure into Phase1BuildingAssessment
      let assessment = this.structureAssessment(aiResponse);

      // Apply memory adjustments
      assessment = this.applyMemoryAdjustments(assessment, memoryAdjustments);

      logger.info('Building assessment completed', {
        service: 'BuildingSurveyorService',
        imageCount: imagesToAnalyze.length,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        urgency: assessment.urgency.urgency,
        adjustmentsApplied: memoryAdjustments.some(a => Math.abs(a) > 0.01),
      });

      return assessment;
    } catch (error) {
      logger.error('Error assessing building damage', error, {
        service: 'BuildingSurveyorService',
      });
      throw error;
    }
  }

  /**
   * Build system prompt for GPT-4 Vision
   */
  private static buildSystemPrompt(): string {
    return `You are a professional UK building surveyor with expertise in residential and commercial property inspections. Your role is to analyze building damage photos and provide comprehensive assessments.

You must analyze photos and provide a detailed JSON assessment with the following structure:

{
  "damageType": "string (e.g., 'water_damage', 'structural_crack', 'damp', 'roof_damage', 'electrical_issue', etc.)",
  "severity": "early" | "midway" | "full",
  "confidence": number (0-100),
  "location": "string (specific location in building)",
  "description": "string (detailed description of damage)",
  "detectedItems": ["array", "of", "specific", "items", "detected"],
  "safetyHazards": [
    {
      "type": "string (e.g., 'electrical_hazard', 'structural_risk', 'fire_hazard', etc.)",
      "severity": "low" | "medium" | "high" | "critical",
      "location": "string",
      "description": "string",
      "immediateAction": "string (if critical)",
      "urgency": "immediate" | "urgent" | "soon" | "planned" | "monitor"
    }
  ],
  "complianceIssues": [
    {
      "issue": "string (e.g., 'potential_electrical_non_compliance', 'building_regulation_violation', etc.)",
      "regulation": "string (e.g., 'Part P', 'Building Regulations', etc.)",
      "severity": "info" | "warning" | "violation",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "riskFactors": [
    {
      "factor": "string",
      "severity": "low" | "medium" | "high",
      "impact": "string (how this affects insurance)"
    }
  ],
  "riskScore": number (0-100),
  "premiumImpact": "none" | "low" | "medium" | "high",
  "mitigationSuggestions": ["array", "of", "suggestions"],
  "urgency": "immediate" | "urgent" | "soon" | "planned" | "monitor",
  "recommendedActionTimeline": "string (e.g., 'Within 24 hours', 'Within 1 week')",
  "estimatedTimeToWorsen": "string (if applicable)",
  "urgencyReasoning": "string (explanation of urgency level)",
  "homeownerExplanation": {
    "whatIsIt": "string (simple explanation of the problem)",
    "whyItHappened": "string (likely causes)",
    "whatToDo": "string (actionable steps)"
  },
  "contractorAdvice": {
    "repairNeeded": ["array", "of", "repair", "steps"],
    "materials": [
      {
        "name": "string",
        "quantity": "string",
        "estimatedCost": number (in GBP)
      }
    ],
    "tools": ["array", "of", "required", "tools"],
    "estimatedTime": "string (e.g., '2-4 hours', '1-2 days')",
    "estimatedCost": {
      "min": number (in GBP),
      "max": number (in GBP),
      "recommended": number (in GBP)
    },
    "complexity": "low" | "medium" | "high"
  }
}

Guidelines:
- Be thorough and accurate in your analysis
- Use UK building regulations and standards
- Prioritize safety hazards - if you see electrical hazards near water, structural risks, or fire hazards, mark them as critical
- Provide realistic cost estimates based on UK market rates
- Use clear, professional language
- If damage is minimal or cosmetic, classify as "early"
- If damage is moderate and progressing, classify as "midway"
- If damage is severe or structural, classify as "full"
- Always consider safety implications when determining urgency
- Be conservative with compliance flags - only flag if you're reasonably certain
- Provide actionable advice for both homeowners and contractors`;
  }

  /**
   * Build user prompt with context
   */
  private static buildUserPrompt(context?: AssessmentContext): string {
    let prompt = `Analyze these building damage photos and provide a comprehensive assessment.\n\n`;

    if (context?.location) {
      prompt += `Location: ${context.location}\n`;
    }

    if (context?.propertyType) {
      prompt += `Property Type: ${context.propertyType}\n`;
    }

    if (context?.ageOfProperty) {
      prompt += `Property Age: ${context.ageOfProperty} years\n`;
    }

    if (context?.propertyDetails) {
      prompt += `Additional Context: ${context.propertyDetails}\n`;
    }

    prompt += `\nPlease analyze all photos carefully and provide a complete assessment following the JSON structure specified.`;

    return prompt;
  }

  /**
   * Structure AI response into Phase1BuildingAssessment
   */
  private static structureAssessment(aiResponse: any): Phase1BuildingAssessment {
    // Validate and normalize severity
    const severity = this.normalizeSeverity(aiResponse.severity);
    const urgency = this.normalizeUrgency(aiResponse.urgency);

    // Calculate safety score
    const safetyHazards = this.processSafetyHazards(aiResponse.safetyHazards || []);
    const overallSafetyScore = this.calculateSafetyScore(safetyHazards.hazards);

    // Process compliance
    const compliance = this.processCompliance(aiResponse.complianceIssues || []);

    // Process insurance risk
    const insuranceRisk = this.processInsuranceRisk(
      aiResponse.riskFactors || [],
      aiResponse.riskScore,
      aiResponse.premiumImpact
    );

    // Process urgency
    const urgencyData = this.processUrgency(aiResponse, urgency);

    // Ensure homeowner explanation exists
    const homeownerExplanation = aiResponse.homeownerExplanation || {
      whatIsIt: aiResponse.description || 'Damage detected in building',
      whyItHappened: 'Requires professional inspection to determine cause',
      whatToDo: 'Contact a qualified contractor for assessment and repair',
    };

    // Ensure contractor advice exists
    const contractorAdvice = aiResponse.contractorAdvice || {
      repairNeeded: ['Professional inspection required', 'Determine root cause', 'Plan repair approach'],
      materials: [],
      tools: [],
      estimatedTime: 'TBD',
      estimatedCost: { min: 0, max: 0, recommended: 0 },
      complexity: 'medium' as const,
    };

    return {
      damageAssessment: {
        damageType: aiResponse.damageType || 'unknown_damage',
        severity,
        confidence: Math.max(0, Math.min(100, aiResponse.confidence || 50)),
        location: aiResponse.location || 'location_not_specified',
        description: aiResponse.description || 'Damage detected',
        detectedItems: Array.isArray(aiResponse.detectedItems)
          ? aiResponse.detectedItems
          : [],
      },
      safetyHazards: {
        hazards: safetyHazards.hazards,
        hasCriticalHazards: safetyHazards.hasCriticalHazards,
        overallSafetyScore,
      },
      compliance,
      insuranceRisk,
      urgency: urgencyData,
      homeownerExplanation,
      contractorAdvice,
    };
  }

  /**
   * Apply memory adjustments to assessment
   * adjustments: [damage_type_adjustment, severity_adjustment, cost_adjustment, urgency_adjustment, confidence_calibration]
   */
  private static applyMemoryAdjustments(
    assessment: Phase1BuildingAssessment,
    adjustments: number[]
  ): Phase1BuildingAssessment {
    const [damageTypeAdj, severityAdj, costAdj, urgencyAdj, confidenceCal] = adjustments;

    // Apply confidence calibration
    const calibratedConfidence = this.calibrateConfidence(
      assessment.damageAssessment.confidence,
      confidenceCal
    );

    // Apply severity adjustment
    const adjustedSeverity = this.applySeverityAdjustment(
      assessment.damageAssessment.severity,
      severityAdj
    );

    // Apply urgency adjustment
    const adjustedUrgency = this.applyUrgency(
      assessment.urgency.urgency,
      urgencyAdj
    );

    // Apply cost adjustment
    const adjustedCost = this.adjustCostEstimate(
      assessment.contractorAdvice.estimatedCost,
      costAdj
    );

    // Create adjusted assessment
    return {
      ...assessment,
      damageAssessment: {
        ...assessment.damageAssessment,
        severity: adjustedSeverity,
        confidence: calibratedConfidence,
      },
      urgency: {
        ...assessment.urgency,
        urgency: adjustedUrgency,
      },
      contractorAdvice: {
        ...assessment.contractorAdvice,
        estimatedCost: adjustedCost,
      },
    };
  }

  /**
   * Apply damage type adjustment (currently not modifying type, but could be enhanced)
   */
  private static applyDamageTypeAdjustment(originalType: string, adjustment: number): string {
    // For now, return original type
    // Future: Could adjust confidence or suggest alternative types
    return originalType;
  }

  /**
   * Apply severity adjustment
   */
  private static applySeverityAdjustment(
    originalSeverity: DamageSeverity,
    adjustment: number
  ): DamageSeverity {
    // Adjustment is in range [-1, 1], where:
    // -1 = downgrade severity (full -> midway -> early)
    // +1 = upgrade severity (early -> midway -> full)
    // 0 = no change

    if (Math.abs(adjustment) < 0.1) {
      return originalSeverity; // No significant adjustment
    }

    const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
    const currentIndex = severityOrder.indexOf(originalSeverity);

    if (adjustment > 0.3) {
      // Upgrade severity
      if (currentIndex < severityOrder.length - 1) {
        return severityOrder[currentIndex + 1];
      }
    } else if (adjustment < -0.3) {
      // Downgrade severity
      if (currentIndex > 0) {
        return severityOrder[currentIndex - 1];
      }
    }

    return originalSeverity;
  }

  /**
   * Calibrate confidence score
   */
  private static calibrateConfidence(originalConfidence: number, calibration: number): number {
    // Calibration is in range [-1, 1], where:
    // -1 = reduce confidence by up to 20%
    // +1 = increase confidence by up to 20%
    // 0 = no change

    const adjustment = calibration * 20; // Max 20% adjustment
    const calibrated = originalConfidence + adjustment;

    return Math.max(0, Math.min(100, calibrated));
  }

  /**
   * Adjust cost estimate
   */
  private static adjustCostEstimate(
    originalCost: { min: number; max: number; recommended: number },
    adjustment: number
  ): { min: number; max: number; recommended: number } {
    // Adjustment is in range [-1, 1], where:
    // -1 = reduce cost by up to 30%
    // +1 = increase cost by up to 30%
    // 0 = no change

    const multiplier = 1 + (adjustment * 0.3); // Max 30% adjustment

    return {
      min: Math.max(0, Math.round(originalCost.min * multiplier)),
      max: Math.max(0, Math.round(originalCost.max * multiplier)),
      recommended: Math.max(0, Math.round(originalCost.recommended * multiplier)),
    };
  }

  /**
   * Adjust urgency level
   */
  private static applyUrgency(originalUrgency: UrgencyLevel, adjustment: number): UrgencyLevel {
    // Adjustment is in range [-1, 1], where:
    // -1 = reduce urgency (immediate -> urgent -> soon -> planned -> monitor)
    // +1 = increase urgency (monitor -> planned -> soon -> urgent -> immediate)
    // 0 = no change

    if (Math.abs(adjustment) < 0.1) {
      return originalUrgency; // No significant adjustment
    }

    const urgencyOrder: UrgencyLevel[] = ['monitor', 'planned', 'soon', 'urgent', 'immediate'];
    const currentIndex = urgencyOrder.indexOf(originalUrgency);

    if (adjustment > 0.3) {
      // Increase urgency
      if (currentIndex < urgencyOrder.length - 1) {
        return urgencyOrder[currentIndex + 1];
      }
    } else if (adjustment < -0.3) {
      // Decrease urgency
      if (currentIndex > 0) {
        return urgencyOrder[currentIndex - 1];
      }
    }

    return originalUrgency;
  }

  /**
   * Learn from human validation outcome
   * Compares original assessment with human-validated assessment and updates memory
   */
  static async learnFromValidation(
    assessmentId: string,
    humanValidatedAssessment: Phase1BuildingAssessment
  ): Promise<void> {
    await this.initializeMemorySystem();

    try {
      // Get original assessment from database
      const { data: assessmentRecord, error } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data, user_id')
        .eq('id', assessmentId)
        .single();

      if (error || !assessmentRecord) {
        logger.warn('Assessment not found for learning', {
          service: 'BuildingSurveyorService',
          assessmentId,
        });
        return;
      }

      const originalAssessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;

      // Get context from database (if available)
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', assessmentId)
        .order('image_index');

      const imageUrls = images?.map(img => img.image_url) || [];
      const context: AssessmentContext = {}; // Could be enhanced to fetch from user profile

      // Extract features (same as query)
      const features = await this.extractDetectionFeatures(
        imageUrls,
        context,
        originalAssessment
      );

      // Calculate surprise signals
      const damageTypeAccuracy = originalAssessment.damageAssessment.damageType ===
        humanValidatedAssessment.damageAssessment.damageType ? 1.0 : 0.0;

      const severityAccuracy = originalAssessment.damageAssessment.severity ===
        humanValidatedAssessment.damageAssessment.severity ? 1.0 : 0.0;

      const confidenceError = Math.abs(
        originalAssessment.damageAssessment.confidence -
        humanValidatedAssessment.damageAssessment.confidence
      ) / 100;

      const costAccuracy = originalAssessment.contractorAdvice?.estimatedCost?.recommended &&
        humanValidatedAssessment.contractorAdvice?.estimatedCost?.recommended
        ? Math.max(-1, Math.min(1, 
            (humanValidatedAssessment.contractorAdvice.estimatedCost.recommended -
             originalAssessment.contractorAdvice.estimatedCost.recommended) /
            originalAssessment.contractorAdvice.estimatedCost.recommended
          ))
        : 0.0;

      const urgencyAccuracy = originalAssessment.urgency.urgency ===
        humanValidatedAssessment.urgency.urgency ? 1.0 : 0.0;

      // Values: [damage_type_accuracy, severity_accuracy, cost_accuracy, urgency_accuracy, confidence_error]
      const values = [
        damageTypeAccuracy,
        severityAccuracy,
        costAccuracy,
        urgencyAccuracy,
        confidenceError,
      ];

      // Add context flow to all memory levels
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            features,
            values,
            level
          );
        } catch (levelError) {
          logger.warn('Failed to add context flow to memory level', {
            service: 'BuildingSurveyorService',
            level,
            error: levelError,
          });
        }
      }

      // Calculate overall accuracy
      const overallAccuracy = (
        damageTypeAccuracy * 0.3 +
        severityAccuracy * 0.25 +
        urgencyAccuracy * 0.15 +
        (1 - Math.min(1, confidenceError)) * 0.1 +
        (1 - Math.min(1, Math.abs(costAccuracy))) * 0.2
      );

      // Trigger self-modification if accuracy is low
      if (overallAccuracy < 0.7) {
        await this.triggerSelfModification(1 - overallAccuracy);
      }

      logger.info('Learning from validation completed', {
        service: 'BuildingSurveyorService',
        assessmentId,
        overallAccuracy,
        damageTypeAccuracy,
        severityAccuracy,
      });
    } catch (error) {
      logger.error('Failed to learn from validation', error, {
        service: 'BuildingSurveyorService',
        assessmentId,
      });
    }
  }

  /**
   * Learn from repair outcome
   * Compares predicted cost/severity/urgency with actual repair outcomes
   */
  static async learnFromRepairOutcome(
    assessmentId: string,
    actualSeverity?: DamageSeverity,
    actualCost?: number,
    actualUrgency?: UrgencyLevel
  ): Promise<void> {
    await this.initializeMemorySystem();

    try {
      // Get original assessment
      const { data: assessmentRecord, error } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data')
        .eq('id', assessmentId)
        .single();

      if (error || !assessmentRecord) {
        logger.warn('Assessment not found for learning', {
          service: 'BuildingSurveyorService',
          assessmentId,
        });
        return;
      }

      const originalAssessment = assessmentRecord.assessment_data as Phase1BuildingAssessment;

      // Get images for feature extraction
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', assessmentId)
        .order('image_index');

      const imageUrls = images?.map(img => img.image_url) || [];
      const features = await this.extractDetectionFeatures(
        imageUrls,
        {},
        originalAssessment
      );

      // Calculate surprise signals
      const severityAccuracy = actualSeverity &&
        originalAssessment.damageAssessment.severity === actualSeverity ? 1.0 : 0.0;

      const costAccuracy = actualCost && originalAssessment.contractorAdvice?.estimatedCost?.recommended
        ? Math.max(-1, Math.min(1,
            (actualCost - originalAssessment.contractorAdvice.estimatedCost.recommended) /
            originalAssessment.contractorAdvice.estimatedCost.recommended
          ))
        : 0.0;

      const urgencyAccuracy = actualUrgency &&
        originalAssessment.urgency.urgency === actualUrgency ? 1.0 : 0.0;

      // Values: [damage_type_accuracy (0), severity_accuracy, cost_accuracy, urgency_accuracy, confidence_error (0)]
      const values = [
        0.0, // Damage type not changed in repair outcome
        severityAccuracy,
        costAccuracy,
        urgencyAccuracy,
        0.0, // Confidence error not applicable for repair outcome
      ];

      // Add context flow to all memory levels
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            features,
            values,
            level
          );
        } catch (levelError) {
          logger.warn('Failed to add context flow to memory level', {
            service: 'BuildingSurveyorService',
            level,
            error: levelError,
          });
        }
      }

      logger.info('Learning from repair outcome completed', {
        service: 'BuildingSurveyorService',
        assessmentId,
        severityAccuracy,
        costAccuracy,
        urgencyAccuracy,
      });
    } catch (error) {
      logger.error('Failed to learn from repair outcome', error, {
        service: 'BuildingSurveyorService',
        assessmentId,
      });
    }
  }

  /**
   * Learn from damage progression
   * Compares original assessment with follow-up assessment to learn progression rates
   */
  static async learnFromProgression(
    originalAssessmentId: string,
    followUpAssessmentId: string
  ): Promise<void> {
    await this.initializeMemorySystem();

    try {
      // Get both assessments
      const { data: originalRecord, error: originalError } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data, created_at')
        .eq('id', originalAssessmentId)
        .single();

      const { data: followUpRecord, error: followUpError } = await serverSupabase
        .from('building_assessments')
        .select('assessment_data, created_at')
        .eq('id', followUpAssessmentId)
        .single();

      if (originalError || !originalRecord || followUpError || !followUpRecord) {
        logger.warn('Assessments not found for progression learning', {
          service: 'BuildingSurveyorService',
          originalAssessmentId,
          followUpAssessmentId,
        });
        return;
      }

      const originalAssessment = originalRecord.assessment_data as Phase1BuildingAssessment;
      const followUpAssessment = followUpRecord.assessment_data as Phase1BuildingAssessment;

      // Calculate time difference
      const originalDate = new Date(originalRecord.created_at);
      const followUpDate = new Date(followUpRecord.created_at);
      const daysDiff = (followUpDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24);

      // Compare severity progression
      const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
      const originalIndex = severityOrder.indexOf(originalAssessment.damageAssessment.severity);
      const followUpIndex = severityOrder.indexOf(followUpAssessment.damageAssessment.severity);

      const severityProgression = followUpIndex > originalIndex ? 1.0 : 
                                 followUpIndex < originalIndex ? -1.0 : 0.0;

      // Get images for feature extraction
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('image_url')
        .eq('assessment_id', originalAssessmentId)
        .order('image_index');

      const imageUrls = images?.map(img => img.image_url) || [];
      const features = await this.extractDetectionFeatures(
        imageUrls,
        {},
        originalAssessment
      );

      // Values: [damage_type_accuracy (0), severity_progression, cost_accuracy (0), urgency_accuracy (0), progression_rate]
      const progressionRate = daysDiff > 0 ? severityProgression / daysDiff : 0.0;
      const values = [
        0.0,
        severityProgression,
        0.0,
        0.0,
        Math.max(-1, Math.min(1, progressionRate)), // Normalized progression rate
      ];

      // Add context flow to all memory levels
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            features,
            values,
            level
          );
        } catch (levelError) {
          logger.warn('Failed to add context flow to memory level', {
            service: 'BuildingSurveyorService',
            level,
            error: levelError,
          });
        }
      }

      logger.info('Learning from progression completed', {
        service: 'BuildingSurveyorService',
        originalAssessmentId,
        followUpAssessmentId,
        severityProgression,
        daysDiff,
      });
    } catch (error) {
      logger.error('Failed to learn from progression', error, {
        service: 'BuildingSurveyorService',
        originalAssessmentId,
        followUpAssessmentId,
      });
    }
  }

  /**
   * Normalize severity to valid type
   */
  private static normalizeSeverity(severity: any): DamageSeverity {
    if (severity === 'early' || severity === 'midway' || severity === 'full') {
      return severity;
    }
    // Default based on string matching
    const s = String(severity).toLowerCase();
    if (s.includes('early') || s.includes('minor') || s.includes('initial')) {
      return 'early';
    }
    if (s.includes('full') || s.includes('severe') || s.includes('complete')) {
      return 'full';
    }
    return 'midway'; // Default
  }

  /**
   * Normalize urgency to valid type
   */
  private static normalizeUrgency(urgency: any): UrgencyLevel {
    const validUrgencies: UrgencyLevel[] = [
      'immediate',
      'urgent',
      'soon',
      'planned',
      'monitor',
    ];
    if (validUrgencies.includes(urgency)) {
      return urgency;
    }
    // Default based on string matching
    const u = String(urgency).toLowerCase();
    if (u.includes('immediate') || u.includes('emergency')) {
      return 'immediate';
    }
    if (u.includes('urgent')) {
      return 'urgent';
    }
    if (u.includes('soon') || u.includes('quick')) {
      return 'soon';
    }
    if (u.includes('planned') || u.includes('schedule')) {
      return 'planned';
    }
    return 'monitor'; // Default
  }

  /**
   * Process safety hazards
   */
  private static processSafetyHazards(hazards: any[]): {
    hazards: any[];
    hasCriticalHazards: boolean;
  } {
    const processedHazards = hazards.map((h) => ({
      type: h.type || 'unknown_hazard',
      severity: this.normalizeSafetySeverity(h.severity),
      location: h.location || 'location_not_specified',
      description: h.description || 'Safety hazard detected',
      immediateAction: h.immediateAction,
      urgency: this.normalizeUrgency(h.urgency || 'urgent'),
    }));

    const hasCriticalHazards = processedHazards.some(
      (h) => h.severity === 'critical' || h.severity === 'high'
    );

    return {
      hazards: processedHazards,
      hasCriticalHazards,
    };
  }

  /**
   * Normalize safety hazard severity
   */
  private static normalizeSafetySeverity(severity: any): SafetyHazardSeverity {
    const valid: SafetyHazardSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (valid.includes(severity)) {
      return severity;
    }
    const s = String(severity).toLowerCase();
    if (s.includes('critical') || s.includes('severe')) {
      return 'critical';
    }
    if (s.includes('high')) {
      return 'high';
    }
    if (s.includes('medium') || s.includes('moderate')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate overall safety score (0-100)
   */
  private static calculateSafetyScore(hazards: any[]): number {
    if (hazards.length === 0) {
      return 100; // No hazards = perfect safety
    }

    let score = 100;
    for (const hazard of hazards) {
      switch (hazard.severity) {
        case 'critical':
          score -= 40;
          break;
        case 'high':
          score -= 25;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Process compliance issues
   */
  private static processCompliance(issues: any[]): any {
    const processedIssues = issues.map((issue) => ({
      issue: issue.issue || 'unknown_issue',
      regulation: issue.regulation,
      severity: this.normalizeComplianceSeverity(issue.severity),
      description: issue.description || 'Compliance issue detected',
      recommendation: issue.recommendation || 'Professional inspection recommended',
    }));

    const complianceScore = this.calculateComplianceScore(processedIssues);

    return {
      complianceIssues: processedIssues,
      requiresProfessionalInspection: processedIssues.length > 0,
      complianceScore,
    };
  }

  /**
   * Normalize compliance severity
   */
  private static normalizeComplianceSeverity(severity: any): ComplianceSeverity {
    const valid: ComplianceSeverity[] = ['info', 'warning', 'violation'];
    if (valid.includes(severity)) {
      return severity;
    }
    const s = String(severity).toLowerCase();
    if (s.includes('violation') || s.includes('non-compliant')) {
      return 'violation';
    }
    if (s.includes('warning') || s.includes('potential')) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Calculate compliance score (0-100)
   */
  private static calculateComplianceScore(issues: any[]): number {
    if (issues.length === 0) {
      return 100; // No issues = perfect compliance
    }

    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'violation':
          score -= 30;
          break;
        case 'warning':
          score -= 15;
          break;
        case 'info':
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Process insurance risk
   */
  private static processInsuranceRisk(
    riskFactors: any[],
    riskScore?: number,
    premiumImpact?: any
  ): any {
    const processedFactors = riskFactors.map((factor) => ({
      factor: factor.factor || 'unknown_risk',
      severity: factor.severity || 'medium',
      impact: factor.impact || 'May affect insurance coverage',
    }));

    const normalizedRiskScore = riskScore
      ? Math.max(0, Math.min(100, riskScore))
      : this.calculateRiskScore(processedFactors);

    const normalizedPremiumImpact = this.normalizePremiumImpact(premiumImpact);

    return {
      riskFactors: processedFactors,
      riskScore: normalizedRiskScore,
      premiumImpact: normalizedPremiumImpact,
      mitigationSuggestions:
        processedFactors.length > 0
          ? [
              'Address damage promptly',
              'Document all repairs',
              'Consider professional inspection',
            ]
          : [],
    };
  }

  /**
   * Calculate risk score from factors
   */
  private static calculateRiskScore(factors: any[]): number {
    if (factors.length === 0) {
      return 0; // No factors = no risk
    }

    let score = 0;
    for (const factor of factors) {
      switch (factor.severity) {
        case 'high':
          score += 30;
          break;
        case 'medium':
          score += 15;
          break;
        case 'low':
          score += 5;
          break;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Normalize premium impact
   */
  private static normalizePremiumImpact(impact: any): PremiumImpact {
    const valid: PremiumImpact[] = ['none', 'low', 'medium', 'high'];
    if (valid.includes(impact)) {
      return impact;
    }
    const i = String(impact).toLowerCase();
    if (i.includes('high') || i.includes('significant')) {
      return 'high';
    }
    if (i.includes('medium') || i.includes('moderate')) {
      return 'medium';
    }
    if (i.includes('low') || i.includes('minor')) {
      return 'low';
    }
    return 'none';
  }

  /**
   * Process urgency data
   */
  private static processUrgency(aiResponse: any, urgency: UrgencyLevel): any {
    const priorityScore = this.calculatePriorityScore(urgency, aiResponse);

    return {
      urgency,
      recommendedActionTimeline:
        aiResponse.recommendedActionTimeline || this.getDefaultTimeline(urgency),
      estimatedTimeToWorsen: aiResponse.estimatedTimeToWorsen,
      reasoning: aiResponse.urgencyReasoning || this.getDefaultReasoning(urgency),
      priorityScore,
    };
  }

  /**
   * Calculate priority score (0-100)
   */
  private static calculatePriorityScore(urgency: UrgencyLevel, aiResponse: any): number {
    const baseScores: Record<UrgencyLevel, number> = {
      immediate: 95,
      urgent: 80,
      soon: 60,
      planned: 40,
      monitor: 20,
    };

    let score = baseScores[urgency] || 50;

    // Adjust based on safety hazards
    if (aiResponse.safetyHazards?.some((h: any) => h.severity === 'critical')) {
      score = Math.min(100, score + 10);
    }

    // Adjust based on damage severity
    if (aiResponse.severity === 'full') {
      score = Math.min(100, score + 10);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get default timeline for urgency
   */
  private static getDefaultTimeline(urgency: UrgencyLevel): string {
    const timelines: Record<UrgencyLevel, string> = {
      immediate: 'Within 24 hours',
      urgent: 'Within 1 week',
      soon: 'Within 2-4 weeks',
      planned: 'Within 1-3 months',
      monitor: 'Regular monitoring recommended',
    };
    return timelines[urgency];
  }

  /**
   * Get default reasoning for urgency
   */
  private static getDefaultReasoning(urgency: UrgencyLevel): string {
    const reasonings: Record<UrgencyLevel, string> = {
      immediate: 'Critical safety hazard requires immediate attention',
      urgent: 'Damage is progressing and requires prompt repair',
      soon: 'Damage should be addressed to prevent further deterioration',
      planned: 'Damage can be scheduled for repair',
      monitor: 'Minor damage that should be monitored',
    };
    return reasonings[urgency];
  }
}

