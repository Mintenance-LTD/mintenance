/**
 * FormProgress — 3-step progress indicator for the register flow.
 *
 * Extracted from RegisterScreen.tsx (2026-04-20) to keep the
 * parent file under the 500-line pre-commit gate after Phase 1.2
 * (email-verification-pending) wiring added the onSignUpSuccess
 * callback. Pure presentational — no state, no navigation.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

const STEPS = [
  { number: 1, label: 'Personal' },
  { number: 2, label: 'Contact' },
  { number: 3, label: 'Password' },
] as const;

export interface FormProgressProps {
  currentStep: number;
}

export const FormProgress: React.FC<FormProgressProps> = ({ currentStep }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isFuture = step.number > currentStep;

          return (
            <React.Fragment key={step.number}>
              {index > 0 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        isCompleted || isActive
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                />
              )}
              <View style={styles.stepColumn}>
                <View
                  style={[
                    styles.circle,
                    isCompleted || isActive
                      ? { backgroundColor: theme.colors.primary }
                      : { backgroundColor: theme.colors.backgroundSecondary },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons
                      name='checkmark'
                      size={16}
                      color={theme.colors.textInverse}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        isActive
                          ? { color: theme.colors.textInverse }
                          : { color: theme.colors.textTertiary },
                      ]}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive
                      ? { color: theme.colors.primary, fontWeight: '600' }
                      : isFuture
                        ? { color: theme.colors.textTertiary }
                        : { color: theme.colors.textSecondary },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  line: {
    height: 2,
    flex: 1,
    marginTop: 14,
    borderRadius: 1,
  },
  stepColumn: {
    alignItems: 'center',
    width: 56,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
