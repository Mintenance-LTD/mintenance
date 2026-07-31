/**
 * PhoneVerificationBanner — proactive nudge on homeowner posting
 * surfaces (mobile parity with web's VerificationBanner). Shows only
 * for homeowners whose profiles.phone_verified is false, so the user
 * can verify BEFORE filling in a whole job instead of discovering the
 * gate via the 403 at submit time. Tapping it opens the same
 * PhoneVerificationModal the reactive gate uses.
 *
 * Reads status from GET /api/users/profile (profiles is column-grant
 * locked against direct client selects). Renders nothing while the
 * status is loading/unknown — a flash of "verify your phone" at an
 * already-verified user would be worse than appearing a beat late.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';
import { PhoneVerificationModal } from './PhoneVerificationModal';

export const PHONE_VERIFICATION_STATUS_KEY = 'phone-verification-status';

interface ProfileVerificationResponse {
  profile?: { phone_verified?: boolean | null } | null;
  /**
   * Server-side beta switch (BETA_OPEN_ACCESS). Absent on older API
   * deployments, in which case we fall back to the historic behaviour
   * of nudging whenever the phone is unverified.
   */
  phoneVerificationRequired?: boolean;
}

interface PhoneVerificationBannerProps {
  /**
   * Layout adjustments for the host screen — e.g. horizontal margin
   * on screens whose scroll container has no padding of its own. The
   * base style deliberately carries no horizontal margin because most
   * posting surfaces already pad their content 20px.
   */
  style?: StyleProp<ViewStyle>;
}

export const PhoneVerificationBanner: React.FC<
  PhoneVerificationBannerProps
> = ({ style }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const isHomeowner = user?.role === 'homeowner';

  const { data } = useQuery({
    queryKey: [PHONE_VERIFICATION_STATUS_KEY, user?.id],
    queryFn: () =>
      mobileApiClient.get<ProfileVerificationResponse>('/api/users/profile'),
    enabled: !!user && isHomeowner,
    staleTime: 30_000,
  });

  // Only render on an explicit false — not while loading (undefined)
  // and not for contractors, whose posting isn't phone-gated. During
  // the beta the server reports the requirement as waived, so the
  // nudge goes away without needing an EAS rebuild.
  if (
    !isHomeowner ||
    data?.phoneVerificationRequired === false ||
    data?.profile?.phone_verified !== false
  ) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        testID='phone-verification-banner'
        style={[styles.banner, style]}
        onPress={() => setModalVisible(true)}
        accessibilityRole='button'
        accessibilityLabel='Verify your phone number to post jobs'
      >
        <View style={styles.iconWrap}>
          <Ionicons name='call-outline' size={16} color={me.warnFg} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Verify your phone to post jobs</Text>
          <Text style={styles.subtitle}>
            Takes under a minute — tap to get a code by text.
          </Text>
        </View>
        <Ionicons name='chevron-forward' size={18} color={me.warnFg} />
      </TouchableOpacity>
      <PhoneVerificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onVerified={() => {
          setModalVisible(false);
          // Refresh the status so this banner (and any sibling) hides.
          queryClient.invalidateQueries({
            queryKey: [PHONE_VERIFICATION_STATUS_KEY],
          });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.warnBg,
    borderRadius: me.radius.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: me.warnFg,
  },
  subtitle: {
    fontSize: 12,
    color: me.warnFg,
    marginTop: 1,
  },
});
