/**
 * Comprehensive unit tests for EmailTemplatesService (facade) and its delegated
 * implementation in services/email-templates/*.
 *
 * The facade simply re-exports static methods that delegate to the real module
 * functions. Exercising every static method covers the facade lines and the
 * real implementation behind them. Externals (mobileApiClient + logger) are the
 * only things mocked.
 */

// ---- Mock externals (the ONLY mocks) -------------------------------------

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { EmailTemplatesService } from '../EmailTemplatesService';
import type { EmailTemplate } from '../email-templates/types';

// ---- Helpers --------------------------------------------------------------

function makeTemplate(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id: 'tpl-1',
    contractor_id: 'contractor-1',
    template_name: 'Invoice Template',
    template_category: 'invoice',
    template_type: 'professional',
    subject_line: 'Invoice for {{job_title}}',
    text_content: 'Hi {{client_name}}, your invoice total is £{{amount}}.',
    html_content: '<p>Hi {{client_name}}, total £{{amount}}</p>',
    preview_text: 'Your invoice',
    description: 'desc',
    is_active: true,
    is_default: false,
    language_code: 'en',
    times_used: 0,
    variables: ['client_name', 'amount', 'job_title'],
    required_variables: ['client_name', 'amount'],
    brand_colors: { primary: '#3F8C7A' },
    auto_send_delay_hours: 0,
    auto_send_conditions: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  // mockReset clears the queued *Once values so they cannot leak between tests.
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
  mockLoggerError.mockReset();
});

// ===========================================================================
// Facade wiring
// ===========================================================================
describe('EmailTemplatesService facade', () => {
  it('exposes every delegated static method', () => {
    const methods = [
      'createTemplate',
      'getTemplates',
      'getTemplatesByCategory',
      'getTemplate',
      'updateTemplate',
      'deleteTemplate',
      'duplicateTemplate',
      'processTemplate',
      'replaceVariables',
      'validateTemplate',
      'extractVariablesFromContent',
      'sendEmail',
      'getEmailHistory',
      'getAvailableVariables',
      'getVariablesByCategory',
      'getEmailAnalytics',
      'generateAnalyticsReport',
    ] as const;
    for (const m of methods) {
      expect(
        typeof (EmailTemplatesService as unknown as Record<string, unknown>)[m]
      ).toBe('function');
    }
  });
});

// ===========================================================================
// replaceVariables — pure interpolation
// ===========================================================================
describe('replaceVariables', () => {
  it('interpolates a single variable', () => {
    expect(
      EmailTemplatesService.replaceVariables('Hello {{name}}', {
        name: 'Alice',
      })
    ).toBe('Hello Alice');
  });

  it('interpolates multiple distinct variables', () => {
    const out = EmailTemplatesService.replaceVariables(
      'Job {{job}} for {{client}}',
      { job: 'Boiler fix', client: 'Bob' }
    );
    expect(out).toBe('Job Boiler fix for Bob');
  });

  it('replaces every occurrence of the same variable', () => {
    expect(
      EmailTemplatesService.replaceVariables('{{x}}-{{x}}-{{x}}', { x: 'A' })
    ).toBe('A-A-A');
  });

  it('formats a GBP amount that is passed in pre-formatted', () => {
    expect(
      EmailTemplatesService.replaceVariables('Total: £{{amount}}', {
        amount: '350.00',
      })
    ).toBe('Total: £350.00');
  });

  it('stringifies numeric values', () => {
    expect(
      EmailTemplatesService.replaceVariables('Count {{n}}', { n: 42 })
    ).toBe('Count 42');
  });

  it('treats null / undefined / empty-string / 0 / false as empty string (|| fallback)', () => {
    // The impl uses `variables[key] || ''`, so all falsy values collapse to ''.
    expect(EmailTemplatesService.replaceVariables('[{{v}}]', { v: null })).toBe(
      '[]'
    );
    expect(
      EmailTemplatesService.replaceVariables('[{{v}}]', { v: undefined })
    ).toBe('[]');
    expect(EmailTemplatesService.replaceVariables('[{{v}}]', { v: '' })).toBe(
      '[]'
    );
    expect(EmailTemplatesService.replaceVariables('[{{v}}]', { v: 0 })).toBe(
      '[]'
    );
    expect(
      EmailTemplatesService.replaceVariables('[{{v}}]', { v: false })
    ).toBe('[]');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(
      EmailTemplatesService.replaceVariables('Hi {{name}} {{missing}}', {
        name: 'Z',
      })
    ).toBe('Hi Z {{missing}}');
  });

  it('returns content unchanged when no variables supplied', () => {
    expect(EmailTemplatesService.replaceVariables('static text', {})).toBe(
      'static text'
    );
  });

  it('does not HTML-escape values (raw substitution)', () => {
    expect(
      EmailTemplatesService.replaceVariables('<b>{{v}}</b>', { v: '<script>' })
    ).toBe('<b><script></b>');
  });
});

