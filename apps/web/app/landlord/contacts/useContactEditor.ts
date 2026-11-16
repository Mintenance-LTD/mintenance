'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';

export interface PropertyContact {
  id: string;
  property_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  contact_role: string;
  unit_label: string | null;
  move_in_date: string | null;
  lease_end_date: string | null;
  is_active: boolean;
  notes: string | null;
}

const emptyForm = {
  property_id: '',
  name: '',
  email: '',
  phone: '',
  contact_role: 'tenant',
  unit_label: '',
  notes: '',
  move_in_date: '',
  lease_end_date: '',
};

export function useContactEditor(initialContacts: PropertyContact[]) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PropertyContact | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (showForm)
      formRef.current
        ?.querySelector<HTMLInputElement>('input[type="text"]')
        ?.focus();
  }, [showForm, editing]);

  function openContact(contact: PropertyContact | null = null) {
    if (pending.current) return;
    setEditing(contact);
    setFormData(
      contact
        ? {
            property_id: contact.property_id ?? '',
            name: contact.name,
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            contact_role: contact.contact_role,
            unit_label: contact.unit_label ?? '',
            notes: contact.notes ?? '',
            move_in_date: contact.move_in_date ?? '',
            lease_end_date: contact.lease_end_date ?? '',
          }
        : emptyForm
    );
    setError('');
    setShowForm(true);
  }

  async function requestContact(url: string, method: string, body: object) {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(await getCsrfHeaders()),
      },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok || !result.contact?.id)
      throw new Error(
        result.error ||
          'Contact save could not be confirmed. Please reload before retrying.'
      );
    return result.contact as PropertyContact;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (
      pending.current ||
      (!editing && !formData.property_id) ||
      !formData.name.trim()
    )
      return;
    if (
      formData.contact_role === 'emergency_contact' &&
      editing?.is_active !== false &&
      !formData.phone.trim() &&
      !formData.email.trim()
    ) {
      setError('Add a phone number or email address for an emergency contact.');
      return;
    }
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const { property_id, ...fields } = formData;
      const contact = await requestContact(
        editing
          ? `/api/landlord/contacts/${editing.id}`
          : '/api/landlord/contacts',
        editing ? 'PATCH' : 'POST',
        {
          ...fields,
          ...(!editing ? { property_id } : {}),
          name: fields.name.trim(),
          email: fields.email.trim() || null,
          phone: fields.phone.trim() || null,
          unit_label: fields.unit_label.trim() || null,
          notes: fields.notes.trim() || null,
          move_in_date: fields.move_in_date || null,
          lease_end_date: fields.lease_end_date || null,
        }
      );
      setContacts((prev) =>
        editing
          ? prev.map((c) => (c.id === contact.id ? contact : c))
          : [...prev, contact]
      );
      setShowForm(false);
      setEditing(null);
      setFormData(emptyForm);
      toast.success(editing ? 'Contact updated' : 'Contact added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save contact.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function toggleArchive(contact: PropertyContact) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const updated = await requestContact(
        `/api/landlord/contacts/${contact.id}`,
        'PATCH',
        { is_active: !contact.is_active }
      );
      setContacts((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      toast.success(
        updated.is_active ? 'Contact restored' : 'Contact archived'
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update contact.'
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return {
    contacts,
    showForm,
    setShowForm,
    editing,
    formData,
    setFormData,
    saving,
    error,
    formRef,
    openContact,
    onSubmit,
    toggleArchive,
  };
}
