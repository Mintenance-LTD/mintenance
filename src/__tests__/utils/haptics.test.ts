import React from 'react';
// Mock logger first to avoid Sentry issues
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics');

import { HapticService } from '../../utils/haptics';
import * as Haptics from 'expo-haptics';

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;

describe('HapticService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('light', () => {
    it('should call Haptics.impactAsync with light impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticService.light();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should handle errors gracefully', async () => {
      mockHaptics.impactAsync.mockRejectedValue(new Error('Haptics not available'));

      // Should not throw
      await expect(HapticService.light()).resolves.not.toThrow();
    });
  });

  describe('medium', () => {
    it('should call Haptics.impactAsync with medium impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticService.medium();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });
  });

  describe('heavy', () => {
    it('should call Haptics.impactAsync with heavy impact', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticService.heavy();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    });
  });

  describe('success', () => {
    it('should call Haptics.notificationAsync with success type', async () => {
      mockHaptics.notificationAsync.mockResolvedValue(undefined);

      await HapticService.success();

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe('warning', () => {
    it('should call Haptics.notificationAsync with warning type', async () => {
      mockHaptics.notificationAsync.mockResolvedValue(undefined);

      await HapticService.warning();

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });
  });

  describe('error', () => {
    it('should call Haptics.notificationAsync with error type', async () => {
      mockHaptics.notificationAsync.mockResolvedValue(undefined);

      await HapticService.error();

      expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });
  });

  describe('selection', () => {
    it('should call Haptics.selectionAsync', async () => {
      mockHaptics.selectionAsync.mockResolvedValue(undefined);

      await HapticService.selection();

      expect(mockHaptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('longPress', () => {
    it('should call medium impact for long press', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticService.longPress();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });
  });

  describe('buttonPress', () => {
    it('should call light impact for button press', async () => {
      mockHaptics.impactAsync.mockResolvedValue(undefined);

      await HapticService.buttonPress();

      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });
  });
});