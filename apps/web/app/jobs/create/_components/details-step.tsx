import React from 'react';
import Image from 'next/image';
import { Droplets, Zap, Flame, Hammer, Paintbrush, Home, Ruler, Sprout, Sparkles, Wrench, Snowflake, Settings } from 'lucide-react';
import { SmartJobAnalysis } from '../components/SmartJobAnalysis';
import { SERVICE_CATEGORIES } from './types';
import type { Property, JobFormData } from './types';

const ICON_MAP: Record<string, React.ReactNode> = {
  droplets: <Droplets size={28} />,
  zap: <Zap size={28} />,
  flame: <Flame size={28} />,
  hammer: <Hammer size={28} />,
  paintbrush: <Paintbrush size={28} />,
  home: <Home size={28} />,
  ruler: <Ruler size={28} />,
  sprout: <Sprout size={28} />,
  sparkles: <Sparkles size={28} />,
  wrench: <Wrench size={28} />,
  snowflake: <Snowflake size={28} />,
  settings: <Settings size={28} />,
};

interface DetailsStepProps {
  formData: JobFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobFormData>>;
  properties: Property[];
  loadingProperties: boolean;
  validationErrors: Record<string, string>;
  uploadedImageUrls: string[];
  onNavigateToAddProperty: () => void;
}

export function DetailsStep({
  formData,
  setFormData,
  properties,
  loadingProperties,
  validationErrors,
  uploadedImageUrls,
  onNavigateToAddProperty,
}: DetailsStepProps) {
  return (
    <div className="space-y-8" data-testid="step-1-details">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">What do you need done?</h1>
        <p className="text-gray-600">Tell us about your project</p>
      </div>

      {/* Property Selection */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3">
          Select your property
        </label>
        <div className="grid grid-cols-1 gap-3">
          {loadingProperties ? (
            <div className="p-4 text-gray-500">Loading properties...</div>
          ) : properties.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center">
              <p className="text-gray-600 mb-3">No properties found</p>
              <button
                onClick={onNavigateToAddProperty}
                className="text-teal-600 font-medium hover:text-teal-700"
              >
                Add a property first
              </button>
            </div>
          ) : (
            properties.map((property) => (
              <button
                key={property.id}
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    property_id: property.id,
                    location: property.address || prev.location,
                  }));
                }}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                  formData.property_id === property.id
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  {property.photos?.[0] ? (
                    <Image
                      src={property.photos[0]}
                      alt={property.property_name || 'Property'}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-property.svg';
                      }}
                    />
                  ) : (
                    <Image
                      src="/placeholder-property.svg"
                      alt="Property placeholder"
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {property.property_name || 'Unnamed Property'}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-1">{property.address}</p>
                </div>
                {formData.property_id === property.id && (
                  <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Service Category */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3">
          What type of service do you need?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SERVICE_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                formData.category === category.value
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="mb-2 text-teal-600">{ICON_MAP[category.icon]}</span>
              <span className="text-sm font-medium text-gray-900 text-center">
                {category.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Job Title */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3">
          Give your job a title
        </label>
        <input
          type="text"
          placeholder="e.g., Fix leaking kitchen sink"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-base"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-1">
          Describe the work needed
        </label>
        <div className={`text-sm mb-2 ${
          formData.description.length < 50
            ? 'text-gray-500'
            : 'text-teal-600 font-medium'
        }`}>
          {formData.description.length < 50 ? (
            <>Minimum 50 characters ({formData.description.length}/50 - {50 - formData.description.length} more needed)</>
          ) : (
            <>&#10003; Description is detailed enough ({formData.description.length}/5000)</>
          )}
        </div>
        <textarea
          rows={5}
          placeholder="Please provide details about what needs to be done..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className={`w-full px-4 py-4 border rounded-xl focus:ring-2 focus:border-transparent resize-none text-base ${
            validationErrors.description
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-teal-600'
          }`}
        />
        {validationErrors.description && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {validationErrors.description}
          </p>
        )}
      </div>

      {/* Smart Job Analysis - AI suggestions based on description */}
      <SmartJobAnalysis
        title={formData.title}
        description={formData.description}
        location={formData.location}
        imageUrls={uploadedImageUrls}
        onCategorySelect={(category) => setFormData(prev => ({ ...prev, category }))}
        onBudgetSelect={(budget) => setFormData(prev => ({ ...prev, budget: budget.toString() }))}
        onUrgencySelect={(urgency) => setFormData(prev => ({ ...prev, urgency }))}
      />
    </div>
  );
}
