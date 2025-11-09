'use client';

import { theme } from '@/lib/theme';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

export function DashboardSearchHeader() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${theme.spacing[6]} ${theme.spacing[8]}`,
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0',
          marginLeft: '0',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: theme.spacing[4],
          boxSizing: 'border-box',
        }}
      >
        {/* Search Bar */}
        <div style={{ flex: 1, maxWidth: '600px', minWidth: 0, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: theme.spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search contractors or projects"
            className="pl-10"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
      </div>
    </header>
  );
}

