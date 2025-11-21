'use client';

import { Star, Shield, Users, CheckCircle } from 'lucide-react';

export function TrustIndicators() {
    return (
        <div className="bg-gradient-to-r from-slate-50 to-emerald-50 py-8 px-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Rating */}
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <div className="text-2xl font-bold text-[#0F172A]">4.8/5</div>
                        <div className="text-sm text-gray-600">from 2,500+ reviews</div>
                    </div>

                    {/* Users */}
                    <div className="flex flex-col items-center text-center">
                        <Users className="w-10 h-10 text-[#10B981] mb-2" />
                        <div className="text-2xl font-bold text-[#0F172A]">10,000+</div>
                        <div className="text-sm text-gray-600">Happy homeowners</div>
                    </div>

                    {/* Verified */}
                    <div className="flex flex-col items-center text-center">
                        <Shield className="w-10 h-10 text-[#0F172A] mb-2" />
                        <div className="text-2xl font-bold text-[#0F172A]">100%</div>
                        <div className="text-sm text-gray-600">Verified contractors</div>
                    </div>

                    {/* Projects */}
                    <div className="flex flex-col items-center text-center">
                        <CheckCircle className="w-10 h-10 text-[#10B981] mb-2" />
                        <div className="text-2xl font-bold text-[#0F172A]">50,000+</div>
                        <div className="text-sm text-gray-600">Projects completed</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
