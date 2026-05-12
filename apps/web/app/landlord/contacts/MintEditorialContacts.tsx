'use client';

/**
 * Mint Editorial port of /landlord/contacts.
 *
 * Same property + contact data path as ContactsClient.tsx. Visual
 * diffs:
 *   - Header → .t-h1 + .t-body
 *   - Add-contact form → .card .card-pad with .field inputs and
 *     .btn-primary save action
 *   - Property filter → .chip / .chip.on row
 *   - Contact rows → .card with avatar tile + role chip + .btn-ghost
 *     phone/email shortcuts
 *   - Empty state → <MintEditorialEmptyState> with User icon
 *
 * Functional fix (audit P2): POST /api/landlord/contacts now sends a
 * CSRF header. Same reasoning as the reporting-links port.
 */

import React, { useMemo, useState } from 'react';
import {
  Plus,
  User,
  Phone,
  Mail,
  Key,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface Contact {
  id: string;
  property_id: string;
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

const ROLE_LABELS: Record<string, string> = {
  tenant: 'Tenant',
  keyholder: 'Keyholder',
  emergency_contact: 'Emergency contact',
  managing_agent: 'Managing agent',
};

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'keyholder':
      return <Key size={14} strokeWidth={1.75} />;
    case 'emergency_contact':
      return <AlertCircle size={14} strokeWidth={1.75} />;
    case 'managing_agent':
      return <Users size={14} strokeWidth={1.75} />;
    default:
      return <User size={14} strokeWidth={1.75} />;
  }
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function MintEditorialContacts({
  properties,
  contacts: initialContacts,
}: {
  properties: Property[];
  contacts: Contact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    name: '',
    email: '',
    phone: '',
    contact_role: 'tenant',
    unit_label: '',
    notes: '',
    move_in_date: '',
    lease_end_date: '',
  });

  const propertyName = (id: string) =>
    properties.find((p) => p.id === id)?.property_name || 'Unknown property';

  const visible = useMemo(
    () =>
      filterProperty === 'all'
        ? contacts
        : contacts.filter((c) => c.property_id === filterProperty),
    [contacts, filterProperty]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id || !formData.name.trim() || saving) return;
    setSaving(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/landlord/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          unit_label: formData.unit_label.trim() || null,
          notes: formData.notes.trim() || null,
          move_in_date: formData.move_in_date || null,
          lease_end_date: formData.lease_end_date || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const { contact } = await res.json();
      setContacts((prev) => [...prev, contact]);
      setShowForm(false);
      setFormData({
        property_id: '',
        name: '',
        email: '',
        phone: '',
        contact_role: 'tenant',
        unit_label: '',
        notes: '',
        move_in_date: '',
        lease_end_date: '',
      });
      toast.success('Contact added');
    } catch {
      toast.error('Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className='between' style={{ marginBottom: 22, gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Property Contacts</h1>
          <p className='t-body'>
            Tenants, keyholders, emergency contacts, and managing agents per
            property.
          </p>
        </div>
        <button
          type='button'
          className='btn btn-primary'
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={14} strokeWidth={1.75} />
          {showForm ? 'Cancel' : 'Add contact'}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className='card card-pad'
          style={{ marginBottom: 18 }}
        >
          <div className='between' style={{ marginBottom: 12 }}>
            <h2 className='t-h4'>New contact</h2>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={() => setShowForm(false)}
              aria-label='Close form'
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className='col' style={{ gap: 10 }}>
            <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
              <select
                required
                className='field'
                value={formData.property_id}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, property_id: e.target.value }))
                }
                style={{ flex: '1 1 220px', minWidth: 220 }}
              >
                <option value=''>Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_name}
                  </option>
                ))}
              </select>
              <select
                className='field'
                value={formData.contact_role}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, contact_role: e.target.value }))
                }
                style={{ flex: '1 1 180px', minWidth: 180 }}
              >
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <input
              required
              type='text'
              className='field'
              placeholder='Full name'
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
            />
            <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
              <input
                type='email'
                className='field'
                placeholder='Email (optional)'
                value={formData.email}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, email: e.target.value }))
                }
                style={{ flex: '1 1 200px', minWidth: 180 }}
              />
              <input
                type='tel'
                className='field'
                placeholder='Phone (optional)'
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
                style={{ flex: '1 1 160px', minWidth: 140 }}
              />
              <input
                type='text'
                className='field'
                placeholder='Unit / flat'
                value={formData.unit_label}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, unit_label: e.target.value }))
                }
                style={{ flex: '1 1 120px', minWidth: 120 }}
              />
            </div>
            {/* Tenancy dates — only render for the tenant role; other
                roles (keyholder / emergency contact / managing agent)
                don't have a lease cycle. Optional fields either way. */}
            {formData.contact_role === 'tenant' ? (
              <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
                <label
                  className='col'
                  style={{ flex: '1 1 200px', minWidth: 180, gap: 4 }}
                >
                  <span className='t-meta'>Move-in date</span>
                  <input
                    type='date'
                    className='field'
                    value={formData.move_in_date}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        move_in_date: e.target.value,
                      }))
                    }
                  />
                </label>
                <label
                  className='col'
                  style={{ flex: '1 1 200px', minWidth: 180, gap: 4 }}
                >
                  <span className='t-meta'>Lease end date</span>
                  <input
                    type='date'
                    className='field'
                    value={formData.lease_end_date}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        lease_end_date: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            ) : null}
            <button
              type='submit'
              className='btn btn-primary'
              disabled={
                saving || !formData.property_id || !formData.name.trim()
              }
              style={{ alignSelf: 'flex-start' }}
            >
              {saving ? 'Saving…' : 'Save contact'}
            </button>
          </div>
        </form>
      ) : null}

      {properties.length > 1 ? (
        <div
          className='row'
          style={{ gap: 6, flexWrap: 'wrap', marginBottom: 16 }}
        >
          <button
            type='button'
            className={'chip ' + (filterProperty === 'all' ? 'on' : '')}
            onClick={() => setFilterProperty('all')}
          >
            All · {contacts.length}
          </button>
          {properties.map((p) => {
            const c = contacts.filter((co) => co.property_id === p.id).length;
            if (c === 0) return null;
            return (
              <button
                key={p.id}
                type='button'
                className={'chip ' + (filterProperty === p.id ? 'on' : '')}
                onClick={() => setFilterProperty(p.id)}
              >
                {p.property_name} · {c}
              </button>
            );
          })}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <MintEditorialEmptyState
          icon={User}
          title='No contacts yet'
          body='Add tenants, keyholders, emergency contacts, and managing agents so the right people get notified.'
          cta={{
            label: 'Add your first contact',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className='col' style={{ gap: 10 }}>
          {visible.map((contact) => (
            <div
              key={contact.id}
              className='card card-pad'
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                opacity: contact.is_active ? 1 : 0.6,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--me-brand-soft)',
                  color: 'var(--me-brand)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {initialsOf(contact.name)}
              </span>
              <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {contact.name}
                  </span>
                  <span
                    className='chip'
                    style={{
                      fontSize: 11,
                      display: 'inline-flex',
                      gap: 4,
                      alignItems: 'center',
                    }}
                  >
                    <RoleIcon role={contact.contact_role} />
                    {ROLE_LABELS[contact.contact_role] || contact.contact_role}
                  </span>
                </div>
                <span className='t-meta' style={{ fontSize: 12 }}>
                  {propertyName(contact.property_id)}
                  {contact.unit_label ? ` · Unit ${contact.unit_label}` : ''}
                </span>
                {contact.contact_role === 'tenant' &&
                (contact.move_in_date || contact.lease_end_date) ? (
                  <span className='t-meta' style={{ fontSize: 11 }}>
                    {contact.move_in_date
                      ? `Since ${new Date(contact.move_in_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
                      : ''}
                    {contact.move_in_date && contact.lease_end_date
                      ? ' · '
                      : ''}
                    {contact.lease_end_date
                      ? `Lease ends ${new Date(contact.lease_end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
                      : ''}
                  </span>
                ) : null}
              </div>
              <div className='row' style={{ gap: 6, flexShrink: 0 }}>
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className='btn btn-ghost btn-sm'
                    aria-label='Call'
                  >
                    <Phone size={13} strokeWidth={1.75} />
                  </a>
                ) : null}
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className='btn btn-ghost btn-sm'
                    aria-label='Email'
                  >
                    <Mail size={13} strokeWidth={1.75} />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