// ===========================================================================
// extractVariablesFromContent
// ===========================================================================
describe('extractVariablesFromContent', () => {
  it('extracts all unique variable names in order', () => {
    expect(
      EmailTemplatesService.extractVariablesFromContent('{{a}} {{b}} {{c}}')
    ).toEqual(['a', 'b', 'c']);
  });

  it('deduplicates repeated variables, preserving first-seen order', () => {
    expect(
      EmailTemplatesService.extractVariablesFromContent(
        '{{b}} {{a}} {{b}} {{a}}'
      )
    ).toEqual(['b', 'a']);
  });

  it('trims whitespace inside the braces', () => {
    expect(
      EmailTemplatesService.extractVariablesFromContent('{{  spaced  }}')
    ).toEqual(['spaced']);
  });

  it('returns empty array when there are no variables', () => {
    expect(
      EmailTemplatesService.extractVariablesFromContent('plain text')
    ).toEqual([]);
  });

  it('handles empty string', () => {
    expect(EmailTemplatesService.extractVariablesFromContent('')).toEqual([]);
  });
});

// ===========================================================================
// validateTemplate
// ===========================================================================
describe('validateTemplate', () => {
  it('is valid for a complete template', () => {
    const result = EmailTemplatesService.validateTemplate({
      template_name: 'Name',
      subject_line: 'Subject',
      text_content: 'Body',
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('flags every missing required field', () => {
    const result = EmailTemplatesService.validateTemplate({});
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Template name is required',
      'Subject line is required',
      'Text content is required',
    ]);
  });

  it('treats whitespace-only required fields as missing', () => {
    const result = EmailTemplatesService.validateTemplate({
      template_name: '   ',
      subject_line: '\t',
      text_content: ' ',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Template name is required');
    expect(result.errors).toContain('Subject line is required');
    expect(result.errors).toContain('Text content is required');
  });

  it('flags subject lines over 200 characters', () => {
    const result = EmailTemplatesService.validateTemplate({
      template_name: 'N',
      subject_line: 'x'.repeat(201),
      text_content: 'B',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Subject line should be under 200 characters'
    );
  });

  it('accepts a subject line of exactly 200 characters', () => {
    const result = EmailTemplatesService.validateTemplate({
      template_name: 'N',
      subject_line: 'x'.repeat(200),
      text_content: 'B',
    });
    expect(result.isValid).toBe(true);
  });

  it('flags preview text over 150 characters', () => {
    const result = EmailTemplatesService.validateTemplate({
      template_name: 'N',
      subject_line: 'S',
      text_content: 'B',
      preview_text: 'y'.repeat(151),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Preview text should be under 150 characters'
    );
  });

  it('accepts preview text of exactly 150 characters', () => {
    const result = EmailTemplatesService.validateTemplate({
      template_name: 'N',
      subject_line: 'S',
      text_content: 'B',
      preview_text: 'y'.repeat(150),
    });
    expect(result.isValid).toBe(true);
  });
});

// ===========================================================================
// processTemplate
// ===========================================================================
describe('processTemplate', () => {
  it('fetches the template and interpolates subject, text and html', async () => {
    mockGet.mockResolvedValueOnce({ data: makeTemplate() });

    const result = await EmailTemplatesService.processTemplate('tpl-1', {
      client_name: 'Bob',
      amount: '350.00',
      job_title: 'Boiler repair',
    });

    expect(mockGet).toHaveBeenCalledWith('/api/email/templates/tpl-1');
    expect(result.subject_line).toBe('Invoice for Boiler repair');
    expect(result.text_content).toBe('Hi Bob, your invoice total is £350.00.');
    expect(result.html_content).toBe('<p>Hi Bob, total £350.00</p>');
  });

  it('omits html_content when template has none', async () => {
    mockGet.mockResolvedValueOnce({
      data: makeTemplate({ html_content: undefined }),
    });

    const result = await EmailTemplatesService.processTemplate('tpl-1', {
      client_name: 'Bob',
      amount: '10',
      job_title: 'T',
    });

    expect(result.html_content).toBeUndefined();
    expect(result.text_content).toContain('Bob');
  });

  it('throws when the template is not found (null data)', async () => {
    mockGet.mockResolvedValueOnce({ data: null });

    await expect(
      EmailTemplatesService.processTemplate('missing', {})
    ).rejects.toThrow('Template not found');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error processing template:',
      expect.any(Error)
    );
  });

  it('throws listing the missing required variables', async () => {
    mockGet.mockResolvedValueOnce({ data: makeTemplate() });

    await expect(
      EmailTemplatesService.processTemplate('tpl-1', { client_name: 'Bob' })
    ).rejects.toThrow('Missing required variables: job_title, amount');
  });

  it('throws "Template not found" when the underlying fetch errors (getTemplate swallows to null)', async () => {
    // getTemplate catches non-404 errors and returns null, so processTemplate
    // sees a null template and throws "Template not found".
    mockGet.mockRejectedValueOnce({ statusCode: 500 });
    await expect(
      EmailTemplatesService.processTemplate('boom', { client_name: 'B' })
    ).rejects.toThrow('Template not found');
  });
});

// ===========================================================================
// TemplateCRUD: createTemplate / getTemplates / getTemplatesByCategory /
// getTemplate / updateTemplate / deleteTemplate / duplicateTemplate
// ===========================================================================
describe('createTemplate', () => {
  it('POSTs mapped fields and returns the created template', async () => {
    const created = makeTemplate({ id: 'new-1' });
    mockPost.mockResolvedValueOnce({ data: created });

    const result = await EmailTemplatesService.createTemplate({
      contractor_id: 'c1',
      template_name: 'My Template',
      template_category: 'quote',
      subject_line: 'Subject',
      text_content: 'Body',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/email/templates', {
      name: 'My Template',
      subject: 'Subject',
      body: 'Body',
      category: 'quote',
    });
    expect(result).toBe(created);
  });

  it('logs and rethrows on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('boom'));
    await expect(
      EmailTemplatesService.createTemplate({
        contractor_id: 'c1',
        template_name: 'N',
        template_category: 'invoice',
        subject_line: 'S',
        text_content: 'B',
      })
    ).rejects.toThrow('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error creating email template:',
      expect.any(Error)
    );
  });
});

describe('getTemplates', () => {
  it('encodes the contractor id and returns the list', async () => {
    const list = [makeTemplate()];
    mockGet.mockResolvedValueOnce({ data: list });

    const result = await EmailTemplatesService.getTemplates('c 1');

    expect(mockGet).toHaveBeenCalledWith(
      '/api/email/templates?contractor_id=c%201'
    );
    expect(result).toBe(list);
  });

  it('returns an empty array when data is missing', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined });
    expect(await EmailTemplatesService.getTemplates('c1')).toEqual([]);
  });

  it('logs and rethrows on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(EmailTemplatesService.getTemplates('c1')).rejects.toThrow(
      'boom'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching email templates:',
      expect.any(Error)
    );
  });
});

