/**
 * Multi-finding shadow scoring.
 *
 * The teacher and student each return a SET of findings. Field-by-field diff
 * on a single primary defect (compareAssessments) misses the real question:
 * did the student find the SAME defects the teacher did? This scores the two
 * sets — greedy match by defect identity (same taxonomy class, else same
 * damage type; element is only a tiebreaker), then precision / recall / F1,
 * per-matched-pair severity & condition agreement, and the single most
 * important metric: safety-finding recall (did the student miss a
 * safety-critical defect the teacher flagged?).
 *
 * A v2 student trained single-defect will score low recall here — that low
 * recall is exactly the multi-finding gap a v3 student must close.
 */
import type {
  AssessmentFinding,
  DamageSeverity,
  Phase1BuildingAssessment,
} from '../types';
import { isSafetyCriticalTaxonomyClass } from '../taxonomy/taxonomy-v3';

const SEVERITY_RANK: Record<DamageSeverity, number> = {
  early: 0,
  developing: 1,
  significant: 2,
  dangerous: 3,
};

export interface FindingMatch {
  teacherIndex: number;
  studentIndex: number;
  /**
   * Defect-identity basis. Element is a LOCATION not a defect — two different
   * defects can share an element (damp + masonry erosion on the same wall) —
   * so element is never a match basis, only a tiebreaker among same-type
   * candidates.
   */
  matchBasis: 'taxonomy' | 'damageType';
  severityExact: boolean;
  severityOffByOne: boolean;
  conditionExact: boolean;
}

export interface FindingsComparison {
  teacherCount: number;
  studentCount: number;
  matchedCount: number;
  /** matched / studentCount — high = student didn't invent defects. */
  precision: number;
  /** matched / teacherCount — high = student didn't miss defects. */
  recall: number;
  f1: number;
  /** Of matched pairs, fraction sharing the same taxonomy class. */
  taxonomyMatchRate: number;
  /** Of matched pairs, fraction with exactly equal severity. */
  meanSeverityMatch: number;
  /** Of matched pairs where both carry a rating, fraction equal. */
  meanConditionMatch: number;
  /** Of the teacher's safety-critical findings, fraction the student matched. */
  safetyFindingRecall: number;
  /** Human-readable labels of safety-critical teacher findings the student missed. */
  missedSafetyCritical: string[];
  matches: FindingMatch[];
}

/** True for a finding that a surveyor must not miss. */
function isSafetyCritical(f: AssessmentFinding): boolean {
  return (
    f.severity === 'dangerous' ||
    f.conditionRating === 3 ||
    isSafetyCriticalTaxonomyClass(f.taxonomyClassId)
  );
}

/** A side's findings, synthesising a single finding from the primary when empty. */
function effectiveFindings(a: Phase1BuildingAssessment): AssessmentFinding[] {
  if (a.findings && a.findings.length > 0) return a.findings;
  const da = a.damageAssessment;
  if (!da?.damageType) return [];
  return [
    {
      element: 'general',
      taxonomyClassId: a.taxonomyClassId,
      damageType: da.damageType,
      severity: da.severity,
      conditionRating: a.ricsConditionRating,
      description: da.description ?? '',
      probableCause: a.probableCause,
      confidence: da.confidence ?? 0,
      isPrimary: true,
    },
  ];
}

const norm = (s?: string): string => (s ?? '').trim().toLowerCase();

/**
 * Match strength between a teacher and student finding (0 = no match).
 * Defect identity only: same taxonomy class (strongest) or same damage type.
 * Same element does NOT make a match — it's a tiebreaker applied at the call
 * site among candidates that already share a defect type.
 */
function matchScore(
  t: AssessmentFinding,
  s: AssessmentFinding
): { score: number; basis: FindingMatch['matchBasis'] } {
  if (
    t.taxonomyClassId &&
    s.taxonomyClassId &&
    t.taxonomyClassId === s.taxonomyClassId
  ) {
    return { score: 2, basis: 'taxonomy' };
  }
  if (norm(t.damageType) && norm(t.damageType) === norm(s.damageType)) {
    return { score: 1, basis: 'damageType' };
  }
  return { score: 0, basis: 'damageType' };
}

