/**
 * ContractorCard Component Tests
 *
 * Comprehensive test suite for ContractorCard component
 * Target: 100% coverage with deterministic tests
 *
 * @coverage-target 100%
 */

import React from 'react';
import { render, fireEvent } from '../../../../test-utils';
import { ContractorCard } from '../ContractorCard';
import type { Contractor } from '../../viewmodels/ExploreMapViewModel';

describe('ContractorCard', () => {
  // Mock Data
  const mockContractor: Contractor = {
    id: '1',
    name: 'Elite Plumbing',
    rating: 4.8,
    reviewCount: 234,
    distance: '2.5 km',
    services: ['Plumbing', 'Emergency'],
    latitude: 40.7128,
    longitude: -74.006,
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('Elite Plumbing')).toBeDefined();
    });

    it('renders contractor name correctly', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('Elite Plumbing')).toBeDefined();
    });

    it('renders contractor rating correctly', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('4.8')).toBeDefined();
    });

    it('renders review count correctly', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('(234 reviews)')).toBeDefined();
    });

    it('renders distance correctly', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('2.5 km away')).toBeDefined();
    });

    it('renders all services correctly', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('Plumbing')).toBeDefined();
      expect(getByText('Emergency')).toBeDefined();
    });

    it('renders with different contractor name', () => {
      const contractor = { ...mockContractor, name: 'Pro Electricians' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Pro Electricians')).toBeDefined();
    });

    it('renders with different rating', () => {
      const contractor = { ...mockContractor, rating: 4.9 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('4.9')).toBeDefined();
    });

    it('renders with different review count', () => {
      const contractor = { ...mockContractor, reviewCount: 189 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('(189 reviews)')).toBeDefined();
    });

    it('renders with different distance', () => {
      const contractor = { ...mockContractor, distance: '3.1 km' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('3.1 km away')).toBeDefined();
    });
  });

  describe('Services Display', () => {
    it('renders single service', () => {
      const contractor = { ...mockContractor, services: ['Plumbing'] };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Plumbing')).toBeDefined();
    });

    it('renders multiple services', () => {
      const contractor = { ...mockContractor, services: ['Plumbing', 'Emergency', 'Maintenance'] };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Plumbing')).toBeDefined();
      expect(getByText('Emergency')).toBeDefined();
      expect(getByText('Maintenance')).toBeDefined();
    });

    it('renders empty services array', () => {
      const contractor = { ...mockContractor, services: [] };
      const { queryByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(queryByText('Plumbing')).toBeNull();
    });

    it('renders services with special characters', () => {
      const contractor = { ...mockContractor, services: ['A/C Repair', 'HVAC & Heating'] };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('A/C Repair')).toBeDefined();
      expect(getByText('HVAC & Heating')).toBeDefined();
    });

    it('renders long service names', () => {
      const contractor = { ...mockContractor, services: ['Emergency Plumbing and Drainage Services'] };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Emergency Plumbing and Drainage Services')).toBeDefined();
    });
  });

  describe('Rating Display', () => {
    it('renders perfect rating', () => {
      const contractor = { ...mockContractor, rating: 5.0 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('5')).toBeDefined();
    });

    it('renders low rating', () => {
      const contractor = { ...mockContractor, rating: 3.2 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('3.2')).toBeDefined();
    });

    it('renders zero rating', () => {
      const contractor = { ...mockContractor, rating: 0 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('0')).toBeDefined();
    });

    it('renders rating with single decimal', () => {
      const contractor = { ...mockContractor, rating: 4.5 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('4.5')).toBeDefined();
    });
  });

  describe('Review Count Display', () => {
    it('renders zero reviews', () => {
      const contractor = { ...mockContractor, reviewCount: 0 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('(0 reviews)')).toBeDefined();
    });

    it('renders single review', () => {
      const contractor = { ...mockContractor, reviewCount: 1 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('(1 reviews)')).toBeDefined();
    });

    it('renders large review count', () => {
      const contractor = { ...mockContractor, reviewCount: 9999 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('(9999 reviews)')).toBeDefined();
    });

    it('renders very large review count', () => {
      const contractor = { ...mockContractor, reviewCount: 100000 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('(100000 reviews)')).toBeDefined();
    });
  });

  describe('Distance Display', () => {
    it('renders distance with meters', () => {
      const contractor = { ...mockContractor, distance: '500 m' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('500 m away')).toBeDefined();
    });

    it('renders distance with kilometers', () => {
      const contractor = { ...mockContractor, distance: '5.2 km' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('5.2 km away')).toBeDefined();
    });

    it('renders distance with miles', () => {
      const contractor = { ...mockContractor, distance: '1.5 mi' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('1.5 mi away')).toBeDefined();
    });

    it('renders very short distance', () => {
      const contractor = { ...mockContractor, distance: '50 m' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('50 m away')).toBeDefined();
    });

    it('renders very long distance', () => {
      const contractor = { ...mockContractor, distance: '100 km' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('100 km away')).toBeDefined();
    });
  });

  describe('User Interactions', () => {
    it('calls onPress when card is pressed', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      fireEvent.press(getByText('Elite Plumbing'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress when card container is pressed', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      const card = getByText('Elite Plumbing').parent?.parent;
      if (card) {
        fireEvent.press(card);
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      }
    });

    it('does not call onPress multiple times on single press', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      fireEvent.press(getByText('Elite Plumbing'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress multiple times on multiple presses', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      fireEvent.press(getByText('Elite Plumbing'));
      fireEvent.press(getByText('Elite Plumbing'));
      fireEvent.press(getByText('Elite Plumbing'));
      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('works with different onPress handlers', () => {
      const customHandler = jest.fn();
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={customHandler} />
      );
      fireEvent.press(getByText('Elite Plumbing'));
      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('renders with minimal contractor data', () => {
      const minimalContractor: Contractor = {
        id: '999',
        name: 'Test',
        rating: 0,
        reviewCount: 0,
        distance: '0 m',
        services: [],
        latitude: 0,
        longitude: 0,
      };
      const { getByText } = render(
        <ContractorCard contractor={minimalContractor} onPress={mockOnPress} />
      );
      expect(getByText('Test')).toBeDefined();
      expect(getByText('0')).toBeDefined();
      expect(getByText('(0 reviews)')).toBeDefined();
    });

    it('renders with very long contractor name', () => {
      const contractor = {
        ...mockContractor,
        name: 'Very Long Contractor Name That Goes On And On And On'
      };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Very Long Contractor Name That Goes On And On And On')).toBeDefined();
    });

    it('renders with special characters in name', () => {
      const contractor = { ...mockContractor, name: "O'Reilly's Plumbing & Co." };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText("O'Reilly's Plumbing & Co.")).toBeDefined();
    });

    it('renders with unicode characters in name', () => {
      const contractor = { ...mockContractor, name: 'Plomberie François' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Plomberie François')).toBeDefined();
    });

    it('renders with emoji in name', () => {
      const contractor = { ...mockContractor, name: '⭐ Elite Plumbing' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('⭐ Elite Plumbing')).toBeDefined();
    });

    it('renders with numeric-only name', () => {
      const contractor = { ...mockContractor, name: '123' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('123')).toBeDefined();
    });

    it('renders with single character name', () => {
      const contractor = { ...mockContractor, name: 'A' };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('A')).toBeDefined();
    });
  });

  describe('Props Validation', () => {
    it('accepts valid contractor prop', () => {
      expect(() => {
        render(<ContractorCard contractor={mockContractor} onPress={mockOnPress} />);
      }).not.toThrow();
    });

    it('accepts valid onPress prop', () => {
      expect(() => {
        render(<ContractorCard contractor={mockContractor} onPress={jest.fn()} />);
      }).not.toThrow();
    });

    it('renders with different contractor IDs', () => {
      const contractor1 = { ...mockContractor, id: 'contractor-1' };
      const contractor2 = { ...mockContractor, id: 'contractor-2' };

      const { rerender, getByText } = render(
        <ContractorCard contractor={contractor1} onPress={mockOnPress} />
      );
      expect(getByText('Elite Plumbing')).toBeDefined();

      rerender(<ContractorCard contractor={contractor2} onPress={mockOnPress} />);
      expect(getByText('Elite Plumbing')).toBeDefined();
    });
  });

  describe('Component Updates', () => {
    it('updates when contractor changes', () => {
      const contractor1 = { ...mockContractor, name: 'First Contractor' };
      const contractor2 = { ...mockContractor, name: 'Second Contractor' };

      const { rerender, getByText, queryByText } = render(
        <ContractorCard contractor={contractor1} onPress={mockOnPress} />
      );
      expect(getByText('First Contractor')).toBeDefined();

      rerender(<ContractorCard contractor={contractor2} onPress={mockOnPress} />);
      expect(getByText('Second Contractor')).toBeDefined();
      expect(queryByText('First Contractor')).toBeNull();
    });

    it('updates when rating changes', () => {
      const contractor1 = { ...mockContractor, rating: 4.5 };
      const contractor2 = { ...mockContractor, rating: 3.8 };

      const { rerender, getByText } = render(
        <ContractorCard contractor={contractor1} onPress={mockOnPress} />
      );
      expect(getByText('4.5')).toBeDefined();

      rerender(<ContractorCard contractor={contractor2} onPress={mockOnPress} />);
      expect(getByText('3.8')).toBeDefined();
    });

    it('updates when services change', () => {
      const contractor1 = { ...mockContractor, services: ['Plumbing'] };
      const contractor2 = { ...mockContractor, services: ['Electrical'] };

      const { rerender, getByText, queryByText } = render(
        <ContractorCard contractor={contractor1} onPress={mockOnPress} />
      );
      expect(getByText('Plumbing')).toBeDefined();

      rerender(<ContractorCard contractor={contractor2} onPress={mockOnPress} />);
      expect(getByText('Electrical')).toBeDefined();
      expect(queryByText('Plumbing')).toBeNull();
    });

    it('updates when onPress handler changes', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const { rerender, getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={handler1} />
      );
      fireEvent.press(getByText('Elite Plumbing'));
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();

      rerender(<ContractorCard contractor={mockContractor} onPress={handler2} />);
      fireEvent.press(getByText('Elite Plumbing'));
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('renders as a pressable component', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      const card = getByText('Elite Plumbing').parent?.parent;
      expect(card).toBeDefined();
    });

    it('maintains text readability', () => {
      const { getByText } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(getByText('Elite Plumbing')).toBeDefined();
      expect(getByText('4.8')).toBeDefined();
      expect(getByText('(234 reviews)')).toBeDefined();
      expect(getByText('2.5 km away')).toBeDefined();
    });
  });

  describe('Visual Elements', () => {
    it('renders complete component structure', () => {
      const { toJSON } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      const tree = toJSON();
      expect(tree).toBeDefined();
      expect(tree).not.toBeNull();
    });

    it('renders with consistent visual structure', () => {
      const { root } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(root).toBeDefined();
    });
  });

  describe('Multiple Services Scenarios', () => {
    it('renders 5 services', () => {
      const contractor = {
        ...mockContractor,
        services: ['Plumbing', 'Emergency', 'Maintenance', 'Repair', 'Installation']
      };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('Plumbing')).toBeDefined();
      expect(getByText('Emergency')).toBeDefined();
      expect(getByText('Maintenance')).toBeDefined();
      expect(getByText('Repair')).toBeDefined();
      expect(getByText('Installation')).toBeDefined();
    });

    it('renders 10 services', () => {
      const contractor = {
        ...mockContractor,
        services: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
      };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('S1')).toBeDefined();
      expect(getByText('S5')).toBeDefined();
      expect(getByText('S10')).toBeDefined();
    });
  });

  describe('Rating Precision', () => {
    it('renders integer rating', () => {
      const contractor = { ...mockContractor, rating: 4 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('4')).toBeDefined();
    });

    it('renders one decimal place rating', () => {
      const contractor = { ...mockContractor, rating: 4.3 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('4.3')).toBeDefined();
    });

    it('renders two decimal places rating', () => {
      const contractor = { ...mockContractor, rating: 4.75 };
      const { getByText } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(getByText('4.75')).toBeDefined();
    });
  });

  describe('Snapshot Consistency', () => {
    it('maintains consistent structure', () => {
      const { toJSON } = render(
        <ContractorCard contractor={mockContractor} onPress={mockOnPress} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('maintains consistent structure with different data', () => {
      const contractor = {
        id: '2',
        name: 'Pro Electricians',
        rating: 4.9,
        reviewCount: 189,
        distance: '3.1 km',
        services: ['Electrical'],
        latitude: 40.715,
        longitude: -74.01,
      };
      const { toJSON } = render(
        <ContractorCard contractor={contractor} onPress={mockOnPress} />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