describe('getTemplatesByCategory', () => {
  it('builds query params with contractor_id, category and is_active', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await EmailTemplatesService.getTemplatesByCategory('c1', 'reminder');

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('/api/email/templates?');
    expect(url).toContain('contractor_id=c1');
    expect(url).toContain('category=reminder');
    expect(url).toContain('is_active=true');
  });

  it('returns empty array when data missing', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    expect(
      await EmailTemplatesService.getTemplatesByCategory('c1', 'welcome')
    ).toEqual([]);
  });

  it('logs and rethrows on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(
      EmailTemplatesService.getTemplatesByCategory('c1', 'invoice')
    ).rejects.toThrow('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching templates by category:',
      expect.any(Error)
    );
  });
});

describe('getTemplate', () => {
  it('returns the template by id', async () => {
    const tpl = makeTemplate();
    mockGet.mockResolvedValueOnce({ data: tpl });

    const result = await EmailTemplatesService.getTemplate('tpl-1');

    expect(mockGet).toHaveBeenCalledWith('/api/email/templates/tpl-1');
    expect(result).toBe(tpl);
  });

  it('returns null when data is absent', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined });
    expect(await EmailTemplatesService.getTemplate('x')).toBeNull();
  });

  it('returns null on 404 without logging an error', async () => {
    mockGet.mockRejectedValueOnce({ statusCode: 404 });
    expect(await EmailTemplatesService.getTemplate('missing')).toBeNull();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('returns null and logs on non-404 errors', async () => {
    mockGet.mockRejectedValueOnce({ statusCode: 500 });
    expect(await EmailTemplatesService.getTemplate('x')).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching email template:',
      expect.any(Object)
    );
  });
});

