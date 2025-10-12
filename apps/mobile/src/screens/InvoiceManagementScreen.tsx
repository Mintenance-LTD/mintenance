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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { logger } from '../services/logger';
import { useAuth } from '../contexts/AuthContext';
import { type Invoice } from '../services/contractor-business';
import { InvoiceCard } from '../components/InvoiceCard';
import Button from '../components/ui/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface InvoiceManagementScreenProps {
  navigation: StackNavigationProp<any>;
}

export const InvoiceManagementScreen: React.FC<
  InvoiceManagementScreenProps
> = ({ navigation }) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'draft' | 'sent' | 'overdue' | 'paid'
  >('all');
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    if (!user) return;

    try {
      // TODO: implement invoice listing API in contractorBusinessSuite
      setInvoices([]);
    } catch (error) {
      logger.error('Error loading invoices', error);
      Alert.alert('Error', 'Failed to load invoices');
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
      // TODO: implement reminder API; placeholder success
      Alert.alert('Success', 'Reminder sent successfully');
      await loadInvoices(); // Refresh to update reminder count
    } catch (error) {
      Alert.alert('Error', 'Failed to send reminder');
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
              // TODO: implement mark-paid API; placeholder success
              Alert.alert('Success', 'Invoice marked as paid');
              await loadInvoices();
            } catch (error) {
              Alert.alert('Error', 'Failed to update invoice');
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

  const getFilterCounts = () => {
    const counts = {
      all: invoices.length,
      draft: invoices.filter((i) => i.status === 'draft').length,
      sent: invoices.filter((i) => i.status === 'sent').length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

  const renderFilterTab = (
    filter: typeof selectedFilter,
    label: string,
    count: number
  ) => (
    <TouchableOpacity
      style={[
        styles.filterTab,
        selectedFilter === filter && styles.filterTabActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterTabText,
          selectedFilter === filter && styles.filterTabTextActive,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.filterTabCount,
          selectedFilter === filter && styles.filterTabCountActive,
        ]}
      >
        {count}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message='Loading invoices...' />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateInvoice')}
        >
          <Ionicons name='add' size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            £
            {invoices
              .reduce((sum, inv) => sum + inv.total_amount, 0)
              .toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total Outstanding</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.error }]}>
            {filterCounts.overdue}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {filterCounts.paid}
          </Text>
          <Text style={styles.statLabel}>Paid This Month</Text>
        </View>
      </View>

      {/* Compact Filter Tabs */}
      <View style={styles.filtersContainer}>
        <View style={styles.segmentedControl}>
          {renderFilterTab('all', 'All', filterCounts.all)}
          {renderFilterTab('draft', 'Draft', filterCounts.draft)}
          {renderFilterTab('sent', 'Sent', filterCounts.sent)}
          {renderFilterTab('overdue', 'Overdue', filterCounts.overdue)}
          {renderFilterTab('paid', 'Paid', filterCounts.paid)}
        </View>
      </View>

      {/* Invoice List */}
      <ScrollView
        style={styles.invoiceList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name='document-outline'
              size={64}
              color={theme.colors.textTertiary}
            />
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
                {selectedInvoice.invoice_number} to client{' '}
                {selectedInvoice.client_id}?
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
                style={{ flex: 1 }}
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
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  addButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    ...theme.shadows.sm,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: theme.borderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    lineHeight: 14,
  },
  filterTabTextActive: {
    color: theme.colors.textInverse,
  },
  filterTabCount: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  filterTabCountActive: {
    color: theme.colors.textInverse,
    opacity: 0.9,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  // createButton styles replaced by shared Button
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  // modal buttons replaced by shared Button
});

export default InvoiceManagementScreen;
