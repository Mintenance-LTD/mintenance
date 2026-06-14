/**
 * Prompt Builder for Building Surveyor Service
 * Constructs system and user prompts for GPT-4 Vision API
 */

import type { AssessmentContext, RICSConditionRating } from './types';
import { buildTaxonomyPromptSection } from './taxonomy/taxonomy-v3';

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
 * Era-specific risk flags based on UK construction history.
 * A senior surveyor mentally activates these when told the property age.
 */
const ERA_RISK_FLAGS: Array<{
  maxAge: number;
  decade: string;
  risks: string[];
}> = [
  {
    maxAge: 200,
    decade: 'Pre-1900 (Victorian/Georgian)',
    risks: [
      'Lime mortar deterioration',
      'Solid wall (no cavity) — penetrating damp risk',
      'Lead water supply pipes (health hazard)',
      'Lath and plaster ceilings',
      'Timber rot in floor joists/lintels',
    ],
  },
  {
    maxAge: 130,
    decade: '1900–1930s (Edwardian/inter-war)',
    risks: [
      'Early cavity walls — no wall ties or corroded ties',
      'Bitumen DPC may be failing',
      'Cast iron drainage — prone to cracking',
    ],
  },
  {
    maxAge: 80,
    decade: '1940s–1950s (Post-war)',
    risks: [
      'Non-traditional construction (pre-cast concrete panels, Airey houses)',
      'High alumina cement (HAC) in pre-stressed concrete — risk of structural failure',
      'Mundic block (Cornwall/Devon)',
    ],
  },
  {
    maxAge: 70,
    decade: '1960s–1970s',
    risks: [
      'Asbestos-containing materials (insulation boards, pipe lagging, Artex ceilings)',
      'High alumina cement (HAC) — critical structural concern',
      'Flat roof construction (felt-based, poor detailing)',
      'System-built housing (large panel systems) — structural deficiencies',
      'Calcium silicate bricks — sulphate attack risk',
    ],
  },
  {
    maxAge: 50,
    decade: '1980s–1990s',
    risks: [
      'Trussed rafter roofs — check for rafter spread and wall plate fixings',
      'UPVC windows — seal failure, misting double glazing',
      'Cavity wall insulation retro-fit — trapped moisture risk',
      'Woodworm treatment chemicals (historic) in roof timbers',
    ],
  },
  {
    maxAge: 25,
    decade: '2000s+',
    risks: [
      'Thin-joint blockwork — check for cracking at window/door openings',
      'Mechanical ventilation dependency — check MVHR/extract fans are operational',
      'Timber frame behind brick skin — moisture management critical',
    ],
  },
];

/**
 * Get era-specific risk warnings based on approximate property age in years.
 */
function getEraRiskWarnings(ageOfProperty?: number): string {
  if (!ageOfProperty || ageOfProperty <= 0) return '';

  const matchingEras = ERA_RISK_FLAGS.filter(
    (era) =>
      ageOfProperty >= era.maxAge - 30 && ageOfProperty <= era.maxAge + 30
  );
  // Also include any era where age falls within the range
  const allMatching = ERA_RISK_FLAGS.filter(
    (era) => ageOfProperty >= era.maxAge - 30
  );

  const relevant =
    matchingEras.length > 0 ? matchingEras : allMatching.slice(-2);
  if (relevant.length === 0) return '';

  const warnings = relevant
    .map(
      (era) => `${era.decade}:\n${era.risks.map((r) => `  - ${r}`).join('\n')}`
    )
    .join('\n');

  return `\n\nERA-SPECIFIC RISK ASSESSMENT (property ~${ageOfProperty} years old):
Based on the property age, proactively check for these era-typical defects even if not immediately visible:
${warnings}
Flag any of these risks in your specialistReferrals if indicators are present.`;
}

/**
 * Build system prompt for GPT-4 Vision API.
 * When damageTypes are provided (from damage_taxonomy), they are injected so new types appear without code change (Phase 6).
 */
