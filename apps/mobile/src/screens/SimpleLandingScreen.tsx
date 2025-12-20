import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SimpleLandingScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topbar}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoEmoji}>🏠</Text>
          </View>
          <Text style={styles.logoText}>Mintenance</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.heroWrap}>
          <View style={styles.heroBg}>
            <View style={styles.heroContent}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✨ AI Matching • Escrow • Live Chat</Text>
              </View>

              <Text style={styles.heroTitle}>Find Trusted Home Contractors Fast</Text>
              <Text style={styles.heroSub}>
                Post your home project, compare verified contractor bids, chat in real time and pay securely — all in one seamless platform.
              </Text>

              <View style={styles.heroCTAs}>
                <TouchableOpacity style={styles.ctaSolid}>
                  <Text style={styles.ctaSolidText}>Start Free →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaGhost}>
                  <Text style={styles.ctaGhostText}>See How It Works</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.trustRow}>
                <View style={styles.trustPill}>
                  <Text style={styles.trustPillText}>⭐ 4.9★ avg rating</Text>
                </View>
                <View style={styles.trustPill}>
                  <Text style={styles.trustPillText}>🛡️ Escrow protected</Text>
                </View>
                <View style={styles.trustPill}>
                  <Text style={styles.trustPillText}>💬 Instant chat</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SERVICES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Home Services</Text>
          <TouchableOpacity><Text style={styles.sectionAction}>See All</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {['🔧 Plumbing', '⚡ Electrical', '🏠 Roofing', '🎨 Painting', '✨ Cleaning', '🌿 Gardening'].map((service, i) => (
            <TouchableOpacity key={i} style={styles.chip}>
              <Text style={styles.chipText}>{service}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FEATURES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why Choose Mintenance?</Text>
        </View>

        <View style={styles.featuresGrid}>
          {[
            { icon: '⚡', title: 'Instant Quotes', text: 'Post once, get multiple bids fast.' },
            { icon: '📍', title: 'Local Pros', text: 'Find contractors near you.' },
            { icon: '💳', title: 'Secure Payments', text: 'Escrow protection included.' },
            { icon: '🛡️', title: 'Verified Reviews', text: 'Real projects, honest ratings.' }
          ].map((feature, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>{feature.icon}</Text>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* TESTIMONIALS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What Homeowners Say</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
          {[
            { name: 'Sarah K.', text: 'Found a 5★ contractor in minutes. Escrow payment made it stress-free!' },
            { name: 'Mike R.', text: 'Amazing platform! My kitchen renovation was completed perfectly on time.' }
          ].map((testimonial, i) => (
            <View key={i} style={styles.testimonial}>
              <View style={styles.testimonialHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{testimonial.name[0]}</Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tName}>{testimonial.name}</Text>
                  <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
                </View>
              </View>
              <Text style={styles.tText}>{testimonial.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* CTA */}
        <View style={styles.bottomCTA}>
          <Text style={styles.bottomTitle}>Ready to start your home project?</Text>
          <Text style={styles.bottomSub}>Join thousands of homeowners who trust Mintenance.</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.ctaSolid}>
              <Text style={styles.ctaSolidText}>Post a Job</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaGhost}>
              <Text style={styles.ctaGhostText}>Find Contractors</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Mintenance • Privacy • Terms • Support</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 50 } : {}),
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 16 },
  logoText: { marginLeft: 10, color: '#1f2937', fontSize: 18, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { color: '#1f2937', opacity: 0.8 },
  primaryBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryBtnText: { color: '#ffffff', fontWeight: '600' },

  heroWrap: { paddingHorizontal: 20, marginTop: 8 },
  heroBg: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#0F172A', padding: 20 },
  heroContent: { padding: 20 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  heroSub: { color: '#ffffff', opacity: 0.95, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  heroCTAs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaSolid: { backgroundColor: '#10B981', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  ctaSolidText: { color: '#ffffff', fontWeight: '700' },
  ctaGhost: { borderWidth: 2, borderColor: '#ffffff80', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  ctaGhostText: { color: '#ffffff', fontWeight: '600' },
  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  trustPill: { backgroundColor: '#ffffff20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  trustPillText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  sectionHeader: {
    marginTop: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  sectionAction: { color: '#0F172A', fontWeight: '600' },

  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  chip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  chipText: { color: '#1f2937', fontWeight: '600' },

  carouselRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 12 },

  featuresGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  featureCard: {
    flexGrow: 1,
    minWidth: Platform.OS === 'web' ? 220 : undefined,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  featureEmoji: { fontSize: 20 },
  featureTitle: { fontWeight: '800', color: '#1f2937', marginBottom: 4 },
  featureText: { color: '#6b7280' },

  testimonial: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: '#ffffff', fontWeight: '700' },
  tName: { fontWeight: '700', color: '#1f2937' },
  stars: { fontSize: 12 },
  tText: { color: '#6b7280', marginTop: 4, lineHeight: 18 },

  bottomCTA: { paddingHorizontal: 20, paddingVertical: 28, alignItems: 'center' },
  bottomTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  bottomSub: { color: '#6b7280', marginTop: 6, marginBottom: 14 },

  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { color: '#6b7280', fontSize: 12 },
});