import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileStackParamList } from '../../navigation/types';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../hooks/useI18n';
import { me } from '../../design-system/mint-editorial';

import { styles } from './expenses/theme/styles';
import {
  useExpensesQuery,
  useCreateExpense,
  useDeleteExpense,
} from './expenses/queries';
import {
  computeExpenseStats,
  computeCategoryTotalsThisMonth,
  countExpensesThisMonth,
} from './expenses/aggregations';
import { useUndoableDelete } from './expenses/useUndoableDelete';
import type { CategoryFilter } from './expenses/types';
import { MonthHero } from './expenses/components/MonthHero';
import { CategoryTiles } from './expenses/components/CategoryTiles';
import {
  AddExpenseForm,
  type ExpenseFormData,
} from './expenses/components/AddExpenseForm';
import { ExpenseRow } from './expenses/components/ExpenseRow';
import { EmptyState } from './expenses/components/EmptyState';
import { UndoSnackbar } from './expenses/components/UndoSnackbar';

/**
 * Contractor Expenses screen — Mint Editorial redesign per
 * redesign-v2 contractor business deck screen 05.
 *
 * Layout (top-to-bottom):
 *   1. Lightweight back nav + serif "Expenses" header with eyebrow +
 *      "<Month> · Snap receipts to capture instantly" sub.
 *   2. `MonthHero` — amber-tinted "THIS MONTH" card with serif total
 *      and receipt count.
 *   3. `CategoryTiles` — 4-up grid (Materials / Fuel & van / Tools /
 *      Subs+fees) that doubles as a filter (tap to scope the list).
 *   4. "RECENT · N" eyebrow then the expense list.
 *   5. Mint camera FAB bottom-right (per the deck — snap-to-capture).
 *
 * Pre-existing 3-stat row + horizontal filter-chip scroller retired
 * — the tiles cover the same scoping with less visual chrome, and
 * "billable total" is surfaced elsewhere (Finance dashboard bento).
 */
export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProfileStackParamList, 'Expenses'>>();
  const jobIdParam = route.params?.jobId;
  const jobTitleParam = route.params?.jobTitle;
  const { user } = useAuth();
  const { formatters } = useI18n();
  const fmt = (n: number) => formatters.currency(n);

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [showForm, setShowForm] = useState(!!jobIdParam);
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    category: 'materials',
    amount: '',
    billable: !!jobIdParam,
  });

  const { data, isLoading, error, refetch } = useExpensesQuery(user?.id);

  const createMutation = useCreateExpense({
    userId: user?.id,
    jobIdParam,
    onSuccess: () => {
      setShowForm(false);
      setFormData({
        description: '',
        category: 'materials',
        amount: '',
        billable: false,
      });
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deleteMutation = useDeleteExpense((err) =>
    Alert.alert('Error', err.message)
  );

  const fireDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  );
  const { pendingDelete, snackbarOpacity, handleDelete, handleUndoDelete } =
    useUndoableDelete(fireDelete);

  const expenses = data?.expenses ?? [];
  const visibleExpenses = pendingDelete
    ? expenses.filter((e) => e.id !== pendingDelete.id)
    : expenses;
  const filtered = useMemo(() => {
    if (filter === 'all') return visibleExpenses;
    return visibleExpenses.filter((e) => e.category === filter);
  }, [filter, visibleExpenses]);

  // Recent list is the most recent N (5 per the deck) of the filtered set.
  const recent = useMemo(() => filtered.slice(0, 5), [filtered]);

  const { thisMonth } = computeExpenseStats(expenses);
  const categoryTotals = useMemo(
    () => computeCategoryTotalsThisMonth(expenses),
    [expenses]
  );
  const receiptCount = useMemo(
    () => countExpensesThisMonth(expenses),
    [expenses]
  );

  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long' });

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return <ErrorView message='Failed to load expenses' onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.screenHeader}>
          <Text style={styles.eyebrow}>Expenses</Text>
          <Text style={styles.headline}>Expenses</Text>
          <Text style={styles.sub}>
            {monthLabel} · Snap receipts to capture instantly
          </Text>
        </View>

        <FlatList
          data={recent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={me.brand}
              colors={[me.brand]}
            />
          }
          ListHeaderComponent={
            <View>
              <MonthHero
                thisMonth={thisMonth}
                receiptCount={receiptCount}
                formatCurrency={fmt}
              />
              <CategoryTiles
                totals={categoryTotals}
                formatCurrency={fmt}
                selected={filter}
                onSelect={setFilter}
              />
              {showForm && (
                <AddExpenseForm
                  formData={formData}
                  setFormData={setFormData}
                  onCancel={() => setShowForm(false)}
                  onSubmit={() =>
                    createMutation.mutate({
                      description: formData.description,
                      category: formData.category,
                      amount: parseFloat(formData.amount) || 0,
                      billable: formData.billable,
                    })
                  }
                  submitting={createMutation.isPending}
                  jobIdParam={jobIdParam}
                  jobTitleParam={jobTitleParam}
                />
              )}
              {recent.length > 0 ? (
                <Text style={styles.recentEyebrow}>
                  Recent · {recent.length}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState onAddPress={() => setShowForm(true)} />
          }
          renderItem={({ item }) => (
            <ExpenseRow expense={item} onDelete={handleDelete} />
          )}
        />

        {pendingDelete && (
          <UndoSnackbar
            description={pendingDelete.description}
            opacity={snackbarOpacity}
            onUndo={handleUndoDelete}
          />
        )}

        {/* Camera FAB hidden while the inline form is open. */}
        {!showForm && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowForm(true)}
            accessibilityRole='button'
            accessibilityLabel='Snap a receipt'
          >
            <Ionicons name='camera' size={26} color={me.onBrand} />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ExpensesScreen;
