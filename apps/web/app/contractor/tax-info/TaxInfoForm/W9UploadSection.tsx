import React from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { FormErrors } from './types';
import { fadeIn } from './types';

interface Props {
  w9File: File | null;
  errors: FormErrors;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: () => void;
  fieldError: (field: keyof FormErrors) => React.ReactNode;
}

export function W9UploadSection({
  w9File,
  errors,
  fileInputRef,
  handleFileChange,
  removeFile,
  fieldError,
}: Props) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-2">W-9 Document Upload</h2>
      <p className="text-sm text-gray-600 mb-4">
        Optionally upload a signed W-9 PDF. Accepted formats: PDF, JPG, PNG (max 10 MB).
      </p>

      {w9File ? (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          <FileText className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{w9File.name}</p>
            <p className="text-xs text-gray-500">{(w9File.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label={`Remove file ${w9File.name}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            id="w9Upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            aria-describedby={errors.w9File ? 'w9File-error' : undefined}
          />
          <label
            htmlFor="w9Upload"
            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors"
          >
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Click to upload W-9 document</span>
          </label>
        </div>
      )}
      {fieldError('w9File')}
    </MotionDiv>
  );
}
