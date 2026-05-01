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
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/shared';
import { usePaymentMethodsViewModel } from './viewmodels/PaymentMethodsViewModel';
import { useAuth } from '../../contexts/AuthContext';
// PaymentMethodOption removed - only Stripe cards are supported
import type { NavigationProp } from '@react-navigation/native';
import { theme } from '../../theme';

interface PaymentMethodsScreenProps {
  navigation: NavigationProp<Record<string, undefined>>;
}

const BRAND_ICONS: Record<string, string> = {
  visa: 'card',
  mastercard: 'card',
  amex: 'card',
  discover: 'card',
};

export const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  navigation,
}) => {
  const vm = usePaymentMethodsViewModel();
  const { user } = useAuth();
  // Role-specific purpose copy so the screen isn't a blank
  // "Your Cards" page with no explanation of what the cards are for.
  const purposeCopy =
    user?.role === 'contractor'
      ? 'Used for your Mintenance subscription, DBS checks, and any platform fees. Homeowner escrow payouts go through your Stripe Connect account (set up under Business → Payouts).'
      : 'Used to pay into escrow when you accept a contractor\u2019s bid. Payment is held by Mintenance until you approve the finished work.';

  const handleDeleteCard = (cardId: string, last4: string) => {
    Alert.alert('Remove Card', `Remove card ending in ${last4}?`, [
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
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader
        title='Payment Method'
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.loading}
            onRefresh={vm.refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Purpose banner — role-specific copy so homeowner vs
            contractor understand what the cards are for. */}
        <View style={styles.purposeBanner}>
          <View style={styles.purposeIconWrap}>
            <Ionicons
              name='information-circle-outline'
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.purposeText}>{purposeCopy}</Text>
        </View>

        {/* Saved Cards */}
        <Text style={styles.sectionTitle}>Your Cards</Text>

        {vm.loading && vm.savedCards.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size='small' color={theme.colors.primary} />
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
              accessibilityRole='radio'
              accessibilityLabel={`${card.brand} ending in ${card.last4}`}
              accessibilityState={{ selected: vm.selectedMethod === card.id }}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardIconBox}>
                  <Ionicons
                    name={
                      (BRAND_ICONS[card.brand.toLowerCase()] ||
                        'card') as keyof typeof Ionicons.glyphMap
                    }
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <View>
                  <Text style={styles.cardBrand}>
                    {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)}{' '}
                    **** {card.last4}
                  </Text>
                  <Text style={styles.cardExpiry}>
                    Expires {String(card.expiryMonth).padStart(2, '0')}/
                    {card.expiryYear}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {card.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.radio,
                    vm.selectedMethod === card.id && styles.radioSelected,
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))
        ) : !vm.loading && !vm.error ? (
          // Only show the "No cards saved yet" empty state when we
          // actually got an empty-but-successful response. Previously
          // this rendered alongside `vm.error` as well, producing the
          // confusing "No cards saved yet + An unexpected error
          // occurred" combo the user screenshotted — the API call had
          // actually failed, but the UI also claimed the user had
          // zero cards. Show the error banner alone in that case.
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name='card-outline'
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.emptyText}>No cards saved yet</Text>
          </View>
        ) : null}

        {/* Add Card Button */}
        <TouchableOpacity
          style={styles.addCardTrigger}
          // 2026-04-30 audit P1: kept `as never` because the parent
          // NavigationProp<Record<string, undefined>> is intentionally
          // generic (this component is rendered under both the
          // ProfileStack and the Modal stack). Re-typing requires
          // splitting the screen — out of scope for the cast sweep.
          onPress={() => navigation.navigate('AddPaymentMethod' as never)}
        >
          <Ionicons
            name='add-circle-outline'
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.addCardText}>Add New Card</Text>
        </TouchableOpacity>

        {vm.error && <Text style={styles.errorText}>{vm.error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  content: { flex: 1, padding: 20 },
  purposeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  purposeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  loadingBox: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  loadingText: { fontSize: 14, color: theme.colors.textSecondary },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginBottom: 10,
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
  cardRowSelected: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  cardExpiry: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  radioSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  emptyBox: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  addCardTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
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
  addCardText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 12,
  },
});
