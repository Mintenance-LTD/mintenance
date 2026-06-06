/**
 * DisputeScreen - Create and manage job disputes
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { me } from '../design-system/mint-editorial';
import { styles } from './DisputeScreen.styles';

interface DisputeScreenParams {
  jobId: string;
  jobTitle: string;
}

interface Props {
  route: RouteProp<{ Dispute: DisputeScreenParams }, 'Dispute'>;
  navigation: NativeStackNavigationProp<JobsStackParamList, 'Dispute'>;
}

// 2026-05-24 audit-27 P1 — upload picked images to job-attachments and
// return 30-day signed URLs. Per-file errors are swallowed so one bad
// image doesn't block submission; fallback `job-attachments:<path>` is
// pushed when signing itself fails so the row still preserves a pointer.
async function uploadDisputeEvidence(
  jobId: string,
  userId: string,
  assets: ImagePicker.ImagePickerAsset[]
): Promise<string[]> {
  const evidence: string[] = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    try {
      const rawExt = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : 'jpg';
      const filePath = `${jobId}/disputes/${userId}/${Date.now()}-${i}.${ext}`;
      const buf = await (await (await fetch(asset.uri)).blob()).arrayBuffer();
      const { error: upErr } = await supabase.storage
        .from('job-attachments')
        .upload(filePath, buf, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: false,
        });
      if (upErr) {
        logger.warn('Dispute evidence upload failed', { error: upErr, i });
        continue;
      }
      const { data: signed } = await supabase.storage
        .from('job-attachments')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      evidence.push(signed?.signedUrl ?? `job-attachments:${filePath}`);
    } catch (err) {
      logger.warn('Dispute evidence upload error', { error: err, i });
    }
  }
  return evidence;
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
  const { user } = useAuth();
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
        escrow: { id: string } | null;
      }>(`/api/jobs/${jobId}/escrow`);

      // 2026-06-06 audit: GET /api/jobs/[id]/escrow returns { escrow: null }
      // (not a 404) when no escrow row exists, so reading .escrow.id below
      // threw "Cannot read property 'id' of null" — surfaced only as a
      // generic "Failed to submit dispute". Guard with a clear message.
      if (!escrowResponse?.escrow?.id) {
        setFormError(
          'No payment was found for this job. A dispute can only be raised once a payment is held in escrow.'
        );
        setSubmitting(false);
        return;
      }

      // 2026-05-24 audit-27 P1: was `evidenceUris` (silently dropped by
      // route's Zod) of local file:// URIs (unusable for admin review).
      // Now uploads to job-attachments and sends signed URLs as `evidence`.
      const evidence = user?.id
        ? await uploadDisputeEvidence(jobId, user.id, attachments)
        : [];
      await apiClient.post('/api/disputes/create', {
        escrowId: escrowResponse.escrow.id,
        reason: selectedReason,
        description: description.trim(),
        priority: 'medium',
        evidence,
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

// Styles extracted to ./DisputeScreen.styles (2026-06-06) to keep this
// screen under the 500-line cap after adding the null-escrow guard.
