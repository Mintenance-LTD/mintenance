import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { 
  QuoteBuilderService, 
  CreateQuoteData, 
  QuoteTemplate, 
  QuoteLineItemTemplate 
} from '../services/QuoteBuilderService';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface CreateQuoteScreenProps {
  navigation: StackNavigationProp<any>;
  route: {
    params?: {
      jobId?: string;
      clientName?: string;
      clientEmail?: string;
    };
  };
}

interface LineItem {
  item_name: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  category: string;
  is_taxable: boolean;
  sort_order: number;
}

export const CreateQuoteScreen: React.FC<CreateQuoteScreenProps> = ({
  navigation,
  route
}) => {
  const { user } = useAuth();
  const { jobId, clientName: initialClientName, clientEmail: initialClientEmail } = route.params || {};

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

  useEffect(() => {
    loadTemplates();
    setDefaultValidUntil();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [lineItems, markupPercentage, discountPercentage, taxRate]);

  const loadTemplates = async () => {
    if (!user) return;
    
    try {
      const data = await QuoteBuilderService.getQuoteTemplates(user.id);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const setDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setValidUntil(date.toISOString().split('T')[0]);
  };

  const calculateTotals = () => {
    const itemsSubtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const markup = parseFloat(markupPercentage) / 100;
    const discount = parseFloat(discountPercentage) / 100;
    const tax = parseFloat(taxRate) / 100;

    const subtotalAfterMarkup = itemsSubtotal * (1 + markup);
    const discountAmt = subtotalAfterMarkup * discount;
    const taxableAmount = subtotalAfterMarkup - discountAmt;
    const taxAmt = taxableAmount * tax;
    const total = taxableAmount + taxAmt;

    setSubtotal(itemsSubtotal);
    setDiscountAmount(discountAmt);
    setTaxAmount(taxAmt);
    setTotalAmount(total);
  };

  const addLineItem = () => {
    setEditingItemIndex(null);
    setShowLineItemModal(true);
  };

  const editLineItem = (index: number) => {
    setEditingItemIndex(index);
    setShowLineItemModal(true);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems);
  };

  const saveLineItem = (item: LineItem) => {
    if (editingItemIndex !== null) {
      const updatedItems = [...lineItems];
      updatedItems[editingItemIndex] = item;
      setLineItems(updatedItems);
    } else {
      setLineItems([...lineItems, { ...item, sort_order: lineItems.length + 1 }]);
    }
    setShowLineItemModal(false);
    setEditingItemIndex(null);
  };

  const applyTemplate = async (templateId: string) => {
    try {
      const template = await QuoteBuilderService.getQuoteTemplate(templateId);
      const templateLineItems = await QuoteBuilderService.getQuoteTemplateLineItems(templateId);
      
      if (template) {
        setMarkupPercentage(template.default_markup_percentage?.toString() || '15');
        setDiscountPercentage(template.default_discount_percentage?.toString() || '0');
        setTermsAndConditions(template.terms_and_conditions || '');
        setSelectedTemplate(templateId);
        
        const items: LineItem[] = templateLineItems.map((item, index) => ({
          item_name: item.item_name,
          item_description: item.item_description || '',
          quantity: item.default_quantity || 1,
          unit_price: item.unit_price,
          unit: item.unit,
          category: item.category,
          is_taxable: item.is_taxable,
          sort_order: index + 1
        }));
        
        setLineItems(items);
        setShowTemplateModal(false);
        
        Alert.alert('Success', `Template "${template.template_name}" applied successfully`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply template');
    }
  };

  const saveQuote = async (status: 'draft' | 'sent' = 'draft') => {
    if (!user) return;

    if (!clientName || !clientEmail || !projectTitle || lineItems.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields and add at least one line item');
      return;
    }

    setLoading(true);
    
    try {
      const quoteData: CreateQuoteData = {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        project_title: projectTitle,
        project_description: projectDescription,
        job_id: jobId,
        template_id: selectedTemplate || undefined,
        markup_percentage: parseFloat(markupPercentage),
        discount_percentage: parseFloat(discountPercentage),
        tax_rate: parseFloat(taxRate) / 100,
        valid_until: validUntil,
        terms_and_conditions: termsAndConditions,
        notes: notes,
        line_items: lineItems
      };

      const quote = await QuoteBuilderService.createQuote(user.id, quoteData);
      
      if (status === 'sent') {
        await QuoteBuilderService.sendQuote(quote.id);
      }

      Alert.alert(
        'Success',
        `Quote ${status === 'sent' ? 'created and sent' : 'saved as draft'} successfully`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Creating quote..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Quote</Text>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowTemplateModal(true)}
        >
          <Ionicons name="document-text" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Enter client name"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="client@email.com"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="Enter phone number"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Project Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              value={projectTitle}
              onChangeText={setProjectTitle}
              placeholder="Enter project title"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={projectDescription}
              onChangeText={setProjectDescription}
              placeholder="Describe the project details..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity style={styles.addButton} onPress={addLineItem}>
              <Ionicons name="add" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {lineItems.length === 0 ? (
            <View style={styles.emptyLineItems}>
              <Text style={styles.emptyText}>No line items added yet</Text>
              <TouchableOpacity style={styles.addLineItemButton} onPress={addLineItem}>
                <Text style={styles.addLineItemText}>Add Line Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            lineItems.map((item, index) => (
              <View key={index} style={styles.lineItem}>
                <View style={styles.lineItemInfo}>
                  <Text style={styles.lineItemName}>{item.item_name}</Text>
                  {item.item_description && (
                    <Text style={styles.lineItemDescription}>{item.item_description}</Text>
                  )}
                  <Text style={styles.lineItemDetails}>
                    {item.quantity} {item.unit} × £{item.unit_price.toFixed(2)} = £{(item.quantity * item.unit_price).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.lineItemActions}>
                  <TouchableOpacity
                    style={styles.lineItemAction}
                    onPress={() => editLineItem(index)}
                  >
                    <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.lineItemAction, styles.deleteAction]}
                    onPress={() => removeLineItem(index)}
                  >
                    <Ionicons name="trash" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Pricing Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Markup %</Text>
              <TextInput
                style={styles.input}
                value={markupPercentage}
                onChangeText={setMarkupPercentage}
                placeholder="15"
                keyboardType="numeric"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Discount %</Text>
              <TextInput
                style={styles.input}
                value={discountPercentage}
                onChangeText={setDiscountPercentage}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax Rate %</Text>
            <TextInput
              style={styles.input}
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="20"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Valid Until</Text>
            <TextInput
              style={styles.input}
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        {/* Quote Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>£{subtotal.toFixed(2)}</Text>
          </View>
          
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                -£{discountAmount.toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>£{taxAmount.toFixed(2)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>£{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Terms and Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Terms and Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={termsAndConditions}
              onChangeText={setTermsAndConditions}
              placeholder="Enter terms and conditions..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Internal notes (not visible to client)..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={() => saveQuote('draft')}
          >
            <Text style={styles.saveButtonText}>Save as Draft</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={() => saveQuote('sent')}
          >
            <Text style={styles.sendButtonText}>Create & Send</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Template</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.templateList}>
              {templates.length === 0 ? (
                <Text style={styles.noTemplatesText}>No templates available</Text>
              ) : (
                templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateItem}
                    onPress={() => applyTemplate(template.id)}
                  >
                    <Text style={styles.templateName}>{template.template_name}</Text>
                    {template.description && (
                      <Text style={styles.templateDescription}>{template.description}</Text>
                    )}
                    <Text style={styles.templateUsage}>Used {template.usage_count} times</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  templateButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginTop: 16,
    ...theme.shadows.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  addButton: {
    padding: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  emptyLineItems: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  addLineItemButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.base,
  },
  addLineItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.base,
    marginBottom: 8,
  },
  lineItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  lineItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  lineItemDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  lineItemDetails: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  lineItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  lineItemAction: {
    padding: 8,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.background,
  },
  deleteAction: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  saveButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  templateList: {
    paddingHorizontal: 16,
  },
  noTemplatesText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginVertical: 32,
  },
  templateItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  templateUsage: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});

export default CreateQuoteScreen;