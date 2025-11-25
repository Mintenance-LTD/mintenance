'use client';

import React, { useEffect, useState } from 'react';
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useSpring,
    useTransform,
} from 'framer-motion';
import {
    CheckCircle2,
    MessageSquare,
    CalendarClock,
    CreditCard,
    Sparkles,
    Star,
    MapPin,
} from 'lucide-react';

// ----------------- TYPES & STORY FLOW -----------------

type StoryPhase =
    | 'idle'
    | 'detecting'
    | 'matching'
    | 'quote_sent'
    | 'accepted'
    | 'scheduled'
    | 'complete';

const ANIMATION_CYCLE: { phase: StoryPhase; duration: number }[] = [
    { phase: 'idle', duration: 1500 },
    { phase: 'detecting', duration: 2000 },
    { phase: 'matching', duration: 2000 },
    { phase: 'quote_sent', duration: 2200 },
    { phase: 'accepted', duration: 1500 },
    { phase: 'scheduled', duration: 2000 },
    { phase: 'complete', duration: 2600 },
];

function useStoryCycle(): StoryPhase {
    const [index, setIndex] = useState(0);
    const phase = ANIMATION_CYCLE[index].phase;

    useEffect(() => {
        const t = setTimeout(
            () => setIndex(prev => (prev + 1) % ANIMATION_CYCLE.length),
            ANIMATION_CYCLE[index].duration,
        );
        return () => clearTimeout(t);
    }, [index]);

    return phase;
}

// ----------------- ROOT COMPONENT -----------------

