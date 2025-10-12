import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

type Period = '3m' | '6m' | '12m';

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const periods: { period: Period; label: string }[] = [
    { period: '3m', label: '3 Months' },
    { period: '6m', label: '6 Months' },
    { period: '12m', label: '12 Months' },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map(({ period, label }) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => onPeriodChange(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  periodButtonTextActive: {
    color: theme.colors.textInverse,
  },
});
