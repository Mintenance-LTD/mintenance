/**
 * PaymentMethodsScreen Container
 * 
 * Manages payment methods with card addition functionality.
 * 
 * @filesize Target: <90 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { theme } from '../../theme';
import { ScreenHeader } from '../../components/shared';
import { usePaymentMethodsViewModel } from './viewmodels/PaymentMethodsViewModel';
import {
  PaymentMethodOption,
  CreditCardPreview,
  CreditCardForm,
} from './components';

interface PaymentMethodsScreenProps {
  navigation: any;
}

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({ navigation }) => {
  const viewModel = usePaymentMethodsViewModel();

  const handleAddCard = async () => {
    try {
      await viewModel.handleAddCard();
      Alert.alert('Success', 'Card added successfully');
    } catch (error) {
      Alert.alert('Error', 'Please fill in all card details');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Payment Method"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cash Payment */}
        <Text style={styles.sectionTitle}>Pay on Cash</Text>
        <PaymentMethodOption
          method={viewModel.paymentMethods[0]}
          isSelected={viewModel.selectedMethod === 'cash'}
          onSelect={viewModel.selectMethod}
        />

        {/* Credit Card */}
        <Text style={styles.sectionTitle}>Credit & Debit Card</Text>
        {viewModel.showAddCard ? (
          <>
            <CreditCardPreview
              holderName={viewModel.cardDetails.holderName}
              number={viewModel.cardDetails.number}
              expiry={viewModel.cardDetails.expiry}
            />
            <CreditCardForm
              cardDetails={viewModel.cardDetails}
              saveCard={viewModel.saveCard}
              onUpdateDetails={viewModel.updateCardDetails}
              onToggleSaveCard={viewModel.toggleSaveCard}
              formatCardNumber={viewModel.formatCardNumber}
              formatExpiry={viewModel.formatExpiry}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
              <Text style={styles.addButtonText}>Add Card</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.addCardTrigger}
            onPress={() => viewModel.toggleAddCard(true)}
          >
            <Text style={styles.addCardText}>+ Add New Card</Text>
          </TouchableOpacity>
        )}

        {/* More Options */}
        <Text style={styles.sectionTitle}>More Payment Options</Text>
        {viewModel.paymentMethods.slice(1).map((method) => (
          <PaymentMethodOption
            key={method.id}
            method={method}
            isSelected={viewModel.selectedMethod === method.id}
            onSelect={viewModel.selectMethod}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  addCardTrigger: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  addCardText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  addButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
});

export default PaymentMethodsScreen;
