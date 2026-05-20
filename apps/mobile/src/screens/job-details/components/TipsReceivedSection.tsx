/**
 * Mobile mirror of the web ContractorTipsReceivedCard.
 *
 * Renders the contractor's received tips on a completed job — total
 * received + per-tip rows with the homeowner's optional note. Hidden
 * until the GET resolves and silently when nothing landed.
 *
 * v1 scope: read-only on mobile. The homeowner tip flow still lives
 * on the web (TipJarCard with inline Stripe Elements) — the mobile
 * contractor view just surfaces what arrived. Pulling
 * `@stripe/stripe-react-native` to add a tip flow would significantly
 * bloat the mobile bundle for a feature most homeowners use on the
 * web. A future webview-style confirm flow can ship without changing
 * this section.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { logger } from '../../../utils/logger';
import { mobileApiClient } from '../../../utils/mobileApiClient';

interface TipRow {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  note: string | null;
  paid_at: string | null;
  created_at: string;
  payer_id: string;
  payee_id: string;
}

interface TipsReceivedSectionProps {
  jobId: string;
  /** Render only when the job is `completed` AND the viewer is the
   *  contractor — gating lives on the parent screen to keep this
   *  component dumb about role / status. */
  visible: boolean;
}

function formatGbp(n: number): string {
  return `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function TipsReceivedSection({
  jobId,
  visible,
}: TipsReceivedSectionProps) {
  const [tips, setTips] = useState<TipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await mobileApiClient.get<{
          tips: TipRow[];
          totalCompleted: number;
        }>(`/api/jobs/${jobId}/tip`);
        if (cancelled) return;
        setTips(data.tips || []);
        setTotal(Number(data.totalCompleted || 0));
      } catch (err) {
        // Best-effort — silently swallow because the section hides on
        // empty/no-load anyway. Don't surface a permission-denied or
        // network-blip toast on a read-only mirror.
        logger.warn('TipsReceivedSection fetch failed', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, visible]);

  if (!visible || !loaded) return null;
  const completed = tips.filter((t) => t.status === 'completed');
  if (completed.length === 0) return null;

  const tipsWithNotes = completed.filter((t) => t.note);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name='heart' size={18} color={me.brand} />
        <Text style={styles.headerText}>Tips received</Text>
      </View>

      <Text style={styles.totalText}>{formatGbp(total)}</Text>
      <Text style={styles.subtitle}>
        {completed.length} {completed.length === 1 ? 'tip' : 'tips'} from this
        homeowner. Paid directly to your Stripe account — no platform fee.
      </Text>

      {tipsWithNotes.length > 0 ? (
        <View style={styles.notesBox}>
          {tipsWithNotes.map((tip) => (
            <View key={tip.id} style={styles.noteRow}>
              <View style={styles.noteHeaderRow}>
                <Text style={styles.noteAmount}>
                  {formatGbp(Number(tip.amount))}
                </Text>
                <Text style={styles.noteDate}>
                  {formatDate(tip.paid_at || tip.created_at)}
                </Text>
              </View>
              <Text style={styles.noteBody}>&ldquo;{tip.note}&rdquo;</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    backgroundColor: me.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: me.line,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
  },
  totalText: {
    fontSize: 28,
    fontWeight: '700',
    color: me.brand,
    lineHeight: 32,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  notesBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: me.bg2,
    gap: 12,
  },
  noteRow: {
    gap: 4,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  noteAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
  },
  noteDate: {
    fontSize: 11,
    color: me.ink3,
  },
  noteBody: {
    fontSize: 12,
    fontStyle: 'italic',
    color: me.ink2,
    lineHeight: 16,
  },
});
