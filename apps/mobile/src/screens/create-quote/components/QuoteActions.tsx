/**
 * QuoteActions Component
 * 
 * Action buttons for saving and sending quotes.
 * 
 * @filesize Target: <70 lines
 * @compliance Single Responsibility - Action buttons
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../../theme';

interface QuoteActionsProps {
  loading: boolean;
  onSave: () => void;
  onSend: () => void;
  onBack: () => void;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  loading,
  onSave,
  onSend,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={onBack}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Quote</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.sendButton]}
        onPress={onSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textInverse} />
        ) : (
          <Text style={styles.sendButtonText}>Send to Client</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    backgroundColor: theme.colors.secondary,
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  sendButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});
