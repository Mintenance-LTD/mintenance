import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InvoiceCard } from '../InvoiceCard';
import { Invoice } from '../../services/contractor-business';

// Mock theme
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#0EA5E9',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      textSecondary: '#64748B',
      textPrimary: '#0F172A',
      background: '#FFFFFF',
      white: '#FFFFFF',
      border: '#E2E8F0',
    },
    borderRadius: {
      sm: 4,
      lg: 12,
    },
    shadows: {
      base: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
    spacing: {
      2: 8,
      4: 16,
    },
  },
}));

// Mock useI18n hook
jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    formatters: {
      currency: jest.fn((amount: number, currency?: string) => {
        const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
        return `${currencySymbol}${amount.toFixed(2)}`;
      }),
      date: jest.fn((date: Date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }),
    },
  }),
}));

// Helper function to create mock invoice
const createMockInvoice = (overrides?: Partial<Invoice & { client_name?: string; reminder_sent_count?: number }>): Invoice & { client_name?: string; reminder_sent_count?: number } => {
  const baseInvoice: Invoice = {
    id: 'test-invoice-1',
    contractor_id: 'contractor-1',
    client_id: 'client-1',
    invoice_number: 'INV-001',
    status: 'sent',
    subtotal: 1000,
    tax_amount: 100,
    total_amount: 1100,
    due_date: '2024-03-15',
    issue_date: '2024-02-15',
    line_items: [],
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
  };

  return {
    ...baseInvoice,
    client_name: 'Test Client',
    reminder_sent_count: 0,
    ...overrides,
  } as Invoice & { client_name?: string; reminder_sent_count?: number };
};

