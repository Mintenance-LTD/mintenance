jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { ContractorMarker } from '../ContractorMarker';
import { View, Text } from 'react-native';
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

describe('ContractorMarker', () => {
  const mockOnPress = jest.fn();
  const mockContractor = {
    id: 'contractor-123',
    verified: false,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render marker container View', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      const views = UNSAFE_getAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });

    it('should render person icon', () => {
      const { getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();
    });

    it('should have correct component structure', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Contractor Props', () => {
    it('should accept contractor with id', () => {
      const contractor = { id: 'test-id', verified: false };
      const { toJSON } = render(
        <ContractorMarker
          contractor={contractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should accept contractor with different id values', () => {
      const contractor1 = { id: 'contractor-1', verified: false };
      const contractor2 = { id: 'contractor-999', verified: false };

      const { toJSON: json1 } = render(
        <ContractorMarker
          contractor={contractor1}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const { toJSON: json2 } = render(
        <ContractorMarker
          contractor={contractor2}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(json1()).toBeTruthy();
      expect(json2()).toBeTruthy();
    });

    it('should render with verified contractor', () => {
      const verifiedContractor = { id: 'contractor-123', verified: true };
      const { toJSON } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render with non-verified contractor', () => {
      const nonVerifiedContractor = { id: 'contractor-123', verified: false };
      const { toJSON } = render(
        <ContractorMarker
          contractor={nonVerifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Selection State - Not Selected', () => {
    it('should render with isSelected=false', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should use primary color for icon when not selected', () => {
      const { getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();
    });

    it('should not apply selectedMarker style when not selected', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      const views = UNSAFE_getAllByType(View);
      const markerContainer = views[0];

      const styles = Array.isArray(markerContainer.props.style)
        ? markerContainer.props.style
        : [markerContainer.props.style];

      const hasScaleTransform = styles.some((style: any) =>
        style && style.transform && Array.isArray(style.transform)
      );
      expect(hasScaleTransform).toBe(false);
    });
  });

  describe('Selection State - Selected', () => {
    it('should render with isSelected=true', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should use white color for icon when selected', () => {
      const { getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();
    });

    it('should apply selectedMarker style when selected', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      const views = UNSAFE_getAllByType(View);
      const markerContainer = views[0];

      expect(markerContainer.props.style).toBeDefined();
    });

    it('should change icon color from primary to white when selected', () => {
      const { rerender, getByText, queryByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`person-20-${theme.colors.primary}`)).toBeNull();
      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();
    });
  });

  describe('Selection State Toggle', () => {
    it('should toggle from not selected to selected', () => {
      const { rerender, getByText, queryByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`person-20-${theme.colors.primary}`)).toBeNull();
      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();
    });

    it('should toggle from selected to not selected', () => {
      const { rerender, getByText, queryByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`person-20-${theme.colors.white}`)).toBeNull();
      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();
    });

    it('should handle multiple selection toggles', () => {
      const { rerender, getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();
    });
  });

  describe('Verified Badge - Not Verified', () => {
    it('should not render verified badge when contractor is not verified', () => {
      const nonVerifiedContractor = { id: 'contractor-123', verified: false };
      const { queryByText } = render(
        <ContractorMarker
          contractor={nonVerifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`checkmark-8-${theme.colors.white}`)).toBeNull();
    });

    it('should have correct View count when not verified', () => {
      const nonVerifiedContractor = { id: 'contractor-123', verified: false };
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={nonVerifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const views = UNSAFE_getAllByType(View);
      expect(views.length).toBe(2);
    });

    it('should not render checkmark icon when verified is false', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const texts = UNSAFE_getAllByType(Text);
      const hasCheckmark = texts.some(text =>
        text.props.children && String(text.props.children).includes('checkmark')
      );
      expect(hasCheckmark).toBe(false);
    });
  });

  describe('Verified Badge - Verified', () => {
    it('should render verified badge when contractor is verified', () => {
      const verifiedContractor = { id: 'contractor-123', verified: true };
      const { getByText } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`checkmark-8-${theme.colors.white}`)).toBeTruthy();
    });

    it('should have correct View count when verified', () => {
      const verifiedContractor = { id: 'contractor-123', verified: true };
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const views = UNSAFE_getAllByType(View);
      expect(views.length).toBe(3);
    });

    it('should render checkmark icon with size 8', () => {
      const verifiedContractor = { id: 'contractor-123', verified: true };
      const { getByText } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const checkmarkIcon = getByText(`checkmark-8-${theme.colors.white}`);
      expect(checkmarkIcon.props.children).toContain('checkmark');
      expect(checkmarkIcon.props.children).toContain(8);
    });

    it('should use white color for checkmark icon', () => {
      const verifiedContractor = { id: 'contractor-123', verified: true };
      const { getByText } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const checkmarkIcon = getByText(`checkmark-8-${theme.colors.white}`);
      expect(checkmarkIcon.props.children).toContain(theme.colors.white);
    });

    it('should show verified badge regardless of selection state', () => {
      const verifiedContractor = { id: 'contractor-123', verified: true };

      const { getByText: getWhenNotSelected } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(getWhenNotSelected(`checkmark-8-${theme.colors.white}`)).toBeTruthy();

      const { getByText: getWhenSelected } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(getWhenSelected(`checkmark-8-${theme.colors.white}`)).toBeTruthy();
    });
  });

  describe('Verified Badge Toggle', () => {
    it('should toggle verified badge when contractor verification changes', () => {
      const { rerender, queryByText, getByText } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`checkmark-8-${theme.colors.white}`)).toBeNull();

      rerender(
        <ContractorMarker
          contractor={{ id: 'test', verified: true }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`checkmark-8-${theme.colors.white}`)).toBeTruthy();
    });

    it('should remove verified badge when verification changes to false', () => {
      const { rerender, queryByText, getByText } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: true }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`checkmark-8-${theme.colors.white}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`checkmark-8-${theme.colors.white}`)).toBeNull();
    });
  });

  describe('Touch Interaction', () => {
    it('should call onPress when marker is touched', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress on render', () => {
      render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should call onPress only once on single touch', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple touches', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');
      fireEvent(markerContainer, 'touchEnd');
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('should work with different onPress handlers', () => {
      const customHandler = jest.fn();

      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={customHandler}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(customHandler).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when selected', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when verified', () => {
      const verifiedContractor = { id: 'test', verified: true };
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Person Icon', () => {
    it('should render person icon with size 20', () => {
      const { getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const personIcon = getByText(`person-20-${theme.colors.primary}`);
      expect(personIcon.props.children).toContain('person');
      expect(personIcon.props.children).toContain(20);
    });

    it('should use person icon name', () => {
      const { getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const personIcon = getByText(`person-20-${theme.colors.primary}`);
      expect(personIcon.props.children).toContain('person');
    });

    it('should have correct icon size in rendered output', () => {
      const { getByText } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const personIcon = getByText(`person-20-${theme.colors.primary}`);
      const childrenStr = Array.isArray(personIcon.props.children)
        ? personIcon.props.children.join('')
        : String(personIcon.props.children);
      expect(childrenStr).toContain('20');
    });

    it('should conditionally change icon color based on selection', () => {
      const { getByText: getWhenNotSelected } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(getWhenNotSelected(`person-20-${theme.colors.primary}`)).toBeTruthy();

      const { getByText: getWhenSelected } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(getWhenSelected(`person-20-${theme.colors.white}`)).toBeTruthy();
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot when not selected and not verified', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when selected and not verified', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when not selected and verified', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: true }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when selected and verified', () => {
      const { toJSON } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: true }}
          isSelected={true}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should have consistent rendering for same props', () => {
      const { toJSON: json1 } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      const { toJSON: json2 } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );
      expect(JSON.stringify(json1())).toEqual(JSON.stringify(json2()));
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid touches', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      for (let i = 0; i < 10; i++) {
        fireEvent(markerContainer, 'touchEnd');
      }

      expect(mockOnPress).toHaveBeenCalledTimes(10);
    });

    it('should handle re-renders with same props', () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should handle prop changes during interaction', () => {
      const { rerender, UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      const updatedMarkerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(updatedMarkerContainer, 'touchEnd');

      expect(mockOnPress).toHaveBeenCalledTimes(2);
    });

    it('should handle handler change', () => {
      const newHandler = jest.fn();
      const { rerender, UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      rerender(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={newHandler}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      fireEvent(markerContainer, 'touchEnd');

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(newHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle contractor change', () => {
      const contractor1 = { id: 'contractor-1', verified: false };
      const contractor2 = { id: 'contractor-2', verified: true };

      const { rerender, queryByText, getByText } = render(
        <ContractorMarker
          contractor={contractor1}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(queryByText(`checkmark-8-${theme.colors.white}`)).toBeNull();

      rerender(
        <ContractorMarker
          contractor={contractor2}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`checkmark-8-${theme.colors.white}`)).toBeTruthy();
    });

    it('should maintain structure during multiple state changes', () => {
      const { rerender, getByText, queryByText } = render(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();
      expect(queryByText(`checkmark-8-${theme.colors.white}`)).toBeNull();

      rerender(
        <ContractorMarker
          contractor={{ id: 'test', verified: true }}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`person-20-${theme.colors.white}`)).toBeTruthy();
      expect(getByText(`checkmark-8-${theme.colors.white}`)).toBeTruthy();

      rerender(
        <ContractorMarker
          contractor={{ id: 'test', verified: false }}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`person-20-${theme.colors.primary}`)).toBeTruthy();
      expect(queryByText(`checkmark-8-${theme.colors.white}`)).toBeNull();
    });
  });

  describe('Styling', () => {
    it('should apply markerContainer style', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      expect(markerContainer.props.style).toBeDefined();
    });

    it('should apply marker style to inner view', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const views = UNSAFE_getAllByType(View);
      const innerMarker = views[1];
      expect(innerMarker.props.style).toBeDefined();
    });

    it('should apply verifiedBadge style when verified', () => {
      const verifiedContractor = { id: 'test', verified: true };
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const views = UNSAFE_getAllByType(View);
      const badge = views[2];
      expect(badge.props.style).toBeDefined();
    });

    it('should apply combined styles when selected', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      expect(markerContainer.props.style).toBeDefined();

      const styles = Array.isArray(markerContainer.props.style)
        ? markerContainer.props.style
        : [markerContainer.props.style];
      expect(styles.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should be interactive via touch', () => {
      const { UNSAFE_getAllByType } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const markerContainer = UNSAFE_getAllByType(View)[0];
      expect(markerContainer.props.onTouchEnd).toBeDefined();
    });

    it('should provide visual feedback for selection state', () => {
      const { getByText: getWhenNotSelected } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      const { getByText: getWhenSelected } = render(
        <ContractorMarker
          contractor={mockContractor}
          isSelected={true}
          onPress={mockOnPress}
        />
      );

      expect(getWhenNotSelected(`person-20-${theme.colors.primary}`)).toBeTruthy();
      expect(getWhenSelected(`person-20-${theme.colors.white}`)).toBeTruthy();
    });

    it('should provide visual indicator for verified contractors', () => {
      const verifiedContractor = { id: 'test', verified: true };
      const { getByText } = render(
        <ContractorMarker
          contractor={verifiedContractor}
          isSelected={false}
          onPress={mockOnPress}
        />
      );

      expect(getByText(`checkmark-8-${theme.colors.white}`)).toBeTruthy();
    });

    it('should maintain touch target across all states', () => {
      const states = [
        { isSelected: false, verified: false },
        { isSelected: true, verified: false },
        { isSelected: false, verified: true },
        { isSelected: true, verified: true },
      ];

      states.forEach(({ isSelected, verified }) => {
        const { UNSAFE_getAllByType } = render(
          <ContractorMarker
            contractor={{ id: 'test', verified }}
            isSelected={isSelected}
            onPress={mockOnPress}
          />
        );

        const markerContainer = UNSAFE_getAllByType(View)[0];
        expect(markerContainer.props.onTouchEnd).toBeDefined();
      });
    });
  });
});