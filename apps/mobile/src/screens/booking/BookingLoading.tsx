/**
 * BookingLoading Component
 *
 * Displays loading state for the booking screen.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const BookingLoading: React.FC = () => {
  return (
    <View style={styles.container} testID='booking-loading-container'>
      <ActivityIndicator
        size='large'
        color={me.ink}
        testID='booking-loading-spinner'
      />
      <Text style={styles.loadingText} testID='booking-loading-text'>
        Loading your bookings...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: me.bg2,
  },
  loadingText: {
    fontSize: 16,
    color: me.ink2,
    marginTop: 16,
  },
});
