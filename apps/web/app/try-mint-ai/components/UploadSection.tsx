'use client';

import React, { useCallback, useState } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';
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

  // Declared BEFORE the useCallbacks that reference it so the React
  // Compiler linter (`react-hooks/immutability`) doesn't flag a temporal
  // dead zone read. The closure is identity-stable across renders so
  // handleDrop / handleFileInput stay memoizable on the dependency list.
  const processFiles = useCallback(
    (files: File[]) => {
      // Filter for image files only
      const imageFiles = files.filter(
        (file) =>
          file.type.startsWith('image/') ||
          file.name.match(/\.(jpg|jpeg|png|heic)$/i)
      );

      // Limit to 3 images
      const limitedFiles = imageFiles.slice(0, 3);

      // Validate file sizes (max 10MB each)
      const validFiles = limitedFiles.filter((file) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      // Create previews
      const previews: string[] = [];
      validFiles.forEach((file) => {
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
    },
    [onImagesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      processFiles(files);
    },
    [processFiles]
  );

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    onImagesSelected(newImages);
  };

  return (
    <section
      id='upload-section'
      aria-labelledby='upload-heading'
      className='mb-16'
    >
      <MotionDiv
        variants={fadeIn}
        initial='hidden'
        whileInView='visible'
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className='p-8 sm:p-12'
        style={{
          background: 'var(--me-surface)',
          borderRadius: 'var(--me-radius-card)',
          boxShadow: 'var(--me-shadow-pop)',
          border: '1px solid var(--me-line)',
        }}
      >
        <h2
          id='upload-heading'
          className='text-3xl mb-6 text-center'
          style={{
            color: 'var(--me-ink)',
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          Upload Property Photos
        </h2>

        {/* Drag and drop area */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative p-12 transition-all duration-300 ${
            uploadState === 'analyzing' || uploadState === 'uploading'
              ? 'opacity-50 pointer-events-none'
              : ''
          }`}
          style={{
            border: `2px dashed ${
              isDragging ? 'var(--me-brand)' : 'var(--me-line)'
            }`,
            borderRadius: 'var(--me-radius-card)',
            background: isDragging ? 'var(--me-brand-soft)' : 'var(--me-bg-2)',
          }}
          role='button'
          tabIndex={0}
          aria-label='Upload area for property damage photos. Drag and drop files or click to browse.'
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              document.getElementById('file-input')?.click();
            }
          }}
        >
          <input
            id='file-input'
            type='file'
            accept='image/jpeg,image/png,image/heic,.jpg,.jpeg,.png,.heic'
            multiple
            onChange={handleFileInput}
            className='sr-only'
            aria-describedby='file-requirements'
          />

          <div className='text-center'>
            <Upload
              className='mx-auto h-16 w-16 mb-4'
              style={{
                color: isDragging ? 'var(--me-brand)' : 'var(--me-ink-3)',
              }}
              aria-hidden='true'
            />
            <p
              className='text-lg font-medium mb-2'
              style={{ color: 'var(--me-ink)' }}
            >
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className='mb-4' style={{ color: 'var(--me-ink-2)' }}>
              or
            </p>
            <button
              type='button'
              onClick={() => document.getElementById('file-input')?.click()}
              className='inline-flex items-center gap-2 px-6 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
              style={{
                background: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                borderRadius: 'var(--me-radius-btn)',
              }}
            >
              <ImageIcon className='w-5 h-5' aria-hidden='true' />
              Browse Files
            </button>
          </div>

          <p
            id='file-requirements'
            className='text-sm text-center mt-6'
            style={{ color: 'var(--me-ink-3)' }}
          >
            Upload 1-3 photos • Supports JPG, PNG, HEIC (max 10MB each)
          </p>
        </div>

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className='mt-8'>
            <h3
              className='text-lg font-semibold mb-4'
              style={{ color: 'var(--me-ink)' }}
            >
              Selected Images ({uploadedImages.length}/3)
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              {imagePreviews.map((preview, index) => (
                <div key={index} className='relative group'>
                  <img
                    src={preview}
                    alt={`Preview ${index + 1} of ${imagePreviews.length}`}
                    className='w-full h-48 object-cover'
                    style={{
                      borderRadius: 'var(--me-radius-input)',
                      border: '2px solid var(--me-line)',
                    }}
                  />
                  <button
                    type='button'
                    onClick={() => removeImage(index)}
                    className='absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2'
                    style={{
                      background: 'var(--me-err-fg)',
                      color: 'var(--me-on-brand)',
                    }}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X className='w-4 h-4' aria-hidden='true' />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {(uploadState === 'uploading' || uploadState === 'analyzing') && (
          <div className='mt-8' role='status' aria-live='polite'>
            <div
              className='flex items-center justify-center gap-3'
              style={{ color: 'var(--me-brand-2)' }}
            >
              <Loader2 className='w-6 h-6 animate-spin' aria-hidden='true' />
              <span className='text-lg font-medium'>
                {uploadState === 'uploading'
                  ? 'Uploading images...'
                  : 'Analyzing with AI...'}
              </span>
            </div>
            <div
              className='mt-4 rounded-full h-2 overflow-hidden'
              style={{ background: 'var(--me-bg-3)' }}
            >
              <div
                className='h-full animate-pulse'
                style={{
                  width: uploadState === 'uploading' ? '40%' : '80%',
                  background:
                    'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div
            className='mt-6 p-4'
            style={{
              background: 'var(--me-err-bg)',
              border: '1px solid var(--me-err-fg)',
              borderRadius: 'var(--me-radius-input)',
            }}
            role='alert'
            aria-live='assertive'
          >
            <p className='font-medium' style={{ color: 'var(--me-err-fg)' }}>
              {errorMessage}
            </p>
          </div>
        )}

        {/* Analyze button */}
        {uploadedImages.length > 0 && uploadState === 'idle' && (
          <div className='mt-8 flex justify-center'>
            <button
              type='button'
              onClick={onAnalyze}
              className='inline-flex items-center gap-2 px-8 py-4 font-semibold text-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
              style={{
                background:
                  'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                color: 'var(--me-on-brand)',
                borderRadius: 'var(--me-radius-card)',
                boxShadow: 'var(--me-shadow-pop)',
              }}
            >
              <CheckCircle2 className='w-6 h-6' aria-hidden='true' />
              Analyze with Mint AI
            </button>
          </div>
        )}

        {/* Example images link */}
        <div className='mt-6 text-center'>
          <a
            href='#how-it-works'
            className='font-medium underline focus:outline-none focus:ring-2 rounded'
            style={{ color: 'var(--me-brand)' }}
          >
            See example photos
          </a>
        </div>
      </MotionDiv>
    </section>
  );
}
