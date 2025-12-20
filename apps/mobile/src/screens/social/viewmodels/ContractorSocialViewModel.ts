/**
 * Contractor Social View Model
 *
 * Handles all business logic for the ContractorSocial screen.
 * Manages feed data loading, post creation, engagement, and user interactions.
 *
 * @filesize Target: <350 lines
 * @compliance Architecture principles - Business logic separation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { ContractorSocialService } from '../../../services/ContractorSocialService';
import { logger } from '../../../utils/logger';
import type { ContractorPost, ContractorPostType } from '../../../types';

export interface FeedPost extends ContractorPost {
  contractor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    rating?: number;
    totalJobsCompleted?: number;
  };
  isLikedByUser?: boolean;
  liked?: boolean;
  saved?: boolean;
}

export interface SocialViewModel {
  // State
  posts: FeedPost[];
  loading: boolean;
  refreshing: boolean;

  // Post Creation
  showCreateModal: boolean;
  newPostContent: string;
  selectedPostType: ContractorPostType;
  isCreatingPost: boolean;

  // Actions
  loadPosts: (options?: { skipLoadingState?: boolean; silent?: boolean }) => Promise<void>;
  refreshFeed: () => Promise<void>;

  // Post Creation
  setShowCreateModal: (show: boolean) => void;
  setNewPostContent: (content: string) => void;
  setSelectedPostType: (type: ContractorPostType) => void;
  createPost: () => Promise<void>;

  // Post Interactions
  likePost: (postId: string) => Promise<void>;
  commentOnPost: (postId: string) => void;
  sharePost: (postId: string) => void;
  savePost: (postId: string) => Promise<void>;

  // Utilities
  normalizeFeedPost: (post: ContractorPost) => FeedPost;
  extractHashtags: (content: string) => string[];
  formatRelativeTime: (isoDate: string) => string;
  getContractorName: (post: FeedPost) => string;
  isContractorVerified: (post: FeedPost) => boolean;
  getPostTypeDisplayName: (type: ContractorPostType) => string;
}

/**
 * Custom hook for ContractorSocial business logic
 */
