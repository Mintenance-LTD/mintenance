'use client';

import React, { useState, useRef, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';
import { Button } from './Button';
import { exportToCSV, exportToJSON, exportToPDF, ExportData } from '@/lib/utils/exportUtils';

interface ExportMenuProps {
  data: ExportData;
  filename?: string;
  exportElementId?: string;
  formats?: Array<'csv' | 'json' | 'pdf'>;
  onExport?: (format: string) => void;
}

export function ExportMenu({
  data,
  filename = 'report',
  exportElementId = 'export-content',
  formats = ['csv', 'json', 'pdf'],
  onExport,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filenameWithDate = `${filename}_${timestamp}`;

      switch (format) {
        case 'csv':
          exportToCSV(data, `${filenameWithDate}.csv`);
          break;
        case 'json':
          exportToJSON(data, `${filenameWithDate}.json`);
          break;
        case 'pdf':
          exportToPDF(exportElementId, `${filenameWithDate}.pdf`);
          break;
      }

      if (onExport) {
        onExport(format);
      }

      setIsOpen(false);
    } catch (error) {
      logger.error(`Error exporting as ${format}:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      format: 'csv' as const,
      label: 'Export as CSV',
      description: 'Spreadsheet format',
      icon: 'fileText',
    },
    {
      format: 'json' as const,
      label: 'Export as JSON',
      description: 'Data format',
      icon: 'code',
    },
    {
      format: 'pdf' as const,
      label: 'Export as PDF',
      description: 'Document format',
      icon: 'document',
    },
  ].filter(option => formats.includes(option.format));

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}
      >
        <Icon name="download" size={16} />
        Export
        <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} />
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
            padding: theme.spacing[2],
            minWidth: '220px',
          }}
        >
          {exportOptions.map((option) => (
            <button
              key={option.format}
              type="button"
              onClick={() => handleExport(option.format)}
              disabled={isExporting}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: `${theme.colors.primary}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={option.icon as any} size={18} color={theme.colors.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {option.label}
                </div>
                <div
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginTop: '2px',
                  }}
                >
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

