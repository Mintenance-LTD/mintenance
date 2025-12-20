/**
 * PricingSummary Component
 * 
 * Pricing breakdown with subtotal, markup, discount, tax, and total.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - Pricing display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Pricing Summary</Text>
      
      <View style={styles.pricingRow}>
        <Text style={styles.pricingLabel}>Subtotal</Text>
        <Text style={styles.pricingValue}>${subtotal.toFixed(2)}</Text>
      </View>

      <View style={styles.pricingRow}>
        <Text style={styles.pricingLabel}>Markup ({markupPercentage}%)</Text>
        <Text style={styles.pricingValue}>${(subtotalWithMarkup - subtotal).toFixed(2)}</Text>
      </View>

      <View style={styles.pricingRow}>
        <Text style={styles.pricingLabel}>After Markup</Text>
        <Text style={styles.pricingValue}>${subtotalWithMarkup.toFixed(2)}</Text>
      </View>

      {parseFloat(discountPercentage) > 0 && (
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Discount ({discountPercentage}%)</Text>
          <Text style={[styles.pricingValue, styles.discountValue]}>
            -${discountAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.pricingRow}>
        <Text style={styles.pricingLabel}>Tax ({taxRate}%)</Text>
        <Text style={styles.pricingValue}>${taxAmount.toFixed(2)}</Text>
      </View>

      <View style={[styles.pricingRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  pricingLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  pricingValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  discountValue: {
    color: theme.colors.error,
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
});
