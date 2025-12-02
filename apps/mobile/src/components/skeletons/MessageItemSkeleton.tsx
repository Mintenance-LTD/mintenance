/**
 * MessageItemSkeleton Component (React Native)
 *
 * Mobile skeleton loader for message/conversation list items.
 * Includes avatar, sender name, message preview, and timestamp.
 *
 * @example
 * <MessageItemSkeleton />
 * <MessageItemSkeleton count={8} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonAvatar, SkeletonGroup } from './Skeleton';

export interface MessageItemSkeletonProps {
  /**
   * Number of message items to render
   * @default 5
   */
  count?: number;

  /**
   * Whether to show unread indicators
   * @default true
   */
  showUnread?: boolean;
}

const SingleMessageItemSkeleton: React.FC<{ showUnread?: boolean }> = ({
  showUnread = false,
}) => {
  return (
    <View style={styles.item}>
      {/* Avatar */}
      <SkeletonAvatar size={48} />

      {/* Content */}
      <View style={styles.content}>
        {/* Name and Time */}
        <View style={styles.header}>
          <Skeleton width={120} height={16} borderRadius={6} />
          <Skeleton width={50} height={12} borderRadius={6} />
        </View>

        {/* Message Preview */}
        <SkeletonGroup gap={6} style={styles.preview}>
          <Skeleton width="100%" height={14} borderRadius={6} />
          <Skeleton width="70%" height={14} borderRadius={6} />
        </SkeletonGroup>

        {/* Tags/Status */}
        <View style={styles.footer}>
          <Skeleton width={60} height={18} borderRadius={9} />
          <Skeleton width={70} height={12} borderRadius={6} />
        </View>
      </View>

      {/* Unread Indicator */}
      {showUnread && (
        <Skeleton width={8} height={8} borderRadius={4} style={styles.unreadDot} />
      )}
    </View>
  );
};

export const MessageItemSkeleton: React.FC<MessageItemSkeletonProps> = ({
  count = 5,
  showUnread = true,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.listHeader}>
        <Skeleton width={100} height={20} borderRadius={6} />
        <Skeleton width={80} height={36} borderRadius={12} />
      </View>

      {/* Message Items */}
      <View>
        {Array.from({ length: count }).map((_, index) => (
          <SingleMessageItemSkeleton
            key={index}
            showUnread={showUnread && index % 3 === 0}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    marginTop: 4,
  },
});

export default MessageItemSkeleton;
