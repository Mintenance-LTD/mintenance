/**
 * Export Utilities for generating PDF and CSV reports
 */

import { sanitizeHtml } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
  metadata?: Record<string, string>;
}

/**
 * Export data as CSV file
 */
export function exportToCSV(data: ExportData, filename: string = 'report.csv'): void {
  const { headers, rows, title, metadata } = data;
  
  let csvContent = '';
  
  // Add title if provided
  if (title) {
    csvContent += `${title}\n\n`;
  }
  
  // Add metadata if provided
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
    csvContent += '\n';
  }
  
  // Add headers
  csvContent += headers.map(escapeCSV).join(',') + '\n';
  
  // Add rows
  rows.forEach(row => {
    csvContent += row.map(cell => escapeCSV(String(cell))).join(',') + '\n';
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
}

/**
 * Export data as JSON file
 */
export function exportToJSON(data: unknown, filename: string = 'report.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadFile(blob, filename);
}

/**
 * Generate PDF from HTML content using browser's print functionality
 * SECURITY: Sanitizes HTML content to prevent XSS attacks
 */
export function exportToPDF(elementId: string, filename: string = 'report.pdf'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    logger.error(`Element with id "${elementId}" not found`, undefined, { service: 'export-utils', elementId });
    return;
  }
  
  // SECURITY: Sanitize HTML content before manipulating innerHTML to prevent XSS
  // Store original body content
  const originalContents = document.body.innerHTML;
  const printContents = element.innerHTML;
  
  // Sanitize the HTML content to remove any malicious scripts or event handlers
  const sanitizedContents = sanitizeHtml(printContents, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'img'],
    allowedAttributes: ['src', 'alt', 'class', 'style'],
    maxLength: 100000, // Limit content size to prevent DoS
  });
  
  // Replace body with sanitized print content
  document.body.innerHTML = sanitizedContents;
  
  // Add print styles
  addPrintStyles();
  
  // Trigger print dialog
  window.print();
  
  // Restore original content
  document.body.innerHTML = originalContents;
  
  // Reload to restore event listeners
  window.location.reload();
}

/**
 * Advanced PDF export using jsPDF (client-side)
 * Note: This requires jsPDF library to be installed
 */
export async function exportToPDFAdvanced(
  elementId: string,
  filename: string = 'report.pdf',
  options?: { orientation?: 'portrait' | 'landscape'; format?: 'a4' | 'letter' }
): Promise<void> {
  try {
    // Dynamic import to avoid bundling if not used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsPDF = (await import('jspdf' as any)).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2canvas = (await import('html2canvas' as any)).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }
    
    // Capture element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
    });
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
  } catch (error) {
    logger.error('Error exporting to PDF', error, { service: 'export-utils', elementId, filename });
    // Fallback to basic print
    exportToPDF(elementId, filename);
  }
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Helper function to download a blob as a file
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Add print-specific styles
 */
function addPrintStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      * {
        box-shadow: none !important;
        text-shadow: none !important;
      }
      
      a, a:visited {
        text-decoration: underline;
      }
      
      button, .no-print {
        display: none !important;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      table {
        border-collapse: collapse;
        width: 100%;
      }
      
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      
      th {
        background-color: #f3f4f6 !important;
        font-weight: 600;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

