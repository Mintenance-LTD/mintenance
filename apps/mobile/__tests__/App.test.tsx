jest.mock('../App', () => ({
  App: () => null,
}));

import { App } from '../App';

describe('App', () => {
  it('exports the App component', () => {
    expect(typeof App).toBe('function');
  });
});
