/**
 * Payment State Machine for Escrow Transactions
 * Ensures proper state transitions and prevents invalid operations
 */

export enum PaymentState {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded'
}

export enum PaymentAction {
  CONFIRM = 'confirm',
  PROCESS = 'process',
  COMPLETE = 'complete',
  FAIL = 'fail',
  CANCEL = 'cancel',
  DISPUTE = 'dispute',
  REFUND = 'refund'
}

interface StateTransition {
  from: PaymentState;
  to: PaymentState;
  action: PaymentAction;
  allowed: boolean;
}

const VALID_TRANSITIONS: StateTransition[] = [
  // From PENDING
  { from: PaymentState.PENDING, to: PaymentState.PROCESSING, action: PaymentAction.CONFIRM, allowed: true },
  { from: PaymentState.PENDING, to: PaymentState.FAILED, action: PaymentAction.FAIL, allowed: true },
  { from: PaymentState.PENDING, to: PaymentState.CANCELLED, action: PaymentAction.CANCEL, allowed: true },
  
  // From PROCESSING
  { from: PaymentState.PROCESSING, to: PaymentState.COMPLETED, action: PaymentAction.COMPLETE, allowed: true },
  { from: PaymentState.PROCESSING, to: PaymentState.FAILED, action: PaymentAction.FAIL, allowed: true },
  { from: PaymentState.PROCESSING, to: PaymentState.CANCELLED, action: PaymentAction.CANCEL, allowed: true },
  { from: PaymentState.PROCESSING, to: PaymentState.DISPUTED, action: PaymentAction.DISPUTE, allowed: true },
  
  // From COMPLETED
  { from: PaymentState.COMPLETED, to: PaymentState.DISPUTED, action: PaymentAction.DISPUTE, allowed: true },
  { from: PaymentState.COMPLETED, to: PaymentState.REFUNDED, action: PaymentAction.REFUND, allowed: true },
  
  // From DISPUTED
  { from: PaymentState.DISPUTED, to: PaymentState.COMPLETED, action: PaymentAction.COMPLETE, allowed: true },
  { from: PaymentState.DISPUTED, to: PaymentState.REFUNDED, action: PaymentAction.REFUND, allowed: true },
  
  // Terminal states (no transitions allowed)
  { from: PaymentState.FAILED, to: PaymentState.FAILED, action: PaymentAction.FAIL, allowed: false },
  { from: PaymentState.CANCELLED, to: PaymentState.CANCELLED, action: PaymentAction.CANCEL, allowed: false },
  { from: PaymentState.REFUNDED, to: PaymentState.REFUNDED, action: PaymentAction.REFUND, allowed: false }
];

export class PaymentStateMachine {
  /**
   * Validate if a state transition is allowed
   */
  static isValidTransition(
    currentState: PaymentState, 
    targetState: PaymentState, 
    action: PaymentAction
  ): boolean {
    const transition = VALID_TRANSITIONS.find(
      t => t.from === currentState && t.to === targetState && t.action === action
    );
    
    return transition ? transition.allowed : false;
  }

  /**
   * Get all valid next states from current state
   */
  static getValidNextStates(currentState: PaymentState): PaymentState[] {
    return VALID_TRANSITIONS
      .filter(t => t.from === currentState && t.allowed)
      .map(t => t.to);
  }

  /**
   * Get all valid actions from current state
   */
  static getValidActions(currentState: PaymentState): PaymentAction[] {
    return VALID_TRANSITIONS
      .filter(t => t.from === currentState && t.allowed)
      .map(t => t.action);
  }

  /**
   * Validate and execute state transition
   */
  static validateTransition(
    currentState: PaymentState, 
    targetState: PaymentState, 
    action: PaymentAction
  ): { valid: boolean; error?: string } {
    if (currentState === targetState) {
      return { valid: true }; // No change needed
    }

    if (!this.isValidTransition(currentState, targetState, action)) {
      return { 
        valid: false, 
        error: `Invalid transition from ${currentState} to ${targetState} via ${action}` 
      };
    }

    return { valid: true };
  }

  /**
   * Check if state is terminal (no further transitions allowed)
   */
  static isTerminalState(state: PaymentState): boolean {
    return [PaymentState.FAILED, PaymentState.CANCELLED, PaymentState.REFUNDED].includes(state);
  }

  /**
   * Check if state allows modifications
   */
  static isModifiableState(state: PaymentState): boolean {
    return [PaymentState.PENDING, PaymentState.PROCESSING].includes(state);
  }

  /**
   * Check if state allows disputes
   */
  static allowsDisputes(state: PaymentState): boolean {
    return [PaymentState.PROCESSING, PaymentState.COMPLETED].includes(state);
  }

  /**
   * Check if state allows refunds
   */
  static allowsRefunds(state: PaymentState): boolean {
    return [PaymentState.COMPLETED, PaymentState.DISPUTED].includes(state);
  }
}

/**
 * Payment state validation middleware
 */
export function validatePaymentStateTransition(
  currentState: string, 
  targetState: string, 
  action: string
): { valid: boolean; error?: string } {
  try {
    return PaymentStateMachine.validateTransition(
      currentState as PaymentState,
      targetState as PaymentState, 
      action as PaymentAction
    );
  } catch (error) {
    return { 
      valid: false, 
      error: `Invalid state transition: ${error}` 
    };
  }
}
