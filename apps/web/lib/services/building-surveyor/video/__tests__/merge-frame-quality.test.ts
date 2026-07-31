import { describe, it, expect } from 'vitest';
import { mergeFrameFindings } from '../merge-frame-findings';
import type { AssessmentFinding } from '../../types';

/**
 * Merge quality — the false-positive controls.
 *
 * A real 12-frame walkthrough of one room produced seven "findings": the same
 * wall reported twice as undamaged, a window reported as both misaligned and in
 * good condition, and a ceiling "discoloration" that exactly one frame saw
 * while eleven did not. The last of those was a shadow.
 *
 * These pin the three mechanisms that let that happen.
 */

const finding = (over: Partial<AssessmentFinding> = {}): AssessmentFinding => ({
  element: 'ceilings',
  damageType: 'discoloration',
  severity: 'developing',
  conditionRating: 2,
  description: 'Visible discoloration on the ceiling',
  confidence: 70,
  ...over,
});

/** A frame that reported nothing. */
const empty = { findings: [] };

/** n frames of nothing, so a walk is long enough for corroboration to apply. */
const padding = (n: number) => Array.from({ length: n }, () => empty);

describe('mergeFrameFindings — clustering', () => {
  it('merges identical defects whose taxonomy ids happen to differ', () => {
    // The live bug: identity preferred taxonomyClassId, so the same reading
    // about the same wall split into two findings the user saw listed twice.
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({
            element: 'main_walls',
            damageType: 'no visible damage',
            severity: 'early',
            conditionRating: 1,
            taxonomyClassId: 'wall_generic',
          }),
        ],
      },
      {
        findings: [
          finding({
            element: 'main_walls',
            damageType: 'no visible damage',
            severity: 'early',
            conditionRating: 1,
            taxonomyClassId: 'wall_other',
          }),
        ],
      },
    ]);

    expect(merged.findings).toHaveLength(1);
    expect(merged.findings[0]!.sourceFrameIndexes).toEqual([0, 1]);
  });

  it('still merges on taxonomy when the damage wording differs', () => {
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({ damageType: 'damp', taxonomyClassId: 'cond_damp' }),
        ],
      },
      {
        findings: [
          finding({
            damageType: 'moisture staining',
            taxonomyClassId: 'cond_damp',
          }),
        ],
      },
    ]);

    expect(merged.findings).toHaveLength(1);
  });

  it('keeps genuinely different defects apart', () => {
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({ element: 'ceilings', damageType: 'discoloration' }),
        ],
      },
      {
        findings: [finding({ element: 'windows', damageType: 'misalignment' })],
      },
    ]);

    expect(merged.findings).toHaveLength(2);
  });
});

describe('mergeFrameFindings — clean readings', () => {
  it('flags a no-defect reading as clear', () => {
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({
            damageType: 'no visible damage',
            severity: 'early',
            conditionRating: 1,
            description: 'Ceiling appears to be in good condition',
          }),
        ],
      },
      empty,
    ]);

    expect(merged.findings[0]!.isClear).toBe(true);
  });

  it('does not flag a real defect as clear', () => {
    const merged = mergeFrameFindings([{ findings: [finding()] }, empty]);
    expect(merged.findings[0]!.isClear).toBeUndefined();
  });

  it('never makes a clean reading the primary when a defect exists', () => {
    // Otherwise "no visible damage" gets mirrored into the survey's headline.
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({
            element: 'main_walls',
            damageType: 'no visible damage',
            severity: 'early',
            conditionRating: 1,
          }),
        ],
      },
      { findings: [finding({ severity: 'significant', conditionRating: 3 })] },
    ]);

    expect(merged.primary?.isClear).toBeUndefined();
    expect(merged.primary?.damageType).toBe('discoloration');
  });
});

