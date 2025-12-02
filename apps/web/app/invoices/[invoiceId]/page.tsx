'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  jobId?: string;
  jobTitle?: string;
  contractor: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
    address: string;
    taxId?: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  paymentMethod?: {
    type: string;
    last4: string;
  };
}

export default function InvoiceDetailPage2025() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  // Mock invoice data
  const [invoice] = useState<Invoice>({
    id: invoiceId,
    number: 'INV-2025-001234',
    status: 'paid',
    issueDate: '2025-01-15',
    dueDate: '2025-02-14',
    paidDate: '2025-01-28',
    subtotal: 2450.00,
    tax: 490.00,
    total: 2940.00,
    amountPaid: 2940.00,
    amountDue: 0,
    currency: 'GBP',
    jobId: 'job_123',
    jobTitle: 'Kitchen Renovation',
    contractor: {
      id: 'contractor_456',
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+44 7700 900123',
      company: 'Smith Construction Ltd',
      address: '123 Builder Street, London, SW1A 1AA',
      taxId: 'GB123456789',
    },
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      phone: '+44 7700 900456',
      address: '45 Customer Road, London, W1A 1AB',
    },
    items: [
      {
        id: '1',
        description: 'Kitchen Cabinet Installation',
        quantity: 1,
        unitPrice: 1200.00,
        total: 1200.00,
      },
      {
        id: '2',
        description: 'Countertop Installation (Granite)',
        quantity: 1,
        unitPrice: 850.00,
        total: 850.00,
      },
      {
        id: '3',
        description: 'Plumbing Work',
        quantity: 8,
        unitPrice: 50.00,
        total: 400.00,
      },
    ],
    notes: 'Thank you for your business! Payment is due within 30 days of the invoice date.',
    terms: 'Net 30. Late payments may incur a 2% monthly finance charge.',
    paymentMethod: {
      type: 'Visa',
      last4: '4242',
    },
  });

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'sent':
      case 'viewed':
        return <Clock className="w-6 h-6 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-gray-500" />;
      case 'draft':
        return <FileText className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleDownload = () => {
    toast.success('Downloading invoice...');
    // Download logic here
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    toast.success('Invoice sent to your email');
  };

  const handlePayNow = () => {
    router.push(`/payments/invoice/${invoice.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-white border-b border-gray-200 print:hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Invoice {invoice.number}
              </h1>
              <div className="flex items-center gap-3">
                {getStatusIcon(invoice.status)}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                    invoice.status
                  )}`}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
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
              <button
                onClick={handleSendEmail}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                Email
              </button>
              {invoice.amountDue > 0 && (
                <button
                  onClick={handlePayNow}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Invoice Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 sm:p-12"
        >
          {/* Invoice Header */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row justify-between gap-8 mb-8">
              {/* Contractor Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {invoice.contractor.company || invoice.contractor.name}
                </h2>
                <div className="space-y-1 text-gray-600">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {invoice.contractor.address}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {invoice.contractor.email}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {invoice.contractor.phone}
                  </p>
                  {invoice.contractor.taxId && (
                    <p className="text-sm">VAT No: {invoice.contractor.taxId}</p>
                  )}
                </div>
              </div>

              {/* Invoice Info */}
              <div className="text-right">
                <h3 className="text-4xl font-bold text-teal-600 mb-4">INVOICE</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Invoice Number:</span>
                    <p className="font-semibold text-gray-900">{invoice.number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Issue Date:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(invoice.issueDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  {invoice.paidDate && (
                    <div>
                      <span className="text-gray-600">Paid Date:</span>
                      <p className="font-semibold text-green-600">
                        {new Date(invoice.paidDate).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">BILL TO</h4>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{invoice.customer.name}</p>
                <p className="text-gray-600">{invoice.customer.address}</p>
                <p className="text-gray-600">{invoice.customer.email}</p>
                <p className="text-gray-600">{invoice.customer.phone}</p>
              </div>
            </div>

            {/* Job Reference */}
            {invoice.jobId && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>Job Reference:</span>
                <button
                  onClick={() => router.push(`/jobs/${invoice.jobId}`)}
                  className="font-medium text-teal-600 hover:text-teal-700"
                >
                  {invoice.jobTitle}
                </button>
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-4 px-2 text-gray-900">{item.description}</td>
                    <td className="py-4 px-2 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-4 px-2 text-right text-gray-900">
                      £{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-4 px-2 text-right font-medium text-gray-900">
                      £{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-80 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">£{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT (20%):</span>
                <span className="font-medium">£{invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t-2 border-gray-300">
                <span>Total:</span>
                <span className="text-teal-600">£{invoice.total.toFixed(2)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Amount Paid:</span>
                    <span className="font-medium text-green-600">
                      -£{invoice.amountPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Amount Due:</span>
                    <span className={invoice.amountDue > 0 ? 'text-red-600' : 'text-green-600'}>
                      £{invoice.amountDue.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Info */}
          {invoice.paymentMethod && invoice.paidDate && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Payment Received</span>
              </div>
              <p className="text-sm text-green-700">
                Paid on {new Date(invoice.paidDate).toLocaleDateString('en-GB')} via{' '}
                {invoice.paymentMethod.type} ending in {invoice.paymentMethod.last4}
              </p>
            </div>
          )}

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="space-y-6 pt-8 border-t border-gray-200">
              {invoice.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 text-sm">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h4>
                  <p className="text-gray-600 text-sm">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>This invoice was generated by Mintenance</p>
            <p className="mt-1">
              For questions about this invoice, please contact {invoice.contractor.email}
            </p>
          </div>
        </MotionDiv>

        {/* Action Card (print hidden) */}
        {invoice.amountDue > 0 && (
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mt-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-6 print:hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Outstanding Balance
                </h3>
                <p className="text-2xl font-bold text-teal-600">
                  £{invoice.amountDue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Due by {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                </p>
              </div>
              <button
                onClick={handlePayNow}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                <CreditCard className="w-5 h-5" />
                Pay Now
              </button>
            </div>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
