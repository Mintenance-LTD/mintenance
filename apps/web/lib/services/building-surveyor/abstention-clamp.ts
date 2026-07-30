/**
 * Make abstention mean something downstream.
 *
 * The prompt already tells the surveyor that when photos are insufficient it
 * should set `needsOnsiteInspection`, explain why, and drop confidence below 40.
 * Nothing enforced the second half, so a real survey said:
 *
 *   "The AI could not diagnose this reliably from the photos alone: Cannot
 *    determine if socket is adequately protected from water exposure."
 *
 * and in the same breath assigned Condition 3, Significant, 70% confidence,
 * insurance risk 80/100 with High premium impact, and an Electrical Inspector
 * referral marked urgent — within 24 hours. For a socket near a kitchen counter,
 * which is normal unless it is within ~300mm of the sink, something the photo
 * could not establish. That is the model's own words being contradicted by its
 * own numbers, and the numbers are what the homeowner acts on.
 *
 * "I cannot tell" must not read as "act today".
 *
 * THE SAFETY CARVE-OUT: a `dangerous` finding is never clamped. "I can see
 * exposed wiring but cannot tell whether it is live" is an abstention that
 * should still shout. Clamping it would be the one failure mode worse than
 * over-alarming, so uncertainty softens the merely-serious and leaves genuine
 * hazards exactly where the model put them.
 */

import type {
  Phase1BuildingAssessment,
  RICSConditionRating,
  UrgencyLevel,
  PremiumImpact,
} from './types';

/**
 * Confidence ceiling for an abstained survey.
 *
 * The prompt asks for "below 40" — this is the enforcement of that contract, not
 * a new rule. A survey that cannot reach a diagnosis has no business displaying
 * 70% next to it.
 */
export const ABSTAINED_MAX_CONFIDENCE = 40;

/** Condition ceiling: "needs repair, not urgent" is as far as a guess may go. */
const ABSTAINED_MAX_CONDITION: RICSConditionRating = 2;

/** Insurance ceiling. 80/100 + High off an admitted non-diagnosis is not fair to the owner. */
const ABSTAINED_MAX_RISK_SCORE = 50;

/** Urgency ordered least → most pressing, for capping. */
const URGENCY_ORDER: UrgencyLevel[] = [
  'monitor',
  'planned',
  'soon',
  'urgent',
  'immediate',
];

/** As pressing as an abstained survey may be: "soon", never "within 24 hours". */
const ABSTAINED_MAX_URGENCY: UrgencyLevel = 'soon';

/** Referral urgency ordered least → most pressing. */
const REFERRAL_ORDER = ['routine', 'soon', 'urgent', 'immediate'] as const;
type ReferralUrgency = (typeof REFERRAL_ORDER)[number];
const ABSTAINED_MAX_REFERRAL_URGENCY: ReferralUrgency = 'soon';

function capUrgency(level: UrgencyLevel): UrgencyLevel {
  const i = URGENCY_ORDER.indexOf(level);
  const ceiling = URGENCY_ORDER.indexOf(ABSTAINED_MAX_URGENCY);
  // An unknown level is left alone rather than silently rewritten.
  if (i === -1) return level;
  return i > ceiling ? ABSTAINED_MAX_URGENCY : level;
}

function capReferralUrgency(level: string): string {
  const i = REFERRAL_ORDER.indexOf(level as ReferralUrgency);
  const ceiling = REFERRAL_ORDER.indexOf(ABSTAINED_MAX_REFERRAL_URGENCY);
  if (i === -1) return level;
  return i > ceiling ? ABSTAINED_MAX_REFERRAL_URGENCY : level;
}

/**
 * Whether this survey describes something genuinely dangerous.
 *
 * Checked across the primary AND every finding, because the merge can leave a
 * dangerous finding in the list while the primary is something else.
 */
export function hasDangerousFinding(a: Phase1BuildingAssessment): boolean {
  if (a.damageAssessment?.severity === 'dangerous') return true;
  if (a.findings?.some((f) => f.severity === 'dangerous')) return true;
  // A critical safety hazard is the same claim by another route.
  if (a.safetyHazards?.hasCriticalHazards) return true;
  return (
    a.safetyHazards?.hazards?.some((h) => h.severity === 'critical') ?? false
  );
}

