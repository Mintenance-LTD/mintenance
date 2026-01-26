'use client';
import { TrendingUp, Star, Briefcase, DollarSign, Award, Clock } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { staggerItem } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
interface ProfileMetricsProps {
  metrics: {
    profileCompletion: number;
    averageRating: number;
    totalReviews: number;
    jobsCompleted: number;
    winRate: number;
    totalEarnings: number;
    totalBids: number;
  };
}
export function ProfileMetrics({ metrics }: ProfileMetricsProps) {
  const metricCards = [
    {
      icon: Star,
      label: 'Average Rating',
      value: metrics.averageRating.toFixed(1),
      suffix: '/ 5.0',
      subtext: `${metrics.totalReviews} reviews`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      icon: Briefcase,
      label: 'Jobs Completed',
      value: metrics.jobsCompleted.toString(),
      subtext: 'Successfully delivered',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: TrendingUp,
      label: 'Win Rate',
      value: `${metrics.winRate}%`,
      subtext: `${metrics.totalBids} total bids`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: formatMoney(metrics.totalEarnings),
      subtext: 'Lifetime earnings',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => (
        <MotionDiv
          key={metric.label}
          variants={staggerItem}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className={`inline-flex p-2 rounded-lg ${metric.bgColor} mb-3`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {metric.label}
              </p>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </span>
                {metric.suffix && (
                  <span className="text-sm text-gray-500">
                    {metric.suffix}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {metric.subtext}
              </p>
            </div>
          </div>
          {/* Progress bar for profile completion */}
          {metric.label === 'Profile Completion' && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.profileCompletion}%` }}
                />
              </div>
            </div>
          )}
          {/* Star rating display */}
          {metric.label === 'Average Rating' && (
            <div className="flex items-center mt-3 space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(metrics.averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </MotionDiv>
      ))}
    </div>
  );
}
export function ProfileCompletionCard({ completion }: { completion: number }) {
  const getCompletionColor = () => {
    if (completion >= 80) return 'text-green-600 bg-green-50';
    if (completion >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };
  const getCompletionMessage = () => {
    if (completion >= 80) return 'Great job! Your profile is almost complete.';
    if (completion >= 60) return 'Good progress! Add more details to stand out.';
    return 'Complete your profile to get more job opportunities.';
  };
  return (
    <MotionDiv
      variants={staggerItem}
      className="bg-white rounded-xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getCompletionColor()}`}>
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Profile Completion
            </h3>
            <p className="text-sm text-gray-600">
              {getCompletionMessage()}
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold text-gray-900">
          {completion}%
        </span>
      </div>
      <div className="space-y-3">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              completion >= 80
                ? 'bg-green-500'
                : completion >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${completion}%` }}
          />
        </div>
        {completion < 100 && (
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Complete these to improve:</p>
            <ul className="space-y-1">
              {completion < 30 && <li>• Add a profile photo</li>}
              {completion < 50 && <li>• Write a compelling bio</li>}
              {completion < 70 && <li>• Add your skills and expertise</li>}
              {completion < 90 && <li>• Upload portfolio images</li>}
              {completion < 100 && <li>• Get verified by admin</li>}
            </ul>
          </div>
        )}
      </div>
    </MotionDiv>
  );
}