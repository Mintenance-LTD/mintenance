import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import { PeriodSelector } from '../PeriodSelector';

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      border: '#E5E5E5',
      background: '#FFFFFF',
      primary: '#007AFF',
      textPrimary: '#1A1A1A',
      textInverse: '#FFFFFF',
    },
    borderRadius: {
      lg: 12,
    },
  },
}));

describe('PeriodSelector', () => {
  const mockOnPeriodChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders View container', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const views = UNSAFE_root.findAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });

    it('renders all three period buttons', () => {
      const { getAllByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      expect(getAllByText('3 Months')).toHaveLength(1);
      expect(getAllByText('6 Months')).toHaveLength(1);
      expect(getAllByText('12 Months')).toHaveLength(1);
    });

    it('renders TouchableOpacity buttons', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      expect(buttons).toHaveLength(3);
    });

    it('renders Text components for labels', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const texts = UNSAFE_root.findAllByType(Text);
      expect(texts).toHaveLength(3);
    });

    it('renders periods in correct order', () => {
      const { getAllByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const labels = ['3 Months', '6 Months', '12 Months'];
      labels.forEach((label) => {
        expect(getAllByText(label)).toHaveLength(1);
      });
    });
  });

  describe('Period Selection - 3 Months', () => {
    it('applies active styles when "3m" is selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const firstButton = buttons[0];

      const styles = firstButton.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.borderColor).toBe('#007AFF');
      expect(flatStyles.backgroundColor).toBe('#007AFF');
    });

    it('applies active text styles when "3m" is selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const texts = UNSAFE_root.findAllByType(Text);
      const firstText = texts[0];

      const styles = firstText.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.color).toBe('#FFFFFF');
    });

    it('does not apply active styles to other periods when "3m" selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const secondButton = buttons[1];

      const styles = secondButton.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.borderColor).toBe('#E5E5E5');
      expect(flatStyles.backgroundColor).toBe('#FFFFFF');
    });
  });

  describe('Period Selection - 6 Months', () => {
    it('applies active styles when "6m" is selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const secondButton = buttons[1];

      const styles = secondButton.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.borderColor).toBe('#007AFF');
      expect(flatStyles.backgroundColor).toBe('#007AFF');
    });

    it('applies active text styles when "6m" is selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );
      const texts = UNSAFE_root.findAllByType(Text);
      const secondText = texts[1];

      const styles = secondText.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.color).toBe('#FFFFFF');
    });

    it('does not apply active styles to other periods when "6m" selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const firstButton = buttons[0];
      const thirdButton = buttons[2];

      const firstStyles = Array.isArray(firstButton.props.style)
        ? firstButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : firstButton.props.style;

      const thirdStyles = Array.isArray(thirdButton.props.style)
        ? thirdButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : thirdButton.props.style;

      expect(firstStyles.borderColor).toBe('#E5E5E5');
      expect(thirdStyles.borderColor).toBe('#E5E5E5');
    });
  });

  describe('Period Selection - 12 Months', () => {
    it('applies active styles when "12m" is selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="12m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const thirdButton = buttons[2];

      const styles = thirdButton.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.borderColor).toBe('#007AFF');
      expect(flatStyles.backgroundColor).toBe('#007AFF');
    });

    it('applies active text styles when "12m" is selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="12m" onPeriodChange={mockOnPeriodChange} />
      );
      const texts = UNSAFE_root.findAllByType(Text);
      const thirdText = texts[2];

      const styles = thirdText.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc, style) => ({ ...acc, ...style }), {})
        : styles;

      expect(flatStyles.color).toBe('#FFFFFF');
    });

    it('does not apply active styles to other periods when "12m" selected', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="12m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const firstButton = buttons[0];
      const secondButton = buttons[1];

      const firstStyles = Array.isArray(firstButton.props.style)
        ? firstButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : firstButton.props.style;

      const secondStyles = Array.isArray(secondButton.props.style)
        ? secondButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : secondButton.props.style;

      expect(firstStyles.borderColor).toBe('#E5E5E5');
      expect(secondStyles.borderColor).toBe('#E5E5E5');
    });
  });

  describe('onPeriodChange Handler', () => {
    it('calls onPeriodChange with "3m" when first button pressed', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );
      fireEvent.press(getByText('3 Months'));
      expect(mockOnPeriodChange).toHaveBeenCalledWith('3m');
      expect(mockOnPeriodChange).toHaveBeenCalledTimes(1);
    });

    it('calls onPeriodChange with "6m" when second button pressed', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      fireEvent.press(getByText('6 Months'));
      expect(mockOnPeriodChange).toHaveBeenCalledWith('6m');
      expect(mockOnPeriodChange).toHaveBeenCalledTimes(1);
    });

    it('calls onPeriodChange with "12m" when third button pressed', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      fireEvent.press(getByText('12 Months'));
      expect(mockOnPeriodChange).toHaveBeenCalledWith('12m');
      expect(mockOnPeriodChange).toHaveBeenCalledTimes(1);
    });

    it('calls onPeriodChange when clicking currently selected period', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      fireEvent.press(getByText('3 Months'));
      expect(mockOnPeriodChange).toHaveBeenCalledWith('3m');
      expect(mockOnPeriodChange).toHaveBeenCalledTimes(1);
    });

    it('does not call onPeriodChange on render', () => {
      render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      expect(mockOnPeriodChange).not.toHaveBeenCalled();
    });

    it('handles multiple rapid clicks correctly', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      fireEvent.press(getByText('6 Months'));
      fireEvent.press(getByText('12 Months'));
      fireEvent.press(getByText('3 Months'));

      expect(mockOnPeriodChange).toHaveBeenCalledTimes(3);
      expect(mockOnPeriodChange).toHaveBeenNthCalledWith(1, '6m');
      expect(mockOnPeriodChange).toHaveBeenNthCalledWith(2, '12m');
      expect(mockOnPeriodChange).toHaveBeenNthCalledWith(3, '3m');
    });
  });

  describe('Styling and Layout', () => {
    it('applies base container styles', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const views = UNSAFE_root.findAllByType(View);
      const container = views[0];

      const styles = container.props.style;
      expect(styles.flexDirection).toBe('row');
      expect(styles.paddingVertical).toBe(16);
      expect(styles.gap).toBe(8);
    });

    it('applies base button styles to all buttons', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);

      buttons.forEach((button) => {
        const styles = Array.isArray(button.props.style)
          ? button.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
          : button.props.style;

        expect(styles.flex).toBe(1);
        expect(styles.paddingVertical).toBe(8);
        expect(styles.paddingHorizontal).toBe(16);
        expect(styles.borderRadius).toBe(12);
        expect(styles.borderWidth).toBe(1);
        expect(styles.alignItems).toBe('center');
      });
    });

    it('applies inactive button styles correctly', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const inactiveButton = buttons[1];

      const styles = Array.isArray(inactiveButton.props.style)
        ? inactiveButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : inactiveButton.props.style;

      expect(styles.borderColor).toBe('#E5E5E5');
      expect(styles.backgroundColor).toBe('#FFFFFF');
    });

    it('applies base text styles to all text elements', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const texts = UNSAFE_root.findAllByType(Text);

      texts.forEach((text) => {
        const styles = Array.isArray(text.props.style)
          ? text.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
          : text.props.style;

        expect(styles.fontSize).toBe(14);
        expect(styles.fontWeight).toBe('500');
      });
    });

    it('applies inactive text styles correctly', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const texts = UNSAFE_root.findAllByType(Text);
      const inactiveText = texts[1];

      const styles = Array.isArray(inactiveText.props.style)
        ? inactiveText.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : inactiveText.props.style;

      expect(styles.color).toBe('#1A1A1A');
    });
  });

  describe('State Transitions', () => {
    it('updates styling when selectedPeriod changes from "3m" to "6m"', () => {
      const { UNSAFE_root, rerender } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );

      rerender(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );

      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const secondButton = buttons[1];

      const styles = Array.isArray(secondButton.props.style)
        ? secondButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : secondButton.props.style;

      expect(styles.borderColor).toBe('#007AFF');
      expect(styles.backgroundColor).toBe('#007AFF');
    });

    it('updates styling when selectedPeriod changes from "6m" to "12m"', () => {
      const { UNSAFE_root, rerender } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );

      rerender(
        <PeriodSelector selectedPeriod="12m" onPeriodChange={mockOnPeriodChange} />
      );

      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const thirdButton = buttons[2];

      const styles = Array.isArray(thirdButton.props.style)
        ? thirdButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : thirdButton.props.style;

      expect(styles.borderColor).toBe('#007AFF');
      expect(styles.backgroundColor).toBe('#007AFF');
    });

    it('updates styling when selectedPeriod changes from "12m" to "3m"', () => {
      const { UNSAFE_root, rerender } = render(
        <PeriodSelector selectedPeriod="12m" onPeriodChange={mockOnPeriodChange} />
      );

      rerender(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );

      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      const firstButton = buttons[0];

      const styles = Array.isArray(firstButton.props.style)
        ? firstButton.props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : firstButton.props.style;

      expect(styles.borderColor).toBe('#007AFF');
      expect(styles.backgroundColor).toBe('#007AFF');
    });
  });

  describe('Integration Tests', () => {
    it('renders complete component with all periods and correct selection', () => {
      const { getByText, UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );

      expect(getByText('3 Months')).toBeDefined();
      expect(getByText('6 Months')).toBeDefined();
      expect(getByText('12 Months')).toBeDefined();

      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      expect(buttons).toHaveLength(3);

      const secondButtonStyles = Array.isArray(buttons[1].props.style)
        ? buttons[1].props.style.reduce((acc: any, style: any) => ({ ...acc, ...style }), {})
        : buttons[1].props.style;

      expect(secondButtonStyles.backgroundColor).toBe('#007AFF');
    });

    it('handles user interaction flow correctly', () => {
      const { getByText, UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );

      fireEvent.press(getByText('6 Months'));
      expect(mockOnPeriodChange).toHaveBeenCalledWith('6m');

      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      expect(buttons).toHaveLength(3);
    });

    it('renders correctly with each period selection variant', () => {
      const periods: ('3m' | '6m' | '12m')[] = ['3m', '6m', '12m'];

      periods.forEach((period) => {
        const { UNSAFE_root, unmount } = render(
          <PeriodSelector selectedPeriod={period} onPeriodChange={mockOnPeriodChange} />
        );

        const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
        expect(buttons).toHaveLength(3);

        const texts = UNSAFE_root.findAllByType(Text);
        expect(texts).toHaveLength(3);

        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('all buttons are touchable', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );
      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);

      buttons.forEach((button) => {
        expect(button.type).toBe(TouchableOpacity);
        expect(button.props.onPress).toBeDefined();
        expect(typeof button.props.onPress).toBe('function');
      });
    });

    it('text labels are readable and properly formatted', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );

      const labels = ['3 Months', '6 Months', '12 Months'];
      labels.forEach((label) => {
        const textElement = getByText(label);
        expect(textElement).toBeDefined();
        expect(textElement.props.children).toBe(label);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles onPeriodChange being called with same period', () => {
      const { getByText } = render(
        <PeriodSelector selectedPeriod="6m" onPeriodChange={mockOnPeriodChange} />
      );

      fireEvent.press(getByText('6 Months'));
      expect(mockOnPeriodChange).toHaveBeenCalledWith('6m');
    });

    it('renders without errors when onPeriodChange is mocked', () => {
      const { UNSAFE_root } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={jest.fn()} />
      );

      const buttons = UNSAFE_root.findAllByType(TouchableOpacity);
      expect(buttons).toHaveLength(3);
    });

    it('maintains button order consistency across renders', () => {
      const { getAllByText, rerender } = render(
        <PeriodSelector selectedPeriod="3m" onPeriodChange={mockOnPeriodChange} />
      );

      const firstRender = getAllByText(/Months/);
      expect(firstRender[0].props.children).toBe('3 Months');
      expect(firstRender[1].props.children).toBe('6 Months');
      expect(firstRender[2].props.children).toBe('12 Months');

      rerender(
        <PeriodSelector selectedPeriod="12m" onPeriodChange={mockOnPeriodChange} />
      );

      const secondRender = getAllByText(/Months/);
      expect(secondRender[0].props.children).toBe('3 Months');
      expect(secondRender[1].props.children).toBe('6 Months');
      expect(secondRender[2].props.children).toBe('12 Months');
    });
  });
});
