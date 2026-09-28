import { parseVisualObservation } from './visual-observation';

const healthy = {
  scope: 'visible_region',
  outcome: 'no_visible_defect',
  crackPresent: false,
  observations: [],
  limitations: ['Only this region is visible'],
};
const parse = (value: unknown) =>
  parseVisualObservation(JSON.stringify(value), 'stop', 1);
describe('Visual observation contract', () => {
  it('allows a readable region with no visible defect without issuing a safety score', () => {
    expect(parse(healthy)).toEqual(healthy);
  });
  it('keeps unreadable evidence distinct from a healthy surface', () => {
    expect(
      parse({
        ...healthy,
        outcome: 'insufficient_evidence',
        crackPresent: null,
      })
    ).toMatchObject({ crackPresent: null });
    expect(() =>
      parse({ ...healthy, outcome: 'insufficient_evidence' })
    ).toThrow();
  });
  it('rejects disagreement between crack status and findings', () => {
    expect(() => parse({ ...healthy, crackPresent: true })).toThrow();
    expect(() =>
      parse({
        ...healthy,
        outcome: 'visible_defect',
        observations: [
          {
            kind: 'crack',
            description: 'Visible line at centre',
            imageIndex: 0,
          },
        ],
      })
    ).toThrow();
  });
  it('rejects out-of-scope score fields and nonexistent source images', () => {
    expect(() => parse({ ...healthy, safetyScore: 100 })).toThrow();
    expect(() =>
      parse({
        ...healthy,
        outcome: 'visible_defect',
        crackPresent: true,
        observations: [{ kind: 'crack', description: 'Line', imageIndex: 1 }],
      })
    ).toThrow();
  });
  it('rejects a truncated response even if the JSON fragment is complete', () => {
    expect(() =>
      parseVisualObservation(JSON.stringify(healthy), 'length', 1)
    ).toThrow();
  });
});
