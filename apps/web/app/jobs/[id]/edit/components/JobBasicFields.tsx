'use client';
import { FileText } from 'lucide-react';
interface JobBasicFieldsProps {
  title: string;
  category: string;
  description: string;
  urgency: string;
  onFieldChange: (field: string, value: string) => void;
}
export const categories = [
  'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Roofing',
  'Landscaping', 'HVAC', 'Flooring', 'General Maintenance', 'Appliance Repair'
];
export const urgencyLevels = [
  { value: 'low', label: 'Low - Can wait a few weeks', color: 'text-green-600' },
  { value: 'medium', label: 'Medium - Within a week', color: 'text-yellow-600' },
  { value: 'high', label: 'High - Within 2-3 days', color: 'text-orange-600' },
  { value: 'emergency', label: 'Emergency - Within 24 hours', color: 'text-red-600' }
];
export function JobBasicFields({
  title,
  category,
  description,
  urgency,
  onFieldChange,
}: JobBasicFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          <FileText className="inline-block h-4 w-4 mr-2" />
          Job Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onFieldChange('title', e.target.value)}
          placeholder="e.g., Fix leaking kitchen tap"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   placeholder-gray-400"
          maxLength={100}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          {title.length}/100 characters
        </p>
      </div>
      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => onFieldChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   appearance-none bg-white"
          required
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          placeholder="Provide details about the job, what needs to be done, any specific requirements..."
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   placeholder-gray-400 resize-none"
          maxLength={1000}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          {description.length}/1000 characters
        </p>
      </div>
      {/* Urgency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgency Level *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {urgencyLevels.map((level) => (
            <label
              key={level.value}
              className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer
                       hover:bg-gray-50 transition-colors ${
                         urgency === level.value
                           ? 'border-indigo-500 bg-indigo-50'
                           : 'border-gray-200'
                       }`}
            >
              <input
                type="radio"
                name="urgency"
                value={level.value}
                checked={urgency === level.value}
                onChange={(e) => onFieldChange('urgency', e.target.value)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-3 ${
                    urgency === level.value
                      ? 'bg-indigo-600 ring-2 ring-white ring-offset-2 ring-offset-indigo-50'
                      : 'bg-white border-2 border-gray-300'
                  }`}
                />
                <span className={`text-sm ${level.color} font-medium`}>
                  {level.label}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}