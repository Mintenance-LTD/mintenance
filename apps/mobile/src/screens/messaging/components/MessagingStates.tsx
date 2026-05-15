/**
 * MessagingStates — Loading, Error, and Empty states.
 * Direction A · Mint Editorial — token-styled.
 *
 * Empty state shows job context with quick-action suggestion pills.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export const MessagingLoading: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size='large' color={me.brand} />
    <Text style={styles.loadingText}>Loading messages...</Text>
  </View>
);

interface MessagingErrorProps {
  onRetry: () => void;
}

export const MessagingError: React.FC<MessagingErrorProps> = ({ onRetry }) => (
  <View style={styles.loadingContainer}>
    <View style={styles.errorIconWrap}>
      <Ionicons name='warning-outline' size={28} color={me.errFg} />
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
      <Ionicons name='chatbubbles-outline' size={32} color={me.brand} />
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
            accessibilityRole='button'
            accessibilityLabel={`Send: ${starter.text}`}
          >
            <Ionicons name={starter.icon} size={14} color={me.brand} />
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
    backgroundColor: me.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: me.ink2,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.errBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  errorDesc: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: me.brand,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: me.radius.btn,
    marginTop: 20,
  },
  retryText: {
    color: me.onBrand,
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
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  emptySubtext: {
    fontSize: 15,
    color: me.ink2,
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
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.brandSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.brand,
  },
});
