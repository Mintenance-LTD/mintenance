'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Plus, Trash2, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';
import { WorkspaceBadge } from './PropertyWorkspacePrimitives';

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
  notes: string | null;
  is_active: boolean;
  invitation_accepted_at?: string | null;
  user_id?: string | null;
}

export default function TenantContacts({ propertyId }: { propertyId: string }) {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const inviting = useRef(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    lease_start: '',
    lease_end: '',
    notes: '',
  });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/tenants`);
      if (!res.ok) throw new Error('Failed to load records');
      const data = await res.json();
      if (!Array.isArray(data.tenants)) throw new Error('Incomplete records');
      setTenants(data.tenants);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleAdd = async () => {
    if (savingRef.current) return;
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.tenant?.id)
          throw new Error('Tenant save could not be confirmed');
        setTenants((prev) => [data.tenant, ...prev]);
        setForm({
          name: '',
          email: '',
          phone: '',
          lease_start: '',
          lease_end: '',
          notes: '',
        });
        setShowForm(false);
        toast.success(
          ['not_sent', 'unconfirmed'].includes(data.invitation_status)
            ? 'Contact saved. Invitation delivery is unconfirmed. Check the inbox before retrying in 15 minutes.'
            : 'Tenant added'
        );
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add');
      }
    } catch {
      toast.error('Failed to add tenant');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const retryInvitation = async (id: string) => {
    if (inviting.current) return;
    inviting.current = true;
    setSendingInvite(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/tenants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await getCsrfToken(),
        },
        body: JSON.stringify({ tenantId: id }),
      });
      const body = await res.json();
      if (!res.ok || body.invitation_sent !== true)
        throw new Error(
          typeof body.error === 'string'
            ? body.error
            : 'Invitation delivery was not confirmed. Please check the inbox before retrying.'
        );
      toast.success('Invitation sent');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Invitation delivery was not confirmed.'
      );
    } finally {
      inviting.current = false;
      setSendingInvite(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(
        `/api/properties/${propertyId}/tenants?tenantId=${id}`,
        {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      if (!res.ok) throw new Error('Removal could not be confirmed');
      const data = await res.json();
      if (data.success !== true)
        throw new Error('Removal could not be confirmed');
      {
        setTenants((prev) => prev.filter((t) => t.id !== id));
        toast.success('Tenant removed');
      }
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loadError)
    return (
      <div role='alert' className='p-4 border rounded-xl'>
        <p>Could not load tenants.</p>
        <button type='button' onClick={fetchTenants}>
          Retry tenants
        </button>
      </div>
    );

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB') : '—';

  if (loading) {
    return (
      <div className='p-4 border border-gray-200 rounded-xl'>
        <div className='flex items-center gap-2 mb-2'>
          <User className='w-4 h-4 text-teal-600' />
          <h4 className='text-sm font-semibold text-gray-900'>Contacts</h4>
        </div>
        <div className='flex items-center justify-center py-4'>
          <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 border border-gray-200 rounded-xl'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <User className='w-4 h-4 text-teal-600' />
          <h4 className='text-sm font-semibold text-gray-900'>Contacts</h4>
        </div>
        <button
          aria-label='Add tenant'
          onClick={() => setShowForm(!showForm)}
          className='pw-btn pw-btn-small'
        >
          <Plus size={16} /> Add contact
        </button>
      </div>

      {showForm && (
        <div className='mb-3 p-3 bg-gray-50 rounded-lg space-y-2'>
          <input
            type='text'
            aria-label='Tenant name'
            placeholder='Tenant name *'
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className='w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
          />
          <div className='grid grid-cols-2 gap-2'>
            <input
              type='email'
              aria-label='Tenant email'
              placeholder='Email'
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className='px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
            />
            <input
              type='tel'
              aria-label='Tenant phone'
              placeholder='Phone'
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className='px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='text-[10px] text-gray-500 mb-0.5 block'>
                Lease Start
              </label>
              <input
                type='date'
                aria-label='Lease start'
                value={form.lease_start}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lease_start: e.target.value }))
                }
                className='w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
              />
            </div>
            <div>
              <label className='text-[10px] text-gray-500 mb-0.5 block'>
                Lease End
              </label>
              <input
                type='date'
                aria-label='Lease end'
                value={form.lease_end}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lease_end: e.target.value }))
                }
                className='w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
              />
            </div>
          </div>
          <textarea
            aria-label='Tenant notes'
            placeholder='Notes (optional)'
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={2}
            className='w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none'
          />
          <div className='flex gap-2'>
            <button
              onClick={handleAdd}
              disabled={saving}
              className='flex-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50'
            >
              {saving ? 'Adding...' : 'Add Tenant'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className='px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg'
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className='pw-muted' style={{ marginBottom: 16 }}>
        Manage your property contacts and invitations.
      </p>
      <label className='pw-search' style={{ marginBottom: 18 }}>
        <Search size={18} />
        <input
          type='search'
          aria-label='Search contacts'
          placeholder='Search contacts…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className='pw-table-wrap'>
        <table className='pw-table'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants
              .filter((t) =>
                (t.name + ' ' + (t.email ?? ''))
                  .toLowerCase()
                  .includes(search.toLowerCase())
              )
              .map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.name}
                    <p className='pw-muted'>
                      {t.email || t.phone || 'Contact details saved'}
                    </p>
                    {(t.lease_start || t.lease_end) && (
                      <p className='pw-muted'>
                        Lease: {formatDate(t.lease_start)} —{' '}
                        {formatDate(t.lease_end)}
                      </p>
                    )}
                    {t.notes && <p className='pw-muted'>{t.notes}</p>}
                  </td>
                  <td>
                    <WorkspaceBadge
                      tone={
                        t.user_id || t.invitation_accepted_at ? '' : 'neutral'
                      }
                    >
                      {t.user_id || t.invitation_accepted_at
                        ? 'Connected'
                        : 'Contact saved'}
                    </WorkspaceBadge>
                  </td>
                  <td>
                    <div className='pw-actions'>
                      {t.email && !t.user_id && !t.invitation_accepted_at && (
                        <button
                          className='pw-btn pw-btn-small'
                          disabled={sendingInvite}
                          onClick={() => retryInvitation(t.id)}
                        >
                          Send invitation
                        </button>
                      )}
                      <details>
                        <summary
                          aria-label={'More actions for ' + t.name}
                          style={{ cursor: 'pointer', padding: 8 }}
                        >
                          •••
                        </summary>
                        <button
                          aria-label={'Remove tenant ' + t.name}
                          className='pw-btn pw-btn-small'
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!tenants.length && (
        <p className='pw-empty'>
          No contacts yet. Add a contact to keep their details with this
          property.
        </p>
      )}
      {tenants.length > 0 &&
        !tenants.some((t) =>
          (t.name + ' ' + (t.email ?? ''))
            .toLowerCase()
            .includes(search.toLowerCase())
        ) && <p className='pw-empty'>No contacts match your search.</p>}
    </div>
  );
}
