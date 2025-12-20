'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface StoryStep {
  from: 'left' | 'right' | 'center';
  icon: string;
  title: string;
  subtitle: string;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
  delay: number;
}

const STORY_STEPS: StoryStep[] = [
  {
    from: 'left',
    icon: '📋',
    title: 'Job Posted',
    subtitle: 'Fix kitchen light switch',
    color: 'blue',
    delay: 0.5
  },
  {
    from: 'right',
    icon: '💷',
    title: 'Quote Sent',
    subtitle: '£85 • Available tomorrow',
    color: 'amber',
    delay: 1.5
  },
  {
    from: 'left',
    icon: '✓',
    title: 'Quote Accepted',
    subtitle: 'Booking confirmed',
    color: 'emerald',
    delay: 2.5
  },
  {
    from: 'right',
    icon: '📅',
    title: 'Time Scheduled',
    subtitle: 'Tomorrow, 2:00 PM',
    color: 'purple',
    delay: 3.5
  },
  {
    from: 'left',
    icon: '👍',
    title: 'Confirmed',
    subtitle: 'See you then!',
    color: 'blue',
    delay: 4.5
  },
  {
    from: 'center',
    icon: '⭐',
    title: 'Job Complete!',
    subtitle: '5-star rating',
    color: 'emerald',
    delay: 5.5
  }
];

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-500',
    shadow: 'shadow-blue-500/40'
  },
  amber: {
    bg: 'bg-amber-500',
    shadow: 'shadow-amber-500/40'
  },
  emerald: {
    bg: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/40'
  },
  purple: {
    bg: 'bg-purple-500',
    shadow: 'shadow-purple-500/40'
  }
} as const;

const TOTAL_CYCLE = 10; // Total animation cycle duration

export function StoryBubbles() {
  const prefersReducedMotion = useReducedMotion();

  // Static version for reduced motion - show all bubbles
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none z-30">
        {STORY_STEPS.map((step, index) => {
          const colors = COLOR_CLASSES[step.color];
          const isLeft = step.from === 'left';
          const isCenter = step.from === 'center';
          const isRight = step.from === 'right';
          const topPercent = 12 + (index * 13);

          return (
            <div
              key={index}
              className="absolute"
              style={{
                top: `${topPercent}%`,
                left: isCenter ? '50%' : isLeft ? '8%' : 'auto',
                right: isRight ? '8%' : 'auto',
                transform: isCenter ? 'translateX(-50%)' : 'none'
              }}
            >
              <div className={`
                ${colors.bg} ${colors.shadow}
                rounded-2xl px-3 py-2 shadow-lg
                ${isLeft ? 'rounded-bl-sm' : isRight ? 'rounded-br-sm' : ''}
                ${isCenter ? 'px-4 py-3' : ''}
              `}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                    <span className={`${isCenter ? 'text-base' : 'text-sm'}`}>{step.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{step.title}</div>
                    <div className="text-[10px] text-white/80">{step.subtitle}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {STORY_STEPS.map((step, index) => {
        const colors = COLOR_CLASSES[step.color];
        const isLeft = step.from === 'left';
        const isCenter = step.from === 'center';
        const isRight = step.from === 'right';

        // Vertical position - stagger down the screen
        const topPercent = 12 + (index * 13);

        return (
          <motion.div
            key={index}
            className="absolute"
            style={{
              top: `${topPercent}%`,
              left: isCenter ? '50%' : isLeft ? '8%' : 'auto',
              right: isRight ? '8%' : 'auto',
              transform: isCenter ? 'translateX(-50%)' : 'none'
            }}
            initial={{
              opacity: 0,
              scale: 0.3,
              x: isCenter ? 0 : isLeft ? -40 : 40,
            }}
            animate={{
              opacity: [0, 1, 1, 1, 1, 0],
              scale: [0.3, 1.1, 1, 1, 1, 0.8],
              x: isCenter ? 0 : [isLeft ? -40 : 40, 0, 0, 0, 0, 0],
            }}
            transition={{
              duration: TOTAL_CYCLE,
              delay: step.delay,
              repeat: Infinity,
              times: [0, 0.08, 0.12, 0.7, 0.85, 1],
              ease: "easeOut"
            }}
          >
            {/* Message bubble */}
            <div className={`
              ${colors.bg} ${colors.shadow}
              rounded-2xl px-3 py-2 shadow-lg
              ${isLeft ? 'rounded-bl-sm' : isRight ? 'rounded-br-sm' : ''}
              ${isCenter ? 'px-4 py-3' : ''}
            `}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                  <span className={`${isCenter ? 'text-base' : 'text-sm'}`}>{step.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">{step.title}</div>
                  <div className="text-[10px] text-white/80">{step.subtitle}</div>
                </div>
              </div>
            </div>

            {/* Arrow indicating direction */}
            {!isCenter && (
              <motion.div
                className={`absolute top-1/2 -translate-y-1/2 ${isLeft ? '-right-6' : '-left-6'}`}
                initial={{ opacity: 0, x: isLeft ? -5 : 5 }}
                animate={{
                  opacity: [0, 1, 1, 1, 1, 0],
                  x: [isLeft ? -5 : 5, isLeft ? 3 : -3, isLeft ? 3 : -3, isLeft ? 3 : -3, isLeft ? 3 : -3, 0]
                }}
                transition={{
                  duration: TOTAL_CYCLE,
                  delay: step.delay + 0.1,
                  repeat: Infinity,
                  times: [0, 0.08, 0.12, 0.7, 0.85, 1],
                }}
              >
                <svg
                  className={`w-4 h-4 text-white/60 ${isRight ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
