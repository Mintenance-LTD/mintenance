'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateQuickJob, isFormValid } from './utils/validation';
import { submitJob } from '@/app/jobs/create/utils/submitJob';
import { useCSRF } from '@/lib/hooks/useCSRF';
import Image from 'next/image';
import { logger } from '@mintenance/shared';
import {
  Wrench,
  Droplets,
  Zap,
  PaintBucket,
  Home as HomeIcon,
  AlertCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// Quick repair templates
const REPAIR_TEMPLATES = [
  {
    id: 'leaky-tap',
    icon: Droplets,
    title: 'Leaky Tap/Pipe',
    category: 'plumbing',
    description: 'Fix dripping tap, leaking pipe, or water issue',
    budgetRange: '£50-150',
    budget: '100',
  },
  {
    id: 'electrical-issue',
    icon: Zap,
    title: 'Electrical Issue',
    category: 'electrical',
    description: 'Fix power outlet, switch, or minor electrical problem',
    budgetRange: '£75-200',
    budget: '150',
  },
  {
    id: 'paint-touchup',
    icon: PaintBucket,
    title: 'Painting/Touch-up',
    category: 'painting',
    description: 'Paint room, touch-up walls, or refresh surfaces',
    budgetRange: '£100-300',
    budget: '200',
  },
  {
    id: 'handyman-repair',
    icon: Wrench,
    title: 'General Repair',
    category: 'handyman',
    description: 'Fix door, window, furniture, or general maintenance',
    budgetRange: '£50-200',
    budget: '100',
  },
  {
    id: 'blocked-drain',
    icon: HomeIcon,
    title: 'Blocked Drain',
    category: 'plumbing',
    description: 'Unblock sink, toilet, or drainage issue',
    budgetRange: '£75-150',
    budget: '100',
  },
  {
    id: 'emergency',
    icon: AlertCircle,
    title: 'Emergency Repair',
    category: 'emergency',
    description: 'Urgent fix needed ASAP',
    budgetRange: '£150+',
    budget: '300',
  },
];

const BUDGET_RANGES = [
  { label: 'Under £100', value: '75' },
  { label: '£100-200', value: '150' },
  { label: '£200-350', value: '275' },
  { label: '£350-500', value: '425' },
];

const URGENCY_OPTIONS = [
  { label: 'Today', value: 'today', color: 'red' },
  { label: 'Tomorrow', value: 'tomorrow', color: 'orange' },
  { label: 'This Week', value: 'this_week', color: 'yellow' },
  { label: 'Not Urgent', value: 'not_urgent', color: 'gray' },
];

export default function QuickJobPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primaryProperty, setPrimaryProperty] = useState<{
    id: string;
    property_name?: string;
    address?: string;
    street_address?: string;
    city?: string;
    postcode?: string;
  } | null>(null);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'handyman',
    budget: '100',  // Store as string for form input, convert to number for API
    urgency: 'this_week',
    property_id: '',
  });

  const fetchProperties = React.useCallback(() => {
    if (!user || user.role !== 'homeowner') return;
    setPropertiesLoading(true);
    setPropertiesError(null);
    fetch('/api/properties')
      .then(res => {
        if (res.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch properties: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.properties && data.properties.length > 0) {
          const primary = data.properties[0];
          setPrimaryProperty(primary);
          setFormData(prev => ({ ...prev, property_id: primary.id }));
        } else {
          logger.warn('No properties found for user', { service: 'app' });
        }
      })
      .catch(err => {
        const message = err instanceof Error && err.message === 'RATE_LIMITED'
          ? 'Too many requests. Please wait a moment and try again.'
          : 'Failed to load your properties. Please try again.';
        setPropertiesError(message);
        logger.error('Error fetching properties:', err, { service: 'app' });
        toast.error(message);
      })
      .finally(() => setPropertiesLoading(false));
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'homeowner') {
      fetchProperties();
    } else {
      setPropertiesLoading(false);
    }
  }, [user, fetchProperties]);

  // Redirect if not authorized
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'homeowner')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  const handleTemplateSelect = (template: typeof REPAIR_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      category: template.category,
      budget: template.budget,
    }));
  };

  const handleBudgetSelect = (value: string) => {
    setFormData(prev => ({ ...prev, budget: value }));
  };

  const handleUrgencySelect = (value: string) => {
    setFormData(prev => ({ ...prev, urgency: value }));
  };

  const handleSubmit = async () => {
    // logger.info('=== Quick Job Submission Started ===', { service: 'app' });
    // logger.info('Form data at submission:', formData, { service: 'app' });
    // logger.info('User:', user?.id, user?.email, { service: 'app' });
    // logger.info('CSRF Token available:', !!csrfToken, { service: 'app' });
    // logger.info('Primary Property:', primaryProperty?.id, { service: 'app' });

    // Simple validation for quick jobs
    const errors = validateQuickJob(formData);
    // logger.error('Validation errors:', errors, { service: 'app' });

    if (!isFormValid(errors)) {
      const firstError = Object.values(errors)[0];
      logger.warn('Quick job validation failed', { service: 'app', errors });
      toast.error(firstError);
      return;
    }

    if (!primaryProperty) {
      logger.error('No primary property found', { service: 'app' });
      toast.error('Please add a property first');
      router.push('/properties/add');
      return;
    }

    if (!csrfToken) {
      logger.error('No CSRF token available', { service: 'app' });
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    // logger.info('Starting job submission...', { service: 'app' });
    try {
      // Prepare job data with proper description padding for API validation
      // Note: urgency is stored in description since there's no urgency field in the database
      const urgencyText = formData.urgency === 'today' ? 'URGENT - Needed today!' :
                         formData.urgency === 'tomorrow' ? 'Needed tomorrow.' :
                         formData.urgency === 'this_week' ? 'Needed this week.' : '';

      const baseDescription = formData.description || `Quick repair needed: ${formData.title}.`;
      const fullDescription = urgencyText ? `${urgencyText} ${baseDescription}` : baseDescription;

      // Ensure budget is a valid number
      // logger.info('Budget before conversion:', formData.budget, 'Type:', typeof formData.budget, { service: 'app' });
      const budgetValue = parseFloat(formData.budget);
      // logger.info('Budget after conversion:', budgetValue, 'Type:', typeof budgetValue, { service: 'app' });

      if (isNaN(budgetValue) || budgetValue <= 0) {
        toast.error('Please select a valid budget');
        setIsSubmitting(false);
        return;
      }

      // Build a full location string for accurate geocoding
      // Include postcode and city alongside address for better Google Maps results
      const locationParts = [
        primaryProperty?.address || primaryProperty?.street_address,
        primaryProperty?.city,
        primaryProperty?.postcode,
      ].filter(Boolean);
      const locationString = locationParts.length > 0 ? locationParts.join(', ') : 'Property location';

      const jobData = {
        title: formData.title.trim(),
        // Ensure description meets minimum length for API (50 chars)
        description: fullDescription.trim(),
        location: locationString,
        category: formData.category,
        budget: budgetValue, // Use validated number
        requiredSkills: [],
        property_id: formData.property_id || primaryProperty?.id || undefined,
        // Note: urgency field is not supported in the database schema
        // We've embedded the urgency information in the description instead
      };

      // Make sure description is long enough (minimum 50 characters)
      if (jobData.description.length < 50) {
        jobData.description = jobData.description.padEnd(50, ' ') + ' Additional details will be provided upon contractor arrival.';
      }

      // logger.info('Submitting job data:', jobData, { service: 'app' });
      // logger.info('Budget type:', typeof jobData.budget, 'Budget value:', jobData.budget, { service: 'app' });
      // logger.info('Property ID:', jobData.property_id, { service: 'app' });
      // logger.info('Location:', jobData.location, { service: 'app' });

      // Use the proper submitJob API
      // logger.info('Calling submitJob with:', {
      //   formData: jobData,
      //   csrfToken: csrfToken ? 'present' : 'missing',
      // }, { service: 'app' });

      const submitJobPayload = {
        formData: jobData,
        photoUrls: [], // No photos required for quick jobs under £500
        csrfToken: csrfToken || '',
      };
      // logger.info('Final submitJob payload:', submitJobPayload, { service: 'app' });

      const result = await submitJob(submitJobPayload);

      // logger.info('submitJob result:', result, { service: 'app' });

      // Check if submission was successful
      if (!result.success) {
        logger.error('Job submission failed in quick-create:', {
          error: result.error,
          result: result,
        }, { service: 'app' });
        throw new Error(result.error || 'Failed to post job');
      }

      // Ensure we have a jobId
      if (!result.jobId) {
        throw new Error('Job created but no ID returned');
      }

      toast.success('Job posted successfully!');
      router.push(`/jobs/${result.jobId}`);
    } catch (error) {
      logger.error('=== Error posting quick job ===', { service: 'app' });
      logger.error('Error object:', error, { service: 'app' });
      logger.error('Error message:', error instanceof Error ? error.message : 'Unknown error', { service: 'app' });
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace', { service: 'app' });
      logger.error('Form data at error:', {
        title: formData.title,
        category: formData.category,
        budget: formData.budget,
        budgetType: typeof formData.budget,
        property_id: formData.property_id,
        description: formData.description,
      }, { service: 'app' });
      logger.error('User info:', {
        id: user?.id,
        email: user?.email,
        role: user?.role,
      }, { service: 'app' });
      logger.error('CSRF token status:', csrfToken ? 'present' : 'missing', { service: 'app' });

      const errorMessage = error instanceof Error ? error.message : 'Failed to post job. Please try again.';

      // Check if it's a phone verification error
      if (errorMessage.toLowerCase().includes('phone verification required') || errorMessage.toLowerCase().includes('verify your phone')) {
        toast.error('Phone verification required to post jobs');
        toast.custom((t) => (
          <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span>Redirecting to settings for verification...</span>
          </div>
        ));
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

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="QuickJobPage">
      <HomeownerPageWrapper>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Post a Quick Job</h1>
              <p className="text-gray-600 mt-2">Get your repair fixed fast - select a template or describe your issue</p>
            </div>

            {/* Phone Verification Warning (hidden when SKIP_PHONE_VERIFICATION is enabled) */}
            {user && !user.phone_verified && process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION !== 'true' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">Phone verification required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      To post jobs and hire contractors, please verify your phone number for security.
                    </p>
                    <button
                      onClick={() => router.push('/settings?tab=verification')}
                      className="mt-2 text-sm font-medium text-amber-900 hover:text-amber-800 underline inline-flex items-center gap-1"
                    >
                      Verify phone number
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Property Info */}
            {propertiesLoading && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <p>Loading your property…</p>
                </div>
              </div>
            )}
            {propertiesError && !primaryProperty && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-amber-900">{propertiesError}</p>
                  <button
                    type="button"
                    onClick={fetchProperties}
                    className="shrink-0 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            {primaryProperty && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <HomeIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Property</p>
                    <p className="text-gray-900">{primaryProperty.property_name || 'Your Property'}</p>
                    <p className="text-sm text-gray-600">{primaryProperty.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Templates */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Repairs</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {REPAIR_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${
                        selectedTemplate === template.id ? 'text-teal-600' : 'text-gray-600'
                      }`} />
                      <h3 className="font-semibold text-gray-900 text-sm">{template.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{template.budgetRange}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Describe Your Issue</h2>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What needs fixing?
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Leaking kitchen tap"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    formData.title.length > 0 && formData.title.trim().length < 5
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-gray-300'
                  }`}
                  aria-invalid={formData.title.length > 0 && formData.title.trim().length < 5}
                  aria-describedby={formData.title.length > 0 && formData.title.trim().length < 5 ? 'title-hint' : undefined}
                />
                {formData.title.length > 0 && formData.title.trim().length < 5 && (
                  <p id="title-hint" className="mt-1 text-sm text-amber-700">
                    Use at least 5 characters (e.g. &quot;Leaking kitchen tap&quot;)
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brief description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any helpful details..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Budget Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Budget
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {BUDGET_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => handleBudgetSelect(range.value)}
                      className={`py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.budget === range.value
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When do you need this done?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {URGENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUrgencySelect(option.value)}
                      className={`py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.urgency === option.value
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button - require title with at least 5 chars (matches validation) */}
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.title ||
                  formData.title.trim().length < 5 ||
                  propertiesLoading ||
                  (!primaryProperty && !!propertiesError)
                }
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Posting Job...'
                  : propertiesLoading
                    ? 'Loading property…'
                    : !primaryProperty && propertiesError
                      ? 'Load your property first'
                      : 'Post Job'}
              </button>

              {/* Alternative */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Need more options?{' '}
                  <button
                    onClick={() => router.push('/jobs/create')}
                    className="text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Use detailed form
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </HomeownerPageWrapper>
    </ErrorBoundary>
  );
}