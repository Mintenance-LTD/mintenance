// screens/LandingScreen.tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

const heroImg = { uri: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1600' };
const appIcon = require('../../assets/icon.png');

const CATEGORIES = [
  { key: 'plumbing',  label: 'Plumbing',  icon: 'water-outline' },
  { key: 'electrical',label: 'Electrical',icon: 'flash-outline' },
  { key: 'roofing',   label: 'Roofing',   icon: 'home-outline' },
  { key: 'painting',  label: 'Painting',  icon: 'color-palette-outline' },
  { key: 'cleaning',  label: 'Cleaning',  icon: 'sparkles-outline' },
  { key: 'gardening', label: 'Gardening', icon: 'leaf-outline' },
];

export default function LandingScreen() {
  const navigation = useNavigation<unknown>();
  const scrollViewRef = useRef<ScrollView>(null);
  const featuresViewRef = useRef<View>(null);

  const scrollToFeatures = () => {
    // Scroll to approximately where the features section starts (after hero)
    scrollViewRef.current?.scrollTo({ y: 420, animated: true });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topbar}>
        <View style={styles.brandRow}>
          <Image source={appIcon} style={styles.logoIcon} />
          <Text style={styles.logoText}>Mintenance</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            accessibilityRole='link'
            accessibilityLabel='Sign in to your account'
          >
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Register')}
            accessibilityRole='button'
            accessibilityLabel='Get started with Mintenance'
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* HERO — home maintenance focused */}
        <View style={styles.heroWrap}>
          <ImageBackground source={heroImg} style={styles.heroBg} imageStyle={{ borderRadius: 24 }}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color={theme.colors.secondary} />
                <Text style={styles.badgeText}>Smart Matching • Escrow • Live Chat</Text>
              </View>

              <Text style={styles.heroTitle} accessibilityRole='header'>Find Trusted Home Contractors Fast</Text>
              <Text style={styles.heroSub}>
                Post your home project, compare verified contractor bids, chat in real time and pay securely — all in one seamless platform.
              </Text>

              <View style={styles.heroCTAs}>
                <TouchableOpacity
                  style={styles.ctaSolid}
                  onPress={() => navigation.navigate('Register')}
                  accessibilityRole='button'
                  accessibilityLabel='Start free registration'
                >
                  <Text style={styles.ctaSolidText}>Start Free →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ctaGhost}
                  onPress={scrollToFeatures}
                  accessibilityRole='button'
                  accessibilityLabel='See how Mintenance works'
                >
                  <Text style={styles.ctaGhostText}>See How It Works</Text>
                </TouchableOpacity>
              </View>

              {/* trust indicators */}
              <View style={styles.trustRow}>
                <TrustPill icon="star" text="4.9★ avg rating" />
                <TrustPill icon="shield-checkmark" text="Escrow protected" />
                <TrustPill icon="chatbubble-ellipses" text="Instant chat" />
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* SERVICES — home maintenance categories */}
        <SectionHeader
          title="Home Services"
          action="See All"
          onActionPress={() => navigation.navigate('Modal', { screen: 'ServiceRequest' })}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={styles.chip}
              accessibilityRole='button'
              accessibilityLabel={`${c.label} services`}
            >
              <Ionicons name={c.icon as unknown} size={18} color={theme.colors.primary} />
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* KEY FEATURES — 2×2 grid */}
        <SectionHeader title="Why Choose Mintenance?" />
        <View style={styles.featuresGrid}>
          <View style={styles.featuresRow}>
            <Feature icon="flash-outline"  title="Instant Quotes"  text="Post once, get multiple bids fast." />
            <Feature icon="map-outline"    title="Local Pros"     text="Find contractors near you." />
          </View>
          <View style={styles.featuresRow}>
            <Feature icon="card-outline"   title="Secure Payments" text="Escrow protection included." />
            <Feature icon="shield-outline" title="Verified Reviews" text="Real projects, honest ratings." />
          </View>
        </View>

        {/* SIMPLE FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Mintenance • Privacy • Terms • Support</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, onActionPress }: { title: string; action?: string; onActionPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>{title}</Text>
      {action ? (
        <TouchableOpacity
          onPress={onActionPress}
          accessibilityRole='button'
          accessibilityLabel={`${action} ${title}`}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Feature({ icon, title, text }: { icon: unknown; title: string; text: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.secondary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function TrustPill({ icon, text }: { icon: unknown; text: string }) {
  return (
    <View style={styles.trustPill}>
      <Ionicons name={icon} size={14} color={theme.colors.white} />
      <Text style={styles.trustPillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  topbar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? { position: 'sticky' as unknown, top: 0, zIndex: 50, backgroundColor: theme.colors.background } : {}),
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: {
    width: 28, height: 28, borderRadius: 8,
  },
  logoText: { marginLeft: 10, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { color: theme.colors.textPrimary, opacity: 0.8 },
  primaryBtn: { backgroundColor: theme.colors.secondaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryBtnText: { color: theme.colors.white, fontWeight: '600' },

  heroWrap: { paddingHorizontal: 20, marginTop: 8 },
  heroBg: { height: 280, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  heroContent: { padding: 16 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badgeText: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' },
  heroTitle: { color: theme.colors.white, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: theme.colors.white, opacity: 0.95, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  heroCTAs: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  ctaSolid: { backgroundColor: theme.colors.secondaryLight, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  ctaSolidText: { color: theme.colors.white, fontWeight: '700' },
  ctaGhost: { borderWidth: 2, borderColor: theme.colors.textInverseMuted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  ctaGhostText: { color: theme.colors.white, fontWeight: '600' },
  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  trustPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  trustPillText: { color: theme.colors.white, fontSize: 12, fontWeight: '600' },

  sectionHeader: { marginTop: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  sectionAction: { color: theme.colors.primary, fontWeight: '600' },

  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  chipText: { color: theme.colors.textPrimary, fontWeight: '600' },

  featuresGrid: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: { flex: 1, backgroundColor: theme.colors.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.secondary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureTitle: { fontWeight: '800', fontSize: 13, color: theme.colors.textPrimary, marginBottom: 2 },
  featureText: { color: theme.colors.textSecondary, fontSize: 12 },

  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { color: theme.colors.textSecondary, fontSize: 12 },
});