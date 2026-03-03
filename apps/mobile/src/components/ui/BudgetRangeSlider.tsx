import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface BudgetRangeSliderProps {
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  label?: string;
}

export const BudgetRangeSlider: React.FC<BudgetRangeSliderProps> = ({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  label = 'Budget Range',
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <Text style={styles.prefix}>£</Text>
        <TextInput
          style={styles.input}
          value={minValue}
          onChangeText={onMinChange}
          keyboardType="numeric"
          placeholder="Min"
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel="Minimum budget"
        />
      </View>
      <View style={styles.separator}>
        <View style={styles.dash} />
      </View>
      <View style={styles.inputWrap}>
        <Text style={styles.prefix}>£</Text>
        <TextInput
          style={styles.input}
          value={maxValue}
          onChangeText={onMaxChange}
          keyboardType="numeric"
          placeholder="Max"
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel="Maximum budget"
        />
      </View>
    </View>
    {minValue && maxValue && parseFloat(minValue) > parseFloat(maxValue) && (
      <Text style={styles.errorText}>Min budget cannot exceed max budget</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  separator: {
    width: 20,
    alignItems: 'center',
  },
  dash: {
    width: 12,
    height: 2,
    backgroundColor: theme.colors.textTertiary,
    borderRadius: 1,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
});

export default BudgetRangeSlider;
