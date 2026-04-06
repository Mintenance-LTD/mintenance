import { RefObject } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface UploadModalProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploadCategory: string;
  onUploadCategoryChange: (v: string) => void;
  uploadTags: string;
  onUploadTagsChange: (v: string) => void;
  uploading: boolean;
  onClose: () => void;
  onUpload: (files: FileList | null) => void;
}

export function UploadModal({
  fileInputRef,
  uploadCategory,
  onUploadCategoryChange,
  uploadTags,
  onUploadTagsChange,
  uploading,
  onClose,
  onUpload,
}: UploadModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Upload Document</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => onUploadCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            >
              <option value="contracts">Contracts</option>
              <option value="photos">Photos</option>
              <option value="certifications">Certifications</option>
              <option value="insurance">Insurance</option>
              <option value="receipts">Receipts</option>
              <option value="templates">Templates</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={uploadTags}
              onChange={(e) => onUploadTagsChange(e.target.value)}
              placeholder="e.g. invoice, kitchen, 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>

          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip,.xls,.xlsx"
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            <p className="text-xs text-gray-500 mt-1">Max 20MB per file. PDF, DOC, JPG, PNG, ZIP, XLS accepted.</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpload(fileInputRef.current?.files ?? null)}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </MotionDiv>
    </div>
  );
}
