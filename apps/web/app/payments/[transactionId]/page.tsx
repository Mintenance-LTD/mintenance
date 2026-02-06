'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transaction Details | Mintenance',
  description: 'View transaction details, payment breakdown, contractor info, and download your receipt.',
};

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Building2,
  User,
  Calendar,
  FileText,
  PoundSterling,
  RefreshCw,
  Mail,
  Phone,
  Printer,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
  const { user } = useCurrentUser();
  const transactionId = params.transactionId as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch transaction data
  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const response = await fetch(`/api/payments/history`);
        if (!response.ok) throw new Error('Failed to fetch');

        const { payments } = await response.json();
        const found = payments.find((p: unknown) => p.id === transactionId);

        if (!found) {
          toast.error('Transaction not found');
          router.push('/payments');
          return;
        }

        // Mock some additional data that would normally come from the API
        setTransaction({
          id: found.id,
          type: 'payment',
          status: found.status as Transaction['status'],
          amount: found.amount,
          currency: 'GBP',
          date: found.created_at,
          description: `Payment for ${found.job?.title || 'Service'}`,
          jobId: found.job_id,
          jobTitle: found.job?.title || 'Service',
          contractor: {
            id: found.payee_id || 'unknown',
            name: `${found.payee?.first_name || ''} ${found.payee?.last_name || ''}`.trim(),
            email: found.payee?.email || 'Not available',
            phone: '+44 7700 900000',
            company: 'Professional Services Ltd',
          },
          paymentMethod: {
            type: 'card',
            last4: '4242',
            brand: 'Visa',
          },
          invoice: {
            id: `inv_${found.id}`,
            number: `INV-2025-${found.id.substring(0, 6)}`,
            url: `/invoices/${found.id}.pdf`,
          },
          receipt: {
            url: `/receipts/${found.id}.pdf`,
          },
          refundable: found.status === 'completed' || found.status === 'released',
          timeline: [
            {
              status: 'Payment initiated',
              date: found.created_at,
              description: 'Payment request created',
            },
            {
              status: found.status === 'completed' ? 'Payment completed' : 'Payment in progress',
              date: found.updated_at || found.created_at,
              description: `Transaction ${found.status}`,
            },
          ],
          metadata: {
            processingFee: found.amount * 0.02,
            platformFee: found.amount * 0.05,
            netAmount: found.amount * 0.93,
            taxAmount: (found.amount / 1.2) * 0.2,
          },
        });
      } catch (error) {
        toast.error('Failed to load transaction details');
        router.push('/payments');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTransaction();
  }, [user, transactionId, router]);

  // Mock state for the original data structure
  const [mockTransaction] = useState<Transaction>({
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
  const [refundAmount, setRefundAmount] = useState(transaction?.amount?.toString() || '0');
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
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefund = () => {
    if (!transaction) return;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Payments
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Receipt
              </h1>
              <p className="text-gray-600">Transaction ID: {transaction.id.substring(0, 8)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Card */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
            >
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
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

              {/* Job Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Job</p>
                      {transaction.jobId ? (
                        <button
                          onClick={() => router.push(`/jobs/${transaction.jobId}`)}
                          className="font-medium text-teal-600 hover:text-teal-700"
                        >
                          {transaction.jobTitle}
                        </button>
                      ) : (
                        <p className="font-medium text-gray-900">{transaction.jobTitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
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

                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium text-gray-900">
                        {transaction.paymentMethod.brand} •••• {transaction.paymentMethod.last4}
                      </p>
                    </div>
                  </div>

                  {transaction.invoice && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-1" />
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
              </div>

              {/* Pricing Breakdown */}
              <div className="mt-6">
                <PricingBreakdown
                  items={[
                    {
                      id: '1',
                      label: 'Service Cost',
                      amount: transaction.amount / 1.2,
                    },
                    {
                      id: '2',
                      label: 'VAT (20%)',
                      amount: transaction.metadata.taxAmount,
                    },
                    {
                      id: '3',
                      label: 'Platform Fee (5%)',
                      amount: transaction.metadata.platformFee,
                    },
                    {
                      id: '4',
                      label: 'Processing Fee',
                      amount: transaction.metadata.processingFee,
                    },
                  ]}
                  subtotal={transaction.amount / 1.2}
                  total={transaction.amount}
                  currency="£"
                />
              </div>
            </MotionDiv>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contractor Info */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contractor Info</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="font-medium text-gray-900">{transaction.contractor.name || 'Not available'}</p>
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
                    className="font-medium text-teal-600 hover:text-teal-700 flex items-center gap-2 break-all"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    {transaction.contractor.email}
                  </a>
                </div>

                {transaction.contractor.phone && (
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
                )}

                {transaction.contractor.id !== 'unknown' && (
                  <button
                    onClick={() => router.push(`/contractors/${transaction.contractor.id}`)}
                    className="w-full mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    View Profile
                  </button>
                )}
              </div>
            </MotionDiv>

            {/* Actions */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>

              <div className="space-y-3">
                <button
                  onClick={handleDownloadInvoice}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice
                </button>

                {transaction.refundable && transaction.status === 'completed' && (
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Request Refund
                  </button>
                )}
              </div>
            </MotionDiv>
          </div>
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
    </>
  );
}
