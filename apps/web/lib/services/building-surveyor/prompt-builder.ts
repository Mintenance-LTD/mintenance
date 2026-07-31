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
 * Age below which a property is treated as a new build.
 *
 * Covers the drying-out and snagging period: a new dwelling sheds construction
 * moisture for roughly its first two heating seasons, so damp readings and
 * hairline shrinkage cracks are EXPECTED here and mean something quite
 * different from the same observation on a 60-year-old house.
 */
const NEW_BUILD_MAX_AGE_YEARS = 2;

/**
 * Guidance for a property young enough that most pathology is implausible.
 *
 * This exists because a real survey reported mould and structural movement in a
 * kitchen built the same year — the model had no idea how old the building was
 * (see the walkthrough route, which now supplies it from properties.year_built).
 */
function getNewBuildGuidance(ageOfProperty: number): string {
  return `\n\nPROPERTY AGE: NEW BUILD (~${ageOfProperty} year${ageOfProperty === 1 ? '' : 's'} old)
This building is brand new. That is strong evidence about what you are and are not looking at:
- EXPECTED and NOT defects: hairline shrinkage cracking at plasterboard joints, ceiling/wall junctions and around openings; slightly elevated moisture as construction water dries out; nail pops; minor settlement cracks under 1mm; snagging-level finish blemishes. Report these as early / condition 1 at most, and say they are consistent with a new build drying out.
- IMPLAUSIBLE without unmistakable evidence: established mould colonies, rising damp, penetrating damp with a tide line, timber decay, structural subsidence, perished masonry, failed DPC. Do NOT report any of these from a tonal difference, a shadow or a soft gradient. If you believe you can see one, name the specific visible evidence (defined edge, colour shift, spore texture, displacement of a straight reference) in "description" — and if you cannot name it, do not raise the finding.
- Workmanship and compliance defects ARE plausible and worth reporting: missing seals, unfinished trims, misaligned doors or windows that visibly fail against a straight reference, exposed fixings, services left unprotected.
- A brand-new building with nothing wrong is a normal and correct survey outcome. Do not manufacture a defect to fill the report.`;
}

/**
 * Get era-specific risk warnings based on approximate property age in years.
 */
