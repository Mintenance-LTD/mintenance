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
  progress: number; // 0-100
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

/**
 * Enhanced loading indicator with semantic messaging
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading',
  message,
  showSpinner = true,
  size = 'large',
  color = theme.colors.primary,
}) => {
  // Provide semantic context for different loading states
  const getLoadingMessage = () => {
    if (message) return message;

    // Default messages based on common loading scenarios
    switch (title.toLowerCase()) {
      case 'loading jobs':
        return 'Finding available jobs in your area...';
      case 'loading contractors':
        return 'Searching for qualified contractors...';
      case 'submitting bid':
        return 'Sending your bid to the homeowner...';
      case 'processing payment':
        return 'Securely processing your payment...';
      case 'uploading images':
        return 'Uploading your photos...';
      case 'saving changes':
        return 'Saving your information...';
      default:
        return 'Please wait while we load your content...';
    }
  };

  return (
    <View style={styles.container}>
      {showSpinner && (
        <ActivityIndicator
          size={size}
          color={color}
          style={styles.spinner}
          accessibilityLabel={`Loading ${title.toLowerCase()}`}
        />
      )}
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLevel={2}
      >
        {title}
      </Text>
      <Text
        style={styles.message}
        accessibilityLiveRegion="polite"
      >
        {getLoadingMessage()}
      </Text>
    </View>
  );
};

/**
 * Enhanced empty state with contextual messaging and actions
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'inbox',
  actionText,
  onActionPress,
  showRetry = false,
  onRetry,
}) => {
  // Get contextual messages based on common empty states
  const getContextualMessage = () => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('jobs')) {
      return message || 'No jobs available right now. Check back later or adjust your search filters.';
    }
    if (lowerTitle.includes('contractors')) {
      return message || 'No contractors found in your area. Try expanding your search radius or check different categories.';
    }
    if (lowerTitle.includes('messages')) {
      return message || 'No messages yet. Start a conversation with a contractor about your project.';
    }
    if (lowerTitle.includes('notifications')) {
      return message || 'All caught up! You have no new notifications.';
    }
    return message;
  };

  return (
    <View style={styles.container}>
      <MaterialIcons
        name={icon}
        size={64}
        color={theme.colors.textSecondary}
        style={styles.icon}
        accessibilityLabel={`${title} empty state`}
      />
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLevel={2}
      >
        {title}
      </Text>
      <Text
        style={styles.message}
        accessibilityHint="Description of empty state"
      >
        {getContextualMessage()}
      </Text>

      {actionText && onActionPress && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionText}
          accessibilityHint="Primary action for this empty state"
        >
          <Text style={styles.primaryButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}

      {showRetry && onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
          accessibilityHint="Tap to reload content"
        >
          <MaterialIcons
            name='refresh'
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Error state with retry functionality and enhanced error messaging
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  showRetry = true,
  onRetry,
  isNetworkError = false,
}) => {
  const errorIcon = isNetworkError ? 'wifi-off' : 'error-outline';

  // Enhanced error messages with more specific guidance
  const getDefaultMessage = () => {
    if (isNetworkError) {
      return 'Check your internet connection and try again. If the problem persists, contact support.';
    }
    return 'We encountered an unexpected error. If this continues, please restart the app or contact support.';
  };

  const getErrorTitle = () => {
    if (isNetworkError) {
      return 'Connection Problem';
    }
    return title;
  };

  return (
    <View style={styles.container}>
      <MaterialIcons
        name={errorIcon}
        size={64}
        color={theme.colors.error}
        style={styles.icon}
        accessibilityLabel="Error icon"
      />
      <Text
        style={styles.errorTitle}
        accessibilityRole="header"
        accessibilityLevel={2}
      >
        {getErrorTitle()}
      </Text>
      <Text
        style={styles.message}
        accessibilityHint="Error description"
      >
        {message || getDefaultMessage()}
      </Text>

      {showRetry && onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again button"
          accessibilityHint="Tap to retry the failed operation"
        >
          <MaterialIcons
            name='refresh'
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Skeleton loader for list items
 */
export const SkeletonLoader: React.FC<{
  count?: number;
  height?: number;
  showAvatar?: boolean;
}> = ({ count = 3, height = 80, showAvatar = true }) => {
  return (
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
};

/**
 * Inline loading indicator for buttons or small spaces
 */
export const InlineLoader: React.FC<{
  size?: number;
  color?: string;
  text?: string;
}> = ({ size = 16, color = theme.colors.primary, text }) => {
  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator size='small' color={color} />
      {text && <Text style={[styles.inlineText, { color }]}>{text}</Text>}
    </View>
  );
};

