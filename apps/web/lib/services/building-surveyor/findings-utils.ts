/**
 * Multi-finding normalisation.
 *
 * A scene usually has several distinct defects, so the AI returns a
 * `findings[]` array. The singular top-level fields (damageAssessment,
 * taxonomyClassId, ricsConditionRating, …) are the derived "primary" finding
 * for back-compat. This helper makes the two representations consistent
 * regardless of which side the model populated:
 *  - findings present  → pick the primary, force exactly one isPrimary,
 *    compute the worst condition rating across all findings.
 *  - findings absent   → synthesise a single finding from the singular fields,
 *    so downstream consumers can always read `findings[]`.
 */
import type {
  AssessmentFinding,
  DamageSeverity,
  RICSConditionRating,
} from './types';

const SEVERITY_RANK: Record<DamageSeverity, number> = {
  early: 0,
  developing: 1,
  significant: 2,
  dangerous: 3,
};

interface RawFinding {
  element?: string;
  taxonomyClassId?: string;
  damageType?: string;
  severity?: DamageSeverity;
  conditionRating?: RICSConditionRating;
  description?: string;
  probableCause?: string;
  confidence?: number;
  isPrimary?: boolean;
}

interface SingularFallback {
  damageType?: string;
  taxonomyClassId?: string;
  severity?: DamageSeverity;
  confidence?: number;
  description?: string;
  probableCause?: string;
  ricsConditionRating?: RICSConditionRating;
}

export interface NormalizedFindings {
  findings: AssessmentFinding[];
  primary?: AssessmentFinding;
  /** Worst rating across all findings — a scene is only as good as its worst defect. */
  worstConditionRating?: RICSConditionRating;
}

function hasContent(
  f: Pick<RawFinding, 'damageType' | 'taxonomyClassId' | 'description'>
): boolean {
  return Boolean(f.damageType || f.taxonomyClassId || f.description);
}

export function normalizeFindings(
  rawFindings: RawFinding[] | undefined,
  fallback: SingularFallback
): NormalizedFindings {
  let findings: AssessmentFinding[] = (rawFindings ?? [])
    .filter((f) => f && hasContent(f))
    .map((f) => ({
      element: f.element || 'general',
      taxonomyClassId: f.taxonomyClassId,
      damageType: f.damageType || 'general_damage',
      severity: f.severity || 'developing',
      conditionRating: f.conditionRating,
      description: f.description || '',
      probableCause: f.probableCause,
      confidence:
        typeof f.confidence === 'number'
          ? f.confidence
          : (fallback.confidence ?? 0),
      isPrimary: f.isPrimary,
    }));

  // No findings array — synthesise one from the singular fields.
  if (findings.length === 0 && hasContent(fallback)) {
    findings = [
      {
        element: 'general',
        taxonomyClassId: fallback.taxonomyClassId,
        damageType: fallback.damageType || 'general_damage',
        severity: fallback.severity || 'developing',
        conditionRating: fallback.ricsConditionRating,
        description: fallback.description || '',
        probableCause: fallback.probableCause,
        confidence: fallback.confidence ?? 0,
        isPrimary: true,
      },
    ];
  }

  if (findings.length === 0) {
    return {
      findings: [],
      primary: undefined,
      worstConditionRating: fallback.ricsConditionRating,
    };
  }

  // Primary: respect a single explicit isPrimary; otherwise most serious
  // (severity, then confidence).
  const explicit = findings.filter((f) => f.isPrimary);
  const primary =
    explicit.length === 1
      ? explicit[0]
      : [...findings].sort((a, b) => {
          const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
          return s !== 0 ? s : (b.confidence ?? 0) - (a.confidence ?? 0);
        })[0];

  findings = findings.map((f) => ({ ...f, isPrimary: f === primary }));

  const ratings = findings
    .map((f) => f.conditionRating)
    .filter((r): r is RICSConditionRating => r === 1 || r === 2 || r === 3);
  const worstConditionRating =
    ratings.length > 0
      ? (Math.max(...ratings) as RICSConditionRating)
      : fallback.ricsConditionRating;

  return { findings, primary, worstConditionRating };
}
