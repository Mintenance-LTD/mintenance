import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';
import { logger } from '../utils/logger';
import { SkeletonPostCard } from '../components/SkeletonLoader';
import { ContractorSocialService } from '../services/ContractorSocialService';
import { ContractorPostType } from '../types';
import { FeedPostCard } from '../components/social/FeedPostCard';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { SocialFeedUtils, type FeedPost } from '../components/social/SocialFeedUtils';

const ContractorSocialScreen: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();

  // State management
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Ref for optimized state updates
  const postsRef = useRef<FeedPost[]>([]);

  const updatePostsState = (updater: (prev: FeedPost[]) => FeedPost[]) => {
    setPosts((prev) => {
      const next = updater(prev);
      postsRef.current = next;
      return next;
    });
  };

  // Effects
  useEffect(() => {
    if (user?.id) {
      void loadPosts();
    } else {
      updatePostsState(() => []);
      setLoading(false);
    }
  }, [user?.id]);

  // Data loading functions
  const loadPosts = async (options?: { skipLoadingState?: boolean; silent?: boolean }) => {
    try {
      if (!options?.skipLoadingState) {
        updatePostsState(() => []);
        setLoading(true);
      }

      if (!user?.id) {
        logger.warn('ContractorSocialScreen', 'loadPosts called without user ID');
        return;
      }

      // Log activity
      if (!options?.silent) {
        logger.info('ContractorSocialScreen', 'Loading contractor social feed', {
          userId: user.id,
          userRole: user.role,
        });
      }

      // Fetch feed data
      const feed = await ContractorSocialService.getFeedPosts(user.id);

      updatePostsState((prev) => {
        // Normalize and merge posts
        const next = feed.map((post) => {
          const normalized = SocialFeedUtils.normalizeFeedPost(post);
          const existing = prev.find((existingPost) => existingPost.id === normalized.id);

          return existing ? { ...existing, ...normalized } : normalized;
        });

        return next;
      });

      if (!options?.silent) {
        logger.info('ContractorSocialScreen', 'Successfully loaded social feed', {
          postCount: feed.length,
        });
      }
    } catch (error) {
      logger.error('ContractorSocialScreen', 'Failed to load posts', error);
      Alert.alert(
        'Unable to Load Feed',
        'There was a problem loading the contractor community feed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    haptics.buttonPress();

    try {
      await loadPosts({ skipLoadingState: true, silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  // Post interaction handlers
  const handleLike = async (postId: string) => {
    if (!user?.id) return;

    haptics.buttonPress();

    // Optimistic update
    updatePostsState((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const currentlyLiked = post.liked ?? false;
        const newLikeCount = currentlyLiked
          ? Math.max(0, (post.likes ?? 0) - 1)
          : (post.likes ?? 0) + 1;

        return {
          ...post,
          liked: !currentlyLiked,
          likes: newLikeCount,
        };
      })
    );

    try {
      await ContractorSocialService.toggleLike(postId, user.id);
      logger.info('ContractorSocialScreen', 'Toggled post like', { postId, userId: user.id });
    } catch (error) {
      logger.error('ContractorSocialScreen', 'Failed to toggle like', error);

      // Revert optimistic update
      updatePostsState((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

          const currentlyLiked = post.liked ?? false;
          const revertedLikeCount = currentlyLiked
            ? Math.max(0, (post.likes ?? 0) - 1)
            : (post.likes ?? 0) + 1;

          return {
            ...post,
            liked: !currentlyLiked,
            likes: revertedLikeCount,
          };
        })
      );

      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  const handleSave = (postId: string) => {
    haptics.buttonPress();

    updatePostsState((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, saved: !post.saved } : post
      )
    );

    logger.info('ContractorSocialScreen', 'Toggled post save', { postId });
  };

  const handleComment = (postId: string) => {
    haptics.buttonPress();
    logger.info('ContractorSocialScreen', 'Comment button pressed', { postId });
    // TODO: Navigate to comment screen or show comment modal
  };

  const handleShare = (postId: string) => {
    haptics.buttonPress();

    updatePostsState((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, shares: (post.shares ?? 0) + 1 } : post
      )
    );

    logger.info('ContractorSocialScreen', 'Post shared', { postId });
    // TODO: Implement actual sharing functionality
  };

  const handleMenuPress = (postId: string) => {
    haptics.buttonPress();
    logger.info('ContractorSocialScreen', 'Post menu pressed', { postId });
    // TODO: Show post options menu
  };

  // Post creation handlers
  const handleCreatePost = () => {
    if (user?.role !== 'contractor') {
      Alert.alert(
        'Feature Unavailable',
        'Only contractors can create posts in the community feed.'
      );
      return;
    }

    haptics.buttonPress();
    setShowCreateModal(true);
  };

  const handleSubmitPost = async (content: string, type: ContractorPostType) => {
    if (!user?.id) return;

    try {
      const newPost = await ContractorSocialService.createPost({
        contractorId: user.id,
        type,
        content: content.trim(),
        hashtags: SocialFeedUtils.extractHashtags(content),
      });

      const mappedPost = SocialFeedUtils.normalizeFeedPost({
        ...newPost,
        contractor: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
      });

      updatePostsState((prev) => [mappedPost, ...prev]);

      logger.info('ContractorSocialScreen', 'Successfully created post', {
        postId: newPost.id,
        type,
        contentLength: content.length,
      });

      haptics.successNotification();
    } catch (error) {
      logger.error('ContractorSocialScreen', 'Failed to create post', error);
      throw error; // Let the modal handle the error display
    }
  };

  // Render functions
  const renderPost = ({ item }: { item: FeedPost }) => (
    <FeedPostCard
      post={item}
      currentUser={user}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      onSave={handleSave}
      onMenuPress={handleMenuPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={50} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptyText}>
        Be the first to share with the contractor community!
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View>
      <SkeletonPostCard />
      <SkeletonPostCard />
      <SkeletonPostCard />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.secondary]}
            tintColor={theme.colors.secondary}
          />
        }
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : renderEmptyState}
        ListHeaderComponent={loading && posts.length === 0 ? renderLoadingState : null}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmitPost}
      />

      {/* Floating Action Button */}
      {user?.role === 'contractor' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreatePost}
          accessibilityRole="button"
          accessibilityLabel="Create new post"
          accessibilityHint="Double tap to create a new post in the community feed"
        >
          <Ionicons name="add" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingVertical: theme.spacing[2],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[12],
    paddingHorizontal: theme.spacing[6],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing[6],
    right: theme.spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
});

export default ContractorSocialScreen;