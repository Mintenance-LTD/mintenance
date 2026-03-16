/**
 * Cross-Property Pattern Correlation Service
 *
 * Queries previous assessments for the same property and identifies
 * connected defects — the surveyor's superpower of reading a building's
 * history rather than treating each defect in isolation.
 *
 * "A damp patch upstairs and a blocked gutter outside and a stained
 *  ceiling beam is one story, not three separate observations."
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { PropertyPatternInsight } from './types';

interface PriorAssessmentSummary {
  id: string;
  damage_type: string;
  severity: string;
  urgency: string;
  created_at: string;
  location?: string;
}

/**
 * Fetch previous assessments for a property and correlate patterns.
 * Returns insights only when 2+ prior assessments exist (otherwise there's nothing to correlate).
 */
export async function correlatePropertyPatterns(
  propertyId: string | undefined,
  currentDamageType: string,
): Promise<PropertyPatternInsight | undefined> {
  if (!propertyId) return undefined;

  try {
    const { data: priorAssessments, error } = await serverSupabase
      .from('building_assessments')
      .select('id, damage_type, severity, urgency, created_at')
      .eq('property_id', propertyId)
      .neq('damage_type', 'general_damage') // skip placeholder rows
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !priorAssessments || priorAssessments.length < 2) {
      return undefined;
    }

    const summaries = priorAssessments as PriorAssessmentSummary[];

    // Extract distinct damage types across all assessments (including current)
    const allDamageTypes = [...new Set([
      currentDamageType,
      ...summaries.map(a => a.damage_type),
    ])];

    if (allDamageTypes.length < 2) {
      // Only one type of damage — no cross-defect pattern to find
      return undefined;
    }

    // Use the known causal chain rules to find connected patterns
    const insight = findCausalPattern(allDamageTypes, summaries);
    if (insight) {
      logger.info('Property pattern correlation found', {
        service: 'PropertyPatternCorrelation',
        propertyId,
        connectedDefects: insight.connectedDefects,
      });
    }
    return insight;
  } catch (err) {
    logger.warn('Property pattern correlation failed', {
      service: 'PropertyPatternCorrelation',
      error: err instanceof Error ? err.message : 'unknown',
    });
    return undefined;
  }
}

/**
 * Rule-based causal chain detection.
 * Maps known defect pairs/triples that a senior surveyor would recognise
 * as having a common root cause.
 */
interface CausalChain {
  trigger: string[];
  rootCause: string;
  investigation: string;
}

const CAUSAL_CHAINS: CausalChain[] = [
  {
    trigger: ['water_damage', 'gutter_blocked'],
    rootCause: 'Blocked gutters causing water overflow and penetrating damp into the wall/ceiling. The water damage is likely a downstream symptom of failed rainwater goods.',
    investigation: 'Clear and inspect all guttering, check downpipe connections, and trace water path from gutter overflow point to internal damp location.',
  },
  {
    trigger: ['mold_damp', 'gutter_blocked'],
    rootCause: 'Persistent moisture from blocked gutters creating conditions for mould growth. The damp is penetrating, not rising or condensation.',
    investigation: 'Clear gutters, check external wall for water tracking, inspect cavity (if present) for bridging. Mould treatment alone will not resolve this — source must be fixed.',
  },
  {
    trigger: ['water_damage', 'roof_damage'],
    rootCause: 'Roof defect allowing water ingress — the internal water damage is directly caused by the compromised roof covering.',
    investigation: 'Inspect roof from above (scaffold or drone), trace water path from roof defect to internal damage. Check for hidden timber decay in roof structure.',
  },
  {
    trigger: ['mold_damp', 'water_damage'],
    rootCause: 'Unresolved water ingress creating sustained damp conditions that support mould colonisation. Both are symptoms of the same moisture source.',
    investigation: 'Identify moisture source (rising, penetrating, or condensation) using moisture mapping. Treat source before addressing mould.',
  },
  {
    trigger: ['wall_crack', 'foundation_crack'],
    rootCause: 'Foundation movement propagating as structural cracking through the walls. This is a subsidence or heave pattern, not cosmetic.',
    investigation: 'Refer to structural engineer immediately. Monitor cracks with tell-tales over 12 months. Check for nearby trees on clay soil, drainage leaks, or mining activity.',
  },
  {
    trigger: ['wall_crack', 'floor_damage'],
    rootCause: 'Differential foundation movement causing both wall cracking and floor distortion. The building is moving unevenly.',
    investigation: 'Structural engineer assessment required. Level survey to measure differential movement. Check subfloor void ventilation and drainage.',
  },
  {
    trigger: ['ceiling_damage', 'roof_damage'],
    rootCause: 'Roof defect causing water ingress that has now damaged the ceiling below. The ceiling damage is secondary to the roof failure.',
    investigation: 'Repair roof first, then assess ceiling structure (check for rotten laths/joists). Do not just redecorate the ceiling — the source must be fixed.',
  },
  {
    trigger: ['electrical_fault', 'water_damage'],
    rootCause: 'Water ingress compromising electrical installations — this is a serious safety hazard. Water and electricity combination requires immediate attention.',
    investigation: 'Isolate affected circuits immediately. Qualified electrician must inspect before power is restored. Fix water source before any electrical repair.',
  },
  {
    trigger: ['mold_damp', 'hvac_issue'],
    rootCause: 'Failed or inadequate ventilation causing condensation-driven dampness and mould growth. The HVAC issue is the primary cause.',
    investigation: 'Check extract fan operation in wet rooms, inspect trickle vents, review whole-house ventilation strategy. Improve airflow before treating mould.',
  },
];

function findCausalPattern(
  damageTypes: string[],
  priorAssessments: PriorAssessmentSummary[],
): PropertyPatternInsight | undefined {
  for (const chain of CAUSAL_CHAINS) {
    const matchCount = chain.trigger.filter(t => damageTypes.includes(t)).length;
    if (matchCount >= 2) {
      const connectedDefects = chain.trigger.filter(t => damageTypes.includes(t));
      return {
        connectedDefects,
        rootCauseHypothesis: chain.rootCause,
        recommendedInvestigation: chain.investigation,
      };
    }
  }

  // No known causal chain — but if there are 3+ distinct damage types on one property,
  // flag it as needing holistic investigation
  if (damageTypes.length >= 3) {
    return {
      connectedDefects: damageTypes.slice(0, 4),
      rootCauseHypothesis: `This property has ${damageTypes.length} distinct damage types recorded across ${priorAssessments.length} assessments. Multiple concurrent defects often share a common underlying cause (e.g., failed DPC, drainage issue, or structural movement) that a single-defect repair will not resolve.`,
      recommendedInvestigation: 'A comprehensive building survey (RICS Level 3) is recommended to identify the underlying condition driving multiple defect types.',
    };
  }

  return undefined;
}
