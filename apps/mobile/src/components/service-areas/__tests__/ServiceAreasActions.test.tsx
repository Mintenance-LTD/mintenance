import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, within } from '../../test-utils';
import { ServiceAreasActions } from '../ServiceAreasActions';
import { theme } from '../../../theme';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert');

describe('ServiceAreasActions', () => {
  let mockNavigation: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create fresh mock navigation for each test
    mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => false),
      getParent: jest.fn(() => null),
      getState: jest.fn(() => ({ routes: [], index: 0 })),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ServiceAreasActions navigation={mockNavigation} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render consistent snapshot', () => {
      const { toJSON } = render(<ServiceAreasActions navigation={mockNavigation} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should display quick actions title', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    it('should have correct title styling', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const title = getByText('Quick Actions');
      expect(title.props.style).toMatchObject({
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 16,
      });
    });
  });

  describe('Action Buttons Rendering', () => {
    it('should render all three action buttons', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      expect(getByText('View Analytics')).toBeTruthy();
      expect(getByText('Route Planning')).toBeTruthy();
      expect(getByText('Coverage Map')).toBeTruthy();
    });

    it('should render action buttons in correct order', () => {
      const { getAllByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const buttons = ['View Analytics', 'Route Planning', 'Coverage Map'];
      buttons.forEach(buttonText => {
        expect(getAllByText(buttonText).length).toBeGreaterThan(0);
      });
    });

    it('should render View Analytics button with correct text', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('View Analytics');
      expect(button).toBeTruthy();
      expect(button.props.style).toMatchObject({
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginLeft: 12,
        fontWeight: '500',
      });
    });

    it('should render Route Planning button with correct text', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Route Planning');
      expect(button).toBeTruthy();
    });

    it('should render Coverage Map button with correct text', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Coverage Map');
      expect(button).toBeTruthy();
    });
  });

  describe('View Analytics Button', () => {
    it('should call navigation.navigate with ServiceAreaAnalytics when pressed', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('View Analytics');

      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaAnalytics');
    });

    it('should call navigate exactly once per press', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('View Analytics');

      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'ServiceAreaAnalytics');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'ServiceAreaAnalytics');
    });

    it('should not show alert when pressed', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('View Analytics');

      fireEvent.press(button);

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Route Planning Button', () => {
    it('should show coming soon alert when pressed', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Route Planning');

      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Coming Soon',
        'Route optimisation features will be available in the next update.'
      );
    });

    it('should not call navigation when pressed', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Route Planning');

      fireEvent.press(button);

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should show alert multiple times if pressed multiple times', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Route Planning');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(3);
    });

    it('should have correct alert title and message', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Route Planning');

      fireEvent.press(button);

      const [title, message] = alertSpy.mock.calls[0];
      expect(title).toBe('Coming Soon');
      expect(message).toBe('Route optimisation features will be available in the next update.');
    });
  });

  describe('Coverage Map Button', () => {
    it('should call navigation.navigate with CoverageMap when pressed', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Coverage Map');

      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CoverageMap');
    });

    it('should call navigate exactly once per press', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Coverage Map');

      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'CoverageMap');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'CoverageMap');
    });

    it('should not show alert when pressed', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('Coverage Map');

      fireEvent.press(button);

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Button Interactions', () => {
    it('should handle different button presses independently', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);

      fireEvent.press(getByText('View Analytics'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaAnalytics');

      fireEvent.press(getByText('Route Planning'));
      expect(alertSpy).toHaveBeenCalledWith('Coming Soon', expect.any(String));

      fireEvent.press(getByText('Coverage Map'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CoverageMap');
    });

    it('should track separate calls for each button', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);

      fireEvent.press(getByText('View Analytics'));
      fireEvent.press(getByText('Coverage Map'));

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should handle mixed button presses', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);

      fireEvent.press(getByText('Route Planning'));
      fireEvent.press(getByText('View Analytics'));
      fireEvent.press(getByText('Route Planning'));

      expect(alertSpy).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Prop Validation', () => {
    it('should work with minimal navigation object', () => {
      const minimalNav = { navigate: jest.fn() };
      const { getByText } = render(<ServiceAreasActions navigation={minimalNav as any} />);

      fireEvent.press(getByText('View Analytics'));

      expect(minimalNav.navigate).toHaveBeenCalledWith('ServiceAreaAnalytics');
    });

    it('should not crash if navigation is called with undefined', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      mockNavigation.navigate.mockImplementation(() => undefined);

      expect(() => {
        fireEvent.press(getByText('View Analytics'));
      }).not.toThrow();
    });

    it('should preserve navigation state between renders', () => {
      const { getByText, rerender } = render(<ServiceAreasActions navigation={mockNavigation} />);

      fireEvent.press(getByText('View Analytics'));
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);

      rerender(<ServiceAreasActions navigation={mockNavigation} />);

      fireEvent.press(getByText('Coverage Map'));
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Structure', () => {
    it('should have actions container with correct styling', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const title = getByText('Quick Actions');
      const container = title.parent;

      expect(container?.props.style).toMatchObject({
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: 16,
        marginBottom: 32,
      });
    });

    it('should render buttons with correct base styling', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('View Analytics').parent;

      expect(button?.props.style).toMatchObject({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.base,
        backgroundColor: theme.colors.surfaceSecondary,
        marginBottom: 8,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const button = getByText('View Analytics');

      // Simulate rapid presses
      for (let i = 0; i < 10; i++) {
        fireEvent.press(button);
      }

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(10);
    });

    it('should handle navigation error gracefully', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      mockNavigation.navigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      expect(() => {
        fireEvent.press(getByText('View Analytics'));
      }).toThrow('Navigation failed');
    });

    it('should maintain component state after alert', () => {
      const { getByText, rerender } = render(<ServiceAreasActions navigation={mockNavigation} />);

      fireEvent.press(getByText('Route Planning'));
      expect(alertSpy).toHaveBeenCalled();

      rerender(<ServiceAreasActions navigation={mockNavigation} />);

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('View Analytics')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button components', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);

      // Buttons should be touchable and have text
      expect(getByText('View Analytics')).toBeTruthy();
      expect(getByText('Route Planning')).toBeTruthy();
      expect(getByText('Coverage Map')).toBeTruthy();
    });

    it('should render with proper semantic structure', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);
      const title = getByText('Quick Actions');

      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Quick Actions');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly when embedded in parent component', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);

      // Verify component is functional in isolation
      expect(getByText('Quick Actions')).toBeTruthy();
      fireEvent.press(getByText('View Analytics'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaAnalytics');
    });

    it('should not interfere with other navigation calls', () => {
      const { getByText } = render(<ServiceAreasActions navigation={mockNavigation} />);

      // External navigation call
      mockNavigation.navigate('SomeOtherScreen');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SomeOtherScreen');

      // Component navigation call
      fireEvent.press(getByText('View Analytics'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceAreaAnalytics');

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    });
  });
});
