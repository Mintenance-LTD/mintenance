'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  HelpCircle,
  CreditCard,
  Users,
  FileText,
  Shield,
  MessageCircle,
} from 'lucide-react';
import {
  MotionButton,
  MotionDiv,
  MotionH1,
  MotionP,
} from '@/components/ui/MotionDiv';
import { AccordionItem } from '@/components/ui/AccordionItem';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function FAQPageClient() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    {
      id: 'all',
      label: 'All Questions',
      icon: HelpCircle,
      color: 'var(--me-ink-3)',
    },
    {
      id: 'getting-started',
      label: 'Getting Started',
      icon: Users,
      color: 'var(--me-info-fg)',
    },
    {
      id: 'payments',
      label: 'Payments & Billing',
      icon: CreditCard,
      color: 'var(--me-ok-fg)',
    },
    {
      id: 'jobs',
      label: 'Jobs & Projects',
      icon: FileText,
      color: 'var(--me-brand-2)',
    },
    {
      id: 'safety',
      label: 'Safety & Trust',
      icon: Shield,
      color: 'var(--me-err-fg)',
    },
    {
      id: 'support',
      label: 'Support',
      icon: MessageCircle,
      color: 'var(--me-brand)',
    },
  ];

  const faqs: FAQ[] = [
    // Getting Started
    {
      id: '1',
      question: 'How do I create an account?',
      answer:
        'Creating an account is simple! Click the "Sign Up" button in the top right corner, choose whether you\'re a homeowner or contractor, fill in your details, and verify your email address. For contractors, you\'ll need to provide additional information such as certifications and insurance details.',
      category: 'getting-started',
    },
    {
      id: '2',
      question: 'What information do I need to provide as a contractor?',
      answer:
        'During onboarding we collect: business name, phone number, years of experience, a short bio, the trades you cover, any licence/registration numbers (e.g. Gas Safe, NICEIC), your insurance provider, the area you cover, and payout details (via Stripe Connect). After approval you can add certifications, insurance documents, and portfolio photos from your contractor profile to strengthen the trust signal homeowners see.',
      category: 'getting-started',
    },
    {
      id: '3',
      question: 'How long does contractor approval take?',
      answer:
        "Our admin team aims to review new contractor submissions within 2–3 business days. The review covers the business details, declared credentials, and insurance information collected at signup. You'll receive an email once the review is complete and you can start bidding on jobs.",
      category: 'getting-started',
    },

    // Payments
    {
      id: '4',
      question: 'How does payment protection work?',
      answer:
        "We use Protected Payment to guard both parties. When a homeowner accepts a bid, the payment is held securely by Mintenance. The contractor completes the work, the homeowner approves it, and then funds are released to the contractor. If there's a dispute, our team helps resolve it fairly.",
      category: 'payments',
    },
    {
      id: '5',
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit and debit cards (Visa, Mastercard, American Express), bank transfers, and digital wallets like Apple Pay and Google Pay. All transactions are processed securely through our encrypted payment system.',
      category: 'payments',
    },
    {
      id: '6',
      question: 'What are your service fees?',
      answer:
        'Homeowners can post jobs completely free. Contractors pay a small service fee (typically 5-10%) only when they win a job. There are no monthly subscriptions or hidden costs. The exact fee is clearly shown before you accept any job.',
      category: 'payments',
    },
    {
      id: '7',
      question: 'How long does it take to receive payment as a contractor?',
      answer:
        'Once the homeowner approves the completed work, funds are typically released to your account within 2-3 business days. You can track all payment statuses in your contractor dashboard under the "Payments" section.',
      category: 'payments',
    },
    {
      id: '8',
      question: "Can I get a refund if I'm not satisfied?",
      answer:
        "Yes, your satisfaction is important. If work doesn't meet agreed standards, you can request a refund through our dispute resolution process. We review the case, examine evidence from both parties, and make a fair decision. Protected Payment means your money stays held until the outcome is settled.",
      category: 'payments',
    },

    // Jobs
    {
      id: '9',
      question: 'How do I post a job as a homeowner?',
      answer:
        'Click "Post a Job", describe your project in detail, add photos if available, set your budget and timeline, and specify your location. Our AI will then match you with suitable contractors in your area who can bid on your project.',
      category: 'jobs',
    },
    {
      id: '10',
      question: 'How many bids will I receive?',
      answer:
        "This varies based on job type, location, and budget. Most jobs receive 3-8 bids within 48 hours. Popular job types in busy areas may get more. You can always adjust your job description or budget if you're not getting enough interest.",
      category: 'jobs',
    },
    {
      id: '11',
      question: 'Can I edit or cancel a job posting?',
      answer:
        'Yes, you can edit job details anytime before accepting a bid. To cancel a job, go to your dashboard, select the job, and click "Cancel Job". If you\'ve already accepted a bid, you\'ll need to discuss cancellation with your contractor.',
      category: 'jobs',
    },
    {
      id: '12',
      question: 'How does the matching algorithm work?',
      answer:
        'Our AI analyses your job requirements (type, budget, location, urgency) and matches them with contractors who have: relevant expertise, high ratings, availability, geographic proximity, and appropriate certifications. This ensures you get quality bids from suitable professionals.',
      category: 'jobs',
    },
    {
      id: '13',
      question: 'What happens after I accept a bid?',
      answer:
        'Once you accept a bid, the payment is held with Protected Payment, you can message the contractor directly, schedule a site visit or start date, and track project progress through milestones. The contractor will keep you updated throughout the project.',
      category: 'jobs',
    },

    // Safety
    {
      id: '14',
      question: 'How are contractors checked before they can bid?',
      answer:
        'Contractors share their credentials (e.g. Gas Safe, NICEIC), insurance details, and business info during onboarding. Our admin team reviews each submission manually before a contractor can bid — automated lookups against the official registers and a background-check provider are on our roadmap, not live today. Past job history, ratings, and dispute records are visible on every contractor profile so you can judge fit for yourself.',
      category: 'safety',
    },
    {
      id: '15',
      question: 'How do I report a safety concern?',
      answer:
        'If you have any safety concerns, click the "Report Issue" button on the job page or contact our support team immediately at support@mintenance.co.uk or call our emergency line. We take all safety reports seriously and investigate promptly.',
      category: 'safety',
    },
    {
      id: '16',
      question: "What if a contractor doesn't show up?",
      answer:
        "This is rare, but if it happens, contact us immediately. We'll reach out to the contractor and if they can't provide a valid reason, we'll help you find a replacement quickly. Protected Payment keeps your money held until work begins, so you're fully covered.",
      category: 'safety',
    },
    {
      id: '17',
      question: 'How do reviews and ratings work?',
      answer:
        "After job completion, both homeowners and contractors can leave reviews on each other. Ratings cover quality, communication, timeliness, and professionalism (1-5 stars). Reviews are tied to a real completed job on the platform and can't be deleted by the other party, so feedback stays authentic.",
      category: 'safety',
    },

    // Support
    {
      id: '18',
      question: 'How can I contact customer support?',
      answer:
        "You can reach us via: live chat (bottom right corner of website), email at support@mintenance.co.uk, phone at 0800 MINTENANCE, or through the Help Centre. We're available Monday-Friday 8am-8pm, Saturday 9am-5pm.",
      category: 'support',
    },
    {
      id: '19',
      question: 'What if I have a dispute with a contractor/homeowner?',
      answer:
        'We offer free dispute resolution services. Contact our support team, provide details and evidence (photos, messages, contracts), and our mediation team will review the case and help reach a fair resolution, usually within 5-7 business days.',
      category: 'support',
    },
    {
      id: '20',
      question: 'Can I change my account type from homeowner to contractor?',
      answer:
        "Yes! Go to Account Settings > Change Account Type. You'll need to provide contractor-specific information (certifications, insurance, etc.) and go through our verification process. You can also have both account types if needed.",
      category: 'support',
    },
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{
        background: 'var(--me-bg)',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      {/* Header */}
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        style={{
          background:
            'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          color: 'var(--me-on-brand)',
        }}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center'>
          <MotionDiv variants={fadeIn} className='mb-6'>
            <HelpCircle className='w-16 h-16 mx-auto mb-4' />
          </MotionDiv>
          <MotionH1
            variants={fadeIn}
            className='mb-4'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(36px, 5vw, 52px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Frequently Asked Questions
          </MotionH1>
          <MotionP
            variants={fadeIn}
            className='max-w-2xl mx-auto'
            style={{ fontSize: 20, opacity: 0.9, lineHeight: 1.55 }}
          >
            Find answers to common questions about using Mintenance
          </MotionP>
        </div>
      </MotionDiv>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        {/* Search */}
        <MotionDiv
          initial='hidden'
          animate='visible'
          variants={fadeIn}
          className='max-w-2xl mx-auto mb-12'
        >
          <div className='relative'>
            <Search
              className='absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6'
              style={{ color: 'var(--me-ink-3)' }}
            />
            <input
              type='text'
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              placeholder='Search for answers...'
              className='w-full pl-14 pr-4 py-4 text-lg'
              style={{
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                border: '2px solid var(--me-line)',
                borderRadius: 'var(--me-radius-input)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            />
          </div>
        </MotionDiv>

        {/* Categories */}
        <MotionDiv
          variants={staggerContainer}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12'
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            return (
              <MotionButton
                key={category.id}
                variants={staggerItem}
                onClick={() => setSelectedCategory(category.id)}
                className='p-4 transition-all'
                style={{
                  borderRadius: 'var(--me-radius-card)',
                  border: '2px solid',
                  borderColor: isSelected
                    ? 'var(--me-brand)'
                    : 'var(--me-line)',
                  background: isSelected
                    ? 'var(--me-brand)'
                    : 'var(--me-surface)',
                  color: isSelected ? 'var(--me-on-brand)' : 'var(--me-ink-2)',
                  boxShadow: isSelected ? 'var(--me-shadow-card)' : undefined,
                }}
              >
                <Icon
                  className='w-8 h-8 mx-auto mb-2'
                  style={{
                    color: isSelected ? 'var(--me-on-brand)' : category.color,
                  }}
                />
                <p className='text-sm font-medium text-center'>
                  {category.label}
                </p>
                <p className='text-xs mt-1 opacity-75'>
                  {
                    faqs.filter(
                      (f) => category.id === 'all' || f.category === category.id
                    ).length
                  }{' '}
                  questions
                </p>
              </MotionButton>
            );
          })}
        </MotionDiv>

        {/* FAQs */}
        <div className='max-w-4xl mx-auto'>
          {filteredFAQs.length > 0 ? (
            <div
              className='overflow-hidden'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              {filteredFAQs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  title={faq.question}
                  content={
                    <p
                      style={{
                        color: 'var(--me-ink-2)',
                        lineHeight: 1.65,
                      }}
                    >
                      {faq.answer}
                    </p>
                  }
                  className='last:border-b-0'
                  titleClassName='px-6'
                  contentClassName='px-6'
                />
              ))}
            </div>
          ) : (
            <MotionDiv
              variants={fadeIn}
              className='text-center py-12'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              <HelpCircle
                className='w-16 h-16 mx-auto mb-4'
                style={{ color: 'var(--me-ink-4)' }}
              />
              <h3
                className='mb-2'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 20,
                  letterSpacing: '-0.01em',
                  color: 'var(--me-ink)',
                }}
              >
                No results found
              </h3>
              <p className='mb-6' style={{ color: 'var(--me-ink-2)' }}>
                Try adjusting your search or browse different categories
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className='font-medium transition-colors'
                style={{
                  padding: '12px 24px',
                  background: 'var(--me-brand)',
                  color: 'var(--me-on-brand)',
                  borderRadius: 'var(--me-radius-btn)',
                  boxShadow: 'var(--me-shadow-btn)',
                }}
              >
                Reset Filters
              </button>
            </MotionDiv>
          )}
        </div>

        {/* Still Need Help */}
        <MotionDiv
          initial='hidden'
          animate='visible'
          variants={fadeIn}
          className='mt-16 p-12 text-center'
          style={{
            background:
              'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
            borderRadius: 'var(--me-radius-card)',
            boxShadow: 'var(--me-shadow-pop)',
            color: 'var(--me-on-brand)',
          }}
        >
          <MessageCircle className='w-16 h-16 mx-auto mb-4' />
          <h2
            className='mb-4'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(28px, 3.5vw, 36px)',
              letterSpacing: '-0.02em',
            }}
          >
            Still Need Help?
          </h2>
          <p
            className='mb-8 max-w-2xl mx-auto'
            style={{ fontSize: 20, opacity: 0.9, lineHeight: 1.55 }}
          >
            Can't find the answer you're looking for? Our support team is here
            to help.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/contact'
              className='font-semibold text-lg text-center transition-colors'
              style={{
                padding: '16px 32px',
                background: 'var(--me-surface)',
                color: 'var(--me-brand)',
                borderRadius: 'var(--me-radius-btn)',
                textDecoration: 'none',
              }}
            >
              Contact Support
            </Link>
            <Link
              href='/contact'
              className='font-semibold text-lg text-center transition-colors'
              style={{
                padding: '16px 32px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid var(--me-on-brand)',
                color: 'var(--me-on-brand)',
                borderRadius: 'var(--me-radius-btn)',
                textDecoration: 'none',
              }}
            >
              Live Chat
            </Link>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
