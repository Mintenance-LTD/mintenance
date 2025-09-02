import React from 'react';
// Mock logger first to avoid Sentry issues
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics');

import { HapticsService } from '../../utils/haptics';
import * as Haptics from 'expo-haptics';

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;

describe('HapticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('light', () => {
    it('should call Haptics.impactAsync with light impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticsService.light();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should handle errors gracefully', async () => {
      mockHaptics.impactAsync.mockRejectedValue(new Error('Haptics not available'));

      // Should not throw
      await expect(HapticsService.light()).resolves.not.toThrow();
    });
  });

  describe('medium', () => {
    it('should call Haptics.impactAsync with medium impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticsService.medium();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });
  });

  describe('heavy', () => {
    it('should call Haptics.impactAsync with heavy impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticsService.heavy();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    });
  });

  describe('success', () => {
    it('should call Haptics.notificationAsync with success type', async () => {
      mockHaptics.notificationAsync.mockResolvedValue(undefined);

      await HapticsService.success();

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe('warning', () => {
    it('should call Haptics.notificationAsync with warning type', async () => {
      mockHaptics.notificationAsync.mockResolvedValue(undefined);

      await HapticsService.warning();

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });
  });

  describe('error', () => {
    it('should call Haptics.notificationAsync with error type', async () => {
      mockHaptics.notificationAsync.mockResolvedValue(undefined);

      await HapticsService.error();

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });
  });

  describe('selection', () => {
    it('should call Haptics.selectionAsync', async () => {
      mockHaptics.selectionAsync.mockResolvedValue(undefined);

      await HapticsService.selection();

      expect(mockHaptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('rigidImpact', () => {
    it('should call Haptics.impactAsync with rigid impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticsService.rigidImpact();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Rigid
      );
    });
  });

  describe('softImpact', () => {
    it('should call Haptics.impactAsync with soft impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticsService.softImpact();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Soft
      );
    });
  });
});