describe('updateTemplate', () => {
  it('PUTs mapped fields and returns the updated template', async () => {
    const updated = makeTemplate({ template_name: 'Renamed' });
    mockPut.mockResolvedValueOnce({ data: updated });

    const result = await EmailTemplatesService.updateTemplate('tpl-1', {
      template_name: 'Renamed',
      subject_line: 'New Subject',
      text_content: 'New Body',
      template_category: 'follow_up',
    });

    expect(mockPut).toHaveBeenCalledWith('/api/email/templates/tpl-1', {
      name: 'Renamed',
      subject: 'New Subject',
      body: 'New Body',
      category: 'follow_up',
    });
    expect(result).toBe(updated);
  });

  it('logs and rethrows on failure', async () => {
    mockPut.mockRejectedValueOnce(new Error('boom'));
    await expect(
      EmailTemplatesService.updateTemplate('tpl-1', { template_name: 'X' })
    ).rejects.toThrow('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error updating email template:',
      expect.any(Error)
    );
  });
});

describe('deleteTemplate', () => {
  it('DELETEs the template by id', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    await EmailTemplatesService.deleteTemplate('tpl-1');
    expect(mockDelete).toHaveBeenCalledWith('/api/email/templates/tpl-1');
  });

  it('logs and rethrows on failure', async () => {
    mockDelete.mockRejectedValueOnce(new Error('boom'));
    await expect(EmailTemplatesService.deleteTemplate('tpl-1')).rejects.toThrow(
      'boom'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error deleting email template:',
      expect.any(Error)
    );
  });
});

describe('duplicateTemplate', () => {
  it('POSTs to the duplicate endpoint and returns the copy', async () => {
    const copy = makeTemplate({ id: 'copy-1' });
    mockPost.mockResolvedValueOnce({ data: copy });

    const result = await EmailTemplatesService.duplicateTemplate(
      'tpl-1',
      'Copy name'
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/api/email/templates/tpl-1/duplicate',
      {}
    );
    expect(result).toBe(copy);
  });

  it('logs and rethrows on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('boom'));
    await expect(
      EmailTemplatesService.duplicateTemplate('tpl-1', 'n')
    ).rejects.toThrow('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error duplicating template:',
      expect.any(Error)
    );
  });
});

