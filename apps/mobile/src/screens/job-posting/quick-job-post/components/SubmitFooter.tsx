import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Sticky footer with the "Post Job" submit button.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function SubmitFooter({
  bottomInset,
  submitting,
  onSubmit,
}: {
  bottomInset: number;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <View style={[styles.footer, { paddingBottom: bottomInset + 12 }]}>
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
        accessibilityRole='button'
        accessibilityLabel={submitting ? 'Posting job' : 'Post job'}
      >
        {submitting ? (
          <ActivityIndicator color={me.onBrand} />
        ) : (
          <>
            <Ionicons name='paper-plane' size={18} color={me.onBrand} />
            <Text style={styles.submitText}>Post Job</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
