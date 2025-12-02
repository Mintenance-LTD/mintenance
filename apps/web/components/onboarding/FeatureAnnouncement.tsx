'use client';

/**
 * FeatureAnnouncement Component
 * Modal system for announcing new features to users
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Play, ExternalLink } from 'lucide-react';

interface FeatureAnnouncementData {
  id: string;
  version: string; // e.g., "2.1.0"
  title: string;
  description: string;
  features: {
    title: string;
    description: string;
    icon?: string; // Emoji or icon name
  }[];
  media?: {
    type: 'image' | 'video' | 'gif';
    url: string;
    alt?: string;
  };
  actions?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
  }[];
  releaseDate: string; // ISO date string
}

interface FeatureAnnouncementProps {
  announcement: FeatureAnnouncementData;
  onDismiss: () => void;
  onLearnMore?: () => void;
}

const SEEN_ANNOUNCEMENTS_KEY = 'mintenance_seen_announcements';

/**
 * Get list of seen announcement IDs from localStorage
 */
function getSeenAnnouncements(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SEEN_ANNOUNCEMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Mark announcement as seen
 */
function markAnnouncementSeen(announcementId: string): void {
  if (typeof window === 'undefined') return;

  const seen = getSeenAnnouncements();
  if (!seen.includes(announcementId)) {
    seen.push(announcementId);
    localStorage.setItem(SEEN_ANNOUNCEMENTS_KEY, JSON.stringify(seen));
  }
}

/**
 * Check if user should see an announcement
 */
export function shouldShowAnnouncement(
  announcementId: string,
  lastLoginDate?: string
): boolean {
  const seen = getSeenAnnouncements();
  if (seen.includes(announcementId)) return false;

  // Optionally: only show if user last logged in before the release date
  // This prevents showing old announcements to new users
  return true;
}

export function FeatureAnnouncement({
  announcement,
  onDismiss,
  onLearnMore,
}: FeatureAnnouncementProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleDismiss = () => {
    markAnnouncementSeen(announcement.id);
    onDismiss();
  };

  const handleGotIt = () => {
    markAnnouncementSeen(announcement.id);
    onDismiss();
  };

  const handleLearnMore = () => {
    markAnnouncementSeen(announcement.id);
    if (onLearnMore) {
      onLearnMore();
    }
    onDismiss();
  };

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-title"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-lg"
            aria-label="Close announcement"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Header with badge */}
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 pb-12 rounded-t-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                What's New in v{announcement.version}
              </span>
            </div>
            <h2 id="announcement-title" className="text-3xl font-bold mb-3">
              {announcement.title}
            </h2>
            <p className="text-blue-100 text-lg">
              {announcement.description}
            </p>
          </div>

          {/* Media section */}
          {announcement.media && (
            <div className="relative -mt-8 mx-8 mb-6 rounded-xl overflow-hidden shadow-xl bg-gray-900">
              {announcement.media.type === 'image' && (
                <img
                  src={announcement.media.url}
                  alt={announcement.media.alt || announcement.title}
                  className="w-full h-auto"
                />
              )}
              {announcement.media.type === 'gif' && (
                <img
                  src={announcement.media.url}
                  alt={announcement.media.alt || announcement.title}
                  className="w-full h-auto"
                />
              )}
              {announcement.media.type === 'video' && (
                <>
                  {!isVideoPlaying ? (
                    <div className="relative">
                      <video
                        src={announcement.media.url}
                        className="w-full h-auto"
                        poster={announcement.media.url.replace('.mp4', '-poster.jpg')}
                      />
                      <button
                        onClick={() => setIsVideoPlaying(true)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
                      >
                        <div className="p-6 bg-white rounded-full shadow-2xl">
                          <Play className="w-12 h-12 text-blue-600" />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <video
                      src={announcement.media.url}
                      className="w-full h-auto"
                      autoPlay
                      controls
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Features list */}
          <div className="px-8 pb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              New Features
            </h3>
            <div className="space-y-4">
              {announcement.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl"
                >
                  {feature.icon && (
                    <div className="flex-shrink-0 text-3xl">
                      {feature.icon}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex items-center justify-between gap-4 border-t border-gray-200 pt-6">
            <button
              onClick={handleGotIt}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Got It
            </button>

            <div className="flex items-center gap-3">
              {announcement.actions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.onClick) {
                      action.onClick();
                    } else if (action.href) {
                      window.open(action.href, '_blank');
                    }
                    handleDismiss();
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-600'
                  }`}
                >
                  {action.label}
                  {action.href && <ExternalLink className="w-4 h-4" />}
                </button>
              ))}

              {onLearnMore && !announcement.actions && (
                <button
                  onClick={handleLearnMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
                >
                  Learn More
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage feature announcements
 */
export function useFeatureAnnouncements(
  announcements: FeatureAnnouncementData[]
) {
  const [currentAnnouncement, setCurrentAnnouncement] =
    useState<FeatureAnnouncementData | null>(null);

  useEffect(() => {
    // Find first unseen announcement
    const unseen = announcements.find(
      announcement => !getSeenAnnouncements().includes(announcement.id)
    );

    if (unseen) {
      // Delay showing announcement slightly
      const timer = setTimeout(() => {
        setCurrentAnnouncement(unseen);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [announcements]);

  const dismissAnnouncement = () => {
    setCurrentAnnouncement(null);
  };

  return {
    currentAnnouncement,
    dismissAnnouncement,
  };
}

export default FeatureAnnouncement;
