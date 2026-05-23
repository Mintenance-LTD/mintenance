import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import { ScreenHeader } from '../../components/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { me } from '../../design-system/mint-editorial';

/**
 * Contractor Stripe Connect onboarding + payout status screen (mobile).
 *
 * Opens the Stripe-hosted onboarding URL in the system browser via
 * expo-web-browser (safer than an in-app WebView; Stripe requires the
 * full URL bar + security indicators for KYC flows).
 *
 * After onboarding returns to the deep link, we refresh status via
 * /api/payments/stripe-connect/status?refresh=true.
 */
interface ConnectStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  transfersActive: boolean;
  requirementsPending: string[];
  canReceivePayouts: boolean;
}

interface PayoutBalance {
  pendingAmountMinor: number;
  lifetimePaidOutMinor: number;
  currency: string;
  threshold: number;
  lastPayoutAt: string | null;
  eligibleForPayout: boolean;
}

const ContractorPayoutsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (refresh = false) => {
    setError(null);
    try {
      const res = await mobileApiClient.get<{
        success: boolean;
        status: ConnectStatus | null;
      }>(
        `/api/payments/stripe-connect/status${refresh ? '?refresh=true' : ''}`
      );
      setStatus(res.status ?? null);

      if (res.status?.accountId) {
        const balRes = await mobileApiClient.get<{
          success: boolean;
          balance: PayoutBalance | null;
        }>('/api/payments/payout-balance');
        setBalance(balRes.balance ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
      logger.warn('Failed to load Connect status', { error: e });
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadStatus();
      setLoading(false);
    })();
  }, [loadStatus]);

  const startOnboarding = async () => {
    setBusy(true);
    setError(null);
    try {
      // 2026-05-23 audit-23 P1: signal that we're calling from mobile
      // so the API generates a return URL with `?client=mobile`. The
      // /onboarding-complete page reads that flag and fires a
      // `mintenance://payouts/return` deep link, which closes the
      // WebBrowser auth session and re-runs loadStatus below. Without
      // this hint, Stripe redirected to the web page and the mobile
      // session never resolved.
      const res = await mobileApiClient.post<{
        success: boolean;
        url?: string;
        message?: string;
      }>('/api/payments/stripe-connect/onboard', { client: 'mobile' });

      if (!res.success || !res.url) {
        throw new Error(res.message ?? 'Failed to start onboarding');
      }

      // Open Stripe onboarding in system browser
      const result = await WebBrowser.openAuthSessionAsync(
        res.url,
        'mintenance://payouts/return'
      );

      if (result.type === 'success' || result.type === 'dismiss') {
        // User returned — refresh status from Stripe
        await loadStatus(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openDashboard = async () => {
    try {
      const res = await mobileApiClient.post<{
        success: boolean;
        url?: string;
      }>('/api/payments/stripe-connect/dashboard-link', {});
      if (res.url) {
        await WebBrowser.openBrowserAsync(res.url);
      }
    } catch (e) {
      logger.warn('Failed to open dashboard', { error: e });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatus(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={me.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Payouts'
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {(!status || !status.detailsSubmitted) && (
          <>
            <NoAccountCard onStart={startOnboarding} busy={busy} />
            <PayoutInfoSection />
          </>
        )}

        {status && status.detailsSubmitted && !status.canReceivePayouts && (
          <ReviewCard status={status} onResume={startOnboarding} busy={busy} />
        )}

        {status?.canReceivePayouts && (
          <ReadyCard
            balance={balance}
            onOpenDashboard={openDashboard}
            hasPendingRequirements={status.requirementsPending.length > 0}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const NoAccountCard: React.FC<{
  onStart: () => void;
  busy: boolean;
}> = ({ onStart, busy }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Set up payouts</Text>
    <Text style={styles.cardBody}>
      To receive payment for completed jobs, set up a Stripe account. Stripe
      will ask for your bank details, ID, and business information (about 5
      minutes). Mintenance never sees or stores these details directly.
    </Text>
    <View style={styles.bulletList}>
      <Text style={styles.bullet}>• Payouts sent weekly on Fridays</Text>
      <Text style={styles.bullet}>• Minimum balance £50 before payout</Text>
      <Text style={styles.bullet}>
        • Stripe handles tax documents in your dashboard
      </Text>
    </View>
    <Button
      onPress={onStart}
      title={busy ? 'Opening…' : 'Set up payouts with Stripe'}
      disabled={busy}
    />
  </View>
);

const ReviewCard: React.FC<{
  status: ConnectStatus;
  onResume: () => void;
  busy: boolean;
}> = ({ status, onResume, busy }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <ActivityIndicator size='small' color={me.warnFg} />
      <Text style={styles.cardTitle}>Account under review</Text>
    </View>
    <Text style={styles.cardBody}>
      Stripe is verifying your details. Usually a few minutes; up to 2 business
      days for some documents.
    </Text>
    {status.requirementsPending.length > 0 && (
      <View style={styles.warnBox}>
        <Text style={styles.warnHeader}>Additional information needed:</Text>
        {status.requirementsPending.slice(0, 5).map((r) => (
          <Text key={r} style={styles.warnItem}>
            • {formatRequirement(r)}
          </Text>
        ))}
        <View style={{ height: 8 }} />
        <Button
          onPress={onResume}
          title={busy ? 'Opening…' : 'Complete information'}
          disabled={busy}
          variant='outline'
        />
      </View>
    )}
  </View>
);

const ReadyCard: React.FC<{
  balance: PayoutBalance | null;
  onOpenDashboard: () => void;
  hasPendingRequirements: boolean;
}> = ({ balance, onOpenDashboard, hasPendingRequirements }) => {
  const pending = balance?.pendingAmountMinor ?? 0;
  const threshold = balance?.threshold ?? 5000;
  const currency = balance?.currency ?? 'GBP';
  const progress = Math.min(100, Math.round((pending / threshold) * 100));

  return (
    <>
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name='checkmark-circle' size={22} color={me.okFg} />
          <Text style={styles.cardTitle}>Ready to receive payouts</Text>
        </View>

        <View style={styles.balanceRow}>
          <View style={styles.balanceCell}>
            <Text style={styles.balanceLabel}>Pending balance</Text>
            <Text style={styles.balanceAmount}>
              {formatMoney(pending, currency)}
            </Text>
          </View>
          <View style={styles.balanceCell}>
            <Text style={styles.balanceLabel}>Lifetime paid</Text>
            <Text style={styles.balanceAmount}>
              {formatMoney(balance?.lifetimePaidOutMinor ?? 0, currency)}
            </Text>
          </View>
        </View>

        {pending < threshold ? (
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>Progress to next payout</Text>
              <Text style={styles.progressText}>
                {formatMoney(pending, currency)} of{' '}
                {formatMoney(threshold, currency)}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        ) : (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              You&apos;re eligible for a payout. The next weekly transfer runs
              on Friday.
            </Text>
          </View>
        )}

        {balance?.lastPayoutAt && (
          <Text style={styles.lastPayout}>
            Last payout:{' '}
            {new Date(balance.lastPayoutAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}

        <Button onPress={onOpenDashboard} title='Open Stripe Dashboard' />
      </View>

      {hasPendingRequirements && (
        <View style={styles.warnCard}>
          <View style={styles.row}>
            <Ionicons name='alert-circle' size={18} color={me.warnFg} />
            <Text style={styles.warnCardTitle}>Action required soon</Text>
          </View>
          <Text style={styles.warnCardBody}>
            Stripe needs additional information to keep your payouts enabled.
            Visit the dashboard to update.
          </Text>
        </View>
      )}
    </>
  );
};

const PayoutInfoSection: React.FC = () => (
  <View style={styles.infoSection}>
    <Text style={styles.infoTitle}>How payouts work</Text>
    <View style={styles.infoItem}>
      <View style={styles.infoIconWrap}>
        <Ionicons name='shield-checkmark' size={18} color={me.brand} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoItemTitle}>Escrow-protected</Text>
        <Text style={styles.infoItemDesc}>
          Homeowner payment is held in escrow before you start. You always get
          paid for completed work.
        </Text>
      </View>
    </View>
    <View style={styles.infoItem}>
      <View style={styles.infoIconWrap}>
        <Ionicons name='calendar' size={18} color={me.brand} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoItemTitle}>Weekly payouts</Text>
        <Text style={styles.infoItemDesc}>
          Completed job payments are transferred to your bank every Friday via
          Stripe.
        </Text>
      </View>
    </View>
    <View style={styles.infoItem}>
      <View style={styles.infoIconWrap}>
        <Ionicons name='lock-closed' size={18} color={me.brand} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoItemTitle}>Secure & private</Text>
        <Text style={styles.infoItemDesc}>
          Stripe handles all bank details and tax documents. Mintenance never
          sees your financial data.
        </Text>
      </View>
    </View>
  </View>
);

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(minor / 100);
}

function formatRequirement(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\./g, ' → ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  content: { padding: 16, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: me.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: me.line,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: me.ink },
  cardBody: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  bulletList: { gap: 4 },
  bullet: { fontSize: 13, color: me.ink2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceRow: { flexDirection: 'row', gap: 16 },
  balanceCell: { flex: 1 },
  balanceLabel: { fontSize: 12, color: me.ink2 },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: me.ink,
  },
  progressSection: { gap: 6 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: me.ink2 },
  progressTrack: {
    height: 8,
    backgroundColor: me.bg3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: me.brand,
  },
  successBox: {
    padding: 10,
    backgroundColor: me.okBg,
    borderRadius: 8,
  },
  successText: { fontSize: 13, color: me.okFg },
  lastPayout: { fontSize: 11, color: me.ink2 },
  warnBox: {
    padding: 10,
    backgroundColor: me.warnBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: me.warnFg,
  },
  warnHeader: { fontSize: 13, fontWeight: '600', color: me.warnFg },
  warnItem: { fontSize: 12, color: me.warnFg, marginTop: 2 },
  warnCard: {
    padding: 12,
    backgroundColor: me.warnBg,
    borderRadius: 8,
    gap: 6,
  },
  warnCardTitle: { fontSize: 13, fontWeight: '600', color: me.warnFg },
  warnCardBody: { fontSize: 12, color: me.warnFg },
  errorBox: {
    padding: 12,
    backgroundColor: me.errBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: me.errFg,
  },
  errorText: { fontSize: 14, color: me.errFg },
  infoSection: {
    gap: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: me.ink,
  },
  infoItem: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: me.brandSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 2,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: me.ink,
    marginBottom: 2,
  },
  infoItemDesc: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
});

export default ContractorPayoutsScreen;
