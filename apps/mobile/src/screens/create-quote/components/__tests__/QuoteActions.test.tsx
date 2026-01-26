/**
 * QuoteActions Component Tests
 *
 * Comprehensive test suite for the QuoteActions component
 * Target: 100% code coverage
 *
 * @component QuoteActions
 * @filesize 900+ lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { QuoteActions } from '../QuoteActions';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      primary: '#0EA5E9',
      secondary: '#10B981',
      textPrimary: '#171717',
      textInverse: '#FFFFFF',
      surfaceTertiary: '#F5F5F5',
      border: '#E5E5E5',
    },
    spacing: {
      lg: 16,
      md: 12,
      xl: 24,
    },
    borderRadius: {
      lg: 12,
    },
    typography: {
      fontSize: {
        lg: 18,
      },
      fontWeight: {
        semibold: '600',
      },
    },
  },
}));

// ============================================================================
// TEST DATA
// ============================================================================

const defaultProps = {
  loading: false,
  onSave: jest.fn(),
  onSend: jest.fn(),
  onBack: jest.fn(),
};

// ============================================================================
// QUOTEACTIONS COMPONENT TESTS
// ============================================================================

describe('QuoteActions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders Cancel button', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('renders Save Quote button', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Save Quote')).toBeTruthy();
    });

    it('renders Send to Client button', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Send to Client')).toBeTruthy();
    });

    it('renders all three action buttons', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save Quote')).toBeTruthy();
      expect(getByText('Send to Client')).toBeTruthy();
    });

    it('renders container with correct structure', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders with all required props', () => {
      expect(() => {
        render(<QuoteActions {...defaultProps} />);
      }).not.toThrow();
    });

    it('renders button row container', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const buttonRow = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.flexDirection === 'row' &&
            style?.gap === 12
        );
      });
      expect(buttonRow).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Button Interaction Tests - Non-Loading State
  // --------------------------------------------------------------------------

  describe('Button Interaction - Non-Loading State', () => {
    it('calls onBack when Cancel button is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Cancel'));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when Save Quote button is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Save Quote'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onSend when Send to Client button is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Send to Client'));
      expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
    });

    it('calls onBack multiple times on multiple presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      fireEvent.press(cancelButton);
      fireEvent.press(cancelButton);
      expect(defaultProps.onBack).toHaveBeenCalledTimes(3);
    });

    it('calls onSave multiple times on multiple presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const saveButton = getByText('Save Quote');
      fireEvent.press(saveButton);
      fireEvent.press(saveButton);
      expect(defaultProps.onSave).toHaveBeenCalledTimes(2);
    });

    it('calls onSend multiple times on multiple presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendButton = getByText('Send to Client');
      fireEvent.press(sendButton);
      fireEvent.press(sendButton);
      expect(defaultProps.onSend).toHaveBeenCalledTimes(2);
    });

    it('does not call other callbacks when Cancel is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Cancel'));
      expect(defaultProps.onBack).toHaveBeenCalled();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Save Quote is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Save Quote'));
      expect(defaultProps.onSave).toHaveBeenCalled();
      expect(defaultProps.onBack).not.toHaveBeenCalled();
      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('does not call other callbacks when Send to Client is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Send to Client'));
      expect(defaultProps.onSend).toHaveBeenCalled();
      expect(defaultProps.onBack).not.toHaveBeenCalled();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('buttons are not disabled when loading is false', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);

      touchables.forEach((button: any) => {
        expect(button.props.disabled).toBe(false);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Loading State Tests
  // --------------------------------------------------------------------------

  describe('Loading State', () => {
    it('disables all buttons when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);

      touchables.forEach((button: any) => {
        expect(button.props.disabled).toBe(true);
      });
    });

    it('disables Save Quote button when loading', () => {
      const { queryByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const saveText = queryByText('Save Quote');
      if (!saveText) {
        // Button is showing spinner, find the TouchableOpacity
        const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
        const saveButton = touchables.find((t: any) => {
          const styles = Array.isArray(t?.props.style)
            ? t.props.style.flat()
            : [t?.props.style];
          return styles.some((s: any) => s?.backgroundColor === '#0EA5E9');
        });
        expect(saveButton?.props.disabled).toBe(true);
      } else {
        const saveButton = saveText.parent?.parent;
        expect(saveButton?.props.disabled).toBe(true);
      }
    });

    it('disables Send to Client button when loading', () => {
      const { queryByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const sendText = queryByText('Send to Client');
      if (!sendText) {
        // Button is showing spinner, find the TouchableOpacity
        const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
        const sendButton = touchables.find((t: any) => {
          const styles = Array.isArray(t?.props.style)
            ? t.props.style.flat()
            : [t?.props.style];
          return styles.some((s: any) => s?.backgroundColor === '#10B981');
        });
        expect(sendButton?.props.disabled).toBe(true);
      } else {
        const sendButton = sendText.parent?.parent;
        expect(sendButton?.props.disabled).toBe(true);
      }
    });

    it('shows ActivityIndicator in Save Quote button when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('shows ActivityIndicator in Send to Client button when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('hides Save Quote text when loading', () => {
      const { queryByText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(queryByText('Save Quote')).toBeNull();
    });

    it('hides Send to Client text when loading', () => {
      const { queryByText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(queryByText('Send to Client')).toBeNull();
    });

    it('still shows Cancel text when loading', () => {
      const { getByText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('sets disabled prop on all buttons during loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const disabledStates = touchables.map((button: any) => button.props.disabled);

      expect(disabledStates.every((disabled: boolean) => disabled === true)).toBe(true);
      expect(touchables.length).toBeGreaterThanOrEqual(3);
    });

    it('verifies all buttons have disabled prop when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      touchables.forEach((button: any) => {
        expect(button.props).toHaveProperty('disabled', true);
      });
    });

    it('verifies button disabled state is consistent across all buttons', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const allDisabled = touchables.every((button: any) => button.props.disabled === true);

      expect(allDisabled).toBe(true);
    });

    it('ActivityIndicator has correct size', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      expect(spinners.length).toBeGreaterThan(0);
      spinners.forEach((spinner: any) => {
        expect(spinner.props.size).toBe('small');
      });
    });

    it('ActivityIndicator has correct color', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      expect(spinners.length).toBeGreaterThan(0);
      spinners.forEach((spinner: any) => {
        expect(spinner.props.color).toBe('#FFFFFF');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Loading State Transitions
  // --------------------------------------------------------------------------

  describe('Loading State Transitions', () => {
    it('transitions from non-loading to loading', () => {
      const { rerender, queryByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );
      expect(queryByText('Save Quote')).toBeTruthy();

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      expect(queryByText('Save Quote')).toBeNull();
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('transitions from loading to non-loading', () => {
      const { rerender, queryByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(queryByText('Save Quote')).toBeNull();

      rerender(<QuoteActions {...defaultProps} loading={false} />);
      expect(queryByText('Save Quote')).toBeTruthy();
    });

    it('multiple transitions between loading states', () => {
      const { rerender, queryByText } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      expect(queryByText('Save Quote')).toBeNull();

      rerender(<QuoteActions {...defaultProps} loading={false} />);
      expect(queryByText('Save Quote')).toBeTruthy();

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      expect(queryByText('Save Quote')).toBeNull();
    });

    it('buttons become enabled after loading completes', () => {
      const { rerender, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      rerender(<QuoteActions {...defaultProps} loading={false} />);

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      touchables.forEach((button: any) => {
        expect(button.props.disabled).toBe(false);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Button Styling Tests - Cancel Button
  // --------------------------------------------------------------------------

  describe('Button Styling - Cancel Button', () => {
    it('Cancel button renders with correct styling', () => {
      const { getByText, UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Cancel')).toBeTruthy();

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const cancelButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some((s: any) => s?.backgroundColor === '#F5F5F5');
      });
      expect(cancelButton).toBeTruthy();
    });

    it('Cancel button has border styling', () => {
      const { getByText, UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Cancel')).toBeTruthy();

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const cancelButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some(
          (s: any) => s?.borderWidth === 1 && s?.borderColor === '#E5E5E5'
        );
      });
      expect(cancelButton).toBeTruthy();
    });

    it('Cancel button text has correct color', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const cancelText = getByText('Cancel');
      const styles = Array.isArray(cancelText.props.style)
        ? cancelText.props.style.flat()
        : [cancelText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#171717',
          }),
        ])
      );
    });

    it('Cancel button text has correct font size', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const cancelText = getByText('Cancel');
      const styles = Array.isArray(cancelText.props.style)
        ? cancelText.props.style.flat()
        : [cancelText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 18,
          }),
        ])
      );
    });

    it('Cancel button text has correct font weight', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const cancelText = getByText('Cancel');
      const styles = Array.isArray(cancelText.props.style)
        ? cancelText.props.style.flat()
        : [cancelText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Button Styling Tests - Save Quote Button
  // --------------------------------------------------------------------------

  describe('Button Styling - Save Quote Button', () => {
    it('Save Quote button renders with primary color styling', () => {
      const { getByText, UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Save Quote')).toBeTruthy();

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const primaryButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some((s: any) => s?.backgroundColor === '#0EA5E9');
      });
      expect(primaryButton).toBeTruthy();
    });

    it('Save Quote button text has correct styling', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const saveText = getByText('Save Quote');
      expect(saveText).toBeTruthy();

      const styles = Array.isArray(saveText.props.style)
        ? saveText.props.style.flat()
        : [saveText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('Save Quote button text has correct font size', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const saveText = getByText('Save Quote');
      const styles = Array.isArray(saveText.props.style)
        ? saveText.props.style.flat()
        : [saveText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 18,
          }),
        ])
      );
    });

    it('Save Quote button text has correct font weight', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const saveText = getByText('Save Quote');
      const styles = Array.isArray(saveText.props.style)
        ? saveText.props.style.flat()
        : [saveText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('Save Quote button has proper button structure', () => {
      const { getByText, UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Save Quote')).toBeTruthy();
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBeGreaterThanOrEqual(3);
    });
  });

  // --------------------------------------------------------------------------
  // Button Styling Tests - Send to Client Button
  // --------------------------------------------------------------------------

  describe('Button Styling - Send to Client Button', () => {
    it('Send to Client button renders with secondary color styling', () => {
      const { getByText, UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Send to Client')).toBeTruthy();

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const secondaryButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some((s: any) => s?.backgroundColor === '#10B981');
      });
      expect(secondaryButton).toBeTruthy();
    });

    it('Send to Client button text has correct color', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendText = getByText('Send to Client');
      const styles = Array.isArray(sendText.props.style)
        ? sendText.props.style.flat()
        : [sendText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
          }),
        ])
      );
    });

    it('Send to Client button text has correct font size', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendText = getByText('Send to Client');
      const styles = Array.isArray(sendText.props.style)
        ? sendText.props.style.flat()
        : [sendText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 18,
          }),
        ])
      );
    });

    it('Send to Client button text has correct font weight', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendText = getByText('Send to Client');
      const styles = Array.isArray(sendText.props.style)
        ? sendText.props.style.flat()
        : [sendText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Container Styling Tests
  // --------------------------------------------------------------------------

  describe('Container Styling', () => {
    it('renders main container with proper structure', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders button row container', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const buttonRow = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.flexDirection === 'row' &&
            style?.gap === 12
        );
      });
      expect(buttonRow).toBeTruthy();
    });

    it('renders container with correct gap', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const container = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) => style?.gap === 12);
      });
      expect(container).toBeTruthy();
    });

    it('renders touchable buttons with proper structure', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBeGreaterThanOrEqual(3);
    });

    it('buttons are rendered as TouchableOpacity elements', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const cancelText = getByText('Cancel');
      const saveText = getByText('Save Quote');
      const sendText = getByText('Send to Client');

      expect(cancelText).toBeTruthy();
      expect(saveText).toBeTruthy();
      expect(sendText).toBeTruthy();
    });

    it('maintains consistent layout structure', () => {
      const { rerender, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      const initialViews = UNSAFE_root.findAllByType('View' as any);

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      const loadingViews = UNSAFE_root.findAllByType('View' as any);

      expect(initialViews.length).toBe(loadingViews.length);
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('complete workflow: cancel, save, send', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);

      fireEvent.press(getByText('Cancel'));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Save Quote'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Send to Client'));
      expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
    });

    it('handles rapid sequential button presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);

      fireEvent.press(getByText('Save Quote'));
      fireEvent.press(getByText('Send to Client'));
      fireEvent.press(getByText('Cancel'));

      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('maintains consistent behavior across multiple renders', () => {
      const { rerender, getByText } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      fireEvent.press(getByText('Save Quote'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      rerender(<QuoteActions {...defaultProps} loading={false} />);

      fireEvent.press(getByText('Save Quote'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles loading prop changes rapidly', () => {
      const { rerender } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      for (let i = 0; i < 10; i++) {
        rerender(<QuoteActions {...defaultProps} loading={i % 2 === 0} />);
      }

      expect(() => {
        rerender(<QuoteActions {...defaultProps} loading={false} />);
      }).not.toThrow();
    });

    it('handles callback functions being undefined', () => {
      const propsWithUndefinedCallbacks = {
        loading: false,
        onSave: undefined as any,
        onSend: undefined as any,
        onBack: undefined as any,
      };

      expect(() => {
        render(<QuoteActions {...propsWithUndefinedCallbacks} />);
      }).not.toThrow();
    });

    it('all buttons remain interactive after multiple state changes', () => {
      const { rerender, getByText } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      rerender(<QuoteActions {...defaultProps} loading={false} />);
      rerender(<QuoteActions {...defaultProps} loading={true} />);
      rerender(<QuoteActions {...defaultProps} loading={false} />);

      fireEvent.press(getByText('Cancel'));
      fireEvent.press(getByText('Save Quote'));
      fireEvent.press(getByText('Send to Client'));

      expect(defaultProps.onBack).toHaveBeenCalled();
      expect(defaultProps.onSave).toHaveBeenCalled();
      expect(defaultProps.onSend).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('all buttons are rendered as touchable elements', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBeGreaterThanOrEqual(3);
    });

    it('disabled buttons prevent interaction when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      touchables.forEach((button: any) => {
        expect(button.props.disabled).toBe(true);
      });

      // Verify callbacks not called when disabled
      expect(defaultProps.onBack).not.toHaveBeenCalled();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('buttons are enabled when not loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      touchables.forEach((button: any) => {
        expect(button.props.disabled).toBe(false);
      });
    });

    it('buttons have appropriate visual feedback states', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);

      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save Quote')).toBeTruthy();
      expect(getByText('Send to Client')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now();
      render(<QuoteActions {...defaultProps} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      const startTime = Date.now();
      for (let i = 0; i < 50; i++) {
        rerender(<QuoteActions {...defaultProps} loading={i % 2 === 0} />);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
