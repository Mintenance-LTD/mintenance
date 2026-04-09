import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
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
import {
  PropertyInfo,
  INITIAL_STEPS,
} from './PropertyAssessmentScreen/constants';
import { styles } from './PropertyAssessmentScreen/styles';
import { PropertyInfoForm } from './PropertyAssessmentScreen/PropertyInfoForm';
import { PhotosGrid } from './PropertyAssessmentScreen/PhotosGrid';
import { ReviewSummary } from './PropertyAssessmentScreen/ReviewSummary';
import { uploadPhotosToStorage } from './PropertyAssessmentScreen/uploadPhotos';

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

  // Pre-fill property info from the property record if we were given a propertyId
  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    (async () => {
      try {
        const { mobileApiClient } = await import('../../utils/mobileApiClient');
        // API returns property data at root level (not nested under .property)
        const p = await mobileApiClient.get<{
          property_type?: string;
          bedrooms?: number | null;
          year_built?: number | null;
          description?: string | null;
        }>(`/api/properties/${propertyId}`);
        if (cancelled || !p) return;
        setPropertyInfo((prev) => ({
          propertyType: p.property_type || prev.propertyType,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : prev.bedrooms,
          yearBuilt:
            p.year_built != null ? String(p.year_built) : prev.yearBuilt,
          description: p.description || prev.description,
        }));
        if (p.property_type) updateStepStatus('property_info', 'completed');
      } catch {
        /* pre-fill is non-critical; user can fill manually */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, updateStepStatus]);

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
      Alert.alert(
        'Permission required',
        'Camera access is needed to take photos.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev, result.assets[0]!.uri]);
      updateStepStatus('photos', 'completed');
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Gallery access is needed to pick photos.'
      );
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
        if (step.status === 'pending')
          updateStepStatus('property_info', 'in_progress');
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
        if (step.status === 'pending')
          updateStepStatus('manual_notes', 'in_progress');
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
      (step) =>
        step.required && step.id !== 'review' && step.status !== 'completed'
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
        Alert.alert(
          'Error',
          insertError.message || 'Failed to save assessment. Please try again.'
        );
        return;
      }

      // Upload photos and save references
      if (photos.length > 0 && assessment?.id) {
        const uploadedUrls = await uploadPhotosToStorage(photos, assessment.id);
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
          <PropertyInfoForm
            propertyInfo={propertyInfo}
            setPropertyInfo={setPropertyInfo}
            onSave={handlePropertyInfoSave}
          />
        )}

        {/* Step 2: Video indicator */}
        {videoUri && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Video Captured</Text>
            <View style={styles.videoDoneRow}>
              <Icon
                name='check-circle'
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.videoDoneText}>
                Video walkthrough recorded
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Photos grid */}
        {photos.length > 0 && (
          <PhotosGrid
            photos={photos}
            onTakePhoto={handleTakePhoto}
            onPickFromGallery={handlePickFromGallery}
            onRemovePhoto={handleRemovePhoto}
          />
        )}

        {/* Step 4: Manual Notes */}
        {showNotes && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Manual Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={5}
              placeholder='Add your observations, context, or notes about the property...'
              placeholderTextColor={theme.colors.textTertiary}
              value={manualNotes}
              onChangeText={(text) => {
                setManualNotes(text);
                updateStepStatus(
                  'manual_notes',
                  text.length > 0 ? 'completed' : 'in_progress'
                );
              }}
              textAlignVertical='top'
            />
          </View>
        )}

        {/* Step 5: Review & Submit */}
        {showReview && (
          <ReviewSummary
            propertyAddress={propertyAddress}
            propertyInfo={propertyInfo}
            videoUri={videoUri}
            photosCount={photos.length}
            manualNotes={manualNotes}
            progressPercentage={progressPercentage}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitAssessment}
          />
        )}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleStartVideoCapture}
            activeOpacity={0.8}
          >
            <Icon name='videocam' size={22} color='#FFFFFF' />
            <Text style={styles.primaryActionText}>Start Video Capture</Text>
          </TouchableOpacity>
        </View>

        <TipsCard />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PropertyAssessmentScreen;