export const useContractorSocialViewModel = (user: any): SocialViewModel => {
  // Feed State
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Post Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedPostType, setSelectedPostType] = useState<ContractorPostType>('project_showcase');
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Ref for posts state management
  const postsRef = useRef<FeedPost[]>([]);
  const updatePostsState = useCallback((updater: (prev: FeedPost[]) => FeedPost[]) => {
    setPosts((prev) => {
      const next = updater(prev);
      postsRef.current = next;
      return next;
    });
  }, []);

  // Load posts from service
  const loadPosts = useCallback(async (options: { skipLoadingState?: boolean; silent?: boolean } = {}) => {
    if (!user?.id) {
      updatePostsState(() => []);
      setLoading(false);
      return;
    }

    if (!options.skipLoadingState) {
      setLoading(true);
    }

    try {
      const rawPosts = await ContractorSocialService.getFeedPosts(user.id);
      const normalizedPosts = rawPosts.map(normalizeFeedPost);
      updatePostsState(() => normalizedPosts);

      if (!options.silent) {
        logger.info('Posts loaded successfully', { count: normalizedPosts.length });
      }
    } catch (error) {
      logger.error('Error loading posts:', error);
      if (!options.silent) {
        Alert.alert('Error', 'Failed to load posts. Please try again.');
      }
      updatePostsState(() => []);
    } finally {
      if (!options.skipLoadingState) {
        setLoading(false);
      }
    }
  }, [user?.id, updatePostsState]);

  // Refresh feed
  const refreshFeed = useCallback(async () => {
    setRefreshing(true);
    await loadPosts({ skipLoadingState: true });
    setRefreshing(false);
  }, [loadPosts]);

  // Create new post
  const createPost = useCallback(async () => {
    if (!newPostContent.trim() || !user?.id) {
      Alert.alert('Error', 'Please enter some content for your post.');
      return;
    }

    setIsCreatingPost(true);

    try {
      const newPost = await ContractorSocialService.createPost({
        contractorId: user.id,
        type: selectedPostType,
        content: newPostContent.trim(),
        hashtags: extractHashtags(newPostContent),
      });

      const mappedPost = normalizeFeedPost({
        ...newPost,
        contractor: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      } as ContractorPost);

      updatePostsState((prev) => [mappedPost, ...prev]);
      setShowCreateModal(false);
      setNewPostContent('');

      Alert.alert(
        'Success!',
        'Your post has been shared with the contractor community.',
        [{ text: 'Great!' }]
      );

      // Refresh to get latest data
      await loadPosts({ skipLoadingState: true, silent: true });
    } catch (error) {
      logger.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create your post. Please try again.');
    } finally {
      setIsCreatingPost(false);
    }
  }, [newPostContent, user, selectedPostType, extractHashtags, normalizeFeedPost, updatePostsState, loadPosts]);

  // Like/unlike post
  const likePost = useCallback(async (postId: string) => {
    if (!user?.id) return;

    try {
      const currentPost = postsRef.current.find(p => p.id === postId);
      if (!currentPost) return;

      const wasLiked = currentPost.liked;
      const newLikedState = !wasLiked;
      const newLikeCount = wasLiked ? (currentPost.likes || 0) - 1 : (currentPost.likes || 0) + 1;

      // Optimistic update
      updatePostsState((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, liked: newLikedState, likes: newLikeCount }
            : post
        )
      );

      // API call
      if (newLikedState) {
        await ContractorSocialService.likePost(postId, user.id);
      } else {
        await ContractorSocialService.unlikePost(postId, user.id);
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
      // Revert optimistic update
      await loadPosts({ skipLoadingState: true, silent: true });
    }
  }, [user?.id, updatePostsState, loadPosts]);

  // Comment on post (navigation handled by coordinator)
  const commentOnPost = useCallback((postId: string) => {
    // This will be handled by navigation coordinator
    logger.info('Opening comments for post:', postId);
  }, []);

  // Share post
  const sharePost = useCallback(async (postId: string) => {
    try {
      await ContractorSocialService.sharePost(postId, user?.id || '');

      // Update share count
      updatePostsState((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, shares: (post.shares || 0) + 1 }
            : post
        )
      );
    } catch (error) {
      logger.error('Error sharing post:', error);
    }
  }, [user?.id, updatePostsState]);

  // Save/unsave post
  const savePost = useCallback(async (postId: string) => {
    if (!user?.id) return;

    try {
      const currentPost = postsRef.current.find(p => p.id === postId);
      if (!currentPost) return;

      const wasSaved = currentPost.saved;
      const newSavedState = !wasSaved;

      // Optimistic update
      updatePostsState((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, saved: newSavedState }
            : post
        )
      );

      // API call
      if (newSavedState) {
        await ContractorSocialService.savePost(postId, user.id);
      } else {
        await ContractorSocialService.unsavePost(postId, user.id);
      }
    } catch (error) {
      logger.error('Error toggling save:', error);
      // Revert optimistic update
      await loadPosts({ skipLoadingState: true, silent: true });
    }
  }, [user?.id, updatePostsState, loadPosts]);

  // Load posts on user change
  useEffect(() => {
    if (user?.id) {
      void loadPosts();
    } else {
      updatePostsState(() => []);
      setLoading(false);
    }
  }, [user?.id, loadPosts, updatePostsState]);

  // Utility functions
  const normalizeFeedPost = useCallback((post: ContractorPost): FeedPost => {
    const enriched = post as FeedPost;
    return {
      ...post,
      contractor: enriched.contractor,
      hashtags: post.hashtags || [],
      likes: post.likes ?? 0,
      comments: post.comments ?? 0,
      shares: post.shares ?? 0,
      liked: enriched.liked ?? enriched.isLikedByUser ?? false,
      saved: enriched.saved ?? false,
    };
  }, []);

  const extractHashtags = useCallback((content: string): string[] => {
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    return hashtags.map((tag) => tag.toLowerCase());
  }, []);

  const formatRelativeTime = useCallback((isoDate: string): string => {
    const date = isoDate ? new Date(isoDate) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return 'Just now';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y ago`;
  }, []);

  const getContractorName = useCallback((post: FeedPost): string => {
    const first = post.contractor?.firstName ?? '';
    const last = post.contractor?.lastName ?? '';
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;

    if (post.contractorId === user?.id) {
      const fallback = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return fallback || 'You';
    }

    return 'Community Member';
  }, [user]);

  const isContractorVerified = useCallback((post: FeedPost): boolean => {
    return Boolean(post.contractor?.totalJobsCompleted && post.contractor.totalJobsCompleted >= 5);
  }, []);

  const getPostTypeDisplayName = useCallback((type: ContractorPostType): string => {
    switch (type) {
      case 'project_showcase':
        return 'Project Showcase';
      case 'tip':
        return 'Pro Tip';
      case 'before_after':
        return 'Before/After';
      case 'milestone':
        return 'Milestone';
      default:
        return 'Update';
    }
  }, []);

  return {
    // State
    posts,
    loading,
    refreshing,

    // Post Creation
    showCreateModal,
    newPostContent,
    selectedPostType,
    isCreatingPost,

    // Actions
    loadPosts,
    refreshFeed,

    // Post Creation
    setShowCreateModal,
    setNewPostContent,
    setSelectedPostType,
    createPost,

    // Post Interactions
    likePost,
    commentOnPost,
    sharePost,
    savePost,

    // Utilities
    normalizeFeedPost,
    extractHashtags,
    formatRelativeTime,
    getContractorName,
    isContractorVerified,
    getPostTypeDisplayName,
  };
};