/**
 * ScreenHeader Component Tests
 *
 * Comprehensive test suite for the ScreenHeader component
 * Target: 100% code coverage
 *
 * @component ScreenHeader
 * @filesize 650+ lines
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ScreenHeader } from '../ScreenHeader';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      textPrimary: '#171717',
      surface: '#FFFFFF',
      surfaceTertiary: '#F5F5F5',
      border: '#E5E5E5',
      textSecondary: '#737373',
    },
    spacing: {
      lg: 16,
      md: 12,
    },
    typography: {
      fontSize: {
        xl: 20,
        sm: 14,
      },
      fontWeight: {
        semibold: '600',
      },
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
// SCREENHEADER COMPONENT TESTS
// ============================================================================

describe('ScreenHeader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders with title', () => {
      const { getByText } = render(<ScreenHeader title="Test Title" />);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders title with correct styling', () => {
      const { getByText } = render(<ScreenHeader title="Styled Title" />);
      const titleElement = getByText('Styled Title');
      const styles = Array.isArray(titleElement.props.style)
        ? titleElement.props.style.flat()
        : [titleElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 20,
            fontWeight: '600',
            color: '#171717',
          }),
        ])
      );
    });

    it('renders with numberOfLines=1 on title', () => {
      const { getByText } = render(<ScreenHeader title="Long Title" />);
      const titleElement = getByText('Long Title');
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('renders left section container', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const leftSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) => style?.width === 40);
      });
      expect(leftSection).toBeTruthy();
    });

    it('renders right section container', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const rightSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) => style?.width === 40 && style?.flexDirection === 'row');
      });
      expect(rightSection).toBeTruthy();
    });

    it('renders center section container', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const centerSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) => style?.flex === 1 && style?.alignItems === 'center');
      });
      expect(centerSection).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Back Button Tests
  // --------------------------------------------------------------------------

  describe('Back Button', () => {
    it('renders back button by default when onBackPress is provided', () => {
      const onBackPress = jest.fn();
      const { getByTestId } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );
      expect(getByTestId('ionicon-arrow-back')).toBeTruthy();
    });

    it('does not render back button when onBackPress is not provided', () => {
      const { queryByTestId } = render(<ScreenHeader title="Test" />);
      expect(queryByTestId('ionicon-arrow-back')).toBeNull();
    });

    it('does not render back button when showBackButton is false', () => {
      const onBackPress = jest.fn();
      const { queryByTestId } = render(
        <ScreenHeader
          title="Test"
          onBackPress={onBackPress}
          showBackButton={false}
        />
      );
      expect(queryByTestId('ionicon-arrow-back')).toBeNull();
    });

    it('renders back button when showBackButton is true and onBackPress is provided', () => {
      const onBackPress = jest.fn();
      const { getByTestId } = render(
        <ScreenHeader
          title="Test"
          onBackPress={onBackPress}
          showBackButton={true}
        />
      );
      expect(getByTestId('ionicon-arrow-back')).toBeTruthy();
    });

    it('calls onBackPress when back button is pressed', () => {
      const onBackPress = jest.fn();
      const { getByTestId } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );

      const backIcon = getByTestId('ionicon-arrow-back');
      const backButton = backIcon.parent?.parent;

      if (backButton) {
        fireEvent.press(backButton);
        expect(onBackPress).toHaveBeenCalledTimes(1);
      }
    });

    it('back button has correct accessibility properties', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );
      const backButton = getByLabelText('Go back');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    it('back button icon has correct name prop', () => {
      const onBackPress = jest.fn();
      render(<ScreenHeader title="Test" onBackPress={onBackPress} />);
      const calls = mockIonicons.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ name: 'arrow-back' })
      );
    });

    it('back button icon has correct size prop', () => {
      const onBackPress = jest.fn();
      render(<ScreenHeader title="Test" onBackPress={onBackPress} />);
      const calls = mockIonicons.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ size: 24 })
      );
    });

    it('back button icon has correct color prop', () => {
      const onBackPress = jest.fn();
      render(<ScreenHeader title="Test" onBackPress={onBackPress} />);
      const calls = mockIonicons.mock.calls[0];
      expect(calls[0]).toEqual(
        expect.objectContaining({ color: '#171717' })
      );
    });

    it('back button has correct styling', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );
      const backButton = getByLabelText('Go back');
      const styles = Array.isArray(backButton.props.style)
        ? backButton.props.style.flat()
        : [backButton.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F5F5F5',
            justifyContent: 'center',
            alignItems: 'center',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Subtitle Tests
  // --------------------------------------------------------------------------

  describe('Subtitle', () => {
    it('renders subtitle when provided', () => {
      const { getByText } = render(
        <ScreenHeader title="Main Title" subtitle="Subtitle text" />
      );
      expect(getByText('Subtitle text')).toBeTruthy();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(<ScreenHeader title="Main Title" />);
      const viewElements = render(<ScreenHeader title="Main Title" />).UNSAFE_root.findAllByType('Text' as any);
      expect(viewElements.length).toBe(1); // Only title
    });

    it('subtitle has correct styling', () => {
      const { getByText } = render(
        <ScreenHeader title="Main" subtitle="Sub" />
      );
      const subtitleElement = getByText('Sub');
      const styles = Array.isArray(subtitleElement.props.style)
        ? subtitleElement.props.style.flat()
        : [subtitleElement.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 14,
            color: '#737373',
            marginTop: 2,
          }),
        ])
      );
    });

    it('subtitle renders with numberOfLines=1', () => {
      const { getByText } = render(
        <ScreenHeader title="Main" subtitle="Long subtitle" />
      );
      const subtitleElement = getByText('Long subtitle');
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });

    it('renders both title and subtitle together', () => {
      const { getByText } = render(
        <ScreenHeader title="Title" subtitle="Subtitle" />
      );
      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Subtitle')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Right Action Tests
  // --------------------------------------------------------------------------

  describe('Right Action', () => {
    it('renders custom right action when provided', () => {
      const rightAction = <Text>Save</Text>;
      const { getByText } = render(
        <ScreenHeader title="Test" rightAction={rightAction} />
      );
      expect(getByText('Save')).toBeTruthy();
    });

    it('does not render right action when not provided', () => {
      const { queryByText } = render(<ScreenHeader title="Test" />);
      expect(queryByText('Save')).toBeNull();
    });

    it('renders right action button with onPress', () => {
      const onPress = jest.fn();
      const rightAction = (
        <TouchableOpacity onPress={onPress}>
          <Text>Action</Text>
        </TouchableOpacity>
      );
      const { getByText } = render(
        <ScreenHeader title="Test" rightAction={rightAction} />
      );

      fireEvent.press(getByText('Action'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders multiple right action elements', () => {
      const rightAction = (
        <>
          <Text>Edit</Text>
          <Text>Delete</Text>
        </>
      );
      const { getByText } = render(
        <ScreenHeader title="Test" rightAction={rightAction} />
      );
      expect(getByText('Edit')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Left Action Tests
  // --------------------------------------------------------------------------

  describe('Left Action', () => {
    it('renders custom left action when provided', () => {
      const leftAction = <Text>Menu</Text>;
      const { getByText } = render(
        <ScreenHeader title="Test" leftAction={leftAction} />
      );
      expect(getByText('Menu')).toBeTruthy();
    });

    it('does not render left action when not provided', () => {
      const { queryByText } = render(<ScreenHeader title="Test" />);
      expect(queryByText('Menu')).toBeNull();
    });

    it('renders left action button with onPress', () => {
      const onPress = jest.fn();
      const leftAction = (
        <TouchableOpacity onPress={onPress}>
          <Text>Menu</Text>
        </TouchableOpacity>
      );
      const { getByText } = render(
        <ScreenHeader title="Test" leftAction={leftAction} />
      );

      fireEvent.press(getByText('Menu'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders left action alongside back button', () => {
      const onBackPress = jest.fn();
      const leftAction = <Text>Extra</Text>;
      const { getByText, getByTestId } = render(
        <ScreenHeader
          title="Test"
          onBackPress={onBackPress}
          leftAction={leftAction}
        />
      );
      expect(getByTestId('ionicon-arrow-back')).toBeTruthy();
      expect(getByText('Extra')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Props Combination Tests
  // --------------------------------------------------------------------------

  describe('Props Combination', () => {
    it('renders with all props provided', () => {
      const onBackPress = jest.fn();
      const leftAction = <Text>Left</Text>;
      const rightAction = <Text>Right</Text>;

      const { getByText, getByTestId } = render(
        <ScreenHeader
          title="Full Header"
          subtitle="With subtitle"
          onBackPress={onBackPress}
          showBackButton={true}
          leftAction={leftAction}
          rightAction={rightAction}
        />
      );

      expect(getByText('Full Header')).toBeTruthy();
      expect(getByText('With subtitle')).toBeTruthy();
      expect(getByTestId('ionicon-arrow-back')).toBeTruthy();
      expect(getByText('Left')).toBeTruthy();
      expect(getByText('Right')).toBeTruthy();
    });

    it('renders with only required props', () => {
      const { getByText } = render(<ScreenHeader title="Minimal" />);
      expect(getByText('Minimal')).toBeTruthy();
    });

    it('renders with title and subtitle only', () => {
      const { getByText } = render(
        <ScreenHeader title="Title" subtitle="Subtitle" />
      );
      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Subtitle')).toBeTruthy();
    });

    it('renders with title and back button only', () => {
      const onBackPress = jest.fn();
      const { getByText, getByTestId } = render(
        <ScreenHeader title="With Back" onBackPress={onBackPress} />
      );
      expect(getByText('With Back')).toBeTruthy();
      expect(getByTestId('ionicon-arrow-back')).toBeTruthy();
    });

    it('renders with title and right action only', () => {
      const rightAction = <Text>Save</Text>;
      const { getByText } = render(
        <ScreenHeader title="Title" rightAction={rightAction} />
      );
      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles very long title text', () => {
      const longTitle = 'This is a very long title that should be truncated with ellipsis when it exceeds the available space in the header component';
      const { getByText } = render(<ScreenHeader title={longTitle} />);
      const titleElement = getByText(longTitle);
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('handles very long subtitle text', () => {
      const longSubtitle = 'This is a very long subtitle that should also be truncated';
      const { getByText } = render(
        <ScreenHeader title="Title" subtitle={longSubtitle} />
      );
      const subtitleElement = getByText(longSubtitle);
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });

    it('handles empty string title', () => {
      const { getByText } = render(<ScreenHeader title="" />);
      expect(getByText('')).toBeTruthy();
    });

    it('handles special characters in title', () => {
      const specialTitle = 'Title <>&"\'{}[]';
      const { getByText } = render(<ScreenHeader title={specialTitle} />);
      expect(getByText(specialTitle)).toBeTruthy();
    });

    it('handles special characters in subtitle', () => {
      const specialSubtitle = 'Subtitle <>&"\'{}[]';
      const { getByText } = render(
        <ScreenHeader title="Title" subtitle={specialSubtitle} />
      );
      expect(getByText(specialSubtitle)).toBeTruthy();
    });

    it('handles onBackPress being undefined', () => {
      const { queryByTestId } = render(
        <ScreenHeader title="Test" onBackPress={undefined} />
      );
      expect(queryByTestId('ionicon-arrow-back')).toBeNull();
    });

    it('handles multiple presses on back button', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      expect(onBackPress).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // Styling Verification Tests
  // --------------------------------------------------------------------------

  describe('Styling Verification', () => {
    it('applies correct container styles', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const containerView = viewElements[0];

      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 16,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }),
        ])
      );
    });

    it('applies correct left section styles', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const leftSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) =>
          style?.flexDirection === 'row' &&
          style?.alignItems === 'center' &&
          style?.width === 40
        );
      });

      expect(leftSection).toBeTruthy();
    });

    it('applies correct center section styles', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const centerSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) =>
          style?.flex === 1 &&
          style?.alignItems === 'center' &&
          style?.justifyContent === 'center' &&
          style?.paddingHorizontal === 12
        );
      });

      expect(centerSection).toBeTruthy();
    });

    it('applies correct right section styles', () => {
      const { UNSAFE_root } = render(<ScreenHeader title="Test" />);
      const viewElements = UNSAFE_root.findAllByType('View' as any);
      const rightSection = viewElements.find((view: any) => {
        const styles = Array.isArray(view?.props.style)
          ? view.props.style.flat()
          : [view?.props.style];
        return styles.some((style: any) =>
          style?.flexDirection === 'row' &&
          style?.alignItems === 'center' &&
          style?.width === 40
        );
      });

      expect(rightSection).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('full header with all features works correctly', () => {
      const onBackPress = jest.fn();
      const onSave = jest.fn();
      const onMenu = jest.fn();

      const rightAction = (
        <TouchableOpacity onPress={onSave}>
          <Text>Save</Text>
        </TouchableOpacity>
      );

      const leftAction = (
        <TouchableOpacity onPress={onMenu}>
          <Text>Menu</Text>
        </TouchableOpacity>
      );

      const { getByText, getByLabelText } = render(
        <ScreenHeader
          title="Edit Profile"
          subtitle="Update your information"
          onBackPress={onBackPress}
          rightAction={rightAction}
          leftAction={leftAction}
        />
      );

      // Verify all elements render
      expect(getByText('Edit Profile')).toBeTruthy();
      expect(getByText('Update your information')).toBeTruthy();
      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
      expect(getByText('Menu')).toBeTruthy();

      // Verify all interactions work
      fireEvent.press(getByLabelText('Go back'));
      expect(onBackPress).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Save'));
      expect(onSave).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Menu'));
      expect(onMenu).toHaveBeenCalledTimes(1);
    });

    it('simple header with just title works correctly', () => {
      const { getByText, queryByTestId } = render(
        <ScreenHeader title="Simple Header" />
      );

      expect(getByText('Simple Header')).toBeTruthy();
      expect(queryByTestId('ionicon-arrow-back')).toBeNull();
    });

    it('header with back button and action works correctly', () => {
      const onBackPress = jest.fn();
      const onAction = jest.fn();

      const rightAction = (
        <TouchableOpacity onPress={onAction}>
          <Text>Done</Text>
        </TouchableOpacity>
      );

      const { getByText, getByLabelText } = render(
        <ScreenHeader
          title="Settings"
          onBackPress={onBackPress}
          rightAction={rightAction}
        />
      );

      expect(getByText('Settings')).toBeTruthy();
      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();

      fireEvent.press(getByLabelText('Go back'));
      expect(onBackPress).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('Done'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('back button has correct accessibility role', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );
      const backButton = getByLabelText('Go back');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    it('back button has correct accessibility label', () => {
      const onBackPress = jest.fn();
      const { getByLabelText } = render(
        <ScreenHeader title="Test" onBackPress={onBackPress} />
      );
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('title text is accessible', () => {
      const { getByText } = render(<ScreenHeader title="Accessible Title" />);
      expect(getByText('Accessible Title')).toBeTruthy();
    });

    it('subtitle text is accessible', () => {
      const { getByText } = render(
        <ScreenHeader title="Title" subtitle="Accessible Subtitle" />
      );
      expect(getByText('Accessible Subtitle')).toBeTruthy();
    });
  });
});
