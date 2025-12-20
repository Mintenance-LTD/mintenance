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
const demoThumb = { uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800' };

const CATEGORIES = [
  { key: 'plumbing',  label: 'Plumbing',  icon: 'water-outline' },
  { key: 'electrical',label: 'Electrical',icon: 'flash-outline' },
  { key: 'roofing',   label: 'Roofing',   icon: 'home-outline' },
  { key: 'painting',  label: 'Painting',  icon: 'color-palette-outline' },
  { key: 'cleaning',  label: 'Cleaning',  icon: 'sparkles-outline' },
  { key: 'gardening', label: 'Gardening', icon: 'leaf-outline' },
];

const CONTRACTORS = [
  { id: '1', name: 'Elite Builders', rating: 4.9, jobs: '1.2k', img: demoThumb },
  { id: '2', name: 'Pro Electric',    rating: 4.8, jobs: '980',  img: demoThumb },
  { id: '3', name: 'Master Plumbing',  rating: 4.7, jobs: '760',  img: demoThumb },
];

const TESTIMONIALS = [
  { id: 't1', name: 'Sarah K.', text: 'Found a 5★ contractor in minutes. Escrow payment made it stress-free!', avatar: demoThumb },
  { id: 't2', name: 'Mike R.',  text: 'Amazing platform! My kitchen renovation was completed perfectly on time.', avatar: demoThumb },
];

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const featuresViewRef = useRef<View>(null);

  const scrollToFeatures = () => {
    // Scroll to approximately where the features section starts (after hero)
    scrollViewRef.current?.scrollTo({ y: 600, animated: true });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topbar}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Ionicons name="home" size={18} color={theme.colors.white} />
          </View>
          <Text style={styles.logoText}>Mintenance</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* HERO — home maintenance focused */}
        <View style={styles.heroWrap}>
          <ImageBackground source={heroImg} style={styles.heroBg} imageStyle={{ borderRadius: 24 }}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color={theme.colors.secondary} />
                <Text style={styles.badgeText}>AI Matching • Escrow • Live Chat</Text>
              </View>

              <Text style={styles.heroTitle}>Find Trusted Home Contractors Fast</Text>
              <Text style={styles.heroSub}>
                Post your home project, compare verified contractor bids, chat in real time and pay securely — all in one seamless platform.
              </Text>

              <View style={styles.heroCTAs}>
                <TouchableOpacity
                  style={styles.ctaSolid}
                  onPress={() => navigation.navigate('Register')}
                >
                  <Text style={styles.ctaSolidText}>Start Free →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaGhost} onPress={scrollToFeatures}>
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
            <TouchableOpacity key={c.key} style={styles.chip}>
              <Ionicons name={c.icon as any} size={18} color={theme.colors.primary} />
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SPECIAL OFFERS — seasonal home services */}
        <SectionHeader title="Special Offers" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
          {[
            { title: 'Winter Heating Check', discount: '20% OFF', desc: 'HVAC maintenance deals' },
            { title: 'Emergency Repairs', discount: '15% OFF', desc: 'Available 24/7' },
            { title: 'Spring Cleaning', discount: '25% OFF', desc: 'Deep cleaning services' }
          ].map((offer, i) => (
            <View key={i} style={styles.offerCard}>
              <Image source={demoThumb} style={styles.offerImage} />
              <View style={{ padding: 14 }}>
                <View style={styles.discountPill}><Text style={styles.discountText}>Up to {offer.discount}</Text></View>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerSub}>{offer.desc}</Text>
                <TouchableOpacity style={styles.claimBtn}><Text style={styles.claimText}>Get Quote</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* TOP CONTRACTORS — verified professionals */}
        <SectionHeader
          title="Top Contractors Near You"
          action="Explore"
          onActionPress={() => navigation.navigate('Modal', { screen: 'FindContractors' })}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
          {CONTRACTORS.map(c => (
            <View key={c.id} style={styles.contractorCard}>
              <Image source={c.img} style={styles.contractorImg} />
              <View style={{ padding: 12 }}>
                <Text style={styles.contractorName}>{c.name}</Text>
                <View style={styles.contractorMeta}>
                  <Ionicons name="star" size={14} color={theme.colors.secondary} />
                  <Text style={styles.metaTxt}>{c.rating}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.metaTxt}>{c.jobs} jobs</Text>
                </View>
                <TouchableOpacity style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* KEY FEATURES */}
        <SectionHeader title="Why Choose Mintenance?" />
        <View style={styles.featuresGrid}>
          <Feature icon="flash-outline"  title="Instant Quotes"  text="Post once, get multiple bids fast." />
          <Feature icon="map-outline"    title="Local Pros"     text="Find contractors near you." />
          <Feature icon="card-outline"   title="Secure Payments" text="Escrow protection included." />
          <Feature icon="shield-outline" title="Verified Reviews" text="Real projects, honest ratings." />
        </View>

        {/* CUSTOMER TESTIMONIALS */}
        <SectionHeader title="What Homeowners Say" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
          {TESTIMONIALS.map(t => (
            <View key={t.id} style={styles.testimonial}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Image source={t.avatar} style={styles.avatar} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tName}>{t.name}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {Array.from({ length: 5 }).map((_,i)=><Ionicons key={i} name="star" size={14} color={theme.colors.secondary} />)}
                  </View>
                </View>
              </View>
              <Text style={styles.tText}>{t.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* FINAL CALL TO ACTION */}
        <View style={styles.bottomCTA}>
          <Text style={styles.bottomTitle}>Ready to start your home project?</Text>
          <Text style={styles.bottomSub}>Join thousands of homeowners who trust Mintenance.</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={styles.ctaSolid}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.ctaSolidText}>Post a Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaGhost}
              onPress={() => navigation.navigate('Modal', { screen: 'ContractorDiscovery' })}
            >
              <Text style={styles.ctaGhostText}>Find Contractors</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SIMPLE FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Mintenance • Privacy • Terms • Support</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, onActionPress }: { title: string; action?: string; onActionPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Feature({ icon, title, text }: { icon: any; title: string; text: string }) {
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

function TrustPill({ icon, text }: { icon: any; text: string }) {
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
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 50, backgroundColor: theme.colors.background } : {}),
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { marginLeft: 10, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { color: theme.colors.textPrimary, opacity: 0.8 },
  primaryBtn: { backgroundColor: theme.colors.secondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryBtnText: { color: theme.colors.white, fontWeight: '600' },

  heroWrap: { paddingHorizontal: 20, marginTop: 8 },
  heroBg: { height: 320, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000040' },
  heroContent: { padding: 20 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#ffffffd9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  badgeText: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' },
  heroTitle: { color: theme.colors.white, fontSize: 28, fontWeight: '800', marginBottom: 6 },
  heroSub: { color: theme.colors.white, opacity: 0.95, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  heroCTAs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaSolid: { backgroundColor: theme.colors.secondary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  ctaSolidText: { color: theme.colors.white, fontWeight: '700' },
  ctaGhost: { borderWidth: 2, borderColor: '#ffffffcc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  ctaGhostText: { color: theme.colors.white, fontWeight: '600' },
  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  trustPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#00000040', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  trustPillText: { color: theme.colors.white, fontSize: 12, fontWeight: '600' },

  sectionHeader: { marginTop: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  sectionAction: { color: theme.colors.primary, fontWeight: '600' },

  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  chipText: { color: theme.colors.textPrimary, fontWeight: '600' },

  carouselRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  offerCard: { width: 260, borderRadius: 16, backgroundColor: theme.colors.white, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  offerImage: { width: '100%', height: 120 },
  discountPill: { alignSelf: 'flex-start', backgroundColor: theme.colors.secondary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginBottom: 6 },
  discountText: { color: theme.colors.secondary, fontWeight: '700', fontSize: 12 },
  offerTitle: { fontWeight: '800', fontSize: 16, color: theme.colors.textPrimary, marginTop: 2 },
  offerSub: { color: theme.colors.textSecondary, marginTop: 2, marginBottom: 8 },
  claimBtn: { alignSelf: 'flex-start', backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  claimText: { color: theme.colors.white, fontWeight: '700' },

  contractorCard: { width: 220, borderRadius: 16, backgroundColor: theme.colors.white, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  contractorImg: { width: '100%', height: 120 },
  contractorName: { fontWeight: '700', fontSize: 16, color: theme.colors.textPrimary },
  contractorMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  metaTxt: { color: theme.colors.textSecondary, fontSize: 12 },
  dot: { color: theme.colors.textSecondary, marginHorizontal: 2 },
  smallBtn: { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnText: { color: theme.colors.primary, fontWeight: '700' },

  featuresGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  featureCard: { flexGrow: 1, minWidth: Platform.OS === 'web' ? 220 : undefined, backgroundColor: theme.colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.secondary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureTitle: { fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  featureText: { color: theme.colors.textSecondary },

  testimonial: { width: 280, backgroundColor: theme.colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  tName: { fontWeight: '700', color: theme.colors.textPrimary },
  tText: { color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },

  bottomCTA: { paddingHorizontal: 20, paddingVertical: 28, alignItems: 'center' },
  bottomTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  bottomSub: { color: theme.colors.textSecondary, marginTop: 6, marginBottom: 14 },

  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { color: theme.colors.textSecondary, fontSize: 12 },
});