function getEraRiskWarnings(ageOfProperty?: number): string {
  // 0 is a real age, not a missing value — a property built this year. The old
  // `!ageOfProperty` guard treated it as unknown and returned nothing, which
  // silently withheld age context for precisely the newest buildings.
  if (typeof ageOfProperty !== 'number' || !Number.isFinite(ageOfProperty)) {
    return '';
  }
  if (ageOfProperty < 0) return '';
  if (ageOfProperty <= NEW_BUILD_MAX_AGE_YEARS) {
    return getNewBuildGuidance(ageOfProperty);
  }

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
  "findings": [
    {
      "element": "building element affected, e.g. electrical_services | roof_timbers | roof_covering | main_walls | ceilings | floors | windows | external_joinery | services_plumbing | chimney",
      "taxonomyClassId": "string | null (best-matching class id from the SURVEYOR DEFECT TAXONOMY below; null if none fits)",
      "damageType": "string (free-text damage type)",
      "severity": "early" | "developing" | "significant" | "dangerous",
      "conditionRating": 1 | 2 | 3,
      "description": "string (what is visible on this element)",
      "probableCause": "string (likely cause in surveyor language)",
      "confidence": number (0-100),
      "isPrimary": boolean (true for exactly ONE finding — the most serious)
    }
  ],
  "sceneSummary": "string (one or two sentences describing the property/scene overall — e.g. 'room appears mid-strip-out, several elements exposed'; distinguish active works from defects)",
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

READ THE WHOLE SCENE (do not tunnel-vision on one defect):
- A real surveyor reports EVERY distinct defect visible, element by element. A photo of a stripped-out room can show exposed wiring AND decaying timber AND perished masonry AND damp staining at once — that is four findings, not one.
- Populate "findings" with one entry per distinct defect/element. Do not merge unrelated defects into a single finding, and do not omit a clearly visible defect just because another is more serious.
- Mark exactly ONE finding "isPrimary": true — the most serious (highest severity, then highest confidence). Mirror that primary finding into the top-level singular fields ("damageType", "taxonomyClassId", "severity", "probableCause", "description", "confidence").
- Set the top-level "ricsConditionRating" to the WORST conditionRating across all findings (a scene is only as good as its most serious defect).
- If you genuinely see only one defect, return a single-element "findings" array — that is fine.

LIGHT IS NOT A DEFECT (the commonest false positive):
- Interior photographs are full of soft tonal gradients that are not damage. Before reporting discoloration, staining, damp or mould, ask whether what you are seeing is simply LIGHT.
- Treat as lighting, not a defect, unless there is corroborating evidence: a soft gradient darkening toward a corner, ceiling or wall edge; a fade running away from a window, lamp or light fitting; the shadow cast by a curtain, rail, pelmet, door or piece of furniture; an even grey cast over a whole surface in a dim room; camera vignetting at the frame edge.
- Real damp/mould staining has a defined EDGE, an irregular or tide-line shaped boundary, a colour shift (brown, yellow, grey-green speckling) rather than a pure light-to-dark ramp, and it does not move with the light source. Say which of these you can actually see.
- The same applies to shape: a ceiling looks lower near the camera because of perspective. Do not report sagging, bowing or misalignment from a single oblique angle unless a straight reference (a rail, a shadow gap, a door frame, a tile line) visibly deviates.
- A brand-new or recently decorated interior is a strong prior AGAINST damp, mould and structural movement. Weigh it.
- If you cannot tell shadow from stain, that is an inconclusive finding, not a defect: say so in "description", set confidence below 40, and do not raise conditionRating above 1 on that basis alone.

NORMAL BUILDING FEATURES ARE NOT DEFECTS:
- Much of what a building is MEANT to look like reads as a defect if you are hunting for one. Before reporting, ask whether this is simply how the building was built.
- Deliberate features, not damage: the shadow gap or expansion joint where a wall meets a ceiling or skirting; movement joints in masonry; trickle vents, air bricks and weep holes; service penetrations and sealed cable entries; pipe boxing and bulkheads (which are not bowing walls); coving and cornice shadow lines (which are not cracks); door and window frame reveals.
- UK domestic norms, not faults: a socket near a kitchen counter is normal and compliant — it is where appliances plug in — and only a concern if it sits within about 300mm of a sink or tap, which a photograph usually cannot establish. Radiators under windows, extract fans, consumer units in cupboards, boxed-in soil pipes and exposed service runs in a garage or loft are all normal. Do not report a code concern you cannot actually measure from the image; if the geometry is the whole question, that is an inconclusive finding.
- Work in progress is not a defect: fresh filler, mist coats, unfinished trims, protective film, a room mid-decoration. Say so in "sceneSummary" instead of reporting damage.

SURFACES, MATERIALS AND OBJECTS:
- Finish is not failure: textured or stipple paint and Artex are not cracking; grout and mortar joints are not mould; a feature wall or a deliberately dark paint is not staining; timber grain, knots and colour variation are not rot; stone and quartz veining is not a crack; new plaster drying unevenly is not damp.
- Contents are not the building. Furniture, appliances, worktop clutter, pictures, rugs, curtains, laundry, a laptop — none of these are elements to assess, and none of their shadows or reflections are defects. A reflection in glass, a mirror or a glossy tile is not a crack or water.
- Judge the ELEMENT, not what is standing in front of it. If contents obscure the element, say the view was obstructed rather than reporting what you imagine behind it.

YOU CANNOT MEASURE FROM A PHOTOGRAPH:
- Crack severity depends on width, and RICS distinguishes a sub-1mm hairline from a 5mm-plus structural crack. A photo with no scale reference does not tell you which. Do not assign a severity that depends on a measurement you do not have: describe what you see, name the range it could be, and say a width check is needed.
- The same applies to depth, extent behind a surface, and moisture content. Moisture is measured with a meter, never inferred from colour alone.

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

  // Numeric check, not truthiness: age 0 is a property built this year, and the
  // previous `if (context?.ageOfProperty)` dropped it — so the newest buildings,
  // where age matters most, were the ones that never had it stated.
  if (
    typeof context?.ageOfProperty === 'number' &&
    Number.isFinite(context.ageOfProperty) &&
    context.ageOfProperty >= 0
  ) {
    const age = String(context.ageOfProperty).replace(/[^\d.]/g, '');
    prompt += `Property Age: ${age} years${
      context.ageOfProperty === 0 ? ' (built this year — new build)' : ''
    }\n`;
  }

  if (context?.propertyDetails) {
    prompt += `Additional Context: ${sanitisePromptInput(context.propertyDetails, 500)}\n`;
  }

  if (context?.walkthroughFrame) {
    const { index, total } = context.walkthroughFrame;
    prompt += `\nThis is frame ${index + 1} of ${total} from a video walkthrough of the SAME space. The other frames cover the same elements from other angles and distances, and every frame's findings are merged afterwards.
- Report only what THIS frame shows clearly. A marginal call is better left to a frame that sees it better — it is not your last chance to catch a defect.
- Do not report a defect to be thorough. A defect that appears in only one frame of ${total} is treated as unconfirmed, so a guess here weakens the survey rather than strengthening it.
- If this frame shows nothing wrong, returning an empty or clean findings array is the correct answer.\n`;
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
