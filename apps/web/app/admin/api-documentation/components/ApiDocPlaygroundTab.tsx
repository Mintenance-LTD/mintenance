'use client';

import React from 'react';
import { Terminal, ExternalLink } from 'lucide-react';

export function ApiDocPlaygroundTab() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <Terminal className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Playground</h2>
          <p className="text-gray-600">Test API endpoints interactively</p>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl text-center">
        <Terminal className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Interactive API Testing</h3>
        <p className="text-gray-600 mb-6">Test API endpoints directly from your browser</p>
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
          <ExternalLink className="w-5 h-5" />
          Open Playground
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h3>
        <ol className="space-y-3">
          {['Generate your API key from the dashboard', 'Select an endpoint to test', 'Configure request parameters', 'Click "Send Request" to test', 'View formatted response'].map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">{index + 1}</div>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
