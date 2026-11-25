'use client';

import { useCallback } from 'react';
import { useAdminFetch } from '@/components/admin/AdminVerificationProvider';
import { getCsrfHeaders } from '@/lib/csrf-client';

export type SupportOperators = {
  currentAdminId: string;
  operators: Array<{
    admin_id: string;
    name: string;
    available: boolean;
    capacity: number;
    can_broadcast: boolean;
    can_manage_team: boolean;
  }>;
};

export function useSupportRequest() {
  const adminFetch = useAdminFetch();
  return useCallback(
    async <T>(path: string, method = 'GET', payload?: unknown): Promise<T> => {
      const headers = method === 'GET' ? {} : await getCsrfHeaders();
      const response = await adminFetch(path, {
        method,
        headers: {
          ...headers,
          ...(payload === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body)
        throw new Error(
          body?.error?.message ||
            body?.error ||
            'Request unavailable. Please retry.'
        );
      return body;
    },
    [adminFetch]
  );
}
