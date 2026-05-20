import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Inline loader and error placeholders rendered inside the
 * Subscription scroll view (above the plans list).
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */

export function InlineLoading() {
  return (
    <View style={styles.inlineCenter}>
      <ActivityIndicator size='large' color={me.brand} />
      <Text style={styles.inlineText}>Loading subscription...</Text>
    </View>
  );
}

export function InlineError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.inlineCenter}>
      <Ionicons name='alert-circle-outline' size={32} color={me.errFg} />
      <Text style={styles.inlineText}>Failed to load subscription</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
