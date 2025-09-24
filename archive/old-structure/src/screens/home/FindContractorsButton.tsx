/**
 * FindContractorsButton Component
 * 
 * Floating action button for finding contractors, can be dismissed.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useHaptics } from '../../utils/haptics';

interface FindContractorsButtonProps {
  visible: boolean;
  onPress: () => void;
  onDismiss: () => void;
}

export const FindContractorsButton: React.FC<FindContractorsButtonProps> = ({
  visible,
  onPress,
  onDismiss,
}) => {
  const haptics = useHaptics();

  if (!visible) return null;

  return (
    <View style={styles.floatingButtonContainer}>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          haptics.buttonPress();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Find contractors"
      >
        <Ionicons name="search" size={20} color={theme.colors.textInverse} />
        <Text style={styles.floatingButtonText}>Find Contractors</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={() => {
          haptics.buttonPress();
          onDismiss();
        }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    ...theme.shadows.large,
  },
  floatingButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: theme.colors.surface,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.base,
  },
});
