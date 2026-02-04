'use client';

import { useState, useCallback } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, Loader2, Home, Wrench, Clock, PoundSterling } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface Assessment {
  issue_type?: string;
  confidence?: number;
  severity?: 'critical' | 'major' | 'moderate' | 'minor';
  contractor_type?: string;
  estimated_cost?: {
    min: number;
    max: number;
  };
  estimated_hours?: number;
  materials_needed?: string[];
  tools_required?: string[];
  safety_notes?: string[];
}

export default function MaintenanceAIPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('normal');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
      setAssessment(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleSubmit = async () => {
    if (!imageFile) {
      setError('Please select an image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('description', description);
      formData.append('urgency', urgency);

      const response = await fetch('/api/maintenance/detect', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setAssessment(result.assessment);
      } else {
        setError(result.error || 'Detection failed');
      }
    } catch (err) {
      setError('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createJob = () => {
    if (assessment) {
      // Navigate to job creation with AI assessment
      window.location.href = `/jobs/create?ai_assessment=${encodeURIComponent(JSON.stringify(assessment))}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Maintenance Detection</h1>
          <p className="mt-2 text-gray-600">
            Upload a photo of your maintenance issue and our AI will instantly identify the problem and recommend the right contractor
          </p>
        </div>

        {/* Upload Section */}
        {!assessment && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input {...getInputProps()} />

              {selectedImage ? (
                <div className="space-y-4">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="mx-auto max-h-64 rounded-lg"
                  />
                  <p className="text-sm text-gray-600">Click or drag to change image</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop the image here' : 'Upload a photo of the issue'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Drag and drop or click to select • JPG, PNG up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {selectedImage && (
              <>
                {/* Description */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe the issue (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="e.g., Water has been leaking for 2 days..."
                  />
                </div>

                {/* Urgency */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How urgent is this?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['normal', 'urgent', 'emergency'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setUrgency(level)}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          urgency === level
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analyze Button */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </button>
              </>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Assessment Results */}
        {assessment && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">AI Analysis Complete!</p>
                <p className="text-sm text-green-700 mt-1">
                  We've identified the issue and can help you find the right contractor
                </p>
              </div>
            </div>

            {/* Main Assessment Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">Detected Issue</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Issue Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Issue Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {assessment.issue_type?.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confidence</p>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${assessment.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{assessment.confidence}%</span>
                    </div>
                  </div>
                </div>

                {/* Severity Badge */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Severity Level</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium
                    ${assessment.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      assessment.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                      assessment.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'}`}>
                    {assessment.severity?.toUpperCase()}
                  </span>
                </div>

                {/* Contractor Recommendation */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Wrench className="w-5 h-5 text-blue-600 mr-2" />
                    <p className="font-medium text-blue-900">Recommended Contractor</p>
                  </div>
                  <p className="text-blue-700 capitalize">
                    {assessment.contractor_type?.replace('_', ' ')}
                  </p>
                </div>

                {/* Estimates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <PoundSterling className="w-4 h-4 text-gray-600 mr-1" />
                      <p className="text-sm text-gray-600">Estimated Cost</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      £{assessment.estimated_cost?.min} - £{assessment.estimated_cost?.max}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Clock className="w-4 h-4 text-gray-600 mr-1" />
                      <p className="text-sm text-gray-600">Time Required</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {assessment.estimated_hours} hours
                    </p>
                  </div>
                </div>

                {/* Materials & Tools */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Materials Needed</p>
                    <div className="flex flex-wrap gap-2">
                      {assessment.materials_needed?.map((material: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Tools Required</p>
                    <div className="flex flex-wrap gap-2">
                      {assessment.tools_required?.map((tool: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Safety Notes */}
                {assessment.safety_notes && assessment.safety_notes.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="font-medium text-yellow-900 mb-2">Safety Notes</p>
                    <ul className="space-y-1">
                      {assessment.safety_notes.map((note: string, idx: number) => (
                        <li key={idx} className="text-sm text-yellow-700">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={createJob}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Create Job & Find Contractors
                  </button>
                  <button
                    onClick={() => {
                      setAssessment(null);
                      setSelectedImage(null);
                      setImageFile(null);
                      setDescription('');
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Analyze Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}