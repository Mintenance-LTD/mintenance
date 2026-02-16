'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Briefcase,
  MessageSquare,
  Star,
  PoundSterling,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RundownStats {
  pendingBids: number;
  acceptedToday: number;
  rejectedToday: number;
  activeJobs: number;
  assignedJobs: number;
  unreadMessages: number;
  unreadNotifications: number;
  newReviews: number;
  todayEarnings: number;
}

interface RundownData {
  date: string;
  greeting: string;
  stats: RundownStats;
  highlights: string[];
}

const STORAGE_KEY = 'mintenance_rundown_dismissed';

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  const today = new Date().toISOString().split('T')[0];
  return dismissed === today;
}

function dismissForToday(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(STORAGE_KEY, today);
}

export function DailyRundownBanner() {
  const router = useRouter();
  const [data, setData] = useState<RundownData | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDismissedToday()) {
      setLoading(false);
      return;
    }

    const fetchRundown = async () => {
      try {
        const res = await fetch('/api/contractor/daily-rundown');
        if (!res.ok) return;
        const rundown: RundownData = await res.json();
        setData(rundown);
        setVisible(true);
      } catch {
        // Silently fail - rundown is non-critical
      } finally {
        setLoading(false);
      }
    };

    fetchRundown();
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    dismissForToday();
  };

  if (loading || !visible || !data) return null;

  const { stats, greeting, highlights } = data;
  const hasActivity = stats.pendingBids > 0 || stats.activeJobs > 0 ||
    stats.acceptedToday > 0 || stats.unreadMessages > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 rounded-xl border border-slate-700 shadow-lg">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
              aria-label="Dismiss daily rundown"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            <div className="p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-500/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {greeting}! Here&apos;s your daily rundown
                  </h3>
                  <p className="text-sm text-slate-400">
                    {new Date().toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatChip
                  icon={<Briefcase className="w-4 h-4" />}
                  label="Active Jobs"
                  value={stats.activeJobs + stats.assignedJobs}
                  color="teal"
                />
                <StatChip
                  icon={<Clock className="w-4 h-4" />}
                  label="Pending Bids"
                  value={stats.pendingBids}
                  color="amber"
                />
                <StatChip
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Messages"
                  value={stats.unreadMessages}
                  color="blue"
                />
                <StatChip
                  icon={<PoundSterling className="w-4 h-4" />}
                  label="Earned Today"
                  value={`£${(stats.todayEarnings / 100).toFixed(0)}`}
                  color="emerald"
                  isText
                />
              </div>

              {/* Highlights */}
              {highlights.length > 0 && (
                <div className="space-y-1.5">
                  {highlights.map((hl, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <HighlightIcon text={hl} />
                      <span className="text-slate-300">{hl}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              {hasActivity && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                  {stats.unreadMessages > 0 && (
                    <QuickAction
                      label="View Messages"
                      onClick={() => router.push('/contractor/messages')}
                    />
                  )}
                  {stats.assignedJobs > 0 && (
                    <QuickAction
                      label="Start a Job"
                      onClick={() => router.push('/contractor/jobs')}
                    />
                  )}
                  {stats.pendingBids === 0 && (
                    <QuickAction
                      label="Find New Jobs"
                      onClick={() => router.push('/contractor/discover')}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-500/15 text-teal-400',
    amber: 'bg-amber-500/15 text-amber-400',
    blue: 'bg-blue-500/15 text-blue-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
  };

  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
      <div className={`p-1 rounded ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-sm font-semibold text-white">
          {isText ? value : value}
        </p>
      </div>
    </div>
  );
}

function HighlightIcon({ text }: { text: string }) {
  const lower = text.toLowerCase();
  if (lower.includes('accepted')) return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />;
  if (lower.includes('message')) return <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  if (lower.includes('review') || lower.includes('star')) return <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
  if (lower.includes('released') || lower.includes('£')) return <PoundSterling className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  if (lower.includes('notification')) return <Bell className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
  if (lower.includes('pending') || lower.includes('awaiting')) return <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
  if (lower.includes('job') || lower.includes('progress')) return <Briefcase className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />;
  return <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
    >
      {label}
      <ArrowRight className="w-3 h-3" />
    </button>
  );
}
