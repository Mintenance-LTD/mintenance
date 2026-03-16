/**
 * Re-export from shared package for backward compatibility.
 * All new code should import from '@mintenance/shared' directly.
 */
export {
  PaymentState,
  PaymentAction,
  PaymentStateMachine,
  validatePaymentStateTransition,
} from '@mintenance/shared';
