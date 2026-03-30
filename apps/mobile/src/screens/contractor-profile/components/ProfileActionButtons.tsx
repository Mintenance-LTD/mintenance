/**
 * ProfileActionButtons — Primary CTA + secondary icon circles
 *
 * "Request a Quote" is the dominant green CTA.
 * Message/Call/Video/Share are demoted to small icon circles.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ProfileActionButtonsProps {
  onMessage: () => void;
  onCall: () => void;
  onVideo: () => void;
  onShare: () => void;
  onRequestQuote?: () => void;
  /** When false, the Message button is hidden (requires accepted bid / active job) */
  canMessage?: boolean;
}

const SECONDARY_ACTIONS: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  key: string;
}[] = [
  { icon: 'chatbubble-outline', label: 'Message', key: 'message' },
  { icon: 'call-outline', label: 'Call', key: 'call' },
  { icon: 'videocam-outline', label: 'Video', key: 'video' },
  { icon: 'share-social-outline', label: 'Share', key: 'share' },
];

export const ProfileActionButtons: React.FC<ProfileActionButtonsProps> = ({
  onMessage,
  onCall,
  onVideo,
  onShare,
  onRequestQuote,
  canMessage = true,
}) => {
  const handlers: Record<string, () => void> = {
    message: onMessage,
    call: onCall,
    video: onVideo,
    share: onShare,
  };

  // Hide the Message action when the user has no accepted bid / active job with this contractor
  const visibleActions = canMessage
    ? SECONDARY_ACTIONS
    : SECONDARY_ACTIONS.filter((a) => a.key !== 'message');

  return (
    <View style={styles.container}>
      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onRequestQuote || onMessage}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel='Request a quote from this contractor'
        testID='request-quote-button'
      >
        <Ionicons
          name='document-text-outline'
          size={18}
          color={theme.colors.textInverse}
        />
        <Text style={styles.primaryBtnText}>Request a Quote</Text>
      </TouchableOpacity>

      {/* Secondary actions — icon circles */}
      <View style={styles.secondaryRow}>
        {visibleActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.secondaryBtn}
            onPress={handlers[action.key]}
            testID={`${action.key}-button`}
            accessibilityRole='button'
            accessibilityLabel={action.label}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={theme.colors.textPrimary}
            />
            <Text style={styles.secondaryLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  secondaryBtn: {
    alignItems: 'center',
    gap: 4,
  },
  secondaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
