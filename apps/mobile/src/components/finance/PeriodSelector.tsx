import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#222222',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
});
