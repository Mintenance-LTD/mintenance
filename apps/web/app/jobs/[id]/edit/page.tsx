'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { BasicInfoSection } from './components/BasicInfoSection';
import { BudgetTimelineSection } from './components/BudgetTimelineSection';
import { LocationSection } from './components/LocationSection';
import { ImageUploadSection } from './components/ImageUploadSection';
import { RequirementsSection } from './components/RequirementsSection';
import { AIAnalysisSection } from './components/AIAnalysisSection';
import { FormActions } from './components/FormActions';
import { useJobEditForm } from './useJobEditForm';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function JobEditPage2025() {
  const params = useParams();
  const jobId = params.id as string;

  const {
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
  } = useJobEditForm(jobId);

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-gray-600'>Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50'>
      {/* Header */}
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        className='bg-white border-b border-gray-200'
      >
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
            Back to Job
          </button>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                {userRole === 'contractor' ? 'View Job' : 'Edit Job'}
              </h1>
              <p className='text-gray-600'>
                {userRole === 'contractor'
                  ? 'Review job details and requirements'
                  : 'Update your job details and requirements'}
              </p>
            </div>
            {userRole === 'contractor' && (
              <button
                type='button'
                onClick={handleSaveJob}
                disabled={savingJob}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isJobSaved ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'} disabled:opacity-50`}
              >
                <Bookmark
                  className={`w-5 h-5 ${isJobSaved ? 'fill-current' : ''}`}
                />
                {savingJob ? 'Saving...' : isJobSaved ? 'Saved' : 'Save Job'}
              </button>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Form */}
      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <form onSubmit={handleSubmit}>
          <div className='space-y-6'>
            <BasicInfoSection
              title={formData.title}
              category={formData.category}
              description={formData.description}
              urgency={formData.urgency}
              propertyType={formData.propertyType}
              onInputChange={handleInputChange}
            />
            <BudgetTimelineSection
              budgetMin={formData.budget.min}
              budgetMax={formData.budget.max}
              startDate={formData.timeline.startDate}
              endDate={formData.timeline.endDate}
              flexible={formData.timeline.flexible}
              onInputChange={handleInputChange}
            />
            <LocationSection
              address={formData.location.address}
              city={formData.location.city}
              postcode={formData.location.postcode}
              accessInfo={formData.accessInfo}
              onInputChange={handleInputChange}
            />
            <ImageUploadSection
              images={formData.images}
              uploadingImages={uploadingImages}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
            />
            <RequirementsSection
              requirements={formData.requirements}
              newRequirement={newRequirement}
              onNewRequirementChange={setNewRequirement}
              onAddRequirement={handleAddRequirement}
              onRemoveRequirement={handleRemoveRequirement}
            />
            <AIAnalysisSection
              formTitle={formData.title}
              formDescription={formData.description}
              formLocationString={`${formData.location.address}, ${formData.location.city}, ${formData.location.postcode}`}
              formImages={formData.images}
              analyzeWithAI={analyzeWithAI}
              runBuildingSurvey={runBuildingSurvey}
              showAIInsights={showAIInsights}
              aiAnalysis={aiAnalysis}
              buildingSurvey={buildingSurvey}
              geocodeData={geocodeData}
              isSubmitting={isSubmitting}
              hasImages={formData.images.length > 0}
              onAnalyzeWithAIChange={setAnalyzeWithAI}
              onRunBuildingSurveyChange={setRunBuildingSurvey}
              onRunAIAnalysis={runAIAnalysis}
              onCategorySelect={(cat) => handleInputChange('category', cat)}
              onBudgetSelect={(budget) => {
                handleInputChange('budget.min', (budget * 0.8).toString());
                handleInputChange('budget.max', (budget * 1.2).toString());
              }}
              onUrgencySelect={(urgency) =>
                handleInputChange('urgency', urgency)
              }
            />
            <FormActions
              userRole={userRole}
              isSubmitting={isSubmitting}
              isDeleting={isDeleting}
              onCancel={handleCancel}
              onDeleteJob={handleDeleteJob}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
