/**
 * FinishSetupCard — dashboard "Finish setup" checklist.
 *
 * Phase 1.3 of the 2026-04-19 mobile-onboarding-audit plan.
 * Rendered on both the HomeownerDashboard and ContractorDashboard.
 *
 * Self-hides when `progress.shouldShow` is false (every step
 * complete, or loading, or no user). The hook owns the logic;
 * this component is just the presentation + the action dispatch
 * table that maps each `OnboardingActionKey` to a screen.
 *
 * Navigation plumbing
 * --------------------
 * The card lives under the tab navigator, so to reach screens
 * in sibling stacks (ProfileTab / BusinessTab) we call
 * `navigation.navigate('ProfileTab', { screen: 'Foo' })` at the
 * root level. The `NavigationProp` here is loosely typed
 * because each dashboard gets its own typed `useNavigation`
 * binding — trying to thread a single strict type through all
 * stacks is more friction than it's worth for three callers.
 */

import React from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { NotificationService } from '../../../services/NotificationService';
import { useAuth } from '../../../contexts/AuthContext';
import { useOnboardingProgress } from '../../../hooks/useOnboardingProgress';
import type { OnboardingActionKey } from '../../../hooks/useOnboardingProgress';
import { logger } from '../../../utils/logger';
import { me } from '../../../design-system/mint-editorial';

type Navigation = NavigationProp<Record<string, object | undefined>>;

export const FinishSetupCard: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const progress = useOnboardingProgress();

  if (!progress.shouldShow) return null;

  const handleAction = async (key: OnboardingActionKey) => {
    switch (key) {
      case 'verify_email':
        // Email-verification pending screen lives in the Auth stack —
        // only reachable when the user is signed out. If they're
        // already signed in and unverified, they shouldn't normally
        // land here (Supabase usually returns a session post-confirm),
        // so the intent is "go re-read your inbox". Deep-link the
        // mail app directly.
        try {
          const scheme = Platform.OS === 'ios' ? 'message:' : 'mailto:';
          const canOpen = await Linking.canOpenURL(scheme);
          await Linking.openURL(canOpen ? scheme : 'mailto:');
        } catch (err) {
          logger.warn('FinishSetupCard: failed to open mail app', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      case 'add_photo':
        navigation.navigate('ProfileTab', { screen: 'EditProfile' });
        return;
      case 'add_property':
        navigation.navigate('BusinessTab', { screen: 'AddProperty' });
        return;
      case 'verify_business':
        navigation.navigate('BusinessTab', {
          screen: 'ContractorVerification',
        });
        return;
      case 'setup_payouts':
        navigation.navigate('BusinessTab', { screen: 'Payouts' });
        return;
      case 'enable_push':
        // Fires the iOS system dialog if status is 'undetermined'
        // (see NotificationService.initialize). If the user already
        // said no, the system dialog won't re-show and the user
        // has to go through Settings — the usePushSoftAskGate
        // 'denied' branch handles that UX, but from a card CTA we
        // just try the happy path and settle if blocked.
        try {
          const token = await NotificationService.initialize({
            promptIfUndetermined: true,
          });
          if (token && user?.id) {
            await NotificationService.savePushToken(user.id, token);
          }
        } catch (err) {
          logger.warn('FinishSetupCard: enable push failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
        // Re-probe state so the card updates.
        await progress.refresh();
        return;
      default:
        // Exhaustiveness check — switch covers every OnboardingActionKey.
        return;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name='sparkles' size={18} color={me.brand} />
          <Text style={styles.title}>Finish setting up</Text>
        </View>
        <Text style={styles.progressText}>
          {progress.completed} of {progress.total}
        </Text>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.round(progress.fraction * 100)}%` },
          ]}
        />
      </View>

      <View style={styles.stepsList}>
        {progress.steps.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={styles.stepRow}
            onPress={() => handleAction(step.actionKey)}
            disabled={step.complete}
            accessibilityRole='button'
            accessibilityLabel={
              step.complete
                ? `${step.title} — completed`
                : `${step.title}. ${step.description}`
            }
            accessibilityState={{ disabled: step.complete }}
          >
            <View
              style={[
                styles.stepIconWrap,
                step.complete && styles.stepIconWrapComplete,
              ]}
            >
              {step.complete ? (
                <Ionicons name='checkmark' size={16} color={me.onBrand} />
              ) : (
                <Ionicons name={step.icon} size={16} color={me.brand} />
              )}
            </View>
            <View style={styles.stepTextWrap}>
              <Text
                style={[
                  styles.stepTitle,
                  step.complete && styles.stepTitleComplete,
                ]}
              >
                {step.title}
              </Text>
              <Text
                style={[
                  styles.stepDescription,
                  step.complete && styles.stepDescriptionComplete,
                ]}
                numberOfLines={1}
              >
                {step.description}
              </Text>
            </View>
            {!step.complete && (
              <Ionicons name='chevron-forward' size={18} color={me.ink3} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: me.bg2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: me.brand,
    borderRadius: 3,
  },
  stepsList: {
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconWrapComplete: {
    backgroundColor: me.brand,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  stepTitleComplete: {
    color: me.ink2,
    textDecorationLine: 'line-through',
  },
  stepDescription: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 2,
  },
  stepDescriptionComplete: {
    color: me.ink3,
  },
});
