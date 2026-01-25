/**
 * ProfileStats Component Tests
 *
 * Comprehensive test suite for the ProfileStats component
 * Target: 100% code coverage
 *
 * @component ProfileStats
 * @filesize ~1500 lines
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ProfileStats } from '../ProfileStats';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      textPrimary: '#171717',
      textSecondary: '#737373',
    },
    spacing: {
      xl: 16,
    },
    typography: {
      fontSize: {
        base: 14,
        '2xl': 24,
      },
      fontWeight: {
        semibold: '600' as const,
      },
    },
  },
}));

// ============================================================================
// TEST DATA
// ============================================================================

const defaultProps = {
  jobsCompleted: 42,
  rating: 4.8,
  reviewCount: 127,
};

const zeroProps = {
  jobsCompleted: 0,
  rating: 0,
  reviewCount: 0,
};

const maxProps = {
  jobsCompleted: 9999,
  rating: 5.0,
  reviewCount: 9999,
};

// ============================================================================
// PROFILESTATS COMPONENT TESTS
// ============================================================================

describe('ProfileStats Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with required props only', () => {
      expect(() => {
        render(<ProfileStats jobsCompleted={0} rating={0} reviewCount={0} />);
      }).not.toThrow();
    });

    it('renders container view', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders all three stat sections', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      // Container + 3 stat sections = 4 views
      expect(viewElements.length).toBeGreaterThanOrEqual(4);
    });

    it('renders all stat values as Text components', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const textElements = UNSAFE_root.findAllByType(Text as any);
      // 3 values + 3 labels = 6 text elements
      expect(textElements.length).toBe(6);
    });

    it('renders in correct order: Jobs, Rating, Reviews', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const textElements = UNSAFE_root.findAllByType(Text as any);
      const labels = textElements.filter(
        (el: any) =>
          el.props.children === 'Jobs' ||
          el.props.children === 'Rating' ||
          el.props.children === 'Reviews'
      );
      expect(labels[0].props.children).toBe('Jobs');
      expect(labels[1].props.children).toBe('Rating');
      expect(labels[2].props.children).toBe('Reviews');
    });

    it('renders stat values before labels', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const firstStat = viewElements[1]; // First stat section
      const textChildren = firstStat?.findAllByType(Text as any);
      // First text should be value (42), second should be label ('Jobs')
      expect(textChildren[0].props.children).toBe(42);
      expect(textChildren[1].props.children).toBe('Jobs');
    });
  });

  // --------------------------------------------------------------------------
  // Jobs Stat Tests
  // --------------------------------------------------------------------------

  describe('Jobs Stat', () => {
    it('renders jobs completed value', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('42')).toBeTruthy();
    });

    it('renders jobs label', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('Jobs')).toBeTruthy();
    });

    it('renders zero jobs', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
    });

    it('renders single digit jobs', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={5} rating={4.5} reviewCount={10} />
      );
      expect(getByText('5')).toBeTruthy();
    });

    it('renders double digit jobs', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={42} rating={4.5} reviewCount={10} />
      );
      expect(getByText('42')).toBeTruthy();
    });

    it('renders triple digit jobs', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={123} rating={4.5} reviewCount={10} />
      );
      expect(getByText('123')).toBeTruthy();
    });

    it('renders four digit jobs', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={1234} rating={4.5} reviewCount={10} />
      );
      expect(getByText('1234')).toBeTruthy();
    });

    it('renders maximum jobs value', () => {
      const { getByTestId } = render(<ProfileStats {...maxProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('9999');
    });

    it('renders very large jobs number', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={999999} rating={4.5} reviewCount={10} />
      );
      expect(getByText('999999')).toBeTruthy();
    });

    it('jobs value is a Text component', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const jobsValue = getByText('42');
      expect(jobsValue.type).toBe(Text);
    });

    it('jobs label is a Text component', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const jobsLabel = getByText('Jobs');
      expect(jobsLabel.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Rating Stat Tests
  // --------------------------------------------------------------------------

  describe('Rating Stat', () => {
    it('renders rating value', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('4.8')).toBeTruthy();
    });

    it('renders rating label', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('Rating')).toBeTruthy();
    });

    it('renders zero rating', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('rating-value')).toHaveTextContent('0');
    });

    it('renders perfect rating', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={5.0} reviewCount={10} />
      );
      expect(getByText('5')).toBeTruthy();
    });

    it('renders rating with one decimal place', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={10} />
      );
      expect(getByText('4.5')).toBeTruthy();
    });

    it('renders rating with two decimal places', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.75} reviewCount={10} />
      );
      expect(getByText('4.75')).toBeTruthy();
    });

    it('renders low rating', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={1.2} reviewCount={10} />
      );
      expect(getByText('1.2')).toBeTruthy();
    });

    it('renders mid-range rating', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={3.7} reviewCount={10} />
      );
      expect(getByText('3.7')).toBeTruthy();
    });

    it('renders high rating', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.9} reviewCount={10} />
      );
      expect(getByText('4.9')).toBeTruthy();
    });

    it('rating value is a Text component', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const ratingValue = getByText('4.8');
      expect(ratingValue.type).toBe(Text);
    });

    it('rating label is a Text component', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const ratingLabel = getByText('Rating');
      expect(ratingLabel.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Review Count Stat Tests
  // --------------------------------------------------------------------------

  describe('Review Count Stat', () => {
    it('renders review count value', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('127')).toBeTruthy();
    });

    it('renders reviews label', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders zero reviews', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('reviews-value')).toHaveTextContent('0');
    });

    it('renders single review', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={1} />
      );
      expect(getByText('1')).toBeTruthy();
    });

    it('renders single digit reviews', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={7} />
      );
      expect(getByText('7')).toBeTruthy();
    });

    it('renders double digit reviews', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={42} />
      );
      expect(getByText('42')).toBeTruthy();
    });

    it('renders triple digit reviews', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={127} />
      );
      expect(getByText('127')).toBeTruthy();
    });

    it('renders four digit reviews', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={1234} />
      );
      expect(getByText('1234')).toBeTruthy();
    });

    it('renders maximum reviews value', () => {
      const { getByTestId } = render(<ProfileStats {...maxProps} />);
      expect(getByTestId('reviews-value')).toHaveTextContent('9999');
    });

    it('renders very large review count', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={99999} />
      );
      expect(getByText('99999')).toBeTruthy();
    });

    it('review count value is a Text component', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const reviewValue = getByText('127');
      expect(reviewValue.type).toBe(Text);
    });

    it('reviews label is a Text component', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const reviewLabel = getByText('Reviews');
      expect(reviewLabel.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Styling Tests
  // --------------------------------------------------------------------------

  describe('Styling', () => {
    it('container has correct flexDirection', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('container has correct justifyContent', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'space-around',
          }),
        ])
      );
    });

    it('container has correct paddingVertical', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 16,
          }),
        ])
      );
    });

    it('stat sections have correct alignment', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const firstStat = viewElements[1]; // First stat section
      const styles = Array.isArray(firstStat?.props.style)
        ? firstStat.props.style.flat()
        : [firstStat?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
          }),
        ])
      );
    });

    it('stat values have correct fontSize', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const valueElement = getByText('42');
      const styles = Array.isArray(valueElement.props.style)
        ? valueElement.props.style.flat()
        : [valueElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 24,
          }),
        ])
      );
    });

    it('stat values have correct fontWeight', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const valueElement = getByText('42');
      const styles = Array.isArray(valueElement.props.style)
        ? valueElement.props.style.flat()
        : [valueElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontWeight: '600',
          }),
        ])
      );
    });

    it('stat values have correct color', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const valueElement = getByText('42');
      const styles = Array.isArray(valueElement.props.style)
        ? valueElement.props.style.flat()
        : [valueElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#171717',
          }),
        ])
      );
    });

    it('stat labels have correct fontSize', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const labelElement = getByText('Jobs');
      const styles = Array.isArray(labelElement.props.style)
        ? labelElement.props.style.flat()
        : [labelElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
          }),
        ])
      );
    });

    it('stat labels have correct color', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const labelElement = getByText('Jobs');
      const styles = Array.isArray(labelElement.props.style)
        ? labelElement.props.style.flat()
        : [labelElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#737373',
          }),
        ])
      );
    });

    it('stat labels have correct marginTop', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const labelElement = getByText('Jobs');
      const styles = Array.isArray(labelElement.props.style)
        ? labelElement.props.style.flat()
        : [labelElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginTop: 4,
          }),
        ])
      );
    });

    it('all stat values have consistent styling', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const values = ['42', '4.8', '127'];

      values.forEach((value) => {
        const element = getByText(value);
        const styles = Array.isArray(element.props.style)
          ? element.props.style.flat()
          : [element.props.style];

        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fontSize: 24,
              fontWeight: '600',
              color: '#171717',
            }),
          ])
        );
      });
    });

    it('all stat labels have consistent styling', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const labels = ['Jobs', 'Rating', 'Reviews'];

      labels.forEach((label) => {
        const element = getByText(label);
        const styles = Array.isArray(element.props.style)
          ? element.props.style.flat()
          : [element.props.style];

        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fontSize: 14,
              color: '#737373',
              marginTop: 4,
            }),
          ])
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Component Update Tests
  // --------------------------------------------------------------------------

  describe('Component Updates', () => {
    it('updates when jobsCompleted changes', () => {
      const { rerender, getByText, queryByText } = render(
        <ProfileStats {...defaultProps} />
      );
      expect(getByText('42')).toBeTruthy();

      rerender(
        <ProfileStats jobsCompleted={100} rating={4.8} reviewCount={127} />
      );
      expect(queryByText('42')).toBeNull();
      expect(getByText('100')).toBeTruthy();
    });

    it('updates when rating changes', () => {
      const { rerender, getByText, queryByText } = render(
        <ProfileStats {...defaultProps} />
      );
      expect(getByText('4.8')).toBeTruthy();

      rerender(
        <ProfileStats jobsCompleted={42} rating={5.0} reviewCount={127} />
      );
      expect(queryByText('4.8')).toBeNull();
      expect(getByText('5')).toBeTruthy();
    });

    it('updates when reviewCount changes', () => {
      const { rerender, getByText, queryByText } = render(
        <ProfileStats {...defaultProps} />
      );
      expect(getByText('127')).toBeTruthy();

      rerender(
        <ProfileStats jobsCompleted={42} rating={4.8} reviewCount={200} />
      );
      expect(queryByText('127')).toBeNull();
      expect(getByText('200')).toBeTruthy();
    });

    it('updates when all props change simultaneously', () => {
      const { rerender, getByText } = render(<ProfileStats {...defaultProps} />);

      rerender(<ProfileStats jobsCompleted={100} rating={5.0} reviewCount={250} />);

      expect(getByText('100')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('250')).toBeTruthy();
    });

    it('updates from zero to non-zero values', () => {
      const { rerender, getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');

      rerender(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('42');
      expect(getByTestId('rating-value')).toHaveTextContent('4.8');
      expect(getByTestId('reviews-value')).toHaveTextContent('127');
    });

    it('updates from non-zero to zero values', () => {
      const { rerender, getByTestId } = render(<ProfileStats {...defaultProps} />);

      rerender(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
    });

    it('updates multiple times correctly', () => {
      const { rerender, getByText } = render(<ProfileStats {...defaultProps} />);

      rerender(<ProfileStats jobsCompleted={50} rating={4.5} reviewCount={150} />);
      expect(getByText('50')).toBeTruthy();

      rerender(<ProfileStats jobsCompleted={75} rating={4.9} reviewCount={200} />);
      expect(getByText('75')).toBeTruthy();

      rerender(<ProfileStats jobsCompleted={100} rating={5.0} reviewCount={250} />);
      expect(getByText('100')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles negative jobs count', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={-5} rating={4.5} reviewCount={10} />
      );
      expect(getByText('-5')).toBeTruthy();
    });

    it('handles negative rating', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={-1} reviewCount={10} />
      );
      expect(getByText('-1')).toBeTruthy();
    });

    it('handles negative review count', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={-10} />
      );
      expect(getByText('-10')).toBeTruthy();
    });

    it('handles decimal jobs count', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={42.5} rating={4.5} reviewCount={10} />
      );
      expect(getByText('42.5')).toBeTruthy();
    });

    it('handles decimal review count', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={127.8} />
      );
      expect(getByText('127.8')).toBeTruthy();
    });

    it('handles very high rating above 5', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={10.0} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('10');
    });

    it('handles rating with many decimal places', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4.876543} reviewCount={10} />
      );
      expect(getByText('4.876543')).toBeTruthy();
    });

    it('handles extremely large numbers', () => {
      const { getByText } = render(
        <ProfileStats
          jobsCompleted={999999999}
          rating={4.5}
          reviewCount={888888888}
        />
      );
      expect(getByText('999999999')).toBeTruthy();
      expect(getByText('888888888')).toBeTruthy();
    });

    it('handles all zeros', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
      expect(getByTestId('rating-value')).toHaveTextContent('0');
      expect(getByTestId('reviews-value')).toHaveTextContent('0');
    });

    it('handles integer rating displayed without decimals', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={10} rating={4} reviewCount={10} />
      );
      expect(getByText('4')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Props Combination Tests
  // --------------------------------------------------------------------------

  describe('Props Combinations', () => {
    it('renders with minimum values', () => {
      const { getByText, getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders with maximum values', () => {
      const { getByText, getByTestId } = render(<ProfileStats {...maxProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('9999');
      expect(getByTestId('rating-value')).toHaveTextContent('5');
      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders with mixed small and large values', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={1} rating={5.0} reviewCount={9999} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('1');
      expect(getByTestId('rating-value')).toHaveTextContent('5');
      expect(getByTestId('reviews-value')).toHaveTextContent('9999');
    });

    it('renders with typical contractor stats', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={156} rating={4.7} reviewCount={243} />
      );
      expect(getByText('156')).toBeTruthy();
      expect(getByText('4.7')).toBeTruthy();
      expect(getByText('243')).toBeTruthy();
    });

    it('renders with new contractor stats', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={2} rating={5.0} reviewCount={2} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('2');
      expect(getByTestId('rating-value')).toHaveTextContent('5');
    });

    it('renders with experienced contractor stats', () => {
      const { getByText } = render(
        <ProfileStats jobsCompleted={500} rating={4.9} reviewCount={750} />
      );
      expect(getByText('500')).toBeTruthy();
      expect(getByText('4.9')).toBeTruthy();
      expect(getByText('750')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('renders complete stats section with all data', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);

      expect(getByText('42')).toBeTruthy();
      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('4.8')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('127')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('maintains structure across re-renders', () => {
      const { rerender, getByText } = render(<ProfileStats {...defaultProps} />);

      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();

      rerender(<ProfileStats jobsCompleted={100} rating={5.0} reviewCount={200} />);

      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('displays stats in consistent visual hierarchy', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);

      // Each stat section should contain exactly 2 text elements
      for (let i = 1; i <= 3; i++) {
        const statSection = viewElements[i];
        const textElements = statSection?.findAllByType(Text as any);
        expect(textElements.length).toBe(2);
      }
    });

    it('renders all labels even with zero values', () => {
      const { getByText } = render(<ProfileStats {...zeroProps} />);
      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now();
      render(<ProfileStats {...defaultProps} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles re-renders efficiently', () => {
      const { rerender } = render(<ProfileStats {...defaultProps} />);

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        rerender(
          <ProfileStats jobsCompleted={i} rating={i % 5} reviewCount={i * 2} />
        );
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('renders with minimal DOM elements', () => {
      const { UNSAFE_root } = render(<ProfileStats {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const textElements = UNSAFE_root.findAllByType(Text as any);

      // Should have exactly 4 views (container + 3 stats) and 6 texts (3 values + 3 labels)
      expect(viewElements.length).toBe(4);
      expect(textElements.length).toBe(6);
    });
  });

  // --------------------------------------------------------------------------
  // Type Safety Tests
  // --------------------------------------------------------------------------

  describe('Type Safety', () => {
    it('accepts all required props', () => {
      expect(() => {
        render(<ProfileStats jobsCompleted={42} rating={4.8} reviewCount={127} />);
      }).not.toThrow();
    });

    it('accepts number type for jobsCompleted', () => {
      expect(() => {
        render(<ProfileStats jobsCompleted={0} rating={0} reviewCount={0} />);
      }).not.toThrow();
    });

    it('accepts number type for rating', () => {
      expect(() => {
        render(<ProfileStats jobsCompleted={0} rating={4.5} reviewCount={0} />);
      }).not.toThrow();
    });

    it('accepts number type for reviewCount', () => {
      expect(() => {
        render(<ProfileStats jobsCompleted={0} rating={0} reviewCount={100} />);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('renders semantic text elements for values', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);

      const jobsValue = getByText('42');
      const ratingValue = getByText('4.8');
      const reviewsValue = getByText('127');

      expect(jobsValue.type).toBe(Text);
      expect(ratingValue.type).toBe(Text);
      expect(reviewsValue.type).toBe(Text);
    });

    it('renders semantic text elements for labels', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);

      const jobsLabel = getByText('Jobs');
      const ratingLabel = getByText('Rating');
      const reviewsLabel = getByText('Reviews');

      expect(jobsLabel.type).toBe(Text);
      expect(ratingLabel.type).toBe(Text);
      expect(reviewsLabel.type).toBe(Text);
    });

    it('maintains proper semantic structure', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);

      // All stats should be present and accessible
      expect(getByText('42')).toBeTruthy();
      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('4.8')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('127')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('uses clear, descriptive labels', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);

      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Snapshot Tests
  // --------------------------------------------------------------------------

  describe('Snapshot Stability', () => {
    it('renders consistently with typical values', () => {
      const { toJSON } = render(<ProfileStats {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders consistently with zero values', () => {
      const { toJSON } = render(<ProfileStats {...zeroProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders consistently with maximum values', () => {
      const { toJSON } = render(<ProfileStats {...maxProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders consistently with different value combinations', () => {
      const { toJSON } = render(
        <ProfileStats jobsCompleted={156} rating={4.7} reviewCount={243} />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
