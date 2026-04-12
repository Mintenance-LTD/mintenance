'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto flex items-center justify-center'>
      <div className='text-center space-y-4'>
        <h2 className='text-2xl font-bold text-[#2a3439]'>
          Something went wrong
        </h2>
        <p className='text-[#566166]'>{error.message}</p>
        <button
          onClick={reset}
          className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-medium text-sm'
        >
          Try again
        </button>
      </div>
    </div>
  );
}
