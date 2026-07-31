import { describe, it, expect } from 'vitest';
import { mergeFrameFindings } from '../merge-frame-findings';
import type { AssessmentFinding } from '../../types';

/**
 * A walkthrough merges findings from up to 20 frames into one survey, so a
 * claim like "mould above the kitchen cabinets" arrived with no way to check it
 * against what the camera actually saw — which is exactly the question someone
 * asks when a brand-new build is reported as having mould.
 *
 * These pin the provenance carried through the merge: which frame supplied a
 * finding's wording, and how many frames saw the same defect.
 */

const finding = (over: Partial<AssessmentFinding> = {}): AssessmentFinding => ({
  element: 'main_walls',
  damageType: 'damp',
  severity: 'developing',
  description: 'Mould above the cabinets',
  confidence: 80,
  ...over,
});

describe('mergeFrameFindings — frame provenance', () => {
  it('records which frame each finding came from', () => {
    const merged = mergeFrameFindings([
      { findings: [] },
      { findings: [finding()] }, // frame 1
    ]);

    expect(merged.findings[0]!.sourceFrameIndex).toBe(1);
    expect(merged.findings[0]!.sourceFrameIndexes).toEqual([1]);
  });

  it('lists every frame a defect was seen in, ascending', () => {
    const merged = mergeFrameFindings([
      { findings: [finding({ confidence: 60 })] }, // 0
      { findings: [] }, // 1
      { findings: [finding({ confidence: 70 })] }, // 2
      { findings: [finding({ confidence: 65 })] }, // 3
    ]);

    // One merged defect, seen three times.
    expect(merged.findings).toHaveLength(1);
    expect(merged.findings[0]!.sourceFrameIndexes).toEqual([0, 2, 3]);
  });

  it('shows the frame whose sighting supplied the wording, not just the first', () => {
    const merged = mergeFrameFindings([
      { findings: [finding({ severity: 'early', confidence: 50 })] }, // 0
      {
        findings: [
          finding({
            severity: 'significant',
            confidence: 95,
            description: 'Clear mould growth on the wall',
          }),
        ],
      }, // 1 — most severe, so its description wins
    ]);

    const f = merged.findings[0]!;
    expect(f.description).toBe('Clear mould growth on the wall');
    // The image shown must be the one the description was written from.
    expect(f.sourceFrameIndex).toBe(1);
    expect(f.sourceFrameIndexes).toEqual([0, 1]);
  });

  it('keeps provenance separate for defects on different elements', () => {
    const merged = mergeFrameFindings([
      { findings: [finding({ element: 'main_walls' })] }, // 0
      { findings: [finding({ element: 'ceilings' })] }, // 1
    ]);

    const walls = merged.findings.find((f) => f.element === 'main_walls');
    const ceilings = merged.findings.find((f) => f.element === 'ceilings');
    expect(walls?.sourceFrameIndex).toBe(0);
    expect(ceilings?.sourceFrameIndex).toBe(1);
  });

  it('survives normalizeFindings, which rebuilds findings field by field', () => {
    // Regression guard: the merge output passes through normalizeFindings,
    // which constructs new objects from a fixed field list. Anything not named
    // there is silently dropped, so provenance has to be explicitly carried.
    const merged = mergeFrameFindings([
      { findings: [finding()] },
      { findings: [finding({ element: 'ceilings' })] },
    ]);

    for (const f of merged.findings) {
      expect(typeof f.sourceFrameIndex).toBe('number');
    }
  });

  it('leaves provenance undefined when a frame reports nothing', () => {
    const merged = mergeFrameFindings([{ findings: [] }, { findings: [] }]);
    expect(merged.findings).toHaveLength(0);
  });
});
