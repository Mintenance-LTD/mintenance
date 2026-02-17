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
        return <Icon name="check-circle" size={20} color="#4CAF50" />;
      case 'failed':
        return <Icon name="error" size={20} color="#F44336" />;
      case 'uploading':
      case 'processing':
        return <ActivityIndicator size="small" color="#007AFF" />;
      default:
        return <Icon name="schedule" size={20} color="#999" />;
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
        return '#F44336';
      case 'midway':
        return '#FF9800';
      case 'early':
        return '#4CAF50';
      default:
        return '#9E9E9E';
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
            <Icon name="videocam" size={32} color="#999" />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
        </View>
        {video.status === 'processing' && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="white" />
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
              <Icon name="warning" size={16} color="#666" />
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
            <Icon name="refresh" size={16} color="#007AFF" />
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
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  thumbnailPlaceholder: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
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
    fontSize: 13,
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
    gap: 4,
  },
  resultText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default VideoListItem;