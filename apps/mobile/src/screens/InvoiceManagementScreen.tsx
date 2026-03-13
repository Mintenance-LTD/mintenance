import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { type Invoice, FinancialManagementService } from '../services/contractor-business';
import { InvoiceCard } from '../components/InvoiceCard';
import Button from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { useToast } from '../components/ui/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { JobsStackParamList, ProfileStackParamList } from '../navigation/types';

type InvoiceNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<JobsStackParamList>,
  NativeStackNavigationProp<ProfileStackParamList>
>;

interface InvoiceManagementScreenProps {
  navigation: InvoiceNavigation;
}

export const InvoiceManagementScreen: React.FC<
  InvoiceManagementScreenProps
> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'draft' | 'sent' | 'overdue' | 'paid'
  >('all');
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    if (!user) return;

    try {
      const data = await FinancialManagementService.getInvoices(user.id);
      setInvoices(data);
    } catch (error) {
      logger.error('Error loading invoices', error);
      setListError('Failed to load invoices. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleSendReminder = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setReminderModalVisible(true);
  };

  const sendReminderConfirm = async () => {
    if (!selectedInvoice || !user) return;

    try {
      await FinancialManagementService.updateInvoiceStatus(
        selectedInvoice.id,
        'sent',
        user.id
      );
      toast.success('Reminder sent successfully');
      await loadInvoices();
    } catch (error) {
      toast.error('Failed to send reminder');
    } finally {
      setReminderModalVisible(false);
      setSelectedInvoice(null);
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    Alert.alert(
      'Mark as Paid',
      `Mark invoice #${invoice.invoice_number} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              await FinancialManagementService.updateInvoiceStatus(
                invoice.id,
                'paid',
                user!.id
              );
              toast.success('Invoice marked as paid');
              await loadInvoices();
            } catch (error) {
              toast.error('Failed to update invoice');
            }
          },
        },
      ]
    );
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (selectedFilter === 'all') return true;
    return invoice.status === selectedFilter;
  });

  const getFilterCounts = () => ({
    all: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
  });

  const filterCounts = getFilterCounts();

  const STAT_ITEMS = [
    {
      value: `£${invoices.reduce((sum, inv) => sum + inv.total_amount, 0).toFixed(0)}`,
      label: 'Outstanding',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      icon: 'wallet-outline' as const,
    },
    {
      value: String(filterCounts.overdue),
      label: 'Overdue',
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
      icon: 'alert-circle-outline' as const,
    },
    {
      value: String(filterCounts.paid),
      label: 'Paid',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      icon: 'checkmark-circle-outline' as const,
    },
  ];

  const renderFilterTab = (
    filter: typeof selectedFilter,
    label: string,
    count: number
  ) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterTab,
        selectedFilter === filter && styles.filterTabActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}, ${count} invoices`}
      accessibilityState={{ selected: selectedFilter === filter }}
    >
      <Text
        style={[
          styles.filterTabText,
          selectedFilter === filter && styles.filterTabTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message='Loading invoices...' />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name='arrow-back' size={24} color='#222222' />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Invoices</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateInvoice')}
          accessibilityRole="button"
          accessibilityLabel="Create new invoice"
        >
          <View style={styles.addIconWrap}>
            <Ionicons name='add' size={20} color='#FFFFFF' />
          </View>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        {STAT_ITEMS.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}>
              <Ionicons name={stat.icon} size={16} color={stat.iconColor} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {listError && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Banner message={listError} variant="error" />
        </View>
      )}

      {/* Filter Tabs - Dark active */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer} contentContainerStyle={styles.filtersContent}>
        {renderFilterTab('all', 'All', filterCounts.all)}
        {renderFilterTab('draft', 'Draft', filterCounts.draft)}
        {renderFilterTab('sent', 'Sent', filterCounts.sent)}
        {renderFilterTab('overdue', 'Overdue', filterCounts.overdue)}
        {renderFilterTab('paid', 'Paid', filterCounts.paid)}
      </ScrollView>

      {/* Invoice List */}
      <ScrollView
        style={styles.invoiceList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#222222" colors={['#222222']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name='document-outline' size={32} color='#B0B0B0' />
            </View>
            <Text style={styles.emptyTitle}>No invoices found</Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'all'
                ? 'Create your first invoice to get started'
                : `No ${selectedFilter} invoices at the moment`}
            </Text>
            {selectedFilter === 'all' && (
              <Button
                variant='primary'
                title='Create Invoice'
                onPress={() => navigation.navigate('CreateInvoice')}
                style={{ borderRadius: 28 }}
              />
            )}
          </View>
        ) : (
          filteredInvoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onPress={() =>
                navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })
              }
              onSendReminder={() => handleSendReminder(invoice)}
              onMarkPaid={() => handleMarkPaid(invoice)}
            />
          ))
        )}
      </ScrollView>

      {/* Reminder Confirmation Modal */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType='slide'
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Reminder</Text>
            {selectedInvoice && (
              <Text style={styles.modalText}>
                Send payment reminder for invoice #
                {selectedInvoice.invoice_number} to{' '}
                {selectedInvoice.client_name || 'client'}?
              </Text>
            )}
            <View style={styles.modalActions}>
              <Button
                variant='secondary'
                title='Cancel'
                onPress={() => setReminderModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                variant='primary'
                title='Send Reminder'
                onPress={sendReminderConfirm}
                style={{ flex: 1, borderRadius: 28 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  addButton: {
    padding: 4,
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
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
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#717171',
    textAlign: 'center',
  },
  filtersContainer: {
    maxHeight: 52,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  filterTabActive: {
    backgroundColor: '#222222',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#717171',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  invoiceList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#717171',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default InvoiceManagementScreen;
