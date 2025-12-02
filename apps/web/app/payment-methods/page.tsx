'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Check,
  Star,
  Calendar,
  Lock,
  AlertCircle,
  Building2,
  Smartphone,
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

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'apple_pay' | 'google_pay';
  nickname?: string;
  last4: string;
  brand?: string;
  expiry?: string;
  bankName?: string;
  accountNumber?: string;
  isDefault: boolean;
  addedDate: string;
}

export default function PaymentMethodsPage2025() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<'card' | 'bank'>('card');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'PM-001',
      type: 'card',
      nickname: 'Personal Card',
      last4: '4242',
      brand: 'Visa',
      expiry: '12/25',
      isDefault: true,
      addedDate: '2024-03-15',
    },
    {
      id: 'PM-002',
      type: 'card',
      last4: '5555',
      brand: 'Mastercard',
      expiry: '08/26',
      isDefault: false,
      addedDate: '2024-06-20',
    },
    {
      id: 'PM-003',
      type: 'bank',
      nickname: 'Main Account',
      last4: '1234',
      bankName: 'Barclays Bank',
      accountNumber: '****1234',
      isDefault: false,
      addedDate: '2024-01-10',
    },
    {
      id: 'PM-004',
      type: 'paypal',
      last4: 'sarah.johnson@example.com',
      isDefault: false,
      addedDate: '2024-09-05',
    },
  ]);

  const [newCard, setNewCard] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    nickname: '',
  });

  const [newBank, setNewBank] = useState({
    accountNumber: '',
    sortCode: '',
    accountName: '',
    nickname: '',
  });

  const handleSetDefault = (id: string) => {
    setPaymentMethods(
      paymentMethods.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
    toast.success('Default payment method updated!');
  };

  const handleDelete = (id: string) => {
    const method = paymentMethods.find((pm) => pm.id === id);
    if (method?.isDefault) {
      toast.error('Cannot delete default payment method');
      return;
    }
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
    toast.success('Payment method deleted');
  };

  const handleAddPaymentMethod = () => {
    if (selectedType === 'card') {
      if (!newCard.number || !newCard.name || !newCard.expiry || !newCard.cvv) {
        toast.error('Please fill in all card details');
        return;
      }
      const newMethod: PaymentMethod = {
        id: `PM-${Date.now()}`,
        type: 'card',
        nickname: newCard.nickname,
        last4: newCard.number.slice(-4),
        brand: newCard.number.startsWith('4') ? 'Visa' : 'Mastercard',
        expiry: newCard.expiry,
        isDefault: paymentMethods.length === 0,
        addedDate: new Date().toISOString().split('T')[0],
      };
      setPaymentMethods([...paymentMethods, newMethod]);
      setNewCard({ number: '', name: '', expiry: '', cvv: '', nickname: '' });
      toast.success('Card added successfully!');
    } else {
      if (!newBank.accountNumber || !newBank.sortCode || !newBank.accountName) {
        toast.error('Please fill in all bank details');
        return;
      }
      const newMethod: PaymentMethod = {
        id: `PM-${Date.now()}`,
        type: 'bank',
        nickname: newBank.nickname,
        last4: newBank.accountNumber.slice(-4),
        bankName: 'Bank Account',
        accountNumber: `****${newBank.accountNumber.slice(-4)}`,
        isDefault: paymentMethods.length === 0,
        addedDate: new Date().toISOString().split('T')[0],
      };
      setPaymentMethods([...paymentMethods, newMethod]);
      setNewBank({ accountNumber: '', sortCode: '', accountName: '', nickname: '' });
      toast.success('Bank account added successfully!');
    }
    setShowAddForm(false);
  };

  const getCardIcon = (type: string, brand?: string) => {
    if (type === 'card') {
      return <CreditCard className="w-8 h-8" />;
    } else if (type === 'bank') {
      return <Building2 className="w-8 h-8" />;
    } else if (type === 'paypal') {
      return <div className="text-2xl">💳</div>;
    } else if (type === 'apple_pay') {
      return <Smartphone className="w-8 h-8" />;
    } else if (type === 'google_pay') {
      return <Smartphone className="w-8 h-8" />;
    }
    return <CreditCard className="w-8 h-8" />;
  };

  const getCardColor = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'from-blue-500 to-blue-600';
      case 'mastercard':
        return 'from-emerald-500 to-red-500';
      case 'amex':
        return 'from-teal-500 to-emerald-500';
      default:
        return 'from-gray-600 to-gray-700';
    }
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Payment Methods</h1>
              </div>
              <p className="text-teal-100 text-lg">
                Manage your cards and bank accounts
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(true)}
              className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Payment Method
            </MotionButton>
          </div>

          {/* Stats */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Total Methods</p>
              <p className="text-3xl font-bold">{paymentMethods.length}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Cards</p>
              <p className="text-3xl font-bold">
                {paymentMethods.filter((pm) => pm.type === 'card').length}
              </p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-teal-100 text-sm mb-1">Bank Accounts</p>
              <p className="text-3xl font-bold">
                {paymentMethods.filter((pm) => pm.type === 'bank').length}
              </p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Payment Method Form */}
        <AnimatePresence>
          {showAddForm && (
            <MotionDiv
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Payment Method</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Type Selector */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setSelectedType('card')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    selectedType === 'card'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-teal-600" />
                  <p className="font-semibold text-center">Credit/Debit Card</p>
                </button>
                <button
                  onClick={() => setSelectedType('bank')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    selectedType === 'bank'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className="w-6 h-6 mx-auto mb-2 text-teal-600" />
                  <p className="font-semibold text-center">Bank Account</p>
                </button>
              </div>

              {/* Card Form */}
              {selectedType === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={newCard.number}
                      onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                      maxLength={16}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Smith"
                      value={newCard.name}
                      onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={newCard.expiry}
                        onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                        maxLength={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={newCard.cvv}
                        onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                        maxLength={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Personal Card"
                      value={newCard.nickname}
                      onChange={(e) => setNewCard({ ...newCard, nickname: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Bank Form */}
              {selectedType === 'bank' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="12345678"
                      value={newBank.accountNumber}
                      onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort Code
                    </label>
                    <input
                      type="text"
                      placeholder="12-34-56"
                      value={newBank.sortCode}
                      onChange={(e) => setNewBank({ ...newBank, sortCode: e.target.value })}
                      maxLength={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Smith"
                      value={newBank.accountName}
                      onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Main Account"
                      value={newBank.nickname}
                      onChange={(e) => setNewBank({ ...newBank, nickname: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Secure Payment</p>
                  <p className="text-sm text-blue-700">
                    Your payment information is encrypted and secure. We never store your CVV.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddPaymentMethod}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                >
                  Add Payment Method
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </MotionButton>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Payment Methods List */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {paymentMethods.map((method) => (
            <MotionDiv
              key={method.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="relative"
            >
              {method.isDefault && (
                <div className="absolute -top-2 -right-2 bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 z-10 shadow-lg">
                  <Star className="w-3 h-3 fill-current" />
                  Default
                </div>
              )}

              {method.type === 'card' && (
                <div
                  className={`bg-gradient-to-br ${getCardColor(method.brand)} text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all`}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      {getCardIcon(method.type, method.brand)}
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-75">Added</p>
                      <p className="text-sm font-medium">{method.addedDate}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm opacity-75 mb-1">Card Number</p>
                    <p className="text-2xl font-semibold tracking-wider">
                      •••• •••• •••• {method.last4}
                    </p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs opacity-75 mb-1">
                        {method.nickname || method.brand}
                      </p>
                      <p className="text-sm font-medium">{method.brand?.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-75 mb-1">Expires</p>
                      <p className="text-sm font-medium">{method.expiry}</p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex gap-2 mt-6 pt-4 border-t border-white/20">
                    {!method.isDefault && (
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSetDefault(method.id)}
                        className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                      >
                        Set as Default
                      </MotionButton>
                    )}
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(method.id)}
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </MotionButton>
                  </div>
                </div>
              )}

              {method.type === 'bank' && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-teal-600 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <div className="bg-teal-100 p-3 rounded-lg">
                      {getCardIcon(method.type)}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Added</p>
                      <p className="text-sm font-medium text-gray-900">{method.addedDate}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-1">
                      {method.nickname || method.bankName}
                    </p>
                    <p className="text-xl font-semibold text-gray-900 tracking-wider">
                      {method.accountNumber}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {!method.isDefault && (
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSetDefault(method.id)}
                        className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                      >
                        Set as Default
                      </MotionButton>
                    )}
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(method.id)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </MotionButton>
                  </div>
                </div>
              )}

              {method.type === 'paypal' && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-600 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <div className="text-3xl">💳</div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Added</p>
                      <p className="text-sm font-medium text-gray-900">{method.addedDate}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-1">PayPal Account</p>
                    <p className="text-lg font-semibold text-gray-900">{method.last4}</p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {!method.isDefault && (
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSetDefault(method.id)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Set as Default
                      </MotionButton>
                    )}
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(method.id)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </MotionButton>
                  </div>
                </div>
              )}
            </MotionDiv>
          ))}
        </MotionDiv>

        {paymentMethods.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center"
          >
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No payment methods</h3>
            <p className="text-gray-500 mb-6">Add your first payment method to get started</p>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Payment Method
            </MotionButton>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
