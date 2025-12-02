'use client';

/**
 * Animation Testing Page
 * European Accessibility Act Compliance (2025)
 * WCAG 2.1 Level AA (Guideline 2.3.3)
 *
 * Test page to verify reduced motion support across all animation types.
 * Toggle the reduced motion preference to see animations enable/disable.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  fadeInVariants,
  fadeInUpVariants,
  scaleInVariants,
  slideInFromBottomVariants,
  cardHoverVariants,
  buttonHoverVariants,
  modalBackdropVariants,
  modalContentVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations/motion-config';
import { withMotion } from '@/lib/animations';

export default function TestAnimationsPage() {
  const actualReducedMotion = useReducedMotion();
  const [simulatedReducedMotion, setSimulatedReducedMotion] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Use simulated preference for testing, otherwise use actual
  const reducedMotion = simulatedReducedMotion || actualReducedMotion;

  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Motion Accessibility Test Page
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            This page demonstrates all animation variants with reduced motion
            support. Toggle the preference below to test accessibility
            compliance.
          </p>

          {/* Status Indicators */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-medium">System Preference:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    actualReducedMotion
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {actualReducedMotion ? 'Reduced Motion ON' : 'Animations ON'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">Test Mode:</span>
                <button
                  onClick={() => setSimulatedReducedMotion(!simulatedReducedMotion)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    simulatedReducedMotion
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {simulatedReducedMotion
                    ? 'Click to ENABLE Animations'
                    : 'Click to DISABLE Animations'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">Active Mode:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    reducedMotion
                      ? 'bg-red-100 text-red-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {reducedMotion
                    ? 'ANIMATIONS DISABLED'
                    : 'ANIMATIONS ENABLED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Sections */}
        <div className="space-y-8">
          {/* Fade Animations */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Fade Animations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                variants={fadeInVariants(reducedMotion)}
                initial="initial"
                animate="animate"
                className="p-6 bg-blue-100 rounded-lg"
              >
                <h3 className="font-semibold mb-2">fadeIn</h3>
                <p className="text-sm text-gray-600">
                  Simple fade in animation
                </p>
              </motion.div>

              <motion.div
                variants={fadeInUpVariants(reducedMotion)}
                initial="initial"
                animate="animate"
                className="p-6 bg-green-100 rounded-lg"
              >
                <h3 className="font-semibold mb-2">fadeInUp</h3>
                <p className="text-sm text-gray-600">Fade in with upward slide</p>
              </motion.div>
            </div>
          </section>

          {/* Scale Animations */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Scale Animations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                variants={scaleInVariants(reducedMotion)}
                initial="initial"
                animate="animate"
                className="p-6 bg-purple-100 rounded-lg"
              >
                <h3 className="font-semibold mb-2">scaleIn</h3>
                <p className="text-sm text-gray-600">Scale from small to normal</p>
              </motion.div>
            </div>
          </section>

          {/* Slide Animations */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Slide Animations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                variants={slideInFromBottomVariants(reducedMotion)}
                initial="initial"
                animate="animate"
                className="p-6 bg-amber-100 rounded-lg"
              >
                <h3 className="font-semibold mb-2">slideInFromBottom</h3>
                <p className="text-sm text-gray-600">Slide up from bottom</p>
              </motion.div>
            </div>
          </section>

          {/* Hover Animations */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Hover Animations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                variants={cardHoverVariants(reducedMotion)}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                className="p-6 bg-rose-100 rounded-lg cursor-pointer"
              >
                <h3 className="font-semibold mb-2">cardHover</h3>
                <p className="text-sm text-gray-600">
                  Hover over this card to see effect
                </p>
              </motion.div>

              <motion.button
                variants={buttonHoverVariants(reducedMotion)}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                className="p-6 bg-indigo-100 rounded-lg font-semibold text-left"
              >
                <h3 className="font-semibold mb-2">buttonHover</h3>
                <p className="text-sm text-gray-600">
                  Hover over this button
                </p>
              </motion.button>
            </div>
          </section>

          {/* Stagger Animations */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Stagger Animations</h2>
            <motion.div
              variants={staggerContainerVariants(reducedMotion)}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  variants={staggerItemVariants(reducedMotion)}
                  className="p-4 bg-teal-100 rounded-lg"
                >
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Modal Animation */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Modal Animation</h2>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Open Modal
            </button>

            <AnimatePresence>
              {showModal && (
                <>
                  <motion.div
                    variants={modalBackdropVariants(reducedMotion)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setShowModal(false)}
                  />
                  <motion.div
                    variants={modalContentVariants(reducedMotion)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-8 z-50 max-w-md w-full"
                  >
                    <h3 className="text-2xl font-bold mb-4">Test Modal</h3>
                    <p className="text-gray-600 mb-6">
                      This modal demonstrates entrance and exit animations that
                      respect reduced motion preferences.
                    </p>
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Close Modal
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </section>

          {/* CSS Animations */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">CSS Animations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-6 bg-yellow-100 rounded-lg ${withMotion(
                  reducedMotion,
                  'animate-fade-in'
                )}`}
              >
                <h3 className="font-semibold mb-2">CSS Fade In</h3>
                <p className="text-sm text-gray-600">
                  CSS class-based animation
                </p>
              </div>

              <div
                className={`p-6 bg-pink-100 rounded-lg ${withMotion(
                  reducedMotion,
                  'animate-fade-in-up'
                )}`}
              >
                <h3 className="font-semibold mb-2">CSS Fade In Up</h3>
                <p className="text-sm text-gray-600">
                  CSS slide up animation
                </p>
              </div>

              <div
                className={`p-6 bg-cyan-100 rounded-lg ${withMotion(
                  reducedMotion,
                  'animate-pulse-slow'
                )}`}
              >
                <h3 className="font-semibold mb-2">CSS Pulse</h3>
                <p className="text-sm text-gray-600">
                  CSS pulse animation
                </p>
              </div>
            </div>
          </section>

          {/* Instructions */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-900">
              Testing Instructions
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>
                <strong>System Preference Test:</strong> Go to your OS
                accessibility settings and enable "Reduce Motion" to see real
                system preference detection.
              </li>
              <li>
                <strong>Manual Toggle Test:</strong> Use the "Test Mode" button
                above to simulate reduced motion preference without changing
                system settings.
              </li>
              <li>
                <strong>Expected Behavior:</strong> When reduced motion is
                enabled, all animations should instantly show their final state
                without any motion.
              </li>
              <li>
                <strong>Hover Test:</strong> Hover over cards and buttons to
                verify that hover effects are also disabled when reduced motion
                is active.
              </li>
              <li>
                <strong>Modal Test:</strong> Open and close the modal to verify
                that entrance/exit animations respect the preference.
              </li>
            </ol>
          </section>

          {/* Compliance Statement */}
          <section className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-green-900">
              Accessibility Compliance
            </h2>
            <div className="space-y-2 text-green-800">
              <p>
                <strong>WCAG 2.1 Level AA</strong> - Guideline 2.3.3 Animation
                from Interactions
              </p>
              <p>
                <strong>European Accessibility Act (2025)</strong> - Motion
                accessibility requirements
              </p>
              <p className="mt-4 text-sm">
                All animations on this platform respect the user's motion
                preferences and can be disabled via system settings or this test
                page.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
