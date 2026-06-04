/**
 * ProfileStats Component Tests
 *
 * Realigned 2026-06-04 to the Mint Editorial redesign of ProfileStats:
 *  - Three "impact" stat cards (Jobs Done / Rating with stars / Reviews).
 *  - Values exposed via testIDs jobs-value / rating-value / reviews-value.
 *  - Rating shows `rating.toFixed(1)` when > 0, otherwise an em-dash '—'.
 *  - Tokens come from design-system/mint-editorial (`me`): ink #1A2520,
 *    ink2 #4A5751, statValue fontSize 22 / fontWeight 800.
 *  - Icons (briefcase / star / chatbubbles) render as Text nodes via the
 *    global @expo/vector-icons mock, so Text-count assertions account for them.
 *
 * @component ProfileStats
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ProfileStats } from '../ProfileStats';
import { me } from '../../../../design-system/mint-editorial';

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

    it('renders the container view', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('profile-stats-container')).toBeTruthy();
    });

    it('renders all three stat cards', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-stat')).toBeTruthy();
      expect(getByTestId('rating-stat')).toBeTruthy();
      expect(getByTestId('reviews-stat')).toBeTruthy();
    });

    it('renders all three stat values', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-value')).toBeTruthy();
      expect(getByTestId('rating-value')).toBeTruthy();
      expect(getByTestId('reviews-value')).toBeTruthy();
    });

    it('renders stat cards in order: Jobs, Rating, Reviews', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const container = getByTestId('profile-stats-container');
      const cardTestIds = container.children
        .map((child: any) => child?.props?.testID)
        .filter(Boolean);
      expect(cardTestIds).toEqual(['jobs-stat', 'rating-stat', 'reviews-stat']);
    });

    it('renders the Jobs Done label', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('Jobs Done')).toBeTruthy();
    });

    it('renders the Reviews label', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      expect(getByText('Reviews')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Jobs Stat Tests
  // --------------------------------------------------------------------------

  describe('Jobs Stat', () => {
    it('renders jobs completed value', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('42');
    });

    it('renders zero jobs', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
    });

    it('renders single digit jobs', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={5} rating={4.5} reviewCount={10} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('5');
    });

    it('renders triple digit jobs', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={123} rating={4.5} reviewCount={10} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('123');
    });

    it('renders maximum jobs value', () => {
      const { getByTestId } = render(<ProfileStats {...maxProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('9999');
    });

    it('renders very large jobs number', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={999999} rating={4.5} reviewCount={10} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('999999');
    });

    it('jobs value is a Text component', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-value').type).toBe(Text);
    });

    it('jobs card exposes an accessibility label', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-stat').props.accessibilityLabel).toBe(
        '42 jobs completed'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Rating Stat Tests
  // --------------------------------------------------------------------------

  describe('Rating Stat', () => {
    it('renders rating value with one decimal place', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('rating-value')).toHaveTextContent('4.8');
    });

    it('renders an em-dash for a zero rating', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('rating-value')).toHaveTextContent('—');
    });

    it('renders perfect rating as 5.0', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={5.0} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('5.0');
    });

    it('rounds a two-decimal rating to one decimal place', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={4.75} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('4.8');
    });

    it('renders an integer rating with a trailing .0', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={4} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('4.0');
    });

    it('rating value is a Text component', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('rating-value').type).toBe(Text);
    });

    it('rating card exposes an accessibility label', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('rating-stat').props.accessibilityLabel).toBe(
        'Rating: 4.8 out of 5'
      );
    });

    it('renders five star icons in the rating card', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const ratingStat = getByTestId('rating-stat');
      const icons = ratingStat
        .findAllByType(Text as any)
        .filter(
          (el: any) =>
            el.props.size === 10 &&
            ['star', 'star-half', 'star-outline'].includes(el.props.children)
        );
      expect(icons.length).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Review Count Stat Tests
  // --------------------------------------------------------------------------

  describe('Review Count Stat', () => {
    it('renders review count value', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('reviews-value')).toHaveTextContent('127');
    });

    it('renders zero reviews', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('reviews-value')).toHaveTextContent('0');
    });

    it('renders single review', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={1} />
      );
      expect(getByTestId('reviews-value')).toHaveTextContent('1');
    });

    it('renders maximum reviews value', () => {
      const { getByTestId } = render(<ProfileStats {...maxProps} />);
      expect(getByTestId('reviews-value')).toHaveTextContent('9999');
    });

    it('renders very large review count', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={99999} />
      );
      expect(getByTestId('reviews-value')).toHaveTextContent('99999');
    });

    it('review count value is a Text component', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('reviews-value').type).toBe(Text);
    });

    it('reviews card exposes an accessibility label', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('reviews-stat').props.accessibilityLabel).toBe(
        '127 reviews'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Styling Tests
  // --------------------------------------------------------------------------

  const flatStyle = (el: any) =>
    Array.isArray(el?.props.style) ? el.props.style.flat() : [el?.props.style];

  describe('Styling', () => {
    it('container is laid out as a row', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByTestId('profile-stats-container'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flexDirection: 'row' }),
        ])
      );
    });

    it('container has horizontal padding and a gap', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByTestId('profile-stats-container'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ paddingHorizontal: 16, gap: 10 }),
        ])
      );
    });

    it('stat cards are center-aligned', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByTestId('jobs-stat'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ alignItems: 'center' }),
        ])
      );
    });

    it('stat values use the redesigned fontSize', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByTestId('jobs-value'));
      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 22 })])
      );
    });

    it('stat values use the redesigned fontWeight', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByTestId('jobs-value'));
      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontWeight: '800' })])
      );
    });

    it('stat values use the ink token color', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByTestId('jobs-value'));
      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: me.ink })])
      );
    });

    it('all stat values share consistent styling', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      ['jobs-value', 'rating-value', 'reviews-value'].forEach((id) => {
        const styles = flatStyle(getByTestId(id));
        expect(styles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fontSize: 22,
              fontWeight: '800',
              color: me.ink,
            }),
          ])
        );
      });
    });

    it('stat labels use the ink2 token color', () => {
      const { getByText } = render(<ProfileStats {...defaultProps} />);
      const styles = flatStyle(getByText('Jobs Done'));
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: me.ink2, fontSize: 12 }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Component Update Tests
  // --------------------------------------------------------------------------

  describe('Component Updates', () => {
    it('updates when jobsCompleted changes', () => {
      const { rerender, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('42');

      rerender(
        <ProfileStats jobsCompleted={100} rating={4.8} reviewCount={127} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('100');
    });

    it('updates when rating changes', () => {
      const { rerender, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('4.8');

      rerender(
        <ProfileStats jobsCompleted={42} rating={5.0} reviewCount={127} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('5.0');
    });

    it('updates when reviewCount changes', () => {
      const { rerender, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );
      expect(getByTestId('reviews-value')).toHaveTextContent('127');

      rerender(
        <ProfileStats jobsCompleted={42} rating={4.8} reviewCount={200} />
      );
      expect(getByTestId('reviews-value')).toHaveTextContent('200');
    });

    it('updates when all props change simultaneously', () => {
      const { rerender, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );

      rerender(
        <ProfileStats jobsCompleted={100} rating={5.0} reviewCount={250} />
      );

      expect(getByTestId('jobs-value')).toHaveTextContent('100');
      expect(getByTestId('rating-value')).toHaveTextContent('5.0');
      expect(getByTestId('reviews-value')).toHaveTextContent('250');
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
      const { rerender, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );

      rerender(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
      expect(getByTestId('rating-value')).toHaveTextContent('—');
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles negative jobs count', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={-5} rating={4.5} reviewCount={10} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('-5');
    });

    it('treats a negative rating as no rating (em-dash)', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={-1} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('—');
    });

    it('handles negative review count', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={4.5} reviewCount={-10} />
      );
      expect(getByTestId('reviews-value')).toHaveTextContent('-10');
    });

    it('renders a rating above 5 to one decimal place', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={10.0} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('10.0');
    });

    it('rounds a many-decimal rating to one decimal place', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={10} rating={4.876543} reviewCount={10} />
      );
      expect(getByTestId('rating-value')).toHaveTextContent('4.9');
    });

    it('handles extremely large numbers', () => {
      const { getByTestId } = render(
        <ProfileStats
          jobsCompleted={999999999}
          rating={4.5}
          reviewCount={888888888}
        />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('999999999');
      expect(getByTestId('reviews-value')).toHaveTextContent('888888888');
    });

    it('handles all zeros', () => {
      const { getByTestId } = render(<ProfileStats {...zeroProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
      expect(getByTestId('rating-value')).toHaveTextContent('—');
      expect(getByTestId('reviews-value')).toHaveTextContent('0');
    });
  });

  // --------------------------------------------------------------------------
  // Props Combination Tests
  // --------------------------------------------------------------------------

  describe('Props Combinations', () => {
    it('renders with minimum values', () => {
      const { getByText, getByTestId } = render(
        <ProfileStats {...zeroProps} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('0');
      expect(getByText('Jobs Done')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders with maximum values', () => {
      const { getByText, getByTestId } = render(<ProfileStats {...maxProps} />);
      expect(getByTestId('jobs-value')).toHaveTextContent('9999');
      expect(getByTestId('rating-value')).toHaveTextContent('5.0');
      expect(getByText('Jobs Done')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders with typical contractor stats', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={156} rating={4.7} reviewCount={243} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('156');
      expect(getByTestId('rating-value')).toHaveTextContent('4.7');
      expect(getByTestId('reviews-value')).toHaveTextContent('243');
    });

    it('renders with new contractor stats', () => {
      const { getByTestId } = render(
        <ProfileStats jobsCompleted={2} rating={5.0} reviewCount={2} />
      );
      expect(getByTestId('jobs-value')).toHaveTextContent('2');
      expect(getByTestId('rating-value')).toHaveTextContent('5.0');
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('renders complete stats section with all data', () => {
      const { getByText, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );

      expect(getByTestId('jobs-value')).toHaveTextContent('42');
      expect(getByText('Jobs Done')).toBeTruthy();
      expect(getByTestId('rating-value')).toHaveTextContent('4.8');
      expect(getByTestId('reviews-value')).toHaveTextContent('127');
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('maintains structure across re-renders', () => {
      const { rerender, getByText, getByTestId } = render(
        <ProfileStats {...defaultProps} />
      );

      expect(getByText('Jobs Done')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();

      rerender(
        <ProfileStats jobsCompleted={100} rating={5.0} reviewCount={200} />
      );

      expect(getByText('Jobs Done')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
      expect(getByTestId('jobs-value')).toHaveTextContent('100');
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

      expect(endTime - startTime).toBeLessThan(1000);
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

      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  // --------------------------------------------------------------------------
  // Type Safety Tests
  // --------------------------------------------------------------------------

  describe('Type Safety', () => {
    it('accepts all required props', () => {
      expect(() => {
        render(
          <ProfileStats jobsCompleted={42} rating={4.8} reviewCount={127} />
        );
      }).not.toThrow();
    });

    it('accepts number type for rating', () => {
      expect(() => {
        render(<ProfileStats jobsCompleted={0} rating={4.5} reviewCount={0} />);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('renders semantic text elements for values', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-value').type).toBe(Text);
      expect(getByTestId('rating-value').type).toBe(Text);
      expect(getByTestId('reviews-value').type).toBe(Text);
    });

    it('exposes descriptive accessibility labels on each card', () => {
      const { getByTestId } = render(<ProfileStats {...defaultProps} />);
      expect(getByTestId('jobs-stat').props.accessibilityLabel).toBe(
        '42 jobs completed'
      );
      expect(getByTestId('rating-stat').props.accessibilityLabel).toBe(
        'Rating: 4.8 out of 5'
      );
      expect(getByTestId('reviews-stat').props.accessibilityLabel).toBe(
        '127 reviews'
      );
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
  });
});
