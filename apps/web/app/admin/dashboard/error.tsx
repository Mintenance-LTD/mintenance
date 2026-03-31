'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='min-h-[50vh] flex flex-col items-center justify-center p-8'>
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center'>
        <div className='w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4'>
          <svg
            className='w-6 h-6 text-red-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>
        <h2 className='text-lg font-semibold text-[#2a3439] mb-2'>
          Unable to load dashboard
        </h2>
        <p className='text-sm text-[#566166] mb-6'>
          {error.message ||
            'An unexpected error occurred whilst loading the admin dashboard.'}
        </p>
        <button
          onClick={reset}
          className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-medium text-sm hover:brightness-110 transition-all'
        >
          Try again
        </button>
      </div>
    </div>
  );
}
