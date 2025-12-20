'use client';

import React, { useState, useEffect } from 'react';
import { X, Brain, CheckCircle, ArrowLeft, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface PersonalityQuestion {
  id: string;
  text: string;
  trait: string;
  category: string;
  reverse_scored: boolean;
}

interface PersonalityResult {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  jobRecommendations: string[];
  profileBoost: number;
}

interface PersonalityTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SCALE_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

const TRAIT_INFO = {
  openness: {
    label: 'Openness',
    description: 'Creativity and willingness to try new approaches',
    color: 'purple',
  },
  conscientiousness: {
    label: 'Conscientiousness',
    description: 'Organization, reliability, and attention to detail',
    color: 'blue',
  },
  extraversion: {
    label: 'Extraversion',
    description: 'Energy, sociability, and communication skills',
    color: 'green',
  },
  agreeableness: {
    label: 'Agreeableness',
    description: 'Cooperation, empathy, and customer service orientation',
    color: 'yellow',
  },
  neuroticism: {
    label: 'Emotional Stability',
    description: 'Stress management and composure under pressure',
    color: 'red',
  },
};

export function PersonalityTestModal({ isOpen, onClose, onSuccess }: PersonalityTestModalProps) {
  const [step, setStep] = useState<'intro' | 'questions' | 'processing' | 'results'>('intro');
  const [questions, setQuestions] = useState<PersonalityQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PersonalityResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    if (isOpen && step === 'intro') {
      fetchQuestions();
    }
  }, [isOpen, step]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contractor/personality-assessment');
      const data = await response.json();

      if (!response.ok) {
        if (data.alreadyCompleted && data.result) {
          // User has already completed the assessment
          setResult(data.result);
          setStep('results');
          return;
        }
        throw new Error(data.error || 'Failed to load questions');
      }

      setQuestions(data.questions || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load assessment');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    setStartTime(Date.now());
    setStep('questions');
  };

  const handleAnswer = (value: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitAssessment();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitAssessment = async () => {
    setLoading(true);
    setStep('processing');

    const timeTakenMinutes = Math.round((Date.now() - startTime) / 60000);

    try {
      const response = await fetch('/api/contractor/personality-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
          })),
          timeTakenMinutes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit assessment');
      }

      setResult(data.result);
      setStep('results');
      toast.success('Personality assessment completed!');

      setTimeout(() => {
        onSuccess?.();
      }, 5000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit assessment');
      setStep('questions');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && step !== 'processing') {
      setStep('intro');
      setCurrentQuestionIndex(0);
      setAnswers({});
      onClose();
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const answeredCount = Object.keys(answers).length;

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
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Personality Assessment</h2>
                    <p className="text-sm text-gray-600">
                      {step === 'questions' && `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                      {step === 'intro' && 'Boost your profile up to +15%'}
                      {step === 'results' && 'Your Results'}
                    </p>
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

              {/* Progress Bar (only during questions) */}
              {step === 'questions' && (
                <div className="bg-gray-100 h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {step === 'intro' && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Brain className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Discover Your Professional Strengths
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                      Complete this 50-question assessment to help homeowners understand your working style
                      and get matched with jobs that suit you best.
                    </p>

                    <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">10-15 Minutes</p>
                        <p className="text-sm text-gray-600">Quick and easy</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">Up to +15% Boost</p>
                        <p className="text-sm text-gray-600">Profile visibility</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">Better Matches</p>
                        <p className="text-sm text-gray-600">Find ideal jobs</p>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6 max-w-xl mx-auto">
                      <p className="text-sm text-yellow-900">
                        <strong>Note:</strong> There are no right or wrong answers. Answer honestly based on
                        how you typically work and interact with clients.
                      </p>
                    </div>

                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleClose}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Maybe Later
                      </button>
                      <button
                        onClick={handleStartTest}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
                      >
                        Start Assessment
                      </button>
                    </div>
                  </div>
                )}

                {step === 'questions' && currentQuestion && (
                  <div className="py-8">
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-500 uppercase">
                          {currentQuestion.category.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {answeredCount} / {questions.length} answered
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {currentQuestion.text}
                      </h3>
                    </div>

                    <div className="space-y-3 mb-8">
                      {SCALE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleAnswer(option.value)}
                          className={`
                            w-full p-4 border-2 rounded-xl text-left transition-all
                            ${
                              answers[currentQuestion.id] === option.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{option.label}</span>
                            {answers[currentQuestion.id] === option.value && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Previous
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={!isAnswered}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 'processing' && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <Brain className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Responses...</h3>
                    <p className="text-gray-600">Calculating your personality profile</p>
                  </div>
                )}

                {step === 'results' && result && (
                  <div className="py-8">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete!</h3>
                      <p className="text-gray-600 mb-4">
                        Your profile has been boosted by <strong className="text-green-600">+{result.profileBoost}%</strong>
                      </p>
                    </div>

                    <div className="space-y-4 mb-8">
                      <h4 className="font-bold text-gray-900 mb-4">Your Personality Profile:</h4>

                      {Object.entries(TRAIT_INFO).map(([key, info]) => {
                        const score = result[key as keyof Omit<PersonalityResult, 'jobRecommendations' | 'profileBoost'>];
                        return (
                          <div key={key} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">{info.label}</p>
                                <p className="text-sm text-gray-600">{info.description}</p>
                              </div>
                              <span className="text-2xl font-bold text-gray-900">{score}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`bg-gradient-to-r from-${info.color}-400 to-${info.color}-600 h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                      <h4 className="font-bold text-gray-900 mb-2">Recommended Job Types:</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.jobRecommendations.map((job, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {job}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSuccess?.();
                        onClose();
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                    >
                      Complete
                    </button>
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
