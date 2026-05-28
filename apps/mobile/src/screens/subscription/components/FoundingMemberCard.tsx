import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * 2026-05-28 audit-89/T3 (mobile parity): founding-member card for
 * contractors with an early_access_grants row. Mirrors the web
 * FoundingMemberCard — replaces the generic trial chip + plan picker,
 * because grant holders have no trial and don't subscribe. The backend
 * (FeeCalculationService.resolveContractorTier) already gives them the
 * top-tier feature set and the 5% per-job platform fee, so showing
 * "Subscribe Now" plan cards would create Stripe rows they don't owe.
 */
export function FoundingMemberCard() {
  return (
    <View style={styles.foundingCard}>
      <View style={styles.foundingHeaderRow}>
        <Ionicons name='sparkles' size={20} color={me.okFg} />
        <View style={styles.foundingBody}>
          <Text style={styles.foundingTitle}>
            Founding member — early access
          </Text>
          <Text style={styles.foundingText}>
            You&apos;re part of the early-access cohort. No monthly subscription
            fee — we only take a small platform fee from each completed job.
            Your account permanently includes the top-tier feature set.
          </Text>
          <View style={styles.foundingBullets}>
            <Text style={styles.foundingBullet}>
              • <Text style={styles.foundingBulletStrong}>5% platform fee</Text>{' '}
              per completed job (lowest rate on the platform)
            </Text>
            <Text style={styles.foundingBullet}>
              • Unlimited jobs &amp; unlimited active jobs
            </Text>
            <Text style={styles.foundingBullet}>
              • Priority support &amp; advanced analytics
            </Text>
            <Text style={styles.foundingBullet}>
              • No monthly subscription — ever
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
