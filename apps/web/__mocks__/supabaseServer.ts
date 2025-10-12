/**
 * Mock for lib/api/supabaseServer
 */

import { createMockQueryBuilder } from './@supabase/supabase-js';

export const serverSupabase = {
  from: jest.fn((table: string) => createMockQueryBuilder()),
  rpc: jest.fn((fn: string, params?: any) => 
    Promise.resolve({ data: null, error: null })
  ),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signUp: jest.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
};

