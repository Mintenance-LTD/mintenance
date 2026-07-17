import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, Image } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(24)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo fades in + scales up
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 2. Company name slides up + fades in
      Animated.parallel([
        Animated.timing(nameTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // 3. Tagline slides up + fades in
      Animated.parallel([
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 4. Hold for a beat
      Animated.delay(600),

      // 5. Fade out entire splash
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [
    logoScale,
    logoOpacity,
    nameTranslateY,
    nameOpacity,
    taglineTranslateY,
    taglineOpacity,
    screenOpacity,
    onFinish,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../assets/splash.png')}
          style={styles.logo}
          resizeMode='contain'
        />
      </Animated.View>

      {/* Company name */}
      <Animated.Text
        style={[
          styles.name,
          {
            opacity: nameOpacity,
            transform: [{ translateY: nameTranslateY }],
          },
        ]}
      >
        Mintenance
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          },
        ]}
      >
        Home maintenance, simplified
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    width: width * 0.3,
    height: width * 0.3,
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
});
