'use client';

import { useState, useEffect } from 'react';
import {
  Camera,
  Sparkles,
  Users,
  CheckCircle2,
  Shield,
  Zap,
  TrendingUp,
  BrainCircuit,
  Star,
  ThumbsUp,
  Award,
  Clock,
  MapPin,
  Hammer,
  Wrench,
  Paintbrush,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Image from 'next/image';

export interface HeroCardProps {
  activeContractors?: number | null;
  hasRealStats?: boolean;
  /** Design variant to display - choose the one that tested best */
  variant?: 'contractor-hero' | 'before-after' | 'illustrated' | 'photo-collage';
}

/**
 * HeroCard - Visually striking hero showcase with 4 design variants
 *
 * DESIGN OPTIONS:
 * 1. 'contractor-hero' - Professional contractor with mint fresh smile and thumbs up
 * 2. 'before-after' - Dramatic property transformation split-screen
 * 3. 'illustrated' - Modern flat-design contractor character with animations
 * 4. 'photo-collage' - Dynamic montage of diverse contractors in action
 *
 * All variants prioritize:
 * - Visual interest > abstract concepts
 * - Human connection > icons
 * - Story-telling > feature lists
 * - Professional + approachable tone
 */
export function HeroCard({
  activeContractors = null,
  hasRealStats = false,
  variant = 'contractor-hero',
}: HeroCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prosLabel =
    hasRealStats && activeContractors != null
      ? `${Number(activeContractors).toLocaleString()}+ verified pros`
      : 'Verified pros';

  // SSR Loading State
  if (!mounted) {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl bg-slate-900/40 border border-white/10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-slate-900/30 rounded-2xl" />
        <div className="w-28 h-28 rounded-full bg-slate-800/60 animate-pulse" />
      </div>
    );
  }

  // VARIANT 1: Professional Contractor Hero
  if (variant === 'contractor-hero') {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl overflow-hidden group shadow-2xl">
        {/* Hero Image Container - Top 350px */}
        <div className="relative h-[350px] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
          {/* Contractor Image with Overlay */}
          <div className="absolute inset-0">
            {/* Placeholder for professional contractor photo */}
            <div className="relative w-full h-full bg-gradient-to-br from-teal-600/90 to-emerald-700/90">
              {/* Using a placeholder service - replace with actual image */}
              <Image
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=350&fit=crop&crop=faces"
                alt="Professional contractor with mint fresh smile"
                fill
                className="object-cover object-top opacity-90"
                priority
              />
            </div>

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          </div>

          {/* Floating Badge - Top Right */}
          <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-xl border border-teal-100">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-semibold text-slate-600">Verified Pro</span>
          </div>

          {/* Mint Fresh Badge - Top Left */}
          <div
            className={`absolute top-6 left-6 px-4 py-2 bg-teal-500/90 backdrop-blur-sm rounded-full shadow-lg border border-teal-300/50 ${
              !prefersReducedMotion ? 'animate-pulse' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Mint Fresh</span>
            </div>
          </div>

          {/* Thumbs Up Indicator - Bottom Left of Image */}
          <div className="absolute bottom-6 left-6 flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center">
              <ThumbsUp className="w-8 h-8 text-teal-600 fill-teal-600" />
            </div>
            <div className="text-white drop-shadow-lg">
              <div className="text-xs font-medium opacity-90">Available Now</div>
              <div className="text-lg font-bold">Ready to Help</div>
            </div>
          </div>

          {/* Live Indicator - Bottom Right of Image */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400" />
            </span>
            <span className="text-xs font-semibold text-white">Online</span>
          </div>
        </div>

        {/* Content Area - Bottom 250px */}
        <div className="relative h-[250px] bg-slate-900 border-t border-slate-800">
          {/* Subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/10 via-transparent to-slate-900/50" />

          <div className="relative z-10 h-full flex flex-col justify-between p-6">
            {/* Headline */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white leading-tight">
                Meet Your Perfect Contractor in{' '}
                <span className="text-teal-400">60 Seconds</span>
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload photos, get AI-powered matches, swipe to hire verified professionals.
                Background-checked, insured, and ready to transform your property.
              </p>
            </div>

            {/* Features Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Vetted</span>
                </div>
                <div className="text-xs text-slate-400">Background Checked</div>
              </div>
              <div className="text-center border-x border-slate-800">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-bold text-white">Fast</span>
                </div>
                <div className="text-xs text-slate-400">Quick Matching</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Secure</span>
                </div>
                <div className="text-xs text-slate-400">Payment Protection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient glow */}
        <div
          className={`absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl -z-10 ${
            !prefersReducedMotion ? 'group-hover:opacity-75 transition-opacity duration-700' : 'opacity-50'
          }`}
        />
      </div>
    );
  }

  // VARIANT 2: Before/After Transformation
  if (variant === 'before-after') {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl overflow-hidden group shadow-2xl bg-slate-900">
        {/* Split Screen Container - Top 350px */}
        <div className="relative h-[350px] grid grid-cols-2 gap-0">
          {/* BEFORE - Left Side */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800">
              <Image
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=350&fit=crop"
                alt="Property damage before repair"
                fill
                className="object-cover opacity-80 grayscale"
                priority
              />
            </div>
            {/* Before Label */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-600">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Before</span>
            </div>
            {/* Damage indicators */}
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-xs font-medium">Cracked walls</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-xs font-medium">Water damage</span>
              </div>
            </div>
          </div>

          {/* AFTER - Right Side */}
          <div className="relative overflow-hidden border-l-2 border-teal-400">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-emerald-700">
              <Image
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&h=350&fit=crop"
                alt="Property after professional repair - mint fresh"
                fill
                className="object-cover opacity-90"
                priority
              />
            </div>
            {/* After Label */}
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-teal-500/90 backdrop-blur-sm rounded-lg border border-teal-300 shadow-lg">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Mint Fresh</span>
            </div>
            {/* Success indicators */}
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              <div className="flex items-center gap-2 text-teal-100">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Professionally repaired</span>
              </div>
              <div className="flex items-center gap-2 text-teal-100">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Quality guaranteed</span>
              </div>
            </div>
          </div>

          {/* Center Divider with Icon */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div
              className={`w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-slate-900 ${
                !prefersReducedMotion ? 'animate-pulse' : ''
              }`}
            >
              <Sparkles className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Content Area - Bottom 250px */}
        <div className="relative h-[250px] bg-slate-900 border-t border-slate-800 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-white leading-tight mb-2">
                From Damaged to{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                  Mint Fresh
                </span>
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Our verified contractors transform properties with professional workmanship. Before/after
                photos guaranteed with every job.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full">
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-medium text-teal-300">Photo Proof</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Insured Work</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-300">Rated & Reviewed</span>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800">
              <div className="text-center">
                <div className="text-sm font-bold text-white">Photo Proof</div>
                <div className="text-xs text-slate-400">Before & After</div>
              </div>
              <div className="text-center border-x border-slate-800">
                <div className="text-sm font-bold text-white">AI Powered</div>
                <div className="text-xs text-slate-400">Smart Matching</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">Escrow</div>
                <div className="text-xs text-slate-400">Payment Protection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient glow */}
        <div
          className={`absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl -z-10 ${
            !prefersReducedMotion ? 'group-hover:opacity-75 transition-opacity duration-700' : 'opacity-50'
          }`}
        />
      </div>
    );
  }

  // VARIANT 3: Illustrated Contractor Character
  if (variant === 'illustrated') {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700">
        {/* Illustrated Character Area - Top 350px */}
        <div className="relative h-[350px] flex items-end justify-center overflow-hidden">
          {/* Background Pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.15) 2px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Floating Tools - Background Elements */}
          <div className="absolute top-8 left-8 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center rotate-12 shadow-lg">
            <Hammer className="w-6 h-6 text-white" />
          </div>
          <div className="absolute top-16 right-12 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center -rotate-12 shadow-lg">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className="absolute bottom-24 left-16 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center rotate-45 shadow-lg">
            <Paintbrush className="w-4 h-4 text-white" />
          </div>

          {/* Main Character Illustration Container */}
          <div className="relative w-64 h-80 mb-0">
            {/* Character Silhouette/Placeholder */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-72 bg-gradient-to-b from-white/30 to-white/60 rounded-t-full backdrop-blur-sm">
              {/* Head */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-24 bg-white/80 rounded-full border-4 border-white shadow-xl">
                {/* Face Elements */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-3">
                  <div className="w-2 h-2 bg-slate-800 rounded-full" />
                  <div className="w-2 h-2 bg-slate-800 rounded-full" />
                </div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-3 bg-slate-800 rounded-full" />
              </div>

              {/* Toolbelt */}
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-32 h-6 bg-amber-600 rounded-lg shadow-lg border-2 border-amber-700">
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-amber-500 rounded-md border-2 border-amber-700" />
              </div>

              {/* Thumbs Up Hand */}
              <div
                className={`absolute top-32 -right-8 w-12 h-12 bg-white/90 rounded-lg shadow-xl flex items-center justify-center ${
                  !prefersReducedMotion ? 'animate-bounce' : ''
                }`}
              >
                <ThumbsUp className="w-7 h-7 text-teal-600 fill-teal-600" />
              </div>
            </div>

            {/* Name Badge */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-full shadow-xl border-2 border-teal-300">
              <span className="text-sm font-bold text-slate-800">Your Mintenance Pro</span>
            </div>

            {/* Sparkles Effect */}
            {!prefersReducedMotion && (
              <>
                <Sparkles className="absolute top-12 right-8 w-6 h-6 text-white animate-pulse" />
                <Sparkles className="absolute bottom-32 left-4 w-5 h-5 text-white animate-pulse delay-150" />
                <Sparkles className="absolute top-20 left-12 w-4 h-4 text-white animate-pulse delay-300" />
              </>
            )}
          </div>
        </div>

        {/* Content Area - Bottom 250px */}
        <div className="relative h-[250px] bg-slate-900 border-t-4 border-teal-400 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-white leading-tight mb-2">
                Your Friendly Neighborhood Contractor
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Professional, verified, and ready to help. Upload photos to get matched with skilled
                tradespeople in your area.
              </p>
            </div>

            {/* Service Icons */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <Hammer className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-medium text-slate-300">Repairs</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">Maintenance</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <Paintbrush className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">Renovations</span>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800">
              <div className="text-center">
                <div className="text-sm font-bold text-white">Local</div>
                <div className="text-xs text-slate-400">Nearby Pros</div>
              </div>
              <div className="text-center border-x border-slate-800">
                <div className="text-sm font-bold text-white">Reviewed</div>
                <div className="text-xs text-slate-400">Real Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">Insured</div>
                <div className="text-xs text-slate-400">Full Cover</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VARIANT 4: Photo Collage/Montage
  if (variant === 'photo-collage') {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl overflow-hidden group shadow-2xl bg-slate-900">
        {/* Photo Montage Grid - Top 350px */}
        <div className="relative h-[350px] grid grid-cols-12 grid-rows-6 gap-2 p-2 bg-slate-800">
          {/* Large Feature Photo - Electrician */}
          <div className="col-span-7 row-span-4 relative overflow-hidden rounded-xl group/item">
            <Image
              src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop&crop=faces"
              alt="Professional electrician at work"
              fill
              className="object-cover group-hover/item:scale-105 transition-transform duration-500"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Electrical</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-teal-400" />
                <span className="text-xs text-white font-semibold">Verified</span>
              </div>
            </div>
          </div>

          {/* Plumber Portrait */}
          <div className="col-span-5 row-span-3 relative overflow-hidden rounded-xl group/item">
            <Image
              src="https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=300&h=200&fit=crop&crop=faces"
              alt="Professional plumber"
              fill
              className="object-cover group-hover/item:scale-105 transition-transform duration-500"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-bold text-white">Plumbing</span>
              </div>
            </div>
          </div>

          {/* Carpenter in Action */}
          <div className="col-span-5 row-span-3 relative overflow-hidden rounded-xl group/item">
            <Image
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop"
              alt="Carpenter working on project"
              fill
              className="object-cover group-hover/item:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-2">
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-white">Carpentry</span>
              </div>
            </div>
          </div>

          {/* Painter with Thumbs Up */}
          <div className="col-span-7 row-span-2 relative overflow-hidden rounded-xl group/item">
            <Image
              src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=150&fit=crop&crop=faces"
              alt="Professional painter giving thumbs up"
              fill
              className="object-cover group-hover/item:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-transparent to-transparent" />
            <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-md">
              <span className="text-xs font-bold text-white">Mint Fresh Work ✓</span>
            </div>
          </div>

          {/* Verification Badges Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-xl flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-bold text-slate-900">All Verified</span>
            </div>
            <div className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-xl flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">Background Checked</span>
            </div>
          </div>
        </div>

        {/* Content Area - Bottom 250px */}
        <div className="relative h-[250px] bg-slate-900 border-t border-slate-800 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-white leading-tight mb-2">
                Diverse Trades.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                  One Platform.
                </span>
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                From electricians to carpenters, find verified professionals for any job. All background-checked
                and ready to deliver mint fresh results.
              </p>
            </div>

            {/* Trade Pills */}
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-medium text-slate-300">
                Plumbing
              </div>
              <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-medium text-slate-300">
                Electrical
              </div>
              <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-medium text-slate-300">
                Carpentry
              </div>
              <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-medium text-slate-300">
                Painting
              </div>
              <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-medium text-slate-300">
                +67 More
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-bold text-white">Verified</span>
                </div>
                <div className="text-xs text-slate-400">All Pros Vetted</div>
              </div>
              <div className="text-center border-x border-slate-800">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">UK-Wide</span>
                </div>
                <div className="text-xs text-slate-400">Coverage</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Insured</span>
                </div>
                <div className="text-xs text-slate-400">Full Protection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient glow */}
        <div
          className={`absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-amber-500/20 rounded-2xl blur-xl -z-10 ${
            !prefersReducedMotion ? 'group-hover:opacity-75 transition-opacity duration-700' : 'opacity-50'
          }`}
        />
      </div>
    );
  }

  // Fallback (should never reach here)
  return null;
}
