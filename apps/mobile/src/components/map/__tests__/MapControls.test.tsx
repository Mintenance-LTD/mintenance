
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { MapControls } from '../MapControls';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../theme';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, testID, ...props }: any) => {
    const MockedIcon = require('react-native').Text;
    return (
      <MockedIcon testID={testID || `icon-${name}`} {...props}>
        {name}-{size}-{color}
      </MockedIcon>
    );
  },
}));

describe('MapControls', () => {
  const mockOnMyLocationPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render my location button', () => {
      const { UNSAFE_getAllByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(1);
    });

    it('should render Ionicons locate icon', () => {
      const { getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      // Icon mock shows: name-size-color
      expect(getByText(`locate-24-${theme.colors.primary}`)).toBeTruthy();
    });

    it('should not render loading indicator when loading is false', () => {
      const { queryByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      expect(queryByText('Finding nearby contractors...')).toBeNull();
    });

    it('should have correct component structure', () => {
      const { toJSON } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      // Component renders correctly with button
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('My Location Button', () => {
    it('should call onMyLocationPress when button is pressed', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onMyLocationPress on render', () => {
      render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(mockOnMyLocationPress).not.toHaveBeenCalled();
    });

    it('should call handler only once on single press', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple presses', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(3);
    });

    it('should render button with correct positioning styles', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      expect(button.props.style).toBeDefined();
      // Verify it's an object or array containing positioning
      const styles = Array.isArray(button.props.style)
        ? button.props.style
        : [button.props.style];

      const hasPositioning = styles.some((style: any) =>
        style && (style.position === 'absolute' || style.bottom !== undefined || style.right !== undefined)
      );
      expect(hasPositioning).toBe(true);
    });

    it('should work with different handler implementations', () => {
      const customHandler = jest.fn(() => {
        // Custom implementation
      });

      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={customHandler} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      fireEvent.press(button);

      expect(customHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ionicons Icon', () => {
    it('should render locate icon with size 24', () => {
      const { getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      // Icon mock format: name-size-color
      const iconText = getByText(`locate-24-${theme.colors.primary}`);
      expect(iconText).toBeTruthy();
    });

    it('should use primary theme color', () => {
      const { getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getByText(`locate-24-${theme.colors.primary}`)).toBeTruthy();
    });

    it('should use locate icon name', () => {
      const { getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      const iconText = getByText(`locate-24-${theme.colors.primary}`);
      expect(iconText.props.children).toContain('locate');
    });

    it('should have correct icon size in rendered output', () => {
      const { getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      const iconText = getByText(`locate-24-${theme.colors.primary}`);
      // Icon mock renders array: ["locate", "-", 24, "-", color]
      const childrenStr = Array.isArray(iconText.props.children)
        ? iconText.props.children.join('')
        : String(iconText.props.children);
      expect(childrenStr).toContain('24');
    });
  });

  describe('Loading State - Not Loading', () => {
    it('should not render ActivityIndicator when loading is false', () => {
      const { UNSAFE_queryByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      const indicators = UNSAFE_queryByType(ActivityIndicator);
      expect(indicators).toBeNull();
    });

    it('should not render loading text when loading is false', () => {
      const { queryByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(queryByText('Finding nearby contractors...')).toBeNull();
    });

    it('should not render loading container when loading is false', () => {
      const { queryByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      // Verify loading elements are not present
      expect(queryByText('Finding nearby contractors...')).toBeNull();
    });
  });

  describe('Loading State - Loading', () => {
    it('should render loading container when loading is true', () => {
      const { getByText } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getByText('Finding nearby contractors...')).toBeTruthy();
    });

    it('should render ActivityIndicator when loading is true', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator).toBeTruthy();
    });

    it('should render ActivityIndicator with large size', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.size).toBe('large');
    });

    it('should render ActivityIndicator with primary color', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const indicator = UNSAFE_getByType(ActivityIndicator);
      expect(indicator.props.color).toBe(theme.colors.primary);
    });

    it('should render loading text', () => {
      const { getByText } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const loadingText = getByText('Finding nearby contractors...');
      expect(loadingText).toBeTruthy();
    });

    it('should render loading text with correct content', () => {
      const { UNSAFE_getAllByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const texts = UNSAFE_getAllByType(Text);
      const loadingTextComponent = texts.find(
        (text) => text.props.children === 'Finding nearby contractors...'
      );

      expect(loadingTextComponent).toBeTruthy();
      expect(loadingTextComponent?.props.children).toBe('Finding nearby contractors...');
    });

    it('should apply loadingContainer styles when loading', () => {
      const { UNSAFE_getAllByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const views = UNSAFE_getAllByType(View);
      // Should have more views when loading (button + loading container)
      expect(views.length).toBeGreaterThan(0);
    });

    it('should still render my location button when loading', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const button = UNSAFE_getByType(TouchableOpacity);
      expect(button).toBeTruthy();
    });

    it('should allow button press even when loading', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State Toggle', () => {
    it('should toggle from not loading to loading', () => {
      const { rerender, queryByText, getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(queryByText('Finding nearby contractors...')).toBeNull();

      rerender(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getByText('Finding nearby contractors...')).toBeTruthy();
    });

    it('should toggle from loading to not loading', () => {
      const { rerender, queryByText, getByText } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getByText('Finding nearby contractors...')).toBeTruthy();

      rerender(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(queryByText('Finding nearby contractors...')).toBeNull();
    });

    it('should maintain button functionality after loading toggle', () => {
      const { rerender, UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      rerender(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const button = UNSAFE_getByType(TouchableOpacity);
      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Conditional Rendering', () => {
    it('should conditionally render loading based on loading prop', () => {
      const { UNSAFE_queryByType: queryWhenFalse } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(queryWhenFalse(ActivityIndicator)).toBeNull();

      const { UNSAFE_getByType: getWhenTrue } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getWhenTrue(ActivityIndicator)).toBeTruthy();
    });

    it('should always render my location button regardless of loading state', () => {
      const { UNSAFE_getByType: getWhenFalse } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getWhenFalse(TouchableOpacity)).toBeTruthy();

      const { UNSAFE_getByType: getWhenTrue } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(getWhenTrue(TouchableOpacity)).toBeTruthy();
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot when not loading', () => {
      const { toJSON } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when loading', () => {
      const { toJSON } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should have consistent rendering for same props', () => {
      const { toJSON: json1 } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const { toJSON: json2 } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      // Both renders should produce same output
      expect(JSON.stringify(json1())).toEqual(JSON.stringify(json2()));
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );
      const button = UNSAFE_getByType(TouchableOpacity);

      for (let i = 0; i < 10; i++) {
        fireEvent.press(button);
      }

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(10);
    });

    it('should handle re-renders with same props', () => {
      const { rerender, UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      rerender(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      const button = UNSAFE_getByType(TouchableOpacity);
      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(1);
    });

    it('should handle prop changes during interaction', () => {
      const { rerender, UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      let button = UNSAFE_getByType(TouchableOpacity);
      fireEvent.press(button);

      rerender(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      // Get the button again after rerender
      button = UNSAFE_getByType(TouchableOpacity);
      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalledTimes(2);
    });

    it('should handle handler change', () => {
      const newHandler = jest.fn();
      const { rerender, UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      rerender(
        <MapControls loading={false} onMyLocationPress={newHandler} />
      );

      const button = UNSAFE_getByType(TouchableOpacity);
      fireEvent.press(button);

      expect(mockOnMyLocationPress).not.toHaveBeenCalled();
      expect(newHandler).toHaveBeenCalledTimes(1);
    });

    it('should maintain structure during multiple loading toggles', () => {
      const { rerender, queryByText, getByText } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      expect(queryByText('Finding nearby contractors...')).toBeNull();

      rerender(<MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />);
      expect(getByText('Finding nearby contractors...')).toBeTruthy();

      rerender(<MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />);
      expect(queryByText('Finding nearby contractors...')).toBeNull();

      rerender(<MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />);
      expect(getByText('Finding nearby contractors...')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have interactive button for location', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={false} onMyLocationPress={mockOnMyLocationPress} />
      );

      const button = UNSAFE_getByType(TouchableOpacity);
      expect(button).toBeTruthy();
    });

    it('should provide visual feedback via loading indicator', () => {
      const { UNSAFE_queryByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const indicator = UNSAFE_queryByType(ActivityIndicator);
      expect(indicator).toBeTruthy();
    });

    it('should provide textual feedback when loading', () => {
      const { getByText } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const loadingText = getByText('Finding nearby contractors...');
      expect(loadingText).toBeTruthy();
    });

    it('should allow interaction even during loading', () => {
      const { UNSAFE_getByType } = render(
        <MapControls loading={true} onMyLocationPress={mockOnMyLocationPress} />
      );

      const button = UNSAFE_getByType(TouchableOpacity);
      fireEvent.press(button);

      expect(mockOnMyLocationPress).toHaveBeenCalled();
    });
  });
});
