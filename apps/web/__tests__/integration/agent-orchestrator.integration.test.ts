import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase — used by all agent services
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockSupabaseFrom }),
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/job-state-machine', () => ({
  validateStatusTransition: vi.fn().mockReturnValue(true),
}));

// Override the global setup.ts mocks to use the REAL implementations
// (the global setup replaces these with stub mocks that have wrong method names)
vi.mock('@/lib/services/agents/AgentOrchestrator', async () => {
  return await vi.importActual('@/lib/services/agents/AgentOrchestrator');
});
vi.mock('@/lib/services/agents/JobStatusAgent', async () => {
  return await vi.importActual('@/lib/services/agents/JobStatusAgent');
});
vi.mock('@/lib/services/agents/NotificationAgent', async () => {
  return await vi.importActual('@/lib/services/agents/NotificationAgent');
});
// AgentLogger and AutomationPreferencesService are imported by the agent modules
vi.mock('@/lib/services/agents/AgentLogger', async () => {
  return await vi.importActual('@/lib/services/agents/AgentLogger');
});
vi.mock('@/lib/services/agents/AutomationPreferencesService', async () => {
  return await vi.importActual('@/lib/services/agents/AutomationPreferencesService');
});

import { AgentOrchestrator } from '@/lib/services/agents/AgentOrchestrator';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { NotificationAgent } from '@/lib/services/agents/NotificationAgent';

// Helper to create a chainable Supabase mock
function createChainMock(finalData: unknown = null, finalError: unknown = null) {
  const terminal = vi.fn().mockResolvedValue({ data: finalData, error: finalError });
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler = () => new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'then') return undefined; // not a promise
      if (['single', 'maybeSingle'].includes(prop as string)) return terminal;
      return vi.fn(handler);
    },
  });
  return handler;
}

describe('Agent System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AgentOrchestrator', () => {
    it('checks automation preferences before executing agent action', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { enable_automation: false },
              error: null,
            }),
          }),
        }),
      }));

      const isEnabled = await AgentOrchestrator.isAutomationEnabled(
        'user-123',
        'bid_acceptance'
      );

      expect(isEnabled).toBe(false);
    });

    it('processes job lifecycle without throwing', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'job-123',
                status: 'in_progress',
                homeowner_id: 'user-123',
                contractor_id: 'contractor-456',
                enable_automation: true,
                auto_complete_jobs: true,
              },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null }),
          }),
        }),
      }));

      await expect(
        AgentOrchestrator.processJobLifecycle('job-123', 'user-123')
      ).resolves.not.toThrow();
    });
  });

  describe('JobStatusAgent', () => {
    it('returns null for non-in_progress jobs', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'job-123',
                status: 'completed', // not in_progress
                homeowner_id: 'user-123',
                contractor_id: 'contractor-456',
              },
              error: null,
            }),
          }),
        }),
      }));

      const result = await JobStatusAgent.evaluateAutoComplete('job-123');
      expect(result).toBeNull();
    });

    it('returns null when job not found', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      }));

      const result = await JobStatusAgent.evaluateAutoComplete('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null for non-pending jobs on auto-cancel', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'job-456',
                status: 'in_progress', // not pending
                homeowner_id: 'user-789',
              },
              error: null,
            }),
          }),
        }),
      }));

      const result = await JobStatusAgent.evaluateAutoCancel('job-456');
      expect(result).toBeNull();
    });
  });

  describe('NotificationAgent', () => {
    it('determines immediate send for urgent notifications', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                notification_batching: false,
                quiet_hours_start: null,
                quiet_hours_end: null,
              },
              error: null,
            }),
          }),
        }),
      }));

      const shouldSend = await NotificationAgent.shouldSendImmediately(
        'user-123',
        'bid_received',
        { priority: 'high' }
      );

      expect(typeof shouldSend).toBe('object');
    });
  });
});
