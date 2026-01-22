#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Fixing Phase 5 test issues...\n');

// Find all Phase 5 test files
const phase5Dirs = [
  'src/__tests__/critical-paths/**/*.test.{ts,tsx}',
  'src/__tests__/utils/comprehensive/*.test.{ts,tsx}',
  'src/__tests__/hooks/comprehensive/*.test.{ts,tsx}',
  'src/__tests__/screens/integration/*.test.{ts,tsx}',
  'src/__tests__/services/comprehensive/*.test.{ts,tsx}',
  'src/__tests__/components/snapshot/*.test.{ts,tsx}',
];

let totalFixes = 0;

phase5Dirs.forEach(pattern => {
  const testFiles = glob.sync(pattern, {
    cwd: __dirname,
    absolute: true,
  });

  testFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    const fileName = path.basename(file);
    let modified = false;

    // Fix 1: Update test-utils imports based on location
    if (content.includes("from '../../test-utils'")) {
      const depth = file.split('__tests__/')[1].split('/').length - 1;
      const testUtilsPath = depth === 0 ? '../test-utils' : '../'.repeat(depth + 1) + 'test-utils';

      content = content.replace(/from ['"].*test-utils['"]/g, `from '${testUtilsPath}'`);
      modified = true;
    }

    // Fix 2: Add missing React import for TSX files
    if (file.endsWith('.tsx') && !content.includes("import React")) {
      content = "import React from 'react';\n" + content;
      modified = true;
    }

    // Fix 3: Fix service paths
    content = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/services\//g,
      "from '../../../../services/"
    );

    // Fix 4: Fix screen paths
    content = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/screens\//g,
      "from '../../../../screens/"
    );

    // Fix 5: Fix component paths
    content = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/components\//g,
      "from '../../../../components/"
    );

    // Fix 6: Fix utils paths
    content = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/utils\//g,
      "from '../../../utils/"
    );

    // Fix 7: Fix hooks paths
    content = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/hooks\//g,
      "from '../../../hooks/"
    );

    // Fix 8: Add expo-local-authentication mock if needed
    if (content.includes('expo-local-authentication') && !content.includes("jest.mock('expo-local-authentication')")) {
      const mockCode = `
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));
`;
      content = content.replace(
        "jest.mock('../../../services/AuthService');",
        "jest.mock('../../../services/AuthService');" + mockCode
      );
      modified = true;
    }

    // Fix 9: Create missing utility modules as simple exports
    if (fileName.includes('validation.comprehensive')) {
      // Ensure validation module exists
      const validationPath = path.join(__dirname, 'src/utils/validation.ts');
      if (!fs.existsSync(validationPath)) {
        const validationModule = `
export const isValidEmail = (email: any): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: any): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[\d\s()-]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const isStrongPassword = (password: any): boolean => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password);
};

export const checkPasswordRequirements = (password: string) => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*]/.test(password),
});

export const sanitizeInput = (input: any): string => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim();
};

export const isValidDate = (date: any): boolean => {
  return !isNaN(Date.parse(date));
};

export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

export const isValidCreditCard = (number: string): boolean => {
  return /^\d{13,19}$/.test(number.replace(/\s/g, ''));
};

export const getCardType = (number: string): string => {
  if (number.startsWith('4')) return 'visa';
  if (number.startsWith('5')) return 'mastercard';
  if (number.startsWith('3')) return 'amex';
  return 'unknown';
};

export const isValidCVV = (cvv: string, cardType: string): boolean => {
  return cardType === 'amex' ? cvv.length === 4 : cvv.length === 3;
};

export const isValidZIP = (zip: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zip);
};

export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
`;
        fs.writeFileSync(validationPath, validationModule);
        logger.info('  Created validation.ts module');
      }
    }

    if (fileName.includes('formatters.comprehensive')) {
      // Ensure formatters module exists
      const formattersPath = path.join(__dirname, 'src/utils/formatters.ts');
      if (!fs.existsSync(formattersPath)) {
        const formattersModule = `
export const formatCurrency = (amount: any, currency = 'USD'): string => {
  const value = Number(amount) || 0;
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || '$';
  const formatted = Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return value < 0 ? \`-\${symbol}\${formatted}\` : \`\${symbol}\${formatted}\`;
};

export const formatDate = (date: Date, format = 'default'): string => {
  const options: any = format === 'short' ? { year: '2-digit', month: 'numeric', day: 'numeric' } :
                       format === 'long' ? { year: 'numeric', month: 'long', day: 'numeric' } :
                       { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

export const formatTime = (date: Date, format = '12h'): string => {
  if (format === '24h') {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return \`\${days} days ago\`;
  if (days < 30) return \`\${Math.floor(days / 7)} week\${days >= 14 ? 's' : ''} ago\`;
  return \`\${Math.floor(days / 30)} month\${days >= 60 ? 's' : ''} ago\`;
};

export const formatDateRange = (start: Date, end: Date): string => {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endFull = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return \`\${startMonth} - \${endFull}\`;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return \`(\${cleaned.slice(0, 3)}) \${cleaned.slice(3, 6)}-\${cleaned.slice(6)}\`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return \`+1 (\${cleaned.slice(1, 4)}) \${cleaned.slice(4, 7)}-\${cleaned.slice(7)}\`;
  }
  return phone;
};

export const formatName = (name: string): string => {
  return name.split(/[\s-]/).map(part =>
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join(' ');
};

export const getInitials = (name: string): string => {
  const parts = name.split(' ');
  return parts[0][0] + (parts[parts.length - 1][0] || '');
};

export const formatAddress = (address: any): string => {
  const parts = [address.street, address.apt, \`\${address.city}, \${address.state} \${address.zip}\`];
  return parts.filter(Boolean).join(' ');
};

export const formatPercent = (value: number): string => {
  return \`\${(value * 100).toFixed(2)}%\`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return \`\${bytes} B\`;
  if (bytes < 1048576) return \`\${Math.round(bytes / 1024)} KB\`;
  if (bytes < 1073741824) return \`\${Math.round(bytes / 1048576)} MB\`;
  return \`\${Math.round(bytes / 1073741824)} GB\`;
};

export const formatDistance = (miles: number): string => {
  return \`\${miles.toLocaleString()} mi\`;
};

export const truncate = (text: string, length: number): string => {
  return text.length > length ? text.slice(0, length - 3) + '...' : text;
};

export const pluralize = (count: number, word: string): string => {
  return \`\${count} \${word}\${count !== 1 ? 's' : ''}\`;
};

export const toSlug = (text: string): string => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
};
`;
        fs.writeFileSync(formattersPath, formattersModule);
        logger.info('  Created formatters.ts module');
      }
    }

    // Fix 10: Create missing hook modules
    if (fileName.includes('useDebounce.test')) {
      const hookPath = path.join(__dirname, 'src/hooks/useDebounce.ts');
      if (!fs.existsSync(hookPath)) {
        const hookModule = `
import { useEffect, useState } from 'react';

import { logger } from '@mintenance/shared';
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
`;
        fs.writeFileSync(hookPath, hookModule);
        logger.info('  Created useDebounce.ts hook');
      }
    }

    if (fileName.includes('useInfiniteScroll.test')) {
      const hookPath = path.join(__dirname, 'src/hooks/useInfiniteScroll.ts');
      if (!fs.existsSync(hookPath)) {
        const hookModule = `
import { useState, useCallback, useEffect } from 'react';

export const useInfiniteScroll = (fetchFn: (page: number) => Promise<any>) => {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const result = await fetchFn(pageNum);

      if (isRefresh || pageNum === 1) {
        setData(result.data);
      } else {
        setData(prev => [...prev, ...result.data]);
      }

      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    loadData(1);
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadData(page + 1);
      setPage(p => p + 1);
    }
  }, [loadingMore, hasMore, page, loadData]);

  const refresh = useCallback(() => {
    setPage(1);
    loadData(1, true);
  }, [loadData]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    data,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    page,
    loadMore,
    refresh,
    reset,
  };
};
`;
        fs.writeFileSync(hookPath, hookModule);
        logger.info('  Created useInfiniteScroll.ts hook');
      }
    }

    if (modified && content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      totalFixes++;
      logger.info(`  Fixed ${fileName}`);
    }
  });
});

logger.info(`\n📊 Summary:`);
logger.info(`  Total files fixed: ${totalFixes}`);
logger.info('\n✨ Phase 5 test fixes complete!');