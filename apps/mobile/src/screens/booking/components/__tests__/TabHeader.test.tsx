/**
 * TabHeader Component Tests
 *
 * Comprehensive test suite for the TabHeader component
 * Target: 100% code coverage
 *
 * @component TabHeader
 * @filesize 1000+ lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { TabHeader } from '../TabHeader';
import type { BookingStatus, TabInfo } from '../../viewmodels/BookingViewModel';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      text: '#171717',
      surface: '#FFFFFF',
      border: '#E5E5E5',
      textSecondary: '#737373',
      primary: '#10B981',
      error: '#EF4444',
    },
    spacing: {
      lg: 16,
      md: 12,
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

const mockTabs: TabInfo[] = [
  { id: 'upcoming', name: 'Upcoming', count: 3 },
  { id: 'completed', name: 'Completed', count: 5 },
  { id: 'cancelled', name: 'Cancelled', count: 2 },
];

const mockTabsWithZeroCount: TabInfo[] = [
  { id: 'upcoming', name: 'Upcoming', count: 0 },
  { id: 'completed', name: 'Completed', count: 0 },
  { id: 'cancelled', name: 'Cancelled', count: 0 },
];

const mockTabsWithLargeCounts: TabInfo[] = [
  { id: 'upcoming', name: 'Upcoming', count: 99 },
  { id: 'completed', name: 'Completed', count: 150 },
  { id: 'cancelled', name: 'Cancelled', count: 1000 },
];

const mockSingleTab: TabInfo[] = [
  { id: 'upcoming', name: 'Upcoming', count: 5 },
];

const mockManyTabs: TabInfo[] = [
  { id: 'upcoming', name: 'Upcoming', count: 1 },
  { id: 'completed', name: 'Completed', count: 2 },
  { id: 'cancelled', name: 'Cancelled', count: 3 },
  { id: 'pending', name: 'Pending', count: 4 },
  { id: 'rejected', name: 'Rejected', count: 5 },
];

// ============================================================================
// TABHEADER COMPONENT TESTS
// ============================================================================

describe('TabHeader Component', () => {
  let onTabPressMock: jest.Mock;
  let onBackPressMock: jest.Mock;
  let onSearchPressMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onTabPressMock = jest.fn();
    onBackPressMock = jest.fn();
    onSearchPressMock = jest.fn();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders the header title "Bookings"', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      expect(getByText('Bookings')).toBeTruthy();
    });

    it('renders back arrow icon', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      expect(getByTestId('ionicon-arrow-back')).toBeTruthy();
    });

    it('renders search icon', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      expect(getByTestId('ionicon-search')).toBeTruthy();
    });

    it('renders all tabs', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      expect(getByText('Upcoming')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('renders container with correct structure', () => {
      const { UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders with all required props', () => {
      expect(() => {
        render(
          <TabHeader
            activeTab="upcoming"
            tabs={mockTabs}
            onTabPress={onTabPressMock}
            onBackPress={onBackPressMock}
            onSearchPress={onSearchPressMock}
          />
        );
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Header Navigation Tests
  // --------------------------------------------------------------------------

  describe('Header Navigation', () => {
    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const backIcon = getByTestId('ionicon-arrow-back');
      const backButton = backIcon.parent?.parent;

      if (backButton) {
        fireEvent.press(backButton);
        expect(onBackPressMock).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onSearchPress when search button is pressed', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const searchIcon = getByTestId('ionicon-search');
      const searchButton = searchIcon.parent?.parent;

      if (searchButton) {
        fireEvent.press(searchButton);
        expect(onSearchPressMock).toHaveBeenCalledTimes(1);
      }
    });

    it('back button is a TouchableOpacity', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const backIcon = getByTestId('ionicon-arrow-back');
      const backButton = backIcon.parent?.parent;
      expect(backButton?.type).toBe(TouchableOpacity);
    });

    it('search button is a TouchableOpacity', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const searchIcon = getByTestId('ionicon-search');
      const searchButton = searchIcon.parent?.parent;
      expect(searchButton?.type).toBe(TouchableOpacity);
    });

    it('back icon has correct name prop', () => {
      render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const backIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'arrow-back'
      );
      expect(backIconCall).toBeTruthy();
      expect(backIconCall[0].name).toBe('arrow-back');
    });

    it('search icon has correct name prop', () => {
      render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const searchIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'search'
      );
      expect(searchIconCall).toBeTruthy();
      expect(searchIconCall[0].name).toBe('search');
    });

    it('back icon has correct size', () => {
      render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const backIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'arrow-back'
      );
      expect(backIconCall[0].size).toBe(24);
    });

    it('search icon has correct size', () => {
      render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const searchIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'search'
      );
      expect(searchIconCall[0].size).toBe(24);
    });

    it('back icon has correct color', () => {
      render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const backIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'arrow-back'
      );
      expect(backIconCall[0].color).toBe('#171717');
    });

    it('search icon has correct color', () => {
      render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const searchIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'search'
      );
      expect(searchIconCall[0].color).toBe('#171717');
    });

    it('handles multiple back button presses', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const backIcon = getByTestId('ionicon-arrow-back');
      const backButton = backIcon.parent?.parent;

      if (backButton) {
        fireEvent.press(backButton);
        fireEvent.press(backButton);
        fireEvent.press(backButton);
        expect(onBackPressMock).toHaveBeenCalledTimes(3);
      }
    });

    it('handles multiple search button presses', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const searchIcon = getByTestId('ionicon-search');
      const searchButton = searchIcon.parent?.parent;

      if (searchButton) {
        fireEvent.press(searchButton);
        fireEvent.press(searchButton);
        fireEvent.press(searchButton);
        expect(onSearchPressMock).toHaveBeenCalledTimes(3);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Tab Interaction Tests
  // --------------------------------------------------------------------------

  describe('Tab Interaction', () => {
    it('calls onTabPress when a tab is pressed', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Completed'));
      expect(onTabPressMock).toHaveBeenCalledWith('completed');
    });

    it('calls onTabPress with correct tab id for upcoming', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="completed"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Upcoming'));
      expect(onTabPressMock).toHaveBeenCalledWith('upcoming');
    });

    it('calls onTabPress with correct tab id for cancelled', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Cancelled'));
      expect(onTabPressMock).toHaveBeenCalledWith('cancelled');
    });

    it('calls onTabPress only once per press', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Completed'));
      expect(onTabPressMock).toHaveBeenCalledTimes(1);
    });

    it('handles pressing the same tab multiple times', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Upcoming'));
      fireEvent.press(getByText('Upcoming'));
      expect(onTabPressMock).toHaveBeenCalledTimes(2);
      expect(onTabPressMock).toHaveBeenNthCalledWith(1, 'upcoming');
      expect(onTabPressMock).toHaveBeenNthCalledWith(2, 'upcoming');
    });

    it('handles pressing different tabs sequentially', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Completed'));
      fireEvent.press(getByText('Cancelled'));
      fireEvent.press(getByText('Upcoming'));

      expect(onTabPressMock).toHaveBeenCalledTimes(3);
      expect(onTabPressMock).toHaveBeenNthCalledWith(1, 'completed');
      expect(onTabPressMock).toHaveBeenNthCalledWith(2, 'cancelled');
      expect(onTabPressMock).toHaveBeenNthCalledWith(3, 'upcoming');
    });

    it('tabs are clickable elements', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Upcoming'));
      expect(onTabPressMock).toHaveBeenCalled();
    });

    it('tab interaction works correctly', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Upcoming'));
      expect(onTabPressMock).toHaveBeenCalledWith('upcoming');
    });
  });

  // --------------------------------------------------------------------------
  // Active Tab Styling Tests
  // --------------------------------------------------------------------------

  describe('Active Tab Styling', () => {
    it('applies active styling to the active tab', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const upcomingText = getByText('Upcoming');
      const styles = Array.isArray(upcomingText.props.style)
        ? upcomingText.props.style.flat()
        : [upcomingText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#10B981',
            fontWeight: '600',
          }),
        ])
      );
    });

    it('does not apply active styling to inactive tabs', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const completedText = getByText('Completed');
      const styles = Array.isArray(completedText.props.style)
        ? completedText.props.style.flat()
        : [completedText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
            fontWeight: '500',
            color: '#737373',
          }),
        ])
      );
    });

    it('updates active styling when activeTab changes to completed', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="completed"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const completedText = getByText('Completed');
      const styles = Array.isArray(completedText.props.style)
        ? completedText.props.style.flat()
        : [completedText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#10B981',
            fontWeight: '600',
          }),
        ])
      );
    });

    it('updates active styling when activeTab changes to cancelled', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="cancelled"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const cancelledText = getByText('Cancelled');
      const styles = Array.isArray(cancelledText.props.style)
        ? cancelledText.props.style.flat()
        : [cancelledText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#10B981',
            fontWeight: '600',
          }),
        ])
      );
    });

    it('active and inactive tabs render correctly', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const upcomingText = getByText('Upcoming');
      const completedText = getByText('Completed');

      expect(upcomingText).toBeTruthy();
      expect(completedText).toBeTruthy();
    });

    it('visual distinction between active and inactive tabs', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const upcomingText = getByText('Upcoming');
      const completedText = getByText('Completed');

      // Extract all style objects
      const upcomingStyles = Array.isArray(upcomingText.props.style)
        ? upcomingText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [upcomingText.props.style].filter((s: any) => s && typeof s === 'object');

      const completedStyles = Array.isArray(completedText.props.style)
        ? completedText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [completedText.props.style].filter((s: any) => s && typeof s === 'object');

      // Get color from last style object (active tab should override with primary color)
      const upcomingColor = upcomingStyles.reverse().find((s: any) => s?.color)?.color;
      const completedColor = completedStyles.reverse().find((s: any) => s?.color)?.color;

      // Active tab should have primary color (#10B981), inactive should have textSecondary (#737373)
      expect(upcomingColor).toBe('#10B981');
      expect(completedColor).toBe('#737373');
    });
  });

  // --------------------------------------------------------------------------
  // Badge Display Tests
  // --------------------------------------------------------------------------

  describe('Badge Display', () => {
    it('displays badge with count when count > 0', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('3')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
    });

    it('does not display badge when count is 0', () => {
      const { queryByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabsWithZeroCount}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(queryByText('0')).toBeNull();
    });

    it('displays large count numbers correctly', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabsWithLargeCounts}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('99')).toBeTruthy();
      expect(getByText('150')).toBeTruthy();
      expect(getByText('1000')).toBeTruthy();
    });

    it('badge has correct styling', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const badgeText = getByText('3');
      const styles = Array.isArray(badgeText.props.style)
        ? badgeText.props.style.flat()
        : [badgeText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: 'white',
            fontSize: 12,
            fontWeight: '600',
          }),
        ])
      );
    });

    it('badge container has correct styling', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const badgeContainer = getByText('3').parent;
      const styles = Array.isArray(badgeContainer?.props.style)
        ? badgeContainer.props.style.flat()
        : [badgeContainer?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#EF4444',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }),
        ])
      );
    });

    it('renders badges for all tabs with counts', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      mockTabs.forEach((tab) => {
        if (tab.count > 0) {
          expect(getByText(tab.count.toString())).toBeTruthy();
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // Tab Count Edge Cases
  // --------------------------------------------------------------------------

  describe('Tab Count Edge Cases', () => {
    it('handles single digit counts', () => {
      const singleDigitTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Upcoming', count: 1 },
        { id: 'completed', name: 'Completed', count: 9 },
        { id: 'cancelled', name: 'Cancelled', count: 7 },
      ];

      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={singleDigitTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('1')).toBeTruthy();
      expect(getByText('9')).toBeTruthy();
      expect(getByText('7')).toBeTruthy();
    });

    it('handles double digit counts', () => {
      const doubleDigitTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Upcoming', count: 10 },
        { id: 'completed', name: 'Completed', count: 55 },
        { id: 'cancelled', name: 'Cancelled', count: 99 },
      ];

      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={doubleDigitTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('10')).toBeTruthy();
      expect(getByText('55')).toBeTruthy();
      expect(getByText('99')).toBeTruthy();
    });

    it('handles triple digit counts', () => {
      const tripleDigitTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Upcoming', count: 100 },
        { id: 'completed', name: 'Completed', count: 500 },
        { id: 'cancelled', name: 'Cancelled', count: 999 },
      ];

      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={tripleDigitTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('100')).toBeTruthy();
      expect(getByText('500')).toBeTruthy();
      expect(getByText('999')).toBeTruthy();
    });

    it('handles mixed zero and non-zero counts', () => {
      const mixedTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Upcoming', count: 0 },
        { id: 'completed', name: 'Completed', count: 5 },
        { id: 'cancelled', name: 'Cancelled', count: 0 },
      ];

      const { getByText, queryByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mixedTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('5')).toBeTruthy();
      const allZeroTexts = queryByText('0');
      expect(allZeroTexts).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Dynamic Tabs Tests
  // --------------------------------------------------------------------------

  describe('Dynamic Tabs', () => {
    it('renders single tab', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockSingleTab}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();
    });

    it('renders many tabs', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockManyTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      mockManyTabs.forEach((tab) => {
        expect(getByText(tab.name)).toBeTruthy();
      });
    });

    it('handles empty tabs array', () => {
      const { UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={[]}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const textElements = UNSAFE_root.findAllByType(Text as any);
      const tabTexts = textElements.filter(
        (el: any) => el.props.children !== 'Bookings'
      );
      expect(tabTexts.length).toBe(0);
    });

    it('all tabs in array are rendered', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      mockTabs.forEach((tab) => {
        expect(getByText(tab.name)).toBeTruthy();
      });
    });

    it('each tab renders with proper structure', () => {
      const { getByText, UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      // Verify all tabs are rendered with their names
      mockTabs.forEach((tab) => {
        expect(getByText(tab.name)).toBeTruthy();
        if (tab.count > 0) {
          expect(getByText(tab.count.toString())).toBeTruthy();
        }
      });

      // Verify correct number of tab touchable elements (3 tabs + 2 header buttons = 5 total)
      const touchableElements = UNSAFE_root.findAllByType(TouchableOpacity as any);
      expect(touchableElements.length).toBeGreaterThanOrEqual(mockTabs.length);
    });
  });

  // --------------------------------------------------------------------------
  // Styling Verification Tests
  // --------------------------------------------------------------------------

  describe('Styling Verification', () => {
    it('header title has correct styling', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const title = getByText('Bookings');
      const styles = Array.isArray(title.props.style)
        ? title.props.style.flat()
        : [title.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 18,
            fontWeight: '600',
            color: '#171717',
          }),
        ])
      );
    });

    it('tab text has correct base styling', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="completed"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const upcomingText = getByText('Upcoming');
      const styles = Array.isArray(upcomingText.props.style)
        ? upcomingText.props.style.flat()
        : [upcomingText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
            fontWeight: '500',
            color: '#737373',
            marginRight: 6,
          }),
        ])
      );
    });

    it('tab layout renders correctly', () => {
      const { getByText, UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const upcomingText = getByText('Upcoming');
      expect(upcomingText).toBeTruthy();

      const touchableElements = UNSAFE_root.findAllByType(TouchableOpacity as any);
      expect(touchableElements.length).toBeGreaterThanOrEqual(mockTabs.length);
    });

    it('tabs container has correct styling', () => {
      const { UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const tabsContainer = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.flexDirection === 'row' &&
            style?.paddingHorizontal === 20 &&
            style?.marginBottom === 20 &&
            style?.borderBottomWidth === 1
        );
      });

      expect(tabsContainer).toBeTruthy();
    });

    it('main container has correct background color', () => {
      const { UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];
      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FFFFFF',
          }),
        ])
      );
    });

    it('header section has correct styling', () => {
      const { UNSAFE_root } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const headerSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.flexDirection === 'row' &&
            style?.alignItems === 'center' &&
            style?.justifyContent === 'space-between' &&
            style?.paddingTop === 60
        );
      });

      expect(headerSection).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('complete workflow: navigate back, switch tabs, search', () => {
      const { getByText, getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const backIcon = getByTestId('ionicon-arrow-back');
      const backButton = backIcon.parent?.parent;
      if (backButton) {
        fireEvent.press(backButton);
      }

      fireEvent.press(getByText('Completed'));
      fireEvent.press(getByText('Cancelled'));

      const searchIcon = getByTestId('ionicon-search');
      const searchButton = searchIcon.parent?.parent;
      if (searchButton) {
        fireEvent.press(searchButton);
      }

      expect(onBackPressMock).toHaveBeenCalledTimes(1);
      expect(onTabPressMock).toHaveBeenCalledTimes(2);
      expect(onTabPressMock).toHaveBeenNthCalledWith(1, 'completed');
      expect(onTabPressMock).toHaveBeenNthCalledWith(2, 'cancelled');
      expect(onSearchPressMock).toHaveBeenCalledTimes(1);
    });

    it('renders correctly with all different activeTab values', () => {
      const activeTabValues: BookingStatus[] = ['upcoming', 'completed', 'cancelled'];

      activeTabValues.forEach((activeTab) => {
        const { getByText } = render(
          <TabHeader
            activeTab={activeTab}
            tabs={mockTabs}
            onTabPress={onTabPressMock}
            onBackPress={onBackPressMock}
            onSearchPress={onSearchPressMock}
          />
        );

        const tab = mockTabs.find((t) => t.id === activeTab);
        if (tab) {
          const tabText = getByText(tab.name);
          const styles = Array.isArray(tabText.props.style)
            ? tabText.props.style.flat()
            : [tabText.props.style];

          expect(styles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                color: '#10B981',
                fontWeight: '600',
              }),
            ])
          );
        }
      });
    });

    it('maintains state across multiple renders', () => {
      const { rerender, getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('Upcoming')).toBeTruthy();

      rerender(
        <TabHeader
          activeTab="completed"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      expect(getByText('Completed')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles very long tab names', () => {
      const longNameTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Very Long Tab Name That Should Be Displayed', count: 1 },
        { id: 'completed', name: 'Another Extremely Long Tab Name', count: 2 },
        { id: 'cancelled', name: 'Yet Another Very Long Name', count: 3 },
      ];

      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={longNameTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      longNameTabs.forEach((tab) => {
        expect(getByText(tab.name)).toBeTruthy();
      });
    });

    it('handles special characters in tab names', () => {
      const specialCharTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Up & Coming', count: 1 },
        { id: 'completed', name: 'Done!', count: 2 },
        { id: 'cancelled', name: 'X-ed Out', count: 3 },
      ];

      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={specialCharTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      specialCharTabs.forEach((tab) => {
        expect(getByText(tab.name)).toBeTruthy();
      });
    });

    it('handles tabs with identical names but different ids', () => {
      const duplicateNameTabs: TabInfo[] = [
        { id: 'upcoming', name: 'Status', count: 1 },
        { id: 'completed', name: 'Status', count: 2 },
        { id: 'cancelled', name: 'Status', count: 3 },
      ];

      const { getAllByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={duplicateNameTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const statusTabs = getAllByText('Status');
      expect(statusTabs.length).toBe(3);
    });

    it('handles rapid tab switching', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByText('Completed'));
        fireEvent.press(getByText('Cancelled'));
        fireEvent.press(getByText('Upcoming'));
      }

      expect(onTabPressMock).toHaveBeenCalledTimes(30);
    });

    it('handles rapid button presses', () => {
      const { getByTestId } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const backIcon = getByTestId('ionicon-arrow-back');
      const backButton = backIcon.parent?.parent;

      if (backButton) {
        for (let i = 0; i < 10; i++) {
          fireEvent.press(backButton);
        }
      }

      expect(onBackPressMock).toHaveBeenCalledTimes(10);
    });
  });

  // --------------------------------------------------------------------------
  // Type Safety Tests
  // --------------------------------------------------------------------------

  describe('Type Safety', () => {
    it('accepts valid BookingStatus types', () => {
      const validStatuses: BookingStatus[] = ['upcoming', 'completed', 'cancelled'];

      validStatuses.forEach((status) => {
        expect(() => {
          render(
            <TabHeader
              activeTab={status}
              tabs={mockTabs}
              onTabPress={onTabPressMock}
              onBackPress={onBackPressMock}
              onSearchPress={onSearchPressMock}
            />
          );
        }).not.toThrow();
      });
    });

    it('tab IDs match BookingStatus type', () => {
      const { getByText } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      fireEvent.press(getByText('Upcoming'));
      const calledWith = onTabPressMock.mock.calls[0][0];
      expect(['upcoming', 'completed', 'cancelled']).toContain(calledWith);
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently with many tabs', () => {
      const manyTabsList: TabInfo[] = Array.from({ length: 20 }, (_, i) => ({
        id: `tab-${i}`,
        name: `Tab ${i}`,
        count: i,
      }));

      const startTime = Date.now();
      render(
        <TabHeader
          activeTab="tab-0"
          tabs={manyTabsList}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('handles re-renders efficiently', () => {
      const { rerender } = render(
        <TabHeader
          activeTab="upcoming"
          tabs={mockTabs}
          onTabPress={onTabPressMock}
          onBackPress={onBackPressMock}
          onSearchPress={onSearchPressMock}
        />
      );

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        rerender(
          <TabHeader
            activeTab={i % 2 === 0 ? 'upcoming' : 'completed'}
            tabs={mockTabs}
            onTabPress={onTabPressMock}
            onBackPress={onBackPressMock}
            onSearchPress={onSearchPressMock}
          />
        );
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
