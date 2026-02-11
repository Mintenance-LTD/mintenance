'use client';

import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@mintenance/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useImageUpload } from './hooks/useImageUpload';
import { useBuildingAssessment } from './hooks/useBuildingAssessment';
import { validateJobForm, isFormValid, type JobFormData } from './utils/validation';
import { submitJob } from './utils/submitJob';
import { useCSRF } from '@/lib/hooks/useCSRF';
import toast from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ArrowLeft } from 'lucide-react';
import { STEPS } from './_components/types';
import type { Property } from './_components/types';
import { ProgressBar } from './_components/progress-bar';
import { DetailsStep } from './_components/details-step';
import { PhotosStep } from './_components/photos-step';
import { BudgetStep } from './_components/budget-step';
import { ReviewStep } from './_components/review-step';
import { StepNavigation } from './_components/step-navigation';

/** Map AI damage type to job service category */
function mapDamageTypeToCategory(damageType: string): string | null {
  const t = damageType.toLowerCase().replace(/[_-]/g, ' ');
  const map: [string, string[]][] = [
    ['plumbing', ['water', 'pipe', 'leak', 'plumbing', 'drain', 'burst', 'flood', 'damp']],
    ['electrical', ['electrical', 'wiring', 'circuit', 'power', 'socket', 'light']],
    ['heating', ['heating', 'boiler', 'radiator', 'gas', 'thermostat']],
    ['roofing', ['roof', 'tile', 'gutter', 'chimney', 'flashing', 'slate']],
    ['carpentry', ['wood', 'timber', 'door', 'window', 'frame', 'rot', 'carpentry']],
    ['painting', ['paint', 'decorat', 'render', 'plaster']],
    ['flooring', ['floor', 'laminate', 'carpet', 'vinyl']],
    ['hvac', ['hvac', 'ventilation', 'air condition', 'ductwork']],
    ['handyman', ['structural', 'foundation', 'crack', 'subsidence', 'general', 'minor']],
  ];
  for (const [cat, keywords] of map) {
    if (keywords.some(kw => t.includes(kw))) return cat;
  }
  return null;
}

/** Map AI urgency string to form urgency value */
function mapAIUrgency(aiUrgency: string): 'low' | 'medium' | 'high' | 'emergency' | null {
  const u = aiUrgency.toLowerCase();
  if (['emergency', 'critical', 'immediate', 'dangerous'].some(k => u.includes(k))) return 'emergency';
  if (['urgent', 'high'].some(k => u.includes(k))) return 'high';
  if (['moderate', 'medium', 'soon'].some(k => u.includes(k))) return 'medium';
  if (['low', 'minor', 'routine', 'flexible'].some(k => u.includes(k))) return 'low';
  return null;
}

