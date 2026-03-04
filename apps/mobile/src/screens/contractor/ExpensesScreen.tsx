import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  billable: boolean;
  job_id?: string;
}

type CategoryFilter = 'all' | 'materials' | 'tools' | 'fuel' | 'software' | 'insurance' | 'marketing' | 'other';

const CATEGORY_COLORS: Record<string, string> = {
  materials: '#3B82F6',
  tools: '#8B5CF6',
  fuel: '#F59E0B',
  software: '#06B6D4',
  insurance: '#10B981',
  marketing: '#EC4899',
  other: '#6B7280',
};

export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ description: '', category: 'materials', amount: '', billable: false });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-expenses'],
    queryFn: async () => {
      interface ApiExpense { id: string; description: string; category: string; amount: number; date: string; isBillable: boolean; jobId?: string }
      const res = await mobileApiClient.get<{ expenses: ApiExpense[]; total: number }>('/api/contractor/expenses');
      return {
        expenses: (res.expenses || []).map((e): Expense => ({
          id: e.id, description: e.description, category: e.category,
          amount: e.amount, date: e.date, billable: e.isBillable, job_id: e.jobId,
        })),
        total: res.total,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (expense: { description: string; category: string; amount: number; billable: boolean }) => {
      return mobileApiClient.post('/api/contractor/expenses', { ...expense, date: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-expenses'] });
      setShowForm(false);
      setFormData({ description: '', category: 'materials', amount: '', billable: false });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  // Undo delete state
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snackbarOpacity = useRef(new Animated.Value(0)).current;

  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      return mobileApiClient.delete(`/api/contractor/expenses?id=${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-expenses'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const handleDelete = useCallback((expense: Expense) => {
    // Clear any existing pending delete
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      if (pendingDelete) {
        deleteMutation.mutate(pendingDelete.id);
      }
    }

    setPendingDelete(expense);
    Animated.timing(snackbarOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    deleteTimerRef.current = setTimeout(() => {
      deleteMutation.mutate(expense.id);
      setPendingDelete(null);
      Animated.timing(snackbarOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, 3000);
  }, [pendingDelete, deleteMutation, snackbarOpacity]);

  const handleUndoDelete = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    setPendingDelete(null);
    Animated.timing(snackbarOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [snackbarOpacity]);

  const expenses = data?.expenses || [];
  const visibleExpenses = pendingDelete ? expenses.filter((e) => e.id !== pendingDelete.id) : expenses;
  const filtered = filter === 'all' ? visibleExpenses : visibleExpenses.filter((e) => e.category === filter);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);
  const billableTotal = expenses.filter((e) => e.billable).reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Expenses" showBack onBack={() => navigation.goBack()} />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{'\u00A3'}{totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statValue}>{'\u00A3'}{thisMonth.toFixed(2)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Billable</Text>
          <Text style={styles.statValue}>{'\u00A3'}{billableTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <FlatList
        horizontal
        data={['all', 'materials', 'tools', 'fuel', 'software', 'insurance', 'marketing', 'other'] as CategoryFilter[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
              {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Add Form */}
      {showForm && (
        <Card variant="elevated" padding="md" style={styles.formCard}>
          <TextInput style={styles.input} placeholder="Description" placeholderTextColor={theme.colors.placeholder} value={formData.description} onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))} />
          <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={theme.colors.placeholder} keyboardType="decimal-pad" value={formData.amount} onChangeText={(t) => setFormData((p) => ({ ...p, amount: t }))} />
          <View style={styles.formActions}>
            <Button variant="ghost" size="sm" onPress={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onPress={() => createMutation.mutate({ ...formData, amount: parseFloat(formData.amount) || 0 })} loading={createMutation.isPending}>Add</Button>
          </View>
        </Card>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="No Expenses" subtitle="Track your business expenses here." />}
        renderItem={({ item }) => (
          <View style={styles.expenseRow}>
            <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280' }]} />
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.expenseDate}>{new Date(item.date).toLocaleDateString('en-GB')}</Text>
            </View>
            <View style={styles.expenseRight}>
              <Text style={styles.expenseAmount}>{'\u00A3'}{item.amount.toFixed(2)}</Text>
              {item.billable && <Badge variant="success" size="sm">Billable</Badge>}
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Delete expense ${item.description}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Undo Snackbar */}
      {pendingDelete && (
        <Animated.View style={[styles.snackbar, { opacity: snackbarOpacity }]}>
          <Text style={styles.snackbarText} numberOfLines={1}>
            Deleted "{pendingDelete.description}"
          </Text>
          <TouchableOpacity onPress={handleUndoDelete} accessibilityRole="button" accessibilityLabel="Undo delete">
            <Text style={styles.snackbarUndo}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FAB */}
      {!showForm && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} accessibilityLabel="Add expense">
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, alignItems: 'center', ...theme.shadows.sm },
  statLabel: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '500', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  filterChipActive: { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },
  formCard: { marginHorizontal: 16, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 8 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 8, ...theme.shadows.sm },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  expenseDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  deleteButton: { marginLeft: 8, padding: 4 },
  snackbar: { position: 'absolute', bottom: 90, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#222222', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, ...theme.shadows.lg },
  snackbarText: { fontSize: 14, color: '#FFFFFF', flex: 1, marginRight: 12 },
  snackbarUndo: { fontSize: 14, fontWeight: '700', color: '#60A5FA' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#222222', justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});

export default ExpensesScreen;
