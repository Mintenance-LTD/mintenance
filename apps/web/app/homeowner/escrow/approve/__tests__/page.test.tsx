import { vi } from 'vitest';

// Mock logger BEFORE importing page
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock server-side functions
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { metadata } from '../page';

describe('Homeowner Escrow Approve Page metadata', () => {
  it('should have correct metadata', () => {
    expect(metadata).toBeDefined();
  });
});
