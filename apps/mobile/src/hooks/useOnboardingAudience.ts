import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mobileApiClient } from '../utils/mobileApiClient';

export function useOnboardingAudience() {
  const { user } = useAuth();
  const id = user?.id,
    role = user?.role;
  const [result, setResult] = useState<{
    id: string;
    audience: 'contractor' | 'team-member' | null;
  } | null>(null);
  useEffect(() => {
    if (!id || role !== 'contractor') return;
    let active = true;
    mobileApiClient
      .get<{ organizations: { organization_type: string; myRole: string }[] }>(
        '/api/user/organizations'
      )
      .then((data) => {
        const companies = data.organizations.filter(
          (org) => org.organization_type === 'contractor_company'
        );
        const audience =
          companies.length > 0 &&
          companies.every((org) => org.myRole !== 'owner')
            ? 'team-member'
            : 'contractor';
        if (active) setResult({ id, audience });
      })
      .catch(() => {
        if (active) setResult({ id, audience: null });
      });
    return () => {
      active = false;
    };
  }, [id, role]);
  return role === 'contractor'
    ? {
        ready: result?.id === id,
        audience: result?.id === id ? (result?.audience ?? null) : null,
      }
    : { ready: true, audience: role };
}
