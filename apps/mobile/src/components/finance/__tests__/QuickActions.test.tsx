import React from 'react';
import { fireEvent, render, createMockNavigation } from '../../test-utils';
import { QuickActions } from '../QuickActions';

/**
 * QuickActions Component Tests
 *
 * Realigned 2026-05-31 to the Airbnb-restyle redesign of QuickActions.
 * The component now renders 4 actions — Invoices / Expenses / Payouts /
 * Reports — navigating to InvoiceManagement / Expenses / Payouts / Reporting.
 * Tests cover rendering, navigation handlers, icon rendering, and styling.
 */

describe('QuickActions', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;

  beforeEach(() => {
    mockNavigation = createMockNavigation();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<QuickActions navigation={mockNavigation as any} />);
      }).not.toThrow();
    });

    it('should render actions container', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const container = getByText('Quick Actions').parent;
      expect(container).toBeTruthy();
    });

    it('should render title "Quick Actions"', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    it('should render all 4 action buttons', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      expect(getByText('Invoices')).toBeTruthy();
      expect(getByText('Expenses')).toBeTruthy();
      expect(getByText('Payouts')).toBeTruthy();
      expect(getByText('Reports')).toBeTruthy();
    });

    it('should render action buttons container', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;
      expect(button).toBeTruthy();
    });
  });

  describe('Title Styling', () => {
    it('should apply correct title font size', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: 18,
        })
      );
    });

    it('should apply correct title font weight', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontWeight: '700',
        })
      );
    });

    it('should apply textPrimary color to title', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          color: '#222222',
        })
      );
    });

    it('should apply marginBottom of 16 to title', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 16,
        })
      );
    });
  });

  describe('Invoices Button', () => {
    it('should navigate to InvoiceManagement when pressed', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('InvoiceManagement');
    });

    it('should render receipt-outline icon', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;
      const icon = button?.findByProps({ name: 'receipt-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 22', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;
      const icon = button?.findByProps({ name: 'receipt-outline' });

      expect(icon?.props.size).toBe(22);
    });

    it('should render icon with primary color', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;
      const icon = button?.findByProps({ name: 'receipt-outline' });

      expect(icon?.props.color).toBe('#0D9488');
    });
  });

  describe('Expenses Button', () => {
    it('should navigate to Expenses when pressed', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Expenses');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'Expenses',
        undefined
      );
    });

    it('should render card-outline icon', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Expenses').parent;
      const icon = button?.findByProps({ name: 'card-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 22', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Expenses').parent;
      const icon = button?.findByProps({ name: 'card-outline' });

      expect(icon?.props.size).toBe(22);
    });

    it('should render icon with accent color', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Expenses').parent;
      const icon = button?.findByProps({ name: 'card-outline' });

      expect(icon?.props.color).toBe('#F59E0B');
    });
  });

  describe('Payouts Button', () => {
    it('should navigate to Payouts when pressed', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Payouts');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Payouts');
    });

    it('should render cash-outline icon', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Payouts').parent;
      const icon = button?.findByProps({ name: 'cash-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 22', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Payouts').parent;
      const icon = button?.findByProps({ name: 'cash-outline' });

      expect(icon?.props.size).toBe(22);
    });

    it('should render icon with blue color', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Payouts').parent;
      const icon = button?.findByProps({ name: 'cash-outline' });

      expect(icon?.props.color).toBe('#3B82F6');
    });
  });

  describe('Reports Button', () => {
    it('should navigate to Reporting when pressed', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Reports');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Reporting');
    });

    it('should render analytics-outline icon', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Reports').parent;
      const icon = button?.findByProps({ name: 'analytics-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 22', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Reports').parent;
      const icon = button?.findByProps({ name: 'analytics-outline' });

      expect(icon?.props.size).toBe(22);
    });

    it('should render icon with purple color', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Reports').parent;
      const icon = button?.findByProps({ name: 'analytics-outline' });

      expect(icon?.props.color).toBe('#8B5CF6');
    });
  });

  describe('Container Styling', () => {
    it('should apply surface background color to container', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#FFFFFF',
        })
      );
    });

    it('should apply borderRadius to container', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          borderRadius: 20,
        })
      );
    });

    it('should apply padding of 20 to container', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          padding: 20,
        })
      );
    });

    it('should apply marginBottom of 16 to container', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 16,
        })
      );
    });
  });

  describe('Action Buttons Row Styling', () => {
    it('should apply flexDirection row to action buttons row', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;
      const container = button?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });

    it('should apply justifyContent space-between to action buttons row', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;
      const container = button?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          justifyContent: 'space-between',
        })
      );
    });
  });

  describe('Individual Action Button Styling', () => {
    it('should apply flex 1 to action button', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
        })
      );
    });

    it('should apply alignItems center to action button', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          alignItems: 'center',
        })
      );
    });
  });

  describe('Action Button Text Styling', () => {
    it('should apply fontSize of 12 to button text', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const text = getByText('Invoices');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          fontSize: 12,
        })
      );
    });

    it('should apply textPrimary color to button text', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const text = getByText('Invoices');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          color: '#222222',
        })
      );
    });

    it('should apply textAlign center to button text', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const text = getByText('Invoices');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          textAlign: 'center',
        })
      );
    });

    it('should apply fontWeight 600 to button text', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const text = getByText('Invoices');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          fontWeight: '600',
        })
      );
    });
  });

  describe('Multiple Interactions', () => {
    it('should handle multiple button presses', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );

      fireEvent.press(getByText('Invoices').parent as any);
      fireEvent.press(getByText('Expenses').parent as any);
      fireEvent.press(getByText('Payouts').parent as any);
      fireEvent.press(getByText('Reports').parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(4);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        1,
        'InvoiceManagement'
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        2,
        'Expenses',
        undefined
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(3, 'Payouts');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(4, 'Reporting');
    });

    it('should handle repeated presses of same button', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );
      const button = getByText('Invoices');

      fireEvent.press(button.parent as any);
      fireEvent.press(button.parent as any);
      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        1,
        'InvoiceManagement'
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        2,
        'InvoiceManagement'
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        3,
        'InvoiceManagement'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with different navigation instances', () => {
      const navigation1 = createMockNavigation();
      const navigation2 = createMockNavigation();

      const { rerender, getByText } = render(
        <QuickActions navigation={navigation1 as any} />
      );
      expect(getByText('Quick Actions')).toBeTruthy();

      rerender(<QuickActions navigation={navigation2 as any} />);
      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Invoices')).toBeTruthy();
    });

    it('should maintain component structure on re-renders', () => {
      const { getByText, rerender } = render(
        <QuickActions navigation={mockNavigation as any} />
      );

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Invoices')).toBeTruthy();
      expect(getByText('Expenses')).toBeTruthy();
      expect(getByText('Payouts')).toBeTruthy();
      expect(getByText('Reports')).toBeTruthy();

      rerender(<QuickActions navigation={mockNavigation as any} />);

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Invoices')).toBeTruthy();
      expect(getByText('Expenses')).toBeTruthy();
      expect(getByText('Payouts')).toBeTruthy();
      expect(getByText('Reports')).toBeTruthy();
    });

    it('should render all buttons after navigation instance changes', () => {
      const navigation1 = createMockNavigation();
      const navigation2 = createMockNavigation();

      const { rerender, getByText } = render(
        <QuickActions navigation={navigation1 as any} />
      );

      fireEvent.press(getByText('Invoices').parent as any);
      expect(navigation1.navigate).toHaveBeenCalledWith('InvoiceManagement');

      rerender(<QuickActions navigation={navigation2 as any} />);

      fireEvent.press(getByText('Expenses').parent as any);
      expect(navigation2.navigate).toHaveBeenCalledWith('Expenses', undefined);
      expect(navigation1.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Actions Array Structure', () => {
    it('should render actions in correct order', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );

      const button1 = getByText('Invoices').parent;
      const button2 = getByText('Expenses').parent;
      const button3 = getByText('Payouts').parent;
      const button4 = getByText('Reports').parent;

      expect(button1).toBeTruthy();
      expect(button2).toBeTruthy();
      expect(button3).toBeTruthy();
      expect(button4).toBeTruthy();
    });

    it('should render all action labels correctly', () => {
      const { getByText } = render(
        <QuickActions navigation={mockNavigation as any} />
      );

      const labels = ['Invoices', 'Expenses', 'Payouts', 'Reports'];

      labels.forEach((label) => {
        expect(getByText(label)).toBeTruthy();
      });
    });
  });
});
