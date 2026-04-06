'use client';

import Image from 'next/image';

/**
 * App Preview Section — shows real screenshots of the platform
 * in device mockup frames to build credibility and excitement.
 *
 * Used on: landing page (between hero and stats)
 */
export function AppPreviewSection() {
  return (
    <section className="relative py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">
            See It in Action
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            One Platform, Two Powerful Apps
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Homeowners post jobs and track progress. Contractors find work and manage their business. Both get paid securely.
          </p>
        </div>

        {/* Desktop + mobile showcase */}
        <div className="relative max-w-5xl mx-auto">
          {/* Desktop frame — AI Assessment (most impressive feature) */}
          <div className="relative bg-gray-900 rounded-2xl p-2 shadow-2xl mx-8">
            <div className="flex items-center gap-1.5 px-4 py-2.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 h-5 bg-gray-700 rounded-md" />
            </div>
            <div className="rounded-xl overflow-hidden">
              <Image
                src="/screenshots/homeowner/ai-assessment.png"
                alt="AI Building Assessment — damage detection, cost estimate, materials list, and insurance risk score"
                width={1200}
                height={650}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>

          {/* Floating mobile — homeowner dashboard (left) */}
          <div className="absolute -bottom-8 -left-4 w-40 sm:w-48 rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-[-4deg] hidden md:block z-10">
            <Image
              src="/screenshots/mobile/homeowner-dashboard.png"
              alt="Homeowner mobile app — active projects, bids received"
              width={240}
              height={520}
              className="w-full h-auto"
            />
          </div>

          {/* Floating mobile — contractor dashboard (right) */}
          <div className="absolute -bottom-8 -right-4 w-40 sm:w-48 rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-[4deg] hidden md:block z-10">
            <Image
              src="/screenshots/mobile/contractor-dashboard.png"
              alt="Contractor mobile app — portfolio stats, earnings, quick actions"
              width={240}
              height={520}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between max-w-5xl mx-auto mt-16 px-8">
          <div className="text-center hidden md:block">
            <p className="text-sm font-semibold text-gray-900">Homeowner App</p>
            <p className="text-xs text-gray-500">Post jobs &middot; Track progress</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-gray-900">AI-Powered Assessment</p>
            <p className="text-xs text-gray-500">Upload a photo &middot; Get instant analysis</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="text-sm font-semibold text-gray-900">Contractor App</p>
            <p className="text-xs text-gray-500">Find work &middot; Get paid</p>
          </div>
        </div>
      </div>
    </section>
  );
}
