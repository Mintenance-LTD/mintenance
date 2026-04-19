/**
 * HomeHealthSubscribeScreen — deferred #6 from R5.
 *
 * Mobile counterpart of apps/web/app/homeowner/subscriptions/home-health/
 * (HomeHealthEnrollCard). Lets a homeowner subscribe to Home Health
 * (£9.99/mo) via Stripe's native PaymentSheet. On success, the server
 * has already created the three recurring maintenance schedules and
 * mirrored the subscription into homeowner_subscriptions.
 *
 * Flow:
 *   1. Load the user's properties, pick one.
 *   2. POST /api/subscriptions/home-health/payment-sheet →
 *      { paymentSheet: { clientSecret, ephemeralKeySecret, customerId } }
 *   3. initPaymentSheet(...) + presentPaymentSheet()
 *   4. On success, navigate back and show a toast.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, LoadingSpinner } from '../../components/shared';
import { Button } from '../../components/ui/Button';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

interface Property {
  id: string;
  property_name?: string | null;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
}

interface PaymentSheetBundle {
  clientSecret: string;
  ephemeralKeySecret: string;
  customerId: string;
}

interface SubscribeResponse {
  subscriptionId: string;
  requiresPayment: boolean;
  paymentSheet?: PaymentSheetBundle;
  recurringScheduleIds?: string[];
}

function formatPropertyLabel(p: Property): string {
  const name = p.property_name?.trim();
  if (name) return name;
  const parts = [p.address, p.postcode].filter(Boolean);
  return parts.join(', ') || 'Property';
}

export const HomeHealthSubscribeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await mobileApiClient.get<{ properties: Property[] }>(
          '/api/properties'
        );
        if (cancelled) return;
        const list = res.properties ?? [];
        setProperties(list);
        const only = list.length === 1 ? list[0] : undefined;
        if (only) setSelectedPropertyId(only.id);
      } catch (err) {
        logger.warn('Failed to load properties for Home Health', {
          err: err instanceof Error ? err.message : String(err),
        });
        setProperties([]);
      } finally {
        if (!cancelled) setLoadingProperties(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!selectedPropertyId) {
      Alert.alert('Pick a property', 'Choose which home to protect first.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create the subscription + payment-sheet bundle on the server.
      const res = await mobileApiClient.post<SubscribeResponse>(
        '/api/subscriptions/home-health/payment-sheet',
        { propertyId: selectedPropertyId }
      );
      if (!res.requiresPayment || !res.paymentSheet) {
        Alert.alert(
          'Home Health is active',
          'No payment needed for this subscription.'
        );
        navigation.goBack();
        return;
      }
      const { clientSecret, ephemeralKeySecret, customerId } = res.paymentSheet;

      // 2. Initialise Stripe's native sheet.
      const initResult = await initPaymentSheet({
        merchantDisplayName: 'Mintenance',
        customerId,
        customerEphemeralKeySecret: ephemeralKeySecret,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'mintenance://subscription-return',
      });
      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      // 3. Hand off to Stripe's UI.
      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code === 'Canceled') {
          // User dismissed — not an error.
          setSubmitting(false);
          return;
        }
        throw new Error(presentResult.error.message);
      }

      Alert.alert(
        'Home Health activated',
        'We\u2019ll schedule your boiler service, smoke-alarm and gutter visits automatically.'
      );
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'Could not subscribe',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedPropertyId, initPaymentSheet, presentPaymentSheet, navigation]);

  if (loadingProperties) return <LoadingSpinner message='Loading...' />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Home Health'
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons
            name='shield-checkmark'
            size={28}
            color={theme.colors.primary}
          />
          <Text style={styles.price}>£9.99 / month</Text>
          <Text style={styles.tagline}>
            We schedule + run three key maintenance checks on your home every
            year.
          </Text>
          <View style={styles.bullets}>
            {[
              'Annual boiler service',
              'Smoke & CO alarm test every 6 months',
              'Gutter clean twice a year',
            ].map((b) => (
              <View key={b} style={styles.bullet}>
                <Ionicons
                  name='checkmark-circle'
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Which home?</Text>
        {properties.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              You don&apos;t have a property registered yet. Add one from the
              Properties screen first.
            </Text>
          </View>
        ) : (
          properties.map((p) => {
            const selected = p.id === selectedPropertyId;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedPropertyId(p.id)}
                style={[
                  styles.propertyRow,
                  selected && styles.propertyRowSelected,
                ]}
                accessibilityRole='radio'
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={
                    selected ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
                <Text style={styles.propertyLabel} numberOfLines={2}>
                  {formatPropertyLabel(p)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <Button
          title={submitting ? 'Preparing…' : 'Start Home Health — £9.99/mo'}
          onPress={subscribe}
          disabled={submitting || !selectedPropertyId}
          style={{ marginTop: 20 }}
        />
        {submitting && (
          <ActivityIndicator
            color={theme.colors.primary}
            style={{ marginTop: 12 }}
          />
        )}
        <Text style={styles.fineprint}>
          Cancel anytime. Your next card charge won&apos;t be more than £9.99.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 10,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
  },
  bullets: { gap: 6 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletText: { fontSize: 14, color: theme.colors.textPrimary },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  propertyRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  propertyLabel: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary },
  fineprint: {
    marginTop: 12,
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
