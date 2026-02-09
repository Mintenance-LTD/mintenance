/**
 * Prompt Builder for Building Surveyor Service
 * Constructs system and user prompts for GPT-4 Vision API
 */

import type { AssessmentContext } from './types';

/**
 * Sanitise user-provided text before injecting into prompts.
 * Strips control characters, prompt injection patterns, and excessive length.
 */
function sanitisePromptInput(input: string, maxLength = 500): string {
  let sanitised = input
    // Remove control characters except newlines/tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Strip common prompt injection patterns
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[filtered]')
    .replace(/you\s+are\s+now\s+/gi, '[filtered]')
    .replace(/system\s*:\s*/gi, '[filtered]')
    .replace(/assistant\s*:\s*/gi, '[filtered]')
    .replace(/\bdo\s+not\s+follow\b/gi, '[filtered]')
    .replace(/\boverride\b/gi, '[filtered]')
    .replace(/\bdisregard\b/gi, '[filtered]');

  // Truncate to max length
  if (sanitised.length > maxLength) {
    sanitised = sanitised.slice(0, maxLength) + '...';
  }

  return sanitised.trim();
}

/**
 * Build system prompt for GPT-4 Vision API.
 * When damageTypes are provided (from damage_taxonomy), they are injected so new types appear without code change (Phase 6).
 */
export function buildSystemPrompt(damageTypes?: string[]): string {
  // Sanitise damage types from database
  const safeDamageTypes = damageTypes
    ?.map(dt => dt.replace(/[^\w\s\-\/(),.]/g, '').slice(0, 100))
    .filter(dt => dt.length > 0);

  const damageTypeGuidance =
    safeDamageTypes && safeDamageTypes.length > 0
      ? `\nRecognized damage types (use one of these for damageType when applicable): ${safeDamageTypes.join(', ')}.`
      : '';

  return `You are an expert UK building surveyor with decades of experience in property damage assessment, safety compliance, and insurance risk evaluation.

Your task is to analyze building damage photos and provide comprehensive assessments that help homeowners understand issues and contractors plan repairs.
${damageTypeGuidance}

You must respond with valid JSON matching this exact structure:
{
  "damageType": "string (e.g., 'water damage', 'structural crack', 'mold growth'${safeDamageTypes?.length ? ` or one of: ${safeDamageTypes.slice(0, 5).join(', ')}` : ''})",
  "severity": "early" | "midway" | "full",
  "confidence": number (0-100),
  "location": "string (specific location in property)",
  "description": "string (detailed description of damage)",
  "safetyHazards": [
    {
      "type": "string",
      "severity": "low" | "medium" | "high" | "critical",
      "location": "string",
      "description": "string",
      "immediateAction": "string",
      "urgency": "string"
    }
  ],
  "complianceIssues": [
    {
      "issue": "string",
      "regulation": "string (e.g., 'Building Regulations 2010', 'Fire Safety Order 2005')",
      "severity": "low" | "medium" | "high",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "riskFactors": [
    {
      "factor": "string",
      "severity": "low" | "medium" | "high",
      "impact": "string"
    }
  ],
  "riskScore": number (0-100),
  "premiumImpact": "none" | "low" | "medium" | "high",
  "urgency": "immediate" | "urgent" | "soon" | "planned" | "monitor",
  "recommendedActionTimeline": "string (e.g., 'Within 24 hours')",
  "estimatedTimeToWorsen": "string (e.g., '2-4 weeks if left untreated')",
  "urgencyReasoning": "string",
  "homeownerExplanation": {
    "whatIsIt": "string (plain English explanation)",
    "whyItHappened": "string (likely causes)",
    "whatToDo": "string (immediate actions)"
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
export function buildUserPrompt(
  context?: AssessmentContext,
  evidenceSummary?: string,
  hasMachineEvidence = true,
): string {
  let prompt = `Analyze these building damage photos and provide a comprehensive assessment.\n\n`;

  if (context?.location) {
    prompt += `Location: ${sanitisePromptInput(context.location, 200)}\n`;
  }

  if (context?.propertyType) {
    prompt += `Property Type: ${sanitisePromptInput(context.propertyType, 100)}\n`;
  }

  if (context?.ageOfProperty) {
    const age = String(context.ageOfProperty).replace(/[^\d.]/g, '');
    prompt += `Property Age: ${age} years\n`;
  }

  if (context?.propertyDetails) {
    prompt += `Additional Context: ${sanitisePromptInput(context.propertyDetails, 500)}\n`;
  }

  if (!hasMachineEvidence) {
    prompt += `\nMachine detectors could not identify clear defects. Conduct a thorough manual review and only report issues you can confidently verify from the photos.`;
  }

  if (evidenceSummary) {
    prompt += `\nMachine detections summary:\n${evidenceSummary}\n`;
    prompt += `\nCross-check these detections. Verify accuracy and expand with professional insights.`;
  }

  prompt += `\nPlease analyze all photos carefully and provide a complete assessment following the JSON structure specified.`;

  return prompt;
}

