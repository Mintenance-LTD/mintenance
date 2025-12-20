'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Eye,
  Download,
  Filter,
  Search,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
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

interface Assessment {
  id: string;
  propertyAddress: string;
  propertyType: string;
  jobTitle: string;
  requestedBy: string;
  contractor: string;
  status: 'pending' | 'in_progress' | 'completed' | 'flagged';
  priority: 'low' | 'medium' | 'high' | 'critical';
  detectedIssues: number;
  confidence: number;
  submittedDate: string;
  completedDate?: string;
  aiScore: number;
}

export default function AdminBuildingAssessments2025() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const assessmentStats = {
    total: 342,
    pending: 28,
    inProgress: 15,
    completed: 287,
    flagged: 12,
    averageScore: 87.3,
    criticalIssues: 5,
  };

  const assessments: Assessment[] = [
    {
      id: 'ASS-001',
      propertyAddress: '123 Oak Street, London, SW1A 1AA',
      propertyType: 'Detached House',
      jobTitle: 'Kitchen Renovation Safety Check',
      requestedBy: 'Sarah Johnson',
      contractor: 'Elite Builders Ltd',
      status: 'flagged',
      priority: 'critical',
      detectedIssues: 8,
      confidence: 94.5,
      submittedDate: '2025-01-28',
      aiScore: 45,
    },
    {
      id: 'ASS-002',
      propertyAddress: '456 Elm Avenue, Manchester, M1 1AD',
      propertyType: 'Semi-Detached',
      jobTitle: 'Electrical System Upgrade',
      requestedBy: 'Michael Brown',
      contractor: 'PowerTech Electrical',
      status: 'in_progress',
      priority: 'high',
      detectedIssues: 3,
      confidence: 89.2,
      submittedDate: '2025-01-27',
      aiScore: 78,
    },
    {
      id: 'ASS-003',
      propertyAddress: '789 Pine Road, Birmingham, B1 1BB',
      propertyType: 'Apartment',
      jobTitle: 'Bathroom Remodel Assessment',
      requestedBy: 'Emma Wilson',
      contractor: 'Modern Homes Co',
      status: 'completed',
      priority: 'medium',
      detectedIssues: 1,
      confidence: 96.7,
      submittedDate: '2025-01-26',
      completedDate: '2025-01-27',
      aiScore: 92,
    },
    {
      id: 'ASS-004',
      propertyAddress: '321 Maple Drive, Leeds, LS1 1AB',
      propertyType: 'Terraced House',
      jobTitle: 'Roof Repair Inspection',
      requestedBy: 'David Lee',
      contractor: 'Apex Roofing',
      status: 'pending',
      priority: 'high',
      detectedIssues: 5,
      confidence: 91.3,
      submittedDate: '2025-01-28',
      aiScore: 65,
    },
    {
      id: 'ASS-005',
      propertyAddress: '654 Birch Lane, Liverpool, L1 1AA',
      propertyType: 'Detached House',
      jobTitle: 'General Property Survey',
      requestedBy: 'Lisa Anderson',
      contractor: 'Complete Construction',
      status: 'completed',
      priority: 'low',
      detectedIssues: 0,
      confidence: 98.1,
      submittedDate: '2025-01-25',
      completedDate: '2025-01-26',
      aiScore: 95,
    },
  ];

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      const matchesStatus = selectedStatus === 'all' || assessment.status === selectedStatus;
      const matchesPriority = selectedPriority === 'all' || assessment.priority === selectedPriority;
      const matchesSearch =
        searchQuery === '' ||
        assessment.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [assessments, selectedStatus, selectedPriority, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'flagged':
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
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'flagged':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-emerald-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-emerald-600';
    return 'text-red-600';
  };

  const handleViewAssessment = (id: string) => {
    toast.success(`Opening assessment ${id}`);
  };

  const handleExport = () => {
    toast.success('Assessment report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Shield className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Building Assessments</h1>
              </div>
              <p className="text-purple-100 text-lg">
                AI-powered safety and compliance monitoring
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export Report
            </MotionButton>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Total</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.total}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-200" />
                <p className="text-purple-100 text-sm">Pending</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.pending}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-200" />
                <p className="text-purple-100 text-sm">In Progress</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.inProgress}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <p className="text-purple-100 text-sm">Completed</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.completed}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-200" />
                <p className="text-purple-100 text-sm">Flagged</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.flagged}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Avg Score</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.averageScore}%</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-200" />
                <p className="text-purple-100 text-sm">Critical</p>
              </div>
              <p className="text-3xl font-bold">{assessmentStats.criticalIssues}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="flagged">Flagged</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
              <Filter className="w-5 h-5" />
              More Filters
            </button>
          </div>
        </MotionDiv>

        {/* Assessments Grid */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-6"
        >
          {filteredAssessments.map((assessment, index) => (
            <MotionDiv
              key={assessment.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{assessment.jobTitle}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(assessment.priority)}`}>
                      {assessment.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(assessment.status)}`}>
                      {getStatusIcon(assessment.status)}
                      {assessment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{assessment.propertyAddress}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{assessment.propertyType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">AI Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(assessment.aiScore)}`}>
                      {assessment.aiScore}%
                    </p>
                  </div>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleViewAssessment(assessment.id)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </MotionButton>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Assessment ID</p>
                  <p className="font-medium text-gray-900">{assessment.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requested By</p>
                  <p className="font-medium text-gray-900">{assessment.requestedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contractor</p>
                  <p className="font-medium text-gray-900">{assessment.contractor}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Issues Detected</p>
                  <p className={`font-medium ${assessment.detectedIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {assessment.detectedIssues} {assessment.detectedIssues === 1 ? 'issue' : 'issues'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">AI Confidence</p>
                  <p className="font-medium text-gray-900">{assessment.confidence}%</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Submitted: {assessment.submittedDate}</span>
                </div>
                {assessment.completedDate && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Completed: {assessment.completedDate}</span>
                  </div>
                )}
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredAssessments.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No assessments found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
