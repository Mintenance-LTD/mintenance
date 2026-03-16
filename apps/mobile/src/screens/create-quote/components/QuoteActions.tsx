/**
 * QuoteActions — Save Draft + Send Quote buttons
 *
 * Two clear actions: outline Save Draft, green Send Quote.
 * No Cancel button (back nav handles it).
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.draftButton}
        onPress={onSave}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Saving quote' : 'Save as draft'}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textPrimary} />
        ) : (
          <>
            <Ionicons name="bookmark-outline" size={18} color={theme.colors.textPrimary} />
            <Text style={styles.draftButtonText}>Save Draft</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={onSend}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Sending quote' : 'Send quote to client'}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textInverse} />
        ) : (
          <>
            <Ionicons name="send" size={16} color={theme.colors.textInverse} />
            <Text style={styles.sendButtonText}>Send Quote</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.textPrimary,
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sendButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: theme.colors.textPrimary,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
});
