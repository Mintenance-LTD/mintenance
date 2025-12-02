'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  X,
  Upload,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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

export default function JobEditPage2025() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [formData, setFormData] = useState<JobFormData>({
    title: 'Kitchen Renovation',
    category: 'kitchen',
    description: 'Complete kitchen renovation including new cabinets, countertops, and appliances. Looking for a professional contractor with experience in modern kitchen designs.',
    urgency: 'medium',
    budget: {
      min: '10000',
      max: '15000',
    },
    timeline: {
      startDate: '2025-02-15',
      endDate: '2025-03-15',
      flexible: true,
    },
    location: {
      address: '45 Customer Road',
      city: 'London',
      postcode: 'W1A 1AB',
    },
    propertyType: 'house',
    accessInfo: 'Access available Monday-Friday 9am-5pm. Please ring doorbell.',
    images: [
      '/uploads/kitchen1.jpg',
      '/uploads/kitchen2.jpg',
      '/uploads/kitchen3.jpg',
    ],
    requirements: [
      'Gas Safe certified',
      'Public liability insurance',
      'Previous kitchen renovation experience',
    ],
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

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
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newImages = Array.from(files).map(
      (file) => `/uploads/${file.name}`
    );

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));

    setUploadingImages(false);
    toast.success(`${files.length} image(s) uploaded`);
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

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.success('Job updated successfully');
    router.push(`/jobs/${jobId}`);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to discard your changes?')) {
      router.back();
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Job</h1>
              <p className="text-gray-600">Update your job details and requirements</p>
            </div>
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
                <DollarSign className="w-5 h-5 text-teal-600" />
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
                      <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
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

            {/* Actions */}
            <MotionDiv
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-4 justify-end"
            >
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
