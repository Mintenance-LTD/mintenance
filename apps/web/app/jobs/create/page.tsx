'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useImageUpload } from './hooks/useImageUpload';
import { useBuildingAssessment } from './hooks/useBuildingAssessment';
import { SmartJobAnalysis } from './components/SmartJobAnalysis';
import { BudgetRangeSelector, type BudgetData } from './components/BudgetRangeSelector';
import { validateJobForm, isFormValid, type JobFormData } from './utils/validation';
import { submitJob } from './utils/submitJob';
import { useCSRF } from '@/lib/hooks/useCSRF';
import toast from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ArrowLeft } from 'lucide-react';

const serviceCategories = [
  { label: 'Plumbing', value: 'plumbing', icon: '🚰' },
  { label: 'Electrical', value: 'electrical', icon: '⚡' },
  { label: 'Heating & Gas', value: 'heating', icon: '🔥' },
  { label: 'Carpentry', value: 'carpentry', icon: '🔨' },
  { label: 'Painting', value: 'painting', icon: '🎨' },
  { label: 'Roofing', value: 'roofing', icon: '🏠' },
  { label: 'Flooring', value: 'flooring', icon: '📐' },
  { label: 'Gardening', value: 'gardening', icon: '🌱' },
  { label: 'Cleaning', value: 'cleaning', icon: '🧹' },
  { label: 'Handyman', value: 'handyman', icon: '🔧' },
  { label: 'HVAC', value: 'hvac', icon: '❄️' },
  { label: 'Other', value: 'other', icon: '⚙️' },
];

const urgencyOptions = [
  { value: 'low', label: 'Flexible', description: 'Within 2-4 weeks', color: 'blue' },
  { value: 'medium', label: 'Soon', description: 'Within 1-2 weeks', color: 'amber' },
  { value: 'high', label: 'Urgent', description: 'Within 3-5 days', color: 'orange' },
  { value: 'emergency', label: 'Emergency', description: 'Within 24 hours', color: 'rose' },
];

interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  property_type?: string;
  photos?: string[];
}

const STEPS = [
  { id: 1, label: 'Details', shortLabel: 'Details' },
  { id: 2, label: 'Photos', shortLabel: 'Photos' },
  { id: 3, label: 'Budget', shortLabel: 'Budget' },
  { id: 4, label: 'Review', shortLabel: 'Review' },
];

