import { useState, useEffect } from 'react';

/**
 * Animated counter hook - counts from 0 to target value using requestAnimationFrame.
 * Must be used within a client component.
 *
 * @param end - Target number to count up to
 * @param duration - Animation duration in milliseconds (default 2000ms)
 * @returns Current animated count value
 */
export function useCountUp(end: number, duration: number = 2000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration]);

  return count;
}
