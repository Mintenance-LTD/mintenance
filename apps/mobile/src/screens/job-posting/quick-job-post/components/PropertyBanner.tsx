import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Pre-filled property card pulled from the QuickJobModal selection.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function PropertyBanner({
  propertyName,
  propertyAddress,
}: {
  propertyName?: string;
  propertyAddress?: string;
}) {
  return (
    <View style={styles.propertyBanner}>
      <Text style={styles.propertyLabel}>Property</Text>
      <View style={styles.propertyRow}>
        <Ionicons name='home' size={20} color={me.ink2} />
        <View style={styles.propertyText}>
          <Text style={styles.propertyNameText}>
            {propertyName || 'My Property'}
          </Text>
          <Text style={styles.propertyAddressText} numberOfLines={1}>
            {propertyAddress || ''}
          </Text>
        </View>
      </View>
    </View>
  );
}
