import { notFound, redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { isValidUUID } from '@/lib/validation/uuid';
import { visitHref } from '@/lib/scheduling/visit-history';
import { readVisitRecords } from './visit-history';

export async function readVisitForPage(
  id: string,
  role: 'homeowner' | 'contractor'
) {
  if (!isValidUUID(id)) notFound();
  const user = await getCurrentUserFromCookies();
  if (!user)
    redirect(
      `/login?${new URLSearchParams({ redirect: visitHref(id, role) })}`
    );
  if (user.role === 'admin') notFound();
  if (user.role !== role) redirect(visitHref(id, user.role));
  const [visit] = await readVisitRecords(user, { id });
  if (!visit) notFound();
  return visit;
}
