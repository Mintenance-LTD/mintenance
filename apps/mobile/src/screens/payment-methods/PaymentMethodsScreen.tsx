/**
 * PaymentMethodsScreen Container
 *
 * Manages payment methods with real Stripe card data from API.
 *
 * @filesize Target: <150 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet, Alert, ActivityIndicator, RefreshControl, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/shared';
import { usePaymentMethodsViewModel } from './viewmodels/PaymentMethodsViewModel';
// PaymentMethodOption removed - only Stripe cards are supported
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      <ScreenHeader
        title="Payment Method"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={vm.loading} onRefresh={vm.refresh} tintColor="#10B981" colors={['#10B981']} />
        }
      >
        {/* Saved Cards */}
        <Text style={styles.sectionTitle}>Your Cards</Text>

        {vm.loading && vm.savedCards.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.loadingText}>Loading payment methods...</Text>
          </View>
        ) : vm.savedCards.length > 0 ? (
          vm.savedCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardRow,
                vm.selectedMethod === card.id && styles.cardRowSelected,
              ]}
              onPress={() => vm.selectMethod(card.id)}
              onLongPress={() => handleDeleteCard(card.id, card.last4)}
              accessibilityRole="radio"
              accessibilityLabel={`${card.brand} ending in ${card.last4}`}
              accessibilityState={{ selected: vm.selectedMethod === card.id }}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardIconBox}>
                  <Ionicons
                    name={(BRAND_ICONS[card.brand.toLowerCase()] || 'card') as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color="#717171"
                  />
                </View>
                <View>
                  <Text style={styles.cardBrand}>
                    {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} **** {card.last4}
                  </Text>
                  <Text style={styles.cardExpiry}>
                    Expires {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {card.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
                <View style={[
                  styles.radio,
                  vm.selectedMethod === card.id && styles.radioSelected,
                ]} />
              </View>
            </TouchableOpacity>
          ))
        ) : !vm.loading ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="card-outline" size={28} color="#10B981" />
            </View>
            <Text style={styles.emptyText}>No cards saved yet</Text>
          </View>
        ) : null}

        {/* Add Card Button */}
        <TouchableOpacity
          style={styles.addCardTrigger}
          onPress={() => navigation.navigate('AddPaymentMethod' as never)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#10B981" />
          <Text style={styles.addCardText}>Add New Card</Text>
        </TouchableOpacity>

        {vm.error && (
          <Text style={styles.errorText}>{vm.error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginTop: 20,
    marginBottom: 12,
  },
  loadingBox: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  loadingText: { fontSize: 14, color: '#717171' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardRowSelected: {
    backgroundColor: '#F7F7F7',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBrand: { fontSize: 15, fontWeight: '500', color: '#222222' },
  cardExpiry: { fontSize: 12, color: '#B0B0B0', marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F7F7F7' },
  defaultText: { fontSize: 12, fontWeight: '600', color: '#222222' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#EBEBEB' },
  radioSelected: { borderColor: '#10B981', backgroundColor: '#10B981' },
  emptyBox: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: '#717171' },
  addCardTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  addCardText: { fontSize: 15, fontWeight: '600', color: '#10B981' },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: 12 },
});

export default PaymentMethodsScreen;
