'use client';

import { Clock, TrendingUp, Users, Award } from 'lucide-react';

interface ContractorPerformanceStatsProps {
  responseTime: string;
  onTimeCompletion: number;
  repeatCustomers: number;
  yearsExperience: number;
}

export function ContractorPerformanceStats({
  responseTime,
  onTimeCompletion,
  repeatCustomers,
  yearsExperience,
}: ContractorPerformanceStatsProps) {
  return (
    <div className="border-b border-gray-200 pb-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Performance</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">Response time</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{responseTime}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">On-time completion</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{onTimeCompletion}%</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">Repeat customers</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{repeatCustomers}%</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">Years experience</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{yearsExperience}</p>
        </div>
      </div>
    </div>
  );
}
