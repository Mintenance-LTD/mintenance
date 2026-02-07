'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { CreditCard, Building2, Lock } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

interface NewCardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  nickname: string;
}

interface NewBankData {
  accountNumber: string;
  sortCode: string;
  accountName: string;
  nickname: string;
}

interface AddPaymentMethodFormProps {
  isOpen: boolean;
  selectedType: 'card' | 'bank';
  onTypeChange: (type: 'card' | 'bank') => void;
  newCard: NewCardData;
  onCardChange: (card: NewCardData) => void;
  newBank: NewBankData;
  onBankChange: (bank: NewBankData) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function AddPaymentMethodForm({
  isOpen,
  selectedType,
  onTypeChange,
  newCard,
  onCardChange,
  newBank,
  onBankChange,
  onSubmit,
  onClose,
}: AddPaymentMethodFormProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add New Payment Method</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              &#x2715;
            </button>
          </div>

          {/* Type Selector */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => onTypeChange('card')}
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
              onClick={() => onTypeChange('bank')}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={newCard.number}
                  onChange={(e) => onCardChange({ ...newCard, number: e.target.value })}
                  maxLength={16}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Smith"
                  value={newCard.name}
                  onChange={(e) => onCardChange({ ...newCard, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={newCard.expiry}
                    onChange={(e) => onCardChange({ ...newCard, expiry: e.target.value })}
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
                    onChange={(e) => onCardChange({ ...newCard, cvv: e.target.value })}
                    maxLength={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Personal Card"
                  value={newCard.nickname}
                  onChange={(e) => onCardChange({ ...newCard, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Bank Form */}
          {selectedType === 'bank' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  placeholder="12345678"
                  value={newBank.accountNumber}
                  onChange={(e) => onBankChange({ ...newBank, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Code</label>
                <input
                  type="text"
                  placeholder="12-34-56"
                  value={newBank.sortCode}
                  onChange={(e) => onBankChange({ ...newBank, sortCode: e.target.value })}
                  maxLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  placeholder="John Smith"
                  value={newBank.accountName}
                  onChange={(e) => onBankChange({ ...newBank, accountName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Main Account"
                  value={newBank.nickname}
                  onChange={(e) => onBankChange({ ...newBank, nickname: e.target.value })}
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
              onClick={onSubmit}
              className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
            >
              Add Payment Method
            </MotionButton>
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </MotionButton>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
