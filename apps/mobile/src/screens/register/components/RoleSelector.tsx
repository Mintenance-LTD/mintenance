import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        <View style={styles.roleRow}>
          <Ionicons
            name="home-outline"
            size={18}
            color={role === 'homeowner' ? '#222222' : '#717171'}
          />
          <Text
            style={[
              styles.roleToggleText,
              role === 'homeowner' && styles.roleToggleTextActive,
            ]}
          >
            Homeowner
          </Text>
        </View>
        <Text
          style={[
            styles.roleDescription,
            role === 'homeowner' && styles.roleDescriptionActive,
          ]}
        >
          Find trusted contractors
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
        <View style={styles.roleRow}>
          <Ionicons
            name="construct-outline"
            size={18}
            color={role === 'contractor' ? '#222222' : '#717171'}
          />
          <Text
            style={[
              styles.roleToggleText,
              role === 'contractor' && styles.roleToggleTextActive,
            ]}
          >
            Contractor
          </Text>
        </View>
        <Text
          style={[
            styles.roleDescription,
            role === 'contractor' && styles.roleDescriptionActive,
          ]}
        >
          Grow your business
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  roleSelectionContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
  },
  roleToggle: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  roleToggleActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#717171',
  },
  roleToggleTextActive: {
    color: '#222222',
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 11,
    color: '#B0B0B0',
    marginTop: 2,
  },
  roleDescriptionActive: {
    color: '#717171',
  },
});
