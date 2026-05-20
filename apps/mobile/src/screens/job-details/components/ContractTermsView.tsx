/**
 * ContractTermsView - Title, description, dates, and terms & conditions
 * Extracted from ContractViewScreen to keep file size manageable.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

interface ContractTermsViewProps {
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  terms: Record<string, unknown>;
  formatDate: (dateStr: string) => string;
}

export const ContractTermsView: React.FC<ContractTermsViewProps> = ({
  title,
  description,
  start_date,
  end_date,
  terms,
  formatDate,
}) => {
  return (
    <>
      {title && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <Text style={styles.sectionValue}>{title}</Text>
        </View>
      )}

      {description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.sectionValue}>{description}</Text>
        </View>
      )}

      {(start_date || end_date) && (
        <View style={styles.datesRow}>
          {start_date && (
            <View style={styles.dateItem}>
              <Text style={styles.sectionLabel}>Start Date</Text>
              <Text style={styles.sectionValue}>{formatDate(start_date)}</Text>
            </View>
          )}
          {end_date && (
            <View style={styles.dateItem}>
              <Text style={styles.sectionLabel}>End Date</Text>
              <Text style={styles.sectionValue}>{formatDate(end_date)}</Text>
            </View>
          )}
        </View>
      )}

      {terms && Object.keys(terms).length > 0 && (
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          {Object.entries(terms).map(([key, value]) => (
            <View key={key} style={styles.termRow}>
              <Text style={styles.termKey}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.termValue}>
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 15,
    color: me.ink,
    lineHeight: 22,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  dateItem: {
    flex: 1,
  },
  termsCard: {
    backgroundColor: me.bg2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 8,
  },
  termKey: {
    fontSize: 13,
    fontWeight: '500',
    color: me.ink2,
    textTransform: 'capitalize',
    width: 120,
  },
  termValue: {
    flex: 1,
    fontSize: 13,
    color: me.ink,
  },
});
