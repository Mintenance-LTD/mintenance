import {
  FeatureAccessManager,
  featureAccess,
  canPerformAction,
  formatLimit,
  getCategoryColor,
  MOBILE_FEATURES,
  TIER_PRICING,
  SubscriptionTier,
  UserRole,
  FeatureDefinition,
} from '../../utils/featureAccess';
import { supabase } from '../../config/supabase';
import { logger } from '@mintenance/shared';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn(),
              })),
            })),
          })),
        })),
        gte: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    rpc: jest.fn(),
  },
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('FeatureAccessManager', () => {
  let manager: FeatureAccessManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get a fresh instance
    manager = FeatureAccessManager.getInstance();
    manager.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FeatureAccessManager.getInstance();
      const instance2 = FeatureAccessManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across references', () => {
      const instance1 = FeatureAccessManager.getInstance();
      const instance2 = FeatureAccessManager.getInstance();

      expect(instance1.getTier()).toBe(instance2.getTier());
    });
  });

  describe('initialize', () => {
    it('should initialize for homeowner without fetching subscription', async () => {
      await manager.initialize('user123', 'homeowner');

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch subscription for contractor', async () => {
      const mockData = {
        plan_type: 'professional',
        status: 'active',
      };

      // Mock for contractor_subscriptions
      const subscriptionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: mockData,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock for feature_usage
      const usageQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'contractor_subscriptions') {
          return subscriptionQuery;
        } else if (table === 'feature_usage') {
          return usageQuery;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await manager.initialize('contractor123', 'contractor');

      expect(supabase.from).toHaveBeenCalledWith('contractor_subscriptions');
      expect(manager.getTier()).toBe('professional');
    });

    it('should default to trial when no subscription found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        gte: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await manager.initialize('contractor123', 'contractor');

      expect(manager.getTier()).toBe('trial');
    });

    it('should fetch and store usage data', async () => {
      const mockUsageData = [
        {
          feature_id: 'CONTRACTOR_BID_LIMIT',
          used_count: 10,
          limit_count: 20,
        },
      ];

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'feature_usage') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: mockUsageData,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await manager.initialize('contractor123', 'contractor');

      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(10);
    });

    it('should handle initialization error gracefully', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      await manager.initialize('contractor123', 'contractor');

      expect(logger.error).toHaveBeenCalledWith(
        '[FeatureAccess] Initialization failed',
        expect.any(Error),
        { service: 'mobile' }
      );
      expect(manager.getTier()).toBe('trial');
    });
  });

  describe('hasAccess', () => {
    it('should grant full access to admin', () => {
      const hasAccess = manager.hasAccess('CONTRACTOR_BID_LIMIT', 'admin');

      expect(hasAccess).toBe(true);
    });

    it('should check homeowner features correctly', () => {
      const hasAccess = manager.hasAccess('HOMEOWNER_POST_JOBS', 'homeowner');
      const noAccess = manager.hasAccess('CONTRACTOR_BID_LIMIT', 'homeowner');

      expect(hasAccess).toBe(true);
      expect(noAccess).toBe(false);
    });

    it('should return false for unknown feature', () => {
      const hasAccess = manager.hasAccess('UNKNOWN_FEATURE', 'contractor');

      expect(hasAccess).toBe(false);
    });

    it('should check boolean access for contractor', async () => {
      // Initialize as professional tier
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'professional', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // feature_usage table
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await manager.initialize('contractor123', 'contractor');

      expect(manager.hasAccess('CONTRACTOR_SOCIAL_FEED', 'contractor')).toBe(true);
      expect(manager.hasAccess('CONTRACTOR_DISCOVERY_CARD', 'contractor')).toBe(true);
    });

    it('should check numeric limit access', async () => {
      // Initialize as basic tier with usage data
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'feature_usage') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [
                    {
                      feature_id: 'CONTRACTOR_BID_LIMIT',
                      used_count: 15,
                      limit_count: 20,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await manager.initialize('contractor123', 'contractor');

      // Should have access (15 < 20)
      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(true);
    });

    it('should deny access when limit exceeded', async () => {
      // Initialize with usage exceeding limit
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'feature_usage') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [
                    {
                      feature_id: 'CONTRACTOR_BID_LIMIT',
                      used_count: 25,
                      limit_count: 20,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await manager.initialize('contractor123', 'contractor');

      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(false);
    });

    it('should handle unlimited access', async () => {
      // Initialize as enterprise tier
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { plan_type: 'enterprise', status: 'active' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        gte: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await manager.initialize('contractor123', 'contractor');

      expect(manager.hasAccess('CONTRACTOR_BID_LIMIT', 'contractor')).toBe(true);
      expect(manager.hasAccess('CONTRACTOR_PORTFOLIO_PHOTOS', 'contractor')).toBe(true);
    });
  });

  describe('getRemainingUsage', () => {
    it('should return unlimited for enterprise tier', async () => {
      // Initialize as enterprise
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'enterprise', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // feature_usage table
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await manager.initialize('contractor123', 'contractor');

      const remaining = manager.getRemainingUsage('CONTRACTOR_BID_LIMIT');
      expect(remaining).toBe('unlimited');
    });

    it('should calculate remaining numeric usage', async () => {
      // Initialize with usage data
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'feature_usage') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [
                    {
                      feature_id: 'CONTRACTOR_BID_LIMIT',
                      used_count: 5,
                      limit_count: 20,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await manager.initialize('contractor123', 'contractor');

      const remaining = manager.getRemainingUsage('CONTRACTOR_BID_LIMIT');
      expect(remaining).toBe(15);
    });

    it('should return 0 for unknown feature', () => {
      const remaining = manager.getRemainingUsage('UNKNOWN_FEATURE');
      expect(remaining).toBe(0);
    });

    it('should return 0 for boolean features', async () => {
      // Initialize as professional
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { plan_type: 'professional', status: 'active' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        gte: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await manager.initialize('contractor123', 'contractor');

      const remaining = manager.getRemainingUsage('CONTRACTOR_SOCIAL_FEED');
      expect(remaining).toBe(0);
    });

    it('should not return negative remaining usage', async () => {
      // Initialize with over-usage
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'feature_usage') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [
                    {
                      feature_id: 'CONTRACTOR_BID_LIMIT',
                      used_count: 25,
                      limit_count: 20,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await manager.initialize('contractor123', 'contractor');

      const remaining = manager.getRemainingUsage('CONTRACTOR_BID_LIMIT');
      expect(remaining).toBe(0);
    });
  });

  describe('trackUsage', () => {
    beforeEach(async () => {
      // Initialize with some usage
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'feature_usage') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [
                    {
                      feature_id: 'CONTRACTOR_BID_LIMIT',
                      used_count: 5,
                      limit_count: 20,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      await manager.initialize('contractor123', 'contractor');
    });

    it('should track usage successfully', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      const result = await manager.trackUsage('contractor123', 'CONTRACTOR_BID_LIMIT', 1);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('increment_feature_usage', {
        p_user_id: 'contractor123',
        p_feature_id: 'CONTRACTOR_BID_LIMIT',
        p_increment: 1,
      });

      // Check local cache updated
      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(14);
    });

    it('should handle tracking error', async () => {
      const error = new Error('RPC failed');
      (supabase.rpc as jest.Mock).mockResolvedValue({ error });

      const result = await manager.trackUsage('contractor123', 'CONTRACTOR_BID_LIMIT', 1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        '[FeatureAccess] Failed to track usage',
        error,
        { service: 'mobile' }
      );
    });

    it('should handle tracking exception', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await manager.trackUsage('contractor123', 'CONTRACTOR_BID_LIMIT', 1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        '[FeatureAccess] Error tracking usage',
        expect.any(Error),
        { service: 'mobile' }
      );
    });

    it('should increment by custom amount', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await manager.trackUsage('contractor123', 'CONTRACTOR_BID_LIMIT', 3);

      expect(manager.getRemainingUsage('CONTRACTOR_BID_LIMIT')).toBe(12);
    });
  });

  describe('getFeature', () => {
    it('should return feature definition', () => {
      const feature = manager.getFeature('CONTRACTOR_BID_LIMIT');

      expect(feature).toBeDefined();
      expect(feature?.id).toBe('CONTRACTOR_BID_LIMIT');
      expect(feature?.name).toBe('Monthly Bids');
    });

    it('should return undefined for unknown feature', () => {
      const feature = manager.getFeature('UNKNOWN_FEATURE');

      expect(feature).toBeUndefined();
    });
  });

  describe('getUpgradeTiers', () => {
    it('should return upgrade options from trial', async () => {
      // Initialize as trial
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { plan_type: 'trial', status: 'trial' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        gte: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await manager.initialize('contractor123', 'contractor');

      const upgrades = manager.getUpgradeTiers('CONTRACTOR_BID_LIMIT');

      expect(upgrades).toContain('basic');
      expect(upgrades).toContain('professional');
      expect(upgrades).toContain('enterprise');
    });

    it('should return upgrade options from basic', async () => {
      // Initialize as basic
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'basic', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // feature_usage table
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await manager.initialize('contractor123', 'contractor');

      const upgrades = manager.getUpgradeTiers('CONTRACTOR_BID_LIMIT');

      expect(upgrades).not.toContain('basic');
      expect(upgrades).toContain('professional');
      expect(upgrades).toContain('enterprise');
    });

    it('should return empty array for enterprise', async () => {
      // Initialize as enterprise
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'enterprise', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // feature_usage table
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await manager.initialize('contractor123', 'contractor');

      const upgrades = manager.getUpgradeTiers('CONTRACTOR_BID_LIMIT');

      expect(upgrades).toEqual([]);
    });

    it('should return empty array for unknown feature', () => {
      const upgrades = manager.getUpgradeTiers('UNKNOWN_FEATURE');

      expect(upgrades).toEqual([]);
    });

    it('should only return tiers with better access for boolean features', async () => {
      // Initialize as basic (no social feed access)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { plan_type: 'basic', status: 'active' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        gte: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await manager.initialize('contractor123', 'contractor');

      const upgrades = manager.getUpgradeTiers('CONTRACTOR_SOCIAL_FEED');

      expect(upgrades).toContain('professional');
      expect(upgrades).toContain('enterprise');
      expect(upgrades).not.toContain('basic');
    });
  });

  describe('clear', () => {
    it('should clear all cached data', async () => {
      // Initialize with data
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'contractor_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { plan_type: 'professional', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // feature_usage table
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await manager.initialize('contractor123', 'contractor');
      expect(manager.getTier()).toBe('professional');

      manager.clear();

      expect(manager.getTier()).toBe('trial');
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canPerformAction', () => {
    it('should allow action when user has access', async () => {
      const manager = FeatureAccessManager.getInstance();
      jest.spyOn(manager, 'hasAccess').mockReturnValue(true);

      const result = await canPerformAction('user123', 'homeowner', 'HOMEOWNER_POST_JOBS');

      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should deny action with message when no access', async () => {
      const manager = FeatureAccessManager.getInstance();
      jest.spyOn(manager, 'hasAccess').mockReturnValue(false);
      jest.spyOn(manager, 'getFeature').mockReturnValue({
        id: 'CONTRACTOR_BID_LIMIT',
        name: 'Monthly Bids',
        description: 'Number of bids per month',
        category: 'Bidding',
        limits: {},
        upgradeMessage: "You've reached your monthly bid limit. Upgrade to submit more bids.",
      });

      const result = await canPerformAction('user123', 'contractor', 'CONTRACTOR_BID_LIMIT');

      expect(result.allowed).toBe(false);
      expect(result.message).toBe("You've reached your monthly bid limit. Upgrade to submit more bids.");
    });

    it('should provide default message when feature has no upgrade message', async () => {
      const manager = FeatureAccessManager.getInstance();
      jest.spyOn(manager, 'hasAccess').mockReturnValue(false);
      jest.spyOn(manager, 'getFeature').mockReturnValue({
        id: 'FEATURE_WITHOUT_MESSAGE',
        name: 'Test Feature',
        description: 'Test',
        category: 'Test',
        limits: {},
      });

      const result = await canPerformAction('user123', 'contractor', 'FEATURE_WITHOUT_MESSAGE');

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('This feature is not available on your current plan.');
    });
  });

  describe('formatLimit', () => {
    it('should format unlimited', () => {
      expect(formatLimit('unlimited')).toBe('Unlimited');
    });

    it('should format numeric limit', () => {
      expect(formatLimit(100)).toBe('100');
      expect(formatLimit(0)).toBe('0');
    });

    it('should format boolean true', () => {
      expect(formatLimit(true)).toBe('Full Access');
    });

    it('should format boolean false and undefined', () => {
      expect(formatLimit(false)).toBe('Not Available');
      expect(formatLimit(undefined)).toBe('Not Available');
    });
  });

  describe('getCategoryColor', () => {
    it('should return correct colors for known categories', () => {
      expect(getCategoryColor('Job Management')).toBe('#3B82F6');
      expect(getCategoryColor('Bidding')).toBe('#10B981');
      expect(getCategoryColor('Discovery')).toBe('#8B5CF6');
      expect(getCategoryColor('Social')).toBe('#F59E0B');
      expect(getCategoryColor('Portfolio')).toBe('#EC4899');
      expect(getCategoryColor('Communication')).toBe('#06B6D4');
      expect(getCategoryColor('AI & Search')).toBe('#6366F1');
    });

    it('should return default color for unknown category', () => {
      expect(getCategoryColor('Unknown Category')).toBe('#6B7280');
      expect(getCategoryColor('')).toBe('#6B7280');
    });
  });
});

describe('Constants', () => {
  describe('MOBILE_FEATURES', () => {
    it('should have all required homeowner features', () => {
      expect(MOBILE_FEATURES.HOMEOWNER_POST_JOBS).toBeDefined();
      expect(MOBILE_FEATURES.HOMEOWNER_MESSAGING).toBeDefined();
      expect(MOBILE_FEATURES.HOMEOWNER_VIDEO_CALLS).toBeDefined();
      expect(MOBILE_FEATURES.HOMEOWNER_AI_ASSESSMENT).toBeDefined();
    });

    it('should have all required contractor features', () => {
      expect(MOBILE_FEATURES.CONTRACTOR_BID_LIMIT).toBeDefined();
      expect(MOBILE_FEATURES.CONTRACTOR_DISCOVERY_CARD).toBeDefined();
      expect(MOBILE_FEATURES.CONTRACTOR_SOCIAL_FEED).toBeDefined();
      expect(MOBILE_FEATURES.CONTRACTOR_PORTFOLIO_PHOTOS).toBeDefined();
      expect(MOBILE_FEATURES.CONTRACTOR_MESSAGING).toBeDefined();
      expect(MOBILE_FEATURES.CONTRACTOR_VIDEO_CALLS).toBeDefined();
    });

    it('should have correct structure for feature definitions', () => {
      const feature = MOBILE_FEATURES.CONTRACTOR_BID_LIMIT;

      expect(feature).toHaveProperty('id');
      expect(feature).toHaveProperty('name');
      expect(feature).toHaveProperty('description');
      expect(feature).toHaveProperty('category');
      expect(feature).toHaveProperty('limits');
      expect(typeof feature.id).toBe('string');
      expect(typeof feature.name).toBe('string');
    });
  });

  describe('TIER_PRICING', () => {
    it('should have all tiers defined', () => {
      expect(TIER_PRICING.trial).toBeDefined();
      expect(TIER_PRICING.basic).toBeDefined();
      expect(TIER_PRICING.professional).toBeDefined();
      expect(TIER_PRICING.enterprise).toBeDefined();
    });

    it('should have correct pricing structure', () => {
      expect(TIER_PRICING.trial.price).toBe(0);
      expect(TIER_PRICING.basic.price).toBe(29);
      expect(TIER_PRICING.professional.price).toBe(79);
      expect(TIER_PRICING.enterprise.price).toBe(199);
    });

    it('should mark professional as popular', () => {
      expect(TIER_PRICING.professional.popular).toBe(true);
      expect(TIER_PRICING.basic.popular).toBeUndefined();
    });

    it('should have correct periods', () => {
      expect(TIER_PRICING.trial.period).toBe('14 days');
      expect(TIER_PRICING.basic.period).toBe('month');
      expect(TIER_PRICING.professional.period).toBe('month');
      expect(TIER_PRICING.enterprise.period).toBe('month');
    });
  });
});

describe('Singleton Export', () => {
  it('should export singleton instance', () => {
    expect(featureAccess).toBeDefined();
    expect(featureAccess).toBeInstanceOf(FeatureAccessManager);
  });

  it('should be the same as getInstance', () => {
    expect(featureAccess).toBe(FeatureAccessManager.getInstance());
  });
});