'use client';

import React, { useState } from 'react';
import {
  Plus,
  User,
  Phone,
  Mail,
  Building2,
  Key,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const ROLE_ICONS: Record<string, React.ReactNode> = {
  tenant: <User className="w-4 h-4" />,
  keyholder: <Key className="w-4 h-4" />,
  emergency_contact: <AlertCircle className="w-4 h-4" />,
  managing_agent: <Users className="w-4 h-4" />,
};

const ROLE_LABELS: Record<string, string> = {
  tenant: 'Tenant',
  keyholder: 'Keyholder',
  emergency_contact: 'Emergency Contact',
  managing_agent: 'Managing Agent',
};

export function ContactsClient({
  properties,
  contacts: initialContacts,
}: {
  properties: Property[];
  contacts: Contact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [filterProperty, setFilterProperty] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    property_id: '',
    name: '',
    email: '',
    phone: '',
    contact_role: 'tenant',
    unit_label: '',
    notes: '',
  });

  const filtered = filterProperty === 'all'
    ? contacts
    : contacts.filter(c => c.property_id === filterProperty);

  const getPropertyName = (id: string) =>
    properties.find(p => p.id === id)?.property_name || 'Unknown';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id || !formData.name.trim()) return;

    try {
      const res = await fetch('/api/landlord/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          unit_label: formData.unit_label.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const { contact } = await res.json();
      setContacts(prev => [...prev, contact]);
      setShowForm(false);
      setFormData({ property_id: '', name: '', email: '', phone: '', contact_role: 'tenant', unit_label: '', notes: '' });
      toast.success('Contact added');
    } catch {
      toast.error('Failed to add contact');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Contacts</h1>
          <p className="mt-1 text-gray-500">Manage tenant and keyholder records.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Add Contact Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">New Contact</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                required
                value={formData.property_id}
                onChange={e => setFormData(p => ({ ...p, property_id: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
              <select
                value={formData.contact_role}
                onChange={e => setFormData(p => ({ ...p, contact_role: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <input
              required
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Unit / Flat"
                value={formData.unit_label}
                onChange={e => setFormData(p => ({ ...p, unit_label: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Save Contact
            </button>
          </form>
        </div>
      )}

      {/* Filter */}
      {properties.length > 1 && (
        <div className="mb-4">
          <select
            value={filterProperty}
            onChange={e => setFilterProperty(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
          </select>
        </div>
      )}

      {/* Contact List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
          <p className="text-gray-500">Add tenants, keyholders and emergency contacts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(contact => (
            <div key={contact.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    {ROLE_ICONS[contact.contact_role] || <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="capitalize">{ROLE_LABELS[contact.contact_role] || contact.contact_role}</span>
                      {contact.unit_label && <span>Unit {contact.unit_label}</span>}
                      <span>{getPropertyName(contact.property_id)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
