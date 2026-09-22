import Link from 'next/link';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SharedPropertiesRetry } from './SharedPropertiesRetry';

export async function SharedPropertyLinks({ userId }: { userId: string }) {
  const { data, error } = await serverSupabase
    .from('property_team_members')
    .select('property_id, role, properties:property_id(id, property_name)')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .in('role', ['admin', 'manager', 'viewer']);
  if (error) return <SharedPropertiesRetry />;
  type Membership = {
    property_id: string;
    role: string;
    properties:
      | { id: string; property_name: string | null }
      | { id: string; property_name: string | null }[]
      | null;
  };
  const rows = ((data as unknown as Membership[]) || []).flatMap((member) => {
    const property = Array.isArray(member.properties)
      ? member.properties[0]
      : member.properties;
    return property && property.id === member.property_id
      ? [{ ...property, role: member.role }]
      : [];
  });
  if (!rows.length) return null;
  return (
    <section className='card card-pad my-4' aria-label='Shared properties'>
      <h2 className='t-h2'>Shared with you</h2>
      <ul className='divide-y divide-gray-200'>
        {rows.map((property) => (
          <li key={property.id} className='py-3'>
            <Link
              href={`/properties/${property.id}`}
              className='font-semibold underline'
            >
              {property.property_name || 'Shared property'}
            </Link>
            <span className='ml-3'>
              {property.role === 'admin'
                ? 'Team administrator'
                : property.role === 'manager'
                  ? 'Manager'
                  : 'Viewer'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
