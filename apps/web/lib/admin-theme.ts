import { mintEditorial } from '@mintenance/design-tokens';
import { theme as baseTheme } from './theme';
/** Admin uses the same Mint Editorial palette as homeowner and contractor screens. */
export const theme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    ...mintEditorial, adminPrimary: mintEditorial.primary, adminPrimaryLight: mintEditorial.primaryLight,
  },
};
