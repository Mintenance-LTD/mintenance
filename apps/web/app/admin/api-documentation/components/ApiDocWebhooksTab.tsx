'use client';

import React from 'react';
import { Webhook } from 'lucide-react';

const webhookEvents = [
  { event: 'job.created', description: 'Triggered when a new job is posted' },
  { event: 'job.updated', description: 'Triggered when job details change' },
  { event: 'bid.submitted', description: 'Triggered when a contractor submits a bid' },
  { event: 'payment.completed', description: 'Triggered when payment is processed' },
  { event: 'review.submitted', description: 'Triggered when a review is posted' },
];

export function ApiDocWebhooksTab() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Webhook className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
          <p className="text-gray-600">Real-time event notifications</p>
        </div>
      </div>

      <div className="space-y-6">
        <p className="text-gray-700">
          Webhooks allow you to receive real-time notifications when events occur in your Mintenance account.
        </p>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Events</h3>
          <div className="space-y-2">
            {webhookEvents.map((item) => (
              <div key={item.event} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <code className="text-sm font-mono text-purple-600">{item.event}</code>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhook Security</h3>
          <p className="text-gray-600 mb-4">
            Verify webhook authenticity by checking the signature in the{' '}
            <code className="px-2 py-1 bg-gray-100 rounded text-sm">X-Mintenance-Signature</code>{' '}header.
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
