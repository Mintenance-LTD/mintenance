/**
 * Error Manager - Enhanced error handling
 */

import { Alert } from 'react-native';
import { captureException } from '../config/sentry';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  SYSTEM = 'system',
}

interface ErrorInfo {
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  code?: string;
  recoverable?: boolean;
}

class ErrorManagerService {
  private isShowingError = false;

  public handleError(error: Error | string, info?: Partial<ErrorInfo>): void {
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      severity: info?.severity || ErrorSeverity.MEDIUM,
      category: info?.category || ErrorCategory.SYSTEM,
      code: info?.code,
      recoverable: info?.recoverable ?? true,
    };

    this.logError(errorInfo);
    this.showUserError(errorInfo);
  }

  public handleNetworkError(error: any): void {
    let message = 'Network error occurred';
    
    if (!navigator.onLine) {
      message = 'No internet connection. Please check your network.';
    } else if (error.status === 401) {
      message = 'Authentication required. Please log in.';
    } else if (error.status === 403) {
      message = 'Access denied. Insufficient permissions.';
    } else if (error.status >= 500) {
      message = 'Server error. Please try again later.';
    }

    this.handleError(message, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
    });
  }

  public handleValidationError(errors: string[]): void {
    const message = errors.length === 1 
      ? errors[0] 
      : `Please fix: ${errors.join(', ')}`;

    this.handleError(message, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
    });
  }

  private showUserError(errorInfo: ErrorInfo): void {
    if (this.isShowingError) return;
    
    this.isShowingError = true;
    
    Alert.alert(
      'Error',
      errorInfo.message,
      [
        {
          text: 'OK',
          onPress: () => { this.isShowingError = false; },
        },
      ]
    );
  }

  private logError(errorInfo: ErrorInfo): void {
    logger.error('Error:', errorInfo);
    
    try {
      captureException(new Error(errorInfo.message), {
        tags: {
          severity: errorInfo.severity,
          category: errorInfo.category,
        },
      });
    } catch (e) {
      logger.warn('Failed to log error:', e);
    }
  }
}

export const ErrorManager = new ErrorManagerService();
export default ErrorManager;
