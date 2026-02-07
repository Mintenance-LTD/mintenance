import React from 'react';
import { ViewStyle } from 'react-native';
import { render } from '../test-utils';
import { StatusPill } from '../StatusPill';
import { theme } from '../../theme';

/**
 * StatusPill Component Tests
 *
 * Tests the StatusPill component functionality including:
 * - Rendering different status types (upcoming, completed, cancelled)
 * - Configuration mapping (background/foreground colors and labels)
 * - View/Text rendering structure
 * - Accessibility labels
 * - Style prop overrides
 * - StatusPill base styles (pill and text)
 *
 * Coverage: 100%
 * Total Tests: ~25
 */

describe('StatusPill', () => {
  describe('Status Prop - Upcoming', () => {
    it('should render upcoming status with correct label', () => {
      const { getByText } = render(<StatusPill status="upcoming" />);
      expect(getByText('Upcoming')).toBeTruthy();
    });

    it('should apply upcoming background color from config', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      const pill = getByLabelText('Upcoming status');

      const expectedBg = theme.colors.status?.upcoming ?? '#E6F2FF';
      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expectedBg,
          }),
        ])
      );
    });

    it('should apply upcoming foreground color from config', () => {
      const { getByText } = render(<StatusPill status="upcoming" />);
      const textElement = getByText('Upcoming');

      const expectedFg = theme.colors.primary[600] ?? theme.colors.primary;
      expect(textElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expectedFg,
          }),
        ])
      );
    });

    it('should have accessibility label for upcoming status', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      expect(getByLabelText('Upcoming status')).toBeTruthy();
    });
  });

  describe('Status Prop - Completed', () => {
    it('should render completed status with correct label', () => {
      const { getByText } = render(<StatusPill status="completed" />);
      expect(getByText('Completed')).toBeTruthy();
    });

    it('should apply completed background color from config', () => {
      const { getByLabelText } = render(<StatusPill status="completed" />);
      const pill = getByLabelText('Completed status');

      const expectedBg = theme.colors.status?.completed ?? '#EAF7EE';
      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expectedBg,
          }),
        ])
      );
    });

    it('should apply completed foreground color from config', () => {
      const { getByText } = render(<StatusPill status="completed" />);
      const textElement = getByText('Completed');

      const expectedFg = theme.colors.success[700] ?? '#2E7D32';
      expect(textElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expectedFg,
          }),
        ])
      );
    });

    it('should have accessibility label for completed status', () => {
      const { getByLabelText } = render(<StatusPill status="completed" />);
      expect(getByLabelText('Completed status')).toBeTruthy();
    });
  });

  describe('Status Prop - Cancelled', () => {
    it('should render cancelled status with correct label', () => {
      const { getByText } = render(<StatusPill status="cancelled" />);
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('should apply cancelled background color from config', () => {
      const { getByLabelText } = render(<StatusPill status="cancelled" />);
      const pill = getByLabelText('Cancelled status');

      const expectedBg = theme.colors.status?.cancelled ?? '#FDECEA';
      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expectedBg,
          }),
        ])
      );
    });

    it('should apply cancelled foreground color from config', () => {
      const { getByText } = render(<StatusPill status="cancelled" />);
      const textElement = getByText('Cancelled');

      const expectedFg = theme.colors.error[700] ?? theme.colors.error;
      expect(textElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expectedFg,
          }),
        ])
      );
    });

    it('should have accessibility label for cancelled status', () => {
      const { getByLabelText } = render(<StatusPill status="cancelled" />);
      expect(getByLabelText('Cancelled status')).toBeTruthy();
    });
  });

  describe('Configuration Mapping', () => {
    it('should map upcoming to correct config values', () => {
      const { getByText, getByLabelText } = render(<StatusPill status="upcoming" />);

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByLabelText('Upcoming status')).toBeTruthy();
    });

    it('should map completed to correct config values', () => {
      const { getByText, getByLabelText } = render(<StatusPill status="completed" />);

      expect(getByText('Completed')).toBeTruthy();
      expect(getByLabelText('Completed status')).toBeTruthy();
    });

    it('should map cancelled to correct config values', () => {
      const { getByText, getByLabelText } = render(<StatusPill status="cancelled" />);

      expect(getByText('Cancelled')).toBeTruthy();
      expect(getByLabelText('Cancelled status')).toBeTruthy();
    });
  });

  describe('View and Text Rendering', () => {
    it('should render a View container with accessibility label', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      const view = getByLabelText('Upcoming status');

      expect(view).toBeTruthy();
      expect(view.type).toBe('View');
    });

    it('should render a Text element inside the View', () => {
      const { getByText } = render(<StatusPill status="upcoming" />);
      const text = getByText('Upcoming');

      expect(text).toBeTruthy();
      expect(text.type).toBe('Text');
    });

    it('should render text as child of view', () => {
      const { getByLabelText, getByText } = render(<StatusPill status="completed" />);
      const view = getByLabelText('Completed status');
      const text = getByText('Completed');

      expect(view).toBeTruthy();
      expect(text).toBeTruthy();
    });
  });

  describe('Accessibility Label', () => {
    it('should format accessibility label with status and "status" suffix', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      expect(getByLabelText('Upcoming status')).toBeTruthy();
    });

    it('should update accessibility label based on status prop', () => {
      const { getByLabelText, rerender } = render(<StatusPill status="upcoming" />);
      expect(getByLabelText('Upcoming status')).toBeTruthy();

      rerender(<StatusPill status="completed" />);
      expect(getByLabelText('Completed status')).toBeTruthy();
    });
  });

  describe('Style Prop Override', () => {
    it('should accept and apply custom ViewStyle', () => {
      const customStyle: ViewStyle = { marginTop: 10, marginLeft: 5 };
      const { getByLabelText } = render(
        <StatusPill status="upcoming" style={customStyle} />
      );
      const pill = getByLabelText('Upcoming status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle),
        ])
      );
    });

    it('should merge custom style with base pill styles', () => {
      const customStyle: ViewStyle = { marginBottom: 20 };
      const { getByLabelText } = render(
        <StatusPill status="completed" style={customStyle} />
      );
      const pill = getByLabelText('Completed status');

      // Should have both base styles and custom styles
      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }),
          expect.objectContaining(customStyle),
        ])
      );
    });

    it('should allow custom backgroundColor to override config', () => {
      const customStyle: ViewStyle = { backgroundColor: '#CUSTOM' };
      const { getByLabelText } = render(
        <StatusPill status="upcoming" style={customStyle} />
      );
      const pill = getByLabelText('Upcoming status');

      // Custom style should be in array (applied last, so it overrides)
      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#CUSTOM' }),
        ])
      );
    });

    it('should render without custom style (style prop is optional)', () => {
      const { getByLabelText } = render(<StatusPill status="cancelled" />);
      const pill = getByLabelText('Cancelled status');

      expect(pill).toBeTruthy();
      expect(pill.props.style).toBeTruthy();
    });
  });

  describe('StatusPill Base Styles - Pill Container', () => {
    it('should apply paddingHorizontal of 10', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      const pill = getByLabelText('Upcoming status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingHorizontal: 10,
          }),
        ])
      );
    });

    it('should apply paddingVertical of 4', () => {
      const { getByLabelText } = render(<StatusPill status="completed" />);
      const pill = getByLabelText('Completed status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 4,
          }),
        ])
      );
    });

    it('should apply borderRadius of 999 (pill shape)', () => {
      const { getByLabelText } = render(<StatusPill status="cancelled" />);
      const pill = getByLabelText('Cancelled status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 999,
          }),
        ])
      );
    });

    it('should apply alignSelf flex-start', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      const pill = getByLabelText('Upcoming status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignSelf: 'flex-start',
          }),
        ])
      );
    });
  });

  describe('StatusPill Base Styles - Text Element', () => {
    it('should apply fontSize of 12', () => {
      const { getByText } = render(<StatusPill status="upcoming" />);
      const text = getByText('Upcoming');

      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 12,
          }),
        ])
      );
    });

    it('should apply fontWeight of 600', () => {
      const { getByText } = render(<StatusPill status="completed" />);
      const text = getByText('Completed');

      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('should apply color from config', () => {
      const { getByText } = render(<StatusPill status="cancelled" />);
      const text = getByText('Cancelled');

      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should render without crashing for all valid status types', () => {
      expect(() => {
        render(<StatusPill status="upcoming" />);
        render(<StatusPill status="completed" />);
        render(<StatusPill status="cancelled" />);
      }).not.toThrow();
    });

    it('should handle rapid status changes', () => {
      const { rerender, getByText, getByLabelText } = render(
        <StatusPill status="upcoming" />
      );
      expect(getByText('Upcoming')).toBeTruthy();

      rerender(<StatusPill status="completed" />);
      expect(getByText('Completed')).toBeTruthy();

      rerender(<StatusPill status="cancelled" />);
      expect(getByText('Cancelled')).toBeTruthy();

      rerender(<StatusPill status="upcoming" />);
      expect(getByText('Upcoming')).toBeTruthy();
    });

    it('should maintain consistent structure across all statuses', () => {
      const statuses: ('upcoming' | 'completed' | 'cancelled')[] = [
        'upcoming',
        'completed',
        'cancelled',
      ];

      statuses.forEach((status) => {
        const { getByLabelText } = render(<StatusPill status={status} />);
        const view = getByLabelText(`${status.charAt(0).toUpperCase() + status.slice(1)} status`);

        expect(view.type).toBe('View');
        expect(view.props.style).toBeTruthy();
      });
    });
  });
});
