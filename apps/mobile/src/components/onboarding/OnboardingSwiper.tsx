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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-swiper';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image?: any; // Image source
  icon?: string; // Emoji or icon name
  backgroundColor?: string;
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
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.slide,
              { backgroundColor: slide.backgroundColor || '#F8F9FA' },
            ]}
          >
            {/* Icon or Image */}
            <View style={styles.imageContainer}>
              {slide.icon && (
                <Text style={styles.icon}>{slide.icon}</Text>
              )}
              {/* Could render Image component here if slide.image is provided */}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 50,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
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
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#0066CC',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#D1D5DB',
  },
  button: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#F0FDF4',
  },
  {
    id: 'compare-bids',
    title: 'Compare Bids',
    description:
      'Review multiple quotes side-by-side. Check ratings, reviews, and portfolios.',
    icon: '📊',
    backgroundColor: '#FEF3C7',
  },
  {
    id: 'secure-payment',
    title: 'Secure Payments',
    description:
      'Your money is protected in escrow. Release payments milestone by milestone.',
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
    backgroundColor: '#F0FDF4',
  },
  {
    id: 'showcase',
    title: 'Showcase Your Work',
    description:
      'Build a stunning portfolio with before/after photos. Stand out from the competition.',
    icon: '📸',
    backgroundColor: '#FEF3C7',
  },
  {
    id: 'get-paid',
    title: 'Get Paid Faster',
    description:
      'Secure escrow system ensures you get paid for completed work. No more payment delays.',
    icon: '💰',
    backgroundColor: '#F3E8FF',
  },
];

export default OnboardingSwiper;
