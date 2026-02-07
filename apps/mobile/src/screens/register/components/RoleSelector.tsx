import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

interface RoleSelectorProps {
  role: 'homeowner' | 'contractor';
  onRoleChange: (role: 'homeowner' | 'contractor') => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ role, onRoleChange }) => {
  return (
    <View
      style={styles.roleSelectionContainer}
      accessibilityRole='radiogroup'
      accessibilityLabel='Account type selection'
    >
      <TouchableOpacity
        testID="role-homeowner"
        style={[styles.roleToggle, role === 'homeowner' && styles.roleToggleActive]}
        onPress={() => onRoleChange('homeowner')}
        accessibilityRole='radio'
        accessibilityLabel='Homeowner account'
        accessibilityHint='Select homeowner account type to find and hire contractors'
        accessibilityState={{ checked: role === 'homeowner' }}
      >
        <Text
          style={[
            styles.roleToggleText,
            role === 'homeowner' && styles.roleToggleTextActive,
          ]}
        >
          Homeowner
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="role-contractor"
        style={[styles.roleToggle, role === 'contractor' && styles.roleToggleActive]}
        onPress={() => onRoleChange('contractor')}
        accessibilityRole='radio'
        accessibilityLabel='Contractor account'
        accessibilityHint='Select contractor account type to offer services to homeowners'
        accessibilityState={{ checked: role === 'contractor' }}
      >
        <Text
          style={[
            styles.roleToggleText,
            role === 'contractor' && styles.roleToggleTextActive,
          ]}
        >
          Contractor
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  roleSelectionContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: 20,
    padding: 4,
    marginBottom: 32,
  },
  roleToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  roleToggleActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  roleToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  roleToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