export function HeroStoryAnimation() {
    const phase = useStoryCycle();
    const [isBlinking, setIsBlinking] = useState(false);

    // shared blink for both characters
    useEffect(() => {
        const id = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 160);
        }, 3800);
        return () => clearInterval(id);
    }, []);

    // Parallax
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 120, damping: 24 });
    const sy = useSpring(y, { stiffness: 120, damping: 24 });

    const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
    const rotateY = useTransform(sx, [-0.5, 0.5], [-8, 8]);

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    return (
        <motion.div
            onMouseMove={onMouseMove}
            onMouseLeave={() => {
                x.set(0);
                y.set(0);
            }}
            style={{ perspective: 1400 }}
            className="relative flex h-[520px] w-full items-center justify-center"
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                className="relative flex h-[420px] w-[720px] max-w-full items-center justify-center overflow-hidden rounded-[32px] border border-slate-800 bg-[#0f172a] shadow-[0_40px_120px_rgba(15,23,42,0.9)]"
            >
                <CyberEnvironment phase={phase} />

                {/* Characters with Skeletal Rigs */}
                <HomeownerCharacter phase={phase} isBlinking={isBlinking} />
                <ContractorCharacter phase={phase} isBlinking={isBlinking} />

                {/* Cinematic UI Overlay */}
                <ConnectionBeam phase={phase} />
                <StoryBubbles phase={phase} />

                {/* Celebration Overlay (Confetti/Flash) */}
                <AnimatePresence>
                    {phase === 'complete' && <CelebrationOverlay />}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

// ----------------- CINEMATIC ENVIRONMENT -----------------

function CyberEnvironment({ phase }: { phase: StoryPhase }) {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-3xl bg-[#0f172a]">
            {/* 3D Perspective Grid */}
            <div
                className="absolute inset-[-50%] opacity-20"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, #64748b 1px, transparent 1px),
                        linear-gradient(to bottom, #64748b 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) scale(1.5)',
                    transformOrigin: 'top center',
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                }}
            >
                <motion.div
                    className="absolute inset-0"
                    animate={{ y: [0, 60] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
            </div>

            {/* Volumetric Fog / God Rays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />

            {/* Dynamic Spotlights */}
            <motion.div
                className="absolute -top-[20%] left-[20%] h-[600px] w-[100px] rotate-[30deg] bg-blue-500/10 blur-[40px]"
                animate={{ opacity: ['detecting', 'accepted'].includes(phase) ? 0.6 : 0.2 }}
            />
            <motion.div
                className="absolute -top-[20%] right-[20%] h-[600px] w-[100px] rotate-[-30deg] bg-amber-500/10 blur-[40px]"
                animate={{ opacity: ['matching', 'scheduled'].includes(phase) ? 0.6 : 0.2 }}
            />

            {/* Floating Particles (Dust Motes) */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute h-1 w-1 rounded-full bg-white/20"
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: Math.random() * 100 + "%",
                            scale: Math.random() * 0.5 + 0.5
                        }}
                        animate={{
                            y: [null, Math.random() * -100],
                            opacity: [0, 0.5, 0]
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(15,23,42,0.8)_100%)]" />
        </div>
    );
}

// ----------------- SKELETAL HOMEOWNER -----------------

function HomeownerCharacter({
    phase,
    isBlinking,
}: {
    phase: StoryPhase;
    isBlinking: boolean;
}) {
    const isActive = ['detecting', 'quote_sent', 'accepted'].includes(phase);
    const isHappy = phase === 'accepted';

    return (
        <motion.div
            className="absolute bottom-10 left-[12%] flex flex-col items-center"
            style={{ translateZ: 50 } as any}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
        >
            {/* House Hologram Base */}
            <div className="absolute bottom-0 h-12 w-32 rounded-[100%] bg-blue-500/20 blur-xl" />

            <div className="relative h-64 w-40">
                <svg
                    viewBox="0 0 200 320"
                    className="h-full w-full drop-shadow-[0_20px_50px_rgba(59,130,246,0.4)]"
                >
                    <defs>
                        <linearGradient id="shirt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="skin-gradient" x1="20%" y1="0%" x2="80%" y2="100%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                            <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* --- SKELETAL RIG --- */}

                    {/* 1. TORSO (Root Bone) */}
                    <motion.g
                        animate={{
                            y: [0, -2, 0],
                            scaleY: [1, 1.01, 1]
                        }}
                        transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {/* Body Shape */}
                        <path
                            d="M 50,320 L 50,200 Q 40,160 80,150 Q 100,145 120,150 Q 160,160 150,200 L 150,320 Z"
                            fill="url(#shirt-gradient)"
                            filter="url(#soft-shadow)"
                        />
                        {/* Neck */}
                        <path d="M 88,110 L 88,155 Q 100,165 112,155 L 112,110" fill="url(#skin-gradient)" />

                        {/* 2. HEAD (Child of Torso) */}
                        <motion.g
                            initial={{ x: 100, y: 110 }}
                            animate={{
                                rotate: isHappy ? 5 : isActive ? -4 : 0,
                                y: 110 + (isActive ? -3 : 0),
                                x: 100 + (isActive ? 2 : 0)
                            }}
                            transition={{
                                rotate: { type: 'spring', stiffness: 100, damping: 15 },
                                y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                                x: { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                            }}
                        >
                            {/* Hair */}
                            <path d="M -50,-60 Q 0,-90 50,-60 Q 55,-20 40,0 Q 0,10 -40,0 Q -55,-20 -50,-60 Z" fill="#475569" />
                            {/* Face Shape */}
                            <path
                                d="M -45,-40 Q -50,10 -35,45 Q 0,75 35,45 Q 50,10 45,-40 Z"
                                fill="url(#skin-gradient)"
                                filter="url(#soft-shadow)"
                            />
                            {/* Ears */}
                            <path d="M -48,10 Q -55,0 -55,15 Q -55,30 -42,25" fill="url(#skin-gradient)" />
                            <path d="M 48,10 Q 55,0 55,15 Q 55,30 42,25" fill="url(#skin-gradient)" />

                            {/* Face Features */}
                            <motion.g animate={{ y: isActive ? -1 : 0 }}>
                                {/* Brows */}
                                <path d="M -25,-5 Q -15,-10 -5,-5" fill="none" stroke="#475569" strokeWidth={4} strokeLinecap="round" />
                                <path d="M 5,-5 Q 15,-10 25,-5" fill="none" stroke="#475569" strokeWidth={4} strokeLinecap="round" />

                                {/* Eyes */}
                                <g transform="translate(-15, 5)">
                                    <motion.ellipse
                                        cx={0} cy={0} rx={6}
                                        animate={{ ry: isBlinking ? 0.5 : 8 }}
                                        fill="white"
                                    />
                                    <motion.circle
                                        cx={0} cy={0} r={3} fill="#0f172a"
                                        animate={{ x: isActive ? 2 : [0, -2, 2, 0] }}
                                        transition={{ x: { duration: 5, repeat: Infinity, repeatDelay: 1 } }}
                                    />
                                </g>
                                <g transform="translate(15, 5)">
                                    <motion.ellipse
                                        cx={0} cy={0} rx={6}
                                        animate={{ ry: isBlinking ? 0.5 : 8 }}
                                        fill="white"
                                    />
                                    <motion.circle
                                        cx={0} cy={0} r={3} fill="#0f172a"
                                        animate={{ x: isActive ? 2 : [0, -2, 2, 0] }}
                                        transition={{ x: { duration: 5, repeat: Infinity, repeatDelay: 1 } }}
                                    />
                                </g>

                                {/* Nose */}
                                <path d="M -2,15 Q 0,25 5,22" fill="none" stroke="#475569" strokeWidth="2" opacity="0.5" />

                                {/* Mouth */}
                                <motion.path
                                    d={isHappy ? 'M -15,35 Q 0,50 15,35' : 'M -12,40 Q 0,45 12,40'}
                                    fill="none"
                                    stroke="#475569"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                />
                            </motion.g>
                        </motion.g>

                        {/* 3. RIGHT ARM (Holding Phone) */}
                        <motion.g
                            initial={{ rotate: 0, x: 140, y: 180 }}
                            animate={
                                ['detecting', 'quote_sent'].includes(phase)
                                    ? { rotate: -25, x: 130, y: 170 }
                                    : { rotate: 0, x: 140, y: 180 }
                            }
                            transition={{ type: 'spring', stiffness: 60, damping: 12 }}
                        >
                            {/* Upper Arm */}
                            <path
                                d="M 0,0 Q 20,40 10,80"
                                fill="none"
                                stroke="url(#shirt-gradient)"
                                strokeWidth={26}
                                strokeLinecap="round"
                            />
                            {/* Forearm (Child of Upper Arm) */}
                            <motion.g
                                initial={{ rotate: 0, x: 10, y: 80 }}
                                animate={
                                    ['detecting', 'quote_sent'].includes(phase)
                                        ? { rotate: -40, x: 10, y: 80 }
                                        : { rotate: 0, x: 10, y: 80 }
                                }
                            >
                                <path
                                    d="M 0,0 L 5,40"
                                    fill="none"
                                    stroke="url(#shirt-gradient)"
                                    strokeWidth={22}
                                    strokeLinecap="round"
                                />
                                {/* Hand */}
                                <circle cx={5} cy={45} r={14} fill="url(#skin-gradient)" />
                            </motion.g>
                        </motion.g>
                    </motion.g>
                </svg>

                {/* Phone UI (Floating) */}
                <motion.div
                    className="absolute bottom-20 -right-4 h-20 w-12 rounded-2xl border-[3px] border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
                    animate={
                        ['detecting', 'quote_sent'].includes(phase)
                            ? { rotate: -15, y: -20, x: -10, scale: 1 }
                            : { rotate: 0, y: 0, x: 0, scale: 0.8, opacity: 0 }
                    }
                >
                    <div className="absolute inset-0 bg-slate-950">
                        <div className="h-full w-full flex flex-col items-center justify-center gap-1">
                            {phase === 'detecting' && (
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                            animate={{ scale: [1, 1.5, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                        />
                                    ))}
                                </div>
                            )}
                            {phase === 'quote_sent' && (
                                <CreditCard className="h-6 w-6 text-blue-500" />
                            )}
                            {phase === 'accepted' && (
                                <CheckCircle2 className="h-6 w-6 text-blue-500" />
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="mt-4 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-md">
                Homeowner
            </div>
        </motion.div>
    );
}

// ----------------- SKELETAL CONTRACTOR -----------------

function ContractorCharacter({
    phase,
    isBlinking,
}: {
    phase: StoryPhase;
    isBlinking: boolean;
}) {
    const isActive = ['matching', 'scheduled', 'complete'].includes(phase);
    const isHappy = phase === 'complete';

    return (
        <motion.div
            className="absolute bottom-10 right-[12%] flex flex-col items-center"
            style={{ translateZ: 50 } as any}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
        >
            {/* Van Hologram Base */}
            <div className="absolute bottom-0 h-12 w-32 rounded-[100%] bg-amber-500/20 blur-xl" />

            <div className="relative h-64 w-40">
                <svg
                    viewBox="0 0 200 320"
                    className="h-full w-full drop-shadow-[0_20px_50px_rgba(245,158,11,0.4)]"
                >
                    <defs>
                        <linearGradient id="vest-complex" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="strip-complex" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                            <stop offset="100%" stopColor="#fffbeb" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id="skin-pro-complex" x1="20%" y1="0%" x2="80%" y2="100%">
                            <stop offset="0%" stopColor="#ffedd5" />
                            <stop offset="100%" stopColor="#fdba74" />
                        </linearGradient>
                        <linearGradient id="hardhat-complex" x1="30%" y1="0%" x2="70%" y2="100%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                            <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
                            <feMerge>
                                <feMergeNode in="offsetBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* --- SKELETAL RIG --- */}

                    {/* 1. TORSO (Root Bone) */}
                    <motion.g
                        animate={{
                            y: [0, -2, 0],
                            scaleY: [1, 1.01, 1]
                        }}
                        transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {/* Body Shape */}
                        <path
                            d="M 50,320 L 50,200 Q 40,160 80,150 Q 100,145 120,150 Q 160,160 150,200 L 150,320 Z"
                            fill="url(#vest-complex)"
                            filter="url(#soft-shadow)"
                        />
                        {/* Reflective Strips */}
                        <path d="M 55,210 Q 100,225 145,210 L 146,225 Q 100,240 54,225 Z" fill="url(#strip-complex)" filter="url(#soft-glow)" />
                        <path d="M 52,260 Q 100,275 148,260 L 149,275 Q 100,290 51,275 Z" fill="url(#strip-complex)" filter="url(#soft-glow)" />

                        {/* Utility Belt */}
                        <path d="M 48,300 Q 100,315 152,300" fill="none" stroke="#78350f" strokeWidth="12" strokeLinecap="round" />
                        <g transform="translate(70, 300) rotate(15)">
                            <rect x="0" y="0" width="10" height="25" rx="2" fill="#92400e" />
                            <circle cx="5" cy="25" r="3" fill="#cbd5e1" />
                        </g>
                        <g transform="translate(110, 300) rotate(-10)">
                            <rect x="0" y="0" width="8" height="20" rx="1" fill="#ef4444" />
                            <rect x="2" y="20" width="4" height="10" fill="#cbd5e1" />
                        </g>

                        {/* Neck */}
                        <path d="M 88,110 L 88,155 Q 100,165 112,155 L 112,110" fill="url(#skin-pro-complex)" />

                        {/* 2. HEAD (Child of Torso) */}
                        <motion.g
                            initial={{ x: 100, y: 110 }}
                            animate={{
                                rotate: isHappy ? -5 : isActive ? 4 : 0,
                                y: 110 + (isActive ? -3 : 0),
                                x: 100 + (isActive ? -2 : 0)
                            }}
                            transition={{
                                rotate: { type: 'spring', stiffness: 100, damping: 15 },
                                y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                                x: { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                            }}
                        >
                            {/* Face Shape */}
                            <path
                                d="M -45,-40 Q -50,10 -35,45 Q 0,75 35,45 Q 50,10 45,-40 Z"
                                fill="url(#skin-pro-complex)"
                                filter="url(#soft-shadow)"
                            />
                            {/* Ears */}
                            <path d="M -48,10 Q -55,0 -55,15 Q -55,30 -42,25" fill="url(#skin-pro-complex)" />
                            <path d="M 48,10 Q 55,0 55,15 Q 55,30 42,25" fill="url(#skin-pro-complex)" />

                            {/* Hard Hat */}
                            <g transform="translate(0, -50)">
                                <path d="M -55,10 Q 0,-40 55,10" fill="url(#hardhat-complex)" stroke="#b45309" strokeWidth="1" />
                                <path d="M -60,10 L 60,10 Q 60,25 0,25 Q -60,25 -60,10 Z" fill="#f59e0b" />
                                <ellipse cx={0} cy={10} rx={55} ry={35} fill="url(#hardhat-complex)" />
                                <ellipse cx={-20} cy={0} rx={15} ry={8} fill="white" opacity="0.3" transform="rotate(-20)" />
                            </g>

                            {/* Face Features */}
                            <motion.g animate={{ y: isActive ? -1 : 0 }}>
                                {/* Brows */}
                                <path d="M -25,-5 Q -15,-10 -5,-5" fill="none" stroke="#78350f" strokeWidth={4} strokeLinecap="round" />
                                <path d="M 5,-5 Q 15,-10 25,-5" fill="none" stroke="#78350f" strokeWidth={4} strokeLinecap="round" />

                                {/* Eyes */}
                                <g transform="translate(-15, 5)">
                                    <motion.ellipse
                                        cx={0} cy={0} rx={6}
                                        animate={{ ry: isBlinking ? 0.5 : 8 }}
                                        fill="white"
                                    />
                                    <motion.circle
                                        cx={0} cy={0} r={3} fill="#0f172a"
                                        animate={{ x: isActive ? -2 : [0, 2, -2, 0] }}
                                        transition={{ x: { duration: 5, repeat: Infinity, repeatDelay: 1 } }}
                                    />
                                </g>
                                <g transform="translate(15, 5)">
                                    <motion.ellipse
                                        cx={0} cy={0} rx={6}
                                        animate={{ ry: isBlinking ? 0.5 : 8 }}
                                        fill="white"
                                    />
                                    <motion.circle
                                        cx={0} cy={0} r={3} fill="#0f172a"
                                        animate={{ x: isActive ? -2 : [0, 2, -2, 0] }}
                                        transition={{ x: { duration: 5, repeat: Infinity, repeatDelay: 1 } }}
                                    />
                                </g>

                                {/* Nose & Beard */}
                                <path d="M -2,15 Q 0,25 5,22" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.5" />
                                <path d="M -45,0 Q -45,50 0,50 Q 45,50 45,0 L 45,10 Q 35,55 0,55 Q -35,55 -45,10 Z" fill="#78350f" opacity="0.1" />

                                {/* Mouth */}
                                <motion.path
                                    d={isHappy ? 'M -15,35 Q 0,50 15,35' : 'M -12,40 Q 0,45 12,40'}
                                    fill="none"
                                    stroke="#78350f"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                />
                            </motion.g>
                        </motion.g>

                        {/* 3. LEFT ARM (Holding Phone) */}
                        <motion.g
                            initial={{ rotate: 0, x: 60, y: 180 }}
                            animate={
                                ['matching', 'scheduled'].includes(phase)
                                    ? { rotate: 25, x: 70, y: 170 }
                                    : { rotate: 0, x: 60, y: 180 }
                            }
                            transition={{ type: 'spring', stiffness: 60, damping: 12 }}
                        >
                            {/* Upper Arm */}
                            <path
                                d="M 0,0 Q -20,40 -10,80"
                                fill="none"
                                stroke="url(#vest-complex)"
                                strokeWidth={26}
                                strokeLinecap="round"
                            />
                            {/* Forearm (Child of Upper Arm) */}
                            <motion.g
                                initial={{ rotate: 0, x: -10, y: 80 }}
                                animate={
                                    ['matching', 'scheduled'].includes(phase)
                                        ? { rotate: 40, x: -10, y: 80 }
                                        : { rotate: 0, x: -10, y: 80 }
                                }
                            >
                                <path
                                    d="M 0,0 L -5,40"
                                    fill="none"
                                    stroke="url(#vest-complex)"
                                    strokeWidth={22}
                                    strokeLinecap="round"
                                />
                                {/* Hand */}
                                <circle cx={-5} cy={45} r={14} fill="url(#skin-pro-complex)" />
                            </motion.g>
                        </motion.g>
                    </motion.g>
                </svg>

                {/* Phone UI (Floating) */}
                <motion.div
                    className="absolute bottom-20 -left-4 h-20 w-12 rounded-2xl border-[3px] border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
                    animate={
                        ['matching', 'scheduled'].includes(phase)
                            ? { rotate: 15, y: -20, x: 10, scale: 1 }
                            : { rotate: 0, y: 0, x: 0, scale: 0.8, opacity: 0 }
                    }
                >
                    <div className="absolute inset-0 bg-slate-950">
                        <div className="h-full w-full flex flex-col items-center justify-center gap-1">
                            {phase === 'matching' && (
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="h-1.5 w-1.5 rounded-full bg-amber-500"
                                            animate={{ scale: [1, 1.5, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                        />
                                    ))}
                                </div>
                            )}
                            {['scheduled', 'complete'].includes(phase) && (
                                <CheckCircle2 className="h-6 w-6 text-amber-500" />
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="mt-4 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1 text-[11px] font-semibold text-slate-100">
                Pro Contractor
            </div>
        </motion.div>
    );
}

// ----------------- STORY BUBBLES -----------------

function StoryBubbles({ phase }: { phase: StoryPhase }) {
    return (
        <AnimatePresence mode="wait">
            {phase === 'detecting' && (
                <motion.div
                    key="detecting"
                    className="absolute left-1/2 top-[24%] z-30 -translate-x-1/2"
                    style={{ translateZ: 60 } as any}
                    initial={{ opacity: 0, y: 16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                >
                    <div className="flex min-w-[230px] items-center gap-3 rounded-2xl border border-emerald-400/40 bg-slate-950/90 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                                Instant AI defect scan
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-300">
                                <MapPin className="h-3 w-3" />
                                <span>Home in Manchester</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {phase === 'quote_sent' && (
                <motion.div
                    key="quote"
                    className="absolute left-[54%] top-[44%] z-30"
                    style={{ translateZ: 60 } as any}
                    initial={{ opacity: 0, y: 16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                >
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-500/10 px-4 py-2.5 shadow-[0_16px_40px_rgba(16,185,129,0.5)] backdrop-blur-xl">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                            <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                                Quote sent
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-50">
                                £120 • Leaky tap fix
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {phase === 'accepted' && (
                <motion.div
                    key="accepted"
                    className="absolute left-[26%] top-[44%] z-30"
                    style={{ translateZ: 70 } as any}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                >
                    <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.6)]">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Homeowner accepted</span>
                    </div>
                </motion.div>
            )}

            {phase === 'scheduled' && (
                <motion.div
                    key="scheduled"
                    className="absolute right-[20%] top-[30%] z-30"
                    style={{ translateZ: 60 } as any}
                    initial={{ opacity: 0, y: 16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                >
                    <div className="flex items-center gap-3 rounded-2xl border border-blue-500/60 bg-slate-950/90 px-4 py-2.5 shadow-[0_16px_40px_rgba(37,99,235,0.7)] backdrop-blur-xl">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white">
                            <CalendarClock className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">
                                Visit booked
                            </div>
                            <div className="text-[11px] font-semibold text-slate-50">
                                Tue • 10:00 AM
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ----------------- CONNECTION BEAM -----------------

function ConnectionBeam({ phase }: { phase: StoryPhase }) {
    const active = phase !== 'idle' && phase !== 'complete';

    return (
        <div className="pointer-events-none absolute inset-x-24 top-[40%] z-10 h-20">
            <svg className="h-full w-full">
                <defs>
                    <linearGradient id="mintenance-beam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                        <stop offset="40%" stopColor="#22c55e" stopOpacity="0.8" />
                        <stop offset="60%" stopColor="#22c55e" stopOpacity="1" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <motion.path
                    d="M 60,60 Q 240,10 420,60"
                    fill="none"
                    stroke="url(#mintenance-beam)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="10 10"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                        pathLength: active ? 1 : 0,
                        opacity: active ? 0.7 : 0,
                        strokeDashoffset: [0, -20],
                        strokeWidth: active ? [3, 4, 3] : 3,
                    }}
                    transition={{
                        pathLength: { duration: 1 },
                        strokeDashoffset: { duration: 0.7, repeat: Infinity, ease: 'linear' },
                        strokeWidth: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                />
            </svg>

            <AnimatePresence>
                {phase === 'matching' && (
                    <motion.div
                        key="msg"
                        className="absolute left-[60px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg"
                        initial={{ x: 0, opacity: 0 }}
                        animate={{ x: 360, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.4, ease: 'easeInOut' }}
                    >
                        <MessageSquare className="h-4 w-4" />
                    </motion.div>
                )}

                {phase === 'quote_sent' && (
                    <motion.div
                        key="pay"
                        className="absolute left-[60px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg"
                        initial={{ x: 360, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.4, ease: 'easeInOut' }}
                    >
                        <CreditCard className="h-4 w-4" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ----------------- CELEBRATION -----------------

function CelebrationOverlay() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
        >
            <div className="flex flex-col items-center rounded-2xl border border-emerald-300/60 bg-slate-950/95 px-6 py-5 text-center shadow-[0_24px_60px_rgba(16,185,129,0.6)] backdrop-blur-xl">
                <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-100">
                    Job complete • Rated 5 stars
                </p>
                <div className="mt-2 flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className="h-4 w-4 fill-yellow-300 text-yellow-300"
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
