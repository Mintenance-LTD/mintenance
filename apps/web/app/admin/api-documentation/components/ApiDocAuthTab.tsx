'use client';

import React from 'react';
import { Key, AlertCircle } from 'lucide-react';

export function ApiDocAuthTab() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <Key className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Authentication</h2>
          <p className="text-gray-600">Secure your API requests</p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Key</h3>
          <p className="text-gray-600 mb-4">Include your API key in the Authorization header of every request:</p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"><code>{'Authorization: Bearer YOUR_API_KEY'}</code></pre>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Security Best Practices</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Never share your API key publicly</li>
                <li>Rotate your keys regularly</li>
                <li>Use environment variables to store keys</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">OAuth 2.0</h3>
          <p className="text-gray-600 mb-4">For user-specific actions, use OAuth 2.0 authentication flow:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Redirect user to authorization URL</li>
            <li>User grants permission</li>
            <li>Receive authorization code</li>
            <li>Exchange code for access token</li>
            <li>Use access token in API requests</li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Limiting</h3>
          <p className="text-gray-600 mb-4">API requests are limited to prevent abuse. Rate limits vary by endpoint:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">1,000</div>
              <div className="text-sm text-gray-600">Requests per hour</div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600 mb-2">100</div>
              <div className="text-sm text-gray-600">Requests per minute</div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">10,000</div>
              <div className="text-sm text-gray-600">Requests per day</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