export default function CreateJobPage2025() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: searchParams?.get('location') ?? '',
    category: searchParams?.get('category') ?? '',
    urgency: 'medium',
    budget: '',
    budget_min: '',
    budget_max: '',
    show_budget_to_contractors: false,
    require_itemized_bids: false,
    requiredSkills: [],
    property_id: searchParams?.get('property_id') || '',
  });

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [preferredDate, setPreferredDate] = useState('');
  const aiAutoFilledRef = useRef(false);

  const imageUpload = useImageUpload({
    maxImages: 10,
    onError: (error) => toast.error(error),
  });

  const buildingAssessment = useBuildingAssessment({
    onError: (error) => {
      toast.error(`AI Assessment unavailable: ${error}`, { duration: 5000 });
    },
  });

  // Prefill category and location from URL
  useEffect(() => {
    const qCategory = searchParams?.get('category');
    const qLocation = searchParams?.get('location');
    if (qCategory || qLocation) {
      setFormData(prev => ({
        ...prev,
        ...(qCategory && { category: qCategory }),
        ...(qLocation && { location: qLocation }),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && user.role === 'homeowner') {
      setLoadingProperties(true);
      fetch('/api/properties')
        .then(res => res.json())
        .then(data => {
          if (data.properties) {
            setProperties(data.properties);
            const urlPropertyId = searchParams?.get('property_id');
            if (urlPropertyId && data.properties.length > 0) {
              const selectedProperty = data.properties.find((p: Property) => p.id === urlPropertyId);
              if (selectedProperty) {
                setFormData(prev => ({
                  ...prev,
                  property_id: urlPropertyId,
                  location: selectedProperty.address || prev.location,
                }));
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProperties(false));
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'homeowner')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  useEffect(() => {
    const runAssessment = async () => {
      if (imageUpload.uploadedImages.length > 0 && !buildingAssessment.isAssessing) {
        const selectedProp = properties.find(p => p.id === formData.property_id);
        await buildingAssessment.assessBuilding(
          imageUpload.uploadedImages,
          {
            location: formData.location || selectedProp?.address || undefined,
            propertyType: selectedProp?.property_type as 'residential' | 'commercial' | undefined,
            ageOfProperty: undefined,
          }
        );
      }
    };

    runAssessment();
  }, [imageUpload.uploadedImages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill form fields from AI assessment results
  useEffect(() => {
    if (!buildingAssessment.assessment || aiAutoFilledRef.current) return;
    aiAutoFilledRef.current = true;

    const assessment = buildingAssessment.assessment;
    const suggestions: string[] = [];
    const suggestedCategory = mapDamageTypeToCategory(assessment.damageAssessment.damageType);
    const suggestedUrgency = mapAIUrgency(assessment.urgency.urgency);

    setFormData(prev => {
      const updates: Partial<JobFormData> = {};

      if (!prev.category && suggestedCategory) {
        updates.category = suggestedCategory;
      }

      if (suggestedUrgency) {
        updates.urgency = suggestedUrgency;
      }

      if (assessment.estimatedCost && (!prev.budget || prev.budget === '')) {
        const { min, max } = assessment.estimatedCost;
        updates.budget = String(Math.round((min + max) / 2));
        updates.budget_min = String(Math.round(min));
        updates.budget_max = String(Math.round(max));
      }

      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });

    if (suggestedCategory) suggestions.push(suggestedCategory);
    if (suggestedUrgency) suggestions.push(suggestedUrgency);
    if (assessment.estimatedCost) {
      suggestions.push(`£${Math.round(assessment.estimatedCost.min)}-£${Math.round(assessment.estimatedCost.max)}`);
    }

    if (suggestions.length > 0) {
      toast.success(`Mint AI suggested: ${suggestions.join(' · ')}`, { duration: 5000 });
    }
  }, [buildingAssessment.assessment]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    const errors = validateJobForm(formData, imageUpload.uploadedImages, imageUpload.imagePreviews.length);
    if (!isFormValid(errors)) {
      setValidationErrors(errors);
      const errorMessages = Object.entries(errors).map(([field, message]) => `${field}: ${message}`);
      logger.error('Validation failed:', errorMessages);
      toast.error(errorMessages[0] || 'Please fix validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrls = imageUpload.uploadedImages;
      if (imageUpload.imagePreviews.length > 0 && imageUrls.length === 0) {
        logger.info('[Submit] Need to upload images', { csrfTokenAvailable: !!csrfToken });
        if (!csrfToken) {
          toast.error('Security token not available. Please refresh the page.');
          setIsSubmitting(false);
          return;
        }

        try {
          logger.info('[Submit] Calling uploadImages with token');
          imageUrls = await imageUpload.uploadImages(csrfToken);
          logger.info('[Submit] Upload completed', { urlCount: imageUrls.length });
        } catch (uploadError) {
          logger.error('[Submit] Image upload failed, continuing without images', uploadError);
          toast.error('Image upload failed. Continuing to create job without images.');
          imageUrls = [];
        }
      }

      const result = await submitJob({
        formData,
        photoUrls: imageUrls,
        csrfToken: csrfToken || '',
        aiAssessment: buildingAssessment.assessment || undefined,
      });

      if (!result.success || !result.jobId) {
        throw new Error(result.error || 'Failed to post job');
      }

      toast.success('Job posted successfully!');
      router.push(`/jobs/${result.jobId}`);
    } catch (error) {
      logger.error('Error submitting job:', error);
      const errorMessage = (error as Error).message || 'Failed to post job';

      if (errorMessage.toLowerCase().includes('phone verification required') || errorMessage.toLowerCase().includes('verify your phone')) {
        toast.error('Phone verification required to post jobs');
        toast('Redirecting to settings for verification...', { icon: 'ℹ️' });
        setTimeout(() => {
          router.push('/settings?tab=verification');
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    imageUpload.handleImageSelect(e);
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (!user) return null;

  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const hasImages = imageUpload.imagePreviews.length > 0 || imageUpload.uploadedImages.length > 0;
  const canProceedStep1 = !!(formData.property_id && formData.category && formData.title && formData.description && formData.description.length >= 50);
  const canProceedStep2 = true;
  const canProceedStep3 = !!(formData.urgency && formData.budget && (parseFloat(String(formData.budget)) <= 500 || hasImages));

  const canProceedNext =
    (currentStep === 1 && canProceedStep1) ||
    (currentStep === 2 && canProceedStep2) ||
    (currentStep === 3 && canProceedStep3);

  return (
    <ErrorBoundary componentName="CreateJobPage">
      <HomeownerPageWrapper>
        {/* Back to Jobs Button */}
        <button
          onClick={() => router.push('/jobs')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Jobs</span>
        </button>

        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-3xl mx-auto px-4">
            <ProgressBar currentStep={currentStep} steps={STEPS} />

            {/* Main Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6" data-testid="job-create-form">
              {currentStep === 1 && (
                <DetailsStep
                  formData={formData}
                  setFormData={setFormData}
                  properties={properties}
                  loadingProperties={loadingProperties}
                  validationErrors={validationErrors}
                  uploadedImageUrls={imageUpload.uploadedImages}
                  onNavigateToAddProperty={() => router.push('/properties/add')}
                />
              )}

              {currentStep === 2 && (
                <PhotosStep
                  imagePreviews={imageUpload.imagePreviews}
                  onFileChange={handleFileChange}
                  onRemoveImage={imageUpload.removeImage}
                  isAssessing={buildingAssessment.isAssessing}
                  assessment={buildingAssessment.assessment}
                />
              )}

              {currentStep === 3 && (
                <BudgetStep
                  formData={formData}
                  setFormData={setFormData}
                  hasImages={hasImages}
                  preferredDate={preferredDate}
                  setPreferredDate={setPreferredDate}
                  aiSuggestedBudget={buildingAssessment.assessment?.estimatedCost || null}
                />
              )}

              {currentStep === 4 && (
                <ReviewStep
                  formData={formData}
                  selectedProperty={selectedProperty}
                  imagePreviews={imageUpload.imagePreviews}
                  assessment={buildingAssessment.assessment}
                  onEditStep={setCurrentStep}
                />
              )}
            </div>

            <StepNavigation
              currentStep={currentStep}
              totalSteps={STEPS.length}
              canProceedNext={canProceedNext}
              isSubmitting={isSubmitting}
              onBack={() => setCurrentStep(currentStep - 1)}
              onNext={() => setCurrentStep(currentStep + 1)}
              onCancel={() => router.back()}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </HomeownerPageWrapper>
    </ErrorBoundary>
  );
}
