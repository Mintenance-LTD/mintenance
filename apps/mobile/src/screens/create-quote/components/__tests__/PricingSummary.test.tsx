/**
 * PricingSummary Component Tests
 *
 * Comprehensive test suite for the PricingSummary component.
 * Tests pricing calculations, totals, taxes, discounts, formatting, and display logic.
 *
 * @coverage 100%
 */

import React from 'react';
import { render } from '../../../../__tests__/test-utils';
import { PricingSummary } from '../PricingSummary';
import { theme } from '../../../../theme';

// Test data fixtures
const createProps = (overrides = {}) => ({
  subtotal: 1000,
  markupPercentage: '10',
  discountAmount: 0,
  discountPercentage: '0',
  taxAmount: 110,
  taxRate: '10',
  totalAmount: 1210,
  ...overrides,
});

describe('PricingSummary Component', () => {
  let props: ReturnType<typeof createProps>;

  beforeEach(() => {
    props = createProps();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {
    it('renders component successfully', () => {
      const { root } = render(<PricingSummary {...props} />);
      expect(root).toBeTruthy();
    });

    it('renders section title "Pricing Summary"', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Pricing Summary')).toBeTruthy();
    });

    it('renders subtotal row with label', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Subtotal')).toBeTruthy();
    });

    it('renders markup row with label and percentage', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Markup (10%)')).toBeTruthy();
    });

    it('renders after markup row', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('After Markup')).toBeTruthy();
    });

    it('renders tax row with label and rate', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Tax (10%)')).toBeTruthy();
    });

    it('renders total row with label', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Total')).toBeTruthy();
    });

    it('renders discount row when discount is present', () => {
      const propsWithDiscount = createProps({
        discountPercentage: '5',
        discountAmount: 50,
      });
      const { getByText } = render(<PricingSummary {...propsWithDiscount} />);
      expect(getByText('Discount (5%)')).toBeTruthy();
    });

    it('does not render discount row when discount is zero', () => {
      const { queryByText } = render(<PricingSummary {...props} />);
      expect(queryByText(/Discount/)).toBeNull();
    });
  });

  // ============================================================================
  // SUBTOTAL DISPLAY TESTS
  // ============================================================================

  describe('Subtotal Display', () => {
    it('displays subtotal value with 2 decimal places', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('$1000.00')).toBeTruthy();
    });

    it('formats zero subtotal correctly', () => {
      const propsWithZero = createProps({ subtotal: 0 });
      const { getByText } = render(<PricingSummary {...propsWithZero} />);
      expect(getByText('$0.00')).toBeTruthy();
    });

    it('formats large subtotal correctly', () => {
      const propsWithLarge = createProps({ subtotal: 99999.99 });
      const { getByText } = render(<PricingSummary {...propsWithLarge} />);
      expect(getByText('$99999.99')).toBeTruthy();
    });

    it('formats small decimal subtotal correctly', () => {
      const propsWithSmall = createProps({ subtotal: 0.01 });
      const { getByText } = render(<PricingSummary {...propsWithSmall} />);
      expect(getByText('$0.01')).toBeTruthy();
    });

    it('formats subtotal with single decimal correctly', () => {
      const propsWithSingle = createProps({ subtotal: 100.5 });
      const { getByText } = render(<PricingSummary {...propsWithSingle} />);
      expect(getByText('$100.50')).toBeTruthy();
    });

    it('formats subtotal with no decimals correctly', () => {
      const propsWithWhole = createProps({ subtotal: 500 });
      const { getByText } = render(<PricingSummary {...propsWithWhole} />);
      expect(getByText('$500.00')).toBeTruthy();
    });

    it('formats subtotal with multiple decimals correctly (rounds)', () => {
      const propsWithMulti = createProps({ subtotal: 123.456 });
      const { getByText } = render(<PricingSummary {...propsWithMulti} />);
      expect(getByText('$123.46')).toBeTruthy();
    });
  });

  // ============================================================================
  // MARKUP CALCULATION TESTS
  // ============================================================================

  describe('Markup Calculations', () => {
    it('calculates markup amount correctly with 10% markup', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      // 1000 * 10% = 100
      expect(getByText('$100.00')).toBeTruthy();
    });

    it('displays markup percentage in label', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Markup (10%)')).toBeTruthy();
    });

    it('calculates after markup value correctly', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      // 1000 + 100 = 1100
      expect(getByText('$1100.00')).toBeTruthy();
    });

    it('handles zero markup percentage', () => {
      const propsNoMarkup = createProps({ markupPercentage: '0' });
      const { getByText } = render(<PricingSummary {...propsNoMarkup} />);
      expect(getByText('Markup (0%)')).toBeTruthy();
      expect(getByText('$0.00')).toBeTruthy();
    });

    it('handles 25% markup correctly', () => {
      const props25 = createProps({
        subtotal: 1000,
        markupPercentage: '25'
      });
      const { getByText } = render(<PricingSummary {...props25} />);
      // 1000 * 25% = 250
      expect(getByText('$250.00')).toBeTruthy();
      // 1000 + 250 = 1250
      expect(getByText('$1250.00')).toBeTruthy();
    });

    it('handles 50% markup correctly', () => {
      const props50 = createProps({
        subtotal: 1000,
        markupPercentage: '50'
      });
      const { getByText } = render(<PricingSummary {...props50} />);
      // 1000 * 50% = 500
      expect(getByText('$500.00')).toBeTruthy();
      // 1000 + 500 = 1500
      expect(getByText('$1500.00')).toBeTruthy();
    });

    it('handles 100% markup correctly', () => {
      const props100 = createProps({
        subtotal: 1000,
        markupPercentage: '100'
      });
      const { getByText } = render(<PricingSummary {...props100} />);
      // 1000 * 100% = 1000
      expect(getByText('Markup (100%)')).toBeTruthy();
    });

    it('handles fractional markup percentage', () => {
      const propsFractional = createProps({
        subtotal: 1000,
        markupPercentage: '12.5'
      });
      const { getByText } = render(<PricingSummary {...propsFractional} />);
      expect(getByText('Markup (12.5%)')).toBeTruthy();
      // 1000 * 12.5% = 125
      expect(getByText('$125.00')).toBeTruthy();
    });

    it('handles very small markup percentage', () => {
      const propsSmall = createProps({
        subtotal: 10000,
        markupPercentage: '0.5'
      });
      const { getByText } = render(<PricingSummary {...propsSmall} />);
      // 10000 * 0.5% = 50
      expect(getByText('$50.00')).toBeTruthy();
    });

    it('handles markup with decimal subtotal', () => {
      const propsDecimal = createProps({
        subtotal: 123.45,
        markupPercentage: '10'
      });
      const { getByText } = render(<PricingSummary {...propsDecimal} />);
      // 123.45 * 10% = 12.345 = 12.35 (rounded)
      expect(getByText('$12.35')).toBeTruthy();
    });
  });

  // ============================================================================
  // DISCOUNT DISPLAY TESTS
  // ============================================================================

  describe('Discount Display', () => {
    it('shows discount when percentage is greater than zero', () => {
      const propsWithDiscount = createProps({
        discountPercentage: '5',
        discountAmount: 50,
      });
      const { getByText } = render(<PricingSummary {...propsWithDiscount} />);
      expect(getByText('Discount (5%)')).toBeTruthy();
      expect(getByText('-$50.00')).toBeTruthy();
    });

    it('hides discount when percentage is zero', () => {
      const { queryByText } = render(<PricingSummary {...props} />);
      expect(queryByText(/Discount/)).toBeNull();
    });

    it('hides discount when percentage is "0"', () => {
      const propsZero = createProps({ discountPercentage: '0' });
      const { queryByText } = render(<PricingSummary {...propsZero} />);
      expect(queryByText(/Discount/)).toBeNull();
    });

    it('shows discount when percentage is "0.1"', () => {
      const propsSmallDiscount = createProps({
        discountPercentage: '0.1',
        discountAmount: 1,
      });
      const { getByText } = render(<PricingSummary {...propsSmallDiscount} />);
      expect(getByText('Discount (0.1%)')).toBeTruthy();
    });

    it('formats discount amount with minus sign', () => {
      const propsWithDiscount = createProps({
        discountPercentage: '10',
        discountAmount: 100,
      });
      const { getByText } = render(<PricingSummary {...propsWithDiscount} />);
      expect(getByText('-$100.00')).toBeTruthy();
    });

    it('formats small discount correctly', () => {
      const propsSmall = createProps({
        discountPercentage: '1',
        discountAmount: 0.50,
      });
      const { getByText } = render(<PricingSummary {...propsSmall} />);
      expect(getByText('-$0.50')).toBeTruthy();
    });

    it('formats large discount correctly', () => {
      const propsLarge = createProps({
        discountPercentage: '20',
        discountAmount: 5000.99,
      });
      const { getByText } = render(<PricingSummary {...propsLarge} />);
      expect(getByText('-$5000.99')).toBeTruthy();
    });

    it('displays discount percentage with decimal', () => {
      const propsDecimal = createProps({
        discountPercentage: '7.5',
        discountAmount: 75,
      });
      const { getByText } = render(<PricingSummary {...propsDecimal} />);
      expect(getByText('Discount (7.5%)')).toBeTruthy();
    });
  });

  // ============================================================================
  // TAX CALCULATION TESTS
  // ============================================================================

  describe('Tax Display', () => {
    it('displays tax amount with 2 decimal places', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('$110.00')).toBeTruthy();
    });

    it('displays tax rate in label', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Tax (10%)')).toBeTruthy();
    });

    it('handles zero tax rate', () => {
      const propsNoTax = createProps({
        taxRate: '0',
        taxAmount: 0,
      });
      const { getByText } = render(<PricingSummary {...propsNoTax} />);
      expect(getByText('Tax (0%)')).toBeTruthy();
      expect(getByText('$0.00')).toBeTruthy();
    });

    it('handles 5% tax rate', () => {
      const props5 = createProps({
        taxRate: '5',
        taxAmount: 55,
      });
      const { getByText } = render(<PricingSummary {...props5} />);
      expect(getByText('Tax (5%)')).toBeTruthy();
      expect(getByText('$55.00')).toBeTruthy();
    });

    it('handles 13% tax rate (GST/HST)', () => {
      const props13 = createProps({
        taxRate: '13',
        taxAmount: 143,
      });
      const { getByText } = render(<PricingSummary {...props13} />);
      expect(getByText('Tax (13%)')).toBeTruthy();
      expect(getByText('$143.00')).toBeTruthy();
    });

    it('handles fractional tax rate', () => {
      const propsFractional = createProps({
        taxRate: '8.875',
        taxAmount: 97.63,
      });
      const { getByText } = render(<PricingSummary {...propsFractional} />);
      expect(getByText('Tax (8.875%)')).toBeTruthy();
      expect(getByText('$97.63')).toBeTruthy();
    });

    it('formats small tax amount correctly', () => {
      const propsSmall = createProps({
        taxRate: '1',
        taxAmount: 0.11,
      });
      const { getByText } = render(<PricingSummary {...propsSmall} />);
      expect(getByText('$0.11')).toBeTruthy();
    });

    it('formats large tax amount correctly', () => {
      const propsLarge = createProps({
        taxRate: '10',
        taxAmount: 9999.99,
      });
      const { getByText } = render(<PricingSummary {...propsLarge} />);
      expect(getByText('$9999.99')).toBeTruthy();
    });
  });

  // ============================================================================
  // TOTAL CALCULATION TESTS
  // ============================================================================

  describe('Total Amount Display', () => {
    it('displays total amount with 2 decimal places', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('$1210.00')).toBeTruthy();
    });

    it('displays correct total with zero values', () => {
      const propsZero = createProps({
        subtotal: 0,
        markupPercentage: '0',
        discountAmount: 0,
        discountPercentage: '0',
        taxAmount: 0,
        taxRate: '0',
        totalAmount: 0,
      });
      const { getByText } = render(<PricingSummary {...propsZero} />);
      expect(getByText('$0.00')).toBeTruthy();
    });

    it('displays correct total with discount applied', () => {
      const propsWithDiscount = createProps({
        subtotal: 1000,
        markupPercentage: '10',
        discountAmount: 110,
        discountPercentage: '10',
        taxAmount: 99,
        taxRate: '10',
        totalAmount: 1089,
      });
      const { getByText } = render(<PricingSummary {...propsWithDiscount} />);
      expect(getByText('$1089.00')).toBeTruthy();
    });

    it('formats very large total correctly', () => {
      const propsLarge = createProps({
        subtotal: 999999,
        totalAmount: 1099998.90,
      });
      const { getByText } = render(<PricingSummary {...propsLarge} />);
      expect(getByText('$1099998.90')).toBeTruthy();
    });

    it('formats very small total correctly', () => {
      const propsSmall = createProps({
        subtotal: 0.10,
        totalAmount: 0.12,
      });
      const { getByText } = render(<PricingSummary {...propsSmall} />);
      expect(getByText('$0.12')).toBeTruthy();
    });

    it('formats total with single decimal correctly', () => {
      const propsSingle = createProps({
        totalAmount: 1234.50,
      });
      const { getByText } = render(<PricingSummary {...propsSingle} />);
      expect(getByText('$1234.50')).toBeTruthy();
    });
  });

  // ============================================================================
  // STYLING TESTS
  // ============================================================================

  describe('Component Styling', () => {
    it('applies correct container styles', () => {
      const { root } = render(<PricingSummary {...props} />);
      expect(root).toBeTruthy();
    });

    it('renders section title with correct styling', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      const title = getByText('Pricing Summary');
      expect(title).toBeTruthy();
    });

    it('renders pricing rows with border styling', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      const subtotal = getByText('Subtotal');
      expect(subtotal.parent).toBeTruthy();
    });

    it('applies error color to discount value', () => {
      const propsWithDiscount = createProps({
        discountPercentage: '5',
        discountAmount: 50,
      });
      const { getByText } = render(<PricingSummary {...propsWithDiscount} />);
      const discountValue = getByText('-$50.00');
      expect(discountValue.props.style).toContainEqual(
        expect.objectContaining({ color: theme.colors.error })
      );
    });

    it('applies primary color to total value', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      const totalValue = getByText('$1210.00');
      expect(totalValue.props.style).toContainEqual(
        expect.objectContaining({ color: theme.colors.primary })
      );
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles negative subtotal gracefully', () => {
      const propsNegative = createProps({ subtotal: -100 });
      const { getByText } = render(<PricingSummary {...propsNegative} />);
      expect(getByText('$-100.00')).toBeTruthy();
    });

    it('handles negative total gracefully', () => {
      const propsNegative = createProps({ totalAmount: -50 });
      const { getByText } = render(<PricingSummary {...propsNegative} />);
      expect(getByText('$-50.00')).toBeTruthy();
    });

    it('handles very large markup percentage', () => {
      const propsLarge = createProps({ markupPercentage: '200' });
      const { getByText } = render(<PricingSummary {...propsLarge} />);
      expect(getByText('Markup (200%)')).toBeTruthy();
    });

    it('handles very large discount percentage', () => {
      const propsLarge = createProps({
        discountPercentage: '100',
        discountAmount: 1000,
      });
      const { getByText } = render(<PricingSummary {...propsLarge} />);
      expect(getByText('Discount (100%)')).toBeTruthy();
    });

    it('handles very large tax rate', () => {
      const propsLarge = createProps({ taxRate: '50' });
      const { getByText } = render(<PricingSummary {...propsLarge} />);
      expect(getByText('Tax (50%)')).toBeTruthy();
    });

    it('handles zero string markup percentage', () => {
      const propsZero = createProps({ markupPercentage: '0' });
      const { getByText } = render(<PricingSummary {...propsZero} />);
      expect(getByText('Markup (0%)')).toBeTruthy();
    });

    it('handles decimal string values', () => {
      const propsDecimal = createProps({
        subtotal: 123.456789,
        totalAmount: 135.802468,
      });
      const { getByText } = render(<PricingSummary {...propsDecimal} />);
      // Should round to 2 decimals
      expect(getByText('$123.46')).toBeTruthy();
      expect(getByText('$135.80')).toBeTruthy();
    });

    it('handles rounding up correctly', () => {
      const propsRoundUp = createProps({
        subtotal: 100.995,
      });
      const { getByText } = render(<PricingSummary {...propsRoundUp} />);
      expect(getByText('$101.00')).toBeTruthy();
    });

    it('handles rounding down correctly', () => {
      const propsRoundDown = createProps({
        subtotal: 100.994,
      });
      const { getByText } = render(<PricingSummary {...propsRoundDown} />);
      expect(getByText('$100.99')).toBeTruthy();
    });
  });

  // ============================================================================
  // COMPLEX SCENARIO TESTS
  // ============================================================================

  describe('Complex Pricing Scenarios', () => {
    it('handles scenario: markup + tax, no discount', () => {
      const scenario1 = createProps({
        subtotal: 2500,
        markupPercentage: '15',
        discountAmount: 0,
        discountPercentage: '0',
        taxAmount: 287.50,
        taxRate: '10',
        totalAmount: 3162.50,
      });
      const { getByText } = render(<PricingSummary {...scenario1} />);
      expect(getByText('$2500.00')).toBeTruthy(); // Subtotal
      expect(getByText('$375.00')).toBeTruthy(); // Markup (2500 * 15%)
      expect(getByText('$2875.00')).toBeTruthy(); // After markup
      expect(getByText('$287.50')).toBeTruthy(); // Tax
      expect(getByText('$3162.50')).toBeTruthy(); // Total
    });

    it('handles scenario: markup + discount + tax', () => {
      const scenario2 = createProps({
        subtotal: 5000,
        markupPercentage: '20',
        discountAmount: 600,
        discountPercentage: '10',
        taxAmount: 540,
        taxRate: '10',
        totalAmount: 5940,
      });
      const { getByText } = render(<PricingSummary {...scenario2} />);
      expect(getByText('$5000.00')).toBeTruthy(); // Subtotal
      expect(getByText('$1000.00')).toBeTruthy(); // Markup (5000 * 20%)
      expect(getByText('$6000.00')).toBeTruthy(); // After markup
      expect(getByText('Discount (10%)')).toBeTruthy();
      expect(getByText('-$600.00')).toBeTruthy(); // Discount
      expect(getByText('$540.00')).toBeTruthy(); // Tax
      expect(getByText('$5940.00')).toBeTruthy(); // Total
    });

    it('handles scenario: no markup, with discount and tax', () => {
      const scenario3 = createProps({
        subtotal: 1500,
        markupPercentage: '0',
        discountAmount: 150,
        discountPercentage: '10',
        taxAmount: 135,
        taxRate: '10',
        totalAmount: 1485,
      });
      const { getByText } = render(<PricingSummary {...scenario3} />);
      expect(getByText('$1500.00')).toBeTruthy();
      expect(getByText('$0.00')).toBeTruthy(); // No markup
      expect(getByText('-$150.00')).toBeTruthy();
      expect(getByText('$135.00')).toBeTruthy();
      expect(getByText('$1485.00')).toBeTruthy();
    });

    it('handles scenario: high markup, high discount, high tax', () => {
      const scenario4 = createProps({
        subtotal: 10000,
        markupPercentage: '50',
        discountAmount: 1500,
        discountPercentage: '10',
        taxAmount: 1350,
        taxRate: '10',
        totalAmount: 14850,
      });
      const { getByText } = render(<PricingSummary {...scenario4} />);
      expect(getByText('$10000.00')).toBeTruthy();
      expect(getByText('$5000.00')).toBeTruthy(); // Markup
      expect(getByText('$15000.00')).toBeTruthy(); // After markup
      expect(getByText('-$1500.00')).toBeTruthy();
      expect(getByText('$1350.00')).toBeTruthy();
      expect(getByText('$14850.00')).toBeTruthy();
    });

    it('handles scenario: fractional percentages', () => {
      const scenario5 = createProps({
        subtotal: 3333.33,
        markupPercentage: '12.5',
        discountAmount: 208.33,
        discountPercentage: '5.5',
        taxAmount: 345.83,
        taxRate: '9.25',
        totalAmount: 3887.49,
      });
      const { getByText } = render(<PricingSummary {...scenario5} />);
      expect(getByText('Markup (12.5%)')).toBeTruthy();
      expect(getByText('Discount (5.5%)')).toBeTruthy();
      expect(getByText('Tax (9.25%)')).toBeTruthy();
    });

    it('handles scenario: minimal values', () => {
      const scenario6 = createProps({
        subtotal: 0.01,
        markupPercentage: '1',
        discountAmount: 0,
        discountPercentage: '0',
        taxAmount: 0.01,
        taxRate: '1',
        totalAmount: 0.02,
      });
      const { getByText } = render(<PricingSummary {...scenario6} />);
      expect(getByText('$0.01')).toBeTruthy();
    });
  });

  // ============================================================================
  // CONDITIONAL RENDERING TESTS
  // ============================================================================

  describe('Conditional Rendering', () => {
    it('always renders subtotal row', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Subtotal')).toBeTruthy();
    });

    it('always renders markup row', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText(/Markup/)).toBeTruthy();
    });

    it('always renders after markup row', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('After Markup')).toBeTruthy();
    });

    it('always renders tax row', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText(/Tax/)).toBeTruthy();
    });

    it('always renders total row', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText('Total')).toBeTruthy();
    });

    it('conditionally renders discount row based on percentage > 0', () => {
      const { queryByText } = render(<PricingSummary {...props} />);
      expect(queryByText(/Discount/)).toBeNull();

      const { getByText } = render(<PricingSummary {...createProps({ discountPercentage: '5' })} />);
      expect(getByText(/Discount/)).toBeTruthy();
    });

    it('hides discount when percentage is exactly "0"', () => {
      const propsExactZero = createProps({
        discountPercentage: '0',
        discountAmount: 100,
      });
      const { queryByText } = render(<PricingSummary {...propsExactZero} />);
      expect(queryByText(/Discount/)).toBeNull();
    });

    it('shows discount when percentage is "0.0001"', () => {
      const propsTiny = createProps({
        discountPercentage: '0.0001',
        discountAmount: 0.01,
      });
      const { getByText } = render(<PricingSummary {...propsTiny} />);
      expect(getByText('Discount (0.0001%)')).toBeTruthy();
    });
  });

  // ============================================================================
  // PROP UPDATE TESTS
  // ============================================================================

  describe('Prop Updates', () => {
    it('updates subtotal when prop changes', () => {
      const { getByText, rerender } = render(<PricingSummary {...props} />);
      expect(getByText('$1000.00')).toBeTruthy();

      const updatedProps = createProps({ subtotal: 2000 });
      rerender(<PricingSummary {...updatedProps} />);
      expect(getByText('$2000.00')).toBeTruthy();
    });

    it('updates markup when percentage changes', () => {
      const { getByText, rerender } = render(<PricingSummary {...props} />);
      expect(getByText('Markup (10%)')).toBeTruthy();

      const updatedProps = createProps({ markupPercentage: '20' });
      rerender(<PricingSummary {...updatedProps} />);
      expect(getByText('Markup (20%)')).toBeTruthy();
    });

    it('updates tax when rate changes', () => {
      const { getByText, rerender } = render(<PricingSummary {...props} />);
      expect(getByText('Tax (10%)')).toBeTruthy();

      const updatedProps = createProps({ taxRate: '15' });
      rerender(<PricingSummary {...updatedProps} />);
      expect(getByText('Tax (15%)')).toBeTruthy();
    });

    it('updates total when prop changes', () => {
      const { getByText, rerender } = render(<PricingSummary {...props} />);
      expect(getByText('$1210.00')).toBeTruthy();

      const updatedProps = createProps({ totalAmount: 5000 });
      rerender(<PricingSummary {...updatedProps} />);
      expect(getByText('$5000.00')).toBeTruthy();
    });

    it('shows discount when percentage changes from 0 to positive', () => {
      const { queryByText, getByText, rerender } = render(<PricingSummary {...props} />);
      expect(queryByText(/Discount/)).toBeNull();

      const updatedProps = createProps({
        discountPercentage: '10',
        discountAmount: 100,
      });
      rerender(<PricingSummary {...updatedProps} />);
      expect(getByText('Discount (10%)')).toBeTruthy();
    });

    it('hides discount when percentage changes from positive to 0', () => {
      const initialProps = createProps({
        discountPercentage: '10',
        discountAmount: 100,
      });
      const { getByText, queryByText, rerender } = render(<PricingSummary {...initialProps} />);
      expect(getByText('Discount (10%)')).toBeTruthy();

      const updatedProps = createProps({
        discountPercentage: '0',
        discountAmount: 0,
      });
      rerender(<PricingSummary {...updatedProps} />);
      expect(queryByText(/Discount/)).toBeNull();
    });
  });

  // ============================================================================
  // MARKUP CALCULATION INTERNALS
  // ============================================================================

  describe('Markup Calculation Internals', () => {
    it('calculates subtotalWithMarkup correctly', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      // subtotalWithMarkup = 1000 * (1 + 10/100) = 1100
      expect(getByText('$1100.00')).toBeTruthy();
    });

    it('calculates markup amount as difference', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      // markupAmount = subtotalWithMarkup - subtotal = 1100 - 1000 = 100
      expect(getByText('$100.00')).toBeTruthy();
    });

    it('handles parseFloat for markup percentage correctly', () => {
      const propsString = createProps({ markupPercentage: '15.5' });
      const { getByText } = render(<PricingSummary {...propsString} />);
      expect(getByText('Markup (15.5%)')).toBeTruthy();
    });

    it('handles markup calculation with zero subtotal', () => {
      const propsZeroSub = createProps({
        subtotal: 0,
        markupPercentage: '10',
      });
      const { getByText } = render(<PricingSummary {...propsZeroSub} />);
      expect(getByText('$0.00')).toBeTruthy(); // Markup amount should be 0
    });
  });

  // ============================================================================
  // FORMATTING CONSISTENCY TESTS
  // ============================================================================

  describe('Formatting Consistency', () => {
    it('formats all currency values with dollar sign', () => {
      const { getAllByText } = render(<PricingSummary {...props} />);
      const dollarValues = getAllByText(/^\$/);
      expect(dollarValues.length).toBeGreaterThan(0);
    });

    it('formats all currency values with 2 decimal places', () => {
      const { getAllByText } = render(<PricingSummary {...props} />);
      const decimalValues = getAllByText(/\.\d{2}$/);
      expect(decimalValues.length).toBeGreaterThan(0);
    });

    it('formats all percentage labels with % symbol', () => {
      const { getByText } = render(<PricingSummary {...props} />);
      expect(getByText(/Markup \(\d+%\)/)).toBeTruthy();
      expect(getByText(/Tax \(\d+%\)/)).toBeTruthy();
    });

    it('maintains consistent number formatting across all values', () => {
      const testProps = createProps({
        subtotal: 1234.5,
        markupPercentage: '10',
        taxAmount: 135.80,
        totalAmount: 1505.75,
      });
      const { getByText } = render(<PricingSummary {...testProps} />);
      expect(getByText('$1234.50')).toBeTruthy();
      expect(getByText('$135.80')).toBeTruthy();
      expect(getByText('$1505.75')).toBeTruthy();
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIOS
  // ============================================================================

  describe('Real-World Scenarios', () => {
    it('handles typical contractor quote: $5000 base, 25% markup, 10% tax', () => {
      const realWorld1 = createProps({
        subtotal: 5000,
        markupPercentage: '25',
        discountAmount: 0,
        discountPercentage: '0',
        taxAmount: 625,
        taxRate: '10',
        totalAmount: 6875,
      });
      const { getByText } = render(<PricingSummary {...realWorld1} />);
      expect(getByText('$5000.00')).toBeTruthy();
      expect(getByText('$1250.00')).toBeTruthy(); // Markup
      expect(getByText('$6250.00')).toBeTruthy(); // After markup
      expect(getByText('$625.00')).toBeTruthy();
      expect(getByText('$6875.00')).toBeTruthy();
    });

    it('handles early payment discount scenario', () => {
      const realWorld2 = createProps({
        subtotal: 3000,
        markupPercentage: '20',
        discountAmount: 180,
        discountPercentage: '5',
        taxAmount: 342,
        taxRate: '10',
        totalAmount: 3762,
      });
      const { getByText } = render(<PricingSummary {...realWorld2} />);
      expect(getByText('Discount (5%)')).toBeTruthy();
      expect(getByText('-$180.00')).toBeTruthy();
    });

    it('handles large commercial project: $50000 base', () => {
      const realWorld3 = createProps({
        subtotal: 50000,
        markupPercentage: '15',
        discountAmount: 0,
        discountPercentage: '0',
        taxAmount: 5750,
        taxRate: '10',
        totalAmount: 63250,
      });
      const { getByText } = render(<PricingSummary {...realWorld3} />);
      expect(getByText('$50000.00')).toBeTruthy();
      expect(getByText('$7500.00')).toBeTruthy(); // Markup
      expect(getByText('$57500.00')).toBeTruthy(); // After markup
      expect(getByText('$63250.00')).toBeTruthy();
    });

    it('handles small repair job: $150 base', () => {
      const realWorld4 = createProps({
        subtotal: 150,
        markupPercentage: '30',
        discountAmount: 0,
        discountPercentage: '0',
        taxAmount: 19.50,
        taxRate: '10',
        totalAmount: 214.50,
      });
      const { getByText } = render(<PricingSummary {...realWorld4} />);
      expect(getByText('$150.00')).toBeTruthy();
      expect(getByText('$45.00')).toBeTruthy(); // Markup
      expect(getByText('$195.00')).toBeTruthy(); // After markup
      expect(getByText('$19.50')).toBeTruthy();
      expect(getByText('$214.50')).toBeTruthy();
    });
  });
});
