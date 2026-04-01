import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { styles } from './ContractPreparationStyles';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface AgreedQuoteProps {
  items: QuoteItem[];
  amount: string;
}

export const AgreedQuoteCard: React.FC<AgreedQuoteProps> = ({
  items,
  amount,
}) => {
  if (items.length === 0) return null;
  return (
    <View style={styles.agreedQuoteCard}>
      <View style={styles.agreedQuoteHeader}>
        <Ionicons
          name='checkmark-circle'
          size={18}
          color={theme.colors.primary}
        />
        <Text style={styles.agreedQuoteTitle}>Agreed Quote</Text>
      </View>
      <Text style={styles.agreedQuoteSub}>
        Based on the accepted bid. Contract amount pre-filled from this quote.
      </Text>
      {items.map((item, idx) => (
        <View key={idx} style={styles.agreedItemRow}>
          <Text style={styles.agreedItemDesc}>{item.description}</Text>
          <Text style={styles.agreedItemTotal}>
            {'\u00A3'}
            {(item.total || item.quantity * (item.unitPrice || 0)).toFixed(2)}
          </Text>
        </View>
      ))}
      <View style={styles.agreedTotalRow}>
        <Text style={styles.agreedTotalLabel}>Quote Total</Text>
        <Text style={styles.agreedTotalValue}>
          {'\u00A3'}
          {amount || '0.00'}
        </Text>
      </View>
    </View>
  );
};

interface LicenseChipsProps {
  selected: string;
  onSelect: (t: string) => void;
  types: readonly string[];
}

export const LicenseTypeChips: React.FC<LicenseChipsProps> = ({
  selected,
  onSelect,
  types,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.chipScroll}
  >
    {types.map((t) => (
      <TouchableOpacity
        key={t}
        style={[styles.chip, selected === t && styles.chipActive]}
        onPress={() => onSelect(t)}
      >
        <Text
          style={[styles.chipText, selected === t && styles.chipTextActive]}
        >
          {t}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

interface InsuranceCardProps {
  provider: string;
  setProvider: (v: string) => void;
  policyNumber: string;
  setPolicyNumber: (v: string) => void;
}

export const InsuranceDetailsCard: React.FC<InsuranceCardProps> = ({
  provider,
  setProvider,
  policyNumber,
  setPolicyNumber,
}) => (
  <View style={styles.insuranceCard}>
    <View style={styles.insuranceHeader}>
      <Ionicons name='shield-checkmark-outline' size={18} color='#3B82F6' />
      <Text style={styles.insuranceTitle}>Insurance Details (Recommended)</Text>
    </View>
    <Text style={styles.insuranceSub}>
      Adding insurance details builds trust and shows professionalism
    </Text>
    <View style={styles.dateRow}>
      <View style={styles.dateField}>
        <Text style={styles.fieldLabel}>Insurance Provider</Text>
        <TextInput
          style={styles.input}
          value={provider}
          onChangeText={setProvider}
          placeholder='e.g. Hiscox, AXA'
          placeholderTextColor={theme.colors.textTertiary}
        />
      </View>
      <View style={styles.dateField}>
        <Text style={styles.fieldLabel}>Policy Number</Text>
        <TextInput
          style={styles.input}
          value={policyNumber}
          onChangeText={setPolicyNumber}
          placeholder='e.g. POL-123456'
          placeholderTextColor={theme.colors.textTertiary}
        />
      </View>
    </View>
  </View>
);

interface DateRangeProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  startError?: string;
  endError?: string;
  formatDate: (d: Date | null) => string;
}

export const DateRangePicker: React.FC<DateRangeProps> = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  startError,
  endError,
  formatDate,
}) => {
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  return (
    <>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>Start Date *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              startError ? styles.inputError : undefined,
            ]}
            onPress={() => setShowStart(true)}
          >
            <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
              {startDate ? formatDate(startDate) : 'Select start date'}
            </Text>
            <Ionicons
              name='calendar-outline'
              size={18}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
          {startError ? (
            <Text style={styles.fieldError}>{startError}</Text>
          ) : null}
        </View>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>End Date *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              endError ? styles.inputError : undefined,
            ]}
            onPress={() => setShowEnd(true)}
          >
            <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
              {endDate ? formatDate(endDate) : 'Select end date'}
            </Text>
            <Ionicons
              name='calendar-outline'
              size={18}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
          {endError ? <Text style={styles.fieldError}>{endError}</Text> : null}
        </View>
      </View>
      {showStart && (
        <DateTimePicker
          value={startDate || new Date()}
          mode='date'
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowStart(Platform.OS === 'ios');
            if (d) onStartChange(d);
          }}
        />
      )}
      {showEnd && (
        <DateTimePicker
          value={endDate || new Date()}
          mode='date'
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate || undefined}
          onChange={(_, d) => {
            setShowEnd(Platform.OS === 'ios');
            if (d) onEndChange(d);
          }}
        />
      )}
    </>
  );
};
