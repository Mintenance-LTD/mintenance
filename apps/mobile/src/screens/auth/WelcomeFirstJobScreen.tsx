/**
 * WelcomeFirstJobScreen — Mint Editorial v2 (2026-05-22, from
 * `.design-bundle/.../redesign-v2/mobile-auth.html` screen 10).
 *
 * Final onboarding screen — fires once after a homeowner finishes
 * their post-signup setup. "You're in, <first name>." big serif
 * headline, three things they can do next, primary "Post my first
 * job" CTA sticky at the bottom.
 *
 * On "Post my first job" the screen pops the auth stack and
 * navigates the root tab navigator to `AddTab` so the QuickJob
 * modal opens. On "Explore the app first" it pops to the home tab.
 * Both paths complete the auth flow — AuthContext has already
 * transitioned at this point, so the screen is mounted inside the
 * main app, not the AuthNavigator (see route registration).
 */

import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  CommonActions,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import type { RootTabParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

// Canonical brand mark — same asset used by ResetPassword / Register
// / WelcomeScreen so the brand presence stays consistent throughout
// the auth + onboarding flow.
const appIcon = require('../../../assets/icon.png');

interface WelcomeFirstJobScreenProps {
  /** Called after the user picks their next action — dismisses the parent modal. */
  onComplete: () => void;
}

interface ActionRow {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
}

const ACTIONS: ReadonlyArray<ActionRow> = [
  {
    icon: 'camera-outline',
    title: 'Post your first job',
    hint: '30s with a photo, 1m without',
  },
  {
    icon: 'search-outline',
    title: 'Browse trades near you',
    hint: 'Saved for next time',
  },
  {
    icon: 'sparkles-outline',
    title: 'Ask Mint AI anything',
    hint: '“Is £200 fair for a boiler service?”',
  },
];

export const WelcomeFirstJobScreen: React.FC<WelcomeFirstJobScreenProps> = ({
  onComplete,
}) => {
  // Screen runs as a modal *inside* the main tab navigator (mounted
  // by OnboardingGateStack), so we navigate within Main's tab tree
  // rather than the previous broken `CommonActions.reset({routes:
  // [{name: 'Main'}]})` which targeted a sibling stack from inside
  // AuthNavigator and never fired.
  const tabNavigation = useNavigation<NavigationProp<RootTabParamList>>();
  const { user } = useAuth();

  const firstName = useMemo(() => {
    const raw = user?.firstName?.trim();
    return raw && raw.length > 0 ? raw : 'there';
  }, [user?.firstName]);

  const handlePostJob = () => {
    onComplete();
    // After the modal dismisses, push the user toward the post-job
    // entry point. `AddTab`'s tabPress listener opens the QuickJob
    // modal for homeowners and renders ExploreMap for contractors.
    tabNavigation.dispatch(CommonActions.navigate({ name: 'AddTab' }));
  };

  const handleExplore = () => {
    onComplete();
    tabNavigation.dispatch(CommonActions.navigate({ name: 'HomeTab' }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.brandTile}>
          <Image
            source={appIcon}
            style={styles.brandTileImage}
            resizeMode='contain'
            accessible={false}
          />
        </View>

        <Text style={styles.headline} accessibilityRole='header'>
          You're <Text style={styles.headlineAccent}>in</Text>, {firstName}.
        </Text>
        <Text style={styles.subhead}>
          Ready when you are. Snap a photo of something that needs fixing, or
          describe it — Mint takes care of the rest.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Three things you can do</Text>
          {ACTIONS.map((row, index) => (
            <View
              key={row.title}
              style={[styles.actionRow, index > 0 && styles.actionRowBorder]}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={row.icon} size={14} color={me.brand} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{row.title}</Text>
                <Text style={styles.actionHint}>{row.hint}</Text>
              </View>
              <Ionicons name='arrow-forward' size={14} color={me.ink3} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handlePostJob}
          activeOpacity={0.9}
          accessibilityRole='button'
          accessibilityLabel='Post my first job'
        >
          <Text style={styles.primaryBtnText}>+ Post my first job</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={handleExplore}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='Explore the app first'
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.exploreBtnText}>Explore the app first</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeFirstJobScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  brandTile: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },
  brandTileImage: {
    width: 56,
    height: 56,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 36,
    lineHeight: 40,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 8,
  },
  headlineAccent: {
    color: me.brand,
    fontStyle: 'italic',
  },
  subhead: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 21,
    marginBottom: 24,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: me.line,
    padding: 14,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  actionRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: me.ink,
  },
  actionHint: {
    fontSize: 11.5,
    color: me.ink3,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...me.shadow.btn,
  },
  primaryBtnText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  exploreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  exploreBtnText: {
    color: me.ink3,
    fontSize: 13,
  },
});
