import React, { useState, useRef, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = (props) => {
  // Defensive prop destructuring with defaults to prevent test crashes
  const {
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    className = '',
    style = {},
  } = props || {};
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const gesture = useRef<{
    start: { x: number; y: number };
    offset: { x: number; y: number };
  } | null>(null);
  const [rotation, setRotation] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const ROTATION_FACTOR = 0.1;

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    gesture.current = {
      start: { x: clientX, y: clientY },
      offset: { x: 0, y: 0 },
    };
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!gesture.current) return;

    const deltaX = clientX - gesture.current.start.x;
    const deltaY = clientY - gesture.current.start.y;

    gesture.current.offset = { x: deltaX, y: deltaY };
    setPosition({ x: deltaX, y: deltaY });
    setRotation(deltaX * ROTATION_FACTOR);
  }, []);

  const resetGesture = useCallback(() => {
    gesture.current = null;
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const handleEnd = useCallback(() => {
    if (!gesture.current) return;

    const { x, y } = gesture.current.offset;
    resetGesture();
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    // Check if swipe threshold was reached
    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      // Determine swipe direction
      if (absX > absY) {
        // Horizontal swipe
        if (x > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (x < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (y > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (y < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  }, [onSwipeRight, onSwipeLeft, onSwipeDown, onSwipeUp, resetGesture]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) =>
        handleMove(e.clientX, e.clientY);
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) handleMove(touch.clientX, touch.clientY);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', resetGesture);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', resetGesture);
      };
    }
  }, [isDragging, handleMove, handleEnd, resetGesture]);

  const cardStyle: React.CSSProperties = {
    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
    ...style,
  };

  // Overlay opacity based on swipe direction
  const getOverlayOpacity = () => {
    const absX = Math.abs(position.x);
    const absY = Math.abs(position.y);
    return Math.min((Math.max(absX, absY) / SWIPE_THRESHOLD) * 0.8, 0.8);
  };

  const getOverlayColor = () => {
    const { x, y } = position;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > absY) {
      return x > 0 ? theme.colors.success : theme.colors.error;
    } else {
      return y > 0 ? theme.colors.warning : theme.colors.info;
    }
  };

  const getOverlayText = () => {
    const { x, y } = position;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > absY) {
      return x > 0 ? 'LIKE' : 'PASS';
    } else {
      return y > 0 ? 'MAYBE' : 'SUPER LIKE';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`swipeable-card ${className}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {children}

      {/* Swipe Overlay */}
      {isDragging &&
        (Math.abs(position.x) > 20 || Math.abs(position.y) > 20) && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: getOverlayColor(),
              opacity: getOverlayOpacity(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'inherit',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div
              style={{
                color: theme.colors.white,
                fontSize: theme.typography.fontSize['4xl'],
                fontWeight: theme.typography.fontWeight.bold,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                transform: `rotate(${-rotation}deg)`, // Counter-rotate text
              }}
            >
              {getOverlayText()}
            </div>
          </div>
        )}
    </div>
  );
};
