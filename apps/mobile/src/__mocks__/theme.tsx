import React from 'react';

export const useTheme = () => ({
  theme: {
    mode: 'light',
    colors: {
      primary: {
        500: '#0EA5E9',
        600: '#0284C7',
      },
      secondary: {
        500: '#10B981',
        600: '#059669',
      },
      success: {
        50: '#F0FDF4',
        200: '#BBF7D0',
        600: '#16A34A',
        800: '#166534',
      },
      error: {
        50: '#FEF2F2',
        200: '#FECACA',
        500: '#EF4444',
        600: '#DC2626',
        800: '#991B1B',
      },
      warning: {
        50: '#FFFBEB',
        200: '#FDE68A',
        600: '#D97706',
        800: '#92400E',
      },
      info: {
        50: '#EFF6FF',
        200: '#BFDBFE',
        600: '#2563EB',
        800: '#1E40AF',
      },
      surface: {
        primary: '#FFFFFF',
        secondary: '#FAFAFA',
      },
      border: {
        primary: '#E5E5E5',
      },
      text: {
        primary: '#171717',
        secondary: '#737373',
        inverse: '#FFFFFF',
      },
    },
  },
});