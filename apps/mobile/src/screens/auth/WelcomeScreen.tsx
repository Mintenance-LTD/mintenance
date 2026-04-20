/**
 * WelcomeScreen — Phase 2 Screen 0 of the 2026-04-19 mobile
 * onboarding audit. Pre-signup landing that offers a role choice
 * before the registration form opens.
 *
 * Per PDF §5.1:
 *   Goal: Set the promise of the platform in two sentences. Offer
 *   a role choice up-front so the app can branch deep links,
 *   permission copy and downstream screens.
 *
 *   Content: Brand mark, one-line value prop, two large tiles:
 *   "I need work done" (Homeowner) and "I take on work"
 *   (Contractor). Tertiary link: Sign in.
 *
 *   Why: Replaces the current pattern where OnboardingSwiper fires
 *   after sign-in. Knowing the role before signup lets you render
 *   a role-appropriate signup and avoids collecting fields the
 *   wrong way.
 *
 * This screen is the new AuthStack initialRouteName. Existing
 * deep-links to Login still work (the "Sign in" link routes there);
 * existing deep-links to Register still work (the Register nav
 * param `role` is optional, defaults to 'homeowner' when absent).
 */

import React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

const appIcon = require('../../../assets/icon.png');

interface RoleTile {
  role: 'homeowner' | 'contractor';
  emoji: string;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
}

const ROLE_TILES: ReadonlyArray<RoleTile> = [
  {
    role: 'homeowner',
    emoji: '🏠',
    title: 'I need work done',
    subtitle:
      'Post a job, compare bids from verified contractors, pay only when the work is complete.',
    accessibilityLabel:
      'Continue as homeowner — I need work done on my property',
  },
  {
    role: 'contractor',
    emoji: '🛠️',
    title: 'I take on work',
    subtitle:
      'Find local jobs matched to your trade, bid with confidence, get paid through Protected Payment.',
    accessibilityLabel: 'Continue as contractor — I want to take on work',
  },
];

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleRolePick = (role: 'homeowner' | 'contractor') => {
    navigation.navigate('Register', { role });
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={appIcon} style={styles.logo} resizeMode='contain' />
          <Text style={styles.brand}>Mintenance</Text>
        </View>

        <View style={styles.valueProp}>
          <Text style={styles.valueTitle} accessibilityRole='header'>
            Property work, priced fairly,
            {'\n'}
            paid securely.
          </Text>
          <Text style={styles.valueSubtitle}>
            Pick how you want to use Mintenance to get started.
          </Text>
        </View>

        <View style={styles.tiles}>
          {ROLE_TILES.map((tile) => (
            <TouchableOpacity
              key={tile.role}
              style={styles.tile}
              onPress={() => handleRolePick(tile.role)}
              accessibilityRole='button'
              accessibilityLabel={tile.accessibilityLabel}
              activeOpacity={0.85}
            >
              <View style={styles.tileIconWrap}>
                <Text style={styles.tileEmoji}>{tile.emoji}</Text>
              </View>
              <View style={styles.tileBody}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
              </View>
              <Ionicons
                name='chevron-forward'
                size={22}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.signInRow}>
          <Text style={styles.signInLabel}>Already have an account?</Text>
          <TouchableOpacity
            onPress={handleSignIn}
            accessibilityRole='button'
            accessibilityLabel='Sign in to an existing account'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  valueProp: {
    marginBottom: 32,
  },
  valueTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  valueSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  tiles: {
    gap: 14,
    marginBottom: 32,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 14,
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
  tileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: {
    fontSize: 28,
  },
  tileBody: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 16,
  },
  signInLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
