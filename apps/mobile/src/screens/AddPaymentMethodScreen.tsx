import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import { PaymentService } from '../services/PaymentService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

const AddPaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation<unknown>();
  const { user } = useAuth();
  const { createPaymentMethod } = useStripe();

  const [paymentType, setPaymentType] = useState<'card' | 'bank' | 'paypal'>('card');
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardBrand, setCardBrand] = useState<string>('');

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a payment method');
      return;
    }

    if (paymentType === 'card') {
      if (!cardComplete) {
        Alert.alert('Error', 'Please complete your card information');
        return;
      }

      setLoading(true);
      try {
        // Create payment method using Stripe
        const { paymentMethod, error } = await createPaymentMethod({
          paymentMethodType: 'Card',
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!paymentMethod) {
          throw new Error('Failed to create payment method');
        }

        logger.info('Payment method created via Stripe', {
          paymentMethodId: paymentMethod.id,
          brand: paymentMethod.Card?.brand,
        });

        // Save payment method to backend
        await PaymentService.addPaymentMethod(
          user.id,
          paymentMethod.id,
          true // Set as default for first card
        );

        Alert.alert(
          'Success',
          'Your payment method has been added successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } catch (error) {
        logger.error('Failed to add payment method', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to add payment method. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    } else if (paymentType === 'paypal') {
      // PayPal integration would go here
      Alert.alert('Coming Soon', 'PayPal integration is coming soon!');
    } else if (paymentType === 'bank') {
      // Bank account integration would go here
      Alert.alert('Coming Soon', 'Bank account linking is coming soon!');
    }
  };

  const renderCardForm = () => (
    <View style={styles.cardFieldContainer}>
      <Text style={styles.label}>Card Details</Text>
      <CardField
        postalCodeEnabled={true}
        placeholders={{ number: '4242 4242 4242 4242' }}
        cardStyle={{
          backgroundColor: theme.colors.surface,
          textColor: theme.colors.textPrimary,
          borderWidth: 1,
          borderColor: theme.colors.borderLight,
          borderRadius: 12,
          fontSize: 16,
          placeholderColor: theme.colors.textSecondary,
        }}
        style={styles.cardField}
        onCardChange={(details) => {
          setCardComplete(details.complete);
          setCardBrand(details.brand || '');
        }}
      />
      {cardBrand ? (
        <Text style={styles.cardBrandText}>
          {cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} card detected
        </Text>
      ) : null}
    </View>
  );

  const renderPayPalForm = () => (
    <View style={styles.paypalContainer}>
      <Ionicons name="logo-paypal" size={48} color="#003087" style={{ alignSelf: 'center', marginBottom: 16 }} />
      <Text style={styles.paypalText}>
        You'll be redirected to PayPal to securely link your account.
      </Text>
      <Text style={styles.paypalSubtext}>
        This will allow you to pay using your PayPal balance, linked bank account, or cards saved in PayPal.
      </Text>
    </View>
  );

  const renderBankForm = () => (
    <View style={styles.bankContainer}>
      <Ionicons name="business" size={48} color={theme.colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
      <Text style={styles.bankText}>
        Bank account linking is coming soon!
      </Text>
      <Text style={styles.bankSubtext}>
        You'll be able to link your bank account for direct ACH transfers.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Payment Method</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Choose your preferred payment method</Text>

        {/* Payment Type Selector */}
        <View style={styles.paymentTypeContainer}>
          <TouchableOpacity
            style={[styles.paymentTypeButton, paymentType === 'card' && styles.paymentTypeButtonActive]}
            onPress={() => setPaymentType('card')}
          >
            <Ionicons
              name="card"
              size={24}
              color={paymentType === 'card' ? theme.colors.textInverse : theme.colors.primary}
            />
            <Text style={[
              styles.paymentTypeText,
              paymentType === 'card' && styles.paymentTypeTextActive
            ]}>
              Credit/Debit Card
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.paymentTypeButton, styles.paymentTypeDisabled]}
          >
            <Ionicons
              name="logo-paypal"
              size={24}
              color={theme.colors.textTertiary}
            />
            <Text style={[styles.paymentTypeText, styles.paymentTypeTextDisabled]}>
              PayPal
            </Text>
            <Text style={styles.comingSoonBadge}>Soon</Text>
          </View>

          <View
            style={[styles.paymentTypeButton, styles.paymentTypeDisabled]}
          >
            <Ionicons
              name="business"
              size={24}
              color={theme.colors.textTertiary}
            />
            <Text style={[styles.paymentTypeText, styles.paymentTypeTextDisabled]}>
              Bank Account
            </Text>
            <Text style={styles.comingSoonBadge}>Soon</Text>
          </View>
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          {paymentType === 'card' && renderCardForm()}
          {paymentType === 'paypal' && renderPayPalForm()}
          {paymentType === 'bank' && renderBankForm()}
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
            <Text style={styles.securityTitle}>Your information is secure</Text>
          </View>
          <Text style={styles.securityText}>
            All payment information is encrypted and processed securely. We never store your full card details.
          </Text>
        </View>

        <Button
          variant="secondary"
          title={paymentType === 'card' ? 'Add Card' : paymentType === 'paypal' ? 'Connect PayPal' : 'Link Bank Account'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || paymentType === 'bank'}
          fullWidth
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 8,
  },
  paymentTypeButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  paymentTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  paymentTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  paymentTypeTextActive: {
    color: theme.colors.textInverse,
  },
  paymentTypeDisabled: {
    opacity: 0.5,
  },
  paymentTypeTextDisabled: {
    color: theme.colors.textTertiary,
  },
  comingSoonBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  formContainer: {
    marginBottom: 32,
  },
  cardFieldContainer: {
    marginBottom: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginTop: 4,
  },
  cardBrandText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  paypalContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  paypalText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  paypalSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bankContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  bankText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  bankSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  securityInfo: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  securityText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  submitButton: {
    marginBottom: 32,
  },
});

export default AddPaymentMethodScreen;