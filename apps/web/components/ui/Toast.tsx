'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} hideToast={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  hideToast: (id: string) => void;
}

function ToastContainer({ toasts, hideToast }: ToastContainerProps) {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: theme.spacing[4],
        right: theme.spacing[4],
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
        maxWidth: '400px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const typeConfig = {
    success: {
      bgColor: '#ECFDF5',
      borderColor: '#10B981',
      iconColor: '#10B981',
      icon: 'checkCircle',
    },
    error: {
      bgColor: '#FEF2F2',
      borderColor: '#EF4444',
      iconColor: '#EF4444',
      icon: 'xCircle',
    },
    warning: {
      bgColor: '#FFFBEB',
      borderColor: '#F59E0B',
      iconColor: '#F59E0B',
      icon: 'alert',
    },
    info: {
      bgColor: '#EFF6FF',
      borderColor: '#3B82F6',
      iconColor: '#3B82F6',
      icon: 'info',
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      role="alert"
      style={{
        backgroundColor: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[3],
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing[3],
        pointerEvents: 'auto',
        boxShadow: theme.shadows.lg,
        transform: isVisible ? 'translateX(0)' : 'translateX(400px)',
        transition: 'transform 0.3s ease-out',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <Icon name={config.icon} size={20} color={config.iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.textPrimary,
          lineHeight: theme.typography.lineHeight.normal,
        }}>
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleClose();
            }}
            style={{
              marginTop: theme.spacing[2],
              padding: 0,
              backgroundColor: 'transparent',
              border: 'none',
              color: config.iconColor,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleClose}
        aria-label="Close notification"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: theme.spacing[1],
          borderRadius: theme.borderRadius.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textSecondary,
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Icon name="x" size={16} color="inherit" />
      </button>
    </div>
  );
}

