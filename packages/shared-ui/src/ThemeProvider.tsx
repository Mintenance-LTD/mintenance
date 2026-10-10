'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { webTokens, mintEditorial } from '@mintenance/design-tokens';

const mintTokens = {
  ...webTokens,
  colors: {
    ...webTokens.colors,
    ...mintEditorial, secondary: mintEditorial.primaryDark, success: mintEditorial.primary,
  },
};
const ThemeContext = createContext<'legacy' | 'mint-editorial'>('legacy');
/** React context keeps the same tokens inside portalled dialogs. */
export function SharedThemeProvider({ children, theme = 'mint-editorial' }: {
  children: ReactNode; theme?: 'legacy' | 'mint-editorial';
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
export function useSharedTheme() { return useContext(ThemeContext); }
export function useWebTokens() {
  return useSharedTheme() === 'mint-editorial' ? mintTokens : webTokens;
}

