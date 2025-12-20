import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast, ToastProps } from './Toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ToastConfig extends Omit<ToastProps, 'id'> {
  id?: string;
}

interface ToastInstance extends ToastProps {
  id: string;
  timestamp: number;
}

interface ToastManagerState {
  toasts: ToastInstance[];
}

// ============================================================================
// TOAST MANAGER CLASS
// ============================================================================

class ToastService {
  private static instance: ToastService;
  private listeners: ((toasts: ToastInstance[]) => void)[] = [];
  private toasts: ToastInstance[] = [];
  private idCounter = 0;

  private constructor() {}

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  // Subscribe to toast updates
  subscribe(listener: (toasts: ToastInstance[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notify(): void {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  // Generate unique ID
  private generateId(): string {
    return `toast_${++this.idCounter}_${Date.now()}`;
  }

  // Add a new toast
  show(config: ToastConfig): string {
    const id = config.id || this.generateId();

    // Remove existing toast with same ID
    this.dismiss(id);

    const toast: ToastInstance = {
      ...config,
      id,
      timestamp: Date.now(),
      onDismiss: (toastId: string) => {
        this.dismiss(toastId);
        config.onDismiss?.(toastId);
      },
    };

    this.toasts.push(toast);
    this.notify();
    return id;
  }

  // Remove a specific toast
  dismiss(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      this.notify();
    }
  }

  // Remove all toasts
  dismissAll(): void {
    this.toasts = [];
    this.notify();
  }

  // Remove toasts by type
  dismissByType(type: ToastProps['type']): void {
    this.toasts = this.toasts.filter(t => t.type !== type);
    this.notify();
  }

  // Update existing toast
  update(id: string, updates: Partial<ToastConfig>): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts[index] = { ...this.toasts[index], ...updates };
      this.notify();
    }
  }

  // Get current toasts
  getToasts(): ToastInstance[] {
    return [...this.toasts];
  }

  // Convenience methods
  success(title: string, message?: string, options?: Partial<ToastConfig>): string {
    return this.show({ type: 'success', title, message, ...options });
  }

  error(title: string, message?: string, options?: Partial<ToastConfig>): string {
    return this.show({ type: 'error', title, message, ...options });
  }

  warning(title: string, message?: string, options?: Partial<ToastConfig>): string {
    return this.show({ type: 'warning', title, message, ...options });
  }

  info(title: string, message?: string, options?: Partial<ToastConfig>): string {
    return this.show({ type: 'info', title, message, ...options });
  }

  loading(title: string, message?: string, options?: Partial<ToastConfig>): string {
    return this.show({ type: 'loading', title, message, duration: 0, ...options });
  }

  // Promise-based methods
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    },
    options?: Partial<ToastConfig>
  ): Promise<T> {
    const loadingId = messages.loading
      ? this.loading(messages.loading, undefined, { id: 'promise_toast', ...options })
      : '';

    return promise
      .then((data) => {
        if (loadingId) this.dismiss(loadingId);

        if (messages.success) {
          const successMessage = typeof messages.success === 'function'
            ? messages.success(data)
            : messages.success;
          this.success(successMessage, undefined, { id: 'promise_toast', ...options });
        }

        return data;
      })
      .catch((error) => {
        if (loadingId) this.dismiss(loadingId);

        if (messages.error) {
          const errorMessage = typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error;
          this.error(errorMessage, undefined, { id: 'promise_toast', ...options });
        }

        throw error;
      });
  }
}

// Export singleton instance
export const toastManager = ToastService.getInstance();

// ============================================================================
// TOAST MANAGER COMPONENT
// ============================================================================

export const ToastManager: React.FC = () => {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  // Group toasts by position
  const topToasts = toasts.filter(t => (t.position || 'top') === 'top');
  const bottomToasts = toasts.filter(t => (t.position || 'top') === 'bottom');
  const centerToasts = toasts.filter(t => (t.position || 'top') === 'center');

  const renderToasts = (toastList: ToastInstance[]) => {
    return toastList.map((toast) => (
      <Toast key={toast.id} {...toast} />
    ));
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {renderToasts(topToasts)}
      {renderToasts(centerToasts)}
      {renderToasts(bottomToasts)}
    </View>
  );
};

// ============================================================================
// TOAST HOOK
// ============================================================================

export const useToast = () => {
  return {
    show: (config: ToastConfig) => toastManager.show(config),
    dismiss: (id: string) => toastManager.dismiss(id),
    dismissAll: () => toastManager.dismissAll(),
    dismissByType: (type: ToastProps['type']) => toastManager.dismissByType(type),
    update: (id: string, updates: Partial<ToastConfig>) => toastManager.update(id, updates),

    // Convenience methods
    success: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      toastManager.success(title, message, options),
    error: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      toastManager.error(title, message, options),
    warning: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      toastManager.warning(title, message, options),
    info: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      toastManager.info(title, message, options),
    loading: (title: string, message?: string, options?: Partial<ToastConfig>) =>
      toastManager.loading(title, message, options),

    // Promise helper
    promise: (promise: Promise<any>, messages: any, options?: Partial<ToastConfig>) =>
      toastManager.promise(promise, messages, options),
  };
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
  },
});

export default ToastManager;