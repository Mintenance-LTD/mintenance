/**
 * Unit tests for HapticService + useHaptics (utils/haptics.ts).
 *
 * The unit under test is the real HapticService static class. Only externals
 * are mocked: expo-haptics (impact/notification/selection), react-native
 * Platform (mutable OS), AsyncStorage, and logger. Static preferences +
 * isInitialized are reset between tests so each case starts from defaults.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import HapticService, { useHaptics } from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockImpact = Haptics.impactAsync as jest.Mock;
const mockNotification = Haptics.notificationAsync as jest.Mock;
const mockSelection = Haptics.selectionAsync as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockPlatform = Platform as { OS: string };

const DEFAULT_PREFS = {
  enabled: true,
  uiHaptics: true,
  notificationHaptics: true,
  intensity: 'medium' as const,
};

// Helpers to read/reset the static internals without changing source behaviour.
function resetService() {
  (HapticService as unknown as { preferences: unknown }).preferences = {
    ...DEFAULT_PREFS,
  };
  (HapticService as unknown as { isInitialized: boolean }).isInitialized =
    false;
}
function setPrefs(p: Partial<typeof DEFAULT_PREFS>) {
  (
    HapticService as unknown as { preferences: typeof DEFAULT_PREFS }
  ).preferences = { ...DEFAULT_PREFS, ...p };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'ios';
  mockImpact.mockResolvedValue(undefined);
  mockNotification.mockResolvedValue(undefined);
  mockSelection.mockResolvedValue(undefined);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  resetService();
});

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------
describe('initialize', () => {
  it('loads + merges stored preferences on first call', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ enabled: false, intensity: 'heavy' })
    );

    await HapticService.initialize();

    expect(mockGetItem).toHaveBeenCalledWith('@mintenance_haptic_preferences');
    const prefs = HapticService.getPreferences();
    expect(prefs.enabled).toBe(false);
    expect(prefs.intensity).toBe('heavy');
    // unspecified keys retain defaults
    expect(prefs.uiHaptics).toBe(true);
  });

  it('does nothing when no stored preferences exist', async () => {
    mockGetItem.mockResolvedValue(null);
    await HapticService.initialize();
    expect(HapticService.getPreferences()).toEqual(DEFAULT_PREFS);
  });

  it('is idempotent — second call is a no-op (no second read)', async () => {
    await HapticService.initialize();
    mockGetItem.mockClear();
    await HapticService.initialize();
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('warns and does not throw when storage read fails', async () => {
    mockGetItem.mockRejectedValue(new Error('read boom'));
    await expect(HapticService.initialize()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to load haptic preferences:',
      { data: expect.any(Error) }
    );
  });
});

// ---------------------------------------------------------------------------
// updatePreferences / getPreferences
// ---------------------------------------------------------------------------
describe('updatePreferences', () => {
  it('merges + persists preferences', async () => {
    await HapticService.updatePreferences({
      enabled: false,
      intensity: 'light',
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      '@mintenance_haptic_preferences',
      JSON.stringify({
        enabled: false,
        uiHaptics: true,
        notificationHaptics: true,
        intensity: 'light',
      })
    );
    expect(HapticService.getPreferences().intensity).toBe('light');
  });

  it('warns and does not throw when storage write fails', async () => {
    mockSetItem.mockRejectedValue(new Error('write boom'));
    await expect(
      HapticService.updatePreferences({ enabled: false })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to save haptic preferences:',
      { data: expect.any(Error) }
    );
  });
});

describe('getPreferences', () => {
  it('returns a defensive copy (mutating result does not affect service)', () => {
    const p = HapticService.getPreferences();
    p.enabled = false;
    expect(HapticService.getPreferences().enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Basic impact haptics (light/medium/heavy) + gating + platform + intensity
// ---------------------------------------------------------------------------
describe('impact haptics', () => {
  it('light/medium/heavy call impactAsync on iOS with matching style', async () => {
    await HapticService.light();
    expect(mockImpact).toHaveBeenLastCalledWith('light');
    await HapticService.medium();
    expect(mockImpact).toHaveBeenLastCalledWith('medium');
    await HapticService.heavy();
    expect(mockImpact).toHaveBeenLastCalledWith('heavy');
  });

  it('does not call impactAsync on non-iOS platforms', async () => {
    mockPlatform.OS = 'android';
    await HapticService.light();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('skips when haptics globally disabled', async () => {
    setPrefs({ enabled: false });
    await HapticService.light();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('skips ui-context impact when uiHaptics disabled', async () => {
    setPrefs({ uiHaptics: false });
    await HapticService.light();
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('downgrades Heavy → Medium when intensity preference is light', async () => {
    setPrefs({ intensity: 'light' });
    await HapticService.heavy();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('upgrades Light → Medium when intensity preference is heavy', async () => {
    setPrefs({ intensity: 'heavy' });
    await HapticService.light();
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });

  it('warns when impactAsync throws', async () => {
    mockImpact.mockRejectedValue(new Error('hw fail'));
    await HapticService.medium();
    expect(logger.warn).toHaveBeenCalledWith('Haptic feedback failed:', {
      data: expect.any(Error),
    });
  });
});

// ---------------------------------------------------------------------------
// Notification haptics (success/warning/error)
// ---------------------------------------------------------------------------
describe('notification haptics', () => {
  it('success/warning/error call notificationAsync with matching type', async () => {
    await HapticService.success();
    expect(mockNotification).toHaveBeenLastCalledWith('success');
    await HapticService.warning();
    expect(mockNotification).toHaveBeenLastCalledWith('warning');
    await HapticService.error();
    expect(mockNotification).toHaveBeenLastCalledWith('error');
  });

  it('skips notification haptics when notificationHaptics disabled', async () => {
    setPrefs({ notificationHaptics: false });
    await HapticService.success();
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('warns when notificationAsync throws', async () => {
    mockNotification.mockRejectedValue(new Error('notif fail'));
    await HapticService.success();
    expect(logger.warn).toHaveBeenCalledWith('Haptic notification failed:', {
      data: expect.any(Error),
    });
  });
});

// ---------------------------------------------------------------------------
// selection
// ---------------------------------------------------------------------------
describe('selection', () => {
  it('calls selectionAsync when ui haptics allowed', async () => {
    await HapticService.selection();
    expect(mockSelection).toHaveBeenCalledTimes(1);
  });

  it('skips when ui haptics disabled', async () => {
    setPrefs({ uiHaptics: false });
    await HapticService.selection();
    expect(mockSelection).not.toHaveBeenCalled();
  });

  it('warns when selectionAsync throws', async () => {
    mockSelection.mockRejectedValue(new Error('sel fail'));
    await HapticService.selection();
    expect(logger.warn).toHaveBeenCalledWith('Haptic selection failed:', {
      data: expect.any(Error),
    });
  });
});

// ---------------------------------------------------------------------------
// playPattern (custom patterns + timers)
// ---------------------------------------------------------------------------
describe('playPattern', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('skips entirely when custom context disabled (enabled=false)', async () => {
    setPrefs({ enabled: false });
    await HapticService.playPattern('pulse');
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('pulse fires a single impact immediately', async () => {
    await HapticService.playPattern('pulse', 'light');
    expect(mockImpact).toHaveBeenCalledTimes(1);
    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('double fires now + once after 100ms', async () => {
    await HapticService.playPattern('double', 'heavy');
    expect(mockImpact).toHaveBeenCalledTimes(1);
    expect(mockImpact).toHaveBeenLastCalledWith('heavy');
    await jest.advanceTimersByTimeAsync(100);
    expect(mockImpact).toHaveBeenCalledTimes(2);
  });

  it('triple schedules three impacts across 0/100/200ms', async () => {
    await HapticService.playPattern('triple', 'medium');
    await jest.advanceTimersByTimeAsync(200);
    expect(mockImpact).toHaveBeenCalledTimes(3);
  });

  it('heartbeat fires immediate + 150ms + 400ms (light tail)', async () => {
    await HapticService.playPattern('heartbeat', 'medium');
    expect(mockImpact).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(400);
    expect(mockImpact).toHaveBeenCalledTimes(3);
    expect(mockImpact).toHaveBeenLastCalledWith('light');
  });

  it('wave schedules 5 impacts on iOS', async () => {
    await HapticService.playPattern('wave');
    await jest.advanceTimersByTimeAsync(5 * 80);
    expect(mockImpact).toHaveBeenCalledTimes(5);
  });

  it('wave schedules nothing on non-iOS', async () => {
    mockPlatform.OS = 'android';
    await HapticService.playPattern('wave');
    await jest.advanceTimersByTimeAsync(5 * 80);
    expect(mockImpact).not.toHaveBeenCalled();
  });

  it('defaults intensity to medium when not provided (pulse)', async () => {
    await HapticService.playPattern('pulse');
    expect(mockImpact).toHaveBeenCalledWith('medium');
  });
});

// ---------------------------------------------------------------------------
// Context-specific + app-specific delegators
// ---------------------------------------------------------------------------
describe('context-specific delegators', () => {
  it('ui-level delegators trigger an impact (light/medium)', async () => {
    await HapticService.buttonPress();
    await HapticService.tabSwitch();
    await HapticService.toggleSwitch();
    await HapticService.formSubmit();
    await HapticService.navigationBack();
    await HapticService.pullToRefresh();
    await HapticService.longPress();
    await HapticService.swipeAction();
    await HapticService.cardFlip();
    await HapticService.likePost();
    await HapticService.savePost();
    await HapticService.messageReceived();
    await HapticService.messageSent();
    expect(mockImpact).toHaveBeenCalled();
  });

  it('notification-level delegators trigger a notification haptic', async () => {
    await HapticService.jobPosted();
    await HapticService.jobAccepted();
    await HapticService.jobRejected();
    await HapticService.loginSuccess();
    await HapticService.loginFailed();
    expect(mockNotification).toHaveBeenCalled();
    expect(mockNotification).toHaveBeenCalledWith('success');
    expect(mockNotification).toHaveBeenCalledWith('warning');
    expect(mockNotification).toHaveBeenCalledWith('error');
  });
});

// ---------------------------------------------------------------------------
// useHaptics hook
// ---------------------------------------------------------------------------
describe('useHaptics', () => {
  it('exposes the full HapticService surface bound correctly', async () => {
    const h = useHaptics();
    expect(typeof h.light).toBe('function');
    expect(typeof h.playPattern).toBe('function');
    expect(h.getPreferences()).toEqual(DEFAULT_PREFS);

    await h.success();
    expect(mockNotification).toHaveBeenCalledWith('success');

    await h.updatePreferences({ intensity: 'heavy' });
    expect(h.getPreferences().intensity).toBe('heavy');
  });
});
