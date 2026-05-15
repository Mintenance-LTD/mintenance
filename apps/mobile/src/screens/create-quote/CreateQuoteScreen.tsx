/**
 * CreateQuoteScreen — Airbnb-style clean quote builder
 * White header, card sections, sticky floating total bar.
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useCreateQuoteViewModel } from './viewmodels/CreateQuoteViewModel';
import {
  QuoteHeader,
  ClientInfo,
  QuoteItemsList,
  PricingSummary,
  QuoteActions,
} from './components';
import { me } from '../../design-system/mint-editorial';
import { formatCurrency } from '../../utils/formatCurrency';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface CreateQuoteScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'CreateQuote'>;
  route: {
    params?: {
      jobId?: string;
      clientName?: string;
      clientEmail?: string;
    };
  };
}

export const CreateQuoteScreen: React.FC<CreateQuoteScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const {
    jobId,
    clientName: initialClientName,
    clientEmail: initialClientEmail,
  } = route.params || {};
  const viewModel = useCreateQuoteViewModel(
    jobId,
    initialClientName,
    initialClientEmail
  );

  // Discard-prompt — content here is high-effort (line items + client
  // contact details + descriptions), so any non-empty field counts.
  // Note: persistence is via Save/Send buttons — neither navigates
  // away, so we deliberately don't auto-`allowExit()`. The prompt
  // still fires after a save if the user has line items, which is
  // a slightly noisy false-positive but never loses data.
  const isDirty = !!(
    viewModel.lineItems.length > 0 ||
    viewModel.projectTitle.trim() ||
    viewModel.projectDescription.trim() ||
    viewModel.clientName.trim() ||
    viewModel.clientEmail.trim() ||
    viewModel.clientPhone.trim() ||
    viewModel.notes.trim()
  );
  useUnsavedChanges(isDirty);

  if (viewModel.loading && viewModel.lineItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle='dark-content' />
        <ActivityIndicator size='large' color={me.ink} />
        <Text style={styles.loadingText}>Creating quote...</Text>
      </View>
    );
  }

  const quoteNumber = `Q-${Date.now().toString().slice(-6)}`;

  // Step progress
  const step1Done = true;
  const step2Done = viewModel.lineItems.length > 0;
  const step3Done = viewModel.totalAmount > 0;
  const progressSteps = [step1Done, step2Done, step3Done].filter(
    Boolean
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Clean white header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              accessibilityRole='button'
              accessibilityLabel='Go back'
            >
              <Ionicons name='arrow-back' size={20} color={me.ink} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>New Quote</Text>
              <Text style={styles.headerSubtitle}>{quoteNumber}</Text>
            </View>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => viewModel.setShowTemplateModal(true)}
              accessibilityRole='button'
              accessibilityLabel='Use template'
            >
              <Ionicons name='document-text-outline' size={18} color={me.ink} />
            </TouchableOpacity>
          </View>

          {/* Minimal progress bar */}
          <View style={styles.progressRow}>
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressSegment,
                  step <= progressSteps && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
          <View style={styles.progressLabels}>
            <Text
              style={[
                styles.progressLabel,
                step1Done && styles.progressLabelActive,
              ]}
            >
              Details
            </Text>
            <Text
              style={[
                styles.progressLabel,
                step2Done && styles.progressLabelActive,
              ]}
            >
              Items
            </Text>
            <Text
              style={[
                styles.progressLabel,
                step3Done && styles.progressLabelActive,
              ]}
            >
              Review
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{ paddingBottom: 140, paddingTop: 16 }}
        >
          <View style={styles.formContainer}>
            <QuoteHeader
              projectTitle={viewModel.projectTitle}
              setProjectTitle={viewModel.setProjectTitle}
              onTemplatePress={() => viewModel.setShowTemplateModal(true)}
              selectedTemplate={viewModel.selectedTemplate}
              templates={
                viewModel.templates as unknown as { id: string; name: string }[]
              }
            />

            <ClientInfo
              clientName={viewModel.clientName}
              setClientName={viewModel.setClientName}
              clientEmail={viewModel.clientEmail}
              setClientEmail={viewModel.setClientEmail}
              clientPhone={viewModel.clientPhone}
              setClientPhone={viewModel.setClientPhone}
            />

            <QuoteItemsList
              lineItems={viewModel.lineItems}
              onAddItem={() => viewModel.setShowLineItemModal(true)}
              onEditItem={(index) => {
                viewModel.setEditingItemIndex(index);
                viewModel.setShowLineItemModal(true);
              }}
              onRemoveItem={viewModel.removeLineItem}
            />

            <PricingSummary
              subtotal={viewModel.subtotal}
              markupPercentage={viewModel.markupPercentage}
              discountAmount={viewModel.discountAmount}
              discountPercentage={viewModel.discountPercentage}
              taxAmount={viewModel.taxAmount}
              taxRate={viewModel.taxRate}
              totalAmount={viewModel.totalAmount}
            />
          </View>
        </ScrollView>

        {/* Floating total bar */}
        <View
          style={[
            styles.floatingBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.floatingTop}>
            <View>
              <Text style={styles.floatingLabel}>Total</Text>
              <Text style={styles.floatingAmount}>
                {formatCurrency(viewModel.totalAmount)}
              </Text>
            </View>
            <View style={styles.itemBadge}>
              <Text style={styles.itemBadgeText}>
                {viewModel.lineItems.length}{' '}
                {viewModel.lineItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          <QuoteActions
            loading={viewModel.loading}
            onSave={viewModel.saveQuote}
            onSend={viewModel.sendQuote}
            onBack={() => navigation.goBack()}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: me.bg2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: me.ink2,
  },

  // Header
  header: {
    backgroundColor: me.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: me.ink3,
    fontWeight: '500',
    marginTop: 1,
  },
  templateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: me.line,
  },
  progressSegmentActive: {
    backgroundColor: me.ink,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: me.ink3,
  },
  progressLabelActive: {
    color: me.ink,
    fontWeight: '600',
  },

  // Form
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 16,
  },

  // Floating bar
  floatingBar: {
    backgroundColor: me.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...me.shadow.pop,
  },
  floatingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  floatingLabel: {
    fontSize: 12,
    color: me.ink2,
    fontWeight: '500',
  },
  floatingAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: me.ink,
    letterSpacing: -0.5,
  },
  itemBadge: {
    backgroundColor: me.bg2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
});
