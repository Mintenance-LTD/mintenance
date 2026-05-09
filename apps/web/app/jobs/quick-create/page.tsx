'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { logger } from '@mintenance/shared';

import { REPAIR_TEMPLATES, type RepairTemplate } from './templates';
import { submitQuickJob } from './utils/submitQuickJob';
import { PhoneVerificationBanner } from './components/PhoneVerificationBanner';
import { PropertyInfo, type PrimaryProperty } from './components/PropertyInfo';
import { RepairTemplatesGrid } from './components/RepairTemplatesGrid';
import { QuickJobForm, type QuickJobFormData } from './components/QuickJobForm';

/**
 * Quick-job posting flow. Refactored 2026-05-09 (AUDIT_PUNCH_LIST P2
 * #41) — was 684 lines. Page now owns just state + property fetch +
 * the Submit handler that wires the form to `submitQuickJob`. Each
 * UI section lives in `./components/`, the data tables in
 * `./templates.ts`, the submission pipeline in
 * `./utils/submitQuickJob.ts`.
 */
export default function QuickJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primaryProperty, setPrimaryProperty] =
    useState<PrimaryProperty | null>(null);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  // Read pre-fill params from AirbnbSearchBar (WHERE/WHEN/WHAT)
  const paramCategory = searchParams.get('category');
  const paramUrgency = searchParams.get('urgency');
  const paramPropertyId = searchParams.get('property_id');

  const matchingTemplate = paramCategory
    ? REPAIR_TEMPLATES.find((t) => t.category === paramCategory)
    : null;

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    matchingTemplate?.id || null
  );

  const [formData, setFormData] = useState<QuickJobFormData>({
    title: matchingTemplate?.title || '',
    description: matchingTemplate?.description || '',
    category: paramCategory || 'handyman',
    budget: matchingTemplate?.budget || '100',
    urgency: paramUrgency || 'this_week',
    property_id: paramPropertyId || '',
  });

  const fetchProperties = useCallback(() => {
    if (!user || user.role !== 'homeowner') return;
    setPropertiesLoading(true);
    setPropertiesError(null);
    fetch('/api/properties')
      .then((res) => {
        if (res.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch properties: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.properties && data.properties.length > 0) {
          const primary = data.properties[0];
          setPrimaryProperty(primary);
          setFormData((prev) => ({ ...prev, property_id: primary.id }));
        } else {
          logger.warn('No properties found for user', { service: 'app' });
        }
      })
      .catch((err) => {
        const message =
          err instanceof Error && err.message === 'RATE_LIMITED'
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

  // Server-side gate already lives in `apps/web/app/jobs/quick-create/layout.tsx`
  // (added 2026-05-09 for AUDIT_PUNCH_LIST P1 #13). This client-side
  // redirect is belt-and-braces for hydration edge cases.
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'homeowner')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  const handleTemplateSelect = (template: RepairTemplate) => {
    setSelectedTemplate(template.id);
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      category: template.category,
      budget: template.budget,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await submitQuickJob({
      formData,
      primaryProperty,
      csrfToken,
    });

    if (result.ok) {
      toast.success('Job posted successfully!');
      router.push(`/jobs/${result.jobId}`);
      // intentionally leave isSubmitting=true to prevent double-submit during nav
      return;
    }

    setIsSubmitting(false);

    if (result.code === 'NO_PROPERTY') {
      toast.error(result.message);
      router.push('/properties/add');
      return;
    }

    if (result.code === 'PHONE_VERIFICATION_REQUIRED') {
      toast.error('Phone verification required to post jobs');
      toast.custom(() => (
        <div className='flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200'>
          <AlertCircle className='w-5 h-5 text-blue-600' />
          <span>Redirecting to settings for verification...</span>
        </div>
      ));
      setTimeout(() => {
        router.push('/settings?tab=verification');
      }, 2000);
      return;
    }

    toast.error(result.message);
  };

  if (loadingUser) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600' />
      </div>
    );
  }

  return (
    <ErrorBoundary componentName='QuickJobPage'>
      <HomeownerPageWrapper>
        <div className='min-h-screen bg-gray-50 py-8'>
          <div className='max-w-4xl mx-auto px-4'>
            {/* Header */}
            <div className='mb-8'>
              <button
                onClick={() => router.back()}
                className='inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4'
              >
                <ArrowLeft className='w-4 h-4' />
                Back
              </button>
              <h1 className='text-3xl font-bold text-gray-900'>
                Post a Quick Job
              </h1>
              <p className='text-gray-600 mt-2'>
                Get your repair fixed fast - select a template or describe your
                issue
              </p>
            </div>

            <PhoneVerificationBanner phoneVerified={user?.phone_verified} />

            <PropertyInfo
              primaryProperty={primaryProperty}
              propertiesLoading={propertiesLoading}
              propertiesError={propertiesError}
              onRetry={fetchProperties}
            />

            <RepairTemplatesGrid
              selectedTemplateId={selectedTemplate}
              onSelect={handleTemplateSelect}
            />

            <QuickJobForm
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              propertiesLoading={propertiesLoading}
              primaryPropertyMissing={!primaryProperty}
              hasPropertiesError={!!propertiesError}
              onSubmit={handleSubmit}
              onUseDetailedForm={() => router.push('/jobs/create')}
            />
          </div>
        </div>
      </HomeownerPageWrapper>
    </ErrorBoundary>
  );
}
