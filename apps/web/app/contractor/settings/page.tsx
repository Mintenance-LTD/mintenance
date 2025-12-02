'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  MapPin,
  Globe,
  FileText,
  DollarSign,
  Bell,
  Shield,
  Save,
  CheckCircle,
  Upload,
  Clock,
  Calendar,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ContractorBusinessSettingsPage2025() {
  const [activeTab, setActiveTab] = useState<'business' | 'billing' | 'notifications' | 'policies'>('business');

  const [businessInfo, setBusinessInfo] = useState({
    businessName: 'John Smith Plumbing',
    tradingName: 'JS Plumbing Services',
    registrationNumber: '12345678',
    vatNumber: 'GB123456789',
    address: '123 High Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    phone: '+44 7700 900123',
    email: 'info@jsplumbing.com',
    website: 'www.jsplumbing.com',
    description: 'Professional plumbing and heating services with over 20 years of experience.',
  });

  const [billingInfo, setBillingInfo] = useState({
    paymentTerms: '30',
    currency: 'GBP',
    taxRate: '20',
    bankName: 'Barclays Bank',
    accountNumber: '****1234',
    sortCode: '12-34-56',
    invoicePrefix: 'INV',
    quotePrefix: 'QUO',
  });

  const [notifications, setNotifications] = useState({
    newJobAlerts: true,
    bidAccepted: true,
    paymentReceived: true,
    reviewReceived: true,
    messageReceived: true,
    emailDigest: 'daily',
    smsNotifications: false,
  });

  const [policies, setPolicies] = useState({
    cancellationPolicy: '24 hours notice required for cancellations. Deposits are non-refundable.',
    refundPolicy: 'Full refund available within 7 days of job completion if not satisfied.',
    warrantyPeriod: '12',
    calloutFee: '50',
    emergencyRate: '150',
    minimumJobValue: '100',
  });

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'policies', label: 'Policies', icon: FileText },
  ];

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 via-amber-600 to-emerald-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <SettingsIcon className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Business Settings</h1>
              </div>
              <p className="text-emerald-100 text-lg">
                Configure your business information and preferences
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </MotionButton>
          </div>
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
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white'
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

        {/* Business Info Tab */}
        {activeTab === 'business' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessInfo.businessName}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={businessInfo.tradingName}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, tradingName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={businessInfo.registrationNumber}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, registrationNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={businessInfo.vatNumber}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, vatNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  value={businessInfo.address}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={businessInfo.city}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                <input
                  type="text"
                  value={businessInfo.postcode}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, postcode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={businessInfo.phone}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={businessInfo.email}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="text"
                  value={businessInfo.website}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <textarea
                  value={businessInfo.description}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Invoicing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms (days)
                </label>
                <select
                  value={billingInfo.paymentTerms}
                  onChange={(e) => setBillingInfo({ ...billingInfo, paymentTerms: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={billingInfo.currency}
                  onChange={(e) => setBillingInfo({ ...billingInfo, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={billingInfo.taxRate}
                  onChange={(e) => setBillingInfo({ ...billingInfo, taxRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={billingInfo.bankName}
                  onChange={(e) => setBillingInfo({ ...billingInfo, bankName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={billingInfo.accountNumber}
                  onChange={(e) => setBillingInfo({ ...billingInfo, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Code</label>
                <input
                  type="text"
                  value={billingInfo.sortCode}
                  onChange={(e) => setBillingInfo({ ...billingInfo, sortCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={billingInfo.invoicePrefix}
                  onChange={(e) => setBillingInfo({ ...billingInfo, invoicePrefix: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quote Prefix</label>
                <input
                  type="text"
                  value={billingInfo.quotePrefix}
                  onChange={(e) => setBillingInfo({ ...billingInfo, quotePrefix: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </MotionDiv>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => {
                if (key === 'emailDigest') {
                  return (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 capitalize">
                        Email Digest Frequency
                      </span>
                      <select
                        value={value as string}
                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="realtime">Real-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </MotionDiv>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Policies</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Policy
                </label>
                <textarea
                  value={policies.cancellationPolicy}
                  onChange={(e) => setPolicies({ ...policies, cancellationPolicy: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Policy
                </label>
                <textarea
                  value={policies.refundPolicy}
                  onChange={(e) => setPolicies({ ...policies, refundPolicy: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warranty Period (months)
                  </label>
                  <input
                    type="number"
                    value={policies.warrantyPeriod}
                    onChange={(e) => setPolicies({ ...policies, warrantyPeriod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Callout Fee (£)
                  </label>
                  <input
                    type="number"
                    value={policies.calloutFee}
                    onChange={(e) => setPolicies({ ...policies, calloutFee: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Hourly Rate (£)
                  </label>
                  <input
                    type="number"
                    value={policies.emergencyRate}
                    onChange={(e) => setPolicies({ ...policies, emergencyRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Job Value (£)
                  </label>
                  <input
                    type="number"
                    value={policies.minimumJobValue}
                    onChange={(e) => setPolicies({ ...policies, minimumJobValue: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* Save Button (bottom) */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end mt-8"
        >
          <MotionButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <CheckCircle className="w-5 h-5" />
            Save All Settings
          </MotionButton>
        </MotionDiv>
      </div>
    </div>
  );
}