/**
 * Cap the alarm on a survey that admits it could not reach a diagnosis.
 *
 * Pure and idempotent: returns a new object, and re-applying it changes nothing.
 * Non-abstained surveys and dangerous ones pass through untouched, so this can
 * be applied anywhere in the pipeline without having to reason about ordering.
 */
export function clampAbstainedAssessment(
  assessment: Phase1BuildingAssessment
): Phase1BuildingAssessment {
  if (!assessment?.needsOnsiteInspection) return assessment;
  if (hasDangerousFinding(assessment)) return assessment;

  const clamped: Phase1BuildingAssessment = { ...assessment };

  // Confidence — the contract the prompt already states.
  if (assessment.damageAssessment) {
    clamped.damageAssessment = {
      ...assessment.damageAssessment,
      confidence: Math.min(
        assessment.damageAssessment.confidence ?? 0,
        ABSTAINED_MAX_CONFIDENCE
      ),
    };
  }

  // RICS rating. Condition 3 means "serious and/or urgent"; a survey that could
  // not diagnose the defect cannot honestly assert that.
  if (
    typeof assessment.ricsConditionRating === 'number' &&
    assessment.ricsConditionRating > ABSTAINED_MAX_CONDITION
  ) {
    clamped.ricsConditionRating = ABSTAINED_MAX_CONDITION;
  }

  // Per-finding ratings too, or the list contradicts the headline.
  if (assessment.findings?.length) {
    clamped.findings = assessment.findings.map((f) =>
      f.severity !== 'dangerous' &&
      typeof f.conditionRating === 'number' &&
      f.conditionRating > ABSTAINED_MAX_CONDITION
        ? { ...f, conditionRating: ABSTAINED_MAX_CONDITION }
        : f
    );
  }

  // Urgency: "within 24 hours" becomes "soon".
  if (assessment.urgency) {
    const capped = capUrgency(assessment.urgency.urgency);
    clamped.urgency = {
      ...assessment.urgency,
      urgency: capped,
      // The timeline string is free text the model wrote to match the old
      // level, so leaving it would keep saying "within 24 hours" underneath a
      // downgraded badge.
      recommendedActionTimeline:
        capped === assessment.urgency.urgency
          ? assessment.urgency.recommendedActionTimeline
          : 'Arrange an inspection to confirm before acting',
    };
  }

  // Insurance. This is the number that turns a maybe into a premium.
  if (assessment.insuranceRisk) {
    const riskScore = Math.min(
      assessment.insuranceRisk.riskScore ?? 0,
      ABSTAINED_MAX_RISK_SCORE
    );
    const premiumImpact: PremiumImpact =
      assessment.insuranceRisk.premiumImpact === 'high'
        ? 'medium'
        : assessment.insuranceRisk.premiumImpact;
    clamped.insuranceRisk = {
      ...assessment.insuranceRisk,
      riskScore,
      premiumImpact,
    };
  }

  // Specialist referrals stay — knowing who to call is the POINT of abstaining —
  // but none of them is an emergency on this evidence.
  if (assessment.specialistReferrals?.length) {
    clamped.specialistReferrals = assessment.specialistReferrals.map((r) => ({
      ...r,
      urgency: capReferralUrgency(
        r.urgency as unknown as string
      ) as typeof r.urgency,
    }));
  }

  // Non-critical safety hazards get their urgency capped as well. They are kept
  // rather than removed: the observation may be real even when the diagnosis is
  // not, and deleting a hazard is a worse error than softening one.
  if (assessment.safetyHazards?.hazards?.length) {
    clamped.safetyHazards = {
      ...assessment.safetyHazards,
      hazards: assessment.safetyHazards.hazards.map((h) =>
        h.severity === 'critical' ? h : { ...h, urgency: capUrgency(h.urgency) }
      ),
    };
  }

  return clamped;
}
