import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  CardField,
  useStripe,
  useConfirmSetupIntent,
  CardFieldInput,
} from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { PaymentService } from '../../services/PaymentService';
import { theme } from '../../theme';

export default function AddPaymentMethodScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { confirmSetupIntent } = useStripe();

  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [billingEmail, setBillingEmail] = useState(user?.email || '');

  const handleAddPaymentMethod = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Incomplete Card', 'Please enter complete card details');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a payment method');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create setup intent on backend
      const { setupIntentClientSecret, error: setupError } = await PaymentService.createSetupIntent();

      if (setupError || !setupIntentClientSecret) {
        throw new Error(setupError || 'Failed to create setup intent');
      }

      // Step 2: Confirm setup intent with card details
      const { setupIntent, error: confirmError } = await confirmSetupIntent(setupIntentClientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: billingEmail || user.email,
            name: `${user.firstName} ${user.lastName}`.trim() || 'Customer',
          },
        },
      });

      if (confirmError) {
        // Handle specific error types
        if (confirmError.code === 'Canceled') {
          logger.info('User canceled 3D Secure authentication');
          Alert.alert('Authentication Canceled', 'Payment method was not added');
          return;
        }

        if (confirmError.code === 'Failed') {
          logger.error('3D Secure authentication failed', { error: confirmError });
          Alert.alert(
            'Authentication Failed',
            'Your bank declined the authentication. Please try another card.'
          );
          return;
        }

        throw new Error(confirmError.message);
      }

      if (setupIntent?.status === 'Succeeded') {
        // Step 3: Save payment method ID to backend
        const paymentMethodId = setupIntent.paymentMethodId;

        if (paymentMethodId) {
          await PaymentService.savePaymentMethod(paymentMethodId, saveForFuture);

          logger.info('Payment method added successfully', {
            paymentMethodId,
            userId: user.id
          });

          Alert.alert(
            'Success',
            'Payment method added successfully',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      } else {
        throw new Error('Setup intent did not succeed');
      }
    } catch (error) {
      logger.error('Failed to add payment method', { error });

      const errorMessage = error instanceof Error ? error.message : 'Failed to add payment method';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Payment Method</Text>
          </View>

          {/* Card Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Information</Text>
            <CardField
              postalCodeEnabled={true}
              placeholders={{
                number: '4242 4242 4242 4242',
                expiry: 'MM/YY',
                cvc: 'CVC',
                postalCode: 'ZIP',
              }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: 8,
                fontSize: 16,
                placeholderColor: '#999999',
                cursorColor: theme.colors.primary,
              }}
              style={styles.cardField}
              onCardChange={(cardDetails) => {
                setCardDetails(cardDetails);
              }}
            />
          </View>

          {/* Save for Future */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSaveForFuture(!saveForFuture)}
            >
              <View style={[
                styles.checkbox,
                saveForFuture && styles.checkboxChecked
              ]}>
                {saveForFuture && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Save this card for future payments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.securityText}>
              Your payment information is encrypted and secure. We never store your full card details.
            </Text>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              (!cardDetails?.complete || loading) && styles.addButtonDisabled
            ]}
            onPress={handleAddPaymentMethod}
            disabled={!cardDetails?.complete || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            )}
          </TouchableOpacity>

          {/* Test Card Notice (for development) */}
          {__DEV__ && (
            <View style={styles.testNotice}>
              <Text style={styles.testTitle}>Test Cards:</Text>
              <Text style={styles.testText}>• Success: 4242 4242 4242 4242</Text>
              <Text style={styles.testText}>• 3D Secure: 4000 0025 0000 3155</Text>
              <Text style={styles.testText}>• Decline: 4000 0000 0000 9995</Text>
              <Text style={styles.testText}>Use any future date and any 3-digit CVC</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  testNotice: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  testTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  testText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
});