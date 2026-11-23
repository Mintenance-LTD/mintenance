import { describe, expect, it } from 'vitest';
import {
  contractNotificationTemplate,
  contractSignedTemplate,
} from './contracts';
import { jobCompletedTemplate } from './jobs';
import { paymentReceivedTemplate } from './payments';

const viewUrl = 'https://www.mintenance.co.uk/jobs/test-job';
const base = {
  homeownerName: 'Homeowner',
  contractorName: 'Contractor & Co',
  jobTitle: 'Garden maintenance',
  viewUrl,
};

describe('agreement and payment email copy', () => {
  it('shows the agreed price in pence and explains when funding happens', () => {
    const email = contractNotificationTemplate({
      ...base,
      contractAmount: 2.4,
    });
    expect(email.subject).toContain('£2.40');
    expect(email.html).toContain('Contractor &amp; Co');
    expect(email.html).toContain('Signing does not charge your account.');
    expect(email.text).toContain('After both parties sign');
    expect(Object.values(email).join('\n')).not.toContain('\u2014');
  });

  it.each([
    ['payer', 'You can now fund Protected Payment'],
    ['homeowner', 'The designated payer can now fund Protected Payment'],
    [
      'contractor',
      'Check the job for funding and confirmation that work can start',
    ],
  ] as const)(
    'shows the right next step for the %s',
    (recipientRole, nextStep) => {
      const email = contractSignedTemplate(
        {
          recipientName: 'Recipient',
          recipientRole,
          signerName: 'Signer',
          jobTitle: base.jobTitle,
          contractTitle: base.jobTitle,
          isFullyAccepted: true,
          viewUrl,
        },
        ''
      );
      expect(email.subject).toBe('Both parties signed: Garden maintenance');
      expect(email.text).toContain(nextStep);
      expect(email.html).toContain(nextStep);
      expect(email.text).not.toContain('for Garden maintenance');
    }
  );

  it('keeps the job title as entered and escapes it in the HTML heading', () => {
    const jobTitle = 'Garden \u2014 West <plot>';
    const email = contractNotificationTemplate({
      ...base,
      jobTitle,
      contractAmount: 1,
    });
    expect(email.subject).toContain(jobTitle);
    expect(email.html).toContain('Garden \u2014 West &lt;plot&gt;');
  });

  it('describes funding and work review as separate from start permission and release', () => {
    const funded = paymentReceivedTemplate({ ...base, amount: 1 }, '');
    const complete = jobCompletedTemplate({ ...base, amount: 1 }, '');
    expect(funded.text).toContain('Check the job before starting.');
    expect(complete.text).toContain('the work may be approved automatically');
    expect(complete.text).toContain(
      'Payment release still depends on the cooling-off period and final checks.'
    );
    expect(
      [...Object.values(funded), ...Object.values(complete)].join('\n')
    ).not.toContain('\u2014');
  });
});
