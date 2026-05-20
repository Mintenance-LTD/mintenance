/**
 * FormProgress — 3-step progress indicator for the register flow.
 *
 * Extracted from RegisterScreen.tsx (2026-04-20) to keep the
 * parent file under the 500-line pre-commit gate after Phase 1.2
 * (email-verification-pending) wiring added the onSignUpSuccess
 * callback. Pure presentational — no state, no navigation.
 *
 * Direction A · Mint Editorial — token-styled.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

// Phase 2 wizard — labels match the three steps the user actually
// clicks through: Identity (email + password) → Name → Contact (phone).
const STEPS = [
  { number: 1, label: 'Identity' },
  { number: 2, label: 'Name' },
  { number: 3, label: 'Contact' },
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
                        isCompleted || isActive ? me.brand : me.line,
                    },
                  ]}
                />
              )}
              <View style={styles.stepColumn}>
                <View
                  style={[
                    styles.circle,
                    isCompleted || isActive
                      ? { backgroundColor: me.brand }
                      : { backgroundColor: me.bg3 },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name='checkmark' size={16} color={me.onBrand} />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        isActive ? { color: me.onBrand } : { color: me.ink3 },
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
                      ? { color: me.brand, fontWeight: '600' }
                      : isFuture
                        ? { color: me.ink3 }
                        : { color: me.ink2 },
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
