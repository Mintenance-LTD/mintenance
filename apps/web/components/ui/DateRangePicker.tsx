'use client';

import React, { useState, useRef, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import { Button } from './Button';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Array<{ label: string; range: DateRange }>;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

const DEFAULT_PRESETS = [
  {
    label: 'Today',
    range: {
      from: new Date(new Date().setHours(0, 0, 0, 0)),
      to: new Date(new Date().setHours(23, 59, 59, 999)),
    },
  },
  {
    label: 'Last 7 Days',
    range: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
  },
  {
    label: 'Last 30 Days',
    range: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
  },
  {
    label: 'Last 90 Days',
    range: {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
  },
  {
    label: 'This Month',
    range: {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    },
  },
  {
    label: 'Last Month',
    range: {
      from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  placeholder = 'Select date range',
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDateRange = (range: DateRange): string => {
    if (!range.from && !range.to) return placeholder;
    if (range.from && !range.to) {
      return range.from.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (!range.from && range.to) {
      return range.to.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return `${range.from!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${range.to!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add previous month days to fill the week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month days to fill the week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }

    return days;
  };

  const isDateInRange = (date: Date): boolean => {
    if (!value.from || !value.to) return false;
    return date >= value.from && date <= value.to;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!value.from && !value.to) return false;
    const dateStr = date.toDateString();
    return (
      (value.from && dateStr === value.from.toDateString()) ||
      (value.to && dateStr === value.to.toDateString())
    );
  };

  const handleDateClick = (date: Date) => {
    if (!value.from || (value.from && value.to)) {
      // Start new selection
      onChange({ from: date, to: null });
    } else {
      // Complete selection
      if (date >= value.from) {
        onChange({ from: value.from, to: date });
      } else {
        onChange({ from: date, to: value.from });
      }
    }
  };

  const handlePresetClick = (preset: DateRange) => {
    onChange(preset);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const days = getDaysInMonth(selectedMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface,
          color: theme.colors.textPrimary,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          cursor: 'pointer',
          minWidth: '280px',
        }}
      >
        <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
        <span style={{ flex: 1, textAlign: 'left' }}>{formatDateRange(value)}</span>
        <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={16} color={theme.colors.textSecondary} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            padding: theme.spacing[4],
            minWidth: '600px',
            display: 'flex',
            gap: theme.spacing[4],
          }}
        >
          {/* Presets */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
              padding: theme.spacing[2],
              borderRight: `1px solid ${theme.colors.border}`,
              minWidth: '140px',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: theme.spacing[2],
              }}
            >
              Presets
            </h4>
            {presets.map((preset, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePresetClick(preset.range)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.background;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div style={{ flex: 1 }}>
            {/* Month Navigation */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing[4],
              }}
            >
              <button
                type="button"
                onClick={goToPreviousMonth}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="chevronLeft" size={16} color={theme.colors.textSecondary} />
              </button>

              <span style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold }}>
                {selectedMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>

              <button
                type="button"
                onClick={goToNextMonth}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="chevronRight" size={16} color={theme.colors.textSecondary} />
              </button>
            </div>

            {/* Week Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing[1], marginBottom: theme.spacing[2] }}>
              {weekDays.map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textSecondary,
                    padding: theme.spacing[2],
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing[1] }}>
              {days.map((date, index) => {
                const isCurrentMonth = date.getMonth() === selectedMonth.getMonth();
                const isSelected = isDateSelected(date);
                const isInRange = isDateInRange(date);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDateClick(date)}
                    disabled={
                      (minDate && date < minDate) || (maxDate && date > maxDate)
                    }
                    style={{
                      padding: theme.spacing[2],
                      borderRadius: '6px',
                      border: isToday ? `2px solid ${theme.colors.primary}` : 'none',
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : isInRange
                          ? `${theme.colors.primary}20`
                          : 'transparent',
                      color: isSelected
                        ? 'white'
                        : !isCurrentMonth
                          ? theme.colors.textSecondary
                          : theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: isSelected ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.regular,
                      cursor: 'pointer',
                      opacity: !isCurrentMonth ? 0.4 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isInRange) {
                        e.currentTarget.style.backgroundColor = theme.colors.background;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isInRange) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[2], marginTop: theme.spacing[4] }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({ from: null, to: null });
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

