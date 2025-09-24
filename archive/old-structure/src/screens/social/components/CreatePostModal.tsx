/**
 * Create Post Modal Component
 *
 * Modal for creating new social media posts with content and type selection.
 * Focused component with single responsibility.
 *
 * @filesize Target: <350 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/ui/Input';
import { theme } from '../../../theme';
import type { ContractorPostType } from '../../../types';

interface PostTypeOption {
  id: ContractorPostType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const postTypeOptions: PostTypeOption[] = [
  {
    id: 'project_showcase',
    title: 'Project Showcase',
    description: 'Share your completed work',
    icon: 'hammer-outline',
    color: theme.colors.info,
  },
  {
    id: 'tip',
    title: 'Pro Tip',
    description: 'Share expertise and advice',
    icon: 'bulb-outline',
    color: '#FF9500',
  },
  {
    id: 'before_after',
    title: 'Before/After',
    description: 'Show transformation results',
    icon: 'repeat-outline',
    color: '#34C759',
  },
  {
    id: 'milestone',
    title: 'Milestone',
    description: 'Celebrate achievements',
    icon: 'trophy-outline',
    color: '#FF2D92',
  },
];

interface CreatePostModalProps {
  visible: boolean;
  content: string;
  selectedType: ContractorPostType;
  isCreating: boolean;
  onClose: () => void;
  onContentChange: (text: string) => void;
  onTypeSelect: (type: ContractorPostType) => void;
  onSubmit: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  content,
  selectedType,
  isCreating,
  onClose,
  onContentChange,
  onTypeSelect,
  onSubmit,
}) => {
  const isSubmitDisabled = !content.trim() || isCreating;
  const characterCount = content.length;
  const maxLength = 500;

  const renderPostTypeOption = (option: PostTypeOption) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.typeOption,
        selectedType === option.id && styles.typeOptionSelected
      ]}
      onPress={() => onTypeSelect(option.id)}
      accessibilityRole="button"
      accessibilityLabel={`Select ${option.title} post type`}
    >
      <View style={[styles.typeIcon, { backgroundColor: `${option.color}15` }]}>
        <Ionicons
          name={option.icon as any}
          size={24}
          color={option.color}
        />
      </View>
      <View style={styles.typeDetails}>
        <Text style={styles.typeTitle}>{option.title}</Text>
        <Text style={styles.typeDescription}>{option.description}</Text>
      </View>
      {selectedType === option.id && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={theme.colors.primary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Post</Text>

          <TouchableOpacity
            onPress={onSubmit}
            disabled={isSubmitDisabled}
            style={[
              styles.submitButton,
              isSubmitDisabled && styles.submitButtonDisabled
            ]}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Post Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Post Type</Text>
            <View style={styles.typeOptions}>
              {postTypeOptions.map(renderPostTypeOption)}
            </View>
          </View>

          {/* Content Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content</Text>
            <Input
              placeholder="Share something with the community..."
              value={content}
              onChangeText={onContentChange}
              maxLength={maxLength}
              multiline
              numberOfLines={6}
              autoFocus
              leftIcon="create-outline"
              variant="outline"
              size="lg"
              fullWidth
            />
            <Text style={styles.characterCount}>
              {characterCount}/{maxLength}
            </Text>
          </View>

          {/* Tips */}
          <View style={styles.section}>
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  typeOptions: {
    gap: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeDetails: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  tipsContainer: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
});