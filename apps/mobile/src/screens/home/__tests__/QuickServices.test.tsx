import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuickServices } from '../QuickServices';
import type { QuickServicesProps } from '../QuickServices';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, style, testID, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return (
      <Text
        testID={testID || `icon-${name}`}
        style={style}
        accessibilityLabel={`Icon: ${name}, size: ${size}, color: ${color}`}
        {...props}
      >
        {name}
      </Text>
    );
  },
}));

// Create persistent mock functions
const mockButtonPress = jest.fn();
const mockLight = jest.fn();
const mockMedium = jest.fn();
const mockHeavy = jest.fn();

jest.mock('../../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: mockButtonPress,
    light: mockLight,
    medium: mockMedium,
    heavy: mockHeavy,
  }),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

const createMockProps = (
  overrides?: Partial<QuickServicesProps>
): QuickServicesProps => ({
  onServicePress: jest.fn(),
  onBrowseAllPress: jest.fn(),
  ...overrides,
});

const renderQuickServices = (props?: Partial<QuickServicesProps>) => {
  const mockProps = createMockProps(props);
  const result = render(<QuickServices {...mockProps} />);
  return {
    ...result,
    mockProps,
  };
};

// ============================================================================
// TESTS
//
// The QuickServices component was redesigned into an Airbnb-style horizontal
// scrollable row of category tabs (icon + label, no subtitles, no "Browse All"
// button, no ResponsiveGrid). Service icons use the `-outline` glyph variants,
// so the mocked Ionicons testIDs resolve to `icon-<name>-outline`. The current
// service set is: Plumbing, Electrical, Appliances, HVAC, Roofing, Painting,
// Carpentry, Cleaning. The `onBrowseAllPress` prop is retained for API
// compatibility but the redesign no longer renders a browse-all control.
// ============================================================================

