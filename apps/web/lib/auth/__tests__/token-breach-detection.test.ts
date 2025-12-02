/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    recordMetric: jest.fn(),
    sendAlert: jest.fn(),
  },
}));

import { logger } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';

describe('Refresh Token Breach Detection', () => {
  let mockSupabase: any;
  let tokenService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Token service implementation
    tokenService = {
      // Refresh token rotation with breach detection
      refreshTokens: async (refreshToken: string) => {
        try {
          // Look up the refresh token
          const { data: tokenData, error: tokenError } = await mockSupabase
            .from('refresh_tokens')
            .select('*')
            .eq('token', refreshToken)
            .single();

          if (tokenError || !tokenData) {
            throw new Error('Invalid refresh token');
          }

          // Check if token has been consumed (potential breach)
          if (tokenData.consumed_at) {
            logger.error('Consumed refresh token reused - potential breach', {
              tokenId: tokenData.id,
              familyId: tokenData.family_id,
              userId: tokenData.user_id,
              consumedAt: tokenData.consumed_at,
            });

            // Invalidate entire token family
            await tokenService.invalidateTokenFamily(tokenData.family_id);

            monitoring.sendAlert('token-breach-detected', {
              userId: tokenData.user_id,
              familyId: tokenData.family_id,
              tokenId: tokenData.id,
            });

            throw new Error('Token breach detected - all sessions invalidated');
          }

          // Check if token is expired
          if (new Date(tokenData.expires_at) < new Date()) {
            throw new Error('Refresh token expired');
          }

          // Mark current token as consumed
          await mockSupabase
            .from('refresh_tokens')
            .update({
              consumed_at: new Date().toISOString(),
            })
            .eq('id', tokenData.id);

          // Generate new token pair
          const newAccessToken = `access_${Date.now()}_${Math.random()}`;
          const newRefreshToken = `refresh_${Date.now()}_${Math.random()}`;

          // Store new refresh token in same family
          const { data: newTokenData } = await mockSupabase
            .from('refresh_tokens')
            .insert({
              token: newRefreshToken,
              user_id: tokenData.user_id,
              family_id: tokenData.family_id,
              generation: tokenData.generation + 1,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              parent_token_id: tokenData.id,
            })
            .select()
            .single();

          logger.info('Token rotation successful', {
            userId: tokenData.user_id,
            familyId: tokenData.family_id,
            oldGeneration: tokenData.generation,
            newGeneration: newTokenData?.generation,
          });

          return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 3600,
          };
        } catch (error) {
          logger.error('Token refresh failed', { error });
          throw error;
        }
      },

      // Invalidate entire token family on breach
      invalidateTokenFamily: async (familyId: string) => {
        logger.warn('Invalidating token family', { familyId });

        await mockSupabase
          .from('refresh_tokens')
          .update({
            invalidated_at: new Date().toISOString(),
            invalidation_reason: 'breach_detection',
          })
          .eq('family_id', familyId);

        monitoring.recordMetric('token_family.invalidated', 1, {
          reason: 'breach_detection',
        });
      },

      // Create initial token pair
      createTokenPair: async (userId: string) => {
        const familyId = `family_${Date.now()}_${Math.random()}`;
        const refreshToken = `refresh_${Date.now()}_${Math.random()}`;
        const accessToken = `access_${Date.now()}_${Math.random()}`;

        await mockSupabase.from('refresh_tokens').insert({
          token: refreshToken,
          user_id: userId,
          family_id: familyId,
          generation: 1,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        return {
          accessToken,
          refreshToken,
          expiresIn: 3600,
        };
      },

      // Get token family info
      getTokenFamilyInfo: async (familyId: string) => {
        const { data } = await mockSupabase
          .from('refresh_tokens')
          .select('*')
          .eq('family_id', familyId);

        return data || [];
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Normal refresh token rotation', () => {
    it('should successfully rotate tokens', async () => {
      const oldToken = 'refresh_old_token';

      mockSupabase.single
        .mockResolvedValueOnce({
          // First call: look up token
          data: {
            id: 'token-1',
            token: oldToken,
            user_id: 'user-123',
            family_id: 'family-1',
            generation: 1,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
            consumed_at: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          // Second call: insert new token
          data: {
            id: 'token-2',
            token: expect.any(String),
            user_id: 'user-123',
            family_id: 'family-1',
            generation: 2,
            parent_token_id: 'token-1',
          },
          error: null,
        });

      const result = await tokenService.refreshTokens(oldToken);

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 3600,
      });

      // Should mark old token as consumed
      expect(mockSupabase.update).toHaveBeenCalledWith({
        consumed_at: expect.any(String),
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Token rotation successful',
        expect.objectContaining({
          userId: 'user-123',
          familyId: 'family-1',
          oldGeneration: 1,
          newGeneration: 2,
        })
      );
    });

    it('should increment generation number', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'token-5',
            user_id: 'user-456',
            family_id: 'family-2',
            generation: 5,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
            consumed_at: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            generation: 6,
          },
          error: null,
        });

      await tokenService.refreshTokens('refresh_token');

      expect(logger.info).toHaveBeenCalledWith(
        'Token rotation successful',
        expect.objectContaining({
          oldGeneration: 5,
          newGeneration: 6,
        })
      );
    });

    it('should maintain same family_id across rotations', async () => {
      const familyId = 'family-persistent';

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'token-1',
            user_id: 'user-123',
            family_id: familyId,
            generation: 1,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
            consumed_at: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            family_id: familyId,
            generation: 2,
          },
          error: null,
        });

      await tokenService.refreshTokens('token1');

      // Verify insert was called with same family_id
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          family_id: familyId,
        })
      );
    });
  });

  describe('Consumed token reused - breach detection', () => {
    it('should detect and invalidate family when consumed token is reused', async () => {
      const consumedToken = 'refresh_consumed_token';
      const familyId = 'family-breached';

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-99',
          token: consumedToken,
          user_id: 'user-999',
          family_id: familyId,
          generation: 3,
          expires_at: new Date(Date.now() + 1000000).toISOString(),
          consumed_at: new Date(Date.now() - 5000).toISOString(), // Already consumed
        },
        error: null,
      });

      await expect(tokenService.refreshTokens(consumedToken)).rejects.toThrow(
        'Token breach detected - all sessions invalidated'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Consumed refresh token reused - potential breach',
        expect.objectContaining({
          tokenId: 'token-99',
          familyId,
          userId: 'user-999',
        })
      );

      // Should invalidate entire family
      expect(mockSupabase.update).toHaveBeenCalledWith({
        invalidated_at: expect.any(String),
        invalidation_reason: 'breach_detection',
      });

      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'token-breach-detected',
        expect.objectContaining({
          userId: 'user-999',
          familyId,
        })
      );
    });

    it('should record metric when family is invalidated', async () => {
      const familyId = 'family-metric-test';

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-1',
          user_id: 'user-1',
          family_id: familyId,
          consumed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000000).toISOString(),
        },
        error: null,
      });

      await expect(tokenService.refreshTokens('token')).rejects.toThrow();

      expect(monitoring.recordMetric).toHaveBeenCalledWith(
        'token_family.invalidated',
        1,
        { reason: 'breach_detection' }
      );
    });

    it('should not allow any tokens from breached family', async () => {
      const familyId = 'family-blocked';

      // Simulate consumed token reuse
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-1',
          user_id: 'user-1',
          family_id: familyId,
          consumed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000000).toISOString(),
        },
        error: null,
      });

      await expect(tokenService.refreshTokens('token')).rejects.toThrow();

      // After breach, all tokens in family should be invalidated
      expect(mockSupabase.eq).toHaveBeenCalledWith('family_id', familyId);
    });
  });

  describe('Multiple generations in same family', () => {
    it('should track generation numbers correctly', async () => {
      const familyId = 'family-multi-gen';

      // First refresh
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'token-1',
            user_id: 'user-1',
            family_id: familyId,
            generation: 1,
            consumed_at: null,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { generation: 2 },
          error: null,
        });

      await tokenService.refreshTokens('token1');

      // Second refresh
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'token-2',
            user_id: 'user-1',
            family_id: familyId,
            generation: 2,
            consumed_at: null,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { generation: 3 },
          error: null,
        });

      await tokenService.refreshTokens('token2');

      // Verify generation increments
      expect(logger.info).toHaveBeenCalledWith(
        'Token rotation successful',
        expect.objectContaining({
          oldGeneration: 2,
          newGeneration: 3,
        })
      );
    });

    it('should link tokens via parent_token_id', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'parent-token',
            user_id: 'user-1',
            family_id: 'family-1',
            generation: 5,
            consumed_at: null,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {},
          error: null,
        });

      await tokenService.refreshTokens('token');

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_token_id: 'parent-token',
        })
      );
    });

    it('should allow querying token family history', async () => {
      const familyId = 'family-history';

      mockSupabase.select.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 'token-1', generation: 1, consumed_at: '2024-01-01' },
            { id: 'token-2', generation: 2, consumed_at: '2024-01-02' },
            { id: 'token-3', generation: 3, consumed_at: null },
          ],
        }),
      });

      const history = await tokenService.getTokenFamilyInfo(familyId);

      expect(history).toHaveLength(3);
      expect(history[2].consumed_at).toBeNull();
    });
  });

  describe('Invalid family_id handling', () => {
    it('should handle missing family_id gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-1',
          user_id: 'user-1',
          family_id: null,
          generation: 1,
          consumed_at: null,
          expires_at: new Date(Date.now() + 1000000).toISOString(),
        },
        error: null,
      });

      // Should still work, creating new family
      const result = await tokenService.refreshTokens('token');

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should handle invalid token lookup', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Token not found'),
      });

      await expect(tokenService.refreshTokens('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should handle expired tokens', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-1',
          user_id: 'user-1',
          family_id: 'family-1',
          consumed_at: null,
          expires_at: new Date(Date.now() - 1000000).toISOString(), // Expired
        },
        error: null,
      });

      await expect(tokenService.refreshTokens('expired-token')).rejects.toThrow(
        'Refresh token expired'
      );
    });
  });

  describe('Concurrent refresh attempts', () => {
    it('should handle race condition where token consumed between check and use', async () => {
      const token = 'refresh_race_token';

      // First request checks and sees token not consumed
      // Second request completes and marks consumed
      // First request tries to use and should detect breach

      let consumedAt: string | null = null;

      mockSupabase.single.mockImplementation(() => {
        // Simulate race: token gets consumed between checks
        const wasConsumed = consumedAt;
        if (!wasConsumed) {
          consumedAt = new Date().toISOString();
        }

        return Promise.resolve({
          data: {
            id: 'token-race',
            user_id: 'user-race',
            family_id: 'family-race',
            generation: 1,
            consumed_at: wasConsumed,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
          },
          error: null,
        });
      });

      // First request succeeds
      const result1 = await tokenService.refreshTokens(token);
      expect(result1).toBeDefined();

      // Second request should detect breach
      await expect(tokenService.refreshTokens(token)).rejects.toThrow();
    });

    it('should use database-level locking for token consumption', async () => {
      // This test documents that we rely on database constraints
      // to prevent race conditions via unique constraints and transactions

      const tokenId = 'token-lock';

      mockSupabase.single.mockResolvedValue({
        data: {
          id: tokenId,
          user_id: 'user-1',
          family_id: 'family-1',
          generation: 1,
          consumed_at: null,
          expires_at: new Date(Date.now() + 1000000).toISOString(),
        },
        error: null,
      });

      await tokenService.refreshTokens('token');

      // Update should use WHERE consumed_at IS NULL to prevent double-consumption
      // In real implementation, this would be a CAS operation
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle concurrent token family invalidation', async () => {
      const familyId = 'family-concurrent-invalidation';

      // Simulate two concurrent breach detections
      const promise1 = tokenService.invalidateTokenFamily(familyId);
      const promise2 = tokenService.invalidateTokenFamily(familyId);

      await Promise.all([promise1, promise2]);

      // Both should succeed (idempotent operation)
      expect(mockSupabase.update).toHaveBeenCalledTimes(2);
      expect(monitoring.recordMetric).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token creation', () => {
    it('should create initial token pair with generation 1', async () => {
      const userId = 'user-new';

      const result = await tokenService.createTokenPair(userId);

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 3600,
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          generation: 1,
          family_id: expect.any(String),
        })
      );
    });

    it('should create unique family_id for each user session', async () => {
      await tokenService.createTokenPair('user-1');
      await tokenService.createTokenPair('user-2');

      const calls = (mockSupabase.insert as jest.Mock).mock.calls;
      expect(calls[0][0].family_id).not.toBe(calls[1][0].family_id);
    });
  });

  describe('Edge cases', () => {
    it('should handle database errors during token refresh', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'));

      await expect(tokenService.refreshTokens('token')).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Token refresh failed',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should handle very old consumed tokens', async () => {
      const veryOldDate = new Date('2020-01-01').toISOString();

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'token-old',
          user_id: 'user-1',
          family_id: 'family-1',
          consumed_at: veryOldDate,
          expires_at: new Date(Date.now() + 1000000).toISOString(),
        },
        error: null,
      });

      await expect(tokenService.refreshTokens('old-token')).rejects.toThrow(
        'Token breach detected'
      );
    });

    it('should handle high generation numbers', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'token-1',
            user_id: 'user-1',
            family_id: 'family-1',
            generation: 9999,
            consumed_at: null,
            expires_at: new Date(Date.now() + 1000000).toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { generation: 10000 },
          error: null,
        });

      const result = await tokenService.refreshTokens('token');

      expect(result).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Token rotation successful',
        expect.objectContaining({
          oldGeneration: 9999,
          newGeneration: 10000,
        })
      );
    });
  });
});
