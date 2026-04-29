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
  /**
   * When true (the user has an open/accepted bid from this contractor on
   * one of their jobs), the primary CTA flips from "Request a Quote" to
   * "Message Contractor" — asking for a quote when they've already bid
   * is the user-facing UX issue the homeowner flagged on bid review.
   */
  hasActiveBid?: boolean;
}

const SECONDARY_ACTIONS: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  key: string;
}[] = [
  { icon: 'chatbubble-outline', label: 'Message', key: 'message' },
  { icon: 'call-outline', label: 'Call', key: 'call' },
  // Audit follow-up (2026-04-29): Video action removed pending the
  // real video-call feature. The handler used to surface a "Coming
  // Soon" alert (see ContractorProfileViewModel.handleVideo) — better
  // to not show the button at all than tease an unbuilt feature on a
  // contractor's profile. Re-add the row once `<RTCView />` integration
  // is wired and `JobContextLocationService`'s in-call state surfaces.
  { icon: 'share-social-outline', label: 'Share', key: 'share' },
];

export const ProfileActionButtons: React.FC<ProfileActionButtonsProps> = ({
  onMessage,
  onCall,
  onVideo,
  onShare,
  onRequestQuote,
  canMessage = true,
  hasActiveBid = false,
}) => {
  const primaryLabel = hasActiveBid ? 'Message Contractor' : 'Request a Quote';
  const primaryIcon: keyof typeof Ionicons.glyphMap = hasActiveBid
    ? 'chatbubble-outline'
    : 'document-text-outline';
  const primaryHandler = hasActiveBid ? onMessage : onRequestQuote || onMessage;
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
      {/* Primary CTA — flips between "Request a Quote" and
          "Message Contractor" depending on whether the user already has
          an open/accepted bid from this contractor (see hasActiveBid). */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={primaryHandler}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel={
          hasActiveBid
            ? 'Message this contractor'
            : 'Request a quote from this contractor'
        }
        testID={
          hasActiveBid ? 'message-contractor-button' : 'request-quote-button'
        }
      >
        <Ionicons
          name={primaryIcon}
          size={18}
          color={theme.colors.textInverse}
        />
        <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
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
