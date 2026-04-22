/**
 * FirstPropertyPromptModal — Phase 2 of the 2026-04-19 mobile
 * onboarding audit (§5.2 step 2). Nudges a freshly-onboarded
 * homeowner to add their first property BEFORE they hit the
 * "post a job" wall inside QuickJobModal.
 *
 * Primary CTA navigates to BusinessTab/AddProperty (the existing
 * full-screen form) — that route already exists and handles
 * address capture + persistence. Secondary "Skip for now" records
 * dismissal in AsyncStorage via the gate hook.
 *
 * Presentation: pageSheet modal (same style as PushSoftAskModal)
 * so the user still sees the home tab underneath and understands
 * the prompt is contextual rather than taking over the app.
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

interface FirstPropertyPromptModalProps {
  visible: boolean;
  onDismiss: () => void | Promise<unknown>;
  /**
   * Called after the user taps "Add property" and we've navigated
   * away. The gate hook's `refresh()` should be wired here so the
   * modal auto-hides after the user returns from AddPropertyScreen
   * with a freshly created property.
   */
  onAfterNavigate?: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'location-outline',
      text: 'Contractors know exactly where to meet you',
    },
    {
      icon: 'briefcase-outline',
      text: 'Post a job in seconds with pre-filled address',
    },
    {
      icon: 'shield-checkmark-outline',
      text: 'Keep jobs separate across multiple properties',
    },
  ];

export const FirstPropertyPromptModal: React.FC<
  FirstPropertyPromptModalProps
> = ({ visible, onDismiss, onAfterNavigate }) => {
  const navigation = useNavigation<Navigation>();

  if (!visible) return null;

  const handleAddProperty = () => {
    // Send the user into the existing full-screen form. We don't
    // want to dismiss-then-navigate because if navigation fails
    // (unlikely but possible) the user is left staring at a dead
    // dashboard. Navigate first; if it succeeds the modal becomes
    // covered naturally, and we close it on the next render cycle.
    navigation.navigate('BusinessTab', { screen: 'AddProperty' });
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
            <Ionicons name='home' size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            Add your property
          </Text>
          <Text style={styles.subtitle}>
            One last step before you can post a job — tell us where the work
            needs doing.
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
              name='lock-closed-outline'
              size={14}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.privacyText}>
              Your address is visible only to contractors you&apos;ve assigned
              to a job.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddProperty}
            accessibilityRole='button'
            accessibilityLabel='Add my property'
          >
            <Text style={styles.primaryButtonText}>Add My Property</Text>
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
