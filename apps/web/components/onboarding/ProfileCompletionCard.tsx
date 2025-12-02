'use client';

/**
 * ProfileCompletionCard Component
 * LinkedIn-style profile completion widget with progress tracking
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Confetti from 'react-confetti';
import {
  ProfileCompletionItem,
  calculateProfileCompletion,
  updateProfileCompletion,
} from '@/lib/onboarding/onboarding-state';

interface ProfileCompletionCardProps {
  items: ProfileCompletionItem[];
  userType?: 'homeowner' | 'contractor';
  onItemClick?: (item: ProfileCompletionItem) => void;
  compact?: boolean;
}

export function ProfileCompletionCard({
  items,
  userType = 'homeowner',
  onItemClick,
  compact = false,
}: ProfileCompletionCardProps) {
  const router = useRouter();
  const [completion, setCompletion] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousCompletion, setPreviousCompletion] = useState(0);

  // Calculate completion percentage
  useEffect(() => {
    const percentage = calculateProfileCompletion(items);
    setPreviousCompletion(completion);
    setCompletion(percentage);
    updateProfileCompletion(percentage);

    // Show confetti when reaching 100%
    if (percentage === 100 && previousCompletion < 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [items]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  const handleItemClick = (item: ProfileCompletionItem) => {
    if (item.completed) return;

    if (onItemClick) {
      onItemClick(item);
    } else if (item.action.startsWith('/')) {
      router.push(item.action);
    }
  };

  // Circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (completion / 100) * circumference;

  if (completion === 100 && compact) {
    // Minimal celebration badge when complete in compact mode
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
      >
        <Trophy className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium text-green-700">
          Profile Complete!
        </span>
      </motion.div>
    );
  }

  return (
    <>
      {/* Confetti celebration */}
      {showConfetti && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${
          compact ? 'p-4' : 'p-6'
        }`}
      >
        {/* Header with circular progress */}
        <div className="flex items-start gap-4 mb-6">
          {/* Circular progress indicator */}
          <div className="relative flex-shrink-0">
            <svg className="w-20 h-20 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
                style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}
              />
              {/* Progress circle */}
              <motion.circle
                cx="40"
                cy="40"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className={`${
                  completion === 100
                    ? 'text-green-500'
                    : completion >= 75
                    ? 'text-blue-500'
                    : completion >= 50
                    ? 'text-yellow-500'
                    : 'text-emerald-500'
                }`}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
                strokeLinecap="round"
                style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                key={completion}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-lg font-bold text-gray-900"
              >
                {completion}%
              </motion.span>
            </div>
          </div>

          {/* Title and description */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">
                {completion === 100
                  ? 'Profile Complete!'
                  : 'Complete Your Profile'}
              </h3>
              {completion === 100 && (
                <Sparkles className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              {completion === 100 ? (
                <>
                  Great job! Your profile is fully optimized to attract the best{' '}
                  {userType === 'contractor' ? 'jobs' : 'contractors'}.
                </>
              ) : (
                <>
                  {completedCount} of {totalCount} completed. Complete your profile
                  to stand out and get better matches.
                </>
              )}
            </p>

            {/* Benefit callout */}
            {completion < 100 && !compact && (
              <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">
                  {userType === 'contractor'
                    ? 'Complete profiles get 3x more job opportunities'
                    : 'Complete profiles receive 50% faster responses'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Completion items checklist */}
        {!compact && (
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleItemClick(item)}
                  disabled={item.completed}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    item.completed
                      ? 'bg-gray-50 border-gray-200 cursor-default'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {item.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`flex-1 text-left text-sm font-medium ${
                      item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Arrow for incomplete items */}
                  {!item.completed && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Compact mode: just show remaining count */}
        {compact && completion < 100 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {totalCount - completedCount} item{totalCount - completedCount !== 1 ? 's' : ''} remaining
            </p>
          </div>
        )}

        {/* Completion celebration */}
        <AnimatePresence>
          {completion === 100 && !compact && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-1">
                    Awesome! Your profile is complete
                  </h4>
                  <p className="text-sm text-green-700">
                    You're all set to get the most out of Mintenance. Start exploring!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default ProfileCompletionCard;
