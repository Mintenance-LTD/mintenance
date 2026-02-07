'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfToken } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { BasicInfoSection } from './components/BasicInfoSection';
import { BudgetTimelineSection } from './components/BudgetTimelineSection';
import { LocationSection } from './components/LocationSection';
import { ImageUploadSection } from './components/ImageUploadSection';
import { RequirementsSection } from './components/RequirementsSection';
import { AIAnalysisSection } from './components/AIAnalysisSection';
import { FormActions } from './components/FormActions';

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
    budget: { min: '', max: '' },
    timeline: { startDate: '', endDate: '', flexible: false },
    location: { address: '', city: '', postcode: '' },
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
  const [userRole, setUserRole] = useState<string>('homeowner');
  const [isJobSaved, setIsJobSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch job');

        const data = await response.json();
        const job = data.job;

        let addressParts = { address: '', city: '', postcode: '' };
        if (job.location?.address) {
          const parts = job.location.address.split(',').map((p: string) => p.trim());
          if (parts.length >= 3) {
            addressParts = { address: parts[0], city: parts[1], postcode: parts[2] };
          }
        }

        setFormData({
          title: job.title || '',
          category: job.category || '',
          description: job.description || '',
          urgency: job.urgency || 'medium',
          budget: { min: job.budget?.min?.toString() || '', max: job.budget?.max?.toString() || '' },
          timeline: { startDate: job.timeline?.startDate || '', endDate: job.timeline?.endDate || '', flexible: job.timeline?.flexible || false },
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
          setGeocodeData({ latitude: job.latitude, longitude: job.longitude });
        }

        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setUserRole(sessionData.user?.role || 'homeowner');
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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const parentKey = keys[0] as keyof JobFormData;
        const parentObj = prev[parentKey];
        if (typeof parentObj === 'object' && parentObj !== null && !Array.isArray(parentObj)) {
          return { ...prev, [parentKey]: { ...parentObj, [keys[1]]: value } };
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
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload image');
        }
        const result = await response.json();
        uploadedUrls.push(result.url);
      }
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      logger.error('Error uploading images:', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    toast.success('Image removed');
  };

  const handleAddRequirement = () => {
    if (!newRequirement.trim()) return;
    setFormData((prev) => ({ ...prev, requirements: [...prev.requirements, newRequirement.trim()] }));
    setNewRequirement('');
    toast.success('Requirement added');
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData((prev) => ({ ...prev, requirements: prev.requirements.filter((_, i) => i !== index) }));
    toast.success('Requirement removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Please enter a job title'); return; }
    if (!formData.description.trim()) { toast.error('Please enter a job description'); return; }
    if (!formData.location.address || !formData.location.postcode) { toast.error('Please enter complete location details'); return; }
    const minBudget = parseFloat(formData.budget.min);
    const maxBudget = parseFloat(formData.budget.max);
    if (isNaN(minBudget) || isNaN(maxBudget) || minBudget <= 0 || maxBudget <= 0) { toast.error('Please enter valid budget amounts'); return; }
    if (minBudget > maxBudget) { toast.error('Minimum budget cannot be greater than maximum budget'); return; }

    setIsSubmitting(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
        body: JSON.stringify({
          title: formData.title.trim(), description: formData.description.trim(), category: formData.category,
          priority: formData.urgency, budgetMin: minBudget, budgetMax: maxBudget,
          location: formData.location.address, city: formData.location.city, postcode: formData.location.postcode,
          propertyType: formData.propertyType, accessInfo: formData.accessInfo,
          images: formData.images, requirements: formData.requirements,
          startDate: formData.timeline.startDate, endDate: formData.timeline.endDate,
          flexibleTimeline: formData.timeline.flexible, analyzeWithAI, runBuildingSurvey,
        }),
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to update job'); }
      const result = await response.json();
      if (result.aiAnalysis) { setAiAnalysis(result.aiAnalysis.jobAnalysis); setBuildingSurvey(result.aiAnalysis.buildingSurvey); setShowAIInsights(true); }
      if (result.geocode) { setGeocodeData(result.geocode); }
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
      const url = isJobSaved ? `/api/contractor/saved-jobs?jobId=${jobId}` : '/api/contractor/saved-jobs';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
        body: !isJobSaved ? JSON.stringify({ jobId }) : undefined,
      });
      if (response.ok) { setIsJobSaved(!isJobSaved); toast.success(isJobSaved ? 'Job removed from saved' : 'Job saved successfully'); }
      else { const error = await response.json(); toast.error(error.error || 'Failed to save job'); }
    } catch (error) {
      logger.error('Error saving job:', error, { service: 'app' });
      toast.error('Failed to save job');
    } finally {
      setSavingJob(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!formData.title && !formData.description && formData.images.length === 0) { toast.error('Please provide title, description, or images for AI analysis'); return; }
    setIsSubmitting(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
        body: JSON.stringify({
          title: formData.title, description: formData.description, category: formData.category,
          images: formData.images, location: formData.location.address, city: formData.location.city,
          postcode: formData.location.postcode, propertyType: formData.propertyType,
          analyzeWithAI: true, runBuildingSurvey: true,
        }),
      });
      if (!response.ok) throw new Error('Failed to run AI analysis');
      const result = await response.json();
      if (result.aiAnalysis) { setAiAnalysis(result.aiAnalysis.jobAnalysis); setBuildingSurvey(result.aiAnalysis.buildingSurvey); setShowAIInsights(true); toast.success('AI analysis complete'); }
      if (result.geocode) { setGeocodeData(result.geocode); }
    } catch (error) {
      logger.error('Error running AI analysis:', error, { service: 'app' });
      toast.error('Failed to run AI analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => { if (confirm('Are you sure you want to discard your changes?')) router.back(); };

  const handleDeleteJob = async () => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken || '' } });
      const data = response.ok ? null : await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || data?.message || `Failed to delete job (${response.status})`);
      toast.success('Job deleted');
      router.push('/dashboard');
    } catch (error) {
      logger.error('Error deleting job', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

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
      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Job
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {userRole === 'contractor' ? 'View Job' : 'Edit Job'}
              </h1>
              <p className="text-gray-600">
                {userRole === 'contractor' ? 'Review job details and requirements' : 'Update your job details and requirements'}
              </p>
            </div>
            {userRole === 'contractor' && (
              <button type="button" onClick={handleSaveJob} disabled={savingJob}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isJobSaved ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'} disabled:opacity-50`}>
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
            <BasicInfoSection
              title={formData.title} category={formData.category} description={formData.description}
              urgency={formData.urgency} propertyType={formData.propertyType} onInputChange={handleInputChange}
            />
            <BudgetTimelineSection
              budgetMin={formData.budget.min} budgetMax={formData.budget.max}
              startDate={formData.timeline.startDate} endDate={formData.timeline.endDate}
              flexible={formData.timeline.flexible} onInputChange={handleInputChange}
            />
            <LocationSection
              address={formData.location.address} city={formData.location.city}
              postcode={formData.location.postcode} accessInfo={formData.accessInfo}
              onInputChange={handleInputChange}
            />
            <ImageUploadSection
              images={formData.images} uploadingImages={uploadingImages}
              onImageUpload={handleImageUpload} onRemoveImage={handleRemoveImage}
            />
            <RequirementsSection
              requirements={formData.requirements} newRequirement={newRequirement}
              onNewRequirementChange={setNewRequirement} onAddRequirement={handleAddRequirement}
              onRemoveRequirement={handleRemoveRequirement}
            />
            <AIAnalysisSection
              formTitle={formData.title} formDescription={formData.description}
              formLocationString={`${formData.location.address}, ${formData.location.city}, ${formData.location.postcode}`}
              formImages={formData.images} analyzeWithAI={analyzeWithAI} runBuildingSurvey={runBuildingSurvey}
              showAIInsights={showAIInsights} aiAnalysis={aiAnalysis} buildingSurvey={buildingSurvey}
              geocodeData={geocodeData} isSubmitting={isSubmitting} hasImages={formData.images.length > 0}
              onAnalyzeWithAIChange={setAnalyzeWithAI} onRunBuildingSurveyChange={setRunBuildingSurvey}
              onRunAIAnalysis={runAIAnalysis}
              onCategorySelect={(cat) => handleInputChange('category', cat)}
              onBudgetSelect={(budget) => { handleInputChange('budget.min', (budget * 0.8).toString()); handleInputChange('budget.max', (budget * 1.2).toString()); }}
              onUrgencySelect={(urgency) => handleInputChange('urgency', urgency)}
            />
            <FormActions
              userRole={userRole} isSubmitting={isSubmitting} isDeleting={isDeleting}
              onCancel={handleCancel} onDeleteJob={handleDeleteJob}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
