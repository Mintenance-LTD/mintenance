'use client';

import React, { useState, useEffect } from 'react';
import { Touchable } from './Touchable';
import { theme } from '@/lib/theme';

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  'data-testid'?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  position = 'bottom-right',
  size = 'md',
  color = 'primary',
  disabled = false,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Hide FAB when scrolling down, show when scrolling up
      if (scrollY > 100 && scrollY < documentHeight - windowHeight - 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sizeStyles = {
    sm: {
      width: '48px',
      height: '48px',
      fontSize: '18px',
    },
    md: {
      width: '56px',
      height: '56px',
      fontSize: '20px',
    },
    lg: {
      width: '64px',
      height: '64px',
      fontSize: '24px',
    },
  };

  const colorStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: 'white',
      boxShadow: `0 4px 12px ${theme.colors.primary}40`,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: 'white',
      boxShadow: `0 4px 12px ${theme.colors.secondary}40`,
    },
    success: {
      backgroundColor: theme.colors.success,
      color: 'white',
      boxShadow: `0 4px 12px ${theme.colors.success}40`,
    },
    warning: {
      backgroundColor: theme.colors.warning,
      color: 'white',
      boxShadow: `0 4px 12px ${theme.colors.warning}40`,
    },
    error: {
      backgroundColor: theme.colors.error,
      color: 'white',
      boxShadow: `0 4px 12px ${theme.colors.error}40`,
    },
  };

  const positionStyles = {
    'bottom-right': {
      bottom: theme.spacing[6],
      right: theme.spacing[6],
    },
    'bottom-left': {
      bottom: theme.spacing[6],
      left: theme.spacing[6],
    },
    'top-right': {
      top: theme.spacing[6],
      right: theme.spacing[6],
    },
    'top-left': {
      top: theme.spacing[6],
      left: theme.spacing[6],
    },
  };

  const containerStyles = {
    position: 'fixed' as const,
    zIndex: 1000,
    ...positionStyles[position],
    ...sizeStyles[size],
    ...colorStyles[color],
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transform: isVisible ? 'scale(1)' : 'scale(0)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    ...style,
  };

  const pressedStyles = {
    transform: 'scale(0.95)',
    boxShadow: `0 2px 8px ${colorStyles[color].boxShadow.split(' ')[2]}`,
  };

  return (
    <Touchable
      onPress={disabled ? undefined : onClick}
      disabled={disabled}
      className={`floating-action-button ${className}`}
      style={containerStyles}
      aria-label={ariaLabel}
      data-testid={testId}
      hapticFeedback={true}
      rippleEffect={true}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.1s ease-in-out',
      }}>
        {icon}
      </div>
    </Touchable>
  );
};

// Speed Dial FAB - shows multiple actions
interface SpeedDialProps {
  mainIcon: React.ReactNode;
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  }>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
  style?: React.CSSProperties;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({
  mainIcon,
  actions,
  position = 'bottom-right',
  className = '',
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSpeedDial = () => {
    setIsOpen(!isOpen);
  };

  const positionStyles = {
    'bottom-right': {
      bottom: theme.spacing[6],
      right: theme.spacing[6],
    },
    'bottom-left': {
      bottom: theme.spacing[6],
      left: theme.spacing[6],
    },
    'top-right': {
      top: theme.spacing[6],
      right: theme.spacing[6],
    },
    'top-left': {
      top: theme.spacing[6],
      left: theme.spacing[6],
    },
  };

  const containerStyles = {
    position: 'fixed' as const,
    zIndex: 1000,
    ...positionStyles[position],
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: position.includes('right') ? 'flex-end' : 'flex-start',
    gap: theme.spacing[2],
    ...style,
  };

  const actionStyles = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isOpen ? 'scale(1)' : 'scale(0)',
    opacity: isOpen ? 1 : 0,
  };

  const mainButtonStyles = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
    boxShadow: `0 4px 12px ${theme.colors.primary}40`,
  };

  return (
    <div className={`speed-dial ${className}`} style={containerStyles}>
      {/* Action buttons */}
      {actions.map((action, index) => (
        <Touchable
          key={index}
          onPress={action.onClick}
          style={{
            ...actionStyles,
            backgroundColor: action.color ? theme.colors[action.color] : theme.colors.secondary,
            color: 'white',
            transitionDelay: `${index * 50}ms`,
          }}
          aria-label={action.label}
          hapticFeedback={true}
          rippleEffect={true}
        >
          {action.icon}
        </Touchable>
      ))}
      
      {/* Main button */}
      <Touchable
        onPress={toggleSpeedDial}
        style={mainButtonStyles}
        aria-label={isOpen ? 'Close speed dial' : 'Open speed dial'}
        hapticFeedback={true}
        rippleEffect={true}
      >
        {mainIcon}
      </Touchable>
    </div>
  );
};

export default FloatingActionButton;
