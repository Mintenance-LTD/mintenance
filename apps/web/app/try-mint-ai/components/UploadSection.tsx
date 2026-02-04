'use client';

import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { UploadState } from './TryMintAIClient';

interface UploadSectionProps {
  uploadState: UploadState;
  uploadedImages: File[];
  onImagesSelected: (files: File[]) => void;
  onAnalyze: () => void;
  errorMessage: string;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function UploadSection({
  uploadState,
  uploadedImages,
  onImagesSelected,
  onAnalyze,
  errorMessage,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  }, []);

  const processFiles = (files: File[]) => {
    // Filter for image files only
    const imageFiles = files.filter(file =>
      file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|heic)$/i)
    );

    // Limit to 3 images
    const limitedFiles = imageFiles.slice(0, 3);

    // Validate file sizes (max 10MB each)
    const validFiles = limitedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create previews
    const previews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target?.result as string);
        if (previews.length === validFiles.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    onImagesSelected(validFiles);
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    onImagesSelected(newImages);
  };

  return (
    <section
      id="upload-section"
      aria-labelledby="upload-heading"
      className="mb-16"
    >
      <MotionDiv
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-xl p-8 sm:p-12"
      >
        <h2 id="upload-heading" className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Upload Property Photos
        </h2>

        {/* Drag and drop area */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
            ${isDragging
              ? 'border-teal-600 bg-teal-50'
              : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-gray-100'
            }
            ${uploadState === 'analyzing' || uploadState === 'uploading' ? 'opacity-50 pointer-events-none' : ''}
          `}
          role="button"
          tabIndex={0}
          aria-label="Upload area for property damage photos. Drag and drop files or click to browse."
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              document.getElementById('file-input')?.click();
            }
          }}
        >
          <input
            id="file-input"
            type="file"
            accept="image/jpeg,image/png,image/heic,.jpg,.jpeg,.png,.heic"
            multiple
            onChange={handleFileInput}
            className="sr-only"
            aria-describedby="file-requirements"
          />

          <div className="text-center">
            <Upload
              className={`mx-auto h-16 w-16 mb-4 ${isDragging ? 'text-teal-600' : 'text-gray-400'}`}
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-gray-600 mb-4">or</p>
            <button
              type="button"
              onClick={() => document.getElementById('file-input')?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              <ImageIcon className="w-5 h-5" aria-hidden="true" />
              Browse Files
            </button>
          </div>

          <p id="file-requirements" className="text-sm text-gray-500 text-center mt-6">
            Upload 1-3 photos • Supports JPG, PNG, HEIC (max 10MB each)
          </p>
        </div>

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Images ({uploadedImages.length}/3)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1} of ${imagePreviews.length}`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {(uploadState === 'uploading' || uploadState === 'analyzing') && (
          <div className="mt-8" role="status" aria-live="polite">
            <div className="flex items-center justify-center gap-3 text-teal-700">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              <span className="text-lg font-medium">
                {uploadState === 'uploading' ? 'Uploading images...' : 'Analyzing with AI...'}
              </span>
            </div>
            <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 animate-pulse"
                style={{ width: uploadState === 'uploading' ? '40%' : '80%' }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-red-800 font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Analyze button */}
        {uploadedImages.length > 0 && uploadState === 'idle' && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onAnalyze}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              Analyze with Mint AI
            </button>
          </div>
        )}

        {/* Example images link */}
        <div className="mt-6 text-center">
          <a
            href="#how-it-works"
            className="text-teal-600 hover:text-teal-700 font-medium underline focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
          >
            See example photos
          </a>
        </div>
      </MotionDiv>
    </section>
  );
}
