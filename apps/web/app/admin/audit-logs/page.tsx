'use client';

import { useState } from 'react';
import {
  Shield,
  Search,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Settings,
  CreditCard,
  FileText,
  Calendar,
  Clock,
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
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: 'success' | 'failure' | 'warning';
  ipAddress: string;
  userAgent: string;
  details?: string;
}

export default function AuditLogsPage2025() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateRange, setDateRange] = useState('7days');

  const [logs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2025-01-29T14:30:00Z',
      user: 'admin@mintenance.com',
      userId: 'admin_001',
      action: 'UPDATE_SETTINGS',
      resource: 'System Settings',
      resourceId: 'settings_general',
      status: 'success',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      details: 'Updated maintenance mode setting',
    },
    {
      id: '2',
      timestamp: '2025-01-29T14:15:00Z',
      user: 'support@mintenance.com',
      userId: 'admin_002',
      action: 'VIEW_USER',
      resource: 'User Profile',
      resourceId: 'user_12345',
      status: 'success',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0...',
      details: 'Viewed user profile for support ticket',
    },
    {
      id: '3',
      timestamp: '2025-01-29T14:00:00Z',
      user: 'admin@mintenance.com',
      userId: 'admin_001',
      action: 'DELETE_USER',
      resource: 'User Account',
      resourceId: 'user_99999',
      status: 'warning',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      details: 'Deleted spam account',
    },
    {
      id: '4',
      timestamp: '2025-01-29T13:45:00Z',
      user: 'finance@mintenance.com',
      userId: 'admin_003',
      action: 'REFUND_PAYMENT',
      resource: 'Payment',
      resourceId: 'payment_56789',
      status: 'success',
      ipAddress: '192.168.1.3',
      userAgent: 'Mozilla/5.0...',
      details: 'Processed refund of £450.00',
    },
    {
      id: '5',
      timestamp: '2025-01-29T13:30:00Z',
      user: 'unknown',
      userId: 'unknown',
      action: 'LOGIN_FAILED',
      resource: 'Authentication',
      status: 'failure',
      ipAddress: '203.0.113.45',
      userAgent: 'Mozilla/5.0...',
      details: 'Multiple failed login attempts detected',
    },
    {
      id: '6',
      timestamp: '2025-01-29T13:15:00Z',
      user: 'admin@mintenance.com',
      userId: 'admin_001',
      action: 'UPDATE_CONTRACTOR',
      resource: 'Contractor Profile',
      resourceId: 'contractor_789',
      status: 'success',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      details: 'Verified contractor certification',
    },
    {
      id: '7',
      timestamp: '2025-01-29T13:00:00Z',
      user: 'support@mintenance.com',
      userId: 'admin_002',
      action: 'RESOLVE_DISPUTE',
      resource: 'Dispute',
      resourceId: 'dispute_123',
      status: 'success',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0...',
      details: 'Resolved dispute in favor of homeowner',
    },
    {
      id: '8',
      timestamp: '2025-01-29T12:45:00Z',
      user: 'admin@mintenance.com',
      userId: 'admin_001',
      action: 'UPDATE_SETTINGS',
      resource: 'Payment Settings',
      resourceId: 'settings_payments',
      status: 'success',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      details: 'Updated platform fee percentage',
    },
  ]);

  const actions = [
    { value: 'all', label: 'All Actions' },
    { value: 'LOGIN_FAILED', label: 'Failed Logins' },
    { value: 'UPDATE_SETTINGS', label: 'Settings Changes' },
    { value: 'DELETE_USER', label: 'User Deletions' },
    { value: 'REFUND_PAYMENT', label: 'Refunds' },
    { value: 'VIEW_USER', label: 'User Views' },
    { value: 'UPDATE_CONTRACTOR', label: 'Contractor Updates' },
  ];

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'success', label: 'Success' },
    { value: 'failure', label: 'Failure' },
    { value: 'warning', label: 'Warning' },
  ];

  const getStatusColor = (status: AuditLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: AuditLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('SETTINGS')) return <Settings className="w-5 h-5" />;
    if (action.includes('USER')) return <User className="w-5 h-5" />;
    if (action.includes('PAYMENT') || action.includes('REFUND')) return <CreditCard className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    const matchesUser = selectedUser === 'all' || log.userId === selectedUser;

    return matchesSearch && matchesAction && matchesStatus && matchesUser;
  });

  const handleExport = () => {
    toast.success('Exporting audit logs...');
  };

  const stats = {
    totalLogs: logs.length,
    successfulActions: logs.filter((l) => l.status === 'success').length,
    failures: logs.filter((l) => l.status === 'failure').length,
    warnings: logs.filter((l) => l.status === 'warning').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-10 h-10" />
                <h1 className="text-4xl font-bold">Audit Logs</h1>
              </div>
              <p className="text-purple-100">
                Monitor all system activities and administrative actions
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
              Export Logs
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Events</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Successful</p>
            <p className="text-2xl font-bold text-gray-900">{stats.successfulActions}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-red-100 rounded-lg mb-4 w-fit">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Failures</p>
            <p className="text-2xl font-bold text-gray-900">{stats.failures}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Warnings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.warnings}</p>
          </MotionDiv>
        </MotionDiv>

        {/* Filters */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {actions.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>
        </MotionDiv>

        {/* Logs Table */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {new Date(log.timestamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.user}</p>
                          <p className="text-xs text-gray-500">{log.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm text-gray-900">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.resource}</div>
                      {log.resourceId && (
                        <div className="text-xs text-gray-500 font-mono">{log.resourceId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            log.status
                          )}`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">{log.ipAddress}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No logs found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
