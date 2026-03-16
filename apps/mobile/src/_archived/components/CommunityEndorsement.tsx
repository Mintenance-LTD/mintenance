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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAddEndorsement,
  useNeighborhoodFormatters,
} from '../hooks/useNeighborhood';
import { logger } from '../utils/logger';
import { theme } from '../theme';

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
  const insets = useSafeAreaInsets();
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [customSkill, setCustomSkill] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { mutate: addEndorsement, isPending } = useAddEndorsement();
  const { getContractorSpecialtyIcon } = useNeighborhoodFormatters() as Record<string, (...args: unknown[]) => unknown>;

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
        <View style={[styles.header, { paddingTop: insets.top }]}>
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
              <Ionicons name='heart' size={32} color={theme.colors.textPrimary} />
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
                            color={theme.colors.textInverse}
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
                placeholderTextColor={theme.colors.textTertiary}
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
              placeholderTextColor={theme.colors.textTertiary}
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
                    color={theme.colors.textPrimary}
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
              <ActivityIndicator color={theme.colors.textInverse} size='small' />
            ) : (
              <>
                <Ionicons name='heart' size={20} color={theme.colors.textInverse} />
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  introSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  introText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 12,
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  selectedSkill: {
    backgroundColor: theme.colors.textPrimary,
  },
  skillText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginRight: 4,
  },
  selectedSkillText: {
    color: theme.colors.textInverse,
  },
  customSkillContainer: {
    marginTop: 16,
  },
  customSkillLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  customSkillInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  messageInput: {
    minHeight: 100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewSkill: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  previewMessage: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  previewAttribution: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 56,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});

export default CommunityEndorsement;
