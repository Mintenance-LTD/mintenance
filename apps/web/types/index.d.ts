// Common type definitions for the application

// Sentry global (loaded via script tag)
interface SentryGlobal {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
}

declare global {
  interface Window {
    Sentry?: SentryGlobal;
  }
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  status?: string;
  category?: string;
  budget_min?: number;
  budget_max?: number;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string | null;
  message?: string;
}

export type { User, Job, ApiResponse };
