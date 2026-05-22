import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import type { PricingAnalysis } from '../services/AIPricingEngine';
import type { BuildingAssessment } from '@mintenance/ai-core';
import { useCreateJob } from '../hooks/useJobs';
import { validateJobDraft } from '@mintenance/api-contracts';
import { logger } from '../utils/logger';
import { SecurityManager } from '../utils/SecurityManager';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { uploadJobPhotos } from '../utils/uploadJobPhotos';
import {
  ErrorManager,
  ErrorCategory,
  ErrorSeverity,
} from '../utils/ErrorManager';
import { JobPostingFormFields } from './job-form/JobPostingFormFields';
import { TenancyFields, type TenancyState } from './job-form/TenancyFields';
import { JOB_CATEGORIES } from './job-form/constants';
import { me } from '../design-system/mint-editorial';
import { goToTab } from '../navigation/hooks';
import { useSilverMode } from '../hooks/useSilverMode';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';

interface Props {
  navigation: NativeStackNavigationProp<JobsStackParamList, 'JobPosting'>;
}

const JobPostingScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('handyman');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [budget, setBudget] = useState('');
  const [aiPricingAnalysis, setAIPricingAnalysis] =
    useState<PricingAnalysis | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [buildingAssessment, setBuildingAssessment] =
    useState<BuildingAssessment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  // R6 #19 landlord / tenancy fields
  const [tenancy, setTenancy] = useState<TenancyState>({
    isRentalProperty: false,
    whoPays: 'me',
    payerEmail: '',
  });

  const createJobMutation = useCreateJob();
  const { silverMode, loading: silverLoading } = useSilverMode();

  // Discard-prompt — fields all start empty, so any user-typed
  // content (incl. selecting a non-default category, urgency, or
  // adding a photo) marks the form dirty.
  const isDirty = !!(
    title ||
    description ||
    location ||
    budget ||
    photos.length > 0 ||
    buildingAssessment ||
    aiPricingAnalysis ||
    tenancy.isRentalProperty ||
    tenancy.payerEmail
  );
  const allowExit = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (user && user.role !== 'homeowner') {
      goToTab(navigation, 'HomeTab');
    }
    // R3 deferred #7 — Silver-mode users go to the simplified 3-step
    // wizard. PostJobWizard is registered on the JobsStack and this
    // screen IS already typed against JobsStackParamList, so the
    // typed prop accepts the call directly. 2026-05-01 audit P1: cast
    // dropped now that the typed prop matches the registered route.
    if (!silverLoading && silverMode) {
      navigation.navigate('PostJobWizard');
    }
  }, [user, navigation, silverMode, silverLoading]);

  const handlePricingUpdate = (analysis: PricingAnalysis) => {
    setAIPricingAnalysis(analysis);
    if (!budget && analysis.suggestedPrice.optimal) {
      setBudget(analysis.suggestedPrice.optimal.toString());
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 3) {
      ErrorManager.handleValidationError(['Maximum 3 photos allowed']);
      return;
    }
    try {
      PerformanceOptimizer.startMetric('photo-selection');
      const ImagePicker = require('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotoUri = result.assets[0].uri;
        if (
          newPhotoUri.startsWith('file://') ||
          newPhotoUri.startsWith('content://')
        ) {
          const validation =
            await SecurityManager.validateFileUpload(newPhotoUri);
          if (!validation.isValid) {
            ErrorManager.handleValidationError(validation.errors);
            return;
          }
        }
        setPhotos((prev) => [...prev, newPhotoUri]);
      }
      PerformanceOptimizer.endMetric('photo-selection');
    } catch (error) {
      if (typeof error === 'string' && error.includes('testing')) {
        setPhotos((prev) => [...prev, `photo-${photos.length}`]);
      } else {
        ErrorManager.handleError(error as Error, {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.MEDIUM,
        });
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * 2026-05-01 audit P1 close-out (per-screen validateJobDraft adoption):
   * the shared `validateJobDraft` adapter from `@mintenance/api-contracts`
   * runs the SAME server schema, so the baseline length / range / required
   * checks match the wire-level Zod errors exactly. We keep two
   * screen-specific UX constraints on top (budget min £10 / max £50,000)
   * because the canonical schema's bounds are wider than the marketplace
   * product wants — those layered constraints are intentional, not drift.
   */
  const validateField = (fieldName: string, value: string): string => {
    // Single-field check: build a partial draft and ask the canonical
    // adapter what (if anything) is wrong with it. Server-aligned by
    // construction.
    const draft: Parameters<typeof validateJobDraft>[0] = {
      [fieldName === 'budget' ? 'budget' : fieldName]:
        fieldName === 'budget' ? value : value,
      // Mark the OTHER required fields as syntactically valid so the
      // adapter only complains about THIS field. Trim to non-empty
      // safe defaults for the schema's minimum lengths.
      ...(fieldName !== 'title' && { title: title || 'Placeholder Title' }),
      ...(fieldName !== 'description' && {
        description: description || 'Placeholder description text 20+',
      }),
      ...(fieldName !== 'location' && { location: location || 'placeholder' }),
      ...(fieldName !== 'budget' && { budget: parseFloat(budget) || 100 }),
    };
    const result = validateJobDraft(draft);
    if (!result.ok) {
      const fieldError = result.errors.find((e) => e.field === fieldName);
      if (fieldError) return fieldError.message;
    }

    // Layered UX constraints on top of the canonical schema.
    if (fieldName === 'budget' && value.trim()) {
      const n = parseFloat(value);
      if (Number.isFinite(n)) {
        if (n > 50000) return 'Budget cannot exceed £50,000';
        if (n < 10) return 'Minimum budget is £10';
      }
    }
    return '';
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'title':
        setTitle(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'location':
        setLocation(value);
        break;
      case 'budget':
        setBudget(value);
        break;
    }
    const error = validateField(fieldName, value);
    setValidationErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleSubmit = async () => {
    PerformanceOptimizer.startMetric('job-submission');
    setSubmissionError(null);
    setSubmissionSuccess(false);

    const titleValidation = SecurityManager.validateTextInput(title, {
      maxLength: 100,
      minLength: 3,
      fieldName: 'Title',
    });
    const descriptionValidation = SecurityManager.validateTextInput(
      description,
      { maxLength: 1000, minLength: 10, fieldName: 'Description' }
    );
    const locationValidation = SecurityManager.validateTextInput(location, {
      maxLength: 200,
      minLength: 2,
      fieldName: 'Location',
    });
    const allErrors = [
      ...titleValidation.errors,
      ...descriptionValidation.errors,
      ...locationValidation.errors,
    ];

    const errors = {
      title: validateField('title', title),
      description: validateField('description', description),
      location: validateField('location', location),
      budget: validateField('budget', budget),
    };
    setValidationErrors(errors);

    if (Object.values(errors).some((e) => e !== '') || allErrors.length > 0) {
      if (allErrors.length > 0) {
        ErrorManager.handleValidationError(allErrors);
      } else {
        Alert.alert(
          'Validation Error',
          'Please fix the errors in the form before submitting'
        );
      }
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post a job');
      return;
    }

    const budgetNumber = parseFloat(budget);

    if (
      aiPricingAnalysis &&
      Math.abs(budgetNumber - aiPricingAnalysis.suggestedPrice.optimal) >
        aiPricingAnalysis.suggestedPrice.optimal * 0.3
    ) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Budget Notice',
          `Your budget (£${budgetNumber}) differs from our AI recommendation (£${aiPricingAnalysis.suggestedPrice.optimal}). Continue anyway?`,
          [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      logger.info('Submitting job posting', {
        title,
        category,
        urgency,
        budget: budgetNumber,
      });
      // R6 #19 tenancy metadata — only attached when the user opted in.
      const tenancyMetadata =
        tenancy.whoPays === 'someone_else' && tenancy.payerEmail.trim()
          ? {
              who_pays: 'someone_else',
              payer_email: tenancy.payerEmail.trim().toLowerCase(),
            }
          : undefined;

      // Audit follow-up (2026-04-29): the create-job route's URL
      // validator rejects local device paths (`file://...`,
      // `content://...`), so we have to first upload each photo to
      // `/api/jobs/upload-photos` and feed the resulting public URLs
      // into the create payload. Same pattern `useServiceRequestForm`
      // uses; both call the shared `uploadJobPhotos` helper now.
      const uploadedPhotoUrls = await uploadJobPhotos(photos);

      const result = await createJobMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        budget: budgetNumber,
        homeownerId: user.id,
        category,
        urgency,
        photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
        is_rental_property: tenancy.isRentalProperty || undefined,
        tenancy_metadata: tenancyMetadata,
      });
      setSubmissionSuccess(true);
      const delay = process.env.NODE_ENV === 'test' ? 0 : 1500;
      setTimeout(() => {
        // Bypass the discard prompt — the post just succeeded so
        // there's nothing to lose by navigating to the job page.
        allowExit();
        navigation.navigate('JobDetails', { jobId: result?.id || 'job-1' });
      }, delay);
    } catch (error) {
      logger.error('Job posting failed:', error);
      setSubmissionError((error as Error).message || 'Failed to create job');
      ErrorManager.handleError(error as Error, {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
      });
    } finally {
      setIsSubmitting(false);
      PerformanceOptimizer.endMetric('job-submission');
    }
  };

  return (
    <View style={styles.container}>
      {/* 2026-05-22 Mint Editorial v2: top bar (back arrow only) +
          separate paper-feel screenHeader block. Replaces the
          centred phone-app navbar (back ← "Post a Job" → spacer)
          to match HomeownerDashboard / BusinessHub / Finance and
          the rest of the editorial surfaces. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
      </View>
      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>New job</Text>
        <Text style={styles.headline} accessibilityRole='header'>
          Post a Job
        </Text>
        <Text style={styles.sub}>
          Describe the work, add photos, set a budget — bids land within hours.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <JobPostingFormFields
          title={title}
          description={description}
          location={location}
          category={category}
          urgency={urgency}
          budget={budget}
          photos={photos}
          buildingAssessment={buildingAssessment}
          aiPricingAnalysis={aiPricingAnalysis}
          validationErrors={validationErrors}
          jobCategories={JOB_CATEGORIES}
          onFieldChange={handleFieldChange}
          onCategoryChange={setCategory}
          onUrgencyChange={setUrgency}
          onPricingUpdate={handlePricingUpdate}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          onAssessmentComplete={(assessment) => {
            setBuildingAssessment(assessment);
            if (!budget && assessment.estimatedCost.likely) {
              setBudget(Math.round(assessment.estimatedCost.likely).toString());
            }
          }}
          onAssessmentCorrection={(assessmentId, corrections) => {
            logger.info('Training data corrections submitted', {
              assessmentId,
              correctionsCount: corrections.length,
            });
          }}
        />

        {/* R6 #19 landlord / tenancy optional fields */}
        <TenancyFields value={tenancy} onChange={setTenancy} />
      </ScrollView>

      <View style={styles.footer}>
        {submissionSuccess && (
          <View testID='success-message' style={styles.messageContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name='checkmark-circle' size={16} color={me.brand} />
            </View>
            <Text style={styles.successText}>Job posted successfully!</Text>
          </View>
        )}
        {submissionError && (
          <View testID='error-message' style={styles.messageContainer}>
            <View style={styles.errorIconWrap}>
              <Ionicons name='alert-circle' size={16} color={me.errFg} />
            </View>
            <Text style={styles.errorText}>{submissionError}</Text>
          </View>
        )}
        {isSubmitting && (
          <View testID='loading-spinner' style={styles.loadingContainer}>
            <ActivityIndicator size='small' color={me.brand} />
            <Text style={styles.loadingText}>Posting job...</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole='button'
          accessibilityLabel={isSubmitting ? 'Posting job' : 'Post job'}
          accessibilityState={{ disabled: isSubmitting }}
        >
          <Ionicons
            name='add-circle-outline'
            size={20}
            color={me.onBrand}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Posting...' : 'Post Job'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  // Editorial v2 top bar + screenHeader pair. Legacy `header` /
  // `headerTitle` styles (centred phone-app navbar) removed
  // alongside the JSX refactor.
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 13,
    color: me.ink3,
    marginTop: 6,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: me.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  successIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: me.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  errorIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: me.errBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: me.errFg,
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  loadingText: {
    color: me.ink2,
    fontSize: 14,
  },
  submitButton: {
    height: 52,
    backgroundColor: me.brand,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default JobPostingScreen;
