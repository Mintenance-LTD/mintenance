/**
 * Video List Item Component
 * Displays video thumbnail and processing status
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../theme';
import { formatDistanceToNow } from 'date-fns';

interface VideoListItemProps {
  video: {
    id: string;
    thumbnailUrl?: string;
    duration: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    propertyAddress?: string;
    damageCount?: number;
    severity?: 'early' | 'midway' | 'full' | 'none';
  };
  onPress: () => void;
  onRetry?: () => void;
}

export const VideoListItem: React.FC<VideoListItemProps> = ({
  video,
  onPress,
  onRetry,
}) => {
  const getStatusIcon = () => {
    switch (video.status) {
      case 'completed':
        return <Icon name="check-circle" size={20} color={theme.colors.success} />;
      case 'failed':
        return <Icon name="error" size={20} color={theme.colors.error} />;
      case 'uploading':
      case 'processing':
        return <ActivityIndicator size="small" color={theme.colors.primary} />;
      default:
        return <Icon name="schedule" size={20} color={theme.colors.textTertiary} />;
    }
  };

  const getStatusText = () => {
    switch (video.status) {
      case 'completed':
        return 'Analysis Complete';
      case 'failed':
        return 'Processing Failed';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Analyzing...';
      default:
        return 'Queued';
    }
  };

  const getSeverityColor = () => {
    switch (video.severity) {
      case 'full':
        return theme.colors.error;
      case 'midway':
        return theme.colors.warning;
      case 'early':
        return theme.colors.success;
      default:
        return theme.colors.textTertiary;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={video.status === 'uploading' || video.status === 'processing'}
    >
      <View style={styles.thumbnailContainer}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="videocam" size={32} color={theme.colors.textTertiary} />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
        </View>
        {video.status === 'processing' && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.textInverse} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {video.propertyAddress || `Video ${video.id.slice(-6)}`}
          </Text>
          {getStatusIcon()}
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.timeText}>
            {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
          </Text>
        </View>

        {video.status === 'completed' && video.damageCount !== undefined && (
          <View style={styles.resultsRow}>
            <View style={styles.resultItem}>
              <Icon name="warning" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.resultText}>{video.damageCount} damages</Text>
            </View>
            {video.severity && (
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor() },
                ]}
              >
                <Text style={styles.severityText}>{video.severity}</Text>
              </View>
            )}
          </View>
        )}

        {video.status === 'failed' && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Icon name="refresh" size={16} color={theme.colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing[3],
    ...theme.shadows.base,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: theme.spacing[3],
  },
  thumbnail: {
    width: 120,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  thumbnailPlaceholder: {
    width: 120,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: theme.colors.overlayDark50,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    color: theme.colors.textInverse,
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayDark50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  severityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  severityText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  retryText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default VideoListItem;