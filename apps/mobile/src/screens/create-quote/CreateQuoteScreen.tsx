/**
 * CreateQuoteScreen Container
 * 
 * Main container for quote creation with form sections.
 * 
 * @filesize Target: <100 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner } from '../../components/shared';
import { useCreateQuoteViewModel } from './viewmodels/CreateQuoteViewModel';
import {
  QuoteHeader,
  ClientInfo,
  QuoteItemsList,
  PricingSummary,
  QuoteActions,
} from './components';

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

export const CreateQuoteScreen: React.FC<CreateQuoteScreenProps> = ({
  navigation,
  route,
}) => {
  const { jobId, clientName: initialClientName, clientEmail: initialClientEmail } = route.params || {};
  
  const viewModel = useCreateQuoteViewModel(jobId, initialClientName, initialClientEmail);

  if (viewModel.loading) {
    return <LoadingSpinner message="Creating quote..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Create Quote"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <QuoteHeader
          projectTitle={viewModel.projectTitle}
          setProjectTitle={viewModel.setProjectTitle}
          onTemplatePress={() => viewModel.setShowTemplateModal(true)}
          selectedTemplate={viewModel.selectedTemplate}
          templates={viewModel.templates}
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
      </ScrollView>

      <QuoteActions
        loading={viewModel.loading}
        onSave={viewModel.saveQuote}
        onSend={viewModel.sendQuote}
        onBack={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
});

export default CreateQuoteScreen;
