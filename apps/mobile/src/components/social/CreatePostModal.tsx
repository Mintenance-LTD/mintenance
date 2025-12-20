import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Input } from '../ui/Input';
import { theme } from '../../theme';
import { ContractorPostType } from '../../types';
import { SocialFeedUtils } from './SocialFeedUtils';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, type: ContractorPostType) => Promise<void>;
  initialContent?: string;
  initialType?: ContractorPostType;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialContent = '',
  initialType = 'project_showcase',
}) => {
  const [content, setContent] = useState(initialContent);
  const [selectedType, setSelectedType] = useState<ContractorPostType>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postTypes: ContractorPostType[] = [
    'project_showcase',
    'tip',
    'before_after',
    'milestone',
  ];

  const handleClose = () => {
    if (isSubmitting) return;

    if (content.trim()) {
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard your post? Your content will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setContent('');
              onClose();
            }
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const validation = SocialFeedUtils.validatePostContent(content);

    if (!validation.isValid) {
      Alert.alert('Invalid Post', validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content, selectedType);
      setContent('');
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to create post. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = content.trim().length >= 10 && content.length <= 500 && !isSubmitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={isSubmitting}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Post</Text>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[
              styles.submitButton,
              { opacity: canSubmit ? 1 : 0.6 },
            ]}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Post Type Selection */}
          <Text style={styles.sectionLabel}>Post Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeContainer}
            contentContainerStyle={styles.typeContent}
          >
            {postTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  selectedType === type && styles.typeSelected,
                ]}
                onPress={() => setSelectedType(type)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.typeText,
                    selectedType === type && styles.typeTextSelected,
                  ]}
                >
                  {SocialFeedUtils.getPostTypeDisplayName(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content Input */}
          <View style={styles.inputContainer}>
            <Input
              label="What's happening in your work?"
              placeholder="Share your project updates, tips, or achievements with the contractor community..."
              value={content}
              onChangeText={setContent}
              maxLength={500}
              multiline
              numberOfLines={6}
              autoFocus
              leftIcon="create-outline"
              variant="outline"
              size="lg"
              fullWidth
              editable={!isSubmitting}
            />
            <View style={styles.characterCountContainer}>
              <Text
                style={[
                  styles.characterCount,
                  content.length > 450 && styles.characterCountWarning,
                  content.length >= 500 && styles.characterCountError,
                ]}
              >
                {content.length}/500
              </Text>
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips for great posts:</Text>
            <TipItem text="Use hashtags like #plumbing #electrical #hvac" />
            <TipItem text="Share your expertise and help other contractors" />
            <TipItem text="Show before/after photos of your work" />
            <TipItem text="Celebrate your achievements and milestones" />
          </View>

          {/* Post Preview */}
          {content.trim() && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Preview:</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewType}>
                  {SocialFeedUtils.getPostTypeDisplayName(selectedType)}
                </Text>
                <Text style={styles.previewContent}>{content}</Text>
                {SocialFeedUtils.extractHashtags(content).length > 0 && (
                  <View style={styles.previewHashtags}>
                    {SocialFeedUtils.extractHashtags(content).map((hashtag, index) => (
                      <View key={index} style={styles.previewHashtag}>
                        <Text style={styles.previewHashtagText}>{hashtag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const TipItem: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.tipText}>• {text}</Text>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[1],
  },
  closeText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  submitButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.base,
    minWidth: 60,
    alignItems: 'center',
  },
  submitText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  typeContainer: {
    marginBottom: theme.spacing[4],
  },
  typeContent: {
    paddingRight: theme.spacing[4],
  },
  typeOption: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  typeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  typeTextSelected: {
    color: theme.colors.white,
  },
  inputContainer: {
    marginBottom: theme.spacing[4],
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: theme.spacing[2],
  },
  characterCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  characterCountWarning: {
    color: theme.colors.warning,
  },
  characterCountError: {
    color: theme.colors.error,
  },
  tipsContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
  },
  tipsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  tipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.sm,
    marginBottom: theme.spacing[1],
  },
  previewContainer: {
    marginBottom: theme.spacing[6],
  },
  previewTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewType: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing[2],
  },
  previewContent: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
    marginBottom: theme.spacing[3],
  },
  previewHashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  previewHashtag: {
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.base,
  },
  previewHashtagText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default CreatePostModal;