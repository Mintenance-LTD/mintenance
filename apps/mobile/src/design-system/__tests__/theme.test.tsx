import { lightTheme, darkTheme, getThemeColor } from '../theme';

describe('theme', () => {
  it('exports default theme definitions', () => {
    expect(lightTheme).toBeDefined();
    expect(darkTheme).toBeDefined();
    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.mode).toBe('dark');
  });

  it('resolves theme colors by path', () => {
    const value = getThemeColor(lightTheme, 'text.primary');
    expect(value).toBe(lightTheme.colors.text.primary);
  });
});
