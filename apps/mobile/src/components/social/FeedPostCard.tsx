import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { SocialFeedUtils, type FeedPost } from './SocialFeedUtils';

interface FeedPostCardProps {
  post: FeedPost;
  currentUser?: { firstName?: string; lastName?: string };
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onMenuPress?: (postId: string) => void;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  currentUser,
  onLike,
  onComment,
  onShare,
  onSave,
  onMenuPress,
}) => {
  const contractorName = SocialFeedUtils.getContractorName(post, currentUser);
  const roleLabel = SocialFeedUtils.getPostTypeDisplayName(post.type);
  const timestampLabel = SocialFeedUtils.formatRelativeTime(post.createdAt);
  const hashtags = post.hashtags || [];
  const liked = post.liked ?? false;
  const saved = post.saved ?? false;
  const likeCount = post.likes ?? 0;
  const commentCount = post.comments ?? 0;
  const shareCount = post.shares ?? 0;
  const verified = SocialFeedUtils.isContractorVerified(post);

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.contractorInfo}>
          <Ionicons
            name="person-circle"
            size={48}
            color={theme.colors.textTertiary}
          />
          <View style={styles.contractorDetails}>
            <View style={styles.contractorNameRow}>
              <Text style={styles.contractorName}>{contractorName}</Text>
              {verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.colors.secondary}
                />
              )}
            </View>
            <View style={styles.roleRow}>
              <Text style={styles.contractorRole}>{roleLabel}</Text>
              <Text style={styles.postTime}> | {timestampLabel}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onMenuPress?.(post.id)}>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <View style={styles.hashtagsContainer}>
          {hashtags.map((hashtag, index) => (
            <TouchableOpacity
              key={`${post.id}-hashtag-${index}`}
              style={styles.hashtag}
              accessibilityRole="button"
              accessibilityLabel={`Hashtag ${hashtag}`}
              accessibilityHint={`Double tap to view posts with ${hashtag} hashtag`}
            >
              <Text style={styles.hashtagText}>{hashtag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Engagement Actions */}
      <View style={styles.engagementRow}>
        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => onLike(post.id)}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
          accessibilityHint={
            liked
              ? 'Double tap to unlike this post'
              : 'Double tap to like this post'
          }
          accessibilityState={{ selected: liked }}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#FF3B30' : theme.colors.textSecondary}
          />
          <Text style={styles.engagementText}>
            {SocialFeedUtils.getPostActionLabel('like', likeCount, liked)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => onComment(post.id)}
          accessibilityRole="button"
          accessibilityLabel="View comments"
          accessibilityHint={`Double tap to view ${commentCount} comments on this post`}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.engagementText}>
            {SocialFeedUtils.getPostActionLabel('comment', commentCount)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => onShare(post.id)}
          accessibilityRole="button"
          accessibilityLabel="Share post"
          accessibilityHint="Double tap to share this post with others"
        >
          <Ionicons
            name="arrow-redo-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.engagementText}>
            {SocialFeedUtils.getPostActionLabel('share', shareCount)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => onSave(post.id)}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Unsave post' : 'Save post'}
          accessibilityHint={
            saved
              ? 'Double tap to remove this post from saved posts'
              : 'Double tap to save this post for later'
          }
          accessibilityState={{ selected: saved }}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? theme.colors.secondary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[2],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contractorDetails: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  contractorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  contractorName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing[2],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractorRole: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  postTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  postContent: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  hashtag: {
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.base,
  },
  hashtagText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    minHeight: 44,
    justifyContent: 'center',
  },
  engagementText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default FeedPostCard;