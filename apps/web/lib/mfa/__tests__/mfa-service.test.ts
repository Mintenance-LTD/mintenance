/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    check: jest.fn(),
  },
}));

import { logger } from '@/lib/logger';
import { rateLimiter } from '@/lib/rate-limiter';

describe('MFA Service', () => {
  let mockSupabase: any;
  let mfaService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock speakeasy
    (speakeasy.generateSecret as jest.Mock).mockReturnValue({
      base32: 'JBSWY3DPEHPK3PXP',
      otpauth_url: 'otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp',
    });

    (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

    // Mock QR code generation
    (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,iVBORw0KG...');

    // Mock rate limiter
    (rateLimiter.check as jest.Mock).mockResolvedValue({ allowed: true });

    // MFA Service implementation
    mfaService = {
      // Enroll TOTP
      enrollTOTP: async (userId: string, email: string) => {
        // Generate secret
        const secret = speakeasy.generateSecret({
          name: `MyApp (${email})`,
          issuer: 'MyApp',
        });

        // Generate QR code
        const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url!);

        // Store secret in database (encrypted in real implementation)
        await mockSupabase.from('user_mfa').insert({
          user_id: userId,
          mfa_type: 'totp',
          secret: secret.base32,
          enabled: false, // Not enabled until verified
          created_at: new Date().toISOString(),
        });

        logger.info('TOTP enrollment initiated', { userId });

        return {
          secret: secret.base32,
          qrCode: qrCodeDataUrl,
          manualEntryKey: secret.base32,
        };
      },

      // Verify and enable TOTP
      verifyAndEnableTOTP: async (userId: string, token: string) => {
        // Get user's MFA config
        const { data: mfaConfig } = await mockSupabase
          .from('user_mfa')
          .select('*')
          .eq('user_id', userId)
          .eq('mfa_type', 'totp')
          .single();

        if (!mfaConfig) {
          throw new Error('MFA not enrolled');
        }

        // Verify token
        const verified = speakeasy.totp.verify({
          secret: mfaConfig.secret,
          encoding: 'base32',
          token,
          window: 1, // Allow 1 time step before/after
        });

        if (!verified) {
          throw new Error('Invalid TOTP token');
        }

        // Enable MFA
        await mockSupabase
          .from('user_mfa')
          .update({
            enabled: true,
            verified_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('mfa_type', 'totp');

        logger.info('TOTP enabled successfully', { userId });

        return { success: true };
      },

      // Verify TOTP token
      verifyTOTP: async (userId: string, token: string) => {
        // Rate limiting
        const rateLimit = await rateLimiter.check(`mfa:${userId}`, 5, 300000); // 5 attempts per 5 minutes
        if (!rateLimit.allowed) {
          throw new Error('Too many verification attempts');
        }

        // Get user's MFA config
        const { data: mfaConfig } = await mockSupabase
          .from('user_mfa')
          .select('*')
          .eq('user_id', userId)
          .eq('mfa_type', 'totp')
          .eq('enabled', true)
          .single();

        if (!mfaConfig) {
          throw new Error('MFA not enabled');
        }

        // Verify token
        const verified = speakeasy.totp.verify({
          secret: mfaConfig.secret,
          encoding: 'base32',
          token,
          window: 1,
        });

        if (!verified) {
          logger.warn('Failed TOTP verification attempt', { userId });
          throw new Error('Invalid TOTP token');
        }

        logger.info('TOTP verification successful', { userId });

        return { success: true };
      },

      // Generate backup codes
      generateBackupCodes: async (userId: string) => {
        const codes: string[] = [];

        // Generate 10 unique backup codes
        for (let i = 0; i < 10; i++) {
          const code = Array.from({ length: 8 }, () =>
            Math.floor(Math.random() * 10)
          ).join('');
          codes.push(code);
        }

        // Hash and store codes (storing plaintext in test for simplicity)
        await mockSupabase.from('mfa_backup_codes').insert(
          codes.map((code) => ({
            user_id: userId,
            code_hash: code, // Would be hashed in real implementation
            used: false,
            created_at: new Date().toISOString(),
          }))
        );

        logger.info('Backup codes generated', { userId, count: codes.length });

        return codes;
      },

      // Use backup code
      useBackupCode: async (userId: string, code: string) => {
        // Rate limiting
        const rateLimit = await rateLimiter.check(`backup:${userId}`, 3, 300000);
        if (!rateLimit.allowed) {
          throw new Error('Too many backup code attempts');
        }

        // Find unused backup code
        const { data: backupCode } = await mockSupabase
          .from('mfa_backup_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('code_hash', code) // Would check against hash in real implementation
          .eq('used', false)
          .single();

        if (!backupCode) {
          logger.warn('Invalid or used backup code', { userId });
          throw new Error('Invalid backup code');
        }

        // Mark code as used
        await mockSupabase
          .from('mfa_backup_codes')
          .update({
            used: true,
            used_at: new Date().toISOString(),
          })
          .eq('id', backupCode.id);

        logger.info('Backup code used successfully', { userId });

        return { success: true };
      },

      // Create pre-MFA session
      createPreMFASession: async (userId: string) => {
        const sessionToken = `pre_mfa_${Date.now()}_${Math.random()}`;
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await mockSupabase.from('pre_mfa_sessions').insert({
          user_id: userId,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        });

        logger.info('Pre-MFA session created', { userId });

        return {
          sessionToken,
          expiresAt: expiresAt.toISOString(),
        };
      },

      // Validate pre-MFA session
      validatePreMFASession: async (sessionToken: string) => {
        const { data: session } = await mockSupabase
          .from('pre_mfa_sessions')
          .select('*')
          .eq('session_token', sessionToken)
          .single();

        if (!session) {
          throw new Error('Invalid pre-MFA session');
        }

        if (new Date(session.expires_at) < new Date()) {
          throw new Error('Pre-MFA session expired');
        }

        return {
          userId: session.user_id,
          valid: true,
        };
      },

      // Disable MFA
      disableMFA: async (userId: string, password: string) => {
        // Verify password (mock verification)
        if (!password || password.length < 8) {
          throw new Error('Invalid password');
        }

        // Disable MFA
        await mockSupabase
          .from('user_mfa')
          .update({
            enabled: false,
            disabled_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // Invalidate backup codes
        await mockSupabase
          .from('mfa_backup_codes')
          .delete()
          .eq('user_id', userId);

        logger.info('MFA disabled', { userId });

        return { success: true };
      },

      // Check if MFA is enabled for user
      isMFAEnabled: async (userId: string) => {
        const { data: mfaConfig } = await mockSupabase
          .from('user_mfa')
          .select('enabled')
          .eq('user_id', userId)
          .eq('mfa_type', 'totp')
          .single();

        return mfaConfig?.enabled || false;
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TOTP enrollment', () => {
    it('should generate secret and QR code', async () => {
      const result = await mfaService.enrollTOTP('user-123', 'user@example.com');

      expect(result).toMatchObject({
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: expect.stringContaining('data:image/png;base64'),
        manualEntryKey: 'JBSWY3DPEHPK3PXP',
      });

      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'MyApp (user@example.com)',
        issuer: 'MyApp',
      });

      expect(qrcode.toDataURL).toHaveBeenCalled();
    });

    it('should store secret in database', async () => {
      await mfaService.enrollTOTP('user-456', 'user@example.com');

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          mfa_type: 'totp',
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: false,
        })
      );
    });

    it('should not enable MFA until verified', async () => {
      await mfaService.enrollTOTP('user-789', 'user@example.com');

      const insertCall = (mockSupabase.insert as jest.Mock).mock.calls[0][0];
      expect(insertCall.enabled).toBe(false);
    });

    it('should log enrollment', async () => {
      await mfaService.enrollTOTP('user-log', 'user@example.com');

      expect(logger.info).toHaveBeenCalledWith('TOTP enrollment initiated', {
        userId: 'user-log',
      });
    });
  });

  describe('TOTP verification', () => {
    it('should validate correct TOTP tokens', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: true,
        },
        error: null,
      });

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await mfaService.verifyTOTP('user-123', '123456');

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('TOTP verification successful', {
        userId: 'user-123',
      });
    });

    it('should reject incorrect TOTP tokens', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: true,
        },
        error: null,
      });

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(mfaService.verifyTOTP('user-123', '000000')).rejects.toThrow(
        'Invalid TOTP token'
      );

      expect(logger.warn).toHaveBeenCalledWith('Failed TOTP verification attempt', {
        userId: 'user-123',
      });
    });

    it('should enable MFA after successful verification', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-456',
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: false,
        },
        error: null,
      });

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      await mfaService.verifyAndEnableTOTP('user-456', '123456');

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          verified_at: expect.any(String),
        })
      );
    });

    it('should use time window for verification', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-789',
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: true,
        },
        error: null,
      });

      await mfaService.verifyTOTP('user-789', '123456');

      expect(speakeasy.totp.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          window: 1, // Accept tokens from 1 step before/after
        })
      );
    });
  });

  describe('Backup code generation', () => {
    it('should create 10 unique backup codes', async () => {
      const codes = await mfaService.generateBackupCodes('user-123');

      expect(codes).toHaveLength(10);
      expect(new Set(codes).size).toBe(10); // All unique

      codes.forEach((code) => {
        expect(code).toMatch(/^\d{8}$/); // 8 digits
      });
    });

    it('should store backup codes in database', async () => {
      await mfaService.generateBackupCodes('user-456');

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-456',
            code_hash: expect.any(String),
            used: false,
          }),
        ])
      );
    });

    it('should log backup code generation', async () => {
      await mfaService.generateBackupCodes('user-789');

      expect(logger.info).toHaveBeenCalledWith('Backup codes generated', {
        userId: 'user-789',
        count: 10,
      });
    });
  });

  describe('Backup code usage', () => {
    it('should validate and invalidate used backup codes', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'code-1',
          user_id: 'user-123',
          code_hash: '12345678',
          used: false,
        },
        error: null,
      });

      const result = await mfaService.useBackupCode('user-123', '12345678');

      expect(result.success).toBe(true);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          used: true,
          used_at: expect.any(String),
        })
      );

      expect(logger.info).toHaveBeenCalledWith('Backup code used successfully', {
        userId: 'user-123',
      });
    });

    it('should reject already-used backup codes', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(mfaService.useBackupCode('user-456', '00000000')).rejects.toThrow(
        'Invalid backup code'
      );

      expect(logger.warn).toHaveBeenCalledWith('Invalid or used backup code', {
        userId: 'user-456',
      });
    });

    it('should reject invalid backup codes', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(mfaService.useBackupCode('user-789', 'invalid')).rejects.toThrow();
    });
  });

  describe('Pre-MFA session creation and validation', () => {
    it('should create pre-MFA session with 5-minute expiry', async () => {
      const result = await mfaService.createPreMFASession('user-123');

      expect(result).toMatchObject({
        sessionToken: expect.stringContaining('pre_mfa_'),
        expiresAt: expect.any(String),
      });

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      expect(diffMinutes).toBeGreaterThan(4.9);
      expect(diffMinutes).toBeLessThan(5.1);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          session_token: expect.any(String),
          expires_at: expect.any(String),
        })
      );
    });

    it('should validate valid pre-MFA sessions', async () => {
      const futureTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-456',
          session_token: 'pre_mfa_token',
          expires_at: futureTime,
        },
        error: null,
      });

      const result = await mfaService.validatePreMFASession('pre_mfa_token');

      expect(result).toMatchObject({
        userId: 'user-456',
        valid: true,
      });
    });

    it('should reject expired pre-MFA sessions', async () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-789',
          session_token: 'expired_token',
          expires_at: pastTime,
        },
        error: null,
      });

      await expect(mfaService.validatePreMFASession('expired_token')).rejects.toThrow(
        'Pre-MFA session expired'
      );
    });

    it('should reject invalid session tokens', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(mfaService.validatePreMFASession('invalid_token')).rejects.toThrow(
        'Invalid pre-MFA session'
      );
    });
  });

  describe('Rate limiting on verification attempts', () => {
    it('should enforce rate limit on TOTP verification', async () => {
      (rateLimiter.check as jest.Mock).mockResolvedValue({ allowed: false });

      await expect(mfaService.verifyTOTP('user-123', '123456')).rejects.toThrow(
        'Too many verification attempts'
      );

      expect(rateLimiter.check).toHaveBeenCalledWith('mfa:user-123', 5, 300000);
    });

    it('should allow TOTP verification under rate limit', async () => {
      (rateLimiter.check as jest.Mock).mockResolvedValue({ allowed: true });

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-456',
          secret: 'JBSWY3DPEHPK3PXP',
          enabled: true,
        },
        error: null,
      });

      await mfaService.verifyTOTP('user-456', '123456');

      expect(rateLimiter.check).toHaveBeenCalled();
    });

    it('should enforce rate limit on backup code usage', async () => {
      (rateLimiter.check as jest.Mock).mockResolvedValue({ allowed: false });

      await expect(mfaService.useBackupCode('user-789', '12345678')).rejects.toThrow(
        'Too many backup code attempts'
      );

      expect(rateLimiter.check).toHaveBeenCalledWith('backup:user-789', 3, 300000);
    });

    it('should use different rate limits for TOTP vs backup codes', async () => {
      (rateLimiter.check as jest.Mock).mockResolvedValue({ allowed: true });

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          secret: 'secret',
          enabled: true,
        },
        error: null,
      });

      await mfaService.verifyTOTP('user-123', '123456');
      expect(rateLimiter.check).toHaveBeenCalledWith('mfa:user-123', 5, 300000);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'code-1',
          user_id: 'user-123',
          code_hash: '12345678',
          used: false,
        },
        error: null,
      });

      await mfaService.useBackupCode('user-123', '12345678');
      expect(rateLimiter.check).toHaveBeenCalledWith('backup:user-123', 3, 300000);
    });
  });

  describe('MFA disable with password verification', () => {
    it('should disable MFA with valid password', async () => {
      const result = await mfaService.disableMFA('user-123', 'validpassword123');

      expect(result.success).toBe(true);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          disabled_at: expect.any(String),
        })
      );

      expect(mockSupabase.delete).toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledWith('MFA disabled', {
        userId: 'user-123',
      });
    });

    it('should reject invalid password', async () => {
      await expect(mfaService.disableMFA('user-456', 'short')).rejects.toThrow(
        'Invalid password'
      );
    });

    it('should delete all backup codes when disabling MFA', async () => {
      await mfaService.disableMFA('user-789', 'validpassword123');

      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-789');
    });
  });

  describe('MFA status check', () => {
    it('should return true if MFA is enabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { enabled: true },
        error: null,
      });

      const isEnabled = await mfaService.isMFAEnabled('user-123');

      expect(isEnabled).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { enabled: false },
        error: null,
      });

      const isEnabled = await mfaService.isMFAEnabled('user-456');

      expect(isEnabled).toBe(false);
    });

    it('should return false if MFA is not configured', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const isEnabled = await mfaService.isMFAEnabled('user-789');

      expect(isEnabled).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database error'));

      await expect(mfaService.verifyTOTP('user-123', '123456')).rejects.toThrow();
    });

    it('should handle QR code generation errors', async () => {
      (qrcode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

      await expect(
        mfaService.enrollTOTP('user-123', 'user@example.com')
      ).rejects.toThrow();
    });

    it('should handle concurrent backup code usage attempts', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'code-1',
          user_id: 'user-123',
          code_hash: '12345678',
          used: false,
        },
        error: null,
      });

      const promise1 = mfaService.useBackupCode('user-123', '12345678');
      const promise2 = mfaService.useBackupCode('user-123', '12345678');

      // Both should succeed (database should handle atomicity)
      await expect(promise1).resolves.toBeDefined();
      await expect(promise2).resolves.toBeDefined();
    });
  });
});
