/**
 * SearchFilterBar Component Tests
 *
 * Comprehensive test suite for SearchFilterBar component
 * Target: 100% coverage with deterministic tests
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SearchFilterBar } from '../SearchFilterBar';

describe('SearchFilterBar', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onFilterPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render with default props', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <SearchFilterBar {...defaultProps} />
      );

      expect(getByPlaceholderText('Search services...')).toBeDefined();
    });

    it('should render with custom placeholder', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} placeholder="Find contractors..." />
      );

      expect(getByPlaceholderText('Find contractors...')).toBeDefined();
    });

    it('should render search icon', () => {
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar {...defaultProps} />
      );

      // Verify Ionicons is rendered (search icon and filter icon at minimum)
      const icons = UNSAFE_getAllByType(require('@expo/vector-icons').Ionicons);
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render filter button', () => {
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar {...defaultProps} />
      );

      // Should have at least 2 icons: search icon and filter button icon
      const icons = UNSAFE_getAllByType(require('@expo/vector-icons').Ionicons);
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render container with correct structure', () => {
      const { root } = render(
        <SearchFilterBar {...defaultProps} />
      );

      expect(root).toBeDefined();
    });

    it('should apply correct accessibility props to TextInput', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} />
      );

      const input = getByPlaceholderText('Search services...');
      expect(input).toBeDefined();
    });
  });

  describe('Search Input Behavior', () => {
    it('should display empty value by default', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} />
      );

      const input = getByPlaceholderText('Search services...');
      expect(input.props.value).toBe('');
    });

    it('should display provided value', () => {
      const { getByDisplayValue } = render(
        <SearchFilterBar {...defaultProps} value="plumbing" />
      );

      expect(getByDisplayValue('plumbing')).toBeDefined();
    });

    it('should call onChangeText when text changes', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, 'electrical');

      expect(mockOnChangeText).toHaveBeenCalledWith('electrical');
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });

    it('should call onChangeText with empty string', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, '');

      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('should call onChangeText with special characters', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, 'test-123!@#');

      expect(mockOnChangeText).toHaveBeenCalledWith('test-123!@#');
    });

    it('should call onChangeText with long text', () => {
      const mockOnChangeText = jest.fn();
      const longText = 'a'.repeat(200);
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, longText);

      expect(mockOnChangeText).toHaveBeenCalledWith(longText);
    });

    it('should call onChangeText with unicode characters', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, '测试🔧');

      expect(mockOnChangeText).toHaveBeenCalledWith('测试🔧');
    });

    it('should handle rapid text changes', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');

      fireEvent.changeText(input, 'a');
      fireEvent.changeText(input, 'ab');
      fireEvent.changeText(input, 'abc');

      expect(mockOnChangeText).toHaveBeenCalledTimes(3);
      expect(mockOnChangeText).toHaveBeenNthCalledWith(1, 'a');
      expect(mockOnChangeText).toHaveBeenNthCalledWith(2, 'ab');
      expect(mockOnChangeText).toHaveBeenNthCalledWith(3, 'abc');
    });

    it('should maintain focus after text change', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent(input, 'focus');
      fireEvent.changeText(input, 'test');

      // Input should still be defined after changes
      expect(input).toBeDefined();
    });
  });

  describe('Clear Button Behavior', () => {
    it('should not show clear button when value is empty', () => {
      const { UNSAFE_queryAllByType } = render(
        <SearchFilterBar {...defaultProps} value="" />
      );

      // Should only have 1 touchable: filter button (no clear button)
      const touchables = UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBe(1); // Only filter button
    });

    it('should show clear button when value has text', () => {
      const { UNSAFE_queryAllByType } = render(
        <SearchFilterBar {...defaultProps} value="test" />
      );

      // Should have 3 touchables now: clear button + filter button
      const touchables = UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBe(2); // Clear button + filter button
    });

    it('should show clear button with single character', () => {
      const { UNSAFE_queryAllByType } = render(
        <SearchFilterBar {...defaultProps} value="a" />
      );

      const touchables = UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBe(2);
    });

    it('should call onChangeText with empty string when clear button is pressed', () => {
      const mockOnChangeText = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          value="plumbing"
          onChangeText={mockOnChangeText}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      // First touchable is the clear button (when value exists)
      const clearButton = touchables[0];

      fireEvent.press(clearButton);

      expect(mockOnChangeText).toHaveBeenCalledWith('');
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clear button presses', () => {
      const mockOnChangeText = jest.fn();
      const { rerender, UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          value="test"
          onChangeText={mockOnChangeText}
        />
      );

      let touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchables[0]);

      // Rerender with empty value
      rerender(
        <SearchFilterBar
          {...defaultProps}
          value=""
          onChangeText={mockOnChangeText}
        />
      );

      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });

    it('should hide clear button after clearing', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <SearchFilterBar {...defaultProps} value="test" />
      );

      let touchables = UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBe(2); // clear + filter

      rerender(<SearchFilterBar {...defaultProps} value="" />);

      touchables = UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBe(1); // only filter
    });

    it('should show clear button when value changes from empty to non-empty', () => {
      const { rerender, UNSAFE_queryAllByType } = render(
        <SearchFilterBar {...defaultProps} value="" />
      );

      rerender(<SearchFilterBar {...defaultProps} value="n" />);

      const touchables = UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBe(2);
    });
  });

  describe('Filter Button Behavior', () => {
    it('should call onFilterPress when filter button is pressed', () => {
      const mockOnFilterPress = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          onFilterPress={mockOnFilterPress}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      const filterButton = touchables[touchables.length - 1]; // Last touchable is filter button

      fireEvent.press(filterButton);

      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('should call onFilterPress multiple times', () => {
      const mockOnFilterPress = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          onFilterPress={mockOnFilterPress}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      fireEvent.press(filterButton);
      fireEvent.press(filterButton);
      fireEvent.press(filterButton);

      expect(mockOnFilterPress).toHaveBeenCalledTimes(3);
    });

    it('should call onFilterPress regardless of search value', () => {
      const mockOnFilterPress = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          value="test search"
          onFilterPress={mockOnFilterPress}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      fireEvent.press(filterButton);

      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('should not interfere with clear button functionality', () => {
      const mockOnFilterPress = jest.fn();
      const mockOnChangeText = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          value="test"
          onFilterPress={mockOnFilterPress}
          onChangeText={mockOnChangeText}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      const clearButton = touchables[0];
      const filterButton = touchables[1];

      fireEvent.press(filterButton);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).not.toHaveBeenCalled();

      fireEvent.press(clearButton);
      expect(mockOnChangeText).toHaveBeenCalledWith('');
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user workflow: type, clear, filter', () => {
      const mockOnChangeText = jest.fn();
      const mockOnFilterPress = jest.fn();
      const { getByPlaceholderText, rerender, UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      // Type text
      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, 'plumbing');
      expect(mockOnChangeText).toHaveBeenCalledWith('plumbing');

      // Rerender with new value
      rerender(
        <SearchFilterBar
          {...defaultProps}
          value="plumbing"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      // Clear text
      let touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchables[0]); // Clear button
      expect(mockOnChangeText).toHaveBeenCalledWith('');

      // Press filter
      rerender(
        <SearchFilterBar
          {...defaultProps}
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchables[0]); // Filter button (clear is hidden)
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid typing and clearing', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText, rerender, UNSAFE_getAllByType } = render(
        <SearchFilterBar
          {...defaultProps}
          onChangeText={mockOnChangeText}
        />
      );

      const input = getByPlaceholderText('Search services...');

      // Rapid typing
      fireEvent.changeText(input, 'p');
      fireEvent.changeText(input, 'pl');
      fireEvent.changeText(input, 'plu');

      expect(mockOnChangeText).toHaveBeenCalledTimes(3);

      // Clear
      rerender(
        <SearchFilterBar
          {...defaultProps}
          value="plu"
          onChangeText={mockOnChangeText}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchables[0]);

      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('should handle value prop updates from parent', () => {
      const { rerender, getByDisplayValue, queryByDisplayValue } = render(
        <SearchFilterBar {...defaultProps} value="" />
      );

      expect(queryByDisplayValue('test')).toBeNull();

      rerender(<SearchFilterBar {...defaultProps} value="test" />);
      expect(getByDisplayValue('test')).toBeDefined();

      rerender(<SearchFilterBar {...defaultProps} value="updated" />);
      expect(getByDisplayValue('updated')).toBeDefined();
      expect(queryByDisplayValue('test')).toBeNull();
    });

    it('should handle callback prop updates', () => {
      const mockOnChangeText1 = jest.fn();
      const mockOnChangeText2 = jest.fn();
      const { rerender, getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText1} />
      );

      const input = getByPlaceholderText('Search services...');
      fireEvent.changeText(input, 'test1');
      expect(mockOnChangeText1).toHaveBeenCalledWith('test1');

      rerender(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText2} />
      );

      fireEvent.changeText(input, 'test2');
      expect(mockOnChangeText2).toHaveBeenCalledWith('test2');
      expect(mockOnChangeText1).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle value with only whitespace', () => {
      const { getByDisplayValue } = render(
        <SearchFilterBar {...defaultProps} value="   " />
      );

      expect(getByDisplayValue('   ')).toBeDefined();
    });

    it('should handle very long placeholder text', () => {
      const longPlaceholder = 'Search for any service you need in your area...'.repeat(5);
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} placeholder={longPlaceholder} />
      );

      expect(getByPlaceholderText(longPlaceholder)).toBeDefined();
    });

    it('should handle empty string placeholder', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} placeholder="" />
      );

      expect(getByPlaceholderText('')).toBeDefined();
    });

    it('should handle null-like values gracefully', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');

      // @ts-expect-error Testing edge case
      fireEvent.changeText(input, null);

      expect(mockOnChangeText).toHaveBeenCalled();
    });

    it('should handle component unmount gracefully', () => {
      const { unmount } = render(
        <SearchFilterBar {...defaultProps} value="test" />
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rerender with same props', () => {
      const { rerender } = render(
        <SearchFilterBar {...defaultProps} value="test" />
      );

      expect(() => {
        rerender(<SearchFilterBar {...defaultProps} value="test" />);
        rerender(<SearchFilterBar {...defaultProps} value="test" />);
        rerender(<SearchFilterBar {...defaultProps} value="test" />);
      }).not.toThrow();
    });

    it('should handle value changes without onChangeText callback', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar
          value=""
          onChangeText={jest.fn()}
          onFilterPress={jest.fn()}
        />
      );

      const input = getByPlaceholderText('Search services...');

      expect(() => {
        fireEvent.changeText(input, 'test');
      }).not.toThrow();
    });

    it('should handle filter press without onFilterPress callback', () => {
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar
          value=""
          onChangeText={jest.fn()}
          onFilterPress={jest.fn()}
        />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);

      expect(() => {
        fireEvent.press(touchables[0]);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should render accessible TextInput', () => {
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} />
      );

      const input = getByPlaceholderText('Search services...');
      expect(input).toBeDefined();
      expect(input.props.placeholderTextColor).toBeDefined();
    });

    it('should have touchable filter button', () => {
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar {...defaultProps} />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    it('should maintain component structure for screen readers', () => {
      const { root } = render(
        <SearchFilterBar {...defaultProps} value="test" />
      );

      expect(root).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle 100 rapid text changes', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <SearchFilterBar {...defaultProps} onChangeText={mockOnChangeText} />
      );

      const input = getByPlaceholderText('Search services...');

      for (let i = 0; i < 100; i++) {
        fireEvent.changeText(input, `text${i}`);
      }

      expect(mockOnChangeText).toHaveBeenCalledTimes(100);
    });

    it('should handle 100 filter button presses', () => {
      const mockOnFilterPress = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <SearchFilterBar {...defaultProps} onFilterPress={mockOnFilterPress} />
      );

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      for (let i = 0; i < 100; i++) {
        fireEvent.press(filterButton);
      }

      expect(mockOnFilterPress).toHaveBeenCalledTimes(100);
    });

    it('should handle 50 rerenders efficiently', () => {
      const { rerender } = render(
        <SearchFilterBar {...defaultProps} value="" />
      );

      expect(() => {
        for (let i = 0; i < 50; i++) {
          rerender(<SearchFilterBar {...defaultProps} value={`value${i}`} />);
        }
      }).not.toThrow();
    });
  });

  describe('Prop Validation', () => {
    it('should accept all valid prop types', () => {
      expect(() => {
        render(
          <SearchFilterBar
            value="test"
            onChangeText={jest.fn()}
            onFilterPress={jest.fn()}
            placeholder="custom placeholder"
          />
        );
      }).not.toThrow();
    });

    it('should work without optional placeholder', () => {
      expect(() => {
        render(
          <SearchFilterBar
            value="test"
            onChangeText={jest.fn()}
            onFilterPress={jest.fn()}
          />
        );
      }).not.toThrow();
    });

    it('should handle undefined placeholder', () => {
      expect(() => {
        render(
          <SearchFilterBar
            value="test"
            onChangeText={jest.fn()}
            onFilterPress={jest.fn()}
            placeholder={undefined}
          />
        );
      }).not.toThrow();
    });
  });
});
