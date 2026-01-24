import React from 'react';
import { render } from '@testing-library/react-native';
import { Banner } from '../Banner';
import { Text, View } from 'react-native';

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      errorLight: '#FEE2E2',
      errorDark: '#991B1B',
      successLight: '#D1FAE5',
      successDark: '#065F46',
      infoLight: '#DBEAFE',
      infoDark: '#1E40AF',
    },
    spacing: {
      2: 8,
      3: 12,
    },
    borderRadius: {
      lg: 8,
    },
    typography: {
      fontSize: {
        base: 14,
      },
      fontWeight: {
        medium: '500',
      },
    },
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => {
      return (
        <Text
          testID={`ionicon-${props.name}`}
          accessibilityElementsHidden={props.accessibilityElementsHidden}
        >
          {`Icon: ${props.name}, Size: ${props.size}, Color: ${props.color}`}
        </Text>
      );
    },
  };
});

describe('Banner', () => {
  // Helper to find icon text element
  const findIconElement = (texts: any[], iconName: string) => {
    return texts.find((t) =>
      t.props.children?.includes && t.props.children.includes(`Icon: ${iconName}`)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('should render View container', () => {
      const { UNSAFE_getByType } = render(<Banner message="Test message" />);
      const views = UNSAFE_getByType(View);
      expect(views).toBeTruthy();
    });

    it('should render Ionicons with correct name', () => {
      const { UNSAFE_getAllByType } = render(<Banner message="Test message" variant="info" />);
      const texts = UNSAFE_getAllByType(Text);
      const iconText = findIconElement(texts, 'information-circle');
      expect(iconText).toBeTruthy();
      expect(iconText?.props.children).toContain('information-circle');
    });

    it('should render message text', () => {
      const { getByText } = render(<Banner message="Test message" />);
      expect(getByText('Test message')).toBeTruthy();
    });

    it('should apply testID when provided', () => {
      const { getByTestId } = render(<Banner message="Test message" testID="custom-banner" />);
      expect(getByTestId('custom-banner')).toBeTruthy();
    });

    it('should not render testID when not provided', () => {
      const { queryByTestId } = render(<Banner message="Test message" />);
      expect(queryByTestId('custom-banner')).toBeNull();
    });

    it('should have correct layout styles (flexDirection row, alignItems center)', () => {
      const { getByTestId } = render(<Banner message="Test message" testID="banner-test" />);
      const container = getByTestId('banner-test');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
            alignItems: 'center',
          }),
        ])
      );
    });
  });

  describe('Empty Message Handling', () => {
    it('should return null when message is empty string', () => {
      const { toJSON } = render(<Banner message="" />);
      expect(toJSON()).toBeNull();
    });

    it('should return null when message is null', () => {
      const { toJSON } = render(<Banner message={null as any} />);
      expect(toJSON()).toBeNull();
    });

    it('should return null when message is undefined', () => {
      const { toJSON } = render(<Banner message={undefined as any} />);
      expect(toJSON()).toBeNull();
    });

    it('should render when message is non-empty', () => {
      const { getByText } = render(<Banner message="Valid message" />);
      expect(getByText('Valid message')).toBeTruthy();
    });
  });

  describe('variant Prop', () => {
    it('should use info variant when variant prop not provided (default)', () => {
      const { UNSAFE_getAllByType } = render(<Banner message="Test message" />);
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'information-circle');
      expect(icon).toBeTruthy();
    });

    it('should render with error variant (icon=alert-circle, colors)', () => {
      const { UNSAFE_getAllByType } = render(
        <Banner message="Error message" variant="error" testID="error-banner" />
      );
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'alert-circle');
      expect(icon).toBeTruthy();
      expect(icon.props.children).toContain('alert-circle');
    });

    it('should render with success variant (icon=checkmark-circle, colors)', () => {
      const { UNSAFE_getAllByType } = render(
        <Banner message="Success message" variant="success" testID="success-banner" />
      );
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'checkmark-circle');
      expect(icon).toBeTruthy();
      expect(icon.props.children).toContain('checkmark-circle');
    });

    it('should render with info variant (icon=information-circle, colors)', () => {
      const { UNSAFE_getAllByType } = render(
        <Banner message="Info message" variant="info" testID="info-banner" />
      );
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'information-circle');
      expect(icon).toBeTruthy();
      expect(icon.props.children).toContain('information-circle');
    });

    it('should apply error background color (errorLight)', () => {
      const { getByTestId } = render(
        <Banner message="Error message" variant="error" testID="error-banner" />
      );
      const container = getByTestId('error-banner');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({
            backgroundColor: '#FEE2E2',
          }),
        ])
      );
    });

    it('should apply success background color (successLight)', () => {
      const { getByTestId } = render(
        <Banner message="Success message" variant="success" testID="success-banner" />
      );
      const container = getByTestId('success-banner');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({
            backgroundColor: '#D1FAE5',
          }),
        ])
      );
    });

    it('should apply info background color (infoLight)', () => {
      const { getByTestId } = render(
        <Banner message="Info message" variant="info" testID="info-banner" />
      );
      const container = getByTestId('info-banner');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({
            backgroundColor: '#DBEAFE',
          }),
        ])
      );
    });

    it('should apply correct text color for each variant', () => {
      const { getByText: getErrorText } = render(
        <Banner message="Error message" variant="error" />
      );
      const errorText = getErrorText('Error message');
      expect(errorText.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({
            color: '#991B1B',
          }),
        ])
      );

      const { getByText: getSuccessText } = render(
        <Banner message="Success message" variant="success" />
      );
      const successText = getSuccessText('Success message');
      expect(successText.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({
            color: '#065F46',
          }),
        ])
      );

      const { getByText: getInfoText } = render(
        <Banner message="Info message" variant="info" />
      );
      const infoText = getInfoText('Info message');
      expect(infoText.props.style).toEqual(
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({
            color: '#1E40AF',
          }),
        ])
      );
    });

    it('should set icon size to 18 for all variants', () => {
      const { UNSAFE_getAllByType: getError } = render(
        <Banner message="Error message" variant="error" />
      );
      const errorTexts = getError(Text);
      const errorIcon = findIconElement(errorTexts, 'alert-circle');
      expect(errorIcon?.props.children).toContain('Size: 18');

      const { UNSAFE_getAllByType: getSuccess } = render(
        <Banner message="Success message" variant="success" />
      );
      const successTexts = getSuccess(Text);
      const successIcon = findIconElement(successTexts, 'checkmark-circle');
      expect(successIcon?.props.children).toContain('Size: 18');

      const { UNSAFE_getAllByType: getInfo } = render(
        <Banner message="Info message" variant="info" />
      );
      const infoTexts = getInfo(Text);
      const infoIcon = findIconElement(infoTexts, 'information-circle');
      expect(infoIcon?.props.children).toContain('Size: 18');
    });
  });

  describe('Icon Configuration', () => {
    it('should show alert-circle icon for error variant', () => {
      const { UNSAFE_getAllByType } = render(<Banner message="Error" variant="error" />);
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'alert-circle');
      expect(icon?.props.children).toContain('alert-circle');
    });

    it('should show checkmark-circle icon for success variant', () => {
      const { UNSAFE_getAllByType } = render(<Banner message="Success" variant="success" />);
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'checkmark-circle');
      expect(icon?.props.children).toContain('checkmark-circle');
    });

    it('should show information-circle icon for info variant', () => {
      const { UNSAFE_getAllByType } = render(<Banner message="Info" variant="info" />);
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'information-circle');
      expect(icon?.props.children).toContain('information-circle');
    });
  });

  describe('Accessibility', () => {
    it('should set accessibilityElementsHidden on Ionicons', () => {
      const { UNSAFE_getAllByType } = render(<Banner message="Test message" />);
      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'information-circle');
      expect(icon?.props.accessibilityElementsHidden).toBe(true);
    });

    it('should apply testID to container when provided', () => {
      const { getByTestId } = render(
        <Banner message="Accessible message" testID="accessible-banner" />
      );
      expect(getByTestId('accessible-banner')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply correct padding (paddingVertical spacing[2], paddingHorizontal spacing[3])', () => {
      const { getByTestId } = render(
        <Banner message="Styled message" testID="styled-banner" />
      );
      const container = getByTestId('styled-banner');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 8,
            paddingHorizontal: 12,
          }),
        ])
      );
    });

    it('should apply correct borderRadius (lg)', () => {
      const { getByTestId } = render(
        <Banner message="Styled message" testID="styled-banner" />
      );
      const container = getByTestId('styled-banner');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 8,
          }),
        ])
      );
    });

    it('should apply correct marginBottom (spacing[3])', () => {
      const { getByTestId } = render(
        <Banner message="Styled message" testID="styled-banner" />
      );
      const container = getByTestId('styled-banner');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: 12,
          }),
        ])
      );
    });

    it('should apply correct message text styles (flex 1, fontSize base, fontWeight medium)', () => {
      const { getByText } = render(<Banner message="Styled message" />);
      const messageText = getByText('Styled message');
      expect(messageText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
            fontSize: 14,
            fontWeight: '500',
          }),
        ])
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long message text', () => {
      const longMessage = 'A'.repeat(500);
      const { getByText } = render(<Banner message={longMessage} />);
      expect(getByText(longMessage)).toBeTruthy();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Test <script>alert("xss")</script> & special chars: @#$%^&*()';
      const { getByText } = render(<Banner message={specialMessage} />);
      expect(getByText(specialMessage)).toBeTruthy();
    });

    it('should render whitespace-only message', () => {
      const whitespaceMessage = '   ';
      const { getByText } = render(<Banner message={whitespaceMessage} />);
      expect(getByText(whitespaceMessage)).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should render complete error banner with all features', () => {
      const { getByTestId, getByText, UNSAFE_getAllByType } = render(
        <Banner message="Error occurred" variant="error" testID="complete-error-banner" />
      );

      const container = getByTestId('complete-error-banner');
      expect(container).toBeTruthy();

      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'alert-circle');
      expect(icon?.props.children).toContain('alert-circle');
      expect(icon?.props.children).toContain('Size: 18');
      expect(icon?.props.children).toContain('Color: #991B1B');

      const message = getByText('Error occurred');
      expect(message).toBeTruthy();

      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FEE2E2',
          }),
        ])
      );
    });

    it('should render complete success banner with all features', () => {
      const { getByTestId, getByText, UNSAFE_getAllByType } = render(
        <Banner message="Success!" variant="success" testID="complete-success-banner" />
      );

      const container = getByTestId('complete-success-banner');
      expect(container).toBeTruthy();

      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'checkmark-circle');
      expect(icon?.props.children).toContain('checkmark-circle');
      expect(icon?.props.children).toContain('Size: 18');
      expect(icon?.props.children).toContain('Color: #065F46');

      const message = getByText('Success!');
      expect(message).toBeTruthy();

      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#D1FAE5',
          }),
        ])
      );
    });

    it('should render complete info banner with testID', () => {
      const { getByTestId, getByText, UNSAFE_getAllByType } = render(
        <Banner message="Information available" variant="info" testID="complete-info-banner" />
      );

      const container = getByTestId('complete-info-banner');
      expect(container).toBeTruthy();

      const texts = UNSAFE_getAllByType(Text);
      const icon = findIconElement(texts, 'information-circle');
      expect(icon?.props.children).toContain('information-circle');
      expect(icon?.props.children).toContain('Size: 18');
      expect(icon?.props.children).toContain('Color: #1E40AF');

      const message = getByText('Information available');
      expect(message).toBeTruthy();

      // Check container styles (split across multiple objects)
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            marginBottom: 12,
          }),
          expect.objectContaining({
            backgroundColor: '#DBEAFE',
          }),
        ])
      );
    });
  });
});
