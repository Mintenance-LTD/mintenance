import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  color = '#10B981',
  trend,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E5E7EB',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: '14px',
            color: '#6B7280',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '20px' }}>{icon}</span>
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#1F2937',
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {(subtitle || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {trend && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: trend.isPositive ? '#10B981' : '#EF4444',
              }}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && (
            <span
              style={{
                fontSize: '12px',
                color: '#9CA3AF',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
