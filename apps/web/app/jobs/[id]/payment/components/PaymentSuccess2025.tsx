'use client';

import React, { useEffect } from 'react';
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { MotionButton, MotionDiv, MotionP } from '@/components/ui/MotionDiv';

interface PaymentSuccess2025Props {
  amount: number;
  jobTitle: string;
  paymentIntentId: string;
  jobId: string;
}

export function PaymentSuccess2025({
  amount,
  jobTitle,
  paymentIntentId,
  jobId,
}: PaymentSuccess2025Props) {
  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
      <MotionDiv
        className="max-w-2xl w-full"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Success Icon */}
        <MotionDiv variants={scaleIn} className="flex justify-center mb-8">
          <div className="relative">
            <MotionDiv
              className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.6,
                times: [0, 0.5, 1],
              }}
            >
              <svg
                className="w-12 h-12 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </MotionDiv>
            <MotionDiv
              className="absolute inset-0 bg-emerald-500 rounded-full opacity-20"
              animate={{
                scale: [1, 1.5, 2],
                opacity: [0.5, 0.3, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              <div className="w-full h-full" />
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* Success Message */}
        <MotionDiv variants={staggerItem} className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Payment Successful!</h1>
          <p className="text-lg text-gray-600">
            Your payment has been processed and funds are now safely held in escrow.
          </p>
        </MotionDiv>

        {/* Payment Details Card */}
        <MotionDiv
          variants={staggerItem}
          className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 mb-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Details</h2>

          <div className="space-y-4">
            {/* Amount */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Amount Paid</span>
              <span className="text-2xl font-bold text-emerald-600">
                ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Job */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Job</span>
              <span className="font-semibold text-gray-900 text-right max-w-sm truncate">
                {jobTitle}
              </span>
            </div>

            {/* Transaction ID */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Transaction ID</span>
              <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                {paymentIntentId}
              </code>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600">Date</span>
              <span className="font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Escrow Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-teal-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-teal-900 mb-1">Funds Held Securely</h3>
                  <p className="text-sm text-teal-700">
                    Your payment is safely held in escrow until the job is completed and approved.
                    The contractor will receive payment only after you confirm satisfaction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* What's Next Card */}
        <MotionDiv
          variants={staggerItem}
          className="bg-gradient-hero rounded-2xl p-8 mb-6 text-white"
        >
          <h2 className="text-xl font-bold mb-4">What's Next?</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>The contractor will be notified and can begin work</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>You'll receive updates as the project progresses</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Once complete, review and approve to release payment</span>
            </li>
          </ul>
        </MotionDiv>

        {/* Action Buttons */}
        <MotionDiv variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={`/jobs/${jobId}`}>
            <MotionButton
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Job Details
            </MotionButton>
          </Link>
          <Link href="/payments">
            <MotionButton
              className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View All Payments
            </MotionButton>
          </Link>
        </MotionDiv>

        {/* Email Notification */}
        <MotionP variants={staggerItem} className="text-center text-gray-600 mt-6 text-sm">
          📧 A confirmation email has been sent to your registered email address
        </MotionP>
      </MotionDiv>
    </div>
  );
}
