'use client';

import React, { useState } from 'react';
import { AreaChart } from '@tremor/react';
import {
  Home,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Plus,
  FileText,
  Wrench,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Job {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'posted' | 'cancelled';
  contractor?: string;
  amount: number;
  date: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  category: 'certificate' | 'invoice' | 'warranty' | 'inspection' | 'other';
}

export default function PropertyDetailPage2025() {
  const params = useParams();
  const propertyId = params.id;

  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'documents' | 'timeline'>('overview');

  // Mock property data - replace with actual API call
  const property = {
    id: propertyId,
    address: '123 Oak Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    type: 'Detached House',
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2500,
    yearBuilt: 1995,
    purchaseDate: '2020-03-15',
    purchasePrice: 450000,
    currentValue: 525000,
    images: [
      '/placeholder-property-1.jpg',
      '/placeholder-property-2.jpg',
      '/placeholder-property-3.jpg',
    ],
  };

  const jobs: Job[] = [
    {
      id: 'JOB-001',
      title: 'Kitchen Renovation',
      status: 'completed',
      contractor: 'Elite Builders Ltd',
      amount: 8500,
      date: '2024-12-15',
    },
    {
      id: 'JOB-002',
      title: 'Bathroom Remodel',
      status: 'in_progress',
      contractor: 'Modern Homes Co',
      amount: 5200,
      date: '2025-01-10',
    },
    {
      id: 'JOB-003',
      title: 'Roof Inspection',
      status: 'completed',
      contractor: 'Apex Roofing',
      amount: 450,
      date: '2024-11-20',
    },
    {
      id: 'JOB-004',
      title: 'Garden Landscaping',
      status: 'posted',
      amount: 3500,
      date: '2025-01-28',
    },
  ];

  const documents: Document[] = [
    {
      id: 'DOC-001',
      name: 'Gas Safety Certificate 2025',
      type: 'PDF',
      size: '2.4 MB',
      uploadDate: '2025-01-15',
      category: 'certificate',
    },
    {
      id: 'DOC-002',
      name: 'Kitchen Renovation Invoice',
      type: 'PDF',
      size: '1.8 MB',
      uploadDate: '2024-12-20',
      category: 'invoice',
    },
    {
      id: 'DOC-003',
      name: 'Boiler Warranty',
      type: 'PDF',
      size: '856 KB',
      uploadDate: '2024-10-05',
      category: 'warranty',
    },
    {
      id: 'DOC-004',
      name: 'Home Inspection Report',
      type: 'PDF',
      size: '4.2 MB',
      uploadDate: '2020-03-01',
      category: 'inspection',
    },
  ];

  const spendingByMonth = [
    { month: 'Jul', spending: 450 },
    { month: 'Aug', spending: 0 },
    { month: 'Sep', spending: 1200 },
    { month: 'Oct', spending: 850 },
    { month: 'Nov', spending: 450 },
    { month: 'Dec', spending: 8500 },
    { month: 'Jan', spending: 5200 },
  ];

  const totalSpent = jobs.reduce((sum, job) => sum + job.amount, 0);
  const completedJobs = jobs.filter((job) => job.status === 'completed').length;
  const activeJobs = jobs.filter((job) => job.status === 'in_progress').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'posted':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'posted':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'certificate':
        return 'bg-blue-100 text-blue-700';
      case 'invoice':
        return 'bg-purple-100 text-purple-700';
      case 'warranty':
        return 'bg-emerald-100 text-emerald-700';
      case 'inspection':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEdit = () => {
    toast.success('Edit property mode');
  };

  const handleDelete = () => {
    toast.error('Property deletion requested');
  };

  const handleUploadDocument = () => {
    toast.success('Document upload initiated');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Home className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">{property.address}</h1>
                  <div className="flex items-center gap-2 text-teal-100 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span>{property.city}, {property.postcode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEdit}
                className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
              >
                <Edit className="w-5 h-5" />
                Edit
              </MotionButton>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </MotionButton>
            </div>
          </div>

          {/* Property Stats */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Type</p>
              <p className="text-xl font-bold">{property.type}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Bedrooms</p>
              <p className="text-xl font-bold">{property.bedrooms}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Bathrooms</p>
              <p className="text-xl font-bold">{property.bathrooms}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Sq Ft</p>
              <p className="text-xl font-bold">{property.squareFeet.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Built</p>
              <p className="text-xl font-bold">{property.yearBuilt}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Value</p>
              <p className="text-xl font-bold">£{(property.currentValue / 1000).toFixed(0)}k</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-200" />
                <p className="text-teal-100 text-sm">Appreciation</p>
              </div>
              <p className="text-xl font-bold text-green-200">
                +{(((property.currentValue - property.purchasePrice) / property.purchasePrice) * 100).toFixed(1)}%
              </p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-8"
        >
          <div className="flex gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: Home },
              { id: 'jobs', label: 'Jobs', icon: Wrench },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'timeline', label: 'Timeline', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </MotionDiv>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-teal-100 p-3 rounded-xl">
                    <DollarSign className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">£{totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completed Jobs</p>
                    <p className="text-2xl font-bold text-gray-900">{completedJobs}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Jobs</p>
                    <p className="text-2xl font-bold text-gray-900">{activeJobs}</p>
                  </div>
                </div>
              </div>
            </MotionDiv>

            {/* Spending Chart */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Maintenance Spending</h2>
              <AreaChart
                data={spendingByMonth}
                index="month"
                categories={['spending']}
                colors={['teal']}
                valueFormatter={(value) => `£${value.toLocaleString()}`}
                showAnimation={true}
                showLegend={false}
                showGridLines={true}
                className="h-64"
              />
            </MotionDiv>

            {/* Property Images */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Property Images</h2>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </MotionButton>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {property.images.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                  >
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                ))}
              </div>
            </MotionDiv>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Property Jobs</h2>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Job
              </MotionButton>
            </div>

            <div className="space-y-4">
              {jobs.map((job) => (
                <MotionDiv
                  key={job.id}
                  whileHover={{ y: -2 }}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Job ID</p>
                          <p className="font-medium">{job.id}</p>
                        </div>
                        {job.contractor && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Contractor</p>
                            <p className="font-medium">{job.contractor}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Date</p>
                          <p className="font-medium">{job.date}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500 mb-1">Amount</p>
                      <p className="text-2xl font-bold text-teal-600">£{job.amount.toLocaleString()}</p>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Property Documents</h2>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUploadDocument}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </MotionButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <MotionDiv
                  key={doc.id}
                  whileHover={{ y: -2 }}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                        <p className="text-sm text-gray-500">{doc.type} • {doc.size}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                      {doc.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Uploaded: {doc.uploadDate}</span>
                    <div className="flex gap-2">
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </MotionButton>
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </MotionButton>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Timeline</h2>

            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              <div className="space-y-8">
                {[
                  {
                    date: '2025-01-28',
                    title: 'Garden Landscaping Job Posted',
                    description: 'New job posted, awaiting bids',
                    icon: Plus,
                    color: 'bg-yellow-100 text-yellow-600',
                  },
                  {
                    date: '2025-01-15',
                    title: 'Gas Safety Certificate Uploaded',
                    description: 'Annual gas safety certificate added to documents',
                    icon: FileText,
                    color: 'bg-blue-100 text-blue-600',
                  },
                  {
                    date: '2025-01-10',
                    title: 'Bathroom Remodel Started',
                    description: 'Work began with Modern Homes Co',
                    icon: Wrench,
                    color: 'bg-teal-100 text-teal-600',
                  },
                  {
                    date: '2024-12-15',
                    title: 'Kitchen Renovation Completed',
                    description: 'Successfully completed by Elite Builders Ltd',
                    icon: CheckCircle,
                    color: 'bg-green-100 text-green-600',
                  },
                  {
                    date: '2020-03-15',
                    title: 'Property Purchased',
                    description: `Purchased for £${property.purchasePrice.toLocaleString()}`,
                    icon: Home,
                    color: 'bg-purple-100 text-purple-600',
                  },
                ].map((event, index) => {
                  const Icon = event.icon;
                  return (
                    <div key={index} className="relative pl-12">
                      <div className={`absolute left-0 p-2 rounded-full ${event.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <span className="text-sm text-gray-500">{event.date}</span>
                        </div>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
