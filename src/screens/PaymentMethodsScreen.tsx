import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { PaymentService } from '../services/PaymentService';
import { theme } from '../theme';
import Button from '../components/ui/Button';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  email?: string; // For PayPal
  bankName?: string; // For bank accounts
}

const PaymentMethodsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);

      // Mock payment methods for demonstration
      // In a real app, you'd fetch from PaymentService
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: '1',
          type: 'card',
          last4: '4242',
          brand: 'Visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
        },
        {
          id: '2',
          type: 'card',
          last4: '0005',
          brand: 'Mastercard',
          expiryMonth: 8,
          expiryYear: 2026,
          isDefault: false,
        },
        {
          id: '3',
          type: 'paypal',
          email: user.email,
          isDefault: false,
        },
      ];

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPaymentMethods(mockPaymentMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'This would open a form to add a new payment method',
      [{ text: 'OK' }]
    );
  };

  const handleDeletePaymentMethod = (methodId: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods((methods) =>
              methods.filter((m) => m.id !== methodId)
            );
          },
        },
      ]
    );
  };

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods((methods) =>
      methods.map((method) => ({
        ...method,
        isDefault: method.id === methodId,
      }))
    );
  };

  const renderPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return <Ionicons name='card' size={24} color={theme.colors.primary} />;
      case 'bank':
        return (
          <Ionicons name='business' size={24} color={theme.colors.primary} />
        );
      case 'paypal':
        return <Ionicons name='logo-paypal' size={24} color='#003087' />;
      default:
        return <Ionicons name='card' size={24} color={theme.colors.primary} />;
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <View key={method.id} style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodHeader}>
        <View style={styles.paymentMethodInfo}>
          <View style={styles.paymentMethodIcon}>
            {renderPaymentMethodIcon(method)}
          </View>
          <View style={styles.paymentMethodDetails}>
            {method.type === 'card' && (
              <>
                <Text style={styles.paymentMethodTitle}>
                  {method.brand} •••• {method.last4}
                </Text>
                <Text style={styles.paymentMethodSubtitle}>
                  Expires {method.expiryMonth?.toString().padStart(2, '0')}/
                  {method.expiryYear}
                </Text>
              </>
            )}
            {method.type === 'paypal' && (
              <>
                <Text style={styles.paymentMethodTitle}>PayPal</Text>
                <Text style={styles.paymentMethodSubtitle}>{method.email}</Text>
              </>
            )}
            {method.type === 'bank' && (
              <>
                <Text style={styles.paymentMethodTitle}>{method.bankName}</Text>
                <Text style={styles.paymentMethodSubtitle}>
                  •••• {method.last4}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.paymentMethodActions}>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
          {!method.isDefault && (
            <Button
              variant='secondary'
              size='sm'
              title='Set Default'
              onPress={() => handleSetDefault(method.id)}
            />
          )}
          <Button
            variant='danger'
            size='sm'
            title='Delete'
            onPress={() => handleDeletePaymentMethod(method.id)}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name='warning-outline' size={50} color={theme.colors.error} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button variant='primary' title='Retry' onPress={loadPaymentMethods} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Your Payment Methods</Text>
        <Text style={styles.sectionSubtitle}>
          Manage your payment methods for secure transactions
        </Text>

        {paymentMethods.length > 0 ? (
          <View style={styles.paymentMethodsList}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name='card-outline'
              size={50}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptySubtitle}>
              Add a payment method to start making secure payments
            </Text>
          </View>
        )}

        <Button
          variant='primary'
          title='Add Payment Method'
          onPress={handleAddPaymentMethod}
          fullWidth
        />

        <View style={styles.securityInfo}>
          <View style={styles.securityHeader}>
            <Ionicons
              name='shield-checkmark'
              size={20}
              color={theme.colors.secondary}
            />
            <Text style={styles.securityTitle}>Your payment is secure</Text>
          </View>
          <Text style={styles.securityText}>
            All payment information is encrypted and processed securely. We
            never store your full card details on our servers.
          </Text>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  paymentMethodsList: {
    marginBottom: 32,
  },
  paymentMethodCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  securityInfo: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
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
});

export default PaymentMethodsScreen;