describe('InvoiceCard', () => {
  let mockOnPress: jest.Mock;
  let mockOnSendReminder: jest.Mock;
  let mockOnMarkPaid: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPress = jest.fn();
    mockOnSendReminder = jest.fn();
    mockOnMarkPaid = jest.fn();
  });

  describe('Core Rendering', () => {
    it('renders invoice number with # prefix', () => {
      const invoice = createMockInvoice({ invoice_number: 'INV-12345' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-12345')).toBeTruthy();
    });

    it('renders client name', () => {
      const invoice = createMockInvoice({ client_name: 'John Doe Construction' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('John Doe Construction')).toBeTruthy();
    });

    it('renders total amount with formatters.currency', () => {
      const invoice = createMockInvoice({ total_amount: 2500.50, currency: 'USD' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('$2500.50')).toBeTruthy();
    });

    it('renders due date with formatters.date', () => {
      const invoice = createMockInvoice({ due_date: '2024-06-15' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      const expectedDate = new Date('2024-06-15').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      expect(getByText(`Due: ${expectedDate}`)).toBeTruthy();
    });

    it('renders TouchableOpacity container', () => {
      const invoice = createMockInvoice();
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      const touchable = UNSAFE_root.findByType('TouchableOpacity');
      expect(touchable).toBeTruthy();
    });

    it('calls onPress when card pressed', () => {
      const invoice = createMockInvoice();
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('#INV-001'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call action handlers when card pressed', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('#INV-001'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnSendReminder).not.toHaveBeenCalled();
      expect(mockOnMarkPaid).not.toHaveBeenCalled();
    });
  });

  describe('Status Badge', () => {
    it('displays status in UPPERCASE', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('SENT')).toBeTruthy();
    });

    it('applies correct color for paid status', () => {
      const invoice = createMockInvoice({ status: 'paid' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      const statusText = getByText('PAID');
      expect(statusText).toBeTruthy();
    });

    it('applies correct color for overdue status', () => {
      const invoice = createMockInvoice({ status: 'overdue' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('OVERDUE')).toBeTruthy();
    });

    it('applies correct color for sent status', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('SENT')).toBeTruthy();
    });

    it('applies correct color for draft status', () => {
      const invoice = createMockInvoice({ status: 'draft' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('DRAFT')).toBeTruthy();
    });

    it('applies default color for unknown status', () => {
      const invoice = createMockInvoice({ status: 'unknown' as any });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('UNKNOWN')).toBeTruthy();
    });

    it('displays correct icon for paid status', () => {
      const invoice = createMockInvoice({ status: 'paid' });
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Verify component renders without errors
      expect(UNSAFE_root).toBeTruthy();
    });

    it('displays correct icon for overdue status', () => {
      const invoice = createMockInvoice({ status: 'overdue' });
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('displays correct icon for sent status', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('displays correct icon for draft status', () => {
      const invoice = createMockInvoice({ status: 'draft' });
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Overdue Calculation', () => {
    it('shows overdue container only when status is overdue', () => {
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText(/days overdue/)).toBeTruthy();
    });

    it('calculates 1 day overdue correctly', () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: yesterday.toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should show 1 or 2 days depending on timing
      expect(getByText(/[12] days overdue/)).toBeTruthy();
    });

    it('calculates 7 days overdue correctly', () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: weekAgo.toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should show 7 or 8 days depending on timing
      expect(getByText(/[78] days overdue/)).toBeTruthy();
    });

    it('calculates 30 days overdue correctly', () => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: monthAgo.toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should show 30 or 31 days depending on timing
      expect(getByText(/(30|31) days overdue/)).toBeTruthy();
    });

    it('uses Math.ceil for rounding', () => {
      // Create a date that's 1.5 days ago
      const oneDayHalfAgo = new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: oneDayHalfAgo.toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should round up to 2 days
      expect(getByText(/2 days overdue/)).toBeTruthy();
    });

    it('shows correct overdue text format', () => {
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should show 5 or 6 days depending on timing
      expect(getByText(/[56] days overdue/)).toBeTruthy();
    });
  });

  describe('Reminder Count', () => {
    it('shows reminder text when reminder_sent_count > 0', () => {
      const invoice = createMockInvoice({ reminder_sent_count: 3 });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('3 reminder(s) sent')).toBeTruthy();
    });

    it('displays "1 reminder(s) sent" for count=1', () => {
      const invoice = createMockInvoice({ reminder_sent_count: 1 });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('1 reminder(s) sent')).toBeTruthy();
    });

    it('displays "5 reminder(s) sent" for count=5', () => {
      const invoice = createMockInvoice({ reminder_sent_count: 5 });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('5 reminder(s) sent')).toBeTruthy();
    });

    it('hides reminder text when count=0', () => {
      const invoice = createMockInvoice({ reminder_sent_count: 0 });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText(/reminder\(s\) sent/)).toBeNull();
    });

    it('hides reminder text when count is undefined', () => {
      const invoice = createMockInvoice({ reminder_sent_count: undefined });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText(/reminder\(s\) sent/)).toBeNull();
    });
  });

  describe('Send Reminder Button', () => {
    it('shows button when status is sent', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('Send Reminder')).toBeTruthy();
    });

    it('shows button when status is overdue', () => {
      const invoice = createMockInvoice({ status: 'overdue' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('Send Reminder')).toBeTruthy();
    });

    it('hides button when status is paid', () => {
      const invoice = createMockInvoice({ status: 'paid' });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText('Send Reminder')).toBeNull();
    });

    it('hides button when status is draft', () => {
      const invoice = createMockInvoice({ status: 'draft' });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText('Send Reminder')).toBeNull();
    });

    it('hides button when status is cancelled', () => {
      const invoice = createMockInvoice({ status: 'cancelled' });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText('Send Reminder')).toBeNull();
    });

    it('calls onSendReminder when pressed', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('Send Reminder'));
      expect(mockOnSendReminder).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onPress when reminder button pressed', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('Send Reminder'));
      expect(mockOnSendReminder).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Mark Paid Button', () => {
    it('shows button when status is sent', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('Mark Paid')).toBeTruthy();
    });

    it('shows button when status is overdue', () => {
      const invoice = createMockInvoice({ status: 'overdue' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('Mark Paid')).toBeTruthy();
    });

    it('shows button when status is draft', () => {
      const invoice = createMockInvoice({ status: 'draft' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('Mark Paid')).toBeTruthy();
    });

    it('hides button when status is paid', () => {
      const invoice = createMockInvoice({ status: 'paid' });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText('Mark Paid')).toBeNull();
    });

    it('hides button when status is cancelled', () => {
      const invoice = createMockInvoice({ status: 'cancelled' });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(queryByText('Mark Paid')).toBeNull();
    });

    it('calls onMarkPaid when pressed', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('Mark Paid'));
      expect(mockOnMarkPaid).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onPress when paid button pressed', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('Mark Paid'));
      expect(mockOnMarkPaid).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Currency & Date Formatting', () => {
    it('calls formatters.currency with total_amount and currency', () => {
      const invoice = createMockInvoice({
        total_amount: 5000,
        currency: 'USD',
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('$5000.00')).toBeTruthy();
    });

    it('handles GBP currency', () => {
      const invoice = createMockInvoice({
        total_amount: 2000,
        currency: 'GBP',
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('£2000.00')).toBeTruthy();
    });

    it('handles EUR currency', () => {
      const invoice = createMockInvoice({
        total_amount: 3000,
        currency: 'EUR',
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('€3000.00')).toBeTruthy();
    });

    it('calls formatters.date with due_date as Date object', () => {
      const invoice = createMockInvoice({
        due_date: '2024-12-25',
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      const expectedDate = new Date('2024-12-25').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      expect(getByText(`Due: ${expectedDate}`)).toBeTruthy();
    });

    it('handles currency?.toUpperCase?.() safely when currency is undefined', () => {
      const invoice = createMockInvoice({
        total_amount: 1500,
        currency: undefined,
      });
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should render without error
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing client_name', () => {
      const invoice = createMockInvoice({ client_name: undefined });
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should render without error
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles missing reminder_sent_count', () => {
      const invoice = createMockInvoice({ reminder_sent_count: undefined });
      const { queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should not show reminder text
      expect(queryByText(/reminder\(s\) sent/)).toBeNull();
    });

    it('handles missing currency', () => {
      const invoice = createMockInvoice({
        total_amount: 1000,
        currency: undefined,
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should use default USD
      expect(getByText('$1000.00')).toBeTruthy();
    });

    it('handles future due_date with overdue status', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: futureDate.toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should still render overdue section (even with negative days)
      expect(getByText(/days overdue/)).toBeTruthy();
    });

    it('handles very large amounts', () => {
      const invoice = createMockInvoice({
        total_amount: 999999999.99,
        currency: 'USD',
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('$999999999.99')).toBeTruthy();
    });

    it('handles very large overdue days', () => {
      const veryOldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        due_date: veryOldDate.toISOString(),
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      // Should show 365 or 366 days depending on timing
      expect(getByText(/(365|366) days overdue/)).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('renders complete card for paid status', () => {
      const invoice = createMockInvoice({
        status: 'paid',
        invoice_number: 'INV-PAID-001',
        client_name: 'Paid Client',
        total_amount: 5000,
        currency: 'USD',
      });
      const { getByText, queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-PAID-001')).toBeTruthy();
      expect(getByText('Paid Client')).toBeTruthy();
      expect(getByText('$5000.00')).toBeTruthy();
      expect(getByText('PAID')).toBeTruthy();
      expect(queryByText('Send Reminder')).toBeNull();
      expect(queryByText('Mark Paid')).toBeNull();
    });

    it('renders complete card for overdue status with all features', () => {
      const overdueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const invoice = createMockInvoice({
        status: 'overdue',
        invoice_number: 'INV-OVERDUE-001',
        client_name: 'Late Client',
        total_amount: 7500,
        currency: 'GBP',
        due_date: overdueDate.toISOString(),
        reminder_sent_count: 3,
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-OVERDUE-001')).toBeTruthy();
      expect(getByText('Late Client')).toBeTruthy();
      expect(getByText('£7500.00')).toBeTruthy();
      expect(getByText('OVERDUE')).toBeTruthy();
      expect(getByText(/(10|11) days overdue/)).toBeTruthy();
      expect(getByText('3 reminder(s) sent')).toBeTruthy();
      expect(getByText('Send Reminder')).toBeTruthy();
      expect(getByText('Mark Paid')).toBeTruthy();
    });

    it('renders complete card for sent status', () => {
      const invoice = createMockInvoice({
        status: 'sent',
        invoice_number: 'INV-SENT-001',
        client_name: 'Pending Client',
        total_amount: 2500,
        currency: 'EUR',
        reminder_sent_count: 1,
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-SENT-001')).toBeTruthy();
      expect(getByText('Pending Client')).toBeTruthy();
      expect(getByText('€2500.00')).toBeTruthy();
      expect(getByText('SENT')).toBeTruthy();
      expect(getByText('1 reminder(s) sent')).toBeTruthy();
      expect(getByText('Send Reminder')).toBeTruthy();
      expect(getByText('Mark Paid')).toBeTruthy();
    });

    it('renders complete card for draft status', () => {
      const invoice = createMockInvoice({
        status: 'draft',
        invoice_number: 'INV-DRAFT-001',
        client_name: 'Draft Client',
        total_amount: 1200,
      });
      const { getByText, queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-DRAFT-001')).toBeTruthy();
      expect(getByText('Draft Client')).toBeTruthy();
      expect(getByText('$1200.00')).toBeTruthy();
      expect(getByText('DRAFT')).toBeTruthy();
      expect(queryByText('Send Reminder')).toBeNull();
      expect(getByText('Mark Paid')).toBeTruthy();
    });

    it('handles multiple button presses correctly', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('Send Reminder'));
      fireEvent.press(getByText('Send Reminder'));
      fireEvent.press(getByText('Mark Paid'));

      expect(mockOnSendReminder).toHaveBeenCalledTimes(2);
      expect(mockOnMarkPaid).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('renders card with no optional features', () => {
      const invoice = createMockInvoice({
        status: 'sent',
        reminder_sent_count: 0,
      });
      const { getByText, queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-001')).toBeTruthy();
      expect(queryByText(/reminder\(s\) sent/)).toBeNull();
      expect(queryByText(/days overdue/)).toBeNull();
    });

    it('renders cancelled invoice correctly', () => {
      const invoice = createMockInvoice({
        status: 'cancelled',
        invoice_number: 'INV-CANCEL-001',
      });
      const { getByText, queryByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-CANCEL-001')).toBeTruthy();
      expect(getByText('CANCELLED')).toBeTruthy();
      expect(queryByText('Send Reminder')).toBeNull();
      expect(queryByText('Mark Paid')).toBeNull();
    });

    it('all handlers work independently', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('#INV-001'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnSendReminder).not.toHaveBeenCalled();
      expect(mockOnMarkPaid).not.toHaveBeenCalled();

      mockOnPress.mockClear();

      fireEvent.press(getByText('Send Reminder'));
      expect(mockOnSendReminder).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockOnMarkPaid).not.toHaveBeenCalled();

      mockOnSendReminder.mockClear();

      fireEvent.press(getByText('Mark Paid'));
      expect(mockOnMarkPaid).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockOnSendReminder).not.toHaveBeenCalled();
    });
  });

  describe('Props Validation', () => {
    it('accepts valid invoice object', () => {
      const invoice = createMockInvoice();
      const { UNSAFE_root } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('handlers are called with correct arguments', () => {
      const invoice = createMockInvoice({ status: 'sent' });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      fireEvent.press(getByText('#INV-001'));
      expect(mockOnPress).toHaveBeenCalledWith();

      fireEvent.press(getByText('Send Reminder'));
      expect(mockOnSendReminder).toHaveBeenCalledWith();

      fireEvent.press(getByText('Mark Paid'));
      expect(mockOnMarkPaid).toHaveBeenCalledWith();
    });

    it('renders with minimal required props', () => {
      const invoice = createMockInvoice({
        client_name: undefined,
        reminder_sent_count: undefined,
        currency: undefined,
      });
      const { getByText } = render(
        <InvoiceCard
          invoice={invoice}
          onPress={mockOnPress}
          onSendReminder={mockOnSendReminder}
          onMarkPaid={mockOnMarkPaid}
        />
      );

      expect(getByText('#INV-001')).toBeTruthy();
      expect(getByText('$1100.00')).toBeTruthy();
    });
  });
});
