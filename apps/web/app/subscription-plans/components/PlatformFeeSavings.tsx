'use client';

import { MotionDiv } from '@/components/ui/MotionDiv';
import { TrendingDown } from 'lucide-react';

export function PlatformFeeSavings() {
  const plans = [
    { name: 'Basic', fee: 15, color: 'gray', savings: 0 },
    { name: 'Professional', fee: 10, color: 'teal', savings: 33 },
    { name: 'Business', fee: 7, color: 'purple', savings: 53 },
  ];

  const exampleJobValue = 1000;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-12"
    >
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-emerald-100 rounded-2xl mb-4">
          <TrendingDown className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Platform Fee Comparison</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Higher plans mean lower fees. Save significantly on every job you complete.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <MotionDiv
            key={plan.name}
            whileHover={{ y: -4 }}
            className={`text-center p-8 rounded-xl border-2 transition-all ${
              plan.color === 'teal'
                ? 'bg-teal-50 border-teal-500'
                : plan.color === 'purple'
                  ? 'bg-purple-50 border-purple-500'
                  : 'bg-gray-50 border-gray-300'
            }`}
          >
            <p
              className={`font-semibold mb-3 ${
                plan.color === 'teal'
                  ? 'text-teal-600'
                  : plan.color === 'purple'
                    ? 'text-purple-600'
                    : 'text-gray-600'
              }`}
            >
              {plan.name} Plan
            </p>
            <p className="text-5xl font-bold text-gray-900 mb-2">{plan.fee}%</p>
            <p className="text-sm text-gray-600 mb-4">platform fee per job</p>
            {plan.savings > 0 && (
              <div
                className={`px-4 py-2 rounded-full font-bold text-sm ${
                  plan.color === 'teal'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                Save {plan.savings}%
              </div>
            )}
          </MotionDiv>
        ))}
      </div>

      <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
          Example: £{exampleJobValue} Job Comparison
        </h3>
        <div className="space-y-4">
          {plans.map((plan) => {
            const fee = (exampleJobValue * plan.fee) / 100;
            const takeHome = exampleJobValue - fee;
            const savings = plan.savings > 0 ? ((exampleJobValue * 15) / 100) - fee : 0;

            return (
              <div
                key={plan.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-600">Platform fee: £{fee.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">£{takeHome.toFixed(0)}</p>
                  <p className="text-xs text-gray-600">you take home</p>
                  {savings > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      +£{savings.toFixed(0)} vs Basic
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          With Professional plan at 10 jobs/month (£1000 avg), you save{' '}
          <span className="font-bold text-teal-600">£500/month</span> compared to Basic
        </p>
      </div>
    </MotionDiv>
  );
}
