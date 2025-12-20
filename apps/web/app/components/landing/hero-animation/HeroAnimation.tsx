'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { HomeownerCharacter } from './HomeownerCharacter';
import { ContractorCharacter } from './ContractorCharacter';
import { ConnectionLine } from './ConnectionLine';
import { HomeownerPhone } from './HomeownerPhone';
import { ContractorPhone } from './ContractorPhone';
import { StoryBubbles } from './StoryBubbles';

interface HeroAnimationProps {
  className?: string;
}

export function HeroAnimation({ className = '' }: HeroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 50, damping: 20 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), springConfig);

  useEffect(() => {
    // Skip parallax effect if user prefers reduced motion
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, prefersReducedMotion]);

  // Static render for reduced motion preference
  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full min-h-[520px] flex items-center justify-center ${className}`}
      >
        {/* Background ambient glow - static */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px]" />
        </div>

        {/* Main card - static, no 3D effects */}
        <div className="relative w-full max-w-2xl aspect-[3/2] rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/50 shadow-2xl shadow-black/40 overflow-visible">
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, white 1px, transparent 1px),
                linear-gradient(to bottom, white 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px'
            }}
          />

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-emerald-500/30 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-emerald-500/30 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-emerald-500/30 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-emerald-500/30 rounded-br-lg" />

          {/* Characters */}
          <div className="relative h-full flex items-center justify-center gap-20 px-12 pt-14">
            <HomeownerCharacter />
            <ConnectionLine />
            <ContractorCharacter />
          </div>

          {/* Phone mockups */}
          <HomeownerPhone />
          <ContractorPhone />

          {/* Story bubbles showing job flow */}
          <StoryBubbles />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[520px] flex items-center justify-center ${className}`}
      style={{ perspective: '1000px' }}
    >
      {/* Background ambient glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px]" />
      </motion.div>

      {/* Main 3D card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        className="relative w-full max-w-2xl aspect-[3/2] rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/50 shadow-2xl shadow-black/40 overflow-visible"
      >
        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Corner decorations */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-emerald-500/30 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-emerald-500/30 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-emerald-500/30 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-emerald-500/30 rounded-br-lg" />

        {/* Characters */}
        <div className="relative h-full flex items-center justify-center gap-20 px-12 pt-14">
          <HomeownerCharacter />
          <ConnectionLine />
          <ContractorCharacter />
        </div>

        {/* Phone mockups */}
        <HomeownerPhone />
        <ContractorPhone />

        {/* Story bubbles showing job flow */}
        <StoryBubbles />
      </motion.div>
    </div>
  );
}
