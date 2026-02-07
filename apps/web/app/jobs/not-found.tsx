import Link from 'next/link';

export default function JobNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Job Not Found</h1>
        <p className="mt-3 text-gray-600">
          This job may have been removed or the link is incorrect.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/jobs"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Browse Jobs
          </Link>
          <Link
            href="/jobs/create"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Post a Job
          </Link>
        </div>
      </div>
    </div>
  );
}
