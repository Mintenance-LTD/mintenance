import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export interface LoadingStateProps {
  title?: string;
  message?: string;
  showSpinner?: boolean;
  size?: 'small' | 'large';
  color?: string;
}

export interface ProgressLoadingProps {
  title: string;
  progress: number;
  message?: string;
  showPercentage?: boolean;
  onCancel?: () => void;
}

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  actionText?: string;
  onActionPress?: () => void;
  showRetry?: boolean;
  onRetry?: () => void;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
  isNetworkError?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading', message, showSpinner = true, size = 'large', color = theme.colors.textPrimary,
}) => {
  const getLoadingMessage = () => {
    if (message) return message;
    switch (title.toLowerCase()) {
      case 'loading jobs': return 'Finding available jobs in your area...';
      case 'loading contractors': return 'Searching for qualified contractors...';
      case 'submitting bid': return 'Sending your bid to the homeowner...';
      case 'processing payment': return 'Securely processing your payment...';
      case 'uploading images': return 'Uploading your photos...';
      case 'saving changes': return 'Saving your information...';
      default: return 'Please wait while we load your content...';
    }
  };

  return (
    <View style={styles.container}>
      {showSpinner && <ActivityIndicator size={size} color={color} style={styles.spinner} accessibilityLabel={`Loading ${title.toLowerCase()}`} />}
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.message} accessibilityLiveRegion="polite">{getLoadingMessage()}</Text>
    </View>
  );
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title, message, icon = 'inbox', actionText, onActionPress, showRetry = false, onRetry,
}) => {
  const getContextualMessage = () => {
    const lower = title.toLowerCase();
    if (lower.includes('jobs')) return message || 'No jobs available right now. Check back later or adjust your search filters.';
    if (lower.includes('contractors')) return message || 'No contractors found in your area. Try expanding your search radius.';
    if (lower.includes('messages')) return message || 'No messages yet. Start a conversation with a contractor about your project.';
    if (lower.includes('notifications')) return message || 'All caught up! You have no new notifications.';
    return message;
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name={icon} size={64} color={theme.colors.textSecondary} style={styles.icon} accessibilityLabel={`${title} empty state`} />
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.message} accessibilityHint="Description of empty state">{getContextualMessage()}</Text>
      {actionText && onActionPress && (
        <TouchableOpacity style={styles.primaryButton} onPress={onActionPress} accessibilityRole="button" accessibilityLabel={actionText}>
          <Text style={styles.primaryButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
      {showRetry && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading">
          <MaterialIcons name='refresh' size={20} color={theme.colors.textPrimary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong', message, showRetry = true, onRetry, isNetworkError = false,
}) => {
  const errorIcon = isNetworkError ? 'wifi-off' : 'error-outline';
  const getDefaultMessage = () => isNetworkError
    ? 'Check your internet connection and try again. If the problem persists, contact support.'
    : 'We encountered an unexpected error. If this continues, please restart the app or contact support.';
  const getErrorTitle = () => isNetworkError ? 'Connection Problem' : title;

  return (
    <View style={styles.container}>
      <MaterialIcons name={errorIcon} size={64} color={theme.colors.error} style={styles.icon} accessibilityLabel="Error icon" />
      <Text style={styles.errorTitle} accessibilityRole="header">{getErrorTitle()}</Text>
      <Text style={styles.message} accessibilityHint="Error description">{message || getDefaultMessage()}</Text>
      {showRetry && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again button">
          <MaterialIcons name='refresh' size={20} color={theme.colors.textPrimary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const SkeletonLoader: React.FC<{ count?: number; height?: number; showAvatar?: boolean }> = ({
  count = 3, height = 80, showAvatar = true,
}) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={[styles.skeletonItem, { height }]}>
        {showAvatar && <View style={styles.skeletonAvatar} />}
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      </View>
    ))}
  </View>
);

export const InlineLoader: React.FC<{ size?: number; color?: string; text?: string }> = ({
  color = theme.colors.textPrimary, text,
}) => (
  <View style={styles.inlineContainer}>
    <ActivityIndicator size='small' color={color} />
    {text && <Text style={[styles.inlineText, { color }]}>{text}</Text>}
  </View>
);

export const RefreshIndicator: React.FC<{ isRefreshing: boolean; message?: string }> = ({
  isRefreshing, message = 'Refreshing...',
}) => {
  if (!isRefreshing) return null;
  return (
    <View style={styles.refreshContainer}>
      <ActivityIndicator size='small' color={theme.colors.textPrimary} />
      <Text style={styles.refreshText}>{message}</Text>
    </View>
  );
};

export const NetworkStatusIndicator: React.FC<{ isOnline: boolean; hasError?: boolean; onRetry?: () => void }> = ({
  isOnline, hasError, onRetry,
}) => {
  if (isOnline && !hasError) return null;
  return (
    <View style={[styles.networkIndicator, !isOnline && styles.networkIndicatorOffline]}>
      <MaterialIcons name={!isOnline ? 'wifi-off' : 'warning'} size={16} color={theme.colors.textInverse} />
      <Text style={styles.networkText}>{!isOnline ? "You're offline" : 'Connection issues'}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.networkRetry}>
          <Text style={styles.networkRetryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ProgressLoadingState: React.FC<ProgressLoadingProps> = ({
  title, progress, message, showPercentage = true, onCancel,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
      <View style={styles.progressBarContainer} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: clampedProgress }} accessibilityLabel={`Progress: ${Math.round(clampedProgress)}%`}>
        <View style={[styles.progressBar, { width: `${clampedProgress}%` }]} />
      </View>
      {showPercentage && <Text style={styles.progressText}>{Math.round(clampedProgress)}%</Text>}
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel operation">
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.backgroundSecondary },
  spinner: { marginBottom: 16 },
  icon: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.error, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  primaryButton: { backgroundColor: theme.colors.textPrimary, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, marginBottom: 16 },
  primaryButtonText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '600' },
  retryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.textPrimary },
  retryButtonText: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '500', marginLeft: 6 },
  skeletonItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.border, marginRight: 16 },
  skeletonContent: { flex: 1 },
  skeletonLine: { height: 12, backgroundColor: theme.colors.border, borderRadius: 6, marginBottom: 6 },
  skeletonLineShort: { width: '60%' },
  inlineContainer: { flexDirection: 'row', alignItems: 'center' },
  inlineText: { marginLeft: 6, fontSize: 13 },
  refreshContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  refreshText: { marginLeft: 6, color: theme.colors.textSecondary, fontSize: 13 },
  networkIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 },
  networkIndicatorOffline: { backgroundColor: theme.colors.error },
  networkText: { color: theme.colors.textInverse, fontSize: 13, marginLeft: 6, flex: 1 },
  networkRetry: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  networkRetryText: { color: theme.colors.textInverse, fontSize: 12, fontWeight: '600' },
  progressBarContainer: { width: '100%', height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginVertical: 16, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: theme.colors.textPrimary, borderRadius: 4 },
  progressText: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.error, backgroundColor: 'transparent' },
  cancelButtonText: { color: theme.colors.error, fontSize: 13, fontWeight: '500' },
});
