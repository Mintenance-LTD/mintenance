'use client';

import { MotionDiv } from '@/components/ui/MotionDiv';
import { Star, TrendingUp } from 'lucide-react';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function SuccessStories() {
  const stories = [
    {
      name: 'James Mitchell',
      trade: 'Plumber',
      avatar: '👨‍🔧',
      beforeStats: { jobs: 5, revenue: '£2,500' },
      afterStats: { jobs: 18, revenue: '£12,000' },
      quote: 'Upgrading to Professional was the best business decision I made. The platform fee savings alone paid for the subscription, and the featured listing brought me 3x more leads.',
      period: '3 months',
    },
    {
      name: 'Sarah Thompson',
      trade: 'Electrician',
      avatar: '👩‍🔧',
      beforeStats: { jobs: 8, revenue: '£4,800' },
      afterStats: { jobs: 25, revenue: '£18,500' },
      quote: 'The advanced analytics helped me understand which jobs were most profitable. Now I bid smarter, win more, and earn significantly more per month.',
      period: '6 months',
    },
    {
      name: 'David Chen',
      trade: 'General Contractor',
      avatar: '👷',
      beforeStats: { jobs: 12, revenue: '£15,000' },
      afterStats: { jobs: 45, revenue: '£62,000' },
      quote: 'Business plan transformed our operation. Team accounts let my crew bid independently, and the 7% platform fee saves us thousands every month.',
      period: '1 year',
    },
  ];

  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          How Contractors Grew with Premium
        </h2>
        <p className="text-gray-600">Real results from real contractors</p>
      </div>

      <MotionDiv
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        {stories.map((story, index) => (
          <MotionDiv
            key={index}
            variants={staggerItem}
            whileHover={{ y: -8 }}
            className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 hover:shadow-xl transition-all"
          >
            {/* Avatar and Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl">{story.avatar}</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{story.name}</h3>
                <p className="text-teal-600 font-medium">{story.trade}</p>
              </div>
            </div>

            {/* Before/After Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-2">Before</p>
                <p className="text-lg font-bold text-gray-900 mb-1">
                  {story.beforeStats.jobs} jobs
                </p>
                <p className="text-sm text-gray-600">{story.beforeStats.revenue}/mo</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border-2 border-teal-200">
                <p className="text-xs text-teal-600 font-semibold mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  After
                </p>
                <p className="text-lg font-bold text-teal-600 mb-1">
                  {story.afterStats.jobs} jobs
                </p>
                <p className="text-sm text-teal-700 font-semibold">{story.afterStats.revenue}/mo</p>
              </div>
            </div>

            {/* Growth Percentage */}
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Revenue Growth</span>
                <span className="text-2xl font-bold text-emerald-600">
                  +{Math.round(
                    ((parseInt(story.afterStats.revenue.replace(/[£,]/g, '')) -
                      parseInt(story.beforeStats.revenue.replace(/[£,]/g, ''))) /
                      parseInt(story.beforeStats.revenue.replace(/[£,]/g, ''))) * 100
                  )}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">in {story.period}</p>
            </div>

            {/* Quote */}
            <div className="mb-4">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm italic leading-relaxed">
                "{story.quote}"
              </p>
            </div>
          </MotionDiv>
        ))}
      </MotionDiv>

      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl px-8 py-4">
          <TrendingUp className="w-6 h-6 text-teal-600" />
          <p className="text-gray-900">
            <span className="font-bold text-teal-600">Professional contractors earn 40% more</span>
            {' '}on average within 6 months
          </p>
        </div>
      </div>
    </div>
  );
}
