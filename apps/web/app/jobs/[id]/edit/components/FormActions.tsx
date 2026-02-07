'use client';

import { Save, Trash2 } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface FormActionsProps {
  userRole: string;
  isSubmitting: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onDeleteJob: () => void;
}

export function FormActions({
  userRole,
  isSubmitting,
  isDeleting,
  onCancel,
  onDeleteJob,
}: FormActionsProps) {
  return (
    <MotionDiv
      variants={fadeIn}
      className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center"
    >
      <div className="flex flex-col sm:flex-row gap-4 order-2 sm:order-1">
        {userRole === 'homeowner' && (
          <button
            type="button"
            onClick={onDeleteJob}
            disabled={isSubmitting || isDeleting}
            className="px-6 py-3 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Delete Job
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Changes
          </>
        )}
      </button>
    </MotionDiv>
  );
}
