import { Alert } from 'react-native';
import { PaymentService } from '../../services/PaymentService';
import { logger } from '../../utils/logger';

/**
 * Subscribe-flow controller. Pre-checks for a saved card on paid tiers
 * so the user gets routed to PaymentMethods before hitting the
 * "Payment Required" generic alert. The free tier skips the check.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */
export async function handleSubscribePress(args: {
  planType: string;
  onSubscribe: (planType: string) => void;
  onAddCard: () => void;
}): Promise<void> {
  const { planType, onSubscribe, onAddCard } = args;

  // Free tier — no card required, just subscribe.
  if (planType === 'free') {
    Alert.alert('Subscribe', `Subscribe to the ${planType} plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Subscribe', onPress: () => onSubscribe(planType) },
    ]);
    return;
  }

  // Paid tiers — contractor pays a monthly subscription via Stripe,
  // which requires a saved card on their Stripe customer. Pre-check
  // so we don't bounce the user to a generic "Payment Required"
  // alert after the /subscriptions/create call — instead, route them
  // straight to Payment Methods to add a card first.
  let hasCard = false;
  try {
    const result = await PaymentService.getPaymentMethods();
    hasCard = (result.methods || []).some((m) => m.type === 'card');
  } catch (err) {
    // If the fetch fails (preview env missing STRIPE_SECRET_KEY, or
    // transient network blip), let the backend respond — it returns
    // requiresPayment:true and the existing alert path handles it.
    logger.warn('Failed to pre-check payment methods before subscribe', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!hasCard) {
    Alert.alert(
      'Payment Method Required',
      `The ${planType} plan is a monthly subscription. Add a card to continue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Card', onPress: onAddCard },
      ]
    );
    return;
  }

  Alert.alert('Subscribe', `Subscribe to the ${planType} plan?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Subscribe', onPress: () => onSubscribe(planType) },
  ]);
}

export function confirmCancelSubscription(onConfirm: () => void): void {
  Alert.alert(
    'Cancel Subscription',
    'Your subscription will remain active until the end of the current billing period.',
    [
      { text: 'Keep Subscription', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: onConfirm },
    ]
  );
}
