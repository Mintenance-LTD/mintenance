import { describe, it, expect } from 'vitest';
import { adminVerificationAssignmentTemplate } from './admin-verification';
describe('admin verification assignment email', () => {
  it('uses the Mint Editorial shell, icon and matching admin links', () => {
    const { html, text } = adminVerificationAssignmentTemplate();
    const url = 'https://www.mintenance.co.uk/admin/verifications';
    expect(html).toContain(`href="${url}"`);
    expect(text).toContain(url);
    expect(html).toContain('/assets/logo-mark.png');
    expect(html).toContain('#f3f7f4');
    expect(html).toContain('#2f6f5f');
    expect(html).toContain('width="100%"');
    expect(html).not.toContain('mintenance.com');
    expect(html).not.toContain('/settings/notifications');
  });
});
