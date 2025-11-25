'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface HeroAnimationProps {
    screenshot: string;
    alt: string;
}

export function HeroAnimation({ screenshot, alt }: HeroAnimationProps) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Calculate mouse position relative to window center (-1 to 1)
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePosition({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="relative perspective-1000 w-full h-full flex items-center justify-center py-12">
            {/* Main Dashboard Card - Tilted */}
            <motion.div
                initial={{ rotateX: 20, rotateY: -15, rotateZ: 5, scale: 0.9, opacity: 0 }}
                animate={{
                    rotateX: 20 + mousePosition.y * 5,
                    rotateY: -15 + mousePosition.x * 5,
                    rotateZ: 5,
                    scale: 1,
                    opacity: 1
                }}
                transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    rotateX: { type: "spring", stiffness: 50, damping: 20 },
                    rotateY: { type: "spring", stiffness: 50, damping: 20 }
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full max-w-4xl aspect-[16/10] bg-white rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden"
            >
                {/* Browser Chrome */}
                <div className="bg-gray-50 border-b border-gray-200 h-8 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                    <div className="ml-4 flex-1 bg-white h-5 rounded-md border border-gray-200 text-[10px] text-gray-400 flex items-center px-2">
                        mintenance.app
                    </div>
                </div>

                {/* Content Image */}
                <div className="relative w-full h-full bg-gray-50">
                    <Image
                        src={screenshot}
                        alt={alt}
                        fill
                        className="object-cover object-top"
                        priority
                        unoptimized
                    />
                </div>

                {/* Glass Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            </motion.div>

            {/* Floating Success Card 1 - Quote Received */}
            <motion.div
                initial={{ x: 100, y: 50, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
                className="absolute -right-4 top-1/4 bg-white p-4 rounded-xl shadow-xl border border-gray-100 z-20 max-w-[200px]"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-600 text-lg">£</span>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Quote Received</div>
                        <div className="text-sm font-bold text-gray-900">£150.00</div>
                    </div>
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 1, duration: 1.5 }}
                        className="h-full bg-emerald-500"
                    />
                </div>
            </motion.div>

            {/* Floating Success Card 2 - Job Completed */}
            <motion.div
                initial={{ x: -100, y: 50, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
                className="absolute -left-4 bottom-1/4 bg-white p-4 rounded-xl shadow-xl border border-gray-100 z-20 max-w-[200px]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Status Update</div>
                        <div className="text-sm font-bold text-gray-900">Job Completed</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
