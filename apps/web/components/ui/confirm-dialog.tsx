'use client';

import * as React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Branded, promise-based replacement for the native `window.confirm()`.
 *
 * Native `confirm()` renders an unstyled, browser-chrome dialog ("<origin>
 * says…") that cannot be themed, positioned, or made accessible to the app's
 * design. This provider mounts a single Radix AlertDialog once at the app root
 * and hands call-sites an async `confirm()` that resolves to the user's choice:
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Delete job?', destructive: true });
 *   if (!ok) return;
 *
 * The async shape is the one meaningful difference from the blocking native
 * API — call-sites `await` the result instead of reading a synchronous boolean.
 */
export interface ConfirmOptions {
  /** Bold heading. Defaults to "Are you sure?". */
  title?: string;
  /**
   * Body copy. Strings preserve newlines (`\n\n`) so multi-paragraph prompts
   * migrated from native `confirm()` render as written.
   */
  description?: React.ReactNode;
  /** Confirm button label. Defaults to "Confirm". */
  confirmText?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelText?: string;
  /** Render the confirm button in the destructive (red) style. */
  destructive?: boolean;
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback<ConfirmFn>((options = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  // Settle the outstanding promise exactly once, then unmount the dialog.
  const settle = React.useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const options = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          // Any dismissal that isn't the confirm button (ESC, overlay click,
          // cancel) is treated as "no" — matching native confirm() semantics.
          if (!open) settle(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {options?.title ?? 'Are you sure?'}
            </AlertDialogTitle>
            {options?.description != null && (
              <AlertDialogDescription className='whitespace-pre-line'>
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {options?.cancelText ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={options?.destructive ? 'destructive' : 'primary'}
              onClick={() => settle(true)}
            >
              {options?.confirmText ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Returns the async `confirm(options)` function. Must be called from a
 * component rendered under {@link ConfirmDialogProvider} (mounted app-wide in
 * app/providers.tsx).
 */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx;
}
