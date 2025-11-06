import { logger } from '@mintenance/shared';

export interface ExportFile {
  content: string | Buffer;
  contentType: string;
  filename: string;
}

/**
 * Service for exporting data to various formats
 */
export class ExportService {
  /**
   * Export users to CSV or PDF
   */
  static async exportUsers(users: any[], format: 'csv' | 'pdf'): Promise<ExportFile> {
    if (format === 'csv') {
      return this.exportUsersToCSV(users);
    } else {
      return this.exportUsersToPDF(users);
    }
  }

  /**
   * Export users to CSV
   */
  private static exportUsersToCSV(users: any[]): ExportFile {
    const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Company Name', 'Verified', 'Created At'];
    const rows = users.map(user => [
      user.id,
      user.email || '',
      user.first_name || '',
      user.last_name || '',
      user.role || '',
      user.company_name || '',
      user.admin_verified ? 'Yes' : 'No',
      new Date(user.created_at).toLocaleDateString('en-GB'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return {
      content: csvContent,
      contentType: 'text/csv',
      filename: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }

  /**
   * Export users to PDF
   */
  private static exportUsersToPDF(users: any[]): ExportFile {
    // Simple PDF generation using HTML to PDF conversion
    // For production, consider using a library like pdfkit or puppeteer
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1F2937; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; }
          th { background-color: #F9FAFB; font-weight: 600; }
          tr:nth-child(even) { background-color: #F9FAFB; }
        </style>
      </head>
      <body>
        <h1>Users Export</h1>
        <p>Generated: ${new Date().toLocaleString('en-GB')}</p>
        <p>Total Users: ${users.length}</p>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Company</th>
              <th>Verified</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${user.email || ''}</td>
                <td>${(user.first_name || '') + ' ' + (user.last_name || '')}</td>
                <td>${user.role || ''}</td>
                <td>${user.company_name || ''}</td>
                <td>${user.admin_verified ? 'Yes' : 'No'}</td>
                <td>${new Date(user.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Return HTML for now - in production, convert to PDF using a service
    // For now, we'll return HTML that can be printed to PDF by the browser
    return {
      content: html,
      contentType: 'text/html',
      filename: `users-export-${new Date().toISOString().split('T')[0]}.html`,
    };
  }

  /**
   * Export revenue data to CSV
   */
  static async exportRevenue(data: {
    metrics: any;
    trends: any[];
    dateRange: { start: Date; end: Date };
  }, format: 'csv' | 'pdf'): Promise<ExportFile> {
    if (format === 'csv') {
      return this.exportRevenueToCSV(data);
    } else {
      return this.exportRevenueToPDF(data);
    }
  }

  private static exportRevenueToCSV(data: {
    metrics: any;
    trends: any[];
    dateRange: { start: Date; end: Date };
  }): ExportFile {
    const headers = ['Date', 'Revenue', 'Subscriptions', 'Transaction Fees'];
    const rows = data.trends.map(trend => [
      new Date(trend.date).toLocaleDateString('en-GB'),
      trend.revenue?.toFixed(2) || '0.00',
      trend.subscriptions || 0,
      trend.transactionFees?.toFixed(2) || '0.00',
    ]);

    const csvContent = [
      `Revenue Report: ${data.dateRange.start.toLocaleDateString('en-GB')} to ${data.dateRange.end.toLocaleDateString('en-GB')}`,
      `Total Revenue: £${data.metrics?.totalRevenue?.toFixed(2) || '0.00'}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell)}"`).join(','))
    ].join('\n');

    return {
      content: csvContent,
      contentType: 'text/csv',
      filename: `revenue-export-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }

  private static exportRevenueToPDF(data: {
    metrics: any;
    trends: any[];
    dateRange: { start: Date; end: Date };
  }): ExportFile {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1F2937; margin-bottom: 10px; }
          .summary { background: #F9FAFB; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; }
          th { background-color: #F9FAFB; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>Revenue Report</h1>
        <div class="summary">
          <p><strong>Period:</strong> ${data.dateRange.start.toLocaleDateString('en-GB')} to ${data.dateRange.end.toLocaleDateString('en-GB')}</p>
          <p><strong>Total Revenue:</strong> £${data.metrics?.totalRevenue?.toFixed(2) || '0.00'}</p>
          <p><strong>MRR:</strong> £${data.metrics?.mrr?.toFixed(2) || '0.00'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>Subscriptions</th>
              <th>Transaction Fees</th>
            </tr>
          </thead>
          <tbody>
            ${data.trends.map(trend => `
              <tr>
                <td>${new Date(trend.date).toLocaleDateString('en-GB')}</td>
                <td>£${trend.revenue?.toFixed(2) || '0.00'}</td>
                <td>${trend.subscriptions || 0}</td>
                <td>£${trend.transactionFees?.toFixed(2) || '0.00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return {
      content: html,
      contentType: 'text/html',
      filename: `revenue-export-${new Date().toISOString().split('T')[0]}.html`,
    };
  }

  /**
   * Export security events to CSV
   */
  static async exportSecurityEvents(events: any[]): Promise<ExportFile> {
    const headers = ['Date', 'Type', 'Severity', 'IP Address', 'Endpoint', 'Details', 'Resolved'];
    const rows = events.map(event => [
      new Date(event.created_at).toLocaleString('en-GB'),
      event.event_type || '',
      event.severity || '',
      event.ip_address || '',
      event.endpoint || '',
      event.details || '',
      event.resolved ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return {
      content: csvContent,
      contentType: 'text/csv',
      filename: `security-events-export-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }
}

