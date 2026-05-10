import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { styles } from '../jobDetailsStyles';

/**
 * Single icon + label + value row used in the Details section.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export const DetailRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconContainer}>
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);
