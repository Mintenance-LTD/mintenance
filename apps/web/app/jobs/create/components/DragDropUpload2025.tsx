'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence } from 'framer-motion';;
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

interface DragDropUpload2025Props {
  images: string[];
  onImagesChange: (images: File[]) => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
  isAnalyzing?: boolean;
}

export function DragDropUpload2025({
  images,
  onImagesChange,
  onRemoveImage,
  maxImages = 10,
  isAnalyzing = false,
}: DragDropUpload2025Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remainingSlots = maxImages - images.length;
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      onImagesChange(filesToAdd);
    },
    [images.length, maxImages, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: maxImages,
    disabled: images.length >= maxImages || isAnalyzing,
  });

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div {...getRootProps()}>
        <MotionDiv
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            isDragActive && !isDragReject
              ? 'border-teal-600 bg-teal-50'
              : isDragReject
              ? 'border-rose-600 bg-rose-50'
              : images.length >= maxImages
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer'
          }`}
          variants={fadeIn}
          initial="initial"
          animate="animate"
          whileHover={images.length < maxImages && !isAnalyzing ? { scale: 1.01 } : {}}
        >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {/* Upload Icon */}
          <MotionDiv
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDragActive && !isDragReject
                ? 'bg-teal-100'
                : isDragReject
                ? 'bg-rose-100'
                : 'bg-gray-100'
            }`}
            animate={isDragActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isDragActive ? Infinity : 0, duration: 1 }}
          >
            <svg
              className={`w-8 h-8 ${
                isDragActive && !isDragReject
                  ? 'text-teal-600'
                  : isDragReject
                  ? 'text-rose-600'
                  : 'text-gray-500'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </MotionDiv>

          {/* Text */}
          <div>
            {isDragReject ? (
              <p className="text-rose-600 font-medium">Invalid file type</p>
            ) : images.length >= maxImages ? (
              <>
                <p className="text-gray-600 font-medium">Maximum images reached</p>
                <p className="text-sm text-gray-500 mt-1">
                  Remove some images to upload more
                </p>
              </>
            ) : isDragActive ? (
              <p className="text-teal-600 font-medium">Drop images here...</p>
            ) : (
              <>
                <p className="text-gray-900 font-medium">
                  Drag & drop images here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PNG, JPG, JPEG, WEBP up to 10MB each • Max {maxImages} images
                </p>
              </>
            )}
          </div>

          {/* Upload Button */}
          {images.length < maxImages && !isAnalyzing && (
            <MotionButton
              type="button"
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Choose Files
            </MotionButton>
          )}
        </div>
        </MotionDiv>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <MotionDiv
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Uploaded Images ({images.length}/{maxImages})
            </h3>
            {isAnalyzing && (
              <span className="text-sm text-teal-600 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {images.map((image, index) => (
                <MotionDiv
                  key={`${image}-${index}`}
                  variants={staggerItem}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-teal-400 transition-all"
                >
                  <Image
                    src={image}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    loading="lazy"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="text-xs font-medium">Image {index + 1}</p>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <MotionButton
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    disabled={isAnalyzing}
                    className="absolute top-2 right-2 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </MotionButton>
                </MotionDiv>
              ))}
            </AnimatePresence>
          </div>
        </MotionDiv>
      )}

      {/* AI Analysis CTA */}
      {images.length > 0 && !isAnalyzing && (
        <MotionDiv
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="bg-gradient-teal-emerald rounded-xl p-6 text-white"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">AI-Powered Analysis Available</h3>
              <p className="text-teal-50 text-sm">
                Our AI can analyze your photos to suggest job categories, detect issues, and estimate costs automatically.
              </p>
            </div>
          </div>
        </MotionDiv>
      )}
    </div>
  );
}
