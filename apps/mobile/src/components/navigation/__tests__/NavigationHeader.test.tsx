/**
 * NavigationHeader Component Tests
 *
 * Test suite for the NavigationHeader component (Mint Editorial redesign).
 * The header renders an app-logo on the left by default, an optional back
 * button, a centered title/subtitle, and a right region that shows either a
 * custom right icon, a notification bell + avatar (with dropdown menu), or an
 * empty placeholder.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationHeader } from '../NavigationHeader';

// Mock navigation
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

// Mock Ionicons - render the icon name as text so it can be queried
jest.mock('@expo/vector-icons', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Ionicons: ({ name, testID }: any) => {
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
      const { getByText } = render(<NavigationHeader title='Test Title' />);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders the app logo by default (no back icon)', () => {
      const { getByTestId } = render(<NavigationHeader title='Home' />);
      expect(getByTestId('menu-icon-button')).toBeTruthy();
    });

    it('renders with title only (no subtitle)', () => {
      const { getByText, queryByText } = render(
        <NavigationHeader title='Home' />
      );
      expect(getByText('Home')).toBeTruthy();
      expect(queryByText('subtitle')).toBeNull();
    });

    it('renders with title and subtitle', () => {
      const { getByText } = render(
        <NavigationHeader title='Dashboard' subtitle='Welcome back' />
      );
      expect(getByText('Dashboard')).toBeTruthy();
      expect(getByText('Welcome back')).toBeTruthy();
    });

    it('renders title with single-line truncation', () => {
      const longTitle = 'This is a very long title that should be truncated';
      const { getByText } = render(<NavigationHeader title={longTitle} />);
      const titleElement = getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('renders subtitle with single-line truncation', () => {
      const longSubtitle =
        'This is a very long subtitle that should be truncated';
      const { getByText } = render(
        <NavigationHeader title='Title' subtitle={longSubtitle} />
      );
      const subtitleElement = getByText(longSubtitle);
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });

    it('renders with empty title (logo still present)', () => {
      const { getByTestId } = render(<NavigationHeader title='' />);
      expect(getByTestId('menu-icon-button')).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      const { getByText } = render(<NavigationHeader title='Jobs & Tasks™' />);
      expect(getByText('Jobs & Tasks™')).toBeTruthy();
    });

    it('renders with special characters in subtitle', () => {
      const { getByText } = render(
        <NavigationHeader title='Dashboard' subtitle='50% Complete!' />
      );
      expect(getByText('50% Complete!')).toBeTruthy();
    });

    it('renders with emoji in title', () => {
      const { getByText } = render(<NavigationHeader title='Home 🏠' />);
      expect(getByText('Home 🏠')).toBeTruthy();
    });

    it('renders with emoji in subtitle', () => {
      const { getByText } = render(
        <NavigationHeader title='Welcome' subtitle='Good morning ☀️' />
      );
      expect(getByText('Good morning ☀️')).toBeTruthy();
    });
  });

  // ========== BACK ICON TESTS ==========
  describe('Back Icon', () => {
    it('renders back icon when showBackIcon is true', () => {
      const { getByText } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      expect(getByText('arrow-back')).toBeTruthy();
    });

    it('does not render the logo when back icon is shown', () => {
      const { queryByTestId, getByTestId } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      expect(getByTestId('back-icon-button')).toBeTruthy();
      expect(queryByTestId('menu-icon-button')).toBeNull();
    });

    it('has proper accessibility label for back icon', () => {
      const { getByLabelText } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('has proper accessibility role for back button', () => {
      const { getByLabelText } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      const backButton = getByLabelText('Go back');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    it('calls onBackPress when back icon is pressed', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader
          title='Details'
          showBackIcon={true}
          onBackPress={onBackPress}
        />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(onBackPress).toHaveBeenCalledTimes(1);
    });

    it('calls navigation.goBack when back pressed without custom handler and can go back', () => {
      mockCanGoBack.mockReturnValue(true);
      const { getByLabelText } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack when cannot go back', () => {
      mockCanGoBack.mockReturnValue(false);
      const { getByLabelText } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('prefers custom onBackPress over default navigation action', () => {
      mockCanGoBack.mockReturnValue(true);
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader
          title='Details'
          showBackIcon={true}
          onBackPress={onBackPress}
        />
      );
      fireEvent.press(getByLabelText('Go back'));

      expect(onBackPress).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ========== RIGHT ICON TESTS ==========
  describe('Right Icon', () => {
    it('renders placeholder when no right icon / actions provided', () => {
      const { queryByTestId } = render(<NavigationHeader title='Home' />);
      // No custom right icon, no notification/avatar actions
      expect(queryByTestId('right-icon-button')).toBeNull();
      expect(queryByTestId('notification-button')).toBeNull();
      expect(queryByTestId('user-avatar-button')).toBeNull();
    });

    it('renders right icon when provided', () => {
      const onRightPress = jest.fn();
      const { getByText } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      expect(getByText('settings')).toBeTruthy();
    });

    it('calls onPress when right icon is pressed', () => {
      const onRightPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      fireEvent.press(getByTestId('right-icon-button'));
      expect(onRightPress).toHaveBeenCalledTimes(1);
    });

    it('has proper accessibility role for right icon button', () => {
      const onRightPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      const button = getByTestId('right-icon-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('renders multiple right icons sequentially', () => {
      const { rerender, getByText } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      expect(getByText('settings')).toBeTruthy();

      rerender(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'notifications', onPress: jest.fn() }}
        />
      );
      expect(getByText('notifications')).toBeTruthy();
    });

    it('renders common icon types correctly', () => {
      const icons = [
        'search',
        'filter',
        'ellipsis-vertical',
        'add',
        'ellipsis-horizontal',
      ];

      icons.forEach((iconName) => {
        const { getByText } = render(
          <NavigationHeader
            title='Test'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rightIcon={{ name: iconName as any, onPress: jest.fn() }}
          />
        );
        expect(getByText(iconName)).toBeTruthy();
      });
    });
  });

  // ========== NOTIFICATION & AVATAR TESTS ==========
  describe('Notification & Avatar Actions', () => {
    it('renders notification button when onNotificationPress provided', () => {
      const { getByTestId } = render(
        <NavigationHeader title='Home' onNotificationPress={jest.fn()} />
      );
      expect(getByTestId('notification-button')).toBeTruthy();
    });

    it('calls onNotificationPress when bell is pressed', () => {
      const onNotificationPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title='Home'
          onNotificationPress={onNotificationPress}
        />
      );
      fireEvent.press(getByTestId('notification-button'));
      expect(onNotificationPress).toHaveBeenCalledTimes(1);
    });

    it('shows unread badge count and labels it', () => {
      const { getByText, getByLabelText } = render(
        <NavigationHeader
          title='Home'
          onNotificationPress={jest.fn()}
          notificationCount={3}
        />
      );
      expect(getByText('3')).toBeTruthy();
      expect(getByLabelText('Notifications, 3 unread')).toBeTruthy();
    });

    it('caps the badge count display at 9+', () => {
      const { getByText } = render(
        <NavigationHeader
          title='Home'
          onNotificationPress={jest.fn()}
          notificationCount={42}
        />
      );
      expect(getByText('9+')).toBeTruthy();
    });

    it('renders avatar button with initials', () => {
      const { getByTestId, getByText } = render(
        <NavigationHeader title='Home' userInitials='JD' />
      );
      expect(getByTestId('user-avatar-button')).toBeTruthy();
      expect(getByText('JD')).toBeTruthy();
    });

    it('calls onUserPress when avatar pressed and no menu items', () => {
      const onUserPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title='Home'
          userInitials='JD'
          onUserPress={onUserPress}
        />
      );
      fireEvent.press(getByTestId('user-avatar-button'));
      expect(onUserPress).toHaveBeenCalledTimes(1);
    });

    it('opens dropdown menu when avatar pressed with menu items', () => {
      const itemPress = jest.fn();
      const { getByTestId, getByText } = render(
        <NavigationHeader
          title='Home'
          userInitials='JD'
          userName='Jane Doe'
          menuItems={[
            {
              label: 'Settings',
              icon: 'settings',
              iconColor: '#000',
              iconBg: '#eee',
              onPress: itemPress,
            },
          ]}
        />
      );
      fireEvent.press(getByTestId('user-avatar-button'));
      expect(getByText('Settings')).toBeTruthy();
      expect(getByText('Jane Doe')).toBeTruthy();
    });

    it('invokes a menu item handler when tapped', () => {
      const itemPress = jest.fn();
      const { getByTestId, getByText } = render(
        <NavigationHeader
          title='Home'
          userInitials='JD'
          menuItems={[
            {
              label: 'Log out',
              icon: 'log-out',
              iconColor: '#000',
              iconBg: '#eee',
              onPress: itemPress,
            },
          ]}
        />
      );
      fireEvent.press(getByTestId('user-avatar-button'));
      fireEvent.press(getByText('Log out'));
      expect(itemPress).toHaveBeenCalledTimes(1);
    });

    it('right icon takes precedence over notification/avatar actions', () => {
      const { getByTestId, queryByTestId } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
          onNotificationPress={jest.fn()}
          userInitials='JD'
        />
      );
      expect(getByTestId('right-icon-button')).toBeTruthy();
      expect(queryByTestId('notification-button')).toBeNull();
      expect(queryByTestId('user-avatar-button')).toBeNull();
    });
  });

  // ========== STYLING TESTS ==========
  describe('Styling', () => {
    it('applies custom container style without crashing', () => {
      const customStyle = { backgroundColor: '#FF0000' };
      const { getByText } = render(
        <NavigationHeader title='Home' style={customStyle} />
      );
      expect(getByText('Home')).toBeTruthy();
    });

    it('applies custom title style', () => {
      const customTitleStyle = { fontSize: 24, color: '#FF0000' };
      const { getByText } = render(
        <NavigationHeader title='Home' titleStyle={customTitleStyle} />
      );
      const titleElement = getByText('Home');
      expect(titleElement.props.style).toContainEqual(customTitleStyle);
    });

    it('applies tintColor to the title', () => {
      const { getByText } = render(
        <NavigationHeader title='Home' tintColor='#123456' />
      );
      const titleElement = getByText('Home');
      expect(titleElement.props.style).toContainEqual({ color: '#123456' });
    });

    it('combines default styles with custom styles', () => {
      const { getByText } = render(
        <NavigationHeader
          title='Home'
          style={{ marginTop: 10 }}
          titleStyle={{ fontWeight: 'bold' as const }}
        />
      );
      expect(getByText('Home')).toBeTruthy();
    });
  });

  // ========== CALLBACK BEHAVIOR ==========
  describe('Callback Behavior', () => {
    it('does not throw when onBackPress is undefined and cannot go back', () => {
      mockCanGoBack.mockReturnValue(false);
      const { getByLabelText } = render(
        <NavigationHeader title='Details' showBackIcon={true} />
      );
      expect(() => {
        fireEvent.press(getByLabelText('Go back'));
      }).not.toThrow();
    });

    it('back press handler receives no arguments', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader
          title='Details'
          showBackIcon={true}
          onBackPress={onBackPress}
        />
      );
      fireEvent.press(getByLabelText('Go back'));
      expect(onBackPress).toHaveBeenCalledWith();
    });

    it('right icon press handler receives no arguments', () => {
      const onRightPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );
      fireEvent.press(getByTestId('right-icon-button'));
      expect(onRightPress).toHaveBeenCalledWith();
    });

    it('handles rapid back icon presses', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <NavigationHeader
          title='Details'
          showBackIcon={true}
          onBackPress={onBackPress}
        />
      );

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      expect(onBackPress).toHaveBeenCalledTimes(3);
    });

    it('handles rapid right icon presses', () => {
      const onRightPress = jest.fn();
      const { getByTestId } = render(
        <NavigationHeader
          title='Home'
          rightIcon={{ name: 'settings', onPress: onRightPress }}
        />
      );

      const rightButton = getByTestId('right-icon-button');
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
        <NavigationHeader title='' subtitle='Just a subtitle' />
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
        <NavigationHeader title='Title' subtitle={veryLongSubtitle} />
      );
      const subtitleElement = getByText(veryLongSubtitle);
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });

    it('handles undefined subtitle', () => {
      const { queryByText } = render(
        <NavigationHeader title='Home' subtitle={undefined} />
      );
      expect(queryByText('undefined')).toBeNull();
    });

    it('handles null in style prop', () => {
      const { getByText } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <NavigationHeader title='Home' style={null as any} />
      );
      expect(getByText('Home')).toBeTruthy();
    });

    it('handles null in titleStyle prop', () => {
      const { getByText } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <NavigationHeader title='Home' titleStyle={null as any} />
      );
      expect(getByText('Home')).toBeTruthy();
    });
  });

  // ========== PROP VALIDATION ==========
  describe('Prop Validation', () => {
    it('accepts valid icon names for right icon', () => {
      const validIcons = [
        'home',
        'search',
        'notifications',
        'settings',
        'person',
      ];

      validIcons.forEach((iconName) => {
        const { getByText } = render(
          <NavigationHeader
            title='Test'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rightIcon={{ name: iconName as any, onPress: jest.fn() }}
          />
        );
        expect(getByText(iconName)).toBeTruthy();
      });
    });

    it('renders with a broad set of props', () => {
      const { getByText } = render(
        <NavigationHeader
          title='Full Test'
          subtitle='All props'
          showBackIcon={true}
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
          onBackPress={jest.fn()}
          style={{ backgroundColor: 'red' }}
          titleStyle={{ fontSize: 20 }}
        />
      );

      expect(getByText('Full Test')).toBeTruthy();
      expect(getByText('All props')).toBeTruthy();
    });

    it('renders with minimal props', () => {
      const { getByText } = render(<NavigationHeader title='Minimal' />);
      expect(getByText('Minimal')).toBeTruthy();
    });
  });

  // ========== RERENDER TESTS ==========
  describe('Rerender Behavior', () => {
    it('updates title on rerender', () => {
      const { getByText, rerender } = render(
        <NavigationHeader title='First' />
      );
      expect(getByText('First')).toBeTruthy();

      rerender(<NavigationHeader title='Second' />);
      expect(getByText('Second')).toBeTruthy();
    });

    it('updates subtitle on rerender', () => {
      const { getByText, rerender } = render(
        <NavigationHeader title='Title' subtitle='First Subtitle' />
      );
      expect(getByText('First Subtitle')).toBeTruthy();

      rerender(<NavigationHeader title='Title' subtitle='Second Subtitle' />);
      expect(getByText('Second Subtitle')).toBeTruthy();
    });

    it('toggles between logo and back icon', () => {
      const { getByTestId, queryByTestId, getByText, rerender } = render(
        <NavigationHeader title='Test' showBackIcon={false} />
      );
      expect(getByTestId('menu-icon-button')).toBeTruthy();

      rerender(<NavigationHeader title='Test' showBackIcon={true} />);
      expect(getByText('arrow-back')).toBeTruthy();
      expect(queryByTestId('menu-icon-button')).toBeNull();
    });

    it('adds right icon on rerender', () => {
      const { queryByText, getByText, rerender } = render(
        <NavigationHeader title='Test' />
      );
      expect(queryByText('settings')).toBeNull();

      rerender(
        <NavigationHeader
          title='Test'
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      expect(getByText('settings')).toBeTruthy();
    });

    it('removes right icon on rerender', () => {
      const { getByText, queryByText, rerender } = render(
        <NavigationHeader
          title='Test'
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      expect(getByText('settings')).toBeTruthy();

      rerender(<NavigationHeader title='Test' />);
      expect(queryByText('settings')).toBeNull();
    });

    it('updates back handlers on rerender', () => {
      const firstHandler = jest.fn();
      const secondHandler = jest.fn();

      const { getByLabelText, rerender } = render(
        <NavigationHeader
          title='Test'
          showBackIcon
          onBackPress={firstHandler}
        />
      );

      fireEvent.press(getByLabelText('Go back'));
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();

      rerender(
        <NavigationHeader
          title='Test'
          showBackIcon
          onBackPress={secondHandler}
        />
      );

      fireEvent.press(getByLabelText('Go back'));
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== ACCESSIBILITY TESTS ==========
  describe('Accessibility', () => {
    it('right icon button has accessibility role', () => {
      const { getByTestId } = render(
        <NavigationHeader
          title='Test'
          rightIcon={{ name: 'settings', onPress: jest.fn() }}
        />
      );
      const rightButton = getByTestId('right-icon-button');
      expect(rightButton.props.accessibilityRole).toBe('button');
    });

    it('back button has correct accessibility label', () => {
      const { getByLabelText } = render(
        <NavigationHeader title='Test' showBackIcon={true} />
      );
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('avatar button has correct accessibility label', () => {
      const { getByLabelText } = render(
        <NavigationHeader title='Test' userInitials='JD' />
      );
      expect(getByLabelText('Open profile menu')).toBeTruthy();
    });

    it('title text is accessible to screen readers', () => {
      const { getByText } = render(
        <NavigationHeader title='Accessible Title' />
      );
      const titleElement = getByText('Accessible Title');
      expect(titleElement.props.accessible).not.toBe(false);
    });

    it('subtitle text is accessible to screen readers', () => {
      const { getByText } = render(
        <NavigationHeader title='Title' subtitle='Accessible Subtitle' />
      );
      const subtitleElement = getByText('Accessible Subtitle');
      expect(subtitleElement.props.accessible).not.toBe(false);
    });
  });

  // ========== PERFORMANCE TESTS ==========
  describe('Performance', () => {
    it('handles multiple rapid rerenders', () => {
      const { rerender, getByText } = render(<NavigationHeader title='1' />);

      for (let i = 2; i <= 10; i++) {
        rerender(<NavigationHeader title={String(i)} />);
      }

      expect(getByText('10')).toBeTruthy();
    });
  });
});
