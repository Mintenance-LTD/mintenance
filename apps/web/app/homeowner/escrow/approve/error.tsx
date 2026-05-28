'use client';

export default function HomeownerEscrowApproveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center p-4 text-center'>
      <h2 className='mb-2 text-xl font-semibold'>
        Unable to load this approval
      </h2>
      <p className='mb-4 max-w-md text-gray-600'>
        {error.message ||
          'Something went wrong whilst loading the work for your review. Your payment is still safely held in escrow.'}
      </p>
      <button
        onClick={reset}
        className='rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700'
      >
        Try again
      </button>
    </div>
  );
}
