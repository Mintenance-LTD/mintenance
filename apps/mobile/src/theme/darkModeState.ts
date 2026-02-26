/**
 * Dark mode state — isolated in its own file to avoid circular imports
 * between theme/index.ts and design-system/theme.tsx.
 */

let _isDark = false;

/** Called by ThemeProvider when color scheme changes */
export function setDarkModeEnabled(isDark: boolean) {
  _isDark = isDark;
}

/** Read current dark mode state (used by theme color getters) */
export function isDarkMode(): boolean {
  return _isDark;
}
