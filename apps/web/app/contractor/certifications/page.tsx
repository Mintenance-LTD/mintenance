'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Shield,
  BookOpen,
  TrendingUp,
  FileText,
  X,
  Search,
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

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  documentUrl?: string;
  status: 'active' | 'expiring_soon' | 'expired';
  verified: boolean;
  category: string;
}

interface Training {
  id: string;
  courseName: string;
  provider: string;
  completionDate: string;
  hours: number;
  certificateUrl?: string;
  category: string;
  skills: string[];
}

export default function CertificationsPage2025() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'certifications' | 'training'>('certifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [certifications, setCertifications] = useState<Certification[]>([
    {
      id: '1',
      name: 'Gas Safe Registered',
      issuer: 'Gas Safe Register',
      issueDate: '2020-01-15',
      expiryDate: '2026-01-15',
      credentialId: 'GS123456789',
      documentUrl: '/certs/gas-safe.pdf',
      status: 'active',
      verified: true,
      category: 'safety',
    },
    {
      id: '2',
      name: 'NICEIC Approved Contractor',
      issuer: 'NICEIC',
      issueDate: '2019-06-01',
      credentialId: 'NC987654321',
      documentUrl: '/certs/niceic.pdf',
      status: 'active',
      verified: true,
      category: 'electrical',
    },
    {
      id: '3',
      name: 'City & Guilds Level 3 Plumbing',
      issuer: 'City & Guilds',
      issueDate: '2008-09-01',
      credentialId: 'CG2025-123',
      documentUrl: '/certs/plumbing.pdf',
      status: 'active',
      verified: true,
      category: 'plumbing',
    },
    {
      id: '4',
      name: 'First Aid at Work',
      issuer: 'St John Ambulance',
      issueDate: '2023-03-15',
      expiryDate: '2026-03-15',
      documentUrl: '/certs/first-aid.pdf',
      status: 'active',
      verified: false,
      category: 'safety',
    },
    {
      id: '5',
      name: 'Asbestos Awareness',
      issuer: 'UKATA',
      issueDate: '2022-11-10',
      expiryDate: '2025-11-10',
      status: 'expiring_soon',
      verified: true,
      category: 'safety',
    },
  ]);

  const [training, setTraining] = useState<Training[]>([
    {
      id: '1',
      courseName: 'Advanced Kitchen Installation Techniques',
      provider: 'BMF Training',
      completionDate: '2024-08-15',
      hours: 16,
      certificateUrl: '/certs/kitchen-training.pdf',
      category: 'kitchen',
      skills: ['Cabinet Installation', 'Worktop Fitting', 'Design Principles'],
    },
    {
      id: '2',
      courseName: 'Smart Home Technology Integration',
      provider: 'ECA Training',
      completionDate: '2024-05-20',
      hours: 8,
      certificateUrl: '/certs/smart-home.pdf',
      category: 'electrical',
      skills: ['Smart Lighting', 'Home Automation', 'IoT Systems'],
    },
    {
      id: '3',
      courseName: 'Modern Heating Systems',
      provider: 'CIPHE',
      completionDate: '2024-02-10',
      hours: 12,
      category: 'plumbing',
      skills: ['Heat Pumps', 'Underfloor Heating', 'System Balancing'],
    },
  ]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'safety', label: 'Health & Safety' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'general', label: 'General' },
  ];

  const getStatusColor = (status: Certification['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIcon = (status: Certification['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expiring_soon':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'expired':
        return <X className="w-5 h-5 text-red-600" />;
    }
  };

  const calculateDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDeleteCertification = (id: string, name: string) => {
    if (confirm(`Delete certification "${name}"?`)) {
      setCertifications(certifications.filter((c) => c.id !== id));
      toast.success('Certification deleted');
    }
  };

  const handleDeleteTraining = (id: string, name: string) => {
    if (confirm(`Delete training "${name}"?`)) {
      setTraining(training.filter((t) => t.id !== id));
      toast.success('Training deleted');
    }
  };

  const filteredCertifications = certifications.filter((cert) => {
    const matchesSearch =
      searchQuery === '' ||
      cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || cert.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const filteredTraining = training.filter((train) => {
    const matchesSearch =
      searchQuery === '' ||
      train.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || train.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalCertifications: certifications.length,
    activeCertifications: certifications.filter((c) => c.status === 'active').length,
    expiringSoon: certifications.filter((c) => c.status === 'expiring_soon').length,
    totalTraining: training.length,
    totalHours: training.reduce((sum, t) => sum + t.hours, 0),
  };

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
              <h1 className="text-4xl font-bold mb-2">Training & Certifications</h1>
              <p className="text-emerald-100">
                Manage your professional qualifications and training
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add {activeTab === 'certifications' ? 'Certification' : 'Training'}
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-emerald-100 rounded-lg mb-4 w-fit">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Certifications</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCertifications}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeCertifications}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
            <p className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Training Courses</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTraining}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-purple-100 rounded-lg mb-4 w-fit">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Training Hours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalHours}h</p>
          </MotionDiv>
        </MotionDiv>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {['certifications', 'training'].map((tab) => (
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
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence mode="wait">
              {/* Certifications Tab */}
              {activeTab === 'certifications' && (
                <MotionDiv
                  key="certifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {filteredCertifications.map((cert) => {
                    const daysUntilExpiry = calculateDaysUntilExpiry(cert.expiryDate);

                    return (
                      <div
                        key={cert.id}
                        className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="p-2 bg-white rounded-lg border border-gray-200">
                                <Shield className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                                  {cert.verified && (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  )}
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                      cert.status
                                    )}`}
                                  >
                                    {cert.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{cert.issuer}</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                                  <div>
                                    <span className="text-gray-500">Issue Date: </span>
                                    <span className="font-medium text-gray-900">
                                      {new Date(cert.issueDate).toLocaleDateString('en-GB')}
                                    </span>
                                  </div>
                                  {cert.expiryDate && (
                                    <div>
                                      <span className="text-gray-500">Expiry Date: </span>
                                      <span className="font-medium text-gray-900">
                                        {new Date(cert.expiryDate).toLocaleDateString('en-GB')}
                                      </span>
                                      {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({daysUntilExpiry} days)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {cert.credentialId && (
                                    <div className="sm:col-span-2">
                                      <span className="text-gray-500">Credential ID: </span>
                                      <span className="font-medium text-gray-900">
                                        {cert.credentialId}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {cert.documentUrl && (
                              <button
                                onClick={() => toast.success('Downloading certificate...')}
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
                            <button
                              onClick={() => handleDeleteCertification(cert.id, cert.name)}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredCertifications.length === 0 && (
                    <div className="text-center py-12">
                      <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No certifications found
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {searchQuery || selectedCategory !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Add your first certification to get started'}
                      </p>
                    </div>
                  )}
                </MotionDiv>
              )}

              {/* Training Tab */}
              {activeTab === 'training' && (
                <MotionDiv
                  key="training"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {filteredTraining.map((train) => (
                    <div
                      key={train.id}
                      className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg border border-gray-200">
                              <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">
                                {train.courseName}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">{train.provider}</p>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Completed{' '}
                                    {new Date(train.completionDate).toLocaleDateString('en-GB')}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {train.hours} hours
                                  </span>
                                </div>
                              </div>

                              {train.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {train.skills.map((skill, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {train.certificateUrl && (
                            <button
                              onClick={() => toast.success('Downloading certificate...')}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              <Download className="w-4 h-4" />
                              Certificate
                            </button>
                          )}
                          <button
                            onClick={() => toast.success('Edit functionality coming soon')}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTraining(train.id, train.courseName)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredTraining.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No training found
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {searchQuery || selectedCategory !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Add your first training record to get started'}
                      </p>
                    </div>
                  )}
                </MotionDiv>
              )}
            </AnimatePresence>
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
              Add {activeTab === 'certifications' ? 'Certification' : 'Training'}
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
                    `${activeTab === 'certifications' ? 'Certification' : 'Training'} added`
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
