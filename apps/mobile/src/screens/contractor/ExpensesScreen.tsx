import React, { useState, useCallback } from 'react';
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
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

import { styles } from './expenses/theme/styles';
import {
  useExpensesQuery,
  useCreateExpense,
  useDeleteExpense,
} from './expenses/queries';
import { computeExpenseStats } from './expenses/aggregations';
import { useUndoableDelete } from './expenses/useUndoableDelete';
import type { CategoryFilter } from './expenses/types';
import { StatsRow } from './expenses/components/StatsRow';
import { FilterChips } from './expenses/components/FilterChips';
import {
  AddExpenseForm,
  type ExpenseFormData,
} from './expenses/components/AddExpenseForm';
import { ExpenseRow } from './expenses/components/ExpenseRow';
import { EmptyState } from './expenses/components/EmptyState';
import { UndoSnackbar } from './expenses/components/UndoSnackbar';

/**
 * Contractor expenses screen — list + add + delete-with-undo.
 * Was an 823-line monolith. Split 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a)
 * into typed queries (`expenses/queries.ts`), pure aggregations
 * (`expenses/aggregations.ts`), an undo-delete hook
 * (`expenses/useUndoableDelete.ts`) and 6 leaf components under
 * `expenses/components/`. Public behaviour preserved.
 */
export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProfileStackParamList, 'Expenses'>>();
  const jobIdParam = route.params?.jobId;
  const jobTitleParam = route.params?.jobTitle;
  const { user } = useAuth();

  const [filter, setFilter] = useState<CategoryFilter>('all');
  // Auto-open the form when entering with a jobId so the contractor
  // lands directly in expense capture (the job-detail CTA reads
  // "Log Expense for this Job"). Default `billable` to true on this
  // path — almost every job-scoped expense is intended to be invoiced.
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
  const filtered =
    filter === 'all'
      ? visibleExpenses
      : visibleExpenses.filter((e) => e.category === filter);

  const { totalExpenses, thisMonth, billableTotal } =
    computeExpenseStats(expenses);

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return <ErrorView message='Failed to load expenses' onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerOverline}>FINANCIAL OVERVIEW</Text>
          <ScreenHeader
            title='Expenses'
            showBack
            onBack={() => navigation.goBack()}
          />
        </View>

        <StatsRow
          totalExpenses={totalExpenses}
          thisMonth={thisMonth}
          billableTotal={billableTotal}
        />

        <FilterChips filter={filter} onChange={setFilter} />

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

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={me.ink}
              colors={[me.ink]}
            />
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

        {/* FAB hidden on empty state — the "Log First Expense" CTA
            already owns that space. */}
        {!showForm && filtered.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowForm(true)}
            accessibilityRole='button'
            accessibilityLabel='Add expense'
          >
            <Ionicons name='add' size={28} color={me.onBrand} />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ExpensesScreen;
