import React from 'react';

export interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercentage?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 200,
  strokeWidth = 12,
  label = 'Completed',
  showPercentage = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value >= 75) return '#10B981'; // green
    if (value >= 50) return '#F59E0B'; // yellow
    if (value >= 25) return '#EF4444'; // red
    return '#9CA3AF'; // gray
  };

  const color = getColor();

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
        }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />

        {/* Scale markers */}
        {[0, 25, 50, 75, 100].map((mark) => {
          const angle = (mark / 100) * 360;
          const x = size / 2 + (radius - strokeWidth / 2) * Math.cos((angle * Math.PI) / 180);
          const y = size / 2 + (radius - strokeWidth / 2) * Math.sin((angle * Math.PI) / 180);
          return (
            <circle
              key={mark}
              cx={x}
              cy={y}
              r={2}
              fill={value >= mark ? color : '#D1D5DB'}
            />
          );
        })}
      </svg>

      {/* Center text */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showPercentage && (
          <span
            style={{
              fontSize: `${size / 5}px`,
              fontWeight: 700,
              color: '#1F2937',
              lineHeight: 1,
            }}
          >
            {value}%
          </span>
        )}
        <span
          style={{
            fontSize: `${size / 16}px`,
            color: '#6B7280',
            marginTop: '4px',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
