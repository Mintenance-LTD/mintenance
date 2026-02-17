import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useHaptics } from '../../../utils/haptics';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 'top' | 'bottom' | 'center';
export type ToastPreset = 'default' | 'minimal' | 'action' | 'banner';

export interface ToastAction {
  label: string;
  onPress: () => void;
  style?: 'default' | 'primary' | 'destructive';
}

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastPosition;
  preset?: ToastPreset;
  icon?: string;
  action?: ToastAction;
  swipeable?: boolean;
  hapticFeedback?: boolean;
  onPress?: () => void;
  onDismiss?: (id: string) => void;
  onShow?: (id: string) => void;
  onHide?: (id: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const statusBarHeight = StatusBar.currentHeight || 0;

// ============================================================================
// TOAST COMPONENT
// ============================================================================

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  position = 'top',
  preset = 'default',
  icon,
  action,
  swipeable = true,
  hapticFeedback = true,
  onPress,
  onDismiss,
  onShow,
  onHide,
}) => {
  const haptics = useHaptics();

  const translateY = useRef(new Animated.Value(getInitialOffset())).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisible = useRef(false);

  function getInitialOffset(): number {
    switch (position) {
      case 'top':
        return -200;
      case 'bottom':
        return 200;
      case 'center':
        return 0;
      default:
        return -200;
    }
  }

  // Get toast icon
  const getIcon = () => {
    if (icon) return icon;

    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'loading':
        return 'refresh';
      default:
        return 'information-circle';
    }
  };

  // Get toast colors based on type
  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          background: '#F0FDF4',
          border: '#BBF7D0',
          icon: theme.colors.successDark,
          text: '#166534',
        };
      case 'error':
        return {
          background: '#FEF2F2',
          border: '#FECACA',
          icon: theme.colors.errorDark,
          text: '#991B1B',
        };
      case 'warning':
        return {
          background: '#FFFBEB',
          border: '#FDE68A',
          icon: theme.colors.warningDark,
          text: '#92400E',
        };
      case 'info':
        return {
          background: '#EFF6FF',
          border: '#BFDBFE',
          icon: theme.colors.infoDark,
          text: '#1E40AF',
        };
      case 'loading':
        return {
          background: theme.colors.surfaceSecondary,
          border: theme.colors.border,
          icon: theme.colors.primaryLight,
          text: theme.colors.textPrimary,
        };
      default:
        return {
          background: theme.colors.surface,
          border: theme.colors.border,
          icon: theme.colors.textSecondary,
          text: theme.colors.textPrimary,
        };
    }
  };

  const colors = getToastColors();

  // Show animation
  const show = () => {
    if (hapticFeedback) {
      switch (type) {
        case 'success':
          haptics.success();
          break;
        case 'error':
          haptics.error();
          break;
        case 'warning':
          haptics.warning();
          break;
        default:
          haptics.light();
      }
    }

    isVisible.current = true;
    onShow?.(id);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    // Auto dismiss
    if (duration > 0 && type !== 'loading') {
      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  // Hide animation
  const hide = () => {
    if (!isVisible.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    isVisible.current = false;
    onHide?.(id);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: getInitialOffset(),
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.(id);
    });
  };

  // Pan responder for swipe to dismiss
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return swipeable && Math.abs(gestureState.dy) > 10;
    },

    onPanResponderMove: (_, gestureState) => {
      const { dy } = gestureState;

      // Only allow upward swipe for top toasts, downward for bottom
      if (position === 'top' && dy > 0) return;
      if (position === 'bottom' && dy < 0) return;

      panY.setValue(dy);
    },

    onPanResponderRelease: (_, gestureState) => {
      const { dy, vy } = gestureState;
      const threshold = 50;
      const velocity = Math.abs(vy);

      if (Math.abs(dy) > threshold || velocity > 0.5) {
        // Swipe to dismiss
        Animated.timing(panY, {
          toValue: dy > 0 ? 200 : -200,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          hide();
        });
      } else {
        // Spring back
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    show();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Get container style based on position and preset
  const getContainerStyle = () => {
    const baseStyle = [
      styles.container,
      {
        backgroundColor: colors.background,
        borderColor: colors.border,
        transform: [
          { translateY: Animated.add(translateY, panY) },
          { scale },
        ],
        opacity,
      },
    ];

    switch (preset) {
      case 'minimal':
        return [...baseStyle, styles.minimal];
      case 'banner':
        return [...baseStyle, styles.banner];
      default:
        return baseStyle;
    }
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return {
          top: Platform.OS === 'android' ? statusBarHeight + 20 : 60,
          left: 20,
          right: 20,
        };
      case 'bottom':
        return {
          bottom: 40,
          left: 20,
          right: 20,
        };
      case 'center':
        return {
          top: screenHeight / 2 - 50,
          left: 20,
          right: 20,
        };
      default:
        return {};
    }
  };

  const handlePress = () => {
    if (onPress) {
      haptics.light();
      onPress();
    }
  };

  const handleActionPress = () => {
    if (action?.onPress) {
      haptics.medium();
      action.onPress();
      hide();
    }
  };

  const handleDismiss = () => {
    haptics.light();
    hide();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        getPositionStyle(),
        getContainerStyle(),
      ]}
      {...(swipeable ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity
        onPress={handlePress}
        disabled={!onPress}
        style={styles.content}
        activeOpacity={onPress ? 0.8 : 1}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={getIcon() as keyof typeof Ionicons.glyphMap}
            size={preset === 'minimal' ? 20 : 24}
            color={colors.icon}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: preset === 'minimal' ? 14 : 16,
              },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {message && (
            <Text
              style={[
                styles.message,
                {
                  color: colors.text,
                  fontSize: preset === 'minimal' ? 12 : 14,
                  opacity: 0.8,
                },
              ]}
              numberOfLines={3}
            >
              {message}
            </Text>
          )}
        </View>

        {/* Action Button */}
        {action && (
          <TouchableOpacity
            onPress={handleActionPress}
            style={[
              styles.actionButton,
              {
                backgroundColor: action.style === 'primary' ? theme.colors.primary : 'transparent',
                borderColor: action.style === 'destructive' ? theme.colors.error : colors.icon,
              },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: action.style === 'primary'
                    ? theme.colors.white
                    : action.style === 'destructive'
                    ? theme.colors.errorDark
                    : colors.text,
                },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        {!action && preset !== 'minimal' && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={18}
              color={colors.icon}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 1700,
  },

  container: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    ...theme.shadows.base,
  },

  minimal: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },

  banner: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    paddingVertical: theme.spacing[4],
  },

  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing[4],
  },

  iconContainer: {
    marginRight: theme.spacing[3],
    marginTop: 2,
  },

  textContainer: {
    flex: 1,
    marginRight: theme.spacing[2],
  },

  title: {
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: 20,
  },

  message: {
    marginTop: theme.spacing[1],
    lineHeight: 18,
  },

  actionButton: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing[3],
    marginLeft: theme.spacing[2],
  },

  actionText: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.medium,
  },

  closeButton: {
    padding: theme.spacing[1],
    marginLeft: theme.spacing[1],
  },
});

export default Toast;