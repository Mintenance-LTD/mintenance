'use client';

import { MotionDiv } from '@/components/ui/MotionDiv';
import { Check, X } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  color: 'gray' | 'teal' | 'purple';
}

interface FeatureComparisonTableProps {
  plans: Plan[];
}

export function FeatureComparisonTable({ plans }: FeatureComparisonTableProps) {
  const features = [
    { category: 'Bidding', items: [
      { name: 'Monthly bids', basic: '10', professional: 'Unlimited', business: 'Unlimited' },
      { name: 'Bid on premium jobs', basic: false, professional: true, business: true },
      { name: 'Auto-bid on matching jobs', basic: false, professional: false, business: true },
    ]},
    { category: 'Profile & Visibility', items: [
      { name: 'Business profile', basic: true, professional: true, business: true },
      { name: 'Featured listing', basic: false, professional: true, business: true },
      { name: 'Top placement in search', basic: false, professional: false, business: true },
      { name: 'Portfolio photos', basic: '10', professional: '50', business: 'Unlimited' },
      { name: 'Custom branding', basic: false, professional: true, business: true },
    ]},
    { category: 'Platform Fees', items: [
      { name: 'Platform fee', basic: '15%', professional: '10%', business: '7%' },
      { name: 'Fee savings vs Basic', basic: '—', professional: '33%', business: '53%' },
    ]},
    { category: 'Tools & Features', items: [
      { name: 'Advanced analytics', basic: false, professional: true, business: true },
      { name: 'Lead recommendations', basic: false, professional: true, business: true },
      { name: 'Quote builder', basic: true, professional: true, business: true },
      { name: 'Invoice management', basic: true, professional: true, business: true },
      { name: 'API access', basic: false, professional: false, business: true },
    ]},
    { category: 'Support & Team', items: [
      { name: 'Email support', basic: true, professional: true, business: true },
      { name: 'Priority support', basic: false, professional: true, business: true },
      { name: 'Team accounts', basic: false, professional: false, business: '10 members' },
      { name: 'Dedicated account manager', basic: false, professional: false, business: true },
    ]},
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-teal-600 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-gray-300 mx-auto" />
      );
    }
    return <span className="text-gray-900 font-medium">{value}</span>;
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Feature Comparison</h2>
        <p className="text-gray-600">
          Detailed breakdown of what's included in each plan
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className={`px-6 py-4 text-center text-sm font-semibold ${
                      plan.color === 'teal'
                        ? 'text-teal-600'
                        : plan.color === 'purple'
                          ? 'text-purple-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {features.map((category) => (
                <>
                  <tr key={category.category} className="bg-gray-100">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-sm font-bold text-gray-900"
                    >
                      {category.category}
                    </td>
                  </tr>
                  {category.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-center">{renderCell(item.basic)}</td>
                      <td className="px-6 py-4 text-sm text-center">{renderCell(item.professional)}</td>
                      <td className="px-6 py-4 text-sm text-center">{renderCell(item.business)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-200">
          {plans.map((plan) => (
            <div key={plan.id} className="p-6">
              <h3
                className={`text-xl font-bold mb-4 ${
                  plan.color === 'teal'
                    ? 'text-teal-600'
                    : plan.color === 'purple'
                      ? 'text-purple-600'
                      : 'text-gray-600'
                }`}
              >
                {plan.name}
              </h3>
              {features.map((category) => (
                <div key={category.category} className="mb-4">
                  <p className="font-semibold text-gray-900 mb-2">{category.category}</p>
                  <ul className="space-y-2">
                    {category.items.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="ml-2">
                          {renderCell(item[plan.id as keyof typeof item])}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </MotionDiv>
  );
}
