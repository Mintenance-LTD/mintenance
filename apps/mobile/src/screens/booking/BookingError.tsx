/**
 * BookingError Component
 *
 * Displays error state for the booking screen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

interface BookingErrorProps {
  error: string;
  onRetry: () => void;
}

export const BookingError: React.FC<BookingErrorProps> = ({
  error,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name='alert-circle-outline' size={32} color={me.errFg} />
      </View>
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorMessage}>{error}</Text>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityRole='button'
        accessibilityLabel='Retry loading bookings'
      >
        <Ionicons name='refresh' size={20} color={me.onBrand} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: me.bg2,
    padding: 40,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: me.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  retryButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '600',
  },
});
