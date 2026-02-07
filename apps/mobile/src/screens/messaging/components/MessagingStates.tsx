import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export const MessagingLoading: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size='large' color={theme.colors.primary} />
    <Text style={styles.loadingText}>Loading messages...</Text>
  </View>
);

interface MessagingErrorProps {
  onRetry: () => void;
}

export const MessagingError: React.FC<MessagingErrorProps> = ({ onRetry }) => (
  <View style={styles.loadingContainer}>
    <Ionicons name='warning-outline' size={48} color={theme.colors.error} />
    <Text style={styles.errorText}>Failed to load messages</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

export const MessagingEmpty: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name='chatbubbles-outline' size={48} color={theme.colors.textTertiary} />
    <Text style={styles.emptyText}>No messages yet</Text>
    <Text style={styles.emptySubtext}>Start the conversation!</Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: theme.colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
});
