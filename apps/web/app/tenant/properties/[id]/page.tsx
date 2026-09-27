import { redirect, notFound } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { getInvitedProperty } from '@/lib/services/tenants/invited-property';

export const dynamic = 'force-dynamic';
export default async function InvitedPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await getCurrentUserFromCookies();
  if (!user)
    redirect(
      `/login?redirect=${encodeURIComponent(`/tenant/properties/${id}`)}`
    );
  const property = await getInvitedProperty(user.id, id);
  if (!property) notFound();
  return (
    <main className='mx-auto max-w-xl p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Your linked property</h1>
      <h2 className='text-xl'>{property.property_name || 'Your home'}</h2>
      <p>{property.address}</p>
      <p>Your verified account is linked to this property as a tenant.</p>
      <p>
        To report maintenance, ask your property manager for their reporting
        link or contact them through your usual channel. This invitation does
        not grant access to management records, payments or contractor messages.
      </p>
    </main>
  );
}
