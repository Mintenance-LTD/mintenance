import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import {
  useAccessibility,
  AccessibilityTestHelpers,
} from '../useAccessibility';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Mocks — only externals. The hook under test is NOT mocked.
// We fully replace react-native so we control AccessibilityInfo + Platform.OS.
// A per-test registry captures addEventListener subscriptions so we can fire
// the change callbacks and assert state updates.
// ---------------------------------------------------------------------------

interface ListenerEntry {
  event: string;
  callback: (value: boolean) => void;
  remove: jest.Mock;
}

const listenerRegistry: ListenerEntry[] = [];

jest.mock('react-native', () => {
  const platform = { OS: 'ios' };
  return {
    Platform: platform,
    AccessibilityInfo: {
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
      announceForAccessibility: jest.fn(),
      setAccessibilityFocus: jest.fn(),
      addEventListener: jest.fn(),
    },
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

const mockAI = AccessibilityInfo as unknown as {
  isScreenReaderEnabled: jest.Mock;
  isBoldTextEnabled: jest.Mock;
  isGrayscaleEnabled: jest.Mock;
  isInvertColorsEnabled: jest.Mock;
  isReduceMotionEnabled: jest.Mock;
  isReduceTransparencyEnabled: jest.Mock;
  announceForAccessibility: jest.Mock;
  setAccessibilityFocus: jest.Mock;
  addEventListener: jest.Mock;
};

const mockPlatform = Platform as unknown as { OS: string };

/** Wire addEventListener to capture subscriptions into listenerRegistry. */
function wireAddEventListener() {
  mockAI.addEventListener.mockImplementation(
    (event: string, callback: (value: boolean) => void) => {
      const remove = jest.fn();
      listenerRegistry.push({ event, callback, remove });
      return { remove };
    }
  );
}

/** Fire the most-recently-registered callback for an event name. */
function fireEvent(event: string, value: boolean) {
  const entry = [...listenerRegistry].reverse().find((l) => l.event === event);
  if (!entry) throw new Error(`No listener registered for "${event}"`);
  act(() => {
    entry.callback(value);
  });
}

function resetAllValues(value = false) {
  mockAI.isScreenReaderEnabled.mockResolvedValue(value);
  mockAI.isBoldTextEnabled.mockResolvedValue(value);
  mockAI.isGrayscaleEnabled.mockResolvedValue(value);
  mockAI.isInvertColorsEnabled.mockResolvedValue(value);
  mockAI.isReduceMotionEnabled.mockResolvedValue(value);
  mockAI.isReduceTransparencyEnabled.mockResolvedValue(value);
}

beforeEach(() => {
  jest.clearAllMocks();
  listenerRegistry.length = 0;
  mockPlatform.OS = 'ios';
  resetAllValues(false);
  wireAddEventListener();
});

// ---------------------------------------------------------------------------
// Initialization & state detection
// ---------------------------------------------------------------------------

describe('useAccessibility — initialization', () => {
  it('initializes with all defaults false on iOS when nothing is enabled', async () => {
    const { result } = renderHook(() => useAccessibility());

    await waitFor(() =>
      expect(mockAI.isScreenReaderEnabled).toHaveBeenCalled()
    );

    expect(result.current.isScreenReaderEnabled).toBe(false);
    expect(result.current.isBoldTextEnabled).toBe(false);
    expect(result.current.isGrayscaleEnabled).toBe(false);
    expect(result.current.isInvertColorsEnabled).toBe(false);
    expect(result.current.isReduceMotionEnabled).toBe(false);
    expect(result.current.isReduceTransparencyEnabled).toBe(false);
    expect(result.current.prefersCrossDeviceSync).toBe(false);
    expect(result.current.screenReaderName).toBeUndefined();
  });

  it('reads every accessibility flag on iOS and sets screenReaderName=VoiceOver', async () => {
    resetAllValues(true);
    const { result } = renderHook(() => useAccessibility());

    await waitFor(() =>
      expect(result.current.isScreenReaderEnabled).toBe(true)
    );

    expect(mockAI.isScreenReaderEnabled).toHaveBeenCalled();
    expect(mockAI.isBoldTextEnabled).toHaveBeenCalled();
    expect(mockAI.isGrayscaleEnabled).toHaveBeenCalled();
    expect(mockAI.isInvertColorsEnabled).toHaveBeenCalled();
    expect(mockAI.isReduceMotionEnabled).toHaveBeenCalled();
    expect(mockAI.isReduceTransparencyEnabled).toHaveBeenCalled();

    expect(result.current.isBoldTextEnabled).toBe(true);
    expect(result.current.isGrayscaleEnabled).toBe(true);
    expect(result.current.isInvertColorsEnabled).toBe(true);
    expect(result.current.isReduceMotionEnabled).toBe(true);
    expect(result.current.isReduceTransparencyEnabled).toBe(true);
    expect(result.current.screenReaderName).toBe('VoiceOver');
  });

  it('on Android only reads screen reader; other iOS-only getters are skipped and stay false; screenReaderName=TalkBack', async () => {
    mockPlatform.OS = 'android';
    mockAI.isScreenReaderEnabled.mockResolvedValue(true);
    // Even though these would resolve true, Android branch resolves false.
    mockAI.isBoldTextEnabled.mockResolvedValue(true);
    mockAI.isReduceMotionEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useAccessibility());

    await waitFor(() =>
      expect(result.current.isScreenReaderEnabled).toBe(true)
    );

    expect(mockAI.isScreenReaderEnabled).toHaveBeenCalled();
    // iOS-only getters must NOT be invoked on Android.
    expect(mockAI.isBoldTextEnabled).not.toHaveBeenCalled();
    expect(mockAI.isGrayscaleEnabled).not.toHaveBeenCalled();
    expect(mockAI.isInvertColorsEnabled).not.toHaveBeenCalled();
    expect(mockAI.isReduceMotionEnabled).not.toHaveBeenCalled();
    expect(mockAI.isReduceTransparencyEnabled).not.toHaveBeenCalled();

    expect(result.current.isBoldTextEnabled).toBe(false);
    expect(result.current.isReduceMotionEnabled).toBe(false);
    expect(result.current.screenReaderName).toBe('TalkBack');
  });

  it('logs an error when reading accessibility info throws', async () => {
    const boom = new Error('AX read failed');
    mockAI.isScreenReaderEnabled.mockRejectedValue(boom);

    renderHook(() => useAccessibility());

    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get accessibility info',
        boom
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Event listeners & change callbacks
// ---------------------------------------------------------------------------

describe('useAccessibility — event listeners', () => {
  it('registers all 6 listeners on iOS', async () => {
    renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    const events = listenerRegistry.map((l) => l.event);
    expect(events).toEqual(
      expect.arrayContaining([
        'screenReaderChanged',
        'boldTextChanged',
        'grayscaleChanged',
        'invertColorsChanged',
        'reduceMotionChanged',
        'reduceTransparencyChanged',
      ])
    );
    expect(events.length).toBe(6);
  });

  it('registers only the screenReader listener on Android', async () => {
    mockPlatform.OS = 'android';
    renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    const events = listenerRegistry.map((l) => l.event);
    expect(events).toEqual(['screenReaderChanged']);
  });

  it('updates isScreenReaderEnabled when screenReaderChanged fires', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('screenReaderChanged', true);
    expect(result.current.isScreenReaderEnabled).toBe(true);

    fireEvent('screenReaderChanged', false);
    expect(result.current.isScreenReaderEnabled).toBe(false);
  });

  it('updates isBoldTextEnabled when boldTextChanged fires', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('boldTextChanged', true);
    expect(result.current.isBoldTextEnabled).toBe(true);
  });

  it('updates isGrayscaleEnabled when grayscaleChanged fires', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('grayscaleChanged', true);
    expect(result.current.isGrayscaleEnabled).toBe(true);
  });

  it('updates isInvertColorsEnabled when invertColorsChanged fires', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('invertColorsChanged', true);
    expect(result.current.isInvertColorsEnabled).toBe(true);
  });

  it('updates isReduceMotionEnabled when reduceMotionChanged fires', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('reduceMotionChanged', true);
    expect(result.current.isReduceMotionEnabled).toBe(true);
    expect(result.current.shouldReduceMotion).toBe(true);
  });

  it('updates isReduceTransparencyEnabled when reduceTransparencyChanged fires', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('reduceTransparencyChanged', true);
    expect(result.current.isReduceTransparencyEnabled).toBe(true);
  });

  it('removes all listeners on unmount', async () => {
    const { unmount } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    const removes = listenerRegistry.map((l) => l.remove);
    expect(removes.length).toBe(6);

    unmount();
    removes.forEach((r) => expect(r).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// announce / focus utilities (gated on screen reader)
// ---------------------------------------------------------------------------

describe('useAccessibility — announce & focus', () => {
  it('does NOT announce when screen reader is disabled', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    act(() => result.current.announceForAccessibility('hello'));
    expect(mockAI.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('announces when screen reader is enabled', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('screenReaderChanged', true);
    act(() => result.current.announceForAccessibility('hello'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith('hello');
  });

  it('does NOT set focus when screen reader is disabled', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    act(() => result.current.setAccessibilityFocus(42));
    expect(mockAI.setAccessibilityFocus).not.toHaveBeenCalled();
  });

  it('sets focus when screen reader is enabled', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    fireEvent('screenReaderChanged', true);
    act(() => result.current.setAccessibilityFocus(42));
    expect(mockAI.setAccessibilityFocus).toHaveBeenCalledWith(42);
  });
});

// ---------------------------------------------------------------------------
// Props generators
// ---------------------------------------------------------------------------

describe('useAccessibility — props generators', () => {
  const setup = async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());
    return result;
  };

  it('getButtonProps builds button props', async () => {
    const result = await setup();
    const props = result.current.getButtonProps(
      'Save',
      'Saves the form',
      true,
      false
    );
    expect(props).toEqual({
      accessibilityRole: 'button',
      accessibilityLabel: 'Save',
      accessibilityHint: 'Saves the form',
      accessibilityState: { disabled: true, selected: false },
      accessible: true,
    });
  });

  it('getTextInputProps with explicit hint and plain value', async () => {
    const result = await setup();
    const props = result.current.getTextInputProps(
      'Name',
      'John',
      'Enter name',
      false,
      false
    );
    expect(props.accessibilityRole).toBe('text');
    expect(props.accessibilityHint).toBe('Enter name');
    expect(props.accessibilityValue).toEqual({ text: 'John' });
    expect(props.accessibilityState).toEqual({ disabled: false });
  });

  it('getTextInputProps secure path masks value and defaults hint', async () => {
    const result = await setup();
    const props = result.current.getTextInputProps(
      'Password',
      'pw',
      undefined,
      false,
      true
    );
    expect(props.accessibilityHint).toBe('Secure text input');
    expect(props.accessibilityValue).toEqual({ text: 'Has text' });
  });

  it('getTextInputProps non-secure default hint and undefined value', async () => {
    const result = await setup();
    const props = result.current.getTextInputProps('Field');
    expect(props.accessibilityHint).toBe('Text input');
    expect(props.accessibilityValue).toBeUndefined();
  });

  it('getCheckboxProps builds checkbox props with mixed checked', async () => {
    const result = await setup();
    const props = result.current.getCheckboxProps(
      'Agree',
      'mixed',
      'hint',
      true
    );
    expect(props.accessibilityRole).toBe('checkbox');
    expect(props.accessibilityState).toEqual({
      checked: 'mixed',
      disabled: true,
    });
  });

  it('getRadioProps builds radio props', async () => {
    const result = await setup();
    const props = result.current.getRadioProps('Option A', true);
    expect(props.accessibilityRole).toBe('radio');
    expect(props.accessibilityState).toEqual({
      selected: true,
      disabled: undefined,
    });
  });

  it('getSliderProps with custom hint', async () => {
    const result = await setup();
    const props = result.current.getSliderProps(
      'Volume',
      5,
      0,
      10,
      'Custom hint',
      false
    );
    expect(props.accessibilityRole).toBe('adjustable');
    expect(props.accessibilityHint).toBe('Custom hint');
    expect(props.accessibilityValue).toEqual({
      min: 0,
      max: 10,
      now: 5,
      text: '5',
    });
    expect(props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Increase value' },
      { name: 'decrement', label: 'Decrease value' },
    ]);
  });

  it('getSliderProps default hint', async () => {
    const result = await setup();
    const props = result.current.getSliderProps('Volume', 3, 0, 10);
    expect(props.accessibilityHint).toBe('Swipe up or down to adjust value');
  });

  it('getImageProps non-decorative exposes label and accessible', async () => {
    const result = await setup();
    const props = result.current.getImageProps('A cat', false);
    expect(props).toEqual({
      accessibilityRole: 'image',
      accessibilityLabel: 'A cat',
      accessible: true,
    });
  });

  it('getImageProps decorative hides label and is not accessible', async () => {
    const result = await setup();
    const props = result.current.getImageProps('A cat', true);
    expect(props.accessibilityLabel).toBeUndefined();
    expect(props.accessible).toBe(false);
  });

  it('getImageProps defaults decorative=false', async () => {
    const result = await setup();
    const props = result.current.getImageProps('Logo');
    expect(props.accessibilityLabel).toBe('Logo');
    expect(props.accessible).toBe(true);
  });

  it('getHeaderProps builds header props', async () => {
    const result = await setup();
    const props = result.current.getHeaderProps(2, 'Section Title');
    expect(props).toEqual({
      accessibilityRole: 'header',
      accessibilityLabel: 'Section Title',
      accessible: true,
    });
  });

  it('getListProps default label uses item count', async () => {
    const result = await setup();
    expect(result.current.getListProps(3).accessibilityLabel).toBe(
      'List with 3 items'
    );
  });

  it('getListProps custom label', async () => {
    const result = await setup();
    expect(result.current.getListProps(3, 'My List').accessibilityLabel).toBe(
      'My List'
    );
  });

  it('getListItemProps builds 1-based position label', async () => {
    const result = await setup();
    const props = result.current.getListItemProps(0, 5, 'Apple', 'tap to open');
    expect(props.accessibilityRole).toBe('none');
    expect(props.accessibilityLabel).toBe('Apple, 1 of 5');
    expect(props.accessibilityHint).toBe('tap to open');
  });

  it('getTabProps builds tab props', async () => {
    const result = await setup();
    const props = result.current.getTabProps('Home', true, 0, 3);
    expect(props.accessibilityRole).toBe('tab');
    expect(props.accessibilityLabel).toBe('Home, tab 1 of 3');
    expect(props.accessibilityState).toEqual({ selected: true });
  });

  it('getTabPanelProps builds panel props', async () => {
    const result = await setup();
    const props = result.current.getTabPanelProps('Home');
    expect(props.accessibilityRole).toBe('none');
    expect(props.accessibilityLabel).toBe('Home panel');
  });

  it('getErrorProps returns empty object when no message', async () => {
    const result = await setup();
    expect(result.current.getErrorProps()).toEqual({});
  });

  it('getErrorProps returns alert props when message present', async () => {
    const result = await setup();
    const props = result.current.getErrorProps('Required field');
    expect(props).toEqual({
      accessibilityLabel: 'Error: Required field',
      accessibilityRole: 'alert',
      accessible: true,
    });
  });

  it('getFormFieldProps required + error builds compound label', async () => {
    const result = await setup();
    const props = result.current.getFormFieldProps(
      'Email',
      true,
      'Invalid',
      'hint'
    );
    expect(props.accessibilityLabel).toBe('Email, required, Invalid');
    expect(props.accessibilityHint).toBe('hint');
    expect(props.accessibilityInvalid).toBe(true);
  });

  it('getFormFieldProps optional + no error', async () => {
    const result = await setup();
    const props = result.current.getFormFieldProps('Email');
    expect(props.accessibilityLabel).toBe('Email');
    expect(props.accessibilityInvalid).toBe(false);
  });

  it('getFormFieldProps required without error', async () => {
    const result = await setup();
    const props = result.current.getFormFieldProps('Email', true);
    expect(props.accessibilityLabel).toBe('Email, required');
  });
});

// ---------------------------------------------------------------------------
// Dynamic-content announcers (require screen reader for most)
// ---------------------------------------------------------------------------

describe('useAccessibility — dynamic announcers', () => {
  const setupWithSR = async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());
    fireEvent('screenReaderChanged', true);
    return result;
  };

  it('announceStateChange announces when state differs', async () => {
    const result = await setupWithSR();
    act(() =>
      result.current.announceStateChange(
        'a',
        'b',
        (o, n) => `from ${o} to ${n}`
      )
    );
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith('from a to b');
  });

  it('announceStateChange does nothing when state is unchanged', async () => {
    const result = await setupWithSR();
    const getMessage = jest.fn(() => 'msg');
    act(() => result.current.announceStateChange('same', 'same', getMessage));
    expect(getMessage).not.toHaveBeenCalled();
    expect(mockAI.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('announceStateChange does nothing when screen reader is off', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());
    act(() => result.current.announceStateChange('a', 'b', () => 'msg'));
    expect(mockAI.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('announcePageChange announces navigation', async () => {
    const result = await setupWithSR();
    act(() => result.current.announcePageChange('Settings'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Navigated to Settings'
    );
  });

  it('announceLoading both with and without context', async () => {
    const result = await setupWithSR();
    act(() => result.current.announceLoading(true, 'jobs'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Loading jobs'
    );

    act(() => result.current.announceLoading(false, 'jobs'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Finished loading jobs'
    );

    act(() => result.current.announceLoading(true));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith('Loading');

    act(() => result.current.announceLoading(false));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Finished loading'
    );
  });

  it('announceError with and without context', async () => {
    const result = await setupWithSR();
    act(() => result.current.announceError('boom', 'upload'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Error in upload: boom'
    );

    act(() => result.current.announceError('boom'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith('Error: boom');
  });

  it('announceSuccess with and without context', async () => {
    const result = await setupWithSR();
    act(() => result.current.announceSuccess('done', 'save'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Success in save: done'
    );

    act(() => result.current.announceSuccess('done'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Success: done'
    );
  });

  it('announceFormValidation invalid path', async () => {
    const result = await setupWithSR();
    act(() =>
      result.current.announceFormValidation('Email', false, 'Bad email')
    );
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Email field has an error: Bad email'
    );
  });

  it('announceFormValidation valid path', async () => {
    const result = await setupWithSR();
    act(() => result.current.announceFormValidation('Email', true));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Email field is valid'
    );
  });

  it('announceFormValidation invalid without message announces nothing', async () => {
    const result = await setupWithSR();
    act(() => result.current.announceFormValidation('Email', false));
    expect(mockAI.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('announceListChange covers added/removed/updated, with and without list name', async () => {
    const result = await setupWithSR();
    act(() => result.current.announceListChange('added', 'Item', 'Cart'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Added Item in Cart'
    );

    act(() => result.current.announceListChange('removed', 'Item'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Removed Item'
    );

    act(() => result.current.announceListChange('updated', 'Item'));
    expect(mockAI.announceForAccessibility).toHaveBeenCalledWith(
      'Updated Item'
    );
  });
});

// ---------------------------------------------------------------------------
// Computed values
// ---------------------------------------------------------------------------

describe('useAccessibility — computed values', () => {
  it('reflects all assistive-tech computed flags when everything is enabled', async () => {
    resetAllValues(true);
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() =>
      expect(result.current.isScreenReaderEnabled).toBe(true)
    );

    expect(result.current.shouldReduceMotion).toBe(true);
    expect(result.current.shouldUseBoldText).toBe(true);
    expect(result.current.shouldUseHighContrast).toBe(true);
    expect(result.current.isUsingAssistiveTechnology).toBe(true);
  });

  it('shouldUseHighContrast is true when only grayscale is on (invert off)', async () => {
    mockAI.isGrayscaleEnabled.mockResolvedValue(true);
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(result.current.isGrayscaleEnabled).toBe(true));

    expect(result.current.isInvertColorsEnabled).toBe(false);
    expect(result.current.shouldUseHighContrast).toBe(true);
  });

  it('all computed flags false when nothing enabled', async () => {
    const { result } = renderHook(() => useAccessibility());
    await waitFor(() => expect(mockAI.addEventListener).toHaveBeenCalled());

    expect(result.current.shouldReduceMotion).toBe(false);
    expect(result.current.shouldUseBoldText).toBe(false);
    expect(result.current.shouldUseHighContrast).toBe(false);
    expect(result.current.isUsingAssistiveTechnology).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AccessibilityTestHelpers (exported static helpers)
// ---------------------------------------------------------------------------

describe('AccessibilityTestHelpers', () => {
  it('hasAccessibilityProps true with label, false when accessible=false', () => {
    expect(
      AccessibilityTestHelpers.hasAccessibilityProps({
        props: { accessibilityLabel: 'X' },
      })
    ).toBeTruthy();
    expect(
      AccessibilityTestHelpers.hasAccessibilityProps({
        props: { accessibilityRole: 'button' },
      })
    ).toBeTruthy();
    expect(
      AccessibilityTestHelpers.hasAccessibilityProps({
        props: { accessible: false, accessibilityLabel: 'X' },
      })
    ).toBe(false);
    // no label and no role -> falsy
    expect(
      AccessibilityTestHelpers.hasAccessibilityProps({ props: {} })
    ).toBeFalsy();
  });

  it('hasInteractiveRole detects interactive vs non-interactive roles', () => {
    expect(
      AccessibilityTestHelpers.hasInteractiveRole({
        props: { accessibilityRole: 'button' },
      })
    ).toBe(true);
    expect(
      AccessibilityTestHelpers.hasInteractiveRole({
        props: { accessibilityRole: 'text' },
      })
    ).toBe(false);
  });

  it('hasSufficientContrast returns true placeholder', () => {
    expect(AccessibilityTestHelpers.hasSufficientContrast('#fff', '#000')).toBe(
      true
    );
  });

  it('hasAppropriateTextSize enforces 16px minimum', () => {
    expect(AccessibilityTestHelpers.hasAppropriateTextSize(16)).toBe(true);
    expect(AccessibilityTestHelpers.hasAppropriateTextSize(12)).toBe(false);
  });

  it('hasAdequateTouchTarget enforces 44x44 minimum', () => {
    expect(AccessibilityTestHelpers.hasAdequateTouchTarget(44, 44)).toBe(true);
    expect(AccessibilityTestHelpers.hasAdequateTouchTarget(40, 44)).toBe(false);
    expect(AccessibilityTestHelpers.hasAdequateTouchTarget(44, 40)).toBe(false);
  });
});
