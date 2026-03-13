/**
 * ProfileActionButtons — Primary CTA + secondary icon circles
 *
 * "Request a Quote" is the dominant green CTA.
 * Message/Call/Video/Share are demoted to small icon circles.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileActionButtonsProps {
  onMessage: () => void;
  onCall: () => void;
  onVideo: () => void;
  onShare: () => void;
  onRequestQuote?: () => void;
}

const SECONDARY_ACTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; key: string }[] = [
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
}) => {
  const handlers: Record<string, () => void> = {
    message: onMessage,
    call: onCall,
    video: onVideo,
    share: onShare,
  };

  return (
    <View style={styles.container}>
      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onRequestQuote || onMessage}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Request a quote from this contractor"
        testID="request-quote-button"
      >
        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Request a Quote</Text>
      </TouchableOpacity>

      {/* Secondary actions — icon circles */}
      <View style={styles.secondaryRow}>
        {SECONDARY_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.secondaryBtn}
            onPress={handlers[action.key]}
            testID={`${action.key}-button`}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={20} color="#222222" />
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
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#717171',
    fontWeight: '500',
  },
});
