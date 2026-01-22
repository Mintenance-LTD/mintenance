'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Lock, Zap, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileBoostMeter } from './ProfileBoostMeter';
import { DBSCheckModal } from './DBSCheckModal';
import { PersonalityTestModal } from './PersonalityTestModal';

interface BoostBreakdown {
  baseTrustScore: number;
  boosts: {
    dbs_check: number;
    personality_assessment: number;
    admin_verified: number;
    phone_verified: number;
    email_verified: number;
    portfolio_completeness: number;
    certifications: number;
    insurance_verified: number;
  };
  totalBoostPercentage: number;
  rankingScore: number;
  tier: string;
}

interface MissingVerification {
  type: string;
  label: string;
  description: string;
  potentialBoost: number;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
}

export function ProfileBoostWidget() {
  const [boostData, setBoostData] = useState<BoostBreakdown | null>(null);
  const [missingVerifications, setMissingVerifications] = useState<MissingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDBSModal, setShowDBSModal] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);

  useEffect(() => {
    fetchBoostData();
  }, []);

  const fetchBoostData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contractor/profile-boost');
      if (!response.ok) throw new Error('Failed to fetch boost data');

      const data = await response.json();
      setBoostData(data.boost);
      setMissingVerifications(data.missingVerifications || []);
    } catch (error) {
      console.error('Error fetching boost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = (type: string) => {
    if (type === 'dbs_check') {
      setShowDBSModal(true);
    } else if (type === 'personality_assessment') {
      setShowPersonalityModal(true);
    } else if (type === 'phone_verified') {
      window.location.href = '/contractor/verification?step=phone';
    } else if (type === 'email_verified') {
      window.location.href = '/contractor/verification?step=email';
    } else if (type === 'portfolio_completeness') {
      window.location.href = '/contractor/portfolio';
    } else if (type === 'certifications') {
      window.location.href = '/contractor/certifications';
    } else if (type === 'insurance_verified') {
      window.location.href = '/contractor/insurance';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'from-red-500 to-orange-500';
      case 'medium':
        return 'from-yellow-500 to-amber-500';
      case 'low':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High Impact';
      case 'medium':
        return 'Medium Impact';
      case 'low':
        return 'Low Impact';
      default:
        return 'Impact';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!boostData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <p className="font-semibold">Unable to load profile boost data</p>
        </div>
      </div>
    );
  }

  const potentialBoost = missingVerifications.reduce((sum, v) => sum + v.potentialBoost, 0);
  const maxPossibleScore = Math.min(100, boostData.rankingScore + potentialBoost);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Profile Ranking</h3>
                <p className="text-sm text-blue-100">Boost your visibility to get more jobs</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{boostData.rankingScore}</p>
              <p className="text-sm text-blue-100">out of 100</p>
            </div>
          </div>
        </div>

        {/* Meter */}
        <div className="px-6 py-4 border-b border-gray-200">
          <ProfileBoostMeter
            rankingScore={boostData.rankingScore}
            totalBoostPercentage={boostData.totalBoostPercentage}
            tier={boostData.tier as 'standard' | 'verified' | 'premium' | 'elite'}
            showDetails
          />
        </div>

        {/* Boost Breakdown */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-bold text-gray-900 mb-3">Active Boosts:</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(boostData.boosts).map(([key, value]) => {
              if (value === 0) return null;

              const labels: Record<string, string> = {
                dbs_check: 'DBS Check',
                personality_assessment: 'Personality',
                admin_verified: 'Admin Verified',
                phone_verified: 'Phone',
                email_verified: 'Email',
                portfolio_completeness: 'Portfolio',
                certifications: 'Certifications',
                insurance_verified: 'Insurance',
              };

              return (
                <div key={key} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
                  <span className="text-sm font-bold text-green-600">+{value}%</span>
                </div>
              );
            })}
          </div>
          {boostData.totalBoostPercentage === 0 && (
            <p className="text-sm text-gray-500 italic">No active boosts yet</p>
          )}
        </div>

        {/* Missing Verifications */}
        {missingVerifications.length > 0 && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900">Unlock More Visibility:</h4>
              {potentialBoost > 0 && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full">
                  Up to +{potentialBoost}% available
                </span>
              )}
            </div>
            <div className="space-y-3">
              {missingVerifications.slice(0, 3).map((verification, idx) => (
                <motion.div
                  key={verification.type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <h5 className="font-semibold text-gray-900">{verification.label}</h5>
                        <span className={`px-2 py-0.5 bg-gradient-to-r ${getPriorityColor(verification.priority)} text-white text-xs font-bold rounded-full`}>
                          {getPriorityLabel(verification.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{verification.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-blue-600">+{verification.potentialBoost}%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVerificationAction(verification.type)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    {verification.actionLabel}
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
            {missingVerifications.length > 3 && (
              <button className="w-full mt-3 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                View All ({missingVerifications.length - 3} more)
              </button>
            )}
          </div>
        )}

        {/* Potential Score */}
        {potentialBoost > 0 && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Potential Score:</p>
                <p className="text-xs text-gray-600">Complete all verifications</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-400">{boostData.rankingScore}</span>
                <span className="text-gray-400">→</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {maxPossibleScore}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fully Maxed Out State */}
        {missingVerifications.length === 0 && boostData.rankingScore >= 95 && (
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">You're at Maximum Visibility! 🎉</p>
                <p className="text-sm text-gray-600">Your profile is fully optimized for job discovery</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DBSCheckModal
        isOpen={showDBSModal}
        onClose={() => setShowDBSModal(false)}
        onSuccess={fetchBoostData}
      />
      <PersonalityTestModal
        isOpen={showPersonalityModal}
        onClose={() => setShowPersonalityModal(false)}
        onSuccess={fetchBoostData}
      />
    </>
  );
}
