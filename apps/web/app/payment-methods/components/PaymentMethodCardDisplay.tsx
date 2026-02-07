'use client';

import React from 'react';
import { CreditCard, Building2, Smartphone, Trash2, Star } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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

interface PaymentMethodCardDisplayProps {
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

function getCardColor(brand?: string): string {
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
}

function getCardIcon(type: string): React.ReactNode {
  if (type === 'card') return <CreditCard className="w-8 h-8" />;
  if (type === 'bank') return <Building2 className="w-8 h-8" />;
  if (type === 'apple_pay' || type === 'google_pay') return <Smartphone className="w-8 h-8" />;
  return <CreditCard className="w-8 h-8" />;
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PaymentMethodCardDisplay({
  method,
  onSetDefault,
  onDelete,
}: PaymentMethodCardDisplayProps) {
  return (
    <MotionDiv
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
              {getCardIcon(method.type)}
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Added</p>
              <p className="text-sm font-medium">{method.addedDate}</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-sm opacity-75 mb-1">Card Number</p>
            <p className="text-2xl font-semibold tracking-wider">
              &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {method.last4}
            </p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs opacity-75 mb-1">{method.nickname || method.brand}</p>
              <p className="text-sm font-medium">{method.brand?.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75 mb-1">Expires</p>
              <p className="text-sm font-medium">{method.expiry}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t border-white/20">
            {!method.isDefault && (
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSetDefault(method.id)}
                className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
              >
                Set as Default
              </MotionButton>
            )}
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDelete(method.id)}
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
            <p className="text-sm text-gray-500 mb-1">{method.nickname || method.bankName}</p>
            <p className="text-xl font-semibold text-gray-900 tracking-wider">{method.accountNumber}</p>
          </div>
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            {!method.isDefault && (
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSetDefault(method.id)}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Set as Default
              </MotionButton>
            )}
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDelete(method.id)}
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
              <div className="text-3xl">{'\uD83D\uDCB3'}</div>
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
                onClick={() => onSetDefault(method.id)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Set as Default
              </MotionButton>
            )}
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDelete(method.id)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </MotionButton>
          </div>
        </div>
      )}
    </MotionDiv>
  );
}
