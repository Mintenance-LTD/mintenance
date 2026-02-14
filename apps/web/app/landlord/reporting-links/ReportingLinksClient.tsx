'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Link2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Building2,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface Token {
  id: string;
  property_id: string;
  token: string;
  is_active: boolean;
  label: string | null;
  total_reports: number;
  last_report_at: string | null;
  created_at: string;
}

export function ReportingLinksClient({
  properties,
  tokens: initialTokens,
}: {
  properties: Property[];
  tokens: Token[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [creating, setCreating] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [label, setLabel] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPropertyName = (propertyId: string) =>
    properties.find(p => p.id === propertyId)?.property_name || 'Unknown Property';

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/report/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createToken = async () => {
    if (!selectedProperty) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/properties/${selectedProperty}/report-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || null }),
      });

      if (!res.ok) throw new Error('Failed');

      const { token } = await res.json();
      setTokens(prev => [token, ...prev]);
      setSelectedProperty('');
      setLabel('');
      toast.success('Reporting link created');
    } catch {
      toast.error('Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const toggleToken = async (token: Token) => {
    try {
      const res = await fetch(`/api/properties/${token.property_id}/report-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: token.id, is_active: !token.is_active }),
      });

      if (!res.ok) throw new Error('Failed');

      setTokens(prev =>
        prev.map(t => t.id === token.id ? { ...t, is_active: !t.is_active } : t),
      );
    } catch {
      toast.error('Failed to update link');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reporting Links</h1>
        <p className="mt-1 text-gray-500">
          Create shareable links for tenants to report maintenance issues anonymously.
        </p>
      </div>

      {/* Create New Link */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Create New Link</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedProperty}
            onChange={e => setSelectedProperty(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select property...</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.property_name}</option>
            ))}
          </select>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="sm:w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={createToken}
            disabled={!selectedProperty || creating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Token List */}
      {tokens.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reporting links yet</h3>
          <p className="text-gray-500">Create a link above and share it with your tenants.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map(token => (
            <div
              key={token.id}
              className={`bg-white rounded-xl border p-4 ${token.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm text-gray-900">
                      {getPropertyName(token.property_id)}
                    </span>
                    {token.label && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {token.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate">
                    /report/{token.token}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{token.total_reports} reports</span>
                    <span>Created {new Date(token.created_at).toLocaleDateString('en-GB')}</span>
                    {token.last_report_at && (
                      <span>Last report {new Date(token.last_report_at).toLocaleDateString('en-GB')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => copyLink(token.token, token.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Copy link"
                  >
                    {copiedId === token.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <a
                    href={`/report/${token.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                  <button
                    type="button"
                    onClick={() => toggleToken(token)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={token.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {token.is_active ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
