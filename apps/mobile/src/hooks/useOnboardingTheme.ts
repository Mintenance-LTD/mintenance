import { useTheme } from '../design-system/theme';
import { me } from '../design-system/mint-editorial';
import { getTheme } from '../theme';

/** Resolve onboarding colours on render so an in-app theme change is reflected. */
export function useOnboardingTokens() {
  const { colorScheme } = useTheme();
  const colors = getTheme(colorScheme === 'dark').colors;
  return {
    ...me,
    brand: me.brand2,
    ...(colorScheme === 'dark'
      ? {
          bg: colors.background,
          bg2: colors.backgroundSecondary,
          bg3: colors.backgroundTertiary,
          surface: colors.surface,
          ink: colors.textPrimary,
          ink2: colors.textSecondary,
          ink3: colors.textTertiary,
          line: colors.border,
          line2: colors.border,
          brandSoft: colors.surfaceSecondary,
        }
      : {}),
  };
}

export function useOnboardingTheme() {
  const { colorScheme } = useTheme();
  const tokens = useOnboardingTokens();
  const base = getTheme(colorScheme === 'dark');
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: tokens.brand,
      primaryLight: tokens.brandSoft,
      background: tokens.bg,
      surface: tokens.surface,
      textPrimary: tokens.ink,
      textSecondary: tokens.ink2,
      border: tokens.line,
    },
  };
}
