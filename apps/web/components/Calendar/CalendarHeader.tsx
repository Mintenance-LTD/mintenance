'use client';
import { theme } from '@/lib/theme';
import { ChevronLeft, ChevronRight } from 'lucide-react';
interface Props {
  month: number;
  year: number;
  monthNames: string[];
  label?: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  view?: 'month' | 'week' | 'day';
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}
const buttonStyle = {
  border: '1px solid var(--me-line, #dfe7e2)',
  borderRadius: 10,
  padding: '9px 12px',
  minHeight: 40,
  background: 'var(--me-surface, #fff)',
  color: `var(--me-ink, ${theme.colors.textPrimary})`,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
export function CalendarHeader({
  month,
  year,
  monthNames,
  label,
  onPreviousMonth,
  onNextMonth,
  onToday,
  view = 'month',
  onViewChange,
}: Props) {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderBottom: '1px solid var(--me-line, #dfe7e2)',
      }}
    >
      <h2
        aria-live='polite'
        style={{ margin: 0, fontSize: 18, fontWeight: 650 }}
      >
        {label ?? `${monthNames[month]} ${year}`}
      </h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {onViewChange && (
          <div
            role='group'
            aria-label='Calendar view'
            style={{ display: 'flex', gap: 4 }}
          >
            {(['month', 'week', 'day'] as const).map((option) => (
              <button
                key={option}
                type='button'
                aria-pressed={view === option}
                onClick={() => onViewChange(option)}
                style={{
                  ...buttonStyle,
                  background:
                    view === option
                      ? `var(--me-brand, ${theme.colors.teal[800]})`
                      : buttonStyle.background,
                  color:
                    view === option ? theme.colors.white : buttonStyle.color,
                  textTransform: 'capitalize',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        <button type='button' onClick={onToday} style={buttonStyle}>
          Today
        </button>
        <button
          type='button'
          aria-label={`Previous ${view}`}
          onClick={onPreviousMonth}
          style={buttonStyle}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type='button'
          aria-label={`Next ${view}`}
          onClick={onNextMonth}
          style={buttonStyle}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </header>
  );
}
