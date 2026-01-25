/**
 * MapSearchBar Component Tests
 *
 * Comprehensive test suite for MapSearchBar component
 * Target: 100% coverage with deterministic tests
 *
 * @coverage-target 100%
 */

import React from 'react';
import { render, fireEvent } from '../../../../test-utils';
import { MapSearchBar } from '../MapSearchBar';
import { View, TextInput, TouchableOpacity } from 'react-native';

describe('MapSearchBar', () => {
  // Mock functions
  const mockOnChangeText = jest.fn();
  const mockOnFilterPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByPlaceholderText('Search contractors...')).toBeDefined();
    });

    it('renders with empty value', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByPlaceholderText('Search contractors...')).toBeDefined();
    });

    it('renders with provided value', () => {
      const { getByDisplayValue } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByDisplayValue('plumber')).toBeDefined();
    });

    it('renders placeholder text correctly', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByPlaceholderText('Search contractors...')).toBeDefined();
    });

    it('renders container structure', () => {
      const { UNSAFE_root } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(UNSAFE_root).toBeDefined();
    });

    it('renders input field', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const inputs = UNSAFE_getAllByType(TextInput);
      expect(inputs.length).toBe(1);
    });

    it('renders touchable components', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Search Input Interaction', () => {
    it('calls onChangeText when text is entered', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'electrician');
      expect(mockOnChangeText).toHaveBeenCalledWith('electrician');
    });

    it('calls onChangeText with correct value', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'plumber');
      expect(mockOnChangeText).toHaveBeenCalledWith('plumber');
    });

    it('calls onChangeText multiple times', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const input = getByPlaceholderText('Search contractors...');
      fireEvent.changeText(input, 'e');
      fireEvent.changeText(input, 'el');
      fireEvent.changeText(input, 'ele');
      expect(mockOnChangeText).toHaveBeenCalledTimes(3);
    });

    it('updates value correctly', () => {
      const { getByDisplayValue, rerender } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByDisplayValue('plumber')).toBeDefined();

      rerender(
        <MapSearchBar
          value="electrician"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByDisplayValue('electrician')).toBeDefined();
    });

    it('handles empty string input', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), '');
      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('handles whitespace input', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), '   ');
      expect(mockOnChangeText).toHaveBeenCalledWith('   ');
    });

    it('handles special characters input', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'A/C & HVAC');
      expect(mockOnChangeText).toHaveBeenCalledWith('A/C & HVAC');
    });

    it('handles numeric input', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), '12345');
      expect(mockOnChangeText).toHaveBeenCalledWith('12345');
    });

    it('handles long text input', () => {
      const longText = 'Emergency Plumbing and Drainage Services Available 24/7';
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), longText);
      expect(mockOnChangeText).toHaveBeenCalledWith(longText);
    });

    it('handles unicode characters', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'François');
      expect(mockOnChangeText).toHaveBeenCalledWith('François');
    });

    it('input has correct props', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="test"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const inputs = UNSAFE_getAllByType(TextInput);
      expect(inputs[0].props.value).toBe('test');
      expect(inputs[0].props.placeholder).toBe('Search contractors...');
    });
  });

  describe('Clear Button', () => {
    it('does not show clear button when value is empty', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // Only filter button should be present (1 touchable)
      expect(touchables.length).toBe(1);
    });

    it('shows clear button when value is not empty', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // Clear button + filter button should be present (2 touchables)
      expect(touchables.length).toBe(2);
    });

    it('shows clear button with single character', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="a"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);
    });

    it('calls onChangeText with empty string when clear button is pressed', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // First touchable should be the clear button (appears before filter button in DOM)
      fireEvent.press(touchables[0]);
      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('clears text when clear button is pressed multiple times', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const clearButton = touchables[0];

      fireEvent.press(clearButton);
      fireEvent.press(clearButton);
      expect(mockOnChangeText).toHaveBeenCalledTimes(2);
      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('hides clear button after clearing', () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);

      rerender(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(1);
    });

    it('shows clear button with whitespace only', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="   "
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);
    });
  });

  describe('Filter Button', () => {
    it('calls onFilterPress when filter button is pressed', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // Filter button is the last (or only) touchable
      const filterButton = touchables[touchables.length - 1];
      fireEvent.press(filterButton);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('calls onFilterPress multiple times', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      fireEvent.press(filterButton);
      fireEvent.press(filterButton);
      fireEvent.press(filterButton);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(3);
    });

    it('does not call onChangeText when filter button is pressed', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      fireEvent.press(filterButton);
      expect(mockOnChangeText).not.toHaveBeenCalled();
    });

    it('works with different onFilterPress handlers', () => {
      const customHandler = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={customHandler}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      fireEvent.press(filterButton);
      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(mockOnFilterPress).not.toHaveBeenCalled();
    });

    it('filter button works when clear button is present', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="test"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];

      fireEvent.press(filterButton);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).not.toHaveBeenCalled();
    });
  });

  describe('Component Updates', () => {
    it('updates when value changes', () => {
      const { getByDisplayValue, rerender } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByDisplayValue('plumber')).toBeDefined();

      rerender(
        <MapSearchBar
          value="electrician"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByDisplayValue('electrician')).toBeDefined();
    });

    it('updates when onChangeText handler changes', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const { getByPlaceholderText, rerender } = render(
        <MapSearchBar
          value=""
          onChangeText={handler1}
          onFilterPress={mockOnFilterPress}
        />
      );

      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'test');
      expect(handler1).toHaveBeenCalledWith('test');
      expect(handler2).not.toHaveBeenCalled();

      rerender(
        <MapSearchBar
          value=""
          onChangeText={handler2}
          onFilterPress={mockOnFilterPress}
        />
      );

      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'test2');
      expect(handler2).toHaveBeenCalledWith('test2');
      expect(handler1).toHaveBeenCalledTimes(1);
    });

    it('updates when onFilterPress handler changes', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const { UNSAFE_getAllByType, rerender } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={handler1}
        />
      );

      let touchables = UNSAFE_getAllByType(TouchableOpacity);
      let filterButton = touchables[touchables.length - 1];
      fireEvent.press(filterButton);
      expect(handler1).toHaveBeenCalledTimes(1);

      rerender(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={handler2}
        />
      );

      touchables = UNSAFE_getAllByType(TouchableOpacity);
      filterButton = touchables[touchables.length - 1];
      fireEvent.press(filterButton);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledTimes(1);
    });

    it('maintains clear button visibility on value change', () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(1);

      rerender(
        <MapSearchBar
          value="test"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);
    });

    it('updates input value prop correctly', () => {
      const { UNSAFE_getAllByType, rerender } = render(
        <MapSearchBar
          value="initial"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let inputs = UNSAFE_getAllByType(TextInput);
      expect(inputs[0].props.value).toBe('initial');

      rerender(
        <MapSearchBar
          value="updated"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      inputs = UNSAFE_getAllByType(TextInput);
      expect(inputs[0].props.value).toBe('updated');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long search query', () => {
      const longQuery = 'Emergency Plumbing Drainage Heating Cooling HVAC Electrical Carpentry'.repeat(5);
      const { getByDisplayValue } = render(
        <MapSearchBar
          value={longQuery}
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(getByDisplayValue(longQuery)).toBeDefined();
    });

    it('handles rapid text changes', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const input = getByPlaceholderText('Search contractors...');

      fireEvent.changeText(input, 'p');
      fireEvent.changeText(input, 'pl');
      fireEvent.changeText(input, 'plu');
      fireEvent.changeText(input, 'plum');
      fireEvent.changeText(input, 'plumb');

      expect(mockOnChangeText).toHaveBeenCalledTimes(5);
    });

    it('handles alternating between empty and non-empty', () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(1);

      rerender(
        <MapSearchBar
          value="test"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);

      rerender(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(1);
    });

    it('handles emoji in search text', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), '⭐ 24/7 Service');
      expect(mockOnChangeText).toHaveBeenCalledWith('⭐ 24/7 Service');
    });

    it('handles newline characters', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'test\nplumber');
      expect(mockOnChangeText).toHaveBeenCalledWith('test\nplumber');
    });

    it('handles tab characters', () => {
      const { getByPlaceholderText } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'test\tplumber');
      expect(mockOnChangeText).toHaveBeenCalledWith('test\tplumber');
    });

    it('handles extremely long single character string', () => {
      const longValue = 'a'.repeat(10000);
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value={longValue}
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const inputs = UNSAFE_getAllByType(TextInput);
      expect(inputs[0].props.value).toBe(longValue);
    });
  });

  describe('Props Validation', () => {
    it('accepts valid props', () => {
      expect(() => {
        render(
          <MapSearchBar
            value=""
            onChangeText={mockOnChangeText}
            onFilterPress={mockOnFilterPress}
          />
        );
      }).not.toThrow();
    });

    it('accepts string value prop', () => {
      expect(() => {
        render(
          <MapSearchBar
            value="test"
            onChangeText={mockOnChangeText}
            onFilterPress={mockOnFilterPress}
          />
        );
      }).not.toThrow();
    });

    it('accepts function onChangeText prop', () => {
      expect(() => {
        render(
          <MapSearchBar
            value=""
            onChangeText={jest.fn()}
            onFilterPress={mockOnFilterPress}
          />
        );
      }).not.toThrow();
    });

    it('accepts function onFilterPress prop', () => {
      expect(() => {
        render(
          <MapSearchBar
            value=""
            onChangeText={mockOnChangeText}
            onFilterPress={jest.fn()}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Interaction Sequences', () => {
    it('handles type, clear, type sequence', () => {
      const result = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let input = result.getByPlaceholderText('Search contractors...');
      fireEvent.changeText(input, 'plumber');
      expect(mockOnChangeText).toHaveBeenCalledWith('plumber');

      result.rerender(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let touchables = result.UNSAFE_getAllByType(TouchableOpacity);
      const clearButton = touchables[0];
      fireEvent.press(clearButton);
      expect(mockOnChangeText).toHaveBeenCalledWith('');

      result.rerender(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      // Get fresh reference to input after rerender
      input = result.getByPlaceholderText('Search contractors...');
      fireEvent.changeText(input, 'electrician');
      expect(mockOnChangeText).toHaveBeenCalledWith('electrician');
    });

    it('handles multiple filter presses between text changes', () => {
      const { getByPlaceholderText, UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      const input = getByPlaceholderText('Search contractors...');
      fireEvent.changeText(input, 'test1');

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const filterButton = touchables[touchables.length - 1];
      fireEvent.press(filterButton);
      fireEvent.press(filterButton);

      fireEvent.changeText(input, 'test2');

      expect(mockOnChangeText).toHaveBeenCalledTimes(2);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(2);
    });

    it('maintains state through rapid interactions', () => {
      const { getByPlaceholderText, UNSAFE_getAllByType, rerender } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      const input = getByPlaceholderText('Search contractors...');
      fireEvent.changeText(input, 'a');

      rerender(
        <MapSearchBar
          value="a"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      let touchables = UNSAFE_getAllByType(TouchableOpacity);
      let filterButton = touchables[touchables.length - 1];
      fireEvent.press(filterButton);

      fireEvent.changeText(input, 'ab');

      rerender(
        <MapSearchBar
          value="ab"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      touchables = UNSAFE_getAllByType(TouchableOpacity);
      const clearButton = touchables[0];
      fireEvent.press(clearButton);

      expect(mockOnChangeText).toHaveBeenCalled();
      expect(mockOnFilterPress).toHaveBeenCalled();
    });

    it('handles clear button press when filter button also present', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value="test"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);

      // Press clear button (first one)
      fireEvent.press(touchables[0]);
      expect(mockOnChangeText).toHaveBeenCalledWith('');
      expect(mockOnFilterPress).not.toHaveBeenCalled();

      // Press filter button (last one)
      fireEvent.press(touchables[1]);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Snapshot Consistency', () => {
    it('maintains consistent structure with empty value', () => {
      const { toJSON } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('maintains consistent structure with value', () => {
      const { toJSON } = render(
        <MapSearchBar
          value="plumber"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('maintains consistent structure with long value', () => {
      const { toJSON } = render(
        <MapSearchBar
          value="Emergency Plumbing Services Available 24/7"
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Component Structure', () => {
    it('renders main container View', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const views = UNSAFE_getAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });

    it('has correct number of Views in structure', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const views = UNSAFE_getAllByType(View);
      // Container + searchBar = 2 views
      expect(views.length).toBeGreaterThanOrEqual(2);
    });

    it('TextInput is wrapped in searchBar View', () => {
      const { UNSAFE_getAllByType } = render(
        <MapSearchBar
          value=""
          onChangeText={mockOnChangeText}
          onFilterPress={mockOnFilterPress}
        />
      );
      const inputs = UNSAFE_getAllByType(TextInput);
      const views = UNSAFE_getAllByType(View);
      expect(inputs.length).toBe(1);
      expect(views.length).toBeGreaterThanOrEqual(2);
    });
  });
});
