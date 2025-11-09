import { logger } from '@mintenance/shared';
import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  DamageSeverity,
  UrgencyLevel,
  SafetyHazardSeverity,
  ComplianceSeverity,
  PremiumImpact,
} from './types';

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
  /**
   * Assess building damage from photos using GPT-4 Vision
   */
  static async assessDamage(
    imageUrls: string[],
    context?: AssessmentContext
  ): Promise<Phase1BuildingAssessment> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured', {
          service: 'BuildingSurveyorService',
        });
        throw new Error('AI assessment service is not configured');
      }

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('At least one image is required for assessment');
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
      const assessment = this.structureAssessment(aiResponse);

      logger.info('Building assessment completed', {
        service: 'BuildingSurveyorService',
        imageCount: imagesToAnalyze.length,
        damageType: assessment.damageAssessment.damageType,
        severity: assessment.damageAssessment.severity,
        urgency: assessment.urgency.urgency,
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

