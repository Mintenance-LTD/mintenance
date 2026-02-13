'use client';

import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type DBSCheckLevel = 'basic' | 'standard' | 'enhanced';
type DBSProvider = 'dbs_online' | 'gbgroup' | 'ucheck';

interface DBSCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DBS_OPTIONS = {
  basic: {
    price: 23,
    boost: 10,
    title: 'Basic DBS Check',
    description: 'Unspent convictions and conditional cautions',
    color: 'blue',
    recommended: false,
    features: [
      'Basic criminal record check',
      'Covers unspent convictions',
      '3-year validity',
      '+10% profile boost',
    ],
  },
  standard: {
    price: 26,
    boost: 15,
    title: 'Standard DBS Check',
    description: 'Spent and unspent convictions, cautions, reprimands',
    color: 'indigo',
    recommended: false,
    features: [
      'Comprehensive criminal record check',
      'Spent and unspent convictions',
      'Cautions and warnings included',
      '3-year validity',
      '+15% profile boost',
    ],
  },
  enhanced: {
    price: 50,
    boost: 25,
    title: 'Enhanced DBS Check',
    description: 'Most thorough check including local police records',
    color: 'purple',
    recommended: true,
    features: [
      'Full criminal record check',
      'Local police information',
      'Highest trust level',
      '3-year validity',
      '+25% profile boost',
      'Preferred by 78% of homeowners',
    ],
  },
};

export function DBSCheckModal({ isOpen, onClose, onSuccess }: DBSCheckModalProps) {
  const [step, setStep] = useState<'selection' | 'confirmation' | 'processing' | 'success'>('selection');
  const [selectedLevel, setSelectedLevel] = useState<DBSCheckLevel>('enhanced');
  const [selectedProvider, setSelectedProvider] = useState<DBSProvider>('dbs_online');
  const [loading, setLoading] = useState(false);

  const handleInitiate = async () => {
    setLoading(true);
    setStep('processing');

    try {
      const response = await fetch('/api/contractor/dbs-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbsType: selectedLevel,
          provider: selectedProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate DBS check');
      }

      setStep('success');
      toast.success('DBS check initiated successfully!');

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate DBS check');
      setStep('selection');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep('selection');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">DBS Check</h2>
                    <p className="text-sm text-gray-600">Boost your profile visibility up to +25%</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {step === 'selection' && (
                  <>
                    {/* Info Banner */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Why get a DBS check?</p>
                        <p>DBS (Disclosure and Barring Service) checks help homeowners trust you more. Verified contractors get 3x more job views and higher acceptance rates.</p>
                      </div>
                    </div>

                    {/* DBS Level Options */}
                    <div className="space-y-4 mb-6">
                      {(Object.entries(DBS_OPTIONS) as [DBSCheckLevel, typeof DBS_OPTIONS.basic][]).map(([level, option]) => (
                        <div
                          key={level}
                          onClick={() => setSelectedLevel(level)}
                          className={`
                            relative p-6 border-2 rounded-xl cursor-pointer transition-all
                            ${selectedLevel === level
                              ? `border-${option.color}-500 bg-${option.color}-50`
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          {option.recommended && (
                            <div className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                              MOST POPULAR
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedLevel === level
                                  ? `border-${option.color}-500 bg-${option.color}-500`
                                  : 'border-gray-300'
                              }`}>
                                {selectedLevel === level && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">{option.title}</h3>
                                <p className="text-sm text-gray-600">{option.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">£{option.price}</p>
                              <p className={`text-sm font-semibold text-${option.color}-600`}>
                                +{option.boost}% boost
                              </p>
                            </div>
                          </div>

                          <ul className="space-y-2">
                            {option.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle className={`w-4 h-4 text-${option.color}-600 flex-shrink-0`} />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Provider Selection (Advanced) */}
                    <details className="mb-6">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                        Advanced: Choose Provider
                      </summary>
                      <div className="mt-3 space-y-2">
                        {['dbs_online', 'gbgroup', 'ucheck'].map((provider) => (
                          <label key={provider} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="provider"
                              value={provider}
                              checked={selectedProvider === provider as DBSProvider}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedProvider(e.target.value as DBSProvider)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {provider === 'dbs_online' ? 'DBS Online (Recommended)' :
                               provider === 'gbgroup' ? 'GB Group' : 'uCheck'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Maybe Later
                      </button>
                      <button
                        onClick={() => setStep('confirmation')}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                      >
                        Continue (£{DBS_OPTIONS[selectedLevel].price})
                      </button>
                    </div>
                  </>
                )}

                {step === 'confirmation' && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Shield className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Confirm Your DBS Check</h3>
                    <div className="max-w-md mx-auto mb-8 space-y-3 text-left">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Check Level:</span>
                        <span className="font-semibold text-gray-900">{DBS_OPTIONS[selectedLevel].title}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Cost:</span>
                        <span className="font-semibold text-gray-900">£{DBS_OPTIONS[selectedLevel].price}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">Profile Boost:</span>
                        <span className="font-semibold text-green-600">+{DBS_OPTIONS[selectedLevel].boost}%</span>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                      <p className="text-sm text-yellow-900">
                        <strong>Note:</strong> You'll be redirected to our secure provider to complete payment and identity verification. This typically takes 5-10 minutes. Results are usually available within 1-2 business days.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('selection')}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleInitiate}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm & Continue
                      </button>
                    </div>
                  </div>
                )}

                {step === 'processing' && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <Shield className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h3>
                    <p className="text-gray-600">Setting up your DBS check</p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">DBS Check Initiated!</h3>
                    <p className="text-gray-600 mb-6">
                      Check your email for next steps from {selectedProvider.replace('_', ' ').toUpperCase()}
                    </p>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-900">
                        Once verified, your profile will automatically receive a <strong>+{DBS_OPTIONS[selectedLevel].boost}% boost</strong>!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
