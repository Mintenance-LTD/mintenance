import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import Button from '../../components/ui/Button';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { useToast } from '../../components/ui/Toast';
import { theme } from '../../theme';

/**
 * Add payment method screen using Stripe's PaymentSheet flow.
 *
 * Flow:
 *   1. POST /api/payments/setup-intent → returns clientSecret
 *   2. initPaymentSheet({ setupIntentClientSecret: clientSecret })
 *   3. presentPaymentSheet() — Stripe's native UI handles card + BACS +
 *      3DS + mandate acceptance
 *   4. On success, Stripe attaches the PM to the customer and fires the
 *      setup_intent.succeeded webhook, which persists the PM server-side
 *
 * This replaces the legacy AddPaymentMethodScreen which used raw CardField
 * and didn't support BACS Direct Debit.
 */
const AddPaymentMethodV2Screen: React.FC = () => {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const toast = useToast();

  const [initializing, setInitializing] = useState(true);
  const [sheetReady, setSheetReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialisePaymentSheet = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      const res = await mobileApiClient.post<{
        success: boolean;
        clientSecret?: string;
        message?: string;
      }>('/api/payments/setup-intent', {});

      if (!res.success || !res.clientSecret) {
        throw new Error(res.message ?? 'Failed to initialise payment form');
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Mintenance',
        setupIntentClientSecret: res.clientSecret,
        // Let Stripe pick up default payment methods; BACS Debit + Card
        // are enabled server-side when the SetupIntent is created
        returnURL: 'mintenance://payment-methods/return',
        allowsDelayedPaymentMethods: true, // required for BACS
        defaultBillingDetails: undefined, // filled in by user
      });

      if (initError) {
        throw new Error(initError.message);
      }

      setSheetReady(true);
    } catch (e) {
      const msg = (e as Error).message;
      logger.warn('Failed to initialise PaymentSheet', { error: msg });
      setError(msg);
    } finally {
      setInitializing(false);
    }
  }, [initPaymentSheet]);

  useEffect(() => {
    initialisePaymentSheet();
  }, [initialisePaymentSheet]);

  const openSheet = async () => {
    setSubmitting(true);
    const { error: presentError } = await presentPaymentSheet();
    setSubmitting(false);

    if (presentError) {
      // User canceled or error occurred
      if (presentError.code !== 'Canceled') {
        toast.show({
          type: 'error',
          title: 'Could not save payment method',
          message: presentError.message,
        });
        logger.warn('PaymentSheet present failed', {
          code: presentError.code,
          message: presentError.message,
        });
      }
      return;
    }

    // Success. Webhook will persist the PM; show confirmation + navigate back
    toast.show({ type: 'success', title: 'Payment method saved' });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add payment method</Text>
        <Text style={styles.subtitle}>
          Card or UK Direct Debit (BACS). Your bank details stay with Stripe —
          Mintenance never sees or stores them.
        </Text>

        {initializing && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {!initializing && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={initialisePaymentSheet} title="Try again" />
          </View>
        )}

        {!initializing && sheetReady && !error && (
          <Button
            onPress={openSheet}
            title={submitting ? 'Opening…' : 'Continue'}
            disabled={submitting}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
});

export default AddPaymentMethodV2Screen;
