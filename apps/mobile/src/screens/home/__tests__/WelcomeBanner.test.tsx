/**
 * WelcomeBanner Component Tests
 *
 * The WelcomeBanner was redesigned (Mint Editorial / Airbnb-style) from a
 * greeting banner into a segmented search bar: Property | Urgency | Service.
 * It no longer takes a `user` prop. These tests cover the current contract:
 * rendering, segment labels/values, press handlers, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WelcomeBanner } from '../WelcomeBanner';

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('WelcomeBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // SECTION 1: RENDERING TESTS
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<WelcomeBanner />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render without crashing when no handlers are provided', () => {
      const { toJSON } = render(<WelcomeBanner />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all three segment labels', () => {
      render(<WelcomeBanner />);

      expect(screen.getByText('Property')).toBeTruthy();
      expect(screen.getByText('Urgency')).toBeTruthy();
      expect(screen.getByText('Service')).toBeTruthy();
    });

    it('should render default segment values', () => {
      render(<WelcomeBanner />);

      expect(screen.getByText('Select')).toBeTruthy();
      expect(screen.getByText('Medium')).toBeTruthy();
      expect(screen.getByText('Browse all')).toBeTruthy();
    });

    it('should render the search request button', () => {
      render(<WelcomeBanner />);

      const searchButton = screen.getByLabelText('Request a service');
      expect(searchButton).toBeTruthy();
    });

    it('should render the Ionicons search icon', () => {
      const { UNSAFE_getByType } = render(<WelcomeBanner />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon).toBeTruthy();
    });

    it('should match snapshot with default props', () => {
      const tree = render(<WelcomeBanner />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot with custom labels', () => {
      const tree = render(
        <WelcomeBanner propertyLabel='123 Main St' urgencyLabel='High' />
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should render banner as top-level View', () => {
      const { toJSON } = render(<WelcomeBanner />);
      expect(toJSON()?.type).toBe('View');
    });
  });

  // SECTION 2: SEGMENT VALUE DISPLAY TESTS
  describe('Segment Value Display', () => {
    it('should display propertyLabel when provided', () => {
      render(<WelcomeBanner propertyLabel='42 Oak Avenue' />);

      expect(screen.getByText('42 Oak Avenue')).toBeTruthy();
      expect(screen.queryByText('Select')).toBeFalsy();
    });

    it('should fall back to "Select" when propertyLabel is not provided', () => {
      render(<WelcomeBanner />);

      expect(screen.getByText('Select')).toBeTruthy();
    });

    it('should fall back to "Select" when propertyLabel is empty string', () => {
      render(<WelcomeBanner propertyLabel='' />);

      expect(screen.getByText('Select')).toBeTruthy();
    });

    it('should display urgencyLabel when provided', () => {
      render(<WelcomeBanner urgencyLabel='Emergency' />);

      expect(screen.getByText('Emergency')).toBeTruthy();
      expect(screen.queryByText('Medium')).toBeFalsy();
    });

    it('should fall back to "Medium" when urgencyLabel is not provided', () => {
      render(<WelcomeBanner />);

      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('should always display the static "Browse all" service value', () => {
      render(<WelcomeBanner />);

      expect(screen.getByText('Browse all')).toBeTruthy();
    });

    it('should display long propertyLabel', () => {
      const longLabel = 'Flat 12B, The Tall Building, Long Road, London';
      render(<WelcomeBanner propertyLabel={longLabel} />);

      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('should display propertyLabel with special characters', () => {
      render(<WelcomeBanner propertyLabel="O'Brien's Cottage" />);

      expect(screen.getByText("O'Brien's Cottage")).toBeTruthy();
    });
  });

  // SECTION 3: PRESS HANDLER TESTS
  describe('Press Handlers', () => {
    it('should call onServicePress when the search icon button is pressed', () => {
      const onServicePress = jest.fn();
      render(<WelcomeBanner onServicePress={onServicePress} />);

      fireEvent.press(screen.getByLabelText('Request a service'));
      expect(onServicePress).toHaveBeenCalledTimes(1);
    });

    it('should call onWherePress when the Property segment is pressed', () => {
      const onWherePress = jest.fn();
      render(<WelcomeBanner onWherePress={onWherePress} />);

      fireEvent.press(screen.getByText('Property'));
      expect(onWherePress).toHaveBeenCalledTimes(1);
    });

    it('should call onUrgencyPress when the Urgency segment is pressed', () => {
      const onUrgencyPress = jest.fn();
      render(<WelcomeBanner onUrgencyPress={onUrgencyPress} />);

      fireEvent.press(screen.getByText('Urgency'));
      expect(onUrgencyPress).toHaveBeenCalledTimes(1);
    });

    it('should call onServicePress when the Service segment is pressed', () => {
      const onServicePress = jest.fn();
      render(<WelcomeBanner onServicePress={onServicePress} />);

      fireEvent.press(screen.getByText('Service'));
      expect(onServicePress).toHaveBeenCalledTimes(1);
    });

    it('should not throw when pressing segments without handlers', () => {
      render(<WelcomeBanner />);

      expect(() => fireEvent.press(screen.getByText('Property'))).not.toThrow();
      expect(() => fireEvent.press(screen.getByText('Urgency'))).not.toThrow();
      expect(() => fireEvent.press(screen.getByText('Service'))).not.toThrow();
    });
  });

  // SECTION 4: ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have a search button with accessibilityRole "button"', () => {
      render(<WelcomeBanner />);

      const button = screen.getByLabelText('Request a service');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('should have a search button with accessibilityLabel "Request a service"', () => {
      render(<WelcomeBanner />);

      const button = screen.getByLabelText('Request a service');
      expect(button.props.accessibilityLabel).toBe('Request a service');
    });

    it('should expose segment labels readable by screen readers', () => {
      render(<WelcomeBanner />);

      expect(screen.getByText('Property').props.children).toBe('Property');
      expect(screen.getByText('Urgency').props.children).toBe('Urgency');
      expect(screen.getByText('Service').props.children).toBe('Service');
    });
  });

  // SECTION 5: ICON CONFIGURATION TESTS
  describe('Icon Configuration', () => {
    it('should render Ionicons with the "search" name', () => {
      const { UNSAFE_getByType } = render(<WelcomeBanner />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.name).toBe('search');
    });

    it('should render Ionicons with size 18', () => {
      const { UNSAFE_getByType } = render(<WelcomeBanner />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.size).toBe(18);
    });

    it('should render Ionicons with the onBrand color (#FFFFFF)', () => {
      const { UNSAFE_getByType } = render(<WelcomeBanner />);

      const icon = UNSAFE_getByType('Ionicons');
      expect(icon.props.color).toBe('#FFFFFF');
    });

    it('should render exactly one icon', () => {
      const { UNSAFE_getAllByType } = render(<WelcomeBanner />);

      const icons = UNSAFE_getAllByType('Ionicons');
      expect(icons.length).toBe(1);
    });
  });

  // SECTION 6: LAYOUT AND COMPOSITION TESTS
  describe('Layout and Composition', () => {
    it('should render the root View with a style', () => {
      const { toJSON } = render(<WelcomeBanner />);

      const root = toJSON();
      expect(root?.props?.style).toBeDefined();
    });

    it('should render multiple View elements', () => {
      const { UNSAFE_getAllByType } = render(<WelcomeBanner />);

      const views = UNSAFE_getAllByType('View');
      expect(views.length).toBeGreaterThan(1);
    });

    it('should render six Text elements (label + value per segment)', () => {
      const { UNSAFE_getAllByType } = render(<WelcomeBanner />);

      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(6);
    });

    it('should apply styles to every Text element', () => {
      const { UNSAFE_getAllByType } = render(<WelcomeBanner />);

      const texts = UNSAFE_getAllByType('Text');
      texts.forEach((text) => {
        expect(text.props.style).toBeDefined();
      });
    });

    it('should render the search button as a TouchableOpacity', () => {
      render(<WelcomeBanner />);

      const button = screen.getByLabelText('Request a service');
      expect(button.type).toBe('TouchableOpacity');
    });
  });

  // SECTION 7: RE-RENDER TESTS
  describe('Re-rendering', () => {
    it('should update propertyLabel when the prop changes', () => {
      const { rerender } = render(<WelcomeBanner propertyLabel='Home A' />);
      expect(screen.getByText('Home A')).toBeTruthy();

      rerender(<WelcomeBanner propertyLabel='Home B' />);
      expect(screen.queryByText('Home A')).toBeFalsy();
      expect(screen.getByText('Home B')).toBeTruthy();
    });

    it('should update urgencyLabel when the prop changes', () => {
      const { rerender } = render(<WelcomeBanner urgencyLabel='Low' />);
      expect(screen.getByText('Low')).toBeTruthy();

      rerender(<WelcomeBanner urgencyLabel='High' />);
      expect(screen.queryByText('Low')).toBeFalsy();
      expect(screen.getByText('High')).toBeTruthy();
    });

    it('should preserve static labels across re-renders', () => {
      const { rerender } = render(<WelcomeBanner propertyLabel='A' />);
      rerender(<WelcomeBanner propertyLabel='B' />);

      expect(screen.getByText('Property')).toBeTruthy();
      expect(screen.getByText('Urgency')).toBeTruthy();
      expect(screen.getByText('Service')).toBeTruthy();
      expect(screen.getByText('Browse all')).toBeTruthy();
    });
  });
});
