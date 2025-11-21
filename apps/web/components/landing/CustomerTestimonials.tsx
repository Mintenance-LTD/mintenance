'use client';

import { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';

// Fallback testimonials if no real data is available
const FALLBACK_TESTIMONIALS = [
    {
        id: 1,
        name: 'Sarah Johnson',
        location: 'London',
        role: 'Homeowner',
        rating: 5,
        text: 'Found the perfect plumber within minutes. The work was completed on time and exceeded expectations.',
        project: 'Plumbing Repair',
        savings: '£450',
        avatar: '👩‍💼',
        verified: true,
    },
    {
        id: 2,
        name: 'Mike Chen',
        location: 'Manchester',
        role: 'Homeowner',
        rating: 5,
        text: 'Great platform for finding reliable contractors. The escrow payment system gives me peace of mind.',
        project: 'Electrical Work',
        savings: '£320',
        avatar: '👨‍💻',
        verified: true,
    },
    {
        id: 3,
        name: 'Emma Wilson',
        location: 'Birmingham',
        role: 'Homeowner',
        rating: 5,
        text: 'Excellent service from start to finish. Will definitely use Mintenance again.',
        project: 'Bathroom Renovation',
        savings: '£1,200',
        avatar: '👩‍🎨',
        verified: true,
    },
];

interface Testimonial {
    id: string | number;
    name: string;
    location: string;
    role: string;
    rating: number;
    text: string;
    project: string;
    savings: string;
    avatar: string;
    verified?: boolean;
}

export function CustomerTestimonials() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTestimonials() {
            try {
                const response = await fetch('/api/testimonials');
                if (!response.ok) {
                    throw new Error('Failed to fetch testimonials');
                }
                
                const data = await response.json();
                
                // Use real testimonials if available, otherwise keep fallback
                if (data.testimonials && data.testimonials.length > 0) {
                    setTestimonials(data.testimonials);
                }
            } catch (error) {
                console.error('Error fetching testimonials:', error);
                // Keep fallback testimonials on error
            } finally {
                setIsLoading(false);
            }
        }

        fetchTestimonials();
    }, []);

    return (
        <div className="py-16 bg-gradient-to-b from-white to-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-[#0F172A] mb-4">
                        Loved by Homeowners Across the UK
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Join thousands of happy homeowners who found their perfect contractor
                    </p>
                </div>

                {/* Testimonials Grid */}
                {isLoading ? (
                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.slice(0, 3).map((testimonial) => (
                            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                        ))}
                    </div>
                )}

                {/* Stats Bar */}
                <div className="mt-12 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-[#10B981]">98%</div>
                        <div className="text-sm text-gray-600">Satisfaction Rate</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-[#10B981]">£850</div>
                        <div className="text-sm text-gray-600">Average Savings</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-[#10B981]">24hrs</div>
                        <div className="text-sm text-gray-600">Average Match Time</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 relative group">
            {/* Quote Icon */}
            <div className="absolute -top-4 -left-4 bg-[#0F172A] rounded-full p-3 shadow-lg">
                <Quote className="w-6 h-6 text-white" />
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-4 mt-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
            </div>

            {/* Testimonial Text */}
            <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.text}"
            </p>

            {/* Project Info */}
            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{testimonial.project}</span>
                    <span className="text-sm font-bold text-[#10B981]">Saved {testimonial.savings}</span>
                </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="text-4xl">{testimonial.avatar}</div>
                <div>
                    <div className="font-semibold text-[#0F172A]">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.location}</div>
                </div>
            </div>

            {/* Verified Badge */}
            {testimonial.verified !== false && (
                <div className="absolute top-4 right-4 bg-emerald-100 text-[#10B981] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                </div>
            )}
        </div>
    );
}
