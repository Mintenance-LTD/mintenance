// Global type augmentations for Window and Navigator
// This file must NOT have any imports/exports to remain an ambient declaration file

interface SentryGlobal {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
}

interface Window {
  Sentry?: SentryGlobal;
  csrfToken?: string;
  gtag?: (...args: unknown[]) => void;
}

interface Navigator {
  standalone?: boolean;
}
