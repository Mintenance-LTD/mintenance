import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { logger } from '../utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { ContractorPost, ContractorPostComment } from '../types';
import { ContractorSocialService } from '../services/ContractorSocialService';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

const { width: screenWidth } = Dimensions.get('window');

interface Props {
  post: ContractorPost;
  onUpdate?: () => void;
}

const ContractorPostComponent: React.FC<Props> = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const p = post as any;
  const [liked, setLiked] = useState<boolean>(p.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState<number>(p.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ContractorPostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    if (!user) return;

    try {
      const isNowLiked = await ContractorSocialService.toggleLike(
        post.id,
        user.id
      );
      setLiked(isNowLiked);
      setLikesCount((prev: number) =>
        isNowLiked ? prev + 1 : Math.max(0, prev - 1)
      );
    } catch (error) {
      logger.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) return; // Already loaded

    setLoadingComments(true);
    try {
      const postComments = await ContractorSocialService.getPostComments(
        post.id
      );
      setComments(postComments);
    } catch (error) {
      logger.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleShowComments = () => {
    setShowComments(true);
    loadComments();
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      const comment = await ContractorSocialService.createComment(
        post.id,
        user.id,
        newComment.trim()
      );
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      onUpdate?.();
    } catch (error) {
      logger.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const getPostTypeIcon = () => {
    switch (p.postType) {
      case 'work_showcase':
        return 'camera-outline';
      case 'help_request':
        return 'help-circle-outline';
      case 'tip_share':
        return 'bulb-outline';
      case 'equipment_share':
        return 'build-outline';
      case 'referral_request':
        return 'people-outline';
      default:
        return 'chatbox-outline';
    }
  };

  const getPostTypeColor = () => {
    switch (p.postType) {
      case 'work_showcase':
        return '#4CD964';
      case 'help_request':
        return '#FF9500';
      case 'tip_share':
        return theme.colors.info;
      case 'equipment_share':
        return '#5856D6';
      case 'referral_request':
        return '#FF2D92';
      default:
        return '#8E8E93';
    }
  };

  const getPostTypeLabel = () => {
    switch (p.postType) {
      case 'work_showcase':
        return 'Work Showcase';
      case 'help_request':
        return 'Help Request';
      case 'tip_share':
        return 'Tip Share';
      case 'equipment_share':
        return 'Equipment Share';
      case 'referral_request':
        return 'Referral Request';
      default:
        return 'Post';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar}>
            {p.contractor?.profileImageUrl ? (
              <Image
                source={{ uri: p.contractor.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {p.contractor?.firstName?.[0]}
                {p.contractor?.lastName?.[0]}
              </Text>
            )}
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>
              {p.contractor?.firstName} {p.contractor?.lastName}
            </Text>
            <View style={styles.postMeta}>
              <View
                style={[
                  styles.postTypeBadge,
                  { backgroundColor: getPostTypeColor() },
                ]}
              >
                <Ionicons name={getPostTypeIcon()} size={12} color='#fff' />
                <Text style={styles.postTypeText}>{getPostTypeLabel()}</Text>
              </View>
              <Text style={styles.timeText}>{formatTimeAgo(p.createdAt)}</Text>
            </View>
          </View>
        </View>

        {p.urgencyLevel && (
          <View
            style={[
              styles.urgencyBadge,
              {
                backgroundColor:
                  p.urgencyLevel === 'high'
                    ? '#FF3B30'
                    : p.urgencyLevel === 'medium'
                      ? '#FF9500'
                      : '#4CD964',
              },
            ]}
          >
            <Text style={styles.urgencyText}>
              {p.urgencyLevel.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.description}>{p.content}</Text>

        {/* Skills Used */}
        {p.skillsUsed && p.skillsUsed.length > 0 && (
          <View style={styles.skillsContainer}>
            <Text style={styles.skillsLabel}>Skills used:</Text>
            <View style={styles.skillsRow}>
              {p.skillsUsed.map((skill: string, index: number) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Project Details */}
        {p.postType === 'work_showcase' && (
          <View style={styles.projectDetails}>
            {p.projectDuration && (
              <View style={styles.detailItem}>
                <Ionicons name='time-outline' size={16} color='#666' />
                <Text style={styles.detailText}>
                  {p.projectDuration}h duration
                </Text>
              </View>
            )}
            {p.projectCost && (
              <View style={styles.detailItem}>
                <Ionicons name='cash-outline' size={16} color='#666' />
                <Text style={styles.detailText}>${p.projectCost}</Text>
              </View>
            )}
          </View>
        )}

        {/* Equipment/Rental Details */}
        {p.postType === 'equipment_share' && (
          <View style={styles.equipmentDetails}>
            <View style={styles.detailItem}>
              <Ionicons name='build-outline' size={16} color='#666' />
              <Text style={styles.detailText}>{p.itemName}</Text>
            </View>
            {p.rentalPrice && (
              <View style={styles.detailItem}>
                <Ionicons name='cash-outline' size={16} color='#666' />
                <Text style={styles.detailText}>${p.rentalPrice}/day</Text>
              </View>
            )}
          </View>
        )}

        {/* Images */}
        {p.images && p.images.length > 0 && (
          <ScrollView
            horizontal
            style={styles.imagesContainer}
            showsHorizontalScrollIndicator={false}
          >
            {p.images.map((imageUrl: string, index: number) => (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={styles.postImage}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, liked && styles.actionButtonLiked]}
          onPress={handleLike}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#FF3B30' : '#666'}
          />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShowComments}
        >
          <Ionicons name='chatbubble-outline' size={20} color='#666' />
          <Text style={styles.actionText}>{p.commentsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name='share-outline' size={20} color='#666' />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Ionicons name='close' size={24} color={theme.colors.info} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.commentsList}>
            {loadingComments ? (
              <Text style={styles.loadingText}>Loading comments...</Text>
            ) : comments.length > 0 ? (
              comments.map((comment: any) => (
                <View key={comment.id} style={styles.comment}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.contractor?.firstName}{' '}
                      {comment.contractor?.lastName}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatTimeAgo(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.commentText}</Text>
                  {comment.isSolution && (
                    <View style={styles.solutionBadge}>
                      <Ionicons
                        name='checkmark-circle'
                        size={16}
                        color='#4CD964'
                      />
                      <Text style={styles.solutionText}>Solution</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noCommentsText}>No comments yet</Text>
            )}
          </ScrollView>

          {user?.role === 'contractor' && (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentTextInput}
                placeholder='Add a comment...'
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Ionicons
                  name='send'
                  size={20}
                  color={newComment.trim() ? theme.colors.info : '#ccc'}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    paddingBottom: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.info,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  postTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  postTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  skillsContainer: {
    marginBottom: 12,
  },
  skillsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  projectDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  equipmentDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  imagesContainer: {
    marginTop: 8,
  },
  postImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 10,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 5,
  },
  actionButtonLiked: {
    // Additional styling for liked state
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  actionTextLiked: {
    color: '#FF3B30',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsList: {
    flex: 1,
    padding: 15,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  comment: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  solutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  solutionText: {
    fontSize: 12,
    color: '#4CD964',
    fontWeight: '600',
    marginLeft: 4,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});

export default ContractorPostComponent;
