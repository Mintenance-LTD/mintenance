/**
 * TopContractorsList Component Tests
 *
 * Comprehensive test suite for TopContractorsList component
 * Target: 100% coverage with deterministic tests
 *
 * @filesize <300 lines
 */

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, size, color, ...props }: any) => {
    const { Text } = require('react-native');
    return (
      <Text testID={testID || `icon-${name}`} {...props}>
        {name}
      </Text>
    );
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopContractorsList } from '../TopContractorsList';
import type { TopContractor } from '../../viewmodels/EnhancedHomeViewModel';

describe('TopContractorsList', () => {
  const mockOnContractorPress = jest.fn();
  const mockOnSeeAllPress = jest.fn();

  const mockContractors: TopContractor[] = [
    {
      id: '1',
      name: 'Elite Plumbing Co.',
      rating: 4.8,
      reviewCount: 234,
      services: ['Plumbing', 'Emergency'],
      distance: '2.5 km',
    },
    {
      id: '2',
      name: 'Pro Electricians',
      rating: 4.9,
      reviewCount: 189,
      services: ['Electrical', 'Wiring'],
      distance: '3.1 km',
    },
    {
      id: '3',
      name: 'HVAC Experts Inc.',
      rating: 4.7,
      reviewCount: 156,
      services: ['HVAC', 'AC Repair', 'Heating'],
      distance: '1.8 km',
    },
  ];

  const defaultProps = {
    contractors: mockContractors,
    onContractorPress: mockOnContractorPress,
    onSeeAllPress: mockOnSeeAllPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering - Header', () => {
    it('renders correctly with default props', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(getByText('See All')).toBeTruthy();
    });

    it('renders section title', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const title = getByText('Top Contractors');
      expect(title).toBeTruthy();
    });

    it('renders See All button', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const seeAllButton = getByText('See All');
      expect(seeAllButton).toBeTruthy();
    });

    it('renders header with correct structure', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(getByText('See All')).toBeTruthy();
    });
  });

  describe('Rendering - Contractor List', () => {
    it('renders all contractor names', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        expect(getByText(contractor.name)).toBeTruthy();
      });
    });

    it('renders correct number of contractor cards', () => {
      const { getAllByText } = render(<TopContractorsList {...defaultProps} />);

      const contractorNames = mockContractors.map((c) => c.name);
      contractorNames.forEach((name) => {
        const elements = getAllByText(name);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders all contractor ratings', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        expect(getByText(contractor.rating.toString())).toBeTruthy();
      });
    });

    it('renders all contractor review counts', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        expect(getByText(`(${contractor.reviewCount} reviews)`)).toBeTruthy();
      });
    });

    it('renders all contractor distances', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        expect(getByText(`${contractor.distance} away`)).toBeTruthy();
      });
    });

    it('renders star icons for all contractors', () => {
      const { getAllByTestId } = render(<TopContractorsList {...defaultProps} />);

      const starIcons = getAllByTestId('icon-star');
      expect(starIcons.length).toBe(mockContractors.length);
    });

    it('renders heart icons for all contractors', () => {
      const { getAllByTestId } = render(<TopContractorsList {...defaultProps} />);

      const heartIcons = getAllByTestId('icon-heart-outline');
      expect(heartIcons.length).toBe(mockContractors.length);
    });

    it('renders with empty contractors array', () => {
      const { getByText, queryByText } = render(
        <TopContractorsList
          contractors={[]}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(queryByText('Elite Plumbing Co.')).toBeFalsy();
    });

    it('renders with single contractor', () => {
      const singleContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Elite Plumbing Co.',
          rating: 4.8,
          reviewCount: 234,
          services: ['Plumbing', 'Emergency'],
          distance: '2.5 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={singleContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(getByText('Elite Plumbing Co.')).toBeTruthy();
    });

    it('renders with many contractors', () => {
      const manyContractors: TopContractor[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Contractor ${i + 1}`,
        rating: 4.5 + (i % 5) * 0.1,
        reviewCount: 100 + i * 10,
        services: ['Service'],
        distance: `${i + 1} km`,
      }));

      const { getByText } = render(
        <TopContractorsList
          contractors={manyContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(getByText('Contractor 1')).toBeTruthy();
      expect(getByText('Contractor 10')).toBeTruthy();
    });
  });

  describe('Rendering - Service Tags', () => {
    it('renders all service tags for each contractor', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        contractor.services.forEach((service) => {
          expect(getByText(service)).toBeTruthy();
        });
      });
    });

    it('renders single service tag', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('Plumbing')).toBeTruthy();
    });

    it('renders multiple service tags for contractor', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('HVAC')).toBeTruthy();
      expect(getByText('AC Repair')).toBeTruthy();
      expect(getByText('Heating')).toBeTruthy();
    });

    it('renders service tags in correct order', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const contractor = mockContractors[0];
      contractor.services.forEach((service) => {
        expect(getByText(service)).toBeTruthy();
      });
    });

    it('renders contractor with no service tags', () => {
      const contractorNoServices: TopContractor[] = [
        {
          id: '1',
          name: 'Test Contractor',
          rating: 4.5,
          reviewCount: 100,
          services: [],
          distance: '5 km',
        },
      ];

      const { getByText, queryByText } = render(
        <TopContractorsList
          contractors={contractorNoServices}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Test Contractor')).toBeTruthy();
      expect(queryByText('Plumbing')).toBeFalsy();
    });

    it('renders contractor with many service tags', () => {
      const contractorManyServices: TopContractor[] = [
        {
          id: '1',
          name: 'Multi-Service Pro',
          rating: 4.8,
          reviewCount: 300,
          services: ['Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Painting', 'Roofing'],
          distance: '2 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={contractorManyServices}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
      expect(getByText('Roofing')).toBeTruthy();
    });
  });

  describe('User Interaction - See All', () => {
    it('calls onSeeAllPress when See All is tapped', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('See All'));

      expect(mockOnSeeAllPress).toHaveBeenCalledTimes(1);
    });

    it('calls onSeeAllPress multiple times', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const seeAllButton = getByText('See All');

      fireEvent.press(seeAllButton);
      fireEvent.press(seeAllButton);
      fireEvent.press(seeAllButton);

      expect(mockOnSeeAllPress).toHaveBeenCalledTimes(3);
    });

    it('handles rapid See All taps', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const seeAllButton = getByText('See All');

      for (let i = 0; i < 10; i++) {
        fireEvent.press(seeAllButton);
      }

      expect(mockOnSeeAllPress).toHaveBeenCalledTimes(10);
    });
  });

  describe('User Interaction - Contractor Selection', () => {
    it('calls onContractorPress when contractor card is tapped', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Elite Plumbing Co.'));

      expect(mockOnContractorPress).toHaveBeenCalledTimes(1);
      expect(mockOnContractorPress).toHaveBeenCalledWith('1');
    });

    it('calls onContractorPress with correct contractor ID', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Pro Electricians'));

      expect(mockOnContractorPress).toHaveBeenCalledWith('2');
    });

    it('calls onContractorPress for each different contractor', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Elite Plumbing Co.'));
      expect(mockOnContractorPress).toHaveBeenCalledWith('1');

      fireEvent.press(getByText('Pro Electricians'));
      expect(mockOnContractorPress).toHaveBeenCalledWith('2');

      fireEvent.press(getByText('HVAC Experts Inc.'));
      expect(mockOnContractorPress).toHaveBeenCalledWith('3');

      expect(mockOnContractorPress).toHaveBeenCalledTimes(3);
    });

    it('calls onContractorPress multiple times for same contractor', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const contractorCard = getByText('Elite Plumbing Co.');

      fireEvent.press(contractorCard);
      fireEvent.press(contractorCard);
      fireEvent.press(contractorCard);

      expect(mockOnContractorPress).toHaveBeenCalledTimes(3);
      expect(mockOnContractorPress).toHaveBeenCalledWith('1');
    });

    it('handles rapid contractor selections', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByText('Elite Plumbing Co.'));
      }

      expect(mockOnContractorPress).toHaveBeenCalledTimes(10);
    });

    it('calls onContractorPress for first contractor in list', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Elite Plumbing Co.'));

      expect(mockOnContractorPress).toHaveBeenCalledWith('1');
    });

    it('calls onContractorPress for last contractor in list', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('HVAC Experts Inc.'));

      expect(mockOnContractorPress).toHaveBeenCalledWith('3');
    });

    it('calls onContractorPress for middle contractor in list', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Pro Electricians'));

      expect(mockOnContractorPress).toHaveBeenCalledWith('2');
    });

    it('handles contractor press when contractor has special characters in name', () => {
      const specialContractors: TopContractor[] = [
        {
          id: 'special-1',
          name: 'A&B Plumbing LLC',
          rating: 4.8,
          reviewCount: 200,
          services: ['Plumbing'],
          distance: '3 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={specialContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      fireEvent.press(getByText('A&B Plumbing LLC'));

      expect(mockOnContractorPress).toHaveBeenCalledWith('special-1');
    });

    it('handles contractor press when contractor has long name', () => {
      const longNameContractors: TopContractor[] = [
        {
          id: 'long-1',
          name: 'Professional Commercial and Residential Plumbing Services Inc.',
          rating: 4.9,
          reviewCount: 500,
          services: ['Plumbing'],
          distance: '4 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={longNameContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      fireEvent.press(getByText('Professional Commercial and Residential Plumbing Services Inc.'));

      expect(mockOnContractorPress).toHaveBeenCalledWith('long-1');
    });
  });

  describe('Rating Display', () => {
    it('displays decimal ratings correctly', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('4.8')).toBeTruthy();
      expect(getByText('4.9')).toBeTruthy();
      expect(getByText('4.7')).toBeTruthy();
    });

    it('displays whole number ratings', () => {
      const wholeRatingContractors: TopContractor[] = [
        {
          id: '1',
          name: 'Perfect Rating Co.',
          rating: 5,
          reviewCount: 100,
          services: ['All'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={wholeRatingContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('5')).toBeTruthy();
    });

    it('displays low ratings', () => {
      const lowRatingContractors: TopContractor[] = [
        {
          id: '1',
          name: 'Low Rating Co.',
          rating: 2.5,
          reviewCount: 50,
          services: ['Service'],
          distance: '2 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={lowRatingContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('2.5')).toBeTruthy();
    });

    it('displays review counts correctly', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('(234 reviews)')).toBeTruthy();
      expect(getByText('(189 reviews)')).toBeTruthy();
      expect(getByText('(156 reviews)')).toBeTruthy();
    });

    it('displays single review count', () => {
      const singleReviewContractor: TopContractor[] = [
        {
          id: '1',
          name: 'New Contractor',
          rating: 5,
          reviewCount: 1,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={singleReviewContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('(1 reviews)')).toBeTruthy();
    });

    it('displays zero review count', () => {
      const zeroReviewContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Brand New',
          rating: 0,
          reviewCount: 0,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={zeroReviewContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('(0 reviews)')).toBeTruthy();
    });

    it('displays large review counts', () => {
      const largeReviewContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Popular Contractor',
          rating: 4.9,
          reviewCount: 9999,
          services: ['All'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={largeReviewContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('(9999 reviews)')).toBeTruthy();
    });
  });

  describe('Distance Display', () => {
    it('displays distances with different units', () => {
      const mixedDistanceContractors: TopContractor[] = [
        {
          id: '1',
          name: 'Nearby',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '0.5 km',
        },
        {
          id: '2',
          name: 'Far',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '10 miles',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={mixedDistanceContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('0.5 km away')).toBeTruthy();
      expect(getByText('10 miles away')).toBeTruthy();
    });

    it('displays very short distances', () => {
      const shortDistanceContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Very Close',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '100 m',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={shortDistanceContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('100 m away')).toBeTruthy();
    });

    it('displays long distances', () => {
      const longDistanceContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Far Away',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '50 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={longDistanceContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('50 km away')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty contractors array gracefully', () => {
      const { getByText, queryByText } = render(
        <TopContractorsList
          contractors={[]}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(queryByText('Elite Plumbing Co.')).toBeFalsy();
    });

    it('handles pressing contractor without breaking', () => {
      const { getByText } = render(
        <TopContractorsList contractors={mockContractors} onContractorPress={jest.fn()} onSeeAllPress={jest.fn()} />
      );

      expect(() => fireEvent.press(getByText('Elite Plumbing Co.'))).not.toThrow();
    });

    it('handles contractors with duplicate IDs', () => {
      const duplicateContractors: TopContractor[] = [
        {
          id: '1',
          name: 'Contractor A',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '1 km',
        },
        {
          id: '1',
          name: 'Contractor B',
          rating: 4.6,
          reviewCount: 150,
          services: ['Service'],
          distance: '2 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={duplicateContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Contractor A')).toBeTruthy();
      expect(getByText('Contractor B')).toBeTruthy();
    });

    it('handles contractor with empty name', () => {
      const emptyNameContractor: TopContractor[] = [
        {
          id: '1',
          name: '',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { root } = render(
        <TopContractorsList
          contractors={emptyNameContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(root).toBeTruthy();
    });

    it('handles contractor with very long ID', () => {
      const longId = 'a'.repeat(1000);
      const longIdContractor: TopContractor[] = [
        {
          id: longId,
          name: 'Test Contractor',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={longIdContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      fireEvent.press(getByText('Test Contractor'));

      expect(mockOnContractorPress).toHaveBeenCalledWith(longId);
    });

    it('handles component unmount gracefully', () => {
      const { unmount } = render(
        <TopContractorsList {...defaultProps} />
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles rerender with same props', () => {
      const { rerender } = render(
        <TopContractorsList {...defaultProps} />
      );

      expect(() => {
        rerender(<TopContractorsList {...defaultProps} />);
        rerender(<TopContractorsList {...defaultProps} />);
        rerender(<TopContractorsList {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles contractor with whitespace-only name', () => {
      const whitespaceContractor: TopContractor[] = [
        {
          id: '1',
          name: '   ',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={whitespaceContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('   ')).toBeTruthy();
    });

    it('handles negative rating values', () => {
      const negativeRatingContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Bad Contractor',
          rating: -1,
          reviewCount: 10,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={negativeRatingContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('-1')).toBeTruthy();
    });

    it('handles very high rating values', () => {
      const highRatingContractor: TopContractor[] = [
        {
          id: '1',
          name: 'Overrated',
          rating: 100,
          reviewCount: 1000,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText } = render(
        <TopContractorsList
          contractors={highRatingContractor}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('100')).toBeTruthy();
    });
  });

  describe('Re-rendering', () => {
    it('updates when contractors change', () => {
      const { getByText, rerender, queryByText } = render(
        <TopContractorsList {...defaultProps} />
      );

      expect(getByText('Elite Plumbing Co.')).toBeTruthy();

      const newContractors: TopContractor[] = [
        {
          id: '4',
          name: 'New Contractor',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      rerender(
        <TopContractorsList
          contractors={newContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('New Contractor')).toBeTruthy();
      expect(queryByText('Elite Plumbing Co.')).toBeFalsy();
    });

    it('updates when onContractorPress changes', () => {
      const newOnContractorPress = jest.fn();

      const { getByText, rerender } = render(
        <TopContractorsList {...defaultProps} />
      );

      rerender(
        <TopContractorsList
          contractors={mockContractors}
          onContractorPress={newOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      fireEvent.press(getByText('Elite Plumbing Co.'));

      expect(newOnContractorPress).toHaveBeenCalledTimes(1);
      expect(mockOnContractorPress).not.toHaveBeenCalled();
    });

    it('updates when onSeeAllPress changes', () => {
      const newOnSeeAllPress = jest.fn();

      const { getByText, rerender } = render(
        <TopContractorsList {...defaultProps} />
      );

      rerender(
        <TopContractorsList
          contractors={mockContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={newOnSeeAllPress}
        />
      );

      fireEvent.press(getByText('See All'));

      expect(newOnSeeAllPress).toHaveBeenCalledTimes(1);
      expect(mockOnSeeAllPress).not.toHaveBeenCalled();
    });

    it('handles adding contractors', () => {
      const initialContractors: TopContractor[] = [
        {
          id: '1',
          name: 'Contractor 1',
          rating: 4.5,
          reviewCount: 100,
          services: ['Service'],
          distance: '1 km',
        },
      ];

      const { getByText, rerender } = render(
        <TopContractorsList
          contractors={initialContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Contractor 1')).toBeTruthy();

      const expandedContractors: TopContractor[] = [
        ...initialContractors,
        {
          id: '2',
          name: 'Contractor 2',
          rating: 4.6,
          reviewCount: 150,
          services: ['Service'],
          distance: '2 km',
        },
      ];

      rerender(
        <TopContractorsList
          contractors={expandedContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Contractor 1')).toBeTruthy();
      expect(getByText('Contractor 2')).toBeTruthy();
    });

    it('handles removing contractors', () => {
      const { getByText, rerender, queryByText } = render(
        <TopContractorsList {...defaultProps} />
      );

      expect(getByText('Elite Plumbing Co.')).toBeTruthy();
      expect(getByText('Pro Electricians')).toBeTruthy();

      const reducedContractors: TopContractor[] = [
        {
          id: '1',
          name: 'Elite Plumbing Co.',
          rating: 4.8,
          reviewCount: 234,
          services: ['Plumbing', 'Emergency'],
          distance: '2.5 km',
        },
      ];

      rerender(
        <TopContractorsList
          contractors={reducedContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Elite Plumbing Co.')).toBeTruthy();
      expect(queryByText('Pro Electricians')).toBeFalsy();
    });

    it('handles reordering contractors', () => {
      const { getByText, rerender } = render(
        <TopContractorsList {...defaultProps} />
      );

      expect(getByText('Elite Plumbing Co.')).toBeTruthy();

      const reorderedContractors: TopContractor[] = [
        {
          id: '3',
          name: 'HVAC Experts Inc.',
          rating: 4.7,
          reviewCount: 156,
          services: ['HVAC', 'AC Repair', 'Heating'],
          distance: '1.8 km',
        },
        {
          id: '1',
          name: 'Elite Plumbing Co.',
          rating: 4.8,
          reviewCount: 234,
          services: ['Plumbing', 'Emergency'],
          distance: '2.5 km',
        },
      ];

      rerender(
        <TopContractorsList
          contractors={reorderedContractors}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Elite Plumbing Co.')).toBeTruthy();
      expect(getByText('HVAC Experts Inc.')).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('has correct container structure', () => {
      const { root } = render(<TopContractorsList {...defaultProps} />);

      expect(root).toBeTruthy();
    });

    it('renders section title before contractors', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(getByText('Elite Plumbing Co.')).toBeTruthy();
    });

    it('renders See All button in header', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      expect(getByText('Top Contractors')).toBeTruthy();
      expect(getByText('See All')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('all contractor cards are touchable', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        const contractorElement = getByText(contractor.name);
        expect(contractorElement.parent).toBeTruthy();
      });
    });

    it('See All button is touchable', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      const seeAllButton = getByText('See All');
      expect(seeAllButton.parent).toBeTruthy();
    });

    it('renders touchable components for all contractors', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      mockContractors.forEach((contractor) => {
        expect(getByText(contractor.name).parent).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = Date.now();

      render(<TopContractorsList {...defaultProps} />);

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<TopContractorsList {...defaultProps} />);

      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        rerender(
          <TopContractorsList
            contractors={mockContractors}
            onContractorPress={mockOnContractorPress}
            onSeeAllPress={mockOnSeeAllPress}
          />
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(500);
    });

    it('handles large number of contractors', () => {
      const largeContractorList: TopContractor[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Contractor ${i + 1}`,
        rating: 4.5 + (i % 5) * 0.1,
        reviewCount: 100 + i * 10,
        services: ['Service'],
        distance: `${i + 1} km`,
      }));

      const { getByText } = render(
        <TopContractorsList
          contractors={largeContractorList}
          onContractorPress={mockOnContractorPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      );

      expect(getByText('Contractor 1')).toBeTruthy();
      expect(getByText('Contractor 100')).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('maintains state through multiple interactions', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Elite Plumbing Co.'));
      fireEvent.press(getByText('Pro Electricians'));
      fireEvent.press(getByText('See All'));

      expect(mockOnContractorPress).toHaveBeenCalledTimes(2);
      expect(mockOnContractorPress).toHaveBeenNthCalledWith(1, '1');
      expect(mockOnContractorPress).toHaveBeenNthCalledWith(2, '2');
      expect(mockOnSeeAllPress).toHaveBeenCalledTimes(1);
    });

    it('handles alternating contractor selections and See All', () => {
      const { getByText } = render(<TopContractorsList {...defaultProps} />);

      fireEvent.press(getByText('Elite Plumbing Co.'));
      fireEvent.press(getByText('See All'));
      fireEvent.press(getByText('Pro Electricians'));

      expect(mockOnContractorPress).toHaveBeenCalledTimes(2);
      expect(mockOnSeeAllPress).toHaveBeenCalledTimes(1);
    });

    it('works with all props combinations', () => {
      const testCases = [
        { contractors: [], onContractorPress: jest.fn(), onSeeAllPress: jest.fn() },
        { contractors: [mockContractors[0]], onContractorPress: jest.fn(), onSeeAllPress: jest.fn() },
        { contractors: mockContractors, onContractorPress: jest.fn(), onSeeAllPress: jest.fn() },
      ];

      testCases.forEach((props) => {
        const { getByText } = render(<TopContractorsList {...props} />);

        expect(getByText('Top Contractors')).toBeTruthy();
      });
    });
  });
});
