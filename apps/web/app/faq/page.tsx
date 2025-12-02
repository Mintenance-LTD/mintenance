'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CreditCard,
  Users,
  FileText,
  Shield,
  MessageCircle,
  Star,
  DollarSign,
} from 'lucide-react';
import { MotionButton, MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

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

export default function FAQPage2025() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle, color: 'text-gray-600' },
    { id: 'getting-started', label: 'Getting Started', icon: Users, color: 'text-blue-600' },
    { id: 'payments', label: 'Payments & Billing', icon: CreditCard, color: 'text-green-600' },
    { id: 'jobs', label: 'Jobs & Projects', icon: FileText, color: 'text-purple-600' },
    { id: 'safety', label: 'Safety & Trust', icon: Shield, color: 'text-red-600' },
    { id: 'support', label: 'Support', icon: MessageCircle, color: 'text-emerald-600' },
  ];

  const faqs: FAQ[] = [
    // Getting Started
    {
      id: '1',
      question: 'How do I create an account?',
      answer: 'Creating an account is simple! Click the "Sign Up" button in the top right corner, choose whether you\'re a homeowner or contractor, fill in your details, and verify your email address. For contractors, you\'ll need to provide additional information such as certifications and insurance details.',
      category: 'getting-started',
    },
    {
      id: '2',
      question: 'What information do I need to provide as a contractor?',
      answer: 'Contractors need to provide: business name, address, phone number, certifications (Gas Safe, NICEIC, etc.), proof of insurance (public liability and professional indemnity), portfolio of past work, and professional references. This helps us maintain quality and trust on our platform.',
      category: 'getting-started',
    },
    {
      id: '3',
      question: 'How long does contractor verification take?',
      answer: 'Contractor verification typically takes 2-3 business days. We thoroughly check all certifications, insurance documents, and references to ensure quality. You\'ll receive an email notification once your profile is approved and you can start bidding on jobs.',
      category: 'getting-started',
    },

    // Payments
    {
      id: '4',
      question: 'How does payment protection work?',
      answer: 'We use an escrow system to protect both parties. When a homeowner accepts a bid, the payment is held securely by Mintenance. The contractor completes the work, the homeowner approves it, and then funds are released to the contractor. If there\'s a dispute, our team helps resolve it fairly.',
      category: 'payments',
    },
    {
      id: '5',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express), bank transfers, and digital wallets like Apple Pay and Google Pay. All transactions are processed securely through our encrypted payment system.',
      category: 'payments',
    },
    {
      id: '6',
      question: 'What are your service fees?',
      answer: 'Homeowners can post jobs completely free. Contractors pay a small service fee (typically 5-10%) only when they win a job. There are no monthly subscriptions or hidden costs. The exact fee is clearly shown before you accept any job.',
      category: 'payments',
    },
    {
      id: '7',
      question: 'How long does it take to receive payment as a contractor?',
      answer: 'Once the homeowner approves the completed work, funds are typically released to your account within 2-3 business days. You can track all payment statuses in your contractor dashboard under the "Payments" section.',
      category: 'payments',
    },
    {
      id: '8',
      question: 'Can I get a refund if I\'m not satisfied?',
      answer: 'Yes, your satisfaction is important. If work doesn\'t meet agreed standards, you can request a refund through our dispute resolution process. We review the case, examine evidence from both parties, and make a fair decision. Funds in escrow ensure you\'re protected.',
      category: 'payments',
    },

    // Jobs
    {
      id: '9',
      question: 'How do I post a job as a homeowner?',
      answer: 'Click "Post a Job", describe your project in detail, add photos if available, set your budget and timeline, and specify your location. Our AI will then match you with suitable contractors in your area who can bid on your project.',
      category: 'jobs',
    },
    {
      id: '10',
      question: 'How many bids will I receive?',
      answer: 'This varies based on job type, location, and budget. Most jobs receive 3-8 bids within 48 hours. Popular job types in busy areas may get more. You can always adjust your job description or budget if you\'re not getting enough interest.',
      category: 'jobs',
    },
    {
      id: '11',
      question: 'Can I edit or cancel a job posting?',
      answer: 'Yes, you can edit job details anytime before accepting a bid. To cancel a job, go to your dashboard, select the job, and click "Cancel Job". If you\'ve already accepted a bid, you\'ll need to discuss cancellation with your contractor.',
      category: 'jobs',
    },
    {
      id: '12',
      question: 'How does the matching algorithm work?',
      answer: 'Our AI analyzes your job requirements (type, budget, location, urgency) and matches them with contractors who have: relevant expertise, high ratings, availability, geographic proximity, and appropriate certifications. This ensures you get quality bids from suitable professionals.',
      category: 'jobs',
    },
    {
      id: '13',
      question: 'What happens after I accept a bid?',
      answer: 'Once you accept a bid, the payment is secured in escrow, you can message the contractor directly, schedule a site visit or start date, and track project progress through milestones. The contractor will keep you updated throughout the project.',
      category: 'jobs',
    },

    // Safety
    {
      id: '14',
      question: 'Are all contractors verified and insured?',
      answer: 'Yes, absolutely. We verify all contractor certifications, check insurance coverage (public liability minimum £5M, professional indemnity £2M), run background checks, and verify business registration. Only fully verified contractors can bid on jobs.',
      category: 'safety',
    },
    {
      id: '15',
      question: 'How do I report a safety concern?',
      answer: 'If you have any safety concerns, click the "Report Issue" button on the job page or contact our support team immediately at support@mintenance.com or call our emergency line. We take all safety reports seriously and investigate promptly.',
      category: 'safety',
    },
    {
      id: '16',
      question: 'What if a contractor doesn\'t show up?',
      answer: 'This is rare, but if it happens, contact us immediately. We\'ll reach out to the contractor and if they can\'t provide a valid reason, we\'ll help you find a replacement quickly. Your payment stays in escrow until work begins, so you\'re fully protected.',
      category: 'safety',
    },
    {
      id: '17',
      question: 'How do reviews and ratings work?',
      answer: 'After job completion, both homeowners and contractors can leave reviews. Ratings are based on quality, communication, timeliness, and professionalism (1-5 stars). Reviews are verified and can\'t be deleted, ensuring authentic feedback for future users.',
      category: 'safety',
    },

    // Support
    {
      id: '18',
      question: 'How can I contact customer support?',
      answer: 'You can reach us via: live chat (bottom right corner of website), email at support@mintenance.com, phone at 0800 MINTENANCE, or through the Help Center. We\'re available Monday-Friday 8am-8pm, Saturday 9am-5pm.',
      category: 'support',
    },
    {
      id: '19',
      question: 'What if I have a dispute with a contractor/homeowner?',
      answer: 'We offer free dispute resolution services. Contact our support team, provide details and evidence (photos, messages, contracts), and our mediation team will review the case and help reach a fair resolution, usually within 5-7 business days.',
      category: 'support',
    },
    {
      id: '20',
      question: 'Can I change my account type from homeowner to contractor?',
      answer: 'Yes! Go to Account Settings > Change Account Type. You\'ll need to provide contractor-specific information (certifications, insurance, etc.) and go through our verification process. You can also have both account types if needed.',
      category: 'support',
    },
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <MotionDiv variants={fadeIn} className="mb-6">
            <HelpCircle className="w-16 h-16 mx-auto mb-4" />
          </MotionDiv>
          <MotionH1 variants={fadeIn} className="text-5xl font-bold mb-4">
            Frequently Asked Questions
          </MotionH1>
          <MotionP variants={fadeIn} className="text-xl text-teal-100 max-w-2xl mx-auto">
            Find answers to common questions about using Mintenance
          </MotionP>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for answers..."
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-lg"
            />
          </div>
        </MotionDiv>

        {/* Categories */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <MotionButton
                key={category.id}
                variants={staggerItem}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedCategory === category.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:shadow-md'
                }`}
              >
                <Icon
                  className={`w-8 h-8 mx-auto mb-2 ${
                    selectedCategory === category.id ? 'text-white' : category.color
                  }`}
                />
                <p className="text-sm font-medium text-center">{category.label}</p>
                <p className="text-xs mt-1 opacity-75">
                  {faqs.filter((f) => category.id === 'all' || f.category === category.id).length}{' '}
                  questions
                </p>
              </MotionButton>
            );
          })}
        </MotionDiv>

        {/* FAQs */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-4"
        >
          <AnimatePresence>
            {filteredFAQs.map((faq) => (
              <MotionDiv
                key={faq.id}
                variants={staggerItem}
                layout
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-lg pr-4">
                    {faq.question}
                  </span>
                  {expandedId === faq.id ? (
                    <ChevronUp className="w-6 h-6 text-teal-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedId === faq.id && (
                    <MotionDiv
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </MotionDiv>
            ))}
          </AnimatePresence>

          {filteredFAQs.length === 0 && (
            <MotionDiv
              variants={fadeIn}
              className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200"
            >
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or browse different categories
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Reset Filters
              </button>
            </MotionDiv>
          )}
        </MotionDiv>

        {/* Still Need Help */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mt-16 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-xl p-12 text-center text-white"
        >
          <MessageCircle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/help')}
              className="px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-semibold text-lg"
            >
              Contact Support
            </button>
            <button
              onClick={() => router.push('/help/chat')}
              className="px-8 py-4 bg-white/10 border-2 border-white text-white rounded-lg hover:bg-white/20 transition-colors font-semibold text-lg"
            >
              Live Chat
            </button>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