// ===========================================================================
// EmailSender: sendEmail / getEmailHistory
// ===========================================================================
describe('sendEmail', () => {
  it('sends raw content when no template_id/variables provided', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'email-1' } });

    const result = await EmailTemplatesService.sendEmail({
      contractor_id: 'c1',
      recipient_email: 'bob@example.com',
      subject_line: 'Hello',
      text_content: 'Body text',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/email/history', {
      template_id: undefined,
      recipient_email: 'bob@example.com',
      subject: 'Hello',
      body: 'Body text',
    });
    expect(result).toEqual({ success: true, email_id: 'email-1' });
  });

  it('processes the template when template_id and variables are present', async () => {
    // First GET resolves the template (processTemplate -> getTemplate)
    mockGet.mockResolvedValueOnce({ data: makeTemplate() });
    // Then POST to history
    mockPost.mockResolvedValueOnce({ data: { id: 'email-2' } });

    const result = await EmailTemplatesService.sendEmail({
      template_id: 'tpl-1',
      contractor_id: 'c1',
      recipient_email: 'bob@example.com',
      subject_line: 'ignored',
      text_content: 'ignored',
      variables: { client_name: 'Bob', amount: '99.99', job_title: 'Tap fix' },
    });

    expect(result.success).toBe(true);
    expect(result.email_id).toBe('email-2');
    const postBody = mockPost.mock.calls[0][1] as {
      subject: string;
      body: string;
    };
    expect(postBody.subject).toBe('Invoice for Tap fix');
    expect(postBody.body).toBe('Hi Bob, your invoice total is £99.99.');
  });

  it('returns a failure object (not throwing) when the send fails, with Error message', async () => {
    mockPost.mockRejectedValueOnce(new Error('send failed'));

    const result = await EmailTemplatesService.sendEmail({
      contractor_id: 'c1',
      recipient_email: 'x@y.com',
      subject_line: 'S',
      text_content: 'B',
    });

    expect(result).toEqual({
      success: false,
      email_id: '',
      error: 'send failed',
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error sending email:',
      expect.any(Error)
    );
  });

  it('reports "Unknown error" when a non-Error is thrown', async () => {
    mockPost.mockRejectedValueOnce('string failure');

    const result = await EmailTemplatesService.sendEmail({
      contractor_id: 'c1',
      recipient_email: 'x@y.com',
      subject_line: 'S',
      text_content: 'B',
    });

    expect(result).toEqual({
      success: false,
      email_id: '',
      error: 'Unknown error',
    });
  });
});

describe('getEmailHistory', () => {
  it('uses the default limit of 50', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await EmailTemplatesService.getEmailHistory('c1');
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('contractor_id=c1');
    expect(url).toContain('limit=50');
  });

  it('honours a custom limit and returns the data', async () => {
    const history = [{ id: 'h1' }];
    mockGet.mockResolvedValueOnce({ data: history });
    const result = await EmailTemplatesService.getEmailHistory('c1', 10);
    expect(mockGet.mock.calls[0][0] as string).toContain('limit=10');
    expect(result).toBe(history);
  });

  it('returns empty array when data missing', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    expect(await EmailTemplatesService.getEmailHistory('c1')).toEqual([]);
  });

  it('logs and rethrows on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(EmailTemplatesService.getEmailHistory('c1')).rejects.toThrow(
      'boom'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching email history:',
      expect.any(Error)
    );
  });
});

// ===========================================================================
// EmailAnalyticsService
// ===========================================================================
describe('getAvailableVariables', () => {
  it('returns the variables list', async () => {
    const vars = [{ id: 'v1', variable_name: 'client_name' }];
    mockGet.mockResolvedValueOnce(vars);
    const result = await EmailTemplatesService.getAvailableVariables();
    expect(mockGet).toHaveBeenCalledWith('/api/email/templates/variables');
    expect(result).toBe(vars);
  });

  it('returns empty array when API returns nullish', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await EmailTemplatesService.getAvailableVariables()).toEqual([]);
  });

  it('logs and rethrows on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(EmailTemplatesService.getAvailableVariables()).rejects.toThrow(
      'boom'
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching template variables:',
      expect.any(Error)
    );
  });
});

describe('getVariablesByCategory', () => {
  it('passes the category in the query string', async () => {
    mockGet.mockResolvedValueOnce([]);
    await EmailTemplatesService.getVariablesByCategory('payment');
    expect(mockGet).toHaveBeenCalledWith(
      '/api/email/templates/variables?category=payment'
    );
  });

  it('returns empty array when nullish', async () => {
    mockGet.mockResolvedValueOnce(undefined);
    expect(await EmailTemplatesService.getVariablesByCategory('job')).toEqual(
      []
    );
  });

  it('logs and rethrows on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(
      EmailTemplatesService.getVariablesByCategory('company')
    ).rejects.toThrow('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching variables by category:',
      expect.any(Error)
    );
  });
});