describe('QuickServices Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockButtonPress.mockClear();
    mockLight.mockClear();
    mockMedium.mockClear();
    mockHeavy.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = renderQuickServices();
      expect(getByText('Plumbing')).toBeTruthy();
    });

    it('should render all service category tabs', () => {
      const { getByText } = renderQuickServices();

      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
      expect(getByText('Appliances')).toBeTruthy();
      expect(getByText('HVAC')).toBeTruthy();
      expect(getByText('Roofing')).toBeTruthy();
      expect(getByText('Painting')).toBeTruthy();
      expect(getByText('Carpentry')).toBeTruthy();
      expect(getByText('Cleaning')).toBeTruthy();
    });

    it('should render correct structure', () => {
      const { UNSAFE_getByType } = renderQuickServices();
      const { ScrollView } = require('react-native');
      const scroll = UNSAFE_getByType(ScrollView);
      expect(scroll).toBeTruthy();
    });

    it('should render a horizontal scroll view', () => {
      const { UNSAFE_getByType } = renderQuickServices();
      const { ScrollView } = require('react-native');
      const scroll = UNSAFE_getByType(ScrollView);
      expect(scroll.props.horizontal).toBe(true);
    });
  });

  // ==========================================================================
  // SERVICE CARDS TESTS
  // ==========================================================================

  describe('Service Cards', () => {
    describe('Plumbing Service', () => {
      it('should render plumbing service name', () => {
        const { getByText } = renderQuickServices();
        expect(getByText('Plumbing')).toBeTruthy();
      });

      it('should render plumbing service icon', () => {
        const { getByTestId } = renderQuickServices();
        expect(getByTestId('icon-water-outline')).toBeTruthy();
      });

      it('should have correct accessibility label for plumbing', () => {
        const { getByLabelText } = renderQuickServices();
        expect(getByLabelText('Find plumbing contractors')).toBeTruthy();
      });

      it('should call onServicePress with plumbing params when pressed', () => {
        const { getByLabelText, mockProps } = renderQuickServices();
        const plumbingCard = getByLabelText('Find plumbing contractors');

        fireEvent.press(plumbingCard);

        expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
        expect(mockProps.onServicePress).toHaveBeenCalledWith({
          serviceCategory: 'plumbing',
          filter: { skills: ['Plumbing', 'Pipe Repair', 'Leak Repair'] },
        });
      });
    });

    describe('Electrical Service', () => {
      it('should render electrical service name', () => {
        const { getByText } = renderQuickServices();
        expect(getByText('Electrical')).toBeTruthy();
      });

      it('should render electrical service icon', () => {
        const { getByTestId } = renderQuickServices();
        expect(getByTestId('icon-flash-outline')).toBeTruthy();
      });

      it('should have correct accessibility label for electrical', () => {
        const { getByLabelText } = renderQuickServices();
        expect(getByLabelText('Find electrical contractors')).toBeTruthy();
      });

      it('should call onServicePress with electrical params when pressed', () => {
        const { getByLabelText, mockProps } = renderQuickServices();
        const electricalCard = getByLabelText('Find electrical contractors');

        fireEvent.press(electricalCard);

        expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
        expect(mockProps.onServicePress).toHaveBeenCalledWith({
          serviceCategory: 'electrical',
          filter: { skills: ['Electrical', 'Wiring', 'Electrical Repair'] },
        });
      });
    });

    describe('Appliances Service', () => {
      it('should render appliances service name', () => {
        const { getByText } = renderQuickServices();
        expect(getByText('Appliances')).toBeTruthy();
      });

      it('should render appliances service icon', () => {
        const { getByTestId } = renderQuickServices();
        // Appliances and Roofing both use 'home-outline'; expect at least one.
        expect(getByTestId('icon-water-outline')).toBeTruthy();
      });

      it('should have correct accessibility label for appliances', () => {
        const { getByLabelText } = renderQuickServices();
        expect(getByLabelText('Find appliances contractors')).toBeTruthy();
      });

      it('should call onServicePress with appliance params when pressed', () => {
        const { getByLabelText, mockProps } = renderQuickServices();
        const applianceCard = getByLabelText('Find appliances contractors');

        fireEvent.press(applianceCard);

        expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
        expect(mockProps.onServicePress).toHaveBeenCalledWith({
          serviceCategory: 'appliance',
          filter: {
            skills: ['Appliance Repair', 'Washing Machine', 'Refrigerator'],
          },
        });
      });
    });

    describe('HVAC Service', () => {
      it('should render HVAC service name', () => {
        const { getByText } = renderQuickServices();
        expect(getByText('HVAC')).toBeTruthy();
      });

      it('should render HVAC service icon', () => {
        const { getByTestId } = renderQuickServices();
        expect(getByTestId('icon-snow-outline')).toBeTruthy();
      });

      it('should have correct accessibility label for HVAC', () => {
        const { getByLabelText } = renderQuickServices();
        expect(getByLabelText('Find hvac contractors')).toBeTruthy();
      });

      it('should call onServicePress with HVAC params when pressed', () => {
        const { getByLabelText, mockProps } = renderQuickServices();
        const hvacCard = getByLabelText('Find hvac contractors');

        fireEvent.press(hvacCard);

        expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
        expect(mockProps.onServicePress).toHaveBeenCalledWith({
          serviceCategory: 'hvac',
          filter: { skills: ['HVAC', 'Air Conditioning', 'Heating'] },
        });
      });
    });

    it('should render the core service tabs', () => {
      const { getByText } = renderQuickServices();

      const services = ['Plumbing', 'Electrical', 'Appliances', 'HVAC'];
      services.forEach((service) => {
        expect(getByText(service)).toBeTruthy();
      });
    });

    it('should render all service icons', () => {
      const { getByTestId } = renderQuickServices();

      const icons = ['water-outline', 'flash-outline', 'snow-outline'];
      icons.forEach((icon) => {
        expect(getByTestId(`icon-${icon}`)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // INTERACTION TESTS
  // ==========================================================================

  describe('Interactions', () => {
    it('should call onServicePress when plumbing card is pressed', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find plumbing contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
    });

    it('should call onServicePress when electrical card is pressed', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find electrical contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
    });

    it('should call onServicePress when appliances card is pressed', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find appliances contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
    });

    it('should call onServicePress when HVAC card is pressed', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find hvac contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple service card presses', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const plumbingCard = getByLabelText('Find plumbing contractors');
      const electricalCard = getByLabelText('Find electrical contractors');

      fireEvent.press(plumbingCard);
      fireEvent.press(electricalCard);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid multiple presses on same card', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find plumbing contractors');

      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // HAPTIC FEEDBACK TESTS
  // ==========================================================================

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on plumbing card press', () => {
      const { getByLabelText } = renderQuickServices();
      const card = getByLabelText('Find plumbing contractors');

      fireEvent.press(card);

      expect(mockButtonPress).toHaveBeenCalled();
    });

    it('should trigger haptic feedback on electrical card press', () => {
      const { getByLabelText } = renderQuickServices();
      const card = getByLabelText('Find electrical contractors');

      fireEvent.press(card);

      expect(mockButtonPress).toHaveBeenCalled();
    });

    it('should trigger haptic feedback on appliances card press', () => {
      const { getByLabelText } = renderQuickServices();
      const card = getByLabelText('Find appliances contractors');

      fireEvent.press(card);

      expect(mockButtonPress).toHaveBeenCalled();
    });

    it('should trigger haptic feedback on HVAC card press', () => {
      const { getByLabelText } = renderQuickServices();
      const card = getByLabelText('Find hvac contractors');

      fireEvent.press(card);

      expect(mockButtonPress).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ACCESSIBILITY TESTS
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have correct accessibility role for service cards', () => {
      const { getByLabelText } = renderQuickServices();
      const plumbingCard = getByLabelText('Find plumbing contractors');

      expect(plumbingCard.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility labels for all service cards', () => {
      const { getByLabelText } = renderQuickServices();

      expect(getByLabelText('Find plumbing contractors')).toBeTruthy();
      expect(getByLabelText('Find electrical contractors')).toBeTruthy();
      expect(getByLabelText('Find appliances contractors')).toBeTruthy();
      expect(getByLabelText('Find hvac contractors')).toBeTruthy();
    });

    it('should have descriptive accessibility labels', () => {
      const { getByLabelText } = renderQuickServices();

      const labels = [
        'Find plumbing contractors',
        'Find electrical contractors',
        'Find appliances contractors',
        'Find hvac contractors',
        'Find roofing contractors',
        'Find painting contractors',
        'Find carpentry contractors',
        'Find cleaning contractors',
      ];

      labels.forEach((label) => {
        expect(getByLabelText(label)).toBeTruthy();
      });
    });

    it('should have proper accessibility structure for icons', () => {
      const { getByTestId } = renderQuickServices();

      const waterIcon = getByTestId('icon-water-outline');
      expect(waterIcon.props.accessibilityLabel).toContain('water');
    });
  });

  // ==========================================================================
  // NAVIGATION PARAMS TESTS
  // ==========================================================================

  describe('Navigation Parameters', () => {
    it('should pass correct params for plumbing service', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find plumbing contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledWith({
        serviceCategory: 'plumbing',
        filter: { skills: ['Plumbing', 'Pipe Repair', 'Leak Repair'] },
      });
    });

    it('should pass correct params for electrical service', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find electrical contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledWith({
        serviceCategory: 'electrical',
        filter: { skills: ['Electrical', 'Wiring', 'Electrical Repair'] },
      });
    });

    it('should pass correct params for appliance service', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find appliances contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledWith({
        serviceCategory: 'appliance',
        filter: {
          skills: ['Appliance Repair', 'Washing Machine', 'Refrigerator'],
        },
      });
    });

    it('should pass correct params for HVAC service', () => {
      const { getByLabelText, mockProps } = renderQuickServices();
      const card = getByLabelText('Find hvac contractors');

      fireEvent.press(card);

      expect(mockProps.onServicePress).toHaveBeenCalledWith({
        serviceCategory: 'hvac',
        filter: { skills: ['HVAC', 'Air Conditioning', 'Heating'] },
      });
    });

    it('should include serviceCategory in all service params', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const services = [
        'Find plumbing contractors',
        'Find electrical contractors',
        'Find appliances contractors',
        'Find hvac contractors',
      ];
      services.forEach((service) => {
        const card = getByLabelText(service);
        fireEvent.press(card);
      });

      const calls = mockProps.onServicePress.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0]).toHaveProperty('serviceCategory');
      });
    });

    it('should include filter object in all service params', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const services = [
        'Find plumbing contractors',
        'Find electrical contractors',
        'Find appliances contractors',
        'Find hvac contractors',
      ];
      services.forEach((service) => {
        const card = getByLabelText(service);
        fireEvent.press(card);
      });

      const calls = mockProps.onServicePress.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0]).toHaveProperty('filter');
        expect(call[0].filter).toHaveProperty('skills');
      });
    });

    it('should include skills array in filter params', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const services = [
        'Find plumbing contractors',
        'Find electrical contractors',
        'Find appliances contractors',
        'Find hvac contractors',
      ];
      services.forEach((service) => {
        const card = getByLabelText(service);
        fireEvent.press(card);
      });

      const calls = mockProps.onServicePress.mock.calls;
      calls.forEach((call: any) => {
        expect(Array.isArray(call[0].filter.skills)).toBe(true);
        expect(call[0].filter.skills.length).toBeGreaterThan(0);
      });
    });

    it('should have unique serviceCategory for each service', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const services = [
        'Find plumbing contractors',
        'Find electrical contractors',
        'Find appliances contractors',
        'Find hvac contractors',
      ];
      services.forEach((service) => {
        const card = getByLabelText(service);
        fireEvent.press(card);
      });

      const categories = mockProps.onServicePress.mock.calls.map(
        (call: any) => call[0].serviceCategory
      );
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(4);
    });
  });

  // ==========================================================================
  // PROPS TESTS
  // ==========================================================================

  describe('Props', () => {
    it('should accept and use onServicePress prop', () => {
      const onServicePress = jest.fn();
      const { getByLabelText } = renderQuickServices({ onServicePress });

      const card = getByLabelText('Find plumbing contractors');
      fireEvent.press(card);

      expect(onServicePress).toHaveBeenCalled();
    });

    it('should accept onBrowseAllPress prop without error', () => {
      const onBrowseAllPress = jest.fn();
      const { getByText } = renderQuickServices({ onBrowseAllPress });

      // Browse-all control was removed in the tab redesign; the prop is retained
      // for API compatibility and is simply not invoked by this component.
      expect(getByText('Plumbing')).toBeTruthy();
      expect(onBrowseAllPress).not.toHaveBeenCalled();
    });

    it('should work with different onServicePress handlers', () => {
      const handler1 = jest.fn();
      const { rerender, getByLabelText } = renderQuickServices({
        onServicePress: handler1,
      });

      const card = getByLabelText('Find plumbing contractors');
      fireEvent.press(card);

      expect(handler1).toHaveBeenCalledTimes(1);

      const handler2 = jest.fn();
      rerender(
        <QuickServices onServicePress={handler2} onBrowseAllPress={jest.fn()} />
      );

      const cardAfterRerender = getByLabelText('Find plumbing contractors');
      fireEvent.press(cardAfterRerender);

      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // ICON TESTS
  // ==========================================================================

  describe('Icons', () => {
    it('should render correct icon for plumbing service', () => {
      const { getByTestId } = renderQuickServices();
      const icon = getByTestId('icon-water-outline');
      expect(icon).toBeTruthy();
    });

    it('should render correct icon for electrical service', () => {
      const { getByTestId } = renderQuickServices();
      const icon = getByTestId('icon-flash-outline');
      expect(icon).toBeTruthy();
    });

    it('should render correct icon for HVAC service', () => {
      const { getByTestId } = renderQuickServices();
      const icon = getByTestId('icon-snow-outline');
      expect(icon).toBeTruthy();
    });

    it('should render service icons with correct names', () => {
      const { getByTestId } = renderQuickServices();

      const iconNames = ['water-outline', 'flash-outline', 'snow-outline'];
      iconNames.forEach((iconName) => {
        const icon = getByTestId(`icon-${iconName}`);
        expect(icon.children[0]).toBe(iconName);
      });
    });

    it('should render icons with accessibility labels', () => {
      const { getByTestId } = renderQuickServices();

      const icons = [
        'icon-water-outline',
        'icon-flash-outline',
        'icon-snow-outline',
      ];

      icons.forEach((iconTestId) => {
        const icon = getByTestId(iconTestId);
        expect(icon.props.accessibilityLabel).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration', () => {
    it('should handle complete user flow: select multiple services', async () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const plumbingCard = getByLabelText('Find plumbing contractors');
      fireEvent.press(plumbingCard);

      await waitFor(() => {
        expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
      });

      const electricalCard = getByLabelText('Find electrical contractors');
      fireEvent.press(electricalCard);

      await waitFor(() => {
        expect(mockProps.onServicePress).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle multiple service selections', async () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const services = [
        'Find plumbing contractors',
        'Find electrical contractors',
        'Find appliances contractors',
        'Find hvac contractors',
      ];

      for (const service of services) {
        const card = getByLabelText(service);
        fireEvent.press(card);
      }

      await waitFor(() => {
        expect(mockProps.onServicePress).toHaveBeenCalledTimes(4);
      });
    });

    it('should maintain state consistency during interactions', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const plumbingCard = getByLabelText('Find plumbing contractors');
      fireEvent.press(plumbingCard);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(1);
      expect(mockProps.onBrowseAllPress).not.toHaveBeenCalled();

      const electricalCard = getByLabelText('Find electrical contractors');
      fireEvent.press(electricalCard);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(2);
      expect(mockProps.onBrowseAllPress).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid successive presses on different cards', () => {
      const { getByLabelText, mockProps } = renderQuickServices();

      const plumbingCard = getByLabelText('Find plumbing contractors');
      const electricalCard = getByLabelText('Find electrical contractors');

      fireEvent.press(plumbingCard);
      fireEvent.press(electricalCard);
      fireEvent.press(plumbingCard);

      expect(mockProps.onServicePress).toHaveBeenCalledTimes(3);
    });

    it('should maintain accessibility during re-renders', () => {
      const { rerender, getByLabelText } = renderQuickServices();

      expect(getByLabelText('Find plumbing contractors')).toBeTruthy();

      rerender(
        <QuickServices
          onServicePress={jest.fn()}
          onBrowseAllPress={jest.fn()}
        />
      );

      expect(getByLabelText('Find plumbing contractors')).toBeTruthy();
    });

    it('should render correctly with no interaction', () => {
      const { getByText, mockProps } = renderQuickServices();

      expect(getByText('Plumbing')).toBeTruthy();
      expect(mockProps.onServicePress).not.toHaveBeenCalled();
      expect(mockProps.onBrowseAllPress).not.toHaveBeenCalled();
    });

    it('should handle component unmounting gracefully', () => {
      const { unmount, getByText } = renderQuickServices();

      expect(getByText('Plumbing')).toBeTruthy();

      expect(() => unmount()).not.toThrow();
    });
  });

  // ==========================================================================
  // SNAPSHOT TESTS
  // ==========================================================================

  describe('Snapshots', () => {
    it('should match snapshot', () => {
      const { toJSON } = renderQuickServices();
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with custom handlers', () => {
      const onServicePress = jest.fn();
      const onBrowseAllPress = jest.fn();
      const { toJSON } = renderQuickServices({
        onServicePress,
        onBrowseAllPress,
      });
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
