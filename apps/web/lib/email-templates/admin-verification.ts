import { brandedEmail, brandedEmailText } from '../email-branded-template';

/** Administrative links deliberately use the canonical production domain. */
export function adminVerificationAssignmentTemplate() {
  const title = 'A verification needs your review';
  const cta = {
    text: 'Review contractor verification',
    url: 'https://www.mintenance.co.uk/admin/verifications',
  };
  const body = `<p>A new contractor verification has been assigned to you.</p>
    <div style="padding:16px;background:#e9f1eb;border:1px solid #d8e2da;border-radius:10px;margin:20px 0;color:#1a2520;">
      <strong>Your next step</strong>
      <p style="margin:8px 0 0;">Review the contractor’s business details and supporting documents, then approve the request or explain what needs to change.</p>
    </div>
    <p>Sign in with your administrator account to review this request. Opening the link does not approve the contractor.</p>`;
  return {
    subject: '[Mintenance] Contractor verification assigned to you',
    html: brandedEmail({
      title,
      subtitle: 'Admin console · Contractor verification',
      body,
      cta,
      preheader:
        'A contractor verification is ready for your review in the admin console.',
      showUnsubscribe: false,
    }),
    text: brandedEmailText({ title, body, cta }),
  };
}
