'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Job | Mintenance',
  description: 'Update your job details, requirements, budget, and photos for your maintenance request.',
};

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Save,
  X,
  Upload,
  MapPin,
  Calendar,
  PoundSterling,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  Plus,
  Brain,
  Building2,
  MapPinned,
  TrendingUp,
  Bookmark,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { SmartJobAnalysis } from '@/app/jobs/create/components/SmartJobAnalysis';
import { getCsrfToken } from '@/lib/csrf-client';
import { formatMoney } from '@/lib/utils/currency';
import { logger } from '@mintenance/shared';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface JobFormData {
  title: string;
  category: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  budget: {
    min: string;
    max: string;
  };
  timeline: {
    startDate: string;
    endDate: string;
    flexible: boolean;
  };
  location: {
    address: string;
    city: string;
    postcode: string;
  };
  propertyType: string;
  accessInfo: string;
  images: string[];
  requirements: string[];
}

interface BuildingSurvey {
  damageAssessment?: {
    damageType?: string;
    severity?: 'early' | 'midway' | 'full';
    costEstimate?: {
      min: number;
      max: number;
    };
  };
  safetyHazards?: Array<{
    description: string;
  }>;
  decisionResult?: {
    fusionMean?: number;
  };
}

interface GeocodeData {
  latitude: number;
  longitude: number;
  formatted_address?: string;
}

