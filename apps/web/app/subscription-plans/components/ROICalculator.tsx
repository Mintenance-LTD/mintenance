'use client';

import { useState, useEffect } from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Calculator, TrendingUp } from 'lucide-react';

export function ROICalculator() {
  const [avgJobValue, setAvgJobValue] = useState(500);
  const [jobsPerMonth, setJobsPerMonth] = useState(5);
  const [savings, setSavings] = useState(0);
  const [breakEven, setBreakEven] = useState(0);

  useEffect(() => {
    const monthlyRevenue = avgJobValue * jobsPerMonth;
    const basicFee = monthlyRevenue * 0.15;
    const professionalFee = monthlyRevenue * 0.10 + 29;
    const monthlySavings = basicFee - professionalFee;
    setSavings(monthlySavings);
    setBreakEven(Math.ceil(29 / (avgJobValue * 0.05)));
  }, [avgJobValue, jobsPerMonth]);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-12"
    >
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-teal-100 rounded-2xl mb-4">
          <Calculator className="w-8 h-8 text-teal-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">ROI Calculator</h2>
        <p className="text-gray-600">
          See how much you can save with the Professional plan
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Average Job Value (£)
          </label>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={avgJobValue}
            onChange={(e) => setAvgJobValue(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="text-center mt-2">
            <span className="text-3xl font-bold text-teal-600">£{avgJobValue}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jobs Per Month
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={jobsPerMonth}
            onChange={(e) => setJobsPerMonth(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="text-center mt-2">
            <span className="text-3xl font-bold text-teal-600">{jobsPerMonth}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Monthly Savings</p>
          <p className="text-4xl font-bold text-teal-600 mb-1">
            £{savings > 0 ? savings.toFixed(0) : 0}
          </p>
          <p className="text-xs text-gray-500">vs Basic plan</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Annual Savings</p>
          <p className="text-4xl font-bold text-emerald-600 mb-1">
            £{savings > 0 ? (savings * 12).toFixed(0) : 0}
          </p>
          <p className="text-xs text-gray-500">per year</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Break Even Point</p>
          <p className="text-4xl font-bold text-purple-600 mb-1">{breakEven}</p>
          <p className="text-xs text-gray-500">jobs per month</p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-teal-50 border-2 border-teal-200 rounded-xl">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" />
          <div>
            <p className="font-bold text-gray-900 mb-1">
              Professional plan pays for itself with just {breakEven} jobs per month
            </p>
            <p className="text-sm text-gray-600">
              You're currently doing {jobsPerMonth} jobs/month, saving £{savings.toFixed(0)} monthly
            </p>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
}
