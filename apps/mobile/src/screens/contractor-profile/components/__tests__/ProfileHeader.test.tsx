/**
 * ProfileHeader Component Tests
 *
 * Comprehensive test suite for the ProfileHeader component
 * Target: 100% code coverage
 *
 * @component ProfileHeader
 * @filesize ~1500 lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View, TouchableOpacity } from 'react-native';
import { ProfileHeader } from '../ProfileHeader';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      white: '#FFFFFF',
      primary: '#10B981',
      borderLight: '#F5F5F5',
      borderDark: '#D4D4D4',
      textPrimary: '#171717',
      textSecondary: '#737373',
    },
    spacing: {
      sm: 8,
      xl: 16,
      '2xl': 24,
    },
    typography: {
      fontSize: {
        sm: 12,
        base: 14,
        '3xl': 24,
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

const defaultProps = {
  name: 'John Smith',
  location: 'New York, NY',
};

const propsWithEdit = {
  ...defaultProps,
  showEditButton: true,
  onEditPress: jest.fn(),
};

// ============================================================================
// PROFILEHEADER COMPONENT TESTS
// ============================================================================

describe('ProfileHeader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with required props only', () => {
      expect(() => {
        render(<ProfileHeader name="Test User" location="Test Location" />);
      }).not.toThrow();
    });

    it('renders contractor name', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      expect(getByText('John Smith')).toBeTruthy();
    });

    it('renders contractor location', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      expect(getByText('New York, NY')).toBeTruthy();
    });

    it('renders avatar container', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders location icon', () => {
      const { getByTestId } = render(<ProfileHeader {...defaultProps} />);
      expect(getByTestId('ionicon-location')).toBeTruthy();
    });

    it('renders with all view containers', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      // Container, avatar container, avatar, info section, location row
      expect(viewElements.length).toBeGreaterThanOrEqual(5);
    });

    it('renders name as Text component', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      const nameElement = getByText('John Smith');
      expect(nameElement.type).toBe(Text);
    });

    it('renders location as Text component', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      const locationElement = getByText('New York, NY');
      expect(locationElement.type).toBe(Text);
    });
  });

  // --------------------------------------------------------------------------
  // Edit Button Tests
  // --------------------------------------------------------------------------

  describe('Edit Button', () => {
    it('does not render edit button by default', () => {
      const { queryByText } = render(<ProfileHeader {...defaultProps} />);
      expect(queryByText('Edit')).toBeNull();
    });

    it('does not render edit button when showEditButton is false', () => {
      const { queryByText } = render(
        <ProfileHeader {...defaultProps} showEditButton={false} />
      );
      expect(queryByText('Edit')).toBeNull();
    });

    it('renders edit button when showEditButton is true', () => {
      const { getByText } = render(<ProfileHeader {...propsWithEdit} />);
      expect(getByText('Edit')).toBeTruthy();
    });

    it('renders edit button with pencil icon', () => {
      const { getByTestId } = render(<ProfileHeader {...propsWithEdit} />);
      expect(getByTestId('ionicon-pencil')).toBeTruthy();
    });

    it('calls onEditPress when edit button is pressed', () => {
      const onEditPress = jest.fn();
      const { getByText } = render(
        <ProfileHeader {...defaultProps} showEditButton onEditPress={onEditPress} />
      );

      fireEvent.press(getByText('Edit'));
      expect(onEditPress).toHaveBeenCalledTimes(1);
    });

    it('handles multiple edit button presses', () => {
      const onEditPress = jest.fn();
      const { getByText } = render(
        <ProfileHeader {...defaultProps} showEditButton onEditPress={onEditPress} />
      );

      const editButton = getByText('Edit');
      fireEvent.press(editButton);
      fireEvent.press(editButton);
      fireEvent.press(editButton);

      expect(onEditPress).toHaveBeenCalledTimes(3);
    });

    it('edit button is TouchableOpacity', () => {
      const { getByText } = render(<ProfileHeader {...propsWithEdit} />);
      const editText = getByText('Edit');
      const editButton = editText.parent;
      expect(editButton?.type).toBe(TouchableOpacity);
    });

    it('does not call onEditPress when button not shown', () => {
      const onEditPress = jest.fn();
      render(
        <ProfileHeader
          {...defaultProps}
          showEditButton={false}
          onEditPress={onEditPress}
        />
      );
      expect(onEditPress).not.toHaveBeenCalled();
    });

    it('renders edit button inside avatar container', () => {
      const { getByText } = render(<ProfileHeader {...propsWithEdit} />);
      const editButton = getByText('Edit');
      expect(editButton).toBeTruthy();
    });

    it('edit button contains both icon and text', () => {
      const { getByText, getByTestId } = render(<ProfileHeader {...propsWithEdit} />);
      expect(getByTestId('ionicon-pencil')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edit Button Icon Tests
  // --------------------------------------------------------------------------

  describe('Edit Button Icon', () => {
    it('pencil icon has correct name prop', () => {
      render(<ProfileHeader {...propsWithEdit} />);
      const pencilIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'pencil'
      );
      expect(pencilIconCall).toBeTruthy();
      expect(pencilIconCall[0].name).toBe('pencil');
    });

    it('pencil icon has correct size', () => {
      render(<ProfileHeader {...propsWithEdit} />);
      const pencilIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'pencil'
      );
      expect(pencilIconCall[0].size).toBe(14);
    });

    it('pencil icon has correct color', () => {
      render(<ProfileHeader {...propsWithEdit} />);
      const pencilIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'pencil'
      );
      expect(pencilIconCall[0].color).toBe('#FFFFFF');
    });

    it('does not render pencil icon when edit button hidden', () => {
      render(<ProfileHeader {...defaultProps} showEditButton={false} />);
      const pencilIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'pencil'
      );
      expect(pencilIconCall).toBeFalsy();
    });
  });

  // --------------------------------------------------------------------------
  // Location Icon Tests
  // --------------------------------------------------------------------------

  describe('Location Icon', () => {
    it('location icon has correct name prop', () => {
      render(<ProfileHeader {...defaultProps} />);
      const locationIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'location'
      );
      expect(locationIconCall).toBeTruthy();
      expect(locationIconCall[0].name).toBe('location');
    });

    it('location icon has correct size', () => {
      render(<ProfileHeader {...defaultProps} />);
      const locationIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'location'
      );
      expect(locationIconCall[0].size).toBe(16);
    });

    it('location icon has correct color', () => {
      render(<ProfileHeader {...defaultProps} />);
      const locationIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'location'
      );
      expect(locationIconCall[0].color).toBe('#737373');
    });

    it('always renders location icon', () => {
      const { getByTestId } = render(<ProfileHeader {...defaultProps} />);
      expect(getByTestId('ionicon-location')).toBeTruthy();
    });

    it('renders location icon with edit button shown', () => {
      render(<ProfileHeader {...propsWithEdit} />);
      const locationIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'location'
      );
      expect(locationIconCall).toBeTruthy();
    });

    it('renders location icon with edit button hidden', () => {
      render(<ProfileHeader {...defaultProps} showEditButton={false} />);
      const locationIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'location'
      );
      expect(locationIconCall).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Name Display Tests
  // --------------------------------------------------------------------------

  describe('Name Display', () => {
    it('renders different contractor names', () => {
      const names = [
        'Alice Johnson',
        'Bob Williams',
        'Charlie Davis',
        'Diana Martinez',
      ];

      names.forEach((name) => {
        const { getByText } = render(
          <ProfileHeader name={name} location="Test Location" />
        );
        expect(getByText(name)).toBeTruthy();
      });
    });

    it('renders name with special characters', () => {
      const { getByText } = render(
        <ProfileHeader name="O'Brien & Sons" location="Test Location" />
      );
      expect(getByText("O'Brien & Sons")).toBeTruthy();
    });

    it('renders very long names', () => {
      const longName = 'A'.repeat(100);
      const { getByText } = render(
        <ProfileHeader name={longName} location="Test Location" />
      );
      expect(getByText(longName)).toBeTruthy();
    });

    it('renders single character name', () => {
      const { getByText } = render(
        <ProfileHeader name="X" location="Test Location" />
      );
      expect(getByText('X')).toBeTruthy();
    });

    it('renders name with numbers', () => {
      const { getByText } = render(
        <ProfileHeader name="123 Services" location="Test Location" />
      );
      expect(getByText('123 Services')).toBeTruthy();
    });

    it('renders name with unicode characters', () => {
      const { getByText } = render(
        <ProfileHeader name="José García" location="Test Location" />
      );
      expect(getByText('José García')).toBeTruthy();
    });

    it('renders name with emojis', () => {
      const { getByText } = render(
        <ProfileHeader name="John 🔧 Repair" location="Test Location" />
      );
      expect(getByText('John 🔧 Repair')).toBeTruthy();
    });

    it('renders empty string name', () => {
      const { queryByText } = render(
        <ProfileHeader name="" location="Test Location" />
      );
      // Empty text element should still be in tree
      expect(queryByText('')).toBeTruthy();
    });

    it('renders name with leading/trailing spaces', () => {
      const { getByText } = render(
        <ProfileHeader name="  John Smith  " location="Test Location" />
      );
      expect(getByText('  John Smith  ')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Location Display Tests
  // --------------------------------------------------------------------------

  describe('Location Display', () => {
    it('renders different locations', () => {
      const locations = [
        'Los Angeles, CA',
        'Chicago, IL',
        'Houston, TX',
        'Phoenix, AZ',
      ];

      locations.forEach((location) => {
        const { getByText } = render(
          <ProfileHeader name="Test User" location={location} />
        );
        expect(getByText(location)).toBeTruthy();
      });
    });

    it('renders location with special characters', () => {
      const { getByText } = render(
        <ProfileHeader name="Test User" location="Saint-Jean-sur-Richelieu, QC" />
      );
      expect(getByText('Saint-Jean-sur-Richelieu, QC')).toBeTruthy();
    });

    it('renders very long location', () => {
      const longLocation =
        'Very Long City Name That Extends Beyond Normal Length, State, Country';
      const { getByText } = render(
        <ProfileHeader name="Test User" location={longLocation} />
      );
      expect(getByText(longLocation)).toBeTruthy();
    });

    it('renders location with numbers', () => {
      const { getByText } = render(
        <ProfileHeader name="Test User" location="New York, NY 10001" />
      );
      expect(getByText('New York, NY 10001')).toBeTruthy();
    });

    it('renders location with unicode', () => {
      const { getByText } = render(
        <ProfileHeader name="Test User" location="Montréal, Québec" />
      );
      expect(getByText('Montréal, Québec')).toBeTruthy();
    });

    it('renders empty string location', () => {
      const { queryByText } = render(
        <ProfileHeader name="Test User" location="" />
      );
      // Empty text element should still be in tree
      expect(queryByText('')).toBeTruthy();
    });

    it('renders single character location', () => {
      const { getByText } = render(
        <ProfileHeader name="Test User" location="A" />
      );
      expect(getByText('A')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Props Combination Tests
  // --------------------------------------------------------------------------

  describe('Props Combinations', () => {
    it('renders with all optional props undefined', () => {
      const { getByText } = render(
        <ProfileHeader
          name="Test User"
          location="Test Location"
          showEditButton={undefined}
          onEditPress={undefined}
        />
      );
      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('Test Location')).toBeTruthy();
    });

    it('renders with showEditButton true but no onEditPress', () => {
      const { getByText } = render(
        <ProfileHeader
          name="Test User"
          location="Test Location"
          showEditButton
        />
      );
      expect(getByText('Edit')).toBeTruthy();
    });

    it('renders with onEditPress but showEditButton false', () => {
      const onEditPress = jest.fn();
      const { queryByText } = render(
        <ProfileHeader
          name="Test User"
          location="Test Location"
          showEditButton={false}
          onEditPress={onEditPress}
        />
      );
      expect(queryByText('Edit')).toBeNull();
    });

    it('renders with all props provided', () => {
      const onEditPress = jest.fn();
      const { getByText } = render(
        <ProfileHeader
          name="John Smith"
          location="New York, NY"
          showEditButton
          onEditPress={onEditPress}
        />
      );
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('New York, NY')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Styling Tests
  // --------------------------------------------------------------------------

  describe('Styling', () => {
    it('container has correct styling', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      const container = viewElements[0];
      const styles = Array.isArray(container?.props.style)
        ? container.props.style.flat()
        : [container?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }),
        ])
      );
    });

    it('name has correct text styling', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      const nameElement = getByText('John Smith');
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

    it('location text has correct styling', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      const locationElement = getByText('New York, NY');
      const styles = Array.isArray(locationElement.props.style)
        ? locationElement.props.style.flat()
        : [locationElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#737373',
          }),
        ])
      );
    });

    it('edit button text has correct styling', () => {
      const { getByText } = render(<ProfileHeader {...propsWithEdit} />);
      const editText = getByText('Edit');
      const styles = Array.isArray(editText.props.style)
        ? editText.props.style.flat()
        : [editText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#FFFFFF',
            fontWeight: '600',
          }),
        ])
      );
    });

    it('location row has correct flex styling', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);
      const locationText = getByText('New York, NY');
      const locationRow = locationText.parent;
      const styles = Array.isArray(locationRow?.props.style)
        ? locationRow.props.style.flat()
        : [locationRow?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
            alignItems: 'center',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Avatar Tests
  // --------------------------------------------------------------------------

  describe('Avatar', () => {
    it('renders avatar container', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);
      // Should have multiple view elements including avatar container
      expect(viewElements.length).toBeGreaterThan(1);
    });

    it('avatar has correct circular styling', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);

      // Find the avatar view (should have borderRadius: 50)
      const avatar = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) =>
            style?.borderRadius === 50 &&
            style?.width === 100 &&
            style?.height === 100
        );
      });

      expect(avatar).toBeTruthy();
    });

    it('avatar has correct dimensions', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);

      const avatar = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some(
          (style: any) => style?.width === 100 && style?.height === 100
        );
      });

      expect(avatar).toBeTruthy();
    });

    it('avatar container is positioned relatively', () => {
      const { UNSAFE_root } = render(<ProfileHeader {...defaultProps} />);
      const viewElements = UNSAFE_root.findAllByType(View as any);

      const avatarContainer = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) => style?.position === 'relative');
      });

      expect(avatarContainer).toBeTruthy();
    });

    it('edit button is absolutely positioned when shown', () => {
      const { getByText } = render(<ProfileHeader {...propsWithEdit} />);
      const editText = getByText('Edit');
      const editButton = editText.parent;
      const styles = Array.isArray(editButton?.props.style)
        ? editButton.props.style.flat()
        : [editButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: 'absolute',
            bottom: 0,
            right: 0,
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Component Update Tests
  // --------------------------------------------------------------------------

  describe('Component Updates', () => {
    it('updates when name prop changes', () => {
      const { rerender, getByText } = render(<ProfileHeader {...defaultProps} />);
      expect(getByText('John Smith')).toBeTruthy();

      rerender(<ProfileHeader name="Jane Doe" location="New York, NY" />);
      expect(getByText('Jane Doe')).toBeTruthy();
    });

    it('updates when location prop changes', () => {
      const { rerender, getByText } = render(<ProfileHeader {...defaultProps} />);
      expect(getByText('New York, NY')).toBeTruthy();

      rerender(<ProfileHeader name="John Smith" location="Los Angeles, CA" />);
      expect(getByText('Los Angeles, CA')).toBeTruthy();
    });

    it('updates when showEditButton changes from false to true', () => {
      const onEditPress = jest.fn();
      const { rerender, queryByText, getByText } = render(
        <ProfileHeader
          {...defaultProps}
          showEditButton={false}
          onEditPress={onEditPress}
        />
      );
      expect(queryByText('Edit')).toBeNull();

      rerender(
        <ProfileHeader
          {...defaultProps}
          showEditButton
          onEditPress={onEditPress}
        />
      );
      expect(getByText('Edit')).toBeTruthy();
    });

    it('updates when showEditButton changes from true to false', () => {
      const onEditPress = jest.fn();
      const { rerender, getByText, queryByText } = render(
        <ProfileHeader
          {...defaultProps}
          showEditButton
          onEditPress={onEditPress}
        />
      );
      expect(getByText('Edit')).toBeTruthy();

      rerender(
        <ProfileHeader
          {...defaultProps}
          showEditButton={false}
          onEditPress={onEditPress}
        />
      );
      expect(queryByText('Edit')).toBeNull();
    });

    it('updates when all props change simultaneously', () => {
      const onEditPress1 = jest.fn();
      const onEditPress2 = jest.fn();
      const { rerender, getByText } = render(
        <ProfileHeader
          name="Alice"
          location="Boston, MA"
          showEditButton={false}
          onEditPress={onEditPress1}
        />
      );

      rerender(
        <ProfileHeader
          name="Bob"
          location="Seattle, WA"
          showEditButton
          onEditPress={onEditPress2}
        />
      );

      expect(getByText('Bob')).toBeTruthy();
      expect(getByText('Seattle, WA')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('renders complete profile header with all features', () => {
      const onEditPress = jest.fn();
      const { getByText, getByTestId } = render(
        <ProfileHeader
          name="John Smith"
          location="New York, NY"
          showEditButton
          onEditPress={onEditPress}
        />
      );

      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('New York, NY')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
      expect(getByTestId('ionicon-location')).toBeTruthy();
      expect(getByTestId('ionicon-pencil')).toBeTruthy();
    });

    it('renders minimal profile header without edit', () => {
      const { getByText, getByTestId, queryByText } = render(
        <ProfileHeader name="John Smith" location="New York, NY" />
      );

      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('New York, NY')).toBeTruthy();
      expect(getByTestId('ionicon-location')).toBeTruthy();
      expect(queryByText('Edit')).toBeNull();
    });

    it('handles complete user interaction flow', () => {
      const onEditPress = jest.fn();
      const { getByText } = render(
        <ProfileHeader
          name="John Smith"
          location="New York, NY"
          showEditButton
          onEditPress={onEditPress}
        />
      );

      // User views profile
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('New York, NY')).toBeTruthy();

      // User clicks edit
      fireEvent.press(getByText('Edit'));
      expect(onEditPress).toHaveBeenCalledTimes(1);
    });

    it('maintains state across multiple renders', () => {
      const onEditPress = jest.fn();
      const { rerender, getByText } = render(
        <ProfileHeader
          name="John Smith"
          location="New York, NY"
          showEditButton
          onEditPress={onEditPress}
        />
      );

      expect(getByText('John Smith')).toBeTruthy();

      // Re-render with same props
      rerender(
        <ProfileHeader
          name="John Smith"
          location="New York, NY"
          showEditButton
          onEditPress={onEditPress}
        />
      );

      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('Edit')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles rapid edit button presses', () => {
      const onEditPress = jest.fn();
      const { getByText } = render(
        <ProfileHeader
          {...defaultProps}
          showEditButton
          onEditPress={onEditPress}
        />
      );

      const editButton = getByText('Edit');
      for (let i = 0; i < 10; i++) {
        fireEvent.press(editButton);
      }

      expect(onEditPress).toHaveBeenCalledTimes(10);
    });

    it('handles undefined onEditPress gracefully', () => {
      expect(() => {
        const { getByText } = render(
          <ProfileHeader {...defaultProps} showEditButton />
        );
        fireEvent.press(getByText('Edit'));
      }).not.toThrow();
    });

    it('handles extremely long name and location', () => {
      const longName = 'A'.repeat(200);
      const longLocation = 'B'.repeat(200);
      const { getByText } = render(
        <ProfileHeader name={longName} location={longLocation} />
      );

      expect(getByText(longName)).toBeTruthy();
      expect(getByText(longLocation)).toBeTruthy();
    });

    it('handles name and location with mixed content', () => {
      const { getByText } = render(
        <ProfileHeader
          name="John 🔧 Smith (Professional)"
          location="New York, NY 🗽 10001"
        />
      );

      expect(getByText('John 🔧 Smith (Professional)')).toBeTruthy();
      expect(getByText('New York, NY 🗽 10001')).toBeTruthy();
    });

    it('handles multiple icons correctly', () => {
      render(<ProfileHeader {...propsWithEdit} />);

      const locationIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'location'
      );
      const pencilIconCall = mockIonicons.mock.calls.find(
        (call) => call[0].name === 'pencil'
      );

      expect(locationIconCall).toBeTruthy();
      expect(pencilIconCall).toBeTruthy();
    });

    it('handles whitespace-only name', () => {
      const { getByText } = render(
        <ProfileHeader name="   " location="Test Location" />
      );
      expect(getByText('   ')).toBeTruthy();
    });

    it('handles whitespace-only location', () => {
      const { getByText } = render(
        <ProfileHeader name="Test User" location="   " />
      );
      expect(getByText('   ')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now();
      render(<ProfileHeader {...defaultProps} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles re-renders efficiently', () => {
      const { rerender } = render(<ProfileHeader {...defaultProps} />);

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        rerender(
          <ProfileHeader
            name={i % 2 === 0 ? 'John Smith' : 'Jane Doe'}
            location="New York, NY"
          />
        );
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('renders with edit button efficiently', () => {
      const startTime = Date.now();
      render(<ProfileHeader {...propsWithEdit} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  // --------------------------------------------------------------------------
  // Type Safety Tests
  // --------------------------------------------------------------------------

  describe('Type Safety', () => {
    it('accepts all valid prop combinations', () => {
      const validPropSets = [
        { name: 'Test', location: 'Location' },
        { name: 'Test', location: 'Location', showEditButton: false },
        { name: 'Test', location: 'Location', showEditButton: true },
        {
          name: 'Test',
          location: 'Location',
          showEditButton: true,
          onEditPress: jest.fn(),
        },
      ];

      validPropSets.forEach((props) => {
        expect(() => {
          render(<ProfileHeader {...props} />);
        }).not.toThrow();
      });
    });

    it('showEditButton is optional with correct default', () => {
      const { queryByText } = render(
        <ProfileHeader name="Test" location="Location" />
      );
      expect(queryByText('Edit')).toBeNull();
    });

    it('onEditPress is optional', () => {
      expect(() => {
        render(
          <ProfileHeader name="Test" location="Location" showEditButton />
        );
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('renders semantic text elements', () => {
      const { getByText } = render(<ProfileHeader {...defaultProps} />);

      const nameElement = getByText('John Smith');
      const locationElement = getByText('New York, NY');

      expect(nameElement.type).toBe(Text);
      expect(locationElement.type).toBe(Text);
    });

    it('edit button is tappable', () => {
      const onEditPress = jest.fn();
      const { getByText } = render(
        <ProfileHeader {...defaultProps} showEditButton onEditPress={onEditPress} />
      );

      const editButton = getByText('Edit').parent;
      expect(editButton?.type).toBe(TouchableOpacity);
    });

    it('maintains proper semantic structure', () => {
      const { getByText, getByTestId } = render(<ProfileHeader {...propsWithEdit} />);

      // Name should be prominent
      expect(getByText('John Smith')).toBeTruthy();

      // Location should be with icon
      expect(getByText('New York, NY')).toBeTruthy();
      expect(getByTestId('ionicon-location')).toBeTruthy();

      // Edit should be actionable
      expect(getByText('Edit')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Snapshot Tests
  // --------------------------------------------------------------------------

  describe('Snapshot Stability', () => {
    it('renders consistently without edit button', () => {
      const { toJSON } = render(<ProfileHeader {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders consistently with edit button', () => {
      const { toJSON } = render(<ProfileHeader {...propsWithEdit} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders consistently with different names and locations', () => {
      const { toJSON } = render(
        <ProfileHeader name="Alice Johnson" location="San Francisco, CA" />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
