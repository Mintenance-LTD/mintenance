'use client';

import React, { useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { PaymentMethodsHeroHeader } from './components/PaymentMethodsHeroHeader';
import { AddPaymentMethodForm } from './components/AddPaymentMethodForm';
import { PaymentMethodCardDisplay } from './components/PaymentMethodCardDisplay';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <PaymentMethodsHeroHeader
        totalMethods={paymentMethods.length}
        cardCount={paymentMethods.filter((pm) => pm.type === 'card').length}
        bankCount={paymentMethods.filter((pm) => pm.type === 'bank').length}
        onAddMethod={() => setShowAddForm(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AddPaymentMethodForm
          isOpen={showAddForm}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          newCard={newCard}
          onCardChange={setNewCard}
          newBank={newBank}
          onBankChange={setNewBank}
          onSubmit={handleAddPaymentMethod}
          onClose={() => setShowAddForm(false)}
        />

        {/* Payment Methods List */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {paymentMethods.map((method) => (
            <PaymentMethodCardDisplay
              key={method.id}
              method={method}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
            />
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