export default function CreateJobPage2025() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: '',
    category: '',
    urgency: 'medium',
    budget: '',
    budget_min: '',
    budget_max: '',
    show_budget_to_contractors: false,  // Default: hide budget
    require_itemized_bids: false,  // Will be auto-set based on budget
    requiredSkills: [],
    property_id: searchParams?.get('property_id') || '',
  });

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [preferredDate, setPreferredDate] = useState('');

  const imageUpload = useImageUpload({
    maxImages: 10,
    onError: (error) => toast.error(error),
  });

  const buildingAssessment = useBuildingAssessment({
    onError: (error) => {
      // Non-blocking: show warning but allow user to continue
      toast.error(`AI Assessment unavailable: ${error}`, { duration: 5000 });
    },
  });

  // Fetch properties
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

  // Redirect if not authorized
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'homeowner')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  // Trigger AI assessment when images are uploaded
  useEffect(() => {
    const runAssessment = async () => {
      console.log('[DEBUG] runAssessment effect triggered', {
        imageCount: imageUpload.uploadedImages.length,
        isAssessing: buildingAssessment.isAssessing
      });

      if (imageUpload.uploadedImages.length > 0 && !buildingAssessment.isAssessing) {
        // Get selected property for context
        const selectedProperty = properties.find(p => p.id === formData.property_id);

        console.log('[DEBUG] Calling assessBuilding', {
          imageCount: imageUpload.uploadedImages.length,
          hasLocation: !!(formData.location || selectedProperty?.address),
          propertyType: selectedProperty?.property_type
        });

        await buildingAssessment.assessBuilding(
          imageUpload.uploadedImages,
          {
            location: formData.location || selectedProperty?.address || undefined,
            propertyType: selectedProperty?.property_type as 'residential' | 'commercial' | undefined,
            ageOfProperty: undefined, // Could be extracted from property data if available
          }
        );
      }
    };

    runAssessment();
  }, [imageUpload.uploadedImages, buildingAssessment.isAssessing, formData.location, formData.property_id, properties]); // Fixed dependencies

  const handleSubmit = async () => {
    // Log form data for debugging
    // console.log('Form data being submitted:', formData);
    // console.log('Uploaded images:', imageUpload.uploadedImages);

    const errors = validateJobForm(formData, imageUpload.uploadedImages, imageUpload.imagePreviews.length);
    // console.log('Validation errors:', errors);

    if (!isFormValid(errors)) {
      setValidationErrors(errors);
      // Show specific error messages
      const errorMessages = Object.entries(errors).map(([field, message]) => `${field}: ${message}`);
      console.error('Validation failed:', errorMessages);
      toast.error(errorMessages[0] || 'Please fix validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrls = imageUpload.uploadedImages;
      if (imageUpload.imagePreviews.length > 0 && imageUrls.length === 0) {
        console.log('[Submit] Need to upload images. CSRF token available:', !!csrfToken);
        if (!csrfToken) {
          toast.error('Security token not available. Please refresh the page.');
          setIsSubmitting(false);
          return;
        }
        console.log('[Submit] Calling uploadImages with token');
        imageUrls = await imageUpload.uploadImages(csrfToken);
        console.log('[Submit] Upload completed. URLs received:', imageUrls.length);
      }

      // console.log('Submitting job with data:', {
      //   formData,
      //   photoUrls: imageUrls,
      //   csrfToken: csrfToken || '',
      //   hasAIAssessment: !!buildingAssessment.assessment,
      // });

      const result = await submitJob({
        formData,
        photoUrls: imageUrls,
        csrfToken: csrfToken || '',
        aiAssessment: buildingAssessment.assessment || undefined,
      });

      // Check if submission was successful
      if (!result.success || !result.jobId) {
        throw new Error(result.error || 'Failed to post job');
      }

      // console.log('Job submitted successfully:', result);
      toast.success('Job posted successfully!');
      router.push(`/jobs/${result.jobId}`);
    } catch (error) {
      console.error('Error submitting job:', error);
      const errorMessage = (error as Error).message || 'Failed to post job';

      // Check if it's a phone verification error
      if (errorMessage.toLowerCase().includes('phone verification required') || errorMessage.toLowerCase().includes('verify your phone')) {
        toast.error('Phone verification required to post jobs');
        toast('Redirecting to settings for verification...', { icon: 'ℹ️' });
        // Redirect to settings page after a short delay
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

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    imageUpload.handleImageSelect(e);
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const progress = (currentStep / STEPS.length) * 100;

  const canProceedStep1 = formData.property_id && formData.category && formData.title && formData.description && formData.description.length >= 50;
  const canProceedStep2 = true; // Photos are optional
  const hasImages = imageUpload.imagePreviews.length > 0 || imageUpload.uploadedImages.length > 0;
  const canProceedStep3 = formData.urgency && formData.budget && (parseFloat(String(formData.budget)) <= 500 || hasImages);

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
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {STEPS.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                          currentStep >= step.id
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {step.id}
                      </div>
                      <span
                        className={`ml-3 text-sm font-medium hidden sm:inline ${
                          currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                        <div
                          className="h-full bg-teal-600 transition-all duration-300"
                          style={{ width: currentStep > step.id ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
              {/* Step 1: Details */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">What do you need done?</h1>
                    <p className="text-gray-600">Tell us about your project</p>
                  </div>

                  {/* Property Selection */}
                  <div>
                    <label className="block text-base font-medium text-gray-900 mb-3">
                      Select your property
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {loadingProperties ? (
                        <div className="p-4 text-gray-500">Loading properties...</div>
                      ) : properties.length === 0 ? (
                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center">
                          <p className="text-gray-600 mb-3">No properties found</p>
                          <button
                            onClick={() => router.push('/properties/add')}
                            className="text-teal-600 font-medium hover:text-teal-700"
                          >
                            Add a property first
                          </button>
                        </div>
                      ) : (
                        properties.map((property) => (
                          <button
                            key={property.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                property_id: property.id,
                                location: property.address || formData.location,
                              });
                            }}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                              formData.property_id === property.id
                                ? 'border-teal-600 bg-teal-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              {property.photos?.[0] ? (
                                <Image
                                  src={property.photos[0]}
                                  alt={property.property_name || 'Property'}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-property.svg';
                                  }}
                                />
                              ) : (
                                <Image
                                  src="/placeholder-property.svg"
                                  alt="Property placeholder"
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {property.property_name || 'Unnamed Property'}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-1">{property.address}</p>
                            </div>
                            {formData.property_id === property.id && (
                              <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Service Category */}
                  <div>
                    <label className="block text-base font-medium text-gray-900 mb-3">
                      What type of service do you need?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {serviceCategories.map((category) => (
                        <button
                          key={category.value}
                          onClick={() => setFormData({ ...formData, category: category.value })}
                          className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                            formData.category === category.value
                              ? 'border-teal-600 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-4xl mb-2">{category.icon}</span>
                          <span className="text-sm font-medium text-gray-900 text-center">
                            {category.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-base font-medium text-gray-900 mb-3">
                      Give your job a title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Fix leaking kitchen sink"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-base"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-base font-medium text-gray-900 mb-1">
                      Describe the work needed
                    </label>
                    <div className={`text-sm mb-2 ${
                      formData.description.length < 50
                        ? 'text-gray-500'
                        : 'text-teal-600 font-medium'
                    }`}>
                      {formData.description.length < 50 ? (
                        <>Minimum 50 characters ({formData.description.length}/50 - {50 - formData.description.length} more needed)</>
                      ) : (
                        <>✓ Description is detailed enough ({formData.description.length}/5000)</>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Please provide details about what needs to be done..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:border-transparent resize-none text-base ${
                        validationErrors.description
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-teal-600'
                      }`}
                    />
                    {validationErrors.description && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.description}
                      </p>
                    )}
                  </div>

                  {/* Smart Job Analysis - AI suggestions based on description */}
                  <SmartJobAnalysis
                    title={formData.title}
                    description={formData.description}
                    location={formData.location}
                    imageUrls={imageUpload.uploadedImages}
                    onCategorySelect={(category) => setFormData({ ...formData, category })}
                    onBudgetSelect={(budget) => setFormData({ ...formData, budget: budget.toString() })}
                    onUrgencySelect={(urgency) => setFormData({ ...formData, urgency })}
                  />
                </div>
              )}

              {/* Step 2: Photos */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Add photos of your project</h1>
                    <p className="text-gray-600">Help contractors understand the scope of work (optional)</p>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div>
                    <label
                      htmlFor="photo-upload"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors bg-gray-50"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-12 h-12 mb-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="mb-2 text-base text-gray-700 font-medium">
                          <span className="text-teal-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">PNG, JPG, JPEG up to 10MB (max 10 photos)</p>
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  {/* Photo Previews */}
                  {imageUpload.imagePreviews.length > 0 && (
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-3">
                        Uploaded Photos ({imageUpload.imagePreviews.length}/10)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {imageUpload.imagePreviews.map((previewItem, index) => (
                          <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                            <Image
                              src={previewItem.preview}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <button
                              onClick={() => imageUpload.removeImage(index)}
                              className="absolute top-2 right-2 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 transition-colors shadow-lg"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Assessment Loading State */}
                  {buildingAssessment.isAssessing && (
                    <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">AI Analysis in Progress</h3>
                          <p className="text-sm text-gray-600">Analyzing images for damage assessment...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Assessment Results */}
                  {buildingAssessment.assessment && !buildingAssessment.isAssessing && (
                    <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          AI
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">Building Damage Assessment</h3>
                          <p className="text-sm text-gray-600">AI-powered analysis complete</p>
                        </div>
                        <span className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-full">
                          {buildingAssessment.assessment.damageAssessment.confidence}% Confidence
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Damage Type</div>
                          <div className="text-base font-bold text-gray-900 capitalize">
                            {buildingAssessment.assessment.damageAssessment.damageType}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Severity</div>
                          <div className="text-base font-bold text-gray-900 capitalize">
                            {buildingAssessment.assessment.damageAssessment.severity}
                          </div>
                        </div>

                        {buildingAssessment.assessment.safetyHazards.hasSafetyHazards && (
                          <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <div className="text-sm font-semibold text-rose-900">Safety Hazards Detected</div>
                            </div>
                            <div className="text-xs text-rose-700 ml-7">
                              {buildingAssessment.assessment.safetyHazards.criticalFlags.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Description</div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {buildingAssessment.assessment.damageAssessment.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Budget */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Set your budget and timeline</h1>
                    <p className="text-gray-600">This helps contractors provide accurate quotes</p>
                  </div>

                  {/* Budget Range Selector - New Enhanced Component */}
                  <BudgetRangeSelector
                    value={{
                      budget: String(formData.budget),
                      budget_min: String(formData.budget_min || ''),
                      budget_max: String(formData.budget_max || ''),
                      show_budget_to_contractors: formData.show_budget_to_contractors || false,
                      require_itemized_bids: formData.require_itemized_bids || false,
                    }}
                    onChange={(budgetData: BudgetData) => {
                      setFormData({
                        ...formData,
                        budget: budgetData.budget,
                        budget_min: budgetData.budget_min,
                        budget_max: budgetData.budget_max,
                        show_budget_to_contractors: budgetData.show_budget_to_contractors,
                        require_itemized_bids: budgetData.require_itemized_bids,
                      });
                    }}
                    hasImages={hasImages}
                  />

                  {/* Urgency */}
                  <div>
                    <label className="block text-base font-medium text-gray-900 mb-3">
                      When do you need this done?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {urgencyOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFormData({ ...formData, urgency: option.value as 'low' | 'medium' | 'high' })}
                          className={`flex flex-col p-6 rounded-xl border-2 transition-all text-left ${
                            formData.urgency === option.value
                              ? 'border-teal-600 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg font-semibold text-gray-900 mb-1">{option.label}</span>
                          <span className="text-sm text-gray-600">{option.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Date */}
                  <div>
                    <label className="block text-base font-medium text-gray-900 mb-3">
                      Preferred start date (optional)
                    </label>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-base"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Review and post your job</h1>
                    <p className="text-gray-600">Make sure everything looks good before posting</p>
                  </div>

                  {/* Summary Card */}
                  <div className="space-y-6">
                    {/* Property & Category */}
                    <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                      {selectedProperty && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {selectedProperty.photos?.[0] ? (
                            <Image
                              src={selectedProperty.photos[0]}
                              alt={selectedProperty.property_name || 'Property'}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-property.svg';
                              }}
                            />
                          ) : (
                            <Image
                              src="/placeholder-property.svg"
                              alt="Property placeholder"
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Property</h3>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedProperty?.property_name || 'Property'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{selectedProperty?.address}</p>
                      </div>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-sm text-teal-600 font-medium hover:text-teal-700"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Job Details */}
                    <div className="pb-6 border-b border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Job title</h3>
                          <p className="text-lg font-semibold text-gray-900">{formData.title}</p>
                        </div>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="text-sm text-teal-600 font-medium hover:text-teal-700"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                        <p className="text-base text-gray-900 capitalize">{formData.category}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                        <p className="text-base text-gray-900 whitespace-pre-wrap">{formData.description}</p>
                      </div>
                    </div>

                    {/* Photos */}
                    {imageUpload.imagePreviews.length > 0 && (
                      <div className="pb-6 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-500">
                            Photos ({imageUpload.imagePreviews.length})
                          </h3>
                          <button
                            onClick={() => setCurrentStep(2)}
                            className="text-sm text-teal-600 font-medium hover:text-teal-700"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {imageUpload.imagePreviews.slice(0, 4).map((previewItem, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                              <Image
                                src={previewItem.preview}
                                alt={`Photo ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget & Timeline */}
                    <div className="pb-6 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-medium text-gray-500">Budget & Timeline</h3>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="text-sm text-teal-600 font-medium hover:text-teal-700"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Budget</h4>
                          <p className="text-2xl font-bold text-gray-900">£{formData.budget || '0'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Urgency</h4>
                          <p className="text-base font-semibold text-gray-900 capitalize">
                            {urgencyOptions.find(o => o.value === formData.urgency)?.label || formData.urgency}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Assessment Summary */}
                    {buildingAssessment.assessment && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-gray-500">AI Damage Assessment</h3>
                          <button
                            onClick={() => setCurrentStep(2)}
                            className="text-sm text-teal-600 font-medium hover:text-teal-700"
                          >
                            View Details
                          </button>
                        </div>
                        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              AI
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {buildingAssessment.assessment.damageAssessment.damageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                              <div className="text-xs text-gray-600">
                                Severity: {buildingAssessment.assessment.damageAssessment.severity} • {buildingAssessment.assessment.damageAssessment.confidence}% confidence
                              </div>
                            </div>
                            {buildingAssessment.assessment.safetyHazards.hasSafetyHazards && (
                              <div className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-semibold">
                                Safety Alert
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {buildingAssessment.assessment.damageAssessment.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}

              {currentStep < STEPS.length ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={
                    (currentStep === 1 && !canProceedStep1) ||
                    (currentStep === 3 && !canProceedStep3)
                  }
                  className="px-8 py-3 text-base font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 text-base font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? 'Posting...' : 'Post Job'}
                </button>
              )}
            </div>
          </div>
        </div>
      </HomeownerPageWrapper>
    </ErrorBoundary>
  );
}
