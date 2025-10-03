/**
 * CreateQuote ViewModel
 * 
 * Business logic for quote creation and management.
 * Handles form state, line items, templates, and calculations.
 * 
 * @filesize Target: <180 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { logger } from '../../../utils/logger';
import { useAuth } from '../../../contexts/AuthContext';
import {
  QuoteBuilderService,
  CreateQuoteData,
  QuoteTemplate,
} from '../../../services/QuoteBuilderService';

export interface LineItem {
  item_name: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  category: string;
  is_taxable: boolean;
  sort_order: number;
}

export interface CreateQuoteState {
  // Form fields
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectTitle: string;
  projectDescription: string;
  markupPercentage: string;
  discountPercentage: string;
  taxRate: string;
  validUntil: string;
  termsAndConditions: string;
  notes: string;

  // Line items
  lineItems: LineItem[];
  showLineItemModal: boolean;
  editingItemIndex: number | null;

  // Templates
  templates: QuoteTemplate[];
  selectedTemplate: string;
  showTemplateModal: boolean;

  // UI state
  loading: boolean;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface CreateQuoteActions {
  // Form setters
  setClientName: (name: string) => void;
  setClientEmail: (email: string) => void;
  setClientPhone: (phone: string) => void;
  setProjectTitle: (title: string) => void;
  setProjectDescription: (description: string) => void;
  setMarkupPercentage: (percentage: string) => void;
  setDiscountPercentage: (percentage: string) => void;
  setTaxRate: (rate: string) => void;
  setValidUntil: (date: string) => void;
  setTermsAndConditions: (terms: string) => void;
  setNotes: (notes: string) => void;

  // Line item actions
  addLineItem: (item: LineItem) => void;
  updateLineItem: (index: number, item: LineItem) => void;
  removeLineItem: (index: number) => void;
  setShowLineItemModal: (show: boolean) => void;
  setEditingItemIndex: (index: number | null) => void;

  // Template actions
  loadTemplates: () => Promise<void>;
  selectTemplate: (templateId: string) => void;
  setShowTemplateModal: (show: boolean) => void;

  // Actions
  calculateTotals: () => void;
  saveQuote: () => Promise<void>;
  sendQuote: () => Promise<void>;
  goBack: () => void;
}

export interface CreateQuoteViewModel extends CreateQuoteState, CreateQuoteActions {}

/**
 * Custom hook providing Create Quote screen logic
 */
export const useCreateQuoteViewModel = (
  jobId?: string,
  initialClientName?: string,
  initialClientEmail?: string
): CreateQuoteViewModel => {
  const { user } = useAuth();

  // Form state
  const [clientName, setClientName] = useState(initialClientName || '');
  const [clientEmail, setClientEmail] = useState(initialClientEmail || '');
  const [clientPhone, setClientPhone] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState('15');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [taxRate, setTaxRate] = useState('20');
  const [validUntil, setValidUntil] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [notes, setNotes] = useState('');

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showLineItemModal, setShowLineItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Template state
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const setDefaultValidUntil = useCallback(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    setValidUntil(date.toISOString().split('T')[0]);
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotalValue = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    const markupMultiplier = 1 + parseFloat(markupPercentage) / 100;
    const subtotalWithMarkup = subtotalValue * markupMultiplier;

    const discountValue = subtotalWithMarkup * (parseFloat(discountPercentage) / 100);
    const subtotalAfterDiscount = subtotalWithMarkup - discountValue;

    const taxValue = subtotalAfterDiscount * (parseFloat(taxRate) / 100);
    const totalValue = subtotalAfterDiscount + taxValue;

    setSubtotal(subtotalValue);
    setDiscountAmount(discountValue);
    setTaxAmount(taxValue);
    setTotalAmount(totalValue);
  }, [lineItems, markupPercentage, discountPercentage, taxRate]);

  const loadTemplates = useCallback(async () => {
    if (!user) return;

    try {
      const data = await QuoteBuilderService.getQuoteTemplates(user.id);
      setTemplates(data);
    } catch (error) {
      logger.error('Failed to load quote templates', error);
    }
  }, [user]);

  const addLineItem = useCallback((item: LineItem) => {
    setLineItems(prev => [...prev, { ...item, sort_order: prev.length }]);
  }, []);

  const updateLineItem = useCallback((index: number, item: LineItem) => {
    setLineItems(prev => prev.map((existing, i) => 
      i === index ? { ...item, sort_order: existing.sort_order } : existing
    ));
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const selectTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setTermsAndConditions(template.terms_and_conditions || '');
      setNotes(template.notes || '');
    }
  }, [templates]);

  const saveQuote = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const quoteData: CreateQuoteData = {
        contractorId: user.id,
        job_id: jobId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        project_title: projectTitle,
        project_description: projectDescription,
        line_items: lineItems,
        markup_percentage: parseFloat(markupPercentage),
        discount_percentage: parseFloat(discountPercentage),
        tax_rate: parseFloat(taxRate),
        valid_until: validUntil,
        terms_and_conditions: termsAndConditions,
        notes: notes,
        template_id: selectedTemplate || null,
      };

      await QuoteBuilderService.createQuote(quoteData);
      Alert.alert('Success', 'Quote saved successfully!');
      logger.info('Quote saved successfully', { quoteId: quoteData.job_id });
    } catch (error) {
      logger.error('Failed to save quote', error);
      Alert.alert('Error', 'Failed to save quote. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, jobId, clientName, clientEmail, clientPhone, projectTitle, projectDescription, lineItems, markupPercentage, discountPercentage, taxRate, validUntil, termsAndConditions, notes, selectedTemplate]);

  const sendQuote = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Save first, then send
      await saveQuote();
      Alert.alert('Success', 'Quote sent to client successfully!');
      logger.info('Quote sent successfully', { clientEmail });
    } catch (error) {
      logger.error('Failed to send quote', error);
      Alert.alert('Error', 'Failed to send quote. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, saveQuote, clientEmail]);

  const goBack = useCallback(() => {
    // Navigation logic would be handled by the screen component
    logger.info('Navigating back from CreateQuote');
  }, []);

  useEffect(() => {
    loadTemplates();
    setDefaultValidUntil();
  }, [loadTemplates, setDefaultValidUntil]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  return {
    // State
    clientName,
    clientEmail,
    clientPhone,
    projectTitle,
    projectDescription,
    markupPercentage,
    discountPercentage,
    taxRate,
    validUntil,
    termsAndConditions,
    notes,
    lineItems,
    showLineItemModal,
    editingItemIndex,
    templates,
    selectedTemplate,
    showTemplateModal,
    loading,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,

    // Actions
    setClientName,
    setClientEmail,
    setClientPhone,
    setProjectTitle,
    setProjectDescription,
    setMarkupPercentage,
    setDiscountPercentage,
    setTaxRate,
    setValidUntil,
    setTermsAndConditions,
    setNotes,
    addLineItem,
    updateLineItem,
    removeLineItem,
    setShowLineItemModal,
    setEditingItemIndex,
    loadTemplates,
    selectTemplate,
    setShowTemplateModal,
    calculateTotals,
    saveQuote,
    sendQuote,
    goBack,
  };
};
