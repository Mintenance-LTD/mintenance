import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ContractorQuote } from '../services/QuoteBuilderService';
import { formatCurrency } from '../utils/formatCurrency';
import { me } from '../design-system/mint-editorial';
import { PropertySheet } from '../screens/properties/components/PropertyWorkspaceUI';

interface QuoteCardProps {
  quote: ContractorQuote;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  busy?: boolean;
}
const statusStyles: Record<
  ContractorQuote['status'],
  { backgroundColor: string; color: string }
> = {
  draft: { backgroundColor: me.bg2, color: me.ink2 },
  sent: { backgroundColor: me.infoBg, color: me.infoFg },
  viewed: { backgroundColor: me.infoBg, color: me.infoFg },
  accepted: { backgroundColor: me.okBg, color: me.okFg },
  rejected: { backgroundColor: me.errBg, color: me.errFg },
  expired: { backgroundColor: me.warnBg, color: me.warnFg },
};
export const QuoteCard = ({
  quote,
  onPress,
  onEdit,
  onDuplicate,
  onDelete,
  busy = false,
}: QuoteCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  // Server status is authoritative: an accepted quote never becomes expired
  // just because its original offer date has passed.
  const status = statusStyles[quote.status] ?? statusStyles.draft;
  const reference = quote.quote_number || quote.id.slice(0, 8).toUpperCase();
  const date = new Date(quote.created_at);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel={`Open quote ${reference}: ${quote.project_title}`}
        onPress={onPress}
        style={styles.main}
      >
        <View style={styles.top}>
          <Text style={styles.reference}>#{reference}</Text>
          <View
            style={[styles.badge, { backgroundColor: status.backgroundColor }]}
          >
            <Text style={[styles.status, { color: status.color }]}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {quote.project_title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {quote.client_name?.trim() || 'Client not added'}
        </Text>
        <View style={styles.bottom}>
          <Text style={styles.meta}>
            {Number.isNaN(date.getTime())
              ? 'Date unavailable'
              : date.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
          </Text>
          <Text style={styles.amount}>
            {formatCurrency(quote.total_amount, quote.currency)}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel={
            quote.status === 'draft'
              ? `Review draft ${reference}`
              : `View quote ${reference}`
          }
          onPress={quote.status === 'draft' ? onEdit : onPress}
          style={styles.open}
        >
          <Text style={styles.link}>
            {quote.status === 'draft' ? 'Review draft' : 'View quote'}
          </Text>
          <Ionicons name='arrow-forward' size={17} color={me.brand2} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel={`More actions for quote ${reference}`}
          accessibilityState={{ expanded: menuOpen, disabled: busy }}
          disabled={busy}
          onPress={() => setMenuOpen(true)}
          style={styles.more}
        >
          <Ionicons name='ellipsis-horizontal' size={23} color={me.ink2} />
        </TouchableOpacity>
      </View>
      {menuOpen && (
        <PropertySheet
          title={`Quote ${reference}`}
          busy={busy}
          onClose={() => setMenuOpen(false)}
        >
          <TouchableOpacity
            accessibilityRole='button'
            disabled={busy}
            style={styles.menuAction}
            onPress={() => {
              setMenuOpen(false);
              onDuplicate();
            }}
          >
            <Ionicons name='copy-outline' size={20} color={me.brand2} />
            <Text style={styles.link}>Duplicate as a draft</Text>
          </TouchableOpacity>
          {quote.status === 'draft' && (
            <TouchableOpacity
              accessibilityRole='button'
              disabled={busy}
              style={styles.menuAction}
              onPress={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Ionicons name='trash-outline' size={20} color={me.errFg} />
              <Text style={[styles.link, { color: me.errFg }]}>
                Delete draft
              </Text>
            </TouchableOpacity>
          )}
          {quote.status !== 'draft' && (
            <Text style={styles.meta}>
              Open the quote to review its details and available next steps.
            </Text>
          )}
        </PropertySheet>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: me.line,
    marginBottom: 12,
  },
  main: { padding: 16, gap: 7 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reference: { flex: 1, color: me.ink3, fontSize: 12 },
  badge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  status: { fontSize: 12, fontWeight: '600' },
  title: { color: me.ink, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  meta: { color: me.ink2, fontSize: 13, lineHeight: 19, flexShrink: 1 },
  bottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 5,
  },
  amount: { fontSize: 22, fontWeight: '700', color: me.ink, flexShrink: 1 },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  open: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  link: { color: me.brand2, fontSize: 14, fontWeight: '600' },
  more: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
