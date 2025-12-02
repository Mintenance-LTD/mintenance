'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Home,
  MapPin,
  DollarSign,
  Calendar,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface PropertyFormData {
  name: string;
  propertyType: string;
  address: {
    street: string;
    city: string;
    postcode: string;
    country: string;
  };
  details: {
    bedrooms: string;
    bathrooms: string;
    squareFeet: string;
    yearBuilt: string;
  };
  ownership: {
    purchaseDate: string;
    purchasePrice: string;
    currentValue: string;
  };
  notes: string;
  images: string[];
}

export default function AddPropertyPage2025() {
  const router = useRouter();

  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    propertyType: 'house',
    address: {
      street: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
    },
    details: {
      bedrooms: '',
      bathrooms: '',
      squareFeet: '',
      yearBuilt: '',
    },
    ownership: {
      purchaseDate: '',
      purchasePrice: '',
      currentValue: '',
    },
    notes: '',
    images: [],
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const propertyTypes = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'commercial', label: 'Commercial Property' },
    { value: 'land', label: 'Land' },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const parentKey = keys[0] as keyof PropertyFormData;
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

    const newImages = Array.from(files).map((file) => `/uploads/${file.name}`);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a property name');
      return;
    }

    if (!formData.address.street || !formData.address.postcode) {
      toast.error('Please enter complete address details');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.success('Property added successfully!');
    router.push('/properties');
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
            Back to Properties
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Property</h1>
            <p className="text-gray-600">Add a new property to your portfolio</p>
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
                <Home className="w-5 h-5 text-teal-600" />
                Basic Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., My London Home"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Give your property a memorable name
                  </p>
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

            {/* Address */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                Address
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
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
                      value={formData.address.postcode}
                      onChange={(e) => handleInputChange('address.postcode', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="e.g., SW1A 1AA"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </MotionDiv>

            {/* Property Details */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Property Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    value={formData.details.bedrooms}
                    onChange={(e) => handleInputChange('details.bedrooms', e.target.value)}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    value={formData.details.bathrooms}
                    onChange={(e) => handleInputChange('details.bathrooms', e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Feet
                  </label>
                  <input
                    type="number"
                    value={formData.details.squareFeet}
                    onChange={(e) => handleInputChange('details.squareFeet', e.target.value)}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Built
                  </label>
                  <input
                    type="number"
                    value={formData.details.yearBuilt}
                    onChange={(e) => handleInputChange('details.yearBuilt', e.target.value)}
                    min="1800"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 1995"
                  />
                </div>
              </div>
            </MotionDiv>

            {/* Ownership Information */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" />
                Ownership Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.ownership.purchaseDate}
                    onChange={(e) =>
                      handleInputChange('ownership.purchaseDate', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price (£)
                    </label>
                    <input
                      type="number"
                      value={formData.ownership.purchasePrice}
                      onChange={(e) =>
                        handleInputChange('ownership.purchasePrice', e.target.value)
                      }
                      min="0"
                      step="1000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="e.g., 350000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Estimated Value (£)
                    </label>
                    <input
                      type="number"
                      value={formData.ownership.currentValue}
                      onChange={(e) =>
                        handleInputChange('ownership.currentValue', e.target.value)
                      }
                      min="0"
                      step="1000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="e.g., 385000"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      This information is kept private and helps you track your property's value
                      over time.
                    </p>
                  </div>
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
                Property Images
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

            {/* Notes */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Additional Notes
              </h2>

              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                placeholder="Add any additional information about the property..."
              />
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
                    Add Property
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
