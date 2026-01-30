import { vi } from 'vitest';

// Mock logger BEFORE importing page to prevent logger errors
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock all server-side functions
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: vi.fn(),
}));

vi.mock('@/lib/cache', () => ({
  getCachedContractors: vi.fn(),
  getCachedJobs: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { metadata } from '../page';

describe('Discover Page metadata', () => {
  it('should have correct metadata', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('Discover | Mintenance');
    expect(metadata.description).toBe('Discover contractors and jobs on Mintenance');
  });
});
