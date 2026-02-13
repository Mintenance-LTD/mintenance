'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, MapPin, Upload, X, Image as ImageIcon, Building2, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyFormData {
  name: string;
  propertyType: string;
  address: string;
  city: string;
  postcode: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  images: File[];
}

export default function AddPropertyPage2025() {
  const router = useRouter();

  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    propertyType: 'house',
    address: '',
    city: '',
    postcode: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    images: [],
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const propertyTypes = [
    { value: 'house', label: 'House', icon: <Home className="w-8 h-8" /> },
    { value: 'apartment', label: 'Apartment', icon: <Building2 className="w-8 h-8" /> },
    { value: 'condo', label: 'Condo', icon: <Building className="w-8 h-8" /> },
    { value: 'townhouse', label: 'Townhouse', icon: <Home className="w-8 h-8" /> },
  ];

  const handleInputChange = (field: keyof PropertyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newFiles],
    }));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Property added successfully!');
      router.push('/properties');
    } catch (error) {
      toast.error('Failed to add property');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <button
            onClick={() => router.push('/properties')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Properties</span>
          </button>
          <h1 className="text-3xl font-semibold text-gray-900">Add a property</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Name */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Property name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
              placeholder="My London Home"
              required
            />
          </div>

          {/* Property Type Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Property type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('propertyType', type.value)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.propertyType === type.value
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-2 text-teal-600">{type.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Address
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                placeholder="Street address"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  placeholder="City"
                />
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => handleInputChange('postcode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  placeholder="Postcode"
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Property details
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Bedrooms</label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Bathrooms</label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Square metres</label>
                <input
                  type="number"
                  value={formData.squareFeet}
                  onChange={(e) => handleInputChange('squareFeet', e.target.value)}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-base font-medium text-gray-900 mb-3">
              Add photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-teal-500 transition-colors">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <label className="cursor-pointer">
                  <span className="text-teal-600 font-medium hover:underline">
                    Upload photos
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                    >
                      <X className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
