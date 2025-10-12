'use client';

import React, { useState, useRef, useEffect } from 'react';
import { theme } from '@/lib/theme';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
  style?: React.CSSProperties;
  refreshText?: string;
  pullText?: string;
  releaseText?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  className = '',
  style = {},
  refreshText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        setCanPull(true);
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, threshold * 1.5);
        setPullDistance(distance);
        setIsPulling(distance > threshold);
      }
    };

    const handleTouchEnd = async () => {
      if (!canPull || isRefreshing) return;

      if (isPulling && pullDistance > threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
      
      setCanPull(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, isPulling, isRefreshing, pullDistance, startY, threshold, onRefresh]);

  const containerStyles = {
    position: 'relative' as const,
    overflow: 'auto',
    height: '100%',
    ...style,
  };

  const refreshIndicatorStyles = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: `${threshold}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    transform: `translateY(${pullDistance - threshold}px)`,
    transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
    zIndex: 10,
  };

  const contentStyles = {
    transform: `translateY(${pullDistance}px)`,
    transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
  };

  const getRefreshText = () => {
    if (isRefreshing) return refreshText;
    if (isPulling) return releaseText;
    return pullText;
  };

  const getRefreshIcon = () => {
    if (isRefreshing) {
      return (
        <div
          style={{
            width: '20px',
            height: '20px',
            border: `2px solid ${theme.colors.primary}`,
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      );
    }
    
    return (
      <div
        style={{
          width: '20px',
          height: '20px',
          border: `2px solid ${theme.colors.textSecondary}`,
          borderBottom: '2px solid transparent',
          borderRadius: '50%',
          transform: `rotate(${Math.min(pullDistance / threshold * 180, 180)}deg)`,
          transition: 'transform 0.2s ease-out',
        }}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={`pull-to-refresh ${className}`}
      style={containerStyles}
    >
      {/* Refresh Indicator */}
      <div
        ref={refreshIndicatorRef}
        style={refreshIndicatorStyles}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
        }}>
          {getRefreshIcon()}
          <span>{getRefreshText()}</span>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyles}>
        {children}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pull-to-refresh {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default PullToRefresh;
