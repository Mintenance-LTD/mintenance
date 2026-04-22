/**
 * StripeConnectPromptModal — Tier 2 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Fires when a contractor has just won
 * a bid but hasn't finished Stripe Connect onboarding.
 *
 * Primary CTA navigates to BusinessTab/Payouts (the existing
 * ContractorPayoutsScreen which handles the Stripe-hosted
 * onboarding via expo-web-browser + deep-link return). We don't
 * re-implement the Stripe flow here — this is the nudge that
 * pulls the contractor to it at the right moment.
 */

import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../../theme';

type Navigation = NavigationProp<Record<string, object | undefined>>;

interface StripeConnectPromptModalProps {
  visible: boolean;
  onDismiss: () => void | Promise<unknown>;
  onAfterNavigate?: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'cash-outline',
      text: 'Receive your Protected Payment the moment homeowners approve',
    },
    {
      icon: 'lock-closed-outline',
      text: 'Bank-level security — Stripe handles your details, we never see them',
    },
    {
      icon: 'time-outline',
      text: 'Takes about 5 minutes. Required before your first payout',
    },
  ];

export const StripeConnectPromptModal: React.FC<
  StripeConnectPromptModalProps
> = ({ visible, onDismiss, onAfterNavigate }) => {
  const navigation = useNavigation<Navigation>();

  if (!visible) return null;

  const handleStart = () => {
    navigation.navigate('BusinessTab', { screen: 'Payouts' });
    if (onAfterNavigate) {
      void onAfterNavigate();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={() => {
        void onDismiss();
      }}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name='trophy' size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            You won a job — let&apos;s get you paid
          </Text>
          <Text style={styles.subtitle}>
            Set up your payout account so the money lands as soon as the
            homeowner approves the work.
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.icon} style={styles.benefitRow}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons
                    name={b.icon}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.privacyNote}>
            <Ionicons
              name='information-circle-outline'
              size={14}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.privacyText}>
              Stripe is a licensed UK payment institution. You&apos;ll fill in
              your details on their site; we only see confirmation that it
              succeeded.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            accessibilityRole='button'
            accessibilityLabel='Set up payouts'
          >
            <Text style={styles.primaryButtonText}>Set Up Payouts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              void onDismiss();
            }}
            accessibilityRole='button'
            accessibilityLabel='Remind me later'
          >
            <Text style={styles.secondaryButtonText}>Remind me later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  benefits: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
