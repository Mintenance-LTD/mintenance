import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';
import { SkeletonPostCard } from '../components/SkeletonLoader';
import { AnimationUtils, AnimatedTouchableOpacity } from '../utils/animations';
import { ContractorSocialService } from '../services/ContractorSocialService';
import { ContractorPost, ContractorPostType } from '../types';

interface FeedPost {
  id: string;
  contractorName: string;
  role: string;
  verified: boolean;
  timestamp: string;
  content: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  saved: boolean;
}

const ContractorSocialScreen: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();
  const [posts, setPosts] = useState<FeedPost[]>([
    {
      id: '1',
      contractorName: 'Mike Johnson',
      role: 'Plumber',
      verified: true,
      timestamp: '2h ago',
      content:
        'Just finished a challenging bathroom renovation! The old pipes were completely corroded but we managed to replace everything without damaging the tiles. Sometimes patience pays off! 💪',
      hashtags: ['#plumbing', '#renovation', '#craftsmanship'],
      likes: 24,
      comments: 5,
      shares: 2,
      liked: false,
      saved: false,
    },
    {
      id: '2',
      contractorName: 'Sarah Williams',
      role: 'Electrician',
      verified: true,
      timestamp: '4h ago',
      content:
        "Pro tip: Always check your voltage before starting any electrical work. Safety first! Here's a quick guide for homeowners on identifying electrical hazards.",
      hashtags: ['#electrical', '#safety', '#tips'],
      likes: 18,
      comments: 3,
      shares: 8,
      liked: true,
      saved: true,
    },
    {
      id: '3',
      contractorName: 'David Chen',
      role: 'General Contractor',
      verified: false,
      timestamp: '6h ago',
      content:
        'Looking for a reliable HVAC specialist in downtown area. Have a commercial project that needs immediate attention. DM if interested!',
      hashtags: ['#hvac', '#commercial', '#urgent'],
      likes: 12,
      comments: 7,
      shares: 1,
      liked: false,
      saved: false,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedPostType, setSelectedPostType] =
    useState<ContractorPostType>('project_showcase');
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  useEffect(() => {
    // loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  const onRefresh = async () => {
    haptics.pullToRefresh();
    await loadPosts();
  };

  const toggleLike = (postId: string) => {
    haptics.likePost();

    // Create animated scale value for the specific post
    const scaleValue = new Animated.Value(1);

    // Animate the like action
    AnimationUtils.createLikeAnimation(
      scaleValue,
      new Animated.Value(0)
    ).start();

    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const toggleSave = (postId: string) => {
    haptics.savePost();
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, saved: !post.saved } : post
      )
    );
  };

  const handleComment = (postId: string) => {
    haptics.buttonPress();
    Alert.alert(
      'Comments',
      'Comments feature is coming soon! You can like and save posts for now.',
      [{ text: 'OK' }]
    );
  };

  const handleShare = (postId: string) => {
    haptics.buttonPress();
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, shares: post.shares + 1 } : post
      )
    );
    Alert.alert('Shared!', 'Post shared to your network!', [{ text: 'OK' }]);
  };

  const handleCreatePost = () => {
    haptics.buttonPress();
    if (user?.role === 'contractor') {
      setShowCreateModal(true);
    } else {
      Alert.alert(
        'Access Restricted',
        'Only contractors can create posts in the community feed.',
        [{ text: 'OK' }]
      );
    }
  };

  const submitPost = async () => {
    if (!newPostContent.trim() || !user?.id) {
      Alert.alert('Error', 'Please enter some content for your post.');
      return;
    }

    setIsCreatingPost(true);
    haptics.buttonPress();

    try {
      const newPost = await ContractorSocialService.createPost({
        contractorId: user.id,
        type: selectedPostType as any,
        content: newPostContent.trim(),
        hashtags: extractHashtags(newPostContent),
      });

      // Add to local state for immediate UI update
      const mappedPost: FeedPost = {
        id: newPost.id,
        contractorName: `${user.firstName} ${user.lastName}`,
        role: getPostTypeDisplayName(selectedPostType),
        verified: true,
        timestamp: 'now',
        content: newPost.content,
        hashtags: newPost.hashtags || [],
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        saved: false,
      };

      setPosts((prev) => [mappedPost, ...prev]);
      setShowCreateModal(false);
      setNewPostContent('');

      Alert.alert(
        'Success!',
        'Your post has been shared with the contractor community.',
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create your post. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsCreatingPost(false);
    }
  };

  const extractHashtags = (content: string): string[] => {
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    return hashtags.map((tag) => tag.toLowerCase());
  };

  const getPostTypeDisplayName = (type: ContractorPostType): string => {
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
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.contractorInfo}>
          <Ionicons
            name='person-circle'
            size={48}
            color={theme.colors.textTertiary}
          />
          <View style={styles.contractorDetails}>
            <View style={styles.contractorNameRow}>
              <Text style={styles.contractorName}>{item.contractorName}</Text>
              {item.verified && (
                <Ionicons
                  name='checkmark-circle'
                  size={16}
                  color={theme.colors.secondary}
                />
              )}
            </View>
            <View style={styles.roleRow}>
              <Text style={styles.contractorRole}>{item.role}</Text>
              <Text style={styles.postTime}> • {item.timestamp}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons
            name='ellipsis-horizontal'
            size={20}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{item.content}</Text>

      {/* Hashtags */}
      <View style={styles.hashtagsContainer}>
        {item.hashtags.map((hashtag, index) => (
          <TouchableOpacity
            key={index}
            style={styles.hashtag}
            accessibilityRole='button'
            accessibilityLabel={`Hashtag ${hashtag}`}
            accessibilityHint={`Double tap to view posts with ${hashtag} hashtag`}
          >
            <Text style={styles.hashtagText}>{hashtag}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Engagement Actions */}
      <View style={styles.engagementRow}>
        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => toggleLike(item.id)}
          accessibilityRole='button'
          accessibilityLabel={item.liked ? 'Unlike post' : 'Like post'}
          accessibilityHint={
            item.liked
              ? 'Double tap to unlike this post'
              : 'Double tap to like this post'
          }
          accessibilityState={{ selected: item.liked }}
        >
          <Ionicons
            name={item.liked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.liked ? '#FF3B30' : theme.colors.textSecondary}
          />
          <Text style={styles.engagementText}>{item.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => handleComment(item.id)}
          accessibilityRole='button'
          accessibilityLabel='View comments'
          accessibilityHint={`Double tap to view ${item.comments} comments on this post`}
        >
          <Ionicons
            name='chatbubble-outline'
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.engagementText}>{item.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementButton}
          onPress={() => handleShare(item.id)}
          accessibilityRole='button'
          accessibilityLabel='Share post'
          accessibilityHint='Double tap to share this post with others'
        >
          <Ionicons
            name='share-outline'
            size={20}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.engagementText}>{item.shares}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.engagementButton, styles.saveButton]}
          onPress={() => toggleSave(item.id)}
          accessibilityRole='button'
          accessibilityLabel={item.saved ? 'Remove from saved' : 'Save post'}
          accessibilityHint={
            item.saved
              ? 'Double tap to remove this post from saved'
              : 'Double tap to save this post for later'
          }
          accessibilityState={{ selected: item.saved }}
        >
          <Ionicons
            name={item.saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={
              item.saved ? theme.colors.primary : theme.colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <TouchableOpacity
          style={styles.searchButton}
          accessibilityRole='button'
          accessibilityLabel='Search community posts'
          accessibilityHint='Double tap to search posts in the community feed'
        >
          <Ionicons name='search' size={24} color='#fff' />
        </TouchableOpacity>
      </View>

      {/* Posts Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary} // iOS spinner color
            colors={[theme.colors.primary]} // Android spinner colors
            progressBackgroundColor={theme.colors.surface} // Android background
          />
        }
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name='people-outline' size={50} color='#ccc' />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>
                Be the first to share with the contractor community!
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          loading && posts.length === 0 ? (
            <View>
              <SkeletonPostCard />
              <SkeletonPostCard />
              <SkeletonPostCard />
            </View>
          ) : null
        }
      />

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createPostContainer}>
          <View style={styles.createPostHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.createPostTitle}>Create Post</Text>
            <TouchableOpacity
              onPress={submitPost}
              style={[
                styles.modalSubmitButton,
                { opacity: isCreatingPost ? 0.6 : 1 },
              ]}
              disabled={isCreatingPost}
            >
              {isCreatingPost ? (
                <ActivityIndicator size='small' color='#fff' />
              ) : (
                <Text style={styles.modalSubmitText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.createPostContent}>
            {/* Post Type Selection */}
            <Text style={styles.sectionLabel}>Post Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.postTypeContainer}
            >
              {(
                [
                  'project_showcase',
                  'tip',
                  'before_after',
                  'milestone',
                ] as ContractorPostType[]
              ).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.postTypeOption,
                    selectedPostType === type && styles.postTypeSelected,
                  ]}
                  onPress={() => setSelectedPostType(type)}
                >
                  <Text
                    style={[
                      styles.postTypeText,
                      selectedPostType === type && styles.postTypeTextSelected,
                    ]}
                  >
                    {getPostTypeDisplayName(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Content Input */}
            <Text style={styles.sectionLabel}>
              What's happening in your work?
            </Text>
            <TextInput
              style={styles.postContentInput}
              multiline
              placeholder='Share your project updates, tips, or achievements with the contractor community...'
              placeholderTextColor={theme.colors.textTertiary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              maxLength={500}
              autoFocus
            />
            <Text style={styles.characterCount}>
              {newPostContent.length}/500
            </Text>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Tips for great posts:</Text>
              <Text style={styles.tipText}>
                • Use hashtags like #plumbing #electrical #hvac
              </Text>
              <Text style={styles.tipText}>
                • Share your expertise and help other contractors
              </Text>
              <Text style={styles.tipText}>
                • Show before/after photos of your work
              </Text>
              <Text style={styles.tipText}>
                • Celebrate your achievements and milestones
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Floating Action Button */}
      {user?.role === 'contractor' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreatePost}
          accessibilityRole='button'
          accessibilityLabel='Create new post'
          accessibilityHint='Double tap to create a new post in the community feed'
        >
          <Ionicons name='add' size={24} color='#fff' />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Pure white background
  },
  header: {
    backgroundColor: theme.colors.primary, // Dark blue header
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  searchButton: {
    padding: 8,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: 100,
  },
  // Post Card Styles
  postCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20, // Rounded cards
    padding: 20,
    ...theme.shadows.base,
  },
  postHeader: {
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
    color: theme.colors.textPrimary,
    marginRight: 6,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractorRole: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary, // Dark blue role
  },
  postTime: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  hashtag: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  hashtagText: {
    fontSize: 14,
    color: theme.colors.primary, // Dark blue hashtags
    fontWeight: '500',
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  // Create Post Modal Styles
  createPostContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  createPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.primary,
  },
  createPostTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  modalCloseButton: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: theme.colors.textInverse,
  },
  modalSubmitButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  createPostContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  postTypeContainer: {
    marginBottom: 24,
  },
  postTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  postTypeSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  postTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  postTypeTextSelected: {
    color: theme.colors.textInverse,
  },
  postContentInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 24,
  },
  tipsContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    zIndex: 1000,
  },
});

export default ContractorSocialScreen;
