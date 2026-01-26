import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuoteCard } from '../QuoteCard';
import { ContractorQuote } from '../../services/QuoteBuilderService';

// Mock theme
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#0EA5E9',
      secondary: '#10B981',
      success: '#16A34A',
      error: '#EF4444',
      warning: '#D97706',
      info: '#2563EB',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textTertiary: '#64748B',
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAFC',
      surfaceSecondary: '#F8FAFC',
      border: '#E2E8F0',
      borderLight: '#E2E8F0',
      white: '#FFFFFF',
    },
    borderRadius: {
      sm: 4,
      base: 8,
      lg: 12,
      xl: 16,
    },
    shadows: {
      base: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    },
    spacing: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      6: 24,
    },
  },
}));

// Helper function to create mock quotes
const createMockQuote = (overrides?: Partial<ContractorQuote>): ContractorQuote => ({
  id: 'quote-123',
  quote_number: 'Q-2024-001',
  contractor_id: 'contractor-1',
  job_id: 'job-1',
  client_name: 'John Smith',
  client_email: 'john@example.com',
  client_phone: '07700900000',
  project_title: 'Kitchen Renovation',
  project_description: 'Complete kitchen remodel with new cabinets and countertops',
  subtotal: 5000,
  tax_amount: 1000,
  discount_amount: 0,
  total_amount: 6000,
  markup_percentage: 0,
  discount_percentage: 0,
  tax_rate: 20,
  currency: 'GBP',
  status: 'draft',
  valid_until: '2026-02-28',
  terms_and_conditions: 'Standard terms apply',
  notes: '',
  template_id: undefined,
  sent_at: undefined,
  viewed_at: undefined,
  accepted_at: undefined,
  rejected_at: undefined,
  created_at: '2026-01-15',
  updated_at: '2026-01-15',
  ...overrides,
});

