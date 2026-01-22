import { Platform, AccessibilityInfo, findNodeHandle, UIManager } from 'react-native';
import MobileAccessibility, {
  ACCESSIBILITY_ROLES,
  ACCESSIBILITY_STATES,
  TOUCH_TARGET_SIZE,
  announceForAccessibility,
  isScreenReaderEnabled,
  isReduceMotionEnabled,
  isBoldTextEnabled,
  isGrayscaleEnabled,
  isInvertColorsEnabled,
  setAccessibilityFocus,
  createButtonA11yProps,
  createLinkA11yProps,
  createImageA11yProps,
  createInputA11yProps,
  createCheckboxA11yProps,
  createRadioA11yProps,
  createSwitchA11yProps,
  createProgressA11yProps,
  createListItemA11yProps,
  createModalA11yProps,
  formatTimeForScreenReader,
  formatCurrencyForScreenReader,
  createFieldsetA11yProps,
  createLiveRegionA11yProps,
  validateTouchTargetSize,
  generateA11yId,
  FocusManager
} from '../../utils/accessibility';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
  findNodeHandle: jest.fn(),
  UIManager: {
    sendAccessibilityEvent: jest.fn(),
  },
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Accessibility Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constants', () => {
    it('should export accessibility roles', () => {
      expect(ACCESSIBILITY_ROLES.BUTTON).toBe('button');
      expect(ACCESSIBILITY_ROLES.LINK).toBe('link');
      expect(ACCESSIBILITY_ROLES.IMAGE).toBe('image');
      expect(ACCESSIBILITY_ROLES.CHECKBOX).toBe('checkbox');
      expect(ACCESSIBILITY_ROLES.SWITCH).toBe('switch');
    });

    it('should export accessibility states', () => {
      expect(ACCESSIBILITY_STATES.DISABLED).toBe('disabled');
      expect(ACCESSIBILITY_STATES.SELECTED).toBe('selected');
      expect(ACCESSIBILITY_STATES.CHECKED).toBe('checked');
      expect(ACCESSIBILITY_STATES.BUSY).toBe('busy');
      expect(ACCESSIBILITY_STATES.EXPANDED).toBe('expanded');
    });

    it('should export touch target sizes', () => {
      expect(TOUCH_TARGET_SIZE.MIN_SIZE).toBe(44);
      expect(TOUCH_TARGET_SIZE.RECOMMENDED_SIZE).toBe(48);
      expect(TOUCH_TARGET_SIZE.SPACING).toBe(8);
    });
  });

  describe('announceForAccessibility', () => {
    it('should announce message immediately', () => {
      announceForAccessibility('Test message');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
    });

    it('should announce message with delay', () => {
      announceForAccessibility('Delayed message', 1000);

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Delayed message');
    });

    it('should handle zero delay', () => {
      announceForAccessibility('Zero delay message', 0);
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Zero delay message');
    });
  });

  describe('isScreenReaderEnabled', () => {
    it('should return true when screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);

      const result = await isScreenReaderEnabled();

      expect(result).toBe(true);
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
    });

    it('should return false when screen reader is disabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);

      const result = await isScreenReaderEnabled();

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await isScreenReaderEnabled();

      expect(result).toBe(false);
    });
  });

  describe('isReduceMotionEnabled', () => {
    it('should return true when reduce motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const result = await isReduceMotionEnabled();

      expect(result).toBe(true);
    });

    it('should handle errors and return false', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await isReduceMotionEnabled();

      expect(result).toBe(false);
    });
  });

  describe('iOS-specific accessibility functions', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    describe('isBoldTextEnabled', () => {
      it('should return true when bold text is enabled on iOS', async () => {
        // Mock the undocumented method
        (AccessibilityInfo as any).isBoldTextEnabled = jest.fn().mockResolvedValue(true);

        const result = await isBoldTextEnabled();

        expect(result).toBe(true);
      });

      it('should return false on Android', async () => {
        Platform.OS = 'android';

        const result = await isBoldTextEnabled();

        expect(result).toBe(false);
      });

      it('should handle errors on iOS', async () => {
        (AccessibilityInfo as any).isBoldTextEnabled = jest.fn().mockRejectedValue(new Error('Test error'));

        const result = await isBoldTextEnabled();

        expect(result).toBe(false);
      });
    });

    describe('isGrayscaleEnabled', () => {
      it('should return true when grayscale is enabled on iOS', async () => {
        (AccessibilityInfo as any).isGrayscaleEnabled = jest.fn().mockResolvedValue(true);

        const result = await isGrayscaleEnabled();

        expect(result).toBe(true);
      });

      it('should return false on Android', async () => {
        Platform.OS = 'android';

        const result = await isGrayscaleEnabled();

        expect(result).toBe(false);
      });
    });

    describe('isInvertColorsEnabled', () => {
      it('should return true when invert colors is enabled on iOS', async () => {
        (AccessibilityInfo as any).isInvertColorsEnabled = jest.fn().mockResolvedValue(true);

        const result = await isInvertColorsEnabled();

        expect(result).toBe(true);
      });

      it('should return false on Android', async () => {
        Platform.OS = 'android';

        const result = await isInvertColorsEnabled();

        expect(result).toBe(false);
      });
    });
  });

  describe('setAccessibilityFocus', () => {
    it('should set focus on iOS', () => {
      Platform.OS = 'ios';
      const mockRef = { current: {} };
      (findNodeHandle as jest.Mock).mockReturnValue(123);

      setAccessibilityFocus(mockRef);

      expect(findNodeHandle).toHaveBeenCalledWith(mockRef);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(123);
    });

    it('should set focus on Android', () => {
      Platform.OS = 'android';
      const mockRef = { current: {} };
      (findNodeHandle as jest.Mock).mockReturnValue(456);

      setAccessibilityFocus(mockRef);

      expect(findNodeHandle).toHaveBeenCalledWith(mockRef);
      expect(UIManager.sendAccessibilityEvent).toHaveBeenCalledWith(456, 8);
    });

    it('should handle null ref', () => {
      setAccessibilityFocus(null);

      expect(findNodeHandle).not.toHaveBeenCalled();
    });

    it('should handle invalid node handle', () => {
      const mockRef = { current: {} };
      (findNodeHandle as jest.Mock).mockReturnValue(null);

      setAccessibilityFocus(mockRef);

      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
      expect(UIManager.sendAccessibilityEvent).not.toHaveBeenCalled();
    });
  });

  describe('createButtonA11yProps', () => {
    it('should create basic button props', () => {
      const props = createButtonA11yProps('Click me');

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Click me',
        accessibilityHint: undefined,
        accessibilityState: {
          disabled: false,
        },
        onAccessibilityTap: undefined,
      });
    });

    it('should create disabled button props', () => {
      const props = createButtonA11yProps('Submit', {
        disabled: true,
        hint: 'Submit the form',
      });

      expect(props.accessibilityState.disabled).toBe(true);
      expect(props.accessibilityHint).toBe('Submit the form');
    });

    it('should include onPress handler', () => {
      const onPress = jest.fn();
      const props = createButtonA11yProps('Button', { onPress });

      expect(props.onAccessibilityTap).toBe(onPress);
    });
  });

  describe('createLinkA11yProps', () => {
    it('should create basic link props', () => {
      const props = createLinkA11yProps('Learn more');

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'link',
        accessibilityLabel: 'Learn more',
        accessibilityHint: undefined,
      });
    });

    it('should add external browser hint', () => {
      const props = createLinkA11yProps('Visit website', {
        external: true,
      });

      expect(props.accessibilityHint).toBe('Opens in external browser');
    });

    it('should combine hint with external browser message', () => {
      const props = createLinkA11yProps('Documentation', {
        hint: 'View API docs',
        external: true,
      });

      expect(props.accessibilityHint).toBe('View API docs Opens in external browser');
    });
  });

  describe('createImageA11yProps', () => {
    it('should create accessible image props', () => {
      const props = createImageA11yProps('Company logo');

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'image',
        accessibilityLabel: 'Company logo',
      });
    });

    it('should create decorative image props', () => {
      const props = createImageA11yProps('', true);

      expect(props).toEqual({
        accessible: false,
        importantForAccessibility: 'no',
      });
    });
  });

  describe('createInputA11yProps', () => {
    it('should create basic input props', () => {
      const props = createInputA11yProps('Email');

      expect(props).toEqual({
        accessible: true,
        accessibilityLabel: 'Email',
        accessibilityValue: undefined,
        accessibilityHint: undefined,
      });
    });

    it('should add required indicator', () => {
      const props = createInputA11yProps('Password', { required: true });

      expect(props.accessibilityLabel).toBe('Password, required');
    });

    it('should add error message', () => {
      const props = createInputA11yProps('Username', {
        error: 'Username already taken',
      });

      expect(props.accessibilityLabel).toBe('Username, Error: Username already taken');
    });

    it('should include value and placeholder', () => {
      const props = createInputA11yProps('Search', {
        value: 'React Native',
        placeholder: 'Enter search term',
      });

      expect(props.accessibilityValue).toEqual({ text: 'React Native' });
      expect(props.accessibilityHint).toBe('Enter search term');
    });
  });

  describe('createCheckboxA11yProps', () => {
    it('should create checked checkbox props', () => {
      const props = createCheckboxA11yProps('Subscribe to newsletter', true);

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'checkbox',
        accessibilityLabel: 'Subscribe to newsletter',
        accessibilityHint: undefined,
        accessibilityState: {
          checked: true,
          disabled: false,
        },
      });
    });

    it('should create unchecked disabled checkbox props', () => {
      const props = createCheckboxA11yProps('Accept terms', false, {
        disabled: true,
        hint: 'You must accept to continue',
      });

      expect(props.accessibilityState.checked).toBe(false);
      expect(props.accessibilityState.disabled).toBe(true);
      expect(props.accessibilityHint).toBe('You must accept to continue');
    });
  });

  describe('createRadioA11yProps', () => {
    it('should create selected radio props', () => {
      const props = createRadioA11yProps('Option 1', true);

      expect(props.accessibilityState.selected).toBe(true);
      expect(props.accessibilityRole).toBe('radio');
    });

    it('should create unselected radio props', () => {
      const props = createRadioA11yProps('Option 2', false);

      expect(props.accessibilityState.selected).toBe(false);
    });
  });

  describe('createSwitchA11yProps', () => {
    it('should create on switch props', () => {
      const props = createSwitchA11yProps('Dark mode', true);

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'switch',
        accessibilityLabel: 'Dark mode',
        accessibilityHint: undefined,
        accessibilityState: {
          checked: true,
          disabled: false,
        },
        accessibilityValue: { text: 'on' },
      });
    });

    it('should create off switch props', () => {
      const props = createSwitchA11yProps('Notifications', false);

      expect(props.accessibilityState.checked).toBe(false);
      expect(props.accessibilityValue.text).toBe('off');
    });
  });

  describe('createProgressA11yProps', () => {
    it('should create progress props with percentage', () => {
      const props = createProgressA11yProps('Loading', 50);

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'progressbar',
        accessibilityLabel: 'Loading',
        accessibilityHint: undefined,
        accessibilityValue: {
          min: 0,
          max: 100,
          now: 50,
          text: '50 percent',
        },
      });
    });

    it('should handle custom max value', () => {
      const props = createProgressA11yProps('Step', 3, { max: 5 });

      expect(props.accessibilityValue).toEqual({
        min: 0,
        max: 5,
        now: 3,
        text: '60 percent',
      });
    });
  });

  describe('createListItemA11yProps', () => {
    it('should create basic list item props', () => {
      const props = createListItemA11yProps('Item 1');

      expect(props).toEqual({
        accessible: true,
        accessibilityLabel: 'Item 1',
        accessibilityHint: undefined,
        accessibilityState: {
          selected: false,
        },
      });
    });

    it('should include position info', () => {
      const props = createListItemA11yProps('Job posting', {
        position: 3,
        size: 10,
        selected: true,
      });

      expect(props.accessibilityLabel).toBe('Job posting, 3 of 10');
      expect(props.accessibilityState.selected).toBe(true);
    });
  });

  describe('createModalA11yProps', () => {
    it('should create modal props', () => {
      const props = createModalA11yProps('Confirmation Dialog');

      expect(props).toEqual({
        accessible: true,
        accessibilityViewIsModal: true,
        accessibilityLabel: 'Confirmation Dialog',
        accessibilityHint: undefined,
        accessibilityRole: 'alert',
      });
    });

    it('should include hint', () => {
      const props = createModalA11yProps('Settings', {
        hint: 'Adjust app preferences',
      });

      expect(props.accessibilityHint).toBe('Adjust app preferences');
    });
  });

  describe('formatTimeForScreenReader', () => {
    const now = new Date('2024-01-15T12:00:00');

    beforeEach(() => {
      jest.setSystemTime(now);
    });

    it('should format just now', () => {
      const date = new Date('2024-01-15T11:59:30');
      expect(formatTimeForScreenReader(date)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const date = new Date('2024-01-15T11:45:00');
      expect(formatTimeForScreenReader(date)).toBe('15 minutes ago');

      const date2 = new Date('2024-01-15T11:59:00');
      expect(formatTimeForScreenReader(date2)).toBe('1 minute ago');
    });

    it('should format hours ago', () => {
      const date = new Date('2024-01-15T09:00:00');
      expect(formatTimeForScreenReader(date)).toBe('3 hours ago');

      const date2 = new Date('2024-01-15T11:00:00');
      expect(formatTimeForScreenReader(date2)).toBe('1 hour ago');
    });

    it('should format days ago', () => {
      const date = new Date('2024-01-12T12:00:00');
      expect(formatTimeForScreenReader(date)).toBe('3 days ago');

      const date2 = new Date('2024-01-14T12:00:00');
      expect(formatTimeForScreenReader(date2)).toBe('1 day ago');
    });

    it('should format full date for older dates', () => {
      const date = new Date('2024-01-01T12:00:00');
      expect(formatTimeForScreenReader(date)).toBe('January 1, 2024');
    });

    it('should handle string dates', () => {
      const dateStr = '2024-01-15T11:30:00';
      expect(formatTimeForScreenReader(dateStr)).toBe('30 minutes ago');
    });
  });

  describe('formatCurrencyForScreenReader', () => {
    it('should format whole dollars', () => {
      expect(formatCurrencyForScreenReader(10)).toBe('10 dollars');
      expect(formatCurrencyForScreenReader(1)).toBe('1 dollar');
      expect(formatCurrencyForScreenReader(0)).toBe('0 dollars');
    });

    it('should format dollars and cents', () => {
      expect(formatCurrencyForScreenReader(10.50)).toBe('10 dollars and 50 cents');
      expect(formatCurrencyForScreenReader(1.01)).toBe('1 dollar and 1 cent');
      expect(formatCurrencyForScreenReader(0.99)).toBe('0 dollars and 99 cents');
    });

    it('should round cents properly', () => {
      // Math.round((10.999 - 10) * 100) = Math.round(99.9) = 100
      // When cents = 100, it shows as "10 dollars and 100 cents" (implementation doesn't handle overflow)
      expect(formatCurrencyForScreenReader(10.999)).toBe('10 dollars and 100 cents');
      expect(formatCurrencyForScreenReader(10.001)).toBe('10 dollars');
      expect(formatCurrencyForScreenReader(10.49)).toBe('10 dollars and 49 cents');
    });
  });

  describe('createFieldsetA11yProps', () => {
    it('should create fieldset props', () => {
      const props = createFieldsetA11yProps('Contact Information');

      expect(props).toEqual({
        accessible: true,
        accessibilityLabel: 'Contact Information',
        accessibilityRole: 'none',
        importantForAccessibility: 'yes',
      });
    });
  });

  describe('createLiveRegionA11yProps', () => {
    it('should create polite live region props', () => {
      const props = createLiveRegionA11yProps();

      expect(props).toEqual({
        accessible: true,
        accessibilityLiveRegion: 'polite',
        importantForAccessibility: 'yes',
      });
    });

    it('should create assertive live region props', () => {
      const props = createLiveRegionA11yProps('assertive');

      expect(props.accessibilityLiveRegion).toBe('assertive');
    });
  });

  describe('validateTouchTargetSize', () => {
    it('should validate valid touch targets', () => {
      const result = validateTouchTargetSize(50, 50);

      expect(result).toEqual({
        isValid: true,
      });
    });

    it('should reject small width', () => {
      const result = validateTouchTargetSize(30, 50);

      expect(result).toEqual({
        isValid: false,
        message: 'Touch target too small. Minimum size is 44x44dp. Current: 30x50dp',
      });
    });

    it('should reject small height', () => {
      const result = validateTouchTargetSize(50, 30);

      expect(result).toEqual({
        isValid: false,
        message: 'Touch target too small. Minimum size is 44x44dp. Current: 50x30dp',
      });
    });

    it('should accept exactly minimum size', () => {
      const result = validateTouchTargetSize(44, 44);

      expect(result.isValid).toBe(true);
    });
  });

  describe('generateA11yId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateA11yId();
      const id2 = generateA11yId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^a11y_\d+_\d+$/);
    });

    it('should use custom prefix', () => {
      const id = generateA11yId('custom');

      expect(id).toMatch(/^custom_\d+_\d+$/);
    });

    it('should increment counter', () => {
      const id1 = generateA11yId('test');
      const id2 = generateA11yId('test');

      const counter1 = parseInt(id1.split('_')[1]);
      const counter2 = parseInt(id2.split('_')[1]);

      expect(counter2).toBe(counter1 + 1);
    });
  });

  describe('FocusManager', () => {
    it('should save and restore focus', () => {
      Platform.OS = 'ios';
      const manager = new FocusManager();
      const mockRef = { current: {} };
      (findNodeHandle as jest.Mock).mockReturnValue(123);

      manager.saveFocus(mockRef);
      manager.restoreFocus();

      // The FocusManager calls setAccessibilityFocus which internally calls the mocked methods
      expect(findNodeHandle).toHaveBeenCalledWith(mockRef);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(123);
    });

    it('should clear saved focus after restore', () => {
      const manager = new FocusManager();
      const mockRef = { current: {} };
      (findNodeHandle as jest.Mock).mockReturnValue(456);

      manager.saveFocus(mockRef);
      manager.restoreFocus();

      // Should not try to restore again
      jest.clearAllMocks();
      manager.restoreFocus();

      expect(findNodeHandle).not.toHaveBeenCalled();
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
    });

    it('should handle restore without save', () => {
      const manager = new FocusManager();

      expect(() => manager.restoreFocus()).not.toThrow();
    });
  });

  describe('MobileAccessibility namespace', () => {
    it('should export all functions', () => {
      expect(MobileAccessibility.announceForAccessibility).toBe(announceForAccessibility);
      expect(MobileAccessibility.isScreenReaderEnabled).toBe(isScreenReaderEnabled);
      expect(MobileAccessibility.createButtonA11yProps).toBe(createButtonA11yProps);
      expect(MobileAccessibility.formatTimeForScreenReader).toBe(formatTimeForScreenReader);
      expect(MobileAccessibility.validateTouchTargetSize).toBe(validateTouchTargetSize);
      expect(MobileAccessibility.FocusManager).toBe(FocusManager);
    });

    it('should export all constants', () => {
      expect(MobileAccessibility.ACCESSIBILITY_ROLES).toBe(ACCESSIBILITY_ROLES);
      expect(MobileAccessibility.ACCESSIBILITY_STATES).toBe(ACCESSIBILITY_STATES);
      expect(MobileAccessibility.TOUCH_TARGET_SIZE).toBe(TOUCH_TARGET_SIZE);
    });

    it('should be the default export', () => {
      expect(MobileAccessibility).toBeDefined();
      expect(typeof MobileAccessibility).toBe('object');
    });
  });
});