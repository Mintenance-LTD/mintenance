/**
 * WelcomeScreen — Mint Editorial v2 redesign (2026-05-22).
 *
 * Implements the mobile welcome + role-pick frame from
 * `.design-bundle/.../redesign-v2/auth.html` (MWelcome + MRolePick).
 *
 *   - Leaf icon tile in --brand on bg --bg.
 *   - Instrument-style display headline ("Trusted trades in your pocket.")
 *     in the bundled Inter-Black display face.
 *   - Three full-width role tiles (homeowner / contractor / both) with
 *     brand border + brand-soft fill when selected, in keeping with the
 *     design's MRolePick spec.
 *   - Continue CTA at bottom; "Sign in" as a footer link.
 *
 * Brand rule: no emoji in product UI (CLAUDE.md content fundamentals).
 * Tiles use Ionicons (`home-outline`, `construct-outline`, `swap-horizontal`)
 * to mirror the design's emoji slots.
 */

import React, { useState } from 'react';
import {
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
import { me } from '../../design-system/mint-editorial';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

type RoleChoice = 'homeowner' | 'contractor' | 'both';

interface RoleTile {
  id: RoleChoice;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
}

const ROLE_TILES: ReadonlyArray<RoleTile> = [
  {
    id: 'homeowner',
    icon: 'home-outline',
    title: 'I need work done',
    subtitle: 'Post jobs, compare bids, pay via escrow.',
    accessibilityLabel: 'Continue as homeowner — I need work done',
  },
  {
    id: 'contractor',
    icon: 'construct-outline',
    title: 'I’m a tradesperson',
    subtitle: 'Find local jobs, get paid fast, build reviews.',
    accessibilityLabel: 'Continue as a tradesperson',
  },
  {
    id: 'both',
    icon: 'swap-horizontal-outline',
    title: 'Both',
    subtitle: 'Switch between modes from your profile.',
    accessibilityLabel: 'Continue with both modes',
  },
];

const LeafGlyph = ({
  size = 28,
  color = me.onBrand,
}: {
  size?: number;
  color?: string;
}) => <Ionicons name='leaf' size={size} color={color} />;

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const [selected, setSelected] = useState<RoleChoice>('homeowner');

  const handleContinue = () => {
    // "Both" routes through homeowner today — the multi-role toggle
    // lives in profile post-signup. Roles map 1:1 to the existing
    // Register screen param.
    const role: 'homeowner' | 'contractor' =
      selected === 'contractor' ? 'contractor' : 'homeowner';
    navigation.navigate('Register', { role });
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <LeafGlyph />
          </View>
        </View>

        <Text style={styles.title} accessibilityRole='header'>
          Trusted trades{'\n'}in your pocket.
        </Text>
        <Text style={styles.subtitle}>
          Post a job, compare real bids, pay only when the work is right.
        </Text>

        <Text style={styles.eyebrow}>How will you use Mintenance?</Text>
        <Text style={styles.subSmall}>You can switch any time.</Text>

        <View style={styles.tiles}>
          {ROLE_TILES.map((tile) => {
            const active = selected === tile.id;
            return (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, active && styles.tileActive]}
                onPress={() => setSelected(tile.id)}
                accessibilityRole='radio'
                accessibilityState={{ checked: active }}
                accessibilityLabel={tile.accessibilityLabel}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.tileIconWrap,
                    active && styles.tileIconWrapActive,
                  ]}
                >
                  <Ionicons
                    name={tile.icon}
                    size={22}
                    color={active ? me.onBrand : me.brand}
                  />
                </View>
                <View style={styles.tileBody}>
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
                </View>
                {active ? (
                  <View style={styles.tileCheck}>
                    <Ionicons name='checkmark' size={14} color={me.onBrand} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleContinue}
          accessibilityRole='button'
          accessibilityLabel='Continue with selected role'
          activeOpacity={0.9}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
          <Ionicons name='arrow-forward' size={16} color={me.onBrand} />
        </TouchableOpacity>

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
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  brandRow: {
    marginBottom: 24,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 40,
    lineHeight: 44,
    color: me.ink,
    marginBottom: 12,
    letterSpacing: me.displayTracking,
  },
  subtitle: {
    fontSize: 15,
    color: me.ink2,
    lineHeight: 22,
    marginBottom: 28,
  },
  eyebrow: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  subSmall: {
    fontSize: 13,
    color: me.ink2,
    marginBottom: 16,
  },
  tiles: {
    gap: 10,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    borderWidth: 1.5,
    borderColor: me.line,
    padding: 14,
    gap: 12,
  },
  tileActive: {
    backgroundColor: me.brandSoft,
    borderColor: me.brand,
  },
  tileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconWrapActive: {
    backgroundColor: me.brand,
  },
  tileBody: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
    color: me.ink2,
    lineHeight: 16,
  },
  tileCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    backgroundColor: me.bg,
  },
  primaryBtn: {
    height: 52,
    borderRadius: me.radius.btn,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...me.shadow.btn,
  },
  primaryBtnText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 4,
  },
  signInLabel: {
    fontSize: 14,
    color: me.ink2,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
    color: me.brand,
  },
});
