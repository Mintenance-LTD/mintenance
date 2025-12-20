'use client';

import React, { useState } from 'react';
import { AreaChart, BarChart } from '@tremor/react';
import {
  Shield,
  AlertTriangle,
  Lock,
  Eye,
  UserX,
  Activity,
  Clock,
  MapPin,
  Smartphone,
  Key,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingDown,
  Search,
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

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'password_reset' | 'suspicious_activity' | 'account_locked' | 'data_export';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user: string;
  email: string;
  ipAddress: string;
  location: string;
  device: string;
  timestamp: string;
  status: 'resolved' | 'investigating' | 'flagged';
  description: string;
}

export default function AdminSecurityDashboard2025() {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const securityStats = {
    totalEvents: 3847,
    criticalAlerts: 5,
    activeThreats: 2,
    blockedAttempts: 127,
    securityScore: 94.5,
    twoFactorEnabled: 68.2,
  };

  const eventsByDay = [
    { day: 'Mon', total: 542, threats: 18, blocked: 12 },
    { day: 'Tue', total: 489, threats: 15, blocked: 8 },
    { day: 'Wed', total: 612, threats: 22, blocked: 15 },
    { day: 'Thu', total: 578, threats: 19, blocked: 11 },
    { day: 'Fri', total: 634, threats: 25, blocked: 18 },
    { day: 'Sat', total: 501, threats: 14, blocked: 9 },
    { day: 'Sun', total: 491, threats: 14, blocked: 7 },
  ];

  const threatsByType = [
    { type: 'Failed Login', count: 45 },
    { type: 'Suspicious IP', count: 32 },
    { type: 'Brute Force', count: 18 },
    { type: 'Data Scraping', count: 12 },
    { type: 'SQL Injection', count: 8 },
    { type: 'XSS Attempt', count: 6 },
  ];

  const securityEvents: SecurityEvent[] = [
    {
      id: 'SEC-001',
      type: 'suspicious_activity',
      severity: 'critical',
      user: 'John Smith',
      email: 'john.smith@example.com',
      ipAddress: '192.168.1.100',
      location: 'Moscow, Russia',
      device: 'Unknown Browser',
      timestamp: '2025-01-29 03:45:22',
      status: 'flagged',
      description: 'Multiple failed login attempts from unusual location',
    },
    {
      id: 'SEC-002',
      type: 'account_locked',
      severity: 'high',
      user: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      ipAddress: '10.0.0.45',
      location: 'London, UK',
      device: 'Chrome on Windows',
      timestamp: '2025-01-29 02:15:18',
      status: 'investigating',
      description: 'Account locked after 5 failed password attempts',
    },
    {
      id: 'SEC-003',
      type: 'data_export',
      severity: 'medium',
      user: 'Michael Brown',
      email: 'michael.b@example.com',
      ipAddress: '172.16.0.10',
      location: 'Manchester, UK',
      device: 'Safari on MacOS',
      timestamp: '2025-01-29 01:30:45',
      status: 'resolved',
      description: 'Large data export request (GDPR compliance)',
    },
    {
      id: 'SEC-004',
      type: 'password_reset',
      severity: 'low',
      user: 'Emma Wilson',
      email: 'emma.w@example.com',
      ipAddress: '192.168.0.25',
      location: 'Birmingham, UK',
      device: 'Firefox on Linux',
      timestamp: '2025-01-29 00:45:12',
      status: 'resolved',
      description: 'Password reset requested and completed',
    },
    {
      id: 'SEC-005',
      type: 'login_attempt',
      severity: 'critical',
      user: 'David Lee',
      email: 'david.l@example.com',
      ipAddress: '203.0.113.0',
      location: 'Beijing, China',
      device: 'Unknown',
      timestamp: '2025-01-28 23:20:33',
      status: 'flagged',
      description: 'Login attempt from VPN/Proxy detected',
    },
  ];

  const filteredEvents = securityEvents.filter((event) => {
    const matchesSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;
    const matchesType = selectedType === 'all' || event.type === selectedType;
    const matchesSearch =
      searchQuery === '' ||
      event.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.ipAddress.includes(searchQuery) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesType && matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'investigating':
        return 'bg-blue-100 text-blue-700';
      case 'flagged':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login_attempt':
        return <Key className="w-4 h-4" />;
      case 'password_reset':
        return <Lock className="w-4 h-4" />;
      case 'suspicious_activity':
        return <AlertTriangle className="w-4 h-4" />;
      case 'account_locked':
        return <UserX className="w-4 h-4" />;
      case 'data_export':
        return <Eye className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const handleInvestigate = (id: string) => {
    toast.success(`Opening investigation for ${id}`);
  };

  const handleResolve = (id: string) => {
    toast.success(`Event ${id} marked as resolved`);
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
                <h1 className="text-4xl font-bold">Security Dashboard</h1>
              </div>
              <p className="text-purple-100 text-lg">
                Real-time security monitoring and threat detection
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-purple-200 mb-2">Security Score</p>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{securityStats.securityScore}</p>
                    <p className="text-xs text-purple-200">/ 100</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    <span className="text-sm">Excellent</span>
                  </div>
                  <p className="text-xs text-purple-200">Last updated: Now</p>
                </div>
              </div>
            </div>
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
                <Activity className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Total Events</p>
              </div>
              <p className="text-3xl font-bold">{securityStats.totalEvents.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-red-400"
            >
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-200" />
                <p className="text-purple-100 text-sm">Critical</p>
              </div>
              <p className="text-3xl font-bold text-red-200">{securityStats.criticalAlerts}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border-2 border-emerald-400"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-emerald-200" />
                <p className="text-purple-100 text-sm">Active Threats</p>
              </div>
              <p className="text-3xl font-bold text-emerald-200">{securityStats.activeThreats}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-5 h-5 text-green-200" />
                <p className="text-purple-100 text-sm">Blocked</p>
              </div>
              <p className="text-3xl font-bold">{securityStats.blockedAttempts}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">2FA Enabled</p>
              </div>
              <p className="text-3xl font-bold">{securityStats.twoFactorEnabled}%</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-green-200" />
                <p className="text-purple-100 text-sm">Trend</p>
              </div>
              <p className="text-3xl font-bold text-green-200">-12%</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Events Timeline */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Events (7 Days)</h2>
            <AreaChart
              data={eventsByDay}
              index="day"
              categories={['total', 'threats', 'blocked']}
              colors={['purple', 'red', 'green']}
              valueFormatter={(value) => value.toString()}
              showAnimation={true}
              showLegend={true}
              showGridLines={true}
              className="h-64"
            />
          </MotionDiv>

          {/* Threats by Type */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Threats by Type</h2>
            <BarChart
              data={threatsByType}
              index="type"
              categories={['count']}
              colors={['red']}
              valueFormatter={(value) => value.toString()}
              showAnimation={true}
              showLegend={false}
              showGridLines={true}
              layout="horizontal"
              className="h-64"
            />
          </MotionDiv>
        </div>

        {/* Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="login_attempt">Login Attempts</option>
              <option value="password_reset">Password Resets</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="account_locked">Account Locked</option>
              <option value="data_export">Data Exports</option>
            </select>

            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Export Report
            </button>
          </div>
        </MotionDiv>

        {/* Security Events List */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {filteredEvents.map((event) => (
            <MotionDiv
              key={event.id}
              variants={staggerItem}
              whileHover={{ y: -2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getSeverityColor(event.severity)}`}>
                      {getSeverityIcon(event.severity)}
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
                      {getTypeIcon(event.type)}
                      {event.type.replace('_', ' ')}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.description}</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">User</p>
                      <p className="font-medium text-gray-900">{event.user}</p>
                      <p className="text-xs text-gray-500">{event.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">IP Address</p>
                      <p className="font-medium text-gray-900 font-mono">{event.ipAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Location</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <p className="font-medium text-gray-900">{event.location}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Device</p>
                      <div className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-gray-500" />
                        <p className="font-medium text-gray-900">{event.device}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{event.timestamp}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInvestigate(event.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Investigate
                  </MotionButton>
                  {event.status !== 'resolved' && (
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleResolve(event.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve
                    </MotionButton>
                  )}
                </div>
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredEvents.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No security events found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
