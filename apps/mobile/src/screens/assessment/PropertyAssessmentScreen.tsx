import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '@mintenance/shared';
import { theme } from '../../theme';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AssessmentStep } from './types';
import { AssessmentHeader } from './components/AssessmentHeader';
import { ProgressBar } from './components/ProgressBar';
import { StepCard } from './components/StepCard';
import { TipsCard } from './components/QuickActions';

interface Props {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
  route: {
    params?: {
      propertyId?: string;
      propertyAddress?: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Property info form state
// ---------------------------------------------------------------------------
interface PropertyInfo {
  propertyType: string;
  bedrooms: string;
  yearBuilt: string;
  description: string;
}

const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow', 'Commercial', 'Other'];

// ---------------------------------------------------------------------------
// Initial steps
// ---------------------------------------------------------------------------
const INITIAL_STEPS: AssessmentStep[] = [
  {
    id: 'property_info',
    title: 'Property Information',
    description: 'Basic details about the property',
    icon: 'home',
    status: 'pending',
    required: true,
  },
  {
    id: 'video_walkthrough',
    title: 'Video Walkthrough',
    description: 'Capture 30-60 second property video',
    icon: 'videocam',
    status: 'pending',
    required: true,
  },
  {
    id: 'photos',
    title: 'Additional Photos',
    description: 'Capture specific damage areas',
    icon: 'photo-camera',
    status: 'pending',
    required: false,
  },
  {
    id: 'manual_notes',
    title: 'Manual Notes',
    description: 'Add observations and context',
    icon: 'edit-note',
    status: 'pending',
    required: false,
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review assessment before submitting',
    icon: 'fact-check',
    status: 'pending',
    required: true,
  },
];

export const PropertyAssessmentScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { propertyId, propertyAddress } = route.params || {};
  const { user } = useAuth();

  // Step management
  const [assessmentSteps, setAssessmentSteps] =
    useState<AssessmentStep[]>(INITIAL_STEPS);

  // Step 1 — Property info
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo>({
    propertyType: '',
    bedrooms: '',
    yearBuilt: '',
    description: '',
  });

  // Step 2 — Video
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Step 3 — Photos
  const [photos, setPhotos] = useState<string[]>([]);

  // Step 4 — Notes
  const [showNotes, setShowNotes] = useState(false);
  const [manualNotes, setManualNotes] = useState('');

  // Step 5 — Review
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const updateStepStatus = useCallback(
    (stepId: string, status: AssessmentStep['status']) => {
      setAssessmentSteps((steps) =>
        steps.map((step) => (step.id === stepId ? { ...step, status } : step))
      );
    },
    []
  );

  const progressPercentage = Math.round(
    (assessmentSteps.filter((s) => s.status === 'completed').length /
      assessmentSteps.length) *
      100
  );

  // ---------------------------------------------------------------------------
  // Step 1 — Property Info
  // ---------------------------------------------------------------------------
  const handlePropertyInfoSave = () => {
    if (!propertyInfo.propertyType) {
      Alert.alert('Required', 'Please select a property type.');
      return;
    }
    updateStepStatus('property_info', 'completed');
    setShowPropertyForm(false);
  };

  // ---------------------------------------------------------------------------
  // Step 2 — Video (navigate to existing VideoCaptureScreen)
  // ---------------------------------------------------------------------------
  const handleStartVideoCapture = () => {
    navigation.navigate('VideoCapture', {
      assessmentId: `assessment_${Date.now()}`,
      propertyId,
      onComplete: (uri: string) => {
        setVideoUri(uri);
        updateStepStatus('video_walkthrough', 'completed');
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Step 3 — Photos (pick from camera or gallery directly)
  // ---------------------------------------------------------------------------
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
      updateStepStatus('photos', 'completed');
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to pick photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
      updateStepStatus('photos', 'completed');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) updateStepStatus('photos', 'pending');
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Step press router
  // ---------------------------------------------------------------------------
  const handleStepPress = (step: AssessmentStep) => {
    switch (step.id) {
      case 'property_info':
        setShowPropertyForm((prev) => !prev);
        if (step.status === 'pending') updateStepStatus('property_info', 'in_progress');
        break;
      case 'video_walkthrough':
        handleStartVideoCapture();
        break;
      case 'photos':
        Alert.alert('Add Photos', 'Choose a source', [
          { text: 'Camera', onPress: handleTakePhoto },
          { text: 'Gallery', onPress: handlePickFromGallery },
          { text: 'Cancel', style: 'cancel' },
        ]);
        break;
      case 'manual_notes':
        setShowNotes((prev) => !prev);
        if (step.status === 'pending') updateStepStatus('manual_notes', 'in_progress');
        break;
      case 'review':
        handleReviewAssessment();
        break;
    }
  };

  // ---------------------------------------------------------------------------
  // Step 5 — Review & Submit
  // ---------------------------------------------------------------------------
  const handleReviewAssessment = () => {
    const incompleteRequired = assessmentSteps.filter(
      (step) => step.required && step.id !== 'review' && step.status !== 'completed'
    );
    if (incompleteRequired.length > 0) {
      Alert.alert(
        'Incomplete Assessment',
        `Please complete: ${incompleteRequired.map((s) => s.title).join(', ')}`
      );
      return;
    }
    updateStepStatus('review', 'completed');
    setShowReview(true);
  };

  const uploadPhotosToStorage = async (assessmentDbId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      try {
        const uri = photos[i];
        const ext = uri.split('.').pop() || 'jpg';
        const filePath = `assessments/${assessmentDbId}/${i}.${ext}`;
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();

        const { error } = await supabase.storage
          .from('assessment-photos')
          .upload(filePath, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('assessment-photos')
            .getPublicUrl(filePath);
          urls.push(urlData.publicUrl);
        } else {
          logger.warn('Photo upload failed', { error, index: i });
        }
      } catch (err) {
        logger.warn('Photo upload error', { err, index: i });
      }
    }
    return urls;
  };

  const handleSubmitAssessment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!user?.id) {
        Alert.alert('Error', 'You must be logged in to submit an assessment.');
        return;
      }

      // Build assessment_data JSON payload with all gathered data
      const assessmentData = {
        property_info: propertyInfo,
        property_address: propertyAddress || null,
        steps_completed: assessmentSteps
          .filter((s) => s.status === 'completed')
          .map((s) => s.id),
        manual_notes: manualNotes || null,
        has_video: !!videoUri,
        photo_count: photos.length,
        submitted_from: 'mobile_app',
        submitted_at: new Date().toISOString(),
      };

      // Insert into building_assessments with all required NOT NULL columns
      const { data: assessment, error: insertError } = await supabase
        .from('building_assessments')
        .insert({
          user_id: user.id,
          property_id: propertyId || null,
          domain: 'building',
          damage_type: 'general_inspection',
          severity: 'pending_review',
          confidence: 0,
          safety_score: 0,
          compliance_score: 0,
          insurance_risk_score: 0,
          urgency: 'normal',
          assessment_data: assessmentData,
          validation_status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        logger.error('Failed to save assessment', { error: insertError });
        Alert.alert('Error', 'Failed to save assessment. Please try again.');
        return;
      }

      // Upload photos and save references
      if (photos.length > 0 && assessment?.id) {
        const uploadedUrls = await uploadPhotosToStorage(assessment.id);
        if (uploadedUrls.length > 0) {
          const imageInserts = uploadedUrls.map((url, idx) => ({
            assessment_id: assessment.id,
            image_url: url,
            image_index: idx,
          }));
          await supabase.from('assessment_images').insert(imageInserts);
        }
      }

      logger.info('Assessment submitted successfully', {
        assessmentId: assessment?.id,
        propertyId,
        userId: user.id,
      });

      Alert.alert(
        'Assessment Submitted',
        'Your property assessment has been saved and will be reviewed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      logger.error('Assessment submission failed', { error });
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <AssessmentHeader
        propertyAddress={propertyAddress}
        onGoBack={() => navigation.goBack()}
      />
      <ProgressBar
        percentage={progressPercentage}
        completedSteps={
          assessmentSteps.filter((s) => s.status === 'completed').length
        }
        totalSteps={assessmentSteps.length}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Assessment Steps */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Assessment Steps</Text>
          {assessmentSteps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              stepNumber={index + 1}
              onPress={() => handleStepPress(step)}
            />
          ))}
        </View>

        {/* Step 1: Property Info Form */}
        {showPropertyForm && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Property Information</Text>

            <Text style={styles.fieldLabel}>Property Type *</Text>
            <View style={styles.chipRow}>
              {PROPERTY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    propertyInfo.propertyType === type && styles.chipSelected,
                  ]}
                  onPress={() =>
                    setPropertyInfo((prev) => ({ ...prev, propertyType: type }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      propertyInfo.propertyType === type && styles.chipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Number of Bedrooms</Text>
            <TextInput
              style={styles.input}
              value={propertyInfo.bedrooms}
              onChangeText={(t) =>
                setPropertyInfo((prev) => ({ ...prev, bedrooms: t }))
              }
              placeholder="e.g. 3"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Year Built (approx)</Text>
            <TextInput
              style={styles.input}
              value={propertyInfo.yearBuilt}
              onChangeText={(t) =>
                setPropertyInfo((prev) => ({ ...prev, yearBuilt: t }))
              }
              placeholder="e.g. 1985"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Brief Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={propertyInfo.description}
              onChangeText={(t) =>
                setPropertyInfo((prev) => ({ ...prev, description: t }))
              }
              placeholder="Describe the property and any known issues..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.saveFormButton}
              onPress={handlePropertyInfoSave}
            >
              <Icon name="check" size={18} color="#fff" />
              <Text style={styles.saveFormButtonText}>Save Property Info</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Video indicator */}
        {videoUri && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Video Captured</Text>
            <View style={styles.videoDoneRow}>
              <Icon name="check-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.videoDoneText}>Video walkthrough recorded</Text>
            </View>
          </View>
        )}

        {/* Step 3: Photos grid */}
        {photos.length > 0 && (
          <View style={styles.formSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.sectionTitle}>
                Photos ({photos.length})
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Add More', 'Choose a source', [
                    { text: 'Camera', onPress: handleTakePhoto },
                    { text: 'Gallery', onPress: handlePickFromGallery },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                <Icon name="add-circle" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.photoGrid}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(idx)}
                  >
                    <Icon name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Manual Notes */}
        {showNotes && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Manual Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={5}
              placeholder="Add your observations, context, or notes about the property..."
              placeholderTextColor={theme.colors.textTertiary}
              value={manualNotes}
              onChangeText={(text) => {
                setManualNotes(text);
                updateStepStatus(
                  'manual_notes',
                  text.length > 0 ? 'completed' : 'in_progress'
                );
              }}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Step 5: Review & Submit */}
        {showReview && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Assessment Summary</Text>
            <SummaryRow label="Property" value={propertyAddress || 'Not specified'} />
            <SummaryRow label="Type" value={propertyInfo.propertyType || '—'} />
            <SummaryRow label="Bedrooms" value={propertyInfo.bedrooms || '—'} />
            <SummaryRow label="Video" value={videoUri ? 'Recorded' : 'None'} />
            <SummaryRow label="Photos" value={`${photos.length}`} />
            <SummaryRow label="Notes" value={manualNotes ? 'Added' : 'None'} />
            <SummaryRow label="Progress" value={`${progressPercentage}%`} />
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmitAssessment}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <>
                  <Icon name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Assessment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleStartVideoCapture}
            activeOpacity={0.8}
          >
            <Icon name="videocam" size={22} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Start Video Capture</Text>
          </TouchableOpacity>
        </View>

        <TipsCard />
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Small helper component
// ---------------------------------------------------------------------------
const SummaryRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const borderedCard = {
  backgroundColor: theme.colors.surface,
  borderRadius: 20,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: theme.colors.border,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  content: { padding: 16 },
  stepsSection: { ...borderedCard },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  formSection: { ...borderedCard },

  // Property info form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: theme.colors.primary, fontWeight: '700' },
  saveFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveFormButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Video done
  videoDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  videoDoneText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },

  // Photo grid
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes
  notesInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    minHeight: 120,
  },

  // Review
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  reviewLabel: { fontSize: 14, color: theme.colors.textSecondary },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },

  // Quick actions
  quickActions: { marginBottom: 16 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 24,
    paddingVertical: 16,
    gap: 10,
  },
  primaryActionText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default PropertyAssessmentScreen;
