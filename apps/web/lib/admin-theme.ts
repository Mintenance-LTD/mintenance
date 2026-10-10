import { theme as baseTheme } from './theme';
/** Admin uses the same Mint Editorial palette as homeowner and contractor screens. */
export const theme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    primary: '#2f6f5f', primaryLight: '#dceae5', primaryDark: '#245748',
    adminPrimary: '#2f6f5f', adminPrimaryLight: '#dceae5',
    background: '#f3f7f4', backgroundSecondary: '#e9f1eb', backgroundTertiary: '#dee9e0',
    textPrimary: '#1a2520', textSecondary: '#4a5751', border: '#d8e2da',
  },
};
