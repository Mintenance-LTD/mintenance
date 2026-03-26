import {
  Sparkles,
  ShieldCheck,
  Camera,
  MessageCircle,
  BarChart3,
  LayoutDashboard,
  ClipboardList,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const features = [
  {
    icon: Sparkles,
    title: 'Smart Matching',
    description:
      'AI matches you with the right contractor based on job type, location, and reviews.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payments',
    description:
      'Escrow-protected payments that are only released when the work is completed and approved.',
  },
  {
    icon: Camera,
    title: 'Photo Verification',
    description:
      'Before and after photo proof of work so you can see exactly what was done.',
  },
  {
    icon: MessageCircle,
    title: 'Real-Time Chat',
    description:
      'Direct messaging with your contractor to discuss details and stay updated.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Pricing',
    description:
      'Compare quotes side by side with no hidden fees or surprise charges.',
  },
  {
    icon: LayoutDashboard,
    title: 'Professional Dashboard',
    description:
      'Track all your jobs, payments, and communications in one organised place.',
  },
];

export const steps = [
  {
    number: '1',
    icon: ClipboardList,
    title: 'Post Your Job',
    description:
      'Describe what needs fixing, upload photos, and set your budget. It takes under two minutes.',
  },
  {
    number: '2',
    icon: Users,
    title: 'Get Matched',
    description:
      'Receive competitive quotes from vetted, local contractors ready to help.',
  },
  {
    number: '3',
    icon: CheckCircle2,
    title: 'Job Done',
    description:
      'Approve the completed work with photo evidence and release payment securely.',
  },
];

export const pricingPlans = [
  {
    name: 'Homeowners',
    price: 'FREE',
    period: '',
    description: 'Everything you need to get your property maintained.',
    features: [
      'Post unlimited jobs',
      'Receive contractor quotes',
      'Escrow payment protection',
      'Before/after photo verification',
      'Real-time messaging',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Contractors Basic',
    price: '\u00A329',
    period: '/month',
    description: 'Start winning jobs and growing your business.',
    features: [
      'Up to 20 bids per month',
      'Professional profile listing',
      'Direct messaging',
      'Job notifications',
      'Payment processing',
    ],
    cta: 'Start Basic',
    highlighted: false,
  },
  {
    name: 'Contractors Pro',
    price: '\u00A359',
    period: '/month',
    description: 'Unlock your full potential with premium tools.',
    features: [
      'Unlimited bids',
      'Priority listing in search',
      'Advanced analytics dashboard',
      'AI-powered job recommendations',
      'Dedicated account support',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];
