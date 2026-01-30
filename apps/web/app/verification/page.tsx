import Link from 'next/link';
import { Shield, CheckCircle, BarChart3, Award, FileCheck, Building2, MapPin, FileText } from 'lucide-react';

const WHY_WE_VERIFY = [
  {
    title: 'Safety for homeowners',
    description: 'Homeowners can see that a contractor has provided a real business name, address, and license so they can hire with confidence.',
    icon: Shield,
  },
  {
    title: 'Fair and transparent',
    description: 'We check company details and business address, validate license format, and only award the verified badge after review.',
    icon: CheckCircle,
  },
  {
    title: 'Better matches',
    description: 'Verified contractors are easier for homeowners to find and trust, so you get more relevant opportunities.',
    icon: BarChart3,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    id: 'company',
    title: 'Company name',
    description: 'You provide your registered or trading business name. We check it’s real and not a placeholder.',
    icon: Building2,
    required: true,
  },
  {
    id: 'address',
    title: 'Business address',
    description: 'You enter your business address. We validate it and use it to show your location on the map (geocoding).',
    icon: MapPin,
    required: true,
  },
  {
    id: 'license',
    title: 'License number',
    description: 'You enter your trade or business license number. We validate the format; our team may use it as part of review.',
    icon: Award,
    required: true,
  },
  {
    id: 'insurance',
    title: 'Insurance (optional)',
    description: 'You can add liability insurance provider, policy number, and expiry. It’s optional but strengthens your profile and can help with verification.',
    icon: FileText,
    required: false,
  },
  {
    id: 'review',
    title: 'Our review',
    description: 'Our team reviews your details. We may run automated checks (e.g. address, license format). Approved contractors get the verified badge.',
    icon: CheckCircle,
    required: false,
  },
];

const BENEFITS = [
  {
    title: 'Build trust',
    description: 'The verified badge shows homeowners you’ve provided and had your business details checked.',
    icon: CheckCircle,
  },
  {
    title: 'More opportunities',
    description: 'Many homeowners filter or prefer verified contractors, so you can get more relevant jobs.',
    icon: BarChart3,
  },
  {
    title: 'Priority in search',
    description: 'Verified contractors can appear higher in search results and on the map.',
    icon: Award,
  },
];

export default function VerificationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 rounded-2xl bg-teal-50 mb-6">
            <Shield className="w-12 h-12 text-teal-600" aria-hidden />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Contractor Verification
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We verify contractor business details so homeowners can hire with confidence. Below we explain why we do it and how it works.
          </p>
        </div>

        {/* Why we verify (for homeowners and the platform) */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why we verify</h2>
          <p className="text-gray-600 mb-6">
            Verification helps homeowners know they’re hiring a real business. We check company name, business address, and license information so that when you see the verified badge, it means we’ve reviewed those details. We do it to keep the platform safe, fair, and trustworthy for everyone.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_WE_VERIFY.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <Icon className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" aria-hidden />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How it works</h2>
          <p className="text-gray-600 mb-6">
            Contractors submit their business details in the verification centre. We validate the information (including address geocoding and license format) and our team reviews it. Approved contractors receive the verified badge.
          </p>
          <ul className="space-y-6">
            {HOW_IT_WORKS_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <Icon className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{step.title}</h3>
                      {step.required && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-gray-600 text-sm">
            Our team reviews submissions and may run additional checks. Once approved, you get the verified badge; we’ll notify you of the outcome.
          </p>
        </section>

        {/* Why get verified (benefits for contractors) */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why get verified?</h2>
          <p className="text-gray-600 mb-6">
            Verified contractors stand out to homeowners and can get more visibility and opportunities on the platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <Icon className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" aria-hidden />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <FileCheck className="w-12 h-12 text-teal-600 mx-auto mb-4" aria-hidden />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to get verified?</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create a contractor account and complete verification in your dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?type=contractor"
              className="inline-flex items-center justify-center rounded-lg bg-[#1F2937] text-white px-6 py-3 font-semibold hover:bg-[#374151] transition-colors"
            >
              Create contractor account
            </Link>
            <Link
              href="/login?redirect=/contractor/verification"
              className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 text-gray-700 px-6 py-3 font-semibold hover:bg-gray-50 transition-colors"
            >
              Log in to complete verification
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
