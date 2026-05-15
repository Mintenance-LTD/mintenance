/**
 * DeliveryStatusIndicator — sent-message delivery state (sending /
 * delivered / read / failed). Extracted from MessageBubble.tsx to keep
 * that file under the 500-line per-file cap.
 *
 * Direction A · Mint Editorial — token-styled.
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
import { MessageDeliveryStatus } from '../../../services/MessagingService';
import { me } from '../../../design-system/mint-editorial';

export const DeliveryStatusIndicator: React.FC<{
  status: MessageDeliveryStatus;
  isFromCurrentUser: boolean;
  onRetry?: () => void;
}> = ({ status, isFromCurrentUser, onRetry }) => {
  if (!isFromCurrentUser) return null;

  if (status === 'failed') {
    return (
      <TouchableOpacity
        style={styles.failedRow}
        onPress={onRetry}
        accessibilityRole='button'
        accessibilityLabel='Retry sending message'
      >
        <Ionicons name='alert-circle' size={14} color={me.errFg} />
        <Text style={styles.failedText}>Failed. Tap to retry</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'sending') {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size={10} color='rgba(255,255,255,0.6)' />
        <Text style={styles.sendingText}>Sending...</Text>
      </View>
    );
  }

  if (status === 'read') {
    return (
      <View style={styles.statusRow}>
        <View style={styles.doubleCheckContainer}>
          <Ionicons
            name='checkmark'
            size={12}
            color='rgba(255,255,255,0.8)'
            style={styles.checkFirst}
          />
          <Ionicons
            name='checkmark'
            size={12}
            color='rgba(255,255,255,0.8)'
            style={styles.checkSecond}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.statusRow}>
      <Ionicons name='checkmark' size={12} color='rgba(255,255,255,0.5)' />
    </View>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendingText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 3,
  },
  doubleCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 18,
    height: 12,
  },
  checkFirst: {
    position: 'absolute',
    left: 0,
  },
  checkSecond: {
    position: 'absolute',
    left: 5,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 2,
  },
  failedText: {
    fontSize: 11,
    color: me.errFg,
    marginLeft: 4,
    fontWeight: '500',
  },
});
