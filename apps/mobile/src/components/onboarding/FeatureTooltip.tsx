/**
 * FeatureTooltip Component (React Native)
 * Mobile version of everboarding tooltip
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface FeatureTooltipProps {
  children: React.ReactNode;
  feature: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom';
  actionLabel?: string;
  onAction?: () => void;
  delay?: number;
}

export function FeatureTooltip({
  children,
  feature,
  title,
  description,
  placement = 'bottom',
  actionLabel,
  onAction,
  delay = 1000,
}: FeatureTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Check if already seen
    const checkVisibility = async () => {
      // In real app, check AsyncStorage
      // For now, show after delay
      if (!hasShown) {
        const timer = setTimeout(() => {
          setIsVisible(true);
          setHasShown(true);
        }, delay);

        return () => clearTimeout(timer);
      }
    };

    checkVisibility();
  }, [feature, delay, hasShown]);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleDismiss = () => {
    // Save to AsyncStorage that user dismissed
    setIsVisible(false);
  };

  const handleGotIt = () => {
    // Save to AsyncStorage that user saw feature
    setIsVisible(false);
  };

  const handleAction = () => {
    // Save to AsyncStorage and execute action
    setIsVisible(false);
    onAction?.();
  };

  return (
    <View style={styles.container}>
      {children}

      {isVisible && (
        <Animated.View
          style={[
            styles.tooltip,
            placement === 'top' ? styles.tooltipTop : styles.tooltipBottom,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Arrow */}
          <View
            style={[
              styles.arrow,
              placement === 'top' ? styles.arrowBottom : styles.arrowTop,
            ]}
          />

          {/* Close button */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💡</Text>
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleGotIt}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Got it</Text>
            </TouchableOpacity>

            {actionLabel && onAction && (
              <TouchableOpacity
                onPress={handleAction}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Pulsing indicator */}
          <View style={styles.pulse}>
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    left: -20,
    right: -20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
  },
  tooltipTop: {
    bottom: '100%',
    marginBottom: 12,
  },
  tooltipBottom: {
    top: '100%',
    marginTop: 12,
  },
  arrow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowTop: {
    top: -8,
    borderBottomWidth: 8,
    borderBottomColor: '#FFFFFF',
  },
  arrowBottom: {
    bottom: -8,
    borderTopWidth: 8,
    borderTopColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pulse: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  pulseCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066CC',
  },
});

export default FeatureTooltip;
