'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, DonutChart } from '@tremor/react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Percent,
  Users,
  Briefcase,
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

interface FeeRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  appliesTo: 'all' | 'homeowners' | 'contractors' | 'subscriptions';
  status: 'active' | 'inactive';
  createdDate: string;
  revenue: number;
  transactionCount: number;
}

export default function AdminFeeManagement2025() {
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);

  // Mock data - replace with actual API calls
  const feeStats = {
    totalRevenue: 49200,
    monthlyGrowth: 12.4,
    averageFeePerTransaction: 39.45,
    totalTransactions: 1247,
    activeRules: 8,
    revenueByType: [
      { type: 'Job Fees', revenue: 38400 },
      { type: 'Subscription Fees', revenue: 8200 },
      { type: 'Service Fees', revenue: 2600 },
    ],
  };

  const revenueByMonth = [
    { month: 'Jan', revenue: 6300 },
    { month: 'Feb', revenue: 5700 },
    { month: 'Mar', revenue: 6750 },
    { month: 'Apr', revenue: 7800 },
    { month: 'May', revenue: 7200 },
    { month: 'Jun', revenue: 8250 },
    { month: 'Jul', revenue: 7200 },
  ];

  const [feeRules, setFeeRules] = useState<FeeRule[]>([
    {
      id: 'FEE-001',
      name: 'Standard Job Fee',
      type: 'percentage',
      value: 15,
      appliesTo: 'all',
      status: 'active',
      createdDate: '2024-01-15',
      revenue: 38400,
      transactionCount: 982,
    },
    {
      id: 'FEE-002',
      name: 'Premium Contractor Fee',
      type: 'percentage',
      value: 10,
      appliesTo: 'contractors',
      status: 'active',
      createdDate: '2024-03-20',
      revenue: 5200,
      transactionCount: 156,
    },
    {
      id: 'FEE-003',
      name: 'Professional Subscription',
      type: 'fixed',
      value: 29,
      appliesTo: 'subscriptions',
      status: 'active',
      createdDate: '2024-02-10',
      revenue: 4350,
      transactionCount: 150,
    },
    {
      id: 'FEE-004',
      name: 'Business Subscription',
      type: 'fixed',
      value: 99,
      appliesTo: 'subscriptions',
      status: 'active',
      createdDate: '2024-02-10',
      revenue: 3960,
      transactionCount: 40,
    },
    {
      id: 'FEE-005',
      name: 'Urgent Job Premium',
      type: 'percentage',
      value: 20,
      minAmount: 500,
      appliesTo: 'all',
      status: 'active',
      createdDate: '2024-04-12',
      revenue: 2100,
      transactionCount: 28,
    },
    {
      id: 'FEE-006',
      name: 'Large Project Fee',
      type: 'tiered',
      value: 12,
      minAmount: 5000,
      appliesTo: 'all',
      status: 'active',
      createdDate: '2024-05-01',
      revenue: 1800,
      transactionCount: 15,
    },
    {
      id: 'FEE-007',
      name: 'Service Fee (Deprecated)',
      type: 'fixed',
      value: 5,
      appliesTo: 'all',
      status: 'inactive',
      createdDate: '2023-12-01',
      revenue: 0,
      transactionCount: 0,
    },
  ]);

  const activeFeeRules = useMemo(() => {
    return feeRules.filter((rule) => rule.status === 'active');
  }, [feeRules]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'fixed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'tiered':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAppliesToColor = (appliesTo: string) => {
    switch (appliesTo) {
      case 'all':
        return 'bg-indigo-100 text-indigo-700';
      case 'homeowners':
        return 'bg-teal-100 text-teal-700';
      case 'contractors':
        return 'bg-emerald-100 text-emerald-700';
      case 'subscriptions':
        return 'bg-violet-100 text-violet-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleEdit = (id: string) => {
    setEditingRule(id);
  };

  const handleSave = (id: string) => {
    setEditingRule(null);
    toast.success('Fee rule updated successfully!');
  };

  const handleDelete = (id: string) => {
    setFeeRules(feeRules.filter((rule) => rule.id !== id));
    toast.success('Fee rule deleted successfully!');
  };

  const handleToggleStatus = (id: string) => {
    setFeeRules(
      feeRules.map((rule) =>
        rule.id === id
          ? { ...rule, status: rule.status === 'active' ? 'inactive' : 'active' }
          : rule
      )
    );
    toast.success('Fee rule status updated!');
  };

  const handleAddRule = () => {
    setShowNewRuleForm(true);
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
                  <CreditCard className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Fee Management</h1>
              </div>
              <p className="text-purple-100 text-lg">
                Configure and monitor platform fees and pricing
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddRule}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Fee Rule
            </MotionButton>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Total Revenue</p>
              </div>
              <p className="text-3xl font-bold">£{feeStats.totalRevenue.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-200" />
                <p className="text-purple-100 text-sm">Growth</p>
              </div>
              <p className="text-3xl font-bold">+{feeStats.monthlyGrowth}%</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Avg Fee</p>
              </div>
              <p className="text-3xl font-bold">£{feeStats.averageFeePerTransaction}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Transactions</p>
              </div>
              <p className="text-3xl font-bold">{feeStats.totalTransactions.toLocaleString()}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-purple-200" />
                <p className="text-purple-100 text-sm">Active Rules</p>
              </div>
              <p className="text-3xl font-bold">{feeStats.activeRules}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Trend */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fee Revenue Trend</h2>
            <AreaChart
              data={revenueByMonth}
              index="month"
              categories={['revenue']}
              colors={['purple']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              showAnimation={true}
              showLegend={false}
              showGridLines={true}
              className="h-64"
            />
          </MotionDiv>

          {/* Revenue by Type */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Type</h2>
            <DonutChart
              data={feeStats.revenueByType}
              category="revenue"
              index="type"
              colors={['purple', 'indigo', 'violet']}
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              showAnimation={true}
              className="h-64"
            />
          </MotionDiv>
        </div>

        {/* Fee Rules Table */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Fee Rules</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {activeFeeRules.length} active rules
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {feeRules.map((rule) => (
              <MotionDiv
                key={rule.id}
                whileHover={{ y: -2 }}
                className={`border rounded-xl p-6 transition-all ${
                  rule.status === 'active'
                    ? 'border-gray-200 bg-white hover:shadow-md'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(rule.type)}`}>
                        {rule.type}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAppliesToColor(rule.appliesTo)}`}>
                        {rule.appliesTo}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(rule.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rule.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {rule.status}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fee Value</p>
                        <p className="font-semibold text-gray-900">
                          {rule.type === 'percentage' ? `${rule.value}%` : `£${rule.value}`}
                        </p>
                      </div>
                      {rule.minAmount && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Min Amount</p>
                          <p className="font-semibold text-gray-900">£{rule.minAmount}</p>
                        </div>
                      )}
                      {rule.maxAmount && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Max Amount</p>
                          <p className="font-semibold text-gray-900">£{rule.maxAmount}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Revenue</p>
                        <p className="font-semibold text-purple-600">£{rule.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Transactions</p>
                        <p className="font-semibold text-gray-900">{rule.transactionCount}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500">Created: {rule.createdDate}</p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {editingRule === rule.id ? (
                      <>
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSave(rule.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Save className="w-5 h-5" />
                        </MotionButton>
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditingRule(null)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </MotionButton>
                      </>
                    ) : (
                      <>
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(rule.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </MotionButton>
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </MotionButton>
                      </>
                    )}
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>

        {/* Info Alert */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Fee Management Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Percentage fees are calculated based on the job value</li>
                <li>• Fixed fees are applied per transaction regardless of value</li>
                <li>• Tiered fees apply different rates based on transaction thresholds</li>
                <li>• Inactive rules are preserved for historical reporting but not applied to new transactions</li>
              </ul>
            </div>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