export function compareFindings(
  teacher: Phase1BuildingAssessment,
  student: Phase1BuildingAssessment | null
): FindingsComparison {
  const teacherFindings = effectiveFindings(teacher);
  const studentFindings = student ? effectiveFindings(student) : [];

  const matches: FindingMatch[] = [];
  const usedStudent = new Set<number>();

  // Greedy: each teacher finding takes its best still-available student match.
  // Ties on defect-type score break toward the same element (the more likely
  // to be the same physical defect).
  teacherFindings.forEach((t, ti) => {
    let best = {
      score: 0,
      basis: 'damageType' as FindingMatch['matchBasis'],
      si: -1,
      sameElement: false,
    };
    studentFindings.forEach((s, si) => {
      if (usedStudent.has(si)) return;
      const m = matchScore(t, s);
      if (m.score === 0) return;
      const sameElement =
        Boolean(t.element && s.element) && norm(t.element) === norm(s.element);
      const better =
        m.score > best.score ||
        (m.score === best.score && sameElement && !best.sameElement);
      if (better) best = { score: m.score, basis: m.basis, si, sameElement };
    });
    if (best.score > 0 && best.si >= 0) {
      usedStudent.add(best.si);
      const s = studentFindings[best.si];
      const rankDelta = Math.abs(
        SEVERITY_RANK[t.severity] - SEVERITY_RANK[s.severity]
      );
      matches.push({
        teacherIndex: ti,
        studentIndex: best.si,
        matchBasis: best.basis,
        severityExact: rankDelta === 0,
        severityOffByOne: rankDelta <= 1,
        conditionExact:
          t.conditionRating != null &&
          s.conditionRating != null &&
          t.conditionRating === s.conditionRating,
      });
    }
  });

  const teacherCount = teacherFindings.length;
  const studentCount = studentFindings.length;
  const matchedCount = matches.length;

  const precision = studentCount > 0 ? matchedCount / studentCount : 0;
  const recall = teacherCount > 0 ? matchedCount / teacherCount : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  const taxonomyMatchRate =
    matchedCount > 0
      ? matches.filter((m) => m.matchBasis === 'taxonomy').length / matchedCount
      : 0;
  const meanSeverityMatch =
    matchedCount > 0
      ? matches.filter((m) => m.severityExact).length / matchedCount
      : 0;
  const conditionPairs = matches.filter((m) => {
    const t = teacherFindings[m.teacherIndex];
    const s = studentFindings[m.studentIndex];
    return t.conditionRating != null && s.conditionRating != null;
  });
  const meanConditionMatch =
    conditionPairs.length > 0
      ? conditionPairs.filter((m) => m.conditionExact).length /
        conditionPairs.length
      : 1;

  // Safety-finding recall — the metric that matters most.
  const safetyTeacher = teacherFindings
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => isSafetyCritical(f));
  const matchedTeacherIdx = new Set(matches.map((m) => m.teacherIndex));
  const safetyMatched = safetyTeacher.filter(({ i }) =>
    matchedTeacherIdx.has(i)
  );
  const safetyFindingRecall =
    safetyTeacher.length > 0 ? safetyMatched.length / safetyTeacher.length : 1;
  const missedSafetyCritical = safetyTeacher
    .filter(({ i }) => !matchedTeacherIdx.has(i))
    .map(
      ({ f }) =>
        `${f.element || 'general'}: ${f.taxonomyClassId || f.damageType}`
    );

  return {
    teacherCount,
    studentCount,
    matchedCount,
    precision: round(precision),
    recall: round(recall),
    f1: round(f1),
    taxonomyMatchRate: round(taxonomyMatchRate),
    meanSeverityMatch: round(meanSeverityMatch),
    meanConditionMatch: round(meanConditionMatch),
    safetyFindingRecall: round(safetyFindingRecall),
    missedSafetyCritical,
    matches,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
