import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export interface LoadingStateProps {
  title?: string;
  message?: string;
  showSpinner?: boolean;
  size?: 'small' | 'large';
  color?: string;
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
 * Loading indicator with customizable message
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading',
  message,
  showSpinner = true,
  size = 'large',
  color = theme.colors.primary,
}) => {
  return (
    <View style={styles.container}>
      {showSpinner && (
        <ActivityIndicator 
          size={size} 
          color={color} 
          style={styles.spinner}
        />
      )}
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

/**
 * Empty state with optional action button
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
  return (
    <View style={styles.container}>
      <MaterialIcons 
        name={icon} 
        size={64} 
        color={theme.colors.textSecondary} 
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {actionText && onActionPress && (
        <TouchableOpacity style={styles.primaryButton} onPress={onActionPress}>
          <Text style={styles.primaryButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
      
      {showRetry && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={20} color={theme.colors.primary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Error state with retry functionality
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  showRetry = true,
  onRetry,
  isNetworkError = false,
}) => {
  const errorIcon = isNetworkError ? 'wifi-off' : 'error-outline';
  const defaultMessage = isNetworkError 
    ? 'Please check your internet connection and try again.'
    : 'We encountered an unexpected error. Please try again.';

  return (
    <View style={styles.container}>
      <MaterialIcons 
        name={errorIcon} 
        size={64} 
        color={theme.colors.error} 
        style={styles.icon}
      />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.message}>{message || defaultMessage}</Text>
      
      {showRetry && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={20} color={theme.colors.primary} />
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
      <ActivityIndicator size="small" color={color} />
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
      <ActivityIndicator size="small" color={theme.colors.primary} />
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
    <View style={[styles.networkIndicator, !isOnline && styles.networkIndicatorOffline]}>
      <MaterialIcons 
        name={!isOnline ? 'wifi-off' : 'warning'} 
        size={16} 
        color={(theme.colors as any).white || '#FFFFFF'} 
      />
      <Text style={styles.networkText}>
        {!isOnline ? 'You\'re offline' : 'Connection issues'}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.networkRetry}>
          <Text style={styles.networkRetryText}>Retry</Text>
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
});
