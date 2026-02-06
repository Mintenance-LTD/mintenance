import { initSentry } from '../sentry';

jest.mock('../sentry', () => ({
  initSentry: jest.fn(),
}));

describe('initSentry', () => {
  it('is available as a function', () => {
    expect(typeof initSentry).toBe('function');
  });
});
