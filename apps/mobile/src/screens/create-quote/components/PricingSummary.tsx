/**
 * PricingSummary — Pricing breakdown with green total accent
 *
 * Subtotal, markup, discount, tax rows. Total row has dark green
 * accent card for visual prominence. Uses £ currency.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { formatCurrency } from '../../../utils/formatCurrency';

interface PricingSummaryProps {
  subtotal: number;
  markupPercentage: string;
  discountAmount: number;
  discountPercentage: string;
  taxAmount: number;
  taxRate: string;
  totalAmount: number;
}

export const PricingSummary: React.FC<PricingSummaryProps> = ({
  subtotal,
  markupPercentage,
  discountAmount,
  discountPercentage,
  taxAmount,
  taxRate,
  totalAmount,
}) => {
  const subtotalWithMarkup =
    subtotal * (1 + parseFloat(markupPercentage) / 100);
  const markupAmount = subtotalWithMarkup - subtotal;
  const hasDiscount = parseFloat(discountPercentage) > 0;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name='calculator' size={16} color={theme.colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>Pricing Summary</Text>
      </View>

      {/* Breakdown rows */}
      <View style={styles.breakdownSection}>
        <PriceRow label='Subtotal' value={subtotal} testID='subtotal-value' />
        <PriceRow
          label={`Markup (${markupPercentage}%)`}
          value={markupAmount}
          testID='markup-value'
          accent='#10B981'
        />
        <PriceRow
          label='After Markup'
          value={subtotalWithMarkup}
          testID='after-markup-value'
          bold
        />

        {hasDiscount && (
          <PriceRow
            label={`Discount (${discountPercentage}%)`}
            value={-discountAmount}
            testID='discount-value'
            accent='#EF4444'
          />
        )}

        <PriceRow
          label={`VAT (${taxRate}%)`}
          value={taxAmount}
          testID='tax-value'
        />
      </View>

      {/* Total — dark green accent card */}
      <View style={styles.totalCard}>
        <View style={styles.totalLeft}>
          <Text style={styles.totalLabel}>Quote Total</Text>
          <Text style={styles.totalSubtext}>Incl. VAT</Text>
        </View>
        <Text style={styles.totalValue} testID='total-value'>
          {formatCurrency(totalAmount)}
        </Text>
      </View>
    </View>
  );
};

// Individual price row
const PriceRow: React.FC<{
  label: string;
  value: number;
  testID?: string;
  accent?: string;
  bold?: boolean;
}> = ({ label, value, testID, accent, bold }) => (
  <View style={styles.pricingRow}>
    <Text style={[styles.pricingLabel, bold && styles.pricingLabelBold]}>
      {label}
    </Text>
    <Text
      style={[
        styles.pricingValue,
        bold && styles.pricingValueBold,
        accent ? { color: accent } : undefined,
      ]}
      testID={testID}
    >
      {formatCurrency(value)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  breakdownSection: {
    gap: 0,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  pricingLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  pricingLabelBold: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  pricingValueBold: {
    fontWeight: '700',
    fontSize: 15,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
  },
  totalLeft: {},
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  totalSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: -0.5,
  },
});
