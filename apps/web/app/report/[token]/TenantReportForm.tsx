'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react';

interface PropertyInfo {
  id: string;
  property_name: string;
  address: string;
}

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'heating', label: 'Heating / Boiler' },
  { value: 'structural', label: 'Structural' },
  { value: 'damp_mould', label: 'Damp & Mould' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'door_window', label: 'Doors & Windows' },
  { value: 'roof_guttering', label: 'Roof & Guttering' },
  { value: 'garden_exterior', label: 'Garden & Exterior' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'general', label: 'General / Other' },
] as const;

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Can wait a few weeks' },
  { value: 'medium', label: 'Medium', description: 'Should be fixed soon' },
  { value: 'high', label: 'High', description: 'Needs attention this week' },
  { value: 'urgent', label: 'Urgent', description: 'Emergency - immediate risk' },
] as const;

export function TenantReportForm({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'invalid'>('loading');
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('general');
  const [urgency, setUrgency] = useState('medium');
  const [description, setDescription] = useState('');

  // Validate the token on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/report/${token}`);
        if (!res.ok) {
          setState('invalid');
          return;
        }
        const data = await res.json();
        setProperty(data.property);
        setState('ready');
      } catch {
        setState('invalid');
      }
    }
    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('submitting');
    setErrorMessage('');

    try {
      const res = await fetch(`/api/report/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_name: name,
          reporter_phone: phone || undefined,
          reporter_email: email || undefined,
          reporter_unit: unit || undefined,
          category,
          urgency,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || 'Something went wrong');
        setState('ready');
        return;
      }

      setState('success');
    } catch {
      setErrorMessage('Failed to submit. Please check your connection and try again.');
      setState('ready');
    }
  };

  // Loading
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Validating link...</p>
      </div>
    );
  }

  // Invalid token
  if (state === 'invalid') {
    return (
      <div className="text-center py-16">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h2>
        <p className="text-gray-500">
          This reporting link is invalid or has been deactivated.
          Please contact your property manager for a new link.
        </p>
      </div>
    );
  }

  // Success
  if (state === 'success') {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Submitted</h2>
        <p className="text-gray-500 mb-6">
          Your maintenance issue has been reported. The property manager will be notified and will get back to you.
        </p>
        <button
          type="button"
          onClick={() => {
            setState('ready');
            setName('');
            setPhone('');
            setEmail('');
            setUnit('');
            setCategory('general');
            setUrgency('medium');
            setDescription('');
          }}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Report another issue
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Property Info */}
      {property && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-sm text-gray-500">Reporting issue at</p>
          <p className="font-semibold text-gray-900">{property.property_name}</p>
          <p className="text-sm text-gray-500">{property.address}</p>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-1">Report a Maintenance Issue</h2>
      <p className="text-sm text-gray-500 mb-6">
        Fill in the details below. Your report will be sent directly to the property manager.
      </p>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Smith"
          />
        </div>

        {/* Contact Info Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="07xxx xxxxxx"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>
        </div>

        {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
            Flat / Unit Number
          </label>
          <input
            id="unit"
            type="text"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. Flat 2A"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Issue Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Urgency <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {URGENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  urgency === opt.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Describe the Issue <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Please describe the issue in detail. Include location within the property, when it started, and any other relevant information."
            minLength={10}
          />
          <p className="text-xs text-gray-400 mt-1">{description.length}/10 characters minimum</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={state === 'submitting' || !name.trim() || description.trim().length < 10}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state === 'submitting' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Report
            </>
          )}
        </button>
      </form>
    </div>
  );
}