describe('QuoteCard', () => {
  let mockOnPress: jest.Mock;
  let mockOnEdit: jest.Mock;
  let mockOnSend: jest.Mock;
  let mockOnDuplicate: jest.Mock;
  let mockOnDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPress = jest.fn();
    mockOnEdit = jest.fn();
    mockOnSend = jest.fn();
    mockOnDuplicate = jest.fn();
    mockOnDelete = jest.fn();
  });

  // ============================================================================
  // Core Rendering Tests
  // ============================================================================
  describe('Core Rendering', () => {
    it('renders quote number with # prefix', () => {
      const quote = createMockQuote({ quote_number: 'Q-2024-001' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('#Q-2024-001')).toBeTruthy();
    });

    it('renders project title', () => {
      const quote = createMockQuote({ project_title: 'Kitchen Renovation' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Kitchen Renovation')).toBeTruthy();
    });

    it('renders client name', () => {
      const quote = createMockQuote({ client_name: 'John Smith' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('John Smith')).toBeTruthy();
    });

    it('renders total amount with £ currency format', () => {
      const quote = createMockQuote({ total_amount: 6000 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£6000.00')).toBeTruthy();
    });

    it('renders created date in DD MMM YYYY format', () => {
      const quote = createMockQuote({ created_at: '2026-01-15' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Created: 15 Jan 2026/)).toBeTruthy();
    });

    it('renders TouchableOpacity container', () => {
      const quote = createMockQuote();
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchable = root.findAllByType('TouchableOpacity')[0];
      expect(touchable).toBeTruthy();
    });

    it('calls onPress when card pressed', () => {
      const quote = createMockQuote();
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const mainTouchable = root.findAllByType('TouchableOpacity')[0];
      fireEvent.press(mainTouchable);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call action handlers when card pressed', () => {
      const quote = createMockQuote();
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const mainTouchable = root.findAllByType('TouchableOpacity')[0];
      fireEvent.press(mainTouchable);

      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(mockOnSend).not.toHaveBeenCalled();
      expect(mockOnDuplicate).not.toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Status Badge Tests
  // ============================================================================
  describe('Status Badge', () => {
    it('displays status in UPPERCASE', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('DRAFT')).toBeTruthy();
    });

    it('applies correct color for draft status', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('DRAFT').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#475569' }), // textSecondary
        ])
      );
    });

    it('applies correct color for sent status', () => {
      const quote = createMockQuote({ status: 'sent' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('SENT').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#0EA5E9' }), // primary
        ])
      );
    });

    it('applies correct color for viewed status', () => {
      const quote = createMockQuote({ status: 'viewed' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('VIEWED').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#D97706' }), // warning
        ])
      );
    });

    it('applies correct color for accepted status', () => {
      const quote = createMockQuote({ status: 'accepted' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('ACCEPTED').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#16A34A' }), // success
        ])
      );
    });

    it('applies correct color for rejected status', () => {
      const quote = createMockQuote({ status: 'rejected' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('REJECTED').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#EF4444' }), // error
        ])
      );
    });

    it('applies correct color for expired status', () => {
      const quote = createMockQuote({
        status: 'sent',
        valid_until: '2020-01-01' // Past date
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('EXPIRED').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#64748B' }), // textTertiary
        ])
      );
    });

    it('applies default color for unknown status', () => {
      const quote = createMockQuote({ status: 'unknown' as any });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const statusBadge = getByText('UNKNOWN').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#475569' }), // textSecondary (default)
        ])
      );
    });

    it('displays correct icon for draft status', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Ionicons rendered with 'document-outline'
      expect(root).toBeTruthy();
    });

    it('displays correct icon for sent status', () => {
      const quote = createMockQuote({ status: 'sent' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Ionicons rendered with 'send'
      expect(root).toBeTruthy();
    });

    it('displays correct icon for accepted status', () => {
      const quote = createMockQuote({ status: 'accepted' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Ionicons rendered with 'checkmark-circle'
      expect(root).toBeTruthy();
    });

    it('displays correct icon for rejected status', () => {
      const quote = createMockQuote({ status: 'rejected' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Ionicons rendered with 'close-circle'
      expect(root).toBeTruthy();
    });
  });

  // ============================================================================
  // Expiration Logic Tests
  // ============================================================================
  describe('Expiration Logic', () => {
    it('status becomes expired when valid_until is in past', () => {
      const quote = createMockQuote({
        status: 'sent',
        valid_until: '2020-01-01'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('EXPIRED')).toBeTruthy();
    });

    it('isExpired is true when valid_until is in past', () => {
      const quote = createMockQuote({
        status: 'draft',
        valid_until: '2020-01-01'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Should show EXPIRED status instead of DRAFT
      expect(getByText('EXPIRED')).toBeTruthy();
    });

    it('isExpired is false when valid_until is in future', () => {
      const quote = createMockQuote({
        status: 'sent',
        valid_until: '2030-12-31'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Should show SENT status, not EXPIRED
      expect(getByText('SENT')).toBeTruthy();
    });

    it('shows error color for expired valid_until text', () => {
      const quote = createMockQuote({
        status: 'sent',
        valid_until: '2020-01-01'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const validUntilText = getByText(/Valid until:/);
      expect(validUntilText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#EF4444' }), // error color
        ])
      );
    });

    it('expired quotes display EXPIRED badge', () => {
      const quote = createMockQuote({
        status: 'accepted',
        valid_until: '2020-01-01'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('EXPIRED')).toBeTruthy();
    });

    it('handles quote without valid_until field', () => {
      const quote = createMockQuote({
        status: 'draft',
        valid_until: undefined
      });
      const { getByText, queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('DRAFT')).toBeTruthy();
      expect(queryByText(/Valid until:/)).toBeNull();
    });
  });

  // ============================================================================
  // Currency Formatting Tests
  // ============================================================================
  describe('Currency Formatting', () => {
    it('formats total_amount as £X.XX', () => {
      const quote = createMockQuote({ total_amount: 1234.56 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£1234.56')).toBeTruthy();
    });

    it('formats subtotal as £X.XX', () => {
      const quote = createMockQuote({ subtotal: 5000 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£5000.00')).toBeTruthy();
    });

    it('formats tax_amount as £X.XX', () => {
      const quote = createMockQuote({ tax_amount: 1000 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£1000.00')).toBeTruthy();
    });

    it('formats discount_amount as -£X.XX with success color', () => {
      const quote = createMockQuote({ discount_amount: 500 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const discountText = getByText('-£500.00');
      expect(discountText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#16A34A' }), // success
        ])
      );
    });

    it('rounds to 2 decimal places (1234.567 → £1234.57)', () => {
      const quote = createMockQuote({ total_amount: 1234.567 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£1234.57')).toBeTruthy();
    });
  });

  // ============================================================================
  // Date Formatting Tests
  // ============================================================================
  describe('Date Formatting', () => {
    it('formats created_at in DD MMM YYYY format', () => {
      const quote = createMockQuote({ created_at: '2026-01-15' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/15 Jan 2026/)).toBeTruthy();
    });

    it('formats valid_until in DD MMM YYYY format', () => {
      const quote = createMockQuote({ valid_until: '2026-02-28' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/28 Feb 2026/)).toBeTruthy();
    });

    it('handles different date formats', () => {
      const quote = createMockQuote({ created_at: '2026-12-25T10:30:00Z' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/25 Dec 2026/)).toBeTruthy();
    });

    it('handles ISO date format', () => {
      const quote = createMockQuote({ created_at: '2026-06-15' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/15 Jun 2026/)).toBeTruthy();
    });
  });

  // ============================================================================
  // Conditional Rendering Tests
  // ============================================================================
  describe('Conditional Rendering', () => {
    it('shows valid_until detail when present', () => {
      const quote = createMockQuote({ valid_until: '2026-02-28' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText(/Valid until:/)).toBeTruthy();
    });

    it('hides valid_until detail when missing', () => {
      const quote = createMockQuote({ valid_until: undefined });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Valid until:/)).toBeNull();
    });

    it('shows project_description when present', () => {
      const quote = createMockQuote({
        project_description: 'Complete kitchen remodel'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Complete kitchen remodel')).toBeTruthy();
    });

    it('hides project_description when missing', () => {
      const quote = createMockQuote({ project_description: undefined });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Should not render description text
      expect(queryByText(/remodel/)).toBeNull();
    });

    it('shows discount amount when > 0', () => {
      const quote = createMockQuote({ discount_amount: 500 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('-£500.00')).toBeTruthy();
    });

    it('hides discount amount when 0', () => {
      const quote = createMockQuote({ discount_amount: 0 });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Discount/)).toBeNull();
    });

    it('hides discount amount when undefined', () => {
      const quote = createMockQuote({ discount_amount: undefined });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Discount/)).toBeNull();
    });

    it('shows markup chip when markup_percentage > 0', () => {
      const quote = createMockQuote({ markup_percentage: 15 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Markup: 15%')).toBeTruthy();
    });

    it('shows discount chip when discount_percentage > 0', () => {
      const quote = createMockQuote({ discount_percentage: 10 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Discount: 10%')).toBeTruthy();
    });

    it('shows notes chip when notes exists', () => {
      const quote = createMockQuote({ notes: 'Special requirements apply' });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Has Notes')).toBeTruthy();
    });

    it('shows send button only for draft status', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Find all TouchableOpacity components
      const touchables = root.findAllByType('TouchableOpacity');
      // Should have: main card + edit + send + duplicate + delete = 5
      expect(touchables.length).toBe(5);
    });

    it('hides send button for non-draft statuses', () => {
      const quote = createMockQuote({ status: 'sent' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Find all TouchableOpacity components
      const touchables = root.findAllByType('TouchableOpacity');
      // Should have: main card + edit + duplicate + delete = 4 (no send)
      expect(touchables.length).toBe(4);
    });

    it('shows additional info section only when markup/discount/notes exist', () => {
      const quote = createMockQuote({
        markup_percentage: 15,
        discount_percentage: 0,
        notes: 'Test notes'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Markup: 15%')).toBeTruthy();
      expect(getByText('Has Notes')).toBeTruthy();
    });
  });

  // ============================================================================
  // Action Buttons Tests
  // ============================================================================
  describe('Action Buttons', () => {
    it('edit button calls onEdit with stopPropagation', () => {
      const quote = createMockQuote();
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      // Edit button is typically second (after main card)
      const editButton = touchables[1];

      const mockEvent = { stopPropagation: jest.fn() };
      fireEvent.press(editButton, mockEvent);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('send button calls onSend with stopPropagation (draft status)', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      // Send button is third for draft status
      const sendButton = touchables[2];

      const mockEvent = { stopPropagation: jest.fn() };
      fireEvent.press(sendButton, mockEvent);

      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('duplicate button calls onDuplicate with stopPropagation', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      // Duplicate button is fourth for draft (main, edit, send, duplicate, delete)
      const duplicateButton = touchables[3];

      const mockEvent = { stopPropagation: jest.fn() };
      fireEvent.press(duplicateButton, mockEvent);

      expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('delete button calls onDelete with stopPropagation', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      // Delete button is last
      const deleteButton = touchables[touchables.length - 1];

      const mockEvent = { stopPropagation: jest.fn() };
      fireEvent.press(deleteButton, mockEvent);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('action button presses do NOT trigger onPress', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      const mockEvent = { stopPropagation: jest.fn() };

      // Press edit button
      fireEvent.press(touchables[1], mockEvent);
      expect(mockOnPress).not.toHaveBeenCalled();

      // Press send button
      fireEvent.press(touchables[2], mockEvent);
      expect(mockOnPress).not.toHaveBeenCalled();

      // Press duplicate button
      fireEvent.press(touchables[3], mockEvent);
      expect(mockOnPress).not.toHaveBeenCalled();

      // Press delete button
      fireEvent.press(touchables[4], mockEvent);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('all 4 buttons work independently', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      const mockEvent = { stopPropagation: jest.fn() };

      fireEvent.press(touchables[1], mockEvent); // Edit
      expect(mockOnEdit).toHaveBeenCalledTimes(1);

      fireEvent.press(touchables[2], mockEvent); // Send
      expect(mockOnSend).toHaveBeenCalledTimes(1);

      fireEvent.press(touchables[3], mockEvent); // Duplicate
      expect(mockOnDuplicate).toHaveBeenCalledTimes(1);

      fireEvent.press(touchables[4], mockEvent); // Delete
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Breakdown Display Tests
  // ============================================================================
  describe('Breakdown Display', () => {
    it('shows subtotal, tax, and discount in breakdown', () => {
      const quote = createMockQuote({
        subtotal: 5000,
        tax_amount: 1000,
        discount_amount: 500
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£5000.00')).toBeTruthy();
      expect(getByText('£1000.00')).toBeTruthy();
      expect(getByText('-£500.00')).toBeTruthy();
    });

    it('discount shown in success color', () => {
      const quote = createMockQuote({ discount_amount: 500 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const discountText = getByText('-£500.00');
      expect(discountText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#16A34A' }),
        ])
      );
    });

    it('all values formatted as currency', () => {
      const quote = createMockQuote({
        subtotal: 1234.56,
        tax_amount: 246.91,
        discount_amount: 100
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£1234.56')).toBeTruthy();
      expect(getByText('£246.91')).toBeTruthy();
      expect(getByText('-£100.00')).toBeTruthy();
    });

    it('shows subtotal and tax labels', () => {
      const quote = createMockQuote();
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Subtotal')).toBeTruthy();
      expect(getByText('Tax')).toBeTruthy();
    });

    it('shows discount label when discount exists', () => {
      const quote = createMockQuote({ discount_amount: 100 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Discount')).toBeTruthy();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles missing optional fields', () => {
      const quote = createMockQuote({
        project_description: undefined,
        notes: undefined,
        discount_amount: undefined,
        markup_percentage: undefined,
        valid_until: undefined
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('#Q-2024-001')).toBeTruthy();
      expect(getByText('Kitchen Renovation')).toBeTruthy();
    });

    it('handles zero discount_amount (does not display)', () => {
      const quote = createMockQuote({ discount_amount: 0 });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Discount/)).toBeNull();
    });

    it('handles zero markup_percentage (does not display)', () => {
      const quote = createMockQuote({ markup_percentage: 0 });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText(/Markup:/)).toBeNull();
    });

    it('handles very large amounts', () => {
      const quote = createMockQuote({ total_amount: 999999.99 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('£999999.99')).toBeTruthy();
    });

    it('handles expired quote with draft status', () => {
      const quote = createMockQuote({
        status: 'draft',
        valid_until: '2020-01-01'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('EXPIRED')).toBeTruthy();
    });

    it('handles non-expired quote', () => {
      const quote = createMockQuote({
        status: 'sent',
        valid_until: '2030-12-31'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('SENT')).toBeTruthy();
    });

    it('handles empty notes string', () => {
      const quote = createMockQuote({ notes: '' });
      const { queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText('Has Notes')).toBeNull();
    });

    it('handles decimal discount percentage', () => {
      const quote = createMockQuote({ discount_percentage: 12.5 });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Discount: 12.5%')).toBeTruthy();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration Tests', () => {
    it('renders complete card with all features for draft status', () => {
      const quote = createMockQuote({
        status: 'draft',
        project_description: 'Complete renovation',
        discount_amount: 500,
        markup_percentage: 15,
        discount_percentage: 10,
        notes: 'Special requirements',
        valid_until: '2026-12-31'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Check all elements are present
      expect(getByText('#Q-2024-001')).toBeTruthy();
      expect(getByText('Kitchen Renovation')).toBeTruthy();
      expect(getByText('John Smith')).toBeTruthy();
      expect(getByText('DRAFT')).toBeTruthy();
      expect(getByText('Complete renovation')).toBeTruthy();
      expect(getByText('Markup: 15%')).toBeTruthy();
      expect(getByText('Discount: 10%')).toBeTruthy();
      expect(getByText('Has Notes')).toBeTruthy();
    });

    it('renders complete card for sent status (no send button)', () => {
      const quote = createMockQuote({
        status: 'sent',
        project_description: 'Bathroom renovation',
        valid_until: '2026-12-31'
      });
      const { getByText, root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('SENT')).toBeTruthy();

      const touchables = root.findAllByType('TouchableOpacity');
      // Should not have send button: main + edit + duplicate + delete = 4
      expect(touchables.length).toBe(4);
    });

    it('renders complete expired quote', () => {
      const quote = createMockQuote({
        status: 'sent',
        valid_until: '2020-01-01',
        project_description: 'Expired project'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('EXPIRED')).toBeTruthy();
      expect(getByText('Expired project')).toBeTruthy();
      expect(getByText(/Valid until:/)).toBeTruthy();
    });

    it('multiple action button presses work correctly', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      const mockEvent = { stopPropagation: jest.fn() };

      // Press edit twice
      fireEvent.press(touchables[1], mockEvent);
      fireEvent.press(touchables[1], mockEvent);
      expect(mockOnEdit).toHaveBeenCalledTimes(2);

      // Press duplicate three times
      fireEvent.press(touchables[3], mockEvent);
      fireEvent.press(touchables[3], mockEvent);
      fireEvent.press(touchables[3], mockEvent);
      expect(mockOnDuplicate).toHaveBeenCalledTimes(3);

      // onPress should never be called
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('all statuses render correctly', () => {
      const statuses: Array<'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'> =
        ['draft', 'sent', 'viewed', 'accepted', 'rejected'];

      statuses.forEach(status => {
        const quote = createMockQuote({ status });
        const { getByText } = render(
          <QuoteCard
            quote={quote}
            onPress={mockOnPress}
            onEdit={mockOnEdit}
            onSend={mockOnSend}
            onDuplicate={mockOnDuplicate}
            onDelete={mockOnDelete}
          />
        );

        expect(getByText(status.toUpperCase())).toBeTruthy();
      });
    });

    it('handles quote with all optional fields populated', () => {
      const quote = createMockQuote({
        project_description: 'Full house renovation',
        valid_until: '2026-12-31',
        discount_amount: 1000,
        markup_percentage: 20,
        discount_percentage: 15,
        notes: 'Client requires eco-friendly materials'
      });
      const { getByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      expect(getByText('Full house renovation')).toBeTruthy();
      expect(getByText(/31 Dec 2026/)).toBeTruthy();
      expect(getByText('-£1000.00')).toBeTruthy();
      expect(getByText('Markup: 20%')).toBeTruthy();
      expect(getByText('Discount: 15%')).toBeTruthy();
      expect(getByText('Has Notes')).toBeTruthy();
    });

    it('handles quote with no optional fields', () => {
      const quote = createMockQuote({
        project_description: undefined,
        valid_until: undefined,
        discount_amount: undefined,
        markup_percentage: undefined,
        discount_percentage: undefined,
        notes: undefined
      });
      const { getByText, queryByText } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      // Should still render core fields
      expect(getByText('#Q-2024-001')).toBeTruthy();
      expect(getByText('Kitchen Renovation')).toBeTruthy();
      expect(getByText('John Smith')).toBeTruthy();

      // Optional fields should not be present
      expect(queryByText(/Valid until:/)).toBeNull();
      expect(queryByText(/Markup:/)).toBeNull();
      expect(queryByText(/Discount:/)).toBeNull();
      expect(queryByText('Has Notes')).toBeNull();
    });

    it('card press works alongside action buttons', () => {
      const quote = createMockQuote({ status: 'draft' });
      const { root } = render(
        <QuoteCard
          quote={quote}
          onPress={mockOnPress}
          onEdit={mockOnEdit}
          onSend={mockOnSend}
          onDuplicate={mockOnDuplicate}
          onDelete={mockOnDelete}
        />
      );

      const touchables = root.findAllByType('TouchableOpacity');
      const mockEvent = { stopPropagation: jest.fn() };

      // Press main card
      fireEvent.press(touchables[0]);
      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Press action buttons
      fireEvent.press(touchables[1], mockEvent);
      fireEvent.press(touchables[2], mockEvent);

      // onPress should still only be called once
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });
  });
});
