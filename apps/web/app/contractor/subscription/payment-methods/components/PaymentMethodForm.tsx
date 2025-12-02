'use client';

import React, { useState } from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GDPRForm } from './GDPRForm';

export function PaymentMethodForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    description: '',
    paymentMethodType: '',
    language: 'en',
    date: '',
    gdpr: '',
  });

  const [showGDPR, setShowGDPR] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement payment method creation with Stripe
    console.log('Form data:', formData);
  };

  return (
    <StandardCard>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Add Payment Method</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethodType">Payment Method Type</Label>
            <Select
              value={formData.paymentMethodType}
              onValueChange={(value) => setFormData({ ...formData, paymentMethodType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_account">Bank Account</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="gdpr">GDPR</Label>
            <Select
              value={formData.gdpr}
              onValueChange={(value) => {
                setFormData({ ...formData, gdpr: value });
                setShowGDPR(value === 'yes');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select GDPR option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showGDPR && <GDPRForm />}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Add Payment Method</Button>
          </div>
        </form>
      </div>
    </StandardCard>
  );
}

