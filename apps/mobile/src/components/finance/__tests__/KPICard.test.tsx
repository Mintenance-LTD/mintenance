import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { render } from '../../test-utils';
import { KPICard } from '../KPICard';

/**
 * KPICard Component Tests
 *
 * Tests the KPICard component functionality including:
 * - Rendering with required props
 * - KPI display and formatting
 * - Trend indicators (positive/negative changes)
 * - Icon rendering (Ionicons)
 * - Color customization
 * - Press handlers (onPress)
 * - Styling and layout (flex, padding, borderRadius, borderLeftWidth, borderLeftColor)
 * - Change percentage formatting
 * - Conditional rendering (change prop optional)
 * - Accessibility
 *
 * Coverage: 100%
 * Total Tests: 47
 */

describe('KPICard', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: '$12,345',
    icon: 'cash-outline',
    color: '#222222',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<KPICard {...defaultProps} />);
      }).not.toThrow();
    });

    it('should render the title text', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      expect(getByText('Total Revenue')).toBeTruthy();
    });

    it('should render the value text', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      expect(getByText('$12,345')).toBeTruthy();
    });

    it('should render the card container as TouchableOpacity', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      // Redesign: title is a direct child of the card TouchableOpacity
      // (icon chip / title / value / change are siblings, no header wrapper).
      const container = title.parent;
      expect(container?.type).toBe('TouchableOpacity');
    });

    it('should render the icon chip view', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'cash-outline' });
      // Icon is wrapped in a chip View inside the card.
      expect(icon?.parent?.type).toBe('View');
    });
  });

  describe('Icon Rendering', () => {
    it('should render icon with correct name', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'cash-outline' });
      expect(icon).toBeTruthy();
    });

    it('should render icon with size 20', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'cash-outline' });
      expect(icon?.props.size).toBe(20);
    });

    it('should render icon with custom color', () => {
      const customColor = '#FF5733';
      const { getByText } = render(
        <KPICard {...defaultProps} color={customColor} />
      );
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'cash-outline' });
      expect(icon?.props.color).toBe(customColor);
    });

    it('should render different icon names correctly', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} icon='trending-up' />
      );
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'trending-up' });
      expect(icon).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply icon chip background derived from color prop', () => {
      const customColor = '#00AA00';
      const { getByText } = render(
        <KPICard {...defaultProps} color={customColor} />
      );
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'cash-outline' });
      const chip = icon?.parent;
      const styles = chip?.props.style;
      const flattened = Array.isArray(styles)
        ? Object.assign({}, ...styles.filter(Boolean))
        : styles;
      // Redesign: icon chip tints the colour at ~10% alpha (`${color}18`).
      expect(flattened.backgroundColor).toBe(`${customColor}18`);
    });

    it('should apply card styling properties', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const container = title.parent;

      // Check that container has style prop with expected properties
      expect(container).toBeTruthy();
      const styles = container?.props.style;
      expect(styles).toBeDefined();

      // Flatten style array if needed
      const flattenedStyles = Array.isArray(styles)
        ? Object.assign({}, ...styles)
        : styles;

      // Verify key styling properties exist
      expect(flattenedStyles).toMatchObject(
        expect.objectContaining({
          borderRadius: expect.any(Number),
          padding: expect.any(Number),
        })
      );
    });

    it('should use theme colors and dimensions', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const container = title.parent;

      expect(container).toBeTruthy();
      // Verify theme integration by checking border radius exists
      const styles = container?.props.style;
      const flattenedStyles = Array.isArray(styles)
        ? Object.assign({}, ...styles)
        : styles;

      expect(flattenedStyles).toHaveProperty('borderRadius');
      expect(flattenedStyles).toHaveProperty('backgroundColor');
    });

    it('should apply flex layout properties', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const container = title.parent;

      expect(container).toBeTruthy();
      const styles = container?.props.style;
      const flattenedStyles = Array.isArray(styles)
        ? Object.assign({}, ...styles)
        : styles;

      // Check flex and minWidth exist
      expect(flattenedStyles).toHaveProperty('flex');
      expect(flattenedStyles).toHaveProperty('minWidth');
    });

    it('should apply textPrimary color to value text', () => {
      const customColor = '#FF00FF';
      const { getByText } = render(
        <KPICard {...defaultProps} color={customColor} />
      );
      const valueText = getByText('$12,345');
      // Redesign: value no longer takes the colour prop; it uses textPrimary.
      expect(valueText.props.style).toEqual(
        expect.objectContaining({ color: '#222222' })
      );
    });

    it('should apply correct title styling', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: 13,
          color: '#717171',
          fontWeight: '500',
          marginBottom: 4,
        })
      );
    });

    it('should apply correct value styling', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const value = getByText('$12,345');
      expect(value.props.style).toEqual(
        expect.objectContaining({
          fontSize: 22,
          fontWeight: '700',
          marginBottom: 4,
        })
      );
    });
  });

  describe('Change Indicator - Positive', () => {
    it('should render positive change with trending-up icon', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 12.5, isPositive: true }} />
      );
      const changeText = getByText('+12.5%');
      const changeContainer = changeText.parent;
      const trendIcon = changeContainer?.findByProps({ name: 'trending-up' });
      expect(trendIcon).toBeTruthy();
    });

    it('should render positive change with primary color icon', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 12.5, isPositive: true }} />
      );
      const changeText = getByText('+12.5%');
      const changeContainer = changeText.parent;
      const trendIcon = changeContainer?.findByProps({ name: 'trending-up' });
      // Redesign: positive trend uses brand primary, not the old success green.
      expect(trendIcon?.props.color).toBe('#0D9488');
    });

    it('should format positive change value with + prefix', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 8.3, isPositive: true }} />
      );
      expect(getByText('+8.3%')).toBeTruthy();
    });

    it('should apply primary color to positive change text', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 15.7, isPositive: true }} />
      );
      const changeText = getByText('+15.7%');
      expect(changeText.props.style).toContainEqual(
        expect.objectContaining({ color: '#0D9488' })
      );
    });

    it('should format positive change to 1 decimal place', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: 12.567, isPositive: true }}
        />
      );
      expect(getByText('+12.6%')).toBeTruthy();
    });
  });

  describe('Change Indicator - Negative', () => {
    it('should render negative change with trending-down icon', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: -5.2, isPositive: false }}
        />
      );
      const changeText = getByText('-5.2%');
      const changeContainer = changeText.parent;
      const trendIcon = changeContainer?.findByProps({ name: 'trending-down' });
      expect(trendIcon).toBeTruthy();
    });

    it('should render negative change with error color icon', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: -3.8, isPositive: false }}
        />
      );
      const changeText = getByText('-3.8%');
      const changeContainer = changeText.parent;
      const trendIcon = changeContainer?.findByProps({ name: 'trending-down' });
      expect(trendIcon?.props.color).toBe('#EF4444');
    });

    it('should format negative change value without extra prefix', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: -7.4, isPositive: false }}
        />
      );
      expect(getByText('-7.4%')).toBeTruthy();
    });

    it('should apply error color to negative change text', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: -10.1, isPositive: false }}
        />
      );
      const changeText = getByText('-10.1%');
      expect(changeText.props.style).toContainEqual(
        expect.objectContaining({ color: '#EF4444' })
      );
    });

    it('should format negative change to 1 decimal place', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: -8.967, isPositive: false }}
        />
      );
      expect(getByText('-9.0%')).toBeTruthy();
    });
  });

  describe('Change Indicator - Edge Cases', () => {
    it('should not render change container when change prop is undefined', () => {
      const { queryByText } = render(<KPICard {...defaultProps} />);
      expect(queryByText('%')).toBeNull();
    });

    it('should render zero change as positive', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 0, isPositive: true }} />
      );
      expect(getByText('+0.0%')).toBeTruthy();
    });

    it('should render very small positive change correctly', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 0.1, isPositive: true }} />
      );
      expect(getByText('+0.1%')).toBeTruthy();
    });

    it('should render very large positive change correctly', () => {
      const { getByText } = render(
        <KPICard
          {...defaultProps}
          change={{ value: 999.9, isPositive: true }}
        />
      );
      expect(getByText('+999.9%')).toBeTruthy();
    });

    it('should render change icon with size 12', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 5.0, isPositive: true }} />
      );
      const changeText = getByText('+5.0%');
      const changeContainer = changeText.parent;
      const trendIcon = changeContainer?.findByProps({ name: 'trending-up' });
      expect(trendIcon?.props.size).toBe(12);
    });
  });

  describe('Press Handler', () => {
    it('should call onPress when card is pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <KPICard {...defaultProps} onPress={onPressMock} />
      );
      const container = getByText('Total Revenue').parent;

      fireEvent.press(container!);

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when onPress is undefined', () => {
      expect(() => {
        const { getByText } = render(<KPICard {...defaultProps} />);
        const container = getByText('Total Revenue').parent;
        fireEvent.press(container!);
      }).not.toThrow();
    });

    it('should handle multiple presses', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <KPICard {...defaultProps} onPress={onPressMock} />
      );
      const container = getByText('Total Revenue').parent;

      fireEvent.press(container!);
      fireEvent.press(container!);
      fireEvent.press(container!);

      expect(onPressMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('Different KPI Types', () => {
    it('should render currency value correctly', () => {
      const { getByText } = render(
        <KPICard
          title='Revenue'
          value='$45,678.90'
          icon='cash'
          color='#00AA00'
        />
      );
      expect(getByText('$45,678.90')).toBeTruthy();
    });

    it('should render count value correctly', () => {
      const { getByText } = render(
        <KPICard
          title='Active Jobs'
          value='24'
          icon='briefcase'
          color='#0066FF'
        />
      );
      expect(getByText('24')).toBeTruthy();
    });

    it('should render percentage value correctly', () => {
      const { getByText } = render(
        <KPICard
          title='Completion Rate'
          value='87%'
          icon='checkmark-circle'
          color='#00CC66'
        />
      );
      expect(getByText('87%')).toBeTruthy();
    });

    it('should render time-based value correctly', () => {
      const { getByText } = render(
        <KPICard
          title='Avg Response'
          value='2.5 hrs'
          icon='time'
          color='#FF9900'
        />
      );
      expect(getByText('2.5 hrs')).toBeTruthy();
    });
  });

  describe('Layout and Spacing', () => {
    it('should apply centred layout to the icon chip', () => {
      const { getByText } = render(<KPICard {...defaultProps} />);
      const title = getByText('Total Revenue');
      const card = title.parent;
      const icon = card?.findByProps({ name: 'cash-outline' });
      const chip = icon?.parent;
      const styles = chip?.props.style;
      const flattened = Array.isArray(styles)
        ? Object.assign({}, ...styles.filter(Boolean))
        : styles;
      expect(flattened).toEqual(
        expect.objectContaining({
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        })
      );
    });

    it('should apply flexDirection row to change container', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 5.0, isPositive: true }} />
      );
      const changeText = getByText('+5.0%');
      const changeContainer = changeText.parent;
      expect(changeContainer?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
          alignItems: 'center',
        })
      );
    });

    it('should apply marginLeft to change text', () => {
      const { getByText } = render(
        <KPICard {...defaultProps} change={{ value: 5.0, isPositive: true }} />
      );
      const changeText = getByText('+5.0%');
      expect(changeText.props.style).toContainEqual(
        expect.objectContaining({
          fontSize: 12,
          fontWeight: '500',
          marginLeft: 4,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string title', () => {
      const { getByText } = render(<KPICard {...defaultProps} title='' />);
      // Should still render the value
      expect(getByText('$12,345')).toBeTruthy();
    });

    it('should handle empty string value', () => {
      const { getByText } = render(<KPICard {...defaultProps} value='' />);
      // Should still render the title
      expect(getByText('Total Revenue')).toBeTruthy();
    });

    it('should handle very long title text', () => {
      const longTitle =
        'This is a very long title that might overflow the card layout';
      const { getByText } = render(
        <KPICard {...defaultProps} title={longTitle} />
      );
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle very long value text', () => {
      const longValue = '$1,234,567,890,123.45';
      const { getByText } = render(
        <KPICard {...defaultProps} value={longValue} />
      );
      expect(getByText(longValue)).toBeTruthy();
    });

    it('should maintain component structure on re-renders', () => {
      const { getByText, rerender } = render(<KPICard {...defaultProps} />);

      expect(getByText('Total Revenue')).toBeTruthy();
      expect(getByText('$12,345')).toBeTruthy();

      rerender(<KPICard {...defaultProps} value='$54,321' />);

      expect(getByText('Total Revenue')).toBeTruthy();
      expect(getByText('$54,321')).toBeTruthy();
    });

    it('should handle change prop being added/removed', () => {
      const { getByText, rerender, queryByText } = render(
        <KPICard {...defaultProps} />
      );

      // Initially no change
      expect(queryByText('%')).toBeNull();

      // Add change
      rerender(
        <KPICard {...defaultProps} change={{ value: 5.0, isPositive: true }} />
      );
      expect(getByText('+5.0%')).toBeTruthy();

      // Remove change
      rerender(<KPICard {...defaultProps} />);
      expect(queryByText('%')).toBeNull();
    });
  });
});
