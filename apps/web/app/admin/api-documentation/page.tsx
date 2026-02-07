'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Code, Server, Activity, Globe, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { endpoints, categories, languages, fadeIn } from './components/ApiDocData';
import { ApiDocEndpointsList } from './components/ApiDocEndpointsList';
import { ApiDocAuthTab } from './components/ApiDocAuthTab';
import { ApiDocWebhooksTab } from './components/ApiDocWebhooksTab';
import { ApiDocPlaygroundTab } from './components/ApiDocPlaygroundTab';
import { ApiDocResources } from './components/ApiDocResources';

export default function APIDocumentationPage2025() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'authentication' | 'webhooks' | 'playground'>('endpoints');

  const filteredEndpoints = endpoints.filter(
    (endpoint) => selectedCategory === 'All' || endpoint.category === selectedCategory
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-16 px-6">
        <MotionDiv className="max-w-7xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Code className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2">API Documentation</h1>
              <p className="text-xl text-purple-100">Integrate Mintenance into your applications</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10">
            {[
              { label: 'API Version', value: 'v1.0', icon: Server },
              { label: 'Uptime', value: '99.9%', icon: Activity },
              { label: 'Endpoints', value: '50+', icon: Globe },
              { label: 'Rate Limit', value: '1000/hr', icon: Zap },
            ].map((stat, index) => (
              <MotionDiv key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-5 h-5 text-purple-200" />
                  <span className="text-sm text-purple-200">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
          {(['endpoints', 'authentication', 'webhooks', 'playground'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === tab ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'endpoints' && (
            <MotionDiv key="endpoints" variants={fadeIn} initial="initial" animate="animate" exit="exit" className="space-y-6">
              {/* Category Filter */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700">Categories:</span>
                  {categories.map((category) => (
                    <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selector */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Code Examples:</span>
                  {languages.map((lang) => (
                    <button key={lang.id} onClick={() => setSelectedLanguage(lang.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedLanguage === lang.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      <lang.icon className="w-4 h-4" /> {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <ApiDocEndpointsList
                filteredEndpoints={filteredEndpoints}
                expandedEndpoint={expandedEndpoint}
                copiedCode={copiedCode}
                onToggleExpand={(id) => setExpandedEndpoint(expandedEndpoint === id ? null : id)}
                onCopyCode={copyToClipboard}
              />
            </MotionDiv>
          )}

          {activeTab === 'authentication' && (
            <MotionDiv key="authentication" variants={fadeIn} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <ApiDocAuthTab />
            </MotionDiv>
          )}

          {activeTab === 'webhooks' && (
            <MotionDiv key="webhooks" variants={fadeIn} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <ApiDocWebhooksTab />
            </MotionDiv>
          )}

          {activeTab === 'playground' && (
            <MotionDiv key="playground" variants={fadeIn} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <ApiDocPlaygroundTab />
            </MotionDiv>
          )}
        </AnimatePresence>

        <ApiDocResources />
      </div>
    </div>
  );
}
