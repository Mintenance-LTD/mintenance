/**
 * OnboardingSwiper — Mint Editorial v2 redesign (2026-05-22).
 *
 * Implements the swipeable intro deck from
 * `.design-bundle/.../redesign-v2/auth.html` (MOnboardTrades aesthetic):
 *   - Mint Editorial paper background, serif display title.
 *   - Brand-soft icon tile (no full-bleed emoji wall).
 *   - Slim progress bar at top with "Skip" pinned right.
 *   - Editorial pagination dots in brand colour.
 *   - Primary mint pill CTA with rounded radius.
 *
 * Backward compatible: existing callers pass either an emoji or an
 * Ionicons name in `slide.icon`; the renderer detects ionicon keys and
 * renders the matching glyph, else falls back to text (legacy emoji).
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { me } from '../../design-system/mint-editorial';
import { JobsNearYouPreview } from './JobsNearYouPreview';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image?: ImageSourcePropType;
  /**
   * Either an emoji string (legacy) or an Ionicons name (preferred —
   * matches the no-emoji brand rule in CLAUDE.md content fundamentals).
   * The renderer picks the right component based on shape.
   */
  icon?: string;
  backgroundColor?: string;
  renderBody?: () => React.ReactNode;
}

interface OnboardingSwiperProps {
  slides: OnboardingSlide[];
  onComplete: () => void;
  onSkip?: () => void;
  userType?: 'homeowner' | 'contractor';
}

const IONICONS_NAMES = new Set<string>([
  'home-outline',
  'home',
  'construct-outline',
  'construct',
  'document-text-outline',
  'document-text',
  'analytics-outline',
  'analytics',
  'card-outline',
  'card',
  'wallet-outline',
  'wallet',
  'camera-outline',
  'camera',
  'shield-checkmark-outline',
  'shield-checkmark',
  'search-outline',
  'search',
  'briefcase-outline',
  'briefcase',
  'leaf',
  'leaf-outline',
]);

const isIonicon = (icon?: string): icon is keyof typeof Ionicons.glyphMap =>
  Boolean(icon && IONICONS_NAMES.has(icon));

export function OnboardingSwiper({
  slides,
  onComplete,
  onSkip,
}: OnboardingSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<Swiper>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === slides.length - 1;

  const handleIndexChanged = (index: number) => {
    setCurrentIndex(index);
    Animated.spring(progressAnim, {
      toValue: index,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      swiperRef.current?.scrollBy(1);
    }
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
    else onComplete();
  };

  const progress =
    slides.length <= 1 ? 100 : ((currentIndex + 1) / slides.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        {!isLastSlide && (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityRole='button'
            accessibilityLabel='Skip onboarding'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        onIndexChanged={handleIndexChanged}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            {slide.renderBody ? (
              <>
                <View style={styles.content}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </View>
                <View style={styles.customBody}>{slide.renderBody()}</View>
              </>
            ) : (
              <>
                <View style={styles.iconTile}>
                  {isIonicon(slide.icon) ? (
                    <Ionicons name={slide.icon} size={44} color={me.brand} />
                  ) : slide.icon ? (
                    <Text style={styles.iconText}>{slide.icon}</Text>
                  ) : (
                    <Ionicons name='leaf' size={44} color={me.brand} />
                  )}
                </View>

                <View style={styles.content}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </View>
              </>
            )}
          </View>
        ))}
      </Swiper>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.button}
          activeOpacity={0.9}
          accessibilityRole='button'
          accessibilityLabel={isLastSlide ? 'Get started' : 'Next slide'}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          {!isLastSlide && (
            <Ionicons name='arrow-forward' size={16} color={me.onBrand} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
    height: 56,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: me.bg2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: me.brand,
    borderRadius: 2,
  },
  skipButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: me.bg,
  },
  customBody: {
    width: '100%',
    maxWidth: width * 0.9,
    marginTop: 20,
    alignItems: 'stretch',
  },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconText: {
    fontSize: 48,
  },
  content: {
    alignItems: 'center',
    maxWidth: width * 0.85,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 32,
    lineHeight: 36,
    color: me.ink,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: me.displayTracking,
  },
  description: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    paddingTop: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: me.brand,
    width: 22,
  },
  inactiveDot: {
    backgroundColor: me.bg3,
    width: 6,
  },
  button: {
    backgroundColor: me.brand,
    paddingVertical: 16,
    borderRadius: me.radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...me.shadow.btn,
  },
  buttonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

// Default slides for homeowners — Mint Editorial copy & Ionicons.
// Keeps the same shape as the original module so OnboardingModal and
// the screen-test fixtures continue to work; only the visual tokens
// change.
export const homeownerSlides: OnboardingSlide[] = [
  {
    id: 'welcome',
    title: 'Welcome to Mintenance',
    description:
      'Find trusted contractors, manage projects, and ensure quality work — all in one place.',
    icon: 'home-outline',
  },
  {
    id: 'post-jobs',
    title: 'Post Jobs Easily',
    description:
      'Describe your project, add photos, and Mint matches you with qualified contractors.',
    icon: 'document-text-outline',
  },
  {
    id: 'compare-bids',
    title: 'Compare Bids',
    description:
      'Review multiple quotes side-by-side. Check ratings, reviews and portfolios.',
    icon: 'analytics-outline',
  },
  {
    id: 'secure-payment',
    title: 'Protected Payment',
    description:
      'Your money is held securely until you approve the work. Release payments milestone by milestone.',
    icon: 'card-outline',
  },
];

// Default slides for contractors — Mint Editorial copy & Ionicons.
export const contractorSlides: OnboardingSlide[] = [
  {
    id: 'welcome',
    title: 'Grow your business',
    description:
      'Find quality leads, showcase your work, and build your reputation.',
    icon: 'construct-outline',
  },
  {
    id: 'discover',
    title: 'Discover matched jobs',
    description:
      'Swipe through jobs matched to your skills and location. No more wasted time.',
    icon: 'search-outline',
  },
  {
    id: 'showcase',
    title: 'Showcase your work',
    description:
      'Build a polished portfolio with before/after photos. Stand out from the competition.',
    icon: 'camera-outline',
  },
  {
    id: 'get-paid',
    title: 'Get paid faster',
    description:
      'Homeowner payment is secured before you arrive. Complete the work, upload after-photos — money releases to your Stripe account.',
    icon: 'wallet-outline',
  },
  {
    // R2 of docs/RETENTION_ROADMAP_2026.md — the "Protected Payment
    // protects you too" beat. Counter to the PDF §4.3 mental model
    // "who protects me if the homeowner is the dodgy one?".
    id: 'protected-payment-contractor',
    title: 'Protected Payment works for you too',
    description:
      'Funds are held before you arrive and released on homeowner approval (or automatically after the 7-day review window). No chasing invoices.',
    icon: 'shield-checkmark-outline',
  },
  {
    // Phase 1 closeout of 2026-04-19 mobile-onboarding-audit PDF
    // (§5.3 Tier 1 step 4 — "First value moment. No bid button yet.").
    id: 'jobs-near-you-preview',
    title: 'Jobs waiting for you',
    description:
      'A preview of the kind of work homeowners are posting in your area right now. Finish verification to start bidding.',
    renderBody: () => <JobsNearYouPreview />,
  },
];
