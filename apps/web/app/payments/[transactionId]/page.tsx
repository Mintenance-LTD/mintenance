'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Building2,
  User,
  Calendar,
  FileText,
  DollarSign,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'payout' | 'fee';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  date: string;
  description: string;
  jobId?: string;
  jobTitle?: string;
  contractor: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  paymentMethod: {
    type: 'card' | 'bank_account';
    last4: string;
    brand?: string;
  };
  invoice?: {
    id: string;
    number: string;
    url: string;
  };
  receipt?: {
    url: string;
  };
  refundable: boolean;
  timeline: {
    status: string;
    date: string;
    description: string;
  }[];
  metadata: {
    processingFee: number;
    platformFee: number;
    netAmount: number;
    taxAmount: number;
  };
}

export default function TransactionDetailPage2025() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.transactionId as string;

  // Mock transaction data
  const [transaction] = useState<Transaction>({
    id: transactionId,
    type: 'payment',
    status: 'completed',
    amount: 2450.00,
    currency: 'GBP',
    date: '2025-01-28T14:30:00Z',
    description: 'Payment for Kitchen Renovation - Final Payment',
    jobId: 'job_123',
    jobTitle: 'Kitchen Renovation',
    contractor: {
      id: 'contractor_456',
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+44 7700 900123',
      company: 'Smith Construction Ltd',
    },
    paymentMethod: {
      type: 'card',
      last4: '4242',
      brand: 'Visa',
    },
    invoice: {
      id: 'inv_789',
      number: 'INV-2025-001234',
      url: '/invoices/inv_789.pdf',
    },
    receipt: {
      url: '/receipts/rcpt_789.pdf',
    },
    refundable: true,
    timeline: [
      {
        status: 'Payment initiated',
        date: '2025-01-28T14:30:00Z',
        description: 'Payment request created',
      },
      {
        status: 'Payment authorized',
        date: '2025-01-28T14:30:15Z',
        description: 'Card authorization successful',
      },
      {
        status: 'Payment captured',
        date: '2025-01-28T14:30:30Z',
        description: 'Funds captured from card',
      },
      {
        status: 'Payment completed',
        date: '2025-01-28T14:31:00Z',
        description: 'Transaction successfully completed',
      },
    ],
    metadata: {
      processingFee: 49.00,
      platformFee: 122.50,
      netAmount: 2278.50,
      taxAmount: 490.00,
    },
  });

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState(transaction.amount.toString());
  const [refundReason, setRefundReason] = useState('');

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'refunded':
        return <RefreshCw className="w-6 h-6 text-blue-500" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleDownloadReceipt = () => {
    toast.success('Downloading receipt...');
    // Download logic here
  };

  const handleDownloadInvoice = () => {
    toast.success('Downloading invoice...');
    // Download logic here
  };

  const handleSendReceipt = () => {
    toast.success('Receipt sent to your email');
  };

  const handleRefund = () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > transaction.amount) {
      toast.error('Invalid refund amount');
      return;
    }

    toast.success('Refund request submitted successfully');
    setShowRefundModal(false);
    setRefundAmount(transaction.amount.toString());
    setRefundReason('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Payments
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Transaction Details
              </h1>
              <p className="text-gray-600">Transaction ID: {transaction.id}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
              <button
                onClick={handleSendReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                Email Receipt
              </button>
              {transaction.refundable && transaction.status === 'completed' && (
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Request Refund
                </button>
              )}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Summary */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    £{transaction.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </h2>
                  <p className="text-gray-600">{transaction.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(transaction.status)}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-900">
                      {transaction.paymentMethod.brand} •••• {transaction.paymentMethod.last4}
                    </p>
                  </div>
                </div>

                {transaction.jobId && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Job</p>
                      <button
                        onClick={() => router.push(`/jobs/${transaction.jobId}`)}
                        className="font-medium text-teal-600 hover:text-teal-700"
                      >
                        {transaction.jobTitle}
                      </button>
                    </div>
                  </div>
                )}

                {transaction.invoice && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Invoice</p>
                      <button
                        onClick={handleDownloadInvoice}
                        className="font-medium text-teal-600 hover:text-teal-700"
                      >
                        {transaction.invoice.number}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </MotionDiv>

            {/* Payment Breakdown */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" />
                Payment Breakdown
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    £{transaction.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">VAT (20%)</span>
                  <span className="text-gray-900">
                    £{transaction.metadata.taxAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Platform Fee (5%)</span>
                  <span className="text-gray-900">
                    £{transaction.metadata.platformFee.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Processing Fee</span>
                  <span className="text-gray-900">
                    £{transaction.metadata.processingFee.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Net to Contractor</span>
                  <span className="font-bold text-teal-600 text-lg">
                    £{transaction.metadata.netAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </MotionDiv>

            {/* Transaction Timeline */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Transaction Timeline
              </h3>

              <div className="space-y-4">
                {transaction.timeline.map((event, index) => (
                  <MotionDiv
                    key={index}
                    variants={staggerItem}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-teal-600 rounded-full" />
                      {index < transaction.timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-medium text-gray-900">{event.status}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(event.date).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            </MotionDiv>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contractor Info */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                Contractor Details
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="font-medium text-gray-900">{transaction.contractor.name}</p>
                </div>

                {transaction.contractor.company && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Company</p>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {transaction.contractor.company}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <a
                    href={`mailto:${transaction.contractor.email}`}
                    className="font-medium text-teal-600 hover:text-teal-700 flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {transaction.contractor.email}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <a
                    href={`tel:${transaction.contractor.phone}`}
                    className="font-medium text-teal-600 hover:text-teal-700 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {transaction.contractor.phone}
                  </a>
                </div>

                <button
                  onClick={() => router.push(`/contractors/${transaction.contractor.id}`)}
                  className="w-full mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  View Profile
                </button>
              </div>
            </MotionDiv>

            {/* Help & Support */}
            <MotionDiv
              variants={fadeIn}
              className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">Need Help?</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                If you have any questions about this transaction, our support team is here to help.
              </p>

              <button
                onClick={() => router.push('/help')}
                className="w-full px-4 py-2 bg-white border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
              >
                Contact Support
              </button>
            </MotionDiv>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Refund</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={transaction.amount}
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: £{transaction.amount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Refund
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Please provide a reason for the refund request..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    Refunds typically take 5-10 business days to process and appear on your statement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Submit Refund
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
