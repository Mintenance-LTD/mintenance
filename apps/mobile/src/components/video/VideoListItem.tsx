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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '../../theme';

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
        return <Icon name="check-circle" size={20} color={theme.colors.primary} />;
      case 'failed':
        return <Icon name="error" size={20} color={theme.colors.error} />;
      case 'uploading':
      case 'processing':
        return <ActivityIndicator size="small" color={theme.colors.textPrimary} />;
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
        return theme.colors.accent;
      case 'early':
        return theme.colors.primary;
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
            <Icon name="refresh" size={16} color={theme.colors.textPrimary} />
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
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  thumbnailPlaceholder: {
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    color: theme.colors.textInverse,
    fontSize: 11,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
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
    gap: 6,
  },
  resultText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
});

export default VideoListItem;
