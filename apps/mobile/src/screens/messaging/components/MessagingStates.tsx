/**
 * MessagingStates — Loading, Error, and Empty states
 *
 * Empty state shows job context with quick-action suggestion pills.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const MessagingLoading: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#10B981" />
    <Text style={styles.loadingText}>Loading messages...</Text>
  </View>
);

interface MessagingErrorProps {
  onRetry: () => void;
}

export const MessagingError: React.FC<MessagingErrorProps> = ({ onRetry }) => (
  <View style={styles.loadingContainer}>
    <View style={styles.errorIconWrap}>
      <Ionicons name="warning-outline" size={28} color="#EF4444" />
    </View>
    <Text style={styles.errorTitle}>Failed to load messages</Text>
    <Text style={styles.errorDesc}>Check your connection and try again.</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

interface MessagingEmptyProps {
  jobTitle?: string;
  onQuickMessage?: (text: string) => void;
}

const QUICK_STARTERS = [
  { text: 'Hi there!', icon: 'hand-left-outline' as const },
  { text: 'When are you available?', icon: 'calendar-outline' as const },
  { text: 'Can I get a quote?', icon: 'pricetag-outline' as const },
];

export const MessagingEmpty: React.FC<MessagingEmptyProps> = ({
  jobTitle,
  onQuickMessage,
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name="chatbubbles-outline" size={32} color="#10B981" />
    </View>
    <Text style={styles.emptyTitle}>No Messages Yet</Text>
    <Text style={styles.emptySubtext}>
      {jobTitle
        ? `Start chatting about "${jobTitle}"`
        : 'Start the conversation!'}
    </Text>

    {onQuickMessage && (
      <View style={styles.quickActions}>
        {QUICK_STARTERS.map((starter) => (
          <TouchableOpacity
            key={starter.text}
            style={styles.quickPill}
            onPress={() => onQuickMessage(starter.text)}
            accessibilityRole="button"
            accessibilityLabel={`Send: ${starter.text}`}
          >
            <Ionicons name={starter.icon} size={14} color="#10B981" />
            <Text style={styles.quickPillText}>{starter.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#717171',
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  errorDesc: {
    fontSize: 14,
    color: '#717171',
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#717171',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
});
