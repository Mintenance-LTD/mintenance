/**
 * PricingSummary — Pricing breakdown with green total accent
 *
 * Subtotal, markup, discount, tax rows. Total row has dark green
 * accent card for visual prominence. Uses £ currency.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const subtotalWithMarkup = subtotal * (1 + parseFloat(markupPercentage) / 100);
  const markupAmount = subtotalWithMarkup - subtotal;
  const hasDiscount = parseFloat(discountPercentage) > 0;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name="calculator" size={16} color="#10B981" />
        </View>
        <Text style={styles.sectionTitle}>Pricing Summary</Text>
      </View>

      {/* Breakdown rows */}
      <View style={styles.breakdownSection}>
        <PriceRow label="Subtotal" value={subtotal} testID="subtotal-value" />
        <PriceRow
          label={`Markup (${markupPercentage}%)`}
          value={markupAmount}
          testID="markup-value"
          accent="#10B981"
        />
        <PriceRow
          label="After Markup"
          value={subtotalWithMarkup}
          testID="after-markup-value"
          bold
        />

        {hasDiscount && (
          <PriceRow
            label={`Discount (${discountPercentage}%)`}
            value={-discountAmount}
            testID="discount-value"
            accent="#EF4444"
          />
        )}

        <PriceRow
          label={`VAT (${taxRate}%)`}
          value={taxAmount}
          testID="tax-value"
        />
      </View>

      {/* Total — dark green accent card */}
      <View style={styles.totalCard}>
        <View style={styles.totalLeft}>
          <Text style={styles.totalLabel}>Quote Total</Text>
          <Text style={styles.totalSubtext}>Incl. VAT</Text>
        </View>
        <Text style={styles.totalValue} testID="total-value">
          £{totalAmount.toFixed(2)}
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
    <Text style={[styles.pricingLabel, bold && styles.pricingLabelBold]}>{label}</Text>
    <Text
      style={[
        styles.pricingValue,
        bold && styles.pricingValueBold,
        accent ? { color: accent } : undefined,
      ]}
      testID={testID}
    >
      {value < 0 ? '-' : ''}£{Math.abs(value).toFixed(2)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
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
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
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
    borderBottomColor: '#F0F0F0',
  },
  pricingLabel: {
    fontSize: 14,
    color: '#717171',
  },
  pricingLabelBold: {
    fontWeight: '600',
    color: '#222222',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  pricingValueBold: {
    fontWeight: '700',
    fontSize: 15,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#222222',
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
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
