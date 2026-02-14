import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContactsClient } from './ContactsClient';

export const metadata: Metadata = {
  title: 'Property Contacts | Mintenance',
  description: 'Manage tenant and keyholder contact records for your properties.',
};

export default async function ContactsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/landlord/contacts');
  }
  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch properties
  const { data: properties } = await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('owner_id', user.id)
    .order('property_name');

  // Fetch contacts
  const { data: contacts } = await serverSupabase
    .from('property_contacts')
    .select('*')
    .eq('owner_id', user.id)
    .order('name');

  return (
    <ContactsClient
      properties={properties || []}
      contacts={contacts || []}
    />
  );
}
