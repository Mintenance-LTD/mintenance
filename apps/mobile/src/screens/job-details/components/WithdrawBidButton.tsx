import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../jobDetailsStyles';

/**
 * "Withdraw Bid" CTA shown to a contractor with a pending bid on the
 * current job. The actual withdrawal logic lives in the parent screen
 * (it needs access to the job route param + react-query refetchers);
 * this just renders the button + loading state.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export function WithdrawBidButton({
  withdrawing,
  onPress,
}: {
  withdrawing: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.withdrawBidButton, withdrawing && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={withdrawing}
      accessibilityRole='button'
      accessibilityLabel='Withdraw your bid'
    >
      {withdrawing ? (
        <ActivityIndicator color={me.errFg} size='small' />
      ) : (
        <>
          <Ionicons name='close-circle-outline' size={20} color={me.errFg} />
          <Text style={styles.withdrawBidText}>Withdraw Bid</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
