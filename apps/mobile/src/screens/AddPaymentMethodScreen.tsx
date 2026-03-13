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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import Button from '../components/ui/Button';
import { PaymentService } from '../services/PaymentService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
import { useToast } from '../components/ui/Toast';

const PAYMENT_TYPES = [
  { key: 'card' as const, label: 'Credit/Debit Card', icon: 'card' as const, enabled: true },
  { key: 'paypal' as const, label: 'PayPal', icon: 'logo-paypal' as const, enabled: false, badge: 'Soon' },
  { key: 'bank' as const, label: 'Bank Account', icon: 'business' as const, enabled: true },
];

const AddPaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { createPaymentMethod } = useStripe();
  const toast = useToast();

  const [paymentType, setPaymentType] = useState<'card' | 'bank' | 'paypal'>('card');
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardBrand, setCardBrand] = useState<string>('');
  const [bankName, setBankName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notifyMePayPal, setNotifyMePayPal] = useState(false);

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
        await PaymentService.savePaymentMethod(
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
          error instanceof Error ? error.message : 'Failed to add payment method. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    } else if (paymentType === 'bank') {
      if (!bankName.trim() || !sortCode.trim() || !accountNumber.trim()) {
        Alert.alert('Missing Details', 'Please fill in all bank account fields.');
        return;
      }
      setLoading(true);
      try {
        await mobileApiClient.post('/api/payments/bank-account', {
          accountHolderName: bankName.trim(),
          sortCode: sortCode.replace(/-/g, ''),
          accountNumber: accountNumber.trim(),
        });
        Alert.alert('Bank Account Added', 'Your bank account has been linked successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        logger.error('Failed to add bank account', error);
        Alert.alert('Error', 'Failed to link bank account. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderCardForm = () => (
    <View style={styles.cardFieldContainer}>
      <Text style={styles.label}>Card Details</Text>
      <CardField
        postalCodeEnabled={true}
        placeholders={{ number: '4242 4242 4242 4242' }}
        cardStyle={{
          backgroundColor: '#FFFFFF',
          textColor: '#222222',
          borderWidth: 0,
          borderRadius: 12,
          fontSize: 16,
          placeholderColor: '#B0B0B0',
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
      <View style={styles.paypalIconWrap}>
        <Ionicons name="logo-paypal" size={32} color="#3B82F6" />
      </View>
      <Text style={styles.paypalText}>PayPal is coming soon</Text>
      <Text style={styles.paypalSubtext}>
        We're working on PayPal integration. Get notified when it's available.
      </Text>
      <TouchableOpacity
        style={[styles.notifyButton, notifyMePayPal && styles.notifyButtonActive]}
        onPress={() => {
          setNotifyMePayPal(true);
          toast.success('You\'re on the list!', 'We\'ll notify you when PayPal is available.');
        }}
        disabled={notifyMePayPal}
      >
        <Ionicons name={notifyMePayPal ? 'checkmark-circle' : 'notifications-outline'} size={18} color={notifyMePayPal ? '#10B981' : '#717171'} />
        <Text style={[styles.notifyButtonText, notifyMePayPal && { color: '#10B981' }]}>
          {notifyMePayPal ? 'Notifications enabled' : 'Notify me when available'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBankForm = () => (
    <View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name on account"
          placeholderTextColor="#B0B0B0"
          value={bankName}
          onChangeText={setBankName}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sort Code</Text>
        <TextInput
          style={styles.input}
          placeholder="00-00-00"
          placeholderTextColor="#B0B0B0"
          value={sortCode}
          onChangeText={setSortCode}
          keyboardType="numbers-and-punctuation"
          maxLength={8}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={styles.input}
          placeholder="00000000"
          placeholderTextColor="#B0B0B0"
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
          maxLength={8}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Payment Method</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Choose your preferred payment method</Text>

        {/* Payment Type Selector */}
        <View style={styles.paymentTypeContainer}>
          {PAYMENT_TYPES.map((pt) => {
            const isActive = paymentType === pt.key;
            return (
              <TouchableOpacity
                key={pt.key}
                style={[
                  styles.paymentTypeButton,
                  isActive && styles.paymentTypeButtonActive,
                  !pt.enabled && styles.paymentTypeDisabled,
                ]}
                onPress={() => pt.enabled && setPaymentType(pt.key)}
                disabled={!pt.enabled}
                accessibilityRole="button"
                accessibilityLabel={`${pt.label}${!pt.enabled ? ' (coming soon)' : ''}`}
                accessibilityState={{ selected: isActive }}
              >
                <View style={[styles.paymentIconWrap, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F7F7F7' }]}>
                  <Ionicons
                    name={pt.icon}
                    size={20}
                    color={isActive ? '#FFFFFF' : '#717171'}
                  />
                </View>
                <Text style={[
                  styles.paymentTypeText,
                  isActive && styles.paymentTypeTextActive
                ]}>
                  {pt.label}
                </Text>
                {pt.badge && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>{pt.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
            <View style={styles.securityIconWrap}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            </View>
            <Text style={styles.securityTitle}>Your information is secure</Text>
          </View>
          <Text style={styles.securityText}>
            All payment information is encrypted and processed securely. We never store your full card details.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (loading || paymentType === 'paypal') && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || paymentType === 'paypal'}
          accessibilityRole="button"
          accessibilityLabel={paymentType === 'card' ? 'Add Card' : paymentType === 'paypal' ? 'Connect PayPal' : 'Link Bank Account'}
          accessibilityState={{ disabled: loading || paymentType === 'paypal' }}
        >
          <Ionicons name={paymentType === 'card' ? 'card-outline' : 'business-outline'} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>
            {loading ? 'Processing...' : paymentType === 'card' ? 'Add Card' : paymentType === 'paypal' ? 'Connect PayPal' : 'Link Bank Account'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#717171',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  paymentTypeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  paymentTypeButtonActive: {
    backgroundColor: '#10B981',
  },
  paymentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },
  paymentTypeTextActive: {
    color: '#FFFFFF',
  },
  paymentTypeDisabled: {
    opacity: 0.5,
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardFieldContainer: {
    marginBottom: 8,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginTop: 4,
  },
  cardBrandText: {
    fontSize: 12,
    color: '#717171',
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#222222',
  },
  paypalContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  paypalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  paypalText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
    marginBottom: 8,
  },
  paypalSubtext: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 20,
  },
  securityInfo: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  securityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  securityText: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 18,
  },
  submitButton: {
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: '#F7F7F7',
    alignSelf: 'center',
  },
  notifyButtonActive: {
    backgroundColor: '#D1FAE5',
  },
  notifyButtonText: { fontSize: 14, fontWeight: '600', color: '#717171' },
});

export default AddPaymentMethodScreen;
