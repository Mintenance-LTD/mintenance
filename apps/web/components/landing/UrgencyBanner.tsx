'use client';

import { useState, useEffect } from 'react';
import { Flame, Clock, X } from 'lucide-react';

export function UrgencyBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [timeLeft, setTimeLeft] = useState({
        hours: 23,
        minutes: 45,
        seconds: 30,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                let { hours, minutes, seconds } = prev;

                seconds--;
                if (seconds < 0) {
                    seconds = 59;
                    minutes--;
                }
                if (minutes < 0) {
                    minutes = 59;
                    hours--;
                }
                if (hours < 0) {
                    hours = 23;
                    minutes = 59;
                    seconds = 59;
                }

                return { hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white py-3 px-4 relative overflow-hidden border-b-2 border-[#10B981]">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {/* Icon */}
                    <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-[#F59E0B] animate-pulse" />
                        <span className="font-bold text-lg">Limited Time Offer!</span>
                    </div>

                    {/* Message */}
                    <div className="flex items-center gap-2 text-sm md:text-base">
                        <span>Get <strong className="text-[#10B981]">10% cashback</strong> on your first project</span>
                        <span className="hidden md:inline">•</span>
                        <span className="hidden md:inline">Offer ends in:</span>
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                        <Clock className="w-4 h-4 text-[#F59E0B]" />
                        <div className="flex items-center gap-1 font-mono font-bold">
                            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                            <span className="animate-pulse">:</span>
                            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                            <span className="animate-pulse">:</span>
                            <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => window.location.href = '/register?promo=FIRST10'}
                        className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors shadow-lg"
                    >
                        Claim Offer →
                    </button>
                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-1/2 right-4 transform -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close banner"
            >
                <X className="w-5 h-5" />
            </button>

            <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
        </div>
    );
}
