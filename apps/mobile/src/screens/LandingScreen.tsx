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
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const featuresOffsetY = useRef(0);

  const scrollToFeatures = () => {
    scrollViewRef.current?.scrollTo({ y: featuresOffsetY.current, animated: true });
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
                <Ionicons name="sparkles" size={14} color={theme.colors.textPrimary} />
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
          onActionPress={() => navigation.navigate('Register')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={styles.chip}
              accessibilityRole='button'
              accessibilityLabel={`${c.label} services`}
            >
              <Ionicons name={c.icon as unknown} size={18} color={theme.colors.textSecondary} />
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* KEY FEATURES — 2×2 grid */}
        <SectionHeader title="Why Choose Mintenance?" />
        <View
          style={styles.featuresGrid}
          onLayout={(e) => { featuresOffsetY.current = e.nativeEvent.layout.y; }}
        >
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
        <Ionicons name={icon} size={20} color={theme.colors.textPrimary} />
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
    paddingHorizontal: 24,
    paddingVertical: 14,
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
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  link: { color: theme.colors.textPrimary, fontWeight: '500' },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600' },

  heroWrap: { paddingHorizontal: 20, marginTop: 8 },
  heroBg: { height: 340, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  heroContent: { padding: 20 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  badgeText: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginBottom: 6, lineHeight: 34 },
  heroSub: { color: '#FFFFFF', opacity: 0.95, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  heroCTAs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaSolid: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  ctaSolidText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  ctaGhost: { borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  ctaGhostText: { color: '#FFFFFF', fontWeight: '600' },
  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  trustPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  trustPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },

  sectionHeader: { marginTop: 24, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  sectionAction: { color: theme.colors.textPrimary, fontWeight: '600', textDecorationLine: 'underline' },

  chipsRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  chipText: { color: theme.colors.textPrimary, fontWeight: '500' },

  featuresGrid: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, padding: 20, ...theme.shadows.base },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureTitle: { fontWeight: '700', fontSize: 14, color: theme.colors.textPrimary, marginBottom: 4 },
  featureText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },

  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { color: theme.colors.textTertiary, fontSize: 12 },
});
