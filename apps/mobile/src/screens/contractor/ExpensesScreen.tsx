import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Animated,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
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
import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

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
  fuel: theme.colors.accent,
  software: '#3B82F6',
  insurance: theme.colors.primary,
  marketing: theme.colors.error,
  other: theme.colors.textSecondary,
};

export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ description: '', category: 'materials', amount: '', billable: false });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-expenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return { expenses: [], total: 0 };
      const { data, error } = await supabase
        .from('contractor_expenses')
        .select('*')
        .eq('contractor_id', user.id)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      const expenses: Expense[] = (data || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        description: (e.description as string) || '',
        category: (e.category as string) || 'other',
        amount: (e.amount as number) || 0,
        date: (e.date as string) || (e.created_at as string),
        billable: (e.billable ?? e.is_billable ?? false) as boolean,
        job_id: e.job_id as string | undefined,
      }));
      return { expenses, total: expenses.reduce((s, e) => s + e.amount, 0) };
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (expense: { description: string; category: string; amount: number; billable: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      await mobileApiClient.post('/api/contractor/expenses', {
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        billable: expense.billable,
        date: new Date().toISOString(),
      });
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
      await mobileApiClient.delete(`/api/contractor/expenses/${expenseId}`);
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
  if (error) return <ErrorView message="Failed to load expenses" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScreenHeader title="Expenses" showBack onBack={() => navigation.goBack()} />

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: `\u00A3${totalExpenses.toFixed(2)}`, icon: 'wallet-outline' as const, color: '#3B82F6', bg: '#DBEAFE' },
          { label: 'This Month', value: `\u00A3${thisMonth.toFixed(2)}`, icon: 'calendar-outline' as const, color: '#8B5CF6', bg: '#EDE9FE' },
          { label: 'Billable', value: `\u00A3${billableTotal.toFixed(2)}`, icon: 'checkmark-circle-outline' as const, color: theme.colors.primary, bg: theme.colors.primaryLight },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon} size={16} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter Chips — horizontal ScrollView to avoid FlatList sizing bugs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScrollView}
      >
        {(['all', 'materials', 'tools', 'fuel', 'software', 'insurance', 'marketing', 'other'] as CategoryFilter[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item === 'all' ? 'all categories' : item}`}
            accessibilityState={{ selected: filter === item }}
          >
            <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
              {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Form */}
      {showForm && (
        <Card variant="elevated" padding="md" style={styles.formCard}>
          <TextInput style={styles.input} placeholder="Description" placeholderTextColor={theme.colors.textTertiary} value={formData.description} onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))} />
          <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" value={formData.amount} onChangeText={(t) => setFormData((p) => ({ ...p, amount: t }))} />
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
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="No Expenses" subtitle="Track your business expenses here." />}
        renderItem={({ item }) => (
          <View style={styles.expenseRow}>
            <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[item.category] || theme.colors.textSecondary }]} />
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
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} accessibilityRole="button" accessibilityLabel="Add expense">
          <Ionicons name="add" size={28} color={theme.colors.textInverse} />
        </TouchableOpacity>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statLabel: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  filterScrollView: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: { backgroundColor: theme.colors.textPrimary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  filterChipTextActive: { color: theme.colors.textInverse },
  formCard: { marginHorizontal: 16, marginBottom: 12 },
  input: { backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, padding: 14, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 8 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  expenseDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  deleteButton: { marginLeft: 8, padding: 4 },
  snackbar: {
    position: 'absolute', bottom: 90, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.textPrimary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  snackbarText: { fontSize: 14, color: theme.colors.textInverse, flex: 1, marginRight: 12 },
  snackbarUndo: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.textPrimary, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
});

export default ExpensesScreen;
