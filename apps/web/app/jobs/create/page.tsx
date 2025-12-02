'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';;
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { JobCreationWizard2025 } from './components/JobCreationWizard2025';
import { DragDropUpload2025 } from './components/DragDropUpload2025';
import { SmartJobAnalysis } from './components/SmartJobAnalysis';
import { fadeIn, slideInFromRight } from '@/lib/animations/variants';
import { useLocationSearch } from './hooks/useLocationSearch';
import { useImageUpload } from './hooks/useImageUpload';
import { validateJobForm, isFormValid, type JobFormData } from './utils/validation';
import { submitJob } from './utils/submitJob';
import { useCSRF } from '@/lib/hooks/useCSRF';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UnifiedButton } from '@/components/ui';

const jobCategories = [
  { label: 'Handyman', value: 'handyman', icon: '🔧' },
  { label: 'Plumbing', value: 'plumbing', icon: '🚰' },
  { label: 'Electrical', value: 'electrical', icon: '⚡' },
  { label: 'Painting & Decorating', value: 'painting', icon: '🎨' },
  { label: 'Carpentry', value: 'carpentry', icon: '🔨' },
  { label: 'Cleaning', value: 'cleaning', icon: '🧹' },
  { label: 'Gardening', value: 'gardening', icon: '🌱' },
  { label: 'Roofing', value: 'roofing', icon: '🏠' },
  { label: 'Heating & Gas', value: 'heating', icon: '🔥' },
  { label: 'Flooring', value: 'flooring', icon: '📐' },
];

const urgencyLevels = [
  { label: 'Low', value: 'low', color: 'blue', description: 'Can wait a few weeks' },
  { label: 'Medium', value: 'medium', color: 'amber', description: 'Within 1-2 weeks' },
  { label: 'High', value: 'high', color: 'orange', description: 'Within a few days' },
  { label: 'Emergency', value: 'emergency', color: 'rose', description: 'Needs immediate attention' },
];

const availableSkills = [
  'General Contracting', 'Kitchen Remodeling', 'Bathroom Renovation',
  'Plumbing', 'Electrical Work', 'Carpentry', 'Tiling', 'Painting',
  'Flooring', 'Roofing', 'HVAC', 'Landscaping', 'Masonry', 'Drywall',
  'Window Installation', 'Door Installation', 'Deck Building',
  'Fence Installation', 'Concrete Work', 'Insulation', 'Siding',
  'Gutters', 'General Maintenance', 'Home Inspection', 'Demolition',
].sort();

