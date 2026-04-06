import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { styles } from './styles';

interface QuickQuoteModalProps {
  visible: boolean;
  otherUserName: string;
  jobTitle: string;
  quoteAmount: string;
  quoteDescription: string;
  quoteSending: boolean;
  onChangeAmount: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  onOpenFullQuote: () => void;
}

export const QuickQuoteModal: React.FC<QuickQuoteModalProps> = ({
  visible,
  otherUserName,
  jobTitle,
  quoteAmount,
  quoteDescription,
  quoteSending,
  onChangeAmount,
  onChangeDescription,
  onClose,
  onSend,
  onOpenFullQuote,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.quoteOverlay}>
      <View style={styles.quoteCard}>
        {/* Handle bar */}
        <View style={styles.quoteHandle} />

        <View style={styles.quoteHeader}>
          <View style={styles.quoteIconWrap}>
            <Ionicons name="pricetag" size={18} color={theme.colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteTitle}>Send Quote</Text>
            <Text style={styles.quoteSubtitle}>to {otherUserName}</Text>
          </View>
          <TouchableOpacity
            style={styles.quoteCloseBtn}
            onPress={onClose}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {jobTitle ? (
          <View style={styles.quoteJobPill}>
            <Ionicons name="briefcase-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.quoteJobText} numberOfLines={1}>{jobTitle}</Text>
          </View>
        ) : null}

        {/* Amount input */}
        <Text style={styles.quoteLabel}>Quote Amount</Text>
        <View style={styles.quoteAmountRow}>
          <Text style={styles.quoteCurrency}>£</Text>
          <TextInput
            style={styles.quoteAmountInput}
            value={quoteAmount}
            onChangeText={onChangeAmount}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Description input */}
        <Text style={styles.quoteLabel}>Description (optional)</Text>
        <TextInput
          style={styles.quoteDescInput}
          value={quoteDescription}
          onChangeText={onChangeDescription}
          placeholder="e.g. Full bathroom renovation including materials"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Actions */}
        <View style={styles.quoteActions}>
          <TouchableOpacity
            style={styles.quoteFullBtn}
            onPress={onOpenFullQuote}
          >
            <Ionicons name="document-text-outline" size={16} color={theme.colors.textPrimary} />
            <Text style={styles.quoteFullBtnText}>Full Quote</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quoteSendBtn, (!quoteAmount.trim() || quoteSending) && styles.quoteSendBtnDisabled]}
            onPress={onSend}
            disabled={!quoteAmount.trim() || quoteSending}
          >
            {quoteSending ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <>
                <Ionicons name="send" size={16} color={theme.colors.textInverse} />
                <Text style={styles.quoteSendBtnText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
