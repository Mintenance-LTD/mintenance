'use client';

import React from 'react';
import { designSystem } from '@/lib/design-system';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ 
  children, 
  className = '', 
  style = {}, 
  variant = 'default',
  padding = 'md'
}: CardProps) {
  const cardStyle = variant === 'elevated' 
    ? designSystem.components.card.elevated 
    : designSystem.components.card.base;

  const paddingValue = padding === 'sm' ? '1rem' : padding === 'lg' ? '2rem' : '1.5rem';

  return (
    <div 
      className={className}
      style={{
        ...cardStyle,
        padding: paddingValue,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardHeader({ children, className = '', style = {} }: CardHeaderProps) {
  return (
    <div 
      className={className}
      style={{
        marginBottom: '1rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardTitle({ children, className = '', style = {} }: CardTitleProps) {
  return (
    <h3 
      className={className}
      style={{
        fontSize: '1.125rem',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardContent({ children, className = '', style = {} }: CardContentProps) {
  return (
    <div 
      className={className}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  );
}