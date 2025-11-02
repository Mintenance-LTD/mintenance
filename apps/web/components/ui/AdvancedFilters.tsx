'use client';

import React, { useState, useRef, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import { Button } from './Button';

export interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'text' | 'boolean';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: any;
}

interface AdvancedFiltersProps {
  filters: FilterOption[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply?: () => void;
  onClear?: () => void;
}

export function AdvancedFilters({
  filters,
  values,
  onChange,
  onApply,
  onClear,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValues, setLocalValues] = useState<FilterValues>(values);
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

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const activeFiltersCount = Object.keys(values).filter(
    key => values[key] !== null && values[key] !== undefined && values[key] !== ''
  ).length;

  const handleFilterChange = (filterId: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [filterId]: value }));
  };

  const handleApply = () => {
    onChange(localValues);
    onApply?.();
    setIsOpen(false);
  };

  const handleClear = () => {
    const clearedValues: FilterValues = {};
    filters.forEach(filter => {
      clearedValues[filter.id] = null;
    });
    setLocalValues(clearedValues);
    onChange(clearedValues);
    onClear?.();
  };

  const renderFilterControl = (filter: FilterOption) => {
    const value = localValues[filter.id];

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            style={{
              width: '100%',
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              borderRadius: '8px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            <option value="">All</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
              maxHeight: '200px',
              overflowY: 'auto',
              padding: theme.spacing[2],
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '8px',
            }}
          >
            {filter.options?.map(option => {
              const selectedValues = value || [];
              const isSelected = selectedValues.includes(option.value);
              
              return (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter((v: string) => v !== option.value);
                      handleFilterChange(filter.id, newValues);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: theme.typography.fontSize.sm }}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        );

      case 'range':
        return (
          <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
            <input
              type="number"
              placeholder={`Min ${filter.min || ''}`}
              value={value?.min || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, min: e.target.value })}
              style={{
                flex: 1,
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                borderRadius: '8px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
            <span style={{ color: theme.colors.textSecondary }}>-</span>
            <input
              type="number"
              placeholder={`Max ${filter.max || ''}`}
              value={value?.max || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, max: e.target.value })}
              style={{
                flex: 1,
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                borderRadius: '8px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
              }}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            style={{
              width: '100%',
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              borderRadius: '8px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.sm,
            }}
          />
        );

      case 'text':
        return (
          <input
            type="text"
            placeholder={filter.placeholder || 'Enter value...'}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            style={{
              width: '100%',
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              borderRadius: '8px',
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.sm,
            }}
          />
        );

      case 'boolean':
        return (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: theme.typography.fontSize.sm }}>
              {filter.label}
            </span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], position: 'relative' }}
      >
        <Icon name="filter" size={16} />
        Filters
        {activeFiltersCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: theme.colors.primary,
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: theme.typography.fontWeight.bold,
            }}
          >
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 1000,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            padding: theme.spacing[4],
            minWidth: '360px',
            maxWidth: '500px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] }}>
            <h3
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}
            >
              Advanced Filters
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={16} color={theme.colors.textSecondary} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            {filters.map(filter => (
              <div key={filter.id}>
                <label
                  style={{
                    display: 'block',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textPrimary,
                    marginBottom: theme.spacing[2],
                  }}
                >
                  {filter.label}
                </label>
                {renderFilterControl(filter)}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing[2], marginTop: theme.spacing[6] }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              Clear All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

