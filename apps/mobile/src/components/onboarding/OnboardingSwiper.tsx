/**
 * OnboardingSwiper Component (React Native)
 * Swipeable intro screens for first-time mobile users
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
import Swiper from 'react-native-swiper';
import { theme } from '../../theme';
import { JobsNearYouPreview } from './JobsNearYouPreview';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image?: ImageSourcePropType;
  icon?: string; // Emoji or icon name
  backgroundColor?: string;
  /**
   * Optional custom body renderer — replaces the default icon +
   * title + description layout. Used by the contractor onboarding's
   * final "jobs near you" preview slide (Phase 1 closeout of the
   * 2026-04-19 audit) so the swiper can show sample-data job cards
   * instead of a single emoji. Title + description still render
   * above the custom content.
   */
  renderBody?: () => React.ReactNode;
}

interface OnboardingSwiperProps {
  slides: OnboardingSlide[];
  onComplete: () => void;
  onSkip?: () => void;
  userType?: 'homeowner' | 'contractor';
}

export function OnboardingSwiper({
  slides,
  onComplete,
  onSkip,
  userType = 'homeowner',
}: OnboardingSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<Swiper>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === slides.length - 1;

  const handleIndexChanged = (index: number) => {
    setCurrentIndex(index);

    // Animate progress
    Animated.spring(progressAnim, {
      toValue: index,
      useNativeDriver: true,
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
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Skip button */}
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Swiper */}
      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        onIndexChanged={handleIndexChanged}
      >
        {slides.map((slide) => (
          <View
            key={slide.id}
            style={[
              styles.slide,
              {
                backgroundColor:
                  slide.backgroundColor || theme.colors.backgroundSecondary,
              },
            ]}
          >
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
                {/* Icon or Image */}
                <View style={styles.imageContainer}>
                  {slide.icon && <Text style={styles.icon}>{slide.icon}</Text>}
                </View>

                {/* Content */}
                <View style={styles.content}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </View>
              </>
            )}
          </View>
        ))}
      </Swiper>

      {/* Footer with pagination and button */}
      <View style={styles.footer}>
        {/* Pagination dots */}
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

        {/* Next/Get Started button */}
        <TouchableOpacity
          onPress={handleNext}
          style={styles.button}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 50,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  customBody: {
    width: '100%',
    maxWidth: width * 0.9,
    marginTop: 24,
    alignItems: 'stretch',
  },
  imageContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 120,
  },
  content: {
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: theme.colors.textPrimary,
    width: 20,
  },
  inactiveDot: {
    backgroundColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: 18,
    fontWeight: '600',
  },
});

// Default slides for homeowners
export const homeownerSlides: OnboardingSlide[] = [
  {
    id: 'welcome',
    title: 'Welcome to Mintenance',
    description:
      'Find trusted contractors, manage projects, and ensure quality work—all in one place.',
    icon: '🏠',
    backgroundColor: '#EFF6FF',
  },
  {
    id: 'post-jobs',
    title: 'Post Jobs Easily',
    description:
      'Describe your project, add photos, and our AI will match you with qualified contractors.',
    icon: '📝',
    backgroundColor: 'rgba(34, 34, 34, 0.04)',
  },
  {
    id: 'compare-bids',
    title: 'Compare Bids',
    description:
      'Review multiple quotes side-by-side. Check ratings, reviews, and portfolios.',
    icon: '📊',
    backgroundColor: theme.colors.accentLight,
  },
  {
    id: 'secure-payment',
    title: 'Protected Payment',
    description:
      'Your money is held securely until you approve the work. Release payments milestone by milestone.',
    icon: '💳',
    backgroundColor: '#F3E8FF',
  },
];

// Default slides for contractors
export const contractorSlides: OnboardingSlide[] = [
  {
    id: 'welcome',
    title: 'Grow Your Business',
    description:
      'Find quality leads, showcase your work, and build your reputation.',
    icon: '⚒️',
    backgroundColor: '#EFF6FF',
  },
  {
    id: 'discover',
    title: 'Discover Matched Jobs',
    description:
      'Swipe through jobs matched to your skills and location. No more wasted time.',
    icon: '🔍',
    backgroundColor: 'rgba(34, 34, 34, 0.04)',
  },
  {
    id: 'showcase',
    title: 'Showcase Your Work',
    description:
      'Build a stunning portfolio with before/after photos. Stand out from the competition.',
    icon: '📸',
    backgroundColor: theme.colors.accentLight,
  },
  {
    id: 'get-paid',
    title: 'Get Paid Faster',
    description:
      'Homeowner payment is secured before you arrive. Complete the work, upload after-photos — money releases to your Stripe account.',
    icon: '💰',
    backgroundColor: '#F3E8FF',
  },
  {
    // R2 of docs/RETENTION_ROADMAP_2026.md — the "Protected Payment
    // protects you too" beat. Counter to the PDF §4.3 mental model
    // "who protects me if the homeowner is the dodgy one?".
    id: 'protected-payment-contractor',
    title: 'Protected Payment works for you too',
    description:
      'Funds are held before you arrive and released on homeowner approval (or automatically after the 7-day review window). No chasing invoices.',
    icon: '🛡️',
    backgroundColor: theme.colors.primaryLight,
  },
  {
    // Phase 1 closeout of 2026-04-19 mobile-onboarding-audit PDF
    // (§5.3 Tier 1 step 4 — "First value moment. No bid button yet.").
    // The contractor sees demand BEFORE investing in verification,
    // which is the biggest retention lever the audit identified for
    // the contractor side.
    id: 'jobs-near-you-preview',
    title: 'Jobs waiting for you',
    description:
      'A preview of the kind of work homeowners are posting in your area right now. Finish verification to start bidding.',
    renderBody: () => <JobsNearYouPreview />,
    backgroundColor: theme.colors.backgroundSecondary,
  },
];
