jest.mock('../sentry', () => ({
  initSentry: jest.fn(),
}));

import { initSentry } from '../sentry';

describe('initSentry', () => {
  it('is available as a function', () => {
    expect(typeof initSentry).toBe('function');
  });
});
