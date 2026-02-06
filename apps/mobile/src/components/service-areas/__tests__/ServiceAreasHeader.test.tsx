
import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { ServiceAreasHeader } from '../ServiceAreasHeader';
import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../../theme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: any) => {
    const MockedIcon = require('react-native').Text;
    return <MockedIcon testID={testID || `icon-${name}`} {...props}>{name}</MockedIcon>;
  },
}));

// Create mock navigation
const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(() => null),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
});

describe('ServiceAreasHeader', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;

  beforeEach(() => {
    mockNavigation = createMockNavigation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render header title', () => {
      const { getByText } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(getByText('Service Areas')).toBeTruthy();
    });

    it('should render back button icon', () => {
      const { getByText } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(getByText('arrow-back')).toBeTruthy();
    });

    it('should render add button icon', () => {
      const { getByText } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(getByText('add')).toBeTruthy();
    });

    it('should have correct structure', () => {
      const { UNSAFE_getByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const view = UNSAFE_getByType(View);
      expect(view).toBeTruthy();
    });
  });

  describe('Back Button', () => {
    it('should call goBack when back button is pressed', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      // First touchable should be the back button
      fireEvent.press(touchables[0]);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('should not call navigate when back button is pressed', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[0]);

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should call goBack only once on single press', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[0]);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple presses of back button', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[0]);
      fireEvent.press(touchables[0]);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(2);
    });
  });

  describe('Add Button', () => {
    it('should navigate to CreateServiceArea when add button is pressed', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      // Second touchable should be the add button
      fireEvent.press(touchables[1]);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateServiceArea');
    });

    it('should not call goBack when add button is pressed', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[1]);

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('should navigate only once on single press', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[1]);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple presses of add button', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[1]);
      fireEvent.press(touchables[1]);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateServiceArea');
    });
  });

  describe('Navigation Prop', () => {
    it('should work with navigation prop', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(UNSAFE_getAllByType(TouchableOpacity).length).toBe(2);
    });

    it('should handle different navigation implementations', () => {
      const customNav = {
        ...mockNavigation,
        goBack: jest.fn(),
        navigate: jest.fn(),
      };

      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={customNav as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[0]);
      fireEvent.press(touchables[1]);

      expect(customNav.goBack).toHaveBeenCalledTimes(1);
      expect(customNav.navigate).toHaveBeenCalledWith('CreateServiceArea');
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const { toJSON } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should have consistent rendering', () => {
      const { toJSON: json1 } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const { toJSON: json2 } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      expect(json1).toEqual(json2);
    });
  });

  describe('Component Structure', () => {
    it('should render exactly two touchable components', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBe(2);
    });

    it('should render title text component', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const texts = UNSAFE_getAllByType(Text);
      const serviceAreasText = texts.find((text) =>
        text.props.children === 'Service Areas'
      );
      expect(serviceAreasText).toBeTruthy();
    });

    it('should have header as root component', () => {
      const { UNSAFE_getByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const rootView = UNSAFE_getByType(View);
      expect(rootView).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle navigation with undefined methods gracefully', () => {
      const partialNav = {
        navigate: jest.fn(),
        goBack: jest.fn(),
      } as any;

      expect(() => {
        render(<ServiceAreasHeader navigation={partialNav} />);
      }).not.toThrow();
    });

    it('should render correctly when re-rendered', () => {
      const { rerender, getByText } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);

      expect(getByText('Service Areas')).toBeTruthy();

      const newMockNav = createMockNavigation();
      rerender(<ServiceAreasHeader navigation={newMockNav as any} />);

      expect(getByText('Service Areas')).toBeTruthy();
    });

    it('should handle rapid button presses', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      // Rapid fire presses
      for (let i = 0; i < 5; i++) {
        fireEvent.press(touchables[0]);
      }

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(5);
    });

    it('should handle alternating button presses', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      fireEvent.press(touchables[0]);
      fireEvent.press(touchables[1]);
      fireEvent.press(touchables[0]);
      fireEvent.press(touchables[1]);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have touchable elements for interaction', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      expect(touchables.length).toBeGreaterThan(0);
      expect(touchables.length).toBe(2);
    });

    it('should render all required interactive elements', () => {
      const { UNSAFE_getAllByType } = render(<ServiceAreasHeader navigation={mockNavigation as any} />);
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      // Should have back button and add button
      expect(touchables[0]).toBeTruthy();
      expect(touchables[1]).toBeTruthy();
    });
  });
});
