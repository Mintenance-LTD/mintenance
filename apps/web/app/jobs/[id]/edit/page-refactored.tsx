'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { logger } from '@mintenance/shared';
import { getCsrfToken } from '@/lib/csrf-client';
// Refactored components
import { useJobForm } from './hooks/useJobForm';
import { ImageUploadManager } from './components/ImageUploadManager';
import { RequirementsManager } from './components/RequirementsManager';
import { JobMetadata } from './components/JobMetadata';
import { JobBasicFields } from './components/JobBasicFields';
import { AIAnalysisService, AIAnalysisResult, BuildingSurveyResult } from './services/aiAnalysisService';
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
/**
 * Refactored JobEditPage - Reduced from 1,118 lines to ~350 lines
 * Follows SOLID principles with separated concerns
 */
export default function JobEditPageRefactored() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  // Use custom hook for form state management
  const {
    formData,
    updateField,
    updateImages,
    removeImage,
    updateRequirements,
    setFormData,
  } = useJobForm();
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedByContractors, setSavedByContractors] = useState(0);
  const [userRole, setUserRole] = useState<string>('homeowner');
  const [isJobSaved, setIsJobSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  // AI/Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [buildingSurvey, setBuildingSurvey] = useState<BuildingSurveyResult | null>(null);
  const [geocodeData, setGeocodeData] = useState<{ verified?: boolean; formattedAddress?: string; coordinates?: { lat: number; lng: number }; confidence?: number } | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const aiService = AIAnalysisService.getInstance();
  // Load existing job data
  useEffect(() => {
    async function loadJob() {
      try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to load job');
        }
        const job = await response.json();
        // Map job data to form data
        setFormData({
          title: job.title || '',
          category: job.category || '',
          description: job.description || '',
          urgency: job.urgency || 'medium',
          budget: {
            min: job.budget_min?.toString() || '',
            max: job.budget_max?.toString() || '',
          },
          timeline: {
            startDate: job.timeline_start || '',
            endDate: job.timeline_end || '',
            flexible: job.timeline_flexible || false,
          },
          location: {
            address: job.address || '',
            city: job.city || '',
            postcode: job.postcode || '',
          },
          propertyType: job.property_type || 'house',
          accessInfo: job.access_info || '',
          images: job.images || [],
          requirements: job.requirements || [],
        });
        setSavedByContractors(job.saved_by_count || 0);
        setUserRole(job.user_role || 'homeowner');
        logger.info('Job loaded successfully', { jobId });
      } catch (error) {
        logger.error('Failed to load job', { error, jobId });
        toast.error('Failed to load job details');
        router.push('/jobs');
      } finally {
        setIsLoading(false);
      }
    }
    loadJob();
  }, [jobId, router, setFormData]);
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate form data
      const validation = await aiService.validateJobData(formData);
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        setIsSubmitting(false);
        return;
      }
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => toast(warning, { icon: '!' }));
      }
      // Prepare submission data
      const submitData = {
        ...formData,
        budget_min: parseFloat(formData.budget.min) || null,
        budget_max: parseFloat(formData.budget.max) || null,
        timeline_start: formData.timeline.startDate || null,
        timeline_end: formData.timeline.endDate || null,
        timeline_flexible: formData.timeline.flexible,
        property_type: formData.propertyType,
        access_info: formData.accessInfo,
        address: formData.location.address,
        city: formData.location.city,
        postcode: formData.location.postcode,
      };
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(submitData),
      });
      if (!response.ok) {
        throw new Error('Failed to update job');
      }
      toast.success('Job updated successfully!');
      router.push(`/jobs/${jobId}`);
    } catch (error) {
      logger.error('Failed to update job', { error, jobId });
      toast.error('Failed to update job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  // Handle job saving (for contractors)
  const handleSaveJob = async () => {
    setSavingJob(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}/save`, {
        method: isJobSaved ? 'DELETE' : 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to save job');
      }
      setIsJobSaved(!isJobSaved);
      setSavedByContractors(prev => isJobSaved ? prev - 1 : prev + 1);
      toast.success(isJobSaved ? 'Job removed from saved' : 'Job saved successfully');
    } catch (error) {
      logger.error('Failed to save job', { error, jobId });
      toast.error('Failed to save job');
    } finally {
      setSavingJob(false);
    }
  };
  // Run AI analysis
  const runAIAnalysis = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Please provide title and description first');
      return;
    }
    setShowAIInsights(true);
    const result = await aiService.analyzeJob({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      urgency: formData.urgency,
      images: formData.images,
    });
    if (result) {
      setAiAnalysis(result);
      // Auto-fill budget if suggested
      if (result.suggestedPrice && !formData.budget.min) {
        updateField('budget.min', result.suggestedPrice.min.toString());
        updateField('budget.max', result.suggestedPrice.max.toString());
        toast.success('Budget updated based on AI analysis');
      }
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-8"
        >
          <button
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Job Details
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Edit Job
          </h1>
        </MotionDiv>
        {/* Job Metadata */}
        <JobMetadata
          savedByContractors={savedByContractors}
          isJobSaved={isJobSaved}
          savingJob={savingJob}
          userRole={userRole}
          aiAnalysis={aiAnalysis}
          buildingSurvey={buildingSurvey}
          geocodeData={geocodeData}
          onSaveJob={handleSaveJob}
        />
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Fields */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-semibold mb-6">Job Details</h2>
            <JobBasicFields
              title={formData.title}
              category={formData.category}
              description={formData.description}
              urgency={formData.urgency}
              onFieldChange={updateField}
            />
          </MotionDiv>
          {/* Images */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <ImageUploadManager
              images={formData.images}
              onImagesChange={updateImages}
            />
          </MotionDiv>
          {/* Requirements */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <RequirementsManager
              requirements={formData.requirements}
              onRequirementsChange={updateRequirements}
            />
          </MotionDiv>
          {/* Submit Buttons */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="flex justify-between"
          >
            <button
              type="button"
              onClick={() => router.push(`/jobs/${jobId}`)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg
                       hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600
                       text-white rounded-lg hover:bg-indigo-700
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Update Job</span>
                </>
              )}
            </button>
          </MotionDiv>
        </form>
      </div>
    </div>
  );
}