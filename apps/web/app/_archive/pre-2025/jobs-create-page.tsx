'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { HomeownerLayoutShell } from '../../dashboard/components/HomeownerLayoutShell';
import { SmartJobAnalysis } from './components/SmartJobAnalysis';
import { getSkillIcon } from '@/lib/skills/skill-icon-mapping';
import Link from 'next/link';
import { BuildingAssessmentDisplay } from '@/components/building-surveyor';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { useLocationSearch } from './hooks/useLocationSearch';
import { useImageUpload } from './hooks/useImageUpload';
import { validateJobForm, isFormValid, type JobFormData } from './utils/validation';
import { submitJob } from './utils/submitJob';
import { VerificationBanner } from './components/VerificationBanner';

const jobCategories = [
  { label: 'Handyman', value: 'handyman' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Painting & Decorating', value: 'painting' },
  { label: 'Carpentry', value: 'carpentry' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Gardening', value: 'gardening' },
  { label: 'Roofing', value: 'roofing' },
  { label: 'Heating & Gas', value: 'heating' },
  { label: 'Flooring', value: 'flooring' },
];

// Available contractor skills (same as contractor profile)
const availableSkills = [
  'General Contracting',
  'Kitchen Remodeling',
  'Bathroom Renovation',
  'Plumbing',
  'Electrical Work',
  'Carpentry',
  'Tiling',
  'Painting',
  'Flooring',
  'Roofing',
  'HVAC',
  'Landscaping',
  'Masonry',
  'Drywall',
  'Window Installation',
  'Door Installation',
  'Deck Building',
  'Fence Installation',
  'Concrete Work',
  'Insulation',
  'Siding',
  'Gutters',
  'General Maintenance',
  'Home Inspection',
  'Demolition',
].sort();

export default function CreateJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: loadingUser } = useCurrentUser();
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
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const handleToggleSkill = (skill: string) => {
    if (formData.requiredSkills.includes(skill)) {
      setFormData({ ...formData, requiredSkills: formData.requiredSkills.filter(s => s !== skill) });
    } else {
      if (formData.requiredSkills.length >= 10) {
        setValidationErrors({ ...validationErrors, requiredSkills: 'Maximum 10 skills allowed' });
        return;
      }
      setFormData({ ...formData, requiredSkills: [...formData.requiredSkills, skill] });
      setValidationErrors({ ...validationErrors, requiredSkills: '' });
    }
    setShowSkillsDropdown(false);
  };

  // Use extracted hooks
  const locationSearch = useLocationSearch({
    location: formData.location,
    onLocationSelect: (address) => setFormData(prev => ({ ...prev, location: address })),
  });

  const imageUpload = useImageUpload({
    maxImages: 10,
    onError: (error) => setAlertDialog({ open: true, title: 'Upload Error', message: error }),
  });
  
  // Alert Dialog state
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string; onConfirm?: () => void; onCancel?: () => void }>({
    open: false,
    title: '',
    message: '',
  });
  
  // Building Surveyor AI Assessment
  const [assessment, setAssessment] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string>('');

  const [verificationStatus, setVerificationStatus] = React.useState<{
    emailVerified: boolean;
    phoneVerified: boolean;
    canPostJobs: boolean;
    missingRequirements: string[];
  } | null>(null);
  const { csrfToken } = useCSRF();

  // Fetch properties when user is loaded
  React.useEffect(() => {
    if (user && user.role === 'homeowner') {
      setLoadingProperties(true);
      fetch('/api/properties')
        .then(res => res.json())
        .then(data => {
          if (data.properties) {
            setProperties(data.properties);
            // If property_id is in URL and we have properties, auto-select it and fill location
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

  // Check verification status
  React.useEffect(() => {
    if (user && user.role === 'homeowner') {
      fetch('/api/auth/verification-status')
        .then(res => res.json())
        .then(data => setVerificationStatus(data))
        .catch(() => {});
    }
  }, [user]);

  // Redirect if not logged in or not a homeowner
  React.useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'homeowner')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  // Location and image upload logic now handled by hooks

  // AI Building Surveyor Assessment
  const handleAIAssessment = async () => {
    if (imageUpload.imagePreviews.length === 0) {
      setAssessmentError('Please upload photos first');
      return;
    }

    setIsAnalyzing(true);
    setAssessmentError('');

    try {
      // Upload images first if not already uploaded
      let imageUrls = imageUpload.uploadedImages;
      if (imageUrls.length === 0) {
        imageUrls = await imageUpload.uploadImages();
        if (imageUrls.length === 0) {
          throw new Error('Failed to upload images for assessment');
        }
      }

      // Call assessment API
      const response = await fetch('/api/building-surveyor/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: imageUrls.slice(0, 4), // Limit to 4 images
          context: {
            location: formData.location,
            propertyType: 'residential',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Assessment failed');
      }

      const assessmentData = await response.json();
      setAssessment(assessmentData);
    } catch (error) {
      logger.error('Error assessing damage:', error);
      setAssessmentError(
        error instanceof Error ? error.message : 'Failed to assess damage. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pre-fill form with assessment data
  const handleUseAssessment = () => {
    if (!assessment) return;

    const damageType = assessment.damageAssessment.damageType.replace(/_/g, ' ');
    const location = assessment.damageAssessment.location.replace(/_/g, ' ');

    // Map damage type to category
    const categoryMap: Record<string, string> = {
      water_damage: 'plumbing',
      electrical_issue: 'electrical',
      structural_crack: 'handyman',
      roof_damage: 'roofing',
      damp: 'handyman',
      plumbing_issue: 'plumbing',
    };
    const suggestedCategory =
      categoryMap[assessment.damageAssessment.damageType] || 'handyman';

    // Map urgency to form urgency
    const urgencyMap: Record<string, 'low' | 'medium' | 'high'> = {
      immediate: 'high',
      urgent: 'high',
      soon: 'medium',
      planned: 'low',
      monitor: 'low',
    };
    const suggestedUrgency =
      urgencyMap[assessment.urgency.urgency] || 'medium';

    // Build description
    const description = `${assessment.homeownerExplanation.whatIsIt}\n\n${assessment.homeownerExplanation.whatToDo}`;

    // Update form
    setFormData({
      ...formData,
      title: `${damageType} - ${location}`,
      description: description,
      category: suggestedCategory,
      urgency: suggestedUrgency,
      budget: assessment.contractorAdvice.estimatedCost.recommended.toString(),
    });
  };

  // Location detection now handled by useLocationSearch hook

  const validate = () => {
    // Use validation utility
    const errors = validateJobForm(formData, imageUpload.uploadedImages);
    setValidationErrors(errors);
    return isFormValid(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload images first if any
      let photoUrls: string[] = [];
      if (imageUpload.imagePreviews.length > 0) {
        photoUrls = await imageUpload.uploadImages();
        if (photoUrls.length === 0 && imageUpload.imagePreviews.length > 0) {
          // If upload failed but user selected images, ask them
          setAlertDialog({
            open: true,
            title: 'Image Upload Failed',
            message: 'Failed to upload some images. Continue without images?',
            onConfirm: async () => {
              setAlertDialog({ open: false, title: '', message: '' });
              await handleJobSubmission([]);
            },
            onCancel: () => {
              setAlertDialog({ open: false, title: '', message: '' });
              setIsSubmitting(false);
            },
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      await handleJobSubmission(photoUrls);
    } catch (err) {
      logger.error('Error creating job:', err);
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setIsSubmitting(false);
    }
  };

  const handleJobSubmission = async (photoUrls: string[]) => {
    setIsSubmitting(true);
    try {
      if (!csrfToken) {
        throw new Error('Security token not available. Please refresh the page.');
      }

      const result = await submitJob({
        formData,
        photoUrls,
        csrfToken,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create job');
      }

      if (result.jobId) {
        router.push(`/jobs/${result.jobId}`);
      } else {
        throw new Error('Job creation succeeded but no job ID returned');
      }
    } catch (err) {
      logger.error('Error creating job:', err);
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.backgroundSecondary }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'homeowner') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.backgroundSecondary }}>
        <div style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing[8],
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.border}`,
          textAlign: 'center',
          maxWidth: '500px',
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            Access Denied
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[6],
          }}>
            {!user 
              ? 'You must be logged in to create a job.'
              : 'Only homeowners can create jobs.'}
          </p>
          <Link href={!user ? `/login?redirect=/jobs/create` : '/dashboard'} style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              {!user ? 'Go to Login' : 'Go to Dashboard'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show verification requirement if not verified
  if (verificationStatus && !verificationStatus.canPostJobs) {
    return (
      <HomeownerLayoutShell
        currentPath="/jobs/create"
        userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
        userEmail={user.email}
      >
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: theme.spacing[6],
        }}>
          <VerificationBanner verificationStatus={verificationStatus} />
        </div>
      </HomeownerLayoutShell>
    );
  }

  return (
    <HomeownerLayoutShell
      currentPath="/jobs/create"
      userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6]
      }}>
        {/* Header with Back Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing[4]
        }}>
          <div>
            <h1 style={{
              margin: 0,
              marginBottom: theme.spacing[1],
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Post a New Job
            </h1>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Fill in the details below to create a new job posting
            </p>
          </div>
          <Link href="/jobs" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">
              <Icon name="arrowLeft" size={16} color={theme.colors.textPrimary} />
              Back to Jobs
            </Button>
          </Link>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[6]
          }}>
            {/* Title */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2]
              }}>
                Job Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Fix leaking kitchen tap"
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${validationErrors.title ? theme.colors.error : theme.colors.border}`,
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.backgroundSecondary,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              {validationErrors.title && (
                <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                  {validationErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2]
              }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about the work needed..."
                rows={6}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${validationErrors.description ? theme.colors.error : theme.colors.border}`,
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.backgroundSecondary,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s'
                }}
              />
              {validationErrors.description && (
                <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                  {validationErrors.description}
                </p>
              )}
              <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                {formData.description.length}/500 characters
              </p>
              
              {/* Smart Job Analysis */}
              <SmartJobAnalysis
                title={formData.title}
                description={formData.description}
                location={formData.location}
                imageUrls={imageUpload.uploadedImages}
                onCategorySelect={(category) => {
                  setFormData({ ...formData, category });
                }}
                onBudgetSelect={(budget) => {
                  setFormData({ ...formData, budget: budget.toString() });
                }}
                onUrgencySelect={(urgency) => {
                  setFormData({ ...formData, urgency });
                }}
              />
            </div>

            {/* Photos Upload */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2]
              }}>
                Photos (Optional)
              </label>
              <p style={{
                margin: 0,
                marginBottom: theme.spacing[2],
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Add photos to help contractors understand the work needed. Up to 10 photos, max 5MB each.
              </p>

              {/* Image Upload Input */}
              <input
                type="file"
                id="job-photos"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={imageUpload.handleImageSelect}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="job-photos"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.lg,
                  border: `2px dashed ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
              >
                <Icon name="camera" size={20} color={theme.colors.primary} />
                {imageUpload.imagePreviews.length === 0 ? 'Add Photos' : `Add More Photos (${imageUpload.imagePreviews.length}/10)`}
              </label>

              {/* Image Previews */}
              {imageUpload.imagePreviews.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: theme.spacing[3],
                  marginTop: theme.spacing[4],
                }}>
                  {imageUpload.imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: theme.borderRadius.lg,
                        overflow: 'hidden',
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.backgroundSecondary,
                      }}
                    >
                      <img
                        src={preview.preview}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => imageUpload.removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: theme.spacing[1],
                          right: theme.spacing[1],
                          width: '24px',
                          height: '24px',
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: theme.typography.fontWeight.bold,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                        }}
                      >
                        ×
                      </button>
                      {imageUpload.isUploading && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: theme.spacing[1],
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: 'white',
                          fontSize: '10px',
                          textAlign: 'center',
                        }}>
                          Uploading...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI Assessment Button */}
              {imageUpload.imagePreviews.length > 0 && !assessment && (
                <div style={{ marginTop: theme.spacing[4] }}>
                  <button
                    type="button"
                    onClick={handleAIAssessment}
                    disabled={isAnalyzing || imageUpload.isUploading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                      backgroundColor: isAnalyzing ? theme.colors.border : '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: theme.borderRadius.lg,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isAnalyzing) {
                        e.currentTarget.style.backgroundColor = '#059669';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAnalyzing) {
                        e.currentTarget.style.backgroundColor = '#10B981';
                      }
                    }}
                  >
                    <Icon name="sparkles" size={20} color="white" />
                    {isAnalyzing ? 'Analyzing Damage...' : 'Analyze with AI Building Surveyor'}
                  </button>
                  {assessmentError && (
                    <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[2] }}>
                      {assessmentError}
                    </p>
                  )}
                </div>
              )}

              {/* Assessment Results */}
              {assessment && (
                <div style={{ marginTop: theme.spacing[6] }}>
                  <BuildingAssessmentDisplay
                    assessment={assessment}
                    onUseAssessment={handleUseAssessment}
                  />
                </div>
              )}
            </div>

            {/* Property Selection (Optional) */}
            {properties.length > 0 && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[2]
                }}>
                  Property (Optional)
                </label>
                <p style={{
                  margin: 0,
                  marginBottom: theme.spacing[2],
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}>
                  Link this job to a property for better organization
                </p>
                <select
                  value={formData.property_id}
                  onChange={(e) => {
                    const selectedProperty = properties.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      property_id: e.target.value,
                      location: selectedProperty?.address || formData.location,
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">No property selected</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.property_name || 'Unnamed Property'} {property.address ? `- ${property.address}` : ''}
                    </option>
                  ))}
                </select>
                {formData.property_id && (
                  <Link
                    href={`/properties/${formData.property_id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing[1],
                      marginTop: theme.spacing[2],
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.primary,
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name="externalLink" size={14} color={theme.colors.primary} />
                    View property details
                  </Link>
                )}
              </div>
            )}

            {/* Location */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2]
              }}>
                Location *
              </label>
              <div style={{ position: 'relative', display: 'flex', gap: theme.spacing[2] }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    onFocus={() => {
                      if (locationSearch.suggestions.length > 0) {
                        // Suggestions are managed by hook
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow clicking on suggestions
                      setTimeout(() => locationSearch.clearSuggestions(), 200);
                    }}
                    placeholder="e.g., London, SW1A 1AA"
                    style={{
                      width: '100%',
                      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                      borderRadius: theme.borderRadius.lg,
                      border: `1px solid ${validationErrors.location ? theme.colors.error : theme.colors.border}`,
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                      backgroundColor: theme.colors.backgroundSecondary,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  
                  {/* Autocomplete Dropdown */}
                  {locationSearch.showSuggestions && locationSearch.suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: theme.spacing[1],
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      zIndex: 1000,
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}>
                      {locationSearch.isLoading && (
                        <div style={{
                          padding: theme.spacing[4],
                          textAlign: 'center',
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.fontSize.sm,
                        }}>
                          Searching...
                        </div>
                      )}
                      {!locationSearch.isLoading && locationSearch.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.place_id}
                          onClick={() => locationSearch.handleLocationSelect(suggestion.display_name)}
                          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          style={{
                            padding: theme.spacing[3],
                            cursor: 'pointer',
                            fontSize: theme.typography.fontSize.sm,
                            color: theme.colors.textPrimary,
                            borderBottom: `1px solid ${theme.colors.border}`,
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: theme.spacing[2],
                          }}>
                            <Icon name="mapPin" size={16} color={theme.colors.textSecondary} style={{ marginTop: '2px' }} />
                            <span>{suggestion.display_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      locationSearch.detectCurrentLocation();
                    } catch (error) {
                      setAlertDialog({
                        open: true,
                        title: 'Location Error',
                        message: error instanceof Error ? error.message : 'Unable to retrieve your location. Please enter it manually.',
                      });
                    }
                  }}
                  disabled={locationSearch.isDetectingLocation}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    cursor: locationSearch.isDetectingLocation ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    whiteSpace: 'nowrap',
                    opacity: locationSearch.isDetectingLocation ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!locationSearch.isDetectingLocation) {
                      e.currentTarget.style.backgroundColor = '#1E293B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                  }}
                >
                  <Icon name="mapPin" size={16} color="white" />
                  {locationSearch.isDetectingLocation ? 'Detecting...' : 'Use My Location'}
                </button>
              </div>
              {validationErrors.location && (
                <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                  {validationErrors.location}
                </p>
              )}
            </div>

            {/* Category and Urgency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[4] }}>
              {/* Category */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[2]
                }}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${validationErrors.category ? theme.colors.error : theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <option value="">Select category</option>
                  {jobCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                    {validationErrors.category}
                  </p>
                )}
              </div>

              {/* Urgency */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[2]
                }}>
                  Urgency *
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as 'low' | 'medium' | 'high' })}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2]
              }}>
                Required Contractor Skills (Optional) ({formData.requiredSkills.length}/10)
              </label>
              <p style={{
                margin: 0,
                marginBottom: theme.spacing[2],
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}>
                Select skills required for this job. Only contractors with matching skills will see this job in their "Jobs Near You" feed.
              </p>
              
              {/* Selected Skills Chips */}
              {formData.requiredSkills.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: theme.spacing[2],
                  marginBottom: theme.spacing[3],
                }}>
                  {formData.requiredSkills.map((skill) => (
                    <div
                      key={skill}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[1],
                        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                        backgroundColor: theme.colors.primary,
                        color: 'white',
                        borderRadius: theme.borderRadius.full,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      }}
                    >
                      <Icon name={getSkillIcon(skill)} size={14} color="white" />
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSkill(skill)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          borderRadius: theme.borderRadius.full,
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          marginLeft: theme.spacing[1],
                        }}
                      >
                        <Icon name="x" size={12} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Skill Selection Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                  disabled={formData.requiredSkills.length >= 10}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${validationErrors.requiredSkills ? theme.colors.error : theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.textPrimary,
                    cursor: formData.requiredSkills.length >= 10 ? 'not-allowed' : 'pointer',
                    opacity: formData.requiredSkills.length >= 10 ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: theme.typography.fontSize.base,
                  }}
                >
                  <span>{formData.requiredSkills.length >= 10 ? 'Maximum skills reached' : 'Add Required Skill'}</span>
                  <Icon name="chevronDown" size={16} color={theme.colors.textSecondary} />
                </button>

                {showSkillsDropdown && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: theme.spacing[1],
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.lg,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        padding: theme.spacing[2],
                      }}
                    >
                      {availableSkills
                        .filter(skill => !formData.requiredSkills.includes(skill))
                        .map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => handleToggleSkill(skill)}
                            style={{
                              width: '100%',
                              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                              textAlign: 'left',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: theme.borderRadius.md,
                              fontSize: theme.typography.fontSize.sm,
                              color: theme.colors.textPrimary,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing[2],
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Icon name={getSkillIcon(skill)} size={16} color={theme.colors.textSecondary} />
                            <span>{skill}</span>
                          </button>
                        ))}
                      {availableSkills.filter(skill => !formData.requiredSkills.includes(skill)).length === 0 && (
                        <div style={{
                          padding: theme.spacing[4],
                          textAlign: 'center',
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.fontSize.sm,
                        }}>
                          All available skills selected
                        </div>
                      )}
                    </div>
                    {/* Backdrop to close dropdown */}
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999,
                      }}
                      onClick={() => setShowSkillsDropdown(false)}
                    />
                  </>
                )}
              </div>
              {validationErrors.requiredSkills && (
                <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                  {validationErrors.requiredSkills}
                </p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2]
              }}>
                Budget (£) *
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., 150"
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${validationErrors.budget ? theme.colors.error : theme.colors.border}`,
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.backgroundSecondary,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              {validationErrors.budget && (
                <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                  {validationErrors.budget}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: theme.spacing[3],
                borderRadius: theme.borderRadius.lg,
                backgroundColor: `${theme.colors.error}15`,
                color: theme.colors.error,
                fontSize: theme.typography.fontSize.sm
              }}>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: theme.spacing[3], alignItems: 'center' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                style={{ minWidth: '200px' }}
              >
                {isSubmitting ? 'Posting...' : 'Post Job'}
              </Button>
              <Link href="/jobs" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
      
      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open: boolean) => {
        if (!open) {
          setAlertDialog({ open: false, title: '', message: '' });
          if (alertDialog.onCancel) {
            alertDialog.onCancel();
          }
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertDialog.onCancel && (
              <AlertDialogCancel onClick={alertDialog.onCancel}>
                Cancel
              </AlertDialogCancel>
            )}
            {alertDialog.onConfirm ? (
              <AlertDialogAction onClick={alertDialog.onConfirm}>
                Continue
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => setAlertDialog({ open: false, title: '', message: '' })}>
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HomeownerLayoutShell>
  );
}

