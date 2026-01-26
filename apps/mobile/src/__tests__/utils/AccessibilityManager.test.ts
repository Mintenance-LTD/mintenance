import { useAccessibilityManager, AccessibilityManager as AccessibilityManagerClass } from '../../utils/AccessibilityManager';
import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import { theme } from '../../theme';

// Mock React Native modules
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
    isBoldTextEnabled: jest.fn(),
    isInvertColorsEnabled: jest.fn(),
    isGrayscaleEnabled: jest.fn(),
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Vibration: {
    vibrate: jest.fn(),
  },
}));

jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      secondary: '#5AC8FA',
      text: '#000000',
      textSecondary: '#8E8E93',
      background: '#FFFFFF',
      surface: '#F2F2F7',
      border: '#C7C7CC',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FFCC00',
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AccessibilityManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (AccessibilityManagerClass as any).instance = undefined;
    (Platform.OS as any) = 'ios';
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AccessibilityManagerClass.getInstance();
      const instance2 = AccessibilityManagerClass.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize on first access', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(false);

      const manager = AccessibilityManagerClass.getInstance();

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalled();
    });
  });

  describe('Initialization', () => {
    it('should check initial accessibility settings on iOS', async () => {
      (Platform.OS as any) = 'ios';
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(false);

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      expect(AccessibilityInfo.isBoldTextEnabled).toHaveBeenCalled();
      expect(AccessibilityInfo.isInvertColorsEnabled).toHaveBeenCalled();
      expect(AccessibilityInfo.isGrayscaleEnabled).toHaveBeenCalled();
    });

    it('should skip iOS-specific checks on Android', async () => {
      (Platform.OS as any) = 'android';
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
      expect(AccessibilityInfo.isReduceMotionEnabled).not.toHaveBeenCalled();
      expect(AccessibilityInfo.isBoldTextEnabled).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(error);

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const { logger } = require('../../utils/logger');
      expect(logger.error).toHaveBeenCalledWith('Failed to initialize AccessibilityManager:', error);
    });
  });

  describe('Event Listeners', () => {
    it('should set up event listeners for iOS', async () => {
      (Platform.OS as any) = 'ios';
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'screenReaderChanged',
        expect.any(Function)
      );
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'boldTextChanged',
        expect.any(Function)
      );
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'invertColorsChanged',
        expect.any(Function)
      );
      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'grayscaleChanged',
        expect.any(Function)
      );
    });

    it('should only set up screen reader listener for Android', async () => {
      (Platform.OS as any) = 'android';
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const calls = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('screenReaderChanged');
    });

    it('should update state when screen reader changes', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(manager.screenReaderEnabled).toBe(false);

      // Simulate screen reader change
      const screenReaderCallback = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'screenReaderChanged')[1];

      screenReaderCallback(true);
      expect(manager.screenReaderEnabled).toBe(true);
    });
  });

  describe('Getters', () => {
    it('should return current accessibility states', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(true);
      (Platform.OS as any) = 'ios';

      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(manager.screenReaderEnabled).toBe(true);
      expect(manager.reduceMotionEnabled).toBe(true);
      expect(manager.boldTextEnabled).toBe(false);
      expect(manager.highContrastEnabled).toBe(true);
    });
  });

  describe('Announcement Methods', () => {
    beforeEach(async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should announce message when screen reader is enabled', () => {
      const manager = AccessibilityManagerClass.getInstance();
      manager.announce('Test message');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
    });

    it('should vibrate for high priority announcements on Android', () => {
      (Platform.OS as any) = 'android';
      const manager = AccessibilityManagerClass.getInstance();
      manager.announce('Important message', 'high');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Important message');
      expect(Vibration.vibrate).toHaveBeenCalledWith(100);
    });

    it('should not announce when screen reader is disabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityManagerClass as any).instance = undefined;
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      manager.announce('Test message');
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should announce error with context', () => {
      const manager = AccessibilityManagerClass.getInstance();
      manager.announceError('Network failed', 'Login');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Error in Login: Network failed'
      );
    });

    it('should announce error without context', () => {
      const manager = AccessibilityManagerClass.getInstance();
      manager.announceError('Network failed');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Error: Network failed'
      );
    });

    it('should announce success with context', () => {
      const manager = AccessibilityManagerClass.getInstance();
      manager.announceSuccess('Profile updated', 'Settings');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Success in Settings: Profile updated'
      );
    });

    it('should announce navigation', () => {
      const manager = AccessibilityManagerClass.getInstance();
      manager.announceNavigation('Profile Screen', '3 new notifications');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Navigated to Profile Screen. 3 new notifications'
      );
    });

    it('should announce loading states', () => {
      const manager = AccessibilityManagerClass.getInstance();

      manager.announceLoading(true, 'user data');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Loading user data');

      manager.announceLoading(false, 'user data');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Finished loading user data');
    });
  });

  describe('Focus Management', () => {
    it('should set focus when screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      jest.useFakeTimers();
      manager.setFocus(12345);
      jest.runAllTimers();

      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(12345);
      jest.useRealTimers();
    });

    it('should not set focus when screen reader is disabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      manager.setFocus(12345);
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
    });
  });

  describe('Styling Helpers', () => {
    beforeEach(() => {
      (AccessibilityManagerClass as any).instance = undefined;
      (Platform.OS as any) = 'ios';
    });

    it('should adjust font size for bold text users', async () => {
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const adjustedSize = manager.getAdjustedFontSize(16);
      expect(adjustedSize).toBe(17.6); // 16 * 1.1
    });

    it('should return base font size when bold text is disabled', async () => {
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(false);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const adjustedSize = manager.getAdjustedFontSize(16);
      expect(adjustedSize).toBe(16);
    });

    it('should adjust text style for accessibility', async () => {
      (AccessibilityInfo.isBoldTextEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const baseStyle = { fontSize: 14, color: '#000' };
      const adjustedStyle = manager.getAdjustedTextStyle(baseStyle);

      expect(adjustedStyle.fontSize).toBe(15.4);
      expect(adjustedStyle.fontWeight).toBe('600');
      expect(adjustedStyle.color).toBe('#000');
    });

    it('should return high contrast colors when enabled', async () => {
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const colors = manager.getAdjustedColors();
      expect(colors.primary).toBe('#0000FF');
      expect(colors.text).toBe('#000000');
      expect(colors.background).toBe('#FFFFFF');
    });

    it('should return default colors when high contrast is disabled', async () => {
      (AccessibilityInfo.isInvertColorsEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.isGrayscaleEnabled as jest.Mock).mockResolvedValue(false);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));
      const colors = manager.getAdjustedColors();
      expect(colors).toBe(theme.colors);
    });

    it('should check reduce motion preference', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(manager.shouldReduceMotion()).toBe(true);
    });

    it('should adjust animation duration based on reduce motion', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      const manager = AccessibilityManagerClass.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      const adjustedDuration = manager.getAnimationDuration(300);
      expect(adjustedDuration).toBe(30); // 300 * 0.1
    });
  });

  describe('Validation Helpers', () => {
    it('should validate missing accessibility label on interactive elements', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = { onPress: jest.fn() };
      const result = manager.validateAccessibilityProps(props);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Interactive element missing accessibilityLabel');
      expect(result.warnings).toContain('Interactive element missing accessibilityRole');
    });

    it('should validate complete accessibility props', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = {
        onPress: jest.fn(),
        accessibilityLabel: 'Submit',
        accessibilityRole: 'button',
      };
      const result = manager.validateAccessibilityProps(props);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect potential color contrast issues', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = {
        style: {
          backgroundColor: '#000000',
          color: '#111111',
        },
      };
      const result = manager.validateAccessibilityProps(props);

      expect(result.warnings).toContain('Potential color contrast issue detected');
    });

    it('should detect small touch targets', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = {
        onPress: jest.fn(),
        accessibilityLabel: 'Tap',
        accessibilityRole: 'button',
        style: {
          width: 30,
          height: 30,
        },
      };
      const result = manager.validateAccessibilityProps(props);

      expect(result.warnings).toContain('Touch target may be too small (minimum 44x44 recommended)');
    });
  });

  describe('Props Generators', () => {
    it('should generate button props', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = manager.getButtonProps('Submit Form', 'Double tap to submit', true);

      expect(props).toEqual({
        accessibilityRole: 'button',
        accessibilityLabel: 'Submit Form',
        accessibilityHint: 'Double tap to submit',
        accessibilityState: { disabled: true },
        accessible: true,
      });
    });

    it('should generate text input props', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = manager.getTextInputProps('Email', 'user@example.com', false, 'Invalid email');

      expect(props).toEqual({
        accessibilityRole: 'text',
        accessibilityLabel: 'Email, Invalid email',
        accessibilityValue: { text: 'user@example.com' },
        accessibilityState: { disabled: false },
        accessible: true,
        accessibilityInvalid: true,
      });
    });

    it('should handle secure text input', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const props = manager.getTextInputProps('Password', 'secret123', true);

      expect(props.accessibilityValue).toEqual({ text: 'Has secure text' });
    });

    it('should generate header props for iOS', () => {
      (Platform.OS as any) = 'ios';
      const manager = AccessibilityManagerClass.getInstance();
      const props = manager.getHeaderProps('Main Title', 1);

      expect(props).toEqual({
        accessibilityRole: 'header',
        accessibilityLabel: 'Main Title',
        accessible: true,
      });
    });

    it('should generate header props with level for Android', () => {
      (Platform.OS as any) = 'android';
      const manager = AccessibilityManagerClass.getInstance();
      const props = manager.getHeaderProps('Section Title', 2);

      expect(props).toEqual({
        accessibilityRole: 'header',
        accessibilityLabel: 'Section Title',
        accessible: true,
        accessibilityLevel: 2,
      });
    });
  });

  describe('Accessibility Report', () => {
    it('should generate accessibility report for components', () => {
      const manager = AccessibilityManagerClass.getInstance();
      const componentProps = [
        {
          onPress: jest.fn(),
          accessibilityLabel: 'Button 1',
          accessibilityRole: 'button',
        },
        {
          onPress: jest.fn(),
          // Missing accessibility props
        },
        {
          text: 'Static text',
          // Non-interactive element
        },
      ];

      const report = manager.getAccessibilityReport(componentProps);

      expect(report.totalElements).toBe(3);
      expect(report.accessibleElements).toBe(2); // First and third elements
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].element).toBe('Element 1');
      expect(report.issues[0].issues).toContain('Interactive element missing accessibilityLabel');
    });
  });

  describe('useAccessibilityManager Hook', () => {
    it('should return manager methods and state', () => {
      const hook = useAccessibilityManager();

      expect(typeof hook.announce).toBe('function');
      expect(typeof hook.announceError).toBe('function');
      expect(typeof hook.announceSuccess).toBe('function');
      expect(typeof hook.announceNavigation).toBe('function');
      expect(typeof hook.announceLoading).toBe('function');
      expect(typeof hook.setFocus).toBe('function');
      expect(typeof hook.getAdjustedFontSize).toBe('function');
      expect(typeof hook.getAdjustedTextStyle).toBe('function');
      expect(typeof hook.getAdjustedColors).toBe('function');
      expect(typeof hook.shouldReduceMotion).toBe('function');
      expect(typeof hook.getAnimationDuration).toBe('function');
      expect(typeof hook.getButtonProps).toBe('function');
      expect(typeof hook.getTextInputProps).toBe('function');
      expect(typeof hook.getHeaderProps).toBe('function');

      expect(typeof hook.screenReaderEnabled).toBe('boolean');
      expect(typeof hook.reduceMotionEnabled).toBe('boolean');
      expect(typeof hook.boldTextEnabled).toBe('boolean');
      expect(typeof hook.highContrastEnabled).toBe('boolean');
    });

    it('should call manager methods correctly', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityManagerClass as any).instance = undefined;

      const hook = useAccessibilityManager();
      await new Promise(resolve => setTimeout(resolve, 0));
      hook.announce('Test from hook');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test from hook');
    });
  });
});
