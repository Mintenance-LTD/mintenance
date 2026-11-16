'use client';

import { X, Loader2 } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Category {
  value: string;
  label: string;
}

interface ExpenseFormModalProps {
  editing?: boolean;
  jobId: string;
  jobs: Array<{ id: string; title: string; homeowner_name?: string }>;
  onJobIdChange: (id: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  description: string;
  onDescriptionChange: (v: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (v: string) => void;
  tags: string;
  onTagsChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isBillable: boolean;
  onIsBillableChange: (v: boolean) => void;
  categories: Category[];
  paymentMethods: string[];
}

export function ExpenseFormModal({
  editing = false,
  jobId,
  jobs,
  onJobIdChange,
  onClose,
  onSubmit,
  submitting,
  description,
  onDescriptionChange,
  amount,
  onAmountChange,
  date,
  onDateChange,
  category,
  onCategoryChange,
  paymentMethod,
  onPaymentMethodChange,
  tags,
  onTagsChange,
  notes,
  onNotesChange,
  isBillable,
  onIsBillableChange,
  categories,
  paymentMethods,
}: ExpenseFormModalProps) {
  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={editing ? 'Edit expense' : 'Add expense'}
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className='bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto'
      >
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-xl font-bold text-gray-900'>
            {editing ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label='Close expense editor'
            className='p-1 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label
              htmlFor='expense-description'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Description *
            </label>
            <input
              type='text'
              id='expense-description'
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder='e.g. Electrical supplies'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            />
          </div>

          <div>
            <label
              htmlFor='expense-job'
              className='block text-sm font-medium mb-2'
            >
              Linked job / client (optional)
            </label>
            <select
              id='expense-job'
              value={jobId}
              onChange={(event) => onJobIdChange(event.target.value)}
              className='w-full border rounded-lg p-3'
            >
              <option value=''>General business expense</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                  {job.homeowner_name ? ' — ' + job.homeowner_name : ''}
                </option>
              ))}
            </select>
            <p className='text-sm text-gray-500'>
              Billable is a bookkeeping flag; it does not charge the customer or
              add this expense to an invoice.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='expense-amount'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Amount (GBP) *
              </label>
              <input
                type='number'
                step='0.01'
                min='0.01'
                id='expense-amount'
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder='0.00'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              />
            </div>
            <div>
              <label
                htmlFor='expense-date'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Date *
              </label>
              <input
                type='date'
                id='expense-date'
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='expense-category'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Category
              </label>
              <select
                id='expense-category'
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
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
              <label
                htmlFor='expense-paymentMethod'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Payment Method
              </label>
              <select
                id='expense-paymentMethod'
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor='expense-tags'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Tags (comma-separated)
            </label>
            <input
              type='text'
              id='expense-tags'
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
              placeholder='e.g. electrical, supplies'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            />
          </div>

          <div>
            <label
              htmlFor='expense-notes'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Notes
            </label>
            <textarea
              id='expense-notes'
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder='Optional notes...'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            />
          </div>

          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={isBillable}
              onChange={(e) => onIsBillableChange(e.target.checked)}
              className='w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500'
            />
            <span className='text-sm text-gray-700'>Billable expense</span>
          </label>
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
            disabled={submitting}
            className='flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {submitting && <Loader2 className='w-4 h-4 animate-spin' />}
            {editing ? 'Save changes' : 'Add Expense'}
          </button>
        </div>
      </MotionDiv>
    </div>
  );
}
