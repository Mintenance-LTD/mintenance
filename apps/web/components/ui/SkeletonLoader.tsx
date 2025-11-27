import React from 'react';
import { theme } from '@/lib/theme';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  animation?: 'pulse' | 'wave' | 'none';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = '20px',
  className = '',
  style = {},
  animation = 'pulse',
  count = 1,
}) => {
  const baseStyles = {
    backgroundColor: theme.colors.border,
    borderRadius: variant === 'circular' ? '50%' : theme.borderRadius.base,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    display: 'inline-block',
    position: 'relative' as const,
    overflow: 'hidden',
  };

  const animationStyles = {
    pulse: {
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    },
    wave: {
      animation: 'skeleton-wave 1.6s ease-in-out infinite',
    },
    none: {},
  };

  const skeletonElement = (
    <div
      className={`skeleton-loader skeleton-loader--${variant} skeleton-loader--${animation} ${className}`}
      style={{
        ...baseStyles,
        ...animationStyles[animation],
        ...style,
      }}
    >
      {animation === 'wave' && (
        <div
          className="skeleton-wave-shimmer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)`,
            transform: 'translateX(-100%)',
            animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>
          {React.cloneElement(skeletonElement, {
            style: {
              ...skeletonElement.props.style,
              width: variant === 'text' ? `${Math.random() * 40 + 60}%` : skeletonElement.props.style?.width,
            },
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style = {},
}) => (
  <div
    className={`skeleton-card ${className}`}
    style={{
      padding: theme.spacing[4],
      backgroundColor: 'white',
      borderRadius: theme.borderRadius.lg,
      boxShadow: theme.shadows.base,
      border: `1px solid ${theme.colors.border}`,
      ...style,
    }}
  >
    <SkeletonLoader variant="circular" width={40} height={40} style={{ marginBottom: theme.spacing[3] }} />
    <SkeletonLoader variant="text" height={16} style={{ marginBottom: theme.spacing[2] }} />
    <SkeletonLoader variant="text" height={16} width="80%" style={{ marginBottom: theme.spacing[2] }} />
    <SkeletonLoader variant="text" height={16} width="60%" />
  </div>
);

export const SkeletonList: React.FC<{ 
  count?: number; 
  className?: string; 
  style?: React.CSSProperties;
}> = ({ count = 3, className = '', style = {} }) => (
  <div className={`skeleton-list ${className}`} style={style}>
    {Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing[3],
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <SkeletonLoader variant="circular" width={32} height={32} style={{ marginRight: theme.spacing[3] }} />
        <div style={{ flex: 1 }}>
          <SkeletonLoader variant="text" height={14} style={{ marginBottom: theme.spacing[1] }} />
          <SkeletonLoader variant="text" height={12} width="70%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string; 
  style?: React.CSSProperties;
}> = ({ rows = 5, columns = 4, className = '', style = {} }) => (
  <div className={`skeleton-table ${className}`} style={style}>
    {/* Header */}
    <div style={{ display: 'flex', padding: theme.spacing[3], borderBottom: `2px solid ${theme.colors.border}` }}>
      {Array.from({ length: columns }, (_, index) => (
        <SkeletonLoader
          key={index}
          variant="text"
          height={16}
          width="100%"
          style={{ marginRight: index < columns - 1 ? theme.spacing[4] : 0 }}
        />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} style={{ display: 'flex', padding: theme.spacing[3], borderBottom: `1px solid ${theme.colors.border}` }}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <SkeletonLoader
            key={colIndex}
            variant="text"
            height={14}
            width="100%"
            style={{ marginRight: colIndex < columns - 1 ? theme.spacing[4] : 0 }}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonButton: React.FC<{ 
  width?: string | number;
  className?: string; 
  style?: React.CSSProperties;
}> = ({ width = 120, className = '', style = {} }) => (
  <SkeletonLoader
    variant="rectangular"
    width={width}
    height={40}
    className={className}
    style={{
      borderRadius: theme.borderRadius.base,
      ...style,
    }}
  />
);

export const SkeletonAvatar: React.FC<{ 
  size?: number;
  className?: string; 
  style?: React.CSSProperties;
}> = ({ size = 40, className = '', style = {} }) => (
  <SkeletonLoader
    variant="circular"
    width={size}
    height={size}
    className={className}
    style={style}
  />
);

export const SkeletonText: React.FC<{ 
  lines?: number;
  className?: string; 
  style?: React.CSSProperties;
}> = ({ lines = 3, className = '', style = {} }) => (
  <div className={`skeleton-text ${className}`} style={style}>
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonLoader
        key={index}
        variant="text"
        height={16}
        width={index === lines - 1 ? '60%' : '100%'}
        style={{ marginBottom: index < lines - 1 ? theme.spacing[2] : 0 }}
      />
    ))}
  </div>
);

export default SkeletonLoader;
