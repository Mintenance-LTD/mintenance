import { describe, it, expect } from 'vitest';
import {
  filterImplausibleElements,
  isElementVisibleIndoors,
  isInteriorWalkthrough,
} from '../element-plausibility';
import type { AssessmentFinding, AssessmentContext } from '../../types';

/**
 * Findings about things the camera could not see.
 *
 * A tonal patch on a ceiling invites a roof diagnosis from inside a bedroom,
 * complete with roofing cost and a structural referral, having never seen a tile.
 *
 * The filter is deliberately narrow, and these tests exist as much to pin what
 * it must NOT touch: most of the element vocabulary is visible from indoors, and
 * a filter that deleted `external_joinery` or `chimney` would be throwing away
 * real findings about window frames and chimney breasts.
 */

const finding = (over: Partial<AssessmentFinding> = {}): AssessmentFinding => ({
  element: 'roof_covering',
  damageType: 'slipped tiles',
  severity: 'developing',
  conditionRating: 2,
  description: 'Possible covering failure above.',
  confidence: 60,
  ...over,
});

const kitchen: AssessmentContext = {
  room: { id: 'r1', name: 'Kitchen', type: 'kitchen' },
};

describe('isElementVisibleIndoors', () => {
  it('rules out the roof', () => {
    expect(isElementVisibleIndoors('roof_covering')).toBe(false);
    expect(isElementVisibleIndoors('roof_timbers')).toBe(false);
    expect(isElementVisibleIndoors('rainwater_goods')).toBe(false);
  });

  it('normalises spacing and case', () => {
    expect(isElementVisibleIndoors('Roof Covering')).toBe(false);
    expect(isElementVisibleIndoors('roof-timbers')).toBe(false);
  });

  it('keeps everything genuinely visible from inside', () => {
    for (const el of [
      'main_walls',
      'ceilings',
      'floors',
      'windows',
      'electrical_services',
      'services_plumbing',
      'general',
    ]) {
      expect(isElementVisibleIndoors(el)).toBe(true);
    }
  });

  it('keeps external_joinery — it covers frames you look at from indoors', () => {
    // Two live findings used this element and are most likely legitimate.
    expect(isElementVisibleIndoors('external_joinery')).toBe(true);
  });

  it('keeps chimney — a chimney breast is an interior feature', () => {
    expect(isElementVisibleIndoors('chimney')).toBe(true);
  });
});

describe('isInteriorWalkthrough', () => {
  it('recognises the interior room types', () => {
    expect(isInteriorWalkthrough(kitchen)).toBe(true);
    expect(isInteriorWalkthrough({ room: { type: 'bathroom' } })).toBe(true);
  });

  it('is false for a whole-property walk with no room', () => {
    // The filter must not run when we cannot be certain we are indoors.
    expect(isInteriorWalkthrough(undefined)).toBe(false);
    expect(isInteriorWalkthrough({})).toBe(false);
    expect(isInteriorWalkthrough({ room: {} })).toBe(false);
  });

  it('is false for an exterior pass', () => {
    expect(isInteriorWalkthrough({ room: { type: 'exterior' } })).toBe(false);
  });

  it('is false for a room type it does not recognise', () => {
    // An allowlist: an unfamiliar type filters nothing rather than guessing.
    expect(isInteriorWalkthrough({ room: { type: 'loft' } })).toBe(false);
    expect(isInteriorWalkthrough({ room: { type: 'garage' } })).toBe(false);
  });
});

describe('filterImplausibleElements', () => {
  it('drops a roof finding made from inside a kitchen', () => {
    const result = filterImplausibleElements(
      [finding(), finding({ element: 'main_walls', damageType: 'damp' })],
      kitchen
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.element).toBe('main_walls');
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]?.element).toBe('roof_covering');
  });

  it('filters nothing on a whole-property walk', () => {
    // Outside, a roof finding is exactly what you want.
    const findings = [finding()];
    const result = filterImplausibleElements(findings, undefined);
    expect(result.findings).toBe(findings);
    expect(result.dropped).toEqual([]);
  });

  it('filters nothing on an exterior pass', () => {
    const result = filterImplausibleElements([finding()], {
      room: { type: 'exterior' },
    });
    expect(result.findings).toHaveLength(1);
  });

  it('keeps a dangerous implausible finding, marked unconfirmed', () => {
    // Same principle as everywhere else: a spurious hazard wastes time, a
    // deleted one can hurt somebody.
    const result = filterImplausibleElements(
      [finding({ severity: 'dangerous', conditionRating: 3 })],
      kitchen
    );

    expect(result.dropped).toEqual([]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.severity).toBe('dangerous');
    expect(result.findings[0]?.unconfirmed).toBe(true);
  });

  it('handles an empty or absent findings list', () => {
    expect(filterImplausibleElements([], kitchen).findings).toEqual([]);
    expect(filterImplausibleElements(undefined, kitchen).findings).toEqual([]);
  });

  it('does not mutate the input findings', () => {
    const input = [finding({ severity: 'dangerous' })];
    filterImplausibleElements(input, kitchen);
    expect(input[0]?.unconfirmed).toBeUndefined();
  });
});
