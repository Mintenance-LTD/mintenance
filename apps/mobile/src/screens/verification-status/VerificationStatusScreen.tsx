/**
 * VerificationStatusScreen — Contractor's view of where they stand on
 * the Mintenance trust checklist.
 *
 * Reference: redesign-v2 / contractor-mobile-audit.html, screen 07
 * "Verification". Mint Editorial styling — paper background, serif
 * "Premium verified" headline, conic-gradient progress ring, per-credential
 * rows with status pill (✓ / Renew / + Add).
 *
 * Distinct from ContractorVerificationScreen — that one is the *submission*
 * form (company name + license + insurance fields). This one is the
 * *dashboard* view of what's already verified and what's expiring.
 *
 * Reads from GET /api/verification/my-credentials. The mapping from
 * registry rows to UI rows is deterministic (one slot per `register`
 * value); slots without a matching row render as "+ Add" prompts.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<
  ProfileStackParamList,
  'VerificationStatus'
>;

interface CredentialRow {
  id: string;
  register: string;
  registration_number: string | null;
  status: 'pending' | 'verified' | 'rejected' | string;
  verified_at: string | null;
  expires_at: string | null;
  rejected_reason: string | null;
  created_at: string;
}

type SlotState = 'ok' | 'warn' | 'pending' | 'rejected' | 'todo';

interface Slot {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Bonus credentials don't count toward the "Premium verified" %.
  optional?: boolean;
}

// The six checklist slots the design surfaces, in the same order.
// Keep this in sync with the `register` enum values the verification
// submit-credential route accepts.
const SLOTS: readonly Slot[] = [
  { key: 'photo_id', title: 'Photo ID', icon: 'card-outline' },
  { key: 'gas_safe', title: 'Gas Safe', icon: 'flame-outline' },
  { key: 'niceic', title: 'NICEIC', icon: 'flash-outline' },
  {
    key: 'public_liability_insurance',
    title: 'Public liability insurance',
    icon: 'shield-checkmark-outline',
  },
  {
    key: 'reference',
    title: 'Reference from past job',
    icon: 'create-outline',
    optional: true,
  },
  {
    key: 'dbs_check',
    title: 'DBS check',
    icon: 'person-outline',
    optional: true,
  },
];

const RENEWAL_WINDOW_DAYS = 30;

const formatRelativeExpiry = (iso: string | null): string | null => {
  if (!iso) return null;
  const expiry = new Date(iso);
  if (Number.isNaN(expiry.getTime())) return null;
  const now = Date.now();
  const diffDays = Math.floor((expiry.getTime() - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  if (diffDays <= RENEWAL_WINDOW_DAYS)
    return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  return `Renews ${expiry.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
};

const formatVerifiedSince = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Verified ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
};

const resolveState = (cred: CredentialRow | undefined): SlotState => {
  if (!cred) return 'todo';
  if (cred.status === 'pending') return 'pending';
  if (cred.status === 'rejected') return 'rejected';
  if (cred.status !== 'verified') return 'todo';
  if (cred.expires_at) {
    const diff =
      (new Date(cred.expires_at).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    if (diff < RENEWAL_WINDOW_DAYS) return 'warn';
  }
  return 'ok';
};

const resolveSubtitle = (
  slot: Slot,
  cred: CredentialRow | undefined
): string => {
  if (!cred)
    return slot.optional
      ? slot.key === 'dbs_check'
        ? 'Optional — boosts trust'
        : 'Add up to 3'
      : 'Tap to add';
  if (cred.status === 'pending') return 'Under review — usually within 48h';
  if (cred.status === 'rejected')
    return cred.rejected_reason || 'Re-submit to retry';
  if (cred.status !== 'verified') return 'Not started';
  if (cred.expires_at) {
    const expiry = formatRelativeExpiry(cred.expires_at);
    if (cred.registration_number)
      return `Reg #${cred.registration_number} · ${expiry ?? ''}`.trim();
    return expiry ?? formatVerifiedSince(cred.verified_at) ?? 'Verified';
  }
  if (cred.registration_number) return `Reg #${cred.registration_number}`;
  return formatVerifiedSince(cred.verified_at) ?? 'Verified';
};

interface Props {
  navigation: Nav;
}

export const VerificationStatusScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-credentials'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ credentials: CredentialRow[] }>(
        '/api/verification/my-credentials'
      );
      return res.credentials ?? [];
    },
  });

  const credByKey = useMemo(() => {
    const map = new Map<string, CredentialRow>();
    for (const c of data ?? []) {
      // Take the most recent row per `register` (the array is already
      // ordered DESC by created_at server-side).
      if (!map.has(c.register)) map.set(c.register, c);
    }
    return map;
  }, [data]);

  const slotStates = useMemo(
    () => SLOTS.map((s) => ({ slot: s, cred: credByKey.get(s.key) })),
    [credByKey]
  );

  // % verified counts toward the "Premium verified" badge from the
  // mandatory checklist slots only (optional credentials are bonus).
  const mandatorySlots = slotStates.filter((s) => !s.slot.optional);
  const verifiedMandatory = mandatorySlots.filter(
    (s) => resolveState(s.cred) === 'ok'
  ).length;
  const verifiedPct =
    mandatorySlots.length > 0
      ? Math.round((verifiedMandatory / mandatorySlots.length) * 100)
      : 0;

  const navigateToSubmit = () => navigation.navigate('ContractorVerification');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='arrow-back' size={22} color={me.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Verification</Text>
          <Text style={styles.headerSubtitle}>
            What you’ve shown us, and when it expires.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={me.brand} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn’t load your credentials.</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.errorRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress dial */}
          <View style={styles.progressCard}>
            <View
              style={[
                styles.progressRing,
                {
                  borderColor: verifiedPct >= 100 ? me.brand : me.bg3,
                },
              ]}
            >
              <View style={styles.progressRingInner}>
                <Text style={styles.progressPct}>
                  {verifiedPct}
                  <Text style={styles.progressPctUnit}>%</Text>
                </Text>
              </View>
            </View>
            <View style={styles.progressContent}>
              <Text style={styles.progressTitle}>
                {verifiedPct >= 100
                  ? 'Premium verified'
                  : verifiedPct > 0
                    ? 'Trusted on Mintenance'
                    : 'Get verified'}
              </Text>
              <Text style={styles.progressBody}>
                Verified contractors get seen 3× more on bids and rank higher in
                homeowner search.
              </Text>
              {verifiedPct < 100 && (
                <Pressable onPress={navigateToSubmit}>
                  <Text style={styles.progressCta}>
                    + Add credentials to reach 100%
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Slot rows */}
          {slotStates.map(({ slot, cred }, idx) => {
            const state = resolveState(cred);
            return (
              <Pressable
                key={slot.key}
                onPress={navigateToSubmit}
                style={({ pressed }) => [
                  styles.row,
                  idx === 0 && styles.rowFirst,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole='button'
                accessibilityLabel={`${slot.title} — ${resolveSubtitle(slot, cred)}`}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={slot.icon} size={18} color={me.brand} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{slot.title}</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={2}>
                    {resolveSubtitle(slot, cred)}
                  </Text>
                </View>
                {state === 'ok' && (
                  <Ionicons
                    name='checkmark'
                    size={20}
                    color={me.brand}
                    accessibilityLabel='Verified'
                  />
                )}
                {state === 'warn' && (
                  <View style={[styles.pill, styles.pillWarn]}>
                    <Text style={styles.pillWarnText}>Renew</Text>
                  </View>
                )}
                {state === 'pending' && (
                  <View style={[styles.pill, styles.pillInfo]}>
                    <Text style={styles.pillInfoText}>In review</Text>
                  </View>
                )}
                {state === 'rejected' && (
                  <View style={[styles.pill, styles.pillError]}>
                    <Text style={styles.pillErrorText}>Re-submit</Text>
                  </View>
                )}
                {state === 'todo' && <Text style={styles.todoLink}>+ Add</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default VerificationStatusScreen;
