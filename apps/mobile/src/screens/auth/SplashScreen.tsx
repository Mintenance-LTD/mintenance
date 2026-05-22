/**
 * SplashScreen — Mint Editorial v2 (2026-05-22, from
 * `.design-bundle/.../redesign-v2/mobile-auth.html` screen 01).
 *
 * Brand-gradient full-bleed first impression. Watermark leaf, large
 * serif-styled headline, three ranked CTAs:
 *   1. Create account (primary, white-on-mint)
 *   2. Sign in (secondary, glass)
 *   3. Continue as guest (ghost link)
 *
 * Sits ahead of the existing role-picker (WelcomeScreen) as the new
 * AuthNavigator initial route. Returning users tap "Sign in" → Login;
 * new users tap "Create account" → Welcome (role pick) → Register.
 *
 * "Continue as guest" is a no-op placeholder — the app doesn't yet
 * have an anonymous browse mode wired, so the tile surfaces a
 * "coming soon" alert rather than dead-ending the user.
 */

import React from 'react';
import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

// Canonical brand mark — bundled by Expo at build time. Same asset
// used by ResetPasswordScreen, RegisterScreen and the old
// WelcomeScreen header so the brand presence is consistent across
// the auth stack.
const appIcon = require('../../../assets/icon.png');

type SplashScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Splash'
>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();

  const handleCreateAccount = () => {
    navigation.navigate('Welcome');
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const handleGuest = () => {
    Alert.alert(
      'Continue as guest',
      'Guest browsing is coming soon. For now, create a free account to post jobs or sign in to your existing one.'
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle='light-content' />
      {/* Canonical brand gradient — two-stop brand2 → brand. The
          mobile-auth.html spec's three-stop variant added a lighter
          mint highlight (`#5BA897`) that isn't part of the shared
          design-tokens palette; using the two-stop form keeps the
          screen on theme. */}
      <LinearGradient
        colors={[me.brand2, me.brand] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative brand watermark — bottom-right, very low opacity.
          Uses the same icon asset as the foreground tile, tinted via
          tintColor + opacity so the silhouette reads against the
          mint gradient without competing with the headline. */}
      <View style={styles.watermark} pointerEvents='none'>
        <Image
          source={appIcon}
          style={styles.watermarkImage}
          resizeMode='contain'
          accessible={false}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.contentBlock}>
          <View style={styles.logoTile}>
            <Image
              source={appIcon}
              style={styles.logoImage}
              resizeMode='contain'
              accessible={false}
            />
          </View>

          <Text style={styles.headline} accessibilityRole='header'>
            Trusted trades.{'\n'}Held safe.
          </Text>
          <Text style={styles.subhead}>
            Post jobs, compare real bids, pay only when the work is right.
          </Text>

          <View style={styles.ctaStack}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateAccount}
              activeOpacity={0.9}
              accessibilityRole='button'
              accessibilityLabel='Create a new Mintenance account'
            >
              <Text style={styles.primaryBtnText}>Create account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSignIn}
              activeOpacity={0.85}
              accessibilityRole='button'
              accessibilityLabel='Sign in to an existing account'
            >
              <Text style={styles.secondaryBtnText}>Sign in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuest}
              activeOpacity={0.7}
              accessibilityRole='button'
              accessibilityLabel='Continue as guest'
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.guestBtnText}>Continue as guest →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: me.brand2,
  },
  safe: {
    flex: 1,
  },
  watermark: {
    position: 'absolute',
    right: -180,
    bottom: -180,
    width: 520,
    height: 520,
    opacity: 0.08,
    transform: [{ rotate: '-10deg' }],
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  contentBlock: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: me.onBrand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 44,
    lineHeight: 48,
    color: me.onBrand,
    letterSpacing: me.displayTracking,
    marginBottom: 14,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 36,
  },
  ctaStack: {
    gap: 10,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: me.onBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: me.brand2,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
  guestBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
});
