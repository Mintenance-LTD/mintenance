'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Plus,
  Edit,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  DollarSign,
  Phone,
  Mail,
  Clock,
  X,
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

interface Insurance {
  id: string;
  type: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premium: number;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired';
  documentUrl?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface License {
  id: string;
  name: string;
  number: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  status: 'active' | 'expiring_soon' | 'expired';
  documentUrl?: string;
}

export default function InsuranceLicensingPage2025() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'insurance' | 'licenses'>('insurance');
  const [showAddModal, setShowAddModal] = useState(false);

  const [insurances, setInsurances] = useState<Insurance[]>([
    {
      id: '1',
      type: 'Public Liability Insurance',
      provider: 'Simply Business',
      policyNumber: 'PL123456789',
      coverageAmount: 5000000,
      premium: 1200,
      startDate: '2024-04-01',
      expiryDate: '2025-03-31',
      status: 'active',
      documentUrl: '/insurance/public-liability.pdf',
      contactName: 'Claims Department',
      contactPhone: '0800 123 4567',
      contactEmail: 'claims@simplybusiness.co.uk',
    },
    {
      id: '2',
      type: 'Professional Indemnity Insurance',
      provider: 'AXA',
      policyNumber: 'PI987654321',
      coverageAmount: 2000000,
      premium: 850,
      startDate: '2024-06-15',
      expiryDate: '2025-06-14',
      status: 'active',
      documentUrl: '/insurance/professional-indemnity.pdf',
      contactName: 'John Williams',
      contactPhone: '0800 987 6543',
      contactEmail: 'support@axa.co.uk',
    },
    {
      id: '3',
      type: 'Employers Liability Insurance',
      provider: 'Zurich',
      policyNumber: 'EL456123789',
      coverageAmount: 10000000,
      premium: 680,
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      status: 'expired',
      documentUrl: '/insurance/employers-liability.pdf',
      contactName: 'Support Team',
      contactPhone: '0345 600 5000',
      contactEmail: 'contact@zurich.co.uk',
    },
    {
      id: '4',
      type: 'Tools & Equipment Insurance',
      provider: 'Tradesman Saver',
      policyNumber: 'TE789321456',
      coverageAmount: 25000,
      premium: 420,
      startDate: '2024-09-01',
      expiryDate: '2025-08-31',
      status: 'active',
      documentUrl: '/insurance/tools-equipment.pdf',
    },
  ]);

  const [licenses, setLicenses] = useState<License[]>([
    {
      id: '1',
      name: 'Gas Safe Register',
      number: 'GS123456',
      issuer: 'Gas Safe Register',
      issueDate: '2020-01-15',
      expiryDate: '2026-01-15',
      status: 'active',
      documentUrl: '/licenses/gas-safe.pdf',
    },
    {
      id: '2',
      name: 'NICEIC Approved Contractor',
      number: 'NC987654',
      issuer: 'NICEIC',
      issueDate: '2019-06-01',
      status: 'active',
      documentUrl: '/licenses/niceic.pdf',
    },
    {
      id: '3',
      name: 'Construction Skills Certification Scheme (CSCS)',
      number: 'CSCS456789',
      issuer: 'CSCS',
      issueDate: '2023-03-10',
      expiryDate: '2028-03-10',
      status: 'active',
      documentUrl: '/licenses/cscs.pdf',
    },
  ]);

