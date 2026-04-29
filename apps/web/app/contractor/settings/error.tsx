'use client';

export default function ContractorSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center p-4'>
      <h2 className='mb-2 text-xl font-semibold'>
        Unable to load contractor settings
      </h2>
      <p className='mb-4 text-gray-600'>
        {error.message ||
          'An unexpected error occurred whilst loading your settings.'}
      </p>
      <button
        onClick={reset}
        className='rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700'
      >
        Try again
      </button>
    </div>
  );
}
