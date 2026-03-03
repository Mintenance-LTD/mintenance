/**
 * DisputeScreen - Create and manage job disputes
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type { JobsStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner } from '../components/shared';
import { Banner } from '../components/ui/Banner';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';

interface DisputeScreenParams {
  jobId: string;
  jobTitle: string;
}

interface Props {
  route: RouteProp<{ Dispute: DisputeScreenParams }, 'Dispute'>;
  navigation: NativeStackNavigationProp<JobsStackParamList, 'Dispute'>;
}

const DISPUTE_REASONS = [
  { id: 'quality', label: 'Work Quality', icon: 'construct-outline' as const },
  { id: 'incomplete', label: 'Incomplete Work', icon: 'alert-circle-outline' as const },
  { id: 'damage', label: 'Property Damage', icon: 'warning-outline' as const },
  { id: 'timeline', label: 'Timeline Violation', icon: 'time-outline' as const },
  { id: 'communication', label: 'Communication Issues', icon: 'chatbubble-outline' as const },
  { id: 'pricing', label: 'Pricing Dispute', icon: 'cash-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

export const DisputeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params;
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const handleAddEvidence = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setAttachments(prev => [...prev, ...result.assets].slice(0, 6));
    }
  };

  const removeAttachment = (uri: string) => {
    setAttachments(prev => prev.filter(a => a.uri !== uri));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!selectedReason) {
      setFormError('Please select a reason for the dispute.');
      return;
    }
    if (description.trim().length < 20) {
      setFormError('Please provide at least 20 characters describing the issue.');
      return;
    }

    setSubmitting(true);
    try {
      const escrowResponse = await apiClient.get<{
        escrow: { id: string };
      }>(`/api/jobs/${jobId}/escrow`);

      const evidenceUris = attachments.map(a => a.uri);
      await apiClient.post('/api/disputes/create', {
        escrowId: escrowResponse.escrow.id,
        reason: selectedReason,
        description: description.trim(),
        priority: 'medium',
        evidenceUris,
      });
      Alert.alert(
        'Dispute Submitted',
        'Your dispute has been submitted. Our team will review it within 48 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      logger.error('Failed to submit dispute', error);
      setFormError('Failed to submit dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Raise Dispute" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Banner message={formError ?? ''} variant="error" />
        <View style={styles.jobCard}>
          <Ionicons name="briefcase-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.jobTitle} numberOfLines={1}>{jobTitle}</Text>
        </View>

        <Text style={styles.sectionTitle}>What's the issue?</Text>
        <View style={styles.reasonGrid}>
          {DISPUTE_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonCard,
                selectedReason === reason.id && styles.reasonCardSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Ionicons
                name={reason.icon}
                size={24}
                color={selectedReason === reason.id ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[
                styles.reasonLabel,
                selectedReason === reason.id && styles.reasonLabelSelected,
              ]}>
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Describe the issue</Text>
        <TextInput
          style={styles.descriptionInput}
          multiline
          numberOfLines={6}
          placeholder="Please describe the issue in detail. Include any relevant dates, communications, or evidence..."
          placeholderTextColor={theme.colors.placeholder}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {description.length}/500 characters (min 20)
        </Text>

        {/* Evidence Attachment */}
        <Text style={styles.sectionTitle}>Attach Evidence</Text>
        {attachments.length > 0 && (
          <FlatList
            data={attachments}
            horizontal
            keyExtractor={item => item.uri}
            showsHorizontalScrollIndicator={false}
            style={styles.thumbList}
            renderItem={({ item }) => (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
                <TouchableOpacity style={styles.thumbRemove} onPress={() => removeAttachment(item.uri)}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
        <TouchableOpacity style={styles.evidenceButton} onPress={handleAddEvidence} disabled={attachments.length >= 6}>
          <Ionicons name="camera-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.evidenceButtonText}>
            {attachments.length === 0 ? 'Add Photos' : `${attachments.length}/6 photos added`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <LoadingSpinner />
          ) : (
            <>
              <Ionicons name="shield-outline" size={20} color={theme.colors.white} />
              <Text style={styles.submitButtonText}>Submit Dispute</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Disputes are reviewed by our team within 48 hours. Both parties will be
          notified and given the opportunity to respond. Payment will remain in
          escrow until the dispute is resolved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing[4],
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[5],
    ...theme.shadows.sm,
  },
  jobTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing[5],
    gap: theme.spacing[2],
  },
  reasonCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  reasonCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  reasonLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  reasonLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  descriptionInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 140,
    marginBottom: theme.spacing[1],
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginBottom: theme.spacing[5],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[2],
  },
  disclaimer: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
  thumbList: { marginBottom: theme.spacing[3] },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: theme.colors.border },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
  },
  evidenceButtonText: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600' },
});

export default DisputeScreen;


