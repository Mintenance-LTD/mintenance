/**
 * Post Card Component
 *
 * Displays individual social media post with engagement actions.
 * Handles contractor info, content, hashtags, and user interactions.
 *
 * @filesize Target: <400 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { FeedPost } from '../viewmodels/ContractorSocialViewModel';

interface PostCardProps {
  post: FeedPost;
  contractorName: string;
  roleLabel: string;
  timestampLabel: string;
  isVerified: boolean;
  onUserPress: (userId: string) => void;
  onHashtagPress: (hashtag: string) => void;
  onLikePress: (postId: string) => void;
  onCommentPress: (postId: string) => void;
  onSharePress: (postId: string) => void;
  onSavePress: (postId: string) => void;
  onOptionsPress: (post: FeedPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  contractorName,
  roleLabel,
  timestampLabel,
  isVerified,
  onUserPress,
  onHashtagPress,
  onLikePress,
  onCommentPress,
  onSharePress,
  onSavePress,
  onOptionsPress,
}) => {
  const hashtags = post.hashtags || [];
  const liked = post.liked ?? false;
  const likeCount = post.likes ?? 0;
  const commentCount = post.comments ?? 0;
  const shareCount = post.shares ?? 0;
  const saved = post.saved ?? false;

  const renderHashtags = () => {
    if (hashtags.length === 0) return null;

    return (
      <View style={styles.hashtagsContainer}>
        {hashtags.map((hashtag, index) => (
          <TouchableOpacity
            key={`${post.id}-hashtag-${index}`}
            style={styles.hashtag}
            onPress={() => onHashtagPress(hashtag)}
            accessibilityRole="button"
            accessibilityLabel={`Hashtag ${hashtag}`}
            accessibilityHint={`Double tap to view posts with ${hashtag} hashtag`}
          >
            <Text style={styles.hashtagText}>{hashtag}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEngagementButton = (
    iconName: string,
    count: number,
    onPress: () => void,
    isActive: boolean = false,
    activeColor?: string
  ) => (
    <TouchableOpacity
      style={styles.engagementButton}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons
        name={iconName as any}
        size={20}
        color={isActive && activeColor ? activeColor : theme.colors.textSecondary}
      />
      {count > 0 && (
        <Text
          style={[
            styles.engagementText,
            isActive && activeColor && { color: activeColor }
          ]}
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Post Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.contractorInfo}
          onPress={() => onUserPress(post.contractorId)}
          accessibilityRole="button"
          accessibilityLabel={`View ${contractorName}'s profile`}
        >
          <Ionicons
            name="person-circle"
            size={48}
            color={theme.colors.textSecondary}
          />
          <View style={styles.contractorDetails}>
            <View style={styles.contractorNameRow}>
              <Text style={styles.contractorName}>{contractorName}</Text>
              {isVerified && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.colors.success}
                />
              )}
            </View>
            <View style={styles.roleRow}>
              <Text style={styles.contractorRole}>{roleLabel}</Text>
              <Text style={styles.postTime}> | {timestampLabel}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onOptionsPress(post)}
          accessibilityRole="button"
          accessibilityLabel="Post options"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Hashtags */}
      {renderHashtags()}

      {/* Engagement Actions */}
      <View style={styles.engagementRow}>
        {renderEngagementButton(
          liked ? 'heart' : 'heart-outline',
          likeCount,
          () => onLikePress(post.id),
          liked,
          theme.colors.error
        )}

        {renderEngagementButton(
          'chatbubble-outline',
          commentCount,
          () => onCommentPress(post.id)
        )}

        {renderEngagementButton(
          'share-outline',
          shareCount,
          () => onSharePress(post.id)
        )}

        <TouchableOpacity
          style={[styles.engagementButton, styles.saveButton]}
          onPress={() => onSavePress(post.id)}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Unsave post' : 'Save post'}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? theme.colors.warning : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contractorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  contractorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 6,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractorRole: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  postTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: 16,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  hashtag: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hashtagText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 50,
  },
  engagementText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  saveButton: {
    marginLeft: 'auto',
  },
});