export function buildSystemPrompt(
  damageTypes?: string[],
  ageOfProperty?: number
): string {
  // Sanitise damage types from database
  const safeDamageTypes = damageTypes
    ?.map((dt) => dt.replace(/[^\w\s\-\/(),.]/g, '').slice(0, 100))
    .filter((dt) => dt.length > 0);

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
  "taxonomyClassId": "string | null (the single best-matching class id from the SURVEYOR DEFECT TAXONOMY below; null if none fits or photos are insufficient)",
  "probableCause": "string (most likely cause in surveyor diagnostic language, e.g. 'failed pointing above window head allowing penetrating damp')",
  "needsOnsiteInspection": boolean (true when the photos are insufficient to diagnose reliably),
  "onsiteInspectionReason": "string (only when needsOnsiteInspection is true — what cannot be determined from the photos and why)",
  "severity": "early" | "developing" | "significant" | "dangerous",
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
    "complexity": "low" | "medium" | "high",
    "recommendedTrades": ["plumber" | "electrician" | "roofer" | "structural_engineer" | "plasterer" | "general_builder" | "damp_specialist" | "gas_engineer" | "drainage" | "locksmith" | "glazier" | "pest_control"]
  },
  "ricsConditionRating": 1 | 2 | 3,
  "specialistReferrals": [
    {
      "specialistType": "string (e.g., 'structural_engineer', 'asbestos_surveyor', 'arboriculturist', 'drainage_specialist', 'electrical_inspector')",
      "reason": "string (why this specialist is needed)",
      "urgency": "routine" | "soon" | "urgent" | "immediate"
    }
  ]
}

SURVEYOR DEFECT TAXONOMY (for "taxonomyClassId" — pick the single best match):
${buildTaxonomyPromptSection()}

Taxonomy rules:
- "taxonomyClassId" must be exactly one id from the list above, or null
- Distinguish carefully within groups (e.g. rising vs penetrating vs condensation damp; subsidence vs settlement vs thermal cracking) — the differential diagnosis is the value you add
- For [safety-critical] classes be conservative: if plausible from the evidence, prefer the safety-critical class and reflect it in safetyHazards
- "damageType" keeps its existing vocabulary — do not put taxonomy ids there

WHEN PHOTOS ARE INSUFFICIENT (the surveyor's honesty rule):
- If blur, distance, lighting, or a hidden cause prevents a reliable diagnosis, set "needsOnsiteInspection": true, explain in "onsiteInspectionReason", set confidence below 40, and set "taxonomyClassId": null
- Never guess a specific defect to avoid an inconclusive answer — name candidate classes in "description" instead
- An inconclusive answer with a clear reason is a GOOD assessment; a confident wrong diagnosis is the worst possible output
- Do NOT state precise costs you cannot justify. When "needsOnsiteInspection" is true (or the repair scope is genuinely undefined), a real surveyor will not quote a firm price. Reflect this: keep contractorAdvice.estimatedCost as a WIDE indicative band only, and make the homeownerExplanation/contractorAdvice wording say the scope and final cost must be confirmed on inspection. A confident £450 next to "I cannot assess this from photos" is exactly the contradiction to avoid.

RICS Condition Rating guidance:
- Rating 1 (GREEN): No repair is currently needed. Normal maintenance only.
- Rating 2 (AMBER): Defects that need repairing or replacing but are not considered urgent. Failure to address could lead to deterioration.
- Rating 3 (RED): Defects that are serious and/or need urgent repair or replacement. Failure to address could cause further damage or safety risk.

Specialist Referrals guidance (the surveyor's "know what you don't know"):
- Only include when the defect genuinely exceeds what a general contractor can assess/repair
- structural_engineer: significant cracking, subsidence signs, wall bulging, foundation concerns
- asbestos_surveyor: any pre-2000 property with disturbed insulation, textured coatings, pipe lagging
- arboriculturist: trees within influence zone of foundations on clay soils, root damage to drains
- drainage_specialist: root ingress, collapsed drains, persistent damp with no visible source
- electrical_inspector: old wiring (rubber-insulated), missing RCDs, DIY work visible
- damp_specialist: rising damp vs condensation vs penetrating damp differential diagnosis needed
- gas_safety_engineer: boiler concerns, flue issues, CO risk

Guidelines:
- Be thorough and accurate in your analysis
- Use UK building regulations and standards
- Prioritize safety hazards - if you see electrical hazards near water, structural risks, or fire hazards, mark them as critical
- Provide realistic cost estimates based on UK market rates
- Use clear, professional language
- Severity uses a 4-tier scale aligned with UK landlord compliance:
  - "early": Cosmetic/minor defect — routine maintenance, no immediate risk
  - "developing": Defect is progressing — needs attention within weeks to prevent worsening
  - "significant": Serious defect with risk of spread — repair soon, may affect adjacent elements
  - "dangerous": Structural or safety risk — urgent repair required, potential hazard to occupants
- Always include "recommendedTrades" in contractorAdvice — choose from the enum values above
- Always consider safety implications when determining urgency
- Be conservative with compliance flags - only flag if you're reasonably certain
- Provide actionable advice for both homeowners and contractors
- Always provide a ricsConditionRating (1, 2, or 3)
- Include specialistReferrals when the defect requires expertise beyond general contracting${getEraRiskWarnings(ageOfProperty)}`;
}

/**
 * Build user prompt with context
 */
export function buildUserPrompt(
  context?: AssessmentContext,
  evidenceSummary?: string,
  hasMachineEvidence = true
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
