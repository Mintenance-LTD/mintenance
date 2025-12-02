'use client';

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Bell,
  Mail,
  Filter,
  Search,
  Eye,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  BarChart3,
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

interface Communication {
  id: string;
  type: 'email' | 'notification' | 'announcement' | 'alert';
  subject: string;
  message: string;
  recipients: string;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sentBy: string;
  sentDate?: string;
  scheduledDate?: string;
  openRate?: number;
  clickRate?: number;
}

export default function AdminCommunications2025() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  // Mock data - replace with actual API calls
  const commStats = {
    totalSent: 1842,
    pending: 23,
    averageOpenRate: 68.5,
    averageClickRate: 24.3,
    activeUsers: 775,
    engagementRate: 82.1,
  };

  const communications: Communication[] = [
    {
      id: 'COMM-001',
      type: 'announcement',
      subject: 'New Platform Features Released',
      message: 'We are excited to announce new features including AI-powered matching...',
      recipients: 'All Users',
      recipientCount: 775,
      status: 'sent',
      sentBy: 'Admin',
      sentDate: '2025-01-28 10:30',
      openRate: 72.5,
      clickRate: 28.3,
    },
    {
      id: 'COMM-002',
      type: 'email',
      subject: 'Payment Processing Update',
      message: 'Important update regarding payment processing times...',
      recipients: 'All Contractors',
      recipientCount: 342,
      status: 'sent',
      sentBy: 'Admin',
      sentDate: '2025-01-27 14:15',
      openRate: 85.2,
      clickRate: 35.7,
    },
    {
      id: 'COMM-003',
      type: 'notification',
      subject: 'System Maintenance Scheduled',
      message: 'Scheduled maintenance window on Sunday 2nd February...',
      recipients: 'All Users',
      recipientCount: 775,
      status: 'scheduled',
      sentBy: 'System',
      scheduledDate: '2025-02-01 09:00',
    },
    {
      id: 'COMM-004',
      type: 'alert',
      subject: 'Security Update Required',
      message: 'Please update your password to meet new security requirements...',
      recipients: 'Users without 2FA',
      recipientCount: 128,
      status: 'sent',
      sentBy: 'Security Team',
      sentDate: '2025-01-26 11:00',
      openRate: 91.4,
      clickRate: 67.2,
    },
    {
      id: 'COMM-005',
      type: 'email',
      subject: 'Monthly Platform Newsletter',
      message: 'Your monthly roundup of platform updates and success stories...',
      recipients: 'All Users',
      recipientCount: 775,
      status: 'draft',
      sentBy: 'Marketing',
    },
  ];

  const filteredCommunications = useMemo(() => {
    return communications.filter((comm) => {
      const matchesType = selectedType === 'all' || comm.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || comm.status === selectedStatus;
      const matchesSearch =
        searchQuery === '' ||
        comm.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comm.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comm.recipients.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [communications, selectedType, selectedStatus, searchQuery]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'notification':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'announcement':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'alert':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'notification':
        return <Bell className="w-4 h-4" />;
      case 'announcement':
        return <MessageSquare className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4" />;
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const handleNewMessage = () => {
    setShowComposer(true);
  };

  const handleView = (id: string) => {
    toast.success(`Viewing communication ${id}`);
  };

  const handleDelete = (id: string) => {
    toast.success(`Communication ${id} deleted`);
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
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Communications Center</h1>
              </div>
              <p className="text-purple-100 text-lg">
                Manage platform-wide messaging and notifications
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewMessage}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              New Message
            </MotionButton>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Total Sent</p>
              </div>
              <p className="text-3xl font-bold">{commStats.totalSent.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-200" />
                <p className="text-purple-100 text-sm">Pending</p>
              </div>
              <p className="text-3xl font-bold">{commStats.pending}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-blue-200" />
                <p className="text-purple-100 text-sm">Avg Open Rate</p>
              </div>
              <p className="text-3xl font-bold">{commStats.averageOpenRate}%</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-200" />
                <p className="text-purple-100 text-sm">Avg Click Rate</p>
              </div>
              <p className="text-3xl font-bold">{commStats.averageClickRate}%</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Active Users</p>
              </div>
              <p className="text-3xl font-bold">{commStats.activeUsers}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-emerald-200" />
                <p className="text-purple-100 text-sm">Engagement</p>
              </div>
              <p className="text-3xl font-bold">{commStats.engagementRate}%</p>
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
                placeholder="Search communications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="notification">Notification</option>
              <option value="announcement">Announcement</option>
              <option value="alert">Alert</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>

            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
              <Filter className="w-5 h-5" />
              More Filters
            </button>
          </div>
        </MotionDiv>

        {/* Communications List */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {filteredCommunications.map((comm) => (
            <MotionDiv
              key={comm.id}
              variants={staggerItem}
              whileHover={{ y: -2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getTypeColor(comm.type)}`}>
                      {getTypeIcon(comm.type)}
                      {comm.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(comm.status)}`}>
                      {getStatusIcon(comm.status)}
                      {comm.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {comm.recipientCount.toLocaleString()} recipients
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{comm.subject}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{comm.message}</p>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>To: {comm.recipients}</span>
                    </div>
                    {comm.sentDate && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Sent: {comm.sentDate}</span>
                      </div>
                    )}
                    {comm.scheduledDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Scheduled: {comm.scheduledDate}</span>
                      </div>
                    )}
                  </div>

                  {comm.status === 'sent' && comm.openRate !== undefined && (
                    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-gray-600">
                          Open Rate: <span className="font-semibold text-purple-600">{comm.openRate}%</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-gray-600">
                          Click Rate: <span className="font-semibold text-emerald-600">{comm.clickRate}%</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleView(comm.id)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </MotionButton>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </MotionButton>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(comm.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </MotionButton>
                </div>
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredCommunications.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No communications found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewMessage}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Create New Message
            </MotionButton>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
