import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { useConfirm } from '@/components/ui/confirm-dialog';

export interface JobFormData {
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

export interface BuildingSurvey {
  damageAssessment?: {
    damageType?: string;
    severity?: 'early' | 'midway' | 'full';
    costEstimate?: { min: number; max: number };
  };
  safetyHazards?: Array<{ description: string }>;
  decisionResult?: {
    fusionMean?: number;
  };
}

export interface GeocodeData {
  latitude: number;
  longitude: number;
  formatted_address?: string;
}

export function useJobEditForm(jobId: string) {
  const router = useRouter();
  const confirm = useConfirm();

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
  const [buildingSurvey, setBuildingSurvey] = useState<BuildingSurvey | null>(
    null
  );
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

        // Audit follow-up (2026-04-29): the edit form used to read
        // only the legacy nested shape (`job.budget.min`,
        // `job.timeline.startDate`, `job.location.address`,
        // `job.images`). The newer canonical GET /api/jobs/[id]
        // returns flat snake_case fields (`budget_min`, `start_date`,
        // `flexible_timeline`, `photoUrls`, `location` as a string,
        // city/postcode at the top level). Without these fallbacks
        // the form would open with blank budget/timeline/photo
        // fields even when the job had data on every column.
        let addressParts = { address: '', city: '', postcode: '' };
        const locationString =
          typeof job.location === 'string'
            ? job.location
            : (job.location?.address ?? '');
        if (locationString) {
          const parts = locationString.split(',').map((p: string) => p.trim());
          if (parts.length >= 3) {
            addressParts = {
              address: parts[0],
              city: parts[1],
              postcode: parts[2],
            };
          } else {
            addressParts = {
              address: locationString,
              city: job.city ?? '',
              postcode: job.postcode ?? '',
            };
          }
        }

        const budgetMinValue = job.budget?.min ?? job.budget_min ?? '';
        const budgetMaxValue = job.budget?.max ?? job.budget_max ?? '';

        setFormData({
          title: job.title || '',
          category: job.category || '',
          description: job.description || '',
          urgency: job.urgency || 'medium',
          budget: {
            min: budgetMinValue !== '' ? String(budgetMinValue) : '',
            max: budgetMaxValue !== '' ? String(budgetMaxValue) : '',
          },
          timeline: {
            startDate: job.timeline?.startDate ?? job.start_date ?? '',
            endDate: job.timeline?.endDate ?? job.end_date ?? '',
            flexible: job.timeline?.flexible ?? job.flexible_timeline ?? false,
          },
          location:
            typeof job.location === 'object' && job.location !== null
              ? job.location
              : addressParts,
          propertyType: job.propertyType || 'house',
          accessInfo: job.accessInfo ?? job.access_info ?? '',
          // Coalesce every shape the API has emitted: `photoUrls`
          // (canonical create/update + new GET), `photos` (some
          // legacy responses), `images` (legacy edit-form shape).
          images: job.photoUrls ?? job.photos ?? job.images ?? [],
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
        if (
          typeof parentObj === 'object' &&
          parentObj !== null &&
          !Array.isArray(parentObj)
        ) {
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
        const csrfToken = await getCsrfToken();
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-csrf-token': csrfToken },
          body: formData,
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload image');
        }
        const result = await response.json();
        uploadedUrls.push(result.url);
      }
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      logger.error('Error uploading images:', error, { service: 'app' });
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload images'
      );
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
    if (
      isNaN(minBudget) ||
      isNaN(maxBudget) ||
      minBudget <= 0 ||
      maxBudget <= 0
    ) {
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
      if (result.aiAnalysis) {
        setAiAnalysis(result.aiAnalysis.jobAnalysis);
        setBuildingSurvey(result.aiAnalysis.buildingSurvey);
        setShowAIInsights(true);
      }
      if (result.geocode) {
        setGeocodeData(result.geocode);
      }
      toast.success('Job updated successfully');
      router.push(`/jobs/${jobId}`);
    } catch (error) {
      logger.error('Error updating job:', error, { service: 'app' });
      toast.error(
        error instanceof Error ? error.message : 'Failed to update job'
      );
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
        toast.success(
          isJobSaved ? 'Job removed from saved' : 'Job saved successfully'
        );
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
    if (
      !formData.title &&
      !formData.description &&
      formData.images.length === 0
    ) {
      toast.error(
        'Please provide title, description, or images for AI analysis'
      );
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
      if (!response.ok) throw new Error('Failed to run AI analysis');
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

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Discard your changes?',
      confirmText: 'Discard',
      destructive: true,
    });
    if (ok) router.back();
  };

  const handleDeleteJob = async () => {
    const ok = await confirm({
      title: 'Delete this job?',
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken || '' },
      });
      const data = response.ok ? null : await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data?.error ||
            data?.message ||
            `Failed to delete job (${response.status})`
        );
      toast.success('Job deleted');
      router.push('/dashboard');
    } catch (error) {
      logger.error('Error deleting job', error, { service: 'app' });
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete job'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    router,
    formData,
    newRequirement,
    setNewRequirement,
    isSubmitting,
    uploadingImages,
    isLoading,
    aiAnalysis,
    buildingSurvey,
    geocodeData,
    showAIInsights,
    runBuildingSurvey,
    setRunBuildingSurvey,
    analyzeWithAI,
    setAnalyzeWithAI,
    userRole,
    isJobSaved,
    savingJob,
    isDeleting,
    handleInputChange,
    handleImageUpload,
    handleRemoveImage,
    handleAddRequirement,
    handleRemoveRequirement,
    handleSubmit,
    handleSaveJob,
    runAIAnalysis,
    handleCancel,
    handleDeleteJob,
  };
}
