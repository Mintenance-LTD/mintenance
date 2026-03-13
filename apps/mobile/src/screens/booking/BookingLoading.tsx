/**
 * BookingLoading Component
 *
 * Displays loading state for the booking screen.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export const BookingLoading: React.FC = () => {
  return (
    <View style={styles.container} testID="booking-loading-container">
      <ActivityIndicator
        size="large"
        color="#222222"
        testID="booking-loading-spinner"
      />
      <Text style={styles.loadingText} testID="booking-loading-text">
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
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#717171',
    marginTop: 16,
  },
});
