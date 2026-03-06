/**
 * PaymentService — facade over payment/ sub-modules.
 * All logic lives in:
 *   services/payment/PaymentIntentService.ts
 *   services/payment/EscrowService.ts
 *   services/payment/PaymentMethodService.ts
 *   services/payment/JobPaymentService.ts
 *   services/payment/FeeCalculator.ts
 */
export type {
  EscrowTransactionRow,
  PaymentMethod,
  CreatePaymentIntentResponse,
  CreateSetupIntentResponse,
} from './payment/types';

import { PaymentIntentService } from './payment/PaymentIntentService';
import { EscrowService } from './payment/EscrowService';
import { PaymentMethodService } from './payment/PaymentMethodService';
import { JobPaymentService } from './payment/JobPaymentService';
import { FeeCalculator } from './payment/FeeCalculator';

export class PaymentService {
  // ── Payment Intents ──────────────────────────────────────────────────────
  static initializePayment = PaymentIntentService.initializePayment;
  static createPaymentIntent = PaymentIntentService.createPaymentIntent;
  static createSetupIntent = PaymentIntentService.createSetupIntent;

  // ── Escrow ───────────────────────────────────────────────────────────────
  static createEscrowTransaction = EscrowService.createEscrowTransaction;
  static holdPaymentInEscrow = EscrowService.holdPaymentInEscrow;
  static releaseEscrowPayment = EscrowService.releaseEscrowPayment;
  static refundEscrowPayment = EscrowService.refundEscrowPayment;
  static releaseEscrow = EscrowService.releaseEscrow;
  static refundPayment = EscrowService.refundPayment;
  static getUserPaymentHistory = EscrowService.getUserPaymentHistory;
  static getJobEscrowTransactions = EscrowService.getJobEscrowTransactions;

  // ── Payment Methods ──────────────────────────────────────────────────────
  static createPaymentMethod = PaymentMethodService.createPaymentMethod;
  static confirmPayment = PaymentMethodService.confirmPayment;
  static savePaymentMethod = PaymentMethodService.savePaymentMethod;
  static getPaymentMethods = PaymentMethodService.getPaymentMethods;
  static deletePaymentMethod = PaymentMethodService.deletePaymentMethod;
  static setDefaultPaymentMethod = PaymentMethodService.setDefaultPaymentMethod;

  // ── Job Payments ─────────────────────────────────────────────────────────
  static processJobPayment = JobPaymentService.processJobPayment;
  static getPaymentHistory = JobPaymentService.getPaymentHistory;
  static requestRefund = JobPaymentService.requestRefund;

  // ── Fees & Contractor Payouts ────────────────────────────────────────────
  static calculateFees = FeeCalculator.calculateFees;
  static setupContractorPayout = FeeCalculator.setupContractorPayout;
  static getContractorPayoutStatus = FeeCalculator.getContractorPayoutStatus;
}
