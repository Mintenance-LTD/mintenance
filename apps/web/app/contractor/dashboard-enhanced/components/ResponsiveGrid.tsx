import React from 'react';
import styles from './ResponsiveGrid.module.css';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResponsiveGrid({ children, className = '', style = {} }: ResponsiveGridProps) {
  // Map className to CSS module class
  const getGridClass = () => {
    if (className.includes('metrics-grid')) {
      return styles['metrics-grid'];
    } else if (className.includes('project-grid')) {
      return styles['project-grid'];
    } else if (className.includes('tasks-actions-grid')) {
      return styles['tasks-actions-grid'];
    }
    return '';
  };

  const gridClass = getGridClass();
  const combinedClassName = gridClass ? `${gridClass} ${className}` : className;

  return (
    <div className={combinedClassName} style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', ...style }}>
        {children}
      </div>
  );
}