  const getStatusColor = (status: 'active' | 'expiring_soon' | 'expired') => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const calculateDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalAnnualPremium = insurances
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + i.premium, 0);

  const totalCoverage = insurances
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + i.coverageAmount, 0);

  const expiringInsurances = insurances.filter((i) => i.status === 'expiring_soon').length;
  const expiringLicenses = licenses.filter((l) => l.status === 'expiring_soon').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 to-red-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Insurance & Licensing</h1>
              <p className="text-emerald-100">
                Manage your business insurance and professional licenses
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add {activeTab === 'insurance' ? 'Insurance' : 'License'}
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Coverage</p>
            <p className="text-2xl font-bold text-gray-900">
              £{(totalCoverage / 1000000).toFixed(1)}M
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-emerald-100 rounded-lg mb-4 w-fit">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Annual Premium</p>
            <p className="text-2xl font-bold text-gray-900">
              £{totalAnnualPremium.toLocaleString()}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Insurance Expiring</p>
            <p className="text-2xl font-bold text-gray-900">{expiringInsurances}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Active Licenses</p>
            <p className="text-2xl font-bold text-gray-900">
              {licenses.filter((l) => l.status === 'active').length}
            </p>
          </MotionDiv>
        </MotionDiv>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {['insurance', 'licenses'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 border-b-2 font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Insurance Tab */}
            {activeTab === 'insurance' && (
              <div className="space-y-6">
                {insurances.map((insurance) => {
                  const daysUntilExpiry = calculateDaysUntilExpiry(insurance.expiryDate);

                  return (
                    <MotionDiv
                      key={insurance.id}
                      variants={staggerItem}
                      className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <Shield className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-gray-900">
                                  {insurance.type}
                                </h3>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    insurance.status
                                  )}`}
                                >
                                  {insurance.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{insurance.provider}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Policy Number</p>
                              <p className="font-medium text-gray-900">
                                {insurance.policyNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Coverage</p>
                              <p className="font-medium text-gray-900">
                                £{insurance.coverageAmount.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Annual Premium</p>
                              <p className="font-medium text-gray-900">
                                £{insurance.premium.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Start Date</p>
                              <p className="font-medium text-gray-900">
                                {new Date(insurance.startDate).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                              <p className="font-medium text-gray-900">
                                {new Date(insurance.expiryDate).toLocaleDateString('en-GB')}
                                {daysUntilExpiry > 0 && daysUntilExpiry <= 90 && (
                                  <span className="ml-2 text-xs text-yellow-600">
                                    ({daysUntilExpiry} days)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {insurance.contactName && (
                            <div className="pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">Contact Information</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  {insurance.contactName}
                                </div>
                                {insurance.contactPhone && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {insurance.contactPhone}
                                  </div>
                                )}
                                {insurance.contactEmail && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {insurance.contactEmail}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {insurance.documentUrl && (
                            <button
                              onClick={() => toast.success('Downloading policy document...')}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => toast.success('Edit functionality coming soon')}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </MotionDiv>
                  );
                })}
              </div>
            )}

            {/* Licenses Tab */}
            {activeTab === 'licenses' && (
              <div className="space-y-6">
                {licenses.map((license) => {
                  const daysUntilExpiry = license.expiryDate
                    ? calculateDaysUntilExpiry(license.expiryDate)
                    : null;

                  return (
                    <MotionDiv
                      key={license.id}
                      variants={staggerItem}
                      className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-gray-900">{license.name}</h3>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    license.status
                                  )}`}
                                >
                                  {license.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{license.issuer}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">License Number</p>
                              <p className="font-medium text-gray-900">{license.number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Issue Date</p>
                              <p className="font-medium text-gray-900">
                                {new Date(license.issueDate).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                            {license.expiryDate && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                                <p className="font-medium text-gray-900">
                                  {new Date(license.expiryDate).toLocaleDateString('en-GB')}
                                  {daysUntilExpiry !== null &&
                                    daysUntilExpiry > 0 &&
                                    daysUntilExpiry <= 90 && (
                                      <span className="ml-2 text-xs text-yellow-600">
                                        ({daysUntilExpiry} days)
                                      </span>
                                    )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {license.documentUrl && (
                            <button
                              onClick={() => toast.success('Downloading license document...')}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => toast.success('Edit functionality coming soon')}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </MotionDiv>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add {activeTab === 'insurance' ? 'Insurance' : 'License'}
            </h3>
            <p className="text-gray-600 mb-6">Form would go here...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success(
                    `${activeTab === 'insurance' ? 'Insurance' : 'License'} added`
                  );
                  setShowAddModal(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
