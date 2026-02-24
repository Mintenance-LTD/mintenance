/**
 * PaymentMethodsScreen Container
 *
 * Manages payment methods with real Stripe card data from API.
 *
 * @filesize Target: <150 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ScreenHeader } from '../../components/shared';
import { usePaymentMethodsViewModel } from './viewmodels/PaymentMethodsViewModel';
import { PaymentMethodOption } from './components';
import type { NavigationProp } from '@react-navigation/native';

interface PaymentMethodsScreenProps {
  navigation: NavigationProp<Record<string, undefined>>;
}

const BRAND_ICONS: Record<string, string> = {
  visa: 'card',
  mastercard: 'card',
  amex: 'card',
  discover: 'card',
};

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({ navigation }) => {
  const vm = usePaymentMethodsViewModel();

  const handleDeleteCard = (cardId: string, last4: string) => {
    Alert.alert(
      'Remove Card',
      `Remove card ending in ${last4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await vm.deleteCard(cardId);
            } catch {
              Alert.alert('Error', 'Failed to remove card');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <ScreenHeader
        title="Payment Method"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={vm.loading} onRefresh={vm.refresh} />
        }
      >
        {/* Saved Cards */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Your Cards
        </Text>

        {vm.loading && vm.savedCards.length === 0 ? (
          <View style={[styles.loadingBox, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading payment methods...
            </Text>
          </View>
        ) : vm.savedCards.length > 0 ? (
          vm.savedCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardRow,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                vm.selectedMethod === card.id && { borderColor: theme.colors.primary },
              ]}
              onPress={() => vm.selectMethod(card.id)}
              onLongPress={() => handleDeleteCard(card.id, card.last4)}
              accessibilityRole="radio"
              accessibilityLabel={`${card.brand} ending in ${card.last4}`}
              accessibilityState={{ selected: vm.selectedMethod === card.id }}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.cardIconBox, { backgroundColor: theme.colors.surfaceTertiary }]}>
                  <Ionicons
                    name={(BRAND_ICONS[card.brand.toLowerCase()] || 'card') as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <View>
                  <Text style={[styles.cardBrand, { color: theme.colors.textPrimary }]}>
                    {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} **** {card.last4}
                  </Text>
                  <Text style={[styles.cardExpiry, { color: theme.colors.textTertiary }]}>
                    Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {card.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.defaultText, { color: theme.colors.primary }]}>Default</Text>
                  </View>
                )}
                <View style={[
                  styles.radio,
                  { borderColor: theme.colors.border },
                  vm.selectedMethod === card.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
                ]} />
              </View>
            </TouchableOpacity>
          ))
        ) : !vm.loading ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="card-outline" size={32} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No cards saved yet
            </Text>
          </View>
        ) : null}

        {/* Add Card Button */}
        <TouchableOpacity
          style={[styles.addCardTrigger, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('AddPaymentMethod' as never)}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.addCardText, { color: theme.colors.primary }]}>Add New Card</Text>
        </TouchableOpacity>

        {/* Cash */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Pay on Cash
        </Text>
        <PaymentMethodOption
          method={vm.paymentMethods[0]}
          isSelected={vm.selectedMethod === 'cash'}
          onSelect={vm.selectMethod}
        />

        {/* More Options */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          More Payment Options
        </Text>
        {vm.paymentMethods.slice(1).map((method) => (
          <PaymentMethodOption
            key={method.id}
            method={method}
            isSelected={vm.selectedMethod === method.id}
            onSelect={vm.selectMethod}
          />
        ))}

        {vm.error && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{vm.error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  loadingBox: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: { fontSize: 14 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBrand: { fontSize: 15, fontWeight: '500' },
  cardExpiry: { fontSize: 12, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  defaultText: { fontSize: 11, fontWeight: '600' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  emptyBox: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyText: { fontSize: 14 },
  addCardTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  addCardText: { fontSize: 15, fontWeight: '600' },
  errorText: { fontSize: 13, textAlign: 'center', marginTop: 12 },
});

export default PaymentMethodsScreen;
