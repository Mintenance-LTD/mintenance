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
import { theme } from '../../theme';

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
    left: -theme.spacing[5],
    right: -theme.spacing[5],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 1000,
  },
  tooltipTop: {
    bottom: '100%',
    marginBottom: theme.spacing[3],
  },
  tooltipBottom: {
    top: '100%',
    marginTop: theme.spacing[3],
  },
  arrow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -theme.spacing.sm,
    width: 0,
    height: 0,
    borderLeftWidth: theme.spacing.sm,
    borderRightWidth: theme.spacing.sm,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowTop: {
    top: -theme.spacing.sm,
    borderBottomWidth: theme.spacing.sm,
    borderBottomColor: theme.colors.surface,
  },
  arrowBottom: {
    bottom: -theme.spacing.sm,
    borderTopWidth: theme.spacing.sm,
    borderTopColor: theme.colors.surface,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.fontSize.base,
  },
  iconContainer: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  icon: {
    fontSize: theme.typography.fontSize.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.sm,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  pulse: {
    position: 'absolute',
    top: -theme.spacing.xs,
    right: -theme.spacing.xs,
  },
  pulseCircle: {
    width: theme.spacing[3],
    height: theme.spacing[3],
    borderRadius: theme.borderRadius.sm + 2,
    backgroundColor: theme.colors.primary,
  },
});

export default FeatureTooltip;