describe('mergeFrameFindings — corroboration', () => {
  it('demotes a defect only one frame of many saw', () => {
    // The ceiling "discoloration" from the real survey: 1 sighting in 12.
    const merged = mergeFrameFindings([
      { findings: [finding()] },
      ...padding(11),
    ]);

    const f = merged.findings[0]!;
    expect(f.unconfirmed).toBe(true);
    expect(f.severity).toBe('early');
    expect(f.conditionRating).toBe(1);
  });

  it('leaves a corroborated defect at full strength', () => {
    const merged = mergeFrameFindings([
      { findings: [finding()] },
      { findings: [finding()] },
      ...padding(10),
    ]);

    const f = merged.findings[0]!;
    expect(f.unconfirmed).toBeUndefined();
    expect(f.severity).toBe('developing');
    expect(f.conditionRating).toBe(2);
  });

  it('never talks down a dangerous finding, however thin the evidence', () => {
    // Demoting one-frame exposed wiring to "no repair needed" is how somebody
    // gets hurt. It is labelled, not softened.
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({
            element: 'electrical_services',
            damageType: 'exposed wiring',
            severity: 'dangerous',
            conditionRating: 3,
          }),
        ],
      },
      ...padding(11),
    ]);

    const f = merged.findings[0]!;
    expect(f.unconfirmed).toBe(true);
    expect(f.severity).toBe('dangerous');
    expect(f.conditionRating).toBe(3);
  });

  it('never talks down a significant finding either', () => {
    const merged = mergeFrameFindings([
      { findings: [finding({ severity: 'significant', conditionRating: 3 })] },
      ...padding(11),
    ]);

    const f = merged.findings[0]!;
    expect(f.unconfirmed).toBe(true);
    expect(f.severity).toBe('significant');
  });

  it('does not penalise a lone sighting on a short walk', () => {
    // In a 2-frame walk "seen once" carries no information.
    const merged = mergeFrameFindings([{ findings: [finding()] }, empty]);

    const f = merged.findings[0]!;
    expect(f.unconfirmed).toBeUndefined();
    expect(f.severity).toBe('developing');
  });

  it('does not mark a clean reading unconfirmed', () => {
    const merged = mergeFrameFindings([
      {
        findings: [
          finding({
            damageType: 'no visible damage',
            severity: 'early',
            conditionRating: 1,
          }),
        ],
      },
      ...padding(11),
    ]);

    expect(merged.findings[0]!.unconfirmed).toBeUndefined();
  });
});

describe('mergeFrameFindings — scene summary', () => {
  it('collapses restatements of the same sentence', () => {
    const merged = mergeFrameFindings([
      { findings: [], sceneSummary: 'Room appears to be in good condition.' },
      {
        findings: [],
        sceneSummary: 'The room appears to be in good condition',
      },
      { findings: [], sceneSummary: 'Room appears to be in good condition' },
    ]);

    expect(merged.sceneSummary).toBe('Room appears to be in good condition.');
  });

  it('keeps genuinely different observations', () => {
    const merged = mergeFrameFindings([
      { findings: [], sceneSummary: 'Room appears well maintained.' },
      {
        findings: [],
        sceneSummary: 'Ceiling shows discoloration near the rail.',
      },
    ]);

    expect(merged.sceneSummary).toContain('well maintained');
    expect(merged.sceneSummary).toContain('discoloration');
  });

  it('caps the summary so it stays a summary', () => {
    // 12 frames used to concatenate into a self-contradicting paragraph.
    const merged = mergeFrameFindings(
      Array.from({ length: 12 }, (_, i) => ({
        findings: [],
        sceneSummary: `Distinct observation number ${i}.`,
      }))
    );

    const sentences = (merged.sceneSummary ?? '')
      .split('.')
      .filter((s) => s.trim());
    expect(sentences).toHaveLength(3);
  });

  it('is undefined when no frame described the scene', () => {
    const merged = mergeFrameFindings([empty, empty]);
    expect(merged.sceneSummary).toBeUndefined();
  });
});
