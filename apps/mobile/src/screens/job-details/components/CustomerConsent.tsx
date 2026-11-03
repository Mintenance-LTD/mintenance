import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  EARLY_START_REQUEST,
  FULL_PERFORMANCE_ACKNOWLEDGEMENT,
} from '@mintenance/shared';
import { CustomerTerms } from '../../../components/CustomerTerms';
export interface ConsentChoices {
  termsAccepted: boolean;
  earlyStartRequested: boolean;
  fullPerformanceAcknowledged: boolean;
}
export const emptyConsent: ConsentChoices = {
  termsAccepted: false,
  earlyStartRequested: false,
  fullPerformanceAcknowledged: false,
};
export function CustomerConsent({
  value,
  onChange,
  homeowner,
}: {
  value: ConsentChoices;
  onChange: (v: ConsentChoices) => void;
  homeowner: boolean;
}) {
  const [show, setShow] = useState(false);
  const choice = (
    label: string,
    checked: boolean,
    press: () => void,
    disabled = false
  ) => (
    <Pressable
      accessible
      accessibilityRole='checkbox'
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={press}
      style={{ paddingVertical: 14, opacity: disabled ? 0.5 : 1 }}
    >
      <Text style={{ fontSize: 15, lineHeight: 22 }}>
        {checked ? '☑' : '☐'} {label}
      </Text>
    </Pressable>
  );
  return (
    <View
      style={{
        padding: 18,
        backgroundColor: '#fff',
        borderRadius: 14,
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '600' }}>
        Agreement and cancellation rights
      </Text>
      <Text>
        The agreement takes effect when all required parties sign. The consumer
        cancellation period ends 14 days after that day. Your accepted agreement
        records the exact deadline.
      </Text>
      <Pressable
        accessibilityRole='button'
        onPress={() => setShow(true)}
        style={{ padding: 12 }}
      >
        <Text>Read and save customer terms</Text>
      </Pressable>
      {choice(
        'I have read and accept the customer terms and this job agreement.',
        value.termsAccepted,
        () => onChange({ ...value, termsAccepted: !value.termsAccepted })
      )}
      {homeowner && (
        <>
          <Text>
            You can sign without requesting an early start; work must then wait
            until the cancellation period ends.
          </Text>
          {choice(EARLY_START_REQUEST, value.earlyStartRequested, () =>
            onChange({
              ...value,
              earlyStartRequested: !value.earlyStartRequested,
              fullPerformanceAcknowledged: false,
            })
          )}
          {choice(
            FULL_PERFORMANCE_ACKNOWLEDGEMENT,
            value.fullPerformanceAcknowledged,
            () =>
              onChange({
                ...value,
                fullPerformanceAcknowledged: !value.fullPerformanceAcknowledged,
              }),
            !value.earlyStartRequested
          )}
        </>
      )}
      <CustomerTerms visible={show} onClose={() => setShow(false)} />
    </View>
  );
}