/**
 * Pull to refresh indicator
 */
export const RefreshIndicator: React.FC<{
  isRefreshing: boolean;
  message?: string;
}> = ({ isRefreshing, message = 'Refreshing...' }) => {
  if (!isRefreshing) return null;

  return (
    <View style={styles.refreshContainer}>
      <ActivityIndicator size='small' color={theme.colors.primary} />
      <Text style={styles.refreshText}>{message}</Text>
    </View>
  );
};

/**
 * Network status indicator
 */
export const NetworkStatusIndicator: React.FC<{
  isOnline: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}> = ({ isOnline, hasError, onRetry }) => {
  if (isOnline && !hasError) return null;

  return (
    <View
      style={[
        styles.networkIndicator,
        !isOnline && styles.networkIndicatorOffline,
      ]}
    >
      <MaterialIcons
        name={!isOnline ? 'wifi-off' : 'warning'}
        size={16}
        color={(theme.colors as any).white || '#FFFFFF'}
      />
      <Text style={styles.networkText}>
        {!isOnline ? "You're offline" : 'Connection issues'}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.networkRetry}>
          <Text style={styles.networkRetryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Progress loading state for file uploads, downloads, and other progress-based operations
 */
export const ProgressLoadingState: React.FC<ProgressLoadingProps> = ({
  title,
  progress,
  message,
  showPercentage = true,
  onCancel,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLevel={2}
      >
        {title}
      </Text>

      {message && (
        <Text
          style={styles.message}
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>
      )}

      {/* Progress Bar */}
      <View
        style={styles.progressBarContainer}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: clampedProgress,
        }}
        accessibilityLabel={`Progress: ${Math.round(clampedProgress)}%`}
      >
        <View
          style={[styles.progressBar, { width: `${clampedProgress}%` }]}
        />
      </View>

      {/* Percentage Display */}
      {showPercentage && (
        <Text style={styles.progressText}>
          {Math.round(clampedProgress)}%
        </Text>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel operation"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: (theme.spacing as any).xl,
    backgroundColor: theme.colors.background,
  },
  spinner: {
    marginBottom: (theme.spacing as any).md,
  },
  icon: {
    marginBottom: (theme.spacing as any).md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: (theme.colors as any).text || theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: (theme.spacing as any).sm,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: (theme.spacing as any).sm,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: (theme.spacing as any).lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: (theme.spacing as any).lg,
    paddingVertical: (theme.spacing as any).md,
    borderRadius: (theme.borderRadius as any).md,
    marginBottom: (theme.spacing as any).md,
  },
  primaryButtonText: {
    color: (theme.colors as any).white || '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: (theme.spacing as any).lg,
    paddingVertical: (theme.spacing as any).sm,
    borderRadius: (theme.borderRadius as any).md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  retryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: (theme.spacing as any).xs,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: (theme.spacing as any).md,
    paddingVertical: (theme.spacing as any).sm,
    marginBottom: (theme.spacing as any).sm,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.border,
    marginRight: (theme.spacing as any).md,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    marginBottom: (theme.spacing as any).xs,
  },
  skeletonLineShort: {
    width: '60%',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineText: {
    marginLeft: (theme.spacing as any).xs,
    fontSize: 14,
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: (theme.spacing as any).sm,
  },
  refreshText: {
    marginLeft: (theme.spacing as any).xs,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: (theme.spacing as any).md,
    paddingVertical: (theme.spacing as any).sm,
    marginBottom: (theme.spacing as any).sm,
  },
  networkIndicatorOffline: {
    backgroundColor: theme.colors.error,
  },
  networkText: {
    color: (theme.colors as any).white || '#FFFFFF',
    fontSize: 14,
    marginLeft: (theme.spacing as any).xs,
    flex: 1,
  },
  networkRetry: {
    paddingHorizontal: (theme.spacing as any).sm,
    paddingVertical: (theme.spacing as any).xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  networkRetryText: {
    color: (theme.colors as any).white || '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginVertical: (theme.spacing as any).md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: (theme.spacing as any).md,
  },
  cancelButton: {
    paddingHorizontal: (theme.spacing as any).lg,
    paddingVertical: (theme.spacing as any).sm,
    borderRadius: (theme.borderRadius as any).md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
