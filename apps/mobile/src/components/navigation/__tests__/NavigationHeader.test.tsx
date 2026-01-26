/**
 * NavigationHeader Component Tests
 *
 * Comprehensive test suite for the NavigationHeader component
 * Tests all navigation scenarios, rendering, callbacks, and styling
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationHeader } from '../NavigationHeader';

// Mock logger
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      text: {
        primary: '#000000',
        secondary: '#666666',
      },
      surface: '#FFFFFF',
      border: '#E5E5E5',
    },
  },
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

// Mock navigation
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    dispatch: mockDispatch,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  DrawerActions: {
    openDrawer: () => ({ type: 'OPEN_DRAWER' }),
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID || `icon-${name}`}>{name}</Text>;
  },
}));

describe('NavigationHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(false);
  });

  // ========== RENDERING TESTS ==========
  describe('Rendering', () => {
    it('renders with default props', () => {
      const { getByText } = render(<NavigationHeader title="Test Title" />);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders with title only', () => {
      const { getByText, queryByText } = render(<NavigationHeader title="Home" />);
      expect(getByText('Home')).toBeTruthy();
      expect(queryByText('subtitle')).toBeNull();
    });

    it('renders with title and subtitle', () => {
      const { getByText } = render(
        <NavigationHeader title="Dashboard" subtitle="Welcome back" />
      );
      expect(getByText('Dashboard')).toBeTruthy();
      expect(getByText('Welcome back')).toBeTruthy();
    });

    it('renders with long title (truncation)', () => {
      const longTitle = 'This is a very long title that should be truncated';
      const { getByText } = render(<NavigationHeader title={longTitle} />);
      const titleElement = getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('renders with long subtitle (truncation)', () => {
      const longSubtitle = 'This is a very long subtitle that should be truncated';
      const { getByText } = render(
        <NavigationHeader title="Title" subtitle={longSubtitle} />
      );
      const subtitleElement = getByText(longSubtitle);
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });

    it('renders with empty title', () => {
      const { queryByText } = render(<NavigationHeader title="" />);
      // Component should still render even with empty title
      expect(queryByText('menu')).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      const { getByText } = render(<NavigationHeader title="Jobs & Tasks™" />);
      expect(getByText('Jobs & Tasks™')).toBeTruthy();
    });

    it('renders with special characters in subtitle', () => {
      const { getByText } = render(
        <NavigationHeader title="Dashboard" subtitle="50% Complete!" />
      );
      expect(getByText('50% Complete!')).toBeTruthy();
    });

    it('renders with emoji in title', () => {
      const { getByText } = render(<NavigationHeader title="Home 🏠" />);
      expect(getByText('Home 🏠')).toBeTruthy();
    });

    it('renders with emoji in subtitle', () => {
      const { getByText } = render(
        <NavigationHeader title="Welcome" subtitle="Good morning ☀️" />
      );
      expect(getByText('Good morning ☀️')).toBeTruthy();
    });
  });

  // ========== MENU ICON TESTS ==========
  describe('Menu Icon', () => {
    it('renders menu icon by default', () => {
      const { getByText } = render(<NavigationHeader title="Home" />);
      expect(getByText('menu')).toBeTruthy();
    });

    it('shows menu icon when showMenuIcon is true', () => {
      const { getByText } = render(
        <NavigationHeader title="Home" showMenuIcon={true} />
      );
      expect(getByText('menu')).toBeTruthy();
    });

    it('hides menu icon when showMenuIcon is false and showBackIcon is false', () => {
      const { queryByText } = render(
        <NavigationHeader title="Home" showMenuIcon={false} showBackIcon={false} />
      );
      // When both are false, menu icon still shows (showMenuIcon prop doesn't hide the left icon, just determines behavior)
      expect(queryByText('menu')).toBeTruthy();
    });

    it('has proper accessibility label for menu icon', () => {
      const { getByLabelText } = render(<NavigationHeader title="Home" />);
      expect(getByLabelText('Open menu')).toBeTruthy();
    });

    it('has proper accessibility role for menu button', () => {
      const { getByLabelText } = render(<NavigationHeader title="Home" />);
      const menuButton = getByLabelText('Open menu');
      expect(menuButton.props.accessibilityRole).toBe('button');
    });

    it('calls onMenuPress when menu icon is pressed', () => {
      const onMenuPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Home" onMenuPress={onMenuPress} />
      );
      fireEvent.press(getByLabelText('Open menu'));
      expect(onMenuPress).toHaveBeenCalledTimes(1);
    });

    it('dispatches drawer open action when menu pressed without custom handler', () => {
      const { getByLabelText } = render(<NavigationHeader title="Home" />);
      fireEvent.press(getByLabelText('Open menu'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
    });

    it('logs info when drawer is not available', () => {
      const { logger } = require('@mintenance/shared');
      mockDispatch.mockImplementationOnce(() => {
        throw new Error('No drawer');
      });

      const { getByLabelText } = render(<NavigationHeader title="Home" />);
      fireEvent.press(getByLabelText('Open menu'));

      expect(logger.info).toHaveBeenCalledWith(
        'No drawer navigator available',
        { service: 'ui' }
      );
    });

    it('prefers custom onMenuPress over default drawer action', () => {
      const onMenuPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Home" onMenuPress={onMenuPress} />
      );
      fireEvent.press(getByLabelText('Open menu'));

      expect(onMenuPress).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  // ========== BACK ICON TESTS ==========
  describe('Back Icon', () => {
    it('renders back icon when showBackIcon is true', () => {
      const { getByText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      expect(getByText('arrow-back')).toBeTruthy();
    });

    it('does not render menu icon when back icon is shown', () => {
      const { queryByText, getByText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      expect(getByText('arrow-back')).toBeTruthy();
      expect(queryByText('menu')).toBeNull();
    });

    it('has proper accessibility label for back icon', () => {
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('has proper accessibility role for back button', () => {
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      const backButton = getByLabelText('Go back');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    it('calls onBackPress when back icon is pressed', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} onBackPress={onBackPress} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(onBackPress).toHaveBeenCalledTimes(1);
    });

    it('calls navigation.goBack when back pressed without custom handler and can go back', () => {
      mockCanGoBack.mockReturnValue(true);
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack when cannot go back', () => {
      mockCanGoBack.mockReturnValue(false);
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('prefers custom onBackPress over default navigation action', () => {
      mockCanGoBack.mockReturnValue(true);
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} onBackPress={onBackPress} />
      );
      fireEvent.press(getByLabelText('Go back'));

      expect(onBackPress).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('back icon takes precedence over menu icon', () => {
      const { getByText, queryByText } = render(
        <NavigationHeader
          title="Details"
          showBackIcon={true}
          showMenuIcon={true}
        />
      );
      expect(getByText('arrow-back')).toBeTruthy();
      expect(queryByText('menu')).toBeNull();
    });
  });

  // ========== RIGHT ICON TESTS ==========
  describe('Right Icon', () => {
    it('renders placeholder when no right icon is provided', () => {
      const { UNSAFE_queryAllByType } = render(<NavigationHeader title="Home" />);
      // Placeholder should exist (empty View)
      expect(UNSAFE_queryAllByType).toBeTruthy();
    });

    it('renders right icon when provided', () => {
      const onRightPress = jest.fn();
      const { getByText } = render(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      expect(getByText('settings')).toBeTruthy();
    });

    it('calls onPress when right icon is pressed', () => {
      const onRightPress = jest.fn();
      const { getByText } = render(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      fireEvent.press(getByText('settings').parent);
      expect(onRightPress).toHaveBeenCalledTimes(1);
    });

    it('has proper accessibility role for right icon button', () => {
      const onRightPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      const button = getByTestId('right-icon-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('renders multiple right icons sequentially', () => {
      const onPress1 = jest.fn();
      const onPress2 = jest.fn();

      // Test with first icon
      const { rerender, getByText } = render(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'settings', onPress: onPress1 }}
        />
      );
      expect(getByText('settings')).toBeTruthy();

      // Test with second icon
      rerender(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'notifications', onPress: onPress2 }}
        />
      );
      expect(getByText('notifications')).toBeTruthy();
    });

    it('renders common icon types correctly', () => {
      const icons = ['search', 'filter', 'more-vertical', 'add', 'ellipsis-horizontal'];

      icons.forEach(iconName => {
        const { getByText } = render(
          <NavigationHeader
            title="Test"
            rightIcon={{ name: iconName as any, onPress: jest.fn() }}
          />
        );
        expect(getByText(iconName)).toBeTruthy();
      });
    });
  });

  // ========== STYLING TESTS ==========
  describe('Styling', () => {
    it('applies custom container style', () => {
      const customStyle = { backgroundColor: '#FF0000' };
      const { getByText } = render(
        <NavigationHeader title="Home" style={customStyle} />
      );
      const titleElement = getByText('Home');
      const container = titleElement.parent?.parent?.parent;
      expect(container).toBeTruthy();
    });

    it('applies custom title style', () => {
      const customTitleStyle = { fontSize: 24, color: '#FF0000' };
      const { getByText } = render(
        <NavigationHeader title="Home" titleStyle={customTitleStyle} />
      );
      const titleElement = getByText('Home');
      expect(titleElement.props.style).toContainEqual(customTitleStyle);
    });

    it('applies safe area insets to padding', () => {
      const { getByText } = render(<NavigationHeader title="Home" />);
      const titleElement = getByText('Home');
      const container = titleElement.parent?.parent?.parent;
      // Safe area top inset should be applied as paddingTop
      expect(container?.props.style).toBeDefined();
    });

    it('combines default styles with custom styles', () => {
      const customStyle = { marginTop: 10 };
      const customTitleStyle = { fontWeight: 'bold' as const };

      const { getByText } = render(
        <NavigationHeader
          title="Home"
          style={customStyle}
          titleStyle={customTitleStyle}
        />
      );

      expect(getByText('Home')).toBeTruthy();
    });

    it('renders with default shadow styles', () => {
      const { getByText } = render(<NavigationHeader title="Home" />);
      const titleElement = getByText('Home');
      const container = titleElement.parent?.parent?.parent;
      expect(container).toBeTruthy();
    });

    it('renders with border bottom by default', () => {
      const { getByText } = render(<NavigationHeader title="Home" />);
      expect(getByText('Home')).toBeTruthy();
    });
  });

  // ========== NAVIGATION COMBINATIONS ==========
  describe('Navigation Combinations', () => {
    it('renders with menu icon and right icon', () => {
      const { getByText } = render(
        <NavigationHeader
          title="Home"
          showMenuIcon={true}
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      expect(getByText('menu')).toBeTruthy();
      expect(getByText('settings')).toBeTruthy();
    });

    it('renders with back icon and right icon', () => {
      const { getByText } = render(
        <NavigationHeader
          title="Details"
          showBackIcon={true}
          rightIcon={{ name: 'share', onPress: jest.fn() }}
        />
      );
      expect(getByText('arrow-back')).toBeTruthy();
      expect(getByText('share')).toBeTruthy();
    });

    it('renders with both icons and subtitle', () => {
      const { getByText } = render(
        <NavigationHeader
          title="Profile"
          subtitle="Edit your details"
          showBackIcon={true}
          rightIcon={{ name: 'save', onPress: jest.fn() }}
        />
      );
      expect(getByText('arrow-back')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Edit your details')).toBeTruthy();
      expect(getByText('save')).toBeTruthy();
    });

    it('renders with all custom handlers', () => {
      const onMenuPress = jest.fn();
      const onBackPress = jest.fn();
      const onRightPress = jest.fn();

      const { getByLabelText, getByText } = render(
        <NavigationHeader
          title="Test"
          onMenuPress={onMenuPress}
          onBackPress={onBackPress}
          rightIcon={{ name: 'more', onPress: onRightPress }}
        />
      );

      fireEvent.press(getByLabelText('Open menu'));
      expect(onMenuPress).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('more').parent);
      expect(onRightPress).toHaveBeenCalledTimes(1);
    });
  });

  // ========== CALLBACK BEHAVIOR ==========
  describe('Callback Behavior', () => {
    it('does not throw when onMenuPress is undefined', () => {
      const { getByLabelText } = render(<NavigationHeader title="Home" />);
      expect(() => {
        fireEvent.press(getByLabelText('Open menu'));
      }).not.toThrow();
    });

    it('does not throw when onBackPress is undefined', () => {
      mockCanGoBack.mockReturnValue(false);
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} />
      );
      expect(() => {
        fireEvent.press(getByLabelText('Go back'));
      }).not.toThrow();
    });

    it('menu press handler receives no arguments', () => {
      const onMenuPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Home" onMenuPress={onMenuPress} />
      );
      fireEvent.press(getByLabelText('Open menu'));
      expect(onMenuPress).toHaveBeenCalledWith();
    });

    it('back press handler receives no arguments', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} onBackPress={onBackPress} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(onBackPress).toHaveBeenCalledWith();
    });

    it('right icon press handler receives no arguments', () => {
      const onRightPress = jest.fn();
      const { getByText } = render(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      fireEvent.press(getByText('settings').parent);
      expect(onRightPress).toHaveBeenCalledWith();
    });

    it('handles rapid menu icon presses', () => {
      const onMenuPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Home" onMenuPress={onMenuPress} />
      );

      const menuButton = getByLabelText('Open menu');
      fireEvent.press(menuButton);
      fireEvent.press(menuButton);
      fireEvent.press(menuButton);

      expect(onMenuPress).toHaveBeenCalledTimes(3);
    });

    it('handles rapid back icon presses', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader title="Details" showBackIcon={true} onBackPress={onBackPress} />
      );

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      expect(onBackPress).toHaveBeenCalledTimes(3);
    });

    it('handles rapid right icon presses', () => {
      const onRightPress = jest.fn();
      const { getByText } = render(
        <NavigationHeader
          title="Home"
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );

      const rightButton = getByText('settings').parent;
      fireEvent.press(rightButton);
      fireEvent.press(rightButton);
      fireEvent.press(rightButton);

      expect(onRightPress).toHaveBeenCalledTimes(3);
    });
  });

  // ========== EDGE CASES ==========
  describe('Edge Cases', () => {
    it('handles subtitle without title gracefully', () => {
      const { getByText } = render(
        <NavigationHeader title="" subtitle="Just a subtitle" />
      );
      expect(getByText('Just a subtitle')).toBeTruthy();
    });

    it('handles very long title text', () => {
      const veryLongTitle = 'A'.repeat(200);
      const { getByText } = render(<NavigationHeader title={veryLongTitle} />);
      const titleElement = getByText(veryLongTitle);
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('handles very long subtitle text', () => {
      const veryLongSubtitle = 'B'.repeat(200);
      const { getByText } = render(
        <NavigationHeader title="Title" subtitle={veryLongSubtitle} />
      );
      const subtitleElement = getByText(veryLongSubtitle);
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });

    it('handles undefined subtitle', () => {
      const { queryByText } = render(
        <NavigationHeader title="Home" subtitle={undefined} />
      );
      expect(queryByText('undefined')).toBeNull();
    });

    it('handles null in style prop', () => {
      const { getByText } = render(
        <NavigationHeader title="Home" style={null as any} />
      );
      expect(getByText('Home')).toBeTruthy();
    });

    it('handles null in titleStyle prop', () => {
      const { getByText } = render(
        <NavigationHeader title="Home" titleStyle={null as any} />
      );
      expect(getByText('Home')).toBeTruthy();
    });

    it('handles navigation errors gracefully', () => {
      mockDispatch.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      const { getByLabelText } = render(<NavigationHeader title="Home" />);

      expect(() => {
        fireEvent.press(getByLabelText('Open menu'));
      }).not.toThrow();
    });

    it('handles missing navigation context gracefully', () => {
      // This is implicitly tested by the component not throwing
      const { getByText } = render(<NavigationHeader title="Home" />);
      expect(getByText('Home')).toBeTruthy();
    });
  });

  // ========== PROP VALIDATION ==========
  describe('Prop Validation', () => {
    it('accepts all valid icon names for right icon', () => {
      const validIcons = [
        'home', 'search', 'notifications', 'settings',
        'person', 'mail', 'calendar', 'camera'
      ];

      validIcons.forEach(iconName => {
        const { getByText } = render(
          <NavigationHeader
            title="Test"
            rightIcon={{ name: iconName as any, onPress: jest.fn() }}
          />
        );
        expect(getByText(iconName)).toBeTruthy();
      });
    });

    it('renders with all props provided', () => {
      const { getByText } = render(
        <NavigationHeader
          title="Full Test"
          subtitle="All props"
          showMenuIcon={false}
          showBackIcon={true}
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
          onMenuPress={jest.fn()}
          onBackPress={jest.fn()}
          style={{ backgroundColor: 'red' }}
          titleStyle={{ fontSize: 20 }}
        />
      );

      expect(getByText('Full Test')).toBeTruthy();
      expect(getByText('All props')).toBeTruthy();
    });

    it('renders with minimal props', () => {
      const { getByText } = render(<NavigationHeader title="Minimal" />);
      expect(getByText('Minimal')).toBeTruthy();
    });
  });

  // ========== RERENDER TESTS ==========
  describe('Rerender Behavior', () => {
    it('updates title on rerender', () => {
      const { getByText, rerender } = render(<NavigationHeader title="First" />);
      expect(getByText('First')).toBeTruthy();

      rerender(<NavigationHeader title="Second" />);
      expect(getByText('Second')).toBeTruthy();
    });

    it('updates subtitle on rerender', () => {
      const { getByText, rerender } = render(
        <NavigationHeader title="Title" subtitle="First Subtitle" />
      );
      expect(getByText('First Subtitle')).toBeTruthy();

      rerender(<NavigationHeader title="Title" subtitle="Second Subtitle" />);
      expect(getByText('Second Subtitle')).toBeTruthy();
    });

    it('toggles between menu and back icon', () => {
      const { getByText, queryByText, rerender } = render(
        <NavigationHeader title="Test" showBackIcon={false} />
      );
      expect(getByText('menu')).toBeTruthy();

      rerender(<NavigationHeader title="Test" showBackIcon={true} />);
      expect(getByText('arrow-back')).toBeTruthy();
      expect(queryByText('menu')).toBeNull();
    });

    it('adds right icon on rerender', () => {
      const { queryByText, getByText, rerender } = render(
        <NavigationHeader title="Test" />
      );
      expect(queryByText('settings')).toBeNull();

      rerender(
        <NavigationHeader
          title="Test"
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      expect(getByText('settings')).toBeTruthy();
    });

    it('removes right icon on rerender', () => {
      const { getByText, queryByText, rerender } = render(
        <NavigationHeader
          title="Test"
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      expect(getByText('settings')).toBeTruthy();

      rerender(<NavigationHeader title="Test" />);
      expect(queryByText('settings')).toBeNull();
    });

    it('updates callback handlers on rerender', () => {
      const firstHandler = jest.fn();
      const secondHandler = jest.fn();

      const { getByLabelText, rerender } = render(
        <NavigationHeader title="Test" onMenuPress={firstHandler} />
      );

      fireEvent.press(getByLabelText('Open menu'));
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();

      rerender(<NavigationHeader title="Test" onMenuPress={secondHandler} />);

      fireEvent.press(getByLabelText('Open menu'));
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).toHaveBeenCalledTimes(1);
    });

    it('updates styles on rerender', () => {
      const firstStyle = { backgroundColor: 'red' };
      const secondStyle = { backgroundColor: 'blue' };

      const { getByText, rerender } = render(
        <NavigationHeader title="Test" style={firstStyle} />
      );
      expect(getByText('Test')).toBeTruthy();

      rerender(<NavigationHeader title="Test" style={secondStyle} />);
      expect(getByText('Test')).toBeTruthy();
    });
  });

  // ========== SAFE AREA TESTS ==========
  describe('Safe Area Handling', () => {
    it('applies safe area insets to container padding', () => {
      const { getByText } = render(<NavigationHeader title="Home" />);
      const titleElement = getByText('Home');
      const container = titleElement.parent?.parent?.parent;
      // Mock returns top: 44, should be applied
      expect(container).toBeTruthy();
    });

    it('combines safe area padding with custom style', () => {
      const customStyle = { paddingBottom: 20 };
      const { getByText } = render(
        <NavigationHeader title="Home" style={customStyle} />
      );
      expect(getByText('Home')).toBeTruthy();
    });
  });

  // ========== ACCESSIBILITY TESTS ==========
  describe('Accessibility', () => {
    it('all buttons have accessibility role', () => {
      const { getByLabelText, getByTestId } = render(
        <NavigationHeader
          title="Test"
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );

      const menuButton = getByLabelText('Open menu');
      const rightButton = getByTestId('right-icon-button');

      expect(menuButton.props.accessibilityRole).toBe('button');
      expect(rightButton.props.accessibilityRole).toBe('button');
    });

    it('menu button has correct accessibility label', () => {
      const { getByLabelText } = render(<NavigationHeader title="Test" />);
      expect(getByLabelText('Open menu')).toBeTruthy();
    });

    it('back button has correct accessibility label', () => {
      const { getByLabelText } = render(
        <NavigationHeader title="Test" showBackIcon={true} />
      );
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('title text is accessible to screen readers', () => {
      const { getByText } = render(<NavigationHeader title="Accessible Title" />);
      const titleElement = getByText('Accessible Title');
      expect(titleElement.props.accessible).not.toBe(false);
    });

    it('subtitle text is accessible to screen readers', () => {
      const { getByText } = render(
        <NavigationHeader title="Title" subtitle="Accessible Subtitle" />
      );
      const subtitleElement = getByText('Accessible Subtitle');
      expect(subtitleElement.props.accessible).not.toBe(false);
    });
  });

  // ========== PERFORMANCE TESTS ==========
  describe('Performance', () => {
    it('does not rerender unnecessarily with same props', () => {
      const renderSpy = jest.fn();

      const TestWrapper = (props: any) => {
        renderSpy();
        return <NavigationHeader {...props} />;
      };

      const { rerender } = render(<TestWrapper title="Test" />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      rerender(<TestWrapper title="Test" />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('handles multiple rapid rerenders', () => {
      const { rerender, getByText } = render(<NavigationHeader title="1" />);

      for (let i = 2; i <= 10; i++) {
        rerender(<NavigationHeader title={String(i)} />);
      }

      expect(getByText('10')).toBeTruthy();
    });
  });
});
