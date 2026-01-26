import newComponentsTheme from '../newComponentsTheme';

describe('newComponentsTheme', () => {
  it('exports theme tokens', () => {
    expect(newComponentsTheme.colors).toBeDefined();
    expect(newComponentsTheme.spacing).toBeDefined();
    expect(newComponentsTheme.typography).toBeDefined();
  });
});
