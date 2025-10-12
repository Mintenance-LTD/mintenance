'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { designSystem } from '@/lib/design-system';

interface SidebarItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function Sidebar({ items, user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
    }}>
      {/* Logo/Brand */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            backgroundColor: designSystem.colors.primary[500],
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}>
            M
          </div>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1f2937',
          }}>
            Mintenance
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav style={{
        flex: 1,
        padding: '1rem 0',
        overflow: 'auto',
      }}>
        {items.map((item, index) => (
          <SidebarItemComponent 
            key={index}
            item={item}
            isActive={isActive(item.href)}
            level={0}
          />
        ))}
      </nav>

      {/* User Profile */}
      {user && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              backgroundColor: designSystem.colors.primary[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designSystem.colors.primary[700],
              fontSize: '0.875rem',
              fontWeight: '600',
            }}>
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                user.name.split(' ').map(n => n[0]).join('').toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1f2937',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user.name}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItemComponent({ 
  item, 
  isActive, 
  level = 0 
}: { 
  item: SidebarItem; 
  isActive: boolean; 
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleToggle = () => {
    if (item.children) {
      setIsExpanded(!isExpanded);
    }
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    margin: '0.125rem 0.5rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    color: isActive ? 'white' : '#374151',
    backgroundColor: isActive ? designSystem.colors.primary[500] : 'transparent',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    marginLeft: `${level * 1}rem`,
  };

  const hoverStyle: React.CSSProperties = {
    backgroundColor: isActive 
      ? designSystem.colors.primary[600] 
      : '#f3f4f6',
  };

  const content = (
    <>
      {/* Icon */}
      {item.icon && (
        <span style={{ 
          marginRight: '0.75rem',
          fontSize: '1rem',
          width: '1rem',
          textAlign: 'center',
        }}>
          {item.icon}
        </span>
      )}

      {/* Label */}
      <span style={{ flex: 1 }}>
        {item.label}
      </span>

      {/* Badge */}
      {item.badge && item.badge > 0 && (
        <span style={{
          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : designSystem.colors.primary[500],
          color: isActive ? 'white' : 'white',
          fontSize: '0.75rem',
          fontWeight: '600',
          padding: '0.125rem 0.5rem',
          borderRadius: '9999px',
          minWidth: '1.25rem',
          textAlign: 'center',
        }}>
          {item.badge}
        </span>
      )}

      {/* Expand/Collapse Arrow */}
      {item.children && (
        <span style={{
          marginLeft: '0.5rem',
          fontSize: '0.75rem',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▶
        </span>
      )}
    </>
  );

  if (item.children) {
    return (
      <div>
        <div
          style={itemStyle}
          onClick={handleToggle}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {content}
        </div>
        
        {isExpanded && (
          <div style={{ marginTop: '0.25rem' }}>
            {item.children.map((child, index) => (
              <SidebarItemComponent 
                key={index}
                item={child}
                isActive={isActive}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href} style={{ textDecoration: 'none' }}>
      <div
        style={itemStyle}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {content}
      </div>
    </Link>
  );
}
