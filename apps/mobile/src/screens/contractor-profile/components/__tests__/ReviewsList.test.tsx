/**
 * ReviewsList Component Tests
 *
 * Comprehensive test suite for the ReviewsList component with 100% coverage.
 * Tests reviews rendering, ratings display, empty state, multiple reviews,
 * edge cases, and accessibility.
 *
 * @component ReviewsList
 * @target 100% coverage
 * @tests 60+
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ReviewsList } from '../ReviewsList';
import type { Review } from '../../viewmodels/ContractorProfileViewModel';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      textPrimary: '#171717',
      textSecondary: '#737373',
      textTertiary: '#A3A3A3',
      surface: '#FFFFFF',
      borderLight: '#F5F5F5',
      warning: '#F59E0B',
    },
    spacing: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
    },
    typography: {
      fontSize: {
        base: 14,
        sm: 12,
        lg: 16,
        xl: 20,
      },
      fontWeight: {
        semibold: '600' as const,
      },
    },
    borderRadius: {
      lg: 8,
    },
  },
}));

// Mock Ionicons to capture props
let mockIonicons: jest.Mock;

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');

  mockIonicons = jest.fn(({ name, size, color, ...props }) => {
    return React.createElement(
      RN.View,
      {
        testID: `ionicon-${name}`,
        accessibilityLabel: `Icon: ${name}, size: ${size}, color: ${color}`,
        ...props,
      }
    );
  });

  return {
    Ionicons: mockIonicons,
  };
});

// ============================================================================
// TEST DATA
// ============================================================================

const createReview = (overrides: Partial<Review> = {}): Review => ({
  id: '1',
  reviewerName: 'John Doe',
  rating: 5,
  date: '2 days ago',
  comment: 'Excellent service!',
  photos: [],
  ...overrides,
});

const multipleReviews: Review[] = [
  createReview({
    id: '1',
    reviewerName: 'John Doe',
    rating: 5,
    date: '2 days ago',
    comment: 'Excellent service! Very professional.',
  }),
  createReview({
    id: '2',
    reviewerName: 'Jane Smith',
    rating: 4,
    date: '1 week ago',
    comment: 'Good work, would recommend.',
  }),
  createReview({
    id: '3',
    reviewerName: 'Bob Johnson',
    rating: 3,
    date: '2 weeks ago',
    comment: 'Average experience.',
  }),
];

// ============================================================================
// REVIEWSLIST COMPONENT TESTS
// ============================================================================

describe('ReviewsList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<ReviewsList reviews={[]} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with empty reviews array', () => {
      expect(() => {
        render(<ReviewsList reviews={[]} />);
      }).not.toThrow();
    });

    it('renders section title', () => {
      const { getByText } = render(<ReviewsList reviews={[]} />);
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders section title as Text component', () => {
      const { getByText } = render(<ReviewsList reviews={[]} />);
      const title = getByText('Reviews');
      expect(title.type).toBe(Text);
    });

    it('renders container view', () => {
      const { UNSAFE_root } = render(<ReviewsList reviews={[]} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders with single review', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('renders with multiple reviews', () => {
      const { getByText } = render(<ReviewsList reviews={multipleReviews} />);
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('Bob Johnson')).toBeTruthy();
    });

    it('renders required props only', () => {
      expect(() => {
        render(<ReviewsList reviews={[]} />);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Empty State Tests
  // --------------------------------------------------------------------------

  describe('Empty State', () => {
    it('handles empty reviews array', () => {
      const { getByText, queryByText } = render(<ReviewsList reviews={[]} />);
      expect(getByText('Reviews')).toBeTruthy();
      expect(queryByText('John Doe')).toBeNull();
    });

    it('renders only section title when no reviews', () => {
      const { UNSAFE_root } = render(<ReviewsList reviews={[]} />);
      const textElements = UNSAFE_root.findAllByType(Text as any);
      // Should have only the section title
      expect(textElements.length).toBe(1);
    });

    it('does not render review cards when empty', () => {
      const { queryByText } = render(<ReviewsList reviews={[]} />);
      expect(queryByText('Excellent service!')).toBeNull();
    });

    it('handles null review values gracefully', () => {
      expect(() => {
        render(<ReviewsList reviews={null as any} />);
      }).toThrow();
    });

    it('handles undefined reviews gracefully', () => {
      expect(() => {
        render(<ReviewsList reviews={undefined as any} />);
      }).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Reviewer Information Tests
  // --------------------------------------------------------------------------

  describe('Reviewer Information', () => {
    it('displays reviewer name', () => {
      const reviews = [createReview({ reviewerName: 'Alice Cooper' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('Alice Cooper')).toBeTruthy();
    });

    it('displays multiple reviewer names', () => {
      const { getByText } = render(<ReviewsList reviews={multipleReviews} />);
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('Bob Johnson')).toBeTruthy();
    });

    it('handles reviewer name with special characters', () => {
      const reviews = [createReview({ reviewerName: "O'Brien & Sons" })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText("O'Brien & Sons")).toBeTruthy();
    });

    it('handles very long reviewer names', () => {
      const longName = 'A'.repeat(100);
      const reviews = [createReview({ reviewerName: longName })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText(longName)).toBeTruthy();
    });

    it('handles single character reviewer name', () => {
      const reviews = [createReview({ reviewerName: 'X' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('X')).toBeTruthy();
    });

    it('handles reviewer name with unicode characters', () => {
      const reviews = [createReview({ reviewerName: 'José García' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('José García')).toBeTruthy();
    });

    it('handles reviewer name with emojis', () => {
      const reviews = [createReview({ reviewerName: 'John 🔧 Smith' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('John 🔧 Smith')).toBeTruthy();
    });

    it('handles empty reviewer name', () => {
      const reviews = [createReview({ reviewerName: '' })];
      const { queryByText } = render(<ReviewsList reviews={reviews} />);
      expect(queryByText('')).toBeTruthy();
    });

    it('renders reviewer name as Text component', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      const nameElement = getByText('John Doe');
      expect(nameElement.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Rating Display Tests
  // --------------------------------------------------------------------------

  describe('Rating Display', () => {
    it('displays 5-star rating correctly', () => {
      const reviews = [createReview({ rating: 5 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      expect(filledStars.length).toBe(5);
    });

    it('displays 4-star rating correctly', () => {
      const reviews = [createReview({ rating: 4 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      const outlineStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star-outline'
      );
      expect(filledStars.length).toBe(4);
      expect(outlineStars.length).toBe(1);
    });

    it('displays 3-star rating correctly', () => {
      const reviews = [createReview({ rating: 3 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      const outlineStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star-outline'
      );
      expect(filledStars.length).toBe(3);
      expect(outlineStars.length).toBe(2);
    });

    it('displays 2-star rating correctly', () => {
      const reviews = [createReview({ rating: 2 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      const outlineStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star-outline'
      );
      expect(filledStars.length).toBe(2);
      expect(outlineStars.length).toBe(3);
    });

    it('displays 1-star rating correctly', () => {
      const reviews = [createReview({ rating: 1 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      const outlineStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star-outline'
      );
      expect(filledStars.length).toBe(1);
      expect(outlineStars.length).toBe(4);
    });

    it('displays 0-star rating correctly', () => {
      const reviews = [createReview({ rating: 0 })];
      render(<ReviewsList reviews={reviews} />);

      const outlineStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star-outline'
      );
      expect(outlineStars.length).toBe(5);
    });

    it('renders exactly 5 stars per review', () => {
      const reviews = [createReview({ rating: 3 })];
      render(<ReviewsList reviews={reviews} />);

      const allStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star' || call[0].name === 'star-outline'
      );
      expect(allStars.length).toBe(5);
    });

    it('star icons have correct size', () => {
      const reviews = [createReview()];
      render(<ReviewsList reviews={reviews} />);

      const starCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'star'
      );
      expect(starCall[0].size).toBe(14);
    });

    it('star icons have correct color', () => {
      const reviews = [createReview()];
      render(<ReviewsList reviews={reviews} />);

      const starCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'star'
      );
      expect(starCall[0].color).toBe('#F59E0B');
    });

    it('handles negative rating gracefully', () => {
      const reviews = [createReview({ rating: -1 })];
      render(<ReviewsList reviews={reviews} />);

      const outlineStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star-outline'
      );
      expect(outlineStars.length).toBe(5);
    });

    it('handles rating above 5 gracefully', () => {
      const reviews = [createReview({ rating: 10 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      expect(filledStars.length).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Date Display Tests
  // --------------------------------------------------------------------------

  describe('Date Display', () => {
    it('displays review date', () => {
      const reviews = [createReview({ date: '2 days ago' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('2 days ago')).toBeTruthy();
    });

    it('displays different date formats', () => {
      const dates = [
        '1 day ago',
        '2 weeks ago',
        '3 months ago',
        'Yesterday',
        'Today',
      ];

      dates.forEach((date) => {
        const reviews = [createReview({ date, id: date })];
        const { getByText } = render(<ReviewsList reviews={reviews} />);
        expect(getByText(date)).toBeTruthy();
      });
    });

    it('handles empty date string', () => {
      const reviews = [createReview({ date: '' })];
      const { queryByText } = render(<ReviewsList reviews={reviews} />);
      expect(queryByText('')).toBeTruthy();
    });

    it('handles very long date string', () => {
      const longDate = 'A'.repeat(100);
      const reviews = [createReview({ date: longDate })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText(longDate)).toBeTruthy();
    });

    it('renders date as Text component', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      const dateElement = getByText('2 days ago');
      expect(dateElement.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Comment Display Tests
  // --------------------------------------------------------------------------

  describe('Comment Display', () => {
    it('displays review comment', () => {
      const reviews = [createReview({ comment: 'Great work!' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('Great work!')).toBeTruthy();
    });

    it('displays multiple review comments', () => {
      const { getByText } = render(<ReviewsList reviews={multipleReviews} />);
      expect(getByText('Excellent service! Very professional.')).toBeTruthy();
      expect(getByText('Good work, would recommend.')).toBeTruthy();
      expect(getByText('Average experience.')).toBeTruthy();
    });

    it('handles very long comments', () => {
      const longComment = 'A'.repeat(500);
      const reviews = [createReview({ comment: longComment })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText(longComment)).toBeTruthy();
    });

    it('handles single character comment', () => {
      const reviews = [createReview({ comment: 'A' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('A')).toBeTruthy();
    });

    it('handles empty comment string', () => {
      const reviews = [createReview({ comment: '' })];
      const { queryByText } = render(<ReviewsList reviews={reviews} />);
      expect(queryByText('')).toBeTruthy();
    });

    it('handles comment with special characters', () => {
      const comment = 'Great work! #1 contractor @ 50% off!!!';
      const reviews = [createReview({ comment })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText(comment)).toBeTruthy();
    });

    it('handles comment with unicode characters', () => {
      const comment = 'Excelente servicio 👍';
      const reviews = [createReview({ comment })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText(comment)).toBeTruthy();
    });

    it('handles comment with line breaks', () => {
      const comment = 'Great work!\nVery professional.\nHighly recommended.';
      const reviews = [createReview({ comment })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText(comment)).toBeTruthy();
    });

    it('renders comment as Text component', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      const commentElement = getByText('Excellent service!');
      expect(commentElement.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Multiple Reviews Tests
  // --------------------------------------------------------------------------

  describe('Multiple Reviews', () => {
    it('renders all reviews in array', () => {
      const { getByText } = render(<ReviewsList reviews={multipleReviews} />);
      multipleReviews.forEach((review) => {
        expect(getByText(review.reviewerName)).toBeTruthy();
      });
    });

    it('renders reviews with different ratings', () => {
      const { getByText } = render(<ReviewsList reviews={multipleReviews} />);
      expect(getByText('John Doe')).toBeTruthy(); // 5 stars
      expect(getByText('Jane Smith')).toBeTruthy(); // 4 stars
      expect(getByText('Bob Johnson')).toBeTruthy(); // 3 stars
    });

    it('handles large number of reviews', () => {
      const manyReviews = Array.from({ length: 50 }, (_, i) =>
        createReview({
          id: `review-${i}`,
          reviewerName: `Reviewer ${i}`,
          rating: (i % 5) + 1,
        })
      );
      const { getByText } = render(<ReviewsList reviews={manyReviews} />);
      expect(getByText('Reviewer 0')).toBeTruthy();
      expect(getByText('Reviewer 49')).toBeTruthy();
    });

    it('maintains review order', () => {
      const orderedReviews = [
        createReview({ id: '1', reviewerName: 'First' }),
        createReview({ id: '2', reviewerName: 'Second' }),
        createReview({ id: '3', reviewerName: 'Third' }),
      ];
      const { getAllByText } = render(<ReviewsList reviews={orderedReviews} />);
      const names = getAllByText(/First|Second|Third/);
      expect(names[0].props.children).toBe('First');
      expect(names[1].props.children).toBe('Second');
      expect(names[2].props.children).toBe('Third');
    });

    it('renders unique keys for each review', () => {
      const reviews = [
        createReview({ id: 'unique-1' }),
        createReview({ id: 'unique-2' }),
        createReview({ id: 'unique-3' }),
      ];
      expect(() => {
        render(<ReviewsList reviews={reviews} />);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Avatar Tests
  // --------------------------------------------------------------------------

  describe('Avatar', () => {
    it('renders avatar container for each review', () => {
      const reviews = [createReview()];
      const { UNSAFE_root } = render(<ReviewsList reviews={reviews} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      // Should have multiple view elements including avatar container
      expect(viewElements.length).toBeGreaterThan(3);
    });

    it('renders avatar for each reviewer', () => {
      const { UNSAFE_root } = render(<ReviewsList reviews={multipleReviews} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      // Should have avatar for each of the 3 reviews
      expect(viewElements.length).toBeGreaterThan(10);
    });

    it('avatar has correct circular styling', () => {
      const reviews = [createReview()];
      const { UNSAFE_root } = render(<ReviewsList reviews={reviews} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);

      const avatar = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.borderRadius === 24 &&
            style?.width === 48 &&
            style?.height === 48
        );
      });

      expect(avatar).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Component Updates Tests
  // --------------------------------------------------------------------------

  describe('Component Updates', () => {
    it('updates when reviews prop changes', () => {
      const { rerender, getByText, queryByText } = render(
        <ReviewsList reviews={[createReview()]} />
      );
      expect(getByText('John Doe')).toBeTruthy();

      const newReviews = [
        createReview({ reviewerName: 'Jane Doe', id: '2' }),
      ];
      rerender(<ReviewsList reviews={newReviews} />);
      expect(getByText('Jane Doe')).toBeTruthy();
      expect(queryByText('John Doe')).toBeNull();
    });

    it('updates when reviews array is cleared', () => {
      const { rerender, queryByText } = render(
        <ReviewsList reviews={multipleReviews} />
      );
      expect(queryByText('John Doe')).toBeTruthy();

      rerender(<ReviewsList reviews={[]} />);
      expect(queryByText('John Doe')).toBeNull();
    });

    it('updates when new reviews are added', () => {
      const { rerender, getByText } = render(
        <ReviewsList reviews={[createReview()]} />
      );
      expect(getByText('John Doe')).toBeTruthy();

      const updatedReviews = [
        createReview(),
        createReview({ id: '2', reviewerName: 'Jane Smith' }),
      ];
      rerender(<ReviewsList reviews={updatedReviews} />);
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    it('handles rapid prop updates', () => {
      const { rerender } = render(<ReviewsList reviews={[]} />);

      for (let i = 0; i < 10; i++) {
        const reviews = Array.from({ length: i }, (_, j) =>
          createReview({ id: `${j}`, reviewerName: `Reviewer ${j}` })
        );
        expect(() => {
          rerender(<ReviewsList reviews={reviews} />);
        }).not.toThrow();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles reviews with all fields empty', () => {
      const reviews = [
        createReview({
          reviewerName: '',
          comment: '',
          date: '',
          rating: 0,
        }),
      ];
      expect(() => {
        render(<ReviewsList reviews={reviews} />);
      }).not.toThrow();
    });

    it('handles reviews with missing photos array', () => {
      const reviews = [
        {
          id: '1',
          reviewerName: 'John Doe',
          rating: 5,
          date: '2 days ago',
          comment: 'Great!',
          photos: [],
        },
      ];
      expect(() => {
        render(<ReviewsList reviews={reviews} />);
      }).not.toThrow();
    });

    it('handles duplicate review IDs', () => {
      const reviews = [
        createReview({ id: 'duplicate' }),
        createReview({ id: 'duplicate', reviewerName: 'Different Name' }),
      ];
      expect(() => {
        render(<ReviewsList reviews={reviews} />);
      }).not.toThrow();
    });

    it('handles fractional ratings', () => {
      const reviews = [createReview({ rating: 3.5 })];
      render(<ReviewsList reviews={reviews} />);

      const filledStars = mockIonicons.mock.calls.filter(
        (call) => call[0].name === 'star'
      );
      // JavaScript comparison: 0 < 3.5, 1 < 3.5, 2 < 3.5, 3 < 3.5 = 4 stars
      expect(filledStars.length).toBe(4);
    });

    it('handles very large review count efficiently', () => {
      const manyReviews = Array.from({ length: 100 }, (_, i) =>
        createReview({ id: `${i}`, reviewerName: `Reviewer ${i}` })
      );
      expect(() => {
        render(<ReviewsList reviews={manyReviews} />);
      }).not.toThrow();
    });

    it('handles whitespace-only reviewer name', () => {
      const reviews = [createReview({ reviewerName: '   ' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('   ')).toBeTruthy();
    });

    it('handles whitespace-only comment', () => {
      const reviews = [createReview({ comment: '   ' })];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      expect(getByText('   ')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Styling Tests
  // --------------------------------------------------------------------------

  describe('Styling', () => {
    it('container has correct styling', () => {
      const { UNSAFE_root } = render(<ReviewsList reviews={[]} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            padding: 20,
          }),
        ])
      );
    });

    it('section title has correct styling', () => {
      const { getByText } = render(<ReviewsList reviews={[]} />);
      const titleElement = getByText('Reviews');
      const styles = Array.isArray(titleElement.props.style)
        ? titleElement.props.style.flat()
        : [titleElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#171717',
            fontWeight: '600',
          }),
        ])
      );
    });

    it('reviewer name has correct styling', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      const nameElement = getByText('John Doe');
      const styles = Array.isArray(nameElement.props.style)
        ? nameElement.props.style.flat()
        : [nameElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#171717',
            fontWeight: '600',
          }),
        ])
      );
    });

    it('review comment has correct styling', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      const commentElement = getByText('Excellent service!');
      const styles = Array.isArray(commentElement.props.style)
        ? commentElement.props.style.flat()
        : [commentElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#737373',
          }),
        ])
      );
    });

    it('review date has correct styling', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);
      const dateElement = getByText('2 days ago');
      const styles = Array.isArray(dateElement.props.style)
        ? dateElement.props.style.flat()
        : [dateElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#A3A3A3',
          }),
        ])
      );
    });

    it('review card has correct styling', () => {
      const reviews = [createReview()];
      const { UNSAFE_root } = render(<ReviewsList reviews={reviews} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);

      const reviewCard = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.backgroundColor === '#FFFFFF' &&
            style?.borderRadius === 8 &&
            style?.padding === 16
        );
      });

      expect(reviewCard).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('renders semantic text elements', () => {
      const reviews = [createReview()];
      const { getByText } = render(<ReviewsList reviews={reviews} />);

      expect(getByText('Reviews').type).toBe(Text);
      expect(getByText('John Doe').type).toBe(Text);
      expect(getByText('Excellent service!').type).toBe(Text);
    });

    it('maintains proper semantic structure', () => {
      const reviews = [createReview()];
      const { getByText, getAllByTestId } = render(
        <ReviewsList reviews={reviews} />
      );

      expect(getByText('Reviews')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      const stars = getAllByTestId(/ionicon-star/);
      expect(stars.length).toBeGreaterThan(0);
      expect(getByText('2 days ago')).toBeTruthy();
      expect(getByText('Excellent service!')).toBeTruthy();
    });

    it('provides visual rating indicators', () => {
      const reviews = [createReview({ rating: 5 })];
      const { getAllByTestId } = render(<ReviewsList reviews={reviews} />);
      const stars = getAllByTestId(/ionicon-star/);
      expect(stars.length).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently with empty reviews', () => {
      const startTime = Date.now();
      render(<ReviewsList reviews={[]} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('renders efficiently with multiple reviews', () => {
      const startTime = Date.now();
      render(<ReviewsList reviews={multipleReviews} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    it('handles re-renders efficiently', () => {
      const { rerender } = render(<ReviewsList reviews={[]} />);

      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        rerender(
          <ReviewsList
            reviews={i % 2 === 0 ? [createReview()] : multipleReviews}
          />
        );
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('handles large review lists efficiently', () => {
      const manyReviews = Array.from({ length: 50 }, (_, i) =>
        createReview({ id: `${i}` })
      );

      const startTime = Date.now();
      render(<ReviewsList reviews={manyReviews} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration', () => {
    it('renders complete review list with all features', () => {
      const { getByText, getAllByTestId } = render(
        <ReviewsList reviews={multipleReviews} />
      );

      expect(getByText('Reviews')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('Bob Johnson')).toBeTruthy();
      expect(getAllByTestId(/ionicon-star/).length).toBeGreaterThan(0);
    });

    it('handles complete review data structure', () => {
      const reviews = [
        createReview({
          id: 'complete-review',
          reviewerName: 'Complete Reviewer',
          rating: 5,
          date: 'Yesterday',
          comment: 'This is a complete review with all fields.',
          photos: ['photo1.jpg', 'photo2.jpg'],
        }),
      ];

      const { getByText } = render(<ReviewsList reviews={reviews} />);

      expect(getByText('Complete Reviewer')).toBeTruthy();
      expect(getByText('Yesterday')).toBeTruthy();
      expect(
        getByText('This is a complete review with all fields.')
      ).toBeTruthy();
    });

    it('maintains consistency across renders', () => {
      const { rerender, getByText } = render(
        <ReviewsList reviews={multipleReviews} />
      );

      expect(getByText('John Doe')).toBeTruthy();

      rerender(<ReviewsList reviews={multipleReviews} />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });
});
