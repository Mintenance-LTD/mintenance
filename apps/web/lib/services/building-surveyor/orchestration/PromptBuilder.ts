/**
 * Prompt Builder for GPT-4 Vision
 * 
 * Handles construction of system and user prompts for building damage assessment.
 * Extracted from BuildingSurveyorService for better maintainability.
 */

import type {
    AssessmentContext,
    RoboflowDetection,
    VisionAnalysisSummary,
} from '../types';

export class PromptBuilder {
    /**
     * Build system prompt for GPT-4 Vision
     */
    static buildSystemPrompt(): string {
        return `You are an expert building surveyor and structural engineer with 20+ years of experience. 
Analyze building damage photos and provide comprehensive assessments.

Your analysis must be:
1. **Technically accurate** - Use proper building/construction terminology
2. **Safety-focused** - Identify all potential hazards
3. **Compliance-aware** - Flag building code violations
4. **Risk-conscious** - Assess insurance implications
5. **Actionable** - Provide clear next steps

**Damage Severity Levels:**
- **early**: Minor damage, cosmetic issues, preventive maintenance recommended
- **midway**: Moderate damage, functional impact, repair needed soon
- **full**: Severe damage, structural concerns, immediate action required

**Urgency Levels:**
- **immediate**: Safety hazard, act within 24 hours
- **urgent**: Significant risk, act within 1 week
- **soon**: Growing problem, act within 1 month
- **planned**: Stable issue, plan repair within 3-6 months
- **monitor**: Minor concern, observe for changes

**Response Format:**
Return a JSON object with the following structure:
{
  "damageType": "water_damage|structural_crack|damp|roof_damage|electrical_issue|plumbing_issue|foundation_issue|mold|fire_damage|unknown_damage",
  "severity": "early|midway|full",
  "confidence": 0-100,
  "location": "specific location description",
  "description": "detailed technical description",
  "detectedItems": ["item1", "item2"],
  "safetyHazards": [
    {
      "type": "hazard type",
      "severity": "low|medium|high|critical",
      "location": "where",
      "description": "what and why dangerous",
      "immediateAction": "what to do now",
      "urgency": "immediate|urgent|soon|planned|monitor"
    }
  ],
  "complianceIssues": [
    {
      "issue": "what's wrong",
      "regulation": "which code/standard",
      "severity": "minor|moderate|major",
      "description": "details",
      "recommendation": "how to fix"
    }
  ],
  "riskFactors": [
    {
      "factor": "risk name",
      "severity": "low|medium|high",
      "impact": "insurance/liability impact"
    }
  ],
  "riskScore": 0-100,
  "premiumImpact": "description of insurance implications",
  "mitigationSuggestions": ["suggestion1", "suggestion2"],
  "urgency": "immediate|urgent|soon|planned|monitor",
  "recommendedActionTimeline": "when to act",
  "estimatedTimeToWorsen": "how long until worse",
  "urgencyReasoning": "why this urgency level",
  "homeownerExplanation": {
    "whatIsIt": "simple explanation of the problem",
    "whyItHappened": "likely causes in plain language",
    "whatToDo": "clear next steps for homeowner"
  },
  "contractorAdvice": {
    "repairNeeded": ["step1", "step2"],
    "materials": [
      {
        "name": "material name",
        "quantity": "amount needed",
        "estimatedCost": cost_number
      }
    ],
    "tools": ["tool1", "tool2"],
    "estimatedTime": "time estimate",
    "estimatedCost": {
      "min": min_cost,
      "max": max_cost,
      "recommended": recommended_cost
    },
    "complexity": "low|medium|high"
  }
}

**Important Guidelines:**
- Be conservative with safety - err on the side of caution
- Consider UK building regulations and standards
- Factor in property age and construction type
- Account for climate/weather impacts
- Provide realistic cost estimates in GBP
- Use homeowner-friendly language in explanations
- Use technical language in contractor advice`;
    }

    /**
     * Build evidence summary from detections and vision analysis
     */
    static buildEvidenceSummary(
        roboflowDetections: RoboflowDetection[],
        visionAnalysis: VisionAnalysisSummary | null
    ): string {
        const parts: string[] = [];

        if (roboflowDetections.length > 0) {
            parts.push('**Machine Learning Detections:**');
            const detectionsByClass = roboflowDetections.reduce((acc, det) => {
                if (!acc[det.className]) {
                    acc[det.className] = [];
                }
                acc[det.className].push(det);
                return acc;
            }, {} as Record<string, RoboflowDetection[]>);

            for (const [className, dets] of Object.entries(detectionsByClass)) {
                const avgConfidence = dets.reduce((sum, d) => sum + d.confidence, 0) / dets.length;
                parts.push(`- ${className}: ${dets.length} detection(s), avg confidence ${avgConfidence.toFixed(1)}%`);
            }
        }

        if (visionAnalysis) {
            parts.push('\n**Vision Analysis:**');
            parts.push(`- Overall confidence: ${visionAnalysis.confidence}%`);

            if (visionAnalysis.labels.length > 0) {
                parts.push(`- Detected labels: ${visionAnalysis.labels.map(l => l.description).join(', ')}`);
            }

            if (visionAnalysis.detectedFeatures && visionAnalysis.detectedFeatures.length > 0) {
                parts.push(`- Key features: ${visionAnalysis.detectedFeatures.join(', ')}`);
            }
        }

        return parts.length > 0 ? parts.join('\n') : 'No machine learning evidence available.';
    }

    /**
     * Build user prompt with context and evidence
     */
    static buildUserPrompt(
        context: AssessmentContext | undefined,
        evidenceSummary: string,
        hasDetectionEvidence: boolean
    ): string {
        const parts: string[] = [];

        parts.push('Please analyze the provided building damage photos and provide a comprehensive assessment.');

        if (context) {
            parts.push('\n**Property Context:**');
            if (context.propertyType) {
                parts.push(`- Type: ${context.propertyType}`);
            }
            if (context.location) {
                parts.push(`- Location: ${context.location}`);
            }
            if (context.ageOfProperty) {
                parts.push(`- Age: ${context.ageOfProperty} years`);
            }
            if (context.propertyDetails) {
                parts.push(`- Details: ${context.propertyDetails}`);
            }
        }

        if (hasDetectionEvidence) {
            parts.push(`\n${evidenceSummary}`);
            parts.push('\nUse this machine learning evidence to inform your assessment, but rely primarily on your expert visual analysis of the photos.');
        } else {
            parts.push('\nNote: Machine learning detection services are unavailable. Please rely entirely on your expert visual analysis.');
        }

        parts.push('\nProvide your assessment as a JSON object following the specified format.');

        return parts.join('\n');
    }

    /**
     * Build messages array for GPT-4 Vision API
     */
    static buildMessages(
        imageUrls: string[],
        context?: AssessmentContext,
        roboflowDetections?: RoboflowDetection[],
        visionAnalysis?: VisionAnalysisSummary | null
    ): Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;
    }> {
        const systemPrompt = this.buildSystemPrompt();
        const evidenceSummary = this.buildEvidenceSummary(
            roboflowDetections || [],
            visionAnalysis || null
        );
        const hasDetectionEvidence =
            (roboflowDetections && roboflowDetections.length > 0) || !!visionAnalysis;
        const userPrompt = this.buildUserPrompt(context, evidenceSummary, hasDetectionEvidence);

        // Limit to 4 images (GPT-4 Vision limit)
        const imagesToAnalyze = imageUrls.slice(0, 4);

        return [
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
    }
}
