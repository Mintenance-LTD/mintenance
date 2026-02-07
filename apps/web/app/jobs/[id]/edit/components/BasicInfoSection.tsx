'use client';

import { FileText } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface BasicInfoSectionProps {
  title: string;
  category: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  propertyType: string;
  onInputChange: (field: string, value: string | boolean) => void;
}

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

export function BasicInfoSection({
  title,
  category,
  description,
  urgency,
  propertyType,
  onInputChange,
}: BasicInfoSectionProps) {
  return (
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
            value={title}
            onChange={(e) => onInputChange('title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="e.g., Kitchen Renovation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => onInputChange('category', e.target.value)}
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
            value={description}
            onChange={(e) => onInputChange('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            placeholder="Provide a detailed description of the work needed..."
          />
          <p className="text-sm text-gray-500 mt-1">
            {description.length} characters
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
                onClick={() => onInputChange('urgency', level.value)}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  urgency === level.value
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
            value={propertyType}
            onChange={(e) => onInputChange('propertyType', e.target.value)}
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
  );
}