export default function CreateJobPage2025() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: '',
    category: '',
    urgency: 'medium',
    budget: '',
    requiredSkills: [],
    property_id: searchParams?.get('property_id') || '',
  });

  const [properties, setProperties] = useState<Array<{ id: string; property_name: string | null; address: string | null }>>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const locationSearch = useLocationSearch({
    location: formData.location,
    onLocationSelect: (address) => setFormData(prev => ({ ...prev, location: address })),
  });

  const imageUpload = useImageUpload({
    maxImages: 10,
    onError: (error) => toast.error(error),
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
              const selectedProperty = data.properties.find((p: { id: string }) => p.id === urlPropertyId);
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

  // AI Assessment
  const handleAIAssessment = async () => {
    if (imageUpload.imagePreviews.length === 0) {
      toast.error('Please upload photos first');
      return;
    }

    setIsAnalyzing(true);
    try {
      let imageUrls = imageUpload.uploadedImages;
      if (imageUrls.length === 0) {
        imageUrls = await imageUpload.uploadImages();
        if (imageUrls.length === 0) {
          throw new Error('Failed to upload images');
        }
      }

      const response = await fetch('/api/building-surveyor/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageUrls,
          jobDescription: formData.description,
          jobCategory: formData.category,
        }),
      });

      if (!response.ok) throw new Error('Assessment failed');

      const result = await response.json();
      setAssessment(result.assessment);
      toast.success('AI assessment complete!');
    } catch (error) {
      toast.error('Failed to analyze images');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validateJobForm(formData, imageUpload.uploadedImages);
    if (!isFormValid(errors)) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrls = imageUpload.uploadedImages;
      if (imageUpload.imagePreviews.length > 0 && imageUrls.length === 0) {
        imageUrls = await imageUpload.uploadImages();
      }

      const result = await submitJob({
        formData,
        photoUrls: imageUrls,
        csrfToken: csrfToken || '',
      });

      toast.success('Job posted successfully!');
      router.push(`/jobs/${result.jobId}`);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to post job');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const wizardSteps = [
    { label: 'Basics', icon: '📝' },
    { label: 'Details', icon: '📋' },
    { label: 'Photos', icon: '📸' },
    { label: 'Review', icon: '✅' },
  ];

  return (
    <ErrorBoundary componentName="CreateJobPage">
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: (user as any).profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1200px] mx-auto px-8 py-12">
            <UnifiedButton
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              ariaLabel="Go back to jobs list"
              className="text-teal-100 hover:text-white hover:bg-white/10 mb-6"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Back to Jobs
            </UnifiedButton>

            <h1 className="text-4xl font-bold mb-2">Post a New Job</h1>
            <p className="text-teal-100 text-lg">Get competitive quotes from verified contractors</p>
          </div>
        </MotionDiv>

        {/* Wizard Content */}
        <div className="max-w-[1200px] mx-auto px-8 py-8 w-full">
          <JobCreationWizard2025
            currentStep={currentStep}
            totalSteps={wizardSteps.length}
            onStepChange={setCurrentStep}
          >
            <AnimatePresence mode="wait">
              {/* Step 0: Basics */}
              {currentStep === 0 && (
                <MotionDiv
                  key="step-0"
                  variants={slideInFromRight}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your project</h2>

                  {/* Property Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Property
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => {
                        const property = properties.find(p => p.id === e.target.value);
                        setFormData({
                          ...formData,
                          property_id: e.target.value,
                          location: property?.address || formData.location,
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Select a property</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.property_name || p.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Title <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Fix leaking kitchen faucet"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    {validationErrors.title && (
                      <p className="text-rose-600 text-sm mt-1">{validationErrors.title}</p>
                    )}
                  </div>

                  {/* Category Grid */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category <span className="text-rose-600">*</span>
                    </label>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {jobCategories.map(cat => (
                        <MotionButton
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          aria-label={`Select ${cat.label} category`}
                          aria-pressed={formData.category === cat.value}
                          className={`p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                            formData.category === cat.value
                              ? 'border-teal-600 bg-teal-50'
                              : 'border-gray-200 hover:border-teal-300 bg-white'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="text-3xl mb-2" aria-hidden="true">{cat.icon}</div>
                          <div className="text-sm font-medium text-gray-900">{cat.label}</div>
                        </MotionButton>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter address or postcode"
                      value={formData.location}
                      onChange={(e) => {
                        setFormData({ ...formData, location: e.target.value });
                        locationSearch.searchAddresses(e.target.value);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    {locationSearch.suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {locationSearch.suggestions.map((suggestion, index) => (
                          <UnifiedButton
                            key={index}
                            onClick={() => {
                              setFormData({ ...formData, location: suggestion.display_name });
                              locationSearch.handleLocationSelect(suggestion.display_name);
                              locationSearch.clearSuggestions();
                            }}
                            variant="ghost"
                            size="md"
                            fullWidth
                            ariaLabel={`Select location: ${suggestion.display_name}`}
                            className="justify-start rounded-none first:rounded-t-xl last:rounded-b-xl"
                          >
                            {suggestion.display_name}
                          </UnifiedButton>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-6">
                    <UnifiedButton
                      onClick={() => setCurrentStep(1)}
                      disabled={!formData.title || !formData.category || !formData.location}
                      variant="primary"
                      size="lg"
                    >
                      Continue to Details →
                    </UnifiedButton>
                  </div>
                </MotionDiv>
              )}

              {/* Step 1: Details */}
              {currentStep === 1 && (
                <MotionDiv
                  key="step-1"
                  variants={slideInFromRight}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Details</h2>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Describe the work needed in detail..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                    />
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Urgency</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {urgencyLevels.map(level => (
                        <MotionButton
                          key={level.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, urgency: level.value as 'low' | 'medium' | 'high' })}
                          aria-label={`Select ${level.label} urgency: ${level.description}`}
                          aria-pressed={formData.urgency === level.value}
                          className={`p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                            formData.urgency === level.value
                              ? `border-${level.color}-600 bg-${level.color}-50`
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="font-semibold text-gray-900 mb-1">{level.label}</div>
                          <div className="text-xs text-gray-600">{level.description}</div>
                        </MotionButton>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Budget (GBP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <UnifiedButton
                      onClick={() => setCurrentStep(0)}
                      variant="outline"
                      size="lg"
                    >
                      ← Back
                    </UnifiedButton>
                    <UnifiedButton
                      onClick={() => setCurrentStep(2)}
                      disabled={!formData.description}
                      variant="primary"
                      size="lg"
                    >
                      Continue to Photos →
                    </UnifiedButton>
                  </div>
                </MotionDiv>
              )}

              {/* Step 2: Photos */}
              {currentStep === 2 && (
                <MotionDiv
                  key="step-2"
                  variants={slideInFromRight}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Photos</h2>

                  <DragDropUpload2025
                    images={imageUpload.uploadedImages}
                    onImagesChange={(files) => {
                      // Create a mock event object for handleImageSelect
                      const mockEvent = {
                        target: {
                          files: files as unknown as FileList,
                        },
                      } as React.ChangeEvent<HTMLInputElement>;
                      imageUpload.handleImageSelect(mockEvent);
                    }}
                    onRemoveImage={(index) => {
                      imageUpload.removeImage(index);
                    }}
                    maxImages={10}
                  />

                  {imageUpload.imagePreviews.length > 0 && (
                    <UnifiedButton
                      onClick={handleAIAssessment}
                      disabled={isAnalyzing}
                      loading={isAnalyzing}
                      ariaLabel={isAnalyzing ? "Analyzing photos with AI" : "Get AI assessment of uploaded photos"}
                      variant="primary"
                      size="lg"
                      fullWidth
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      leftIcon={
                        !isAnalyzing && (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )
                      }
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Get AI Assessment'}
                    </UnifiedButton>
                  )}

                  {assessment && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-teal-900 mb-2">AI Analysis Complete</h3>
                      <p className="text-teal-700">Assessment data available for review.</p>
                    </div>
                  )}

                  <div className="flex justify-between pt-6">
                    <UnifiedButton
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                      size="lg"
                    >
                      ← Back
                    </UnifiedButton>
                    <UnifiedButton
                      onClick={() => setCurrentStep(3)}
                      variant="primary"
                      size="lg"
                    >
                      Review & Submit →
                    </UnifiedButton>
                  </div>
                </MotionDiv>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <MotionDiv
                  key="step-3"
                  variants={slideInFromRight}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Job</h2>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-1">Title</h3>
                      <p className="text-lg font-bold text-gray-900">{formData.title}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-1">Category</h3>
                        <p className="text-gray-900 capitalize">{formData.category}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-1">Urgency</h3>
                        <p className="text-gray-900 capitalize">{formData.urgency}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-1">Budget</h3>
                        <p className="text-gray-900 font-semibold">£{formData.budget || '0'}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-1">Location</h3>
                      <p className="text-gray-900">{formData.location}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-1">Description</h3>
                      <p className="text-gray-900 whitespace-pre-wrap">{formData.description}</p>
                    </div>

                    {imageUpload.imagePreviews.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-2">Photos ({imageUpload.imagePreviews.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {imageUpload.imagePreviews.map((previewItem, index) => (
                            <div key={index} className="relative w-full h-24 rounded-lg overflow-hidden">
                              <Image
                                src={previewItem.preview}
                                alt={`Preview ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-6">
                    <UnifiedButton
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                      size="lg"
                    >
                      ← Back
                    </UnifiedButton>
                    <UnifiedButton
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      ariaLabel={isSubmitting ? "Posting job..." : "Post job"}
                      variant="primary"
                      size="xl"
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl"
                    >
                      {isSubmitting ? 'Posting...' : 'Post Job'}
                    </UnifiedButton>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </JobCreationWizard2025>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
