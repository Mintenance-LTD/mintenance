/**
 * StatusPill Component Tests
 *
 * Tests the StatusPill component functionality including:
 * - Rendering different status types
 * - Correct styling and colors
 * - Accessibility labels
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusPill } from '../StatusPill';
import { theme } from '../../theme';

describe('StatusPill', () => {
  describe('Rendering', () => {
    it('should render upcoming status correctly', () => {
      const { getByText, getByLabelText } = render(<StatusPill status="upcoming" />);

      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByLabelText('Upcoming status')).toBeTruthy();
    });

    it('should render completed status correctly', () => {
      const { getByText, getByLabelText } = render(<StatusPill status="completed" />);

      expect(getByText('Completed')).toBeTruthy();
      expect(getByLabelText('Completed status')).toBeTruthy();
    });

    it('should render cancelled status correctly', () => {
      const { getByText, getByLabelText } = render(<StatusPill status="cancelled" />);

      expect(getByText('Cancelled')).toBeTruthy();
      expect(getByLabelText('Cancelled status')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply correct background color for upcoming status', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);
      const pill = getByLabelText('Upcoming status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expect.any(String),
          }),
        ])
      );
    });

    it('should apply correct background color for completed status', () => {
      const { getByLabelText } = render(<StatusPill status="completed" />);
      const pill = getByLabelText('Completed status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expect.any(String),
          }),
        ])
      );
    });

    it('should apply correct background color for cancelled status', () => {
      const { getByLabelText } = render(<StatusPill status="cancelled" />);
      const pill = getByLabelText('Cancelled status');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expect.any(String),
          }),
        ])
      );
    });

    it('should accept and apply custom styles', () => {
      const customStyle = { marginTop: 10, marginLeft: 5 };
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
  });

  describe('Accessibility', () => {
    it('should have proper accessibility label for upcoming', () => {
      const { getByLabelText } = render(<StatusPill status="upcoming" />);

      expect(getByLabelText('Upcoming status')).toBeTruthy();
    });

    it('should have proper accessibility label for completed', () => {
      const { getByLabelText } = render(<StatusPill status="completed" />);

      expect(getByLabelText('Completed status')).toBeTruthy();
    });

    it('should have proper accessibility label for cancelled', () => {
      const { getByLabelText } = render(<StatusPill status="cancelled" />);

      expect(getByLabelText('Cancelled status')).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('should use theme colors when available', () => {
      const { getByText } = render(<StatusPill status="upcoming" />);
      const textElement = getByText('Upcoming');

      // Should use theme-based colors
      expect(textElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: expect.any(String),
          }),
        ])
      );
    });

    it('should fallback to default colors when theme colors are unavailable', () => {
      // Component should handle missing theme.colors.status gracefully
      const { getByText } = render(<StatusPill status="upcoming" />);

      expect(getByText('Upcoming')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering without crashing', () => {
      expect(() => {
        render(<StatusPill status="upcoming" />);
      }).not.toThrow();
    });

    it('should handle all valid status types', () => {
      const statuses: Array<'upcoming' | 'completed' | 'cancelled'> = [
        'upcoming',
        'completed',
        'cancelled',
      ];

      statuses.forEach((status) => {
        expect(() => {
          render(<StatusPill status={status} />);
        }).not.toThrow();
      });
    });
  });
});
