/**
 * PaymentMethods ViewModel
 * 
 * Business logic for payment methods management.
 * Handles card validation, formatting, and payment processing.
 * 
 * @filesize Target: <150 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useCallback } from 'react';
import { logger } from '../../../utils/logger';

export interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'paypal' | 'apple_pay';
  name: string;
  icon: keyof import('@expo/vector-icons/Ionicons').default['glyphMap'];
  details?: string;
}

export interface CardDetails {
  holderName: string;
  number: string;
  expiry: string;
  cvv: string;
}

export interface PaymentMethodsState {
  selectedMethod: string | null;
  showAddCard: boolean;
  cardDetails: CardDetails;
  saveCard: boolean;
  paymentMethods: PaymentMethod[];
}

export interface PaymentMethodsActions {
  selectMethod: (methodId: string) => void;
  toggleAddCard: (show: boolean) => void;
  updateCardDetails: (details: Partial<CardDetails>) => void;
  toggleSaveCard: () => void;
  formatCardNumber: (text: string) => string;
  formatExpiry: (text: string) => string;
  handleAddCard: () => Promise<void>;
  validateCard: () => boolean;
}

export interface PaymentMethodsViewModel extends PaymentMethodsState, PaymentMethodsActions {}

/**
 * Custom hook providing Payment Methods screen logic
 */
export const usePaymentMethodsViewModel = (): PaymentMethodsViewModel => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    holderName: '',
    number: '',
    expiry: '',
    cvv: '',
  });

  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', type: 'cash', name: 'Cash', icon: 'cash' },
    { id: 'paypal', type: 'paypal', name: 'PayPal', icon: 'logo-paypal' },
    { id: 'apple_pay', type: 'apple_pay', name: 'Apple Pay', icon: 'logo-apple' },
  ];

  const selectMethod = useCallback((methodId: string) => {
    setSelectedMethod(methodId);
    logger.info('Payment method selected', { methodId });
  }, []);

  const toggleAddCard = useCallback((show: boolean) => {
    setShowAddCard(show);
  }, []);

  const updateCardDetails = useCallback((details: Partial<CardDetails>) => {
    setCardDetails((prev) => ({ ...prev, ...details }));
  }, []);

  const toggleSaveCard = useCallback(() => {
    setSaveCard((prev) => !prev);
  }, []);

  const formatCardNumber = useCallback((text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  }, []);

  const formatExpiry = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  }, []);

  const validateCard = useCallback(() => {
    if (!cardDetails.holderName || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvv) {
      return false;
    }
    return true;
  }, [cardDetails]);

  const handleAddCard = useCallback(async () => {
    if (!validateCard()) {
      logger.warn('Invalid card details');
      return;
    }

    try {
      logger.info('Adding card', { saveCard });
      // In production: integrate with Stripe/payment processor
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowAddCard(false);
      setCardDetails({ holderName: '', number: '', expiry: '', cvv: '' });
      logger.info('Card added successfully');
    } catch (error) {
      logger.error('Failed to add card', error);
      throw error;
    }
  }, [cardDetails, saveCard, validateCard]);

  return {
    // State
    selectedMethod,
    showAddCard,
    cardDetails,
    saveCard,
    paymentMethods,

    // Actions
    selectMethod,
    toggleAddCard,
    updateCardDetails,
    toggleSaveCard,
    formatCardNumber,
    formatExpiry,
    handleAddCard,
    validateCard,
  };
};
