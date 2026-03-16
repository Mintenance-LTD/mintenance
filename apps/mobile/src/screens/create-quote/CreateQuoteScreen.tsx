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
import { theme } from '../../theme';

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
  const { jobId, clientName: initialClientName, clientEmail: initialClientEmail } = route.params || {};
  const viewModel = useCreateQuoteViewModel(jobId, initialClientName, initialClientEmail);

  if (viewModel.loading && viewModel.lineItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={theme.colors.textPrimary} />
        <Text style={styles.loadingText}>Creating quote...</Text>
      </View>
    );
  }

  const quoteNumber = `Q-${Date.now().toString().slice(-6)}`;

  // Step progress
  const step1Done = true;
  const step2Done = viewModel.lineItems.length > 0;
  const step3Done = viewModel.totalAmount > 0;
  const progressSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>New Quote</Text>
              <Text style={styles.headerSubtitle}>{quoteNumber}</Text>
            </View>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => viewModel.setShowTemplateModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Use template"
            >
              <Ionicons name="document-text-outline" size={18} color={theme.colors.textPrimary} />
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
            <Text style={[styles.progressLabel, step1Done && styles.progressLabelActive]}>Details</Text>
            <Text style={[styles.progressLabel, step2Done && styles.progressLabelActive]}>Items</Text>
            <Text style={[styles.progressLabel, step3Done && styles.progressLabelActive]}>Review</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140, paddingTop: 16 }}
        >
          <View style={styles.formContainer}>
            <QuoteHeader
              projectTitle={viewModel.projectTitle}
              setProjectTitle={viewModel.setProjectTitle}
              onTemplatePress={() => viewModel.setShowTemplateModal(true)}
              selectedTemplate={viewModel.selectedTemplate}
              templates={viewModel.templates as unknown as { id: string; name: string }[]}
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
        <View style={[styles.floatingBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.floatingTop}>
            <View>
              <Text style={styles.floatingLabel}>Total</Text>
              <Text style={styles.floatingAmount}>
                £{viewModel.totalAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.itemBadge}>
              <Text style={styles.itemBadgeText}>
                {viewModel.lineItems.length} {viewModel.lineItems.length === 1 ? 'item' : 'items'}
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },

  // Header
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
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
    backgroundColor: theme.colors.backgroundSecondary,
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
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '500',
    marginTop: 1,
  },
  templateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
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
    backgroundColor: theme.colors.border,
  },
  progressSegmentActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  progressLabelActive: {
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  floatingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  floatingLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  floatingAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  itemBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

export default CreateQuoteScreen;
