'use client';

import { useState } from 'react';
import { DBSCheckModal } from '@/components/contractor/DBSCheckModal';
import { PersonalityTestModal } from '@/components/contractor/PersonalityTestModal';
import { ProfileBoostWidget } from '@/components/contractor/ProfileBoostWidget';
import { VerificationBadges } from '@/components/contractor/VerificationBadges';
import { ProfileBoostMeter } from '@/components/contractor/ProfileBoostMeter';

export default function TestVerificationPage() {
  const [showDBSModal, setShowDBSModal] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);

  // Mock verification badges for testing
  const mockBadges = [
    { type: 'dbs' as const, verified: true, level: 'enhanced' as const },
    { type: 'personality' as const, verified: true, score: 85 },
    { type: 'admin' as const, verified: true },
    { type: 'phone' as const, verified: true },
    { type: 'email' as const, verified: true },
    { type: 'portfolio' as const, verified: false },
    { type: 'skills' as const, verified: false },
    { type: 'insurance' as const, verified: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Verification System Test Page
          </h1>
          <p className="text-gray-600">
            Test all verification components and modals
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Component Tests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Modal Triggers */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Modal Tests</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowDBSModal(true)}
                  className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
                >
                  Test DBS Check Modal
                </button>
                <button
                  onClick={() => setShowPersonalityModal(true)}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
                >
                  Test Personality Modal
                </button>
              </div>
            </div>

            {/* Profile Boost Meter Tests */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Profile Boost Meter Tests
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Standard Tier (Score: 35)</h3>
                  <ProfileBoostMeter
                    rankingScore={35}
                    totalBoostPercentage={15}
                    tier="standard"
                    showDetails
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Verified Tier (Score: 55)</h3>
                  <ProfileBoostMeter
                    rankingScore={55}
                    totalBoostPercentage={30}
                    tier="verified"
                    showDetails
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Premium Tier (Score: 72)</h3>
                  <ProfileBoostMeter
                    rankingScore={72}
                    totalBoostPercentage={45}
                    tier="premium"
                    showDetails
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Elite Tier (Score: 92)</h3>
                  <ProfileBoostMeter
                    rankingScore={92}
                    totalBoostPercentage={65}
                    tier="elite"
                    showDetails
                  />
                </div>
              </div>
            </div>

            {/* Verification Badges Tests */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Verification Badges Tests
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Horizontal Layout (Small)</h3>
                  <VerificationBadges badges={mockBadges} size="sm" layout="horizontal" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Grid Layout (Medium)</h3>
                  <VerificationBadges badges={mockBadges} size="md" layout="grid" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Vertical Layout</h3>
                  <VerificationBadges badges={mockBadges} size="md" layout="vertical" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Boost Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Profile Boost Widget (Live)
              </h2>
              <ProfileBoostWidget />
            </div>
          </div>
        </div>

        {/* API Integration Status */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">⚠️ Testing Notes</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>
              <strong>DBS Check Modal:</strong> Will call POST /api/contractor/dbs-check when submitting
            </li>
            <li>
              <strong>Personality Test Modal:</strong> Will call GET /api/contractor/personality-assessment
              for questions and POST to submit answers
            </li>
            <li>
              <strong>Profile Boost Widget:</strong> Will call GET /api/contractor/profile-boost to fetch
              current boost data and recommendations
            </li>
            <li>
              <strong>Expected Behavior:</strong> Modals should show error messages if API endpoints are not
              yet implemented or if user is not authenticated as a contractor
            </li>
          </ul>
        </div>

        {/* Modal Success Callbacks */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">✅ Success Callbacks</h3>
          <p className="text-sm text-blue-800">
            When modals complete successfully, they trigger the onSuccess callback which would
            typically refresh user data. In this test page, they simply close the modal.
          </p>
        </div>
      </div>

      {/* Modals */}
      <DBSCheckModal
        isOpen={showDBSModal}
        onClose={() => setShowDBSModal(false)}
        onSuccess={() => {
          console.log('DBS Check completed successfully!');
          setShowDBSModal(false);
        }}
      />

      <PersonalityTestModal
        isOpen={showPersonalityModal}
        onClose={() => setShowPersonalityModal(false)}
        onSuccess={() => {
          console.log('Personality Test completed successfully!');
          setShowPersonalityModal(false);
        }}
      />
    </div>
  );
}
