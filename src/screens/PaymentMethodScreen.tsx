import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';

interface PaymentMethodParams {
  jobId: string;
  amount: number;
  contractorId: string;
  jobTitle: string;
}

interface Props {
  route: RouteProp<{ params: PaymentMethodParams }>;
  navigation: StackNavigationProp<any>;
}

type PaymentMethodType = 'cash' | 'card' | 'paypal' | 'apple_pay';

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  available: boolean;
}

const PaymentMethodScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, amount, contractorId, jobTitle } = route.params || {};
  const haptics = useHaptics();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      type: 'cash',
      name: 'Cash',
      icon: 'cash-outline',
      description: 'Pay the contractor directly in cash',
      available: true,
    },
    {
      id: 'card',
      type: 'card',
      name: 'Add New Card',
      icon: 'card-outline',
      description: 'Credit or Debit Card',
      available: true,
    },
    {
      id: 'paypal',
      type: 'paypal',
      name: 'PayPal',
      icon: 'logo-paypal',
      description: 'Pay with your PayPal account',
      available: true,
    },
    {
      id: 'apple_pay',
      type: 'apple_pay',
      name: 'Apple Pay',
      icon: 'logo-apple',
      description: 'Quick and secure payment',
      available: false, // Enable based on device capability
    },
  ];

  const handleMethodSelect = (method: PaymentMethodType) => {
    haptics.buttonPress();
    setSelectedMethod(method);

    switch (method) {
      case 'cash':
        handleCashPayment();
        break;
      case 'card':
        setShowCardModal(true);
        break;
      case 'paypal':
        handlePayPalPayment();
        break;
      case 'apple_pay':
        handleApplePayment();
        break;
    }
  };

  const handleCashPayment = () => {
    Alert.alert(
      'Cash Payment Selected',
      `You've selected to pay $${amount.toFixed(2)} in cash directly to the contractor. Please coordinate with them for payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            // Navigate to payment confirmation or job completion
            navigation.navigate('PaymentConfirmation', {
              method: 'cash',
              amount,
              jobId,
              jobTitle,
            });
          }
        },
      ]
    );
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }

    setLoading(true);
    haptics.buttonPress();

    try {
      // Simulate card processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowCardModal(false);
      
      Alert.alert(
        'Payment Successful',
        `Your payment of $${amount.toFixed(2)} has been processed successfully.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.navigate('PaymentConfirmation', {
                method: 'card',
                amount,
                jobId,
                jobTitle,
                cardLast4: cardNumber.slice(-4),
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalPayment = () => {
    Alert.alert(
      'PayPal Payment',
      'You will be redirected to PayPal to complete your payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue to PayPal', 
          onPress: () => {
            // In a real app, this would open PayPal SDK
            navigation.navigate('PaymentConfirmation', {
              method: 'paypal',
              amount,
              jobId,
              jobTitle,
            });
          }
        },
      ]
    );
  };

  const handleApplePayment = () => {
    Alert.alert(
      'Apple Pay',
      'Apple Pay is not available on this device or not set up.',
      [{ text: 'OK' }]
    );
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})/);
    if (match) {
      return [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ');
    }
    return cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        !method.available && styles.paymentMethodDisabled,
        selectedMethod === method.type && styles.paymentMethodSelected,
      ]}
      onPress={() => method.available && handleMethodSelect(method.type)}
      disabled={!method.available}
    >
      <View style={styles.paymentMethodIcon}>
        <Ionicons 
          name={method.icon} 
          size={32} 
          color={method.available ? theme.colors.primary : theme.colors.textTertiary} 
        />
      </View>
      <View style={styles.paymentMethodDetails}>
        <Text style={[
          styles.paymentMethodName,
          !method.available && styles.paymentMethodNameDisabled
        ]}>
          {method.name}
        </Text>
        <Text style={[
          styles.paymentMethodDescription,
          !method.available && styles.paymentMethodDescriptionDisabled
        ]}>
          {method.description}
        </Text>
      </View>
      <View style={styles.paymentMethodRadio}>
        <View style={[
          styles.radioOuter,
          selectedMethod === method.type && styles.radioSelected
        ]}>
          {selectedMethod === method.type && <View style={styles.radioInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCardModal = () => (
    <Modal
      visible={showCardModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCardModal(false)}
    >
      <View style={styles.cardModalContainer}>
        <View style={styles.cardModalHeader}>
          <TouchableOpacity onPress={() => setShowCardModal(false)}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.cardModalTitle}>Add Card</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.cardModalContent}>
          {/* Card Preview */}
          <View style={styles.cardPreview}>
            <View style={styles.cardVisual}>
              <Text style={styles.cardNumber}>
                {cardNumber || '4716 9627 1635 8047'}
              </Text>
              <View style={styles.cardInfo}>
                <View>
                  <Text style={styles.cardLabel}>Card holder name</Text>
                  <Text style={styles.cardValue}>
                    {cardholderName || 'Esther Howard'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>Expiry date</Text>
                  <Text style={styles.cardValue}>
                    {expiryDate || '02/30'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardBrand}>VISA</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Card Holder Name</Text>
            <TextInput
              style={styles.textInput}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="Esther Howard"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Card Number</Text>
            <TextInput
              style={styles.textInput}
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              placeholder="4716 9627 1635 8047"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="numeric"
              maxLength={19}
            />

            <View style={styles.rowContainer}>
              <View style={styles.halfWidth}>
                <Text style={styles.fieldLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  placeholder="02/30"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.fieldLabel}>CVV</Text>
                <TextInput
                  style={styles.textInput}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="000"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.saveCardContainer}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.secondary} />
              <Text style={styles.saveCardText}>Save Card</Text>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity 
          style={[styles.addCardButton, loading && styles.addCardButtonDisabled]}
          onPress={handleCardPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.addCardButtonText}>Add Card</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Pay on Cash Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay on Cash</Text>
          {renderPaymentMethod(paymentMethods.find(m => m.type === 'cash')!)}
        </View>

        {/* Credit & Debit Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit & Debit Card</Text>
          {renderPaymentMethod(paymentMethods.find(m => m.type === 'card')!)}
        </View>

        {/* More Payment Options Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Payment Options</Text>
          {paymentMethods
            .filter(m => m.type === 'paypal' || m.type === 'apple_pay')
            .map(renderPaymentMethod)}
        </View>
      </ScrollView>

      {renderCardModal()}
    </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...theme.shadows.base,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  paymentMethodCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadows.base,
  },
  paymentMethodDisabled: {
    opacity: 0.5,
  },
  paymentMethodSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  paymentMethodNameDisabled: {
    color: theme.colors.textTertiary,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  paymentMethodDescriptionDisabled: {
    color: theme.colors.textTertiary,
  },
  paymentMethodRadio: {
    marginLeft: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  
  // Card Modal Styles
  cardModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  cardModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cardModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardPreview: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardVisual: {
    width: 320,
    height: 200,
    backgroundColor: '#4A4A4A',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
    letterSpacing: 2,
    marginBottom: 32,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 10,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    color: theme.colors.textInverse,
    fontWeight: '500',
  },
  cardBrand: {
    position: 'absolute',
    top: 20,
    right: 24,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  formContainer: {
    marginBottom: 32,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  saveCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveCardText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  addCardButton: {
    backgroundColor: theme.colors.primary,
    margin: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardButtonDisabled: {
    opacity: 0.6,
  },
  addCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});

export default PaymentMethodScreen;
