/**
 * QuoteActions Component Tests
 *
 * Test suite for the QuoteActions component.
 *
 * Realigned 2026-06-04 to the Mint Editorial design: the component now renders
 * exactly TWO buttons — an outline "Save Draft" (surface background, ink
 * border) and a filled "Send Quote" (ink background, on-brand white text).
 * There is no longer a "Cancel" button — back navigation handles dismissal, so
 * `onBack` is accepted as a prop but intentionally not wired to a button.
 * Colours come from the `me` (mint-editorial) token object:
 *   me.ink     = #1A2520  (filled bg + outline text/border)
 *   me.surface = #FFFFFF  (outline bg)
 *   me.onBrand = #FFFFFF  (filled text + filled spinner)
 *
 * @component QuoteActions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { QuoteActions } from '../QuoteActions';
import { me } from '../../../../design-system/mint-editorial';

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

    it('renders Save Draft button', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Save Draft')).toBeTruthy();
    });

    it('renders Send Quote button', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      expect(getByText('Send Quote')).toBeTruthy();
    });

    it('does not render a Cancel button (back nav handles dismissal)', () => {
      const { queryByText } = render(<QuoteActions {...defaultProps} />);
      expect(queryByText('Cancel')).toBeNull();
    });

    it('renders exactly two action buttons', () => {
      const { getByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} />
      );
      expect(getByText('Save Draft')).toBeTruthy();
      expect(getByText('Send Quote')).toBeTruthy();
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBe(2);
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
          (style: any) => style?.flexDirection === 'row' && style?.gap === 10
        );
      });
      expect(buttonRow).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Button Interaction Tests - Non-Loading State
  // --------------------------------------------------------------------------

  describe('Button Interaction - Non-Loading State', () => {
    it('calls onSave when Save Draft button is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Save Draft'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onSend when Send Quote button is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Send Quote'));
      expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
    });

    it('calls onSave multiple times on multiple presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const saveButton = getByText('Save Draft');
      fireEvent.press(saveButton);
      fireEvent.press(saveButton);
      expect(defaultProps.onSave).toHaveBeenCalledTimes(2);
    });

    it('calls onSend multiple times on multiple presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendButton = getByText('Send Quote');
      fireEvent.press(sendButton);
      fireEvent.press(sendButton);
      expect(defaultProps.onSend).toHaveBeenCalledTimes(2);
    });

    it('does not call onSend when Save Draft is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Save Draft'));
      expect(defaultProps.onSave).toHaveBeenCalled();
      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('does not call onSave when Send Quote is pressed', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      fireEvent.press(getByText('Send Quote'));
      expect(defaultProps.onSend).toHaveBeenCalled();
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

    it('shows ActivityIndicator in both buttons when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      // One spinner per button (Save Draft + Send Quote).
      expect(spinners.length).toBe(2);
    });

    it('hides Save Draft text when loading', () => {
      const { queryByText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(queryByText('Save Draft')).toBeNull();
    });

    it('hides Send Quote text when loading', () => {
      const { queryByText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(queryByText('Send Quote')).toBeNull();
    });

    it('sets disabled prop on all buttons during loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const disabledStates = touchables.map(
        (button: any) => button.props.disabled
      );

      expect(
        disabledStates.every((disabled: boolean) => disabled === true)
      ).toBe(true);
      expect(touchables.length).toBe(2);
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

    it('Save Draft spinner uses ink colour, Send Quote spinner uses on-brand colour', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      const colors = spinners.map((s: any) => s.props.color);
      expect(colors).toContain(me.ink);
      expect(colors).toContain(me.onBrand);
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
      expect(queryByText('Save Draft')).toBeTruthy();

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      expect(queryByText('Save Draft')).toBeNull();
      const spinners = UNSAFE_root.findAllByType(ActivityIndicator as any);
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('transitions from loading to non-loading', () => {
      const { rerender, queryByText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(queryByText('Save Draft')).toBeNull();

      rerender(<QuoteActions {...defaultProps} loading={false} />);
      expect(queryByText('Save Draft')).toBeTruthy();
    });

    it('multiple transitions between loading states', () => {
      const { rerender, queryByText } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      expect(queryByText('Save Draft')).toBeNull();

      rerender(<QuoteActions {...defaultProps} loading={false} />);
      expect(queryByText('Save Draft')).toBeTruthy();

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      expect(queryByText('Save Draft')).toBeNull();
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
  // Button Styling Tests - Save Draft (outline) Button
  // --------------------------------------------------------------------------

  describe('Button Styling - Save Draft Button', () => {
    it('Save Draft button renders with surface background', () => {
      const { getByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} />
      );
      expect(getByText('Save Draft')).toBeTruthy();

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const draftButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some((s: any) => s?.backgroundColor === me.surface);
      });
      expect(draftButton).toBeTruthy();
    });

    it('Save Draft button has ink border styling', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const draftButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some(
          (s: any) => s?.borderWidth === 1.5 && s?.borderColor === me.ink
        );
      });
      expect(draftButton).toBeTruthy();
    });

    it('Save Draft button text has ink colour', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const draftText = getByText('Save Draft');
      const styles = Array.isArray(draftText.props.style)
        ? draftText.props.style.flat()
        : [draftText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: me.ink })])
      );
    });

    it('Save Draft button text has correct font weight', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const draftText = getByText('Save Draft');
      const styles = Array.isArray(draftText.props.style)
        ? draftText.props.style.flat()
        : [draftText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: '600' })])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Button Styling Tests - Send Quote (filled) Button
  // --------------------------------------------------------------------------

  describe('Button Styling - Send Quote Button', () => {
    it('Send Quote button renders with ink background', () => {
      const { getByText, UNSAFE_root } = render(
        <QuoteActions {...defaultProps} />
      );
      expect(getByText('Send Quote')).toBeTruthy();

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      const sendButton = touchables.find((t: any) => {
        const styles = Array.isArray(t?.props.style)
          ? t.props.style.flat()
          : [t?.props.style];
        return styles.some((s: any) => s?.backgroundColor === me.ink);
      });
      expect(sendButton).toBeTruthy();
    });

    it('Send Quote button text has on-brand colour', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendText = getByText('Send Quote');
      const styles = Array.isArray(sendText.props.style)
        ? sendText.props.style.flat()
        : [sendText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: me.onBrand })])
      );
    });

    it('Send Quote button text has correct font weight', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);
      const sendText = getByText('Send Quote');
      const styles = Array.isArray(sendText.props.style)
        ? sendText.props.style.flat()
        : [sendText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: '700' })])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('both buttons expose the button accessibility role', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      touchables.forEach((button: any) => {
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('exposes idle accessibility labels for both buttons', () => {
      const { getByLabelText } = render(<QuoteActions {...defaultProps} />);
      expect(getByLabelText('Save as draft')).toBeTruthy();
      expect(getByLabelText('Send quote to client')).toBeTruthy();
    });

    it('exposes loading accessibility labels when loading', () => {
      const { getByLabelText } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );
      expect(getByLabelText('Saving quote')).toBeTruthy();
      expect(getByLabelText('Sending quote')).toBeTruthy();
    });

    it('disabled buttons prevent interaction when loading', () => {
      const { UNSAFE_root } = render(
        <QuoteActions {...defaultProps} loading={true} />
      );

      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      touchables.forEach((button: any) => {
        expect(button.props.disabled).toBe(true);
      });

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
  });

  // --------------------------------------------------------------------------
  // Container Styling Tests
  // --------------------------------------------------------------------------

  describe('Container Styling', () => {
    it('renders button row container with row direction and gap 10', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const buttonRow = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) => style?.flexDirection === 'row' && style?.gap === 10
        );
      });
      expect(buttonRow).toBeTruthy();
    });

    it('renders two touchable buttons', () => {
      const { UNSAFE_root } = render(<QuoteActions {...defaultProps} />);
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBe(2);
    });

    it('maintains consistent layout structure across loading toggle', () => {
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
    it('complete workflow: save then send', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);

      fireEvent.press(getByText('Save Draft'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Send Quote'));
      expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
    });

    it('handles rapid sequential button presses', () => {
      const { getByText } = render(<QuoteActions {...defaultProps} />);

      fireEvent.press(getByText('Save Draft'));
      fireEvent.press(getByText('Send Quote'));

      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSend).toHaveBeenCalledTimes(1);
    });

    it('maintains consistent behavior across multiple renders', () => {
      const { rerender, getByText } = render(
        <QuoteActions {...defaultProps} loading={false} />
      );

      fireEvent.press(getByText('Save Draft'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);

      rerender(<QuoteActions {...defaultProps} loading={true} />);
      rerender(<QuoteActions {...defaultProps} loading={false} />);

      fireEvent.press(getByText('Save Draft'));
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

      fireEvent.press(getByText('Save Draft'));
      fireEvent.press(getByText('Send Quote'));

      expect(defaultProps.onSave).toHaveBeenCalled();
      expect(defaultProps.onSend).toHaveBeenCalled();
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
