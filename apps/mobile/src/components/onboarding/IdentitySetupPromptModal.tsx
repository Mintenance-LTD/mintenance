/**
 * IdentitySetupPromptModal — Tier 1 step 5 of the 2026-04-19
 * mobile onboarding audit (§5.3). Active nudge for contractors
 * to submit identity + business details through the existing
 * ContractorVerificationScreen.
 *
 * Same pageSheet layout as the other Tier 1 prompts. Primary CTA
 * navigates to BusinessTab/ContractorVerification (the screen the
 * Phase 2.5 rewrite landed in commit 18d9a136 / follow-up
 * d69de7d7). Secondary "Skip for now" records dismissal.
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

interface IdentitySetupPromptModalProps {
  visible: boolean;
  onDismiss: () => void | Promise<unknown>;
  onAfterNavigate?: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'shield-checkmark-outline',
      text: 'Unlock the "Verified" badge on every bid you submit',
    },
    {
      icon: 'eye-outline',
      text: 'Appear in homeowner searches for your trade + area',
    },
    {
      icon: 'lock-open-outline',
      text: 'Required before you can place your first bid',
    },
  ];

export const IdentitySetupPromptModal: React.FC<
  IdentitySetupPromptModalProps
> = ({ visible, onDismiss, onAfterNavigate }) => {
  const navigation = useNavigation<Navigation>();

  if (!visible) return null;

  const handleStart = () => {
    navigation.navigate('BusinessTab', { screen: 'ContractorVerification' });
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
            <Ionicons
              name='person-circle-outline'
              size={52}
              color={theme.colors.primary}
            />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            Verify your identity
          </Text>
          <Text style={styles.subtitle}>
            Homeowners need to trust who they&apos;re letting into their home.
            Add your business details so we can verify you before your first
            bid.
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
              Usually reviewed in 24–48 hours. You can keep browsing jobs
              while we check your details.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            accessibilityRole='button'
            accessibilityLabel='Start verification'
          >
            <Text style={styles.primaryButtonText}>Start Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              void onDismiss();
            }}
            accessibilityRole='button'
            accessibilityLabel='Skip for now'
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
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
