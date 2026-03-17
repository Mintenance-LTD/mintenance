import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';

const LIFECYCLE_STEPS = ['posted', 'assigned', 'in_progress', 'completed'];

export const ProgressDots: React.FC<{ status: string }> = ({ status }) => {
  const currentIndex = LIFECYCLE_STEPS.indexOf(status);
  return (
    <View style={styles.progressDots}>
      {LIFECYCLE_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <View style={[
            styles.progressDot,
            i <= currentIndex ? styles.progressDotActive : styles.progressDotInactive,
          ]} />
          {i < LIFECYCLE_STEPS.length - 1 && (
            <View style={[
              styles.progressLine,
              i < currentIndex ? styles.progressLineActive : styles.progressLineInactive,
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
  },
  progressDotInactive: {
    backgroundColor: theme.colors.border,
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressLineActive: {
    backgroundColor: theme.colors.primary,
  },
  progressLineInactive: {
    backgroundColor: theme.colors.border,
  },
});
