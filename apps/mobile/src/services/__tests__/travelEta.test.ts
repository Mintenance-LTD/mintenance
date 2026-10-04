import { estimateTravelMinutes } from '../travelEta';
it.each([0, null, -1, 0.01])(
  'reports zero at the property with speed %s',
  (speed) => {
    expect(estimateTravelMinutes(0.04, speed)).toBe(0);
  }
);
it('uses an urban estimate when stationary away from the property', () => {
  expect(estimateTravelMinutes(5, 0)).toBe(12);
});
it('uses measured speed while travelling', () => {
  expect(estimateTravelMinutes(10, 10)).toBe(20);
});
