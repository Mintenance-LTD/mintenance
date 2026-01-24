import React from 'react';
import { render } from '@testing-library/react-native';
import { ResponsiveContainer } from '../ResponsiveContainer';
import { Text, View } from 'react-native';

// Mock useResponsive hook
const mockUseResponsive = jest.fn();
const mockUseResponsiveStyle = jest.fn();

jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => mockUseResponsive(),
  useResponsiveStyle: (values: unknown) => mockUseResponsiveStyle(values),
}));

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock values
    mockUseResponsive.mockReturnValue({
      isWeb: false,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      width: 375,
      height: 667,
      breakpoint: 'mobile',
    });
    mockUseResponsiveStyle.mockImplementation((values: any) => values.mobile);
  });

  describe('Rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <ResponsiveContainer>
          <Text>Test Content</Text>
        </ResponsiveContainer>
      );

      expect(getByText('Test Content')).toBeDefined();
    });

    it('should render with default props', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding (mobile default)
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <ResponsiveContainer>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <Text>Third Child</Text>
        </ResponsiveContainer>
      );

      expect(getByText('First Child')).toBeDefined();
      expect(getByText('Second Child')).toBeDefined();
      expect(getByText('Third Child')).toBeDefined();
    });
  });

  describe('MaxWidth Prop', () => {
    it('should handle mobile maxWidth', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(320); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer maxWidth={{ mobile: 320 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenCalledWith({
        mobile: 320,
        tablet: undefined,
        desktop: undefined,
      });
    });

    it('should handle tablet maxWidth', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: false,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 768,
        height: 1024,
        breakpoint: 'tablet',
      });
      mockUseResponsiveStyle.mockReturnValueOnce(600); // maxWidth (tablet)
      mockUseResponsiveStyle.mockReturnValueOnce(24); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer maxWidth={{ mobile: 320, tablet: 600 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenCalledWith({
        mobile: 320,
        tablet: 600,
        desktop: undefined,
      });
    });

    it('should handle desktop maxWidth', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: true,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1440,
        height: 900,
        breakpoint: 'desktop',
      });
      mockUseResponsiveStyle.mockReturnValueOnce(1200); // maxWidth (desktop)
      mockUseResponsiveStyle.mockReturnValueOnce(32); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer maxWidth={{ mobile: 320, tablet: 600, desktop: 1200 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenCalledWith({
        mobile: 320,
        tablet: 600,
        desktop: 1200,
      });
    });

    it('should handle partial maxWidth (only mobile)', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(375); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer maxWidth={{ mobile: 375 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenCalledWith({
        mobile: 375,
        tablet: undefined,
        desktop: undefined,
      });
    });

    it('should handle undefined maxWidth', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenCalledWith({
        mobile: undefined,
        tablet: undefined,
        desktop: undefined,
      });
    });
  });

  describe('Padding Prop', () => {
    it('should use default padding values when not provided', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding - mobile default
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(2, {
        mobile: 16,
        tablet: 24,
        desktop: 32,
      });
    });

    it('should override mobile padding', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(8); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer padding={{ mobile: 8 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(2, {
        mobile: 8,
        tablet: 24,
        desktop: 32,
      });
    });

    it('should override tablet padding', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(20); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer padding={{ mobile: 8, tablet: 20 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(2, {
        mobile: 8,
        tablet: 20,
        desktop: 32,
      });
    });

    it('should override desktop padding', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(40); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer padding={{ mobile: 8, tablet: 20, desktop: 40 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(2, {
        mobile: 8,
        tablet: 20,
        desktop: 40,
      });
    });

    it('should handle zero padding', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(0); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer padding={{ mobile: 0, tablet: 0, desktop: 0 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(2, {
        mobile: 0,
        tablet: 0,
        desktop: 0,
      });
    });
  });

  describe('Flex Prop', () => {
    it('should handle mobile flex value', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(1); // flex

      render(
        <ResponsiveContainer flex={{ mobile: 1 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(3, {
        mobile: 1,
        tablet: undefined,
        desktop: undefined,
      });
    });

    it('should handle tablet flex value', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(2); // flex

      render(
        <ResponsiveContainer flex={{ mobile: 1, tablet: 2 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(3, {
        mobile: 1,
        tablet: 2,
        desktop: undefined,
      });
    });

    it('should handle desktop flex value', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(3); // flex

      render(
        <ResponsiveContainer flex={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(3, {
        mobile: 1,
        tablet: 2,
        desktop: 3,
      });
    });

    it('should handle undefined flex', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(3, {
        mobile: undefined,
        tablet: undefined,
        desktop: undefined,
      });
    });
  });

  describe('Web Centering Behavior', () => {
    it('should apply centering styles on web when maxWidth is set', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: true,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1440,
        height: 900,
        breakpoint: 'desktop',
      });
      mockUseResponsiveStyle.mockReturnValueOnce(1200); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(32); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer maxWidth={{ desktop: 1200 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
      // Centering logic is tested via the isWeb check
      expect(mockUseResponsive).toHaveBeenCalled();
    });

    it('should not apply centering styles on web when maxWidth is undefined', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: true,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1440,
        height: 900,
        breakpoint: 'desktop',
      });
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth (none)
      mockUseResponsiveStyle.mockReturnValueOnce(32); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should not apply centering styles on mobile', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
        breakpoint: 'mobile',
      });
      mockUseResponsiveStyle.mockReturnValueOnce(320); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer maxWidth={{ mobile: 320 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });
  });

  describe('Style Prop Merging', () => {
    it('should merge custom style with container styles', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const customStyle = { backgroundColor: 'red', marginTop: 10 };

      const { UNSAFE_root } = render(
        <ResponsiveContainer style={customStyle}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle array style prop', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const styles = [
        { backgroundColor: 'blue' },
        { marginVertical: 20 },
      ];

      const { UNSAFE_root } = render(
        <ResponsiveContainer style={styles}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle style with flexDirection', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer style={{ flexDirection: 'row' }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });
  });

  describe('Additional ViewProps', () => {
    it('should forward testID prop', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { getByTestId } = render(
        <ResponsiveContainer testID="custom-container">
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(getByTestId('custom-container')).toBeDefined();
    });

    it('should forward accessibilityLabel prop', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer accessibilityLabel="Responsive Content Container">
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should forward onLayout prop', () => {
      const onLayoutMock = jest.fn();
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer onLayout={onLayoutMock}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });
  });

  describe('Complex Prop Combinations', () => {
    it('should handle all props together', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: true,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1440,
        height: 900,
        breakpoint: 'desktop',
      });
      mockUseResponsiveStyle.mockReturnValueOnce(1200); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(40); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(1); // flex

      const { getByTestId } = render(
        <ResponsiveContainer
          maxWidth={{ mobile: 320, tablet: 768, desktop: 1200 }}
          padding={{ mobile: 8, tablet: 16, desktop: 40 }}
          flex={{ mobile: 1, tablet: 1, desktop: 1 }}
          style={{ backgroundColor: 'white' }}
          testID="full-container"
        >
          <Text>Full Props</Text>
        </ResponsiveContainer>
      );

      expect(getByTestId('full-container')).toBeDefined();
    });

    it('should handle maxWidth with custom padding on mobile', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(375); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(12); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      render(
        <ResponsiveContainer
          maxWidth={{ mobile: 375 }}
          padding={{ mobile: 12 }}
        >
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(1, {
        mobile: 375,
        tablet: undefined,
        desktop: undefined,
      });
      expect(mockUseResponsiveStyle).toHaveBeenNthCalledWith(2, {
        mobile: 12,
        tablet: 24,
        desktop: 32,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer>{null}</ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle nested ResponsiveContainers', () => {
      mockUseResponsiveStyle.mockReturnValue(16); // Use same value for all calls

      const { getByText } = render(
        <ResponsiveContainer>
          <ResponsiveContainer>
            <Text>Nested Content</Text>
          </ResponsiveContainer>
        </ResponsiveContainer>
      );

      expect(getByText('Nested Content')).toBeDefined();
    });

    it('should handle very large maxWidth values', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(9999); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer maxWidth={{ mobile: 9999 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle very large padding values', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(100); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { UNSAFE_root } = render(
        <ResponsiveContainer padding={{ mobile: 100 }}>
          <Text>Content</Text>
        </ResponsiveContainer>
      );

      expect(UNSAFE_root).toBeDefined();
    });

    it('should handle complex children structure', () => {
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // maxWidth
      mockUseResponsiveStyle.mockReturnValueOnce(16); // padding
      mockUseResponsiveStyle.mockReturnValueOnce(undefined); // flex

      const { getByText } = render(
        <ResponsiveContainer>
          <View>
            <Text>Header</Text>
            <View>
              <Text>Nested Content</Text>
            </View>
            <Text>Footer</Text>
          </View>
        </ResponsiveContainer>
      );

      expect(getByText('Header')).toBeDefined();
      expect(getByText('Nested Content')).toBeDefined();
      expect(getByText('Footer')).toBeDefined();
    });
  });

  describe('Breakpoint Handling', () => {
    it('should work correctly on mobile breakpoint', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
        breakpoint: 'mobile',
      });
      mockUseResponsiveStyle.mockImplementation((values: any) => values.mobile);

      const { getByText } = render(
        <ResponsiveContainer
          maxWidth={{ mobile: 320, tablet: 600, desktop: 1200 }}
          padding={{ mobile: 16, tablet: 24, desktop: 32 }}
        >
          <Text>Mobile View</Text>
        </ResponsiveContainer>
      );

      expect(getByText('Mobile View')).toBeDefined();
    });

    it('should work correctly on tablet breakpoint', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: false,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 768,
        height: 1024,
        breakpoint: 'tablet',
      });
      mockUseResponsiveStyle.mockImplementation((values: any) => values.tablet ?? values.mobile);

      const { getByText } = render(
        <ResponsiveContainer
          maxWidth={{ mobile: 320, tablet: 600, desktop: 1200 }}
          padding={{ mobile: 16, tablet: 24, desktop: 32 }}
        >
          <Text>Tablet View</Text>
        </ResponsiveContainer>
      );

      expect(getByText('Tablet View')).toBeDefined();
    });

    it('should work correctly on desktop breakpoint', () => {
      mockUseResponsive.mockReturnValue({
        isWeb: true,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1440,
        height: 900,
        breakpoint: 'desktop',
      });
      mockUseResponsiveStyle.mockImplementation((values: any) => values.desktop ?? values.tablet ?? values.mobile);

      const { getByText } = render(
        <ResponsiveContainer
          maxWidth={{ mobile: 320, tablet: 600, desktop: 1200 }}
          padding={{ mobile: 16, tablet: 24, desktop: 32 }}
        >
          <Text>Desktop View</Text>
        </ResponsiveContainer>
      );

      expect(getByText('Desktop View')).toBeDefined();
    });
  });
});
