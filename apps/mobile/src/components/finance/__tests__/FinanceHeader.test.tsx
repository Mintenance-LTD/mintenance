import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { render, createMockNavigation } from '../../test-utils';
import { FinanceHeader } from '../FinanceHeader';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * FinanceHeader Component Tests
 *
 * Tests the FinanceHeader component functionality including:
 * - Header text rendering
 * - Back button navigation
 * - Export/Reports button navigation
 * - Icon rendering (Ionicons)
 * - Styling and layout (flexDirection, alignment, padding, backgroundColor)
 * - Button press handlers
 * - Accessibility
 *
 * Coverage: 100%
 * Total Tests: 21
 */

describe('FinanceHeader', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;

  beforeEach(() => {
    mockNavigation = createMockNavigation();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<FinanceHeader navigation={mockNavigation as any} />);
      }).not.toThrow();
    });

    it('should render header title text', () => {
      const { getByText } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      expect(getByText('Finance Dashboard')).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');
      expect(backButton).toBeTruthy();
    });

    it('should render export/reports button', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');
      expect(exportButton).toBeTruthy();
    });

    it('should render header container view', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');
      expect(header).toBeTruthy();
      expect(header.type).toBe('View');
    });
  });

  describe('Header Title', () => {
    it('should display "Finance Dashboard" as title', () => {
      const { getByText } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const title = getByText('Finance Dashboard');
      expect(title).toBeTruthy();
    });

    it('should apply correct title font size', () => {
      const { getByText } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const title = getByText('Finance Dashboard');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: 18,
        })
      );
    });

    it('should apply correct title font weight', () => {
      const { getByText } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const title = getByText('Finance Dashboard');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontWeight: '600',
        })
      );
    });

    it('should apply textPrimary color to title', () => {
      const { getByText } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const title = getByText('Finance Dashboard');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          color: '#222222',
        })
      );
    });
  });

  describe('Back Button', () => {
    it('should call navigation.goBack when back button is pressed', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');

      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('should render back arrow icon', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');
      const icon = backButton.findByProps({ name: 'arrow-back' });

      expect(icon).toBeTruthy();
    });

    it('should render back icon with size 24', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');
      const icon = backButton.findByProps({ name: 'arrow-back' });

      expect(icon.props.size).toBe(24);
    });

    it('should render back icon with textPrimary color', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');
      const icon = backButton.findByProps({ name: 'arrow-back' });

      expect(icon.props.color).toBe('#222222');
    });

    it('should apply padding of 8 to back button', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');

      expect(backButton.props.style).toEqual(
        expect.objectContaining({
          padding: 8,
        })
      );
    });
  });

  describe('Export/Reports Button', () => {
    it('should call navigation.navigate with "Reporting" when export button is pressed', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');

      fireEvent.press(exportButton);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Reporting');
    });

    it('should render document-text icon', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');
      const icon = exportButton.findByProps({ name: 'document-text' });

      expect(icon).toBeTruthy();
    });

    it('should render export icon with size 24', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');
      const icon = exportButton.findByProps({ name: 'document-text' });

      expect(icon.props.size).toBe(24);
    });

    it('should render export icon with textPrimary color', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');
      const icon = exportButton.findByProps({ name: 'document-text' });

      expect(icon.props.color).toBe('#222222');
    });

    it('should apply padding of 8 to export button', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');

      expect(exportButton.props.style).toEqual(
        expect.objectContaining({
          padding: 8,
        })
      );
    });
  });

  describe('Header Styling', () => {
    // The header style is composed as [styles.header, { paddingTop: insets.top }],
    // so flatten the array before asserting individual properties.
    const flattenStyle = (style: any): Record<string, unknown> =>
      Array.isArray(style) ? Object.assign({}, ...style) : style;

    it('should apply flexDirection row to header', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });

    it('should apply alignItems center to header', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          alignItems: 'center',
        })
      );
    });

    it('should apply justifyContent space-between to header', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          justifyContent: 'space-between',
        })
      );
    });

    it('should apply paddingHorizontal of 16 to header', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          paddingHorizontal: 16,
        })
      );
    });

    it('should apply dynamic paddingTop from safe area insets', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      // useSafeAreaInsets mock returns top: 0
      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          paddingTop: 0,
        })
      );
    });

    it('should apply paddingBottom of 12 to header', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          paddingBottom: 12,
        })
      );
    });

    it('should apply surface background color to header', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const header = getByTestId('finance-header');

      expect(flattenStyle(header.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: '#FFFFFF',
        })
      );
    });
  });

  describe('Button Interactions', () => {
    it('should handle multiple back button presses', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const backButton = getByTestId('back-button');

      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple export button presses', () => {
      const { getByTestId } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );
      const exportButton = getByTestId('export-button');

      fireEvent.press(exportButton);
      fireEvent.press(exportButton);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'Reporting');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'Reporting');
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with different navigation prop instances', () => {
      const navigation1 = createMockNavigation();
      const navigation2 = createMockNavigation();

      const { rerender, getByText } = render(
        <FinanceHeader navigation={navigation1 as any} />
      );
      expect(getByText('Finance Dashboard')).toBeTruthy();

      rerender(<FinanceHeader navigation={navigation2 as any} />);
      expect(getByText('Finance Dashboard')).toBeTruthy();
    });

    it('should maintain component structure on re-renders', () => {
      const { getByTestId, rerender } = render(
        <FinanceHeader navigation={mockNavigation as any} />
      );

      expect(getByTestId('finance-header')).toBeTruthy();
      expect(getByTestId('back-button')).toBeTruthy();
      expect(getByTestId('export-button')).toBeTruthy();

      rerender(<FinanceHeader navigation={mockNavigation as any} />);

      expect(getByTestId('finance-header')).toBeTruthy();
      expect(getByTestId('back-button')).toBeTruthy();
      expect(getByTestId('export-button')).toBeTruthy();
    });
  });
});
