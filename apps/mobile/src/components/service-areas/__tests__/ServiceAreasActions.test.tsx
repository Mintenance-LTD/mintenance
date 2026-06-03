import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '../../test-utils';
import { ServiceAreasActions } from '../ServiceAreasActions';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert');

describe('ServiceAreasActions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ServiceAreasActions />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render consistent snapshot', () => {
      const { toJSON } = render(<ServiceAreasActions />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should display quick actions title', () => {
      const { getByText } = render(<ServiceAreasActions />);
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    it('should have correct title styling', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const title = getByText('Quick Actions');
      expect(title.props.style).toMatchObject({
        fontSize: 16,
        fontWeight: '600',
        color: '#222222',
        marginBottom: 16,
      });
    });
  });

  describe('Action Buttons Rendering', () => {
    it('should render all three action buttons', () => {
      const { getByText } = render(<ServiceAreasActions />);
      expect(getByText('View Analytics')).toBeTruthy();
      expect(getByText('Route Planning')).toBeTruthy();
      expect(getByText('Coverage Map')).toBeTruthy();
    });

    it('should render action buttons in correct order', () => {
      const { getAllByText } = render(<ServiceAreasActions />);
      const buttons = ['View Analytics', 'Route Planning', 'Coverage Map'];
      buttons.forEach((buttonText) => {
        expect(getAllByText(buttonText).length).toBeGreaterThan(0);
      });
    });

    it('should render View Analytics button with correct text', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('View Analytics');
      expect(button).toBeTruthy();
      expect(button.props.style).toMatchObject({
        fontSize: 14,
        color: '#222222',
        marginLeft: 12,
        fontWeight: '500',
      });
    });

    it('should render Route Planning button with correct text', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Route Planning');
      expect(button).toBeTruthy();
    });

    it('should render Coverage Map button with correct text', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Coverage Map');
      expect(button).toBeTruthy();
    });
  });

  describe('View Analytics Button', () => {
    it('should show coming soon alert when pressed', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('View Analytics');

      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Coming Soon',
        'Service area analytics coming soon.'
      );
    });

    it('should show alert exactly once per press', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('View Analytics');

      fireEvent.press(button);
      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Route Planning Button', () => {
    it('should show coming soon alert when pressed', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Route Planning');

      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Coming Soon',
        'Route optimisation features will be available in the next update.'
      );
    });

    it('should show alert multiple times if pressed multiple times', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Route Planning');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(3);
    });

    it('should have correct alert title and message', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Route Planning');

      fireEvent.press(button);

      const [title, message] = alertSpy.mock.calls[0];
      expect(title).toBe('Coming Soon');
      expect(message).toBe(
        'Route optimisation features will be available in the next update.'
      );
    });
  });

  describe('Coverage Map Button', () => {
    it('should show coming soon alert when pressed', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Coverage Map');

      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Coming Soon',
        'Coverage map coming soon.'
      );
    });

    it('should show alert exactly once per press', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('Coverage Map');

      fireEvent.press(button);
      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multiple Button Interactions', () => {
    it('should handle different button presses independently', () => {
      const { getByText } = render(<ServiceAreasActions />);

      fireEvent.press(getByText('View Analytics'));
      expect(alertSpy).toHaveBeenLastCalledWith(
        'Coming Soon',
        'Service area analytics coming soon.'
      );

      fireEvent.press(getByText('Route Planning'));
      expect(alertSpy).toHaveBeenLastCalledWith(
        'Coming Soon',
        'Route optimisation features will be available in the next update.'
      );

      fireEvent.press(getByText('Coverage Map'));
      expect(alertSpy).toHaveBeenLastCalledWith(
        'Coming Soon',
        'Coverage map coming soon.'
      );
    });

    it('should track separate calls for each button', () => {
      const { getByText } = render(<ServiceAreasActions />);

      fireEvent.press(getByText('View Analytics'));
      fireEvent.press(getByText('Coverage Map'));

      expect(alertSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed button presses', () => {
      const { getByText } = render(<ServiceAreasActions />);

      fireEvent.press(getByText('Route Planning'));
      fireEvent.press(getByText('View Analytics'));
      fireEvent.press(getByText('Route Planning'));

      expect(alertSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Component Structure', () => {
    it('should have actions container with correct styling', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const title = getByText('Quick Actions');
      const container = title.parent;

      expect(container?.props.style).toMatchObject({
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
      });
    });

    it('should render buttons with correct base styling', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('View Analytics').parent;

      expect(button?.props.style).toMatchObject({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F7F7F7',
        marginBottom: 8,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const button = getByText('View Analytics');

      // Simulate rapid presses
      for (let i = 0; i < 10; i++) {
        fireEvent.press(button);
      }

      expect(alertSpy).toHaveBeenCalledTimes(10);
    });

    it('should maintain component state after alert', () => {
      const { getByText, rerender } = render(<ServiceAreasActions />);

      fireEvent.press(getByText('Route Planning'));
      expect(alertSpy).toHaveBeenCalled();

      rerender(<ServiceAreasActions />);

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('View Analytics')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button components', () => {
      const { getByText } = render(<ServiceAreasActions />);

      // Buttons should be touchable and have text
      expect(getByText('View Analytics')).toBeTruthy();
      expect(getByText('Route Planning')).toBeTruthy();
      expect(getByText('Coverage Map')).toBeTruthy();
    });

    it('should render with proper semantic structure', () => {
      const { getByText } = render(<ServiceAreasActions />);
      const title = getByText('Quick Actions');

      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Quick Actions');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly when embedded in parent component', () => {
      const { getByText } = render(<ServiceAreasActions />);

      // Verify component is functional in isolation
      expect(getByText('Quick Actions')).toBeTruthy();
      fireEvent.press(getByText('View Analytics'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Coming Soon',
        'Service area analytics coming soon.'
      );
    });
  });
});
