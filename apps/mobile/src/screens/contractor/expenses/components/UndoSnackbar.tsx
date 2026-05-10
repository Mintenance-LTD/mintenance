import React from 'react';
import { Animated, Text, TouchableOpacity } from 'react-native';
import { styles } from '../theme/styles';

/**
 * Animated "Deleted X — UNDO" toast that the screen renders while a
 * delete is pending its 3-second timeout.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function UndoSnackbar({
  description,
  opacity,
  onUndo,
}: {
  description: string;
  opacity: Animated.Value;
  onUndo: () => void;
}) {
  return (
    <Animated.View style={[styles.snackbar, { opacity }]}>
      <Text style={styles.snackbarText} numberOfLines={1}>
        Deleted "{description}"
      </Text>
      <TouchableOpacity
        onPress={onUndo}
        accessibilityRole='button'
        accessibilityLabel='Undo delete'
      >
        <Text style={styles.snackbarUndo}>UNDO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
