/**
 * ServiceAreaPromptModal — Tier 1 step 3 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Nudges a contractor to set up their
 * service area so the nearby-jobs feed has a geographic centre
 * to bias on.
 *
 * Primary CTA navigates to BusinessTab/ServiceAreas (the existing
 * full-screen setup flow with CreateServiceAreaModal). Secondary
 * "Skip for now" records dismissal in AsyncStorage via the gate
 * hook. Same pageSheet layout as FirstPropertyPromptModal and
 * LocationSoftAskModal for visual consistency across the Tier 1
 * prompt chain.
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

interface ServiceAreaPromptModalProps {
  visible: boolean;
  onDismiss: () => void | Promise<unknown>;
  /**
   * Called after the user taps "Set up service area" and we've
   * navigated. The gate hook's `refresh()` should be wired here
   * so the modal auto-hides after the user returns with a
   * freshly created service area.
   */
  onAfterNavigate?: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'map-outline',
      text: 'Match with jobs inside your travel radius',
    },
    {
      icon: 'cash-outline',
      text: 'Set per-mile travel charges homeowners see upfront',
    },
    {
      icon: 'options-outline',
      text: 'Add more areas later as you grow',
    },
  ];

export const ServiceAreaPromptModal: React.FC<ServiceAreaPromptModalProps> = ({
  visible,
  onDismiss,
  onAfterNavigate,
}) => {
  const navigation = useNavigation<Navigation>();

  if (!visible) return null;

  const handleSetUp = () => {
    navigation.navigate('BusinessTab', { screen: 'ServiceAreas' });
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
            <Ionicons name='navigate' size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            Tell us where you work
          </Text>
          <Text style={styles.subtitle}>
            Set your service area so we can only show you jobs you actually want
            to travel to.
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
              You can update your trades, radius and travel rates any time from
              the Business tab.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSetUp}
            accessibilityRole='button'
            accessibilityLabel='Set up service area'
          >
            <Text style={styles.primaryButtonText}>Set Up Service Area</Text>
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
