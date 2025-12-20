import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import {
  useAddEndorsement,
  useNeighborhoodFormatters,
} from '../hooks/useNeighborhood';
import { logger } from '../utils/logger';

interface CommunityEndorsementProps {
  contractorId: string;
  contractorName: string;
  endorserId: string;
  isVisible: boolean;
  onClose: () => void;
  onEndorsementAdded?: () => void;
}

const SKILL_CATEGORIES = [
  {
    category: 'Technical Skills',
    skills: [
      'Plumbing Expertise',
      'Electrical Work',
      'Carpentry Skills',
      'Painting Quality',
      'Problem Solving',
      'Tool Proficiency',
      'Safety Awareness',
      'Code Compliance',
    ],
  },
  {
    category: 'Service Quality',
    skills: [
      'Reliability',
      'Punctuality',
      'Communication',
      'Cleanliness',
      'Attention to Detail',
      'Fair Pricing',
      'Honesty',
      'Professionalism',
    ],
  },
  {
    category: 'Customer Experience',
    skills: [
      'Friendly Service',
      'Patience',
      'Flexibility',
      'Follow-up',
      'Warranty Support',
      'Advice & Tips',
      'Emergency Response',
      'Value for Money',
    ],
  },
];

export const CommunityEndorsement: React.FC<CommunityEndorsementProps> = ({
  contractorId,
  contractorName,
  endorserId,
  isVisible,
  onClose,
  onEndorsementAdded,
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [customSkill, setCustomSkill] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { mutate: addEndorsement, isPending } = useAddEndorsement();
  const { getContractorSpecialtyIcon } = useNeighborhoodFormatters() as any;

  const handleSubmit = async () => {
    const skillToEndorse = customSkill.trim() || selectedSkill;

    if (!skillToEndorse) {
      Alert.alert(
        'Missing Information',
        'Please select or enter a skill to endorse.'
      );
      return;
    }

    if (message.trim().length > 200) {
      Alert.alert(
        'Message Too Long',
        'Please keep your message under 200 characters.'
      );
      return;
    }

    try {
      addEndorsement(
        {
          endorserId,
          contractorId,
          skill: skillToEndorse,
          message: message.trim() || undefined,
        },
        {
          onSuccess: () => {
            logger.info('Endorsement added successfully', {
              contractorId,
              skill: skillToEndorse,
            });

            Alert.alert(
              'Endorsement Added!',
              `Your endorsement for ${contractorName}'s ${skillToEndorse.toLowerCase()} has been added to the community.`,
              [
                {
                  text: 'Great!',
                  onPress: () => {
                    onEndorsementAdded?.();
                    handleClose();
                  },
                },
              ]
            );
          },
          onError: (error) => {
            logger.error('Failed to add endorsement', error);
            Alert.alert(
              'Error',
              'Failed to add your endorsement. Please try again.'
            );
          },
        }
      );
    } catch (error) {
      logger.error('Endorsement submission error', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedSkill('');
    setCustomSkill('');
    setMessage('');
    setExpandedCategory(null);
    onClose();
  };

  const handleSkillSelect = (skill: string) => {
    setSelectedSkill(skill);
    setCustomSkill(''); // Clear custom skill when selecting predefined
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <Modal
      visible={isVisible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name='close' size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Endorse {contractorName}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Introduction */}
          <View style={styles.introSection}>
            <View style={styles.introIcon}>
              <Ionicons name='heart' size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.introTitle}>Help Your Community</Text>
            <Text style={styles.introText}>
              Your endorsement helps neighbors find the best contractors in your
              area. Share what {contractorName} does well!
            </Text>
          </View>

          {/* Skill Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              What would you like to endorse?
            </Text>
            <Text style={styles.sectionSubtitle}>
              Select a skill or enter your own
            </Text>

            {/* Skill Categories */}
            {SKILL_CATEGORIES.map((category) => (
              <View key={category.category} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.category)}
                >
                  <Text style={styles.categoryTitle}>{category.category}</Text>
                  <Ionicons
                    name={
                      expandedCategory === category.category
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                {expandedCategory === category.category && (
                  <View style={styles.skillsGrid}>
                    {category.skills.map((skill) => (
                      <TouchableOpacity
                        key={skill}
                        style={[
                          styles.skillChip,
                          selectedSkill === skill && styles.selectedSkill,
                        ]}
                        onPress={() => handleSkillSelect(skill)}
                      >
                        <Text
                          style={[
                            styles.skillText,
                            selectedSkill === skill && styles.selectedSkillText,
                          ]}
                        >
                          {skill}
                        </Text>
                        {selectedSkill === skill && (
                          <Ionicons
                            name='checkmark-circle'
                            size={16}
                            color='#fff'
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Custom Skill Input */}
            <View style={styles.customSkillContainer}>
              <Text style={styles.customSkillLabel}>
                Or enter your own skill:
              </Text>
              <TextInput
                style={styles.customSkillInput}
                placeholder='e.g., Great at emergency repairs'
                value={customSkill}
                onChangeText={(text) => {
                  setCustomSkill(text);
                  if (text.trim()) setSelectedSkill(''); // Clear selection when typing custom
                }}
                maxLength={50}
              />
              <Text style={styles.characterCount}>
                {customSkill.length}/50 characters
              </Text>
            </View>
          </View>

          {/* Optional Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add a message (optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Share more details about your experience
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder='e.g., Fixed my sink quickly and explained what was wrong. Very professional!'
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical='top'
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {message.length}/200 characters
            </Text>
          </View>

          {/* Preview */}
          {(selectedSkill || customSkill.trim()) && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Ionicons
                    name='heart'
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.previewSkill}>
                    {customSkill.trim() || selectedSkill}
                  </Text>
                </View>
                {message.trim() && (
                  <Text style={styles.previewMessage}>"{message.trim()}"</Text>
                )}
                <Text style={styles.previewAttribution}>
                  — Community member
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedSkill &&
                !customSkill.trim() &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isPending || (!selectedSkill && !customSkill.trim())}
          >
            {isPending ? (
              <ActivityIndicator color='#fff' size='small' />
            ) : (
              <>
                <Ionicons name='heart' size={20} color='#fff' />
                <Text style={styles.submitButtonText}>Add Endorsement</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: theme.spacing[4],
    paddingTop: 60,
    paddingBottom: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: theme.spacing[1],
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
  },
  introSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  introTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  introText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[4],
  },
  categoryContainer: {
    marginBottom: theme.spacing[3],
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: theme.spacing[3],
    gap: theme.spacing[2],
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedSkill: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  skillText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing[1],
  },
  selectedSkillText: {
    color: '#fff',
  },
  customSkillContainer: {
    marginTop: theme.spacing[4],
  },
  customSkillLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  customSkillInput: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  messageInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingTop: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  characterCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing[1],
  },
  previewSection: {
    marginBottom: theme.spacing[4],
  },
  previewTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  previewSkill: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginLeft: theme.spacing[1],
  },
  previewMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginBottom: theme.spacing[2],
    fontStyle: 'italic',
  },
  previewAttribution: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  footer: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing[2],
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#fff',
  },
});

export default CommunityEndorsement;
