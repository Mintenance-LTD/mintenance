'use client';

import { useState } from 'react';
import { Calculator, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

const PROJECT_TYPES = [
    { value: 'plumbing', label: 'Plumbing', avgCost: '£150-500' },
    { value: 'electrical', label: 'Electrical', avgCost: '£200-600' },
    { value: 'painting', label: 'Painting & Decorating', avgCost: '£300-1000' },
    { value: 'roofing', label: 'Roofing', avgCost: '£500-2000' },
    { value: 'bathroom', label: 'Bathroom Renovation', avgCost: '£2000-8000' },
    { value: 'kitchen', label: 'Kitchen Renovation', avgCost: '£3000-15000' },
];

export function QuickQuoteWidget() {
    const [projectType, setProjectType] = useState('');
    const [postcode, setPostcode] = useState('');
    const [showEstimate, setShowEstimate] = useState(false);

    const selectedProject = PROJECT_TYPES.find(p => p.value === projectType);

    const handleGetQuote = () => {
        if (projectType && postcode) {
            setShowEstimate(true);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary-900 rounded-xl">
                    <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-primary-900">Get Instant Estimate</h3>
                    <p className="text-gray-600">Free, no obligation quote in 60 seconds</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Project Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        What do you need help with?
                    </label>
                    <select
                        value={projectType}
                        onChange={(e) => {
                            setProjectType(e.target.value);
                            setShowEstimate(false);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all"
                    >
                        <option value="">Select a service...</option>
                        {PROJECT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Postcode */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your postcode
                    </label>
                    <input
                        type="text"
                        value={postcode}
                        onChange={(e) => {
                            setPostcode(e.target.value.toUpperCase());
                            setShowEstimate(false);
                        }}
                        placeholder="e.g. SW1A 1AA"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Get Quote Button */}
                <Button
                    onClick={handleGetQuote}
                    disabled={!projectType || !postcode}
                    className="w-full bg-secondary-500 hover:bg-secondary-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                >
                    Get My Free Quote
                    <ArrowRight className="w-5 h-5" />
                </Button>

                {/* Estimate Display */}
                {showEstimate && selectedProject && (
                    <div className="mt-6 p-6 bg-gradient-to-br from-slate-50 to-emerald-50 rounded-xl border-2 border-emerald-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-start gap-3 mb-4">
                            <Sparkles className="w-6 h-6 text-secondary-500 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-lg text-primary-900 mb-1">
                                    Estimated Cost Range
                                </h4>
                                <p className="text-3xl font-bold text-secondary-500">
                                    {selectedProject.avgCost}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckIcon />
                                <span>3-5 verified contractors available in {postcode}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckIcon />
                                <span>Average response time: 2 hours</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckIcon />
                                <span>Get detailed quotes within 24 hours</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => {
                                // Navigate to registration with pre-filled data
                                window.location.href = `/register?role=homeowner&project=${projectType}&postcode=${postcode}`;
                            }}
                            className="w-full bg-primary-900 hover:bg-primary-800 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            Get Matched with Contractors
                        </Button>
                    </div>
                )}

                {/* Trust Badge */}
                <div className="text-center text-sm text-gray-600 pt-2">
                    🔒 Your information is secure • No spam, ever
                </div>
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}
