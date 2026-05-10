import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { theme } from '../../../../theme';
import { styles } from '../theme/styles';
import { EXPENSE_CATEGORIES } from '../types';

export interface ExpenseFormData {
  description: string;
  category: string;
  amount: string;
  billable: boolean;
}

/**
 * Inline form for adding an expense. Owns no state — drives entirely
 * off the `formData` prop + `setFormData` callback so the parent
 * keeps the source of truth (it needs that state to wipe on success).
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function AddExpenseForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitting,
  jobIdParam,
  jobTitleParam,
}: {
  formData: ExpenseFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExpenseFormData>>;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  jobIdParam?: string;
  jobTitleParam?: string;
}) {
  return (
    <Card variant='elevated' padding='md' style={styles.formCard}>
      {jobIdParam && (
        <View style={styles.jobScopeBanner}>
          <Ionicons
            name='briefcase-outline'
            size={14}
            color={theme.colors.primary}
          />
          <Text style={styles.jobScopeBannerText} numberOfLines={1}>
            For: {jobTitleParam || 'selected job'}
          </Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder='Description'
        placeholderTextColor={theme.colors.textTertiary}
        value={formData.description}
        onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))}
      />
      <TextInput
        style={styles.input}
        placeholder='Amount'
        placeholderTextColor={theme.colors.textTertiary}
        keyboardType='decimal-pad'
        value={formData.amount}
        onChangeText={(t) => setFormData((p) => ({ ...p, amount: t }))}
      />
      <Text style={styles.formLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.formCategoryRow}
      >
        {EXPENSE_CATEGORIES.map((item) => {
          const selected = formData.category === item;
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.formCategoryChip,
                selected && styles.formCategoryChipActive,
              ]}
              onPress={() => setFormData((p) => ({ ...p, category: item }))}
              accessibilityRole='button'
              accessibilityState={{ selected }}
              accessibilityLabel={`Set category to ${item}`}
            >
              <Text
                style={[
                  styles.formCategoryText,
                  selected && styles.formCategoryTextActive,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={styles.billableToggle}
        onPress={() => setFormData((p) => ({ ...p, billable: !p.billable }))}
        accessibilityRole='checkbox'
        accessibilityState={{ checked: formData.billable }}
        accessibilityLabel='Mark expense as billable'
      >
        <Ionicons
          name={formData.billable ? 'checkbox' : 'square-outline'}
          size={22}
          color={
            formData.billable ? theme.colors.primary : theme.colors.textTertiary
          }
        />
        <View style={styles.billableCopy}>
          <Text style={styles.billableTitle}>Billable to client</Text>
          <Text style={styles.billableHint}>
            Include this cost when preparing the invoice.
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.formActions}>
        <Button variant='ghost' size='sm' onPress={onCancel}>
          Cancel
        </Button>
        <Button
          variant='primary'
          size='sm'
          onPress={onSubmit}
          loading={submitting}
        >
          Add
        </Button>
      </View>
    </Card>
  );
}
