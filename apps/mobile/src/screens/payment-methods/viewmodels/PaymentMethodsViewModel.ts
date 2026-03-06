/**
 * PaymentMethods ViewModel
 *
 * Business logic for payment methods management.
 * Fetches real saved cards from the API and manages selection state.
 *
 * @filesize Target: <150 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useCallback, useEffect } from 'react';
import { PaymentService } from '../../../services/PaymentService';
import { logger } from '../../../utils/logger';

export interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'paypal' | 'apple_pay';
  name: string;
  icon: string;
  details?: string;
  isDefault?: boolean;
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface CardDetails {
  holderName: string;
  number: string;
  expiry: string;
  cvv: string;
}

export interface PaymentMethodsViewModel {
  selectedMethod: string | null;
  paymentMethods: PaymentMethod[];
  savedCards: SavedCard[];
  loading: boolean;
  error: string | null;
  selectMethod: (methodId: string) => void;
  deleteCard: (cardId: string) => Promise<void>;
  setDefaultCard: (cardId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const STATIC_METHODS: PaymentMethod[] = [
  { id: 'cash', type: 'cash', name: 'Cash', icon: 'cash' },
  { id: 'paypal', type: 'paypal', name: 'PayPal', icon: 'logo-paypal' },
  { id: 'apple_pay', type: 'apple_pay', name: 'Apple Pay', icon: 'logo-apple' },
];

export const usePaymentMethodsViewModel = (): PaymentMethodsViewModel => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PaymentService.getPaymentMethods();
      if (result.error) {
        setError(result.error);
        return;
      }

      const cards: SavedCard[] = (result.methods || [])
        .filter((m) => m.type === 'card' && m.card)
        .map((m) => ({
          id: m.id,
          brand: m.card!.brand,
          last4: m.card!.last4,
          expiryMonth: m.card!.expiryMonth,
          expiryYear: m.card!.expiryYear,
          isDefault: m.isDefault,
        }));

      setSavedCards(cards);

      // Auto-select default card if one exists
      const defaultCard = cards.find((c) => c.isDefault);
      if (defaultCard && !selectedMethod) {
        setSelectedMethod(defaultCard.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load payment methods';
      setError(msg);
      logger.error('Failed to fetch payment methods', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const selectMethod = useCallback((methodId: string) => {
    setSelectedMethod(methodId);
  }, []);

  const deleteCard = useCallback(async (cardId: string) => {
    try {
      const result = await PaymentService.deletePaymentMethod(cardId);
      if (result.error) throw new Error(result.error);
      setSavedCards((prev) => prev.filter((c) => c.id !== cardId));
      if (selectedMethod === cardId) setSelectedMethod(null);
      logger.info('Card deleted', { cardId });
    } catch (err) {
      logger.error('Failed to delete card', err);
      throw err;
    }
  }, [selectedMethod]);

  const setDefaultCard = useCallback(async (cardId: string) => {
    try {
      const result = await PaymentService.setDefaultPaymentMethod(cardId);
      if (result.error) throw new Error(result.error);
      setSavedCards((prev) =>
        prev.map((c) => ({ ...c, isDefault: c.id === cardId }))
      );
      setSelectedMethod(cardId);
      logger.info('Default card updated', { cardId });
    } catch (err) {
      logger.error('Failed to set default card', err);
      throw err;
    }
  }, []);

  return {
    selectedMethod,
    paymentMethods: STATIC_METHODS,
    savedCards,
    loading,
    error,
    selectMethod,
    deleteCard,
    setDefaultCard,
    refresh: fetchPaymentMethods,
  };
};