export default function JobEditPage2025() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    category: '',
    description: '',
    urgency: 'medium',
    budget: {
      min: '',
      max: '',
    },
    timeline: {
      startDate: '',
      endDate: '',
      flexible: false,
    },
    location: {
      address: '',
      city: '',
      postcode: '',
    },
    propertyType: 'house',
    accessInfo: '',
    images: [],
    requirements: [],
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<unknown>(null);
  const [buildingSurvey, setBuildingSurvey] = useState<BuildingSurvey | null>(null);
  const [geocodeData, setGeocodeData] = useState<GeocodeData | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [runBuildingSurvey, setRunBuildingSurvey] = useState(false);
  const [analyzeWithAI, setAnalyzeWithAI] = useState(true);
  const [savedByContractors, setSavedByContractors] = useState(0);
  const [userRole, setUserRole] = useState<string>('homeowner');
  const [isJobSaved, setIsJobSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch job');
        }

        const data = await response.json();
        const job = data.job;

        // Parse location address
        let addressParts = {
          address: '',
          city: '',
          postcode: '',
        };

        if (job.location?.address) {
          const parts = job.location.address.split(',').map((p: string) => p.trim());
          if (parts.length >= 3) {
            addressParts = {
              address: parts[0],
              city: parts[1],
              postcode: parts[2],
            };
          }
        }

        setFormData({
          title: job.title || '',
          category: job.category || '',
          description: job.description || '',
          urgency: job.urgency || 'medium',
          budget: {
            min: job.budget?.min?.toString() || '',
            max: job.budget?.max?.toString() || '',
          },
          timeline: {
            startDate: job.timeline?.startDate || '',
            endDate: job.timeline?.endDate || '',
            flexible: job.timeline?.flexible || false,
          },
          location: job.location || addressParts,
          propertyType: job.propertyType || 'house',
          accessInfo: job.accessInfo || '',
          images: job.images || [],
          requirements: job.requirements || [],
        });

        if (job.aiAnalysis) {
          setAiAnalysis(job.aiAnalysis.jobAnalysis);
          setBuildingSurvey(job.aiAnalysis.buildingSurvey);
          setShowAIInsights(true);
        }

        if (job.latitude && job.longitude) {
          setGeocodeData({
            latitude: job.latitude,
            longitude: job.longitude,
          });
        }

        // Check if user is a contractor
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setUserRole(sessionData.user?.role || 'homeowner');

          // If contractor, check if they've saved this job
          if (sessionData.user?.role === 'contractor') {
            const savedResponse = await fetch('/api/contractor/saved-jobs');
            if (savedResponse.ok) {
              const savedData = await savedResponse.json();
              setIsJobSaved(savedData.jobIds?.includes(jobId) || false);
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        logger.error('Error fetching job:', error, { service: 'app' });
        toast.error('Failed to load job details');
        router.push('/jobs');
      }
    };

    fetchJobData();
  }, [jobId, router]);

  // Note: No blob URL cleanup needed since we upload to Supabase storage immediately

  const categories = [
    { value: 'kitchen', label: 'Kitchen Renovation' },
    { value: 'bathroom', label: 'Bathroom Remodeling' },
    { value: 'electrical', label: 'Electrical Work' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'painting', label: 'Painting & Decorating' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'landscaping', label: 'Landscaping' },
    { value: 'other', label: 'Other' },
  ];

  const propertyTypes = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'commercial', label: 'Commercial Property' },
    { value: 'office', label: 'Office' },
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-800' },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const parentKey = keys[0] as keyof JobFormData;
        const parentObj = prev[parentKey];
        if (typeof parentObj === 'object' && parentObj !== null && !Array.isArray(parentObj)) {
          return {
            ...prev,
            [parentKey]: {
              ...parentObj,
              [keys[1]]: value,
            },
          };
        }
      }
      return prev;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload each file to Supabase storage
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload image');
        }

        const result = await response.json();
        uploadedUrls.push(result.url);
      }

      // Add uploaded URLs to form data
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));

      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      logger.error('Error uploading images:', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    toast.success('Image removed');
  };

  const handleAddRequirement = () => {
    if (!newRequirement.trim()) return;

    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, newRequirement.trim()],
    }));

    setNewRequirement('');
    toast.success('Requirement added');
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
    toast.success('Requirement removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    if (!formData.location.address || !formData.location.postcode) {
      toast.error('Please enter complete location details');
      return;
    }

    const minBudget = parseFloat(formData.budget.min);
    const maxBudget = parseFloat(formData.budget.max);

    if (isNaN(minBudget) || isNaN(maxBudget) || minBudget <= 0 || maxBudget <= 0) {
      toast.error('Please enter valid budget amounts');
      return;
    }

    if (minBudget > maxBudget) {
      toast.error('Minimum budget cannot be greater than maximum budget');
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.urgency,
          budgetMin: minBudget,
          budgetMax: maxBudget,
          location: formData.location.address,
          city: formData.location.city,
          postcode: formData.location.postcode,
          propertyType: formData.propertyType,
          accessInfo: formData.accessInfo,
          images: formData.images,
          requirements: formData.requirements,
          startDate: formData.timeline.startDate,
          endDate: formData.timeline.endDate,
          flexibleTimeline: formData.timeline.flexible,
          analyzeWithAI,
          runBuildingSurvey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update job');
      }

      const result = await response.json();

      // Update AI analysis results if available
      if (result.aiAnalysis) {
        setAiAnalysis(result.aiAnalysis.jobAnalysis);
        setBuildingSurvey(result.aiAnalysis.buildingSurvey);
        setShowAIInsights(true);
      }

      // Update geocode data if available
      if (result.geocode) {
        setGeocodeData(result.geocode);
      }

      toast.success('Job updated successfully');
      router.push(`/jobs/${jobId}`);
    } catch (error) {
      logger.error('Error updating job:', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveJob = async () => {
    setSavingJob(true);

    try {
      const csrfToken = await getCsrfToken();
      const method = isJobSaved ? 'DELETE' : 'POST';
      const url = isJobSaved
        ? `/api/contractor/saved-jobs?jobId=${jobId}`
        : '/api/contractor/saved-jobs';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: !isJobSaved ? JSON.stringify({ jobId }) : undefined,
      });

      if (response.ok) {
        setIsJobSaved(!isJobSaved);
        toast.success(isJobSaved ? 'Job removed from saved' : 'Job saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save job');
      }
    } catch (error) {
      logger.error('Error saving job:', error, { service: 'app' });
      toast.error('Failed to save job');
    } finally {
      setSavingJob(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!formData.title && !formData.description && formData.images.length === 0) {
      toast.error('Please provide title, description, or images for AI analysis');
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          // Only send minimal data for AI analysis
          title: formData.title,
          description: formData.description,
          category: formData.category,
          images: formData.images,
          location: formData.location.address,
          city: formData.location.city,
          postcode: formData.location.postcode,
          propertyType: formData.propertyType,
          analyzeWithAI: true,
          runBuildingSurvey: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run AI analysis');
      }

      const result = await response.json();

      if (result.aiAnalysis) {
        setAiAnalysis(result.aiAnalysis.jobAnalysis);
        setBuildingSurvey(result.aiAnalysis.buildingSurvey);
        setShowAIInsights(true);
        toast.success('AI analysis complete');
      }

      if (result.geocode) {
        setGeocodeData(result.geocode);
      }
    } catch (error) {
      logger.error('Error running AI analysis:', error, { service: 'app' });
      toast.error('Failed to run AI analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to discard your changes?')) {
      router.back();
    }
  };

  const handleDeleteJob = async () => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken || '',
        },
      });
      const data = response.ok ? null : await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Failed to delete job (${response.status})`);
      }
      toast.success('Job deleted');
      router.push('/dashboard');
    } catch (error) {
      logger.error('Error deleting job', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Job
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {userRole === 'contractor' ? 'View Job' : 'Edit Job'}
              </h1>
              <p className="text-gray-600">
                {userRole === 'contractor'
                  ? 'Review job details and requirements'
                  : 'Update your job details and requirements'}
              </p>
            </div>
            {userRole === 'contractor' && (
              <button
                type="button"
                onClick={handleSaveJob}
                disabled={savingJob}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isJobSaved
                    ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <Bookmark className={`w-5 h-5 ${isJobSaved ? 'fill-current' : ''}`} />
                {savingJob ? 'Saving...' : isJobSaved ? 'Saved' : 'Save Job'}
              </button>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Basic Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Kitchen Renovation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Provide a detailed description of the work needed..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.description.length} characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {urgencyLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => handleInputChange('urgency', level.value)}
                        className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                          formData.urgency === level.value
                            ? 'border-teal-600 ' + level.color
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type *
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </MotionDiv>

            {/* Budget & Timeline */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <PoundSterling className="w-5 h-5 text-teal-600" />
                Budget & Timeline
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Budget (£) *
                    </label>
                    <input
                      type="number"
                      value={formData.budget.min}
                      onChange={(e) => handleInputChange('budget.min', e.target.value)}
                      min="0"
                      step="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Budget (£) *
                    </label>
                    <input
                      type="number"
                      value={formData.budget.max}
                      onChange={(e) => handleInputChange('budget.max', e.target.value)}
                      min="0"
                      step="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.timeline.startDate}
                      onChange={(e) => handleInputChange('timeline.startDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.timeline.endDate}
                      onChange={(e) => handleInputChange('timeline.endDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="flexible"
                    checked={formData.timeline.flexible}
                    onChange={(e) =>
                      handleInputChange('timeline.flexible', e.target.checked)
                    }
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="flexible" className="text-sm text-gray-700">
                    Timeline is flexible
                  </label>
                </div>
              </div>
            </MotionDiv>

            {/* Location */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                Location & Access
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.location.address}
                    onChange={(e) => handleInputChange('location.address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 45 Customer Road"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.location.city}
                      onChange={(e) => handleInputChange('location.city', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="e.g., London"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      value={formData.location.postcode}
                      onChange={(e) => handleInputChange('location.postcode', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="e.g., W1A 1AB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Information
                  </label>
                  <textarea
                    value={formData.accessInfo}
                    onChange={(e) => handleInputChange('accessInfo', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Provide details about accessing the property..."
                  />
                </div>
              </div>
            </MotionDiv>

            {/* Images */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-teal-600" />
                Images
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative">
                        {image ? (
                          <Image
                            src={image}
                            alt={`Job image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Upload</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </label>
                </div>

                {uploadingImages && (
                  <p className="text-sm text-teal-600">Uploading images...</p>
                )}
              </div>
            </MotionDiv>

            {/* Requirements */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-teal-600" />
                Requirements
              </h2>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRequirement())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Add a requirement..."
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {formData.requirements.length > 0 && (
                  <div className="space-y-2">
                    {formData.requirements.map((req, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <span className="text-gray-900">{req}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </MotionDiv>

            {/* AI Analysis Options */}
            <MotionDiv
              variants={fadeIn}
              className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl shadow-lg border border-teal-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-teal-600" />
                    AI Assistant
                  </h2>
                  <p className="text-xs text-teal-600 mt-0.5">Powered by Mint AI</p>
                </div>
                <button
                  type="button"
                  onClick={runAIAnalysis}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Run AI Analysis
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={analyzeWithAI}
                      onChange={(e) => setAnalyzeWithAI(e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Enable AI analysis on save</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={runBuildingSurvey}
                      onChange={(e) => setRunBuildingSurvey(e.target.checked)}
                      disabled={!formData.images.length}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700">Run building damage survey</span>
                  </label>
                </div>

                {/* Smart Job Analysis Integration */}
                {showAIInsights && aiAnalysis ? (
                  <div className="space-y-4">
                    <SmartJobAnalysis
                      title={formData.title}
                      description={formData.description}
                      location={`${formData.location.address}, ${formData.location.city}, ${formData.location.postcode}`}
                      imageUrls={formData.images}
                      onCategorySelect={(cat) => handleInputChange('category', cat)}
                      onBudgetSelect={(budget) => {
                        handleInputChange('budget.min', (budget * 0.8).toString());
                        handleInputChange('budget.max', (budget * 1.2).toString());
                      }}
                      onUrgencySelect={(urgency) => handleInputChange('urgency', urgency)}
                    />
                  </div>
                ) : null}

                {/* Building Survey Results */}
                {buildingSurvey && (
                  <div className="bg-white rounded-lg p-4 border border-teal-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      Building Survey Results
                    </h3>

                    {buildingSurvey.damageAssessment && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Damage Detected:</p>
                          <p className="text-sm text-gray-600">
                            {buildingSurvey.damageAssessment.damageType || 'No significant damage detected'}
                          </p>
                        </div>

                        {buildingSurvey.damageAssessment.severity && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Severity:</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              buildingSurvey.damageAssessment.severity === 'full'
                                ? 'bg-red-100 text-red-800'
                                : buildingSurvey.damageAssessment.severity === 'midway'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {buildingSurvey.damageAssessment.severity}
                            </span>
                          </div>
                        )}

                        {buildingSurvey.damageAssessment.costEstimate && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Estimated Repair Cost:</p>
                            <p className="text-sm text-gray-600">
                              {formatMoney(buildingSurvey.damageAssessment.costEstimate.min)} - {formatMoney(buildingSurvey.damageAssessment.costEstimate.max)}
                            </p>
                          </div>
                        )}

                        {buildingSurvey.safetyHazards && buildingSurvey.safetyHazards.length > 0 ? (
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-red-800 mb-2">Safety Hazards:</p>
                            <ul className="list-disc list-inside text-sm text-red-700">
                              {buildingSurvey.safetyHazards.map((hazard, index: number) => (
                                <li key={index}>{hazard.description}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {buildingSurvey.decisionResult && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Confidence:</span> {Math.round((buildingSurvey.decisionResult.fusionMean || 0) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Geocoding Results */}
                {geocodeData && (
                  <div className="bg-white rounded-lg p-4 border border-teal-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-teal-600" />
                      Location Verified
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Latitude: {geocodeData.latitude.toFixed(6)}</p>
                        <p className="text-sm text-gray-600">Longitude: {geocodeData.longitude.toFixed(6)}</p>
                      </div>
                      {geocodeData.formatted_address && (
                        <div>
                          <p className="text-sm text-gray-600">{geocodeData.formatted_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </MotionDiv>

            {/* Actions */}
            <MotionDiv
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center"
            >
              <div className="flex flex-col sm:flex-row gap-4 order-2 sm:order-1">
                {userRole === 'homeowner' && (
                  <button
                    type="button"
                    onClick={handleDeleteJob}
                    disabled={isSubmitting || isDeleting}
                    className="px-6 py-3 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Delete Job
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </MotionDiv>
          </div>
        </form>
      </div>
    </div>
  );
}
