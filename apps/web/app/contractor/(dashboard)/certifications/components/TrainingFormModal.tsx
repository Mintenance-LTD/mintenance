'use client';

import { Loader2, X } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Category {
  value: string;
  label: string;
}

interface TrainingFormModalProps {
  open: boolean;
  tFormCourseName: string;
  setTFormCourseName: (value: string) => void;
  tFormProvider: string;
  setTFormProvider: (value: string) => void;
  tFormCompletionDate: string;
  setTFormCompletionDate: (value: string) => void;
  tFormHours: string;
  setTFormHours: (value: string) => void;
  tFormCategory: string;
  setTFormCategory: (value: string) => void;
  tFormSkills: string;
  setTFormSkills: (value: string) => void;
  categories: Category[];
  editingTrainingId: string | null;
  submittingTraining: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function TrainingFormModal({
  open,
  tFormCourseName,
  setTFormCourseName,
  tFormProvider,
  setTFormProvider,
  tFormCompletionDate,
  setTFormCompletionDate,
  tFormHours,
  setTFormHours,
  tFormCategory,
  setTFormCategory,
  tFormSkills,
  setTFormSkills,
  categories,
  editingTrainingId,
  submittingTraining,
  onClose,
  onSubmit,
}: TrainingFormModalProps) {
  if (!open) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className='bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto'
      >
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-xl font-bold text-gray-900'>
            {editingTrainingId ? 'Edit Training Record' : 'Add Training Record'}
          </h3>
          <button
            onClick={onClose}
            className='p-1 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Course Name *
            </label>
            <input
              type='text'
              value={tFormCourseName}
              onChange={(e) => setTFormCourseName(e.target.value)}
              placeholder='e.g. Advanced Kitchen Installation'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Provider *
            </label>
            <input
              type='text'
              value={tFormProvider}
              onChange={(e) => setTFormProvider(e.target.value)}
              placeholder='e.g. BMF Training'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Completion Date *
              </label>
              <input
                type='date'
                value={tFormCompletionDate}
                onChange={(e) => setTFormCompletionDate(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Hours
              </label>
              <input
                type='number'
                min='0'
                value={tFormHours}
                onChange={(e) => setTFormHours(e.target.value)}
                placeholder='0'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Category
            </label>
            <select
              value={tFormCategory}
              onChange={(e) => setTFormCategory(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            >
              {categories
                .filter((c) => c.value !== 'all')
                .map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Skills (comma-separated)
            </label>
            <input
              type='text'
              value={tFormSkills}
              onChange={(e) => setTFormSkills(e.target.value)}
              placeholder='e.g. Cabinet Installation, Design Principles'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            />
          </div>
        </div>

        <div className='flex gap-3 mt-6'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submittingTraining}
            className='flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {submittingTraining && <Loader2 className='w-4 h-4 animate-spin' />}
            {editingTrainingId ? 'Save Changes' : 'Add Training'}
          </button>
        </div>
      </MotionDiv>
    </div>
  );
}
