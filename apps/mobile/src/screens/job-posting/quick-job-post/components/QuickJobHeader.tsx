import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Top header for QuickJobPostScreen — back button + centred title.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function QuickJobHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole='button'
        accessibilityLabel='Go back'
      >
        <Ionicons name='arrow-back' size={22} color={me.ink} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Post a Quick Job</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}
