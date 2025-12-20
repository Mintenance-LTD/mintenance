'use client';

import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

export type CalendarView = 'month' | 'week' | 'day';

interface CalendarHeaderProps {
  month: number;
  year: number;
  monthNames: string[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
}

export function CalendarHeader({
  month,
  year,
  monthNames,
  onPreviousMonth,
  onNextMonth,
  onToday,
  view = 'month',
  onViewChange,
}: CalendarHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing[6],
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      <h2 style={{
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        margin: 0,
      }}>
        {monthNames[month]} {year}
      </h2>

      <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
        {/* View Toggle Buttons */}
        {onViewChange && (
          <div style={{ display: 'flex', gap: theme.spacing[1], marginRight: theme.spacing[2] }}>
            {(['month', 'week', 'day'] as CalendarView[]).map((viewOption) => (
              <button
                key={viewOption}
                onClick={() => onViewChange(viewOption)}
                type="button"
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: view === viewOption ? theme.colors.primary : theme.colors.backgroundSecondary,
                  color: view === viewOption ? theme.colors.white : theme.colors.textPrimary,
                  border: `1px solid ${view === viewOption ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize',
                }}
                onMouseEnter={(e) => {
                  if (view !== viewOption) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (view !== viewOption) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
              >
                {viewOption}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onToday}
          style={{
            padding: `${theme.spacing[2.5]} ${theme.spacing[4]}`,
            backgroundColor: theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Today
        </button>

        <div style={{ display: 'flex', gap: theme.spacing[1] }}>
          <button
            onClick={onPreviousMonth}
            type="button"
            aria-label="Previous month"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Icon name="chevronLeft" size={20} color={theme.colors.textPrimary} />
          </button>

          <button
            onClick={onNextMonth}
            type="button"
            aria-label="Next month"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.backgroundSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Icon name="chevronRight" size={20} color={theme.colors.textPrimary} />
          </button>
        </div>
      </div>
    </div>
  );
}

