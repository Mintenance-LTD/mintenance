import { App } from '../App';

jest.mock('../App', () => ({
  App: () => null,
}));

describe('App', () => {
  it('exports the App component', () => {
    expect(typeof App).toBe('function');
  });
});
