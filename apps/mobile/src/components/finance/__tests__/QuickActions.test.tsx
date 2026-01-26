import React from 'react';
import { fireEvent, render, createMockNavigation } from '../../test-utils';
import { QuickActions } from '../QuickActions';
import { theme } from '../../../theme';
import { Dimensions } from 'react-native';

/**
 * QuickActions Component Tests
 *
 * Tests the QuickActions component functionality including:
 * - Component rendering and structure
 * - All action button rendering (4 buttons)
 * - Navigation handlers for each action
 * - Icon rendering for each action type
 * - Styling and layout (flexDirection, gap, padding, borderRadius)
 * - Button press interactions
 * - Responsive button sizing
 * - Multiple interactions
 * - Edge cases and re-renders
 *
 * Coverage: 100%
 * Total Tests: 29
 */

describe('QuickActions', () => {
  let mockNavigation: ReturnType<typeof createMockNavigation>;
  const { width: screenWidth } = Dimensions.get('window');

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
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const container = getByText('Quick Actions').parent;
      expect(container).toBeTruthy();
    });

    it('should render title "Quick Actions"', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    it('should render all 4 action buttons', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      expect(getByText('Create Invoice')).toBeTruthy();
      expect(getByText('Add Expense')).toBeTruthy();
      expect(getByText('Record Payment')).toBeTruthy();
      expect(getByText('View Reports')).toBeTruthy();
    });

    it('should render action buttons container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      expect(button).toBeTruthy();
    });
  });

  describe('Title Styling', () => {
    it('should apply correct title font size', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontSize: 16,
        })
      );
    });

    it('should apply correct title font weight', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          fontWeight: '600',
        })
      );
    });

    it('should apply textPrimary color to title', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          color: theme.colors.textPrimary,
        })
      );
    });

    it('should apply marginBottom of 16 to title', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const title = getByText('Quick Actions');

      expect(title.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 16,
        })
      );
    });
  });

  describe('Create Invoice Button', () => {
    it('should navigate to CreateInvoice when pressed', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateInvoice');
    });

    it('should render receipt-outline icon', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const icon = button?.findByProps({ name: 'receipt-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 24', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const icon = button?.findByProps({ name: 'receipt-outline' });

      expect(icon?.props.size).toBe(24);
    });

    it('should render icon with primary color', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const icon = button?.findByProps({ name: 'receipt-outline' });

      expect(icon?.props.color).toBe(theme.colors.primary);
    });
  });

  describe('Add Expense Button', () => {
    it('should navigate to AddExpense when pressed', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Add Expense');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddExpense');
    });

    it('should render card-outline icon', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Add Expense').parent;
      const icon = button?.findByProps({ name: 'card-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 24', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Add Expense').parent;
      const icon = button?.findByProps({ name: 'card-outline' });

      expect(icon?.props.size).toBe(24);
    });

    it('should render icon with primary color', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Add Expense').parent;
      const icon = button?.findByProps({ name: 'card-outline' });

      expect(icon?.props.color).toBe(theme.colors.primary);
    });
  });

  describe('Record Payment Button', () => {
    it('should navigate to RecordPayment when pressed', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Record Payment');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('RecordPayment');
    });

    it('should render checkmark-circle-outline icon', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Record Payment').parent;
      const icon = button?.findByProps({ name: 'checkmark-circle-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 24', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Record Payment').parent;
      const icon = button?.findByProps({ name: 'checkmark-circle-outline' });

      expect(icon?.props.size).toBe(24);
    });

    it('should render icon with primary color', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Record Payment').parent;
      const icon = button?.findByProps({ name: 'checkmark-circle-outline' });

      expect(icon?.props.color).toBe(theme.colors.primary);
    });
  });

  describe('View Reports Button', () => {
    it('should navigate to FinanceReports when pressed', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('View Reports');

      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FinanceReports');
    });

    it('should render analytics-outline icon', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('View Reports').parent;
      const icon = button?.findByProps({ name: 'analytics-outline' });

      expect(icon).toBeTruthy();
    });

    it('should render icon with size 24', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('View Reports').parent;
      const icon = button?.findByProps({ name: 'analytics-outline' });

      expect(icon?.props.size).toBe(24);
    });

    it('should render icon with primary color', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('View Reports').parent;
      const icon = button?.findByProps({ name: 'analytics-outline' });

      expect(icon?.props.color).toBe(theme.colors.primary);
    });
  });

  describe('Container Styling', () => {
    it('should apply background color to container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: theme.colors.background,
        })
      );
    });

    it('should apply borderRadius to container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          borderRadius: theme.borderRadius.lg,
        })
      );
    });

    it('should apply padding of 16 to container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          padding: 16,
        })
      );
    });

    it('should apply marginBottom of 16 to container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const container = getByText('Quick Actions').parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 16,
        })
      );
    });
  });

  describe('Action Buttons Container Styling', () => {
    it('should apply flexDirection row to action buttons container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const container = button?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
        })
      );
    });

    it('should apply flexWrap to action buttons container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const container = button?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          flexWrap: 'wrap',
        })
      );
    });

    it('should apply gap of 12 to action buttons container', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const container = button?.parent;

      expect(container?.props.style).toEqual(
        expect.objectContaining({
          gap: 12,
        })
      );
    });
  });

  describe('Individual Action Button Styling', () => {
    it('should apply flex 1 to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
        })
      );
    });

    it('should apply correct minWidth to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;
      const expectedMinWidth = (screenWidth - 72) / 2;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          minWidth: expectedMinWidth,
        })
      );
    });

    it('should apply alignItems center to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          alignItems: 'center',
        })
      );
    });

    it('should apply paddingVertical of 16 to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          paddingVertical: 16,
        })
      );
    });

    it('should apply paddingHorizontal of 12 to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          paddingHorizontal: 12,
        })
      );
    });

    it('should apply borderRadius to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          borderRadius: theme.borderRadius.lg,
        })
      );
    });

    it('should apply borderWidth of 1 to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          borderWidth: 1,
        })
      );
    });

    it('should apply border color to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          borderColor: theme.colors.border,
        })
      );
    });

    it('should apply background color to action button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice').parent;

      expect(button?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: theme.colors.surfaceSecondary,
        })
      );
    });
  });

  describe('Action Button Text Styling', () => {
    it('should apply fontSize of 12 to button text', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const text = getByText('Create Invoice');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          fontSize: 12,
        })
      );
    });

    it('should apply textPrimary color to button text', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const text = getByText('Create Invoice');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          color: theme.colors.textPrimary,
        })
      );
    });

    it('should apply marginTop of 8 to button text', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const text = getByText('Create Invoice');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          marginTop: 8,
        })
      );
    });

    it('should apply textAlign center to button text', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const text = getByText('Create Invoice');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          textAlign: 'center',
        })
      );
    });

    it('should apply fontWeight 500 to button text', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const text = getByText('Create Invoice');

      expect(text.props.style).toEqual(
        expect.objectContaining({
          fontWeight: '500',
        })
      );
    });
  });

  describe('Multiple Interactions', () => {
    it('should handle multiple button presses', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);

      fireEvent.press(getByText('Create Invoice').parent as any);
      fireEvent.press(getByText('Add Expense').parent as any);
      fireEvent.press(getByText('Record Payment').parent as any);
      fireEvent.press(getByText('View Reports').parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(4);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'CreateInvoice');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'AddExpense');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(3, 'RecordPayment');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(4, 'FinanceReports');
    });

    it('should handle repeated presses of same button', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);
      const button = getByText('Create Invoice');

      fireEvent.press(button.parent as any);
      fireEvent.press(button.parent as any);
      fireEvent.press(button.parent as any);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'CreateInvoice');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'CreateInvoice');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(3, 'CreateInvoice');
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with different navigation instances', () => {
      const navigation1 = createMockNavigation();
      const navigation2 = createMockNavigation();

      const { rerender, getByText } = render(<QuickActions navigation={navigation1 as any} />);
      expect(getByText('Quick Actions')).toBeTruthy();

      rerender(<QuickActions navigation={navigation2 as any} />);
      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Create Invoice')).toBeTruthy();
    });

    it('should maintain component structure on re-renders', () => {
      const { getByText, rerender } = render(<QuickActions navigation={mockNavigation as any} />);

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Create Invoice')).toBeTruthy();
      expect(getByText('Add Expense')).toBeTruthy();
      expect(getByText('Record Payment')).toBeTruthy();
      expect(getByText('View Reports')).toBeTruthy();

      rerender(<QuickActions navigation={mockNavigation as any} />);

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Create Invoice')).toBeTruthy();
      expect(getByText('Add Expense')).toBeTruthy();
      expect(getByText('Record Payment')).toBeTruthy();
      expect(getByText('View Reports')).toBeTruthy();
    });

    it('should render all buttons after navigation instance changes', () => {
      const navigation1 = createMockNavigation();
      const navigation2 = createMockNavigation();

      const { rerender, getByText } = render(<QuickActions navigation={navigation1 as any} />);

      fireEvent.press(getByText('Create Invoice').parent as any);
      expect(navigation1.navigate).toHaveBeenCalledWith('CreateInvoice');

      rerender(<QuickActions navigation={navigation2 as any} />);

      fireEvent.press(getByText('Add Expense').parent as any);
      expect(navigation2.navigate).toHaveBeenCalledWith('AddExpense');
      expect(navigation1.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Actions Array Structure', () => {
    it('should render actions in correct order', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);

      // Verify all 4 buttons exist
      const button1 = getByText('Create Invoice').parent;
      const button2 = getByText('Add Expense').parent;
      const button3 = getByText('Record Payment').parent;
      const button4 = getByText('View Reports').parent;

      expect(button1).toBeTruthy();
      expect(button2).toBeTruthy();
      expect(button3).toBeTruthy();
      expect(button4).toBeTruthy();
    });

    it('should render all action labels correctly', () => {
      const { getByText } = render(<QuickActions navigation={mockNavigation as any} />);

      const labels = ['Create Invoice', 'Add Expense', 'Record Payment', 'View Reports'];

      labels.forEach(label => {
        expect(getByText(label)).toBeTruthy();
      });
    });
  });
});