describe('getEmailAnalytics', () => {
  it('builds the base url without template_id', async () => {
    const analytics = { id: 'a1' };
    mockGet.mockResolvedValueOnce(analytics);

    const result = await EmailTemplatesService.getEmailAnalytics(
      'c1',
      '2026-01-01',
      '2026-01-31'
    );

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('contractor_id=c1');
    expect(url).toContain('period_start=2026-01-01');
    expect(url).toContain('period_end=2026-01-31');
    expect(url).not.toContain('template_id');
    expect(result).toBe(analytics);
  });

  it('appends template_id when provided', async () => {
    mockGet.mockResolvedValueOnce({ id: 'a2' });
    await EmailTemplatesService.getEmailAnalytics('c1', 's', 'e', 'tpl-9');
    expect(mockGet.mock.calls[0][0] as string).toContain('template_id=tpl-9');
  });

  it('returns null when API returns nullish', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(
      await EmailTemplatesService.getEmailAnalytics('c1', 's', 'e')
    ).toBeNull();
  });

  it('returns null (does not throw) on error and logs it', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    expect(
      await EmailTemplatesService.getEmailAnalytics('c1', 's', 'e')
    ).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching email analytics:',
      expect.any(Error)
    );
  });
});

describe('generateAnalyticsReport', () => {
  it('computes aggregate metrics and rates from history records', async () => {
    const records = [
      { status: 'delivered', open_count: 2, click_count: 1 },
      { status: 'delivered', open_count: 0, click_count: 0 },
      { status: 'bounced', open_count: 0, click_count: 0 },
      { status: 'sent', open_count: 5, click_count: 3 },
    ];
    mockGet.mockResolvedValueOnce(records);

    const report = await EmailTemplatesService.generateAnalyticsReport(
      'c1',
      '2026-01-01',
      '2026-01-31'
    );

    const s = report.summary;
    expect(s.contractor_id).toBe('c1');
    expect(s.emails_sent).toBe(4);
    expect(s.emails_delivered).toBe(2);
    expect(s.emails_bounced).toBe(1);
    // opened = records with open_count > 0 => 2 (record 1 and 4)
    expect(s.unique_opens).toBe(2);
    expect(s.total_opens).toBe(7); // 2 + 0 + 0 + 5
    expect(s.unique_clicks).toBe(2); // records 1 and 4
    expect(s.total_clicks).toBe(4); // 1 + 0 + 0 + 3
    // delivery_rate = 2/4 * 100
    expect(s.delivery_rate).toBe(50);
    // open_rate = opened(2) / delivered(2) * 100
    expect(s.open_rate).toBe(100);
    // click_rate = clicked(2) / opened(2) * 100
    expect(s.click_rate).toBe(100);
    // bounce_rate = 1/4 * 100
    expect(s.bounce_rate).toBe(25);
    expect(report.by_template).toEqual([]);
    expect(report.by_category).toEqual([]);
  });

  it('guards against divide-by-zero with an empty history', async () => {
    mockGet.mockResolvedValueOnce([]);
    const report = await EmailTemplatesService.generateAnalyticsReport(
      'c1',
      's',
      'e'
    );
    expect(report.summary.emails_sent).toBe(0);
    expect(report.summary.delivery_rate).toBe(0);
    expect(report.summary.open_rate).toBe(0);
    expect(report.summary.click_rate).toBe(0);
    expect(report.summary.bounce_rate).toBe(0);
  });

  it('treats nullish history as empty', async () => {
    mockGet.mockResolvedValueOnce(null);
    const report = await EmailTemplatesService.generateAnalyticsReport(
      'c1',
      's',
      'e'
    );
    expect(report.summary.emails_sent).toBe(0);
  });

  it('logs and rethrows on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    await expect(
      EmailTemplatesService.generateAnalyticsReport('c1', 's', 'e')
    ).rejects.toThrow('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error generating analytics report:',
      expect.any(Error)
    );
  });
});
