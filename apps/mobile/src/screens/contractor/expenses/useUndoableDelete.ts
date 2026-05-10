import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import type { Expense } from './types';

/**
 * Encapsulates the 3-second undo-able delete flow:
 * - When the user taps trash, we set `pendingDelete` (which the screen
 *   uses to hide the row) and animate a snackbar in.
 * - After 3s without an undo, the delete actually fires.
 * - "UNDO" cancels the timer and restores the row.
 *
 * Behaviour preserved from the original ExpensesScreen so touching this
 * doesn't regress the audit-flagged delete-then-undo flow.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function useUndoableDelete(deleteFn: (id: string) => void): {
  pendingDelete: Expense | null;
  snackbarOpacity: Animated.Value;
  handleDelete: (expense: Expense) => void;
  handleUndoDelete: () => void;
} {
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snackbarOpacity = useRef(new Animated.Value(0)).current;

  const handleDelete = useCallback(
    (expense: Expense) => {
      // Clear any existing pending delete
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        if (pendingDelete) {
          deleteFn(pendingDelete.id);
        }
      }

      setPendingDelete(expense);
      Animated.timing(snackbarOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      deleteTimerRef.current = setTimeout(() => {
        deleteFn(expense.id);
        setPendingDelete(null);
        Animated.timing(snackbarOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 3000);
    },
    [pendingDelete, deleteFn, snackbarOpacity]
  );

  const handleUndoDelete = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    setPendingDelete(null);
    Animated.timing(snackbarOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [snackbarOpacity]);

  return { pendingDelete, snackbarOpacity, handleDelete, handleUndoDelete };
}
