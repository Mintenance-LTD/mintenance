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
import { useHaptics } from '../../../utils/haptics';

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

const { height: screenHeight } = Dimensions.get('window');
const statusBarHeight = StatusBar.currentHeight || 0;

const TOAST_COLORS: Record<ToastType, { background: string; border: string; icon: string; text: string }> = {
  success: { background: '#F0FDF4', border: '#BBF7D0', icon: '#065F46', text: '#065F46' },
  error: { background: '#FEF2F2', border: '#FECACA', icon: '#991B1B', text: '#991B1B' },
  warning: { background: '#FFFBEB', border: '#FDE68A', icon: '#92400E', text: '#92400E' },
  info: { background: '#EFF6FF', border: '#BFDBFE', icon: '#1E40AF', text: '#1E40AF' },
  loading: { background: '#F7F7F7', border: '#EBEBEB', icon: '#222222', text: '#222222' },
};

export const Toast: React.FC<ToastProps> = ({
  id, type, title, message, duration = 4000, position = 'top', preset = 'default',
  icon, action, swipeable = true, hapticFeedback = true, onPress, onDismiss, onShow, onHide,
}) => {
  const haptics = useHaptics();
  const translateY = useRef(new Animated.Value(getInitialOffset())).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisible = useRef(false);

  function getInitialOffset(): number {
    return position === 'bottom' ? 200 : position === 'center' ? 0 : -200;
  }

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      case 'loading': return 'refresh';
      default: return 'information-circle';
    }
  };

  const colors = TOAST_COLORS[type] ?? TOAST_COLORS.info;

  const show = () => {
    if (hapticFeedback) {
      switch (type) {
        case 'success': haptics.success(); break;
        case 'error': haptics.error(); break;
        case 'warning': haptics.warning(); break;
        default: haptics.light();
      }
    }
    isVisible.current = true;
    onShow?.(id);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
    ]).start();
    if (duration > 0 && type !== 'loading') {
      timeoutRef.current = setTimeout(() => hide(), duration);
    }
  };

  const hide = () => {
    if (!isVisible.current) return;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    isVisible.current = false;
    onHide?.(id);
    Animated.parallel([
      Animated.timing(translateY, { toValue: getInitialOffset(), duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss?.(id));
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => swipeable && Math.abs(gs.dy) > 10,
    onPanResponderMove: (_, gs) => {
      if (position === 'top' && gs.dy > 0) return;
      if (position === 'bottom' && gs.dy < 0) return;
      panY.setValue(gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      if (Math.abs(gs.dy) > 50 || Math.abs(gs.vy) > 0.5) {
        Animated.timing(panY, { toValue: gs.dy > 0 ? 200 : -200, duration: 150, useNativeDriver: true }).start(() => hide());
      } else {
        Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  useEffect(() => { show(); return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

  const getPositionStyle = () => {
    switch (position) {
      case 'top': return { top: Platform.OS === 'android' ? statusBarHeight + 20 : 60, left: 20, right: 20 };
      case 'bottom': return { bottom: 40, left: 20, right: 20 };
      case 'center': return { top: screenHeight / 2 - 50, left: 20, right: 20 };
      default: return {};
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        getPositionStyle(),
        styles.container,
        { backgroundColor: colors.background, borderColor: colors.border, transform: [{ translateY: Animated.add(translateY, panY) }, { scale }], opacity },
        preset === 'minimal' && styles.minimal,
        preset === 'banner' && styles.banner,
      ]}
      {...(swipeable ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity onPress={onPress ? () => { haptics.light(); onPress(); } : undefined} disabled={!onPress} style={styles.content} activeOpacity={onPress ? 0.8 : 1}>
        <View style={styles.iconContainer}>
          <Ionicons name={getIcon() as keyof typeof Ionicons.glyphMap} size={preset === 'minimal' ? 20 : 24} color={colors.icon} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text, fontSize: preset === 'minimal' ? 14 : 16 }]} numberOfLines={2}>{title}</Text>
          {message && <Text style={[styles.message, { color: colors.text, fontSize: preset === 'minimal' ? 12 : 14, opacity: 0.8 }]} numberOfLines={3}>{message}</Text>}
        </View>
        {action && (
          <TouchableOpacity
            onPress={() => { haptics.medium(); action.onPress(); hide(); }}
            style={[styles.actionButton, { backgroundColor: action.style === 'primary' ? '#222222' : 'transparent', borderColor: action.style === 'destructive' ? '#EF4444' : colors.icon }]}
          >
            <Text style={[styles.actionText, { color: action.style === 'primary' ? '#FFFFFF' : action.style === 'destructive' ? '#991B1B' : colors.text }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
        {!action && preset !== 'minimal' && (
          <TouchableOpacity onPress={() => { haptics.light(); hide(); }} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', zIndex: 1700 },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  minimal: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  banner: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, paddingVertical: 16 },
  content: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  iconContainer: { marginRight: 12, marginTop: 2 },
  textContainer: { flex: 1, marginRight: 8 },
  title: { fontWeight: '600', lineHeight: 20 },
  message: { marginTop: 4, lineHeight: 18 },
  actionButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginLeft: 8 },
  actionText: { fontSize: 14, fontWeight: '500' },
  closeButton: { padding: 4, marginLeft: 4 },
});

export default Toast;
