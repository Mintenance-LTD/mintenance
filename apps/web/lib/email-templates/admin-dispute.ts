import { brandedEmail, brandedEmailText } from '../email-branded-template';
export function adminDisputeAssignmentTemplate() {
  const title = 'A dispute needs your review';
  const cta = {
    text: 'Review assigned disputes',
    url: 'https://www.mintenance.co.uk/admin/disputes',
  };
  const body =
    '<p>A new job dispute has been assigned to you.</p><p>Review the job, both participants and supporting evidence before recording a decision.</p><p>Sign in with your administrator account. Opening this link does not resolve the dispute or move money.</p>';
  return {
    subject: '[Mintenance] Job dispute assigned to you',
    html: brandedEmail({
      title,
      subtitle: 'Admin console · Dispute review',
      body,
      cta,
      preheader: 'A job dispute is ready for your review.',
      showUnsubscribe: false,
    }),
    text: brandedEmailText({ title, body, cta }),
  };
}
