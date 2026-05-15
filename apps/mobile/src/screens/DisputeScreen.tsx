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
import { ScreenHeader, LoadingSpinner } from '../components/shared';
import { Banner } from '../components/ui/Banner';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import { me } from '../design-system/mint-editorial';

interface DisputeScreenParams {
  jobId: string;
  jobTitle: string;
}

interface Props {
  route: RouteProp<{ Dispute: DisputeScreenParams }, 'Dispute'>;
  navigation: NativeStackNavigationProp<JobsStackParamList, 'Dispute'>;
}

const DISPUTE_REASONS = [
  {
    id: 'quality',
    label: 'Work Quality',
    icon: 'construct-outline' as const,
    iconColor: me.accent,
    iconBg: me.warnBg,
  },
  {
    id: 'incomplete',
    label: 'Incomplete Work',
    icon: 'alert-circle-outline' as const,
    iconColor: me.errFg,
    iconBg: me.errBg,
  },
  {
    id: 'damage',
    label: 'Property Damage',
    icon: 'warning-outline' as const,
    iconColor: me.errFg,
    iconBg: me.errBg,
  },
  {
    id: 'timeline',
    label: 'Timeline Violation',
    icon: 'time-outline' as const,
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'chatbubble-outline' as const,
    iconColor: '#8B5CF6',
    iconBg: '#EDE9FE',
  },
  {
    id: 'pricing',
    label: 'Pricing Dispute',
    icon: 'cash-outline' as const,
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline' as const,
    iconColor: me.ink2,
    iconBg: me.bg2,
  },
];

export const DisputeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params;
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);

  const handleAddEvidence = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo access to attach evidence.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets].slice(0, 6));
    }
  };

  const removeAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!selectedReason) {
      setFormError('Please select a reason for the dispute.');
      return;
    }
    if (description.trim().length < 20) {
      setFormError(
        'Please provide at least 20 characters describing the issue.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const escrowResponse = await apiClient.get<{
        escrow: { id: string };
      }>(`/api/jobs/${jobId}/escrow`);

      const evidenceUris = attachments.map((a) => a.uri);
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
      <ScreenHeader
        title='Raise Dispute'
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Banner message={formError ?? ''} variant='error' />

        <View style={styles.jobCard}>
          <View style={styles.jobIconWrap}>
            <Ionicons name='briefcase-outline' size={18} color='#3B82F6' />
          </View>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {jobTitle}
          </Text>
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
              accessibilityRole='button'
              accessibilityLabel={`Dispute reason: ${reason.label}`}
              accessibilityState={{ selected: selectedReason === reason.id }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.reasonIconWrap,
                  { backgroundColor: reason.iconBg },
                ]}
              >
                <Ionicons
                  name={reason.icon}
                  size={22}
                  color={reason.iconColor}
                />
              </View>
              <Text
                style={[
                  styles.reasonLabel,
                  selectedReason === reason.id && styles.reasonLabelSelected,
                ]}
              >
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
          placeholder='Please describe the issue in detail. Include any relevant dates, communications, or evidence...'
          placeholderTextColor={me.ink3}
          value={description}
          onChangeText={setDescription}
          textAlignVertical='top'
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
            keyExtractor={(item) => item.uri}
            showsHorizontalScrollIndicator={false}
            style={styles.thumbList}
            renderItem={({ item }) => (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.thumbRemove}
                  onPress={() => removeAttachment(item.uri)}
                  accessibilityRole='button'
                  accessibilityLabel='Remove attached photo'
                >
                  <Ionicons name='close-circle' size={20} color={me.errFg} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={handleAddEvidence}
          disabled={attachments.length >= 6}
          accessibilityRole='button'
          accessibilityLabel={
            attachments.length === 0
              ? 'Add evidence photos'
              : `${attachments.length} of 6 photos added, add more`
          }
        >
          <Ionicons name='camera-outline' size={20} color={me.ink2} />
          <Text style={styles.evidenceButtonText}>
            {attachments.length === 0
              ? 'Add Photos'
              : `${attachments.length}/6 photos added`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole='button'
          accessibilityLabel='Submit dispute'
          accessibilityState={{ disabled: submitting }}
        >
          {submitting ? (
            <LoadingSpinner />
          ) : (
            <>
              <Ionicons name='shield-outline' size={20} color={me.onBrand} />
              <Text style={styles.submitButtonText}>Submit Dispute</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Disputes are reviewed by our team within 48 hours. Both parties will
          be notified and given the opportunity to respond. Payment will remain
          in escrow until the dispute is resolved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  scrollContent: {
    padding: 16,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    ...me.shadow.card,
  },
  jobIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 12,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  reasonCard: {
    width: '47%',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...me.shadow.card,
  },
  reasonCardSelected: {
    backgroundColor: me.ink,
  },
  reasonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
    textAlign: 'center',
  },
  reasonLabelSelected: {
    color: me.onBrand,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: me.ink,
    minHeight: 140,
    marginBottom: 4,
    ...me.shadow.card,
  },
  charCount: {
    fontSize: 12,
    color: me.ink3,
    textAlign: 'right',
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.errFg,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 18,
    textAlign: 'center',
    paddingBottom: 16,
  },
  thumbList: { marginBottom: 12 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: me.bg2,
  },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: me.line,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 20,
  },
  evidenceButtonText: {
    fontSize: 15,
    color: me.ink,
    fontWeight: '600',
  },
});
