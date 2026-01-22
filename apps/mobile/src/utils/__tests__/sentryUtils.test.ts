import {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} from '../sentryUtils';

describe('sentryUtils', () => {
  it('exports helper functions', () => {
    expect(typeof setUserContext).toBe('function');
    expect(typeof trackUserAction).toBe('function');
    expect(typeof addBreadcrumb).toBe('function');
    expect(typeof measureAsyncPerformance).toBe('function');
  });
});
