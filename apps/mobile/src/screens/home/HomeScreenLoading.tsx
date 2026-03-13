/**
 * HomeScreenLoading Component
 *
 * Displays loading state for the home screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonDashboard } from '../../components/SkeletonLoader';

export const HomeScreenLoading: React.FC = () => {
  return (
    <View style={styles.container}>
      <SkeletonDashboard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
});
