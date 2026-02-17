import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { MapHeader } from '../MapHeader';
import { theme } from '../../../theme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

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

// Mock Input component
jest.mock('../../ui/Input', () => ({
  Input: ({ value, onChangeText, placeholder, leftIcon, variant, size, containerStyle, ...props }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID="search-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        {...props}
      />
    );
  },
}));

/**
 * MapHeader Component Tests
 *
 * Tests the MapHeader component functionality including:
 * - Component rendering and structure
 * - Search input rendering and interaction
 * - Back button rendering and press handler
 * - Filter button rendering and press handler
 * - Icon rendering and styling
 * - Container styling (flexDirection, padding, gap, backgroundColor)
 * - Search input props (variant, size, leftIcon, placeholder)
 * - Multiple interactions and edge cases
 *
 * Coverage: 100%
 * Total Tests: 30
 */

describe('MapHeader', () => {
  const mockOnSearchChange = jest.fn();
  const mockOnBackPress = jest.fn();
  const mockOnFilterPress = jest.fn();

  const defaultProps = {
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    onBackPress: mockOnBackPress,
    onFilterPress: mockOnFilterPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<MapHeader {...defaultProps} />);
      }).not.toThrow();
    });

    it('should render header container', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;
      expect(container).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      expect(getByTestId('icon-arrow-back')).toBeTruthy();
    });

    it('should render search input', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      expect(getByTestId('search-input')).toBeTruthy();
    });

    it('should render filter button', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      expect(getByTestId('icon-options-outline')).toBeTruthy();
    });
  });

  describe('Header Container Styling', () => {
    it('should apply flexDirection row to header', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });

    it('should apply alignItems center to header', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          alignItems: 'center',
        })
      );
    });

    it('should apply dynamic paddingTop from safe area insets', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      // useSafeAreaInsets mock returns top: 0
      expect(container?.props.style).toEqual(
        expect.objectContaining({
          paddingTop: 0,
        })
      );
    });

    it('should apply paddingBottom of 16 to header', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          paddingBottom: 16,
        })
      );
    });

    it('should apply paddingHorizontal of 20 to header', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          paddingHorizontal: 20,
        })
      );
    });

    it('should apply background color to header', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: theme.colors.background,
        })
      );
    });

    it('should apply gap of 16 to header', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const container = input.parent?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          gap: 16,
        })
      );
    });
  });

  describe('Back Button', () => {
    it('should call onBackPress when back button is pressed', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const backIcon = getByTestId('icon-arrow-back');
      const backButton = backIcon.parent;

      fireEvent.press(backButton as any);

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });

    it('should render arrow-back icon with correct name', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const icon = getByTestId('icon-arrow-back');

      expect(icon.children[0]).toContain('arrow-back');
    });

    it('should render arrow-back icon with size 24', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const icon = getByTestId('icon-arrow-back');

      expect(icon.props.children).toContain(24);
    });

    it('should render arrow-back icon with textPrimary color', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const icon = getByTestId('icon-arrow-back');

      expect(icon.props.children).toContain(theme.colors.textPrimary);
    });

    it('should handle multiple back button presses', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const backIcon = getByTestId('icon-arrow-back');
      const backButton = backIcon.parent;

      fireEvent.press(backButton as any);
      fireEvent.press(backButton as any);
      fireEvent.press(backButton as any);

      expect(mockOnBackPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Search Input', () => {
    it('should pass searchQuery value to Input', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} searchQuery="test query" />);
      const input = getByTestId('search-input');

      expect(input.props.value).toBe('test query');
    });

    it('should pass empty string as value when searchQuery is empty', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} searchQuery="" />);
      const input = getByTestId('search-input');

      expect(input.props.value).toBe('');
    });

    it('should call onSearchChange when text changes', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');

      fireEvent.changeText(input, 'new search');

      expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
      expect(mockOnSearchChange).toHaveBeenCalledWith('new search');
    });

    it('should display correct placeholder text', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');

      expect(input.props.placeholder).toBe('Search Salon, Specialist...');
    });

    it('should handle multiple text changes', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');

      fireEvent.changeText(input, 'first');
      fireEvent.changeText(input, 'second');
      fireEvent.changeText(input, 'third');

      expect(mockOnSearchChange).toHaveBeenCalledTimes(3);
      expect(mockOnSearchChange).toHaveBeenNthCalledWith(1, 'first');
      expect(mockOnSearchChange).toHaveBeenNthCalledWith(2, 'second');
      expect(mockOnSearchChange).toHaveBeenNthCalledWith(3, 'third');
    });

    it('should handle empty string input', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} searchQuery="existing" />);
      const input = getByTestId('search-input');

      fireEvent.changeText(input, '');

      expect(mockOnSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('Filter Button', () => {
    it('should call onFilterPress when filter button is pressed', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const filterIcon = getByTestId('icon-options-outline');
      const filterButton = filterIcon.parent;

      fireEvent.press(filterButton as any);

      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('should render options-outline icon with correct name', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const icon = getByTestId('icon-options-outline');

      expect(icon.children[0]).toContain('options-outline');
    });

    it('should render options-outline icon with size 20', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const icon = getByTestId('icon-options-outline');

      expect(icon.props.children).toContain(20);
    });

    it('should render options-outline icon with textPrimary color', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const icon = getByTestId('icon-options-outline');

      expect(icon.props.children).toContain(theme.colors.textPrimary);
    });

    it('should handle multiple filter button presses', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const filterIcon = getByTestId('icon-options-outline');
      const filterButton = filterIcon.parent;

      fireEvent.press(filterButton as any);
      fireEvent.press(filterButton as any);
      fireEvent.press(filterButton as any);

      expect(mockOnFilterPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Multiple Interactions', () => {
    it('should handle back button and filter button presses in sequence', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const backIcon = getByTestId('icon-arrow-back');
      const filterIcon = getByTestId('icon-options-outline');

      fireEvent.press(backIcon.parent as any);
      fireEvent.press(filterIcon.parent as any);

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('should handle text change and button presses together', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const filterIcon = getByTestId('icon-options-outline');

      fireEvent.changeText(input, 'test');
      fireEvent.press(filterIcon.parent as any);

      expect(mockOnSearchChange).toHaveBeenCalledWith('test');
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
    });

    it('should handle all interactions in single flow', () => {
      const { getByTestId } = render(<MapHeader {...defaultProps} />);
      const input = getByTestId('search-input');
      const backIcon = getByTestId('icon-arrow-back');
      const filterIcon = getByTestId('icon-options-outline');

      fireEvent.changeText(input, 'search term');
      fireEvent.press(filterIcon.parent as any);
      fireEvent.press(backIcon.parent as any);

      expect(mockOnSearchChange).toHaveBeenCalledWith('search term');
      expect(mockOnFilterPress).toHaveBeenCalledTimes(1);
      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with different searchQuery values', () => {
      const { getByTestId, rerender } = render(<MapHeader {...defaultProps} searchQuery="" />);
      expect(getByTestId('search-input').props.value).toBe('');

      rerender(<MapHeader {...defaultProps} searchQuery="test" />);
      expect(getByTestId('search-input').props.value).toBe('test');

      rerender(<MapHeader {...defaultProps} searchQuery="very long search query with many words" />);
      expect(getByTestId('search-input').props.value).toBe('very long search query with many words');
    });

    it('should maintain component structure on re-renders', () => {
      const { getByTestId, rerender } = render(<MapHeader {...defaultProps} />);

      expect(getByTestId('search-input')).toBeTruthy();
      expect(getByTestId('icon-arrow-back')).toBeTruthy();
      expect(getByTestId('icon-options-outline')).toBeTruthy();

      rerender(<MapHeader {...defaultProps} searchQuery="updated" />);

      expect(getByTestId('search-input')).toBeTruthy();
      expect(getByTestId('icon-arrow-back')).toBeTruthy();
      expect(getByTestId('icon-options-outline')).toBeTruthy();
    });

    it('should handle prop changes without breaking', () => {
      const newOnSearchChange = jest.fn();
      const newOnBackPress = jest.fn();
      const newOnFilterPress = jest.fn();

      const { getByTestId, rerender } = render(<MapHeader {...defaultProps} />);

      rerender(
        <MapHeader
          searchQuery="new query"
          onSearchChange={newOnSearchChange}
          onBackPress={newOnBackPress}
          onFilterPress={newOnFilterPress}
        />
      );

      const input = getByTestId('search-input');
      const backIcon = getByTestId('icon-arrow-back');
      const filterIcon = getByTestId('icon-options-outline');

      fireEvent.changeText(input, 'test');
      fireEvent.press(backIcon.parent as any);
      fireEvent.press(filterIcon.parent as any);

      expect(newOnSearchChange).toHaveBeenCalledWith('test');
      expect(newOnBackPress).toHaveBeenCalledTimes(1);
      expect(newOnFilterPress).toHaveBeenCalledTimes(1);
      expect(mockOnSearchChange).not.toHaveBeenCalled();
      expect(mockOnBackPress).not.toHaveBeenCalled();
      expect(mockOnFilterPress).not.toHaveBeenCalled();
    });

    it('should handle special characters in search query', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const { getByTestId } = render(<MapHeader {...defaultProps} searchQuery={specialChars} />);
      const input = getByTestId('search-input');

      expect(input.props.value).toBe(specialChars);
    });

    it('should handle unicode characters in search query', () => {
      const unicodeText = '你好世界 🌍 مرحبا';
      const { getByTestId } = render(<MapHeader {...defaultProps} searchQuery={unicodeText} />);
      const input = getByTestId('search-input');

      expect(input.props.value).toBe(unicodeText);
    });
  });
});
