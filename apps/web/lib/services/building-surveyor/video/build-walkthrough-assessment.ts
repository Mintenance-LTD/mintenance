/**
 * Assemble one property-level Phase1BuildingAssessment from the per-frame
 * surveyor results of a video walkthrough.
 *
 * Findings are deduped via mergeFrameFindings; the other sections are merged
 * across frames with safety-first rules:
 *  - safetyHazards: union (dedup by type+location), worst safety score, any-critical
 *  - urgency: the most urgent frame
 *  - insuranceRisk: max risk score, worst premium impact, union factors/suggestions
 *  - compliance: union issues, worst score, any-requires-inspection
 *  - specialistReferrals: union, most-urgent per specialist type
 *
 * The "lead frame" (most severe) scaffolds the defect-specific sections
 * (homeownerExplanation, contractorAdvice). Headline cost is therefore the
 * PRIMARY defect's estimate — findings[] carries every defect. True
 * whole-property cost aggregation across findings is a deliberate follow-up
 * (a product decision: sum vs per-element vs indicative), not faked here.
 */
import type {
  Phase1BuildingAssessment,
  DamageSeverity,
  PremiumImpact,
  SpecialistReferral,
} from '../types';
import { mergeFrameFindings } from './merge-frame-findings';

const SEVERITY_RANK: Record<DamageSeverity, number> = {
  early: 0,
  developing: 1,
  significant: 2,
  dangerous: 3,
};
const URGENCY_RANK: Record<string, number> = {
  monitor: 0,
  planned: 1,
  soon: 2,
  urgent: 3,
  immediate: 4,
};
const PREMIUM_RANK: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};
const norm = (s?: string): string => (s ?? '').trim().toLowerCase();

function dedupBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

/** Most-severe frame (tie → highest primary confidence) scaffolds defect-specific sections. */
function pickLeadFrame(
  frames: Phase1BuildingAssessment[]
): Phase1BuildingAssessment {
  return frames.reduce((lead, f) => {
    const s =
      SEVERITY_RANK[f.damageAssessment.severity] -
      SEVERITY_RANK[lead.damageAssessment.severity];
    if (s > 0) return f;
    if (
      s === 0 &&
      f.damageAssessment.confidence > lead.damageAssessment.confidence
    )
      return f;
    return lead;
  }, frames[0]);
}

/** Union specialist referrals, keeping the most urgent per specialist type. */
function mergeReferrals(referrals: SpecialistReferral[]): SpecialistReferral[] {
  const rank: Record<string, number> = {
    routine: 0,
    soon: 1,
    urgent: 2,
    immediate: 3,
  };
  const byType = new Map<string, SpecialistReferral>();
  for (const r of referrals) {
    const key = norm(r.specialistType);
    const existing = byType.get(key);
    if (!existing || (rank[r.urgency] ?? 0) > (rank[existing.urgency] ?? 0)) {
      byType.set(key, r);
    }
  }
  return Array.from(byType.values());
}

export function buildWalkthroughAssessment(
  perFrame: Phase1BuildingAssessment[]
): Phase1BuildingAssessment | null {
  const frames = perFrame.filter(Boolean);
  if (frames.length === 0) return null;

  const merged = mergeFrameFindings(
    frames.map((a) => ({
      findings: a.findings,
      sceneSummary: a.sceneSummary,
      needsOnsiteInspection: a.needsOnsiteInspection,
    }))
  );
  const lead = pickLeadFrame(frames);
  const primary = merged.primary;

  // Safety hazards — union, worst score, any critical.
  const hazards = dedupBy(
    frames.flatMap((f) => f.safetyHazards?.hazards ?? []),
    (h) => `${norm(h.type)}::${norm(h.location)}`
  );
  const overallSafetyScore = Math.min(
    ...frames.map((f) => f.safetyHazards?.overallSafetyScore ?? 100)
  );

  // Insurance — max risk, worst premium, union factors/suggestions.
  const riskScore = Math.max(
    ...frames.map((f) => f.insuranceRisk?.riskScore ?? 0)
  );
  const premiumImpact = frames
    .map((f) => f.insuranceRisk?.premiumImpact ?? 'none')
    .reduce<PremiumImpact>(
      (worst, p) => (PREMIUM_RANK[p] > PREMIUM_RANK[worst] ? p : worst),
      'none'
    );

  // Compliance — union, worst score, any-requires-inspection.
  const complianceScore = Math.min(
    ...frames.map((f) => f.compliance?.complianceScore ?? 100)
  );

  // Urgency — the most urgent frame.
  const urgencyFrame = frames.reduce(
    (worst, f) =>
      (URGENCY_RANK[f.urgency?.urgency] ?? 0) >
      (URGENCY_RANK[worst.urgency?.urgency] ?? 0)
        ? f
        : worst,
    frames[0]
  );

  return {
    // Lead frame scaffolds defect-specific sections (homeownerExplanation,
    // contractorAdvice, evidence). Everything below is an explicit override.
    ...lead,
    damageAssessment: primary
      ? {
          damageType: primary.damageType,
          severity: primary.severity,
          confidence: primary.confidence,
          location: primary.element,
          description: primary.description || lead.damageAssessment.description,
          detectedItems: lead.damageAssessment.detectedItems,
        }
      : lead.damageAssessment,
    safetyHazards: {
      hazards,
      hasCriticalHazards: frames.some(
        (f) => f.safetyHazards?.hasCriticalHazards
      ),
      overallSafetyScore: Number.isFinite(overallSafetyScore)
        ? overallSafetyScore
        : 100,
    },
    compliance: {
      complianceIssues: dedupBy(
        frames.flatMap((f) => f.compliance?.complianceIssues ?? []),
        (c) => norm(c.issue)
      ),
      requiresProfessionalInspection: frames.some(
        (f) => f.compliance?.requiresProfessionalInspection
      ),
      complianceScore: Number.isFinite(complianceScore) ? complianceScore : 100,
    },
    insuranceRisk: {
      riskFactors: dedupBy(
        frames.flatMap((f) => f.insuranceRisk?.riskFactors ?? []),
        (r) => norm(r.factor)
      ),
      riskScore,
      premiumImpact,
      mitigationSuggestions: Array.from(
        new Set(
          frames.flatMap((f) => f.insuranceRisk?.mitigationSuggestions ?? [])
        )
      ),
    },
    urgency: urgencyFrame.urgency,
    findings: merged.findings,
    sceneSummary: merged.sceneSummary,
    ricsConditionRating: merged.worstConditionRating,
    taxonomyClassId: primary?.taxonomyClassId,
    probableCause: primary?.probableCause,
    needsOnsiteInspection: merged.needsOnsiteInspection,
    specialistReferrals: mergeReferrals(
      frames.flatMap((f) => f.specialistReferrals ?? [])
    ),
  };
}
