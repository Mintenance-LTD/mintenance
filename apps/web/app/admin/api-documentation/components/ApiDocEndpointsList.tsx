'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Lock, Zap, Database, Copy, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { Endpoint } from './ApiDocData';
import { fadeIn, staggerContainer, getMethodColor } from './ApiDocData';

interface Props {
  filteredEndpoints: Endpoint[];
  expandedEndpoint: string | null;
  copiedCode: string | null;
  onToggleExpand: (id: string) => void;
  onCopyCode: (text: string, id: string) => void;
}

export function ApiDocEndpointsList({ filteredEndpoints, expandedEndpoint, copiedCode, onToggleExpand, onCopyCode }: Props) {
  return (
    <MotionDiv variants={staggerContainer} className="space-y-4">
      {filteredEndpoints.map((endpoint) => (
        <MotionDiv key={endpoint.id} variants={fadeIn} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => onToggleExpand(endpoint.id)} className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4 flex-1">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getMethodColor(endpoint.method)}`}>{endpoint.method}</span>
              <div className="text-left flex-1">
                <code className="text-sm font-mono text-gray-900">{endpoint.path}</code>
                <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
              </div>
            </div>
            {expandedEndpoint === endpoint.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {expandedEndpoint === endpoint.id && (
              <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="border-t border-gray-200">
                <div className="p-6 space-y-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-purple-600" /><span className="text-xs font-semibold text-gray-500 uppercase">Authentication</span></div><p className="text-sm font-medium text-gray-900">{endpoint.authentication}</p></div>
                    <div><div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-purple-600" /><span className="text-xs font-semibold text-gray-500 uppercase">Rate Limit</span></div><p className="text-sm font-medium text-gray-900">{endpoint.rateLimit}</p></div>
                    <div><div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-purple-600" /><span className="text-xs font-semibold text-gray-500 uppercase">Category</span></div><p className="text-sm font-medium text-gray-900">{endpoint.category}</p></div>
                  </div>
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Parameters</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Required</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {endpoint.parameters.map((param, idx) => (
                              <tr key={param.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 text-sm font-mono text-purple-600">{param.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{param.type}</td>
                                <td className="px-4 py-2 text-sm">{param.required ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">Required</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Optional</span>}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {endpoint.requestExample && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Request Example</h4>
                        <button onClick={() => onCopyCode(endpoint.requestExample!, `${endpoint.id}-request`)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                          {copiedCode === `${endpoint.id}-request` ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"><code>{endpoint.requestExample}</code></pre>
                    </div>
                  )}

                  {endpoint.responseExample && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Response Example</h4>
                        <button onClick={() => onCopyCode(endpoint.responseExample!, `${endpoint.id}-response`)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                          {copiedCode === `${endpoint.id}-response` ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"><code>{endpoint.responseExample}</code></pre>
                    </div>
                  )}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </MotionDiv>
      ))}
    </MotionDiv>
  );
}
