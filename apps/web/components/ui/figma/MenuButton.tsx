'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface MenuButtonProps {
  label?: string;
  href?: string;
  onClick?: () => void;
  isExpanded?: boolean;
  icon?: string;
}

export function MenuButton({ label, href, onClick, isExpanded = true, icon = 'plus' }: MenuButtonProps) {
  const iconContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isExpanded ? 'auto' : '48px',
    height: '48px',
    borderRadius: '24px',
    padding: '5px',
    backgroundColor: theme.colors.secondary,
    transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.easeOut}`,
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isExpanded ? '10px' : '0',
    width: isExpanded ? '184px' : '48px',
    height: '48px',
    borderRadius: '24px',
    padding: isExpanded ? '5px 7px 5px 20px' : '5px',
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.easeOut}`,
    boxShadow: theme.shadows.sm,
  };

  const content = (
    <>
      <div style={iconContainerStyle}>
        <Icon name={icon} size={24} color={theme.colors.textInverse} />
      </div>
      {isExpanded && label && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            lineHeight: 'normal',
            whiteSpace: 'nowrap',
          }}
        >
          {label.split(' ').map((word, idx, arr) => (
            <span key={idx} style={{ display: 'block', marginBottom: idx < arr.length - 1 ? '0' : '0' }}>
              {word}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = theme.shadows.md;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = theme.shadows.sm;
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = theme.shadows.sm;
      }}
    >
      {content}
    </button>
  );
}

